// mods/reddit-cfmod/content.js — mod nativo "Reddit Custom Feeds": edição em
// massa de custom feeds. Portado do Reddit-CFMod (repositório bee6-reddit-MOD).
//
// Só roda em www.reddit.com e só depois que o usuário liga o mod no popup
// (registro dinâmico em lib/mods.js). Conversa apenas com www.reddit.com, com a
// sessão do usuário; nenhuma IA, nenhum servidor de terceiros.
//
// Diferenças em relação à extensão original, todas por segurança:
// - UI inteira dentro de shadow DOM fechado (<aise-mod>): a página não lê nem
//   altera o painel, e o editor de IA do aiSiteEditor ignora esses nós.
// - Nenhum innerHTML: texto de API (nome de feed, de comunidade) entra só como
//   textContent; os ícones SVG são montados com createElementNS.
// - Ícone de comunidade só carrega de host do próprio Reddit, via https.
// - Parâmetros de URL da API sempre codificados.
// - Cache em chrome.storage.local com o prefixo do mod (mod:reddit-cfmod:*).
// - Desligar o mod no popup desmonta tudo na hora, sem recarregar a aba.
// - O painel nativo "Communities" só é fechado junto quando o nosso modal
//   estava aberto (na original, sair do feed também podia fechá-lo).
(() => {
  'use strict';

  if (globalThis.__aiseRedditCfmodLoaded) return;
  globalThis.__aiseRedditCfmodLoaded = true;

  const MOD_ID = 'reddit-cfmod';
  const ENABLED_KEY = 'mods:enabled';
  const FEED_RE = /^\/(?:user|u)\/([^/]+)\/m\/([^/]+)/i;
  const CACHE_KEY = `mod:${MOD_ID}:subscriptions`;
  const CACHE_TTL = 10 * 60 * 1000;
  const ORIGIN = 'https://www.reddit.com';
  const ICON_HOST_RE = /(^|\.)(redditstatic\.com|redditmedia\.com|redd\.it|reddit\.com)$/i;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const CSS = (globalThis.__aiseModStyles || {})[MOD_ID] || '';

  // ---------- idioma ----------
  // Língua do navegador (navigator.languages em ordem de preferência).
  // pt → português, es → espanhol, qualquer outra → inglês.

  const STRINGS = {
    pt: {
      close: 'Fechar',
      inFeed: 'No feed',
      following: 'Comunidades que você segue',
      filter: 'Filtrar comunidades…',
      filterLabel: 'Filtrar',
      allVisible: 'todas visíveis',
      reload: 'Recarregar lista de comunidades seguidas',
      add: 'Adicionar selecionadas',
      addN: (n) => `Adicionar ${n} selecionada${n > 1 ? 's' : ''}`,
      remove: 'Remover do feed',
      removeSr: (s) => `Remover r/${s}`,
      emptyIn: 'Nenhuma comunidade ainda.',
      emptyOut: 'Nada para mostrar.',
      readOnly: 'Este feed não é seu: só leitura.',
      loading: 'Carregando…',
      adding: (i, n, s) => `Adicionando ${i} de ${n}: r/${s}`,
      failed: (l) => `Falharam: ${l}`,
      added: (n) => `${n} adicionada(s). Recarregue a página para ver o feed atualizado.`,
      removing: (s) => `Removendo r/${s}…`,
      removed: (s) => `r/${s} removida.`,
      noSession: 'Não foi possível obter a sessão. Você está logado?',
      fab: 'Adição Customizada',
      fabAria: 'Editar comunidades em massa (Reddit Custom Feeds)',
      credit: 'Desenvolvida e customizada por',
      creditUrl: 'https://bee6.com.br/',
    },
    en: {
      close: 'Close',
      inFeed: 'In this feed',
      following: 'Communities you follow',
      filter: 'Filter communities…',
      filterLabel: 'Filter',
      allVisible: 'all visible',
      reload: 'Reload followed communities',
      add: 'Add selected',
      addN: (n) => `Add ${n} selected`,
      remove: 'Remove from feed',
      removeSr: (s) => `Remove r/${s}`,
      emptyIn: 'No communities yet.',
      emptyOut: 'Nothing to show.',
      readOnly: "This feed isn't yours: read only.",
      loading: 'Loading…',
      adding: (i, n, s) => `Adding ${i} of ${n}: r/${s}`,
      failed: (l) => `Failed: ${l}`,
      added: (n) => `${n} added. Reload the page to see the updated feed.`,
      removing: (s) => `Removing r/${s}…`,
      removed: (s) => `r/${s} removed.`,
      noSession: "Couldn't read your session. Are you logged in?",
      fab: 'Custom Add',
      fabAria: 'Bulk edit communities (Reddit Custom Feeds)',
      credit: 'Built and customized by',
      creditUrl: 'https://bee6.com.br/en',
    },
    es: {
      close: 'Cerrar',
      inFeed: 'En el feed',
      following: 'Comunidades que sigues',
      filter: 'Filtrar comunidades…',
      filterLabel: 'Filtrar',
      allVisible: 'todas las visibles',
      reload: 'Recargar comunidades seguidas',
      add: 'Añadir seleccionadas',
      addN: (n) => `Añadir ${n} seleccionada${n > 1 ? 's' : ''}`,
      remove: 'Quitar del feed',
      removeSr: (s) => `Quitar r/${s}`,
      emptyIn: 'Todavía no hay comunidades.',
      emptyOut: 'No hay nada que mostrar.',
      readOnly: 'Este feed no es tuyo: solo lectura.',
      loading: 'Cargando…',
      adding: (i, n, s) => `Añadiendo ${i} de ${n}: r/${s}`,
      failed: (l) => `Fallaron: ${l}`,
      added: (n) => `${n} añadida(s). Recarga la página para ver el feed actualizado.`,
      removing: (s) => `Quitando r/${s}…`,
      removed: (s) => `r/${s} quitada.`,
      noSession: 'No se pudo leer tu sesión. ¿Has iniciado sesión?',
      fab: 'Adición Personalizada',
      fabAria: 'Editar comunidades en bloque (Reddit Custom Feeds)',
      credit: 'Desarrollada y personalizada por',
      creditUrl: 'https://bee6.com.br/es',
    },
  };

  function pickLang() {
    const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
    for (const l of prefs) {
      const base = String(l).toLowerCase().split('-')[0];
      if (STRINGS[base]) return base;
    }
    return 'en';
  }

  const LANG = pickLang();
  const T = STRINGS[LANG];

  let panel = null;
  let fab = null;
  let fabHost = null;
  let state = null;

  // ---------- API (mesma origem, cookies da sessão) ----------

  async function api(path, opts = {}) {
    const res = await fetch(ORIGIN + path, { credentials: 'include', ...opts });
    if (!res.ok) throw new Error(`${opts.method || 'GET'} ${path} → ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function getModhash() {
    const me = await api('/api/me.json?raw_json=1');
    const hash = me && me.data && me.data.modhash;
    if (!hash) throw new Error(T.noSession);
    return hash;
  }

  async function getSubscriptions(force) {
    if (!force) {
      const cached = await storageGet(CACHE_KEY);
      if (cached && Date.now() - cached.at < CACHE_TTL) return cached.list;
    }
    const list = [];
    let after = '';
    do {
      const page = await api(`/subreddits/mine/subscriber.json?limit=100&raw_json=1${after ? '&after=' + encodeURIComponent(after) : ''}`);
      for (const c of page.data.children) {
        const d = c.data;
        if (d.subreddit_type === 'user') continue; // perfis seguidos não entram em feed como r/
        list.push({ name: d.display_name, icon: d.community_icon || d.icon_img || '', subs: d.subscribers || 0 });
      }
      after = page.data.after;
    } while (after);
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    await storageSet(CACHE_KEY, { at: Date.now(), list });
    return list;
  }

  async function getFeed(user, feed) {
    const r = await api(`/api/multi/user/${encodeURIComponent(user)}/m/${encodeURIComponent(feed)}?raw_json=1`);
    const d = r.data;
    return {
      displayName: d.display_name,
      canEdit: d.can_edit,
      subs: d.subreddits.map((s) => s.name),
    };
  }

  function multiPath(user, feed, sr) {
    return `/api/multi/user/${encodeURIComponent(user)}/m/${encodeURIComponent(feed)}/r/${encodeURIComponent(sr)}`;
  }

  async function addToFeed(user, feed, sr, modhash) {
    const body = new URLSearchParams({ model: JSON.stringify({ name: sr }), srname: sr, api_type: 'json' });
    await api(multiPath(user, feed, sr), { method: 'PUT', headers: { 'X-Modhash': modhash }, body });
  }

  async function removeFromFeed(user, feed, sr, modhash) {
    await api(multiPath(user, feed, sr) + '?api_type=json', { method: 'DELETE', headers: { 'X-Modhash': modhash } });
  }

  // ---------- storage local ----------

  function storageGet(key) {
    return new Promise((ok) => chrome.storage.local.get(key, (v) => ok(v[key])));
  }
  function storageSet(key, value) {
    return new Promise((ok) => chrome.storage.local.set({ [key]: value }, ok));
  }

  // ---------- UI ----------

  function el(tag, attrs = {}, ...children) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (k === 'class') n.className = v;
      else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children) if (c != null) n.append(c);
    return n;
  }

  function svg(tag, attrs = {}, ...children) {
    const n = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    for (const c of children) n.append(c);
    return n;
  }

  // Host isolado: shadow root fechado, com o CSS do mod dentro. A página só
  // enxerga um <aise-mod> vazio.
  function makeHost(part) {
    const host = document.createElement('aise-mod');
    host.setAttribute('data-mod', MOD_ID);
    if (part) host.setAttribute('data-part', part);
    const root = host.attachShadow({ mode: 'closed' });
    root.append(el('style', {}, CSS));
    return { host, root };
  }

  function safeIconUrl(raw) {
    try {
      const u = new URL(String(raw || ''));
      return u.protocol === 'https:' && ICON_HOST_RE.test(u.hostname) ? u.href : '';
    } catch {
      return '';
    }
  }

  function avatar(sub) {
    const src = sub ? safeIconUrl(sub.icon) : '';
    if (src) return el('img', { class: 'cfmod-ico', src, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
    return el('span', { class: 'cfmod-ico cfmod-ico-blank' }, 'r/');
  }

  function fmt(n) {
    return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n);
  }

  // Favo da bee6 desenhado em SVG local (sem buscar nada de fora).
  function hexIcon() {
    return svg('svg', { viewBox: '0 0 24 24', width: '14', height: '14', 'aria-hidden': 'true' },
      svg('path', { d: 'M12 2.5 20.2 7.2v9.6L12 21.5 3.8 16.8V7.2z', fill: 'currentColor' }));
  }

  // Ícone do botão: favo hexagonal com as camadas do feed dentro e um "+".
  function fabIcon() {
    return el('span', { class: 'cfmod-fab-ico', 'aria-hidden': 'true' },
      svg('svg', { viewBox: '0 0 24 24', width: '24', height: '24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
        svg('path', { class: 'hex', d: 'M12 1.8 21 7v10l-9 5.2L3 17V7z' }),
        svg('path', { class: 'l3', d: 'M7.5 14.6 12 17l4.5-2.4' }),
        svg('path', { class: 'l2', d: 'M7.5 12 12 14.4l4.5-2.4' }),
        svg('path', { class: 'l1', d: 'M12 7 7.5 9.4 12 11.8l4.5-2.4z' })),
      el('span', { class: 'cfmod-fab-plus' }, '+'));
  }

  function buildPanel() {
    const search = el('input', { type: 'search', class: 'cfmod-search', placeholder: T.filter, 'aria-label': T.filterLabel, oninput: renderOut });
    const selAll = el('input', { type: 'checkbox', class: 'cfmod-selall', onchange: (e) => {
      for (const s of visibleOut()) e.target.checked ? state.selected.add(s.name) : state.selected.delete(s.name);
      renderOut();
    } });
    return el('aside', { class: 'cfmod-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Reddit Custom Feeds', lang: LANG === 'pt' ? 'pt-BR' : LANG },
      el('header', { class: 'cfmod-head' },
        el('div', { class: 'cfmod-title' },
          el('span', { class: 'cfmod-brand' }, 'CFMod'),
          el('span', { class: 'cfmod-feedname' })),
        el('button', { class: 'cfmod-x', 'aria-label': T.close, title: T.close, onclick: closePanel }, '×')),
      el('div', { class: 'cfmod-status', 'aria-live': 'polite' }),
      el('section', { class: 'cfmod-sec' },
        el('h3', {}, T.inFeed + ' ', el('span', { class: 'cfmod-count', 'data-c': 'in' })),
        el('ul', { class: 'cfmod-list', 'data-list': 'in' })),
      el('section', { class: 'cfmod-sec cfmod-grow' },
        el('h3', {}, T.following + ' ', el('span', { class: 'cfmod-count', 'data-c': 'out' })),
        el('div', { class: 'cfmod-tools' }, search, el('label', { class: 'cfmod-all' }, selAll, ' ' + T.allVisible)),
        el('ul', { class: 'cfmod-list', 'data-list': 'out' })),
      el('footer', { class: 'cfmod-foot' },
        el('div', { class: 'cfmod-actions' },
          el('button', { class: 'cfmod-refresh', title: T.reload, 'aria-label': T.reload, onclick: () => load(true) }, '↻'),
          el('button', { class: 'cfmod-add', disabled: true, onclick: addSelected }, T.add)),
        el('a', { class: 'cfmod-credit', href: T.creditUrl, target: '_blank', rel: 'noopener noreferrer' },
          T.credit + ' ', el('span', { class: 'cfmod-bee6' }, hexIcon(), 'bee6'), ' 🐝')));
  }

  function setStatus(msg, kind = '') {
    if (!panel) return;
    const s = panel.querySelector('.cfmod-status');
    s.textContent = msg || '';
    s.dataset.kind = kind;
  }

  function inFeedSet() {
    return new Set(state.feed.subs.map((s) => s.toLowerCase()));
  }

  function visibleOut() {
    const q = panel.querySelector('.cfmod-search').value.trim().toLowerCase();
    const inSet = inFeedSet();
    return state.subs.filter((s) => !inSet.has(s.name.toLowerCase()) && (!q || s.name.toLowerCase().includes(q)));
  }

  function renderIn() {
    const ul = panel.querySelector('[data-list="in"]');
    ul.replaceChildren();
    const byName = new Map(state.subs.map((s) => [s.name.toLowerCase(), s]));
    const names = [...state.feed.subs].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    for (const name of names) {
      const sub = byName.get(name.toLowerCase());
      ul.append(
        el('li', {}, avatar(sub), el('span', { class: 'cfmod-name' }, 'r/' + name),
          state.feed.canEdit
            ? el('button', { class: 'cfmod-rm', title: T.remove, 'aria-label': T.removeSr(name), onclick: () => removeOne(name) }, '−')
            : null)
      );
    }
    if (!names.length) ul.append(el('li', { class: 'cfmod-empty' }, T.emptyIn));
    panel.querySelector('[data-c="in"]').textContent = names.length;
  }

  function renderOut() {
    const ul = panel.querySelector('[data-list="out"]');
    ul.replaceChildren();
    const list = visibleOut();
    for (const s of list) {
      const id = 'cfmod-' + s.name;
      const cb = el('input', { type: 'checkbox', id, checked: state.selected.has(s.name), disabled: !state.feed.canEdit });
      cb.addEventListener('change', () => {
        cb.checked ? state.selected.add(s.name) : state.selected.delete(s.name);
        updateAddBtn();
      });
      ul.append(el('li', {}, el('label', { for: id }, cb, avatar(s), el('span', { class: 'cfmod-name' }, 'r/' + s.name),
        el('span', { class: 'cfmod-meta' }, fmt(s.subs)))));
    }
    if (!list.length) ul.append(el('li', { class: 'cfmod-empty' }, T.emptyOut));
    const inSet = inFeedSet();
    panel.querySelector('[data-c="out"]').textContent = state.subs.filter((s) => !inSet.has(s.name.toLowerCase())).length;
    const all = panel.querySelector('.cfmod-selall');
    all.checked = list.length > 0 && list.every((s) => state.selected.has(s.name));
    all.disabled = !state.feed.canEdit;
    updateAddBtn();
  }

  function updateAddBtn() {
    const b = panel.querySelector('.cfmod-add');
    const n = state.selected.size;
    b.disabled = !n || state.busy || !state.feed.canEdit;
    b.textContent = n ? T.addN(n) : T.add;
  }

  function render() {
    if (!panel) return;
    panel.querySelector('.cfmod-feedname').textContent = state.feed.displayName || '';
    renderIn();
    renderOut();
    if (!state.feed.canEdit) setStatus(T.readOnly, 'warn');
  }

  // ---------- ações ----------

  async function load(force) {
    const m = location.pathname.match(FEED_RE);
    if (!m || !panel || (state && state.busy)) return; // ↻ não recria o state no meio de um lote
    state = { user: m[1], feedId: m[2], feed: { subs: [], canEdit: false }, subs: [], selected: new Set(), busy: false };
    setStatus(T.loading);
    try {
      const [feed, subs] = await Promise.all([getFeed(state.user, state.feedId), getSubscriptions(force)]);
      state.feed = feed;
      state.subs = subs;
      if (!panel) return;
      setStatus('');
      render();
    } catch (e) {
      setStatus(e.message, 'err');
    }
  }

  async function addSelected() {
    const names = [...state.selected];
    if (!names.length) return;
    // O feed do lote fica preso no início: se o state for recriado no meio
    // (navegação + ↻), os itens restantes não vão parar em outro feed.
    const { user, feedId } = state;
    state.busy = true;
    updateAddBtn();
    const failed = [];
    try {
      const modhash = await getModhash();
      for (let i = 0; i < names.length; i++) {
        if (!running) return; // mod desligado no meio do lote: para de escrever
        setStatus(T.adding(i + 1, names.length, names[i]));
        try {
          await addToFeed(user, feedId, names[i], modhash);
          state.feed.subs.push(names[i]);
          state.selected.delete(names[i]);
        } catch {
          failed.push(names[i]);
        }
        await new Promise((r) => setTimeout(r, 350)); // respeita o rate limit do Reddit
      }
      setStatus(failed.length ? T.failed(failed.map((n) => 'r/' + n).join(', ')) : T.added(names.length), failed.length ? 'err' : 'ok');
    } catch (e) {
      setStatus(e.message, 'err');
    }
    state.busy = false;
    render();
  }

  async function removeOne(name) {
    if (state.busy) return;
    const { user, feedId } = state;
    state.busy = true;
    setStatus(T.removing(name));
    try {
      await removeFromFeed(user, feedId, name, await getModhash());
      state.feed.subs = state.feed.subs.filter((s) => s.toLowerCase() !== name.toLowerCase());
      setStatus(T.removed(name), 'ok');
    } catch (e) {
      setStatus(e.message, 'err');
    }
    state.busy = false;
    render();
  }

  // ---------- ciclo de vida ----------

  // Modal central: fundo escurecido + painel centralizado. Fecha com ×, Esc ou
  // clique fora. Trava o scroll da página enquanto está aberto.
  let overlay = null;
  let overlayHost = null;
  let lastFocus = null;
  let savedOverflow = null;

  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); closePanel(); }
  }

  // O modal nativo do Reddit prende o foco dentro dele e engole as teclas, e o
  // filtro não recebia o texto. Escondemos do Reddit os eventos de foco que
  // acontecem dentro do nosso modal. Com shadow root fechado, quem escuta na
  // window vê o evento retargetado para o host, por isso a checagem é nele.
  function shieldFocus(e) {
    const t = e.composedPath ? e.composedPath()[0] : e.target;
    const rel = e.relatedTarget;
    if (overlayHost && (overlayHost.contains(t) || (rel && overlayHost.contains(rel)))) e.stopImmediatePropagation();
  }

  function lockScroll() {
    const html = document.documentElement;
    savedOverflow = [html.style.overflow, document.body.style.overflow];
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  function unlockScroll() {
    if (!savedOverflow) return;
    document.documentElement.style.overflow = savedOverflow[0];
    document.body.style.overflow = savedOverflow[1];
    savedOverflow = null;
  }

  function openPanel() {
    if (panel && panel.isConnected) return;
    lastFocus = document.activeElement;
    panel = buildPanel();
    overlay = el('div', { class: 'cfmod-overlay', onmousedown: (e) => { if (e.target === overlay) closePanel(); } }, panel);
    for (const t of ['keydown', 'keyup', 'keypress', 'input', 'beforeinput']) overlay.addEventListener(t, (e) => e.stopPropagation());
    const { host, root } = makeHost();
    root.append(overlay);
    overlayHost = host;
    document.body.append(host);
    lockScroll();
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('focusin', shieldFocus, true);
    window.addEventListener('focusout', shieldFocus, true);
    fab && fab.classList.add('is-open');
    panel.querySelector('.cfmod-search').focus();
    load(false);
  }

  function closePanel() {
    const wasOpen = !!overlayHost;
    if (overlayHost) overlayHost.remove();
    overlayHost = null;
    overlay = null;
    panel = null;
    unlockScroll();
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('focusin', shieldFocus, true);
    window.removeEventListener('focusout', shieldFocus, true);
    fab && fab.classList.remove('is-open');
    if (lastFocus && lastFocus.isConnected) lastFocus.focus();
    lastFocus = null;
    // Só mexe no Reddit se o nosso modal estava aberto: desligar o mod ou sair
    // do feed não pode fechar um painel nativo que o usuário abriu sozinho.
    if (wasOpen) closeNativeCommunities();
  }

  // Ao fechar o nosso modal, fecha também o painel nativo "Communities" (o que
  // abre pelo "Add Communities" / lápis): acha a busca dele e clica no × mais
  // próximo. A busca fixa da barra lateral não tem ×, então fica intacta.
  const NATIVE_SEARCH_RE = /search communities|pesquisar comunidades|buscar comunidades/i;
  // O × do Reddit pode não ter rótulo de texto e morar em shadow DOM; então
  // olhamos rótulo, title e nome do ícone, em todos os roots, e ficamos com o
  // × visível mais perto (acima/ao lado) do campo de busca do modal nativo.
  // Os botões do mod ficam em shadow fechado e nem aparecem em allRoots().
  function isCloseBtn(b) {
    const lbl = [b.getAttribute('aria-label'), b.title, b.textContent.trim()].join(' ');
    if (/close|fechar|cerrar|fermer|dismiss/i.test(lbl)) return true;
    return !!b.querySelector('[icon-name*="close" i], [name*="close" i], svg[class*="close" i]');
  }
  function closeNativeCommunities() {
    const roots = allRoots();
    const inputs = [];
    for (const r of roots) for (const inp of r.querySelectorAll('input'))
      if (NATIVE_SEARCH_RE.test(inp.placeholder || inp.getAttribute('aria-label') || '') && inp.getClientRects().length) inputs.push(inp.getBoundingClientRect());
    if (!inputs.length) return;
    let best = null, bestD = 160;
    for (const r of roots) for (const b of r.querySelectorAll('button')) {
      if (!isCloseBtn(b)) continue;
      const br = b.getBoundingClientRect();
      if (!br.height) continue;
      for (const ir of inputs) {
        if (br.left > ir.right + 60 || br.right < ir.left) continue;
        const d = Math.abs(ir.top - br.bottom);
        if (br.top <= ir.bottom && d < bestD) { best = b; bestD = d; }
      }
    }
    if (best) best.click();
  }

  function onFeedPage() {
    return FEED_RE.test(location.pathname);
  }

  // Botão nativo ao lado do qual o nosso entra: "Add Communities" (feed vazio)
  // ou o botão de editar o feed (feed com comunidades). EN, PT e ES.
  const ANCHOR_RE = /^(add communities|edit|edit custom feed|edit feed|adicionar comunidades|editar|editar feed|editar feed personalizado|añadir comunidades|agregar comunidades|editar feed personalizado)$/i;

  // Percorre só shadow roots abertos — os nossos são fechados e ficam de fora.
  function allRoots() {
    const roots = [document];
    for (let i = 0; i < roots.length; i++) {
      for (const h of roots[i].querySelectorAll('*')) if (h.shadowRoot) roots.push(h.shadowRoot);
    }
    return roots;
  }

  function findAnchor() {
    for (const r of allRoots()) {
      for (const b of r.querySelectorAll('button, a[role="button"]')) {
        if (b.closest('[role="dialog"], dialog, [aria-modal="true"]')) continue;
        const txt = (b.textContent || '').replace(/\s+/g, ' ').trim();
        if (ANCHOR_RE.test(txt) && b.getClientRects().length) return b;
      }
    }
    return null;
  }

  let fabAnchor = null;
  function placeFab() {
    const anchor = findAnchor();
    if (anchor) {
      if (fabAnchor !== anchor || fabHost.previousElementSibling !== anchor) {
        fabAnchor = anchor;
        fab.classList.add('is-inline');
        anchor.after(fabHost);
      }
    } else if (fabAnchor || !fabHost.isConnected) {
      // Sem botão nativo à vista: volta a flutuar no canto para nunca sumir.
      fabAnchor = null;
      fab.classList.remove('is-inline');
      document.body.append(fabHost);
    }
  }

  function removeFab() {
    fabHost && fabHost.remove();
    fab = null;
    fabHost = null;
    fabAnchor = null;
  }

  // Botão "+" ao lado do lápis de editar comunidades (seção "Communities" da
  // barra lateral do feed). O lápis é só ícone: achamos o título da seção e
  // pegamos o botão sem texto que mora na mesma linha dele.
  const SECTION_RE = /^(communities|comunidades)$/i;
  let mini = null;
  let miniHost = null;

  function findPencil() {
    for (const r of allRoots()) {
      for (const h of r.querySelectorAll('h1,h2,h3,h4,h5,h6,span,div,p')) {
        if (h.children.length || !SECTION_RE.test((h.textContent || '').trim())) continue;
        if (h.closest('[role="dialog"], dialog, [aria-modal="true"]')) continue;
        // O lápis do próprio feed também mora perto; ficamos com o botão
        // alinhado na mesma linha do título "Communities".
        const hr = h.getBoundingClientRect();
        if (!hr.height) continue;
        const hy = hr.top + hr.height / 2;
        let box = h.parentElement;
        for (let i = 0; i < 4 && box; i++, box = box.parentElement) {
          let best = null, bestD = 28;
          for (const x of box.querySelectorAll('button')) {
            if (x.textContent.trim() || !x.querySelector('svg, i, [icon-name]')) continue;
            const xr = x.getBoundingClientRect();
            if (!xr.height) continue;
            const d = Math.abs(xr.top + xr.height / 2 - hy);
            if (d < bestD) { best = x; bestD = d; }
          }
          if (best) return best;
        }
      }
    }
    return null;
  }

  function removeMini() {
    miniHost && miniHost.remove();
    mini = null;
    miniHost = null;
  }

  function placeMini() {
    const pencil = findPencil();
    if (!pencil) { removeMini(); return; }
    if (!mini) {
      mini = el('button', { class: 'cfmod-mini', type: 'button', 'aria-label': T.fabAria, title: T.fab, onclick: (e) => { e.preventDefault(); e.stopPropagation(); panel ? closePanel() : openPanel(); } }, '+');
      const { host, root } = makeHost('mini');
      root.append(mini);
      miniHost = host;
    }
    if (pencil.nextElementSibling !== miniHost) pencil.after(miniHost);
    // Mesmo tamanho do botão vizinho (lápis ou ×).
    const r = pencil.getBoundingClientRect();
    if (r.height) {
      const sz = Math.round(r.height) + 'px';
      if (mini.style.height !== sz) {
        mini.style.width = mini.style.height = sz;
        mini.style.fontSize = Math.round(r.height * 0.6) + 'px';
      }
    }
    // Alinha o centro vertical do "+" ao do botão vizinho, seja qual for o
    // layout do Reddit ali (flex, absoluto, etc.).
    const pos = getComputedStyle(pencil).position;
    const hs = miniHost.style;
    if (pos === 'absolute' || pos === 'fixed') {
      hs.position = pos;
      hs.left = (pencil.offsetLeft + pencil.offsetWidth + 6) + 'px';
      hs.top = pencil.offsetTop + 'px';
      hs.margin = '0';
    } else {
      hs.position = hs.top = hs.left = '';
      hs.margin = '0 0 0 6px';
    }
    hs.transform = '';
    const pr = pencil.getBoundingClientRect(), mr = miniHost.getBoundingClientRect();
    const dy = Math.round((pr.top + pr.height / 2) - (mr.top + mr.height / 2));
    if (dy) hs.transform = `translateY(${dy}px)`;
  }

  function syncFab() {
    if (onFeedPage()) {
      if (!fab) {
        fab = el('button', { class: 'cfmod-fab', 'aria-label': T.fabAria, onclick: () => (panel ? closePanel() : openPanel()) },
          fabIcon(), el('span', { class: 'cfmod-fab-label' }, T.fab));
        const { host, root } = makeHost();
        root.append(fab);
        fabHost = host;
        if (panel) fab.classList.add('is-open');
      }
      placeFab();
      placeMini();
    } else {
      removeFab();
      removeMini();
      closePanel();
    }
  }

  let running = false;
  let pending = false;
  let observer = null;

  function check() {
    pending = false;
    if (running) syncFab();
  }

  function start() {
    if (running) return;
    running = true;
    observer = new MutationObserver(() => {
      if (!pending) {
        pending = true;
        setTimeout(check, 250);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    check();
  }

  function stop() {
    if (!running) return;
    running = false;
    observer && observer.disconnect();
    observer = null;
    closePanel();
    removeFab();
    removeMini();
  }

  // O registro do content script já depende do mod estar ligado; conferir o
  // storage aqui cobre a janela entre desligar e o background desregistrar, e
  // deixa o mod sair da página na hora em que o usuário desliga.
  function isEnabled(map) {
    return !!(map && map[MOD_ID]);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[ENABLED_KEY]) return;
    isEnabled(changes[ENABLED_KEY].newValue) ? start() : stop();
  });

  chrome.storage.local.get(ENABLED_KEY, (v) => {
    if (isEnabled(v && v[ENABLED_KEY])) start();
  });
})();
