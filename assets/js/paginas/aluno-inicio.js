// Início do aluno. O desenho muda com a faixa etária (data-faixa no body, definido em app.js pela série):
//   anos iniciais  → mascote, botões grandes com ícone e palavra, pouco texto;
//   anos finais    → colorido e organizado: barra de frequência, selos de conquista, próximas provas;
//   Ensino Médio   → sóbrio e denso: painel de desempenho por matéria com a nota que falta para a média.
// Os três blocos ficam na página e o CSS mostra o da faixa: trocar em "Ver visual" é imediato.
import { iniciar, link, falhaDados, faixaEscolhida, escolherFaixa } from '../app.js';
import { icone, esc, etiqueta, plural, numeroBR, vazio } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { carregar, matriculas, estudantes } from '../dados.js';
import { painelDoEstudante, tentativasDoQuiz } from '../painel-dados.js';
import { nomeCurto, proximaSerie, serieCompleta, PRESENCA_MINIMA, mediaGeral, selosDoEstudante, FAIXAS, faixaDaSerie, semaforoNota, notaNecessaria, TIPOS_DA_AGENDA, MEDIA_APROVACAO, NOME_DO_DIA, diaDaSemana } from '../regras.js';
import { semaforo, barraDeNivel, mascote, diaMes } from '../componentes/indicadores.js';

const main = await iniciar({ perfil: 'aluno', pagina: 'aluno/index.html', assistente: true });
const cor = (s) => (s === 'Confirmada' ? 'ok' : s === 'Recusada' ? 'erro' : 'atencao');

