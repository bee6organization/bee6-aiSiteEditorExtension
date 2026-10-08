import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const STYLES = readFileSync(new URL("../mods/reddit-cfmod/styles.js", import.meta.url), "utf8");
const CONTENT = readFileSync(new URL("../mods/reddit-cfmod/content.js", import.meta.url), "utf8");

// Carrega o mod numa página falsa do Reddit com um `chrome` mínimo.
// `body` monta a página falsa do Reddit e `setup(win)` roda antes do mod (stubs
// de layout, que o jsdom não calcula). `roots` guarda os shadow roots fechados
// que o mod cria, para o teste conseguir clicar dentro deles.
function loadMod({ path = "/user/fulano/m/meufeed/", enabled = true, body = "", setup } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body>${body}</body></html>`, {
    url: `https://www.reddit.com${path}`,
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const win = dom.window;
  const store = { "mods:enabled": enabled ? { "reddit-cfmod": true } : {} };
  const listeners = [];
  win.chrome = {
    storage: {
      local: {
        get: (key, cb) => cb(key in store ? { [key]: store[key] } : {}),
        set: (obj, cb) => { Object.assign(store, obj); cb && cb(); },
      },
      onChanged: { addListener: (fn) => listeners.push(fn) },
    },
  };
  win.fetch = () => new Promise(() => {}); // nenhuma rede no teste
  const roots = [];
  const attach = win.Element.prototype.attachShadow;
  win.Element.prototype.attachShadow = function (init) {
    const r = attach.call(this, init);
    roots.push(r);
    return r;
  };
  if (setup) setup(win);
  win.eval(STYLES);
  win.eval(CONTENT);
  const setEnabled = (on) => {
    const newValue = on ? { "reddit-cfmod": true } : {};
    store["mods:enabled"] = newValue;
    for (const fn of listeners) fn({ "mods:enabled": { newValue } }, "local");
  };
  return { dom, win, doc: win.document, setEnabled, roots };
}

test("mod ligado em página de feed mostra o botão num <aise-mod> com shadow root fechado", () => {
  const { doc } = loadMod();
  const hosts = doc.querySelectorAll("aise-mod");
  assert.equal(hosts.length, 1);
  assert.equal(hosts[0].getAttribute("data-mod"), "reddit-cfmod");
  assert.equal(hosts[0].shadowRoot, null, "shadow root precisa ser fechado");
  assert.equal(doc.querySelector(".cfmod-fab"), null, "nada do mod no DOM da página");
});

test("mod desligado não toca a página", () => {
  const { doc } = loadMod({ enabled: false });
  assert.equal(doc.querySelector("aise-mod"), null);
});

test("fora de página de feed não aparece", () => {
  const { doc } = loadMod({ path: "/r/brasil/" });
  assert.equal(doc.querySelector("aise-mod"), null);
});

test("desligar no popup desmonta na hora; religar monta de novo", () => {
  const { doc, setEnabled } = loadMod();
  assert.ok(doc.querySelector("aise-mod"));
  setEnabled(false);
  assert.equal(doc.querySelector("aise-mod"), null);
  setEnabled(true);
  assert.ok(doc.querySelector("aise-mod"));
});

test("carga dupla (injeção em aba já aberta) não duplica o botão", () => {
  const { win, doc } = loadMod();
  win.eval(CONTENT);
  assert.equal(doc.querySelectorAll("aise-mod").length, 1);
});

