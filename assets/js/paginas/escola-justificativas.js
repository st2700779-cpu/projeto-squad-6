// Justificativas de falta (secretaria): fila das justificativas enviadas pelos responsáveis, com decisão de aceitar (abonar) ou recusar.
// Recusar exige uma explicação que a família lê. A decisão fica registrada com data e usuário.
import { iniciar, falhaDados } from '../app.js';
import { esc, avisar, dataBR, vazio, etiqueta, comEspera, plural } from '../ui.js';
import { conjunto, salvar, registrarAcao, dataDeReferencia } from '../dados.js';
import { nomeDoMotivo, validarDecisao, aplicarDecisao, ordenarJustificativas, diasDoPeriodo } from '../dominio/vida-escolar.js';
import { sessao } from '../auth.js';

const main = await iniciar({ perfil: 'escola', pagina: 'escola/justificativas.html', assistente: true });
const ESCOLA = sessao()?.escolaId || 'e1';
const TIPO = { 'Aguardando análise': 'atencao', Aceita: 'ok', Recusada: 'erro' };
let lista, hoje, filtro = 'pendentes', recusando = null;

const visiveis = () => ordenarJustificativas(lista.filter((j) => j.escolaId === ESCOLA)).filter((j) => (filtro === 'pendentes' ? j.situacao === 'Aguardando análise' : filtro === 'decididas' ? j.situacao !== 'Aguardando análise' : true));

function linha(j) {
  const dias = diasDoPeriodo(j.de, j.ate);
  const acoes = j.situacao === 'Aguardando análise'
    ? (recusando === j.protocolo
      ? `<form class="form-recusa" data-recusar-form="${esc(j.protocolo)}" novalidate><label for="parecer-${esc(j.protocolo)}">Por que recusar? <span class="dica">A família lê esta explicação.</span></label><textarea id="parecer-${esc(j.protocolo)}" name="parecer" class="entrada" rows="2" maxlength="300" aria-describedby="parecer-${esc(j.protocolo)}-erro"></textarea><p class="erro" id="parecer-${esc(j.protocolo)}-erro" role="alert"></p><div class="linha-botoes"><button type="submit" class="botao botao-perigo botao-mini">Confirmar recusa</button><button type="button" class="botao botao-texto botao-mini" data-cancelar>Cancelar</button></div></form>`
      : `<div class="linha-botoes"><button type="button" class="botao botao-mini" data-aceitar="${esc(j.protocolo)}" aria-label="Aceitar justificativa de ${esc(j.estudante)}">Aceitar</button><button type="button" class="botao botao-secundario botao-mini" data-recusar="${esc(j.protocolo)}" aria-label="Recusar justificativa de ${esc(j.estudante)}">Recusar</button></div>`)
    : `<small>${dataBR(j.decididaEm)}${j.decididaPor ? ` · ${esc(j.decididaPor)}` : ''}${j.parecer ? `<br>${esc(j.parecer)}` : ''}</small>`;
  return `<tr><td class="titulo-linha"><strong>${esc(j.estudante)}</strong><small>${esc(j.turma)} · responsável: ${esc(j.responsavel || '—')}</small></td>
    <td data-rotulo="Período"><div>${j.de === j.ate ? dataBR(j.de) : `${dataBR(j.de)} a ${dataBR(j.ate)}`}<small>${dias} ${plural(dias, 'dia', 'dias')}</small></div></td>
    <td data-rotulo="Motivo"><div>${esc(nomeDoMotivo(j.motivo))}${j.descricao ? `<small>${esc(j.descricao)}</small>` : ''}${j.anexo ? `<small>Anexo: ${esc(j.anexo.nome)}</small>` : ''}</div></td>
    <td data-rotulo="Protocolo"><div>${esc(j.protocolo)}<small>enviada em ${dataBR(String(j.enviadaEm).slice(0, 10))}</small></div></td>
    <td data-rotulo="Situação"><div>${etiqueta(j.situacao, TIPO[j.situacao] || 'neutra')}</div></td>
    <td class="acoes" data-rotulo="${j.situacao === 'Aguardando análise' ? 'Decisão' : 'Decidida'}">${acoes}</td></tr>`;
}

