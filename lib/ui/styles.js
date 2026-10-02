// lib/ui/styles.js — CSS injetado dentro dos shadow roots de <aise-panel> e
// <aise-indicator>. Puro texto: nenhum destes módulos toca `document`/`window`.
// `all: initial` no `.aise-container` isola do CSS do site hospedeiro; tudo
// daqui pra baixo é redefinido explicitamente.
// Identidade bee6: vidro escuro (Liquid Glass), texto #d5d5ce, laranja
// #ee8d49 para ação. As fontes "bee6 Archivo"/"bee6 Staatliches" são
// registradas pelo content.js (FontFace), porque @font-face não vale dentro
// de shadow DOM; se não carregarem, cai para Arial.

export const BASE_CSS = `
  :host { all: initial; display: block; }
  .aise-container {
    all: initial;
    position: fixed;
    z-index: 2147483647;
    font-family: "bee6 Archivo", Arial, sans-serif;
    font-weight: 300;
    font-size: 13px;
    line-height: 1.45;
    color: #d5d5ce;
    box-sizing: border-box;
  }
  .aise-container, .aise-container * , .aise-container *::before, .aise-container *::after {
    box-sizing: border-box;
  }
  /* Caixas escondidas (busy, erro, toast) não podem ocupar espaço nem ficar
     por cima de botões: a regra do navegador para [hidden] perde para
     qualquer display: definido aqui, então reforçamos com !important. */
  [hidden] { display: none !important; }
  /* Glass card da bee6: fundo translúcido + blur sobre a página, borda
     sutil e sombra com um toque de laranja. Mais opaco que o padrão da
     marca porque o painel flutua sobre sites claros, e o texto precisa
     continuar legível. */
  .aise-card {
    background: rgba(6, 6, 6, 0.93);
    -webkit-backdrop-filter: blur(20px) saturate(140%);
    backdrop-filter: blur(20px) saturate(140%);
    color: #d5d5ce;
    border-radius: 16px;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1), 0 8px 32px rgba(0, 0, 0, 0.45), 0 2px 18px rgba(238, 141, 73, 0.12);
  }
  /* Botões: hover levanta 1px com sombra, active "afunda", foco por teclado
     ganha anel laranja. Desabilitado nunca reage (:not(:disabled)). */
  .aise-btn {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.06);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    color: #d5d5ce;
    font-family: "bee6 Archivo", Arial, sans-serif;
    font-weight: 400;
    font-size: 12px;
    white-space: nowrap;
    transition: background-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease, transform 0.12s ease, opacity 0.15s ease;
  }
  .aise-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.12);
    box-shadow: inset 0 0 0 1px rgba(238, 141, 73, 0.55), 0 3px 12px rgba(238, 141, 73, 0.2);
    transform: translateY(-1px);
  }
  .aise-btn:active:not(:disabled) {
    background: rgba(255, 255, 255, 0.12);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
    transform: translateY(0) scale(0.98);
    transition-duration: 0.05s;
  }
  .aise-btn:focus-visible { box-shadow: 0 0 0 2px #000000, 0 0 0 4px #ee8d49; }
  .aise-btn:disabled { cursor: default; opacity: 0.5; }
  .aise-btn-primary {
    background: #ee8d49;
    color: #000000;
    font-weight: 700;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14), 0 1px 2px rgba(0, 0, 0, 0.25);
  }
  .aise-btn-primary:hover:not(:disabled) {
    background: #f4a062;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22), 0 4px 14px rgba(238, 141, 73, 0.45);
  }
  .aise-btn-primary:active:not(:disabled) {
    background: #e3813c;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  }
  .aise-btn-small { padding: 3px 8px; font-size: 11px; }
  .aise-icon-btn {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    color: rgba(213, 213, 206, 0.7);
    transition: background-color 0.15s ease, color 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
  }
  .aise-icon-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.12); color: #d5d5ce; transform: scale(1.1); }
  .aise-icon-btn:active:not(:disabled) { transform: scale(0.92); transition-duration: 0.05s; }
  .aise-icon-btn:focus-visible { box-shadow: 0 0 0 2px #000000, 0 0 0 4px #ee8d49; }
  .aise-icon-btn-active, .aise-icon-btn-active:hover:not(:disabled) { background: #ee8d49; color: #000000; }
  @media (prefers-reduced-motion: reduce) {
    .aise-btn, .aise-icon-btn, .aise-chip-remove, .aise-pill, .aise-history-entry, .aise-bee6 { transition: none; }
    .aise-btn:hover:not(:disabled), .aise-btn:active:not(:disabled),
    .aise-icon-btn:hover:not(:disabled), .aise-icon-btn:active:not(:disabled) { transform: none; }
  }
`;

