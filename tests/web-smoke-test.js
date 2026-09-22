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
const dialogClose = makeNode("dialog-close");
const document = {
  activeElement: null,
  getElementById: getNode,
  addEventListener(type, handler) {
    listeners[type] = handler;
  },
  querySelector(selector) {
    return selector === ".dialog-close" ? dialogClose : null;
  },
};
const window = {
  scrollTo() {},
  addEventListener(type, handler) {
    windowListeners[type] = handler;
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
const context = vm.createContext({
  console,
  document,
  window,
  localStorage,
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
  setTimeout: () => 1,
  clearTimeout: () => {},
});

vm.runInContext(read("js/demo-data.js"), context, {
  filename: "js/demo-data.js",
});
vm.runInContext(
  `const webSeed = freshState();
   webSeed.onboarded = true;
   webSeed.authed = true;
   localStorage.setItem(STORAGE_KEY, JSON.stringify(webSeed));`,
  context,
);
vm.runInContext(read("js/web-app.js"), context, {
  filename: "js/web-app.js",
});

const app = getNode("web-app");
const overlay = getNode("web-dialog-root");
const click = (dataset) => {
  const target = {
    dataset,
    classList: { contains: () => false },
    closest() {
      return this;
    },
    focus() {
      document.activeElement = this;
    },
  };
  listeners.click({ target });
  return target;
};

assert.match(app.innerHTML, /Useful materials deserve another project/);
assert.match(app.innerHTML, /Ceramic Floor Tiles — Sealed Boxes/);
assert.doesNotMatch(app.innerHTML, /12mm deformed steel bars/);

click({ webGo: "search" });
assert.equal((app.innerHTML.match(/class="listing-card"/g) || []).length, 8);
click({ webSave: "tiles" });
click({ webGo: "profile" });
assert.match(app.innerHTML, /Saved items<\/span><b>1<\/b>/);
assert.match(app.innerHTML, /data-web-dialog="settings"/);
assert.match(app.innerHTML, /data-web-action="try-mobile"/);
const settingsOpener = click({ webDialog: "settings" });
assert.doesNotMatch(overlay.innerHTML, /Try Mobile!/);
click({ webAction: "close-dialog" });
assert.equal(document.activeElement, settingsOpener);

click({ webGo: "chats" });
listeners.input({ target: { id: "web-chat-search", value: "Marcus" } });
assert.match(getNode("web-chat-list").innerHTML, /Marcus D\./);
assert.doesNotMatch(getNode("web-chat-list").innerHTML, /Jessa M\./);

vm.runInContext(`webUI.selectedId = "lumber"; goWeb("detail")`, context);
const opener = click({ webDialog: "offer" });
assert.match(overlay.innerHTML, /role="dialog"/);
assert.equal(document.activeElement, dialogClose);
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

const html = read("BuildCycle_Web.html");
assert.match(html, /js\/demo-data\.js/);
assert.match(html, /js\/web-app\.js/);
assert.ok(
  html.indexOf("js/demo-data.js") < html.indexOf("js/web-app.js"),
  "shared data must load before the web client",
);
assert.equal(typeof windowListeners.storage, "function");

console.log(
  "BuildCycle web smoke test passed: shared data, search, save, chat, and dialog behavior.",
);
