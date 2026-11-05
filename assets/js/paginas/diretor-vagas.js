// Vagas da escola (direção): por série e turno, calculadas das turmas aprovadas. Ninguém digita o número: vaga é lugar livre
// numa turma aprovada (vagas da turma − estudantes), menos os pedidos de matrícula que ainda não têm turma. Ato vencido bloqueia
// a série. Para abrir vagas, a direção cria turma ou aumenta as vagas de uma turma (Direção › Turmas). Regra em dominio/vagas.js.
import { iniciar, falhaDados, link } from '../app.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, icone, plural, baixarCSV } from '../ui.js';
import { carregar, vagasDetalhadas } from '../dados.js';
import { situacaoAto } from '../regras.js';
import { TURNOS, textoPorTurno } from '../dominio/vagas.js';
import { atosDaEscola } from '../dominio/estrutura.js';
import { seriesEscolhidas } from '../dominio/cadastros.js';
import { ETAPAS } from '../dominio/niveis.js';

const main = await iniciar({ perfil: 'diretor', pagina: 'diretor/vagas.html', assistente: false });
const escolaId = sessao().escolaId;

async function mostrar() {
  try {
    const [escolas, atos, detalhe] = await Promise.all([carregar('escolas'), carregar('atos'), vagasDetalhadas()]);
    const escola = escolas.find((e) => e.id === escolaId);
    const daEscola = detalhe[escolaId] || {};
    const meus = atosDaEscola(atos, escolaId);
    const linhas = meus.flatMap((a) => seriesEscolhidas(a.etapa, a.series).map((serie) => ({ a, serie, c: daEscola[serie] || { lugares: 0, porTurno: {}, aguardando: 0, aguardandoTurma: 0, vagas: 0, excesso: 0, turmas: [] } })));
    const total = linhas.reduce((s, l) => s + (situacaoAto(l.a).vigente ? l.c.vagas : 0), 0);
    const pedidos = linhas.reduce((s, l) => s + l.c.aguardando + l.c.aguardandoTurma, 0);
    const semTurma = linhas.filter((l) => !l.c.turmas.length);
    const porTurno = Object.fromEntries(TURNOS.map((t) => [t, linhas.reduce((s, l) => s + (l.c.porTurno[t] || 0), 0)]).filter(([, v]) => v > 0));
    main.innerHTML = `
      <div class="cabecalho-pagina"><h1>Vagas da escola</h1></div>
      <p class="pagina-descricao">${esc(escola.nome)}. As vagas são calculadas das turmas: lugares livres nas turmas aprovadas, menos os pedidos de matrícula que ainda não têm turma. Para abrir vagas, crie uma turma ou aumente as vagas de uma turma em <a href="${link('diretor/turmas.html')}">Turmas</a>.</p>
      <dl class="resumo-linha">
        <div><dd>${total}</dd><dt>${plural(total, 'vaga para matrícula', 'vagas para matrícula')}</dt></div>
        <div><dd>${pedidos}</dd><dt>${plural(pedidos, 'pedido sem turma', 'pedidos sem turma')}</dt></div>
        <div class="${semTurma.length ? 'atencao' : ''}"><dd>${semTurma.length}</dd><dt>${plural(semTurma.length, 'série oferecida sem turma', 'séries oferecidas sem turma')}</dt></div>
      </dl>
      ${Object.keys(porTurno).length ? `<p class="texto-suave">Lugares livres por turno: ${esc(textoPorTurno(porTurno))}.</p>` : ''}
      <div class="linha-botoes nao-imprimir esp-b-3"><a class="botao" href="${link('diretor/turmas.html')}">${icone('mais', 20)}Criar turma</a><button type="button" class="botao botao-secundario" id="exportar">${icone('baixar', 20)}Exportar CSV</button></div>
      ${meus.map((a) => {
        const n = ETAPAS.find((x) => x.etapa === a.etapa);
        const s = situacaoAto(a);
        return `<h2>${esc(n?.curto || a.etapa)} ${etiqueta(s.vigente ? 'Ato vigente' : 'Ato vencido: série bloqueada', s.vigente ? 'ok' : 'erro')}</h2>
        <div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Vagas de ${esc(n?.curto || a.etapa)} por série</caption>
          <thead><tr><th scope="col">Série</th><th scope="col">Turmas (estudantes de vagas)</th><th scope="col">Lugares livres por turno</th><th scope="col" class="num">Pedidos sem turma</th><th scope="col">Vagas para matrícula</th></tr></thead>
          <tbody>${linhas.filter((l) => l.a === a).map(({ serie, c }) => `<tr><td class="titulo-linha"><strong>${esc(serie)}</strong></td>
            <td data-rotulo="Turmas"><div>${c.turmas.length ? c.turmas.map((t) => `${esc(t.nome)} · ${esc(t.turno)} · ${t.ocupados} de ${t.capacidade}`).join('<br>') : `<span class="texto-suave">nenhuma turma aprovada</span> <a class="texto-pequeno" href="${link('diretor/turmas.html')}">criar</a>`}</div></td>
            <td data-rotulo="Lugares livres"><div>${c.lugares}${Object.keys(c.porTurno).length ? `<br><span class="texto-suave texto-pequeno">${esc(textoPorTurno(c.porTurno))}</span>` : ''}</div></td>
            <td class="num" data-rotulo="Pedidos sem turma">${c.aguardando + c.aguardandoTurma}</td>
            <td data-rotulo="Vagas"><div>${c.bloqueada ? etiqueta('bloqueada (ato vencido)', 'erro') : c.excesso ? `${etiqueta('0', 'erro')}<br><span class="texto-pequeno">${c.excesso} ${plural(c.excesso, 'pedido a mais que os lugares', 'pedidos a mais que os lugares')}</span>` : `<strong>${c.vagas}</strong>`}</div></td></tr>`).join('')}</tbody></table></div>`;
      }).join('') || `<p class="alerta-info">${icone('info', 20)}<span>A escola ainda não tem ato autorizativo: sem ato, não há série nem vaga.</span></p>`}
      <p class="contagem">A SEED e as DREs acompanham estas vagas no Mapa de vagas da rede.</p>`;
    main.querySelector('#exportar').addEventListener('click', () => baixarCSV(`vagas-${escolaId}.csv`, ['Série', 'Turmas', ...TURNOS.map((t) => `Lugares livres (${t})`), 'Pedidos sem turma', 'Vagas para matrícula'],
      linhas.map(({ serie, c }) => [serie, c.turmas.length, ...TURNOS.map((t) => c.porTurno[t] ?? ''), c.aguardando + c.aguardandoTurma, c.bloqueada ? 'bloqueada' : c.vagas])));
  } catch { falhaDados(main, mostrar); }
}
mostrar();
