// Tela de reunião da direção: resumo grande e limpo da escola, para projetar (modo projetor) ou imprimir.
// Tudo vem dos mesmos dados da visão da escola; nada é digitado aqui.
import { profinComDeclaracoes } from '../prestacao-dados.js';
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, dataBR, plural, numeroBR, etiqueta } from '../ui.js';
import { carregar } from '../dados.js';
import { desempenhoDaEscola } from '../painel-dados.js';
import { semaforoFrequencia, semaforoNota, situacaoAto, PRESENCA_MINIMA, MEDIA_APROVACAO, adimplenciaDaEscola, situacaoDaPrestacao, DIAS_RENOVACAO } from '../regras.js';
import { semaforo, graficoDeBarras, dataPorExtenso } from '../componentes/indicadores.js';
import { botoesDeReuniao, ligarReuniao } from '../componentes/reuniao.js';

const main = await iniciar({ perfil: 'diretor', pagina: 'diretor/reuniao.html', assistente: false, titulo: 'Tela de reunião' });
async function mostrar() {
  try {
    const escolaId = sessao().escolaId;
    const [escolas, professores, atos, profin, painel] = await Promise.all([carregar('escolas'), carregar('professores'), carregar('atos'), profinComDeclaracoes(), desempenhoDaEscola(escolaId)]);
    const escola = escolas.find((e) => e.id === escolaId);
    const { lista, totais, hoje } = painel;
    const repasses = profin.repasses.filter((r) => r.escolaId === escolaId);
    const adim = adimplenciaDaEscola(repasses, hoje);
    const pendentes = repasses.map((r) => ({ r, s: situacaoDaPrestacao(r, hoje) })).filter((x) => ['vermelho', 'amarelo'].includes(x.s.chave));
    const atosAtencao = atos.filter((a) => a.escolaId === escolaId).map((a) => ({ a, s: situacaoAto(a) })).filter((x) => !x.s.vigente || x.s.dias <= DIAS_RENOVACAO);
    const atencaoTurmas = lista.filter((x) => (x.frequencia !== null && semaforoFrequencia(x.frequencia).chave !== 'verde') || semaforoNota(x.media).chave !== 'verde');
    const nProf = professores.filter((p) => p.escolaId === escolaId).length;
    const semFreq = totais.frequencia === null ? null : semaforoFrequencia(totais.frequencia);
    main.innerHTML = `<div class="reuniao">
      <div class="reuniao-cabecalho"><div><h1>${esc(escola.nome)}</h1><p class="esp-b-0">Reunião com o conselho escolar · ${esc(dataPorExtenso(hoje))}</p></div><p class="esp-b-0 texto-suave">Ano letivo ${painel.lv.ano}</p></div>
      ${botoesDeReuniao()}
      <div class="numeros">
        <div class="numero"><strong>${totais.alunos}</strong><span>${plural(totais.alunos, 'estudante', 'estudantes')}</span></div>
        <div class="numero"><strong>${lista.length}</strong><span>${plural(lista.length, 'turma', 'turmas')}</span></div>
        <div class="numero"><strong>${nProf}</strong><span>${plural(nProf, 'professor', 'professores')}</span></div>
        <div class="numero"><strong>${totais.frequencia === null ? '—' : `${numeroBR(totais.frequencia)}%`}</strong><span>frequência média${semFreq ? ` · ${esc(semFreq.texto)}` : ''}</span></div>
        <div class="numero"><strong>${totais.emRisco}</strong><span>${plural(totais.emRisco, 'estudante em risco', 'estudantes em risco')}</span></div>
      </div>
      <h2>Frequência por turma</h2>
      ${graficoDeBarras(lista.filter((x) => x.frequencia !== null).map((x) => ({ rotulo: x.turma.nome, valor: x.frequencia, nivel: semaforoFrequencia(x.frequencia) })), { minimo: PRESENCA_MINIMA, formato: (v) => `${numeroBR(v)}%` })}
      <h2>Média por turma</h2>
      ${graficoDeBarras(lista.map((x) => ({ rotulo: x.turma.nome, valor: x.media, nivel: semaforoNota(x.media) })), { maximo: 10, minimo: MEDIA_APROVACAO, formato: (v) => numeroBR(v) })}
      <h2>Turmas que pedem atenção</h2>
      ${atencaoTurmas.length ? `<ul class="lista-texto">${atencaoTurmas.map((x) => `<li><strong>${esc(x.turma.nome)}</strong>: ${[x.frequencia !== null && semaforoFrequencia(x.frequencia).chave !== 'verde' ? `frequência de ${numeroBR(x.frequencia)}%` : '', semaforoNota(x.media).chave !== 'verde' ? `média ${numeroBR(x.media)}` : '', x.abaixo75 ? `${x.abaixo75} ${plural(x.abaixo75, 'estudante abaixo', 'estudantes abaixo')} de ${PRESENCA_MINIMA}%` : ''].filter(Boolean).join(' · ')}</li>`).join('')}</ul>` : '<p>Nenhuma turma fora da média.</p>'}
      <h2>Prestação de contas</h2>
      <p class="esp-t-0">${semaforo(adim, { grande: true })}</p>
      ${pendentes.length ? `<ul class="lista-texto">${pendentes.map(({ r, s }) => `<li>${esc(r.categoria)}: ${semaforo(s)} <span class="texto-suave">(prazo ${dataBR(r.prestacao.prazo)})</span></li>`).join('')}</ul>` : ''}
      <h2>Atos autorizativos</h2>
      ${atosAtencao.length ? `<ul class="lista-texto">${atosAtencao.map(({ a, s }) => `<li><strong>${esc(a.etapa)}</strong>: ${esc(a.numero)} ${etiqueta(s.texto, s.tipo)} <span class="texto-suave">(validade ${dataBR(a.validade)})</span></li>`).join('')}</ul>` : '<p>Todos os atos estão vigentes e longe do vencimento.</p>'}
      <p class="texto-suave texto-pequeno esp-t-5">Protótipo com dados fictícios · gerado em ${esc(dataBR(hoje))}.</p></div>`;
  } catch { falhaDados(main, mostrar); }
}
ligarReuniao(main);
mostrar();
