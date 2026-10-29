// Transferências e cancelamentos de matrícula, iniciados pela secretaria.
// Transferência: o estudante sai da escola, a vaga é liberada e a escola de destino recebe um pedido para confirmar.
// Cancelamento: libera a vaga e pode ser desfeito (reativar). Os dois ficam registrados com data, motivo e quem fez.
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, avisar, confirmar, dataBR, vazio, etiqueta, comEspera, plural } from '../ui.js';
import { carregar, conjunto, matriculas, vagas as lerVagas, dataDeReferencia } from '../dados.js';
import { estudantesDaEscola, movimentar, desfazer } from '../movimentacoes-dados.js';
import { campo, lerFormulario, mostrarErros } from '../componentes/formulario.js';
import { MOTIVOS_DE_CANCELAMENTO, situacaoDoEstudante, validarTransferencia, validarCancelamento, podeDesfazer } from '../dominio/movimentacao.js';
import { motivoBloqueio } from '../dominio/matricula.js';

const ESCOLA = sessao()?.escolaId || 'e1';
const main = await iniciar({ perfil: 'escola', pagina: 'escola/movimentacoes.html', assistente: false });
const TIPO_DA_SITUACAO = { 'Aguardando confirmação': 'atencao', Confirmada: 'ok', Recusada: 'erro' };
let aba = 'Transferência', estudantes, escolas, atos, vagas, movs, pedidos, hoje, escolhido = new URLSearchParams(location.search).get('estudante') || '';

const situacaoDe = (id) => situacaoDoEstudante(id, movs);
const ativos = () => estudantes.filter((e) => situacaoDe(e.id).chave === 'ativo');

