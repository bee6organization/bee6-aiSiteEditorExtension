// lib/ui/mods-view.js — seção "Mods" do popup: uma chave liga/desliga por mod
// nativo, com o texto de acesso visível antes de ligar. Módulo puro: recebe o
// `doc` e um container; quem fala com o background é o popup.js.
//
// Todo texto entra por textContent. Os dados vêm do próprio pacote da
// extensão, mas a regra vale igual.

export function createModsView(doc, root, handlers = {}) {
  root.textContent = "";
  const wrap = doc.createElement("section");
  wrap.className = "aise-mods";
  const title = doc.createElement("h2");
  title.className = "aise-mods-title";
  title.textContent = "Mods";
  const list = doc.createElement("div");
  list.className = "aise-mods-list";
  const errorEl = doc.createElement("div");
  errorEl.className = "aise-popup-error";
  errorEl.hidden = true;
  wrap.append(title, list, errorEl);
  root.append(wrap);

  let busyId = null;
  let mods = [];

  function render() {
    list.textContent = "";
    for (const mod of mods) {
      const row = doc.createElement("label");
      row.className = "aise-mod";

      const cb = doc.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!mod.enabled;
      cb.disabled = busyId !== null;
      cb.setAttribute("data-mod-id", mod.id);
      cb.addEventListener("change", () => {
        // Otimista: o setBusy() re-renderiza e a caixa não pode voltar ao
        // estado antigo enquanto o background trabalha.
        mods = mods.map((m) => (m.id === mod.id ? { ...m, enabled: cb.checked } : m));
        if (handlers.onToggle) handlers.onToggle(mod.id, cb.checked);
      });

      const info = doc.createElement("span");
      info.className = "aise-mod-info";
      const name = doc.createElement("span");
      name.className = "aise-mod-name";
      name.textContent = mod.name;
      const desc = doc.createElement("span");
      desc.className = "aise-mod-desc";
      desc.textContent = mod.description;
      const access = doc.createElement("span");
      access.className = "aise-mod-access";
      access.textContent = mod.access;
      info.append(name, desc, access);

      row.append(cb, info);
      list.append(row);
    }
  }

  return {
    setMods(next) {
      mods = Array.isArray(next) ? next : [];
      render();
    },
    setBusy(id) {
      busyId = id;
      render();
    },
    setError(msg) {
      errorEl.textContent = msg || "";
      errorEl.hidden = !msg;
    },
  };
}
