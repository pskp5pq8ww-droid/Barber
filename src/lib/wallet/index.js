const crypto = require("crypto");
const fsp = require("fs/promises");

const { walletConfig, missingSigningConfig } = require("./config");
const { appendHistory, passExists, readJson, safeSegment, walletPaths, writeJson } = require("./storage");
const { buildSignedPass } = require("./passkit");

function walletCustomerIdFromBooking(booking) {
  if (booking.customerId) return booking.customerId;
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
    membershipStatus: "active",
    bookingStatus: "pending",
    visits: 0,
    visitsGoal: config.rewardGoal,
    reward: config.rewardText,
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
  await writeJson(walletPaths(config, metadata.customerId).metadata, metadata);
  return metadata;
}

async function tryBuildPass(config, metadata) {
  const paths = walletPaths(config, metadata.customerId);
  try {
    await buildSignedPass(config, metadata, paths.pass);
    metadata.passStatus = "signed";
    metadata.passError = "";
    await appendHistory(config, metadata.customerId, {
      action: "pass.generated",
      serialNumber: metadata.serialNumber,
    });
  } catch (err) {
    metadata.passStatus = "metadata-only";
    metadata.passError = err.message;
    await appendHistory(config, metadata.customerId, {
      action: "pass.pending-signing",
      serialNumber: metadata.serialNumber,
      error: err.message,
      code: err.code || "",
    });
  }
  await saveMetadata(config, metadata);
  return metadata;
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
  metadata.bookingStatus = booking.status === "confirmed" ? "confirmed" : "pending";
  metadata.lastBookingId = booking.id || metadata.lastBookingId;

  await saveMetadata(config, metadata);
  await tryBuildPass(config, metadata);
  return metadata;
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
  await appendHistory(config, metadata.customerId, {
    action: "booking.status-updated",
    bookingId: booking.id,
    status: metadata.bookingStatus,
  });
  await saveMetadata(config, metadata);
  await tryBuildPass(config, metadata);
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
  await appendHistory(config, metadata.customerId, {
    action: "visit.simulated",
    serialNumber: metadata.serialNumber,
    visits: metadata.visits,
  });
  await saveMetadata(config, metadata);
  await tryBuildPass(config, metadata);
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
  return {
    totalWalletMembers: wallets.length,
    walletsGenerated: wallets.filter(w => w.passStatus === "signed").length,
    metadataOnly: wallets.filter(w => w.passStatus !== "signed").length,
    activeRewards: wallets.filter(w => String(w.reward || "").toLowerCase().includes("available")).length,
    lastUpdates: wallets.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 6).map(safeWallet),
    signingReady: missingSigningConfig(config).length === 0,
    missingSigningConfig: missingSigningConfig(config),
  };
}

async function downloadablePass({ rootDir, storageRoot, serialNumber }) {
  const found = await findWalletBySerial({ rootDir, storageRoot, serialNumber: safeSegment(serialNumber) });
  if (!found) return { ok: false, status: 404, error: "Wallet not found." };
  if (!(await passExists(found.config, found.metadata.customerId))) {
    return {
      ok: false,
      status: 409,
      error: found.metadata.passError || "Signed .pkpass is not available yet.",
      metadata: safeMetadata(found.metadata),
    };
  }
  return { ok: true, metadata: found.metadata, path: found.paths.pass };
}

module.exports = {
  downloadablePass,
  ensureWalletForBooking,
  findWalletBySerial,
  generateTestWallet,
  simulateVisit,
  updateWalletForBookingStatus,
  walletConfig,
  walletStats,
  walletCustomerIdFromBooking,
};
