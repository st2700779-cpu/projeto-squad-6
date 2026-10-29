// Mapa de calor da escola: cada turma numa linha e cada matéria numa coluna, com a frequência ao lado.
// Mesma leitura do mapa do professor (cor, símbolo e palavra), em nível de escola inteira.
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, numeroBR, vazio, plural } from '../ui.js';
import { desempenhoDaEscola } from '../painel-dados.js';
import { semaforoNota, semaforoFrequencia, PRESENCA_MINIMA, SERIES } from '../regras.js';
import { celulaDeCalor, legendaDeNiveis } from '../componentes/indicadores.js';

const main = await iniciar({ perfil: 'diretor', pagina: 'diretor/mapa.html', assistente: false });
const COMPONENTES = ['Língua Portuguesa', 'Matemática', 'Ciências', 'Física', 'Química', 'Biologia', 'História', 'Geografia', 'Inglês'];
let painel, serie = '';

// Estudantes abaixo de 75%: nenhum = verde; até 10% da turma = amarelo; mais de 10% = vermelho.
const nivelAbaixo = (abaixo, alunos) => { const p = alunos ? abaixo / alunos : 0; return semaforoNota(p === 0 ? 8 : p <= 0.1 ? 5 : 2); };

function desenhar() {
  const lista = painel.lista.filter((x) => !serie || x.turma.serie === serie);
  const series = SERIES.filter((s) => painel.lista.some((x) => x.turma.serie === s));
  const comuns = COMPONENTES.filter((c) => lista.some((x) => x.componentes[c] !== undefined));
  main.innerHTML = `
    <h1>Mapa de calor da escola</h1>
    <p class="pagina-descricao">Média por matéria e frequência de cada turma. Procure as cores de atenção e de risco, sempre com o símbolo e a palavra.</p>
    <div class="ferramentas-tabela"><div class="campo"><label for="serie">Série</label><select id="serie" class="entrada"><option value="">Todas as séries</option>${series.map((s) => `<option ${s === serie ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div></div>
    ${legendaDeNiveis([[semaforoNota(7), 'média 6,0 ou mais · frequência 85% ou mais'], [semaforoNota(5), 'média de 4,0 a 5,9 · frequência de 75% a 84,9%'], [semaforoNota(2), 'média abaixo de 4,0 · frequência abaixo de 75%']])}
    ${lista.length ? `<div class="tabela-rolagem sem-limite"><table class="tabela mapa-calor"><caption class="sr-only">Mapa de calor por turma e matéria</caption>
      <thead><tr><th scope="col">Turma</th>${comuns.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}<th scope="col">Frequência média</th><th scope="col">Abaixo de ${PRESENCA_MINIMA}%</th></tr></thead>
      <tbody>${lista.map((x) => `<tr><th scope="row" class="nome">${esc(x.turma.nome)}<small>${esc(x.turma.serie)} · ${x.alunos} ${plural(x.alunos, 'estudante', 'estudantes')}</small></th>${comuns.map((c) => celulaDeCalor(x.componentes[c] === undefined ? '—' : numeroBR(x.componentes[c]), semaforoNota(x.componentes[c] ?? null))).join('')}${x.frequencia === null ? celulaDeCalor('—', semaforoNota(null)) : celulaDeCalor(`${numeroBR(x.frequencia)}%`, semaforoFrequencia(x.frequencia))}${celulaDeCalor(`${x.abaixo75}`, nivelAbaixo(x.abaixo75, x.alunos))}</tr>`).join('')}</tbody></table></div>
      <p class="contagem">${lista.length} ${plural(lista.length, 'turma', 'turmas')}. “Abaixo de ${PRESENCA_MINIMA}%”: estudantes com frequência abaixo do mínimo (verde: nenhum; amarelo: até 10% da turma; vermelho: mais de 10%). As turmas com diário (1ª e 2ª séries) trazem a Matemática lançada pela professora; as demais matérias vêm do consolidado da escola.</p>` : vazio('Nenhuma turma com dados', 'Quando as turmas tiverem notas lançadas, o mapa aparece aqui.')}`;
}
async function mostrar() {
  try { painel = await desempenhoDaEscola(sessao().escolaId); desenhar(); } catch { falhaDados(main, mostrar); }
}
main.addEventListener('change', (e) => { if (e.target.id === 'serie') { serie = e.target.value; desenhar(); main.querySelector('#serie').focus(); } });
mostrar();
