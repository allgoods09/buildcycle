const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const nodes = new Map();
const makeNode = (id = "") => ({
  id,
  innerHTML: "",
  scrollTop: 0,
  scrollHeight: 0,
  replaceChildren() {
    this.innerHTML = "";
  },
  focus() {
    document.activeElement = this;
  },
});
const getNode = (id) => {
  if (!nodes.has(id)) nodes.set(id, makeNode(id));
  return nodes.get(id);
};
const listeners = {};
const windowListeners = {};
const closeButton = makeNode("sheet-close");
const document = {
  activeElement: null,
  getElementById: getNode,
  addEventListener(type, handler) {
    listeners[type] = handler;
  },
  querySelector(selector) {
    return selector === ".sheet .close" ? closeButton : null;
  },
  querySelectorAll() {
    return [];
  },
};
const storage = new Map();
const localStorage = {
  getItem(key) {
    return storage.get(key) ?? null;
  },
  setItem(key, value) {
    storage.set(key, String(value));
  },
};
const window = {
  addEventListener(type, handler) {
    windowListeners[type] = handler;
  },
};
const context = vm.createContext({
  console,
  document,
  window,
  localStorage,
  navigator: { clipboard: { writeText: async () => {} } },
  location: { hash: "", origin: "http://localhost:8000", pathname: "/" },
  structuredClone,
  Intl,
  Date,
  Math,
  JSON,
  Number,
  String,
  Boolean,
  Array,
  Object,
  encodeURIComponent,
  decodeURIComponent,
  setTimeout: () => 1,
  clearTimeout: () => {},
});

vm.runInContext(read("js/demo-data.js"), context, {
  filename: "js/demo-data.js",
});
vm.runInContext(
  `const oldState = freshState();
   oldState.version = 1;
   oldState.onboarded = true;
   oldState.authed = true;
   oldState.user.location = null;
   delete oldState.chats;
   delete oldState.saved;
   delete oldState.deals;
   delete oldState.reviews;
   localStorage.setItem(STORAGE_KEY, JSON.stringify(oldState));`,
  context,
);
vm.runInContext(read("js/app.js"), context, { filename: "js/app.js" });

const app = getNode("app");
const overlay = getNode("overlay-root");
const click = async (dataset, extras = {}) => {
  const target = {
    dataset,
    classList: { toggle() {} },
    closest() {
      return this;
    },
    focus() {
      document.activeElement = this;
      this.focused = true;
    },
    ...extras,
  };
  await listeners.click({ target });
  return target;
};
const input = (id, value) =>
  listeners.input({
    target: {
      id,
      value,
      closest() {
        return null;
      },
    },
  });

(async () => {
  assert.match(app.innerHTML, /BuildCycle/);
  assert.doesNotMatch(app.innerHTML, /id="search-input"/);
  assert.equal(vm.runInContext("data.version", context), 3);
  assert.equal(vm.runInContext("data.chats.length", context), 4);
  assert.equal(vm.runInContext("data.user.location", context), "Tubigon, Bohol");
  assert.equal(JSON.parse(storage.get("buildcycle-demo-v2")).version, 3);

  assert.equal(
    vm.runInContext('listingAvailableQuantity(getListing("blocks"))', context),
    200,
  );
  vm.runInContext(
    'ui.selectedId = "blocks"; ui.quantity = 20; ui.sheet = "checkout";',
    context,
  );
  const quantityCheckout = vm.runInContext("renderSheet()", context);
  assert.match(quantityCheckout, /name="quantity"/);
  assert.match(quantityCheckout, /max="200"/);
  assert.match(quantityCheckout, /₱360/);
  vm.runInContext(
    'ui.sheet = null; startDeal(getListing("blocks"), { quantity: 20, price: 18 });',
    context,
  );
  assert.equal(vm.runInContext("data.deals[0].quantity", context), 20);
  assert.match(vm.runInContext("renderDeal()", context), /Material subtotal/);
  assert.match(vm.runInContext("renderDeal()", context), /₱360/);
  vm.runInContext('goto("home")', context);

  const onboarding = vm.runInContext("renderOnboarding()", context);
  assert.match(onboarding, /progress-dots single/);
  assert.equal((onboarding.match(/<span/g) || []).length, 1);

  await click({ go: "search" });
  input("search-input", "nothing-will-match");
  assert.match(getNode("search-results").innerHTML, /Reset search/);
  await click({ action: "reset-search" });
  assert.equal(vm.runInContext("ui.search", context), "");
  assert.match(app.innerHTML, /Ceramic Floor Tiles/);

  await click({ save: "tiles" });
  await click({ go: "profile" });
  assert.match(app.innerHTML, /class="profile-row-meta"[^>]*>1<\/span>/);
  assert.match(app.innerHTML, /data-action="try-web"/);

  await click({ go: "chats" });
  await click({ action: "chat-search" });
  assert.match(app.innerHTML, /id="chat-search-input"/);
  input("chat-search-input", "Marcus");
  assert.match(getNode("chat-list").innerHTML, /Marcus D\./);
  assert.doesNotMatch(getNode("chat-list").innerHTML, /Jessa M\./);
  await click({ action: "clear-chat-search" });
  assert.doesNotMatch(app.innerHTML, /id="chat-search-input"/);

  const opener = await click({ sheet: "settings" });
  assert.match(overlay.innerHTML, /role="dialog"/);
  assert.doesNotMatch(overlay.innerHTML, /Try the Web!/);
  assert.equal(document.activeElement, closeButton);
  let prevented = false;
  listeners.keydown({
    key: "Escape",
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(overlay.innerHTML, "");
  assert.equal(document.activeElement, opener);
  assert.equal(typeof windowListeners.storage, "function");

  const index = read("index.html");
  assert.ok(
    index.indexOf("js/demo-data.js") < index.indexOf("js/app.js"),
    "demo data must load before the app",
  );
  assert.doesNotMatch(index, /type="module"/);
  for (const file of ["css/base.css", "css/marketplace.css", "css/flows.css"]) {
    const css = read(file);
    assert.equal(
      (css.match(/{/g) || []).length,
      (css.match(/}/g) || []).length,
      `${file} has balanced braces`,
    );
  }
  for (const asset of [
    "logo.png",
    "blocks.png",
    "cement.png",
    "lumber.png",
    "plywood.png",
    "rebar.png",
    "tiles.png",
    "wire.png",
  ]) {
    assert.ok(fs.existsSync(path.join(root, "assets", asset)), `${asset} exists`);
  }

  console.log(
    "BuildCycle smoke test passed: boot, migration, quantity deals, search, save, chat, sheets, and assets.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
