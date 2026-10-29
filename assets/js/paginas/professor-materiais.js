// Materiais e planos de aula: o professor registra o material de cada turma. No protótipo só o nome e o tamanho do arquivo
// são guardados (não há armazenamento de arquivos); a lista fica na escola, por turma.
import { iniciar, falhaDados } from '../app.js';
import { esc, avisar, confirmar, vazio, dataBR, comEspera, icone } from '../ui.js';
import { carregar, turmasEscola, conjunto, salvar, registrarAcao, dataDeReferencia } from '../dados.js';
import { turmasDoProfessor } from '../regras.js';

const main = await iniciar({ perfil: 'professor', pagina: 'professor/materiais.html', assistente: true });
const TIPOS = ['Plano de aula', 'Material de apoio', 'Atividade'];
const LIMITE_MB = 10;
const EXTENSOES = /\.(pdf|docx?|pptx?|xlsx?|odt|png|jpe?g)$/i;
let prof, minhas, materiais;

const tamanho = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function formulario() {
  return `<form id="form-material" class="painel-inline" novalidate>
    <h2 class="esp-t-0">Novo material</h2>
    <div class="campo"><label for="m-turma">Turma e componente</label><select id="m-turma" class="entrada">${minhas.map((m) => `<option value="${m.turma.id}|${esc(m.componente)}">${esc(m.turma.nome)} — ${esc(m.componente)}</option>`).join('')}</select></div>
    <div class="campo"><label for="m-tipo">Tipo</label><select id="m-tipo" class="entrada">${TIPOS.map((t) => `<option>${t}</option>`).join('')}</select></div>
    <div class="campo"><label for="m-titulo">Título</label><input id="m-titulo" class="entrada" maxlength="90" autocomplete="off" aria-describedby="m-titulo-erro"><p class="erro" id="m-titulo-erro" role="alert"></p></div>
    <div class="campo"><label for="m-desc">Descrição <span class="dica">(opcional)</span></label><textarea id="m-desc" class="entrada" maxlength="400" rows="3"></textarea></div>
    <div class="campo"><label for="m-arquivo">Arquivo <span class="dica">(opcional · PDF, Word, PowerPoint, Excel ou imagem · até ${LIMITE_MB} MB)</span></label><input id="m-arquivo" class="entrada" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.png,.jpg,.jpeg" aria-describedby="m-arquivo-erro"><p class="erro" id="m-arquivo-erro" role="alert"></p></div>
    <p class="texto-suave texto-pequeno">Neste protótipo só o nome e o tamanho do arquivo ficam registrados.</p>
    <button type="submit" class="botao">${icone('caixa', 20)}Registrar material</button></form>`;
}
function lista() {
  const meus = materiais.filter((m) => m.professorId === prof.id);
  if (!meus.length) return vazio('Nenhum material registrado', 'Planos de aula e materiais que você registrar aparecem aqui, por turma.');
  return `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Materiais registrados pelo professor</caption>
    <thead><tr><th scope="col">Material</th><th scope="col">Turma</th><th scope="col">Tipo</th><th scope="col">Arquivo</th><th scope="col">Data</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
    <tbody>${meus.map((m) => `<tr><td class="titulo-linha"><strong>${esc(m.titulo)}</strong>${m.descricao ? `<br><small>${esc(m.descricao)}</small>` : ''}</td><td data-rotulo="Turma"><div>${esc(m.turma)} · ${esc(m.componente)}</div></td><td data-rotulo="Tipo"><div>${esc(m.tipo)}</div></td><td data-rotulo="Arquivo"><div>${m.arquivo ? `${esc(m.arquivo.nome)}<small>${tamanho(m.arquivo.tamanho)}</small>` : '<span class="texto-suave">sem arquivo</span>'}</div></td><td data-rotulo="Data"><div>${dataBR(m.data)}</div></td><td class="acoes"><button type="button" class="botao botao-secundario botao-mini" data-remover="${esc(m.id)}" aria-label="Remover ${esc(m.titulo)}">Remover</button></td></tr>`).join('')}</tbody></table></div>
    <p class="contagem">${meus.length} ${meus.length === 1 ? 'material' : 'materiais'}</p>`;
}
async function mostrar() {
  try {
    const [logado, professores, turmas, alocacoes, matrizes] = await Promise.all([carregar('professor'), carregar('professores'), turmasEscola(), conjunto('alocacoes'), carregar('matrizes')]);
    prof = professores.find((p) => p.id === logado.professorId);
    minhas = turmasDoProfessor(prof.id, { alocacoes, turmas, matriz: matrizes.versoes[0].componentes });
    materiais = await conjunto('materiais');
    main.innerHTML = `<h1>Materiais e planos de aula</h1>
      <p class="pagina-descricao">Registre o plano de aula ou o material de cada turma. A coordenação consulta a lista.</p>
      ${minhas.length ? `<div class="grade-2"><div>${formulario()}</div><div><h2 class="esp-t-0">Registrados</h2><div id="lista-materiais">${lista()}</div></div></div>` : vazio('Nenhuma turma alocada', 'Quando a coordenação alocar você em uma turma, dá para registrar materiais.')}`;
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('submit', async (e) => {
  e.preventDefault();
  const titulo = main.querySelector('#m-titulo'), arq = main.querySelector('#m-arquivo');
  const arquivo = arq.files[0];
  const erroT = titulo.value.trim().length < 3 ? 'Dê um título de pelo menos 3 letras.' : '';
  const erroA = arquivo && !EXTENSOES.test(arquivo.name) ? 'Este tipo de arquivo não é aceito. Use PDF, Word, PowerPoint, Excel ou imagem.' : arquivo && arquivo.size > LIMITE_MB * 1048576 ? `O arquivo passa de ${LIMITE_MB} MB. Envie um menor.` : '';
  main.querySelector('#m-titulo-erro').textContent = erroT; main.querySelector('#m-arquivo-erro').textContent = erroA;
  titulo.toggleAttribute('aria-invalid', Boolean(erroT)); arq.toggleAttribute('aria-invalid', Boolean(erroA));
  if (erroT) { titulo.focus(); return; }
  if (erroA) { arq.focus(); return; }
  const [turmaId, componente] = main.querySelector('#m-turma').value.split('|');
  const turma = minhas.find((m) => m.turma.id === turmaId).turma.nome;
  try {
    await comEspera(e.submitter, async () => {
      const lista = await conjunto('materiais');
      lista.unshift({ id: `MAT-${Date.now().toString(36)}`, professorId: prof.id, turmaId, turma, componente, tipo: main.querySelector('#m-tipo').value, titulo: titulo.value.trim(), descricao: main.querySelector('#m-desc').value.trim(), arquivo: arquivo ? { nome: arquivo.name, tamanho: arquivo.size } : null, data: await dataDeReferencia() });
      await salvar('materiais', lista);
      await registrarAcao(prof.nome, `Registrou ${main.querySelector('#m-tipo').value.toLowerCase()}`, turma);
    });
    avisar('Material registrado.');
    await mostrar();
    main.querySelector('#m-titulo')?.focus();
  } catch { avisar('Não foi possível registrar o material. Confira a conexão e tente de novo.'); }
});
main.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-remover]');
  if (!b) return;
  if (!(await confirmar({ titulo: 'Remover este material?', texto: 'Ele some da lista da turma. Não dá para desfazer.', botao: 'Remover', perigo: true }))) return;
  try {
    const lista = (await conjunto('materiais')).filter((m) => m.id !== b.dataset.remover);
    await salvar('materiais', lista);
    avisar('Material removido.');
    await mostrar();
  } catch { avisar('Não foi possível remover o material. Tente de novo.'); }
});
mostrar();
