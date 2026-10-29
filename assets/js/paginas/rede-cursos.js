// Cursos da rede: o que as escolas podem oferecer em cada nível (regular, tempo integral, técnico integrado, EJA...).
// O curso escolhido no cadastro da escola fica no ato autorizativo daquele nível. A SEED central cadastra e desativa;
// o técnico de uma DRE consulta. As regras ficam em dominio/cadastros.js (validarCurso, podeDesativarCurso).
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, icone, avisar, vazio, comEspera, confirmar, plural } from '../ui.js';
import { carregar, conjunto, salvar, registrarAcao, dataDeReferencia } from '../dados.js';
import { ETAPAS, MODALIDADES, validarCurso, montarCurso, podeDesativarCurso } from '../dominio/cadastros.js';
import { campo, lerFormulario, mostrarErros } from '../componentes/formulario.js';
import { ehSeedCentral, daMinhaDre, avisoDeAcesso } from '../dre.js';

const main = await iniciar({ perfil: 'rede', pagina: 'rede/cursos.html', assistente: true });
let cursos, atos, escolas, hoje, aberto = false, nivel = '';
const podeEditar = ehSeedCentral();

async function mostrar() {
  try { [cursos, atos, escolas, hoje] = await Promise.all([conjunto('cursos'), carregar('atos'), carregar('escolas'), dataDeReferencia()]); desenhar(); } catch { falhaDados(main, mostrar); }
}
const curto = (etapa) => ETAPAS.find((t) => t.etapa === etapa)?.curto || etapa;
/** Escolas (da DRE da conta, ou todas para a SEED) cujo ato usa o curso. */
const escolasDoCurso = (c) => [...new Set(atos.filter((a) => a.curso === c.nome).map((a) => a.escolaId))].map((id) => escolas.find((e) => e.id === id)).filter((e) => e && daMinhaDre(e));

function tabela() {
  const lista = cursos.filter((c) => !nivel || c.etapa === nivel)
    .sort((a, b) => (b.ativo !== false) - (a.ativo !== false) || ETAPAS.findIndex((t) => t.etapa === a.etapa) - ETAPAS.findIndex((t) => t.etapa === b.etapa) || a.nome.localeCompare(b.nome, 'pt-BR'));
  if (!lista.length) return vazio('Nenhum curso neste nível', 'Escolha outro nível ou cadastre um curso.');
  return `<div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Cursos da rede</caption>
    <thead><tr><th scope="col">Curso</th><th scope="col">Nível</th><th scope="col">Modalidade</th><th scope="col">Escolas que oferecem</th><th scope="col">Situação</th>${podeEditar ? '<th scope="col"><span class="sr-only">Ações</span></th>' : ''}</tr></thead>
    <tbody>${lista.map((c) => { const es = escolasDoCurso(c); return `<tr><td class="titulo-linha"><strong>${esc(c.nome)}</strong>${c.descricao ? `<br><span class="texto-suave texto-pequeno">${esc(c.descricao)}</span>` : ''}</td>
      <td data-rotulo="Nível">${esc(curto(c.etapa))}</td>
      <td data-rotulo="Modalidade">${esc(c.modalidade)}</td>
      <td data-rotulo="Escolas"><div>${es.length ? `${es.length} ${plural(es.length, 'escola', 'escolas')}<br><span class="texto-suave texto-pequeno">${esc(es.map((e) => e.nome).join('; '))}</span>` : '<span class="texto-suave">nenhuma ainda</span>'}</div></td>
      <td data-rotulo="Situação">${c.ativo === false ? etiqueta('Desativado', 'neutra') : etiqueta('Ativo', 'ok')}</td>
      ${podeEditar ? `<td class="acoes"><button type="button" class="botao botao-secundario botao-mini" data-alternar="${esc(c.id)}">${c.ativo === false ? 'Reativar' : 'Desativar'}</button></td>` : ''}</tr>`; }).join('')}</tbody></table></div>
    <p class="contagem">${lista.filter((c) => c.ativo !== false).length} ${plural(lista.filter((c) => c.ativo !== false).length, 'curso ativo', 'cursos ativos')} · ${lista.length} no total</p>`;
}
function formulario() {
  return `<form id="form-curso" class="form-cadastro" novalidate ${aberto ? '' : 'hidden'} aria-labelledby="cu-titulo">
    <h2 id="cu-titulo">Cadastrar curso</h2>
    <p class="texto-suave esp-t-0">Campos com <span class="obrigatorio" aria-hidden="true">*</span> são obrigatórios. Depois de cadastrado, o curso aparece para escolha no cadastro de escola, no nível dele.</p>
    <fieldset class="form-bloco"><legend>Dados do curso</legend>
      <div class="largo">${campo({ nome: 'nome', rotulo: 'Nome do curso', obrigatorio: true, dica: 'Exemplo: Ensino Médio Integrado — Técnico em Agropecuária', atributos: 'maxlength="120" autocomplete="off"' })}</div>
      ${campo({ nome: 'etapa', rotulo: 'Nível de ensino', obrigatorio: true, opcoes: [['', 'Escolha o nível'], ...ETAPAS.map((t) => [t.etapa, `${t.curto} (${t.resumo})`])] })}
      ${campo({ nome: 'modalidade', rotulo: 'Modalidade', obrigatorio: true, opcoes: [['', 'Escolha a modalidade'], ...MODALIDADES.map((m) => [m, m])] })}
      <div class="largo">${campo({ nome: 'descricao', rotulo: 'Descrição', dica: 'Opcional, até 300 letras', atributos: 'maxlength="300" autocomplete="off"' })}</div>
    </fieldset>
    <div class="form-acoes"><button type="submit" class="botao">${icone('ok', 20)}Cadastrar curso</button><button type="button" class="botao botao-secundario" id="cancelar-curso">Cancelar</button></div></form>`;
}
function desenhar() {
  const ativos = cursos.filter((c) => c.ativo !== false);
  main.innerHTML = `
    <div class="cabecalho-pagina"><h1>Cursos</h1></div>
    <p class="pagina-descricao">Cursos que as escolas podem oferecer em cada nível de ensino. O curso escolhido no cadastro da escola aparece no ato autorizativo daquele nível.</p>
    ${avisoDeAcesso()}
    ${podeEditar ? '' : '<p class="alerta-info" role="note"><span>O cadastro de cursos vale para a rede inteira e é feito pela equipe da SEED. Aqui você consulta os cursos e as escolas da sua regional que oferecem cada um.</span></p>'}
    <dl class="resumo-linha">
      <div><dd>${ativos.length}</dd><dt>${plural(ativos.length, 'curso ativo', 'cursos ativos')}</dt></div>
      ${ETAPAS.map((t) => `<div><dd>${ativos.filter((c) => c.etapa === t.etapa).length}</dd><dt>${esc(t.curto)}</dt></div>`).join('')}
    </dl>
    <div class="ferramentas-tabela">
      <div class="campo"><label for="filtro-nivel">Nível</label><select id="filtro-nivel" class="entrada"><option value="">Todos os níveis</option>${ETAPAS.map((t) => `<option value="${esc(t.etapa)}" ${t.etapa === nivel ? 'selected' : ''}>${esc(t.curto)}</option>`).join('')}</select></div>
      ${podeEditar ? `<button type="button" class="botao" id="novo-curso">${icone('mais', 20)}Cadastrar curso</button>` : ''}
    </div>
    ${podeEditar ? formulario() : ''}
    <div id="tabela-cursos">${tabela()}</div>`;
}

