// Reunião pedagógica: o comparativo de turmas e as marcas de atenção, resumidos para levar ao conselho de classe.
// Imprime, projeta ou baixa em planilha (CSV). ?turmas=a,b,c escolhe as turmas; sem isso entram todas.
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, plural, dataBR, baixarCSV, icone } from '../ui.js';
import { conjunto } from '../dados.js';
import { desempenhoDaEscola } from '../painel-dados.js';
import { PRESENCA_MINIMA } from '../regras.js';
import { tabelaComparativa, linhasDoComparativo, marcaDeAtencao } from '../componentes/comparativo.js';
import { botoesDeReuniao, ligarReuniao } from '../componentes/reuniao.js';
import { dataPorExtenso } from '../componentes/indicadores.js';

const main = await iniciar({ perfil: 'coordenador', pagina: 'coordenador/reuniao.html', assistente: false, titulo: 'Reunião pedagógica' });
let itens, atencoes, hoje;

async function mostrar() {
  try {
    const [painel, marcas] = await Promise.all([desempenhoDaEscola(sessao().escolaId), conjunto('atencao-turmas')]);
    atencoes = marcas; hoje = painel.hoje;
    const pedidas = (new URLSearchParams(location.search).get('turmas') || '').split(',').filter(Boolean);
    itens = pedidas.length ? painel.lista.filter((x) => pedidas.includes(x.turma.id)) : painel.lista;
    const marcadas = itens.filter((x) => atencoes[x.turma.id]);
    main.innerHTML = `<div class="reuniao">
      <div class="reuniao-cabecalho"><div><h1>Reunião pedagógica</h1><p class="esp-b-0">Conselho de classe · ${esc(dataPorExtenso(hoje))}</p></div><p class="esp-b-0 texto-suave">${itens.length} ${plural(itens.length, 'turma', 'turmas')} · ${painel.totais.alunos} estudantes</p></div>
      ${botoesDeReuniao(`<button type="button" class="botao botao-secundario" data-csv>${icone('baixar', 20)}Baixar planilha (CSV)</button>`)}
      <h2 class="esp-t-0">Turmas com atenção marcada pela coordenação</h2>
      ${marcadas.length ? `<ul class="lista-texto">${marcadas.map((x) => `<li><strong>${esc(x.turma.nome)}</strong> ${marcaDeAtencao(atencoes[x.turma.id])}: ${esc(atencoes[x.turma.id].motivo)} <span class="texto-suave">(${esc(atencoes[x.turma.id].por)}, ${dataBR(atencoes[x.turma.id].quando)})</span></li>`).join('')}</ul>` : '<p>Nenhuma turma marcada. A coordenação marca as turmas em “Turmas e desempenho”.</p>'}
      <h2>Comparativo</h2>
      ${tabelaComparativa(itens, atencoes)}
      <p class="contagem">Média por matéria: verde 6,0 ou mais; amarelo de 4,0 a 5,9; vermelho abaixo de 4,0. Frequência: verde 85% ou mais; amarelo de 75% a 84,9%; vermelho abaixo de ${PRESENCA_MINIMA}%.</p>
      <p class="texto-suave texto-pequeno">Protótipo com dados fictícios · gerado em ${esc(dataBR(hoje))}.</p></div>`;
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('click', (e) => {
  if (!e.target.closest('[data-csv]')) return;
  const [cab, linhas] = linhasDoComparativo(itens, atencoes);
  baixarCSV(`comparativo-turmas-${hoje}.csv`, cab, linhas);
});
ligarReuniao(main);
mostrar();
