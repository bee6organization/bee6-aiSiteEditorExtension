// lib/ui/brand.js — assinatura da bee6 (logo + link) compartilhada por
// painel, popup, janela separada, sidebar do DevTools e Opções.
// Módulo ES puro, só strings: nada de `document`/`window`/`chrome`.
//
// O logo vai inline (SVG) e não por <img> remoto: o painel roda dentro de
// sites de terceiros, cuja CSP pode bloquear imagens externas, e a extensão
// promete não fazer requisição nenhuma além do provedor de IA.

// UTM para a bee6 saber quantas visitas vêm da extensão.
export const BEE6_URL =
  "https://www.bee6.com.br/?utm_source=aisiteeditor&utm_medium=extensao&utm_campaign=aisiteeditor";

// Símbolo (abelha/colmeia) do logo oficial, recortado para caber num quadrado.
const SYMBOL_PATHS = `
  <polygon fill="#ee8d49" points="580.4,493 589.7,488.9 597.6,485.5 584.3,453.1 575.6,456.8 567.1,460.5 456.3,508.5 444.7,513.5 439.1,515.9 453.5,547.9 459.8,545.2 470.7,540.5"/>
  <path fill="#ee8d49" d="M688.6,274.7l-43.8-25.5c-2.5-1.4-5.5-1.4-8,0.1l-122,74.6c-0.8,0.5-1.4,1.1-2,1.8l-10.7-3.5c1-2,1.2-4.3,0.2-6.4l-11-25.4c-0.8-1.9-2.4-3.4-4.4-4.2l-15.9-6l11.4-32.1c1.4-4-0.7-8.5-4.7-9.9l-3-1.1c-4-1.4-8.5,0.7-9.9,4.7l-11.3,31.7l-10.4-4c-1.9-0.7-4-0.7-5.8,0.1L404,284c-2,0.9-3.6,2.6-4.3,4.7l-3.4,10.2l-31.6-13.8c-3.9-1.7-8.5,0.1-10.2,4l-1.3,3c-1.7,3.9,0.1,8.5,4,10.2l31.9,14c0.5,0.2,0.9,0.2,1.4,0.3l-5.3,16c-0.6,1.8-0.5,3.8,0.2,5.5l12.3,28.5c0.4,0.9,1,1.7,1.7,2.4l-3.4,7.4c-1-0.1-1.9-0.1-2.9,0.2l-137.8,37.9c-2.8,0.8-4.9,3-5.5,5.7l-11.3,49.4c-0.8,3.6,1,7.3,4.3,8.8l7.3,3.4l16-8.3l5.1-2.6l130-67.2l7.2,17.5L293,480.7l-6.6,3.4l-14.6,7.5l58,26.6c2.7,1.2,5.8,0.8,8.1-1l87-70.7c5.7,2.1,11.5,4.2,17.2,6.2l4.9,1.8c-4.6,14.4-9.3,28.8-13.9,43.2c-0.1,0.4-0.1,0.8-0.1,1.2l11-4.8l11.2-4.8l98.3-42.5l9.7-4.2l12.3-5.3c-13.5-7.2-27-14.3-40.5-21.5l1.7-3.9c2.4-5.7,4.8-11.3,7.2-16.9c0.1,0,0.1,0,0.2,0l111.3-15.1c2.9-0.4,5.4-2.4,6.3-5.2l20-59.7l-13.7,4.8l-8.7,3.1L536.8,366l-7.5-17.4l137.5-48.5l7.2-2.5l15.3-5.4l2.8-8.4C693.2,280.4,691.7,276.5,688.6,274.7z"/>
  <path fill="#ee8d49" d="M605.5,504.6l-7.4,3.2l-12,5.2l-105,45.5l-12.4,5.4l-6.7,2.9l1.7,3.7c1,2.1,2.8,3.7,5,4.3l45.4,12.5c1.7,0.5,3.5,0.3,5.1-0.4l62-26.9c1.3-1.2,2.5-2.4,3.8-3.6l21.6-42c1-2,1.1-4.4,0.3-6.5L605.5,504.6z"/>`;

