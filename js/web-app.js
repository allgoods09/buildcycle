/* BuildCycle desktop client. It shares demo data and browser storage with the mobile prototype. */
const webMoney = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
const webEscape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );

function hydrateWebState(value) {
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

let webStored;
try {
  webStored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
} catch {
  webStored = null;
}
let webData = hydrateWebState(webStored);
let webUI = {
  view: webData.onboarded ? (webData.authed ? "home" : "login") : "welcome",
  selectedId: "lumber",
  chatId: "marcus",
  query: "",
  category: "All",
  condition: "All",
  distance: "Any",
  maxPrice: "",
  sort: "Newest",
  chatTab: "All Chats",
  chatSearch: "",
  dialog: null,
  quantity: 1,
  fulfilment: "pickup",
  payMethod: "protected",
  dealId: null,
  rating: 0,
  reviewTags: [],
  photo: null,
  editId: null,
  premium: false,
};

const webApp = document.getElementById("web-app");
const webDialogRoot = document.getElementById("web-dialog-root");
const webToastRoot = document.getElementById("web-toast-root");
let webToastTimer;
let webDialogTrigger = null;

function persistWeb() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(webData));
  } catch (error) {
    console.warn("BuildCycle demo storage is unavailable:", error);
  }
}
if (webStored) persistWeb();

function webToast(message) {
  clearTimeout(webToastTimer);
  webToastRoot.innerHTML = `<div class="toast">${webEscape(message)}</div>`;
  webToastTimer = setTimeout(() => webToastRoot.replaceChildren(), 3000);
}

