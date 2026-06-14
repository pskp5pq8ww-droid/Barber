/* ============================================================
   URBAN KINGS — Auth Module
   Server-side credential checks with an httpOnly session cookie.
   A sanitized session is mirrored in localStorage only for UI routing.
   ============================================================ */

window.Auth = (function () {
  const SESSION_KEY = "uk_session";

  function _save(session) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (_) {}
  }

  function _clear() {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session || !session.expiresAt || Date.now() > session.expiresAt) {
        _clear();
        return null;
      }
      return session;
    } catch (_) {
      return null;
    }
  }

  async function login(username, password, role) {
    const cleanUsername = String(username || "").trim();
    const lowerUsername = cleanUsername.toLowerCase();
    const loginRole = ["admin", "admin2"].includes(lowerUsername) ? "admin" : role;
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: cleanUsername, password, role: loginRole }),
    });
    const result = await response.json().catch(() => ({ ok: false, error: "Login failed." }));
    if (!response.ok || !result.ok) return { ok: false, error: result.error || "Login failed." };
    _save(result.session);
    if (window.UK_USERS && result.data) window.UK_USERS.setServerData(result.data);
    return { ok: true, session: result.session };
  }

  async function logout() {
    _clear();
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch (_) {}
    if (window.UK_USERS) {
      try { await window.UK_USERS.init(); } catch (_) {}
    }
  }

  function requireRole(...roles) {
    const session = getSession();
    if (!session || !roles.includes(session.role)) return null;
    return session;
  }

  function touch() {
    const session = getSession();
    if (!session) return;
    _save(session);
  }

  // Adopt a session the server already established (e.g. auto-login after
  // account registration). The httpOnly cookie is already set by the server;
  // here we only mirror the sanitized session for client-side routing.
  function adoptSession(session, data) {
    if (!session) return { ok: false };
    _save(session);
    if (window.UK_USERS && data) window.UK_USERS.setServerData(data);
    return { ok: true, session };
  }

  return { login, logout, getSession, requireRole, touch, adoptSession };
})();