function formulario() {
  const lista = ativos();
  if (!lista.length) return vazio('Nenhum estudante ativo', 'Todos os estudantes desta escola já foram transferidos ou tiveram a matrícula cancelada.');
  const est = lista.find((e) => e.id === escolhido) || lista[0];
  const seletor = campo({ nome: 'estudanteId', rotulo: 'Estudante', valor: est.id, obrigatorio: true, opcoes: lista.map((e) => [e.id, `${e.nome} · ${e.turma}`]) });
  const comum = campo({ nome: 'data', rotulo: aba === 'Transferência' ? 'Data da transferência' : 'Data do cancelamento', tipo: 'date', valor: hoje, obrigatorio: true, atributos: `max="${hoje}"` });
  const destinos = escolas.filter((e) => e.id !== ESCOLA).map((e) => { const b = motivoBloqueio({ atos, vagas, escolaId: e.id, serie: est.serie }); return [e.id, `${e.nome} (${e.municipio})${b ? ` · indisponível: ${b.replace(/\.$/, '').toLowerCase()}` : ` · ${vagas[e.id][est.serie]} ${plural(vagas[e.id][est.serie], 'vaga', 'vagas')}`}`]; });
  const corpo = aba === 'Transferência'
    ? `${campo({ nome: 'destinoId', rotulo: `Escola de destino (${est.serie})`, valor: '', obrigatorio: true, dica: 'Só recebe a escola com ato vigente e vaga na série do estudante.', opcoes: [['', 'Escolha a escola'], ...destinos] })}
       ${comum}
       <div class="campo"><label for="f-motivo">Motivo <span class="obrigatorio" aria-hidden="true">*</span></label><textarea id="f-motivo" name="motivo" class="entrada" rows="3" maxlength="300" aria-describedby="f-motivo-erro"></textarea><p class="erro" id="f-motivo-erro" role="alert"></p></div>`
    : `${campo({ nome: 'motivoChave', rotulo: 'Motivo do cancelamento', valor: '', obrigatorio: true, opcoes: [['', 'Escolha o motivo'], ...MOTIVOS_DE_CANCELAMENTO] })}
       <div class="campo"><label for="f-descricao">Explicação <span class="dica">(obrigatória em "Outro motivo")</span></label><textarea id="f-descricao" name="descricao" class="entrada" rows="3" maxlength="300" aria-describedby="f-descricao-erro"></textarea><p class="erro" id="f-descricao-erro" role="alert"></p></div>
       ${comum}`;
  return `<form id="form-mov" class="form-cadastro" novalidate>
    <h2 class="esp-t-0">${aba === 'Transferência' ? 'Transferir estudante para outra escola' : 'Cancelar matrícula'}</h2>
    ${seletor}${corpo}
    <p class="erro" id="f-geral-erro" role="alert"></p>
    <button type="submit" class="botao ${aba === 'Cancelamento' ? 'botao-perigo' : ''}">${aba === 'Transferência' ? 'Transferir estudante' : 'Cancelar matrícula'}</button>
  </form>`;
}
function historico() {
  const minhas = movs.filter((m) => m.escolaOrigemId === ESCOLA);
  if (!minhas.length) return vazio('Nenhuma movimentação', 'Transferências e cancelamentos aparecem aqui, com o motivo e quem fez.');
  return `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Transferências e cancelamentos</caption>
    <thead><tr><th scope="col">Estudante</th><th scope="col">Movimentação</th><th scope="col">Motivo</th><th scope="col">Situação</th><th scope="col"><span class="sr-only">Ação</span></th></tr></thead>
    <tbody>${minhas.map((m) => {
      const pedido = m.protocoloDestino ? pedidos.find((p) => p.protocolo === m.protocoloDestino) : null;
      const pode = podeDesfazer(m, pedido);
      const estado = m.desfeitaEm ? etiqueta(m.tipo === 'Transferência' ? 'Desfeita' : 'Reativada', 'neutra') : m.tipo === 'Transferência' ? etiqueta(`Destino: ${pedido?.situacao || 'sem pedido'}`, TIPO_DA_SITUACAO[pedido?.situacao] || 'neutra') : etiqueta('Cancelada', 'erro');
      const alerta = !m.desfeitaEm && pedido?.situacao === 'Recusada' ? '<small>O destino recusou. Desfaça para o estudante voltar a esta escola.</small>' : '';
      return `<tr><td class="titulo-linha"><strong>${esc(m.estudante)}</strong><small>${esc(m.turma)} · ${esc(m.serie)}</small></td>
        <td data-rotulo="Movimentação"><div>${m.tipo === 'Transferência' ? `Transferência para ${esc(m.destinoNome)}<small>Pedido ${esc(m.protocoloDestino)}</small>` : 'Cancelamento de matrícula'}<small>${dataBR(m.data)} · ${esc(m.por)}</small></div></td>
        <td data-rotulo="Motivo"><div>${esc(m.motivo)}${m.descricao ? `<small>${esc(m.descricao)}</small>` : ''}</div></td>
        <td data-rotulo="Situação"><div>${estado}${m.desfeitaEm ? `<small>${dataBR(m.desfeitaEm)} · ${esc(m.desfeitaPor || '')}</small>` : ''}${alerta}</div></td>
        <td class="acoes">${m.desfeitaEm ? '' : pode.ok ? `<button type="button" class="botao botao-secundario botao-mini" data-desfazer="${esc(m.id)}" aria-label="${m.tipo === 'Transferência' ? 'Desfazer a transferência' : 'Reativar a matrícula'} de ${esc(m.estudante)}">${m.tipo === 'Transferência' ? 'Desfazer' : 'Reativar matrícula'}</button>` : `<small class="texto-suave">${esc(pode.motivo)}</small>`}</td></tr>`;
    }).join('')}</tbody></table></div>
    <p class="contagem">${minhas.length} ${plural(minhas.length, 'movimentação', 'movimentações')}</p>`;
}
function desenhar(foco = '') {
  const inativos = estudantes.length - ativos().length;
  main.innerHTML = `<h1 tabindex="-1">Transferências e cancelamentos</h1>
    <p class="pagina-descricao">Quando o estudante sai da escola, registre aqui. A vaga é liberada, a turma perde um matriculado e o professor deixa de ver o estudante na chamada.</p>
    <dl class="resumo-linha"><div><dd>${estudantes.length - inativos}</dd><dt>${plural(estudantes.length - inativos, 'estudante ativo', 'estudantes ativos')}</dt></div><div class="${inativos ? 'atencao' : ''}"><dd>${inativos}</dd><dt>${plural(inativos, 'estudante que saiu', 'estudantes que saíram')}</dt></div></dl>
    <div class="segmentado" role="group" aria-label="Tipo de movimentação">${['Transferência', 'Cancelamento'].map((t) => `<button type="button" class="seg" data-aba="${t}" aria-pressed="${aba === t}"><span>${t === 'Transferência' ? 'Transferir para outra escola' : 'Cancelar matrícula'}</span></button>`).join('')}</div>
    ${formulario()}
    <h2>Movimentações da escola</h2>${historico()}`;
  if (foco) main.querySelector(foco)?.focus();
}
async function mostrar(foco = '') {
  try {
    [estudantes, escolas, atos, vagas, movs, pedidos, hoje] = await Promise.all([estudantesDaEscola(ESCOLA), carregar('escolas'), carregar('atos'), lerVagas(), conjunto('movimentacoes'), matriculas(), dataDeReferencia()]);
    desenhar(foco);
  } catch { falhaDados(main, () => mostrar()); }
}

