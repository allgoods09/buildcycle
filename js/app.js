/* BuildCycle pitch prototype. All accounts, AI, messages, payments and delivery are simulated. */
const money = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let stored;
try {
  stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
} catch {
  stored = null;
}
function hydrateState(value) {
  const base = freshState();
  if (!value || typeof value !== "object") return base;
  const savedUser =
    value.user && typeof value.user === "object" ? value.user : {};
  const listings = Array.isArray(value.listings)
    ? value.listings.filter(
        (listing) => listing && typeof listing.id === "string",
      )
    : base.listings;
  const chats = Array.isArray(value.chats)
    ? value.chats
        .filter((chat) => chat && typeof chat.id === "string")
        .map((chat) => ({
          ...chat,
          messages: Array.isArray(chat.messages) ? chat.messages : [],
        }))
    : base.chats;
  return {
    ...base,
    ...value,
    version: STATE_VERSION,
    user: {
      name:
        typeof savedUser.name === "string" ? savedUser.name : base.user.name,
      email:
        typeof savedUser.email === "string" ? savedUser.email : base.user.email,
      location:
        typeof savedUser.location === "string"
          ? savedUser.location
          : base.user.location,
    },
    listings: listings.length ? listings : base.listings,
    chats,
    saved: Array.isArray(value.saved)
      ? value.saved.filter((id) => typeof id === "string")
      : [],
    deals: Array.isArray(value.deals) ? value.deals : [],
    reviews: Array.isArray(value.reviews) ? value.reviews : [],
  };
}
let data = hydrateState(stored);
let ui = {
  screen: data.onboarded ? (data.authed ? "home" : "login") : "onboarding",
  history: [],
  selectedId: "lumber",
  chatId: "marcus",
  search: "",
  sort: "Newest",
  category: "All",
  condition: "All",
  distance: "Any",
  maxPrice: "",
  chatTab: "All Chats",
  chatSearchOpen: false,
  chatSearch: "",
  myTab: "Active",
  sheet: null,
  photo: null,
  draft: {},
  editId: null,
  aiSuggested: false,
  premium: false,
  offerPrice: "",
  quantity: 1,
  fulfilment: "pickup",
  payMethod: "protected",
  dealId: null,
  rating: 0,
  reviewTags: [],
  loginError: "",
  signupError: "",
  listingError: "",
};
const app = document.getElementById("app");
const overlayRoot = document.getElementById("overlay-root");
const supportRoot = document.getElementById("support-root");
const toastRoot = document.getElementById("toast-root");
let toastTimer;
let sheetTrigger = null;
const SUPPORT_POSITION_KEY = "buildcycle-cyclemate-position-v1";
let supportPosition = null;
try {
  const savedSupportPosition = JSON.parse(
    localStorage.getItem(SUPPORT_POSITION_KEY) || "null",
  );
  if (
    Number.isFinite(savedSupportPosition?.x) &&
    Number.isFinite(savedSupportPosition?.y)
  )
    supportPosition = savedSupportPosition;
} catch {
  supportPosition = null;
}
const supportState = {
  open: false,
  step: "main",
  history: [],
  category: null,
  messages: [],
};
let supportDrag = null;
let suppressSupportOpen = false;
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Demo storage unavailable:", err);
    toast("Storage is full; smaller photos work best.");
  }
}
function toast(message) {
  clearTimeout(toastTimer);
  toastRoot.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`;
  toastTimer = setTimeout(() => toastRoot.replaceChildren(), 3100);
}
if (stored) persist();
function icon(name, size = 20) {
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    search: '<circle cx="10.8" cy="10.8" r="7"/><path d="m16 16 5 5"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a8.5 8.5 0 1 1 16.1-4z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
    user: '<circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
    arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
    filter:
      '<path d="M4 5h16M7 12h13M4 19h16"/><circle cx="9" cy="5" r="2" fill="white"/><circle cx="15" cy="12" r="2" fill="white"/><circle cx="10" cy="19" r="2" fill="white"/>',
    heart:
      '<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
    share:
      '<circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5m-8 7 8 5"/>',
    x: '<path d="M5 5l14 14M19 5 5 19"/>',
    back: '<path d="m14 5-7 7 7 7"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    star: '<path d="m12 2 3 6.3 7 .9-5 4.9 1.2 7L12 17.7 5.8 21 7 14.1 2 9.2l7-.9z"/>',
    truck:
      '<path d="M2 6h12v11H2zM14 10h4l4 4v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    tag: '<path d="M3 4h8l10 10-7 7L4 11z"/><circle cx="8" cy="8" r="1"/>',
    camera:
      '<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="3"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10zM10 21h4"/>',
    edit: '<path d="m4 17-.5 4L8 20l11-11-4-4L4 17zM13 7l4 4"/>',
    card: '<rect x="2" y="5" width="20" height="15" rx="2"/><path d="M2 10h20"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
    refresh:
      '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.4 1.6c-1 1-2 1.3-2 3M12 17h.01"/>',
    logout: '<path d="M10 3H4v18h6m4-13 5 4-5 4M8 12h11"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m5 9 7 7 7-7"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    send: '<path d="m3 20 19-8L3 4l2 7 9 1-9 1z"/>',
    eye: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
    more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    spark:
      '<path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>',
    shield: '<path d="M12 2 21 6v6c0 6-4 9-9 10-5-1-9-4-9-10V6z"/>',
    sort: '<path d="M4 7h14M4 12h10M4 17h6"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`;
}
function imagePath(listing) {
  return listing?.image?.startsWith("data:")
    ? listing.image
    : ASSET + (listing?.image || "lumber.png");
}
function getListing(id) {
  return data.listings.find((x) => x.id === id) || data.listings[0];
}
function getChat(id) {
  return data.chats.find((x) => x.id === id) || data.chats[0];
}
function initials(s) {
  return String(s || "BC")
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0] || "")
    .join("")
    .toUpperCase();
}
function avatar(name, size = "", online = false) {
  return `<span class="avatar ${size} ${name === "Juan Dela Cruz" ? "alt" : name === "Jessa M." ? "warm" : ""} ${online ? "online" : ""}">${escapeHtml(initials(name))}</span>`;
}
function topbar(title, actions = "") {
  return `<header class="topbar"><button class="icon-btn" data-action="back" aria-label="Go back">${icon("back")}</button><h1>${escapeHtml(title)}</h1><div class="right">${actions}</div></header>`;
}
function nav(active = "home", floating = false) {
  const items = [
    ["home", "Home", "home"],
    ["search", "Search", "search"],
    ["upload", "Sell", "plus"],
    ["chats", "Chats", "chat"],
    ["profile", "Profile", "user"],
  ];
  return `<nav class="bottom-nav ${floating ? "floating" : ""}" aria-label="Main navigation">${items.map(([page, label, ic]) => `<button class="${page === active ? "active" : ""} ${page === "upload" ? "sell" : ""}" data-go="${page}" aria-label="${label}" ${page === active ? 'aria-current="page"' : ""}>${page === "profile" ? `<span class="nav-avatar">${escapeHtml(initials(data.user.name))}</span>` : icon(ic, 21)}${page === "upload" ? "" : `<span>${label}</span>`}</button>`).join("")}</nav>`;
}
function badge(tag) {
  const cls = /surplus|discount/i.test(tag)
    ? "orange"
    : /new/i.test(tag)
      ? "navy"
      : /recycl|reclaim/i.test(tag)
        ? "teal"
        : /artisan/i.test(tag)
          ? "purple"
          : "navy";
  return `<span class="pill ${cls}">${escapeHtml(tag)}</span>`;
}
function featureCard(l) {
  return `<button class="feature-card" data-open-listing="${escapeHtml(l.id)}"><img src="${escapeHtml(imagePath(l))}" alt="${escapeHtml(l.title)}"><span class="info">${badge(l.tag)}<span class="name" style="display:block">${escapeHtml(l.title)}</span><span class="location">${icon("pin", 12)}${escapeHtml(l.qty)} · ${escapeHtml(l.distance)} km away</span><span class="price" style="display:block">${money(l.price)} / ${escapeHtml(l.unit)}</span></span></button>`;
}
function productCard(l) {
  const saved = data.saved.includes(l.id);
  return `<article class="product-card"><button class="heart-float ${saved ? "saved" : ""}" data-save="${escapeHtml(l.id)}" aria-label="${saved ? "Remove from saved items" : "Save listing"}" aria-pressed="${saved}">${icon("heart", 17)}</button><button data-open-listing="${escapeHtml(l.id)}" style="border:0;background:none;padding:0;text-align:left;width:100%;color:inherit"><img src="${escapeHtml(imagePath(l))}" alt="${escapeHtml(l.title)}"><span class="details" style="display:block">${badge(l.tag)}<span class="title">${escapeHtml(l.title)}</span><span class="price">${money(l.price)}<small style="font-size:12px">/${escapeHtml(l.unit)}</small></span><span class="meta">${icon("pin", 12)}${escapeHtml(l.distance)} km away</span></span></button></article>`;
}
function renderOnboarding() {
  return `<main class="screen onboarding"><div class="onboarding-top"><div class="progress-dots single" aria-label="Welcome"><span class="active"></span></div><button class="btn link muted" data-action="onboard-skip">Skip</button></div><div class="onboard-art"><div class="art-core"><img src="assets/logo.png" alt="BuildCycle mark"></div></div><h1>Find Materials Nearby</h1><p>Explore construction materials available for pickup in your area and save on transport.</p><div class="onboarding-actions"><button class="btn primary full" data-action="enable-location">${icon("pin", 20)} Enable Location</button><button class="btn link full" data-sheet="location">Enter location manually</button><small>${icon("shield", 12)} Your location is only used to find local materials.</small></div></main>`;
}
function renderLogin() {
  return `<main class="screen auth-screen"><section class="auth-hero"><img src="assets/logo.png" alt="BuildCycle logo"><p class="eyebrow">Build more, waste less</p><h1>BuildCycle</h1><p>Welcome back to the marketplace</p></section><form id="login-form" class="auth-card"><div class="auth-card-intro"><h2>Log in to your account</h2><p>Find materials and keep your projects moving.</p></div><div class="form-group"><label for="login-email" class="field-label">Email Address</label><div class="input-with-icon"><span class="lead">${icon("user", 18)}</span><input class="field" type="email" id="login-email" name="email" placeholder="you@example.com" value="${escapeHtml(data.user.email)}" required autocomplete="email"></div></div><div class="form-group"><div style="display:flex;justify-content:space-between"><label for="login-pass" class="field-label">Password</label><button type="button" class="text-link small" data-sheet="forgot">FORGOT?</button></div><div class="input-with-icon"><span class="lead">${icon("lock", 18)}</span><input class="field" type="password" id="login-pass" name="password" placeholder="Enter any demo password" value="demo1234" required><button type="button" class="icon-btn ghost trailing" data-action="toggle-password" aria-label="Show password">${icon("eye", 18)}</button></div></div>${ui.loginError ? `<p class="field-error">${escapeHtml(ui.loginError)}</p>` : ""}<button class="btn primary full" type="submit">Log In</button><div class="or-divider">Or continue with</div><div class="social-row"><button type="button" class="btn outline social-btn" data-action="social"><span class="social-mark google" aria-hidden="true">G</span>Google</button><button type="button" class="btn outline social-btn" data-action="social"><span class="social-mark apple" aria-hidden="true">A</span>Apple</button></div></form><p class="auth-footer">Don't have an account? <button class="text-link" data-go="signup">Sign Up</button></p></main>`;
}
function renderSignup() {
  return `<main class="screen auth-screen">${topbar("Create Account")}<div class="signup-intro"><h1>Join BuildCycle</h1><p>Start sourcing surplus materials today.</p></div><form id="signup-form" class="signup-form"><div class="form-group"><label class="field-label" for="signup-name">Full Name</label><input class="field" id="signup-name" name="name" placeholder="Juan Dela Cruz" required></div><div class="form-group"><label class="field-label" for="signup-email">Email Address</label><input class="field" type="email" id="signup-email" name="email" placeholder="name@example.com" required></div><div class="form-group"><label class="field-label" for="signup-pass">Password</label><input class="field" type="password" id="signup-pass" name="password" placeholder="At least 6 characters" minlength="6" required></div><div class="form-group"><label class="field-label" for="signup-location">Location</label><input class="field" id="signup-location" name="location" value="Tubigon, Bohol" required></div>${ui.signupError ? `<p class="field-error">${escapeHtml(ui.signupError)}</p>` : ""}<button class="btn primary full" type="submit">Sign Up ${icon("arrow", 18)}</button><div class="or-divider">Or sign up with</div><div class="social-row"><button type="button" class="btn outline social-btn" data-action="social"><span class="social-mark google" aria-hidden="true">G</span>Google</button><button type="button" class="btn outline social-btn" data-action="social"><span class="social-mark apple" aria-hidden="true">A</span>Apple</button></div><p class="center small muted" style="margin:28px 0">Already have an account? <button type="button" class="text-link" data-go="login">Login</button></p></form></main>`;
}
function renderHome() {
  const filtersActive = hasActiveFilters();
  const filterCount = activeFilterCount();
  const featured = filteredListings({ includeSearch: false })
    .filter((x) => !x.mine)
    .slice(0, 4);
  const heading = filtersActive ? "Matching materials" : "Featured nearby";
  const action = filtersActive
    ? `<button class="text-link small" data-sheet="filters">${filterCount} filter${filterCount === 1 ? "" : "s"} active</button>`
    : `<button class="text-link small" data-go="search">See all</button>`;
  const content = featured.length
    ? featured.map(featureCard).join("")
    : `<div class="empty-state home-empty-state">${icon("search", 35)}<h3>No matching materials</h3><p>Try widening your filters to see more available surplus.</p><button class="btn outline slim" data-action="clear-filters">Clear filters</button></div>`;
  return `<main class="screen scroll-screen"><header class="home-header"><img class="brand-mark" src="assets/logo.png" alt="BuildCycle"><div class="home-copy"><p class="eyebrow">Materials marketplace</p><h1>BuildCycle</h1><p>Surplus materials near ${escapeHtml(data.user.location.split(",")[0])}</p></div></header><section class="list-stack"><div class="home-section-heading"><div><p class="eyebrow">${filtersActive ? "Filtered results" : "Discover"}</p><h2>${heading}</h2></div>${action}</div>${content}</section></main>${nav("home")}`;
}
function filteredListings({ includeSearch = true } = {}) {
  let list = data.listings.filter((l) => l.status !== "sold");
  const term = ui.search.trim().toLowerCase();
  if (includeSearch && term)
    list = list.filter((l) =>
      `${l.title} ${l.category} ${l.description} ${l.location}`
        .toLowerCase()
        .includes(term),
    );
  if (ui.category !== "All")
    list = list.filter((l) => l.category === ui.category);
  if (ui.condition !== "All")
    list = list.filter((l) => l.condition === ui.condition);
  if (ui.distance !== "Any")
    list = list.filter((l) => Number(l.distance) <= Number(ui.distance));
  if (ui.maxPrice)
    list = list.filter((l) => Number(l.price) <= Number(ui.maxPrice));
  if (ui.sort === "Lowest price") list.sort((a, b) => a.price - b.price);
  else if (ui.sort === "Nearest") list.sort((a, b) => a.distance - b.distance);
  else if (ui.sort === "Highest price") list.sort((a, b) => b.price - a.price);
  else list = [...list].reverse();
  return list;
}
function hasActiveFilters() {
  return (
    ui.category !== "All" ||
    ui.condition !== "All" ||
    ui.distance !== "Any" ||
    Boolean(ui.maxPrice)
  );
}
function activeFilterCount() {
  return [
    ui.category !== "All",
    ui.condition !== "All",
    ui.distance !== "Any",
    Boolean(ui.maxPrice),
  ].filter(Boolean).length;
}
function resultsMarkup() {
  const list = filteredListings();
  return `<div class="result-toolbar"><strong>${list.length} results found</strong><button data-sheet="sort">Sort by: <b>${escapeHtml(ui.sort)}</b></button></div>${list.length ? `<div class="product-grid">${list.map(productCard).join("")}</div>` : `<div class="empty-state">${icon("search", 35)}<h3>No matching materials</h3><p>Try another search or reset all filters.</p><button class="btn outline slim" data-action="reset-search">Reset search</button></div>`}`;
}
function renderSearch() {
  return `<main class="screen scroll-screen"><div class="search-head"><label class="search-field">${icon("search", 18)}<input id="search-input" type="search" value="${escapeHtml(ui.search)}" placeholder="Search materials" aria-label="Search materials"></label><button class="square-filter" data-sheet="filters" aria-label="Open filters">${icon("filter", 22)}</button></div><div class="chips-scroll"><button class="chip ${ui.category !== "All" ? "selected" : ""}" data-sheet="filters">${ui.category === "All" ? "Material" : escapeHtml(ui.category)} ${icon("down", 14)}</button><button class="chip ${ui.distance !== "Any" ? "selected" : ""}" data-sheet="filters">${ui.distance === "Any" ? "Distance" : ui.distance + " km"} ${icon("down", 14)}</button><button class="chip ${ui.maxPrice ? "selected" : ""}" data-sheet="filters">${ui.maxPrice ? `Up to ${money(ui.maxPrice)}` : "Price"} ${icon("down", 14)}</button><button class="chip ${ui.condition !== "All" ? "selected" : ""}" data-sheet="filters">${ui.condition === "All" ? "Condition" : escapeHtml(ui.condition)} ${icon("down", 14)}</button></div><div id="search-results">${resultsMarkup()}</div></main>${nav("search")}`;
}
function renderDetail() {
  const l = getListing(ui.selectedId),
    saved = data.saved.includes(l.id);
  return `<main class="screen detail-screen">${topbar("", `<button class="icon-btn" data-action="share" aria-label="Share listing">${icon("share")}</button><button class="icon-btn save-detail ${saved ? "on" : ""}" data-save="${escapeHtml(l.id)}" aria-label="${saved ? "Remove from saved items" : "Save listing"}" aria-pressed="${saved}">${icon("heart")}</button>`)}<div class="detail-photo"><img src="${escapeHtml(imagePath(l))}" alt="${escapeHtml(l.title)}"><span class="photo-count">1 / 1</span></div><div class="detail-body">${badge(l.tag)}<h1>${escapeHtml(l.title)}</h1><p class="distance">${icon("pin", 15)}${escapeHtml(l.distance)} km away · ${escapeHtml(l.location)}</p><div class="price-row"><div><span class="small muted">Asking Price</span><br><strong>${money(l.price)}</strong><span class="muted"> / ${escapeHtml(l.unit)}</span></div><span class="negotiable">Negotiable</span></div><section class="detail-section"><h2>Description</h2><p>${escapeHtml(l.description)}</p></section><div class="spec-grid">${l.specs.map(([name, value]) => `<div class="spec"><small>${escapeHtml(name)}</small><strong>${escapeHtml(value)}</strong></div>`).join("")}</div><div class="seller-card">${avatar(l.seller)}<div class="seller-info"><b>${escapeHtml(l.seller)}</b><small>★ ${escapeHtml(l.rating || "4.8")} · Sample seller profile</small></div>${l.mine ? badge("Your listing") : badge("Verified demo")}</div><p class="tiny muted" style="margin:0 0 20px">Verification and listing details shown here are illustrative demo information.</p></div><div class="detail-actions"><button class="btn outline slim" data-action="message-seller" aria-label="Message seller">${icon("chat", 20)}</button><button class="btn outline slim" data-sheet="offer">Make Offer</button><button class="btn primary" data-sheet="checkout">Buy / Deal</button></div></main>`;
}
function filteredChats() {
  let chats = data.chats.filter(
    (c) =>
      ui.chatTab === "All Chats" ||
      (ui.chatTab === "Buying" ? c.type === "buying" : c.type === "selling"),
  );
  const term = ui.chatSearch.trim().toLowerCase();
  if (term) {
    chats = chats.filter((c) => {
      const listing = data.listings.find((l) => l.id === c.listingId);
      return `${c.name} ${c.last} ${listing?.title || ""}`
        .toLowerCase()
        .includes(term);
    });
  }
  return chats;
}
function chatListMarkup() {
  const chats = filteredChats();
  if (!chats.length) {
    return `<div class="empty-state">${icon("chat", 35)}<h3>${ui.chatSearch ? "No matching chats" : "No chats yet"}</h3><p>${ui.chatSearch ? "Try a person, message, or listing name." : "Message a seller to start a conversation."}</p>${ui.chatSearch ? '<button class="btn outline slim" data-action="clear-chat-search">Clear chat search</button>' : ""}</div>`;
  }
  return chats
    .map((c) => {
      const l = getListing(c.listingId);
      return `<button class="chat-list-row" data-open-chat="${escapeHtml(c.id)}">${avatar(c.name, "lg", c.online)}<span class="body"><span class="name-line"><strong>${escapeHtml(c.name)}</strong><small class="muted">${escapeHtml(c.time)}</small></span><span class="preview">${escapeHtml(c.last)}</span><span class="listing-name">${icon("tag", 12)}${escapeHtml(l.title)}</span></span></button>`;
    })
    .join("");
}
function renderChats() {
  const search = ui.chatSearchOpen
    ? `<div class="chat-search-row"><label class="chat-search-field">${icon("search", 18)}<input id="chat-search-input" type="search" value="${escapeHtml(ui.chatSearch)}" placeholder="Search people or listings" aria-label="Search chats"></label><button class="icon-btn ghost" data-action="clear-chat-search" aria-label="Close chat search">${icon("x", 18)}</button></div>`
    : "";
  return `<main class="screen scroll-screen"><header class="topbar" style="border:0;padding-top:23px"><h1 class="heading">Messages</h1><button class="icon-btn chat-search-toggle ${ui.chatSearchOpen ? "active" : ""}" data-action="chat-search" aria-label="Search chats" aria-expanded="${ui.chatSearchOpen}">${icon("search")}</button><button class="icon-btn" data-sheet="chat-help" aria-label="Messages information">${icon("filter")}</button></header>${search}<div class="tab-row pills">${["All Chats", "Selling", "Buying"].map((t) => `<button class="${ui.chatTab === t ? "selected" : ""}" data-chat-tab="${t}">${t}</button>`).join("")}</div><div id="chat-list">${chatListMarkup()}</div></main>${nav("chats")}`;
}
function renderChat() {
  let c = getChat(ui.chatId),
    l = getListing(c.listingId);
  const offerQuantity = Math.max(1, Number(c.offer?.quantity) || 1);
  return `<main class="screen chat-screen"><header class="chat-thread-header"><button class="icon-btn ghost" data-action="back" aria-label="Back to chats">${icon("back")}</button>${avatar(c.name, "sm", c.online)}<div class="info"><strong>${escapeHtml(c.name)}</strong><small>${c.online ? "Online" : "Usually replies today"}</small></div><button class="icon-btn ghost" data-sheet="chat-help" aria-label="Chat options">${icon("more")}</button></header><div class="conversation" id="conversation"><div class="today-label">TODAY</div>${c.messages.map((m) => `<div class="bubble-wrap ${m.mine ? "mine" : ""}">${!m.mine ? avatar(c.name, "sm") : ""}<div class="bubble-stack"><div class="bubble">${escapeHtml(m.text)}</div><div class="bubble-time">${escapeHtml(m.time)}</div></div></div>`).join("")}<button class="message-attachment" data-open-listing="${escapeHtml(l.id)}"><img src="${escapeHtml(imagePath(l))}" alt=""><span><strong>${escapeHtml(l.title)}</strong><small>${money(l.price)} / ${escapeHtml(l.unit)}</small></span></button>${c.offer ? `<div class="offer-card"><strong>${c.offer.status === "accepted" ? "Offer accepted" : "Demo offer sent"}</strong><div class="offer-price">${money(c.offer.price)} / ${escapeHtml(l.unit)}</div><small class="muted">${offerQuantity} ${escapeHtml(l.unit)}${offerQuantity === 1 ? "" : "s"} · ${money(c.offer.price * offerQuantity)} material subtotal</small><small class="muted offer-fulfilment">${escapeHtml(c.offer.fulfilment === "delivery" ? "Partner delivery quote chosen" : "Self-arranged pickup")}</small>${c.offer.status === "pending" ? `<div class="offer-actions"><button class="btn teal slim" data-action="accept-offer">Accept offer (demo)</button><button class="btn outline slim" data-sheet="offer">Revise</button></div>` : `<button class="btn primary slim" data-action="start-deal">Continue deal</button>`}</div>` : ""}${data.deals.some((d) => d.chatId === c.id) ? `<button class="btn outline full" data-action="view-deal" style="margin-top:14px">${icon("shield", 16)} View protected deal</button>` : ""}</div><form id="chat-form" class="composer"><button type="button" class="icon-btn ghost" data-sheet="chat-actions" aria-label="More chat actions">${icon("plus")}</button><input name="message" placeholder="Type a message..." aria-label="Type a message" autocomplete="off"><button type="submit" class="send" aria-label="Send message">${icon("send", 18)}</button></form></main>`;
}
const categories = [
  "Lumber",
  "Tiles",
  "Steel & Metal",
  "Cement & Concrete",
  "Electrical",
  "Other",
];
const conditions = [
  "Reclaimed",
  "Unused surplus",
  "New",
  "Like new",
  "Industrial",
  "Discounted",
];
function cycleMateGreeting() {
  return [
    {
      role: "bot",
      text: `Hello, ${data.user.name.split(" ")[0] || "builder"}! I’m CycleMate, your BuildCycle demo assistant.`,
    },
    {
      role: "bot",
      text: "What can I help you with today? Choose an option below and I’ll guide you.",
    },
  ];
}
function resetCycleMate() {
  supportState.step = "main";
  supportState.history = [];
  supportState.category = null;
  supportState.dealId = null;
  supportState.messages = cycleMateGreeting();
}
function cycleMateListings() {
  return data.listings.filter(
    (listing) => listing.status !== "sold" && !listing.mine,
  );
}
function cycleMateBounds() {
  const rect = app.getBoundingClientRect?.();
  if (rect && rect.width > 0 && rect.height > 0)
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  return {
    left: 0,
    top: 0,
    width: Number(window.innerWidth) || 390,
    height: Number(window.innerHeight) || 800,
  };
}
function resolvedCycleMatePosition() {
  const bounds = cycleMateBounds();
  const maxX = Math.max(10, bounds.width - 70);
  const maxY = Math.max(10, bounds.height - 145);
  const fallback = { x: maxX, y: maxY };
  const source = supportPosition || fallback;
  return {
    x: Math.min(maxX, Math.max(10, Number(source.x) || fallback.x)),
    y: Math.min(maxY, Math.max(10, Number(source.y) || fallback.y)),
  };
}
function applyCycleMateLayout() {
  const bounds = cycleMateBounds();
  const fab = document.querySelector(".support-fab");
  if (fab) {
    const position = resolvedCycleMatePosition();
    supportPosition = position;
    fab.style.left = `${bounds.left + position.x}px`;
    fab.style.top = `${bounds.top + position.y}px`;
  }
  const scrim = document.querySelector(".support-scrim");
  if (scrim) {
    scrim.style.left = `${bounds.left}px`;
    scrim.style.top = `${bounds.top}px`;
    scrim.style.width = `${bounds.width}px`;
    scrim.style.height = `${bounds.height}px`;
  }
  const panel = document.querySelector(".support-panel");
  if (panel) {
    const panelWidth = Math.min(366, Math.max(280, bounds.width - 24));
    const panelHeight = Math.min(660, Math.max(340, bounds.height - 28));
    panel.style.left = `${bounds.left + (bounds.width - panelWidth) / 2}px`;
    panel.style.top = `${bounds.top + (bounds.height - panelHeight) / 2}px`;
    panel.style.width = `${panelWidth}px`;
    panel.style.height = `${panelHeight}px`;
  }
}
function cycleMateResultCards(ids = []) {
  if (!ids.length) return "";
  return `<div class="support-results">${ids
    .map(getListing)
    .map(
      (listing) =>
        `<button class="support-result" data-support-listing="${escapeHtml(listing.id)}"><img src="${escapeHtml(imagePath(listing))}" alt=""><span><strong>${escapeHtml(listing.title)}</strong><small>${money(listing.price)} / ${escapeHtml(listing.unit)} · ${escapeHtml(listing.distance)} km</small></span>${icon("chevron", 15)}</button>`,
    )
    .join("")}</div>`;
}
function cycleMateMessagesMarkup() {
  return supportState.messages
    .map(
      (message) =>
        `<div class="support-message ${message.role === "user" ? "user" : "bot"}">${message.role === "bot" ? `<span class="support-mini-avatar">${icon("spark", 14)}</span>` : ""}<div class="support-bubble">${escapeHtml(message.text)}</div></div>${message.listingIds ? cycleMateResultCards(message.listingIds) : ""}`,
    )
    .join("");
}
function cycleMateQuick(label, action, style = "") {
  return `<button class="support-quick ${style}" data-support-action="${escapeHtml(action)}">${escapeHtml(label)}</button>`;
}
function cycleMateQuickReplies() {
  switch (supportState.step) {
    case "nearby":
      return [
        cycleMateQuick("Browse categories", "categories", "primary"),
        cycleMateQuick("Open full search", "open-search"),
        cycleMateQuick("Buying help", "buy"),
        cycleMateQuick("Back", "back", "subtle"),
      ].join("");
    case "categories":
      return `${categories
        .map(
          (category) =>
            `<button class="support-quick primary" data-support-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`,
        )
        .join("")}${cycleMateQuick("Back", "back", "subtle")}`;
    case "category-results":
      return [
        cycleMateQuick(
          `See all ${supportState.category || "materials"}`,
          "open-category",
          "primary",
        ),
        cycleMateQuick("Choose another category", "categories"),
        cycleMateQuick("Nearest instead", "nearby"),
        cycleMateQuick("Back", "back", "subtle"),
      ].join("");
    case "buy":
      return [
        cycleMateQuick("Choosing a quantity", "quantity-help", "primary"),
        cycleMateQuick("Offers and negotiation", "offer-help"),
        cycleMateQuick("Protected deals", "protection-help"),
        cycleMateQuick("Browse categories", "categories"),
        cycleMateQuick("Back", "back", "subtle"),
      ].join("");
    case "quantity-help":
      return [
        cycleMateQuick("Show nearby materials", "nearby", "primary"),
        cycleMateQuick("How offers work", "offer-help"),
        cycleMateQuick("Open search", "open-search"),
        cycleMateQuick("Back", "back", "subtle"),
      ].join("");
    case "offer-help":
      return [
        cycleMateQuick("Find something to offer on", "nearby", "primary"),
        cycleMateQuick("Protected deals", "protection-help"),
        cycleMateQuick("Open messages", "open-chats"),
        cycleMateQuick("Back", "back", "subtle"),
      ].join("");
    case "protection-help":
      return [
        cycleMateQuick("Deal progress guide", "deal-guide", "primary"),
        cycleMateQuick("Browse materials", "open-search"),
        cycleMateQuick("Back", "back", "subtle"),
      ].join("");
    case "sell":
      return [
        cycleMateQuick("Open Sell", "open-sell", "primary"),
        cycleMateQuick("What makes a good listing?", "selling-tips"),
        cycleMateQuick("About the AI helper", "ai-helper"),
        cycleMateQuick("Back", "back", "subtle"),
      ].join("");
    case "selling-tips":
      return [
        cycleMateQuick("Create a listing", "open-sell", "primary"),
        cycleMateQuick("About the AI helper", "ai-helper"),
        cycleMateQuick("Back", "back", "subtle"),
      ].join("");
    case "ai-helper":
      return [
        cycleMateQuick("Try it in Sell", "open-sell", "primary"),
        cycleMateQuick("Listing tips", "selling-tips"),
        cycleMateQuick("Back", "back", "subtle"),
      ].join("");
    case "deal":
      return [
        supportState.dealId
          ? cycleMateQuick("View latest deal", "view-deal", "primary")
          : cycleMateQuick("Browse materials", "nearby", "primary"),
        cycleMateQuick("Deal progress guide", "deal-guide"),
        cycleMateQuick("Open messages", "open-chats"),
        cycleMateQuick("Back", "back", "subtle"),
      ].join("");
    case "deal-guide":
      return [
        cycleMateQuick("Check my latest deal", "deal", "primary"),
        cycleMateQuick("Open messages", "open-chats"),
        cycleMateQuick("Browse materials", "nearby"),
        cycleMateQuick("Back", "back", "subtle"),
      ].join("");
    case "saved":
      return [
        cycleMateQuick("Open saved items", "open-saved", "primary"),
        cycleMateQuick("Find nearby materials", "nearby"),
        cycleMateQuick("Back", "back", "subtle"),
      ].join("");
    case "how":
      return [
        cycleMateQuick("Help me buy", "buy", "primary"),
        cycleMateQuick("Help me sell", "sell"),
        cycleMateQuick("Explain deal progress", "deal-guide"),
        cycleMateQuick("Start over", "reset", "subtle"),
      ].join("");
    default:
      return [
        cycleMateQuick("Show nearby materials", "nearby", "primary"),
        cycleMateQuick("Browse by category", "categories", "primary"),
        cycleMateQuick("Help me buy", "buy"),
        cycleMateQuick("Help me sell", "sell"),
        cycleMateQuick("Check my latest deal", "deal"),
        cycleMateQuick(
          `Saved items (${data.saved.length})`,
          "saved",
        ),
        cycleMateQuick("How BuildCycle works", "how"),
      ].join("");
  }
}
function renderCycleMate() {
  if (!supportRoot) return;
  const authenticated =
    data.authed && !["onboarding", "login", "signup"].includes(ui.screen);
  const focusedFlow = ["chat", "detail", "deal", "rating"].includes(
    ui.screen,
  );
  if (!authenticated || focusedFlow) {
    supportState.open = false;
    supportRoot.replaceChildren();
    return;
  }
  if (!supportState.messages.length) resetCycleMate();
  if (!supportState.open) {
    supportRoot.innerHTML = `<button class="support-fab" data-support-action="open" aria-label="Open CycleMate support. Drag to reposition." title="CycleMate support · drag to reposition">${icon("chat", 25)}<span class="support-spark">${icon("spark", 11)}</span></button>`;
    applyCycleMateLayout();
    return;
  }
  supportRoot.innerHTML = `<button class="support-scrim" data-support-dismiss aria-label="Close CycleMate"></button><section class="support-panel" role="dialog" aria-modal="true" aria-label="CycleMate demo support"><header class="support-head"><span class="support-avatar">${icon("spark", 22)}</span><div class="support-head-copy"><strong>CycleMate</strong><small>Online · guided demo support</small></div><button class="icon-btn small" data-support-action="reset" aria-label="Restart conversation">${icon("refresh", 16)}</button><button class="icon-btn small" data-support-action="close" aria-label="Close CycleMate">${icon("x", 17)}</button></header><div class="support-conversation" id="support-conversation"><p class="support-day">CYCLEMATE · DEMO ASSISTANT</p>${cycleMateMessagesMarkup()}</div><footer class="support-actions"><p class="support-actions-label">${icon("spark", 12)} Suggested actions</p><div class="support-quick-list">${cycleMateQuickReplies()}</div><p class="support-demo-note">Guided prototype responses · no external AI is contacted</p></footer></section>`;
  applyCycleMateLayout();
  const conversation = document.getElementById("support-conversation");
  if (conversation) conversation.scrollTop = conversation.scrollHeight;
}
function cycleMateTurn(label, step, response, listingIds = []) {
  supportState.history.push(supportState.step);
  supportState.step = step;
  supportState.messages.push({ role: "user", text: label });
  supportState.messages.push({
    role: "bot",
    text: response,
    ...(listingIds.length ? { listingIds } : {}),
  });
  renderCycleMate();
}
function closeCycleMate({ restoreFocus = true } = {}) {
  supportState.open = false;
  renderCycleMate();
  if (restoreFocus) document.querySelector(".support-fab")?.focus();
}
function navigateFromCycleMate(destination) {
  closeCycleMate({ restoreFocus: false });
  if (destination === "upload") {
    ui.editId = null;
    ui.photo = null;
    ui.draft = {};
    ui.premium = false;
  }
  goto(destination);
}
function handleCycleMateCategory(category) {
  const matches = cycleMateListings()
    .filter((listing) => listing.category === category)
    .sort((a, b) => Number(a.distance) - Number(b.distance));
  supportState.category = category;
  cycleMateTurn(
    category,
    "category-results",
    matches.length
      ? `I found ${matches.length} available ${category.toLowerCase()} listing${matches.length === 1 ? "" : "s"}. Here are the closest options.`
      : `There are no active ${category.toLowerCase()} listings right now. You can try another category or open the full search.`,
    matches.slice(0, 3).map((listing) => listing.id),
  );
}
function handleCycleMateAction(action) {
  if (action === "open") {
    if (suppressSupportOpen) {
      suppressSupportOpen = false;
      return;
    }
    if (ui.sheet) closeSheet();
    supportState.open = true;
    renderCycleMate();
    document
      .querySelector('[data-support-action="close"]')
      ?.focus();
    return;
  }
  if (action === "close") {
    closeCycleMate();
    return;
  }
  if (action === "reset") {
    resetCycleMate();
    renderCycleMate();
    return;
  }
  if (action === "back") {
    supportState.step = supportState.history.pop() || "main";
    supportState.messages.push({ role: "user", text: "Go back" });
    supportState.messages.push({
      role: "bot",
      text: "Of course. Here are the previous options.",
    });
    renderCycleMate();
    return;
  }
  if (action === "open-search") {
    ui.category = "All";
    ui.search = "";
    navigateFromCycleMate("search");
    return;
  }
  if (action === "open-category") {
    ui.category = supportState.category || "All";
    ui.search = "";
    navigateFromCycleMate("search");
    return;
  }
  if (action === "open-sell") {
    navigateFromCycleMate("upload");
    return;
  }
  if (action === "open-saved") {
    navigateFromCycleMate("saved");
    return;
  }
  if (action === "open-chats") {
    navigateFromCycleMate("chats");
    return;
  }
  if (action === "view-deal") {
    const deal = data.deals.find(
      (item) => item.id === supportState.dealId,
    );
    if (deal) {
      ui.dealId = deal.id;
      navigateFromCycleMate("deal");
    }
    return;
  }
  if (action === "nearby") {
    const nearby = cycleMateListings()
      .sort((a, b) => Number(a.distance) - Number(b.distance))
      .slice(0, 3);
    cycleMateTurn(
      "Show nearby materials",
      "nearby",
      nearby.length
        ? `These are the closest available materials to ${data.user.location}. Tap one to view its details.`
        : "I couldn’t find an active buyer listing. Try the full search or post a material instead.",
      nearby.map((listing) => listing.id),
    );
    return;
  }
  if (action === "categories") {
    cycleMateTurn(
      "Browse by category",
      "categories",
      "What kind of material are you looking for?",
    );
    return;
  }
  if (action === "buy") {
    cycleMateTurn(
      "Help me buy",
      "buy",
      "I can help you find materials, choose a smaller quantity, make an offer, or understand the demo deal process. Where should we start?",
    );
    return;
  }
  if (action === "quantity-help") {
    cycleMateTurn(
      "Choosing a quantity",
      "quantity-help",
      "Open a listing and choose Make Offer or Buy / Deal. Enter any whole quantity from 1 up to the available stock; the subtotal and delivery total update immediately.",
    );
    return;
  }
  if (action === "offer-help") {
    cycleMateTurn(
      "Offers and negotiation",
      "offer-help",
      "Use Make Offer to propose a per-unit price and quantity. The simulated seller can accept it in Messages, then you can continue with that exact quantity and price.",
    );
    return;
  }
  if (action === "protection-help") {
    cycleMateTurn(
      "Protected deals",
      "protection-help",
      "Protected payment, delivery quotes, and tracking are visual simulations. The prototype never charges money or books a courier; cash on pickup is shown outside protection.",
    );
    return;
  }
  if (action === "sell") {
    cycleMateTurn(
      "Help me sell",
      "sell",
      "I can take you to the listing form or help you prepare a clearer material description first.",
    );
    return;
  }
  if (action === "selling-tips") {
    cycleMateTurn(
      "What makes a good listing?",
      "selling-tips",
      "Use a clear photo, name the material and condition, enter a numeric available quantity, mention dimensions, and explain when inspection or pickup is possible.",
    );
    return;
  }
  if (action === "ai-helper") {
    cycleMateTurn(
      "About the AI helper",
      "ai-helper",
      "The Sell page can generate editable example wording from your title, category, and location. It runs locally for this demo and never sends your information to an AI service.",
    );
    return;
  }
  if (action === "deal") {
    const deal = data.deals[0];
    supportState.dealId = deal?.id || null;
    cycleMateTurn(
      "Check my latest deal",
      "deal",
      deal
        ? `Your latest demo deal is for ${getListing(deal.listingId).title}, quantity ${Math.max(1, Number(deal.quantity) || 1)}. You can open its progress or review how the stages work.`
        : "You don’t have a demo deal yet. Open a listing and choose Buy / Deal, or make an offer and continue from Messages.",
    );
    return;
  }
  if (action === "deal-guide") {
    cycleMateTurn(
      "Explain deal progress",
      "deal-guide",
      "A demo deal moves from creation to seller preparation, pickup or delivery, receipt, and buyer confirmation. Use Advance demo status to present each stage.",
    );
    return;
  }
  if (action === "saved") {
    const savedListings = data.listings.filter((listing) =>
      data.saved.includes(listing.id),
    );
    cycleMateTurn(
      "Show my saved items",
      "saved",
      savedListings.length
        ? `You have ${savedListings.length} saved item${savedListings.length === 1 ? "" : "s"}. Here ${savedListings.length === 1 ? "it is" : "are the latest ones"}.`
        : "You haven’t saved anything yet. Tap the heart on a listing, or let me show you nearby materials.",
      savedListings.slice(0, 3).map((listing) => listing.id),
    );
    return;
  }
  if (action === "how") {
    cycleMateTurn(
      "How does BuildCycle work?",
      "how",
      "BuildCycle connects people who have usable construction surplus with nearby buyers. This prototype demonstrates discovery, offers, selling, chat, and transaction progress using local sample data.",
    );
  }
}
const option = (value, selected) =>
  `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>`;
