const crypto = require("crypto");
const fsp = require("fs/promises");

const { walletConfig, missingSigningConfig, signingDiagnostics, readSecretSource } = require("./config");
const { appendHistory, passExists, readJson, safeSegment, walletPaths, writeJson } = require("./storage");
const { buildSignedPass } = require("./passkit");
const apns = require("./apns");
const {
  getWalletConfigurationDiagnostics,
  writeWalletReport,
  listWalletReports,
  readWalletReport,
  sanitizeReportForClient,
  newReportId,
  newRequestId,
} = require("./diagnostics");
const { WALLET_CODES } = require("./errors");

/**
 * Build a failed diagnostics report from a signing error and persist it.
 * The report carries the specific code/stage of the failure plus the full
 * environment + path + crypto checks, with a sanitised server-side stack.
 * Returns the persisted (sanitised) report.
 */
async function reportSigningFailure(config, err, meta = {}) {
  const reportId = meta.reportId || newReportId();
  const requestId = meta.requestId || newRequestId();
  const report = getWalletConfigurationDiagnostics(config, { reportId, requestId, endpoint: meta.endpoint });

  const code = err && err.code ? err.code : WALLET_CODES.UNKNOWN;
  const stage = err && err.stage ? err.stage : report.stage;
  const userMessage = err && err.userMessage ? err.userMessage : (err && err.message) || "Apple Wallet signing failed.";

  // Make sure the actual thrown failure is represented as the primary error.
  if (!report.errors.some(e => e.code === code)) {
    report.errors.unshift({
      code,
      stage,
      severity: "error",
      message: userMessage,
      safeDetails: (err && err.safeDetails) || {},
    });
  }
  report.status = "failed";
  report.primaryCode = code;
  report.stage = stage;

  await writeWalletReport(config, report, {
    code,
    stage,
    technicalMessage: err && err.message,
    stack: err && err.stack,
  });
  return sanitizeReportForClient(report);
}

function walletCustomerIdFromBooking(booking) {
  // A known/authenticated customer keeps ONE loyalty pass reused across every
  // booking. Only true guests (no customerId) fall back to a per-booking pass.
  if (booking.customerId) return booking.customerId;
  if (booking.id) return `booking-${safeSegment(booking.id)}`;
  const stable = String(booking.customerEmail || booking.customerPhone || booking.customerName || booking.id || "guest").toLowerCase();
  return `guest-${crypto.createHash("sha256").update(stable).digest("hex").slice(0, 16)}`;
}

function walletSerialFromCustomer(customerId) {
  return `UK-${crypto.createHash("sha256").update(String(customerId)).digest("hex").slice(0, 18).toUpperCase()}`;
}

function newToken() {
  return crypto.randomBytes(24).toString("hex");
}

function safeMetadata(metadata) {
  if (!metadata) return null;
  const { authenticationToken, ...safe } = metadata;
  return safe;
}

function customerFromBooking(booking) {
  return {
    customerId: walletCustomerIdFromBooking(booking),
    holderName: booking.customerName || "Urban Kings Member",
    email: booking.customerEmail || "",
    phone: booking.customerPhone || "",
    bookingId: booking.id || "",
    serviceName: booking.serviceName || booking.service || "",
    bookingDate: booking.date || "",
    bookingTime: booking.time || "",
    barberName: booking.barberName || "",
    location: booking.location || "",
    lastBookingId: booking.id || "",
  };
}

