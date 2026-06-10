/* ============================================================
   Urban Kings — Public content shared across the site
   Operational records are loaded through the server API.
   ============================================================ */
window.UK = window.UK || {};

UK.brand = {
  name: "Urban Kings",
  tagline: "Strong like kings, wild as lions",
  description: "The Latin Barber Kingdom in Brisbane City.",
  address: "Level 1 / 123 Charlotte St, Brisbane City — Latin Hub",
  phone: "+61 4XX XXX XXX",
  ig: "@urbankings.brisbane",
};

UK.services = [
  {
    id: "classic",
    name: "Classic Kings",
    price: 35,
    blurb: "Latin fade clásico, lavado y acabado a tijera.",
    features: ["Wash & towel", "Latin fade", "Scissor finish"],
    featured: false,
  },
  {
    id: "top",
    name: "Top Kings",
    price: 40,
    blurb: "Skin fade premium con detalle de shaver.",
    features: ["Skin fade", "Shaver detail", "Style & wax"],
    featured: true,
  },
  {
    id: "king",
    name: "Kings of Kings",
    price: 55,
    blurb: "Corte + barba + experiencia completa.",
    features: ["Classic or skin fade", "Beard trim", "Hot towel"],
    featured: false,
  },
  {
    id: "facial",
    name: "Kings Facial",
    price: 10,
    blurb: "Facial premium add-on para piel fresca.",
    features: ["Deep cleanse", "Cold towel", "+10 add-on"],
    featured: false,
  },
];

UK.benefits = [
  {
    title: "Latin Top Barbers",
    body: "Fades detallados, líneas limpias y reputación latina de excelencia.",
    icon: "crown",
  },
  {
    title: "Multilingüe",
    body: "English, Español y Português. Aquí te entendemos.",
    icon: "globe",
  },
  {
    title: "Vibras Premium",
    body: "Música, ambiente y servicio. Sal renovado y con presencia.",
    icon: "vibe",
  },
  {
    title: "Mi casa, tu casa",
    body: "Comunidad latina en el corazón de Brisbane City.",
    icon: "home",
  },
];

UK.steps = [
  { title: "Reserva tu silla", body: "Elige servicio, barbero y hora desde el celular en segundos." },
  { title: "Llega y siéntete king", body: "Te recibimos con música, buena vibra y atención en tu idioma." },
  { title: "Sal renovado", body: "Fade limpio, beard on point y confianza pa' la calle." },
];

UK.stats = [
  { value: 12480, label: "Cortes realizados", suffix: "+" },
  { value: 4.9,   label: "Rating promedio", suffix: "★", decimals: 1 },
  { value: 860,   label: "Clientes activos", suffix: "+" },
  { value: 3,     label: "Años en Brisbane", suffix: "" },
];

UK.testimonials = [
  { name: "Javier R.",   role: "Cliente VIP",      stars: 5, body: "El mejor fade que me han hecho en Australia. Ambiente top y se sienten como familia." },
  { name: "Lucas M.",    role: "Estudiante",       stars: 5, body: "Hablan español, descuento de estudiante y la barba quedó perfecta. Volveré seguro." },
  { name: "Diego A.",    role: "Cliente regular",  stars: 5, body: "Música, vibras y un corte premium. Urban Kings es el único spot en Brisbane CBD." },
  { name: "Felipe N.",   role: "Local",            stars: 5, body: "Profesionales y rápidos. El skin fade me lo dejaron impecable." },
  { name: "Andrés V.",   role: "Cliente nuevo",    stars: 5, body: "Llegué sin reserva y me atendieron en 10 min. Calidad de barbería king." },
  { name: "Camilo P.",   role: "Estudiante PT",    stars: 5, body: "Falo português e me entenderam de boa. Corte top, recomendado." },
];

/* Gallery / atmosphere — drop real images into assets/ and set `img` */
UK.gallery = [
  { img: "assets/shop-interior.png", cap: "The Kingdom", tall: true },
  { img: "",                          cap: "Skin fade detail" },
  { img: "",                          cap: "Beard sculpt" },
  { img: "",                          cap: "Hot towel ritual" },
  { img: "",                          cap: "Chrome & gold" },
  { img: "",                          cap: "Night vibes", tall: true },
  { img: "",                          cap: "Line up" },
  { img: "",                          cap: "King finish" },
];

UK.faq = [
  { q: "¿Necesito reserva?", a: "Recomendado, sobre todo viernes y sábados. También aceptamos walk-ins." },
  { q: "¿Hablan español?",   a: "Sí, también inglés y portugués." },
  { q: "¿Aceptan card?",     a: "Sí, EFTPOS, tarjeta y Apple Pay." },
];