function webIcon(name, size = 20) {
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    search: '<circle cx="10.8" cy="10.8" r="7"/><path d="m16 16 5 5"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a8.5 8.5 0 1 1 16.1-4z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
    user: '<circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
    heart: '<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
    tag: '<path d="M3 4h8l10 10-7 7L4 11z"/><circle cx="8" cy="8" r="1"/>',
    x: '<path d="M5 5l14 14M19 5 5 19"/>',
    arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
    back: '<path d="m14 5-7 7 7 7"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    shield: '<path d="M12 2 21 6v6c0 6-4 9-9 10-5-1-9-4-9-10V6z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10zM10 21h4"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    logout: '<path d="M10 3H4v18h6m4-13 5 4-5 4M8 12h11"/>',
    card: '<rect x="2" y="5" width="20" height="15" rx="2"/><path d="M2 10h20"/>',
    camera: '<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="3"/>',
    spark: '<path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>',
    star: '<path d="m12 2 3 6.3 7 .9-5 4.9 1.2 7L12 17.7 5.8 21 7 14.1 2 9.2l7-.9z"/>',
    edit: '<path d="m4 17-.5 4L8 20l11-11-4-4L4 17zM13 7l4 4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    send: '<path d="m3 20 19-8L3 4l2 7 9 1-9 1z"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`;
}

function webInitials(name) {
  return String(name || "BC")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}
function webAvatar(name, large = false, online = false) {
  return `<span class="avatar ${large ? "large" : ""} ${online ? "online" : ""}">${webEscape(webInitials(name))}</span>`;
}
function webImage(listing) {
  return listing?.image?.startsWith("data:")
    ? listing.image
    : ASSET + (listing?.image || "lumber.png");
}
function webListing(id) {
  return webData.listings.find((listing) => listing.id === id) || webData.listings[0];
}
function webChat(id) {
  return webData.chats.find((chat) => chat.id === id) || webData.chats[0];
}
function webBadge(tag) {
  const type = /surplus|discount/i.test(tag)
    ? "orange"
    : /new/i.test(tag)
      ? "navy"
      : "";
  return `<span class="pill ${type}">${webEscape(tag)}</span>`;
}

const webCategories = [
  "Lumber",
  "Tiles",
  "Steel & Metal",
  "Cement & Concrete",
  "Electrical",
  "Other",
];
const webConditions = [
  "Reclaimed",
  "Unused surplus",
  "New",
  "Like new",
  "Industrial",
  "Discounted",
];
const webPickupSteps = [
  "Deal created",
  "Seller preparing materials",
  "Pickup arranged",
  "Materials received",
  "Buyer confirmed · payment released",
];
const webDeliverySteps = [
  "Deal created",
  "Seller preparing materials",
  "Partner pickup assigned",
  "In transit",
  "Materials received",
  "Buyer confirmed · payment released",
];

function pageHeading(title, description, actions = "") {
  return `<header class="page-heading"><div><p class="eyebrow">BuildCycle marketplace</p><h1>${webEscape(title)}</h1><p>${webEscape(description)}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ""}</header>`;
}

function navItems() {
  return [
    ["home", "Home", "home"],
    ["search", "Search", "search"],
    ["sell", "Sell Materials", "plus"],
    ["chats", "Messages", "chat"],
    ["profile", "Profile", "user"],
  ];
}
function activeNav() {
  if (["detail", "saved"].includes(webUI.view)) return "search";
  if (["my-listings"].includes(webUI.view)) return "profile";
  if (["deal", "rating"].includes(webUI.view)) return "chats";
  return webUI.view;
}
function webSidebar() {
  const active = activeNav();
  return `<aside class="web-sidebar"><nav class="side-nav" aria-label="Main navigation">${navItems()
    .map(
      ([view, label, icon]) =>
        `<button class="${active === view ? "active" : ""}" data-web-go="${view}">${webIcon(icon, 20)}<span>${label}</span>${view === "chats" && webData.chats.length ? `<span class="nav-count">${webData.chats.length}</span>` : ""}${view === "profile" && webData.saved.length ? `<span class="nav-count">${webData.saved.length}</span>` : ""}</button>`,
    )
    .join("")}</nav><div class="side-card"><strong>Prototype mode</strong><p>Accounts, AI assistance, payments, delivery and notifications are simulated. Mobile and web use the same local demo data.</p></div></aside>`;
}
function mobileWebNav() {
  const active = activeNav();
  return `<nav class="mobile-web-nav" aria-label="Compact navigation">${navItems()
    .map(
      ([view, label, icon]) =>
        `<button class="${active === view ? "active" : ""}" data-web-go="${view}">${webIcon(icon, 20)}${label}</button>`,
    )
    .join("")}</nav>`;
}
function webShell(content) {
  return `<div class="web-shell"><header class="web-header"><button class="web-brand" data-web-go="home"><img src="assets/logo.png" alt=""><span>BuildCycle</span></button><form id="global-search-form" class="global-search">${webIcon("search", 18)}<input name="query" value="${webEscape(webUI.query)}" placeholder="Search materials, categories, or locations" aria-label="Search marketplace"></form><span class="header-spacer"></span><span class="header-location">${webIcon("pin", 16)}${webEscape(webData.user.location)}</span><button class="web-btn small" data-web-go="sell">${webIcon("plus", 16)} Sell material</button><button class="header-profile" data-web-go="profile">${webAvatar(webData.user.name)}<span><b>${webEscape(webData.user.name)}</b><small>Demo account</small></span></button></header><div class="web-layout">${webSidebar()}<main class="web-main">${content}</main></div>${mobileWebNav()}</div>`;
}

function listingCard(listing) {
  const saved = webData.saved.includes(listing.id);
  return `<article class="listing-card"><button class="icon-button save-button ${saved ? "saved" : ""}" data-web-save="${webEscape(listing.id)}" aria-label="${saved ? "Remove from saved items" : "Save listing"}" aria-pressed="${saved}">${webIcon("heart", 18)}</button><button class="listing-open" data-web-listing="${webEscape(listing.id)}"><img class="listing-image" src="${webEscape(webImage(listing))}" alt="${webEscape(listing.title)}"><span class="listing-copy">${webBadge(listing.tag)}<h3>${webEscape(listing.title)}</h3><span class="listing-price">${webMoney(listing.price)} <small>/ ${webEscape(listing.unit)}</small></span><span class="listing-meta">${webIcon("pin", 12)}${webEscape(listing.distance)} km · ${webEscape(listing.location)}</span></span></button></article>`;
}

function filteredWebListings() {
  let listings = webData.listings.filter((listing) => listing.status !== "sold");
  const term = webUI.query.trim().toLowerCase();
  if (term) {
    listings = listings.filter((listing) =>
      `${listing.title} ${listing.category} ${listing.description} ${listing.location}`
        .toLowerCase()
        .includes(term),
    );
  }
  if (webUI.category !== "All")
    listings = listings.filter(
      (listing) => listing.category === webUI.category,
    );
  if (webUI.condition !== "All")
    listings = listings.filter(
      (listing) => listing.condition === webUI.condition,
    );
  if (webUI.distance !== "Any")
    listings = listings.filter(
      (listing) => Number(listing.distance) <= Number(webUI.distance),
    );
  if (webUI.maxPrice)
    listings = listings.filter(
      (listing) => Number(listing.price) <= Number(webUI.maxPrice),
    );
  if (webUI.sort === "Lowest price")
    listings.sort((a, b) => a.price - b.price);
  else if (webUI.sort === "Highest price")
    listings.sort((a, b) => b.price - a.price);
  else if (webUI.sort === "Nearest")
    listings.sort((a, b) => a.distance - b.distance);
  else listings = [...listings].reverse();
  return listings;
}

function renderWebHome() {
  const featured = webData.listings
    .filter((listing) => !listing.mine && listing.status !== "sold")
    .slice(0, 6);
  const chats = webData.chats.slice(0, 3);
  return webShell(
    `${pageHeading("Marketplace", `Surplus materials near ${webData.user.location}.`, `<button class="web-btn outline" data-web-go="saved">${webIcon("heart", 17)} Saved items (${webData.saved.length})</button>`)}` +
      `<section class="hero"><div class="hero-copy"><p class="eyebrow">Build more, waste less</p><h2>Useful materials deserve another project.</h2><p>Find nearby construction surplus, inspect the details, agree with the seller, and keep materials in circulation.</p><button class="web-btn teal" data-web-go="search">Browse all materials ${webIcon("arrow", 17)}</button></div><div class="hero-visual"><img src="assets/logo.png" alt="BuildCycle"></div></section>` +
      `<div class="home-columns"><div><div class="section-heading"><h2>Featured nearby</h2><button class="web-btn ghost small" data-web-go="search">View marketplace ${webIcon("arrow", 15)}</button></div><div class="listing-grid">${featured.map(listingCard).join("")}</div></div><aside class="home-aside"><div><div class="section-heading"><h2>Recent messages</h2></div><section class="panel activity-card">${chats
        .map(
          (chat) =>
            `<button class="activity-row" data-web-chat="${webEscape(chat.id)}">${webAvatar(chat.name, false, chat.online)}<span><b>${webEscape(chat.name)}</b><small>${webEscape(chat.last)}</small></span><small>${webEscape(chat.time)}</small></button>`,
        )
        .join("")}</section></div><div><div class="section-heading"><h2>Your activity</h2></div><section class="panel activity-card"><button class="activity-row" data-web-go="my-listings">${webIcon("tag", 20)}<span><b>${webData.listings.filter((listing) => listing.mine).length} listings</b><small>Manage active and sold materials</small></span></button><button class="activity-row" data-web-go="saved">${webIcon("heart", 20)}<span><b>${webData.saved.length} saved</b><small>Materials kept for later</small></span></button><button class="activity-row" data-web-go="chats">${webIcon("chat", 20)}<span><b>${webData.chats.length} conversations</b><small>Offers and pickup arrangements</small></span></button></section></div></aside></div>`,
  );
}

function renderWebSearch() {
  const listings = filteredWebListings();
  const options = (values, current) =>
    values
      .map(
        (value) =>
          `<option value="${webEscape(value)}" ${value === current ? "selected" : ""}>${webEscape(value)}</option>`,
      )
      .join("");
  return webShell(
    `${pageHeading("Search materials", "Browse the same live demo catalog available in the mobile prototype.")}` +
      `<div class="search-layout"><form id="web-filter-form" class="panel filter-panel"><h2>Filters</h2><div class="field-group"><label class="field-label" for="web-category">Material category</label><select id="web-category" class="select" name="category">${options(["All", ...webCategories], webUI.category)}</select></div><div class="field-group"><label class="field-label" for="web-condition">Condition</label><select id="web-condition" class="select" name="condition">${options(["All", ...webConditions], webUI.condition)}</select></div><div class="field-group"><label class="field-label" for="web-distance">Distance</label><select id="web-distance" class="select" name="distance">${["Any", "5", "10", "25", "50"].map((value) => `<option value="${value}" ${value === webUI.distance ? "selected" : ""}>${value === "Any" ? "Any distance" : `Within ${value} km`}</option>`).join("")}</select></div><div class="field-group"><label class="field-label" for="web-price">Maximum price per unit</label><input id="web-price" class="field" name="maxPrice" type="number" min="0" placeholder="Any price" value="${webEscape(webUI.maxPrice)}"></div><div class="filter-actions"><button class="web-btn outline small" type="button" data-web-action="clear-filters">Clear</button><button class="web-btn small" type="submit">Apply</button></div></form><section><div class="result-bar"><strong>${listings.length} result${listings.length === 1 ? "" : "s"}</strong><label><span class="small muted">Sort: </span><select id="web-sort" class="select">${options(["Newest", "Nearest", "Lowest price", "Highest price"], webUI.sort)}</select></label></div><div class="listing-grid">${listings.length ? listings.map(listingCard).join("") : `<div class="empty-state">${webIcon("search", 38)}<h2>No matching materials</h2><p>Reset the query and filters to see the complete catalog.</p><button class="web-btn outline" data-web-action="reset-search">Reset search</button></div>`}</div></section></div>`,
  );
}

function renderWebDetail() {
  const listing = webListing(webUI.selectedId);
  if (!listing) return renderWebSearch();
  const saved = webData.saved.includes(listing.id);
  return webShell(
    `${pageHeading("Material details", "Review condition, quantity, seller, and collection details before agreeing.", `<button class="web-btn outline" data-web-go="search">${webIcon("back", 17)} Back to results</button>`)}` +
      `<div class="detail-layout"><div><section class="panel detail-gallery"><img src="${webEscape(webImage(listing))}" alt="${webEscape(listing.title)}"></section><section class="panel description-card"><h2>Description</h2><p>${webEscape(listing.description)}</p></section><section class="panel spec-card"><h2>Material specifications</h2><div class="spec-list">${(listing.specs || []).map(([name, value]) => `<div class="spec-item"><small>${webEscape(name)}</small><strong>${webEscape(value)}</strong></div>`).join("")}</div></section><section class="panel seller-card">${webAvatar(listing.seller, true)}<div><b>${webEscape(listing.seller)}</b><small>★ ${webEscape(listing.rating || "4.8")} · Sample seller profile</small></div>${listing.mine ? webBadge("Your listing") : webBadge("Verified demo")}</section></div><aside class="panel detail-panel">${webBadge(listing.tag)}<h1>${webEscape(listing.title)}</h1><div class="detail-location">${webIcon("pin", 15)}${webEscape(listing.distance)} km away · ${webEscape(listing.location)}</div><div class="detail-price">${webMoney(listing.price)} <small>/ ${webEscape(listing.unit)}</small></div><p><b>${webEscape(listing.qty)}</b> available · ${webEscape(listing.condition)}</p><div class="detail-actions"><button class="web-btn outline ${saved ? "saved-action" : ""}" data-web-save="${webEscape(listing.id)}" aria-label="${saved ? "Remove from saved items" : "Save listing"}" aria-pressed="${saved}">${webIcon("heart", 17)} ${saved ? "Saved" : "Save"}</button><button class="web-btn outline" data-web-action="message-seller">${webIcon("chat", 17)} Message</button><button class="web-btn full-row" data-web-dialog="offer">Make an offer</button><button class="web-btn teal full-row" data-web-dialog="checkout">Buy / start deal</button></div><div class="side-card"><strong>${webIcon("shield", 16)} Demo deal protection</strong><p>Protected payment and delivery choices are illustrative. No real payment or courier booking occurs.</p></div></aside></div>`,
  );
}

function renderWebSaved() {
  const listings = webData.listings.filter((listing) =>
    webData.saved.includes(listing.id),
  );
  return webShell(
    `${pageHeading("Saved items", "Your shortlist is shared with the mobile prototype.", `<button class="web-btn" data-web-go="search">Browse materials</button>`)}` +
      `<div class="listing-grid">${listings.length ? listings.map(listingCard).join("") : `<div class="empty-state">${webIcon("heart", 38)}<h2>No saved items yet</h2><p>Save a listing to keep it available on both layouts.</p><button class="web-btn" data-web-go="search">Find materials</button></div>`}</div>`,
  );
}

function filteredWebChats() {
  let chats = webData.chats.filter(
    (chat) =>
      webUI.chatTab === "All Chats" ||
      (webUI.chatTab === "Buying"
        ? chat.type === "buying"
        : chat.type === "selling"),
  );
  const term = webUI.chatSearch.trim().toLowerCase();
  if (term) {
    chats = chats.filter((chat) => {
      const listing = webData.listings.find(
        (item) => item.id === chat.listingId,
      );
      return `${chat.name} ${chat.last} ${listing?.title || ""}`
        .toLowerCase()
        .includes(term);
    });
  }
  return chats;
}
function webChatListMarkup() {
  const chats = filteredWebChats();
  if (!chats.length)
    return `<div class="empty-state"><h2>No matching chats</h2><p>Try another person or listing name.</p></div>`;
  return chats
    .map(
      (chat) =>
        `<button class="chat-row ${chat.id === webUI.chatId ? "active" : ""}" data-web-chat="${webEscape(chat.id)}">${webAvatar(chat.name, false, chat.online)}<span class="chat-row-copy"><span class="chat-row-line"><b>${webEscape(chat.name)}</b><small>${webEscape(chat.time)}</small></span><span>${webEscape(chat.last)}</span></span></button>`,
    )
    .join("");
}
function webThreadMarkup() {
  const chat = webChat(webUI.chatId);
  if (!chat)
    return `<section class="chat-thread"><div class="empty-state"><h2>No conversation selected</h2><p>Open a material and message its seller to begin.</p></div></section>`;
  const listing = webListing(chat.listingId);
  const deal = webData.deals.find((item) => item.chatId === chat.id);
  const offerQuantity = Math.max(1, Number(chat.offer?.quantity) || 1);
  return `<section class="chat-thread"><header class="thread-head">${webAvatar(chat.name, false, chat.online)}<div><b>${webEscape(chat.name)}</b><small>${chat.online ? "Online" : "Usually replies today"}</small></div><button class="web-btn outline small" data-web-listing="${webEscape(listing.id)}">View listing</button></header><div class="messages" id="web-messages">${chat.messages
    .map(
      (message) =>
        `<div class="message ${message.mine ? "mine" : ""}">${message.mine ? "" : webAvatar(chat.name)}<div><div class="message-bubble">${webEscape(message.text)}</div><div class="message-time">${webEscape(message.time)}</div></div></div>`,
    )
    .join("")}<button class="thread-listing" data-web-listing="${webEscape(listing.id)}"><img src="${webEscape(webImage(listing))}" alt=""><span><b>${webEscape(listing.title)}</b><small>${webMoney(listing.price)} / ${webEscape(listing.unit)}</small></span>${webIcon("arrow", 17)}</button>${chat.offer ? `<div class="thread-offer">${webBadge(chat.offer.status === "accepted" ? "Offer accepted" : "Offer sent")}<h3>${webMoney(chat.offer.price)} / ${webEscape(listing.unit)}</h3><p>${offerQuantity} ${webEscape(listing.unit)}${offerQuantity === 1 ? "" : "s"} · ${webMoney(chat.offer.price * offerQuantity)} material subtotal</p><p>${chat.offer.fulfilment === "delivery" ? "Partner delivery requested" : "Self-arranged pickup"}</p>${chat.offer.status === "pending" ? `<button class="web-btn teal small" data-web-action="accept-offer">Accept offer (demo)</button>` : `<button class="web-btn small" data-web-action="continue-deal">Continue deal</button>`}</div>` : ""}${deal ? `<button class="web-btn outline" data-web-action="view-deal">${webIcon("shield", 16)} View deal progress</button>` : ""}</div><form id="web-chat-form" class="composer"><input class="field" name="message" placeholder="Type a message…" aria-label="Type a message" autocomplete="off"><button class="web-btn" type="submit" aria-label="Send message">${webIcon("send", 18)} Send</button></form></section>`;
}
function renderWebChats() {
  return webShell(
    `<section class="panel chat-layout"><aside class="chat-sidebar"><div class="chat-sidebar-head"><h1>Messages</h1><label class="chat-search">${webIcon("search", 17)}<input id="web-chat-search" class="field" value="${webEscape(webUI.chatSearch)}" placeholder="Search people or listings"></label><div class="chat-tabs">${["All Chats", "Selling", "Buying"].map((tab) => `<button class="${webUI.chatTab === tab ? "active" : ""}" data-web-chat-tab="${tab}">${tab}</button>`).join("")}</div></div><div id="web-chat-list" class="chat-list">${webChatListMarkup()}</div></aside>${webThreadMarkup()}</section>`,
  );
}

function renderWebSell() {
  const existing = webUI.editId ? webListing(webUI.editId) : null;
  const value = {
    category: "Lumber",
    title: "",
    price: "",
    unit: "pc",
    qty: "",
    location: webData.user.location,
    condition: "Reclaimed",
    description: "",
    ...existing,
  };
  const photo = webUI.photo || (existing ? webImage(existing) : null);
  const options = (values, selected) =>
    values
      .map(
        (item) =>
          `<option value="${webEscape(item)}" ${item === selected ? "selected" : ""}>${webEscape(item)}</option>`,
      )
      .join("");
  return webShell(
    `${pageHeading(existing ? "Edit listing" : "Sell surplus materials", "Create the same listing buyers will see on mobile and web.", `<button class="web-btn outline" data-web-go="my-listings">My listings</button>`)}` +
      `<div class="sell-layout"><form id="web-sell-form" class="panel sell-form"><div class="field-group"><span class="field-label">Material photo</span><label class="photo-uploader" for="web-photo">${photo ? `<img src="${webEscape(photo)}" alt="Listing preview">` : `<span>${webIcon("camera", 30)}<b>Add one photo</b><small>JPG or PNG · stored only in this browser</small></span>`}<input id="web-photo" name="photo" type="file" accept="image/*"></label>${photo ? '<button class="web-btn ghost small" type="button" data-web-action="remove-photo">Remove photo</button>' : ""}</div><div class="form-grid"><label class="field-group"><span class="field-label">Material category</span><select class="select" name="category">${options(webCategories, value.category)}</select></label><label class="field-group"><span class="field-label">Condition</span><select class="select" name="condition">${options(webConditions, value.condition)}</select></label><label class="field-group wide"><span class="field-label">Listing title</span><input class="field" name="title" value="${webEscape(value.title)}" placeholder="e.g. Reclaimed hardwood planks" maxlength="90" required></label><label class="field-group"><span class="field-label">Price (₱)</span><input class="field" name="price" type="number" min="1" value="${webEscape(value.price)}" required></label><label class="field-group"><span class="field-label">Unit</span><select class="select" name="unit">${options(["pc", "kg", "bag", "board", "sheet", "meter", "lot"], value.unit)}</select></label><label class="field-group"><span class="field-label">Quantity available</span><input class="field" name="qty" value="${webEscape(value.qty)}" placeholder="e.g. 24 boards" required></label><label class="field-group"><span class="field-label">Location</span><input class="field" name="location" value="${webEscape(value.location)}" required></label><label class="field-group wide"><span class="field-label">Description</span><textarea id="web-description" class="textarea" name="description" placeholder="Describe condition, dimensions, storage, and pickup…" required>${webEscape(value.description)}</textarea></label><label class="option-row wide"><input type="checkbox" name="premium" ${webUI.premium || existing?.premium ? "checked" : ""}><span><b>Premium visibility · demo option</b><small>Illustrative priority placement and fee only.</small></span></label></div><button class="web-btn full" type="submit">${existing ? "Save changes" : "Post demo listing"}</button></form><aside class="sell-aside"><section class="panel assist-card"><h3>${webIcon("spark", 18)} AI listing helper · demo</h3><p>Generate editable example wording from the selected category, title, and location. No external AI request is made.</p><button class="web-btn outline full" type="button" data-web-action="ai-suggest">Suggest description</button></section><section class="panel fee-card"><h3>Prototype boundaries</h3><p>Posting is local to this browser. The example success fee is 5%, with an illustrative 3% premium option. No charge or public listing is created.</p></section></aside></div>`,
  );
}

function renderWebMyListings() {
  const listings = webData.listings.filter((listing) => listing.mine);
  return webShell(
    `${pageHeading("My listings", "Manage the materials posted from either prototype layout.", `<button class="web-btn" data-web-go="sell">${webIcon("plus", 17)} Create listing</button>`)}` +
      `<section class="panel">${listings.length ? listings.map((listing) => `<article class="my-listing"><img src="${webEscape(webImage(listing))}" alt=""><div><h3>${webEscape(listing.title)}</h3><span class="listing-price">${webMoney(listing.price)} <small>/ ${webEscape(listing.unit)}</small></span><p class="small muted">${webEscape(listing.qty)} · ${webEscape(listing.location)} · ${listing.status === "sold" ? "Sold" : "Active"}</p></div><div class="my-listing-actions"><button class="web-btn outline small" data-web-edit="${webEscape(listing.id)}">${webIcon("edit", 15)} Edit</button><button class="web-btn ${listing.status === "sold" ? "outline" : "danger"} small" data-web-status="${webEscape(listing.id)}">${listing.status === "sold" ? "Relist" : "Mark sold"}</button></div></article>`).join("") : `<div class="empty-state"><h2>No listings yet</h2><p>Post surplus materials to see them here.</p></div>`}</section>`,
  );
}

function renderWebProfile() {
  const own = webData.listings.filter((listing) => listing.mine);
  const sold = own.filter((listing) => listing.status === "sold").length;
  const activity = `<section class="panel profile-menu"><h2>Account activity</h2><button class="profile-link" data-web-go="my-listings">${webIcon("tag", 20)}<span>My listings</span><b>${own.length}</b></button><button class="profile-link" data-web-go="saved">${webIcon("heart", 20)}<span>Saved items</span><b>${webData.saved.length}</b></button><button class="profile-link" data-web-dialog="payments">${webIcon("card", 20)}<span>Payment methods</span>${webIcon("arrow", 15)}</button><button class="profile-link" data-web-dialog="business">${webIcon("shield", 20)}<span>Business & verification</span>${webIcon("arrow", 15)}</button></section>`;
  const controls = `<section class="panel profile-menu"><h2>General</h2><button class="profile-link" data-web-dialog="settings">${webIcon("settings", 20)}<span>Settings</span>${webIcon("arrow", 15)}</button><button class="profile-link mode-switch" data-web-action="try-mobile">${webIcon("arrow", 20)}<span>Try Mobile!</span>${webIcon("arrow", 15)}</button><button class="profile-link" data-web-dialog="notifications">${webIcon("bell", 20)}<span>Notifications</span>${webIcon("arrow", 15)}</button><button class="profile-link" data-web-dialog="help">${webIcon("info", 20)}<span>Help and prototype notes</span>${webIcon("arrow", 15)}</button><button class="profile-link" data-web-dialog="reset">${webIcon("refresh", 20)}<span>Reset demo marketplace</span>${webIcon("arrow", 15)}</button><button class="profile-link" data-web-dialog="logout">${webIcon("logout", 20)}<span>Log out</span>${webIcon("arrow", 15)}</button></section>`;
  const profile = `<section class="panel profile-hero"><div class="profile-person">${webAvatar(webData.user.name, true)}<div><h1>${webEscape(webData.user.name)}</h1><span class="muted">${webEscape(webData.user.email)} · ${webEscape(webData.user.location)}</span></div><span class="header-spacer"></span><button class="web-btn outline" data-web-dialog="edit-profile">Edit profile</button></div><div class="profile-stats"><div class="profile-stat"><strong>${own.length}</strong><span>LISTINGS</span></div><div class="profile-stat"><strong>${sold}</strong><span>SALES</span></div><div class="profile-stat"><strong>4.8 ★</strong><span>DEMO RATING</span></div></div></section>`;
  return webShell(
    `${pageHeading("Profile", "One demo identity for buying and selling across both layouts.")}${profile}<div class="profile-grid">${activity}${controls}</div>`,
  );
}

function renderWebDeal() {
  const deal = webData.deals.find((item) => item.id === webUI.dealId);
  if (!deal) return renderWebHome();
  const listing = webListing(deal.listingId);
  const steps =
    deal.fulfilment === "delivery" ? webDeliverySteps : webPickupSteps;
  const complete = deal.step >= steps.length - 1;
  const quantity = Math.max(1, Number(deal.quantity) || 1);
  const subtotal = deal.price * quantity;
  return webShell(
    `${pageHeading("Deal progress", complete ? "The demo transaction is complete." : "Track the agreement from creation through receipt.", `<button class="web-btn outline" data-web-go="chats">${webIcon("back", 17)} Messages</button>`)}` +
      `<div class="deal-layout"><section class="panel deal-progress"><div class="deal-status"><b>${complete ? "Transaction complete" : "Protected demo deal active"}</b><p>${deal.payMethod === "cash" ? "Cash on pickup sits outside protected payment." : "The example payment is held until the buyer confirms receipt."}</p></div><div class="timeline">${steps.map((step, index) => `<div class="timeline-step ${index < deal.step ? "done" : index === deal.step ? "active" : ""}"><span class="timeline-dot">${index <= deal.step ? webIcon("check", 15) : index + 1}</span><span class="timeline-copy"><b>${webEscape(step)}</b><small>${index < deal.step ? "Demo stage completed" : index === deal.step ? "Current demo stage" : "Waiting for the next step"}</small></span></div>`).join("")}</div>${complete ? `<button class="web-btn teal" data-web-action="rate-deal">${deal.reviewed ? "Return to messages" : "Rate this transaction"}</button>` : `<button class="web-btn teal" data-web-action="advance-deal">Advance demo status ${webIcon("arrow", 17)}</button>`}</section><aside class="panel deal-summary"><img src="${webEscape(webImage(listing))}" alt="" style="width:100%;height:170px;object-fit:cover;border-radius:14px"><h2>${webEscape(listing.title)}</h2><div class="summary-row"><span>Unit price</span><b>${webMoney(deal.price)} / ${webEscape(listing.unit)}</b></div><div class="summary-row"><span>Quantity</span><b>${quantity} ${webEscape(listing.unit)}${quantity === 1 ? "" : "s"}</b></div><div class="summary-row"><span>Material subtotal</span><b>${webMoney(subtotal)}</b></div><div class="summary-row"><span>Delivery</span><b>${deal.fulfilment === "delivery" ? webMoney(deal.deliveryFee) : "Self pickup"}</b></div><div class="summary-row total"><span>Total example amount</span><b>${webMoney(subtotal + deal.deliveryFee)}</b></div><div class="summary-row"><span>Payment</span><b>${deal.payMethod === "cash" ? "Cash on pickup" : "Protected demo"}</b></div><p class="small muted">No real funds or delivery booking are created.</p></aside></div>`,
  );
}

function renderWebRating() {
  const deal = webData.deals.find((item) => item.id === webUI.dealId);
  const listing = webListing(deal?.listingId);
  return webShell(
    `${pageHeading("Rate transaction", "Feedback is stored only in the local prototype.")}` +
      `<form id="web-rating-form" class="panel rating-card">${webAvatar(listing.seller, true)}<h2>${webEscape(listing.seller)}</h2><p class="muted">${webEscape(listing.title)}</p><div class="stars">${[1, 2, 3, 4, 5].map((star) => `<button type="button" class="${star <= webUI.rating ? "active" : ""}" data-web-star="${star}" aria-label="${star} stars">${webIcon("star", 36)}</button>`).join("")}</div><div class="field-group"><label class="field-label" for="web-review">Share your experience (optional)</label><textarea id="web-review" class="textarea" name="review" placeholder="Material quality, pickup, and seller communication…"></textarea></div><button class="web-btn teal" type="submit">Submit demo review</button></form>`,
  );
}

function renderWelcome() {
  return `<main class="auth-page"><section class="auth-brand"><img src="assets/logo.png" alt="BuildCycle"><p class="eyebrow">Build more, waste less</p><h1>BuildCycle</h1><h2>A marketplace for construction materials that still have work left in them.</h2><p>The desktop experience uses the same Bohol catalog, conversations, saved items, listings, and deal progress as the mobile prototype.</p></section><section class="auth-panel"><div class="auth-card"><p class="eyebrow">Welcome</p><h2>Find materials nearby</h2><p>Use the sample Bohol location or enter another display location for this prototype.</p><button class="web-btn teal full" data-web-action="enable-location">${webIcon("pin", 18)} Use ${webEscape(webData.user.location)}</button><form id="web-location-form" class="location-card"><input class="field" name="location" value="${webEscape(webData.user.location)}" aria-label="Manual location" required><button class="web-btn" type="submit">Continue</button></form><p class="small muted" style="margin-top:18px">No device location is requested.</p></div></section></main>`;
}
function renderWebLogin() {
  return `<main class="auth-page"><section class="auth-brand"><img src="assets/logo.png" alt="BuildCycle"><p class="eyebrow">Build more, waste less</p><h1>BuildCycle</h1><h2>Welcome back to the materials marketplace.</h2><p>Continue the same prototype journey from a desktop workspace designed for browsing, comparison, messaging, and listing management.</p></section><section class="auth-panel"><form id="web-login-form" class="auth-card"><p class="eyebrow">Demo account</p><h2>Log in</h2><p>Use any valid email and any password.</p><div class="field-group"><label class="field-label" for="web-email">Email address</label><input id="web-email" class="field" name="email" type="email" value="${webEscape(webData.user.email)}" required></div><div class="field-group"><label class="field-label" for="web-password">Password</label><input id="web-password" class="field" name="password" type="password" value="demo1234" required></div><button class="web-btn full" type="submit">Log in</button><p class="auth-switch">Need a demo account? <button type="button" data-web-go="signup">Sign up</button></p></form></section></main>`;
}
function renderWebSignup() {
  return `<main class="auth-page"><section class="auth-brand"><img src="assets/logo.png" alt="BuildCycle"><p class="eyebrow">One account, two roles</p><h1>Join BuildCycle</h1><h2>Buy what you need. Sell what your project no longer needs.</h2><p>This creates only a local prototype profile and does not send information anywhere.</p></section><section class="auth-panel"><form id="web-signup-form" class="auth-card"><p class="eyebrow">Demo registration</p><h2>Create an account</h2><p>Your profile will also appear in the mobile layout.</p><div class="field-group"><label class="field-label" for="web-name">Full name</label><input id="web-name" class="field" name="name" value="Juan Dela Cruz" required></div><div class="field-group"><label class="field-label" for="web-signup-email">Email address</label><input id="web-signup-email" class="field" name="email" type="email" value="demo@buildcycle.ph" required></div><div class="field-group"><label class="field-label" for="web-signup-password">Password</label><input id="web-signup-password" class="field" name="password" type="password" value="demo1234" minlength="6" required></div><div class="field-group"><label class="field-label" for="web-signup-location">Location</label><input id="web-signup-location" class="field" name="location" value="${webEscape(webData.user.location)}" required></div><button class="web-btn full" type="submit">Create demo account</button><p class="auth-switch">Already registered? <button type="button" data-web-go="login">Log in</button></p></form></section></main>`;
}

const webViews = {
  home: renderWebHome,
  search: renderWebSearch,
  detail: renderWebDetail,
  saved: renderWebSaved,
  chats: renderWebChats,
  sell: renderWebSell,
  "my-listings": renderWebMyListings,
  profile: renderWebProfile,
  deal: renderWebDeal,
  rating: renderWebRating,
  welcome: renderWelcome,
  login: renderWebLogin,
  signup: renderWebSignup,
};

function renderWeb() {
  webApp.innerHTML = (webViews[webUI.view] || renderWebHome)();
  webDialogRoot.innerHTML = renderWebDialog();
  const messages = document.getElementById("web-messages");
  if (messages) messages.scrollTop = messages.scrollHeight;
}
function goWeb(view) {
  if (!webViews[view]) return;
  webUI.view = view;
  webUI.dialog = null;
  webDialogTrigger = null;
  window.scrollTo({ top: 0, behavior: "instant" });
  renderWeb();
}

function dialogFrame(title, description, body, wide = false) {
  return `<div class="dialog-scrim"><section class="dialog ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${webEscape(title)}" data-dialog-panel><button class="icon-button dialog-close" data-web-action="close-dialog" aria-label="Close">${webIcon("x", 18)}</button><h2>${webEscape(title)}</h2>${description ? `<p>${webEscape(description)}</p>` : ""}${body}</section></div>`;
}
function renderWebDialog() {
  const listing = webListing(webUI.selectedId);
  const contextualOffer =
    webUI.view === "chats" ? webChat(webUI.chatId)?.offer : null;
  const available = listingAvailableQuantity(listing);
  const purchaseQuantity = Math.min(
    available,
    Math.max(1, Math.floor(Number(webUI.quantity) || 1)),
  );
  const deliveryFee = webUI.fulfilment === "delivery" ? 350 : 0;
  const offerPrice = Number(contextualOffer?.price || listing.price);
  switch (webUI.dialog) {
    case "offer":
      return dialogFrame(
        "Make an offer",
        `Send a demo offer for ${listing.title}.`,
        `<form id="web-offer-form"><div class="dialog-field-grid"><div class="field-group"><label class="field-label" for="web-offer-price">Offer per ${webEscape(listing.unit)}</label><input id="web-offer-price" class="field" name="price" type="number" min="1" value="${webEscape(offerPrice)}" required></div><div class="field-group"><label class="field-label" for="web-offer-quantity">Quantity</label><input id="web-offer-quantity" class="field" name="quantity" type="number" min="1" max="${available}" value="${purchaseQuantity}" required><small class="field-hint">${webEscape(listing.qty)} available</small></div></div><div class="dialog-summary"><div class="summary-row total"><span>Estimated material subtotal</span><b id="web-offer-subtotal">${webMoney(offerPrice * purchaseQuantity)}</b></div></div><div class="field-group"><label class="field-label">Message (optional)</label><textarea class="textarea" name="note" placeholder="Pickup timing or condition questions…"></textarea></div><div class="dialog-actions"><button class="web-btn outline" type="button" data-web-action="close-dialog">Cancel</button><button class="web-btn" type="submit">Send demo offer</button></div></form>`,
      );
    case "checkout":
      return dialogFrame(
        "Start a demo deal",
        "Choose collection and payment preferences. Nothing is charged or booked.",
        `<form id="web-checkout-form"><div class="field-group"><label class="field-label" for="web-checkout-quantity">Quantity to buy</label><input id="web-checkout-quantity" class="field" name="quantity" type="number" min="1" max="${available}" value="${purchaseQuantity}" required><small class="field-hint">Choose up to ${available} ${webEscape(listing.unit)}${available === 1 ? "" : "s"}.</small></div><h3>Pickup or delivery</h3><label class="option-row ${webUI.fulfilment === "pickup" ? "selected" : ""}"><input type="radio" name="fulfilment" value="pickup" ${webUI.fulfilment === "pickup" ? "checked" : ""}><span><b>Self-arranged pickup</b><small>Coordinate directly with the seller.</small></span></label><label class="option-row ${webUI.fulfilment === "delivery" ? "selected" : ""}"><input type="radio" name="fulfilment" value="delivery" ${webUI.fulfilment === "delivery" ? "checked" : ""}><span><b>Illustrative partner delivery · ${webMoney(350)}</b><small>Sample quote only; no courier is booked.</small></span></label><h3>Payment</h3><label class="option-row ${webUI.payMethod === "protected" ? "selected" : ""}"><input type="radio" name="payMethod" value="protected" ${webUI.payMethod === "protected" ? "checked" : ""}><span><b>Protected demo payment</b><small>Shown as held until receipt is confirmed.</small></span></label><label class="option-row ${webUI.payMethod === "cash" ? "selected" : ""}"><input type="radio" name="payMethod" value="cash" ${webUI.payMethod === "cash" ? "checked" : ""}><span><b>Cash on pickup</b><small>Outside BuildCycle payment protection.</small></span></label><div class="dialog-summary"><div class="summary-row"><span>Unit price</span><b>${webMoney(listing.price)} / ${webEscape(listing.unit)}</b></div><div class="summary-row"><span>Material subtotal</span><b id="web-checkout-subtotal">${webMoney(listing.price * purchaseQuantity)}</b></div><div class="summary-row"><span>Delivery</span><b id="web-checkout-delivery">${deliveryFee ? webMoney(deliveryFee) : "₱0"}</b></div><div class="summary-row total"><span>Total example amount</span><b id="web-checkout-total">${webMoney(listing.price * purchaseQuantity + deliveryFee)}</b></div></div><div class="dialog-actions"><button class="web-btn outline" type="button" data-web-action="close-dialog">Cancel</button><button class="web-btn teal" type="submit">Create demo deal</button></div></form>`,
        true,
      );
    case "edit-profile":
      return dialogFrame(
        "Edit profile",
        "Changes appear in both prototype layouts after refresh.",
        `<form id="web-profile-form"><div class="field-group"><label class="field-label">Full name</label><input class="field" name="name" value="${webEscape(webData.user.name)}" required></div><div class="field-group"><label class="field-label">Location</label><input class="field" name="location" value="${webEscape(webData.user.location)}" required></div><div class="dialog-actions"><button class="web-btn" type="submit">Save profile</button></div></form>`,
      );
    case "settings":
      return dialogFrame(
        "Settings",
        "The desktop and mobile layouts use the same local demo account.",
        `<div class="side-card"><strong>Shared demo data</strong><p>Listings, saved items, messages, deals, and profile changes synchronize between open BuildCycle tabs.</p></div>`,
      );
    case "reset":
      return dialogFrame(
        "Reset demo marketplace?",
        "Starter listings, chats, saves, deals, and reviews will return. Your signed-in profile stays.",
        `<div class="dialog-actions"><button class="web-btn outline" data-web-action="close-dialog">Cancel</button><button class="web-btn danger" data-web-action="reset-demo">Reset demo</button></div>`,
      );
    case "logout":
      return dialogFrame(
        "Log out of the demo?",
        "You can sign in again with any email and password.",
        `<div class="dialog-actions"><button class="web-btn outline" data-web-action="close-dialog">Cancel</button><button class="web-btn" data-web-action="logout">Log out</button></div>`,
      );
    case "payments":
      return dialogFrame(
        "Payment methods",
        "Protected payment and cash on pickup are demonstration choices only.",
        `<div class="side-card"><strong>No financial details stored</strong><p>This prototype never requests card, bank, or wallet information.</p></div>`,
      );
    case "business":
      return dialogFrame(
        "Business & verification",
        "The verification badge is illustrative and separate from premium visibility.",
        `<div class="side-card"><strong>Demo verification</strong><p>No identity or business document is collected in this prototype.</p></div>`,
      );
    case "notifications":
      return dialogFrame(
        "Notifications",
        "Updates appear inside messages and deal progress.",
        `<div class="side-card"><strong>Prototype only</strong><p>Push and email notifications are not connected.</p></div>`,
      );
    case "help":
      return dialogFrame(
        "Prototype help",
        "Use the desktop navigation for wide-screen workflows; the catalog and activity remain compatible with mobile.",
        `<div class="side-card"><strong>Suggested demo</strong><p>Search → save → open listing → message or offer → create deal → advance status → rate.</p></div>`,
      );
    default:
      return "";
  }
}
function openWebDialog(name, trigger) {
  if (!webUI.dialog) webDialogTrigger = trigger || document.activeElement;
  webUI.dialog = name;
  webDialogRoot.innerHTML = renderWebDialog();
  document.querySelector(".dialog-close")?.focus();
}
function closeWebDialog() {
  const trigger = webDialogTrigger;
  webUI.dialog = null;
  webDialogTrigger = null;
  webDialogRoot.replaceChildren();
  if (trigger && typeof trigger.focus === "function") trigger.focus();
}

function currentWebChat(listing) {
  let chat = webData.chats.find((item) => item.listingId === listing.id);
  if (!chat) {
    chat = {
      id: `chat-${Date.now()}`,
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
    webData.chats.unshift(chat);
    persistWeb();
  }
  return chat;
}
function startWebChat(listing) {
  const chat = currentWebChat(listing);
  webUI.chatId = chat.id;
  webUI.selectedId = listing.id;
  goWeb("chats");
}
function startWebDeal(
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
  const previous = webData.deals.find(
    (deal) =>
      deal.listingId === listing.id &&
      deal.chatId === chatId &&
      Math.max(1, Number(deal.quantity) || 1) === dealQuantity &&
      deal.step <
        (deal.fulfilment === "delivery"
          ? webDeliverySteps
          : webPickupSteps
        ).length -
          1,
  );
  if (previous) {
    webUI.dealId = previous.id;
    goWeb("deal");
    return;
  }
  const deal = {
    id: `deal-${Date.now()}`,
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
  webData.deals.unshift(deal);
  webUI.dealId = deal.id;
  persistWeb();
  goWeb("deal");
}

document.addEventListener("click", (event) => {
  if (event.target.classList?.contains("dialog-scrim")) {
    closeWebDialog();
    return;
  }
  const element = event.target.closest(
    "button,[data-web-go],[data-web-listing],[data-web-save],[data-web-chat],[data-web-dialog],[data-web-action],[data-web-chat-tab],[data-web-edit],[data-web-status],[data-web-star]",
  );
  if (!element) return;
  if (element.dataset.webGo) {
    if (element.dataset.webGo === "sell") {
      webUI.editId = null;
      webUI.photo = null;
      webUI.premium = false;
    }
    goWeb(element.dataset.webGo);
    return;
  }
  if (element.dataset.webListing) {
    webUI.selectedId = element.dataset.webListing;
    webUI.quantity = 1;
    goWeb("detail");
    return;
  }
  if (element.dataset.webSave) {
    const id = element.dataset.webSave;
    webData.saved = webData.saved.includes(id)
      ? webData.saved.filter((savedId) => savedId !== id)
      : [...webData.saved, id];
    persistWeb();
    renderWeb();
    webToast(webData.saved.includes(id) ? "Saved to your items" : "Removed from saved items");
    return;
  }
  if (element.dataset.webChat) {
    webUI.chatId = element.dataset.webChat;
    webUI.selectedId = webChat(webUI.chatId).listingId;
    webUI.view = "chats";
    renderWeb();
    return;
  }
  if (element.dataset.webDialog) {
    if (
      ["offer", "checkout"].includes(element.dataset.webDialog) &&
      webListing(webUI.selectedId).mine
    ) {
      webToast("Open another seller’s listing for the buyer demo.");
      return;
    }
    if (["offer", "checkout"].includes(element.dataset.webDialog)) {
      const contextualOffer =
        webUI.view === "chats" ? webChat(webUI.chatId)?.offer : null;
      webUI.quantity = Math.min(
        listingAvailableQuantity(webListing(webUI.selectedId)),
        Math.max(1, Math.floor(Number(contextualOffer?.quantity) || 1)),
      );
    }
    openWebDialog(element.dataset.webDialog, element);
    return;
  }
  if (element.dataset.webChatTab) {
    webUI.chatTab = element.dataset.webChatTab;
    renderWeb();
    return;
  }
  if (element.dataset.webEdit) {
    webUI.editId = element.dataset.webEdit;
    webUI.photo = null;
    goWeb("sell");
    return;
  }
  if (element.dataset.webStatus) {
    const listing = webListing(element.dataset.webStatus);
    listing.status = listing.status === "sold" ? "active" : "sold";
    persistWeb();
    renderWeb();
    webToast(listing.status === "sold" ? "Listing marked sold" : "Listing active again");
    return;
  }
  if (element.dataset.webStar) {
    webUI.rating = Number(element.dataset.webStar);
    renderWeb();
    return;
  }
  const action = element.dataset.webAction;
  if (!action) return;
  if (action === "close-dialog") {
    closeWebDialog();
    return;
  }
  if (action === "enable-location") {
    webData.onboarded = true;
    persistWeb();
    goWeb("login");
    return;
  }
  if (action === "try-mobile") {
    persistWeb();
    window.location.assign("index.html");
    return;
  }
  if (action === "message-seller") {
    const listing = webListing(webUI.selectedId);
    if (listing.mine) {
      webToast("Open another seller’s listing to message them.");
      return;
    }
    startWebChat(listing);
    return;
  }
  if (action === "clear-filters" || action === "reset-search") {
    webUI.category = "All";
    webUI.condition = "All";
    webUI.distance = "Any";
    webUI.maxPrice = "";
    if (action === "reset-search") webUI.query = "";
    webUI.sort = "Newest";
    renderWeb();
    return;
  }
  if (action === "accept-offer") {
    const chat = webChat(webUI.chatId);
    if (!chat?.offer) return;
    chat.offer.status = "accepted";
    chat.messages.push({
      mine: false,
      text: "Your offer is accepted! Let’s arrange pickup or delivery.",
      time: "Now",
    });
    chat.last = "Offer accepted";
    chat.time = "Now";
    persistWeb();
    renderWeb();
    webToast("Demo seller accepted your offer");
    return;
  }
  if (action === "continue-deal") {
    const chat = webChat(webUI.chatId);
    startWebDeal(webListing(chat.listingId), {
      price: chat.offer?.price,
      quantity: chat.offer?.quantity || 1,
      fulfilment: chat.offer?.fulfilment || "pickup",
      chatId: chat.id,
    });
    return;
  }
  if (action === "view-deal") {
    const deal = webData.deals.find((item) => item.chatId === webUI.chatId);
    if (deal) {
      webUI.dealId = deal.id;
      goWeb("deal");
    }
    return;
  }
  if (action === "advance-deal") {
    const deal = webData.deals.find((item) => item.id === webUI.dealId);
    const steps =
      deal.fulfilment === "delivery" ? webDeliverySteps : webPickupSteps;
    deal.step = Math.min(deal.step + 1, steps.length - 1);
    persistWeb();
    renderWeb();
    return;
  }
  if (action === "rate-deal") {
    const deal = webData.deals.find((item) => item.id === webUI.dealId);
    if (deal.reviewed) goWeb("chats");
    else {
      webUI.rating = 0;
      goWeb("rating");
    }
    return;
  }
  if (action === "remove-photo") {
    webUI.photo = null;
    renderWeb();
    return;
  }
  if (action === "ai-suggest") {
    const form = document.getElementById("web-sell-form");
    const title = form.elements.title.value.trim();
    const category = form.elements.category.value;
    const location =
      form.elements.location.value.trim() || webData.user.location;
    document.getElementById("web-description").value =
      `${title || `Surplus ${category.toLowerCase()}`} available in ${location}. Available for local inspection and pickup. Please ask for measurements, quantity details, and collection schedule before confirming your purchase.`;
    webToast("Example description added. Edit it before posting.");
    return;
  }
  if (action === "reset-demo") {
    const profile = structuredClone(webData.user);
    webData = freshState();
    webData.onboarded = true;
    webData.authed = true;
    webData.user = profile;
    webUI = {
      ...webUI,
      view: "home",
      selectedId: "lumber",
      chatId: "marcus",
      query: "",
      category: "All",
      condition: "All",
      distance: "Any",
      maxPrice: "",
      sort: "Newest",
      chatTab: "All Chats",
      chatSearch: "",
      dialog: null,
      quantity: 1,
      dealId: null,
      photo: null,
      editId: null,
    };
    persistWeb();
    renderWeb();
    webToast("Demo marketplace restored");
    return;
  }
  if (action === "logout") {
    webData.authed = false;
    persistWeb();
    goWeb("login");
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "web-chat-search") {
    webUI.chatSearch = event.target.value;
    const list = document.getElementById("web-chat-list");
    if (list) list.innerHTML = webChatListMarkup();
    return;
  }
  if (
    ["web-offer-price", "web-offer-quantity", "web-checkout-quantity"].includes(
      event.target.id,
    )
  ) {
    if (event.target.id !== "web-offer-price") {
      webUI.quantity = Math.min(
        listingAvailableQuantity(webListing(webUI.selectedId)),
        Math.max(1, Math.floor(Number(event.target.value) || 1)),
      );
    }
    const listing = webListing(webUI.selectedId);
    const price = Number(
      document.getElementById("web-offer-price")?.value || listing.price,
    );
    const subtotal = document.getElementById("web-offer-subtotal");
    if (subtotal)
      subtotal.textContent = webMoney(
        (Number.isFinite(price) && price > 0 ? price : listing.price) *
          webUI.quantity,
      );
    const checkoutSubtotal = document.getElementById(
      "web-checkout-subtotal",
    );
    const checkoutDelivery = document.getElementById(
      "web-checkout-delivery",
    );
    const checkoutTotal = document.getElementById("web-checkout-total");
    const deliveryFee = webUI.fulfilment === "delivery" ? 350 : 0;
    if (checkoutSubtotal)
      checkoutSubtotal.textContent = webMoney(
        listing.price * webUI.quantity,
      );
    if (checkoutDelivery)
      checkoutDelivery.textContent = deliveryFee ? webMoney(deliveryFee) : "₱0";
    if (checkoutTotal)
      checkoutTotal.textContent = webMoney(
        listing.price * webUI.quantity + deliveryFee,
      );
  }
});
document.addEventListener("change", (event) => {
  if (event.target.id === "web-sort") {
    webUI.sort = event.target.value;
    renderWeb();
    return;
  }
  if (
    event.target.closest("#web-checkout-form") &&
    event.target.name === "fulfilment"
  ) {
    const quantityInput = document.getElementById("web-checkout-quantity");
    if (quantityInput) webUI.quantity = Number(quantityInput.value) || 1;
    webUI.fulfilment = event.target.value;
    webDialogRoot.innerHTML = renderWebDialog();
    return;
  }
  if (
    event.target.closest("#web-checkout-form") &&
    event.target.name === "payMethod"
  ) {
    const quantityInput = document.getElementById("web-checkout-quantity");
    if (quantityInput) webUI.quantity = Number(quantityInput.value) || 1;
    webUI.payMethod = event.target.value;
    webDialogRoot.innerHTML = renderWebDialog();
    return;
  }
  if (event.target.id === "web-photo" && event.target.files?.[0]) {
    const file = event.target.files[0];
    if (!file.type.startsWith("image/")) {
      webToast("Choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas
          .getContext("2d")
          .drawImage(image, 0, 0, canvas.width, canvas.height);
        webUI.photo = canvas.toDataURL("image/jpeg", 0.78);
        renderWeb();
        webToast("Photo added to the listing");
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!form.id) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  if (form.id === "global-search-form") {
    webUI.query = String(values.query || "").trim();
    goWeb("search");
    return;
  }
  if (form.id === "web-location-form") {
    webData.user.location = String(values.location).trim();
    webData.onboarded = true;
    persistWeb();
    goWeb("login");
    return;
  }
  if (form.id === "web-login-form") {
    webData.authed = true;
    webData.onboarded = true;
    webData.user.email = String(values.email).trim();
    persistWeb();
    goWeb("home");
    webToast("Welcome to the BuildCycle demo");
    return;
  }
  if (form.id === "web-signup-form") {
    webData.authed = true;
    webData.onboarded = true;
    webData.user = {
      name: String(values.name).trim(),
      email: String(values.email).trim(),
      location: String(values.location).trim(),
    };
    persistWeb();
    goWeb("home");
    return;
  }
  if (form.id === "web-filter-form") {
    webUI.category = values.category;
    webUI.condition = values.condition;
    webUI.distance = values.distance;
    webUI.maxPrice = values.maxPrice;
    renderWeb();
    return;
  }
  if (form.id === "web-chat-form") {
    const message = String(values.message || "").trim();
    if (!message) return;
    const chat = webChat(webUI.chatId);
    chat.messages.push({ mine: true, text: message, time: "Now" });
    chat.last = message;
    chat.time = "Now";
    persistWeb();
    renderWeb();
    return;
  }
  if (form.id === "web-offer-form") {
    const listing = webListing(webUI.selectedId);
    const price = Number(values.price);
    const quantity = Math.floor(Number(values.quantity));
    if (!Number.isFinite(price) || price <= 0) {
      webToast("Enter a valid peso amount.");
      return;
    }
    if (
      !Number.isFinite(quantity) ||
      quantity < 1 ||
      quantity > listingAvailableQuantity(listing)
    ) {
      webToast(
        `Choose between 1 and ${listingAvailableQuantity(listing)} units.`,
      );
      return;
    }
    const chat = currentWebChat(listing);
    chat.offer = { price, quantity, fulfilment: "pickup", status: "pending" };
    chat.messages.push({
      mine: true,
      text: `I would like to offer ${webMoney(price)} per ${listing.unit} for ${quantity} ${listing.unit}${quantity === 1 ? "" : "s"}. ${String(values.note || "").trim()}`.trim(),
      time: "Now",
    });
    chat.last = "Offer sent";
    chat.time = "Now";
    webUI.chatId = chat.id;
    persistWeb();
    goWeb("chats");
    webToast("Demo offer sent");
    return;
  }
  if (form.id === "web-checkout-form") {
    const listing = webListing(webUI.selectedId);
    const quantity = Math.floor(Number(values.quantity));
    if (
      !Number.isFinite(quantity) ||
      quantity < 1 ||
      quantity > listingAvailableQuantity(listing)
    ) {
      webToast(
        `Choose between 1 and ${listingAvailableQuantity(listing)} units.`,
      );
      return;
    }
    startWebDeal(listing, {
      quantity,
      fulfilment: values.fulfilment,
      payMethod: values.payMethod,
      chatId: webUI.view === "chats" ? webUI.chatId : null,
    });
    return;
  }
  if (form.id === "web-profile-form") {
    webData.user.name = String(values.name).trim();
    webData.user.location = String(values.location).trim();
    persistWeb();
    closeWebDialog();
    renderWeb();
    webToast("Profile updated");
    return;
  }
  if (form.id === "web-sell-form") {
    const price = Number(values.price);
    const existing = webUI.editId ? webListing(webUI.editId) : null;
    const category = String(values.category);
    const fallback = {
      Lumber: "lumber.png",
      Tiles: "tiles.png",
      "Steel & Metal": "rebar.png",
      "Cement & Concrete": "blocks.png",
      Electrical: "wire.png",
      Other: "logo.png",
    }[category];
    const listing = {
      ...(existing || {}),
      id: existing?.id || `listing-${Date.now()}`,
      title: String(values.title).trim(),
      category,
      condition: String(values.condition),
      tag: String(values.condition),
      price,
      unit: String(values.unit),
      qty: String(values.qty).trim(),
      availableQty: listingAvailableQuantity({ qty: values.qty }),
      location: String(values.location).trim(),
      distance: existing?.distance || 0,
      image: webUI.photo || existing?.image || fallback,
      seller: webData.user.name,
      rating: existing?.rating || "New",
      description: String(values.description).trim(),
      specs: [
        ["QUANTITY", String(values.qty).trim()],
        ["CATEGORY", category],
        ["LOCATION", String(values.location).trim()],
        ["CONDITION", String(values.condition)],
      ],
      mine: true,
      status: existing?.status === "sold" ? "sold" : "active",
      premium: Boolean(values.premium),
    };
    if (existing) Object.assign(existing, listing);
    else webData.listings.unshift(listing);
    webUI.selectedId = listing.id;
    webUI.editId = null;
    webUI.photo = null;
    persistWeb();
    goWeb("my-listings");
    webToast(existing ? "Listing updated" : "Demo listing published");
    return;
  }
  if (form.id === "web-rating-form") {
    if (!webUI.rating) {
      webToast("Choose a star rating first.");
      return;
    }
    const deal = webData.deals.find((item) => item.id === webUI.dealId);
    webData.reviews.push({
      dealId: deal.id,
      rating: webUI.rating,
      tags: [],
      text: String(values.review || "").trim(),
    });
    deal.reviewed = true;
    persistWeb();
    goWeb("profile");
    webToast("Thank you for the demo review");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && webUI.dialog) {
    event.preventDefault();
    closeWebDialog();
  }
});
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    webData = hydrateWebState(JSON.parse(event.newValue));
    renderWeb();
    webToast("Demo data updated from another BuildCycle tab");
  } catch {
    /* Ignore malformed external storage events. */
  }
});

renderWeb();
