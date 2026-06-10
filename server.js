const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const PORT = process.env.PORT || 8123;
let STORAGE_ROOT = process.env.UK_STORAGE_DIR || "/storage/cd";
let DATA_DIR = path.join(STORAGE_ROOT, "data");
let BACKUP_DIR = path.join(STORAGE_ROOT, "backups");
let UPLOAD_DIR = path.join(STORAGE_ROOT, "uploads");
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 1024 * 1024;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

const DATA_FILES = {
  admins: "admins.json",
  barbers: "barbers.json",
  customers: "customers.json",
  bookings: "bookings.json",
  roster: "roster.json",
  notifications: "notifications.json",
  activityLog: "activity-log.json",
  settings: "settings.json",
  payments: "payments.json",
  sessions: "sessions.json",
};

let writeQueue = Promise.resolve();

function setStorageRoot(storageRoot) {
  STORAGE_ROOT = storageRoot;
  DATA_DIR = path.join(STORAGE_ROOT, "data");
  BACKUP_DIR = path.join(STORAGE_ROOT, "backups");
  UPLOAD_DIR = path.join(STORAGE_ROOT, "uploads");
}

function now() {
  return new Date().toISOString();
}

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const digest = crypto.pbkdf2Sync(String(password), salt, 210000, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$210000$${salt}$${digest}`;
}

function verifyPassword(password, encoded) {
  const parts = String(encoded || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") return false;
  const [, iterations, salt, digest] = parts;
  const test = crypto.pbkdf2Sync(String(password), salt, Number(iterations), 32, "sha256").toString("hex");
  const stored = Buffer.from(digest, "hex");
  const checked = Buffer.from(test, "hex");
  return stored.length === checked.length && crypto.timingSafeEqual(stored, checked);
}

function configuredAdmins(adminPassword = process.env.URBAN_KINGS_ADMIN_PASSWORD || "admin2026") {
  return [
    {
      id: "a001",
      username: "admin",
      passwordHash: hashPassword(adminPassword),
      name: "Carlos Admin",
      email: "admin@urbankings.com.au",
      phone: "+61 400 000 001",
      role: "admin",
      status: "active",
      avatar: "CA",
    },
    {
      id: "a002",
      username: "admin2",
      passwordHash: hashPassword(adminPassword),
      name: "Urban Kings Admin",
      email: "admin2@urbankings.com.au",
      phone: "+61 400 000 005",
      role: "admin",
      status: "active",
      avatar: "UA",
    },
  ];
}

function seedData() {
  const barberPassword = process.env.URBAN_KINGS_BARBER_PASSWORD || "barber123";
  const customerPassword = process.env.URBAN_KINGS_CUSTOMER_PASSWORD || "customer123";
  const createdAt = "2026-05-19T00:00:00+10:00";
  return {
    admins: configuredAdmins().map(admin => ({
      ...admin,
      createdAt,
      updatedAt: createdAt,
      isActive: true,
    })),
    barbers: [
      {
        id: "b001",
        barberCode: "UKB-001",
        username: "carlos",
        passwordHash: hashPassword(barberPassword),
        name: "Carlos Mendez",
        displayName: "Carlos",
        email: "carlos@urbankings.com.au",
        phone: "+61 400 000 002",
        role: "barber",
        status: "active",
        avatar: "CM",
        createdAt,
        updatedAt: createdAt,
        isActive: true,
        profile: {
          bio: "Precision fade artist. 8 years of Latin barbering excellence.",
          specialties: ["Top Kings", "Skin Fade", "Beard Sculpt"],
          workDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
          workHours: { start: "09:00", end: "18:00" },
          commission: 0.6,
          rating: 4.9,
          reviewCount: 124,
        },
        metrics: { completedToday: 0, completedWeek: 0, completedMonth: 0, revenueWeek: 0, revenueMonth: 0, avgMinutes: 45 },
      },
      {
        id: "b002",
        barberCode: "UKB-002",
        username: "miguel",
        passwordHash: hashPassword(barberPassword),
        name: "Miguel Santos",
        displayName: "Miguel",
        email: "miguel@urbankings.com.au",
        phone: "+61 400 000 003",
        role: "barber",
        status: "active",
        avatar: "MS",
        createdAt,
        updatedAt: createdAt,
        isActive: true,
        profile: {
          bio: "Classic cuts and modern styles. Portuguese-speaking artist.",
          specialties: ["Classic Kings", "Classic Cut + Beard", "Hot Towel Shave"],
          workDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
          workHours: { start: "10:00", end: "19:00" },
          commission: 0.55,
          rating: 4.8,
          reviewCount: 89,
        },
        metrics: { completedToday: 0, completedWeek: 0, completedMonth: 0, revenueWeek: 0, revenueMonth: 0, avgMinutes: 50 },
      },
      {
        id: "b003",
        barberCode: "UKB-003",
        username: "leo",
        passwordHash: hashPassword(barberPassword),
        name: "Leonardo Vega",
        displayName: "Leo",
        email: "leo@urbankings.com.au",
        phone: "+61 400 000 004",
        role: "barber",
        status: "active",
        avatar: "LV",
        createdAt,
        updatedAt: createdAt,
        isActive: true,
        profile: {
          bio: "Creative artistry, detailed designs. Spanish speaker.",
          specialties: ["Hair Design", "Low Fade", "Kids Cut"],
          workDays: ["Wed", "Thu", "Fri", "Sat", "Sun"],
          workHours: { start: "11:00", end: "20:00" },
          commission: 0.55,
          rating: 4.7,
          reviewCount: 42,
        },
        metrics: { completedToday: 0, completedWeek: 0, completedMonth: 0, revenueWeek: 0, revenueMonth: 0, avgMinutes: 55 },
      },
    ],
    customers: [
      {
        id: "c001",
        username: "mateo",
        passwordHash: hashPassword(customerPassword),
        name: "Mateo Hernandez",
        email: "mateo@email.com",
        phone: "+61 411 111 001",
        role: "customer",
        status: "active",
        avatar: "MH",
        createdAt,
        updatedAt: createdAt,
        isActive: true,
        profile: { loyaltyStamps: 7, totalVisits: 23, totalSpent: 920, memberTier: "King Member", preferredBarber: "b001", preferredService: "Top Kings" },
      },
    ],
    bookings: [
      {
        id: "bk001",
        customerId: "c001",
        customerName: "Mateo Hernandez",
        customerEmail: "mateo@email.com",
        customerPhone: "+61 411 111 001",
        guest: null,
        barberId: "b001",
        barberCode: "UKB-001",
        barberName: "Carlos",
        serviceId: "top",
        serviceName: "Top Kings",
        service: "Top Kings",
        date: "2026-06-12",
        time: "17:30",
        duration: 45,
        price: 40,
        notes: "Prefers low shine product.",
        internalNotes: "",
        status: "confirmed",
        source: "website",
        paymentStatus: "unpaid",
        reminderStatus: "not-sent",
        createdAt,
        updatedAt: createdAt,
      },
    ],
    roster: [
      { id: "rs001", barberId: "b001", barberName: "Carlos Mendez", date: "2026-06-12", startTime: "09:00", endTime: "18:00", status: "scheduled", notes: "Lead chair.", createdByAdminId: "a001", createdAt, updatedAt: createdAt },
      { id: "rs002", barberId: "b002", barberName: "Miguel Santos", date: "2026-06-12", startTime: "10:00", endTime: "19:00", status: "scheduled", notes: "", createdByAdminId: "a001", createdAt, updatedAt: createdAt },
      { id: "rs003", barberId: "b003", barberName: "Leonardo Vega", date: "2026-06-13", startTime: "11:00", endTime: "20:00", status: "scheduled", notes: "Design appointments preferred.", createdByAdminId: "a001", createdAt, updatedAt: createdAt },
    ],
    notifications: [],
    activityLog: [],
    payments: [],
    sessions: [],
    settings: {
      businessName: "Urban Kings",
      timezone: "Australia/Brisbane",
      storageRoot: STORAGE_ROOT,
      updatedAt: createdAt,
    },
  };
}

async function ensureStorage() {
  try {
    await ensureStorageAtCurrentRoot();
  } catch (err) {
    const fallbackRoot = path.join(ROOT, "storage", "cd");
    if (STORAGE_ROOT === fallbackRoot) throw err;
    console.warn(`Storage root ${STORAGE_ROOT} is not writable (${err.code || err.message}). Falling back to ${fallbackRoot}.`);
    setStorageRoot(fallbackRoot);
    await ensureStorageAtCurrentRoot();
  }
}

async function ensureStorageAtCurrentRoot() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
  await fsp.mkdir(path.join(UPLOAD_DIR, "profile-images"), { recursive: true });
  await fsp.mkdir(path.join(UPLOAD_DIR, "service-images"), { recursive: true });
  const seed = seedData();
  for (const [key, fileName] of Object.entries(DATA_FILES)) {
    const filePath = path.join(DATA_DIR, fileName);
    try {
      await fsp.access(filePath, fs.constants.F_OK);
    } catch (_) {
      await atomicWrite(filePath, seed[key] || []);
    }
  }
  await syncConfiguredAdmin();
  await syncBarberCodes();
  await syncBookingBarberCodes();
}

async function syncConfiguredAdmin() {
  const adminPassword = process.env.URBAN_KINGS_ADMIN_PASSWORD || "admin2026";
  const admins = await readJson(dataPath("admins"), []);
  const requiredAdmins = configuredAdmins(adminPassword);
  const nextAdmins = [...admins];
  requiredAdmins.forEach(required => {
    const existingIndex = nextAdmins.findIndex(admin => admin.id === required.id || admin.username === required.username);
    const existing = existingIndex >= 0 ? nextAdmins[existingIndex] : null;
    const configured = {
      ...(existing || {}),
      ...required,
      passwordHash: hashPassword(adminPassword),
      role: "admin",
      status: "active",
      createdAt: (existing && existing.createdAt) || now(),
      updatedAt: now(),
      isActive: true,
    };
    if (existingIndex >= 0) {
      nextAdmins[existingIndex] = configured;
    } else {
      nextAdmins.push(configured);
    }
  });
  await atomicWrite(dataPath("admins"), nextAdmins);
}

function configuredAdminForLogin(username, password) {
  const adminPassword = process.env.URBAN_KINGS_ADMIN_PASSWORD || "admin2026";
  if (String(password || "") !== adminPassword) return null;
  return configuredAdmins(adminPassword).find(admin => admin.username === username) || null;
}

async function ensureAdminInStore(store, requiredAdmin) {
  const existingIndex = store.admins.findIndex(admin => admin.id === requiredAdmin.id || admin.username === requiredAdmin.username);
  const existing = existingIndex >= 0 ? store.admins[existingIndex] : null;
  const admin = {
    ...(existing || {}),
    ...requiredAdmin,
    passwordHash: hashPassword(process.env.URBAN_KINGS_ADMIN_PASSWORD || "admin2026"),
    role: "admin",
    status: "active",
    createdAt: (existing && existing.createdAt) || now(),
    updatedAt: now(),
    isActive: true,
  };
  if (existingIndex >= 0) store.admins[existingIndex] = admin;
  else store.admins.push(admin);
  await writeCollection("admins", store.admins);
  return admin;
}

async function syncBarberCodes() {
  const barbers = await readJson(dataPath("barbers"), []);
  let changed = false;
  const nextBarbers = barbers.map(barber => {
    if (barber.barberCode) return barber;
    changed = true;
    return { barberCode: barberCodeFromId(barber.id), ...barber };
  });
  if (changed) await atomicWrite(dataPath("barbers"), nextBarbers);
}

async function syncBookingBarberCodes() {
  const [bookings, barbers] = await Promise.all([
    readJson(dataPath("bookings"), []),
    readJson(dataPath("barbers"), []),
  ]);
  let changed = false;
  const nextBookings = bookings.map(booking => {
    if (!booking.barberId || booking.barberCode) return booking;
    const barber = barbers.find(item => item.id === booking.barberId);
    if (!barber) return booking;
    changed = true;
    return { ...booking, barberCode: barber.barberCode || barberCodeFromId(barber.id) };
  });
  if (changed) await atomicWrite(dataPath("bookings"), nextBookings);
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fsp.readFile(filePath, "utf8"));
  } catch (err) {
    if (err && err.code === "ENOENT") return fallback;
    throw err;
  }
}

async function atomicWrite(filePath, value) {
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fsp.rename(tmp, filePath);
}

function enqueueWrite(task) {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

function dataPath(key) {
  return path.join(DATA_DIR, DATA_FILES[key]);
}

async function readStore() {
  const entries = await Promise.all(Object.keys(DATA_FILES).map(async key => [key, await readJson(dataPath(key), key === "settings" ? {} : [])]));
  return Object.fromEntries(entries);
}

async function writeCollection(key, value, { backup = false } = {}) {
  return enqueueWrite(async () => {
    if (backup) await backupCollection(key);
    await atomicWrite(dataPath(key), value);
  });
}

async function writeMany(updates, { backupKeys = [] } = {}) {
  return enqueueWrite(async () => {
    for (const key of backupKeys) await backupCollection(key);
    for (const [key, value] of Object.entries(updates)) await atomicWrite(dataPath(key), value);
  });
}

async function backupCollection(key) {
  const filePath = dataPath(key);
  const stamp = `${dayKey()}-${Date.now()}`;
  const backupPath = path.join(BACKUP_DIR, `${key}-backup-${stamp}.json`);
  try {
    await fsp.copyFile(filePath, backupPath);
    await pruneBackups(key, 30);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}

async function pruneBackups(key, keep) {
  const files = (await fsp.readdir(BACKUP_DIR))
    .filter(file => file.startsWith(`${key}-backup-`) && file.endsWith(".json"))
    .sort()
    .reverse();
  await Promise.all(files.slice(keep).map(file => fsp.unlink(path.join(BACKUP_DIR, file)).catch(() => {})));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeUser(user) {
  if (!user) return null;
  const clean = clone(user);
  delete clean.passwordHash;
  return clean;
}

function initials(name) {
  return String(name || "UK").split(/\s+/).filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "UK";
}

function normalizeUsername(payload) {
  return String(payload.username || payload.email || payload.name || "")
    .trim()
    .toLowerCase()
    .split("@")[0]
    .replace(/[^a-z0-9]/g, "");
}

function nextId(prefix, list) {
  const max = list.reduce((found, item) => {
    const m = String(item.id || "").match(/\d+$/);
    return Math.max(found, m ? Number(m[0]) : 0);
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

function barberCodeFromId(id) {
  const numeric = String(id || "").match(/\d+$/);
  return `UKB-${String(numeric ? Number(numeric[0]) : 1).padStart(3, "0")}`;
}

function timeToMinutes(time) {
  if (!/^\d{2}:\d{2}$/.test(String(time || ""))) return null;
  const [h, m] = time.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function endTime(start, duration) {
  const minutes = timeToMinutes(start);
  if (minutes === null) return "";
  const end = minutes + Number(duration || 0);
  return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
}

function dayName(date) {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return names[new Date(`${date}T00:00:00`).getDay()];
}

function decorateBooking(booking, store) {
  const customer = booking.customerId ? store.customers.find(c => c.id === booking.customerId) : null;
  const barber = booking.barberId ? store.barbers.find(b => b.id === booking.barberId) : null;
  const payment = store.payments.find(p => p.bookingId === booking.id) || null;
  return {
    ...clone(booking),
    service: booking.service || booking.serviceName,
    customer: customer ? sanitizeUser(customer) : null,
    barber: barber ? sanitizeUser(barber) : null,
    payment: payment ? clone(payment) : null,
  };
}

function addLog(store, actor, action, summary, entity = {}) {
  store.activityLog.unshift({
    id: nextId("log", store.activityLog),
    actorId: actor && actor.userId ? actor.userId : "system",
    actorRole: actor && actor.role ? actor.role : "system",
    action,
    summary,
    entityType: entity.type || "",
    entityId: entity.id || "",
    createdAt: now(),
  });
}

function getUserBySession(store, session) {
  if (!session) return null;
  const list = session.role === "admin" ? store.admins : session.role === "barber" ? store.barbers : store.customers;
  return list.find(user => user.id === session.userId) || null;
}

function makeSession(user) {
  return {
    id: crypto.randomUUID(),
    token: crypto.randomBytes(32).toString("hex"),
    userId: user.id,
    role: user.role,
    name: user.name,
    displayName: user.displayName || String(user.name).split(" ")[0],
    avatar: user.avatar || initials(user.name),
    barberId: user.role === "barber" ? user.id : null,
    customerId: user.role === "customer" ? user.id : null,
    adminId: user.role === "admin" ? user.id : null,
    expiresAt: Date.now() + SESSION_TTL_MS,
    createdAt: now(),
  };
}

function publicSession(session) {
  if (!session) return null;
  const { token, id, ...safe } = session;
  return safe;
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map(part => {
    const idx = part.indexOf("=");
    if (idx === -1) return ["", ""];
    return [part.slice(0, idx).trim(), decodeURIComponent(part.slice(idx + 1))];
  }).filter(([key]) => key));
}

function cookieHeader(token, maxAge = SESSION_TTL_MS / 1000) {
  return `uk_session=${encodeURIComponent(token)}; Path=/; Max-Age=${Math.floor(maxAge)}; HttpOnly; SameSite=Lax`;
}

async function getSession(req, store) {
  const token = parseCookies(req).uk_session;
  if (!token) return null;
  const session = store.sessions.find(s => s.token === token);
  if (!session || Date.now() > session.expiresAt) return null;
  return session;
}

function canReadBooking(session, booking) {
  if (!session) return false;
  if (session.role === "admin") return true;
  if (session.role === "barber") return booking.barberId === session.barberId;
  if (session.role === "customer") return booking.customerId === session.customerId;
  return false;
}

function visibleStore(store, session) {
  const safeBarbers = store.barbers.map(sanitizeUser);
  if (!session) {
    return {
      session: null,
      barbers: safeBarbers.filter(b => b.status === "active"),
      customers: [],
      admins: [],
      bookings: [],
      roster: [],
      notifications: [],
      payments: [],
      activityLog: [],
      settings: store.settings,
    };
  }
  const bookings = store.bookings.filter(b => canReadBooking(session, b)).map(b => decorateBooking(b, store));
  const customerIds = new Set(bookings.map(b => b.customerId).filter(Boolean));
  let customers = [];
  if (session.role === "admin") customers = store.customers;
  if (session.role === "customer") customers = store.customers.filter(c => c.id === session.customerId);
  if (session.role === "barber") customers = store.customers.filter(c => customerIds.has(c.id));
  return {
    session: publicSession(session),
    admins: session.role === "admin" ? store.admins.map(sanitizeUser) : [],
    barbers: safeBarbers,
    customers: customers.map(sanitizeUser),
    bookings,
    roster: session.role === "admin" ? store.roster : store.roster.filter(s => session.role === "barber" && s.barberId === session.barberId),
    notifications: session.role === "admin"
      ? store.notifications
      : store.notifications.filter(n => n.receiverId === session.userId && n.receiverRole === session.role),
    payments: session.role === "admin"
      ? store.payments
      : store.payments.filter(p => session.role === "customer" && p.customerId === session.customerId),
    activityLog: session.role === "admin" ? store.activityLog : [],
    settings: store.settings,
  };
}

function json(res, status, payload, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = "";
    req.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Payload too large"), { status: 413 }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (_) {
        reject(Object.assign(new Error("Invalid JSON"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function requireRole(res, session, ...roles) {
  if (!session) {
    json(res, 401, { ok: false, error: "Authentication required." });
    return false;
  }
  if (!roles.includes(session.role)) {
    json(res, 403, { ok: false, error: "Not allowed." });
    return false;
  }
  return true;
}

function validateBookingPayload(payload) {
  const errors = [];
  const name = payload.customerName || (payload.guest && payload.guest.name);
  const phone = payload.customerPhone || (payload.guest && payload.guest.phone);
  if (!payload.customerId && !String(name || "").trim()) errors.push("Name is required.");
  if (!payload.customerId && !String(phone || "").trim()) errors.push("Phone is required.");
  if (!String(payload.serviceName || payload.service || "").trim()) errors.push("Service is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.date || ""))) errors.push("Date is required.");
  if (timeToMinutes(payload.time) === null) errors.push("Valid time is required.");
  return errors;
}

function bookingConflict(store, draft, ignoreId = "") {
  const start = timeToMinutes(draft.time);
  const end = start + Number(draft.duration || 45);
  return store.bookings.some(booking => {
    if (booking.id === ignoreId || booking.barberId !== draft.barberId || booking.date !== draft.date) return false;
    if (["cancelled", "completed", "no-show"].includes(booking.status)) return false;
    const otherStart = timeToMinutes(booking.time);
    const otherEnd = otherStart + Number(booking.duration || 45);
    return start < otherEnd && end > otherStart;
  });
}

function withinAvailability(store, barber, draft) {
  const start = timeToMinutes(draft.time);
  const end = start + Number(draft.duration || 45);
  if (start === null || start >= end) return false;
  const dayRoster = store.roster.filter(shift => shift.barberId === barber.id && shift.date === draft.date && shift.status !== "cancelled");
  const scheduled = dayRoster.find(shift => shift.status === "scheduled");
  if (scheduled) return start >= timeToMinutes(scheduled.startTime) && end <= timeToMinutes(scheduled.endTime);
  if (dayRoster.some(shift => shift.status !== "scheduled")) return false;
  const workDays = barber.profile && Array.isArray(barber.profile.workDays) ? barber.profile.workDays : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = barber.profile && barber.profile.workHours ? barber.profile.workHours : { start: "09:00", end: "18:00" };
  return workDays.includes(dayName(draft.date)) && start >= timeToMinutes(hours.start) && end <= timeToMinutes(hours.end);
}

function assignBarber(store, requestedBarberId, draft) {
  const active = store.barbers.filter(b => b.status === "active");
  const candidates = requestedBarberId && requestedBarberId !== "any"
    ? active.filter(b => b.id === requestedBarberId)
    : active;
  return candidates.find(barber => {
    const test = { ...draft, barberId: barber.id };
    return withinAvailability(store, barber, test) && !bookingConflict(store, test);
  }) || null;
}

async function createBooking(store, payload, actor = null) {
  const errors = validateBookingPayload(payload);
  if (errors.length) return { ok: false, status: 400, error: errors.join(" ") };
  const serviceName = String(payload.serviceName || payload.service || "").trim();
  const customer = payload.customerId ? store.customers.find(c => c.id === payload.customerId) : null;
  const draft = {
    date: payload.date,
    time: payload.time,
    duration: Number(payload.duration || 45),
    barberId: payload.barberId || "any",
  };
  const barber = assignBarber(store, draft.barberId, draft);
  if (!barber) return { ok: false, status: 409, error: "That time is not available. Please choose another barber or time." };
  const booking = {
    id: nextId("bk", store.bookings),
    customerId: customer ? customer.id : null,
    customerName: customer ? customer.name : String(payload.customerName || payload.guest.name).trim(),
    customerEmail: customer ? customer.email : String(payload.customerEmail || (payload.guest && payload.guest.email) || "").trim(),
    customerPhone: customer ? customer.phone : String(payload.customerPhone || payload.guest.phone).trim(),
    guest: customer ? null : {
      name: String(payload.customerName || payload.guest.name).trim(),
      email: String(payload.customerEmail || (payload.guest && payload.guest.email) || "").trim(),
      phone: String(payload.customerPhone || payload.guest.phone).trim(),
    },
    serviceId: payload.serviceId || "",
    serviceName,
    service: serviceName,
    barberId: barber.id,
    barberCode: barber.barberCode || barberCodeFromId(barber.id),
    barberName: barber.displayName || barber.name,
    date: payload.date,
    time: payload.time,
    duration: draft.duration,
    price: Number(payload.price || 0),
    notes: String(payload.notes || ""),
    internalNotes: String(payload.internalNotes || ""),
    status: payload.status || "pending",
    source: payload.source || "website",
    paymentStatus: payload.paymentStatus || "unpaid",
    reminderStatus: payload.reminderStatus || "not-sent",
    createdAt: now(),
    updatedAt: now(),
  };
  store.bookings.unshift(booking);
  addLog(store, actor, "booking.created", `Booking created for ${booking.customerName} at ${booking.date} ${booking.time}.`, { type: "booking", id: booking.id });
  await writeMany({ bookings: store.bookings, activityLog: store.activityLog }, { backupKeys: ["bookings"] });
  return { ok: true, booking: decorateBooking(booking, store) };
}

async function handleApi(req, res, url) {
  const store = await readStore();
  const session = await getSession(req, store);
  const method = req.method;
  const pathName = url.pathname;
  const body = ["POST", "PATCH", "PUT", "DELETE"].includes(method) ? await readBody(req) : {};

  if (method === "GET" && pathName === "/api/health") {
    return json(res, 200, { ok: true, storageRoot: STORAGE_ROOT });
  }

  if (method === "GET" && pathName === "/api/bootstrap") {
    return json(res, 200, { ok: true, data: visibleStore(store, session) });
  }

  if (method === "POST" && pathName === "/api/auth/login") {
    let role = String(body.role || "customer");
    const lists = { admin: store.admins, barber: store.barbers, customer: store.customers };
    const q = String(body.username || "").trim().toLowerCase();
    const configuredAdmin = configuredAdminForLogin(q, body.password);
    if (configuredAdmin) role = "admin";
    const list = lists[role] || store.customers;
    let user = list.find(u => u.username === q || String(u.email || "").toLowerCase() === q || String(u.barberCode || "").toLowerCase() === q);
    if (configuredAdmin) user = await ensureAdminInStore(store, configuredAdmin);
    if (!user || !verifyPassword(body.password || "", user.passwordHash) || user.status !== "active") {
      addLog(store, { userId: "anonymous", role }, "auth.failed", `Failed ${role} login for ${q}.`);
      await writeCollection("activityLog", store.activityLog);
      return json(res, 401, { ok: false, error: "Invalid credentials." });
    }
    const userSession = makeSession(user);
    store.sessions = store.sessions.filter(s => Date.now() < s.expiresAt && !(s.userId === user.id && s.role === user.role));
    store.sessions.push(userSession);
    addLog(store, userSession, "auth.login", `${user.name} signed in.`);
    await writeMany({ sessions: store.sessions, activityLog: store.activityLog });
    return json(res, 200, { ok: true, session: publicSession(userSession), data: visibleStore(store, userSession) }, { "Set-Cookie": cookieHeader(userSession.token) });
  }

  if (method === "POST" && pathName === "/api/auth/logout") {
    if (session) store.sessions = store.sessions.filter(s => s.token !== session.token);
    await writeCollection("sessions", store.sessions);
    return json(res, 200, { ok: true }, { "Set-Cookie": "uk_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax" });
  }

  if (method === "POST" && pathName === "/api/customers/register") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!body.name || !email || !body.phone || password.length < 8) return json(res, 400, { ok: false, error: "Name, email, phone and an 8 character password are required." });
    if (store.customers.some(c => c.email.toLowerCase() === email)) return json(res, 409, { ok: false, error: "A customer with this email already exists." });
    const customer = {
      id: nextId("c", store.customers),
      username: normalizeUsername(body),
      passwordHash: hashPassword(password),
      name: String(body.name).trim(),
      email,
      phone: String(body.phone).trim(),
      role: "customer",
      status: "active",
      avatar: initials(body.name),
      createdAt: now(),
      updatedAt: now(),
      isActive: true,
      profile: { loyaltyStamps: 0, totalVisits: 0, totalSpent: 0, memberTier: "New Member", preferredBarber: "", preferredService: "" },
    };
    store.customers.push(customer);
    addLog(store, { userId: customer.id, role: "customer" }, "customer.created", `Customer ${customer.name} registered.`, { type: "customer", id: customer.id });
    await writeMany({ customers: store.customers, activityLog: store.activityLog });
    return json(res, 201, { ok: true, customer: sanitizeUser(customer) });
  }

  if (method === "GET" && pathName === "/api/bookings") {
    if (!requireRole(res, session, "admin", "barber", "customer")) return;
    const barberId = url.searchParams.get("barberId");
    const bookings = store.bookings
      .filter(b => canReadBooking(session, b))
      .filter(b => !barberId || b.barberId === barberId)
      .map(b => decorateBooking(b, store));
    return json(res, 200, { ok: true, bookings });
  }

  if (method === "POST" && pathName === "/api/bookings") {
    const result = await createBooking(store, body, session || { userId: "website", role: "public" });
    return json(res, result.ok ? 201 : result.status || 400, result);
  }

  const bookingMatch = pathName.match(/^\/api\/bookings\/([^/]+)$/);
  if (bookingMatch && method === "PATCH") {
    if (!requireRole(res, session, "admin", "barber")) return;
    const booking = store.bookings.find(b => b.id === bookingMatch[1]);
    if (!booking) return json(res, 404, { ok: false, error: "Booking not found." });
    if (session.role === "barber" && booking.barberId !== session.barberId) return json(res, 403, { ok: false, error: "You can only edit your own bookings." });
    const allowed = session.role === "admin"
      ? ["barberId", "date", "time", "duration", "price", "status", "notes", "internalNotes", "paymentStatus"]
      : ["status", "notes"];
    const next = { ...booking };
    allowed.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(body, key)) next[key] = body[key];
    });
    if (body.service || body.serviceName) {
      next.serviceName = body.serviceName || body.service;
      next.service = next.serviceName;
    }
    if (next.barberId !== booking.barberId || next.date !== booking.date || next.time !== booking.time || next.duration !== booking.duration) {
      const barber = store.barbers.find(b => b.id === next.barberId);
      if (!barber || !withinAvailability(store, barber, next) || bookingConflict(store, next, booking.id)) {
        return json(res, 409, { ok: false, error: "That barber/time is unavailable." });
      }
      next.barberName = barber.displayName || barber.name;
      next.barberCode = barber.barberCode || barberCodeFromId(barber.id);
    }
    Object.assign(booking, next, { updatedAt: now() });
    addLog(store, session, "booking.updated", `${session.role} updated booking ${booking.id}.`, { type: "booking", id: booking.id });
    await writeMany({ bookings: store.bookings, activityLog: store.activityLog }, { backupKeys: ["bookings"] });
    return json(res, 200, { ok: true, booking: decorateBooking(booking, store) });
  }

  if (bookingMatch && method === "DELETE") {
    if (!requireRole(res, session, "admin")) return;
    const booking = store.bookings.find(b => b.id === bookingMatch[1]);
    if (!booking) return json(res, 404, { ok: false, error: "Booking not found." });
    booking.status = "cancelled";
    booking.updatedAt = now();
    addLog(store, session, "booking.cancelled", `Admin cancelled booking ${booking.id}.`, { type: "booking", id: booking.id });
    await writeMany({ bookings: store.bookings, activityLog: store.activityLog }, { backupKeys: ["bookings"] });
    return json(res, 200, { ok: true, booking: decorateBooking(booking, store) });
  }

  if (method === "POST" && pathName === "/api/payments") {
    const booking = store.bookings.find(b => b.id === body.bookingId);
    if (!booking) return json(res, 404, { ok: false, error: "Booking not found." });
    const payment = {
      id: nextId("pay", store.payments),
      bookingId: booking.id,
      customerId: booking.customerId || null,
      guestEmail: booking.customerEmail || "",
      amount: Number(body.amount || booking.price || 0),
      status: body.status || "pending",
      provider: body.provider || "manual",
      createdAt: now(),
      updatedAt: now(),
    };
    store.payments.push(payment);
    booking.paymentStatus = payment.status === "paid" ? "paid" : "unpaid";
    await writeMany({ payments: store.payments, bookings: store.bookings }, { backupKeys: ["bookings"] });
    return json(res, 201, { ok: true, payment });
  }

  const paymentMatch = pathName.match(/^\/api\/payments\/([^/]+)$/);
  if (paymentMatch && method === "PATCH") {
    const payment = store.payments.find(p => p.id === paymentMatch[1]);
    if (!payment) return json(res, 404, { ok: false, error: "Payment not found." });
    payment.status = body.status || payment.status;
    payment.updatedAt = now();
    const booking = store.bookings.find(b => b.id === payment.bookingId);
    if (booking) {
      booking.paymentStatus = payment.status === "paid" ? "paid" : "unpaid";
      if (payment.status === "paid" && booking.status === "pending") booking.status = "confirmed";
      booking.updatedAt = now();
    }
    await writeMany({ payments: store.payments, bookings: store.bookings }, { backupKeys: ["bookings"] });
    return json(res, 200, { ok: true, payment, booking: booking ? decorateBooking(booking, store) : null });
  }

  if (pathName === "/api/users/barbers" && method === "POST") {
    if (!requireRole(res, session, "admin")) return;
    if (!body.name || !body.email) return json(res, 400, { ok: false, error: "Name and email are required." });
    if (!body.password || String(body.password).length < 8) return json(res, 400, { ok: false, error: "Temporary password must be at least 8 characters." });
    const email = String(body.email).trim().toLowerCase();
    if (store.barbers.some(b => b.email.toLowerCase() === email)) return json(res, 409, { ok: false, error: "Barber email already exists." });
    const barberId = nextId("b", store.barbers);
    const barber = {
      id: barberId,
      barberCode: barberCodeFromId(barberId),
      username: normalizeUsername(body),
      passwordHash: hashPassword(body.password),
      name: String(body.name).trim(),
      displayName: String(body.displayName || body.name).trim().split(" ")[0],
      email,
      phone: String(body.phone || ""),
      role: "barber",
      status: body.status || "active",
      avatar: initials(body.name),
      createdAt: now(),
      updatedAt: now(),
      isActive: true,
      profile: {
        bio: body.bio || "Urban Kings barber profile.",
        specialties: Array.isArray(body.specialties) && body.specialties.length ? body.specialties : ["Classic Kings"],
        workDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        workHours: { start: "09:00", end: "17:00" },
        commission: 0.55,
        rating: 0,
        reviewCount: 0,
      },
      metrics: { completedToday: 0, completedWeek: 0, completedMonth: 0, revenueWeek: 0, revenueMonth: 0, avgMinutes: 45 },
      createdByAdminId: session.adminId,
    };
    store.barbers.push(barber);
    addLog(store, session, "barber.created", `Admin created barber ${barber.name}.`, { type: "barber", id: barber.id });
    await writeMany({ barbers: store.barbers, activityLog: store.activityLog });
    return json(res, 201, { ok: true, barber: sanitizeUser(barber) });
  }

  const barberMatch = pathName.match(/^\/api\/users\/barbers\/([^/]+)$/);
  if (barberMatch && method === "PATCH") {
    if (!requireRole(res, session, "admin")) return;
    const barber = store.barbers.find(b => b.id === barberMatch[1]);
    if (!barber) return json(res, 404, { ok: false, error: "Barber not found." });
    ["name", "displayName", "email", "phone", "status"].forEach(key => {
      if (Object.prototype.hasOwnProperty.call(body, key)) barber[key] = body[key];
    });
    if (body.bio !== undefined) barber.profile.bio = body.bio;
    if (Array.isArray(body.specialties)) barber.profile.specialties = body.specialties;
    barber.avatar = initials(barber.name);
    barber.updatedAt = now();
    addLog(store, session, "barber.updated", `Admin updated barber ${barber.name}.`, { type: "barber", id: barber.id });
    await writeMany({ barbers: store.barbers, activityLog: store.activityLog });
    return json(res, 200, { ok: true, barber: sanitizeUser(barber) });
  }

  if (barberMatch && method === "DELETE") {
    if (!requireRole(res, session, "admin")) return;
    const barber = store.barbers.find(b => b.id === barberMatch[1]);
    if (!barber) return json(res, 404, { ok: false, error: "Barber not found." });
    barber.status = "inactive";
    barber.isActive = false;
    barber.updatedAt = now();
    await writeCollection("barbers", store.barbers);
    return json(res, 200, { ok: true, barber: sanitizeUser(barber) });
  }

  if (pathName === "/api/users/customers" && method === "POST") {
    if (!requireRole(res, session, "admin")) return;
    const email = String(body.email || "").trim().toLowerCase();
    if (!body.name || !email) return json(res, 400, { ok: false, error: "Name and email are required." });
    if (!body.password || String(body.password).length < 8) return json(res, 400, { ok: false, error: "Temporary password must be at least 8 characters." });
    if (store.customers.some(c => c.email.toLowerCase() === email)) return json(res, 409, { ok: false, error: "Customer email already exists." });
    const customer = {
      id: nextId("c", store.customers),
      username: normalizeUsername(body),
      passwordHash: hashPassword(body.password),
      name: String(body.name).trim(),
      email,
      phone: String(body.phone || ""),
      role: "customer",
      status: body.status || "active",
      avatar: initials(body.name),
      createdAt: now(),
      updatedAt: now(),
      isActive: true,
      profile: { loyaltyStamps: 0, totalVisits: 0, totalSpent: 0, memberTier: "New Member", preferredBarber: body.preferredBarber || "", preferredService: body.preferredService || "" },
      createdByAdminId: session.adminId,
    };
    store.customers.push(customer);
    await writeCollection("customers", store.customers);
    return json(res, 201, { ok: true, customer: sanitizeUser(customer) });
  }

  const customerMatch = pathName.match(/^\/api\/users\/customers\/([^/]+)$/);
  if (customerMatch && method === "PATCH") {
    if (!requireRole(res, session, "admin", "customer")) return;
    if (session.role === "customer" && session.customerId !== customerMatch[1]) return json(res, 403, { ok: false, error: "Not allowed." });
    const customer = store.customers.find(c => c.id === customerMatch[1]);
    if (!customer) return json(res, 404, { ok: false, error: "Customer not found." });
    ["name", "email", "phone", "status"].forEach(key => {
      if (Object.prototype.hasOwnProperty.call(body, key)) customer[key] = body[key];
    });
    if (body.preferredBarber !== undefined) customer.profile.preferredBarber = body.preferredBarber;
    if (body.preferredService !== undefined) customer.profile.preferredService = body.preferredService;
    customer.avatar = initials(customer.name);
    customer.updatedAt = now();
    await writeCollection("customers", store.customers);
    return json(res, 200, { ok: true, customer: sanitizeUser(customer) });
  }

  if (customerMatch && method === "DELETE") {
    if (!requireRole(res, session, "admin")) return;
    const customer = store.customers.find(c => c.id === customerMatch[1]);
    if (!customer) return json(res, 404, { ok: false, error: "Customer not found." });
    customer.status = "inactive";
    customer.isActive = false;
    customer.updatedAt = now();
    await writeCollection("customers", store.customers);
    return json(res, 200, { ok: true, customer: sanitizeUser(customer) });
  }

  if (pathName === "/api/roster" && method === "POST") {
    if (!requireRole(res, session, "admin")) return;
    const barber = store.barbers.find(b => b.id === body.barberId);
    if (!barber) return json(res, 404, { ok: false, error: "Barber not found." });
    const shift = { id: nextId("rs", store.roster), barberId: barber.id, barberName: barber.name, date: body.date, startTime: body.status === "scheduled" ? body.startTime : "", endTime: body.status === "scheduled" ? body.endTime : "", status: body.status || "scheduled", notes: body.notes || "", createdByAdminId: session.adminId, createdAt: now(), updatedAt: now() };
    store.roster.unshift(shift);
    await writeCollection("roster", store.roster, { backup: true });
    return json(res, 201, { ok: true, shift });
  }

  const rosterMatch = pathName.match(/^\/api\/roster\/([^/]+)$/);
  if (rosterMatch && method === "PATCH") {
    if (!requireRole(res, session, "admin")) return;
    const shift = store.roster.find(s => s.id === rosterMatch[1]);
    if (!shift) return json(res, 404, { ok: false, error: "Shift not found." });
    ["barberId", "date", "startTime", "endTime", "status", "notes"].forEach(key => {
      if (Object.prototype.hasOwnProperty.call(body, key)) shift[key] = body[key];
    });
    const barber = store.barbers.find(b => b.id === shift.barberId);
    if (barber) shift.barberName = barber.name;
    if (shift.status !== "scheduled") {
      shift.startTime = "";
      shift.endTime = "";
    }
    shift.updatedAt = now();
    await writeCollection("roster", store.roster, { backup: true });
    return json(res, 200, { ok: true, shift });
  }

  if (rosterMatch && method === "DELETE") {
    if (!requireRole(res, session, "admin")) return;
    const shift = store.roster.find(s => s.id === rosterMatch[1]);
    if (!shift) return json(res, 404, { ok: false, error: "Shift not found." });
    shift.status = "cancelled";
    shift.updatedAt = now();
    await writeCollection("roster", store.roster, { backup: true });
    return json(res, 200, { ok: true, shift });
  }

  if (pathName === "/api/notifications" && method === "POST") {
    if (!requireRole(res, session, "admin")) return;
    const receiverIds = Array.isArray(body.receiverIds) && body.receiverIds.length ? body.receiverIds : store.barbers.map(b => b.id);
    const sent = receiverIds.map(receiverId => ({
      id: nextId("nt", store.notifications),
      senderId: session.adminId,
      receiverId,
      receiverRole: "barber",
      title: String(body.title || ""),
      message: String(body.message || ""),
      type: "admin_message",
      isRead: false,
      createdAt: now(),
    }));
    store.notifications.unshift(...sent);
    await writeCollection("notifications", store.notifications);
    return json(res, 201, { ok: true, sent });
  }

  const notificationMatch = pathName.match(/^\/api\/notifications\/([^/]+)$/);
  if (notificationMatch && method === "PATCH") {
    if (!requireRole(res, session, "admin", "barber", "customer")) return;
    store.notifications.forEach(notification => {
      const allForMe = notificationMatch[1] === "all" && notification.receiverId === session.userId && notification.receiverRole === session.role;
      const oneForMe = notification.id === notificationMatch[1] && notification.receiverId === session.userId;
      if (allForMe || oneForMe) notification.isRead = true;
    });
    await writeCollection("notifications", store.notifications);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { ok: false, error: "API route not found." });
}

function serveStatic(req, res, url) {
  let urlPath = decodeURIComponent(url.pathname);
  if (urlPath === "/") urlPath = "/index.html";
  if (urlPath.startsWith("/storage") || urlPath.includes("/.")) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(ROOT, "index.html"), (fallbackErr, fallbackData) => {
        if (fallbackErr) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": TYPES[".html"], "Cache-Control": "no-store" });
        res.end(fallbackData);
      });
      return;
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}

async function main() {
  await ensureStorage();
  http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
      return serveStatic(req, res, url);
    } catch (err) {
      const status = err.status || 500;
      json(res, status, { ok: false, error: status === 500 ? "Server error." : err.message });
      if (status === 500) console.error(err);
    }
  }).listen(PORT, () => {
    console.log(`Urban Kings server on http://localhost:${PORT}`);
    console.log(`Persistent storage: ${STORAGE_ROOT}`);
  });
}

main().catch(err => {
  console.error("Failed to start Urban Kings server:", err);
  process.exit(1);
});
