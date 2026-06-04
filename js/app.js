/* ============================================================
   URBAN KINGS — Unified app (landing + booking + admin demo +
                              auth login + admin/barber/customer portals)
   GSAP-powered premium experience. Single-page, mock data.
   Auth: Auth module (auth.js) + UK_USERS mock DB (users-data.js)
   ============================================================ */
(function () {
  const { gsap } = window;
  const ST = window.ScrollTrigger;
  if (gsap && ST) gsap.registerPlugin(ST);

  const REDUCED      = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

  /* Active role on the login screen */
  let _authRole = "customer";
  let _bookingStep = 1;
  let _bookingDraft = {
    service: "",
    barberId: "any",
    date: "",
    time: "",
    mode: "guest",
    guest: { name: "", email: "", phone: "" },
    notes: "",
  };

  const ROUTES = {
    "/": { view: "landing" },
    "/index.html": { view: "landing" },
    "/admin": { view: "admin-portal", role: "admin", tab: "ap-overview" },
    "/admin/login": { view: "login", role: "admin" },
    "/admin/dashboard": { view: "admin-portal", role: "admin", tab: "ap-overview" },
    "/admin/users": { view: "admin-portal", role: "admin", tab: "ap-customers" },
    "/admin/barbers": { view: "admin-portal", role: "admin", tab: "ap-barbers" },
    "/admin/bookings": { view: "admin-portal", role: "admin", tab: "ap-bookings" },
    "/admin/payments": { view: "admin-portal", role: "admin", tab: "ap-payments" },
    "/admin/roster": { view: "admin-portal", role: "admin", tab: "ap-roster" },
    "/barber/login": { view: "login", role: "barber" },
    "/barber/dashboard": { view: "barber-portal", role: "barber", tab: "bp-today" },
    "/barber/bookings": { view: "barber-portal", role: "barber", tab: "bp-bookings" },
    "/barber/profile": { view: "barber-portal", role: "barber", tab: "bp-profile" },
    "/barber/schedule": { view: "barber-portal", role: "barber", tab: "bp-roster" },
    "/customer/login": { view: "login", role: "customer" },
    "/customer/register": { view: "register" },
    "/customer/dashboard": { view: "customer-portal", role: "customer" },
    "/customer/bookings": { view: "customer-portal", role: "customer" },
    "/customer/profile": { view: "customer-portal", role: "customer" },
    "/book": { view: "booking" },
    "/services": { view: "landing", scrollTo: "#services" },
    "/checkout": { view: "checkout" },
    "/payment-success": { view: "payment-success" },
    "/payment-cancelled": { view: "payment-cancelled" },
  };

  const VIEW_PATHS = {
    landing: "/",
    booking: "/book",
    login: "/customer/login",
    register: "/customer/register",
    checkout: "/checkout",
    "payment-success": "/payment-success",
    "payment-cancelled": "/payment-cancelled",
    "admin-portal": "/admin/dashboard",
    "barber-portal": "/barber/dashboard",
    "customer-portal": "/customer/dashboard",
  };

  const PORTAL_TAB_PATHS = {
    "ap-overview": "/admin/dashboard",
    "ap-customers": "/admin/users",
    "ap-barbers": "/admin/barbers",
    "ap-bookings": "/admin/bookings",
    "ap-payments": "/admin/payments",
    "ap-roster": "/admin/roster",
    "bp-today": "/barber/dashboard",
    "bp-bookings": "/barber/bookings",
    "bp-profile": "/barber/profile",
    "bp-roster": "/barber/schedule",
  };

  /* =====================================================
     RENDER — LANDING
     ===================================================== */
  function renderLanding() {
    const t = $(".marquee-track");
    if (t) {
      const phrase = `<span>Strong like kings <i class="star">✦</i> Wild as lions <i class="star">✦</i> Latin Barber Kingdom <i class="star">✦</i> Brisbane City <i class="star">✦</i></span>`;
      t.innerHTML = phrase.repeat(6);
    }

    const icons = {
      crown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z"/></svg>',
      globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
      vibe:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 18V6l12-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
      home:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1v-9z"/></svg>',
    };
    const benefitsWrap = $("#benefits-grid");
    if (benefitsWrap) benefitsWrap.innerHTML = UK.benefits.map(b => `
      <article class="benefit card reveal">
        <div class="icon">${icons[b.icon] || icons.crown}</div>
        <h3>${b.title}</h3><p>${b.body}</p>
      </article>`).join("");

    const servicesWrap = $("#services-grid");
    if (servicesWrap) servicesWrap.innerHTML = UK.services.map(s => `
      <article class="service card ${s.featured ? "featured" : ""} reveal">
        ${s.featured ? '<div class="crown"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z"/></svg></div>' : ""}
        <span class="tag">${s.featured ? "Most popular" : "Service"}</span>
        <h3>${s.name}</h3>
        <p class="muted" style="margin:0;font-size:.92rem;">${s.blurb}</p>
        <ul class="feats">${s.features.map(f => `<li>${f}</li>`).join("")}</ul>
        <div class="price">${UK.fmt.money(s.price)} <small>AUD</small></div>
      </article>`).join("");

    const stepsWrap = $("#steps");
    if (stepsWrap) stepsWrap.innerHTML = UK.steps.map((s, i) => `
      <article class="step card reveal"><div class="num">0${i + 1}</div><h3>${s.title}</h3><p>${s.body}</p></article>`).join("");

    const galleryWrap = $("#gallery");
    if (galleryWrap && UK.gallery) galleryWrap.innerHTML = UK.gallery.map(g => `
      <figure class="gallery-item ${g.tall ? "tall" : ""} reveal">
        ${g.img ? `<img src="${g.img}" alt="${g.cap} — Urban Kings Brisbane" loading="lazy">` : `<div class="ph">Add photo</div>`}
        <figcaption class="cap">${g.cap}</figcaption>
      </figure>`).join("");

    const statsWrap = $("#stats");
    if (statsWrap) statsWrap.innerHTML = UK.stats.map(s => `
      <div class="stat reveal"><div class="num" data-count="${s.value}" data-decimals="${s.decimals || 0}" data-suffix="${s.suffix || ""}">0${s.suffix || ""}</div><div class="label">${s.label}</div></div>`).join("");

    const testiWrap = $("#testi-track");
    if (testiWrap) {
      const items = [...UK.testimonials, ...UK.testimonials];
      testiWrap.innerHTML = items.map(t => `
        <article class="testi card">
          <div class="stars">${"★".repeat(t.stars)}</div>
          <p>"${t.body}"</p>
          <div class="who"><div class="avatar">${t.name.split(" ").map(p => p[0]).join("").slice(0,2)}</div>
          <div><div class="name">${t.name}</div><div class="role">${t.role}</div></div></div>
        </article>`).join("");
    }
  }

  /* =====================================================
     RENDER — PUBLIC BOOKING FLOW
     ===================================================== */
  function renderBooking() {
    const host = $(".view-booking");
    if (!host) return;
    const services = (window.UK && Array.isArray(UK.services) ? UK.services : []).map(s => ({
      name: s.name,
      price: s.price,
      duration: s.duration || 45,
      blurb: s.blurb || "",
    }));
    const barbers = UK_USERS.getAllBarbers().filter(b => b.status === "active");
    const today = _todayISO();
    if (!_bookingDraft.date) _bookingDraft.date = today;
    if (!_bookingDraft.time) _bookingDraft.time = "10:00";
    if (!_bookingDraft.service && services[0]) _bookingDraft.service = services[0].name;

    const activeSession = Auth.getSession();
    const selectedService = services.find(s => s.name === _bookingDraft.service) || services[0] || { name:"Service", price:0, duration:45 };
    const selectedBarber = _bookingDraft.barberId === "any" ? null : UK_USERS.getBarberById(_bookingDraft.barberId);

    host.innerHTML = `
      <div class="booking-flow-shell">
        <header class="booking-flow-head">
          <button class="mini-action" data-route-link="/">Back</button>
          <div>
            <div class="eyebrow mini">Urban Kings Booking</div>
            <h1>Book your next cut</h1>
          </div>
          <button class="btn btn-ghost btn-sm" data-route-link="/customer/login">Login</button>
        </header>

        <div class="booking-progress" aria-label="Booking steps">
          ${[1,2,3,4,5].map(n => `<button class="${_bookingStep === n ? "is-active" : ""} ${_bookingStep > n ? "is-done" : ""}" data-book-step="${n}">${n}</button>`).join("")}
        </div>

        <section class="booking-step-card">
          ${_renderBookingStep(_bookingStep, services, barbers, selectedService, selectedBarber, activeSession)}
        </section>

        <aside class="booking-summary-card">
          <div class="pt-panel-head"><h3>Summary</h3></div>
          <div class="summary-line"><span>Service</span><b>${_escapeHTML(selectedService.name)}</b></div>
          <div class="summary-line"><span>Barber</span><b>${selectedBarber ? _escapeHTML(selectedBarber.displayName) : "Any available"}</b></div>
          <div class="summary-line"><span>Date</span><b>${_fmtDate(_bookingDraft.date)}</b></div>
          <div class="summary-line"><span>Time</span><b>${_bookingDraft.time}</b></div>
          <div class="summary-line"><span>Duration</span><b>${selectedService.duration} min</b></div>
          <div class="summary-total"><span>Total</span><b>${_money(selectedService.price)}</b></div>
          <p class="panel-copy">Availability is mock-ready. Backend connection should later check rostered barbers, service skills and open time windows.</p>
        </aside>
      </div>`;

    bindBookingFlowEvents(services);
  }

  function _renderBookingStep(step, services, barbers, selectedService, selectedBarber, activeSession) {
    if (step === 1) return `
      <div class="step-title"><span>Step 1</span><h2>Select service</h2></div>
      <div class="service-choice-grid">
        ${services.map(s => `
          <button class="service-choice ${_bookingDraft.service === s.name ? "is-active" : ""}" data-pick-service="${_escapeHTML(s.name)}">
            <span>${_escapeHTML(s.name)}</span>
            <small>${s.duration} min · ${_money(s.price)}</small>
          </button>`).join("")}
      </div>
      <div class="step-actions"><button class="btn btn-gold" data-book-next>Continue</button></div>`;

    if (step === 2) return `
      <div class="step-title"><span>Step 2</span><h2>Select barber</h2></div>
      <div class="barber-choice-list">
        <button class="barber-choice ${_bookingDraft.barberId === "any" ? "is-active" : ""}" data-pick-barber="any">
          <div class="bp-avatar">UK</div><div><b>Any available barber</b><small>Fastest available option</small></div>
        </button>
        ${barbers.map(b => `
          <button class="barber-choice ${_bookingDraft.barberId === b.id ? "is-active" : ""}" data-pick-barber="${b.id}">
            <div class="bp-avatar">${b.avatar}</div><div><b>${_escapeHTML(b.name)}</b><small>${_escapeHTML(b.profile.specialties.slice(0,2).join(" · "))}</small></div>
          </button>`).join("")}
      </div>
      <div class="step-actions"><button class="btn btn-ghost" data-book-prev>Back</button><button class="btn btn-gold" data-book-next>Continue</button></div>`;

    if (step === 3) return `
      <div class="step-title"><span>Step 3</span><h2>Date and time</h2></div>
      <form class="portal-form compact-form">
        <div class="form-grid two">
          <label>Date <input id="book-date" type="date" min="${_todayISO()}" value="${_bookingDraft.date}" /></label>
          <label>Time <input id="book-time" type="time" value="${_bookingDraft.time}" /></label>
        </div>
        <label>Notes <textarea id="book-notes" rows="3" placeholder="Optional notes for your barber">${_escapeHTML(_bookingDraft.notes || "")}</textarea></label>
      </form>
      <div class="step-actions"><button class="btn btn-ghost" data-book-prev>Back</button><button class="btn btn-gold" data-book-next>Continue</button></div>`;

    if (step === 4) return `
      <div class="step-title"><span>Step 4</span><h2>Continue</h2></div>
      <div class="account-choice-grid">
        <button class="account-choice ${activeSession && activeSession.role === "customer" ? "is-active" : ""}" data-book-mode="customer">
          <b>${activeSession && activeSession.role === "customer" ? "Use my customer account" : "Login / register"}</b>
          <small>${activeSession && activeSession.role === "customer" ? activeSession.displayName : "Associate this booking to your profile"}</small>
        </button>
        <button class="account-choice ${_bookingDraft.mode === "guest" ? "is-active" : ""}" data-book-mode="guest">
          <b>Continue as guest</b>
          <small>No account required for booking and payment</small>
        </button>
      </div>
      <div class="step-actions"><button class="btn btn-ghost" data-book-prev>Back</button><button class="btn btn-gold" data-book-next>Continue</button></div>`;

    return `
      <div class="step-title"><span>Step 5</span><h2>Confirm details</h2></div>
      ${activeSession && activeSession.role === "customer" && _bookingDraft.mode === "customer" ? `
        <div class="pt-empty strong">Booking will be linked to ${_escapeHTML(activeSession.displayName)}.</div>` : `
        <form class="portal-form compact-form" id="guest-details-form">
          <div class="form-grid two">
            <label>Name <input id="guest-name" type="text" value="${_escapeHTML(_bookingDraft.guest.name)}" placeholder="Full name" /></label>
            <label>Email <input id="guest-email" type="email" value="${_escapeHTML(_bookingDraft.guest.email)}" placeholder="you@email.com" /></label>
            <label>Phone <input id="guest-phone" type="tel" value="${_escapeHTML(_bookingDraft.guest.phone)}" placeholder="+61 ..." /></label>
          </div>
        </form>`}
      <div class="form-feedback" id="booking-feedback" aria-live="polite"></div>
      <div class="step-actions"><button class="btn btn-ghost" data-book-prev>Back</button><button class="btn btn-gold" data-book-checkout>Continue to Checkout</button></div>`;
  }

  function bindBookingFlowEvents(services) {
    const host = $(".view-booking");
    if (!host) return;
    host.querySelectorAll("[data-route-link]").forEach(btn => btn.addEventListener("click", () => goToRoute(btn.dataset.routeLink)));
    host.querySelectorAll("[data-book-step]").forEach(btn => btn.addEventListener("click", () => {
      _saveBookingInputs();
      _bookingStep = Number(btn.dataset.bookStep);
      renderBooking();
    }));
    host.querySelectorAll("[data-pick-service]").forEach(btn => btn.addEventListener("click", () => {
      _bookingDraft.service = btn.dataset.pickService;
      renderBooking();
    }));
    host.querySelectorAll("[data-pick-barber]").forEach(btn => btn.addEventListener("click", () => {
      _bookingDraft.barberId = btn.dataset.pickBarber;
      renderBooking();
    }));
    host.querySelectorAll("[data-book-mode]").forEach(btn => btn.addEventListener("click", () => {
      const session = Auth.getSession();
      if (btn.dataset.bookMode === "customer" && (!session || session.role !== "customer")) {
        goToRoute("/customer/login");
        return;
      }
      _bookingDraft.mode = btn.dataset.bookMode;
      renderBooking();
    }));
    host.querySelector("[data-book-prev]")?.addEventListener("click", () => {
      _saveBookingInputs();
      _bookingStep = Math.max(1, _bookingStep - 1);
      renderBooking();
    });
    host.querySelector("[data-book-next]")?.addEventListener("click", () => {
      _saveBookingInputs();
      _bookingStep = Math.min(5, _bookingStep + 1);
      renderBooking();
    });
    host.querySelector("[data-book-checkout]")?.addEventListener("click", () => {
      _saveBookingInputs();
      const result = _createCheckoutFromDraft(services);
      const feedback = $("#booking-feedback");
      if (!result.ok) {
        if (feedback) {
          feedback.textContent = result.error;
          feedback.className = "form-feedback error";
        }
        return;
      }
      sessionStorage.setItem("uk_checkout", JSON.stringify({ bookingId: result.booking.id, paymentId: result.payment.id }));
      goToRoute("/checkout");
    });
  }

  function _saveBookingInputs() {
    const date = $("#book-date");
    const time = $("#book-time");
    const notes = $("#book-notes");
    const guestName = $("#guest-name");
    const guestEmail = $("#guest-email");
    const guestPhone = $("#guest-phone");
    if (date) _bookingDraft.date = date.value;
    if (time) _bookingDraft.time = time.value;
    if (notes) _bookingDraft.notes = notes.value.trim();
    if (guestName) _bookingDraft.guest.name = guestName.value.trim();
    if (guestEmail) _bookingDraft.guest.email = guestEmail.value.trim();
    if (guestPhone) _bookingDraft.guest.phone = guestPhone.value.trim();
  }

  function _createCheckoutFromDraft(services) {
    const session = Auth.getSession();
    const selectedService = services.find(s => s.name === _bookingDraft.service);
    const useCustomer = session && session.role === "customer" && _bookingDraft.mode === "customer";
    const bookingResult = UK_USERS.createBooking({
      customerId: useCustomer ? session.customerId : null,
      guest: useCustomer ? null : _bookingDraft.guest,
      barberId: _bookingDraft.barberId,
      service: _bookingDraft.service,
      date: _bookingDraft.date,
      time: _bookingDraft.time,
      duration: selectedService ? selectedService.duration : 45,
      price: selectedService ? selectedService.price : 0,
      notes: _bookingDraft.notes,
    });
    if (!bookingResult.ok) return bookingResult;
    const paymentResult = UK_USERS.createPayment({
      bookingId: bookingResult.booking.id,
      amount: bookingResult.booking.price,
      status: "pending",
    });
    if (!paymentResult.ok) return paymentResult;
    return { ok: true, booking: bookingResult.booking, payment: paymentResult.payment };
  }

  /* =====================================================
     RENDER — ADMIN DEMO
     ===================================================== */
  const ini = n => n.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  function renderAdmin() {
    const m = UK.admin.metrics;
    $("#kpi-today").dataset.count = m.revenueToday;
    $("#kpi-week").dataset.count  = m.revenueWeek;
    $("#kpi-month").dataset.count = m.revenueMonth;
    $("#kpi-active").dataset.count = m.activeClients;
    $("#kpi-new").dataset.count    = m.newClients;
    $("#kpi-pending").dataset.count = m.pendingPayments;
    $("#kpi-done").dataset.count   = m.completedToday;
    $("#kpi-occ").dataset.count    = Math.round(m.occupancy * 100);

    $("#activity").innerHTML = UK.admin.activity.map(a => `
      <div class="activity-item reveal"><div class="avatar">${ini(a.who)}</div>
      <div class="body"><div><span class="who">${a.who}</span> <b>${a.action}</b> · ${a.client}</div><div class="t">${a.time}</div></div>
      ${a.amount ? `<div class="amount">${UK.fmt.money(a.amount)}</div>` : ""}</div>`).join("");

    $("#clients").innerHTML = UK.admin.topClients.map(c => `
      <div class="client-row reveal"><div class="avatar">${ini(c.name)}</div>
      <div class="info"><b>${c.name}</b><small>${c.visits} visits</small></div>
      <span class="tag">${c.tag}</span><div class="spent">${UK.fmt.money(c.spent)}</div></div>`).join("");

    $("#upcoming").innerHTML = UK.admin.upcoming.map(u => `
      <div class="upcoming-row reveal"><div class="time">${u.time}</div>
      <div><b>${u.service}</b><small>${u.client} · ${u.barber}</small></div><span class="tag neutral">Today</span></div>`).join("");

    renderChart();
  }

  function renderChart() {
    const svg = $("#chart"); if (!svg) return;
    const data = UK.admin.revenueSeries;
    const W = 600, H = 220, pad = 32;
    const max = Math.max(...data) * 1.15;
    const step = (W - pad * 2) / (data.length - 1);
    const points = data.map((v, i) => [pad + i * step, H - pad - (v / max) * (H - pad * 2)]);
    const pathLine = points.map((p, i) => (i === 0 ? "M" : "L") + p[0] + "," + p[1]).join(" ");
    const pathArea = pathLine + ` L ${W - pad},${H - pad} L ${pad},${H - pad} Z`;
    let grid = "";
    for (let i = 0; i <= 4; i++) { const y = pad + ((H - pad * 2) / 4) * i; grid += `<line x1="${pad}" y1="${y}" x2="${W - pad}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="3 4"/>`; }
    const labels = ["M", "T", "W", "T", "F", "S", "S"];
    let xlabels = "", dots = "";
    points.forEach((p, i) => { xlabels += `<text x="${p[0]}" y="${H - 8}" text-anchor="middle" fill="#6a6a72" font-size="11" font-family="JHC Audemars,serif" letter-spacing="2">${labels[i]}</text>`; dots += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#e3c98f" stroke="#050505" stroke-width="2"/>`; });
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = `
      <defs>
        <linearGradient id="goldArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#e3c98f" stop-opacity="0.35"/><stop offset="100%" stop-color="#e3c98f" stop-opacity="0"/></linearGradient>
        <linearGradient id="goldStroke" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stop-color="#f3dca0"/><stop offset="100%" stop-color="#c8a45d"/></linearGradient>
      </defs>
      ${grid}<path d="${pathArea}" fill="url(#goldArea)"/>
      <path id="chart-line" d="${pathLine}" stroke="url(#goldStroke)" stroke-width="2.5" fill="none" stroke-linejoin="round"/>${dots}${xlabels}`;
  }

  /* =====================================================
     PORTAL HELPERS
     ===================================================== */
  const PORTAL_LABELS = {
    customer: "Customer Portal",
    barber: "Barber Portal",
    admin: "Admin Portal",
  };

  const STATUS_LABELS = {
    pending: "Pending",
    confirmed: "Confirmed",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    rescheduled: "Rescheduled",
    scheduled: "Scheduled",
    day_off: "Day Off",
    unavailable: "Unavailable",
    active: "Active",
    inactive: "Inactive",
    paid: "Paid",
    failed: "Failed",
  };

  function _escapeHTML(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function _statusBadge(status) {
    return `<span class="status-badge ${status}">${STATUS_LABELS[status] || status}</span>`;
  }

  function _avChip(av, name, sub) {
    return `<div class="av-chip"><div class="av">${av}</div><div><div class="cell-main">${name}</div>${sub ? `<div class="cell-sub">${sub}</div>` : ""}</div></div>`;
  }

  function _money(n) { return "$" + n.toLocaleString("en-AU"); }
  function _fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString("en-AU", { day:"2-digit", month:"short", year:"numeric" }); } catch { return iso; }
  }
  function _fmtLongDate(iso) {
    try { return new Date(iso).toLocaleDateString("en-AU", { weekday:"short", day:"2-digit", month:"short", year:"numeric" }); } catch { return iso; }
  }
  function _fmtDateTime(iso) {
    try {
      return new Date(iso).toLocaleString("en-AU", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });
    } catch { return iso; }
  }
  function _todayISO() {
    return UK_USERS.DEMO_TODAY || new Date().toISOString().slice(0, 10);
  }
  function _isUpcomingBooking(b) {
    return ["pending", "confirmed", "in_progress", "rescheduled"].includes(b.status);
  }
  function _isCompleteBooking(b) {
    return b.status === "completed";
  }
  function _notifIcon(type) {
    if (type === "admin_message") return "Admin";
    if (type === "booking_update") return "Booking";
    return "System";
  }
  function _renderNotificationList(notifications, receiverId) {
    if (!notifications.length) return `<div class="pt-empty">No notifications yet.</div>`;
    return notifications.map(n => `
      <article class="notification-card ${n.isRead ? "" : "unread"}" data-notification-id="${n.id}" data-receiver-id="${receiverId || ""}">
        <div class="notification-meta">
          <span>${_notifIcon(n.type)}</span>
          <span>${_fmtDateTime(n.createdAt)}</span>
          ${n.isRead ? "" : '<span class="unread-dot">Unread</span>'}
        </div>
        <h4>${_escapeHTML(n.title)}</h4>
        <p>${_escapeHTML(n.message)}</p>
      </article>`).join("");
  }
  function _updateBadge(el, count) {
    if (!el) return;
    el.hidden = !count;
    el.textContent = count > 9 ? "9+" : String(count);
  }
  function _resetPortalPanes(portalSelector) {
    $(`${portalSelector} .portal-pane`)?.classList.add("is-active");
    $$(`${portalSelector} .portal-pane`).forEach((pane, index) => {
      pane.dataset.rendered = index === 0 ? "1" : "";
      pane.classList.toggle("is-active", index === 0);
    });
    $$(`${portalSelector} .portal-nav [data-ptab]`).forEach((btn, index) => btn.classList.toggle("is-active", index === 0));
  }

  /* Bind portal tab switching */
  function bindPortalTabs(navId, panesMap) {
    const nav = $(navId);
    if (!nav) return;
    nav.querySelectorAll("[data-ptab]").forEach(btn => {
      btn.onclick = () => {
        nav.querySelectorAll("[data-ptab]").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const tabId = btn.dataset.ptab;
        const path = btn.dataset.route || PORTAL_TAB_PATHS[tabId];
        if (path) history.replaceState({ path }, "", path);
        const portal = btn.closest(".view");
        portal.querySelectorAll(".portal-pane").forEach(p => p.classList.remove("is-active"));
        const pane = portal.querySelector(`#${tabId}`);
        if (pane) pane.classList.add("is-active");
        window.scrollTo({ top: 0, behavior: "instant" });
        // Lazy render pane content
        if (pane && panesMap[tabId] && !pane.dataset.rendered) {
          panesMap[tabId]();
          pane.dataset.rendered = "1";
        }
      };
    });
    // Mark overview already rendered
    const firstPaneId = Object.keys(panesMap)[0];
    const firstPane = document.getElementById(firstPaneId);
    if (firstPane) firstPane.dataset.rendered = "1";
  }

  /* =====================================================
     RENDER — ADMIN PORTAL
     ===================================================== */
  function renderAdminPortal(session) {
    const nameEl = $("#ap-user-name");
    if (nameEl) nameEl.textContent = session.displayName;

    _resetPortalPanes(".view-admin-portal");

    // Render default tab (overview) immediately
    renderAdminOverview();

    bindPortalTabs("#ap-nav", {
      "ap-overview":  () => renderAdminOverview(),
      "ap-barbers":   () => renderAdminBarbers(session.adminId),
      "ap-customers": () => renderAdminCustomers(session.adminId),
      "ap-bookings":  () => renderAdminBookings("all"),
      "ap-payments":  () => renderAdminPayments("all"),
      "ap-roster":    () => renderAdminRoster(session.adminId),
      "ap-notifications": () => renderAdminNotifications(session.adminId),
    });

    _activatePendingTab();
  }

  function renderAdminOverview() {
    const el = $("#ap-overview-inner"); if (!el) return;
    const bookings  = UK_USERS.getAllBookings();
    const barbers   = UK_USERS.getAllBarbers();
    const customers = UK_USERS.getAllCustomers();
    const payments  = UK_USERS.getAllPayments();

    const revenue   = bookings.filter(b => b.status === "completed").reduce((s, b) => s + b.price, 0);
    const paidRevenue = payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
    const confirmed = bookings.filter(b => b.status === "confirmed").length;
    const pending   = bookings.filter(b => b.status === "pending").length;
    const guestBookings = bookings.filter(b => b.guest).length;
    const pendingPayments = payments.filter(p => p.status === "pending").length;

    el.innerHTML = `
      <div class="pt-kpis">
        <div class="pt-kpi gold">
          <div class="kpi-label">Paid Revenue</div>
          <div class="kpi-val">${_money(paidRevenue || revenue)}</div>
          <div class="kpi-sub up">mock payments</div>
        </div>
        <div class="pt-kpi">
          <div class="kpi-label">Confirmed</div>
          <div class="kpi-val">${confirmed}</div>
          <div class="kpi-sub">upcoming bookings</div>
        </div>
        <div class="pt-kpi">
          <div class="kpi-label">Pending</div>
          <div class="kpi-val">${pending}</div>
          <div class="kpi-sub${pending > 0 ? " down" : ""}">need attention</div>
        </div>
        <div class="pt-kpi">
          <div class="kpi-label">Customers</div>
          <div class="kpi-val">${customers.length}</div>
          <div class="kpi-sub">${guestBookings} guest bookings</div>
        </div>
        <div class="pt-kpi">
          <div class="kpi-label">Payments</div>
          <div class="kpi-val">${pendingPayments}</div>
          <div class="kpi-sub${pendingPayments ? " down" : ""}">pending</div>
        </div>
      </div>

      <div class="quick-actions-row">
        <button class="mini-action" data-admin-quick="ap-customers">Create Customer</button>
        <button class="mini-action" data-admin-quick="ap-barbers">Create Barber</button>
        <button class="mini-action" data-admin-quick="ap-bookings">View Bookings</button>
        <button class="mini-action" data-admin-quick="ap-payments">Payments</button>
      </div>

      <div class="pt-grid">
        <div>
          <div class="pt-panel">
            <div class="pt-panel-head"><h3>Barber Status</h3></div>
            ${barbers.map(b => `
              <div class="barber-profile-card">
                <div class="bp-avatar">${b.avatar}</div>
                <div class="bp-info">
                  <div class="bp-name">${b.name}</div>
                  <div class="bp-bio">${b.profile.bio}</div>
                  <div class="bp-tags">${b.profile.specialties.map(s => `<span class="bp-tag">${s}</span>`).join("")}</div>
                  <div class="bp-meta">
                    <span class="bp-rating">★ ${b.profile.rating}</span>
                    <span>${b.profile.reviewCount} reviews</span>
                    <span>Today: <b>${b.metrics.completedToday}</b> cuts</span>
                    <span>Week: <b>${_money(b.metrics.revenueWeek)}</b></span>
                  </div>
                </div>
              </div>`).join("")}
          </div>
        </div>
        <div>
          <div class="pt-panel">
            <div class="pt-panel-head"><h3>Upcoming Bookings</h3></div>
            ${bookings
              .filter(b => ["confirmed","pending"].includes(b.status))
              .slice(0, 6)
              .map(b => `
                <div class="schedule-row">
                  <div class="sched-time">${b.time}</div>
                  <div>
                    <div class="sched-service">${b.service}</div>
                    <div class="sched-client">${b.customer ? b.customer.name : "—"} · ${b.barber ? b.barber.displayName : "—"}</div>
                  </div>
                  ${_statusBadge(b.status)}
                </div>`).join("") || '<div class="pt-empty">No upcoming bookings</div>'}
          </div>
        </div>
      </div>`;

    el.querySelectorAll("[data-admin-quick]").forEach(btn => btn.addEventListener("click", () => {
      $(`#ap-nav [data-ptab="${btn.dataset.adminQuick}"]`)?.click();
    }));
  }

  function renderAdminBarbers(adminId) {
    const el = $("#ap-barbers-inner"); if (!el) return;
    const barbers = UK_USERS.getAllBarbers();
    el.innerHTML = `
      <div class="pt-panel">
        <div class="pt-panel-head">
          <h3>Create Barber User</h3>
          <span class="dim">Default password: barber123</span>
        </div>
        <form class="portal-form" id="create-barber-form">
          <div class="form-grid two">
            <label>Full name
              <input id="new-barber-name" type="text" placeholder="Example: Andres Silva" />
            </label>
            <label>Email
              <input id="new-barber-email" type="email" placeholder="andres@urbankings.com.au" />
            </label>
            <label>Phone
              <input id="new-barber-phone" type="tel" placeholder="+61 ..." />
            </label>
            <label>Specialties
              <input id="new-barber-specialties" type="text" placeholder="Skin Fade, Beard Sculpt" />
            </label>
          </div>
          <label>Bio
            <textarea id="new-barber-bio" rows="3" placeholder="Short barber profile"></textarea>
          </label>
          <div class="form-feedback" id="create-barber-feedback" aria-live="polite"></div>
          <button class="btn btn-gold btn-sm" type="submit">Create Barber</button>
        </form>
      </div>
      <div class="pt-panel">
        <div class="pt-panel-head">
          <h3>All Barbers (${barbers.length})</h3>
          <span class="dim">Create, edit and deactivate users</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>Barber</th><th>Specialties</th><th>Days</th>
              <th>Commission</th><th>Rating</th><th>Month Revenue</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${barbers.map(b => `
                <tr>
                  <td>${_avChip(b.avatar, b.name, b.email)}</td>
                  <td class="dim">${b.profile.specialties.join(", ")}</td>
                  <td class="dim">${b.profile.workDays.join(" · ")}</td>
                  <td>${Math.round(b.profile.commission * 100)}%</td>
                  <td><span style="color:var(--gold-soft)">★ ${b.profile.rating}</span> <span class="dim">(${b.profile.reviewCount})</span></td>
                  <td>${_money(b.metrics.revenueMonth)}</td>
                  <td>${_statusBadge(b.status)}</td>
                  <td><div class="row-actions"><button class="mini-action" data-edit-barber="${b.id}">Edit</button><button class="mini-action danger" data-deactivate-barber="${b.id}">Deactivate</button></div></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
      <div class="pt-panel" style="margin-top:16px;">
        <div class="pt-panel-head"><h3>Performance This Week</h3></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Barber</th><th>Cuts Today</th><th>Cuts Week</th><th>Avg Time</th><th>Week Revenue</th></tr></thead>
            <tbody>
              ${barbers.map(b => `
                <tr>
                  <td>${_avChip(b.avatar, b.displayName, "")}</td>
                  <td>${b.metrics.completedToday}</td>
                  <td>${b.metrics.completedWeek}</td>
                  <td>${b.metrics.avgMinutes} min</td>
                  <td>${_money(b.metrics.revenueWeek)}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-sheet" id="barber-edit-sheet" hidden></div>`;

    bindAdminBarberEvents(adminId);
  }

  function bindAdminBarberEvents(adminId) {
    const form = $("#create-barber-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const result = UK_USERS.createBarberUser(adminId, {
          name: $("#new-barber-name").value.trim(),
          email: $("#new-barber-email").value.trim(),
          phone: $("#new-barber-phone").value.trim(),
          bio: $("#new-barber-bio").value.trim(),
          specialties: $("#new-barber-specialties").value.split(",").map(s => s.trim()).filter(Boolean),
        });
        const feedback = $("#create-barber-feedback");
        if (!result.ok) {
          feedback.textContent = result.error;
          feedback.className = "form-feedback error";
          return;
        }
        feedback.textContent = "Barber user created.";
        feedback.className = "form-feedback success";
        renderAdminBarbers(adminId);
      });
    }
    const pane = $("#ap-barbers-inner");
    if (!pane) return;
    pane.onclick = (e) => {
      const editBtn = e.target.closest("[data-edit-barber]");
      const deactivateBtn = e.target.closest("[data-deactivate-barber]");
      if (editBtn) openBarberEditSheet(adminId, editBtn.dataset.editBarber);
      if (deactivateBtn) {
        UK_USERS.deactivateBarberUser(deactivateBtn.dataset.deactivateBarber);
        renderAdminBarbers(adminId);
      }
    };
  }

  function openBarberEditSheet(adminId, barberId) {
    const sheet = $("#barber-edit-sheet");
    const barber = UK_USERS.getBarberById(barberId);
    if (!sheet || !barber) return;
    sheet.hidden = false;
    sheet.innerHTML = `
      <div class="sheet-card">
        <div class="sheet-head">
          <div><h3>Edit Barber User</h3><p>${_escapeHTML(barber.name)} · ${barber.id}</p></div>
          <button class="mini-action" id="barber-edit-close">Close</button>
        </div>
        <form class="portal-form" id="barber-edit-form">
          <div class="form-grid two">
            <label>Full name
              <input id="edit-barber-name" type="text" value="${_escapeHTML(barber.name)}" />
            </label>
            <label>Display name
              <input id="edit-barber-display" type="text" value="${_escapeHTML(barber.displayName)}" />
            </label>
            <label>Email
              <input id="edit-barber-email" type="email" value="${_escapeHTML(barber.email)}" />
            </label>
            <label>Phone
              <input id="edit-barber-phone" type="tel" value="${_escapeHTML(barber.phone)}" />
            </label>
            <label>Status
              <select id="edit-barber-status">
                <option value="active" ${barber.status === "active" ? "selected" : ""}>Active</option>
                <option value="inactive" ${barber.status === "inactive" ? "selected" : ""}>Inactive</option>
              </select>
            </label>
            <label>Specialties
              <input id="edit-barber-specialties" type="text" value="${_escapeHTML(barber.profile.specialties.join(", "))}" />
            </label>
          </div>
          <label>Bio
            <textarea id="edit-barber-bio" rows="3">${_escapeHTML(barber.profile.bio)}</textarea>
          </label>
          <div class="form-feedback" id="barber-edit-feedback"></div>
          <button class="btn btn-gold btn-sm" type="submit">Save Barber</button>
        </form>
      </div>`;
    $("#barber-edit-close").onclick = () => { sheet.hidden = true; };
    $("#barber-edit-form").onsubmit = (e) => {
      e.preventDefault();
      const result = UK_USERS.updateBarberUser(barberId, {
        name: $("#edit-barber-name").value.trim(),
        displayName: $("#edit-barber-display").value.trim(),
        email: $("#edit-barber-email").value.trim(),
        phone: $("#edit-barber-phone").value.trim(),
        status: $("#edit-barber-status").value,
        bio: $("#edit-barber-bio").value.trim(),
        specialties: $("#edit-barber-specialties").value.split(",").map(s => s.trim()).filter(Boolean),
      });
      if (!result.ok) {
        $("#barber-edit-feedback").textContent = result.error;
        $("#barber-edit-feedback").className = "form-feedback error";
        return;
      }
      sheet.hidden = true;
      renderAdminBarbers(adminId);
    };
  }

  function renderAdminCustomers(adminId) {
    const el = $("#ap-customers-inner"); if (!el) return;
    const customers = UK_USERS.getAllCustomers();
    const barbers = UK_USERS.getAllBarbers();
    el.innerHTML = `
      <div class="pt-panel">
        <div class="pt-panel-head">
          <h3>Create Customer</h3>
          <span class="dim">Default password: customer123</span>
        </div>
        <form class="portal-form" id="create-customer-form">
          <div class="form-grid two">
            <label>Full name
              <input id="new-customer-name" type="text" placeholder="Example: Sofia Morales" />
            </label>
            <label>Email
              <input id="new-customer-email" type="email" placeholder="sofia@email.com" />
            </label>
            <label>Phone
              <input id="new-customer-phone" type="tel" placeholder="+61 ..." />
            </label>
            <label>Preferred barber
              <select id="new-customer-barber">
                <option value="">No preference</option>
                ${barbers.map(b => `<option value="${b.id}">${_escapeHTML(b.name)}</option>`).join("")}
              </select>
            </label>
          </div>
          <div class="form-feedback" id="create-customer-feedback" aria-live="polite"></div>
          <button class="btn btn-gold btn-sm" type="submit">Create Customer</button>
        </form>
      </div>
      <div class="pt-panel">
        <div class="pt-panel-head"><h3>All Customers (${customers.length})</h3><span class="dim">Create, edit and deactivate users</span></div>
        <div class="pt-search">
          <input type="text" id="cust-search" placeholder="Search by name or email…" />
        </div>
        <div class="table-wrap">
          <table class="data-table" id="cust-table">
            <thead><tr>
              <th>Customer</th><th>Phone</th><th>Tier</th>
              <th>Visits</th><th>Stamps</th><th>Status</th><th>Preferred Barber</th><th>Bookings</th><th>Actions</th>
            </tr></thead>
            <tbody id="cust-tbody">
              ${_renderCustomerRows(customers)}
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-sheet" id="customer-edit-sheet" hidden></div>`;

    const form = $("#create-customer-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const result = UK_USERS.createCustomerUser(adminId, {
          name: $("#new-customer-name").value.trim(),
          email: $("#new-customer-email").value.trim(),
          phone: $("#new-customer-phone").value.trim(),
          preferredBarber: $("#new-customer-barber").value,
        });
        const feedback = $("#create-customer-feedback");
        if (!result.ok) {
          feedback.textContent = result.error;
          feedback.className = "form-feedback error";
          return;
        }
        feedback.textContent = "Customer created.";
        feedback.className = "form-feedback success";
        renderAdminCustomers(adminId);
      });
    }

    // Live search
    const search = $("#cust-search");
    if (search) {
      search.addEventListener("input", () => {
        const q = search.value.toLowerCase();
        const tbody = $("#cust-tbody");
        const filtered = customers.filter(c =>
          c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
        );
        if (tbody) tbody.innerHTML = _renderCustomerRows(filtered);
      });
    }

    el.onclick = (e) => {
      const editBtn = e.target.closest("[data-edit-customer]");
      const deactivateBtn = e.target.closest("[data-deactivate-customer]");
      if (editBtn) openCustomerEditSheet(adminId, editBtn.dataset.editCustomer);
      if (deactivateBtn) {
        UK_USERS.deactivateCustomerUser(deactivateBtn.dataset.deactivateCustomer);
        renderAdminCustomers(adminId);
      }
    };
  }

  function _renderCustomerRows(customers) {
    if (!customers.length) return `<tr><td colspan="9" style="text-align:center;color:var(--text-mute);padding:24px;">No customers found</td></tr>`;
    return customers.map(c => {
      const barber = UK_USERS.getBarberById(c.profile.preferredBarber);
      const bookings = UK_USERS.getBookingsForCustomer(c.id);
      return `
        <tr>
          <td>${_avChip(c.avatar, c.name, c.email)}</td>
          <td class="dim">${c.phone}</td>
          <td><span class="status-badge confirmed">${c.profile.memberTier}</span></td>
          <td>${c.profile.totalVisits}</td>
          <td>${c.profile.loyaltyStamps}/10</td>
          <td>${_statusBadge(c.status)}</td>
          <td class="dim">${barber ? barber.displayName : "—"}</td>
          <td>${bookings.length}</td>
          <td><div class="row-actions"><button class="mini-action" data-edit-customer="${c.id}">Edit</button><button class="mini-action danger" data-deactivate-customer="${c.id}">Deactivate</button></div></td>
        </tr>`;
    }).join("");
  }

  function openCustomerEditSheet(adminId, customerId) {
    const sheet = $("#customer-edit-sheet");
    const customer = UK_USERS.getCustomerById(customerId);
    if (!sheet || !customer) return;
    const barbers = UK_USERS.getAllBarbers();
    sheet.hidden = false;
    sheet.innerHTML = `
      <div class="sheet-card">
        <div class="sheet-head">
          <div><h3>Edit Customer</h3><p>${_escapeHTML(customer.name)} · ${customer.id}</p></div>
          <button class="mini-action" id="customer-edit-close">Close</button>
        </div>
        <form class="portal-form" id="customer-edit-form">
          <div class="form-grid two">
            <label>Full name <input id="edit-customer-name" type="text" value="${_escapeHTML(customer.name)}" /></label>
            <label>Email <input id="edit-customer-email" type="email" value="${_escapeHTML(customer.email)}" /></label>
            <label>Phone <input id="edit-customer-phone" type="tel" value="${_escapeHTML(customer.phone)}" /></label>
            <label>Status
              <select id="edit-customer-status">
                <option value="active" ${customer.status === "active" ? "selected" : ""}>Active</option>
                <option value="inactive" ${customer.status === "inactive" ? "selected" : ""}>Inactive</option>
              </select>
            </label>
            <label>Preferred barber
              <select id="edit-customer-barber">
                <option value="">No preference</option>
                ${barbers.map(b => `<option value="${b.id}" ${customer.profile.preferredBarber === b.id ? "selected" : ""}>${_escapeHTML(b.name)}</option>`).join("")}
              </select>
            </label>
            <label>Preferred service <input id="edit-customer-service" type="text" value="${_escapeHTML(customer.profile.preferredService || "")}" /></label>
          </div>
          <div class="form-feedback" id="customer-edit-feedback"></div>
          <button class="btn btn-gold btn-sm" type="submit">Save Customer</button>
        </form>
      </div>`;
    $("#customer-edit-close").onclick = () => { sheet.hidden = true; };
    $("#customer-edit-form").onsubmit = (e) => {
      e.preventDefault();
      const result = UK_USERS.updateCustomerUser(customerId, {
        name: $("#edit-customer-name").value.trim(),
        email: $("#edit-customer-email").value.trim(),
        phone: $("#edit-customer-phone").value.trim(),
        status: $("#edit-customer-status").value,
        preferredBarber: $("#edit-customer-barber").value,
        preferredService: $("#edit-customer-service").value.trim(),
      });
      if (!result.ok) {
        $("#customer-edit-feedback").textContent = result.error;
        $("#customer-edit-feedback").className = "form-feedback error";
        return;
      }
      sheet.hidden = true;
      renderAdminCustomers(adminId);
    };
  }

  function renderAdminBookings(filter) {
    const el = $("#ap-bookings-inner"); if (!el) return;
    const all = UK_USERS.getAllBookings();
    const changes = UK_USERS.getBookingChangeLog();

    el.innerHTML = `
      <div class="pt-panel">
        <div class="pt-panel-head"><h3>All Bookings (${all.length})</h3></div>
        <div class="filter-chips" id="bk-filters">
          <button class="${filter === "all" ? "is-active" : ""}" data-bk-filter="all">All</button>
          <button class="${filter === "confirmed" ? "is-active" : ""}" data-bk-filter="confirmed">Confirmed</button>
          <button class="${filter === "pending" ? "is-active" : ""}" data-bk-filter="pending">Pending</button>
          <button class="${filter === "in_progress" ? "is-active" : ""}" data-bk-filter="in_progress">In Progress</button>
          <button class="${filter === "completed" ? "is-active" : ""}" data-bk-filter="completed">Completed</button>
          <button class="${filter === "rescheduled" ? "is-active" : ""}" data-bk-filter="rescheduled">Rescheduled</button>
          <button class="${filter === "cancelled" ? "is-active" : ""}" data-bk-filter="cancelled">Cancelled</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>#</th><th>Customer</th><th>Barber</th>
              <th>Service</th><th>Date</th><th>Time</th><th>Price</th><th>Status</th>
            </tr></thead>
            <tbody id="bk-tbody">
              ${_renderBookingRows(all, filter)}
            </tbody>
          </table>
        </div>
      </div>
      <div class="pt-panel">
        <div class="pt-panel-head"><h3>Booking Change Log</h3><span class="dim">${changes.length} updates</span></div>
        ${changes.length ? changes.map(change => `
          <div class="audit-row">
            <div>
              <div class="cell-main">${_escapeHTML(change.summary)}</div>
              <div class="cell-sub">${change.bookingId} · ${_fmtDateTime(change.createdAt)}</div>
            </div>
            <span class="status-badge confirmed">${change.actorRole}</span>
          </div>`).join("") : '<div class="pt-empty">No booking changes yet.</div>'}
      </div>`;

    // Filter chips
    $$("[data-bk-filter]", el).forEach(btn => {
      btn.addEventListener("click", () => {
        $$("[data-bk-filter]", el).forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const f = btn.dataset.bkFilter;
        const tbody = $("#bk-tbody");
        if (tbody) tbody.innerHTML = _renderBookingRows(all, f);
      });
    });
  }

  function _renderBookingRows(bookings, filter) {
    const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);
    if (!filtered.length) return `<tr><td colspan="8" style="text-align:center;color:var(--text-mute);padding:24px;">No bookings found</td></tr>`;
    return filtered.map(b => `
      <tr>
        <td class="muted">${b.id}</td>
        <td>${b.customer ? _avChip(b.customer.avatar, b.customer.name, "") : _guestChip(b.guest)}</td>
        <td>${b.barber ? _avChip(b.barber.avatar, b.barber.displayName, "") : "—"}</td>
        <td class="cell-main">${b.service}</td>
        <td class="dim">${_fmtDate(b.date)}</td>
        <td class="dim">${b.time}</td>
        <td>${_money(b.price)}</td>
        <td>${_statusBadge(b.status)}</td>
      </tr>`).join("");
  }

  function _guestChip(guest) {
    if (!guest) return "—";
    return _avChip("G", `${_escapeHTML(guest.name)} <span class="status-badge pending">Guest</span>`, guest.email);
  }

  function renderAdminPayments(filter = "all") {
    const el = $("#ap-payments-inner"); if (!el) return;
    const payments = UK_USERS.getAllPayments();
    const counts = UK_USERS.getPaymentStatuses().reduce((acc, status) => {
      acc[status] = payments.filter(p => p.status === status).length;
      return acc;
    }, {});
    const paidTotal = payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
    el.innerHTML = `
      <div class="pt-kpis">
        <div class="pt-kpi gold"><div class="kpi-label">Paid</div><div class="kpi-val">${_money(paidTotal)}</div><div class="kpi-sub">mock provider</div></div>
        <div class="pt-kpi"><div class="kpi-label">Pending</div><div class="kpi-val">${counts.pending || 0}</div><div class="kpi-sub">awaiting payment</div></div>
        <div class="pt-kpi"><div class="kpi-label">Failed</div><div class="kpi-val">${counts.failed || 0}</div><div class="kpi-sub">needs follow-up</div></div>
        <div class="pt-kpi"><div class="kpi-label">Cancelled</div><div class="kpi-val">${counts.cancelled || 0}</div><div class="kpi-sub">checkout cancelled</div></div>
      </div>
      <div class="pt-panel">
        <div class="pt-panel-head"><h3>Payments (${payments.length})</h3><span class="dim">Ready for Square/Stripe connection</span></div>
        <div class="filter-chips">
          <button class="${filter === "all" ? "is-active" : ""}" data-pay-filter="all">All</button>
          ${UK_USERS.getPaymentStatuses().map(status => `<button class="${filter === status ? "is-active" : ""}" data-pay-filter="${status}">${STATUS_LABELS[status]}</button>`).join("")}
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Payment</th><th>Booking</th><th>Customer</th><th>Service</th><th>Amount</th><th>Status</th><th>Provider</th><th>Updated</th></tr></thead>
            <tbody id="payments-tbody">${_renderPaymentRows(payments, filter)}</tbody>
          </table>
        </div>
      </div>`;
    el.querySelectorAll("[data-pay-filter]").forEach(btn => {
      btn.addEventListener("click", () => renderAdminPayments(btn.dataset.payFilter));
    });
  }

  function _renderPaymentRows(payments, filter) {
    const filtered = filter === "all" ? payments : payments.filter(p => p.status === filter);
    if (!filtered.length) return `<tr><td colspan="8" style="text-align:center;color:var(--text-mute);padding:24px;">No payments found.</td></tr>`;
    return filtered.map(p => {
      const booking = p.booking || {};
      const guest = booking.guest || null;
      return `
        <tr>
          <td class="muted">${p.id}</td>
          <td class="cell-main">${p.bookingId}</td>
          <td>${p.customer ? _avChip(p.customer.avatar, p.customer.name, p.customer.email) : _guestChip(guest)}</td>
          <td class="dim">${_escapeHTML(booking.service || "—")}</td>
          <td>${_money(p.amount)}</td>
          <td>${_statusBadge(p.status)}</td>
          <td class="dim">${_escapeHTML(p.provider)}</td>
          <td class="dim">${_fmtDateTime(p.updatedAt)}</td>
        </tr>`;
    }).join("");
  }

  function renderAdminNotifications(adminId, flash = "") {
    const el = $("#ap-notifications-inner"); if (!el) return;
    const barbers = UK_USERS.getAllBarbers();
    const history = UK_USERS.getAllNotifications().filter(n => n.type === "admin_message" || n.senderId === adminId);

    el.innerHTML = `
      <div class="pt-grid">
        <div>
          <div class="pt-panel">
            <div class="pt-panel-head"><h3>Send Notification to Barbers</h3><span class="dim">Mock admin message</span></div>
            <form class="portal-form" id="admin-notification-form">
              <label>
                Barber
                <select id="admin-notif-target">
                  <option value="all">All barbers</option>
                  ${barbers.map(b => `<option value="${b.id}">${_escapeHTML(b.name)}</option>`).join("")}
                </select>
              </label>
              <label>
                Title
                <input id="admin-notif-title" type="text" placeholder="Example: Team update" maxlength="80" />
              </label>
              <label>
                Message
                <textarea id="admin-notif-message" rows="5" placeholder="Write a clear message for the barber dashboard"></textarea>
              </label>
              <div class="form-feedback ${flash ? "success" : ""}" id="admin-notif-feedback" aria-live="polite">${flash}</div>
              <button class="btn btn-gold btn-sm" type="submit" data-ripple>Send Notification</button>
            </form>
          </div>
        </div>
        <div>
          <div class="pt-panel">
            <div class="pt-panel-head"><h3>Sent History</h3><span class="dim">${history.length} messages</span></div>
            ${_renderAdminNotificationHistory(history)}
          </div>
        </div>
      </div>`;

    const form = $("#admin-notification-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const target = $("#admin-notif-target").value;
        const title = $("#admin-notif-title").value.trim();
        const message = $("#admin-notif-message").value.trim();
        const feedback = $("#admin-notif-feedback");
        if (!title || !message) {
          feedback.textContent = "Please add both a title and message.";
          feedback.className = "form-feedback error";
          return;
        }
        const receiverIds = target === "all" ? null : [target];
        UK_USERS.sendAdminNotificationToBarbers({ senderId: adminId, receiverIds, title, message });
        const msg = target === "all" ? "Notification sent to all barbers." : "Notification sent to selected barber.";
        form.reset();
        renderAdminNotifications(adminId, msg);
      });
    }
  }

  function _renderAdminNotificationHistory(history) {
    if (!history.length) return '<div class="pt-empty">No sent notifications yet.</div>';
    return history.map(n => `
      <article class="notification-card ${n.isRead ? "" : "unread"}">
        <div class="notification-meta">
          <span>${n.receiver ? _escapeHTML(n.receiver.name) : n.receiverRole}</span>
          <span>${_fmtDateTime(n.createdAt)}</span>
          ${n.isRead ? '<span>Read</span>' : '<span class="unread-dot">Unread</span>'}
        </div>
        <h4>${_escapeHTML(n.title)}</h4>
        <p>${_escapeHTML(n.message)}</p>
      </article>`).join("");
  }

  function renderAdminRoster(adminId, flash = "") {
    const el = $("#ap-roster-inner"); if (!el) return;
    const barbers = UK_USERS.getAllBarbers();
    const shifts = UK_USERS.getAllRosterShifts();
    const today = _todayISO();
    const activeToday = shifts.filter(s => s.date === today && s.status === "scheduled");
    const upcoming = shifts.filter(s => s.date >= today && s.status !== "cancelled").slice(0, 8);

    el.innerHTML = `
      <div class="pt-kpis">
        <div class="pt-kpi gold"><div class="kpi-label">Working Today</div><div class="kpi-val">${activeToday.length}</div><div class="kpi-sub">active barbers</div></div>
        <div class="pt-kpi"><div class="kpi-label">Upcoming Shifts</div><div class="kpi-val">${upcoming.length}</div><div class="kpi-sub">scheduled / days off</div></div>
        <div class="pt-kpi"><div class="kpi-label">Team</div><div class="kpi-val">${barbers.length}</div><div class="kpi-sub">barbers in roster</div></div>
        <div class="pt-kpi"><div class="kpi-label">Month View</div><div class="kpi-val">Soon</div><div class="kpi-sub">calendar placeholder</div></div>
      </div>

      <div class="pt-grid">
        <div>
          <div class="pt-panel">
            <div class="pt-panel-head"><h3>Create Roster Shift</h3><span class="dim">Double-booking checked</span></div>
            <form class="portal-form" id="roster-create-form">
              <div class="form-grid two">
                <label>Barber
                  <select id="roster-barber">${barbers.map(b => `<option value="${b.id}">${_escapeHTML(b.name)}</option>`).join("")}</select>
                </label>
                <label>Status
                  <select id="roster-status">${UK_USERS.getRosterStatuses().map(s => `<option value="${s}">${STATUS_LABELS[s]}</option>`).join("")}</select>
                </label>
                <label>Date
                  <input id="roster-date" type="date" value="${today}" />
                </label>
                <label>Start time
                  <input id="roster-start" type="time" value="09:00" />
                </label>
                <label>End time
                  <input id="roster-end" type="time" value="17:00" />
                </label>
              </div>
              <label>Notes
                <textarea id="roster-notes" rows="3" placeholder="Roster notes visible to the barber"></textarea>
              </label>
              <div class="form-feedback ${flash ? "success" : ""}" id="roster-feedback" aria-live="polite">${flash}</div>
              <button class="btn btn-gold btn-sm" type="submit" data-ripple>Create Shift</button>
            </form>
          </div>

          <div class="pt-panel">
            <div class="pt-panel-head"><h3>Weekly Roster View</h3><span class="dim">Week of ${_fmtDate(today)}</span></div>
            <div class="roster-week">${_renderRosterWeek(shifts, barbers, today)}</div>
          </div>
        </div>

        <div>
          <div class="pt-panel">
            <div class="pt-panel-head"><h3>Today’s Active Barbers</h3></div>
            ${activeToday.length ? activeToday.map(_renderRosterShiftCard).join("") : '<div class="pt-empty">No barbers scheduled today.</div>'}
          </div>
          <div class="pt-panel">
            <div class="pt-panel-head"><h3>Upcoming Shifts</h3></div>
            ${upcoming.length ? upcoming.map(s => _renderRosterShiftCard(s, true)).join("") : '<div class="pt-empty">No upcoming shifts.</div>'}
          </div>
          <div class="pt-panel subtle-panel">
            <div class="pt-panel-head"><h3>Booking Availability Connection</h3></div>
            <p class="panel-copy">Next backend step: customer booking availability should query rostered barbers, service skills and open time windows before offering appointment slots.</p>
          </div>
        </div>
      </div>

      <div class="pt-panel">
        <div class="pt-panel-head"><h3>All Roster Shifts</h3><span class="dim">${shifts.length} total</span></div>
        <div class="filter-chips">
          <select class="inline-select" id="roster-filter-barber">
            <option value="all">All barbers</option>
            ${barbers.map(b => `<option value="${b.id}">${_escapeHTML(b.displayName)}</option>`).join("")}
          </select>
          <input class="inline-input" id="roster-filter-date" type="date" />
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Barber</th><th>Date</th><th>Shift</th><th>Status</th><th>Notes</th><th>Actions</th></tr></thead>
            <tbody id="roster-table-body">${_renderRosterRows(shifts)}</tbody>
          </table>
        </div>
      </div>

      <div class="modal-sheet" id="roster-edit-sheet" hidden></div>`;

    bindAdminRosterEvents(adminId);
  }

  function _renderRosterWeek(shifts, barbers, startDate) {
    const start = new Date(startDate + "T00:00:00");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const dayShifts = shifts.filter(s => s.date === iso);
      return `
        <div class="roster-day">
          <div class="roster-day-head">${d.toLocaleDateString("en-AU", { weekday:"short", day:"2-digit" })}</div>
          ${barbers.map(b => {
            const shift = dayShifts.find(s => s.barberId === b.id);
            return `<div class="roster-mini ${shift ? shift.status : "empty"}">
              <span>${_escapeHTML(b.displayName)}</span>
              <b>${shift ? (shift.status === "scheduled" ? `${shift.startTime}-${shift.endTime}` : STATUS_LABELS[shift.status]) : "Open"}</b>
            </div>`;
          }).join("")}
        </div>`;
    }).join("");
  }

  function _renderRosterShiftCard(shift, compact = false) {
    return `
      <div class="roster-card" data-shift-id="${shift.id}">
        <div>
          <div class="cell-main">${_escapeHTML(shift.barberName)}</div>
          <div class="cell-sub">${_fmtLongDate(shift.date)} ${shift.startTime ? `· ${shift.startTime} - ${shift.endTime}` : ""}</div>
          ${compact && shift.notes ? `<div class="cell-sub">${_escapeHTML(shift.notes)}</div>` : ""}
        </div>
        ${_statusBadge(shift.status)}
      </div>`;
  }

  function _renderRosterRows(shifts) {
    if (!shifts.length) return `<tr><td colspan="6" style="text-align:center;color:var(--text-mute);padding:24px;">No roster shifts found.</td></tr>`;
    return shifts.map(s => `
      <tr>
        <td>${_avChip((UK_USERS.getBarberById(s.barberId) || {}).avatar || "UK", s.barberName, s.barberId)}</td>
        <td class="dim">${_fmtLongDate(s.date)}</td>
        <td class="dim">${s.startTime ? `${s.startTime} - ${s.endTime}` : "No shift time"}</td>
        <td>${_statusBadge(s.status)}</td>
        <td class="dim">${_escapeHTML(s.notes || "—")}</td>
        <td>
          <div class="row-actions">
            <button class="mini-action" data-edit-shift="${s.id}">Edit</button>
            <button class="mini-action danger" data-cancel-shift="${s.id}">Cancel</button>
          </div>
        </td>
      </tr>`).join("");
  }

  function bindAdminRosterEvents(adminId) {
    const form = $("#roster-create-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const result = UK_USERS.createRosterShift(adminId, {
          barberId: $("#roster-barber").value,
          status: $("#roster-status").value,
          date: $("#roster-date").value,
          startTime: $("#roster-start").value,
          endTime: $("#roster-end").value,
          notes: $("#roster-notes").value.trim(),
        });
        const feedback = $("#roster-feedback");
        if (!result.ok) {
          feedback.textContent = result.error;
          feedback.className = "form-feedback error";
          return;
        }
        renderAdminRoster(adminId, "Shift created and barber notified.");
      });
    }

    const tableBody = $("#roster-table-body");
    const filterBarber = $("#roster-filter-barber");
    const filterDate = $("#roster-filter-date");
    function applyRosterFilters() {
      const all = UK_USERS.getAllRosterShifts();
      const barberId = filterBarber ? filterBarber.value : "all";
      const date = filterDate ? filterDate.value : "";
      const filtered = all.filter(s => (barberId === "all" || s.barberId === barberId) && (!date || s.date === date));
      if (tableBody) tableBody.innerHTML = _renderRosterRows(filtered);
    }
    if (filterBarber) filterBarber.addEventListener("change", applyRosterFilters);
    if (filterDate) filterDate.addEventListener("change", applyRosterFilters);

    const rosterPane = $("#ap-roster-inner");
    if (rosterPane) {
      rosterPane.onclick = (e) => {
        const editBtn = e.target.closest("[data-edit-shift]");
        const cancelBtn = e.target.closest("[data-cancel-shift]");
        if (editBtn) openRosterEditSheet(adminId, editBtn.dataset.editShift);
        if (cancelBtn) {
          const result = UK_USERS.cancelRosterShift(adminId, cancelBtn.dataset.cancelShift);
          if (result.ok) renderAdminRoster(adminId);
        }
      };
    }
  }

  function openRosterEditSheet(adminId, shiftId) {
    const sheet = $("#roster-edit-sheet");
    const shift = UK_USERS.getAllRosterShifts().find(s => s.id === shiftId);
    if (!sheet || !shift) return;
    const barbers = UK_USERS.getAllBarbers();
    sheet.hidden = false;
    sheet.innerHTML = `
      <div class="sheet-card">
        <div class="sheet-head">
          <div><h3>Edit Shift</h3><p>${shift.id} · ${_escapeHTML(shift.barberName)}</p></div>
          <button class="mini-action" id="roster-edit-close">Close</button>
        </div>
        <form class="portal-form" id="roster-edit-form">
          <div class="form-grid two">
            <label>Barber
              <select id="edit-roster-barber">${barbers.map(b => `<option value="${b.id}" ${b.id === shift.barberId ? "selected" : ""}>${_escapeHTML(b.name)}</option>`).join("")}</select>
            </label>
            <label>Status
              <select id="edit-roster-status">${UK_USERS.getRosterStatuses().map(s => `<option value="${s}" ${s === shift.status ? "selected" : ""}>${STATUS_LABELS[s]}</option>`).join("")}</select>
            </label>
            <label>Date
              <input id="edit-roster-date" type="date" value="${shift.date}" />
            </label>
            <label>Start
              <input id="edit-roster-start" type="time" value="${shift.startTime}" />
            </label>
            <label>End
              <input id="edit-roster-end" type="time" value="${shift.endTime}" />
            </label>
          </div>
          <label>Notes
            <textarea id="edit-roster-notes" rows="3">${_escapeHTML(shift.notes || "")}</textarea>
          </label>
          <div class="form-feedback" id="roster-edit-feedback"></div>
          <button class="btn btn-gold btn-sm" type="submit">Save Shift</button>
        </form>
      </div>`;
    $("#roster-edit-close").addEventListener("click", () => { sheet.hidden = true; });
    $("#roster-edit-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const result = UK_USERS.updateRosterShift(adminId, shiftId, {
        barberId: $("#edit-roster-barber").value,
        status: $("#edit-roster-status").value,
        date: $("#edit-roster-date").value,
        startTime: $("#edit-roster-start").value,
        endTime: $("#edit-roster-end").value,
        notes: $("#edit-roster-notes").value.trim(),
      });
      if (!result.ok) {
        $("#roster-edit-feedback").textContent = result.error;
        $("#roster-edit-feedback").className = "form-feedback error";
        return;
      }
      sheet.hidden = true;
      renderAdminRoster(adminId);
    });
  }

  /* =====================================================
     RENDER — BARBER PORTAL
     ===================================================== */
  function renderBarberPortal(session) {
    const nameEl = $("#bp-user-name");
    if (nameEl) nameEl.textContent = session.displayName;

    _resetPortalPanes(".view-barber-portal");
    updateBarberNotificationBadge(session.barberId);
    renderBarberToday(session.barberId);

    bindPortalTabs("#bp-nav", {
      "bp-today":    () => renderBarberToday(session.barberId),
      "bp-bookings": () => renderBarberBookings(session.barberId),
      "bp-profile":  () => renderBarberProfile(session.barberId),
      "bp-roster":   () => renderBarberRoster(session.barberId),
      "bp-notifications": () => renderBarberNotifications(session.barberId),
    });
  }

  function updateBarberNotificationBadge(barberId) {
    _updateBadge($("#bp-notif-badge"), UK_USERS.getUnreadNotificationCount(barberId, "barber"));
  }

  function renderBarberToday(barberId) {
    const el = $("#bp-today-inner"); if (!el) return;
    const barber   = UK_USERS.getBarberById(barberId);
    const bookings = UK_USERS.getBookingsForBarber(barberId);
    if (!barber) { el.innerHTML = '<div class="pt-empty">Barber profile not found.</div>'; return; }
    const today = _todayISO();
    const todayBookings = bookings.filter(b => b.date === today);
    const activeToday = todayBookings.filter(_isUpcomingBooking);
    const completedToday = todayBookings.filter(_isCompleteBooking);
    const upcoming = bookings.filter(b => b.date >= today && _isUpcomingBooking(b)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const cancelled = bookings.filter(b => ["cancelled", "rescheduled"].includes(b.status));
    const roster = UK_USERS.getRosterForBarber(barberId);
    const todayShift = roster.find(s => s.date === today);
    const nextBooking = upcoming[0];
    const weeklyCompleted = bookings.filter(b => b.status === "completed" && b.date >= "2026-05-21").length;
    const monthlyCompleted = bookings.filter(b => b.status === "completed" && b.date >= "2026-05-01").length;
    const services = {};
    bookings.forEach(b => { services[b.service] = (services[b.service] || 0) + 1; });
    const topServices = Object.entries(services).sort((a,b) => b[1] - a[1]).slice(0, 3);
    const avgDuration = Math.round(bookings.reduce((sum, b) => sum + b.duration, 0) / Math.max(bookings.length, 1));

    el.innerHTML = `
      <div class="barber-hero-card">
        <div class="bp-avatar large">${barber.avatar}</div>
        <div>
          <div class="eyebrow mini">Barber Dashboard</div>
          <h2>${_escapeHTML(barber.name)}</h2>
          <div class="barber-status-row">
            ${_statusBadge(barber.status)}
            <span>${todayShift ? (todayShift.status === "scheduled" ? `Working ${todayShift.startTime} - ${todayShift.endTime}` : STATUS_LABELS[todayShift.status]) : "No roster today"}</span>
          </div>
          <div class="bp-tags">${barber.profile.specialties.map(s => `<span class="bp-tag">${_escapeHTML(s)}</span>`).join("")}</div>
        </div>
        <div class="next-booking-mini">
          <div class="cell-sub">Next booking</div>
          <strong>${nextBooking ? `${nextBooking.time} · ${_escapeHTML(nextBooking.service)}` : "No upcoming booking"}</strong>
          <span>${nextBooking && nextBooking.customer ? _escapeHTML(nextBooking.customer.name) : "Keep an eye on your roster."}</span>
        </div>
      </div>

      <div class="metrics-row expanded">
        <div class="metric-card">
          <div class="mc-val">${todayBookings.length}</div>
          <div class="mc-lbl">Today’s bookings</div>
        </div>
        <div class="metric-card">
          <div class="mc-val">${completedToday.length}</div>
          <div class="mc-lbl">Completed today</div>
        </div>
        <div class="metric-card">
          <div class="mc-val">${upcoming.length}</div>
          <div class="mc-lbl">Upcoming</div>
        </div>
        <div class="metric-card">
          <div class="mc-val">${cancelled.length}</div>
          <div class="mc-lbl">Cancelled/rescheduled</div>
        </div>
        <div class="metric-card">
          <div class="mc-val">${weeklyCompleted}</div>
          <div class="mc-lbl">Completed this week</div>
        </div>
        <div class="metric-card">
          <div class="mc-val">${monthlyCompleted}</div>
          <div class="mc-lbl">Completed this month</div>
        </div>
        <div class="metric-card">
          <div class="mc-val">${avgDuration} min</div>
          <div class="mc-lbl">Avg duration</div>
        </div>
        <div class="metric-card">
          <div class="mc-val">${barber.profile.rating} ★</div>
          <div class="mc-lbl">Rating placeholder</div>
        </div>
      </div>

      <div class="pt-grid">
        <div>
          <div class="pt-panel">
            <div class="pt-panel-head">
              <h3>Today’s Bookings</h3>
              <span class="dim">${todayBookings.length} appointments</span>
            </div>
            ${todayBookings.length ? todayBookings.map(b => _renderBarberBookingCard(b, true)).join("") : '<div class="pt-empty">No bookings assigned today.</div>'}
          </div>

          <div class="pt-panel">
            <div class="pt-panel-head"><h3>Most Requested Services</h3></div>
            <div class="service-rank-list">
              ${topServices.length ? topServices.map(([name, count]) => `<div><span>${_escapeHTML(name)}</span><b>${count} bookings</b></div>`).join("") : '<div class="pt-empty">No service data yet.</div>'}
            </div>
          </div>
        </div>
        <div>
          <div class="pt-panel">
            <div class="pt-panel-head"><h3>Past Days Overview</h3></div>
            <div class="profile-field-list">
              <div class="profile-field"><div class="pf-key">Yesterday</div><div class="pf-val">${bookings.filter(b => b.status === "completed" && b.date === "2026-05-27").length} completed</div></div>
              <div class="profile-field"><div class="pf-key">This week</div><div class="pf-val">${weeklyCompleted} completed</div></div>
              <div class="profile-field"><div class="pf-key">This month</div><div class="pf-val">${monthlyCompleted} completed</div></div>
              <div class="profile-field"><div class="pf-key">Changes</div><div class="pf-val">${cancelled.length} cancelled/rescheduled</div></div>
              <div class="profile-field"><div class="pf-key">Return rate</div><div class="pf-val">Placeholder for CRM</div></div>
            </div>
          </div>
          <div class="pt-panel subtle-panel">
            <div class="pt-panel-head"><h3>Customer Privacy</h3></div>
            <p class="panel-copy">This barber dashboard intentionally hides customer spend, lifetime value and payment history.</p>
          </div>
        </div>
      </div>
      <div class="booking-editor-slot" id="barber-booking-editor"></div>`;

    bindBarberBookingActions(barberId, el);
  }

  function renderBarberBookings(barberId) {
    const el = $("#bp-bookings-inner"); if (!el) return;
    const bookings = UK_USERS.getBookingsForBarber(barberId);

    el.innerHTML = `
      <div class="pt-panel">
        <div class="pt-panel-head"><h3>All My Bookings (${bookings.length})</h3></div>
        <div class="filter-chips" id="bb-filters">
          <button class="is-active" data-bb-filter="all">All</button>
          <button data-bb-filter="confirmed">Confirmed</button>
          <button data-bb-filter="pending">Pending</button>
          <button data-bb-filter="in_progress">In Progress</button>
          <button data-bb-filter="completed">Completed</button>
          <button data-bb-filter="rescheduled">Rescheduled</button>
          <button data-bb-filter="cancelled">Cancelled</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Customer</th><th>Service</th><th>Date</th><th>Time</th><th>Duration</th><th>Status</th><th>Notes</th><th>Action</th></tr></thead>
            <tbody id="bb-tbody">${_renderBarberBookingRows(bookings, "all")}</tbody>
          </table>
        </div>
      </div>
      <div class="booking-editor-slot"></div>`;

    $$("[data-bb-filter]", el).forEach(btn => {
      btn.addEventListener("click", () => {
        $$("[data-bb-filter]", el).forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const f = btn.dataset.bbFilter;
        const tbody = $("#bb-tbody");
        if (tbody) tbody.innerHTML = _renderBarberBookingRows(bookings, f);
        bindBarberBookingActions(barberId, el);
      });
    });

    bindBarberBookingActions(barberId, el);
  }

  function _renderBarberBookingRows(bookings, filter) {
    const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);
    if (!filtered.length) return `<tr><td colspan="8" style="text-align:center;color:var(--text-mute);padding:24px;">No bookings</td></tr>`;
    return filtered.map(b => `
      <tr>
        <td>${b.customer ? _avChip(b.customer.avatar, b.customer.name, b.customer.phone) : "—"}</td>
        <td class="cell-main">${b.service}</td>
        <td class="dim">${_fmtDate(b.date)}</td>
        <td class="dim">${b.time}</td>
        <td class="dim">${b.duration} min</td>
        <td>${_statusBadge(b.status)}</td>
        <td class="dim">${_escapeHTML(b.notes || "—")}</td>
        <td><button class="mini-action" data-edit-booking="${b.id}">Edit</button></td>
      </tr>`).join("");
  }

  function _renderBarberBookingCard(b, showEdit = false) {
    return `
      <div class="booking-card" data-booking-id="${b.id}">
        <div class="booking-card-time">${b.time}</div>
        <div>
          <div class="cell-main">${_escapeHTML(b.service)}</div>
          <div class="cell-sub">${b.customer ? _escapeHTML(b.customer.name) : "—"} · ${b.duration} min</div>
          <div class="booking-notes">${_escapeHTML(b.notes || "No notes")}</div>
        </div>
        <div class="booking-card-actions">
          ${_statusBadge(b.status)}
          ${showEdit ? `<button class="mini-action" data-edit-booking="${b.id}">Edit</button>` : ""}
        </div>
      </div>`;
  }

  function bindBarberBookingActions(barberId, scope) {
    scope.querySelectorAll("[data-edit-booking]").forEach(btn => {
      btn.onclick = () => openBarberBookingEditor(barberId, btn.dataset.editBooking, scope);
    });
  }

  function openBarberBookingEditor(barberId, bookingId, scope) {
    const booking = UK_USERS.getBookingsForBarber(barberId).find(b => b.id === bookingId);
    if (!booking) return;
    let slot = scope.querySelector(".booking-editor-slot") || $("#barber-booking-editor") || scope;
    const services = UK_USERS.getServices();
    slot.innerHTML = `
      <div class="edit-panel">
        <div class="sheet-head">
          <div>
            <h3>Edit Booking</h3>
            <p>${booking.customer ? _escapeHTML(booking.customer.name) : "Customer"} · ${booking.id}</p>
          </div>
          <button class="mini-action" id="booking-editor-close">Close</button>
        </div>
        <form class="portal-form" id="barber-booking-form">
          <div class="form-grid two">
            <label>Date
              <input id="edit-booking-date" type="date" value="${booking.date}" />
            </label>
            <label>Time
              <input id="edit-booking-time" type="time" value="${booking.time}" />
            </label>
            <label>Duration
              <input id="edit-booking-duration" type="number" min="15" step="5" value="${booking.duration}" />
            </label>
            <label>Status
              <select id="edit-booking-status">${UK_USERS.getBookingStatuses().map(s => `<option value="${s}" ${booking.status === s ? "selected" : ""}>${STATUS_LABELS[s]}</option>`).join("")}</select>
            </label>
          </div>
          <label>Service
            <select id="edit-booking-service">
              ${services.map(service => `<option value="${_escapeHTML(service)}" ${booking.service === service ? "selected" : ""}>${_escapeHTML(service)}</option>`).join("")}
            </select>
          </label>
          <label>Notes
            <textarea id="edit-booking-notes" rows="3">${_escapeHTML(booking.notes || "")}</textarea>
          </label>
          <div class="form-feedback" id="booking-edit-feedback" aria-live="polite"></div>
          <button class="btn btn-gold btn-sm" type="submit">Save Booking</button>
        </form>
      </div>`;
    $("#booking-editor-close").onclick = () => { slot.innerHTML = ""; };
    $("#barber-booking-form").onsubmit = (e) => {
      e.preventDefault();
      const result = UK_USERS.updateBookingForBarber(barberId, bookingId, {
        date: $("#edit-booking-date").value,
        time: $("#edit-booking-time").value,
        duration: Number($("#edit-booking-duration").value),
        status: $("#edit-booking-status").value,
        service: $("#edit-booking-service").value,
        notes: $("#edit-booking-notes").value.trim(),
      });
      const feedback = $("#booking-edit-feedback");
      if (!result.ok) {
        feedback.textContent = result.error;
        feedback.className = "form-feedback error";
        return;
      }
      feedback.textContent = "Booking saved. Customer notification sent.";
      feedback.className = "form-feedback success";
      setTimeout(() => {
        renderBarberToday(barberId);
        renderBarberBookings(barberId);
      }, 600);
    };
  }

  function renderBarberProfile(barberId) {
    const el = $("#bp-profile-inner"); if (!el) return;
    const barber = UK_USERS.getBarberById(barberId);
    if (!barber) { el.innerHTML = '<div class="pt-empty">Profile not found</div>'; return; }
    const p = barber.profile;
    el.innerHTML = `
      <div class="pt-panel">
        <div class="pt-panel-head"><h3>My Profile</h3><button class="btn btn-ghost btn-sm" disabled>Edit</button></div>
        <div class="barber-profile-card">
          <div class="bp-avatar" style="width:64px;height:64px;font-size:1.4rem;">${barber.avatar}</div>
          <div class="bp-info">
            <div class="bp-name" style="font-size:1.15rem;">${barber.name}</div>
            <div class="bp-bio">${p.bio}</div>
            <div class="bp-tags">${p.specialties.map(s => `<span class="bp-tag">${s}</span>`).join("")}</div>
            <div class="bp-meta">
              <span class="bp-rating">★ ${p.rating} rating</span>
              <span>${p.reviewCount} reviews</span>
              <span>Review placeholder</span>
            </div>
          </div>
        </div>
        <div class="profile-field-list">
          <div class="profile-field"><div class="pf-key">Full name</div><div class="pf-val">${barber.name}</div></div>
          <div class="profile-field"><div class="pf-key">Email</div><div class="pf-val">${barber.email}</div></div>
          <div class="profile-field"><div class="pf-key">Phone</div><div class="pf-val">${barber.phone}</div></div>
          <div class="profile-field"><div class="pf-key">Work days</div><div class="pf-val">${p.workDays.join(", ")}</div></div>
          <div class="profile-field"><div class="pf-key">Work hours</div><div class="pf-val">${p.workHours.start} – ${p.workHours.end}</div></div>
          <div class="profile-field"><div class="pf-key">Member since</div><div class="pf-val">${_fmtDate(barber.createdAt)}</div></div>
          <div class="profile-field"><div class="pf-key">Assigned services</div><div class="pf-val">${p.specialties.join(", ")}</div></div>
          <div class="profile-field"><div class="pf-key">Status</div><div class="pf-val">${_statusBadge(barber.status)}</div></div>
        </div>
      </div>
      <div class="pt-panel" style="margin-top:16px;">
        <div class="pt-panel-head"><h3>Profile Metrics</h3></div>
        <div class="metrics-row" style="padding:16px;">
          <div class="metric-card">
            <div class="mc-val">${barber.metrics.completedMonth}</div>
            <div class="mc-lbl">Completed this month</div>
          </div>
          <div class="metric-card">
            <div class="mc-val">${barber.metrics.completedWeek}</div>
            <div class="mc-lbl">Completed this week</div>
          </div>
          <div class="metric-card">
            <div class="mc-val">${barber.metrics.avgMinutes} min</div>
            <div class="mc-lbl">Avg per cut</div>
          </div>
        </div>
      </div>`;
  }

  function renderBarberRoster(barberId) {
    const el = $("#bp-roster-inner"); if (!el) return;
    const roster = UK_USERS.getRosterForBarber(barberId);
    const today = _todayISO();
    const todayShift = roster.find(s => s.date === today);
    const upcoming = roster.filter(s => s.date >= today);
    const daysOff = roster.filter(s => s.status === "day_off");

    el.innerHTML = `
      <div class="pt-kpis">
        <div class="pt-kpi gold"><div class="kpi-label">Today’s Shift</div><div class="kpi-val">${todayShift ? STATUS_LABELS[todayShift.status] : "None"}</div><div class="kpi-sub">${todayShift && todayShift.startTime ? `${todayShift.startTime} - ${todayShift.endTime}` : "check with admin"}</div></div>
        <div class="pt-kpi"><div class="kpi-label">Upcoming</div><div class="kpi-val">${upcoming.length}</div><div class="kpi-sub">visible shifts</div></div>
        <div class="pt-kpi"><div class="kpi-label">Days Off</div><div class="kpi-val">${daysOff.length}</div><div class="kpi-sub">approved</div></div>
        <div class="pt-kpi"><div class="kpi-label">Edit Access</div><div class="kpi-val">Admin</div><div class="kpi-sub">barber read-only</div></div>
      </div>
      <div class="pt-panel">
        <div class="pt-panel-head"><h3>My Roster</h3><span class="dim">Read-only schedule</span></div>
        ${roster.length ? roster.map(s => `
          <div class="roster-card">
            <div>
              <div class="cell-main">${_fmtLongDate(s.date)}</div>
              <div class="cell-sub">${s.startTime ? `${s.startTime} - ${s.endTime}` : "No working hours"} · ${_escapeHTML(s.notes || "No notes")}</div>
            </div>
            ${_statusBadge(s.status)}
          </div>`).join("") : '<div class="pt-empty">No roster yet. Admin schedules will appear here.</div>'}
      </div>`;
  }

  function renderBarberNotifications(barberId) {
    const el = $("#bp-notifications-inner"); if (!el) return;
    const notifications = UK_USERS.getNotificationsForUser(barberId, "barber");
    const unread = UK_USERS.getUnreadNotificationCount(barberId, "barber");
    el.innerHTML = `
      <div class="pt-panel">
        <div class="pt-panel-head">
          <h3>Notifications</h3>
          <button class="btn btn-ghost btn-sm" id="bp-mark-read" ${unread ? "" : "disabled"}>Mark All Read</button>
        </div>
        ${_renderNotificationList(notifications, barberId)}
      </div>`;
    const markRead = $("#bp-mark-read");
    if (markRead) markRead.onclick = () => {
      UK_USERS.markAllNotificationsRead(barberId, "barber");
      updateBarberNotificationBadge(barberId);
      renderBarberNotifications(barberId);
    };
    el.querySelectorAll("[data-notification-id]").forEach(card => {
      card.addEventListener("click", () => {
        UK_USERS.markNotificationRead(card.dataset.notificationId, barberId);
        updateBarberNotificationBadge(barberId);
        renderBarberNotifications(barberId);
      });
    });
  }

  /* =====================================================
     RENDER — CUSTOMER PORTAL
     ===================================================== */
  function renderCustomerPortal(session) {
    const nameEl = $("#cp-user-name");
    if (nameEl) nameEl.textContent = session.displayName;

    const customer = UK_USERS.getCustomerById(session.customerId);
    const el = $("#cp-body"); if (!el || !customer) return;

    const bookings  = UK_USERS.getBookingsForCustomer(session.customerId);
    const upcoming  = bookings.filter(_isUpcomingBooking).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const history   = bookings.filter(b => ["completed", "cancelled", "rescheduled"].includes(b.status));
    const notifications = UK_USERS.getNotificationsForUser(session.customerId, "customer");
    const unread = UK_USERS.getUnreadNotificationCount(session.customerId, "customer");
    const next      = upcoming[0];
    const p         = customer.profile;
    const total     = 10;
    const pill = $("#cp-notif-pill");
    if (pill) {
      pill.hidden = !unread;
      pill.textContent = `${unread} unread`;
    }

    el.innerHTML = `
      <!-- Next appointment card -->
      ${next ? `
        <div class="cp-next-card">
          <div class="label">Next Appointment</div>
          <h3>${next.service}</h3>
          <div class="cp-next-when">
            <div><small>Date</small><b>${_fmtDate(next.date)}</b></div>
            <div><small>Time</small><b>${next.time}</b></div>
            <div><small>Barber</small><b>${next.barber ? next.barber.displayName : "—"}</b></div>
          </div>
          <div style="font-size:.82rem;color:var(--text-mute);margin-bottom:14px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="M12 22s7-7.2 7-12a7 7 0 10-14 0c0 4.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>
            Level 1, 123 Charlotte St — Brisbane City
          </div>
          <div class="cp-next-actions">
            <button class="btn btn-gold btn-sm" data-ripple>Confirm</button>
            <button class="btn btn-ghost btn-sm" data-ripple>Reschedule</button>
          </div>
        </div>` : `
        <div class="cp-next-card" style="text-align:center;padding:28px;">
          <div style="color:var(--text-mute);font-size:.9rem;">No upcoming appointments</div>
          <button class="btn btn-gold btn-sm" style="margin-top:14px;" data-ripple>Book Now</button>
        </div>`}

      <!-- King Pass -->
      <div class="pt-panel" style="margin-bottom:16px;">
        <div class="pt-panel-head"><h3>King Pass · Loyalty</h3></div>
        <div style="padding:16px;">
          <div style="font-size:.82rem;color:var(--text-mute);margin-bottom:12px;">${p.loyaltyStamps} of ${total} stamps · ${total - p.loyaltyStamps} to go for a free cut</div>
          <div class="cp-stamps">
            ${Array.from({ length: total }, (_, i) =>
              `<div class="cp-stamp ${i < p.loyaltyStamps ? "on" : ""}">${i < p.loyaltyStamps ? "★" : i + 1}</div>`
            ).join("")}
          </div>
        </div>
      </div>

      <!-- Upcoming bookings -->
      <div class="pt-panel" style="margin-bottom:16px;">
        <div class="pt-panel-head"><h3>Upcoming (${upcoming.length})</h3></div>
        ${upcoming.length
          ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Service</th><th>Barber</th><th>Date</th><th>Time</th><th>Details</th><th>Status</th></tr></thead><tbody>
              ${upcoming.map(b => `<tr>
                <td class="cell-main">${b.service}</td>
                <td class="dim">${b.barber ? b.barber.displayName : "—"}</td>
                <td class="dim">${_fmtDate(b.date)}</td>
                <td class="dim">${b.time}</td>
                <td class="dim">${b.duration} min · ${_escapeHTML(b.notes || "No notes")}</td>
                <td>${_statusBadge(b.status)}</td>
              </tr>`).join("")}
              </tbody></table></div>`
          : '<div class="pt-empty">No upcoming bookings</div>'}
      </div>

      <!-- Visit history -->
      <div class="pt-panel" style="margin-bottom:16px;">
        <div class="pt-panel-head"><h3>Visit History (${history.length})</h3></div>
        ${history.length
          ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Service</th><th>Barber</th><th>Date</th><th>Details</th><th>Status</th></tr></thead><tbody>
              ${history.map(b => `<tr>
                <td class="cell-main">${b.service}</td>
                <td class="dim">${b.barber ? b.barber.displayName : "—"}</td>
                <td class="dim">${_fmtDate(b.date)}</td>
                <td class="dim">${b.duration} min</td>
                <td>${_statusBadge(b.status)}</td>
              </tr>`).join("")}
              </tbody></table></div>`
          : '<div class="pt-empty">No visit history yet</div>'}
      </div>

      <!-- Profile -->
      <div class="pt-panel">
        <div class="pt-panel-head"><h3>My Profile</h3><button class="btn btn-ghost btn-sm" id="cp-edit-profile">Edit</button></div>
        <div class="profile-field-list">
          <div class="profile-field"><div class="pf-key">Name</div><div class="pf-val">${customer.name}</div></div>
          <div class="profile-field"><div class="pf-key">Email</div><div class="pf-val">${customer.email}</div></div>
          <div class="profile-field"><div class="pf-key">Phone</div><div class="pf-val">${customer.phone}</div></div>
          <div class="profile-field"><div class="pf-key">Membership</div><div class="pf-val gold">${p.memberTier}</div></div>
          <div class="profile-field"><div class="pf-key">Total visits</div><div class="pf-val">${p.totalVisits}</div></div>
          <div class="profile-field"><div class="pf-key">Member since</div><div class="pf-val">${_fmtDate(customer.createdAt)}</div></div>
        </div>
        <form class="portal-form compact-form profile-edit-form" id="cp-profile-form" hidden>
          <div class="form-grid two">
            <label>Name <input id="cp-edit-name" type="text" value="${_escapeHTML(customer.name)}" /></label>
            <label>Email <input id="cp-edit-email" type="email" value="${_escapeHTML(customer.email)}" /></label>
            <label>Phone <input id="cp-edit-phone" type="tel" value="${_escapeHTML(customer.phone)}" /></label>
          </div>
          <div class="form-feedback" id="cp-profile-feedback"></div>
          <button class="btn btn-gold btn-sm" type="submit">Save Profile</button>
        </form>
      </div>

      <div class="pt-panel" style="margin-top:16px;">
        <div class="pt-panel-head">
          <h3>Notifications</h3>
          <button class="btn btn-ghost btn-sm" id="cp-mark-read" ${unread ? "" : "disabled"}>Mark All Read</button>
        </div>
        ${_renderNotificationList(notifications, session.customerId)}
      </div>`;

    const markRead = $("#cp-mark-read");
    if (markRead) markRead.onclick = () => {
      UK_USERS.markAllNotificationsRead(session.customerId, "customer");
      renderCustomerPortal(session);
    };
    el.querySelectorAll("[data-notification-id]").forEach(card => {
      card.addEventListener("click", () => {
        UK_USERS.markNotificationRead(card.dataset.notificationId, session.customerId);
        renderCustomerPortal(session);
      });
    });
    $("#cp-edit-profile")?.addEventListener("click", () => {
      const form = $("#cp-profile-form");
      if (form) form.hidden = !form.hidden;
    });
    $("#cp-profile-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const result = UK_USERS.updateCustomerUser(session.customerId, {
        name: $("#cp-edit-name").value.trim(),
        email: $("#cp-edit-email").value.trim(),
        phone: $("#cp-edit-phone").value.trim(),
      });
      if (!result.ok) {
        $("#cp-profile-feedback").textContent = result.error;
        $("#cp-profile-feedback").className = "form-feedback error";
        return;
      }
      renderCustomerPortal(session);
    });
  }

  /* =====================================================
     RENDER — REGISTER / CHECKOUT / PAYMENT STATUS
     ===================================================== */
  function renderRegister() {
    bindRouteLinks($("#view-register") || document);
    const form = $("#register-form");
    if (!form || form.dataset.bound === "1") return;
    form.dataset.bound = "1";
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const error = $("#register-error");
      const success = $("#register-success");
      if (error) error.textContent = "";
      if (success) success.textContent = "";
      const result = UK_USERS.registerCustomer({
        name: $("#register-name").value.trim(),
        email: $("#register-email").value.trim(),
        phone: $("#register-phone").value.trim(),
        password: $("#register-password").value,
        confirmPassword: $("#register-confirm").value,
      });
      if (!result.ok) {
        if (error) error.textContent = result.error;
        return;
      }
      const login = await Auth.login(result.customer.email, $("#register-password").value, "customer");
      if (!login.ok) {
        if (success) success.textContent = "Account created. Please sign in.";
        goToRoute("/customer/login");
        return;
      }
      if (success) success.textContent = "Account created.";
      Views.inited["customer-portal"] = false;
      updateNavAuthState();
      goToRoute("/customer/dashboard");
    });
  }

  function renderCheckout() {
    const el = $("#checkout-body"); if (!el) return;
    const checkout = _getCheckoutContext();
    if (!checkout) {
      el.innerHTML = `
        <div class="status-icon muted">!</div>
        <h1>No checkout found</h1>
        <p class="panel-copy">Start a new booking to create a checkout session.</p>
        <button class="btn btn-gold" data-route-link="/book">Book Now</button>`;
      bindRouteLinks(el);
      return;
    }
    const { booking, payment } = checkout;
    el.innerHTML = `
      <div class="route-card-head">
        <button class="mini-action" data-route-link="/book">Back</button>
        <div><div class="eyebrow mini">Checkout</div><h1>Confirm payment</h1></div>
      </div>
      <div class="checkout-summary">
        <div class="summary-line"><span>Booking</span><b>${booking.id}</b></div>
        <div class="summary-line"><span>Service</span><b>${_escapeHTML(booking.service)}</b></div>
        <div class="summary-line"><span>Barber</span><b>${booking.barber ? _escapeHTML(booking.barber.displayName) : "Any available"}</b></div>
        <div class="summary-line"><span>Date</span><b>${_fmtDate(booking.date)} · ${booking.time}</b></div>
        <div class="summary-line"><span>Customer</span><b>${booking.customer ? _escapeHTML(booking.customer.name) : _escapeHTML((booking.guest || {}).name || "Guest")}</b></div>
        <div class="summary-line"><span>Status</span><b>${_statusBadge(payment.status)}</b></div>
        <div class="summary-total"><span>Total</span><b>${_money(payment.amount)}</b></div>
      </div>
      <div class="payment-actions">
        <button class="btn btn-gold" id="mock-pay-now" data-ripple>Pay Demo</button>
        <button class="btn btn-ghost" id="mock-cancel-payment">Cancel</button>
      </div>
      <p class="panel-copy">Payment provider is mocked. This can be swapped for Square, Stripe or another checkout API without changing the booking model.</p>`;
    bindRouteLinks(el);
    $("#mock-pay-now")?.addEventListener("click", () => {
      UK_USERS.updatePaymentStatus(payment.id, "paid");
      goToRoute("/payment-success");
    });
    $("#mock-cancel-payment")?.addEventListener("click", () => {
      UK_USERS.updatePaymentStatus(payment.id, "cancelled");
      goToRoute("/payment-cancelled");
    });
  }

  function renderPaymentSuccess() {
    const el = $("#payment-success-body"); if (!el) return;
    const checkout = _getCheckoutContext();
    const booking = checkout ? checkout.booking : null;
    el.innerHTML = `
      <div class="status-icon success">✓</div>
      <h1>Payment completed</h1>
      <p class="panel-copy">${booking ? `Booking ${booking.id} is confirmed for ${_fmtDate(booking.date)} at ${booking.time}.` : "Your payment was completed."}</p>
      <div class="payment-actions">
        <button class="btn btn-gold" data-route-link="/customer/dashboard">Customer Portal</button>
        <button class="btn btn-ghost" data-route-link="/">Home</button>
      </div>`;
    bindRouteLinks(el);
  }

  function renderPaymentCancelled() {
    const el = $("#payment-cancelled-body"); if (!el) return;
    el.innerHTML = `
      <div class="status-icon muted">×</div>
      <h1>Payment cancelled</h1>
      <p class="panel-copy">The booking is still pending. You can return to checkout or start again.</p>
      <div class="payment-actions">
        <button class="btn btn-gold" data-route-link="/checkout">Return to Checkout</button>
        <button class="btn btn-ghost" data-route-link="/book">New Booking</button>
      </div>`;
    bindRouteLinks(el);
  }

  function _getCheckoutContext() {
    let raw = "";
    try { raw = sessionStorage.getItem("uk_checkout") || ""; } catch { raw = ""; }
    if (!raw) return null;
    try {
      const ids = JSON.parse(raw);
      const booking = UK_USERS.getAllBookings().find(b => b.id === ids.bookingId);
      const payment = UK_USERS.getAllPayments().find(p => p.id === ids.paymentId);
      if (!booking || !payment) return null;
      return { booking, payment };
    } catch {
      return null;
    }
  }

  /* =====================================================
     LOGIN — role tab + hint management
     ===================================================== */
  function _setAuthRole(role) {
    _authRole = role;
    $$("[data-auth-role]").forEach(b => b.classList.toggle("is-active", b.dataset.authRole === role));
    const label = $("#auth-portal-label");
    if (label) label.textContent = PORTAL_LABELS[role] || "Customer Portal";
    _updateLoginHints(role);
    // Clear error and fields when switching role
    const errEl = $("#auth-error");
    if (errEl) errEl.textContent = "";
    const successEl = $("#auth-success");
    if (successEl) successEl.textContent = "";
  }

  function _updateLoginHints(role) {
    const creds = UK_USERS.demoCredentials[role];
    const hintBody = $("#auth-hint-body");
    if (!hintBody || !creds) return;
    hintBody.innerHTML = `
      <span><b>Email/username:</b> ${creds.username}</span>
      <span><b>Password:</b> ${creds.password}</span>
      <button class="fill-btn" id="hint-fill-btn">Autofill →</button>`;
    const fillBtn = $("#hint-fill-btn");
    if (fillBtn) fillBtn.addEventListener("click", () => {
      const u = $("#auth-username"), p = $("#auth-password");
      if (u) u.value = creds.username;
      if (p) p.value = creds.password;
    });
  }

  /* =====================================================
     NAV AUTH STATE (shows/hides Sign In vs. user chip)
     ===================================================== */
  function updateNavAuthState() {
    const session    = Auth.getSession();
    const signinBtn  = $("#nav-signin");
    const userChip   = $("#nav-user");
    const userAv     = $("#nav-user-av");
    const userNameEl = $("#nav-user-name");

    if (session) {
      if (signinBtn)  signinBtn.style.display = "none";
      if (userChip)   userChip.classList.add("is-visible");
      if (userAv)     userAv.textContent = session.avatar;
      if (userNameEl) userNameEl.textContent = session.displayName;
    } else {
      if (signinBtn)  signinBtn.style.display = "";
      if (userChip)   userChip.classList.remove("is-visible");
    }
  }

  /* =====================================================
     ANIMATIONS
     ===================================================== */
  function batchReveal(selector) {
    if (!ST) { gsap.set(selector, { opacity: 1, y: 0 }); return; }
    ST.batch(selector, {
      start: "top 88%",
      onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 0.85, ease: "power3.out", stagger: 0.08, overwrite: true }),
    });
  }

  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const dec    = parseInt(el.dataset.decimals || "0", 10);
    const suffix = el.dataset.suffix || "";
    const prefix = el.dataset.prefix || "";
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target, duration: 1.7, ease: "power2.out",
      scrollTrigger: ST ? { trigger: el, start: "top 92%", once: true } : null,
      onUpdate: () => { el.textContent = prefix + obj.v.toLocaleString("en-AU", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix; },
    });
  }

  function setCountFinal(el) {
    const dec = parseInt(el.dataset.decimals || "0", 10);
    el.textContent = (el.dataset.prefix || "") + parseFloat(el.dataset.count).toLocaleString("en-AU", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (el.dataset.suffix || "");
  }

  function animateLanding() {
    if (REDUCED) {
      gsap.set(".view-landing .reveal", { opacity: 1, y: 0 });
      $$(".view-landing [data-count]").forEach(setCountFinal);
      return;
    }
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".hero-logo",      { y: 34, opacity: 0, scale: 0.9, duration: 1 })
      .from(".hero .eyebrow",  { y: 14, opacity: 0, duration: 0.6 }, "-=0.5")
      .from(".hero h1",        { y: 30, opacity: 0, duration: 0.95 }, "-=0.35")
      .from(".hero .tagline",  { y: 18, opacity: 0, duration: 0.7 }, "-=0.55")
      .from(".hero .subtitle", { y: 18, opacity: 0, duration: 0.6 }, "-=0.5")
      .from(".hero-ctas .btn", { y: 18, opacity: 0, duration: 0.55, stagger: 0.1 }, "-=0.3")
      .from(".hero-location",  { y: 14, opacity: 0, duration: 0.5 }, "-=0.3")
      .from(".scroll-hint",    { opacity: 0, duration: 0.6 }, "-=0.1");

    gsap.fromTo("#heroBg", { scale: 1.18 }, { scale: 1.04, duration: 2.4, ease: "power2.out" });
    if (ST) {
      gsap.to("#heroBg", { yPercent: 16, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 1 } });
      gsap.to("#aboutImg", { yPercent: -8, ease: "none", scrollTrigger: { trigger: "#about", start: "top bottom", end: "bottom top", scrub: 1 } });
    }
    batchReveal(".view-landing .reveal");
    $$(".view-landing [data-count]").forEach(countUp);
    const mq = $(".marquee-track");
    if (mq) gsap.to(mq, { xPercent: -50, ease: "none", duration: 40, repeat: -1 });
    const tt = $("#testi-track");
    if (tt) gsap.to(tt, { xPercent: -50, ease: "none", duration: 60, repeat: -1 });
  }

  function animateBooking() {
    if (REDUCED) { gsap.set(".view-booking .reveal", { opacity: 1, y: 0 }); return; }
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .from(".view-booking .greeting",  { y: 14, opacity: 0, duration: 0.55 })
      .from(".view-booking .next-card", { y: 22, opacity: 0, duration: 0.7 }, "-=0.3")
      .from(".view-booking .quick a",   { y: 14, opacity: 0, duration: 0.45, stagger: 0.06 }, "-=0.35");
    batchReveal(".view-booking .reveal");
  }

  function animateAdmin() {
    if (REDUCED) {
      gsap.set(".view-admin .reveal", { opacity: 1, y: 0 });
      $$(".view-admin [data-count]").forEach(el => { el.textContent = (el.dataset.prefix||"") + Math.round(parseFloat(el.dataset.count)).toLocaleString("en-AU") + (el.dataset.suffix||""); });
      return;
    }
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .from(".view-admin .admin-top", { y: 14, opacity: 0, duration: 0.55 })
      .from(".view-admin .kpi",       { y: 18, opacity: 0, duration: 0.5, stagger: 0.06 }, "-=0.25");
    $$(".view-admin [data-count]").forEach(countUp);
    batchReveal(".view-admin .reveal");
    const line = $("#chart-line");
    if (line) {
      const len = line.getTotalLength();
      gsap.fromTo(line, { strokeDasharray: len, strokeDashoffset: len },
        { strokeDashoffset: 0, duration: 2, ease: "power2.out",
          scrollTrigger: ST ? { trigger: line, start: "top 92%", once: true } : null });
    }
  }

  function animateLogin() {
    if (REDUCED || !gsap) return;
    gsap.from(".auth-card", { y: 30, opacity: 0, duration: 0.7, ease: "power3.out" });
    gsap.from(".auth-bg-lion img", { scale: 0.92, opacity: 0, duration: 1.2, ease: "power2.out" });
  }

  function animatePortal() {
    if (REDUCED || !gsap) return;
    gsap.from(".portal-header", { y: -10, opacity: 0, duration: 0.4, ease: "power2.out" });
    gsap.from(".portal-body", { opacity: 0, duration: 0.45, ease: "power2.out", delay: 0.1 });
  }

  /* =====================================================
     PRELOADER (chrome lion timeline)
     ===================================================== */
  function runPreloader(done) {
    const pre = $("#preloader");
    if (!pre) { done(); return; }
    if (REDUCED) { gsap.set(pre, { display: "none" }); done(); return; }

    const tl = gsap.timeline({ onComplete: () => { pre.classList.add("is-done"); gsap.set(pre, { display: "none" }); } });
    tl.set(pre, { autoAlpha: 1 })
      .fromTo(".pre-lion",
        { scale: 0.82, opacity: 0, rotation: -6, clipPath: "inset(0 0 100% 0)" },
        { scale: 1, opacity: 1, rotation: 0, clipPath: "inset(0 0 0% 0)", duration: 1.05, ease: "power3.out" })
      .to(".pre-glow",    { opacity: 1, scale: 1.1, duration: 0.7, ease: "power2.out" }, "-=0.65")
      .to(".pre-shimmer", { xPercent: 240, duration: 0.9, ease: "power2.inOut" }, "-=0.45")
      .to(".pre-word",    { opacity: 1, y: 0, duration: 0.5 }, "-=0.5")
      .to(".pre-bar i",   { width: "100%", duration: 0.8, ease: "power1.inOut" }, "-=0.5")
      .add(done, "-=0.1")
      .to(".pre-stage", { scale: 1.08, opacity: 0, duration: 0.5, ease: "power2.in" }, "+=0.1")
      .to(pre, { autoAlpha: 0, duration: 0.5, ease: "power2.inOut" }, "-=0.3");

    setTimeout(() => { if (!pre.classList.contains("is-done")) { tl.progress(1); } }, 4500);
  }

  /* =====================================================
     VIEW TRANSITION (lion flash)
     ===================================================== */
  function flashTransition(swap) {
    if (REDUCED) { swap(); return; }
    const ov    = $("#viewTransition");
    const lion  = $(".vt-lion");
    const sweep = $(".vt-sweep");
    gsap.timeline()
      .set(ov, { pointerEvents: "auto" })
      .to(ov, { opacity: 1, duration: 0.26, ease: "power2.in" })
      .add(swap)
      .fromTo(lion, { opacity: 0, scale: 0.7, rotation: -8 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.4, ease: "back.out(1.6)" }, "<")
      .fromTo(sweep, { xPercent: -120 }, { xPercent: 120, duration: 0.6, ease: "power2.inOut" }, "<")
      .to(lion, { opacity: 0, scale: 1.12, duration: 0.3, ease: "power2.in" }, "+=0.05")
      .to(ov, { opacity: 0, duration: 0.34, ease: "power2.out" }, "<")
      .set(ov, { pointerEvents: "none" });
  }

  /* =====================================================
     VIEW CONTROLLER
     ===================================================== */
  const Views = {
    current: null,
    inited: {
      landing: false, booking: false, admin: false,
      login: false, register: false, checkout: false,
      "payment-success": false, "payment-cancelled": false,
      "admin-portal": false, "barber-portal": false, "customer-portal": false,
    },
    _pendingRole: null,  // role pre-selected when navigating to login
    _pendingTab: null,
    _pendingScroll: null,

    show(name, withFlash = true) {
      const valid = ["landing", "booking", "admin", "login", "register", "checkout", "payment-success", "payment-cancelled", "admin-portal", "barber-portal", "customer-portal"];
      if (!valid.includes(name)) name = "landing";
      if (name === this.current) return;

      // Auth guards — route signed-in users back to their own portal.
      const activeSession = Auth.getSession();
      if (name.endsWith("-portal") && activeSession && name !== `${activeSession.role}-portal`) {
        const ownPath = VIEW_PATHS[`${activeSession.role}-portal`];
        if (ownPath) history.replaceState({ path: ownPath }, "", ownPath);
        this.show(`${activeSession.role}-portal`, withFlash);
        return;
      }

      // Auth guards — redirect signed-out protected requests to role login.
      if (name === "admin-portal" && !Auth.requireRole("admin")) {
        this._pendingRole = "admin";
        this.show("login", withFlash);
        return;
      }
      if (name === "barber-portal" && !Auth.requireRole("barber")) {
        this._pendingRole = "barber";
        this.show("login", withFlash);
        return;
      }
      if (name === "customer-portal" && !Auth.requireRole("customer")) {
        this._pendingRole = "customer";
        this.show("login", withFlash);
        return;
      }

      const swap = () => {
        if (ST) ST.getAll().forEach(s => s.kill());
        document.body.dataset.view = name;
        this.current = name;

        // Nav tab active highlight (demo views only)
        $$(".view-tabs button").forEach(b => b.classList.toggle("is-active", b.dataset.viewLink === name));

        if (!this.inited[name]) {
          const session = Auth.getSession();
          if (name === "landing") renderLanding();
          if (name === "booking") renderBooking();
          if (name === "admin")   renderAdmin();
          if (name === "register") renderRegister();
          if (name === "checkout") renderCheckout();
          if (name === "payment-success") renderPaymentSuccess();
          if (name === "payment-cancelled") renderPaymentCancelled();
          if (name === "login") {
            const role = this._pendingRole || "customer";
            this._pendingRole = null;
            _setAuthRole(role);
            _updateLoginHints(role);
            const selector = $("#auth-roles");
            const logo = $("#auth-logo-switch");
            if (selector) selector.hidden = true;
            if (logo) logo.setAttribute("aria-expanded", "false");
          }
          if (name === "admin-portal"    && session) renderAdminPortal(session);
          if (name === "barber-portal"   && session) renderBarberPortal(session);
          if (name === "customer-portal" && session) renderCustomerPortal(session);
          this.inited[name] = true;
        } else if (name === "admin") {
          renderChart();
        } else if (["booking", "register", "checkout", "payment-success", "payment-cancelled"].includes(name)) {
          if (name === "booking") renderBooking();
          if (name === "register") renderRegister();
          if (name === "checkout") renderCheckout();
          if (name === "payment-success") renderPaymentSuccess();
          if (name === "payment-cancelled") renderPaymentCancelled();
        }

        const sectionEl = document.querySelector(`.view-${name}`);
        const revealEls = sectionEl ? sectionEl.querySelectorAll(".reveal") : [];
        if (revealEls.length && gsap && !REDUCED) gsap.set(revealEls, { opacity: 0, y: 28 });

        window.scrollTo({ top: 0, behavior: "instant" });

        requestAnimationFrame(() => {
          if (name === "landing") animateLanding();
          else if (name === "booking") animateBooking();
          else if (name === "admin")   animateAdmin();
          else if (name === "login")   animateLogin();
          else animatePortal();
          if (ST) ST.refresh();
          _activatePendingTab();
          if (this._pendingScroll) {
            const target = document.querySelector(this._pendingScroll);
            if (target) target.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
            this._pendingScroll = null;
          }
        });

        updateNavAuthState();
      };

      if (withFlash && this.current !== null) flashTransition(swap);
      else swap();
    },
  };

  function routeForPath(pathname = location.pathname) {
    const clean = pathname.replace(/\/+$/, "") || "/";
    return ROUTES[clean] || null;
  }

  function goToRoute(path, withFlash = true) {
    const route = ROUTES[path] || ROUTES["/"];
    history.pushState({ path }, "", path);
    applyRoute(route, withFlash);
  }

  function applyRoute(route, withFlash = true) {
    if (!route) {
      Views.show("landing", withFlash);
      return;
    }
    if (route.role) Views._pendingRole = route.role;
    if (route.tab) Views._pendingTab = route.tab;
    if (route.scrollTo) Views._pendingScroll = route.scrollTo;
    Views.show(route.view, withFlash);
  }

  function bindRouteLinks(scope = document) {
    scope.querySelectorAll("[data-route-link]").forEach(el => {
      if (el.dataset.routeBound === "1") return;
      el.dataset.routeBound = "1";
      el.addEventListener("click", (e) => {
        e.preventDefault();
        goToRoute(el.dataset.routeLink);
      });
    });
  }

  function _activatePendingTab() {
    if (!Views._pendingTab) return;
    const tab = Views._pendingTab;
    Views._pendingTab = null;
    const btn = document.querySelector(`[data-ptab="${tab}"]`);
    if (btn) setTimeout(() => btn.click(), 0);
  }

  /* =====================================================
     MICROINTERACTIONS
     ===================================================== */
  function bindRipples() {
    document.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest("[data-ripple]");
      if (!btn || REDUCED) return;
      const r    = document.createElement("span");
      r.className = "ripple";
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.4;
      r.style.width = r.style.height = size + "px";
      r.style.left  = (e.clientX - rect.left) + "px";
      r.style.top   = (e.clientY - rect.top) + "px";
      btn.appendChild(r);
      gsap.fromTo(r, { scale: 0, opacity: 0.7 }, { scale: 1, opacity: 0, duration: 0.6, ease: "power2.out", onComplete: () => r.remove() });
    }, { passive: true });
  }

  function bindCursor() {
    if (!FINE_POINTER || REDUCED) return;
    const ring = $("#cursorRing"), dot = $("#cursorDot");
    if (!ring || !dot) return;
    const rx = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3" });
    const ry = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3" });
    const dx = gsap.quickTo(dot,  "x", { duration: 0.12, ease: "power3" });
    const dy = gsap.quickTo(dot,  "y", { duration: 0.12, ease: "power3" });
    window.addEventListener("pointermove", (e) => { rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY); }, { passive: true });
    document.addEventListener("pointerover", (e) => {
      const hot = e.target.closest("a, button, [data-ripple], .gallery-item, .service, .benefit, .view-tabs button");
      ring.classList.toggle("is-hot", !!hot);
    });
  }

  function bindNav() {
    const nav = $("#topnav");
    if (nav) {
      const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    $$("[data-view-link]").forEach(el => el.addEventListener("click", (e) => {
      e.preventDefault();
      const mark = el.querySelector("img");
      if (mark && !REDUCED) gsap.fromTo(mark, { scale: 0.8 }, { scale: 1, duration: 0.5, ease: "back.out(2)" });
      if (el.id === "nav-signin") Views._pendingRole = "customer";
      const name = el.dataset.viewLink;
      if (VIEW_PATHS[name]) goToRoute(VIEW_PATHS[name]);
      else Views.show(name);
    }));

    bindRouteLinks(document);

    $$("[data-scroll-to]").forEach(el => el.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(el.dataset.scrollTo);
      if (target) target.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
    }));

    $$(".bottom-nav [data-section]").forEach(btn => btn.addEventListener("click", (e) => {
      e.preventDefault();
      const view = btn.closest("[class*=view-]");
      if (!view) return;
      view.querySelectorAll(".bottom-nav .is-active").forEach(x => x.classList.remove("is-active"));
      btn.classList.add("is-active");
      const target = view.querySelector(btn.dataset.section);
      if (target) target.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
    }));

    $$(".admin-top .controls button").forEach(b => b.addEventListener("click", () => {
      $$(".admin-top .controls button").forEach(x => x.classList.remove("is-active"));
      b.classList.add("is-active");
    }));

    // User chip in topnav → navigate to your portal
    const userChip = $("#nav-user");
    if (userChip) userChip.addEventListener("click", () => {
      const s = Auth.getSession();
      if (!s) { Views.show("login"); return; }
      if (s.role === "admin")    Views.show("admin-portal");
      if (s.role === "barber")   Views.show("barber-portal");
      if (s.role === "customer") Views.show("customer-portal");
    });
  }

  /* =====================================================
     AUTH EVENT BINDING
     ===================================================== */
  function bindAuth() {
    const logoSwitch = $("#auth-logo-switch");
    const rolesPanel = $("#auth-roles");
    if (logoSwitch && rolesPanel) {
      logoSwitch.addEventListener("click", () => {
        rolesPanel.hidden = !rolesPanel.hidden;
        logoSwitch.setAttribute("aria-expanded", rolesPanel.hidden ? "false" : "true");
      });
    }

    // Role tab switching
    $$("[data-auth-role]").forEach(btn => btn.addEventListener("click", () => {
      _setAuthRole(btn.dataset.authRole);
      if (rolesPanel) rolesPanel.hidden = true;
      if (logoSwitch) logoSwitch.setAttribute("aria-expanded", "false");
    }));

    // Password toggle
    const pwToggle = $("#pw-toggle");
    if (pwToggle) pwToggle.addEventListener("click", () => {
      const input = $("#auth-password");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    });

    // Back to site button
    const backBtn = $("#auth-back");
    if (backBtn) backBtn.addEventListener("click", () => goToRoute("/"));

    // Logout buttons
    const apLogout = $("#ap-logout");
    const bpLogout = $("#bp-logout");
    const cpLogout = $("#cp-logout");

    function doLogout() {
      Auth.logout();
      _authRole = "customer";
      // Reset portal inited so they re-render fresh on next login
      Views.inited["admin-portal"]    = false;
      Views.inited["barber-portal"]   = false;
      Views.inited["customer-portal"] = false;
      updateNavAuthState();
      goToRoute("/");
    }

    if (apLogout) apLogout.addEventListener("click", doLogout);
    if (bpLogout) bpLogout.addEventListener("click", doLogout);
    if (cpLogout) cpLogout.addEventListener("click", doLogout);

    // Login form submit
    const form   = $("#auth-form");
    const errEl  = $("#auth-error");
    const successEl = $("#auth-success");
    const submit = $("#auth-submit");
    const label  = $("#auth-submit-label");
    const spinner = $("#auth-spinner");

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = ($("#auth-username") || {}).value || "";
        const password = ($("#auth-password") || {}).value || "";
        if (!username || !password) {
          if (errEl) errEl.textContent = "Please enter username and password.";
          if (successEl) successEl.textContent = "";
          return;
        }
        if (errEl) errEl.textContent = "";
        if (successEl) successEl.textContent = "";
        if (submit) submit.classList.add("is-loading");
        if (label)  label.textContent = "Signing in…";

        const result = await Auth.login(username, password, _authRole);

        if (submit) submit.classList.remove("is-loading");
        if (label)  label.textContent = "Sign In";

        if (!result.ok) {
          if (errEl) errEl.textContent = result.error;
          // Shake the card
          if (gsap && !REDUCED) gsap.fromTo(".auth-card", { x: -8 }, { x: 0, duration: 0.4, ease: "elastic.out(3,0.4)" });
          return;
        }

        // Success — route to portal
        const role = result.session.role;
        if (successEl) successEl.textContent = `Welcome to ${PORTAL_LABELS[role] || "your portal"}.`;
        Views.inited[`${role}-portal`] = false; // force fresh render
        updateNavAuthState();
        goToRoute(VIEW_PATHS[`${role}-portal`] || "/");
      });
    }
  }

  /* =====================================================
     BOOT
     ===================================================== */
  function bootStatic() {
    renderLanding();
    const pre = document.getElementById("preloader");
    if (pre) pre.style.display = "none";
    document.querySelectorAll(".reveal").forEach(el => { el.style.opacity = 1; el.style.transform = "none"; });
    document.querySelectorAll(".view-landing [data-count]").forEach(setCountFinal);
    document.querySelectorAll("[data-view-link]").forEach(el => el.addEventListener("click", (e) => {
      e.preventDefault();
      const name = el.dataset.viewLink;
      const valid = ["landing","booking","admin","login","register","checkout","payment-success","payment-cancelled","admin-portal","barber-portal","customer-portal"];
      if (!valid.includes(name)) return;
      if (el.id === "nav-signin") _setAuthRole("customer");

      // Auth guards for static boot
      if ((name.endsWith("-portal"))) {
        const active = Auth.getSession();
        if (active && name !== `${active.role}-portal`) {
          document.body.dataset.view = `${active.role}-portal`;
          if (active.role === "admin") renderAdminPortal(active);
          if (active.role === "barber") renderBarberPortal(active);
          if (active.role === "customer") renderCustomerPortal(active);
          updateNavAuthState();
          return;
        }
        const role = name.replace("-portal","");
        if (!Auth.requireRole(role)) { document.body.dataset.view = "login"; _setAuthRole(role); _updateLoginHints(role); return; }
      }

      document.body.dataset.view = name;
      const session = Auth.getSession();
      if (name === "booking") renderBooking();
      if (name === "admin")   { renderAdmin(); document.querySelectorAll(".view-admin [data-count]").forEach(setCountFinal); }
      if (name === "register") renderRegister();
      if (name === "checkout") renderCheckout();
      if (name === "payment-success") renderPaymentSuccess();
      if (name === "payment-cancelled") renderPaymentCancelled();
      if (name === "admin-portal"    && session) renderAdminPortal(session);
      if (name === "barber-portal"   && session) renderBarberPortal(session);
      if (name === "customer-portal" && session) renderCustomerPortal(session);
      document.querySelectorAll(`.view-${name} .reveal`).forEach(x => { x.style.opacity = 1; x.style.transform = "none"; });
      document.querySelectorAll(".view-tabs button").forEach(b => b.classList.toggle("is-active", b.dataset.viewLink === name));
      window.scrollTo({ top: 0 });
      updateNavAuthState();
    }));
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!gsap) {
      bootStatic();
      bindAuth();
      updateNavAuthState();
      return;
    }

    bindNav();
    bindRipples();
    bindCursor();
    bindAuth();
    updateNavAuthState();
    window.addEventListener("popstate", () => applyRoute(routeForPath(location.pathname), false));

    // If there's an active session resume their portal directly (skip landing)
    const existingSession = Auth.getSession();
    const initialRoute = routeForPath(location.pathname);

    runPreloader(() => {
      Views.current = null;
      if (initialRoute) {
        applyRoute(initialRoute, false);
      } else if (existingSession) {
        const role = existingSession.role;
        goToRoute(VIEW_PATHS[`${role}-portal`] || "/", false);
      } else {
        applyRoute(ROUTES["/"], false);
      }
    });
  });

  window.UrbanKings = { Views, Auth };
})();