function defaultMetadata(input, config) {
  const createdAt = new Date().toISOString();
  return {
    walletId: crypto.randomUUID(),
    customerId: input.customerId,
    serialNumber: walletSerialFromCustomer(input.customerId),
    authenticationToken: newToken(),
    holderName: input.holderName || "Urban Kings Member",
    email: input.email || "",
    phone: input.phone || "",
    bookingId: input.bookingId || "",
    serviceName: input.serviceName || "",
    bookingDate: input.bookingDate || "",
    bookingTime: input.bookingTime || "",
    barberName: input.barberName || "",
    location: input.location || config.businessLocation,
    membershipStatus: "active",
    status: "active",
    bookingStatus: "pending",
    visits: 0,
    visitsGoal: config.rewardGoal,
    stampCount: 0,
    rewardAvailable: false,
    rewardCycle: 1,
    reward: config.rewardText,
    currentBookingId: null,
    passInstallState: "created",
    firstDownloadedAt: null,
    lastDownloadedAt: null,
    devices: [],
    lastUpdatedTag: createdAt,
    origin: input.origin || "booking",
    createdAt,
    updatedAt: createdAt,
    lastBookingId: input.lastBookingId || "",
    lastPushAt: null,
    passStatus: "metadata-only",
    passError: "",
  };
}

async function loadMetadata(config, customerId) {
  return readJson(walletPaths(config, customerId).metadata, null);
}

async function saveMetadata(config, metadata) {
  metadata.updatedAt = new Date().toISOString();
  // Keep the loyalty mirror fields consistent with the canonical visit count.
  const goal = Number(metadata.visitsGoal || config.rewardGoal) || config.rewardGoal;
  metadata.stampCount = Math.max(0, Number(metadata.visits || 0));
  metadata.rewardAvailable = metadata.stampCount >= goal;
  if (!metadata.rewardCycle) metadata.rewardCycle = 1;
  if (!metadata.status) metadata.status = "active";
  await writeJson(walletPaths(config, metadata.customerId).metadata, metadata);
  return metadata;
}

async function tryBuildPass(config, metadata, meta = {}) {
  const paths = walletPaths(config, metadata.customerId);
  try {
    await buildSignedPass(config, metadata, paths.pass);
    metadata.passStatus = "signed";
    metadata.passError = "";
    metadata.passErrorCode = "";
    metadata.passErrorStage = "";
    metadata.passReportId = "";
    await appendHistory(config, metadata.customerId, {
      action: "pass.generated",
      serialNumber: metadata.serialNumber,
    });
  } catch (err) {
    // Produce a durable, secret-free diagnostic report we can recover later.
    let report = null;
    try {
      report = await reportSigningFailure(config, err, {
        endpoint: meta.endpoint || "pass.build",
        requestId: meta.requestId,
      });
    } catch (reportErr) {
      console.error("[wallet] failed to build diagnostic report", reportErr && reportErr.message);
    }
    metadata.passStatus = "metadata-only";
    metadata.passError = (err && err.userMessage) || (err && err.message) || "Apple Wallet signing failed.";
    metadata.passErrorCode = (err && err.code) || WALLET_CODES.UNKNOWN;
    metadata.passErrorStage = (err && err.stage) || "";
    metadata.passReportId = report ? report.reportId : "";
    await appendHistory(config, metadata.customerId, {
      action: "pass.pending-signing",
      serialNumber: metadata.serialNumber,
      error: metadata.passError,
      code: metadata.passErrorCode,
      stage: metadata.passErrorStage,
      reportId: metadata.passReportId,
    });
  }
  await saveMetadata(config, metadata);
  return metadata;
}

function pushEnabled() {
  return String(process.env.APPLE_WALLET_PUSH_ENABLED || "true").toLowerCase() !== "false";
}

/**
 * Best-effort APNs push to every device registered to this pass. Reuses the
 * Pass Type ID certificate for auth (no extra credential). Prunes dead tokens
 * (410 / BadDeviceToken). Never throws into the caller — push is non-critical;
 * a failure is recorded in history with a safe reason and returned.
 *
 * @returns {Promise<{skipped?:string, attempted:number, sent:number, removed:number, connectError:object|null, reasons:object}>}
 */
