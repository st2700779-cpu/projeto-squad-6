// Abas dos 4 bimestres (diário e notas do professor): lançado (só consulta), em andamento e bloqueado (ainda não começou).
import { icone, dataBR } from '../ui.js';
import { estadoDoBimestre, periodoDoBimestre } from '../dominio/diario-bimestral.js';

export function abasDeBimestre(letivo, atual, selecionado) {
  return `<div class="abas-bimestre" role="group" aria-label="Bimestre">${[1, 2, 3, 4].map((b) => {
    const est = estadoDoBimestre(b, atual);
    const per = periodoDoBimestre(letivo, b);
    const rot = est === 'fechado' ? 'lançado' : est === 'aberto' ? 'em andamento' : `abre em ${per ? dataBR(per.inicio).slice(0, 5) : 'breve'}`;
    return `<button type="button" class="aba-bimestre ${est}" data-bim="${b}" aria-pressed="${b === selecionado}" ${est === 'bloqueado' ? 'disabled aria-disabled="true"' : ''}>${est === 'bloqueado' ? icone('cadeado', 16) : est === 'fechado' ? icone('ok', 16) : icone('relogio', 16)}<span><strong>${b}º bimestre</strong><small>${rot}</small></span></button>`;
  }).join('')}</div>`;
}