/* ===================== Public customer sample content ===================== */
UK.client = {
  id: "uk-04812",
  name: "Mateo Hernández",
  initials: "MH",
  email: "mateo@example.com",
  phone: "+61 412 555 309",
  joined: "2024-08-12",
  member: "King Member",
  loyaltyStamps: 7, // out of 10
  nextAppointment: {
    service: "Top Kings — Skin Fade",
    barber: "Carlos",
    date: "2026-05-22",
    time: "17:30",
    location: "Level 1, 123 Charlotte St",
  },
  history: [
    { date: "2026-05-04", service: "Top Kings", barber: "Carlos",  price: 40, status: "Completado" },
    { date: "2026-04-18", service: "Kings of Kings", barber: "Andrés", price: 55, status: "Completado" },
    { date: "2026-04-02", service: "Classic Kings", barber: "Carlos", price: 35, status: "Completado" },
    { date: "2026-03-18", service: "Top Kings + Facial", barber: "Lucas", price: 50, status: "Completado" },
    { date: "2026-03-02", service: "Top Kings", barber: "Carlos", price: 40, status: "Completado" },
  ],
  payments: [
    { date: "2026-05-04", amount: 40, method: "Apple Pay", status: "Pagado" },
    { date: "2026-04-18", amount: 55, method: "Visa •• 4421", status: "Pagado" },
    { date: "2026-04-02", amount: 35, method: "EFTPOS", status: "Pagado" },
  ],
  notifications: [
    { type: "reminder", title: "Tu cita es mañana", body: "Top Kings con Carlos · 17:30", time: "hace 2 h" },
    { type: "promo",    title: "Kings Facial al 50%", body: "Solo esta semana en cualquier servicio.", time: "ayer" },
    { type: "loyalty",  title: "¡Te faltan 3 sellos!", body: "Completa tu King Pass y obtén un corte gratis.", time: "hace 3 d" },
  ],
};

/* ===================== Public-facing business metrics ===================== */
UK.admin = {
  metrics: {
    revenueToday: 1284,
    revenueWeek: 8420,
    revenueMonth: 32710,
    activeClients: 864,
    newClients: 42,
    pendingPayments: 6,
    completedToday: 38,
    occupancy: 0.82,
  },
  revenueSeries: [620, 880, 940, 1100, 1280, 1560, 1284], // Mon-Sun
  topClients: [
    { name: "Mateo Hernández", visits: 14, spent: 540, tag: "King Member" },
    { name: "Felipe Nava",     visits: 11, spent: 420, tag: "Frequent" },
    { name: "Lucas Morales",   visits: 9,  spent: 380, tag: "Student" },
    { name: "Camilo Prado",    visits: 8,  spent: 320, tag: "Frequent" },
    { name: "Diego Acuña",     visits: 7,  spent: 290, tag: "Walk-in" },
  ],
  activity: [
    { who: "Carlos",  action: "completó Top Kings",    client: "Mateo H.",   time: "hace 4 min", amount: 40 },
    { who: "Andrés",  action: "registró pago",         client: "Felipe N.",  time: "hace 12 min", amount: 55 },
    { who: "Lucas",   action: "agregó Facial add-on",  client: "Camilo P.",  time: "hace 21 min", amount: 10 },
    { who: "Carlos",  action: "completó Classic Kings",client: "Diego A.",   time: "hace 38 min", amount: 35 },
    { who: "Sistema", action: "creó nueva reserva",    client: "Andrés V.",  time: "hace 52 min" },
    { who: "Andrés",  action: "completó Top Kings",    client: "Javier R.",  time: "hace 1 h",   amount: 40 },
  ],
  upcoming: [
    { time: "17:30", service: "Top Kings",       client: "Mateo H.",  barber: "Carlos" },
    { time: "18:00", service: "Kings of Kings",  client: "Andrés V.", barber: "Andrés" },
    { time: "18:30", service: "Classic Kings",   client: "Lucas M.",  barber: "Lucas"  },
    { time: "19:00", service: "Top Kings + Facial", client: "Diego A.", barber: "Carlos" },
  ],
};

/* ===================== Format helpers ===================== */
UK.fmt = {
  money: (n) => "$" + n.toLocaleString("en-AU", { maximumFractionDigits: 0 }),
  date: (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("es-AU", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return iso; }
  },
  shortDate: (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("es-AU", { day: "2-digit", month: "short" });
    } catch { return iso; }
  },
};
