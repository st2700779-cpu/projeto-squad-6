// Justificar falta (responsável): escolhe o filho, o período e o motivo, anexa o atestado (só nome e tamanho no protótipo)
// e acompanha a decisão da secretaria. A falta continua no diário; aceita, fica abonada.
import { iniciar, falhaDados, link } from '../app.js';
import { esc, avisar, dataBR, vazio, etiqueta, comEspera, plural } from '../ui.js';
import { estudantes, conjunto, salvar, registrarAcao, novoProtocolo, dataDeReferencia } from '../dados.js';
import { campo, lerFormulario, mostrarErros } from '../componentes/formulario.js';
import { validarJustificativa, montarJustificativa, nomeDoMotivo, MOTIVOS_DE_FALTA, PRAZO_PARA_JUSTIFICAR_DIAS, AFASTAMENTO_MAX_DIAS } from '../dominio/vida-escolar.js';
import { sessao } from '../auth.js';

const main = await iniciar({ perfil: 'responsavel', pagina: 'responsavel/justificar.html', titulo: 'Justificar falta', estreito: true });
const EXTENSOES = /\.(pdf|png|jpe?g)$/i;
const LIMITE_MB = 5;
const tamanho = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const TIPO = { 'Aguardando análise': 'atencao', Aceita: 'ok', Recusada: 'erro' };
let filhos, hoje, pedidos, faltas;

/** Datas em que o estudante constou como ausente na chamada da turma (as mais recentes primeiro). */
const faltasRegistradas = (est, chamadas) => Object.entries(chamadas?.[est.turmaId] || {}).filter(([, c]) => c.ausentes?.includes(est.id)).map(([d]) => d).sort().reverse();

function formulario(est) {
  const sug = faltas[est.id] || [];
  return `<form id="form-justificativa" class="form-cadastro" novalidate>
    ${filhos.length > 1 ? campo({ nome: 'estudanteId', rotulo: 'Estudante', valor: est.id, opcoes: filhos.map((f) => [f.id, `${f.nome} · ${f.turma}`]), obrigatorio: true }) : `<input type="hidden" id="f-estudanteId" name="estudanteId" value="${esc(est.id)}"><p><strong>${esc(est.nome)}</strong> · ${esc(est.turma)}</p>`}
    ${sug.length ? `<p class="texto-pequeno esp-b-2">Faltas registradas pela escola: ${sug.slice(0, 6).map((d) => `<button type="button" class="botao botao-secundario botao-mini" data-data="${d}">${dataBR(d).slice(0, 5)}</button>`).join(' ')}</p>` : '<p class="texto-pequeno texto-suave esp-b-2">A escola ainda não registrou faltas deste estudante nas últimas chamadas. Você pode justificar uma data mesmo assim.</p>'}
    <div class="grade-2">
      ${campo({ nome: 'de', rotulo: 'Data da falta (ou primeiro dia)', tipo: 'date', obrigatorio: true, atributos: `max="${hoje}"` })}
      ${campo({ nome: 'ate', rotulo: 'Último dia', tipo: 'date', dica: `Só se faltou mais de um dia (até ${AFASTAMENTO_MAX_DIAS} dias).`, atributos: `max="${hoje}"` })}
    </div>
    ${campo({ nome: 'motivo', rotulo: 'Motivo', valor: '', opcoes: [['', 'Escolha o motivo'], ...MOTIVOS_DE_FALTA], obrigatorio: true })}
    <div class="campo"><label for="f-descricao">Explicação <span class="dica">(obrigatória só em "Outro motivo")</span></label><textarea id="f-descricao" name="descricao" class="entrada" rows="3" maxlength="500" aria-describedby="f-descricao-erro"></textarea><p class="erro" id="f-descricao-erro" role="alert"></p></div>
    <div class="campo"><label for="f-anexo">Atestado ou declaração <span class="dica">(PDF ou foto · até ${LIMITE_MB} MB · obrigatório se for saúde por mais de 3 dias)</span></label><input id="f-anexo" name="anexo" class="entrada" type="file" accept=".pdf,.png,.jpg,.jpeg" aria-describedby="f-anexo-erro"><p class="erro" id="f-anexo-erro" role="alert"></p></div>
    <p class="texto-suave texto-pequeno">Neste protótipo só o nome e o tamanho do arquivo ficam registrados. Prazo para justificar: ${PRAZO_PARA_JUSTIFICAR_DIAS} dias depois da falta.</p>
    <p class="erro" id="f-geral-erro" role="alert"></p>
    <button type="submit" class="botao">Enviar justificativa</button>
  </form>`;
}