main.addEventListener('change', (e) => { if (e.target.id === 'filtro-nivel') { nivel = e.target.value; main.querySelector('#tabela-cursos').innerHTML = tabela(); } });
main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b || !podeEditar) return;
  if (b.id === 'novo-curso') { aberto = true; desenhar(); const f = main.querySelector('#form-curso'); f.querySelector('input').focus(); f.scrollIntoView({ block: 'start' }); }
  if (b.id === 'cancelar-curso') { aberto = false; desenhar(); main.querySelector('#novo-curso').focus(); }
  if (b.dataset.alternar) {
    const c = cursos.find((x) => x.id === b.dataset.alternar);
    if (c.ativo !== false) {
      const r = podeDesativarCurso(c, atos);
      if (!r.ok) { avisar(r.motivo, 'erro'); return; }
      if (!(await confirmar({ titulo: 'Desativar este curso?', texto: `${c.nome} deixa de aparecer no cadastro de escola. Dá para reativar depois.`, botao: 'Desativar', perigo: true }))) return;
    }
    try {
      c.ativo = c.ativo === false;
      await salvar('cursos', cursos);
      await registrarAcao(sessao().nome, c.ativo ? 'Reativou o curso' : 'Desativou o curso', c.nome);
      desenhar(); avisar(c.ativo ? 'Curso reativado.' : 'Curso desativado.');
    } catch { avisar('Não foi possível salvar a mudança. Confira a conexão e tente de novo.'); mostrar(); }
  }
});
main.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (e.target.id !== 'form-curso' || !podeEditar) return;
  const dados = lerFormulario(e.target);
  if (!mostrarErros(e.target, validarCurso(dados, { cursos }).erros)) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
  try {
    await comEspera(e.submitter, async () => {
      const novo = montarCurso(dados, { cursos, hoje });
      await salvar('cursos', [...cursos, novo]);
      await registrarAcao(sessao().nome, 'Cadastrou o curso', novo.nome);
    });
    aberto = false; await mostrar(); avisar('Curso cadastrado. Ele já aparece no cadastro de escola.');
  } catch { avisar('Não foi possível cadastrar o curso. Confira a conexão e tente de novo.'); }
});
mostrar();