test("código do mod não usa innerHTML, eval nem rede fora do Reddit", () => {
  const code = CONTENT.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|\beval\(|new Function/.test(code));
  const urls = CONTENT.match(/https?:\/\/[^\s'"`)]+/g) || [];
  for (const u of urls) {
    if (u === "http://www.w3.org/2000/svg") continue; // namespace, não é requisição
    assert.ok(/^https:\/\/(www\.reddit\.com|bee6\.com\.br\/)/.test(u), u);
  }
});

// Acha um elemento dentro dos shadow roots fechados do mod.
function inMod(roots, sel) {
  for (const r of roots) {
    const n = r.querySelector(sel);
    if (n) return n;
  }
  return null;
}

test("teclas e foco dentro do modal não chegam aos listeners da página (focus trap do Reddit)", () => {
  const { win, doc, roots } = loadMod({ body: '<input id="pagina">' });
  const seen = { key: 0, focus: 0 };
  doc.addEventListener("keydown", () => seen.key++);
  doc.addEventListener("focusin", () => seen.focus++, true);
  inMod(roots, ".cfmod-fab").click();
  const search = inMod(roots, ".cfmod-search");
  assert.ok(search, "painel abriu");
  search.focus();
  search.dispatchEvent(new win.KeyboardEvent("keydown", { key: "k", bubbles: true, composed: true }));
  assert.deepEqual(seen, { key: 0, focus: 0 });
  doc.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  doc.getElementById("pagina").focus();
  assert.ok(seen.focus >= 1, "com o modal fechado, o foco volta a chegar à página");
});

test("fechar o modal fecha também o painel nativo Communities do Reddit", () => {
  let fechou = 0;
  const { win, doc, roots } = loadMod({
    body: '<div><input placeholder="Search communities"><button aria-label="Close">x</button></div>',
    setup: (w) => {
      w.HTMLInputElement.prototype.getClientRects = () => [{}];
      // × na mesma linha da busca, colado à direita.
      w.Element.prototype.getBoundingClientRect = function () {
        if (this.tagName === "INPUT") return { top: 30, bottom: 50, left: 0, right: 200, height: 20, width: 200 };
        if (this.tagName === "BUTTON") return { top: 30, bottom: 50, left: 210, right: 230, height: 20, width: 20 };
        return { top: 0, bottom: 0, left: 0, right: 0, height: 0, width: 0 };
      };
    },
  });
  doc.querySelector('button[aria-label="Close"]').addEventListener("click", () => fechou++);
  inMod(roots, ".cfmod-fab").click();
  doc.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(fechou, 1);
  assert.equal(inMod(roots, ".cfmod-panel")?.isConnected ?? false, false, "modal do mod fechou");
});

test("× nativo só com ícone (sem rótulo) é achado pela posição perto da busca", () => {
  let fechou = 0;
  const { win, doc, roots } = loadMod({
    body: '<div><button id="x"><svg icon-name="close-outline"></svg></button><input placeholder="Search communities"></div>' +
      '<button id="longe" aria-label="Close banner">x</button>',
    setup: (w) => {
      w.HTMLInputElement.prototype.getClientRects = () => [{}];
      w.Element.prototype.getBoundingClientRect = function () {
        if (this.id === "x") return { top: 0, bottom: 20, left: 100, right: 120, height: 20, width: 20 };
        if (this.id === "longe") return { top: 600, bottom: 620, left: 900, right: 920, height: 20, width: 20 };
        if (this.tagName === "INPUT") return { top: 30, bottom: 50, left: 0, right: 200, height: 20, width: 200 };
        return { top: 0, bottom: 0, left: 0, right: 0, height: 0, width: 0 };
      };
    },
  });
  doc.getElementById("x").addEventListener("click", () => fechou++);
  doc.getElementById("longe").addEventListener("click", () => { throw new Error("clicou no Close errado"); });
  inMod(roots, ".cfmod-fab").click();
  doc.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(fechou, 1);
});

test("sem modal aberto, desligar o mod não fecha o painel nativo do Reddit", () => {
  let fechou = 0;
  const { doc, setEnabled } = loadMod({
    body: '<div><input placeholder="Search communities"><button aria-label="Close">x</button></div>',
    setup: (w) => { w.HTMLInputElement.prototype.getClientRects = () => [{}]; },
  });
  doc.querySelector('button[aria-label="Close"]').addEventListener("click", () => fechou++);
  setEnabled(false);
  assert.equal(fechou, 0);
});

test("botão + entra ao lado do lápis da seção Communities e abre o modal", () => {
  const { doc, roots, setEnabled } = loadMod({
    body: '<div class="sec"><h3>Communities</h3><button id="lapis"><svg></svg></button></div>',
    setup: (w) => {
      w.Element.prototype.getBoundingClientRect = function () {
        return { top: 10, height: 20, left: 0, width: 20, right: 20, bottom: 30 };
      };
    },
  });
  const host = doc.getElementById("lapis").nextElementSibling;
  assert.equal(host?.tagName, "AISE-MOD");
  assert.equal(host.getAttribute("data-part"), "mini");
  const mini = inMod(roots, ".cfmod-mini");
  assert.equal(mini.style.height, "20px", "mesmo tamanho do lápis");
  mini.click();
  assert.ok(inMod(roots, ".cfmod-panel")?.isConnected, "modal abriu");
  setEnabled(false);
  assert.equal(doc.querySelector("aise-mod"), null, "desligar remove o + também");
});