function historico(lista) {
  if (!lista.length) return vazio('Nenhuma justificativa enviada', 'Quando você enviar, o andamento aparece aqui.');
  return `<ul class="lista-cartoes">${lista.map((j) => `<li class="cartao-justificativa"><p class="esp-b-1"><strong>${esc(j.estudante.split(' ')[0])}</strong> · ${j.de === j.ate ? dataBR(j.de) : `${dataBR(j.de)} a ${dataBR(j.ate)}`} ${etiqueta(j.situacao, TIPO[j.situacao] || 'neutra')}</p>
    <p class="esp-b-1 texto-pequeno">${esc(nomeDoMotivo(j.motivo))}${j.anexo ? ` · anexo: ${esc(j.anexo.nome)}` : ''} · protocolo ${esc(j.protocolo)}</p>
    ${j.situacao === 'Aguardando análise' ? '<p class="esp-b-0 texto-pequeno texto-suave">A secretaria da escola vai analisar. O prazo é de até 5 dias úteis.</p>' : `<p class="esp-b-0 texto-pequeno">${j.situacao === 'Aceita' ? 'Falta abonada pela secretaria.' : 'Recusada pela secretaria.'}${j.parecer ? ` Motivo: ${esc(j.parecer)}` : ''}</p>`}</li>`).join('')}</ul>`;
}

async function carregarTudo() {
  const [{ lista, atual }, chamadas, todos, dia] = await Promise.all([estudantes(), conjunto('chamadas'), conjunto('justificativas'), dataDeReferencia()]);
  filhos = lista; hoje = dia; pedidos = todos;
  faltas = Object.fromEntries(lista.map((f) => [f.id, faltasRegistradas(f, chamadas)]));
  return atual;
}
const meus = () => pedidos.filter((j) => filhos.some((f) => f.id === j.estudanteId)).sort((a, b) => b.enviadaEm.localeCompare(a.enviadaEm));
async function mostrar(foco = '') {
  try {
    const atual = await carregarTudo();
    const minhas = meus();
    main.innerHTML = `<h1 tabindex="-1">Justificar falta</h1>
      <p class="pagina-descricao">Avise a escola por que ${filhos.length > 1 ? 'o estudante faltou' : esc(atual.nome.split(' ')[0]) + ' faltou'}. Se for aceita, a falta fica abonada.</p>
      <div class="alerta-info">A justificativa não apaga a falta do diário: a escola decide se ela é abonada. ${minhas.filter((j) => j.situacao === 'Aguardando análise').length ? `Você tem ${minhas.filter((j) => j.situacao === 'Aguardando análise').length} ${plural(minhas.filter((j) => j.situacao === 'Aguardando análise').length, 'justificativa aguardando', 'justificativas aguardando')} análise.` : ''}</div>
      ${formulario(atual)}
      <h2>Justificativas enviadas</h2>${historico(minhas)}
      <p><a href="${link('responsavel/boletim.html')}">Voltar ao boletim</a></p>`;
    if (foco) main.querySelector(foco)?.focus();
  } catch { falhaDados(main, () => mostrar()); }
}

main.addEventListener('click', (e) => {
  const d = e.target.closest('[data-data]');
  if (d) { main.querySelector('#f-de').value = d.dataset.data; main.querySelector('#f-motivo').focus(); }
});
main.addEventListener('change', (e) => {
  if (e.target.id === 'f-estudanteId') { const est = filhos.find((f) => f.id === e.target.value); if (est) { main.querySelector('#form-justificativa').outerHTML = formulario(est); main.querySelector('#f-estudanteId').focus(); } }
});
main.addEventListener('submit', async (e) => {
  if (e.target.id !== 'form-justificativa') return;
  e.preventDefault();
  const f = e.target;
  const dados = lerFormulario(f);
  const arq = f.querySelector('#f-anexo').files[0] || null;
  const errosExtra = {};
  if (arq && !EXTENSOES.test(arq.name)) errosExtra.anexo = 'Este tipo de arquivo não é aceito. Use PDF ou foto (PNG ou JPG).';
  else if (arq && arq.size > LIMITE_MB * 1048576) errosExtra.anexo = `O arquivo passa de ${LIMITE_MB} MB. Envie um menor.`;
  const { erros } = validarJustificativa(dados, { hoje, estudantesDoResponsavel: filhos.map((x) => x.id), existentes: pedidos, anexo: arq && !errosExtra.anexo ? { nome: arq.name, tamanho: arq.size } : null });
  const todos = { ...erros, ...errosExtra };
  if (!mostrarErros(f, todos)) return;
  const est = filhos.find((x) => x.id === dados.estudanteId);
  try {
    await comEspera(e.submitter, async () => {
      const protocolo = await novoProtocolo('JUS');
      const atuais = await conjunto('justificativas');
      await salvar('justificativas', [montarJustificativa(dados, { protocolo, estudante: est, hoje, anexo: arq ? { nome: arq.name, tamanho: arq.size } : null, agora: new Date().toISOString() }), ...atuais]);
      await registrarAcao(sessao()?.nome || 'Responsável', 'Enviou justificativa de falta', `${est.nome} · ${dados.de}`);
    });
    await mostrar('h1');
    avisar('Justificativa enviada. A secretaria vai analisar.');
  } catch { f.querySelector('#f-geral-erro').textContent = 'Não foi possível enviar agora. Os dados continuam no formulário: tente de novo.'; }
});
mostrar();