// Letras "bee" em currentColor (o CSS de cada tela decide: branco no escuro);
// o "6" mantém o laranja da marca.
const WORDMARK_PATHS = `
  <path fill="currentColor" d="M816.4,516.8H816c0,8.7,0.7,21.9,1.3,31.6h-59.9V312.9h59.9V389c0,8.7-0.3,21.2-0.7,27.9h0.7c7.1-19.2,28.3-38,75.4-38c68,0,101.6,32,101.6,83.1c0,59.6-37.7,89.9-101.6,89.9C840.9,551.8,821.1,529.3,816.4,516.8z M934.5,463.7c0-25.2-16.8-41.7-55.5-41.7c-39,0-61.6,18.9-61.6,46.1v1c0,21.5,19.9,39.7,61.9,39.7C917.7,508.8,934.5,494.6,934.5,463.7z"/>
  <path fill="currentColor" d="M1241.8,477.8H1082c3,20.9,16.5,36.3,56.5,36.3c36.7,0,47.8-9.1,50.1-20.5h53.2c-1.7,32-29.6,58.2-103.3,58.2c-90.2,0-117.1-42.7-117.1-84.8c0-54.2,41.1-88.2,113.8-88.2c73.4,0,106.7,31,106.7,85.2V477.8z M1188.6,445.5c0-15.1-11.4-28.9-50.1-28.9c-35,0-50.1,10.8-55.2,30.3h105.3V445.5z"/>
  <path fill="currentColor" d="M1489.2,477.8h-159.9c3,20.9,16.5,36.3,56.5,36.3c36.7,0,47.8-9.1,50.1-20.5h53.2c-1.7,32-29.6,58.2-103.3,58.2c-90.2,0-117.1-42.7-117.1-84.8c0-54.2,41.1-88.2,113.8-88.2c73.4,0,106.7,31,106.7,85.2V477.8z M1436,445.5c0-15.1-11.4-28.9-50.1-28.9c-35,0-50.1,10.8-55.2,30.3H1436V445.5z"/>
  <path fill="#ee8d49" d="M1516.2,440.4c0-69,39.7-116.8,126.5-116.8c81.8,0,109,35.7,109,72.4c0,1.7-0.3,6.1-0.7,8.1h-57.5c0.3-2,0.3-4,0.3-5c0-14.5-12.1-27.6-49.1-27.6c-44.8,0-63.9,25.6-63.9,69c0,4.4,0.3,8.1,0.3,9.8h0.7c6-20.9,30.6-33,82.8-33c75.4,0,97.3,28.6,97.3,60.6c0,39.4-26.9,74-119.1,74C1538.4,551.8,1516.2,499,1516.2,440.4z M1697.2,477.8c0-12.1-12.1-22.9-54.5-22.9c-45.8,0-57.9,15.2-57.9,24.6c0,7.4,6.7,24.6,57.9,24.6C1683.8,504,1697.2,491.9,1697.2,477.8z"/>`;

// Só o símbolo — cabeçalhos e ícone.
export const BEE6_SYMBOL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="245 220 460 380" aria-hidden="true" focusable="false">${SYMBOL_PATHS}</svg>`;

// Logo completo (símbolo + "bee6") — rodapés.
export const BEE6_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="245 220 1525 380" aria-hidden="true" focusable="false">${SYMBOL_PATHS}${WORDMARK_PATHS}</svg>`;

// Cabeçalho das páginas da extensão: símbolo + "aiSiteEditor" (Staatliches).
export const BEE6_HEAD_HTML = `
  <a class="aise-brand-symbol" href="${BEE6_URL}" target="_blank" rel="noopener" title="bee6" aria-label="Site da bee6">${BEE6_SYMBOL_SVG}</a>
  <span class="aise-brand-name">ai<b>Site</b>Editor</span>`;

// Assinatura de rodapé: "desenvolvido pela [logo bee6]", link para o site.
// A classe `aise-bee6` é estilizada em cada CSS (popup, opções, sidebar,
// painel em shadow DOM).
export const BEE6_SIGNATURE_HTML = `
  <a class="aise-bee6" href="${BEE6_URL}" target="_blank" rel="noopener" title="Conheça a bee6">
    <span class="aise-bee6-text">desenvolvido pela</span>
    <span class="aise-bee6-logo" role="img" aria-label="bee6">${BEE6_LOGO_SVG}</span>
  </a>`;

// Monta cabeçalho e rodapé da bee6 em volta do #root das páginas da
// extensão (popup, Opções, janela separada, sidebar). Fica fora do #root
// porque as views reescrevem o conteúdo dele inteiro.
export function mountBrand(doc, root) {
  const head = doc.createElement("header");
  head.className = "aise-brand-head";
  head.innerHTML = BEE6_HEAD_HTML;
  root.before(head);
  const foot = doc.createElement("footer");
  foot.className = "aise-brand-foot";
  foot.innerHTML = BEE6_SIGNATURE_HTML;
  root.after(foot);
}
