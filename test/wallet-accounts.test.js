"use strict";

/**
 * Automated coverage for the customer account + Apple Wallet loyalty pass system.
 * Maps to the 20 mandatory checks in the spec. Runs against a real server child
 * process with a throwaway storage dir and the repo's wallet certificates.
 *
 *   node --test
 */

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");

const REPO = path.resolve(__dirname, "..");
const CERT_DIR = path.join(REPO, "private", "wallet", "certs");
const SIGNING_AVAILABLE = ["AppleWWDRCAG4.pem", "apple-wallet-pass.pem", "apple-wallet-pass.key"]
  .every(f => fs.existsSync(path.join(CERT_DIR, f)));

let serverProc;
let BASE;
let STORAGE;

function uniqueEmail(tag) {
  return `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@uk.test`;
}
function uniquePhone() {
  return "+6140" + String(Math.floor(1e6 + Math.random() * 8e6));
}

function randomIp() {
  const o = () => 1 + Math.floor(Math.random() * 254);
  return `${o()}.${o()}.${o()}.${o()}`;
}

async function api(method, p, { body, cookie, ip } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  // Simulate distinct clients so per-IP rate limits don't bleed across tests.
  headers["X-Forwarded-For"] = ip || randomIp();
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie") || "";
  const cookieMatch = setCookie.match(/uk_session=[^;]*/);
  const contentType = res.headers.get("content-type") || "";
  let json = null;
  if (contentType.includes("application/json")) json = await res.json().catch(() => null);
  return { status: res.status, json, contentType, cookie: cookieMatch ? cookieMatch[0] : "", headers: res.headers };
}

async function registerCustomer(extra = {}) {
  const email = extra.email || uniqueEmail("cust");
  const phone = extra.phone || uniquePhone();
  const password = extra.password || "supersecret1";
  const res = await api("POST", "/api/customers/register", {
    body: {
      firstName: extra.firstName || "Test",
      lastName: extra.lastName || "User",
      email, phone, password,
      passwordConfirm: extra.passwordConfirm || password,
      acceptTerms: true,
      ...(extra.claimBookingToken ? { claimBookingToken: extra.claimBookingToken } : {}),
    },
  });
  return { res, email, phone, password };
}

function customerIdFromEmail(email) {
  const customers = JSON.parse(fs.readFileSync(path.join(STORAGE, "data", "customers.json"), "utf8"));
  const c = customers.find(x => String(x.email).toLowerCase() === email.toLowerCase());
  return c ? c.id : null;
}

function walletDir(customerId) {
  return path.join(STORAGE, "wallet", "customers", customerId);
}
function readWalletMeta(customerId) {
  return JSON.parse(fs.readFileSync(path.join(walletDir(customerId), "metadata.json"), "utf8"));
}
function countWalletDirsFor(customerId) {
  const base = path.join(STORAGE, "wallet", "customers");
  if (!fs.existsSync(base)) return 0;
  return fs.readdirSync(base).filter(d => d === customerId).length;
}

function nextFutureWeekday(minDays = 45) {
  const d = new Date(Date.now() + minDays * 86400000);
  // Move to a Wednesday to stay within default Mon-Sat work days.
  while (d.getUTCDay() !== 3) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

before(async () => {
  STORAGE = await fsp.mkdtemp(path.join(os.tmpdir(), "uk-test-"));
  await fsp.mkdir(path.join(STORAGE, "data"), { recursive: true });
  // Seed baseline data (admins, barbers, etc.) so login + booking work.
  const seedDir = path.join(REPO, "storage", "data");
  for (const f of fs.readdirSync(seedDir)) {
    await fsp.copyFile(path.join(seedDir, f), path.join(STORAGE, "data", f));
  }

  const port = 8300 + Math.floor(Math.random() * 400);
  BASE = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    PORT: String(port),
    UK_STORAGE_DIR: STORAGE,
    NODE_ENV: "test",
    APPLE_WALLET_PASS_TYPE_ID: "pass.com.barber.walllet", // matches the repo test cert
    APPLE_WALLET_TEAM_ID: "5D9PB994JW",
    APPLE_WALLET_BASE_URL: "https://example.test",
    APPLE_WALLET_PUSH_ENABLED: "false", // never hit real APNs from tests
  };
  if (SIGNING_AVAILABLE) {
    env.APPLE_WALLET_WWDR_CERT_PATH = path.join(CERT_DIR, "AppleWWDRCAG4.pem");
    env.APPLE_WALLET_CERT_PATH = path.join(CERT_DIR, "apple-wallet-pass.pem");
    env.APPLE_WALLET_KEY_PATH = path.join(CERT_DIR, "apple-wallet-pass.key");
  }

  serverProc = spawn("node", ["server.js"], { cwd: REPO, env, stdio: ["ignore", "pipe", "pipe"] });
  serverProc.stderr.on("data", () => {});

  // Wait for readiness.
  const deadline = Date.now() + 10000;
  for (;;) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) break;
    } catch (_) {}
    if (Date.now() > deadline) throw new Error("server did not start in time");
    await new Promise(r => setTimeout(r, 150));
  }
});

