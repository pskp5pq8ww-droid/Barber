/* ============================================================
   URBAN KINGS — Mock User Database
   Three roles: admin · barber · customer
   Passwords stored as mock hash (btoa). Production: bcrypt via backend API.
   Structure mirrors a real relational schema — easy swap to Supabase / PG.
   ============================================================ */

window.UK_USERS = (function () {

  /* ---------- Mock hash (DEMO ONLY) ----------
     Production equivalent: bcrypt(password, 12) on the server.
     Never hash passwords client-side in production. */
  const _h = p => btoa("urbankings:v1:" + p);

  /* =========================================================
     USER SCHEMA: { id, username, passwordHash, name, email,
                    phone, role, status, createdAt, updatedAt, avatar }
     ========================================================= */
  const admins = [
    {
      id:           "a001",
      username:     "admin",
      passwordHash: _h("admin123"),
      name:         "Carlos Admin",
      email:        "admin@urbankings.com.au",
      phone:        "+61 400 000 001",
      role:         "admin",
      status:       "active",
      avatar:       "CA",
      createdAt:    "2024-01-15",
      updatedAt:    "2026-05-19",
    },
  ];

  /* =========================================================
     BARBER PROFILE: { bio, specialties, workDays, workHours,
                       commission, rating, reviewCount }
     ========================================================= */
  const barbers = [
    {
      id:           "b001",
      username:     "carlos",
      passwordHash: _h("barber123"),
      name:         "Carlos Mendez",
      displayName:  "Carlos",
      email:        "carlos@urbankings.com.au",
      phone:        "+61 400 000 002",
      role:         "barber",
      status:       "active",
      avatar:       "CM",
      createdAt:    "2024-02-01",
      updatedAt:    "2026-05-19",
      profile: {
        bio:         "Precision fade artist. 8 years of Latin barbering excellence.",
        specialties: ["Skin Fade", "Line Up", "Beard Sculpt"],
        workDays:    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        workHours:   { start: "09:00", end: "18:00" },
        commission:  0.60,
        rating:      4.9,
        reviewCount: 124,
      },
      metrics: {
        completedToday: 6,
        completedWeek:  28,
        completedMonth: 112,
        revenueWeek:    1680,
        revenueMonth:   6720,
        avgMinutes:     45,
      },
    },
    {
      id:           "b002",
      username:     "miguel",
      passwordHash: _h("barber123"),
      name:         "Miguel Santos",
      displayName:  "Miguel",
      email:        "miguel@urbankings.com.au",
      phone:        "+61 400 000 003",
      role:         "barber",
      status:       "active",
      avatar:       "MS",
      createdAt:    "2024-03-15",
      updatedAt:    "2026-05-19",
      profile: {
        bio:         "Classic cuts and modern styles. Portuguese-speaking artist.",
        specialties: ["Classic Taper", "Pompadour", "Hot Towel Shave"],
        workDays:    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        workHours:   { start: "10:00", end: "19:00" },
        commission:  0.55,
        rating:      4.8,
        reviewCount: 89,
      },
      metrics: {
        completedToday: 5,
        completedWeek:  22,
        completedMonth: 88,
        revenueWeek:    1210,
        revenueMonth:   4840,
        avgMinutes:     50,
      },
    },
    {
      id:           "b003",
      username:     "leo",
      passwordHash: _h("barber123"),
      name:         "Leonardo Vega",
      displayName:  "Leo",
      email:        "leo@urbankings.com.au",
      phone:        "+61 400 000 004",
      role:         "barber",
      status:       "active",
      avatar:       "LV",
      createdAt:    "2025-01-10",
      updatedAt:    "2026-05-19",
      profile: {
        bio:         "Creative artistry, detailed designs. Spanish speaker.",
        specialties: ["Hair Design", "Low Fade", "Kids Cut"],
        workDays:    ["Wed", "Thu", "Fri", "Sat", "Sun"],
        workHours:   { start: "11:00", end: "20:00" },
        commission:  0.55,
        rating:      4.7,
        reviewCount: 42,
      },
      metrics: {
        completedToday: 4,
        completedWeek:  16,
        completedMonth: 64,
        revenueWeek:    880,
        revenueMonth:   3520,
        avgMinutes:     55,
      },
    },
  ];

  /* =========================================================
     CUSTOMER PROFILE: { loyaltyStamps, totalVisits, totalSpent,
                         memberTier, preferredBarber, preferredService }
     ========================================================= */
  const customers = [
    {
      id:           "c001",
      username:     "mateo",
      passwordHash: _h("customer123"),
      name:         "Mateo Hernández",
      email:        "mateo@email.com",
      phone:        "+61 411 111 001",
      role:         "customer",
      status:       "active",
      avatar:       "MH",
      createdAt:    "2024-06-01",
      updatedAt:    "2026-05-19",
      profile: {
        loyaltyStamps:    7,
        totalVisits:      23,
        totalSpent:       920,
        memberTier:       "King Member",
        preferredBarber:  "b001",
        preferredService: "Top Kings — Skin Fade",
      },
    },
    {
      id:           "c002",
      username:     "diego",
      passwordHash: _h("customer123"),
      name:         "Diego Ramirez",
      email:        "diego@email.com",
      phone:        "+61 411 111 002",
      role:         "customer",
      status:       "active",
      avatar:       "DR",
      createdAt:    "2024-08-15",
      updatedAt:    "2026-05-19",
      profile: {
        loyaltyStamps:    3,
        totalVisits:      11,
        totalSpent:       440,
        memberTier:       "Member",
        preferredBarber:  "b002",
        preferredService: "Classic Cut + Beard",
      },
    },
    {
      id:           "c003",
      username:     "lucas",
      passwordHash: _h("customer123"),
      name:         "Lucas Pereira",
      email:        "lucas@email.com",
      phone:        "+61 411 111 003",
      role:         "customer",
      status:       "active",
      avatar:       "LP",
      createdAt:    "2025-02-20",
      updatedAt:    "2026-05-19",
      profile: {
        loyaltyStamps:    1,
        totalVisits:      4,
        totalSpent:       160,
        memberTier:       "New Member",
        preferredBarber:  "b003",
        preferredService: "Low Fade + Line Up",
      },
    },
  ];

  /* =========================================================
     BOOKING SCHEMA: { id, customerId, guest, barberId, service, date,
                       time, duration, price, status, paymentStatus,
                       notes, createdAt }
     status: "confirmed" | "pending" | "completed" | "cancelled"
     ========================================================= */
  const bookings = [
    { id:"bk001", customerId:"c001", barberId:"b001", service:"Top Kings — Skin Fade",  date:"2026-05-28", time:"17:30", duration:45, price:60, status:"confirmed",  notes:"Prefers low shine product.", createdAt:"2026-05-15" },
    { id:"bk002", customerId:"c002", barberId:"b001", service:"Classic Cut + Beard",    date:"2026-05-28", time:"10:00", duration:60, price:75, status:"confirmed",  notes:"Beard line sharp, no color.", createdAt:"2026-05-16" },
    { id:"bk003", customerId:"c003", barberId:"b002", service:"Low Fade + Line Up",     date:"2026-05-28", time:"11:30", duration:50, price:55, status:"pending",    notes:"First visit", createdAt:"2026-05-17" },
    { id:"bk004", customerId:"c001", barberId:"b001", service:"Top Kings — Skin Fade",  date:"2026-05-28", time:"14:00", duration:45, price:60, status:"completed",  notes:"Finished early.", createdAt:"2026-05-10" },
    { id:"bk005", customerId:"c002", barberId:"b003", service:"Hair Design",            date:"2026-05-27", time:"15:00", duration:60, price:80, status:"completed",  notes:"Design template saved.", createdAt:"2026-05-12" },
    { id:"bk006", customerId:"c003", barberId:"b002", service:"Classic Kings",          date:"2026-05-27", time:"09:30", duration:40, price:45, status:"completed",  notes:"", createdAt:"2026-05-14" },
    { id:"bk007", customerId:"c001", barberId:"b001", service:"Top Kings — Skin Fade",  date:"2026-05-29", time:"16:00", duration:45, price:60, status:"pending",    notes:"Requested same barber.", createdAt:"2026-05-18" },
    { id:"bk008", customerId:"c002", barberId:"b002", service:"Beard Sculpt",           date:"2026-05-30", time:"13:00", duration:35, price:40, status:"pending",    notes:"", createdAt:"2026-05-18" },
    { id:"bk009", customerId:"c003", barberId:"b003", service:"Kings of Kings",         date:"2026-05-31", time:"14:30", duration:70, price:85, status:"confirmed",  notes:"", createdAt:"2026-05-18" },
    { id:"bk010", customerId:"c001", barberId:"b001", service:"Kings of Kings",         date:"2026-05-21", time:"11:00", duration:70, price:85, status:"completed",  notes:"", createdAt:"2026-05-01" },
    { id:"bk011", customerId:"c001", barberId:"b001", service:"Classic Kings",          date:"2026-04-18", time:"13:00", duration:40, price:45, status:"completed",  notes:"", createdAt:"2026-04-14" },
    { id:"bk012", customerId:"c002", barberId:"b001", service:"Top Kings — Skin Fade",  date:"2026-04-10", time:"15:30", duration:45, price:60, status:"completed",  notes:"", createdAt:"2026-04-07" },
  ];

  /* =========================================================
     NOTIFICATION SCHEMA:
     { id, senderId, receiverId, receiverRole, title, message,
       type: "admin_message" | "booking_update" | "system",
       isRead, createdAt }

     Mock-only for now. Replace these mutations with insert/update/select
     calls when a real database is connected.
     ========================================================= */
  const notifications = [
    {
      id: "nt001",
      senderId: "a001",
      receiverId: "b001",
      receiverRole: "barber",
      title: "Team meeting",
      message: "Quick team check-in after the morning rush. Please review today's bookings before 9:00 AM.",
      type: "admin_message",
      isRead: false,
      createdAt: "2026-05-28T07:45:00+10:00",
    },
    {
      id: "nt002",
      senderId: "system",
      receiverId: "c001",
      receiverRole: "customer",
      title: "Booking reminder",
      message: "Your next Urban Kings appointment is ready in your customer portal.",
      type: "system",
      isRead: false,
      createdAt: "2026-05-28T08:15:00+10:00",
    },
    {
      id: "nt003",
      senderId: "a001",
      receiverId: "b002",
      receiverRole: "barber",
      title: "Roster note",
      message: "Please check your Sunday shift note in the roster.",
      type: "admin_message",
      isRead: true,
      createdAt: "2026-05-27T16:20:00+10:00",
    },
  ];

  const bookingChangeLog = [
    {
      id: "chg001",
      bookingId: "bk007",
      actorId: "b001",
      actorRole: "barber",
      summary: "Booking marked pending after client request.",
      createdAt: "2026-05-18T12:30:00+10:00",
    },
  ];

  /* =========================================================
     PAYMENT SCHEMA:
     { id, bookingId, customerId, guestEmail, amount, status,
       provider, createdAt, updatedAt }
     Mock-only. Replace with Square/Stripe provider calls later.
     ========================================================= */
  const payments = [
    { id:"pay001", bookingId:"bk001", customerId:"c001", guestEmail:"", amount:60, status:"pending", provider:"mock", createdAt:"2026-05-15T10:00:00+10:00", updatedAt:"2026-05-15T10:00:00+10:00" },
    { id:"pay002", bookingId:"bk004", customerId:"c001", guestEmail:"", amount:60, status:"paid", provider:"mock", createdAt:"2026-05-10T10:00:00+10:00", updatedAt:"2026-05-28T14:50:00+10:00" },
    { id:"pay003", bookingId:"bk005", customerId:"c002", guestEmail:"", amount:80, status:"paid", provider:"mock", createdAt:"2026-05-12T10:00:00+10:00", updatedAt:"2026-05-27T15:55:00+10:00" },
  ];

  /* =========================================================
     ROSTER SHIFT SCHEMA:
     { id, barberId, barberName, date, startTime, endTime,
       status, notes, createdByAdminId, createdAt, updatedAt }
     ========================================================= */
  const rosterShifts = [
    { id:"rs001", barberId:"b001", barberName:"Carlos Mendez",  date:"2026-05-28", startTime:"09:00", endTime:"17:00", status:"scheduled", notes:"Lead chair. VIP fade at 17:30.", createdByAdminId:"a001", createdAt:"2026-05-24T11:00:00+10:00", updatedAt:"2026-05-24T11:00:00+10:00" },
    { id:"rs002", barberId:"b002", barberName:"Miguel Santos",  date:"2026-05-28", startTime:"10:00", endTime:"18:00", status:"scheduled", notes:"Cover walk-ins after lunch.", createdByAdminId:"a001", createdAt:"2026-05-24T11:05:00+10:00", updatedAt:"2026-05-24T11:05:00+10:00" },
    { id:"rs003", barberId:"b003", barberName:"Leonardo Vega", date:"2026-05-28", startTime:"",      endTime:"",      status:"day_off",   notes:"Approved day off.", createdByAdminId:"a001", createdAt:"2026-05-24T11:10:00+10:00", updatedAt:"2026-05-24T11:10:00+10:00" },
    { id:"rs004", barberId:"b001", barberName:"Carlos Mendez",  date:"2026-05-29", startTime:"09:00", endTime:"17:30", status:"scheduled", notes:"Full day.", createdByAdminId:"a001", createdAt:"2026-05-24T11:12:00+10:00", updatedAt:"2026-05-24T11:12:00+10:00" },
    { id:"rs005", barberId:"b002", barberName:"Miguel Santos",  date:"2026-05-29", startTime:"12:00", endTime:"20:00", status:"scheduled", notes:"Late close.", createdByAdminId:"a001", createdAt:"2026-05-24T11:15:00+10:00", updatedAt:"2026-05-24T11:15:00+10:00" },
    { id:"rs006", barberId:"b003", barberName:"Leonardo Vega", date:"2026-05-30", startTime:"11:00", endTime:"19:00", status:"scheduled", notes:"Design appointments preferred.", createdByAdminId:"a001", createdAt:"2026-05-24T11:18:00+10:00", updatedAt:"2026-05-24T11:18:00+10:00" },
  ];

  const DEMO_TODAY = "2026-05-28";
  const BOOKING_STATUSES = ["pending", "confirmed", "in_progress", "completed", "cancelled", "rescheduled"];
  const ROSTER_STATUSES = ["scheduled", "day_off", "unavailable", "completed", "cancelled"];
  const PAYMENT_STATUSES = ["pending", "paid", "cancelled", "failed"];

  function _now() {
    return new Date().toISOString();
  }

  function _id(prefix, list) {
    return `${prefix}${String(list.length + 1).padStart(3, "0")}`;
  }

  function _clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function _timeToMinutes(time) {
    if (!time) return null;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  function _decorateBooking(b) {
    return {
      ...b,
      customer: customers.find(c => c.id === b.customerId),
      barber: barbers.find(ba => ba.id === b.barberId),
      payment: payments.find(p => p.bookingId === b.id) || null,
    };
  }

  function _sortNewest(a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  }

  function _createNotification(payload) {
    const notification = {
      id: _id("nt", notifications),
      senderId: payload.senderId || "system",
      receiverId: payload.receiverId,
      receiverRole: payload.receiverRole,
      title: payload.title,
      message: payload.message,
      type: payload.type || "system",
      isRead: false,
      createdAt: payload.createdAt || _now(),
    };
    notifications.unshift(notification);
    return _clone(notification);
  }

  /* =========================================================
     AUTH HELPERS
     ========================================================= */
  function findUser(username, role) {
    const list = role === "admin" ? admins : role === "barber" ? barbers : customers;
    const q = username.trim().toLowerCase();
    return list.find(u => u.username === q || u.email.toLowerCase() === q) || null;
  }

  function findUserById(id) {
    return [...admins, ...barbers, ...customers].find(u => u.id === id) || null;
  }

  function verifyPassword(user, password) {
    return user.passwordHash === _h(password);
  }

  /* =========================================================
     QUERY HELPERS
     ========================================================= */
  function getBookingsForBarber(barberId) {
    return bookings
      .filter(b => b.barberId === barberId)
      .map(_decorateBooking);
  }

  function getBookingsForCustomer(customerId) {
    return bookings
      .filter(b => b.customerId === customerId)
      .map(_decorateBooking);
  }

  function getAllBookings() {
    return bookings.map(_decorateBooking);
  }

  function getAllBarbers()   { return [...barbers]; }
  function getAllCustomers() { return [...customers]; }

  function getBarberById(id)   { return barbers.find(b => b.id === id) || null; }
  function getCustomerById(id) { return customers.find(c => c.id === id) || null; }

  function _normalizeUsername(payload) {
    return (payload.username || payload.email || payload.name || "")
      .trim()
      .toLowerCase()
      .split("@")[0]
      .replace(/[^a-z0-9]/g, "");
  }

  function _initials(name) {
    return (name || "UK").split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  }

  function createCustomerUser(adminId, payload = {}) {
    const username = _normalizeUsername(payload);
    if (!payload.name || !payload.email || !username) return { ok: false, error: "Name and email are required." };
    if (customers.some(c => c.username === username || c.email.toLowerCase() === payload.email.toLowerCase())) {
      return { ok: false, error: "A customer with this username or email already exists." };
    }
    const customer = {
      id: _id("c", customers),
      username,
      passwordHash: _h(payload.password || "customer123"),
      name: payload.name.trim(),
      email: payload.email.trim(),
      phone: payload.phone || "",
      role: "customer",
      status: payload.status || "active",
      avatar: _initials(payload.name),
      createdAt: DEMO_TODAY,
      updatedAt: DEMO_TODAY,
      profile: {
        loyaltyStamps: 0,
        totalVisits: 0,
        totalSpent: 0,
        memberTier: "New Member",
        preferredBarber: payload.preferredBarber || "",
        preferredService: payload.preferredService || "",
      },
      createdByAdminId: adminId || "self",
    };
    customers.push(customer);
    return { ok: true, customer: _clone(customer) };
  }

  function registerCustomer(payload = {}) {
    const email = (payload.email || "").trim().toLowerCase();
    const password = payload.password || "";
    if (!payload.name || !email || !payload.phone || !password) return { ok: false, error: "Please complete required fields." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Please enter a valid email." };
    if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
    if (payload.confirmPassword !== undefined && password !== payload.confirmPassword) return { ok: false, error: "Passwords do not match." };
    return createCustomerUser("self", {
      name: payload.name,
      email,
      phone: payload.phone,
      password,
      status: "active",
    });
  }

  function updateCustomerUser(customerId, updates = {}) {
    const customer = getCustomerById(customerId);
    if (!customer) return { ok: false, error: "Customer not found." };
    if (updates.email && customers.some(c => c.id !== customerId && c.email.toLowerCase() === updates.email.toLowerCase())) {
      return { ok: false, error: "Email already exists." };
    }
    ["name", "email", "phone", "status"].forEach(key => {
      if (Object.prototype.hasOwnProperty.call(updates, key)) customer[key] = updates[key];
    });
    if (updates.preferredBarber !== undefined) customer.profile.preferredBarber = updates.preferredBarber;
    if (updates.preferredService !== undefined) customer.profile.preferredService = updates.preferredService;
    customer.avatar = _initials(customer.name);
    customer.updatedAt = DEMO_TODAY;
    return { ok: true, customer: _clone(customer) };
  }

  function deactivateCustomerUser(customerId) {
    return updateCustomerUser(customerId, { status: "inactive" });
  }

  function createBarberUser(adminId, payload) {
    const username = _normalizeUsername(payload);
    if (!payload.name || !payload.email || !username) return { ok: false, error: "Name and email are required." };
    if (barbers.some(b => b.username === username || b.email.toLowerCase() === payload.email.toLowerCase())) {
      return { ok: false, error: "A barber with this username or email already exists." };
    }
    const newBarber = {
      id: _id("b", barbers),
      username,
      passwordHash: _h(payload.password || "barber123"),
      name: payload.name.trim(),
      displayName: (payload.displayName || payload.name.split(" ")[0]).trim(),
      email: payload.email.trim(),
      phone: payload.phone || "",
      role: "barber",
      status: payload.status || "active",
      avatar: _initials(payload.name),
      createdAt: DEMO_TODAY,
      updatedAt: DEMO_TODAY,
      profile: {
        bio: payload.bio || "Urban Kings barber profile.",
        specialties: payload.specialties && payload.specialties.length ? payload.specialties : ["Classic Kings"],
        workDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        workHours: { start: "09:00", end: "17:00" },
        commission: 0.55,
        rating: 0,
        reviewCount: 0,
      },
      metrics: {
        completedToday: 0,
        completedWeek: 0,
        completedMonth: 0,
        revenueWeek: 0,
        revenueMonth: 0,
        avgMinutes: 45,
      },
      createdByAdminId: adminId,
    };
    barbers.push(newBarber);
    return { ok: true, barber: _clone(newBarber) };
  }

  function updateBarberUser(barberId, updates) {
    const barber = getBarberById(barberId);
    if (!barber) return { ok: false, error: "Barber not found." };
    ["name", "displayName", "email", "phone", "status"].forEach(key => {
      if (Object.prototype.hasOwnProperty.call(updates, key)) barber[key] = updates[key];
    });
    if (updates.bio) barber.profile.bio = updates.bio;
    if (updates.specialties) barber.profile.specialties = updates.specialties;
    barber.updatedAt = DEMO_TODAY;
    return { ok: true, barber: _clone(barber) };
  }

  function deactivateBarberUser(barberId) {
    return updateBarberUser(barberId, { status: "inactive" });
  }

  function getServices() {
    const publicServices = (window.UK && Array.isArray(window.UK.services)) ? window.UK.services.map(s => s.name) : [];
    return [...new Set([...bookings.map(b => b.service), ...publicServices])].sort();
  }

  function getBookingStatuses() {
    return [...BOOKING_STATUSES];
  }

  function getNotificationsForUser(receiverId, receiverRole) {
    return notifications
      .filter(n => n.receiverId === receiverId && n.receiverRole === receiverRole)
      .sort(_sortNewest)
      .map(_clone);
  }

  function getUnreadNotificationCount(receiverId, receiverRole) {
    return notifications.filter(n => n.receiverId === receiverId && n.receiverRole === receiverRole && !n.isRead).length;
  }

  function getAllNotifications() {
    return notifications.sort(_sortNewest).map(n => ({
      ..._clone(n),
      sender: findUserById(n.senderId) || null,
      receiver: findUserById(n.receiverId) || null,
    }));
  }

  function markNotificationRead(notificationId, receiverId) {
    const n = notifications.find(item => item.id === notificationId && item.receiverId === receiverId);
    if (!n) return { ok: false, error: "Notification not found." };
    n.isRead = true;
    return { ok: true, notification: _clone(n) };
  }

  function markAllNotificationsRead(receiverId, receiverRole) {
    notifications.forEach(n => {
      if (n.receiverId === receiverId && n.receiverRole === receiverRole) n.isRead = true;
    });
    return { ok: true };
  }

  function sendAdminNotificationToBarbers({ senderId, receiverIds, title, message }) {
    const targetIds = receiverIds && receiverIds.length ? receiverIds : barbers.map(b => b.id);
    const sent = targetIds
      .filter(id => barbers.some(b => b.id === id))
      .map(receiverId => _createNotification({
        senderId,
        receiverId,
        receiverRole: "barber",
        title,
        message,
        type: "admin_message",
      }));
    return { ok: true, sent };
  }

  function updateBookingForBarber(barberId, bookingId, updates) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return { ok: false, error: "Booking not found." };
    if (booking.barberId !== barberId) return { ok: false, error: "You can only edit bookings assigned to you." };

    const allowed = ["date", "time", "duration", "service", "status", "notes"];
    allowed.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        booking[key] = updates[key];
      }
    });
    if (!BOOKING_STATUSES.includes(booking.status)) booking.status = "pending";
    booking.updatedAt = _now();

    const barber = getBarberById(barberId);
    const decorated = _decorateBooking(booking);
    bookingChangeLog.unshift({
      id: _id("chg", bookingChangeLog),
      bookingId,
      actorId: barberId,
      actorRole: "barber",
      summary: `${barber ? barber.displayName : "Your barber"} updated ${booking.service} for ${booking.date} at ${booking.time}.`,
      createdAt: _now(),
    });

    if (booking.customerId) {
      _createNotification({
        senderId: barberId,
        receiverId: booking.customerId,
        receiverRole: "customer",
        title: "Your booking has been updated",
        message: `${barber ? barber.displayName : "Your barber"} updated your appointment for ${booking.date} at ${booking.time}. Please check your customer portal.`,
        type: "booking_update",
      });
    }

    return { ok: true, booking: decorated };
  }

  function createBooking(payload = {}) {
    const serviceName = payload.service || payload.serviceName || "";
    const publicService = window.UK && Array.isArray(window.UK.services)
      ? window.UK.services.find(s => s.name === serviceName)
      : null;
    if (!serviceName || !payload.date || !payload.time) return { ok: false, error: "Please complete service, date and time." };
    if (!payload.customerId && (!payload.guest || !payload.guest.name || !payload.guest.email || !payload.guest.phone)) {
      return { ok: false, error: "Please add guest contact details or sign in." };
    }
    const barberId = payload.barberId === "any" || !payload.barberId
      ? ((barbers.find(b => b.status === "active") || {}).id || "")
      : payload.barberId;
    const booking = {
      id: _id("bk", bookings),
      customerId: payload.customerId || null,
      guest: payload.customerId ? null : {
        name: payload.guest.name.trim(),
        email: payload.guest.email.trim(),
        phone: payload.guest.phone.trim(),
      },
      barberId,
      service: serviceName,
      date: payload.date,
      time: payload.time,
      duration: Number(payload.duration || (publicService ? publicService.duration : 45)),
      price: Number(payload.price || (publicService ? publicService.price : 0)),
      status: payload.status || "pending",
      paymentStatus: "pending",
      notes: payload.notes || "",
      createdAt: _now(),
      updatedAt: _now(),
    };
    bookings.push(booking);
    return { ok: true, booking: _decorateBooking(booking) };
  }

  function createPayment(payload = {}) {
    const booking = bookings.find(b => b.id === payload.bookingId);
    if (!booking) return { ok: false, error: "Booking not found." };
    const payment = {
      id: _id("pay", payments),
      bookingId: booking.id,
      customerId: booking.customerId || null,
      guestEmail: booking.guest ? booking.guest.email : "",
      amount: Number(payload.amount || booking.price || 0),
      status: payload.status || "pending",
      provider: payload.provider || "mock",
      createdAt: _now(),
      updatedAt: _now(),
    };
    payments.push(payment);
    booking.paymentStatus = payment.status;
    return { ok: true, payment: _clone(payment) };
  }

  function updatePaymentStatus(paymentId, status) {
    if (!PAYMENT_STATUSES.includes(status)) return { ok: false, error: "Invalid payment status." };
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return { ok: false, error: "Payment not found." };
    payment.status = status;
    payment.updatedAt = _now();
    const booking = bookings.find(b => b.id === payment.bookingId);
    if (booking) {
      booking.paymentStatus = status;
      if (status === "paid" && booking.status === "pending") booking.status = "confirmed";
      if (booking.customerId && status === "paid") {
        _createNotification({
          senderId: "system",
          receiverId: booking.customerId,
          receiverRole: "customer",
          title: "Booking confirmed",
          message: `Your ${booking.service} booking for ${booking.date} at ${booking.time} is confirmed.`,
          type: "booking_update",
        });
      }
    }
    return { ok: true, payment: _clone(payment), booking: booking ? _decorateBooking(booking) : null };
  }

  function getAllPayments() {
    return payments.map(p => ({
      ..._clone(p),
      booking: _decorateBooking(bookings.find(b => b.id === p.bookingId) || {}),
      customer: p.customerId ? getCustomerById(p.customerId) : null,
    }));
  }

  function getPaymentsForCustomer(customerId) {
    return getAllPayments().filter(p => p.customerId === customerId);
  }

  function getPaymentStatuses() {
    return [...PAYMENT_STATUSES];
  }

  function getBookingChangeLog() {
    return bookingChangeLog.map(_clone);
  }

  function getAllRosterShifts() {
    return rosterShifts
      .slice()
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      .map(_clone);
  }

  function getRosterForBarber(barberId) {
    return rosterShifts
      .filter(s => s.barberId === barberId)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      .map(_clone);
  }

  function getRosterStatuses() {
    return [...ROSTER_STATUSES];
  }

  function hasRosterConflict({ id, barberId, date, startTime, endTime, status }) {
    if (status !== "scheduled") return false;
    const start = _timeToMinutes(startTime);
    const end = _timeToMinutes(endTime);
    if (start === null || end === null || start >= end) return true;
    return rosterShifts.some(shift => {
      if (shift.id === id || shift.barberId !== barberId || shift.date !== date || shift.status !== "scheduled") return false;
      const s = _timeToMinutes(shift.startTime);
      const e = _timeToMinutes(shift.endTime);
      return start < e && end > s;
    });
  }

  function createRosterShift(adminId, payload) {
    const barber = getBarberById(payload.barberId);
    if (!barber) return { ok: false, error: "Barber not found." };
    const status = payload.status || "scheduled";
    const draft = {
      id: _id("rs", rosterShifts),
      barberId: barber.id,
      barberName: barber.name,
      date: payload.date,
      startTime: status === "scheduled" ? payload.startTime : "",
      endTime: status === "scheduled" ? payload.endTime : "",
      status,
      notes: payload.notes || "",
      createdByAdminId: adminId,
      createdAt: _now(),
      updatedAt: _now(),
    };
    if (hasRosterConflict(draft)) return { ok: false, error: "This shift overlaps with an existing shift for that barber." };
    rosterShifts.unshift(draft);
    notifyRosterChange(adminId, draft, "created");
    return { ok: true, shift: _clone(draft) };
  }

  function updateRosterShift(adminId, shiftId, updates) {
    const shift = rosterShifts.find(s => s.id === shiftId);
    if (!shift) return { ok: false, error: "Shift not found." };
    const next = {
      ...shift,
      barberId: updates.barberId || shift.barberId,
      date: updates.date || shift.date,
      startTime: updates.status && updates.status !== "scheduled" ? "" : (updates.startTime ?? shift.startTime),
      endTime: updates.status && updates.status !== "scheduled" ? "" : (updates.endTime ?? shift.endTime),
      status: updates.status || shift.status,
      notes: updates.notes ?? shift.notes,
    };
    const barber = getBarberById(next.barberId);
    if (!barber) return { ok: false, error: "Barber not found." };
    next.barberName = barber.name;
    if (hasRosterConflict(next)) return { ok: false, error: "This shift overlaps with an existing shift for that barber." };
    Object.assign(shift, next, { updatedAt: _now() });
    notifyRosterChange(adminId, shift, "updated");
    return { ok: true, shift: _clone(shift) };
  }

  function cancelRosterShift(adminId, shiftId) {
    const shift = rosterShifts.find(s => s.id === shiftId);
    if (!shift) return { ok: false, error: "Shift not found." };
    shift.status = "cancelled";
    shift.updatedAt = _now();
    notifyRosterChange(adminId, shift, "cancelled");
    return { ok: true, shift: _clone(shift) };
  }

  function notifyRosterChange(adminId, shift, action) {
    const isCancelled = action === "cancelled" || shift.status === "cancelled";
    const title = isCancelled ? "Your shift has been cancelled" : "Your roster has been updated";
    const timeText = shift.status === "scheduled" ? ` from ${shift.startTime} to ${shift.endTime}` : "";
    const message = isCancelled
      ? `Your shift on ${shift.date} has been cancelled.`
      : `You are ${shift.status === "day_off" ? "marked as day off" : `scheduled on ${shift.date}${timeText}`}. ${shift.notes || ""}`.trim();
    _createNotification({
      senderId: adminId,
      receiverId: shift.barberId,
      receiverRole: "barber",
      title,
      message,
      type: "system",
    });
  }

  /* =========================================================
     EXPOSED API
     ========================================================= */
  return {
    findUser,
    findUserById,
    verifyPassword,
    getAllBookings,
    getAllBarbers,
    getAllCustomers,
    createBarberUser,
    updateBarberUser,
    deactivateBarberUser,
    createCustomerUser,
    registerCustomer,
    updateCustomerUser,
    deactivateCustomerUser,
    createBooking,
    createPayment,
    updatePaymentStatus,
    getAllPayments,
    getPaymentsForCustomer,
    getPaymentStatuses,
    getBookingsForBarber,
    getBookingsForCustomer,
    getBarberById,
    getCustomerById,
    getServices,
    getBookingStatuses,
    getNotificationsForUser,
    getUnreadNotificationCount,
    getAllNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    sendAdminNotificationToBarbers,
    updateBookingForBarber,
    getBookingChangeLog,
    getAllRosterShifts,
    getRosterForBarber,
    getRosterStatuses,
    createRosterShift,
    updateRosterShift,
    cancelRosterShift,
    hasRosterConflict,
    DEMO_TODAY,

    /* Demo hint shown on login screen */
    demoCredentials: {
      admin:    { username: "admin",  password: "admin123"    },
      barber:   { username: "carlos", password: "barber123"   },
      customer: { username: "mateo",  password: "customer123" },
    },
  };

})();
