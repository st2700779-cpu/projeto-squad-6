// Início da escola: fila de pendências da secretaria, autorizações e histórico das últimas ações.
import { iniciar, link, falhaDados } from '../app.js';
import { esc, dataBR, etiqueta, vazio, dataHoraBR, plural } from '../ui.js';
import { carregar, matriculas, turmasEscola, conjunto } from '../dados.js';
import { situacaoAto } from '../regras.js';

const ESCOLA = 'e1';
const main = await iniciar({ perfil: 'escola', pagina: 'escola/index.html', assistente: true });
async function mostrar() {
  try {
    const [escolas, atos, pedidos, turmas, enturmacao, historico] = await Promise.all([carregar('escolas'), carregar('atos'), matriculas(), turmasEscola(), conjunto('enturmacao'), conjunto('historico')]);
    const escola = escolas.find((e) => e.id === ESCOLA);
    const daEscola = pedidos.filter((p) => p.escolaId === ESCOLA);
    const aguardando = daEscola.filter((p) => p.situacao === 'Aguardando confirmação').length;
    const semTurma = daEscola.filter((p) => p.situacao === 'Confirmada' && !enturmacao[p.protocolo]).length;
    const pendentes = turmas.filter((t) => t.situacao === 'Pendente de aprovação').length;
    const meusAtos = atos.filter((a) => a.escolaId === ESCOLA);
    const vencidos = meusAtos.filter((a) => !situacaoAto(a).vigente).length;
    const fila = [
      [aguardando, plural(aguardando, 'matrícula para confirmar', 'matrículas para confirmar'), 'escola/matriculas.html', 'Abrir pedidos de matrícula'],
      [semTurma, plural(semTurma, 'estudante com matrícula confirmada sem turma', 'estudantes com matrícula confirmada sem turma'), 'escola/enturmacao.html', 'Enturmar estudantes'],
      [pendentes, plural(pendentes, 'turma aguardando aprovação da direção', 'turmas aguardando aprovação da direção'), 'escola/turmas.html', 'Abrir turmas']
    ];
    main.innerHTML = `
      <h1>${esc(escola.nome)}</h1>
      <p class="pagina-descricao">${esc(escola.municipio)} · ${esc(escola.dre)} · ano letivo 2026</p>
      <h2 class="esp-t-0">Pendências da secretaria</h2>
      <div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Pendências da secretaria escolar</caption>
        <thead><tr><th scope="col" class="num">Quantidade</th><th scope="col">Pendência</th><th scope="col"><span class="sr-only">Ação</span></th></tr></thead>
        <tbody>${fila.map(([n, texto, h, acao]) => `<tr><td class="num${n ? ' negrito' : ' texto-suave'}" data-rotulo="Quantidade">${n}</td><td class="titulo-linha">${esc(texto)}</td><td class="acoes">${n ? `<a class="botao botao-secundario botao-mini" href="${link(h)}">${acao}</a>` : '<span class="texto-suave">Nada a fazer</span>'}</td></tr>`).join('')}</tbody>
      </table></div>
      <h2>Autorizações da escola${vencidos ? ` ${etiqueta(`${vencidos} ${plural(vencidos, 'vencida', 'vencidas')}`, 'erro')}` : ''}</h2>
      <div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Atos autorizativos da escola</caption>
        <thead><tr><th scope="col">Etapa</th><th scope="col">Ato</th><th scope="col" class="num">Validade</th><th scope="col">Situação</th></tr></thead>
        <tbody>${meusAtos.map((a) => { const s = situacaoAto(a); return `<tr><td class="titulo-linha">${esc(a.etapa)}</td><td data-rotulo="Ato">${esc(a.numero)}</td><td class="num" data-rotulo="Validade">${dataBR(a.validade)}</td><td data-rotulo="Situação">${etiqueta(s.texto, s.tipo)}</td></tr>`; }).join('')}</tbody>
      </table></div>
      <p class="nota texto-suave">Sem ato vigente, a escola não pode abrir turma nem certificar estudantes daquela etapa.</p>
      <h2>Últimas ações</h2>
      ${historico.length
        ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Últimas ações registradas na escola</caption>
          <thead><tr><th scope="col">Quando</th><th scope="col">Quem</th><th scope="col">Ação</th><th scope="col">Referência</th></tr></thead>
          <tbody>${historico.slice(0, 8).map((h) => `<tr><td class="sem-quebra-texto" data-rotulo="Quando">${dataHoraBR(h.quando)}</td><td data-rotulo="Quem">${esc(h.quem)}</td><td class="titulo-linha">${esc(h.acao)}</td><td data-rotulo="Referência">${esc(h.alvo || '—')}</td></tr>`).join('')}</tbody>
        </table></div>
        <p class="contagem">${Math.min(8, historico.length)} de ${historico.length} ${plural(historico.length, 'registro', 'registros')}</p>`
        : vazio('Nenhuma ação registrada ainda', 'Confirmações, recusas, aprovações de turma e enturmações aparecem aqui, com quem fez e quando.')}`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
