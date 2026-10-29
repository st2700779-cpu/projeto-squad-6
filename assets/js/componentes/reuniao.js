// Telas de reunião (direção e coordenação): resumo grande e limpo para projetar (modo projetor) ou imprimir.
import { icone } from '../ui.js';

/** Botões da tela de reunião. Fora da impressão. */
export const botoesDeReuniao = (extras = '') => `<div class="linha-botoes nao-imprimir esp-b-4">
  <button type="button" class="botao" data-imprimir>${icone('imprimir', 20)}Imprimir</button>
  <button type="button" class="botao botao-secundario" data-projetor>${icone('grafico', 20)}Modo projetor</button>${extras}</div>`;

/** Liga os botões e o Esc. Chame uma vez por página. */
export function ligarReuniao(raiz) {
  const sair = document.createElement('button');
  sair.type = 'button';
  sair.className = 'botao botao-secundario botao-foco-sair nao-imprimir';
  sair.hidden = true;
  sair.innerHTML = `${icone('fechar', 20)}Sair do modo projetor`;
  document.body.append(sair);
  const projetor = (ligado) => { document.body.classList.toggle('projetor', ligado); sair.hidden = !ligado; if (ligado) sair.focus(); };
  raiz.addEventListener('click', (e) => {
    if (e.target.closest('[data-imprimir]')) window.print();
    if (e.target.closest('[data-projetor]')) projetor(true);
  });
  sair.addEventListener('click', () => { projetor(false); raiz.querySelector('[data-projetor]')?.focus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('projetor')) { projetor(false); raiz.querySelector('[data-projetor]')?.focus(); } });
}
