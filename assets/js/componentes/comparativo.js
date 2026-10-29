// Comparativo lado a lado entre turmas: indicadores e médias por matéria com o mesmo mapa de calor do professor.
import { esc, numeroBR, icone } from '../ui.js';
import { semaforoNota, semaforoFrequencia, PRESENCA_MINIMA } from '../regras.js';
import { celulaDeCalor } from './indicadores.js';

const COMPONENTES = ['Língua Portuguesa', 'Matemática', 'Ciências', 'Física', 'Química', 'Biologia', 'História', 'Geografia', 'Inglês'];
const nivelAbaixo = (abaixo, alunos) => { const p = alunos ? abaixo / alunos : 0; return semaforoNota(p === 0 ? 8 : p <= 0.1 ? 5 : 2); };
const pct = (a, n) => (n ? Math.round((a / n) * 100) : 0);

/** Marca de atenção da turma (só aparece se a coordenação marcou). */
export const marcaDeAtencao = (marca) => (marca ? `<span class="marca-atencao">${icone('bandeira', 18)}Atenção marcada</span>` : '');

/**
 * @param {Array<{turma: object, alunos: number, frequencia: number|null, abaixo75: number, emRisco: number, componentes: object, media: number|null}>} itens
 * @param {Record<string, {motivo: string}>} atencoes Marcas da coordenação, por id da turma.
 */
export function tabelaComparativa(itens, atencoes = {}) {
  const comps = COMPONENTES.filter((c) => itens.some((x) => x.componentes[c] !== undefined));
  const linha = (rotulo, cel) => `<tr><th scope="row">${rotulo}</th>${itens.map(cel).join('')}</tr>`;
  const texto = (v) => `<td data-rotulo="">${v}</td>`;
  return `<div class="tabela-rolagem sem-limite"><table class="tabela mapa-calor comparativo"><caption class="sr-only">Comparativo entre as turmas escolhidas</caption>
    <thead><tr><th scope="col">Indicador</th>${itens.map((x) => `<th scope="col">${esc(x.turma.nome)}<small>${esc(x.turma.serie)}</small>${marcaDeAtencao(atencoes[x.turma.id])}</th>`).join('')}</tr></thead>
    <tbody>
      ${linha('Turno', (x) => texto(esc(x.turma.turno)))}
      ${linha('Estudantes', (x) => texto(String(x.alunos)))}
      ${linha('Frequência média', (x) => (x.frequencia === null ? celulaDeCalor('—', semaforoNota(null)) : celulaDeCalor(`${numeroBR(x.frequencia)}%`, semaforoFrequencia(x.frequencia))))}
      ${linha(`Abaixo de ${PRESENCA_MINIMA}%`, (x) => celulaDeCalor(`${x.abaixo75} (${pct(x.abaixo75, x.alunos)}%)`, nivelAbaixo(x.abaixo75, x.alunos)))}
      ${linha('Em risco (nota ou frequência)', (x) => celulaDeCalor(`${x.emRisco} (${pct(x.emRisco, x.alunos)}%)`, nivelAbaixo(x.emRisco, x.alunos)))}
      ${linha('Média geral', (x) => celulaDeCalor(x.media === null ? '—' : numeroBR(x.media), semaforoNota(x.media)))}
      ${comps.map((c) => linha(esc(c), (x) => celulaDeCalor(x.componentes[c] === undefined ? '—' : numeroBR(x.componentes[c]), semaforoNota(x.componentes[c] ?? null)))).join('')}
    </tbody></table></div>`;
}

/** Linhas para exportar em CSV: [cabeçalho, linhas]. */
export function linhasDoComparativo(itens, atencoes = {}) {
  const comps = COMPONENTES.filter((c) => itens.some((x) => x.componentes[c] !== undefined));
  return [
    ['Turma', 'Série', 'Turno', 'Estudantes', 'Frequência média (%)', `Abaixo de ${PRESENCA_MINIMA}%`, 'Em risco', 'Média geral', ...comps, 'Atenção marcada pela coordenação'],
    itens.map((x) => [x.turma.nome, x.turma.serie, x.turma.turno, x.alunos, x.frequencia === null ? '' : numeroBR(x.frequencia), x.abaixo75, x.emRisco, x.media === null ? '' : numeroBR(x.media), ...comps.map((c) => (x.componentes[c] === undefined ? '' : numeroBR(x.componentes[c]))), atencoes[x.turma.id]?.motivo || ''])
  ];
}