async function notifyDevices(config, metadata, reason = "pass.updated") {
  const devices = Array.isArray(metadata.devices) ? metadata.devices : [];
  if (!pushEnabled()) return { skipped: "disabled", attempted: 0, sent: 0, removed: 0, connectError: null, reasons: {} };
  if (devices.length === 0) return { skipped: "no-devices", attempted: 0, sent: 0, removed: 0, connectError: null, reasons: {} };
  if (!config.passTypeIdentifier || !config.certPath || !config.keyPath) {
    return { skipped: "not-configured", attempted: 0, sent: 0, removed: 0, connectError: null, reasons: {} };
  }

  let cert, key;
  try {
    cert = await readSecretSource(config.certPath, config.rootDir, "passCert", "pass certificate");
    key = await readSecretSource(config.keyPath, config.rootDir, "privateKey", "private key");
  } catch (err) {
    await appendHistory(config, metadata.customerId, { action: "wallet_pass_push_failed", serialNumber: metadata.serialNumber, reason: (err && err.code) || "READ_FAILED" });
    return { skipped: "cert-unreadable", attempted: 0, sent: 0, removed: 0, connectError: { code: (err && err.code) || "READ_FAILED" }, reasons: {} };
  }

  let outcome;
  try {
    outcome = await apns.pushToDevices({
      cert, key, passphrase: config.certPassword || undefined,
      topic: config.passTypeIdentifier, devices,
    });
  } catch (err) {
    await appendHistory(config, metadata.customerId, { action: "wallet_pass_push_failed", serialNumber: metadata.serialNumber, reason: "APNS_ERROR" });
    return { skipped: null, attempted: devices.length, sent: 0, removed: 0, connectError: { code: "APNS_ERROR" }, reasons: {} };
  }

  // Remove dead device tokens so we stop pushing to them.
  const dead = new Set(outcome.results.filter(r => r.unregistered).map(r => r.deviceLibraryIdentifier));
  let removed = 0;
  if (dead.size) {
    const before = metadata.devices.length;
    metadata.devices = metadata.devices.filter(d => !dead.has(d.deviceLibraryIdentifier));
    removed = before - metadata.devices.length;
    if (metadata.devices.length === 0 && metadata.passInstallState === "registered") {
      metadata.passInstallState = metadata.firstDownloadedAt ? "downloaded" : "created";
    }
  }

  // Aggregate reasons (no tokens) for diagnostics.
  const reasons = {};
  for (const r of outcome.results) {
    const k = r.ok ? "Delivered" : (r.reason || `HTTP_${r.status}`);
    reasons[k] = (reasons[k] || 0) + 1;
  }

  metadata.lastPushAt = new Date().toISOString();
  await saveMetadata(config, metadata);
  await appendHistory(config, metadata.customerId, {
    action: outcome.connectError ? "wallet_pass_push_failed" : "wallet_pass_pushed",
    serialNumber: metadata.serialNumber,
    trigger: reason,
    attempted: devices.length,
    sent: outcome.sent,
    removed,
    connectError: outcome.connectError ? outcome.connectError.code : "",
  });

  return { skipped: null, attempted: devices.length, sent: outcome.sent, removed, connectError: outcome.connectError, reasons };
}

/**
 * Probe APNs connectivity + certificate auth by pushing to a throwaway token.
 * A reason like "BadDeviceToken" proves the TLS client cert authenticated and
 * the connection works (only the fake token is rejected). A connect/cert error
 * means the credential or network is the problem. Returns a secret-free result.
 */