function desenhar(foco = '') {
  const doEscola = lista.filter((j) => j.escolaId === ESCOLA);
  const pend = doEscola.filter((j) => j.situacao === 'Aguardando análise').length;
  const itens = visiveis();
  const abas = [['pendentes', `Aguardando (${pend})`], ['decididas', `Decididas (${doEscola.length - pend})`], ['todas', `Todas (${doEscola.length})`]];
  main.innerHTML = `<h1 tabindex="-1">Justificativas de falta</h1>
    <p class="pagina-descricao">Analise as justificativas enviadas pelas famílias. Aceitar abona a falta; a falta continua registrada no diário.</p>
    <div class="segmentado" role="group" aria-label="Filtrar justificativas">${abas.map(([v, t]) => `<button type="button" class="seg" data-filtro="${v}" aria-pressed="${filtro === v}"><span>${t}</span></button>`).join('')}</div>
    ${itens.length ? `<div class="tabela-rolagem esp-t-3"><table class="tabela tabela-cartoes"><caption class="sr-only">Justificativas de falta</caption>
      <thead><tr><th scope="col">Estudante</th><th scope="col">Período</th><th scope="col">Motivo</th><th scope="col">Protocolo</th><th scope="col">Situação</th><th scope="col"><span class="sr-only">Decisão</span></th></tr></thead>
      <tbody>${itens.map(linha).join('')}</tbody></table></div><p class="contagem">${itens.length} ${plural(itens.length, 'justificativa', 'justificativas')}</p>`
    : vazio(filtro === 'pendentes' ? 'Nada aguardando análise' : 'Nenhuma justificativa', filtro === 'pendentes' ? 'Quando um responsável enviar uma justificativa, ela aparece aqui.' : 'Troque o filtro para ver as outras.')}`;
  if (foco) main.querySelector(foco)?.focus();
}

async function decidir(protocolo, decisao, parecer, botao) {
  await comEspera(botao, async () => {
    const atuais = await conjunto('justificativas');
    const j = atuais.find((x) => x.protocolo === protocolo);
    if (!j) throw new Error('NAO_ENCONTRADA');
    const { ok, erros } = validarDecisao(j, { decisao, parecer });
    if (!ok) throw Object.assign(new Error('INVALIDO'), { erros });
    lista = atuais.map((x) => (x === j ? aplicarDecisao(j, { decisao, parecer, por: sessao()?.nome || 'Secretaria', hoje }) : x));
    await salvar('justificativas', lista);
    await registrarAcao(sessao()?.nome || 'Secretaria', decisao === 'Aceita' ? 'Aceitou justificativa de falta' : 'Recusou justificativa de falta', `${j.estudante} · ${protocolo}`);
  });
}

async function mostrar() {
  try { [lista, hoje] = await Promise.all([conjunto('justificativas'), dataDeReferencia()]); desenhar(); } catch { falhaDados(main, mostrar); }
}
main.addEventListener('click', async (e) => {
  const f = e.target.closest('[data-filtro]');
  if (f) { filtro = f.dataset.filtro; recusando = null; desenhar(`[data-filtro="${filtro}"]`); return; }
  const rec = e.target.closest('[data-recusar]');
  if (rec) { recusando = rec.dataset.recusar; desenhar(`#parecer-${recusando}`); return; }
  if (e.target.closest('[data-cancelar]')) { const p = recusando; recusando = null; desenhar(`[data-recusar="${p}"]`); return; }
  const ac = e.target.closest('[data-aceitar]');
  if (ac) {
    try { await decidir(ac.dataset.aceitar, 'Aceita', '', ac); desenhar('h1'); avisar('Justificativa aceita. A falta fica abonada.'); } catch { avisar('Não foi possível registrar a decisão. Tente de novo.'); }
  }
});
main.addEventListener('submit', async (e) => {
  const protocolo = e.target.dataset?.recusarForm;
  if (!protocolo) return;
  e.preventDefault();
  const parecer = e.target.querySelector('[name="parecer"]').value;
  try { await decidir(protocolo, 'Recusada', parecer, e.submitter); recusando = null; desenhar('h1'); avisar('Justificativa recusada. A família vê a explicação.'); }
  catch (err) {
    if (err.erros) { e.target.querySelector('.erro').textContent = err.erros.parecer || err.erros.geral || ''; e.target.querySelector('textarea').setAttribute('aria-invalid', 'true'); e.target.querySelector('textarea').focus(); }
    else avisar('Não foi possível registrar a decisão. Tente de novo.');
  }
});
mostrar();