export const PANEL_CSS = `
  .aise-panel {
    top: auto;
    right: 16px;
    bottom: 16px;
    left: auto;
    width: 340px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    overflow: hidden;
  }
  .aise-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: move;
    user-select: none;
    margin: -14px -14px 0;
    padding: 14px 14px 0;
  }
  .aise-panel-dragging { opacity: 0.92; }
  .aise-panel-dragging, .aise-panel-dragging * { user-select: none; }
  .aise-panel-title {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: "bee6 Staatliches", Arial, sans-serif;
    font-size: 19px;
    line-height: 1;
    letter-spacing: 0.04em;
    color: #d5d5ce;
  }
  .aise-panel-symbol { display: inline-flex; width: 24px; height: 20px; }
  .aise-panel-symbol svg { display: block; width: 100%; height: 100%; }
  /* Assinatura "developed and modded by bee6" no pé do painel e do banner. */
  .aise-bee6 {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 6px;
    border-radius: 6px;
    color: rgba(213, 213, 206, 0.64);
    font-size: 11px;
    transition: background-color 0.3s ease, color 0.3s ease;
  }
  .aise-bee6:hover { color: #d5d5ce; background: rgba(255, 255, 255, 0.08); }
  .aise-bee6:focus-visible { box-shadow: 0 0 0 2px #ee8d49; }
  .aise-bee6-logo { display: inline-flex; color: #ffffff; }
  .aise-bee6-logo svg { display: block; height: 14px; width: auto; }
  .aise-panel-brand { display: flex; justify-content: center; margin-top: -4px; }
  .aise-panel-header-actions { display: flex; gap: 4px; }
  .aise-panel-selection {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .aise-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 6px 3px 8px;
    border-radius: 999px;
    background: rgba(238, 141, 73, 0.16);
    color: #d5d5ce;
    font-size: 11px;
  }
  .aise-chip-remove {
    all: unset;
    cursor: pointer;
    color: rgba(213, 213, 206, 0.7);
    padding: 0 4px;
    border-radius: 999px;
    transition: background-color 0.15s ease, color 0.15s ease, transform 0.12s ease;
  }
  .aise-chip-remove:hover { color: #fff; background: rgba(255, 99, 71, 0.45); transform: scale(1.15); }
  .aise-chip-remove:active { transform: scale(0.95); }
  .aise-chip-remove:focus-visible { box-shadow: 0 0 0 2px #ee8d49; }
  .aise-panel-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .aise-panel-form textarea {
    all: unset;
    box-sizing: border-box;
    display: block;
    width: 100%;
    min-height: 60px;
    resize: vertical;
    padding: 8px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    color: #d5d5ce;
    font-family: inherit;
    font-size: 13px;
  }
  .aise-panel-form textarea:focus { box-shadow: inset 0 0 0 1px rgba(238, 141, 73, 0.7); }
  .aise-panel-form textarea::placeholder { color: rgba(213, 213, 206, 0.64); }
  .aise-panel-form textarea:disabled { opacity: 0.5; }
  .aise-panel-form button[type="submit"] { align-self: flex-end; }
  .aise-panel-busy, .aise-panel-error {
    font-size: 12px;
    padding: 6px 8px;
    border-radius: 6px;
  }
  .aise-panel-busy { background: rgba(255, 255, 255, 0.06); color: rgba(213, 213, 206, 0.7); }
  .aise-panel-error { background: rgba(184, 54, 79, 0.22); color: #f39aab; }
  .aise-panel-history {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
  }
  .aise-history-entry {
    padding: 8px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: background-color 0.15s ease, box-shadow 0.15s ease;
  }
  .aise-history-entry:hover { background: rgba(255, 255, 255, 0.07); box-shadow: inset 0 0 0 1px rgba(238, 141, 73, 0.35); }
  .aise-history-entry-undone { opacity: 0.55; text-decoration: line-through; }
  .aise-history-head { display: flex; gap: 6px; font-weight: 700; }
  .aise-history-n { color: #ee8d49; }
  .aise-history-summary { color: rgba(213, 213, 206, 0.82); }
  .aise-history-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .aise-panel-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  /* O toast fica sobre o rodapé (Salvar preset, Copiar log…); só informa,
     então deixa os cliques passarem para os botões embaixo dele. */
  .aise-panel-toast {
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: 14px;
    pointer-events: none;
    padding: 6px 10px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.7);
    color: #d5d5ce;
    font-size: 12px;
    text-align: center;
  }
`;

