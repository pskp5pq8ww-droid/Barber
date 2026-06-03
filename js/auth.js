/* ============================================================
   URBAN KINGS — Auth Module
   Mock authentication with localStorage sessions.
   Designed to slot in a real API: replace _mockLogin() with
   a fetch() to your Supabase / Express / Next.js backend.
   ============================================================ */

window.Auth = (function () {

  const SESSION_KEY = "uk_session";
  const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours

  /* ---------- Token helpers ---------- */
  function _genToken() {
    return "uk_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  }

  /* ---------- Session persistence ---------- */
  function _save(session) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (_) {}
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !s.expiresAt || Date.now() > s.expiresAt) { _clear(); return null; }
      return s;
    } catch (_) { return null; }
  }

  function _clear() {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  }

  /* ---------- Mock login
     In production: POST /api/auth/login → returns signed JWT.
     Here we check the mock DB and create a session token locally. ---------- */
  async function login(username, password, role) {
    // Simulate network latency
    await new Promise(r => setTimeout(r, 650));

    const user = UK_USERS.findUser(username, role);
    if (!user) return { ok: false, error: "Username not found. Check the role and try again." };
    if (!UK_USERS.verifyPassword(user, password)) return { ok: false, error: "Incorrect password. Try again." };
    if (user.status !== "active") return { ok: false, error: "Account inactive — contact the admin." };

    const session = {
      token:       _genToken(),
      userId:      user.id,
      role:        user.role,
      name:        user.name,
      displayName: user.displayName || user.name.split(" ")[0],
      avatar:      user.avatar || user.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase(),
      barberId:    role === "barber"   ? user.id : null,
      customerId:  role === "customer" ? user.id : null,
      adminId:     role === "admin"    ? user.id : null,
      expiresAt:   Date.now() + SESSION_TTL,
    };

    _save(session);
    return { ok: true, session };
  }

  /* ---------- Logout ---------- */
  function logout() {
    _clear();
  }

  /* ---------- Route guard
     Returns the session only if it belongs to one of the given roles.
     Caller can redirect if null is returned. ---------- */
  function requireRole(...roles) {
    const s = getSession();
    if (!s || !roles.includes(s.role)) return null;
    return s;
  }

  /* ---------- Refresh expiry (call on user activity) ---------- */
  function touch() {
    const s = getSession();
    if (!s) return;
    s.expiresAt = Date.now() + SESSION_TTL;
    _save(s);
  }

  return { login, logout, getSession, requireRole, touch };

})();
