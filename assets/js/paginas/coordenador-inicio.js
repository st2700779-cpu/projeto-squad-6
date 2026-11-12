// Turmas e desempenho para a coordenação: cada turma num cartão, o acompanhamento dos estudantes em risco e o marcador de atenção.
// O sistema NÃO decide quem está em risco por conta própria na turma: o ícone de alerta só aparece quando a coordenação marca.
import { iniciar, link, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, numeroBR, plural, pedirTexto, confirmar, avisar, vazio, etiqueta, icone, dataBR } from '../ui.js';
import { conjunto, salvar, registrarAcao, diarioParaLeitura } from '../dados.js';
import { desempenhoDaEscola } from '../painel-dados.js';
import { semaforoFrequencia, semaforoNota, presenca, media, situacao, PRESENCA_MINIMA } from '../regras.js';
import { semaforo } from '../componentes/indicadores.js';
import { turmasSemRegistro, LIMITE_SEM_REGISTRO_DIAS } from '../dominio/vida-escolar.js';
import { marcaDeAtencao } from '../componentes/comparativo.js';

const main = await iniciar({ perfil: 'coordenador', pagina: 'coordenador/index.html', assistente: false });
let filtro = '';
let painel, atencoes, dia, registros;

function acompanhamento() {
  const lv = painel.lv;
  const nomes = Object.fromEntries(painel.lista.map((x) => [x.turma.id, x.turma.nome]));
  const todos = Object.entries(dia).filter(([t]) => nomes[t]).flatMap(([t, alunos]) => alunos.map((a) => { const f = presenca(a.faltas, lv.aulasDadas); const m = media(a.n1, a.n2, a.n3, a.n4); return { a, t, f, m, s: situacao(m, f) }; }))
    .filter((x) => ['recuperacao', 'reprovado'].includes(x.s.chave));
  const lista = todos.filter((x) => !filtro || x.t === filtro).sort((x, y) => (x.s.chave === 'reprovado' ? 0 : 1) - (y.s.chave === 'reprovado' ? 0 : 1) || (x.m ?? 99) - (y.m ?? 99));
  return `<div class="ferramentas-tabela"><div class="campo"><label for="filtro-turma">Turma</label><select id="filtro-turma" class="entrada"><option value="">Todas as turmas com diário</option>${Object.keys(dia).filter((t) => nomes[t]).map((t) => `<option value="${t}" ${t === filtro ? 'selected' : ''}>${esc(nomes[t])}</option>`).join('')}</select></div></div>
    ${lista.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Estudantes que pedem acompanhamento</caption>
      <thead><tr><th scope="col">Estudante</th><th scope="col">Turma</th><th scope="col" class="num">Média</th><th scope="col" class="num">Frequência</th><th scope="col">Situação</th></tr></thead>
      <tbody>${lista.map(({ a, t, f, m, s }) => `<tr><td class="titulo-linha"><strong>${esc(a.nome)}</strong>${a.obs ? `<br><small>${esc(a.obs)}</small>` : ''}</td><td data-rotulo="Turma"><div>${esc(nomes[t])}</div></td><td class="num" data-rotulo="Média"><div>${m === null ? '—' : numeroBR(m)}</div></td><td class="num" data-rotulo="Frequência"><div>${numeroBR(f)}%</div></td><td data-rotulo="Situação"><div>${etiqueta(s.texto, s.tipo)}</div></td></tr>`).join('')}</tbody></table></div>
      <p class="contagem">${lista.length} ${plural(lista.length, 'estudante', 'estudantes')} em recuperação ou reprovação parcial · média de Matemática e frequência do diário</p>` : vazio('Nenhum estudante para acompanhar', 'Quem ficar em recuperação ou abaixo da frequência mínima aparece aqui.')}`;
}

function cartoes() {
  return `<div class="grade-cartoes">${painel.lista.map((x) => {
    const marca = atencoes[x.turma.id];
    const sf = x.frequencia === null ? { chave: 'neutro', icone: '', texto: 'Sem dados' } : semaforoFrequencia(x.frequencia);
    return `<article class="cartao-turma${marca ? ' atencao' : ''}" aria-labelledby="t-${x.turma.id}">
      <h3 id="t-${x.turma.id}">${esc(x.turma.nome)} ${marcaDeAtencao(marca)}</h3>
      <p class="texto-suave esp-t-0 esp-b-0">${esc(x.turma.serie)} · ${esc(x.turma.turno)} · ${x.alunos} ${plural(x.alunos, 'estudante', 'estudantes')}</p>
      <dl><div><dd>${x.frequencia === null ? '—' : `${numeroBR(x.frequencia)}%`}</dd><dt>frequência</dt></div><div><dd>${x.media === null ? '—' : numeroBR(x.media)}</dd><dt>média geral</dt></div><div><dd>${x.emRisco}</dd><dt>em risco</dt></div></dl>
      <p class="esp-t-0 esp-b-0">${semaforo(sf)} ${semaforo(semaforoNota(x.media))}</p>
      ${marca ? `<p class="nota-contexto esp-t-1">${esc(marca.motivo)}<small>${esc(marca.por)} · ${dataBR(marca.quando)}</small></p>` : ''}
      <div class="linha-botoes"><button type="button" class="botao botao-secundario botao-mini" data-atencao="${x.turma.id}" aria-pressed="${Boolean(marca)}">${icone('bandeira', 18)}${marca ? 'Tirar a marca de atenção' : 'Marcar atenção'}</button></div></article>`;
  }).join('')}</div>`;
}

function desenhar() {
  const marcadas = Object.keys(atencoes).filter((id) => painel.lista.some((x) => x.turma.id === id)).length;
  const semRegistro = turmasSemRegistro(painel.lista.map((x) => x.turma), registros, painel.hoje).length;
  main.innerHTML = `
    <header class="heroi">
      <span class="heroi-selo">Coordenação</span>
      <h1>Turmas e desempenho</h1>
      <p class="heroi-linha">Cada turma com frequência, média e estudantes em risco. O ícone de atenção aparece só nas turmas que você marcar, com a sua anotação.</p>
    </header>
    <dl class="resumo-linha">
      <div><dd>${painel.lista.length}</dd><dt>${plural(painel.lista.length, 'turma', 'turmas')}</dt></div>
      <div><dd>${painel.totais.alunos}</dd><dt>estudantes</dt></div>
      <div class="${painel.totais.emRisco ? 'alerta' : ''}"><dd>${painel.totais.emRisco}</dd><dt>em risco</dt></div>
      <div class="${marcadas ? 'atencao' : ''}"><dd>${marcadas}</dd><dt>${plural(marcadas, 'turma marcada', 'turmas marcadas')}</dt></div>
      <div class="${semRegistro ? 'alerta' : ''}"><dd>${semRegistro}</dd><dt>${plural(semRegistro, 'turma sem registro de aula', 'turmas sem registro de aula')} há mais de ${LIMITE_SEM_REGISTRO_DIAS} dias · <a href="${link('coordenador/registros-aula.html')}">ver</a></dt></div></dl>
    <div class="linha-botoes esp-b-4"><a class="botao" href="${link('coordenador/comparativo.html')}">${icone('trocar', 20)}Comparar turmas</a><a class="botao botao-secundario" href="${link('coordenador/reuniao.html')}">${icone('imprimir', 20)}Reunião pedagógica</a></div>
    ${cartoes()}
    <h2>Acompanhamento pedagógico</h2>
    <div id="acompanhamento">${acompanhamento()}</div>`;
}

async function mostrar() {
  try {
    const escolaId = sessao().escolaId;
    [painel, atencoes, dia, registros] = await Promise.all([desempenhoDaEscola(escolaId), conjunto('atencao-turmas'), diarioParaLeitura({ soAtivos: true }), conjunto('registros-aula')]);
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('change', (e) => { if (e.target.id === 'filtro-turma') { filtro = e.target.value; main.querySelector('#acompanhamento').innerHTML = acompanhamento(); main.querySelector('#filtro-turma').focus(); } });
main.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-atencao]');
  if (!b) return;
  const id = b.dataset.atencao;
  const turma = painel.lista.find((x) => x.turma.id === id).turma;
  try {
    if (atencoes[id]) {
      if (!(await confirmar({ titulo: `Tirar a marca de atenção de ${turma.nome}?`, texto: 'A anotação some. O registro da ação continua no histórico da escola.', botao: 'Tirar a marca' }))) return;
      delete atencoes[id];
      await registrarAcao(sessao().nome, 'Tirou a marca de atenção', turma.nome);
    } else {
      const motivo = await pedirTexto({ titulo: `Por que marcar ${turma.nome}?`, rotulo: 'Motivo (fica registrado, com o seu nome)', minimo: 5 });
      if (!motivo) return;
      atencoes[id] = { motivo, por: sessao().nome, quando: painel.hoje };
      await registrarAcao(sessao().nome, 'Marcou atenção', turma.nome);
    }
    await salvar('atencao-turmas', atencoes);
    desenhar();
    main.querySelector(`[data-atencao="${id}"]`)?.focus();
  } catch { avisar('Não foi possível salvar a marca. Confira a conexão e tente de novo.'); mostrar(); }
});
mostrar();