async function mostrar() {
  try {
    const [{ atual: est }, escolas, pedidos, calendario] = await Promise.all([estudantes(), carregar('escolas'), matriculas(), carregar('calendario')]);
    const p = await painelDoEstudante(est);
    const { d, lv, margem, semFreq, aulasHoje, agenda } = p;
    const escola = escolas.find((e) => e.id === est.escolaId);
    const primeiroNome = est.nome.split(' ')[0];
    const atencao = d.linhas.filter((l) => ['recuperacao', 'reprovado'].includes(l.situacao.chave));
    const media = mediaGeral(Object.fromEntries(d.linhas.map((l) => [l.materia, l.media])));
    const proximaProva = agenda.aFazer.find((i) => i.tipo === 'prova' && i.dias >= 0);
    const proximas = agenda.aFazer.slice(0, 3);
    const meus = pedidos.filter((x) => x.meu);
    const rematricula = meus.find((x) => x.estudanteId === est.id && x.tipo === 'Rematrícula');
    const seguinte = proximaSerie(est.serie);
    const resumoAulas = aulasHoje.length ? `Hoje você tem ${aulasHoje.length} ${plural(aulasHoje.length, 'aula', 'aulas')}. A primeira é ${aulasHoje[0].componente}, às ${aulasHoje[0].inicio}.` : 'Hoje não tem aula.';
    const falado = `${est.nome}, ${est.turma}. Presença de ${d.presenca.toFixed(0)} por cento, ${semFreq.texto}. ${atencao.length ? `${atencao.length} ${plural(atencao.length, 'matéria em atenção', 'matérias em atenção')}.` : 'Nenhuma matéria em atenção.'} ${resumoAulas}`;
    const auto = faixaDaSerie(est.serie);
    const selos = selosDoEstudante({ linhas: d.linhas, presenca: d.presenca, tentativasDoQuiz: tentativasDoQuiz(est.id) });

    // Atalhos: cartões grandes com ícone e palavra juntos
    const atalhos = [
      ['aluno/notas.html', 'livro', 'Minhas notas', media === null ? 'Sem notas ainda' : `Média ${numeroBR(media)}`],
      ['aluno/frequencia.html', 'grafico', 'Minhas faltas', `${d.faltas} ${plural(d.faltas, 'falta', 'faltas')} · ${semFreq.texto}`],
      ['aluno/horario.html', 'relogio', 'Meu horário', aulasHoje.length ? `${aulasHoje.length} aulas hoje` : 'Hoje sem aula'],
      ['aluno/quiz.html', 'pergunta', 'Quiz', 'Treine por matéria'],
      ['aluno/rotina.html', 'lista', 'Provas', proximaProva ? `${proximaProva.componente}, ${diaMes(proximaProva.data)}` : 'Nenhuma marcada'],
      ['aluno/carteirinha.html', 'cartao', 'Carteirinha', 'Mostre na entrada']
    ];
    const cartoes = `<ul class="cartoes-grandes">${atalhos.map(([h, i, t, s], k) => `<li><a class="cartao-grande fx-${(k % 5) + 1}" href="${link(h)}">${icone(i, 52)}<span class="cg-texto"><span class="cg-titulo">${t}</span><small>${esc(s)}</small></span></a></li>`).join('')}</ul>`;

    const linhaProxima = (i) => `<tr><td class="sem-quebra-texto" data-rotulo="Quando"><div>${diaMes(i.data)}<br><small>${NOME_DO_DIA[diaDaSemana(i.data)].slice(0, 3)}${i.hora ? ` · ${i.hora}` : ''}</small></div></td><td class="titulo-linha">${esc(i.titulo)}<br><small>${esc(i.componente)}</small></td><td data-rotulo="Tipo"><div>${etiqueta(TIPOS_DA_AGENDA[i.tipo], 'info')}</div></td><td data-rotulo="Prazo"><div>${semaforo(i.semaforo)}</div></td></tr>`;
    const tabelaProximas = proximas.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Próximas provas, trabalhos e entregas</caption>
        <thead><tr><th scope="col">Quando</th><th scope="col">O quê</th><th scope="col">Tipo</th><th scope="col">Prazo</th></tr></thead><tbody>${proximas.map(linhaProxima).join('')}</tbody></table></div>
        <p class="contagem"><a href="${link('aluno/rotina.html')}">Ver toda a agenda</a></p>` : vazio('Nada marcado por enquanto', 'Provas, trabalhos e entregas aparecem aqui.');

    // ---- Anos iniciais ----
    const iniciais = `<div class="so-iniciais">
      <div class="mascote-bloco fx-3">${mascote()}<p class="balao esp-t-0 esp-b-0">${esc(resumoAulas)}</p></div>
      ${cartoes}
      <div class="linha-botoes">${botaoOuvir(falado, 'Ouvir')}</div></div>`;

    // ---- Anos finais ----
    const finais = `<div class="so-finais">
      <section class="esp-b-4" aria-labelledby="freq-finais"><h2 id="freq-finais" class="esp-t-0">Minha frequência</h2>
        <p class="esp-b-2">${semaforo(semFreq, { grande: true })} <strong>${numeroBR(d.presenca)}%</strong> <span class="texto-suave">(mínimo ${PRESENCA_MINIMA}%)</span></p>
        ${barraDeNivel(d.presenca, semFreq)}
        <p class="esp-t-2 esp-b-0">Ainda cabem <strong>${Math.max(0, margem.restantes)} ${plural(Math.max(0, margem.restantes), 'falta', 'faltas')}</strong>. <a href="${link('aluno/frequencia.html')}">Simular uma falta</a></p></section>
      ${cartoes}
      <h2>Meus selos</h2>
      <ul class="selos">${selos.map((s) => `<li class="selo${s.conquistado ? '' : ' bloqueado'}">${icone(s.conquistado ? 'selo' : 'cadeado', 32)}<div><strong>${esc(s.nome)}</strong><span>${s.conquistado ? 'Conquistado' : `Ainda não. ${esc(s.como)}`}</span></div></li>`).join('')}</ul>
      <h2>Próximas provas e entregas</h2>${tabelaProximas}</div>`;

    // ---- Ensino Médio ----
    const medio = `<div class="so-medio">
      <dl class="resumo-linha">
        <div class="${d.presenca < PRESENCA_MINIMA ? 'alerta' : semFreq.chave === 'amarelo' ? 'atencao' : ''}"><dd>${numeroBR(d.presenca)}%</dd><dt>de frequência (mínimo ${PRESENCA_MINIMA}%) · ${semaforo(semFreq)}</dt></div>
        <div><dd>${Math.max(0, margem.restantes)}</dd><dt>${plural(Math.max(0, margem.restantes), 'falta ainda cabe', 'faltas ainda cabem')}</dt></div>
        <div><dd>${media === null ? '—' : numeroBR(media)}</dd><dt>média geral</dt></div>
        <div class="${atencao.length ? 'atencao' : ''}"><dd>${atencao.length}</dd><dt>${plural(atencao.length, 'matéria em atenção', 'matérias em atenção')}</dt></div>
      </dl>
      <h2 class="esp-t-0">Painel de desempenho</h2>
      <div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Desempenho por matéria, com a nota necessária para fechar o ano com média ${MEDIA_APROVACAO}</caption>
        <thead><tr><th scope="col">Matéria</th><th scope="col" class="num">1º bim.</th><th scope="col" class="num">2º bim.</th><th scope="col" class="num">Média</th><th scope="col">Nota</th><th scope="col" class="num">Preciso tirar</th></tr></thead>
        <tbody>${d.linhas.map((l) => {
          const n = notaNecessaria([l.n1, l.n2, null, null], MEDIA_APROVACAO);
          const preciso = n.estado === 'completo' ? '—' : n.estado === 'ja-alcancada' ? 'já alcançada' : n.estado === 'impossivel' ? `acima de 10${n.precisaRecuperacao !== null ? ` (rec.: ${numeroBR(n.precisaRecuperacao)})` : ''}` : `${numeroBR(n.precisa)} em cada`;
          const nf = (v) => (v === null ? '—' : numeroBR(v));
          return `<tr><td class="titulo-linha"><strong>${esc(l.materia)}</strong></td><td class="num" data-rotulo="1º bim."><div>${nf(l.n1)}</div></td><td class="num" data-rotulo="2º bim."><div>${nf(l.n2)}</div></td><td class="num negrito" data-rotulo="Média"><div>${nf(l.media)}</div></td><td data-rotulo="Nota"><div>${semaforo(semaforoNota(l.media))}</div></td><td class="num" data-rotulo="Preciso tirar"><div>${preciso}</div></td></tr>`;
        }).join('')}</tbody></table></div>
      <p class="contagem">Preciso tirar: nota média necessária nos bimestres que faltam para fechar o ano com média ${MEDIA_APROVACAO}. <a href="${link('aluno/rotina.html')}">Calculadora completa</a></p>
      <h2>Próximas provas e entregas</h2>${tabelaProximas}
      <h2>Atalhos</h2>
      <div class="linha-botoes">${[['aluno/frequencia.html', 'grafico', 'Frequência'], ['aluno/horario.html', 'relogio', 'Horário'], ['aluno/quiz.html', 'pergunta', 'Quiz'], ['aluno/carteirinha.html', 'cartao', 'Carteirinha'], ['aluno/documentos.html', 'documento', 'Documentos']].map(([h, i, t]) => `<a class="botao botao-secundario" href="${link(h)}">${icone(i, 20)}${t}</a>`).join('')}${botaoOuvir(falado, 'Ouvir resumo')}</div></div>`;

    main.innerHTML = `
      <h1>${document.body.dataset.faixa === 'iniciais' ? `Oi, ${esc(primeiroNome)}!` : esc(est.nome)}</h1>
      <p class="pagina-descricao so-detalhe">${esc(est.turma)} · ${esc(escola.nome)} · ano letivo ${lv.ano}</p>
      ${iniciais}${finais}${medio}
      ${seguinte ? `<div class="so-detalhe esp-t-5">${rematricula
        ? `<p>Rematrícula para 2027: ${etiqueta(rematricula.situacao, cor(rematricula.situacao))} <span class="texto-suave">protocolo ${esc(rematricula.protocolo)}</span></p>`
        : `<div class="alerta-info">${icone('info', 20)}<span>Rematrícula 2027 aberta de 3 a 28 de novembro: ${esc(serieCompleta(seguinte))} em ${esc(nomeCurto(escola.nome))}. Quem faz é o responsável: avise em casa.</span></div>`}</div>` : ''}
      <div class="escolha-visual" id="visual-faixa"><label for="faixa">Ver visual de</label>
        <select id="faixa" class="entrada">${[['', `Minha série (${FAIXAS[auto]})`], ...Object.entries(FAIXAS)].map(([v, t]) => `<option value="${v}" ${faixaEscolhida() === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
        <span>Só para comparar os desenhos. A escolha fica neste aparelho.</span></div>`;
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('change', (e) => {
  if (e.target.id !== 'faixa') return;
  escolherFaixa(e.target.value);
  mostrar().then(() => main.querySelector('#faixa')?.focus());
});
mostrar();