export const INDICATOR_CSS = `
  .aise-indicator {
    display: flex;
    padding: 0 16px;
  }
  .aise-indicator-top { top: 0; left: 0; right: 0; padding-top: 12px; align-items: flex-start; }
  .aise-indicator-bottom { bottom: 0; left: 0; right: 0; padding-bottom: 12px; align-items: flex-end; }
  .aise-banner {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px 14px;
    margin: 0 auto;
    max-width: 640px;
  }
  .aise-banner-text { flex: 1 1 auto; min-width: 200px; }
  .aise-banner-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-left: auto; }
  .aise-pill {
    all: unset;
    cursor: pointer;
    margin-left: auto;
    margin-right: 4px;
    padding: 6px 12px;
    border-radius: 999px;
    color: #d5d5ce;
    font-size: 12px;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
    transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.12s ease;
  }
  .aise-pill:hover { background: #141414; box-shadow: inset 0 0 0 1px rgba(238, 141, 73, 0.55), 0 3px 12px rgba(238, 141, 73, 0.2); transform: translateY(-1px); }
  .aise-pill:active { transform: translateY(0) scale(0.98); transition-duration: 0.05s; }
  .aise-pill:focus-visible { box-shadow: 0 0 0 2px #000000, 0 0 0 4px #ee8d49; }
`;

// Overlay do seletor de elementos (<aise-picker>). `pointer-events: none` em
// tudo: a mira nunca rouba o clique que o picker quer capturar.
export const PICKER_CSS = `
  :host([hidden]) { display: none; }
  .aise-pick-overlay { position: fixed; inset: 0; z-index: 2147483646; pointer-events: none; }
  .aise-pick-box {
    position: fixed;
    box-sizing: border-box;
    border: 2px solid #ee8d49;
    background: rgba(238, 141, 73, 0.16);
    border-radius: 2px;
    pointer-events: none;
  }
  .aise-pick-label {
    position: fixed;
    max-width: 60vw;
    padding: 2px 8px;
    border-radius: 4px;
    background: #000000;
    color: #d5d5ce;
    font: 12px/18px ui-monospace, Menlo, Consolas, monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    pointer-events: none;
  }
  .aise-pick-hint {
    position: fixed;
    left: 50%;
    bottom: 16px;
    transform: translateX(-50%);
    padding: 6px 12px;
    border-radius: 999px;
    background: #000000;
    color: #d5d5ce;
    font: 400 12px/16px "bee6 Archivo", Arial, sans-serif;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    pointer-events: none;
  }
  [hidden] { display: none !important; }
`;