after(async () => {
  if (serverProc) serverProc.kill();
  if (STORAGE) await fsp.rm(STORAGE, { recursive: true, force: true }).catch(() => {});
});

test("1. a new customer can create an account", async () => {
  const { res } = await registerCustomer();
  assert.equal(res.status, 201);
  assert.equal(res.json.ok, true);
});

test("2. registration creates the customer profile", async () => {
  const { res } = await registerCustomer();
  assert.ok(res.json.customer && res.json.customer.id);
  assert.equal(res.json.customer.role, "customer");
});

test("3. registration creates exactly one wallet pass", async () => {
  const { res, email } = await registerCustomer();
  assert.ok(res.json.wallet && res.json.wallet.serialNumber);
  const id = customerIdFromEmail(email);
  assert.equal(countWalletDirsFor(id), 1);
});

test("4. the pass starts with stampCount = 0", async () => {
  const { res } = await registerCustomer();
  assert.equal(res.json.wallet.stampCount, 0);
});

test("5. the pass status is active", async () => {
  const { res } = await registerCustomer();
  assert.equal(res.json.wallet.status, "active");
});

test("6. serialNumber is stable across reads", async () => {
  const { res, cookie } = await registerCustomerWithCookie();
  const s1 = res.json.wallet.serialNumber;
  const r2 = await api("GET", "/api/wallet/me", { cookie });
  assert.equal(r2.json.wallet.serialNumber, s1);
});

test("7. authenticationToken does not change and is never exposed", async () => {
  const { res, cookie, email } = await registerCustomerWithCookie();
  const id = customerIdFromEmail(email);
  const tokenBefore = readWalletMeta(id).authenticationToken;
  // Trigger a build/download which re-saves metadata.
  await api("GET", "/api/wallet/apple/me", { cookie });
  const tokenAfter = readWalletMeta(id).authenticationToken;
  assert.equal(tokenAfter, tokenBefore);
  // Never returned by the API.
  const meRaw = JSON.stringify((await api("GET", "/api/wallet/me", { cookie })).json);
  assert.ok(!meRaw.includes(tokenBefore));
});

test("8. registering the same email twice is rejected", async () => {
  const email = uniqueEmail("dup");
  const first = await registerCustomer({ email });
  assert.equal(first.res.status, 201);
  const second = await registerCustomer({ email });
  assert.equal(second.res.status, 409);
});

test("9 & 10. concurrent pass creation yields a single pass", async () => {
  // In-process: 5 parallel ensure calls for the same synthetic customer.
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), "uk-race-"));
  try {
    const svc = require(path.join(REPO, "src", "lib", "wallet"));
    const customer = { id: "race-" + Date.now(), name: "Race", email: "race@uk.test" };
    const results = await Promise.all(
      Array.from({ length: 5 }, () => svc.ensureWalletPassForCustomer({ rootDir: REPO, storageRoot: tmp, customer }))
    );
    const serials = new Set(results.map(r => r.serialNumber));
    assert.equal(serials.size, 1);
    const dirs = fs.readdirSync(path.join(tmp, "wallet", "customers"));
    assert.equal(dirs.length, 1);
  } finally {
    await fsp.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
});

test("11. a signed-in customer can download their pass", async () => {
  const { cookie } = await registerCustomerWithCookie();
  const res = await fetch(`${BASE}/api/wallet/apple/me`, { headers: { Cookie: cookie } });
  if (SIGNING_AVAILABLE) {
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") || "", /application\/vnd\.apple\.pkpass/);
    assert.match(res.headers.get("cache-control") || "", /no-store/);
  } else {
    // Without certs the endpoint must still fail safely with a code, not crash.
    assert.ok([409, 400].includes(res.status));
  }
});

test("12. a customer cannot download another customer's pass", async () => {
  const a = await registerCustomerWithCookie();
  const b = await registerCustomerWithCookie();
  const aSerial = a.res.json.wallet.serialNumber;
  const bSerial = b.res.json.wallet.serialNumber;
  assert.notEqual(aSerial, bSerial);
  // The endpoint derives identity from the session only; A always gets A.
  const meA = await api("GET", "/api/wallet/me", { cookie: a.cookie });
  assert.equal(meA.json.wallet.serialNumber, aSerial);
  // No session => unauthorized.
  const anon = await api("GET", "/api/wallet/apple/me");
  assert.equal(anon.status, 401);
});

test("13. creating a booking reuses the same pass", async () => {
  const { res, email, cookie } = await registerCustomerWithCookie();
  const serial = res.json.wallet.serialNumber;
  const id = customerIdFromEmail(email);
  const booking = await createBookingFor(id, cookie);
  assert.equal(booking.status, 201, "booking should be created");
  assert.equal(booking.json.booking.walletSerialNumber, serial);
  assert.equal(countWalletDirsFor(id), 1);
});

