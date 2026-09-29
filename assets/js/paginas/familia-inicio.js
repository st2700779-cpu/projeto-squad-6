// W2 · Início da família. Seletor de estudante no topo para quem tem mais de um filho na rede,
// e rematrícula em um toque para quem já é aluno.
import { iniciar, link, falhaDados } from '../app.js';
import { icone, esc, etiqueta, plural } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { carregar, matriculas, estudantes, escolherEstudante, diario, letivo } from '../dados.js';
import { nomeCurto, proximaSerie, serieCompleta, desempenho, PRESENCA_MINIMA } from '../regras.js';

const main = await iniciar({ perfil: 'familia', assistente: true });
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
    const blocos = [
      ['familia/matricula.html', 'Fazer matrícula', 'Nova, rematrícula ou transferência', 'formulario'],
      ['familia/notas.html', 'Ver notas e faltas', `Como ${primeiroNome} está indo`, 'livro'],
      ['familia/documentos.html', 'Documentos e declarações', 'O que levar e declarações para imprimir', 'documento'],
      ['familia/calendario.html', 'Calendário e avisos', 'Provas, feriados e prazos', 'calendario']
    ];
    main.innerHTML = `
      <h1>Olá! O que você quer fazer?</h1>
      <p class="pagina-descricao">Acompanhe a vida escolar e faça os pedidos da família em poucos toques.</p>
      ${lista.length > 1 ? `
        <div class="seletor-estudante" role="group" aria-label="Escolha o estudante">
          ${lista.map((e) => `<button type="button" data-estudante="${e.id}" aria-pressed="${e.id === est.id}"><span class="avatar" aria-hidden="true">${esc(e.nome[0])}</span><span>${esc(e.nome.split(' ')[0])}<small>${esc(e.turma)}</small></span></button>`).join('')}
        </div>` : ''}
      <div class="numeros">
        <div class="numero${d.presenca < PRESENCA_MINIMA ? ' alerta' : ' ok'}"><span class="numero-icone">${icone(d.presenca < PRESENCA_MINIMA ? 'alerta' : 'ok', 22)}</span><strong>${d.presenca.toFixed(0)}%</strong><span>de presença (mínimo ${PRESENCA_MINIMA}%)</span></div>
        <div class="numero${atencao ? ' atencao' : ' ok'}"><span class="numero-icone">${icone('livro', 22)}</span><strong>${atencao}</strong><span>${plural(atencao, 'matéria precisa de atenção', 'matérias precisam de atenção')}</span></div>
        <div class="numero"><span class="numero-icone">${icone('calendario', 22)}</span><strong class="numero-texto">${esc(proxima.data)}</strong><span>${esc(proxima.titulo)}</span></div>
        <div class="numero${aguardando ? ' atencao' : ''}"><span class="numero-icone">${icone('formulario', 22)}</span><strong>${aguardando}</strong><span>${plural(aguardando, 'pedido aguardando a escola', 'pedidos aguardando a escola')}</span></div>
      </div>
      <div class="estudante"><span class="avatar" aria-hidden="true">${esc(est.nome[0])}</span><div><strong class="texto-medio">${esc(est.nome)}</strong><br><span class="texto-suave">${esc(est.turma)} · ${esc(nomeCurto(escola.nome))}</span></div></div>
      ${seguinte ? (rematricula
        ? `<div class="cartao destaque"><strong>Rematrícula para 2027</strong><div class="linha-botoes esp-t-2">${etiqueta(rematricula.situacao, cor(rematricula.situacao))}<span class="texto-suave">Protocolo ${esc(rematricula.protocolo)}</span></div></div>`
        : `<div class="cartao destaque">
            <strong class="texto-medio">Rematrícula para 2027</strong>
            <p class="esp-t-1 esp-b-3">${esc(primeiroNome)} continua em ${esc(nomeCurto(escola.nome))}, na ${esc(serieCompleta(seguinte))}. Os dados já estão preenchidos.</p>
            <a class="botao botao-grande botao-largo" href="${link('familia/matricula.html')}?rematricula=${est.id}">${icone('ok', 22)}Confirmar rematrícula</a>
          </div>`) : ''}
      <h2>Acesso rápido</h2>
      <div class="grade-3">${blocos.map(([h, t, d, i]) => `<div class="bloco"><a href="${link(h)}"><span class="icone">${icone(i, 30)}</span><span><strong>${t}</strong><small>${d}</small></span></a>${botaoOuvir(`${t}. ${d}.`, '')}</div>`).join('')}</div>
      ${meus.length ? `<h2>Seus pedidos de matrícula</h2>${meus.map((p) => `
        <div class="cartao"><div class="d-flex justify-content-between flex-wrap gap-2"><strong>${esc(p.estudante)}</strong>${etiqueta(p.situacao, cor(p.situacao))}</div>
        <span class="texto-suave">${esc(p.tipo)} · ${esc(p.serie)} · ${esc(nomeCurto(escolas.find((e) => e.id === p.escolaId).nome))} · Protocolo ${esc(p.protocolo)}</span>
        ${p.motivo ? `<p class="esp-t-2 esp-b-0">Motivo: ${esc(p.motivo)}</p>` : ''}</div>`).join('')}` : ''}
      <p class="aviso-prototipo esp-t-5">Protótipo de demonstração com dados fictícios.</p>`;
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('click', (e) => {
  const b = e.target.closest('[data-estudante]');
  if (!b) return;
  escolherEstudante(b.dataset.estudante);
  mostrar().then(() => main.querySelector(`[data-estudante="${b.dataset.estudante}"]`)?.focus());
});
mostrar();
