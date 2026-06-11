/* ============================================================
   URBAN KINGS — Server-backed data cache
   The browser never stores password hashes. All writes go through
   server API routes backed by the private Hostinger storage folder.
   ============================================================ */

window.UK_USERS = (function () {
  const BOOKING_STATUSES = ["pending", "confirmed", "in_progress", "completed", "cancelled", "no-show", "rescheduled"];
  const ROSTER_STATUSES = ["scheduled", "day_off", "unavailable", "completed", "cancelled"];
  const PAYMENT_STATUSES = ["pending", "paid", "cancelled", "failed"];

  const state = {
    admins: [],
    barbers: [],
    customers: [],
    bookings: [],
    payments: [],
    roster: [],
    notifications: [],
    activityLog: [],
    wallets: [],
    settings: {},
    loaded: false,
  };

  function _clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function _timeToMinutes(time) {
    if (!time) return null;
    const [h, m] = String(time).split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  }

  function _hydrate(payload = {}) {
    const data = payload.data || payload;
    state.admins = data.admins || [];
    state.barbers = data.barbers || [];
    state.customers = data.customers || [];
    state.bookings = data.bookings || [];
    state.payments = data.payments || [];
    state.roster = data.roster || [];
    state.notifications = data.notifications || [];
    state.activityLog = data.activityLog || [];
    state.wallets = data.wallets || [];
    state.settings = data.settings || {};
    state.loaded = true;
    return _snapshot();
  }

  function _snapshot() {
    return {
      admins: _clone(state.admins),
      barbers: _clone(state.barbers),
      customers: _clone(state.customers),
      bookings: _clone(state.bookings),
      payments: _clone(state.payments),
      roster: _clone(state.roster),
      notifications: _clone(state.notifications),
      activityLog: _clone(state.activityLog),
      wallets: _clone(state.wallets),
      settings: _clone(state.settings),
    };
  }

  async function _api(path, options = {}) {
    const response = await fetch(path, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
      body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      return { ok: false, error: data.error || "Request failed.", status: response.status };
    }
    return data;
  }

  async function init(payload) {
    if (payload) return _hydrate(payload);
    const result = await _api("/api/bootstrap");
    if (!result.ok) return result;
    return _hydrate(result);
  }

  function setServerData(payload) {
    return _hydrate(payload);
  }

  function _replace(listName, item) {
    const list = state[listName];
    const index = list.findIndex(existing => existing.id === item.id);
    if (index >= 0) list.splice(index, 1, item);
    else list.unshift(item);
  }

  function _remove(listName, id) {
    const list = state[listName];
    const index = list.findIndex(item => item.id === id);
    if (index >= 0) list.splice(index, 1);
  }

  function _decorateBooking(booking) {
    if (!booking) return null;
    const customer = booking.customer || state.customers.find(c => c.id === booking.customerId) || null;
    const barber = booking.barber || state.barbers.find(b => b.id === booking.barberId) || null;
    const payment = booking.payment || state.payments.find(p => p.bookingId === booking.id) || null;
    return {
      ..._clone(booking),
      service: booking.service || booking.serviceName,
      customer: customer ? _clone(customer) : null,
      barber: barber ? _clone(barber) : null,
      payment: payment ? _clone(payment) : null,
    };
  }

  function findUser(username, role) {
    const list = role === "admin" ? state.admins : role === "barber" ? state.barbers : state.customers;
    const q = String(username || "").trim().toLowerCase();
    return list.find(u => u.username === q || String(u.email || "").toLowerCase() === q || String(u.barberCode || "").toLowerCase() === q) || null;
  }

  function findUserById(id) {
    return [...state.admins, ...state.barbers, ...state.customers].find(u => u.id === id) || null;
  }

  function verifyPassword() {
    return false;
  }

  function getBookingsForBarber(barberId) {
    return state.bookings.filter(b => b.barberId === barberId).map(_decorateBooking);
  }

  function getBookingsForCustomer(customerId) {
    return state.bookings.filter(b => b.customerId === customerId).map(_decorateBooking);
  }

  function getAllBookings() {
    return state.bookings.map(_decorateBooking);
  }

  function getAllBarbers() {
    return _clone(state.barbers);
  }

  function getAllCustomers() {
    return _clone(state.customers);
  }

  function getBarberById(id) {
    return _clone(state.barbers.find(b => b.id === id) || null);
  }

  function getCustomerById(id) {
    return _clone(state.customers.find(c => c.id === id) || null);
  }

  function getServices() {
    const publicServices = (window.UK && Array.isArray(window.UK.services)) ? window.UK.services.map(s => s.name) : [];
    return [...new Set([...state.bookings.map(b => b.service || b.serviceName).filter(Boolean), ...publicServices])].sort();
  }

  function getBookingStatuses() {
    return [...BOOKING_STATUSES];
  }

  function getPaymentStatuses() {
    return [...PAYMENT_STATUSES];
  }

  function getRosterStatuses() {
    return [...ROSTER_STATUSES];
  }

  async function createBooking(payload = {}) {
    const result = await _api("/api/bookings", { method: "POST", body: payload });
    if (!result.ok) return result;
    _replace("bookings", result.booking);
    return result;
  }

  async function updateBookingForBarber(barberId, bookingId, updates) {
    const result = await _api(`/api/bookings/${encodeURIComponent(bookingId)}`, { method: "PATCH", body: updates });
    if (!result.ok) return result;
    _replace("bookings", result.booking);
    return result;
  }

  async function updateBookingForAdmin(bookingId, updates) {
    const result = await _api(`/api/bookings/${encodeURIComponent(bookingId)}`, { method: "PATCH", body: updates });
    if (!result.ok) return result;
    _replace("bookings", result.booking);
    return result;
  }

  async function cancelBooking(bookingId) {
    const result = await _api(`/api/bookings/${encodeURIComponent(bookingId)}`, { method: "DELETE" });
    if (!result.ok) return result;
    _replace("bookings", result.booking);
    return result;
  }

  async function createPayment(payload = {}) {
    const result = await _api("/api/payments", { method: "POST", body: payload });
    if (!result.ok) return result;
    _replace("payments", result.payment);
    return result;
  }

  async function updatePaymentStatus(paymentId, status) {
    const result = await _api(`/api/payments/${encodeURIComponent(paymentId)}`, { method: "PATCH", body: { status } });
    if (!result.ok) return result;
    _replace("payments", result.payment);
    if (result.booking) _replace("bookings", result.booking);
    return result;
  }

  function getAllPayments() {
    return state.payments.map(payment => ({
      ..._clone(payment),
      booking: _decorateBooking(state.bookings.find(b => b.id === payment.bookingId) || {}),
      customer: payment.customerId ? getCustomerById(payment.customerId) : null,
    }));
  }

  function getPaymentsForCustomer(customerId) {
    return getAllPayments().filter(p => p.customerId === customerId);
  }

  async function registerCustomer(payload = {}) {
    const result = await _api("/api/customers/register", { method: "POST", body: payload });
    if (!result.ok) return result;
    _replace("customers", result.customer);
    return result;
  }

  async function createCustomerUser(adminId, payload = {}) {
    const result = await _api("/api/users/customers", { method: "POST", body: payload });
    if (!result.ok) return result;
    _replace("customers", result.customer);
    return result;
  }

  async function updateCustomerUser(customerId, updates = {}) {
    const result = await _api(`/api/users/customers/${encodeURIComponent(customerId)}`, { method: "PATCH", body: updates });
    if (!result.ok) return result;
    _replace("customers", result.customer);
    return result;
  }

  async function deactivateCustomerUser(customerId) {
    return updateCustomerUser(customerId, { status: "inactive" });
  }

  async function createBarberUser(adminId, payload = {}) {
    const result = await _api("/api/users/barbers", { method: "POST", body: payload });
    if (!result.ok) return result;
    _replace("barbers", result.barber);
    return result;
  }

  async function updateBarberUser(barberId, updates = {}) {
    const result = await _api(`/api/users/barbers/${encodeURIComponent(barberId)}`, { method: "PATCH", body: updates });
    if (!result.ok) return result;
    _replace("barbers", result.barber);
    return result;
  }

  async function deactivateBarberUser(barberId) {
    const result = await _api(`/api/users/barbers/${encodeURIComponent(barberId)}`, { method: "DELETE" });
    if (!result.ok) return result;
    _replace("barbers", result.barber);
    return result;
  }

  function getNotificationsForUser(receiverId, receiverRole) {
    return state.notifications
      .filter(n => n.receiverId === receiverId && n.receiverRole === receiverRole)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(_clone);
  }

  function getUnreadNotificationCount(receiverId, receiverRole) {
    return state.notifications.filter(n => n.receiverId === receiverId && n.receiverRole === receiverRole && !n.isRead).length;
  }

  function getAllNotifications() {
    return state.notifications
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(n => ({
        ..._clone(n),
        sender: findUserById(n.senderId) || null,
        receiver: findUserById(n.receiverId) || null,
      }));
  }

  async function markNotificationRead(notificationId, receiverId) {
    const result = await _api(`/api/notifications/${encodeURIComponent(notificationId)}`, { method: "PATCH", body: {} });
    if (!result.ok) return result;
    const notification = state.notifications.find(n => n.id === notificationId && n.receiverId === receiverId);
    if (notification) notification.isRead = true;
    return { ok: true, notification: notification ? _clone(notification) : null };
  }

  async function markAllNotificationsRead(receiverId, receiverRole) {
    const result = await _api("/api/notifications/all", { method: "PATCH", body: {} });
    if (!result.ok) return result;
    state.notifications.forEach(n => {
      if (n.receiverId === receiverId && n.receiverRole === receiverRole) n.isRead = true;
    });
    return { ok: true };
  }

  async function sendAdminNotificationToBarbers({ senderId, receiverIds, title, message }) {
    const result = await _api("/api/notifications", { method: "POST", body: { receiverIds, title, message } });
    if (!result.ok) return result;
    (result.sent || []).forEach(item => _replace("notifications", item));
    return result;
  }

  function getBookingChangeLog() {
    return state.activityLog
      .filter(item => String(item.action || "").startsWith("booking."))
      .map(item => ({
        id: item.id,
        bookingId: item.entityId,
        actorId: item.actorId,
        actorRole: item.actorRole,
        summary: item.summary,
        createdAt: item.createdAt,
      }));
  }

  function getAllRosterShifts() {
    return state.roster
      .slice()
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      .map(_clone);
  }

  function getRosterForBarber(barberId) {
    return state.roster
      .filter(s => s.barberId === barberId)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      .map(_clone);
  }

  function hasRosterConflict({ id, barberId, date, startTime, endTime, status }) {
    if (status !== "scheduled") return false;
    const start = _timeToMinutes(startTime);
    const end = _timeToMinutes(endTime);
    if (start === null || end === null || start >= end) return true;
    return state.roster.some(shift => {
      if (shift.id === id || shift.barberId !== barberId || shift.date !== date || shift.status !== "scheduled") return false;
      const s = _timeToMinutes(shift.startTime);
      const e = _timeToMinutes(shift.endTime);
      return start < e && end > s;
    });
  }

  async function createRosterShift(adminId, payload) {
    const result = await _api("/api/roster", { method: "POST", body: payload });
    if (!result.ok) return result;
    _replace("roster", result.shift);
    return result;
  }

  async function updateRosterShift(adminId, shiftId, updates) {
    const result = await _api(`/api/roster/${encodeURIComponent(shiftId)}`, { method: "PATCH", body: updates });
    if (!result.ok) return result;
    _replace("roster", result.shift);
    return result;
  }

  async function cancelRosterShift(adminId, shiftId) {
    const result = await _api(`/api/roster/${encodeURIComponent(shiftId)}`, { method: "DELETE" });
    if (!result.ok) return result;
    _replace("roster", result.shift);
    return result;
  }

  function getAllWallets() {
    return state.wallets.slice().sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))).map(_clone);
  }

  async function getWalletStats() {
    const result = await _api("/api/wallet/stats");
    if (!result.ok) return result;
    state.wallets = result.wallets || state.wallets;
    return result;
  }

  async function generateWalletForBooking(bookingId) {
    const result = await _api("/api/wallet/generate", { method: "POST", body: { bookingId } });
    if (!result.ok) return result;
    if (result.wallet) _replace("wallets", result.wallet);
    return result;
  }

  async function generateTestWallet() {
    const result = await _api("/api/wallet/test", { method: "POST", body: {} });
    if (!result.ok) return result;
    if (result.wallet) _replace("wallets", result.wallet);
    return result;
  }

  async function updateWallet(serialNumber) {
    const result = await _api(`/api/wallet/${encodeURIComponent(serialNumber)}/update`, { method: "POST", body: {} });
    if (!result.ok) return result;
    if (result.wallet) _replace("wallets", result.wallet);
    return result;
  }

  async function simulateWalletVisit(serialNumber) {
    const result = await _api(`/api/wallet/${encodeURIComponent(serialNumber)}/simulate-visit`, { method: "POST", body: {} });
    if (!result.ok) return result;
    if (result.wallet) _replace("wallets", result.wallet);
    return result;
  }

  return {
    init,
    setServerData,
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
    updateBookingForAdmin,
    cancelBooking,
    getBookingChangeLog,
    getAllRosterShifts,
    getRosterForBarber,
    getRosterStatuses,
    createRosterShift,
    updateRosterShift,
    cancelRosterShift,
    hasRosterConflict,
    getAllWallets,
    getWalletStats,
    generateWalletForBooking,
    generateTestWallet,
    updateWallet,
    simulateWalletVisit,
    DEMO_TODAY: "",
    demoCredentials: {},
  };
})();