async function testApnsConnectivity({ rootDir, storageRoot }) {
  const config = walletConfig({ rootDir, storageRoot });
  if (!config.passTypeIdentifier || !config.certPath || !config.keyPath) {
    return { ok: false, reachable: false, reason: "NOT_CONFIGURED" };
  }
  let cert, key;
  try {
    cert = await readSecretSource(config.certPath, config.rootDir, "passCert", "pass certificate");
    key = await readSecretSource(config.keyPath, config.rootDir, "privateKey", "private key");
  } catch (err) {
    return { ok: false, reachable: false, reason: (err && err.code) || "CERT_UNREADABLE" };
  }
  const dummy = "0000000000000000000000000000000000000000000000000000000000000000";
  const outcome = await apns.pushToDevices({
    cert, key, passphrase: config.certPassword || undefined,
    topic: config.passTypeIdentifier,
    devices: [{ deviceLibraryIdentifier: "probe", pushToken: dummy }],
  });
  if (outcome.connectError) {
    return { ok: false, reachable: false, host: apns.apnsHost(), reason: outcome.connectError.code, message: outcome.connectError.message };
  }
  const r = outcome.results[0] || {};
  // Any HTTP response (even a rejected token) means cert auth + reachability OK,
  // EXCEPT certificate/topic rejections which indicate a real credential issue.
  const credentialProblem = ["BadCertificate", "BadCertificateEnvironment", "Forbidden", "MissingTopic", "TopicDisallowed"].includes(r.reason);
  return {
    ok: !credentialProblem,
    reachable: true,
    host: apns.apnsHost(),
    topic: config.passTypeIdentifier,
    status: r.status,
    reason: r.reason || "",
    interpretation: credentialProblem
      ? "APNs reachable but rejected the certificate/topic — check the Pass Type ID certificate."
      : "APNs reachable and the certificate authenticated (the dummy token was rejected as expected).",
  };
}

/** Public: rebuild + push the current pass to its registered devices. */
async function pushPassUpdate({ rootDir, storageRoot, serialNumber, reason = "manual" }) {
  const found = await findWalletBySerial({ rootDir, storageRoot, serialNumber });
  if (!found) return null;
  await tryBuildPass(found.config, found.metadata, { endpoint: "push" });
  const summary = await notifyDevices(found.config, found.metadata, reason);
  return { metadata: found.metadata, push: summary };
}

async function ensureWalletForBooking({ rootDir, storageRoot, booking }) {
  const config = walletConfig({ rootDir, storageRoot });
  const input = customerFromBooking(booking);
  let metadata = await loadMetadata(config, input.customerId);
  if (!metadata) {
    metadata = defaultMetadata(input, config);
    await appendHistory(config, metadata.customerId, {
      action: "wallet.created",
      serialNumber: metadata.serialNumber,
      bookingId: booking.id,
    });
  }

  metadata.holderName = input.holderName || metadata.holderName;
  metadata.email = input.email || metadata.email;
  metadata.phone = input.phone || metadata.phone;
  metadata.bookingId = input.bookingId || metadata.bookingId;
  metadata.serviceName = input.serviceName || metadata.serviceName;
  metadata.bookingDate = input.bookingDate || metadata.bookingDate;
  metadata.bookingTime = input.bookingTime || metadata.bookingTime;
  metadata.barberName = input.barberName || metadata.barberName || "Any available";
  metadata.location = input.location || metadata.location || config.businessLocation;
  metadata.bookingStatus = booking.status === "confirmed" ? "confirmed" : "pending";
  metadata.lastBookingId = booking.id || metadata.lastBookingId;
  metadata.currentBookingId = booking.id || metadata.currentBookingId || null;
  metadata.lastUpdatedTag = new Date().toISOString();

  await saveMetadata(config, metadata);
  await tryBuildPass(config, metadata);
  await notifyDevices(config, metadata, "booking.updated");
  return metadata;
}

// In-process guard so two concurrent requests for the same customer can never
// create two passes. Single-threaded JS guarantees the has/set runs atomically
// before the first await; the second caller awaits the same in-flight promise.
const customerPassLocks = new Map();

/**
 * Idempotent, race-safe "one loyalty pass per customer".
 * Creates only the metadata record (no .pkpass build) — the binary is produced
 * on demand when the customer taps "Add to Apple Wallet". Returns the existing
 * pass if one already exists; never creates a duplicate.
 */
