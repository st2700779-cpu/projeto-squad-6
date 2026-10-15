// Visão da escola para a direção: números da escola, frequência e desempenho por turma, prestação de contas do PROFIN,
// atos autorizativos e comunicados. É a "central de comando"; a tela de reunião resume tudo para projetar ou imprimir.
import { iniciar, link, falhaDados } from '../app.js';
import { profinComDeclaracoes } from '../prestacao-dados.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, dataBR, plural, numeroBR, icone } from '../ui.js';
import { carregar } from '../dados.js';
import { desempenhoDaEscola, avisosVisiveis } from '../painel-dados.js';
import { semaforoFrequencia, semaforoNota, situacaoAto, PRESENCA_MINIMA, MEDIA_APROVACAO, adimplenciaDaEscola, situacaoDaPrestacao, reais, percentualExecutado } from '../regras.js';
import { semaforo, graficoDeBarras } from '../componentes/indicadores.js';

const main = await iniciar({ perfil: 'diretor', pagina: 'diretor/index.html', assistente: false });
async function mostrar() {
  try {
    const escolaId = sessao().escolaId;
    const [escolas, professores, atos, profin, painel] = await Promise.all([carregar('escolas'), carregar('professores'), carregar('atos'), profinComDeclaracoes(), desempenhoDaEscola(escolaId)]);
    const avisos = (await avisosVisiveis({ perfil: 'diretor', est: { escolaId, turma: '' } })).slice(0, 3);
    const escola = escolas.find((e) => e.id === escolaId);
    const { lista, totais, hoje } = painel;
    const repasses = profin.repasses.filter((r) => r.escolaId === escolaId);
    const adim = adimplenciaDaEscola(repasses, hoje);
    const minhasDecs = profin.declaracoes.filter((d) => d.escolaId === escolaId);
    const devolvidas = minhasDecs.filter((d) => d.situacao === 'Devolvida').length;
    const emAnalise = minhasDecs.filter((d) => d.situacao === 'Enviada' || d.situacao === 'Em análise').length;
    const meusAtos = atos.filter((a) => a.escolaId === escolaId);
    const nProf = professores.filter((p) => p.escolaId === escolaId).length;
    const semFreq = totais.frequencia === null ? null : semaforoFrequencia(totais.frequencia);
    main.innerHTML = `
      <header class="heroi">
        <span class="heroi-selo">Visão da escola</span>
        <h1>${esc(escola.nome)}</h1>
        <p class="heroi-linha">${esc(escola.municipio)} · ${esc(escola.dre)} · ano letivo ${painel.lv.ano} · dados de ${dataBR(hoje)}</p>
      </header>
      <div class="linha-botoes esp-b-4"><a class="botao" id="abrir-reuniao" href="${link('diretor/reuniao.html')}">${icone('imprimir', 20)}Abrir tela de reunião</a><a class="botao botao-secundario" href="${link('diretor/mapa.html')}">${icone('grafico', 20)}Mapa de calor da escola</a></div>
      <div class="numeros">
        <div class="numero"><strong>${totais.alunos}</strong><span>${plural(totais.alunos, 'estudante', 'estudantes')}</span></div>
        <div class="numero"><strong>${lista.length}</strong><span>${plural(lista.length, 'turma aprovada', 'turmas aprovadas')}</span></div>
        <div class="numero"><strong>${nProf}</strong><span>${plural(nProf, 'professor', 'professores')}</span></div>
        <div class="numero ${semFreq?.chave === 'vermelho' ? 'alerta' : semFreq?.chave === 'amarelo' ? 'atencao' : ''}"><strong>${totais.frequencia === null ? '—' : `${numeroBR(totais.frequencia)}%`}</strong><span>frequência média${semFreq ? ` · ${esc(semFreq.texto)}` : ''}</span></div>
        <div class="numero ${totais.emRisco ? 'alerta' : ''}"><strong>${totais.emRisco}</strong><span>${plural(totais.emRisco, 'estudante em risco', 'estudantes em risco')}</span></div>
      </div>
      <h2>Frequência média por turma</h2>
      ${graficoDeBarras(lista.filter((x) => x.frequencia !== null).map((x) => ({ rotulo: x.turma.nome, valor: x.frequencia, nivel: semaforoFrequencia(x.frequencia) })), { maximo: 100, minimo: PRESENCA_MINIMA, formato: (v) => `${numeroBR(v)}%` })}
      <p class="contagem">A marca preta é o mínimo de ${PRESENCA_MINIMA}%.</p>
      <h2>Média geral por turma</h2>
      ${graficoDeBarras(lista.map((x) => ({ rotulo: x.turma.nome, valor: x.media, nivel: semaforoNota(x.media) })), { maximo: 10, minimo: MEDIA_APROVACAO, formato: (v) => numeroBR(v) })}
      <p class="contagem">Média das matérias com nota lançada. A marca preta é a média ${MEDIA_APROVACAO}. <a href="${link('diretor/mapa.html')}">Ver por matéria</a></p>
      <h2>Prestação de contas (PROFIN)</h2>
      <p class="esp-t-0">${semaforo(adim, { grande: true })}</p>
      <p>${devolvidas ? `${etiqueta(`${devolvidas} ${plural(devolvidas, 'declaração devolvida', 'declarações devolvidas')}`, 'erro')} ` : ''}${emAnalise ? `${etiqueta(`${emAnalise} ${plural(emAnalise, 'em análise no PROFIN', 'em análise no PROFIN')}`, 'info')} ` : ''}${!devolvidas && !emAnalise ? '<span class="texto-suave">Nenhuma declaração de gastos em andamento.</span>' : ''}</p>
      <p><a class="botao botao-secundario" href="${link('diretor/prestacao.html')}">${icone('moeda', 20)}Declarar gastos e ver o retorno do PROFIN</a></p>
      <p class="contagem">A prestação em atraso pode suspender o próximo repasse da escola. Os valores por categoria ficam na tela de prestação de contas.</p>
      <h2>Atos autorizativos</h2>
      <div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Atos autorizativos da escola</caption>
        <thead><tr><th scope="col">Etapa</th><th scope="col">Ato</th><th scope="col" class="num">Validade</th><th scope="col">Situação</th></tr></thead>
        <tbody>${meusAtos.map((a) => { const s = situacaoAto(a); return `<tr><td class="titulo-linha">${esc(a.etapa)}</td><td data-rotulo="Ato"><div>${esc(a.numero)}</div></td><td class="num" data-rotulo="Validade"><div>${dataBR(a.validade)}</div></td><td data-rotulo="Situação"><div>${etiqueta(s.texto, s.tipo)}</div></td></tr>`; }).join('')}</tbody></table></div>
      <p class="contagem"><a href="${link('diretor/atos.html')}">Ver o impacto de cada ato</a></p>
      <h2>Comunicados e avisos <a class="texto-pequeno peso-normal" href="${link('diretor/comunicados.html')}">enviar comunicado</a></h2>
      ${avisos.map((a) => `<article class="aviso-item"><h3 class="esp-t-0 esp-b-1 titulo-cartao">${esc(a.titulo)}</h3><p class="esp-t-1 esp-b-1">${esc(a.texto)}</p><span class="texto-suave texto-pequeno">${esc(a.origem)} · ${esc(a.data)}</span></article>`).join('')}`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