function renderUpload() {
  const l = ui.editId ? getListing(ui.editId) : null,
    v = {
      category: "Lumber",
      title: "",
      price: "",
      unit: "pc",
      qty: "",
      location: data.user.location,
      condition: "Reclaimed",
      description: "",
      ...l,
      ...ui.draft,
    };
  const photo = ui.photo || (l ? imagePath(l) : null);
  return `<main class="screen scroll-screen">${topbar(l ? "Edit Listing" : "Upload Listing")}<form id="upload-form" class="upload-form">
    <label class="field-label">Photos (up to 1 in this demo)</label><div class="photo-pick"><label class="photo-drop" for="upload-photo">${icon("camera", 25)}<span>ADD PHOTO</span><input type="file" id="upload-photo" name="photo" accept="image/*" hidden></label>${photo ? `<div class="photo-thumb"><img class="photo-preview" src="${escapeHtml(photo)}" alt="Listing photo preview"><button type="button" data-action="remove-photo" aria-label="Remove photo">${icon("x", 14)}</button></div>` : ""}</div>
    <div class="form-group"><label class="field-label" for="listing-category">Material Category</label><select id="listing-category" name="category" class="select-field">${categories.map((c) => option(c, v.category)).join("")}</select></div>
    <div class="form-group"><label class="field-label" for="listing-title">Listing Title</label><input class="field" id="listing-title" name="title" value="${escapeHtml(v.title)}" placeholder="e.g. Reclaimed Pine Boards" required maxlength="90"></div>
    <div class="input-pair"><div class="form-group"><label class="field-label" for="listing-price">Price (₱)</label><input class="field" id="listing-price" name="price" type="number" min="1" step="1" value="${escapeHtml(v.price)}" placeholder="0" required></div><div class="form-group"><label class="field-label" for="listing-unit">Unit</label><select id="listing-unit" name="unit" class="select-field">${["pc", "kg", "bag", "board", "sheet", "meter", "lot"].map((x) => option(x, v.unit)).join("")}</select></div></div>
    <div class="form-group"><label class="field-label" for="listing-qty">Quantity Available</label><input class="field" id="listing-qty" name="qty" value="${escapeHtml(v.qty)}" placeholder="e.g. 24 boards, 50 kg" required></div>
    <div class="form-group"><label class="field-label" for="listing-location">Location</label><input class="field" id="listing-location" name="location" value="${escapeHtml(v.location)}" placeholder="City, Province" required></div>
    <span class="field-label">Condition Tag</span><div class="condition-row">${conditions.map((c) => `<button type="button" class="${v.condition === c ? "selected" : ""}" data-condition="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}</div><input type="hidden" name="condition" value="${escapeHtml(v.condition)}">
    <div class="form-group"><label class="field-label" for="listing-description">Description</label><textarea class="text-area" id="listing-description" name="description" placeholder="Describe condition, dimensions and origin..." required>${escapeHtml(v.description)}</textarea></div>
    <div class="demo-assist"><strong>${icon("spark", 15)} AI listing helper · demo</strong><p>Preview example wording based on the category. You can edit every suggestion before posting.</p><button type="button" class="btn outline slim" data-action="ai-suggest">Suggest description</button></div>
    <label class="option-row"><input type="checkbox" name="premium" ${ui.premium ? "checked" : ""}><span class="option-copy"><b>Premium visibility</b><small>Optional highlighted listing · illustrative fee</small></span></label>
    <div class="fee-note" id="fee-preview">Listing is free. Example success fee: <b>5%</b> of a completed material sale. Premium example: <b>3%</b> additional. No charge or real listing is created.</div>
    ${ui.listingError ? `<p class="field-error">${escapeHtml(ui.listingError)}</p>` : ""}<button class="btn primary full" type="submit">${l ? "SAVE CHANGES" : "POST LISTING"}</button>
  </form></main>${nav("upload")}`;
}
function renderConfirmation() {
  const l = getListing(ui.selectedId);
  return `<main class="screen success-screen"><div class="success-ring"><span>${icon("check", 50)}</span></div><h1>Listing Live!</h1><p>Your materials are now visible to builders nearby. You'll be notified when someone expresses interest.</p><button class="success-preview" data-open-listing="${escapeHtml(l.id)}"><img src="${escapeHtml(imagePath(l))}" alt=""><span><strong>${escapeHtml(l.title)}</strong><small>${icon("pin", 12)} ${escapeHtml(l.location)}</small></span><b>${money(l.price)}</b></button><button class="btn teal full" data-go="my-listings">View My Listing ${icon("arrow", 17)}</button><button class="btn outline full" data-go="home">Back to Home</button><p class="small muted" style="margin-top:30px">Demo listing saved in this browser.</p></main>`;
}
function profileRow(label, ic, target, extra = "", meta = "") {
  const targetAttribute = target.startsWith("sheet:")
    ? `data-sheet="${target.slice(6)}"`
    : target.startsWith("action:")
      ? `data-action="${target.slice(7)}"`
      : `data-go="${target}"`;
  return `<button class="profile-row ${extra}" ${targetAttribute}><span class="icon-badge">${icon(ic, 20)}</span>${escapeHtml(label)}${meta ? `<span class="profile-row-meta" aria-label="${escapeHtml(meta)} saved">${escapeHtml(meta)}</span>` : ""}<span class="chevron">${icon("chevron", 16)}</span></button>`;
}
function renderProfile() {
  const own = data.listings.filter((l) => l.mine),
    sold = own.filter((l) => l.status === "sold").length;
  return `<main class="screen scroll-screen"><section class="profile-head"><div style="display:flex;justify-content:space-between;align-items:center"><h1 class="heading">Profile</h1><button class="icon-btn" data-sheet="notifications" aria-label="Notifications">${icon("bell")}</button></div><div class="profile-person">${avatar(data.user.name, "lg")}<div><h2>${escapeHtml(data.user.name)}</h2><div class="muted small">${icon("pin", 14)} ${escapeHtml(data.user.location)}</div><button class="btn slim dark" data-sheet="edit-profile">Edit Profile</button></div></div><div class="profile-stats"><div><strong>${own.length}</strong><span>LISTINGS</span></div><div><strong>${sold}</strong><span>SALES</span></div><div><strong>4.8 ★</strong><span>DEMO RATING</span></div></div></section><section class="profile-section"><h3 class="eyebrow">ACCOUNT ACTIVITY</h3>${profileRow("My Listings", "tag", "my-listings")}${profileRow("Saved Items", "heart", "saved", "", String(data.saved.length))}${profileRow("Payment Methods", "card", "sheet:payments")}${profileRow("Business & Verification", "shield", "sheet:business")}</section><section class="profile-section"><h3 class="eyebrow">GENERAL</h3>${profileRow("Settings", "settings", "sheet:settings")}${profileRow("Try the Web!", "arrow", "action:try-web", "switch")}${profileRow("Reset Demo Marketplace", "refresh", "sheet:reset", "reset")}${profileRow("Help Center", "help", "sheet:help")}${profileRow("Logout", "logout", "sheet:logout", "danger")}</section></main>${nav("profile")}`;
}
function renderMyListings() {
  let own = data.listings.filter((l) => l.mine);
  let shown = own.filter((l) =>
    ui.myTab === "Active"
      ? l.status !== "sold" && l.status !== "draft"
      : ui.myTab === "Sold"
        ? l.status === "sold"
        : l.status === "draft",
  );
  return `<main class="screen scroll-screen">${topbar("My Listings", `<button class="icon-btn" data-go="upload" aria-label="Create listing">${icon("plus")}</button>`)}<div class="tab-row" style="justify-content:space-around">${["Active", "Sold", "Drafts"].map((t) => `<button data-my-tab="${t}" class="${ui.myTab === t ? "selected" : ""}">${t} (${own.filter((l) => (t === "Active" ? l.status !== "sold" && l.status !== "draft" : t === "Sold" ? l.status === "sold" : l.status === "draft")).length})</button>`).join("")}</div>${shown.length ? shown.map((l) => `<article class="my-listing-card"><button class="top" style="width:100%;background:none;border:0;text-align:left" data-open-listing="${escapeHtml(l.id)}"><img src="${escapeHtml(imagePath(l))}" alt=""><span class="info"><strong>${escapeHtml(l.title)}</strong><b>${money(l.price)}</b><small class="muted">${icon("pin", 12)} ${escapeHtml(l.location)}</small></span>${badge(l.status === "sold" ? "Sold" : "Active")}</button><div class="actions"><button data-edit="${escapeHtml(l.id)}">${icon("edit", 15)} Edit</button>${l.status === "sold" ? `<button data-action="reactivate" data-id="${escapeHtml(l.id)}">Relist</button>` : `<button data-action="mark-sold" data-id="${escapeHtml(l.id)}">${icon("check", 15)} Mark as Sold</button>`}</div></article>`).join("") : `<div class="empty-state"><h3>No ${ui.myTab.toLowerCase()} listings</h3><p>Post a material to see it here.</p><button class="btn primary slim" data-go="upload">Create listing</button></div>`}</main>${nav("profile")}`;
}
function renderSaved() {
  let saved = data.listings.filter((l) => data.saved.includes(l.id));
  return `<main class="screen scroll-screen">${topbar("Saved Items")}<div class="product-grid" style="padding-top:20px">${saved.map(productCard).join("")}</div>${saved.length ? "" : `<div class="empty-state">${icon("heart", 35)}<h3>No saved items yet</h3><p>Tap a heart on a listing to keep it here.</p><button class="btn primary slim" data-go="search">Browse materials</button></div>`}</main>${nav("profile")}`;
}
function renderRating() {
  let d = data.deals.find((x) => x.id === ui.dealId),
    l = getListing(d?.listingId),
    name = l.seller;
  return `<main class="screen rating-screen">${topbar("Rate Transaction")}<div class="rating-content"><div class="rating-seller">${avatar(name, "lg", true)}<div><small class="muted">SELLER</small><strong>${escapeHtml(name)}</strong><small class="muted">Transaction: ${escapeHtml(l.title)}</small></div></div><div class="rating-intro"><h2>How was your experience?</h2><p>Your feedback helps the BuildCycle community make better decisions.</p></div><div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}" class="${n <= ui.rating ? "active" : ""}" aria-label="${n} stars">${icon("star", 39)}</button>`).join("")}</div><div class="rating-label">${["", "Poor", "Fair", "Good", "Very Good", "Excellent"][ui.rating] || "Tap a star to rate"}</div><form id="rating-form"><label class="field-label" for="review-text">Share your experience (optional)</label><textarea id="review-text" name="review" class="text-area" placeholder="Tell others about the quality of materials and the professionalism of the seller..."></textarea><p style="margin:24px 0 4px;font-size:13px;font-weight:700">Quick Tags</p><div class="review-tags">${["Fast Pickup", "As Described", "Great Price", "Eco-friendly"].map((t) => `<button type="button" data-review-tag="${t}" class="${ui.reviewTags.includes(t) ? "selected" : ""}">${t}</button>`).join("")}</div></form></div><div class="rating-action"><button class="btn teal full" data-action="submit-rating">Submit Review</button></div></main>`;
}
const pickupSteps = [
  "Deal created",
  "Seller preparing materials",
  "Pickup arranged",
  "Materials received",
  "Buyer confirmed · payment released",
];
const deliverySteps = [
  "Deal created",
  "Seller preparing materials",
  "Partner pickup assigned",
  "In transit",
  "Materials received",
  "Buyer confirmed · payment released",
];
function renderDeal() {
  let d = data.deals.find((x) => x.id === ui.dealId),
    l = getListing(d?.listingId);
  if (!d) return renderHome();
  let steps = d.fulfilment === "delivery" ? deliverySteps : pickupSteps,
    complete = d.step >= steps.length - 1,
    quantity = Math.max(1, Number(d.quantity) || 1),
    subtotal = d.price * quantity;
  return `<main class="screen deal-screen">${topbar("Deal Progress")}<div class="deal-steps"><div class="deal-listing"><img src="${escapeHtml(imagePath(l))}" alt=""><div><strong>${escapeHtml(l.title)}</strong><small>${escapeHtml(l.location)}</small></div></div><h2 style="font-size:20px;margin:0">${complete ? "Deal completed" : "Your deal is underway"}</h2><p class="muted small">Each stage below is simulated for the prototype.</p><div class="deal-meta"><span>Unit price</span><b>${money(d.price)} / ${escapeHtml(l.unit)}</b></div><div class="deal-meta"><span>Quantity</span><b>${quantity} ${escapeHtml(l.unit)}${quantity === 1 ? "" : "s"}</b></div><div class="deal-meta"><span>Material subtotal</span><b>${money(subtotal)}</b></div><div class="deal-meta"><span>${d.fulfilment === "delivery" ? "Example partner delivery quote" : "Self-arranged pickup"}</span><b>${money(d.deliveryFee)}</b></div><div class="deal-meta"><span>Total example amount</span><b>${money(subtotal + d.deliveryFee)}</b></div><div class="sheet-banner ${d.payMethod === "cash" ? "warning" : ""}">${d.payMethod === "cash" ? "Cash on pickup is outside payment protection. No funds are handled in this demo." : "Protected payment is simulated. The prototype holds no money and sends no real order."}</div><div class="timeline">${steps.map((s, i) => `<div class="timeline-item ${i < d.step ? "done" : i === d.step ? "current" : ""}"><span class="step-icon">${icon(i < d.step ? "check" : i === 2 && d.fulfilment === "delivery" ? "truck" : "info", 15)}</span><div><strong>${s}</strong><p>${i <= d.step ? "Demo stage reached" : "Waiting for the next demo step"}</p></div></div>`).join("")}</div></div><div class="deal-action">${complete ? `<button class="btn teal full" data-action="rate-deal">${d.reviewed ? "View Chats" : "Rate Transaction"}</button>` : `<button class="btn teal full" data-action="advance-deal">${d.step === steps.length - 2 ? "Confirm received materials" : "Advance demo status"} ${icon("arrow", 17)}</button>`}</div></main>`;
}
function sheetFrame(title, body, description = "") {
  return `<div class="sheet-scrim" data-action="close-sheet"></div><section class="sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><div class="sheet-handle"></div><button class="icon-btn close ghost" data-action="close-sheet" aria-label="Close">${icon("x")}</button><h2>${escapeHtml(title)}</h2>${description ? `<p>${description}</p>` : ""}${body}</section>`;
}
function renderSheet() {
  if (!ui.sheet) return "";
  const l = getListing(ui.selectedId),
    c = getChat(ui.chatId),
    available = listingAvailableQuantity(l),
    purchaseQuantity = Math.min(
      available,
      Math.max(1, Math.floor(Number(ui.quantity) || 1)),
    ),
    offerPrice = Number(ui.offerPrice || l.price),
    deliveryFee = ui.fulfilment === "delivery" ? 350 : 0;
  switch (ui.sheet) {
    case "filters":
      return sheetFrame(
        "Filter materials",
        `<form id="filters-form"><div class="form-group"><label class="field-label">Material category</label><select class="select-field" name="category">${["All", ...categories].map((x) => option(x, ui.category)).join("")}</select></div><div class="input-pair"><div class="form-group"><label class="field-label">Within</label><select class="select-field" name="distance">${["Any", "5", "10", "25", "50"].map((x) => `<option value="${x}" ${x === ui.distance ? "selected" : ""}>${x === "Any" ? "Any" : x + " km"}</option>`).join("")}</select></div><div class="form-group"><label class="field-label">Max ₱ / unit</label><input class="field" name="maxPrice" type="number" min="0" placeholder="Any" value="${escapeHtml(ui.maxPrice)}"></div></div><div class="form-group"><label class="field-label">Condition</label><select class="select-field" name="condition">${["All", ...conditions].map((x) => option(x, ui.condition)).join("")}</select></div><div class="sheet-actions"><button type="button" class="btn outline slim" data-action="clear-filters">Clear</button><button class="btn primary slim" type="submit">Show results</button></div></form>`,
        "Refine results from the demo materials catalog.",
      );
    case "sort":
      return sheetFrame(
        "Sort results",
        `<div class="option-list">${["Newest", "Nearest", "Lowest price", "Highest price"].map((x) => `<button class="option-row" style="width:100%;background:${ui.sort === x ? "#eff8f7" : "#fff"}" data-sort="${x}">${escapeHtml(x)} ${ui.sort === x ? icon("check", 18) : ""}</button>`).join("")}</div>`,
      );
    case "offer":
      return sheetFrame(
        "Make an offer",
        `<form id="offer-form"><div class="deal-listing"><img src="${escapeHtml(imagePath(l))}" alt=""><div><strong>${escapeHtml(l.title)}</strong><small>Asking ${money(l.price)} / ${escapeHtml(l.unit)} · ${escapeHtml(l.qty)} available</small></div></div><div class="input-pair"><div class="form-group"><label class="field-label" for="offer-price">Offer per ${escapeHtml(l.unit)} (₱)</label><input class="field" id="offer-price" name="price" type="number" min="1" step="1" value="${escapeHtml(offerPrice)}" required></div><div class="form-group"><label class="field-label" for="offer-quantity">Quantity</label><input class="field" id="offer-quantity" name="quantity" type="number" min="1" max="${available}" step="1" value="${purchaseQuantity}" required><small class="field-hint">Max ${available}</small></div></div><div class="purchase-summary"><div><span>Estimated material subtotal</span><b id="offer-subtotal">${money(offerPrice * purchaseQuantity)}</b></div></div><div class="form-group"><label class="field-label" for="offer-note">Message (optional)</label><textarea class="text-area" name="note" id="offer-note" placeholder="Ask about inspection or pickup timing"></textarea></div><button class="btn primary full" type="submit">Send offer</button><div class="sheet-banner">The seller reply and acceptance are simulated in this demo.</div></form>`,
      );
    case "checkout":
      return sheetFrame(
        "Arrange a deal",
        `<form id="checkout-form"><div class="deal-listing"><img src="${escapeHtml(imagePath(l))}" alt=""><div><strong>${escapeHtml(l.title)}</strong><small>${money(l.price)} / ${escapeHtml(l.unit)} · ${escapeHtml(l.qty)} available</small></div></div><div class="form-group"><label class="field-label" for="checkout-quantity">Quantity to buy</label><input class="field" id="checkout-quantity" name="quantity" type="number" min="1" max="${available}" step="1" value="${purchaseQuantity}" required><small class="field-hint">Choose up to ${available} ${escapeHtml(l.unit)}${available === 1 ? "" : "s"}.</small></div><div class="form-group"><label class="field-label">How will you get the materials?</label><label class="option-row"><input type="radio" name="fulfilment" value="pickup" ${ui.fulfilment === "pickup" ? "checked" : ""}><span class="option-copy"><b>Self-arranged pickup</b><small>Coordinate pickup with the seller in chat</small></span></label><label class="option-row"><input type="radio" name="fulfilment" value="delivery" ${ui.fulfilment === "delivery" ? "checked" : ""}><span class="option-copy"><b>Partner delivery · example ₱350</b><small>Illustrative quote and tracking only</small></span></label></div><div class="form-group"><label class="field-label">Payment method</label><label class="option-row"><input type="radio" name="payMethod" value="protected" ${ui.payMethod === "protected" ? "checked" : ""}><span class="option-copy"><b>Protected payment · demo</b><small>Shown as held until buyer confirmation</small></span></label><label class="option-row"><input type="radio" name="payMethod" value="cash" ${ui.payMethod === "cash" ? "checked" : ""}><span class="option-copy"><b>Cash on pickup</b><small>Outside payment protection</small></span></label></div><div class="purchase-summary"><div><span>Unit price</span><b>${money(l.price)}</b></div><div><span>Material subtotal</span><b id="checkout-subtotal">${money(l.price * purchaseQuantity)}</b></div><div><span>Delivery</span><b id="checkout-delivery">${deliveryFee ? money(deliveryFee) : "₱0"}</b></div><div class="purchase-total"><span>Total example amount</span><b id="checkout-total">${money(l.price * purchaseQuantity + deliveryFee)}</b></div></div><div class="sheet-banner warning">No payment, courier booking or shipment occurs. All amounts and status updates are illustrative.</div><button class="btn primary full" type="submit">Create demo deal</button></form>`,
      );
    case "location":
      return sheetFrame(
        "Set your location",
        `<form id="location-form"><div class="form-group"><label class="field-label" for="location-value">City or municipality, province</label><input class="field" id="location-value" name="location" value="${escapeHtml(data.user.location)}" placeholder="e.g. Tubigon, Bohol" required></div><button class="btn primary full">Continue</button></form>`,
        "We use your typed place to personalize the demo.",
      );
    case "chat-actions":
      return sheetFrame(
        "Conversation actions",
        `<button class="option-row" style="width:100%" data-sheet="offer">${icon("tag")} Make an offer</button><button class="option-row" style="width:100%" data-sheet="checkout">${icon("shield")} Start a demo deal</button><button class="option-row" style="width:100%" data-open-listing="${escapeHtml(c.listingId)}">${icon("info")} View listing</button>`,
      );
    case "chat-help":
      return sheetFrame(
        "Messages",
        `<div class="sheet-banner">Chat replies, offers and deal acceptance are examples for the prototype. Avoid sharing real payment details here.</div>`,
        "Ask sellers about material condition and coordinate inspection.",
      );
    case "business":
      return sheetFrame(
        "Business & Verification",
        `<div class="sheet-banner">Account verification: <b>demo badge</b>. No identity document is collected.</div><div class="sheet-banner">Premium visibility is an optional example feature. A paid tier is separate from seller identity verification.</div><button class="btn outline full" data-action="close-sheet">Got it</button>`,
      );
    case "payments":
      return sheetFrame(
        "Payment Methods",
        `<div class="sheet-banner">Protected payment and cash on pickup are demonstration options only. No card, bank or wallet information is stored.</div><button class="btn primary full" data-action="close-sheet">Done</button>`,
      );
    case "notifications":
      return sheetFrame(
        "Notifications",
        `<div class="sheet-banner">Your demo updates will appear in chat and deal progress. Push notifications are not connected.</div>`,
      );
    case "forgot":
      return sheetFrame(
        "Reset password",
        `<div class="sheet-banner">Demo login accepts any valid email and any password. No reset email will be sent.</div><button class="btn primary full" data-action="close-sheet">Back to login</button>`,
      );
    case "help":
      return sheetFrame(
        "Help Center",
        `<div class="sheet-banner">Explore search, filters, posting, chat, offers, pickup or delivery, the protected payment demonstration, and seller ratings. All demo data stays in this browser.</div>`,
      );
    case "settings":
      return sheetFrame(
        "Settings",
        `<button class="option-row" style="width:100%;background:#fff;text-align:left" data-sheet="location">${icon("pin")}<span class="option-copy"><b>Edit location</b><small>Change the place shown across the demo.</small></span></button>`,
      );
    case "reset":
      return sheetFrame(
        "Reset demo marketplace?",
        `<p>This restores the starter listings, chats, reviews, and saved items. Your signed-in profile stays in place for the next presentation.</p><div class="sheet-actions"><button class="btn outline" data-action="close-sheet">Cancel</button><button class="btn primary" data-action="reset-demo">Reset demo</button></div>`,
      );
    case "logout":
      return sheetFrame(
        "Log out?",
        `<p>You can sign in again with any email and password in this demo.</p><div class="sheet-actions"><button class="btn outline" data-action="close-sheet">Cancel</button><button class="btn primary" data-action="logout">Log out</button></div>`,
      );
    case "edit-profile":
      return sheetFrame(
        "Edit Profile",
        `<form id="profile-form"><div class="form-group"><label class="field-label">Name</label><input name="name" class="field" value="${escapeHtml(data.user.name)}" required></div><div class="form-group"><label class="field-label">Location</label><input name="location" class="field" value="${escapeHtml(data.user.location)}" required></div><button class="btn primary full">Save profile</button></form>`,
      );
    default:
      return "";
  }
}
const screens = {
  onboarding: renderOnboarding,
  login: renderLogin,
  signup: renderSignup,
  home: renderHome,
  search: renderSearch,
  detail: renderDetail,
  chats: renderChats,
  chat: renderChat,
  upload: renderUpload,
  confirmation: renderConfirmation,
  profile: renderProfile,
  "my-listings": renderMyListings,
  saved: renderSaved,
  rating: renderRating,
  deal: renderDeal,
};
function render() {
  app.innerHTML = (screens[ui.screen] || renderHome)();
  overlayRoot.innerHTML = renderSheet();
  renderCycleMate();
  const conversation = document.getElementById("conversation");
  if (conversation) conversation.scrollTop = conversation.scrollHeight;
}
function goto(screen, { replace = false } = {}) {
  if (!screens[screen]) return;
  if (!replace && screen !== ui.screen) ui.history.push(ui.screen);
  ui.screen = screen;
  ui.sheet = null;
  sheetTrigger = null;
  render();
}
function back() {
  if (ui.sheet) {
    closeSheet();
    return;
  }
  let previous = ui.history.pop();
  goto(previous || "home", { replace: true });
}
function showSheet(name, trigger = null) {
  if (!ui.sheet) sheetTrigger = trigger || document.activeElement;
  ui.sheet = name;
  overlayRoot.innerHTML = renderSheet();
  document.querySelector(".sheet .close")?.focus();
}
function closeSheet() {
  const trigger = sheetTrigger;
  ui.sheet = null;
  sheetTrigger = null;
  overlayRoot.replaceChildren();
  if (trigger && typeof trigger.focus === "function") trigger.focus();
}
function refreshPurchaseTotals() {
  const listing = getListing(ui.selectedId);
  if (!listing) return;
  const available = listingAvailableQuantity(listing);
  const quantityInput = document.getElementById(
    ui.sheet === "offer" ? "offer-quantity" : "checkout-quantity",
  );
  const rawQuantity = Number(quantityInput?.value ?? ui.quantity);
  const quantity = Math.min(
    available,
    Math.max(1, Math.floor(Number.isFinite(rawQuantity) ? rawQuantity : 1)),
  );
  ui.quantity = quantity;

  const offerPriceInput = document.getElementById("offer-price");
  const rawPrice = Number(offerPriceInput?.value ?? ui.offerPrice ?? listing.price);
  const price = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : listing.price;
  if (offerPriceInput) ui.offerPrice = offerPriceInput.value;

  const offerSubtotal = document.getElementById("offer-subtotal");
  if (offerSubtotal) offerSubtotal.textContent = money(price * quantity);

  const checkoutSubtotal = document.getElementById("checkout-subtotal");
  const checkoutDelivery = document.getElementById("checkout-delivery");
  const checkoutTotal = document.getElementById("checkout-total");
  const deliveryFee = ui.fulfilment === "delivery" ? 350 : 0;
  if (checkoutSubtotal)
    checkoutSubtotal.textContent = money(listing.price * quantity);
  if (checkoutDelivery)
    checkoutDelivery.textContent = deliveryFee ? money(deliveryFee) : "₱0";
  if (checkoutTotal)
    checkoutTotal.textContent = money(listing.price * quantity + deliveryFee);
}
function currentChatFor(listing) {
  let c = data.chats.find((x) => x.listingId === listing.id);
  if (!c) {
    c = {
      id: "chat-" + Date.now(),
      name: listing.mine ? "Demo Buyer" : listing.seller,
      listingId: listing.id,
      type: listing.mine ? "selling" : "buying",
      last: "Conversation started",
      time: "Now",
      online: true,
      messages: [
        {
          mine: false,
          text: "Hi! Thanks for your interest. Feel free to ask about the materials.",
          time: "Now",
        },
      ],
    };
    data.chats.unshift(c);
    persist();
  }
  return c;
}
function openListing(id) {
  if (!data.listings.some((l) => l.id === id)) return;
  ui.selectedId = id;
  ui.quantity = 1;
  ui.offerPrice = "";
  goto("detail");
}
function startChat(listing) {
  const c = currentChatFor(listing);
  ui.chatId = c.id;
  goto("chat");
}
function startDeal(
  listing,
  {
    price = listing.price,
    quantity = 1,
    fulfilment = "pickup",
    payMethod = "protected",
    chatId = null,
  } = {},
) {
  const dealQuantity = Math.min(
    listingAvailableQuantity(listing),
    Math.max(1, Math.floor(Number(quantity) || 1)),
  );
  const previous = data.deals.find(
    (d) =>
      d.listingId === listing.id &&
      d.chatId === chatId &&
      Math.max(1, Number(d.quantity) || 1) === dealQuantity &&
      d.step <
        (d.fulfilment === "delivery" ? deliverySteps : pickupSteps).length - 1,
  );
  if (previous) {
    ui.dealId = previous.id;
    goto("deal");
    return;
  }
  const d = {
    id: "deal-" + Date.now(),
    listingId: listing.id,
    chatId,
    price: Number(price),
    quantity: dealQuantity,
    fulfilment,
    payMethod,
    deliveryFee: fulfilment === "delivery" ? 350 : 0,
    step: 0,
    reviewed: false,
  };
  data.deals.unshift(d);
  ui.dealId = d.id;
  persist();
  goto("deal");
}
document.addEventListener("click", async (event) => {
  const el = event.target.closest(
    "button,[data-action],[data-go],[data-sheet],[data-save],[data-open-listing],[data-open-chat],[data-condition],[data-review-tag],[data-star],[data-my-tab],[data-chat-tab],[data-sort],[data-edit],[data-support-action],[data-support-listing],[data-support-category],[data-support-dismiss]",
  );
  if (!el) return;
  if (Object.prototype.hasOwnProperty.call(el.dataset, "supportDismiss")) {
    closeCycleMate();
    return;
  }
  if (el.dataset.supportListing) {
    closeCycleMate({ restoreFocus: false });
    openListing(el.dataset.supportListing);
    return;
  }
  if (el.dataset.supportCategory) {
    handleCycleMateCategory(el.dataset.supportCategory);
    return;
  }
  if (el.dataset.supportAction) {
    handleCycleMateAction(el.dataset.supportAction);
    return;
  }
  if (el.dataset.action === "close-sheet") {
    closeSheet();
    return;
  }
  if (el.dataset.sheet) {
    if (el.dataset.sheet === "offer" || el.dataset.sheet === "checkout") {
      if (ui.screen === "chat") ui.selectedId = getChat(ui.chatId).listingId;
      if (getListing(ui.selectedId).mine) {
        toast(
          "This is your own listing. Use another listing for a buyer demo.",
        );
        return;
      }
    }
    if (["offer", "checkout"].includes(el.dataset.sheet)) {
      const contextualOffer = ui.screen === "chat" ? getChat(ui.chatId).offer : null;
      ui.quantity = Math.min(
        listingAvailableQuantity(getListing(ui.selectedId)),
        Math.max(1, Math.floor(Number(contextualOffer?.quantity) || 1)),
      );
      if (contextualOffer?.price) ui.offerPrice = contextualOffer.price;
    }
    showSheet(el.dataset.sheet, el);
    return;
  }
  if (el.dataset.go) {
    if (el.dataset.go === "upload") {
      ui.editId = null;
      ui.photo = null;
      ui.draft = {};
      ui.premium = false;
    }
    goto(el.dataset.go);
    return;
  }
  if (el.dataset.openListing) {
    openListing(el.dataset.openListing);
    return;
  }
  if (el.dataset.openChat) {
    ui.chatId = el.dataset.openChat;
    ui.selectedId = getChat(ui.chatId).listingId;
    goto("chat");
    return;
  }
  if (el.dataset.save) {
    let id = el.dataset.save;
    data.saved = data.saved.includes(id)
      ? data.saved.filter((x) => x !== id)
      : [...data.saved, id];
    persist();
    render();
    toast(
      data.saved.includes(id)
        ? "Saved to your items"
        : "Removed from saved items",
    );
    return;
  }
  if (el.dataset.edit) {
    ui.editId = el.dataset.edit;
    ui.draft = {};
    ui.photo = null;
    goto("upload");
    return;
  }
  if (el.dataset.condition) {
    ui.draft.condition = el.dataset.condition;
    document.querySelector('input[name="condition"]').value =
      el.dataset.condition;
    document
      .querySelectorAll("[data-condition]")
      .forEach((x) =>
        x.classList.toggle(
          "selected",
          x.dataset.condition === el.dataset.condition,
        ),
      );
    return;
  }
  if (el.dataset.myTab) {
    ui.myTab = el.dataset.myTab;
    render();
    return;
  }
  if (el.dataset.chatTab) {
    ui.chatTab = el.dataset.chatTab;
    render();
    return;
  }
  if (el.dataset.sort) {
    ui.sort = el.dataset.sort;
    ui.sheet = null;
    render();
    return;
  }
  if (el.dataset.star) {
    ui.rating = Number(el.dataset.star);
    render();
    return;
  }
  if (el.dataset.reviewTag) {
    ui.reviewTags = ui.reviewTags.includes(el.dataset.reviewTag)
      ? ui.reviewTags.filter((x) => x !== el.dataset.reviewTag)
      : [...ui.reviewTags, el.dataset.reviewTag];
    el.classList.toggle("selected");
    return;
  }
  if (!el.dataset.action) return;
  const action = el.dataset.action;
  if (action === "back") {
    back();
    return;
  }
  if (action === "onboard-skip") {
    data.onboarded = true;
    persist();
    goto("login");
    return;
  }
  if (action === "enable-location") {
    data.onboarded = true;
    persist();
    goto("login");
    toast(`Demo location: ${data.user.location}`);
    return;
  }
  if (action === "toggle-password") {
    let x = document.getElementById("login-pass");
    x.type = x.type === "password" ? "text" : "password";
    return;
  }
  if (action === "social") {
    toast("Social sign-in is illustrative. Use the email demo login.");
    return;
  }
  if (action === "try-web") {
    persist();
    window.location.assign("BuildCycle_Web.html");
    return;
  }
  if (action === "share") {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}${location.pathname}#listing=${encodeURIComponent(ui.selectedId)}`,
      );
      toast("Listing link copied");
    } catch {
      toast("Copy this page URL to share the demo.");
    }
    return;
  }
  if (action === "message-seller") {
    let l = getListing(ui.selectedId);
    if (l.mine) {
      toast("Open another seller’s listing to message them.");
      return;
    }
    startChat(l);
    return;
  }
  if (action === "chat-search") {
    ui.chatSearchOpen = !ui.chatSearchOpen;
    if (!ui.chatSearchOpen) ui.chatSearch = "";
    render();
    document.getElementById("chat-search-input")?.focus();
    return;
  }
  if (action === "clear-chat-search") {
    ui.chatSearchOpen = false;
    ui.chatSearch = "";
    render();
    return;
  }
  if (action === "accept-offer") {
    let c = getChat(ui.chatId);
    c.offer.status = "accepted";
    c.messages.push({
      mine: false,
      text: "Your offer is accepted! Let’s arrange pickup or delivery.",
      time: "Now",
    });
    persist();
    render();
    toast("Demo seller accepted your offer");
    return;
  }
  if (action === "start-deal") {
    let c = getChat(ui.chatId);
    startDeal(getListing(c.listingId), {
      price: c.offer?.price,
      quantity: c.offer?.quantity || 1,
      fulfilment: c.offer?.fulfilment || "pickup",
      chatId: c.id,
    });
    return;
  }
  if (action === "view-deal") {
    let d = data.deals.find((x) => x.chatId === ui.chatId);
    if (d) {
      ui.dealId = d.id;
      goto("deal");
    }
    return;
  }
  if (action === "clear-filters") {
    ui.category = "All";
    ui.condition = "All";
    ui.distance = "Any";
    ui.maxPrice = "";
    ui.sheet = null;
    render();
    return;
  }
  if (action === "reset-search") {
    ui.search = "";
    ui.sort = "Newest";
    ui.category = "All";
    ui.condition = "All";
    ui.distance = "Any";
    ui.maxPrice = "";
    ui.sheet = null;
    render();
    document.getElementById("search-input")?.focus();
    return;
  }
  if (action === "remove-photo") {
    ui.photo = null;
    if (ui.editId) ui.draft.imageRemoved = true;
    render();
    return;
  }
  if (action === "ai-suggest") {
    const form = document.getElementById("upload-form"),
      cat = form.elements.category.value,
      title = form.elements.title.value.trim(),
      listingLocation = form.elements.location.value.trim() || data.user.location;
    const suggestion = `${title || "Surplus " + cat.toLowerCase()} available in ${listingLocation}. Available for local inspection and pickup. Please ask for measurements, quantity details, and collection schedule before confirming your purchase.`;
    form.elements.description.value = suggestion;
    ui.draft.description = suggestion;
    ui.aiSuggested = true;
    toast("Example description added. Edit it before posting.");
    return;
  }
  if (action === "mark-sold" || action === "reactivate") {
    let l = getListing(el.dataset.id);
    l.status = action === "mark-sold" ? "sold" : "active";
    persist();
    render();
    toast(
      action === "mark-sold" ? "Listing moved to Sold" : "Listing active again",
    );
    return;
  }
  if (action === "advance-deal") {
    const dealTimeline = document.querySelector(".deal-steps");
    const previousScrollTop = dealTimeline?.scrollTop || 0;
    let d = data.deals.find((x) => x.id === ui.dealId);
    let steps = d.fulfilment === "delivery" ? deliverySteps : pickupSteps;
    d.step = Math.min(d.step + 1, steps.length - 1);
    persist();
    render();
    const updatedTimeline = document.querySelector(".deal-steps");
    if (updatedTimeline) updatedTimeline.scrollTop = previousScrollTop;
    if (d.step === steps.length - 1)
      toast("Demo deal completed · you can rate the seller");
    return;
  }
  if (action === "rate-deal") {
    let d = data.deals.find((x) => x.id === ui.dealId);
    if (d.reviewed) {
      goto("chats");
      return;
    }
    ui.rating = 0;
    ui.reviewTags = [];
    goto("rating");
    return;
  }
  if (action === "submit-rating") {
    let d = data.deals.find((x) => x.id === ui.dealId);
    if (!ui.rating) {
      toast("Choose a star rating first.");
      return;
    }
    data.reviews.push({
      dealId: d.id,
      rating: ui.rating,
      tags: [...ui.reviewTags],
      text: document.getElementById("review-text").value.trim(),
    });
    d.reviewed = true;
    persist();
    goto("profile");
    toast("Thank you for the demo review!");
    return;
  }
  if (action === "logout") {
    data.authed = false;
    persist();
    ui.history = [];
    goto("login", { replace: true });
    return;
  }
  if (action === "reset-demo") {
    const profile = structuredClone(data.user);
    data = freshState();
    data.onboarded = true;
    data.authed = true;
    data.user = profile;
    persist();
    ui = {
      screen: "home",
      history: [],
      sheet: null,
      selectedId: "lumber",
      chatId: "marcus",
      search: "",
      sort: "Newest",
      category: "All",
      condition: "All",
      distance: "Any",
      maxPrice: "",
      chatTab: "All Chats",
      chatSearchOpen: false,
      chatSearch: "",
      myTab: "Active",
      photo: null,
      draft: {},
      editId: null,
      aiSuggested: false,
      premium: false,
      offerPrice: "",
      quantity: 1,
      fulfilment: "pickup",
      payMethod: "protected",
      dealId: null,
      rating: 0,
      reviewTags: [],
      loginError: "",
      signupError: "",
      listingError: "",
    };
    render();
    toast("Demo marketplace restored");
    return;
  }
});
document.addEventListener("pointerdown", (event) => {
  const fab = event.target.closest?.(".support-fab");
  if (!fab || (event.pointerType === "mouse" && event.button !== 0)) return;
  const bounds = cycleMateBounds();
  const position = resolvedCycleMatePosition();
  supportDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: event.clientX - bounds.left - position.x,
    offsetY: event.clientY - bounds.top - position.y,
    moved: false,
    fab,
  };
  fab.classList.add("dragging");
  try {
    fab.setPointerCapture?.(event.pointerId);
  } catch {
    /* Synthetic pointer events may not create browser capture. */
  }
});
document.addEventListener("pointermove", (event) => {
  if (!supportDrag || event.pointerId !== supportDrag.pointerId) return;
  const bounds = cycleMateBounds();
  const maxX = Math.max(10, bounds.width - 70);
  const maxY = Math.max(10, bounds.height - 145);
  if (
    Math.hypot(
      event.clientX - supportDrag.startX,
      event.clientY - supportDrag.startY,
    ) > 5
  )
    supportDrag.moved = true;
  supportPosition = {
    x: Math.min(
      maxX,
      Math.max(10, event.clientX - bounds.left - supportDrag.offsetX),
    ),
    y: Math.min(
      maxY,
      Math.max(10, event.clientY - bounds.top - supportDrag.offsetY),
    ),
  };
  applyCycleMateLayout();
  event.preventDefault();
});
function finishCycleMateDrag(event) {
  if (!supportDrag || event.pointerId !== supportDrag.pointerId) return;
  supportDrag.fab.classList.remove("dragging");
  try {
    if (supportDrag.fab.hasPointerCapture?.(event.pointerId))
      supportDrag.fab.releasePointerCapture(event.pointerId);
  } catch {
    /* The pointer may already have been released by the browser. */
  }
  suppressSupportOpen = supportDrag.moved;
  if (suppressSupportOpen)
    setTimeout(() => {
      suppressSupportOpen = false;
    }, 300);
  supportDrag = null;
  try {
    localStorage.setItem(SUPPORT_POSITION_KEY, JSON.stringify(supportPosition));
  } catch {
    /* Position persistence is optional. */
  }
}
document.addEventListener("pointerup", finishCycleMateDrag);
document.addEventListener("pointercancel", finishCycleMateDrag);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && supportState.open) {
    event.preventDefault();
    closeCycleMate();
    return;
  }
  if (event.key === "Escape" && ui.sheet) {
    event.preventDefault();
    closeSheet();
  }
});
window.addEventListener("resize", applyCycleMateLayout);
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    data = hydrateState(JSON.parse(event.newValue));
    if (!data.onboarded) ui.screen = "onboarding";
    else if (!data.authed) ui.screen = "login";
    else if (["onboarding", "login", "signup"].includes(ui.screen))
      ui.screen = "home";
    render();
    toast("Demo data updated from another BuildCycle tab");
  } catch {
    /* Ignore malformed external storage events. */
  }
});
document.addEventListener("input", (event) => {
  const el = event.target;
  if (el.id === "search-input") {
    ui.search = el.value;
    const results = document.getElementById("search-results");
    if (results) results.innerHTML = resultsMarkup();
    return;
  }
  if (el.id === "chat-search-input") {
    ui.chatSearch = el.value;
    const chats = document.getElementById("chat-list");
    if (chats) chats.innerHTML = chatListMarkup();
    return;
  }
  if (
    ["offer-price", "offer-quantity", "checkout-quantity"].includes(el.id)
  ) {
    refreshPurchaseTotals();
    return;
  }
  if (el.closest("#upload-form") && el.name && el.name !== "photo") {
    ui.draft[el.name] = el.value;
  }
});
document.addEventListener("change", (event) => {
  const el = event.target;
  if (el.id === "upload-photo" && el.files?.[0]) {
    const file = el.files[0];
    if (!file.type.startsWith("image/")) {
      toast("Choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas"),
          scale = Math.min(1, 960 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas
          .getContext("2d")
          .drawImage(img, 0, 0, canvas.width, canvas.height);
        ui.photo = canvas.toDataURL("image/jpeg", 0.75);
        render();
        toast("Photo added to your listing");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    return;
  }
  if (el.name === "premium") {
    ui.premium = el.checked;
    return;
  }
  if (el.closest("#checkout-form") && el.name === "fulfilment") {
    ui.fulfilment = el.value;
    refreshPurchaseTotals();
  }
  if (el.closest("#checkout-form") && el.name === "payMethod")
    ui.payMethod = el.value;
});
document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!form.id) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  if (form.id === "login-form") {
    data.authed = true;
    data.onboarded = true;
    data.user.email = String(values.email).trim();
    persist();
    ui.history = [];
    goto("home", { replace: true });
    toast("Welcome to the BuildCycle demo");
    return;
  }
  if (form.id === "signup-form") {
    data.authed = true;
    data.onboarded = true;
    data.user = {
      name: String(values.name).trim(),
      email: String(values.email).trim(),
      location: String(values.location).trim(),
    };
    persist();
    ui.history = [];
    goto("home", { replace: true });
    toast("Demo account ready");
    return;
  }
  if (form.id === "location-form") {
    data.user.location = String(values.location).trim();
    data.onboarded = true;
    persist();
    if (ui.screen === "onboarding") goto("login");
    else {
      ui.sheet = null;
      render();
    }
    return;
  }
  if (form.id === "filters-form") {
    ui.category = values.category;
    ui.distance = values.distance;
    ui.maxPrice = values.maxPrice;
    ui.condition = values.condition;
    ui.sheet = null;
    if (ui.screen === "home") render();
    else goto("search");
    return;
  }
  if (form.id === "profile-form") {
    data.user.name = String(values.name).trim();
    data.user.location = String(values.location).trim();
    persist();
    ui.sheet = null;
    render();
    toast("Profile updated");
    return;
  }
  if (form.id === "upload-form") {
    const price = Number(values.price),
      title = String(values.title || "").trim(),
      desc = String(values.description || "").trim();
    if (!title || !desc || !Number.isFinite(price) || price <= 0) {
      ui.listingError = "Add a title, description and valid peso price.";
      render();
      return;
    }
    const existing = ui.editId ? getListing(ui.editId) : null;
    const category = String(values.category);
    const fallback = {
      Lumber: "lumber.png",
      Tiles: "tiles.png",
      "Steel & Metal": "rebar.png",
      "Cement & Concrete": "blocks.png",
      Electrical: "wire.png",
      Other: "logo.png",
    }[category];
    const l = {
      ...(existing || {}),
      id: existing?.id || "listing-" + Date.now(),
      title,
      category,
      condition: String(values.condition),
      tag: String(values.condition),
      price,
      unit: String(values.unit),
      qty: String(values.qty).trim(),
      availableQty: listingAvailableQuantity({ qty: values.qty }),
      location: String(values.location).trim(),
      distance: existing?.distance || 0,
      image:
        ui.photo ||
        (existing && !ui.draft.imageRemoved ? existing.image : fallback),
      seller: data.user.name,
      rating: "New",
      description: desc,
      specs: [
        ["QUANTITY", String(values.qty).trim()],
        ["CATEGORY", category],
        ["LOCATION", String(values.location).trim()],
        ["CONDITION", String(values.condition)],
      ],
      mine: true,
      status: existing?.status === "sold" ? "sold" : "active",
      premium: ui.premium,
    };
    if (existing) Object.assign(existing, l);
    else data.listings.unshift(l);
    persist();
    ui.selectedId = l.id;
    ui.editId = null;
    ui.draft = {};
    ui.photo = null;
    ui.premium = false;
    ui.listingError = "";
    goto("confirmation");
    return;
  }
  if (form.id === "chat-form") {
    const message = String(values.message || "").trim();
    if (!message) return;
    const c = getChat(ui.chatId);
    c.messages.push({
      mine: true,
      text: message,
      time: new Date().toLocaleTimeString("en-PH", {
        hour: "numeric",
        minute: "2-digit",
      }),
    });
    c.last = message;
    c.time = "Now";
    persist();
    render();
    return;
  }
  if (form.id === "offer-form") {
    let l = getListing(ui.selectedId),
      price = Number(values.price),
      quantity = Math.floor(Number(values.quantity));
    if (price <= 0 || !Number.isFinite(price)) {
      toast("Enter a valid peso amount.");
      return;
    }
    if (
      !Number.isFinite(quantity) ||
      quantity < 1 ||
      quantity > listingAvailableQuantity(l)
    ) {
      toast(`Choose between 1 and ${listingAvailableQuantity(l)} units.`);
      return;
    }
    const c = currentChatFor(l);
    c.offer = { price, quantity, fulfilment: "pickup", status: "pending" };
    c.messages.push({
      mine: true,
      text: `I would like to offer ${money(price)} per ${l.unit} for ${quantity} ${l.unit}${quantity === 1 ? "" : "s"}. ${String(values.note || "").trim()}`.trim(),
      time: "Now",
    });
    c.last = "Offer sent";
    c.time = "Now";
    ui.chatId = c.id;
    ui.offerPrice = "";
    persist();
    goto("chat");
    toast("Demo offer sent. Tap Accept offer to continue.");
    return;
  }
  if (form.id === "checkout-form") {
    let l = getListing(ui.selectedId),
      quantity = Math.floor(Number(values.quantity));
    if (
      !Number.isFinite(quantity) ||
      quantity < 1 ||
      quantity > listingAvailableQuantity(l)
    ) {
      toast(`Choose between 1 and ${listingAvailableQuantity(l)} units.`);
      return;
    }
    startDeal(l, {
      quantity,
      fulfilment: values.fulfilment,
      payMethod: values.payMethod,
      chatId: ui.screen === "chat" ? ui.chatId : null,
    });
    return;
  }
});
if (location.hash.startsWith("#listing=")) {
  const id = decodeURIComponent(location.hash.slice(9));
  if (data.listings.some((x) => x.id === id)) {
    ui.selectedId = id;
    ui.screen = "detail";
  }
}
render();
