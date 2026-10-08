import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  NATIVE_MODS,
  ENABLED_KEY,
  validateModDef,
  getEnabledMods,
  setModEnabled,
  syncRegisteredMods,
  contentScriptFor,
  urlMatches,
} from "../lib/mods.js";

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    async get(key) {
      return key in data ? { [key]: data[key] } : {};
    },
    async set(obj) {
      Object.assign(data, obj);
    },
  };
}

function fakeScripting(registered = []) {
  let scripts = registered.map((s) => ({ ...s }));
  return {
    get scripts() {
      return scripts;
    },
    async getRegisteredContentScripts() {
      return scripts.map((s) => ({ ...s }));
    },
    async registerContentScripts(list) {
      for (const s of list) {
        if (scripts.some((x) => x.id === s.id)) throw new Error(`duplicate id ${s.id}`);
        scripts.push({ ...s });
      }
    },
    async unregisterContentScripts({ ids }) {
      scripts = scripts.filter((s) => !ids.includes(s.id));
    },
  };
}

test("todo mod nativo passa na validação e os arquivos existem", () => {
  assert.ok(NATIVE_MODS.length > 0);
  const ids = new Set();
  for (const mod of NATIVE_MODS) {
    assert.deepEqual(validateModDef(mod), [], mod.id);
    assert.ok(!ids.has(mod.id), `id repetido: ${mod.id}`);
    ids.add(mod.id);
    for (const f of mod.js) assert.ok(existsSync(new URL(`../${f}`, import.meta.url)), `falta ${f}`);
  }
});

test("validateModDef recusa match amplo e arquivo fora da pasta do mod", () => {
  const base = { id: "x", name: "X", access: "a", matches: ["https://example.com/*"], js: ["mods/x/a.js"] };
  assert.deepEqual(validateModDef(base), []);
  for (const m of ["<all_urls>", "*://*/*", "https://*/*", "http://example.com/*", "https://*.com/*", "https://*.com.br/*", "https://*.reddit.com/*"]) {
    assert.ok(validateModDef({ ...base, matches: [m] }).length > 0, m);
  }
  assert.ok(validateModDef({ ...base, js: ["content.js"] }).length > 0);
  assert.ok(validateModDef({ ...base, js: ["mods/x/../../content.js"] }).length > 0);
  assert.ok(validateModDef({ ...base, access: "" }).length > 0);
});

test("manifest não carrega nenhum mod de forma fixa nem expõe arquivo de mod", () => {
  const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
  const fixed = (manifest.content_scripts || []).flatMap((c) => c.js || []);
  assert.ok(fixed.every((f) => !f.startsWith("mods/")));
  const war = (manifest.web_accessible_resources || []).flatMap((w) => w.resources);
  assert.ok(war.every((r) => !r.startsWith("mods/")));
});

test("mods nascem desligados; setModEnabled liga, desliga e recusa id desconhecido", async () => {
  const storage = fakeStorage();
  assert.deepEqual(await getEnabledMods(storage), {});
  await setModEnabled(storage, "reddit-cfmod", true);
  assert.deepEqual(storage.data[ENABLED_KEY], { "reddit-cfmod": true });
  await setModEnabled(storage, "reddit-cfmod", false);
  assert.deepEqual(storage.data[ENABLED_KEY], {});
  await assert.rejects(() => setModEnabled(storage, "nao-existe", true));
});

test("syncRegisteredMods registra só os ligados, só nos matches do mod, e limpa órfãos", async () => {
  const scripting = fakeScripting([
    { id: "aise-mod-antigo", matches: ["https://x.com/*"], js: ["mods/antigo/a.js"] },
    { id: "outro-script", matches: ["https://y.com/*"], js: ["y.js"] },
  ]);
  await syncRegisteredMods(scripting, { "reddit-cfmod": true });
  const ids = scripting.scripts.map((s) => s.id).sort();
  assert.deepEqual(ids, ["aise-mod-reddit-cfmod", "outro-script"]);
  const reg = scripting.scripts.find((s) => s.id === "aise-mod-reddit-cfmod");
  assert.deepEqual(reg.matches, ["https://www.reddit.com/*"]);
  assert.equal(reg.allFrames, false);

  // Sincronizar de novo não duplica (o fake joga erro em id repetido).
  await syncRegisteredMods(scripting, { "reddit-cfmod": true });

  await syncRegisteredMods(scripting, {});
  assert.deepEqual(scripting.scripts.map((s) => s.id), ["outro-script"]);
});

test("contentScriptFor copia arrays (sem compartilhar referência com o registro)", () => {
  const mod = NATIVE_MODS[0];
  const cs = contentScriptFor(mod);
  cs.matches.push("https://evil.example/*");
  assert.ok(!mod.matches.includes("https://evil.example/*"));
});

test("urlMatches só casa com os hosts do mod", () => {
  const mod = NATIVE_MODS.find((m) => m.id === "reddit-cfmod");
  assert.equal(urlMatches(mod, "https://www.reddit.com/user/a/m/b"), true);
  assert.equal(urlMatches(mod, "https://old.reddit.com/"), false);
  assert.equal(urlMatches(mod, "https://www.reddit.com.evil.example/"), false);
  assert.equal(urlMatches(mod, "http://www.reddit.com/"), false);
  assert.equal(urlMatches(mod, undefined), false);
});
