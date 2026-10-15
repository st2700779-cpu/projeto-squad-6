// Registros de aula (coordenação): consulta, só leitura, do conteúdo que os professores anotaram, por turma.
import { iniciar, falhaDados } from '../app.js';
import { esc, dataBR, vazio, plural } from '../ui.js';
import { carregar, turmasEscola, conjunto } from '../dados.js';
import { campo } from '../componentes/formulario.js';

const main = await iniciar({ perfil: 'coordenador', pagina: 'coordenador/registros-aula.html', assistente: true });
let turmas, professores, registros, filtro = '';

const nomeProf = (id) => professores.find((p) => p.id === id)?.nome || id;
function desenhar(foco = '') {
  const daEscola = registros.filter((r) => turmas.some((t) => t.id === r.turmaId));
  const lista = daEscola.filter((r) => !filtro || r.turmaId === filtro).sort((a, b) => b.data.localeCompare(a.data) || a.turma.localeCompare(b.turma));
  const comRegistro = new Set(daEscola.map((r) => r.turmaId)).size;
  main.innerHTML = `<h1 tabindex="-1">Registros de aula</h1>
    <p class="pagina-descricao">O que os professores anotaram em cada aula. Só consulta: o registro é feito por quem deu a aula.</p>
    <dl class="resumo-linha">
      <div><dd>${daEscola.length}</dd><dt>${plural(daEscola.length, 'aula registrada', 'aulas registradas')}</dt></div>
      <div class="${comRegistro < turmas.length ? 'atencao' : ''}"><dd>${comRegistro} de ${turmas.length}</dd><dt>turmas com algum registro</dt></div>
    </dl>
    ${campo({ nome: 'turma', rotulo: 'Turma', valor: filtro, opcoes: [['', 'Todas as turmas'], ...turmas.map((t) => [t.id, t.nome])] })}
    ${lista.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Registros de aula</caption>
      <thead><tr><th scope="col">Data</th><th scope="col">Turma</th><th scope="col">Professor</th><th scope="col" class="num">Aulas</th><th scope="col">Conteúdo</th></tr></thead>
      <tbody>${lista.map((r) => `<tr><td class="titulo-linha"><strong>${dataBR(r.data)}</strong></td><td data-rotulo="Turma"><div>${esc(r.turma)}<small>${esc(r.componente)}</small></div></td><td data-rotulo="Professor"><div>${esc(nomeProf(r.professorId))}</div></td><td class="num" data-rotulo="Aulas"><div>${r.aulas}</div></td><td data-rotulo="Conteúdo"><div>${esc(r.conteudo)}${r.tarefa ? `<small>Tarefa: ${esc(r.tarefa)}</small>` : ''}</div></td></tr>`).join('')}</tbody></table></div>
      <p class="contagem">${lista.length} ${plural(lista.length, 'registro', 'registros')}</p>`
    : vazio('Nenhum registro de aula', filtro ? 'Esta turma ainda não tem aula registrada.' : 'Quando os professores registrarem as aulas, elas aparecem aqui.')}`;
  if (foco) main.querySelector(foco)?.focus();
}
async function mostrar() {
  try { [turmas, professores, registros] = await Promise.all([turmasEscola(), carregar('professores'), conjunto('registros-aula')]); desenhar(); } catch { falhaDados(main, mostrar); }
}
main.addEventListener('change', (e) => { if (e.target.id === 'f-turma') { filtro = e.target.value; desenhar('#f-turma'); } });
mostrar();