async function ensureWalletPassForCustomer({ rootDir, storageRoot, customer }) {
  const customerId = String(customer && customer.id || "").trim();
  if (!customerId) throw Object.assign(new Error("customer.id is required"), { code: "WALLET_CUSTOMER_ID_REQUIRED" });

  if (customerPassLocks.has(customerId)) return customerPassLocks.get(customerId);

  const work = (async () => {
    const config = walletConfig({ rootDir, storageRoot });
    let metadata = await loadMetadata(config, customerId);
    if (metadata) {
      // Reuse the existing pass; refresh non-identity holder fields only.
      let changed = false;
      const holderName = customer.name || [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
      if (holderName && metadata.holderName !== holderName) { metadata.holderName = holderName; changed = true; }
      if (customer.email && metadata.email !== customer.email) { metadata.email = customer.email; changed = true; }
      if (customer.phone && metadata.phone !== customer.phone) { metadata.phone = customer.phone; changed = true; }
      if (changed) {
        metadata.lastUpdatedTag = new Date().toISOString();
        await saveMetadata(config, metadata);
      }
      await appendHistory(config, customerId, { action: "existing_wallet_pass_reused", serialNumber: metadata.serialNumber });
      return metadata;
    }

    const holderName = customer.name || [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || "Urban Kings Member";
    metadata = defaultMetadata({
      customerId,
      holderName,
      email: customer.email || "",
      phone: customer.phone || "",
      origin: "account",
    }, config);
    metadata.serviceName = metadata.serviceName || "Urban Kings Loyalty";
    await saveMetadata(config, metadata);
    await appendHistory(config, customerId, { action: "wallet_pass_record_created", serialNumber: metadata.serialNumber });
    return metadata;
  })();

  customerPassLocks.set(customerId, work);
  try {
    return await work;
  } finally {
    customerPassLocks.delete(customerId);
  }
}

/**
 * Ensure the customer's pass exists, build the current .pkpass, mark it as
 * downloaded, and return the downloadable result + metadata. Used by the
 * session-protected GET /api/wallet/apple/me endpoint.
 */
async function downloadCustomerWalletPass({ rootDir, storageRoot, customer }) {
  const config = walletConfig({ rootDir, storageRoot });
  const metadata = await ensureWalletPassForCustomer({ rootDir, storageRoot, customer });
  await tryBuildPass(config, metadata, { endpoint: "/api/wallet/apple/me" });
  const result = await downloadablePass({ rootDir, storageRoot, serialNumber: metadata.serialNumber });
  if (result.ok) {
    const stamp = new Date().toISOString();
    metadata.firstDownloadedAt = metadata.firstDownloadedAt || stamp;
    metadata.lastDownloadedAt = stamp;
    if (metadata.passInstallState !== "registered") metadata.passInstallState = "downloaded";
    await saveMetadata(config, metadata);
    await appendHistory(config, metadata.customerId, { action: "wallet_pass_downloaded", serialNumber: metadata.serialNumber });
  }
  return { result, metadata };
}

/**
 * Apple Wallet device registration (web service). Stores the device's push
 * token so a later push (Phase 3) can tell the device to refresh the pass.
 * Returns { ok, status } using Apple's expected status codes (201 new / 200
 * already registered / 401 bad auth / 404 unknown serial).
 */
async function registerDevice({ rootDir, storageRoot, serialNumber, deviceLibraryIdentifier, pushToken, authToken }) {
  const found = await findWalletBySerial({ rootDir, storageRoot, serialNumber });
  if (!found) return { ok: false, status: 404 };
  if (!authToken || authToken !== found.metadata.authenticationToken) return { ok: false, status: 401 };

  const config = found.config;
  const metadata = found.metadata;
  if (!Array.isArray(metadata.devices)) metadata.devices = [];
  const existing = metadata.devices.find(d => d.deviceLibraryIdentifier === deviceLibraryIdentifier);
  const stamp = new Date().toISOString();
  if (existing) {
    existing.pushToken = pushToken || existing.pushToken;
    existing.updatedAt = stamp;
    await saveMetadata(config, metadata);
    return { ok: true, status: 200 };
  }
  metadata.devices.push({ deviceLibraryIdentifier, pushToken: pushToken || "", registeredAt: stamp, updatedAt: stamp });
  metadata.passInstallState = "registered";
  await saveMetadata(config, metadata);
  await appendHistory(config, metadata.customerId, {
    action: "wallet_pass_registered_on_device",
    serialNumber: metadata.serialNumber,
    deviceCount: metadata.devices.length,
  });
  return { ok: true, status: 201 };
}

async function unregisterDevice({ rootDir, storageRoot, serialNumber, deviceLibraryIdentifier, authToken }) {
  const found = await findWalletBySerial({ rootDir, storageRoot, serialNumber });
  if (!found) return { ok: false, status: 404 };
  if (!authToken || authToken !== found.metadata.authenticationToken) return { ok: false, status: 401 };
  const config = found.config;
  const metadata = found.metadata;
  metadata.devices = (metadata.devices || []).filter(d => d.deviceLibraryIdentifier !== deviceLibraryIdentifier);
  if (metadata.devices.length === 0 && metadata.passInstallState === "registered") {
    metadata.passInstallState = metadata.firstDownloadedAt ? "downloaded" : "created";
  }
  await saveMetadata(config, metadata);
  await appendHistory(config, metadata.customerId, {
    action: "wallet_pass_unregistered_device",
    serialNumber: metadata.serialNumber,
    deviceCount: metadata.devices.length,
  });
  return { ok: true, status: 200 };
}

/**
 * Serial numbers of passes registered to a device that changed since a tag.
 * Apple polls this; we compare against each pass's lastUpdatedTag/updatedAt.
 */
async function devicePassUpdates({ rootDir, storageRoot, deviceLibraryIdentifier, passTypeIdentifier, updatedSince }) {
  const config = walletConfig({ rootDir, storageRoot });
  let dirs = [];
  try {
    dirs = await fsp.readdir(config.storagePath);
  } catch (_) {
    return { serialNumbers: [], lastUpdated: new Date().toISOString() };
  }
  const serialNumbers = [];
  let latest = updatedSince || "";
  for (const dir of dirs) {
    const metadata = await readJson(walletPaths(config, dir).metadata, null);
    if (!metadata || !Array.isArray(metadata.devices)) continue;
    if (!metadata.devices.some(d => d.deviceLibraryIdentifier === deviceLibraryIdentifier)) continue;
    if (passTypeIdentifier && config.passTypeIdentifier && passTypeIdentifier !== config.passTypeIdentifier) continue;
    const tag = metadata.lastUpdatedTag || metadata.updatedAt || "";
    if (!updatedSince || String(tag) > String(updatedSince)) {
      serialNumbers.push(metadata.serialNumber);
      if (String(tag) > String(latest)) latest = tag;
    }
  }
  return { serialNumbers, lastUpdated: latest || new Date().toISOString() };
}

async function generateTestWallet({ rootDir, storageRoot }) {
  const config = walletConfig({ rootDir, storageRoot });
  let metadata = await loadMetadata(config, "test-client");
  if (!metadata) {
    metadata = defaultMetadata({
      customerId: "test-client",
      holderName: "Test Client",
      email: "test@urbankings.local",
      phone: "",
      lastBookingId: "test-booking",
    }, config);
  }
  metadata.membershipStatus = "active";
  metadata.bookingStatus = "pending";
  metadata.bookingId = "test-booking";
  metadata.serviceName = "Top Kings";
  metadata.bookingDate = new Date().toISOString().slice(0, 10);
  metadata.bookingTime = "10:00";
  metadata.barberName = "Urban Kings";
  metadata.location = config.businessLocation;
  metadata.visits = 0;
  metadata.reward = config.rewardText;
  await saveMetadata(config, metadata);
  await appendHistory(config, metadata.customerId, { action: "wallet.test-generated", serialNumber: metadata.serialNumber });
  await tryBuildPass(config, metadata);
  return metadata;
}

async function updateWalletForBookingStatus({ rootDir, storageRoot, booking }) {
  const config = walletConfig({ rootDir, storageRoot });
  const customerId = booking.walletCustomerId || walletCustomerIdFromBooking(booking);
  const metadata = await loadMetadata(config, customerId);
  if (!metadata) return null;
  metadata.bookingStatus = booking.status === "confirmed"
    ? "confirmed"
    : booking.status === "completed"
      ? "completed"
      : booking.status === "cancelled"
        ? "cancelled"
        : "pending";
  metadata.lastBookingId = booking.id || metadata.lastBookingId;
  metadata.bookingId = booking.id || metadata.bookingId;
  metadata.serviceName = booking.serviceName || booking.service || metadata.serviceName;
  metadata.bookingDate = booking.date || metadata.bookingDate;
  metadata.bookingTime = booking.time || metadata.bookingTime;
  metadata.barberName = booking.barberName || metadata.barberName || "Any available";
  metadata.location = booking.location || metadata.location || config.businessLocation;
  await appendHistory(config, metadata.customerId, {
    action: "booking.status-updated",
    bookingId: booking.id,
    status: metadata.bookingStatus,
  });
  metadata.lastUpdatedTag = new Date().toISOString();
  await saveMetadata(config, metadata);
  await tryBuildPass(config, metadata);
  await notifyDevices(config, metadata, "booking.status-updated");
  return metadata;
}

async function simulateVisit({ rootDir, storageRoot, serialNumber }) {
  const config = walletConfig({ rootDir, storageRoot });
  const wallet = await findWalletBySerial({ rootDir, storageRoot, serialNumber });
  if (!wallet) return null;
  const metadata = wallet.metadata;
  metadata.visits = Math.min(Number(metadata.visits || 0) + 1, Number(metadata.visitsGoal || config.rewardGoal));
  if (metadata.visits >= metadata.visitsGoal) {
    metadata.reward = "Free Haircut Available";
  }
  metadata.lastUpdatedTag = new Date().toISOString();
  await appendHistory(config, metadata.customerId, {
    action: "visit.simulated",
    serialNumber: metadata.serialNumber,
    visits: metadata.visits,
  });
  await saveMetadata(config, metadata);
  await tryBuildPass(config, metadata);
  await notifyDevices(config, metadata, "visit.simulated");
  return metadata;
}

async function findWalletBySerial({ rootDir, storageRoot, serialNumber }) {
  const config = walletConfig({ rootDir, storageRoot });
  let dirs = [];
  try {
    dirs = await fsp.readdir(config.storagePath);
  } catch (_) {
    return null;
  }
  for (const dir of dirs) {
    const metadata = await readJson(walletPaths(config, dir).metadata, null);
    if (metadata && metadata.serialNumber === serialNumber) {
      return { metadata, paths: walletPaths(config, metadata.customerId), config };
    }
  }
  return null;
}

async function findWalletForBooking({ rootDir, storageRoot, booking }) {
  const config = walletConfig({ rootDir, storageRoot });
  const customerId = booking.walletCustomerId || walletCustomerIdFromBooking(booking);
  const metadata = await loadMetadata(config, customerId);
  if (!metadata) return null;
  return { metadata, paths: walletPaths(config, metadata.customerId), config };
}

async function walletStats({ rootDir, storageRoot }) {
  const config = walletConfig({ rootDir, storageRoot });
  let dirs = [];
  try {
    dirs = await fsp.readdir(config.storagePath);
  } catch (_) {
    dirs = [];
  }
  const wallets = [];
  for (const dir of dirs) {
    const metadata = await readJson(walletPaths(config, dir).metadata, null);
    if (metadata) wallets.push(metadata);
  }
  const safeWallet = wallet => ({
    walletId: wallet.walletId,
    customerId: wallet.customerId,
    serialNumber: wallet.serialNumber,
    holderName: wallet.holderName,
    membershipStatus: wallet.membershipStatus,
    bookingStatus: wallet.bookingStatus,
    visits: wallet.visits,
    visitsGoal: wallet.visitsGoal,
    reward: wallet.reward,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
    lastBookingId: wallet.lastBookingId,
    lastPushAt: wallet.lastPushAt,
    passStatus: wallet.passStatus,
    passError: wallet.passError,
  });
  const diagnostics = signingDiagnostics(config, rootDir);
  const certsReady = diagnostics.certificates.passCertificate.readable
    && diagnostics.certificates.privateKey.readable
    && diagnostics.certificates.wwdrCertificate.readable;
  const missing = missingSigningConfig(config);
  return {
    totalWalletMembers: wallets.length,
    walletsGenerated: wallets.filter(w => w.passStatus === "signed").length,
    metadataOnly: wallets.filter(w => w.passStatus !== "signed").length,
    activeRewards: wallets.filter(w => String(w.reward || "").toLowerCase().includes("available")).length,
    lastUpdates: wallets.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 6).map(safeWallet),
    signingReady: missing.length === 0 && certsReady,
    missingSigningConfig: missing,
    signingDiagnostics: diagnostics,
  };
}

async function downloadablePass({ rootDir, storageRoot, serialNumber }) {
  const found = await findWalletBySerial({ rootDir, storageRoot, serialNumber: safeSegment(serialNumber) });
  if (!found) return { ok: false, status: 404, error: "Wallet not found.", code: "WALLET_NOT_FOUND" };
  if (!(await passExists(found.config, found.metadata.customerId))) {
    return {
      ok: false,
      status: 409,
      error: found.metadata.passError || "Signed .pkpass is not available yet.",
      code: found.metadata.passErrorCode || "PKPASS_NOT_SIGNED",
      stage: found.metadata.passErrorStage || "",
      reportId: found.metadata.passReportId || "",
      metadata: safeMetadata(found.metadata),
    };
  }
  return { ok: true, metadata: found.metadata, path: found.paths.pass };
}

/**
 * Run wallet configuration diagnostics on demand and persist the report.
 * Returns the sanitised report (no secrets, no server stack).
 */
async function runWalletDiagnostics({ rootDir, storageRoot, meta = {} }) {
  const config = walletConfig({ rootDir, storageRoot });
  const report = getWalletConfigurationDiagnostics(config, {
    endpoint: meta.endpoint || "/api/admin/wallet/diagnostics",
    requestId: meta.requestId,
  });
  await writeWalletReport(config, report, {});
  return sanitizeReportForClient(report);
}

async function walletReportHistory({ rootDir, storageRoot, limit = 50 }) {
  const config = walletConfig({ rootDir, storageRoot });
  return listWalletReports(config, { limit });
}

async function walletReportById({ rootDir, storageRoot, reportId }) {
  const config = walletConfig({ rootDir, storageRoot });
  return readWalletReport(config, reportId);
}

async function setWalletStatus({ rootDir, storageRoot, serialNumber, status }) {
  const found = await findWalletBySerial({ rootDir, storageRoot, serialNumber });
  if (!found) return null;
  const allowed = ["active", "suspended", "cancelled"];
  const next = allowed.includes(status) ? status : "active";
  found.metadata.status = next;
  found.metadata.lastUpdatedTag = new Date().toISOString();
  await saveMetadata(found.config, found.metadata);
  await appendHistory(found.config, found.metadata.customerId, {
    action: `wallet_pass_${next}`,
    serialNumber: found.metadata.serialNumber,
  });
  return found.metadata;
}

module.exports = {
  devicePassUpdates,
  downloadablePass,
  downloadCustomerWalletPass,
  ensureWalletForBooking,
  ensureWalletPassForCustomer,
  findWalletBySerial,
  findWalletForBooking,
  generateTestWallet,
  pushPassUpdate,
  registerDevice,
  runWalletDiagnostics,
  setWalletStatus,
  simulateVisit,
  testApnsConnectivity,
  unregisterDevice,
  updateWalletForBookingStatus,
  walletConfig,
  walletReportById,
  walletReportHistory,
  walletStats,
  walletCustomerIdFromBooking,
};