main.addEventListener('click', async (e) => {
  const a = e.target.closest('[data-aba]');
  if (a) { aba = a.dataset.aba; desenhar(`[data-aba="${aba}"]`); return; }
  const d = e.target.closest('[data-desfazer]');
  if (!d) return;
  const m = movs.find((x) => x.id === d.dataset.desfazer);
  if (!(await confirmar({ titulo: m.tipo === 'Transferência' ? 'Desfazer a transferência?' : 'Reativar a matrícula?', texto: m.tipo === 'Transferência' ? `${m.estudante} volta a ser aluno(a) desta escola. O pedido na escola de destino é recusado e as vagas voltam como estavam.` : `${m.estudante} volta a ser aluno(a) desta escola e ocupa uma vaga de novo.`, botao: m.tipo === 'Transferência' ? 'Desfazer' : 'Reativar' }))) return;
  try { await desfazer(m.id, { por: sessao().nome }); await mostrar('h1'); avisar(m.tipo === 'Transferência' ? 'Transferência desfeita.' : 'Matrícula reativada.'); }
  catch (err) { avisar(err.motivo || 'Não foi possível desfazer. Confira a conexão e tente de novo.', 'erro'); }
});
main.addEventListener('change', (e) => {
  if (e.target.id !== 'f-estudanteId') return;
  escolhido = e.target.value; desenhar('#f-estudanteId'); main.querySelector('#f-estudanteId').value = escolhido;
});
main.addEventListener('submit', async (e) => {
  if (e.target.id !== 'form-mov') return;
  e.preventDefault();
  const f = e.target, dados = lerFormulario(f);
  const estudante = estudantes.find((x) => x.id === dados.estudanteId) || null;
  const ctx = { estudante, situacao: estudante ? situacaoDe(estudante.id) : null, escolaOrigemId: ESCOLA, escolas, atos, vagas, hoje };
  const { ok, erros } = aba === 'Transferência' ? validarTransferencia(dados, ctx) : validarCancelamento(dados, ctx);
  if (!mostrarErros(f, erros) || !ok) return;
  const destino = escolas.find((x) => x.id === dados.destinoId);
  const texto = aba === 'Transferência' ? `${estudante.nome} sai desta escola e vai para ${destino.nome}, na ${estudante.serie}. A vaga daqui é liberada e a escola de destino recebe o pedido para confirmar.` : `${estudante.nome} deixa de ser aluno(a) da escola. A vaga é liberada. Dá para reativar depois, se for engano.`;
  if (!(await confirmar({ titulo: aba === 'Transferência' ? 'Transferir este estudante?' : 'Cancelar esta matrícula?', texto, botao: aba === 'Transferência' ? 'Transferir' : 'Cancelar matrícula', perigo: true }))) return;
  try {
    await comEspera(e.submitter, () => movimentar(aba, dados, { estudante, escolaOrigemId: ESCOLA, por: sessao().nome }));
    escolhido = ''; await mostrar('h1');
    avisar(aba === 'Transferência' ? 'Estudante transferido. A escola de destino recebeu o pedido.' : 'Matrícula cancelada.');
  } catch { f.querySelector('#f-geral-erro').textContent = 'Não foi possível registrar agora. Confira a conexão e tente de novo (confira a lista abaixo antes de repetir).'; await mostrar(); }
});
mostrar();