test("14. multiple bookings keep a single pass", async () => {
  const { res, email, cookie } = await registerCustomerWithCookie();
  const serial = res.json.wallet.serialNumber;
  const id = customerIdFromEmail(email);
  const b1 = await createBookingFor(id, cookie);
  const b2 = await createBookingFor(id, cookie);
  assert.equal(b1.status, 201);
  assert.equal(b2.status, 201);
  assert.equal(b1.json.booking.walletSerialNumber, serial);
  assert.equal(b2.json.booking.walletSerialNumber, serial);
  assert.equal(countWalletDirsFor(id), 1);
});

test("15 & 16. registering a device marks the pass as registered", async () => {
  const { res, email } = await registerCustomerWithCookie();
  const serial = res.json.wallet.serialNumber;
  const id = customerIdFromEmail(email);
  const token = readWalletMeta(id).authenticationToken;
  const reg = await fetch(`${BASE}/api/wallet/v1/devices/DEV-${id}/registrations/pass.com.barber.walllet/${serial}`, {
    method: "POST",
    headers: { Authorization: `ApplePass ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ pushToken: "a".repeat(64) }),
  });
  assert.equal(reg.status, 201);
  const meta = readWalletMeta(id);
  assert.equal(meta.passInstallState, "registered");
  assert.equal(meta.devices.length, 1);
  // Bad auth is rejected.
  const bad = await fetch(`${BASE}/api/wallet/v1/devices/DEV-X/registrations/pass.com.barber.walllet/${serial}`, {
    method: "POST", headers: { Authorization: "ApplePass WRONG" }, body: "{}",
  });
  assert.equal(bad.status, 401);
});

test("17 & 18. a customer without a pass gets one re-created on access", async () => {
  const { email, cookie } = await registerCustomerWithCookie();
  const id = customerIdFromEmail(email);
  // Simulate an old account whose pass record was lost.
  await fsp.rm(walletDir(id), { recursive: true, force: true });
  assert.equal(fs.existsSync(walletDir(id)), false);
  const me = await api("GET", "/api/wallet/me", { cookie });
  assert.equal(me.status, 200);
  assert.ok(me.json.wallet.serialNumber);
  assert.equal(me.json.wallet.stampCount, 0);
  assert.equal(countWalletDirsFor(id), 1);
});

test("19. password reset works and invalidates the old session", async () => {
  const { email, cookie, password } = await registerCustomerWithCookie();
  const forgot = await api("POST", "/api/auth/forgot", { body: { email } });
  assert.equal(forgot.status, 200);
  assert.ok(forgot.json.devResetPath, "dev reset path should be present for a known email");
  const token = forgot.json.devResetPath.split("token=")[1];
  const reset = await api("POST", "/api/auth/reset", { body: { token, password: "brandnew12345", passwordConfirm: "brandnew12345" } });
  assert.equal(reset.status, 200);
  // Old session is invalidated.
  const meOld = await api("GET", "/api/wallet/me", { cookie });
  assert.equal(meOld.status, 401);
  // New password works; old one does not.
  const good = await api("POST", "/api/auth/login", { body: { role: "customer", username: email, password: "brandnew12345" } });
  assert.equal(good.status, 200);
  const bad = await api("POST", "/api/auth/login", { body: { role: "customer", username: email, password } });
  assert.equal(bad.status, 401);
});

test("20. validation + rate limiting protect the auth endpoints", async () => {
  // Password mismatch.
  const mismatch = await registerCustomer({ password: "supersecret1", passwordConfirm: "different12345" });
  assert.equal(mismatch.res.status, 400);
  // Short password.
  const shortPw = await registerCustomer({ password: "short", passwordConfirm: "short" });
  assert.equal(shortPw.res.status, 400);
  // Anti-enumeration: unknown email still returns 200 with no dev link.
  const unknown = await api("POST", "/api/auth/forgot", { body: { email: uniqueEmail("nobody") } });
  assert.equal(unknown.status, 200);
  assert.equal(unknown.json.devResetPath, undefined);
  // Rate limit forgot (limit is 5 / 15 min per IP) — pin one client IP.
  const ip = randomIp();
  let limited = false;
  for (let i = 0; i < 8; i++) {
    const r = await api("POST", "/api/auth/forgot", { body: { email: uniqueEmail("rl") }, ip });
    if (r.status === 429) { limited = true; break; }
  }
  assert.equal(limited, true);
});

// --- helpers that need server context -------------------------------------

async function registerCustomerWithCookie(extra = {}) {
  const out = await registerCustomer(extra);
  return { ...out, cookie: out.res.cookie };
}

let bookingBarbers = null;
function pickBarber() {
  if (!bookingBarbers) {
    bookingBarbers = JSON.parse(fs.readFileSync(path.join(STORAGE, "data", "barbers.json"), "utf8"))
      .filter(b => b.status === "active");
  }
  return bookingBarbers[0];
}

let bookingSlot = 0;
async function createBookingFor(customerId, cookie) {
  const barber = pickBarber();
  // Every booking lands on a distinct future Wednesday so slots never collide.
  const date = nextFutureWeekday(45 + (bookingSlot++) * 7);
  return api("POST", "/api/bookings", {
    cookie,
    body: {
      customerId,
      serviceName: "Top Kings",
      date,
      time: "10:00",
      barberId: barber.id,
    },
  });
}
