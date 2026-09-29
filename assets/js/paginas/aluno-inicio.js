// W2 · Início da família: situação do estudante escolhido, rematrícula e pedidos. Seletor de estudante para quem tem mais de um filho na rede.
import { iniciar, link, falhaDados } from '../app.js';
import { icone, esc, etiqueta, plural } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { carregar, matriculas, estudantes, escolherEstudante, diario, letivo } from '../dados.js';
import { nomeCurto, proximaSerie, serieCompleta, desempenho, PRESENCA_MINIMA } from '../regras.js';

const main = await iniciar({ perfil: 'aluno', assistente: true });
const cor = (s) => (s === 'Confirmada' ? 'ok' : s === 'Recusada' ? 'erro' : 'atencao');

async function mostrar() {
  try {
    const [{ lista, atual: est }, escolas, pedidos, dia, lv, calendario] = await Promise.all([estudantes(), carregar('escolas'), matriculas(), diario(), letivo(), carregar('calendario')]);
    const d = desempenho(est, dia, lv.aulasDadas);
    const atencao = d.linhas.filter((l) => ['recuperacao', 'reprovado'].includes(l.situacao.chave)).length;
    const aguardando = pedidos.filter((p) => p.meu && p.situacao === 'Aguardando confirmação').length;
    const proxima = calendario[0];
    const escola = escolas.find((e) => e.id === est.escolaId);
    const primeiroNome = est.nome.split(' ')[0];
    const meus = pedidos.filter((p) => p.meu);
    const rematricula = meus.find((p) => p.estudanteId === est.id && p.tipo === 'Rematrícula');
    const seguinte = proximaSerie(est.serie);
    const proximas = calendario.slice(0, 4);
    const situacaoTexto = atencao ? `${atencao} ${plural(atencao, 'matéria em atenção', 'matérias em atenção')}` : 'nenhuma matéria em atenção';
    const resumoFalado = `${est.nome}, ${est.turma}. Presença de ${d.presenca.toFixed(0)} por cento, mínimo de ${PRESENCA_MINIMA}. ${situacaoTexto}. Próxima data: ${proxima.titulo}, ${proxima.data.replace(/\//g, ' de ')}.`;
    main.innerHTML = `
      <h1>${esc(est.nome)}</h1>
      <p class="pagina-descricao">${esc(est.turma)} · ${esc(escola.nome)} · ano letivo 2026</p>
      ${lista.length > 1 ? `
        <div class="seletor-estudante" role="group" aria-label="Escolha o estudante">
          ${lista.map((e) => `<button type="button" data-estudante="${e.id}" aria-pressed="${e.id === est.id}"><span>${esc(e.nome.split(' ')[0])}<small>${esc(e.turma)}</small></span></button>`).join('')}
        </div>` : ''}
      <dl class="resumo-linha">
        <div class="${d.presenca < PRESENCA_MINIMA ? 'alerta' : ''}"><dd>${d.presenca.toFixed(1).replace('.', ',')}%</dd><dt>de frequência (mínimo ${PRESENCA_MINIMA}%)</dt></div>
        <div class="${atencao ? 'atencao' : ''}"><dd>${atencao}</dd><dt>${plural(atencao, 'matéria em atenção', 'matérias em atenção')}</dt></div>
        <div><dd>${aguardando}</dd><dt>${plural(aguardando, 'pedido aguardando a escola', 'pedidos aguardando a escola')}</dt></div>
      </dl>
      <div class="linha-botoes esp-b-4"><a class="botao botao-secundario" href="${link('aluno/notas.html')}">Ver boletim de ${esc(primeiroNome)}</a>${botaoOuvir(resumoFalado, 'Ouvir resumo')}</div>
      ${seguinte ? (rematricula
        ? `<p class="esp-b-4">Rematrícula para 2027: ${etiqueta(rematricula.situacao, cor(rematricula.situacao))} <span class="texto-suave">protocolo ${esc(rematricula.protocolo)}</span></p>`
        : `<div class="alerta-info">${icone('info', 20)}<span>Rematrícula para 2027 aberta de 3 a 28 de novembro. ${esc(primeiroNome)} continua em ${esc(nomeCurto(escola.nome))}, na ${esc(serieCompleta(seguinte))}, com os dados já preenchidos. <a href="${link('familia/matricula.html')}?rematricula=${est.id}">Confirmar rematrícula de ${esc(primeiroNome)}</a></span></div>`) : ''}
      <h2>Próximas datas <a class="texto-pequeno peso-normal" href="${link('aluno/calendario.html')}">ver calendário e avisos</a></h2>
      <div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Próximas datas do calendário letivo</caption>
        <thead><tr><th scope="col">Data</th><th scope="col">Evento</th></tr></thead>
        <tbody>${proximas.map((c) => `<tr><td class="sem-quebra-texto" data-rotulo="Data">${esc(c.data)}</td><td data-rotulo="Evento">${esc(c.titulo)}</td></tr>`).join('')}</tbody>
      </table></div>
      ${meus.length ? `<h2>Pedidos de matrícula</h2>
      <div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Pedidos de matrícula da família</caption>
        <thead><tr><th scope="col">Protocolo</th><th scope="col">Estudante</th><th scope="col">Tipo</th><th scope="col">Série</th><th scope="col">Escola</th><th scope="col">Situação</th></tr></thead>
        <tbody>${meus.map((p) => `<tr><td class="titulo-linha">${esc(p.protocolo)}</td><td data-rotulo="Estudante">${esc(p.estudante)}</td><td data-rotulo="Tipo">${esc(p.tipo)}</td><td data-rotulo="Série">${esc(p.serie)}</td><td data-rotulo="Escola">${esc(nomeCurto(escolas.find((e) => e.id === p.escolaId).nome))}</td><td data-rotulo="Situação">${etiqueta(p.situacao, cor(p.situacao))}${p.motivo ? `<small>Motivo: ${esc(p.motivo)}</small>` : ''}</td></tr>`).join('')}</tbody>
      </table></div>` : ''}
      <p class="aviso-prototipo">Protótipo com dados fictícios.</p>`;
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('click', (e) => {
  const b = e.target.closest('[data-estudante]');
  if (!b) return;
  escolherEstudante(b.dataset.estudante);
  mostrar().then(() => main.querySelector(`[data-estudante="${b.dataset.estudante}"]`)?.focus());
});
mostrar();
