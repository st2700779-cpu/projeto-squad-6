// Tamanho da letra e leitura em voz alta.
import { obter, definir } from './estado.js';
import { icone, esc, avisar } from './ui.js';

export function aplicarEscala() {
  document.documentElement.style.setProperty('--escala', obter('escala', 1));
}
export function mudarEscala(passo) {
  const v = Math.min(1.5, Math.max(0.9, Math.round((obter('escala', 1) + passo) * 10) / 10));
  definir('escala', v);
  aplicarEscala();
}

export const podeLer = () => 'speechSynthesis' in window;
export function ler(texto) {
  if (!podeLer()) { avisar('Este navegador não consegue ler em voz alta.'); return; }
  speechSynthesis.cancel();
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = 'pt-BR';
  fala.rate = 0.95;
  speechSynthesis.speak(fala);
}
// Botão "Ouvir": ícone e palavra sempre juntos. Sem rótulo informado, a palavra é "Ouvir".
export function botaoOuvir(texto, rotulo = 'Ouvir') {
  if (!podeLer()) return '';
  return `<button type="button" class="botao-ouvir" data-ouvir="${esc(texto)}" aria-label="${esc(rotulo || 'Ouvir')} em voz alta">${icone('alto', 20)}<span>${esc(rotulo || 'Ouvir')}</span></button>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-ouvir]');
  if (b) ler(b.dataset.ouvir);
});
