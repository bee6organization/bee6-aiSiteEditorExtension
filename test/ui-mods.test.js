import test from "node:test";
import assert from "node:assert/strict";
import { makeDoc } from "./dom.js";
import { createModsView } from "../lib/ui/mods-view.js";

test("lista os mods com nome, descrição e texto de acesso; a chave chama onToggle", () => {
  const { doc, win } = makeDoc("<body><div id='mods'></div></body>");
  const calls = [];
  const view = createModsView(doc, doc.getElementById("mods"), { onToggle: (id, on) => calls.push([id, on]) });
  view.setMods([{ id: "m1", name: "Mod 1", description: "faz algo", access: "usa sua sessão", enabled: false }]);

  const cb = doc.querySelector('[data-mod-id="m1"]');
  assert.equal(cb.checked, false);
  assert.equal(doc.querySelector(".aise-mod-name").textContent, "Mod 1");
  assert.equal(doc.querySelector(".aise-mod-access").textContent, "usa sua sessão");

  cb.checked = true;
  cb.dispatchEvent(new win.Event("change"));
  assert.deepEqual(calls, [["m1", true]]);
});

test("texto do mod entra como texto, nunca como HTML", () => {
  const { doc } = makeDoc("<body><div id='mods'></div></body>");
  const view = createModsView(doc, doc.getElementById("mods"));
  view.setMods([{ id: "m1", name: "<img src=x onerror=alert(1)>", description: "", access: "", enabled: true }]);
  assert.equal(doc.querySelector("img"), null);
});

test("setBusy desabilita as chaves; setError mostra e esconde a mensagem", () => {
  const { doc } = makeDoc("<body><div id='mods'></div></body>");
  const view = createModsView(doc, doc.getElementById("mods"));
  view.setMods([{ id: "m1", name: "a", description: "", access: "", enabled: true }]);
  view.setBusy("m1");
  assert.equal(doc.querySelector('[data-mod-id="m1"]').disabled, true);
  view.setBusy(null);
  assert.equal(doc.querySelector('[data-mod-id="m1"]').disabled, false);

  const err = doc.querySelector(".aise-popup-error");
  view.setError("falhou");
  assert.equal(err.hidden, false);
  assert.equal(err.textContent, "falhou");
  view.setError("");
  assert.equal(err.hidden, true);
});
