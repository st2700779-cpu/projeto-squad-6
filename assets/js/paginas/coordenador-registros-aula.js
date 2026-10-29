// Registros de aula (coordenação): consulta, só leitura, do conteúdo que os professores anotaram, por turma.
import { iniciar, falhaDados } from '../app.js';
import { esc, dataBR, vazio, plural } from '../ui.js';
import { carregar, turmasEscola, conjunto, dataDeReferencia } from '../dados.js';
import { campo } from '../componentes/formulario.js';
import { semaforo } from '../componentes/indicadores.js';
import { situacaoDosRegistros, turmasSemRegistro, LIMITE_SEM_REGISTRO_DIAS } from '../dominio/vida-escolar.js';

const main = await iniciar({ perfil: 'coordenador', pagina: 'coordenador/registros-aula.html', assistente: true });
let turmas, professores, registros, planos, hoje, filtro = '';

const nomeProf = (id) => professores.find((p) => p.id === id)?.nome || id;
function desenhar(foco = '') {
  const daEscola = registros.filter((r) => turmas.some((t) => t.id === r.turmaId));
  const lista = daEscola.filter((r) => !filtro || r.turmaId === filtro).sort((a, b) => b.data.localeCompare(a.data) || a.turma.localeCompare(b.turma));
  const comRegistro = new Set(daEscola.map((r) => r.turmaId)).size;
  const atrasadas = turmasSemRegistro(turmas, daEscola, hoje);
  const planosLista = planos.filter((p) => turmas.some((t) => t.id === p.turmaId) && (!filtro || p.turmaId === filtro)).sort((a, b) => b.data.localeCompare(a.data));
  main.innerHTML = `<h1 tabindex="-1">Registros de aula</h1>
    <p class="pagina-descricao">O que os professores anotaram em cada aula. Só consulta: o registro é feito por quem deu a aula.</p>
    <dl class="resumo-linha">
      <div><dd>${daEscola.length}</dd><dt>${plural(daEscola.length, 'aula registrada', 'aulas registradas')}</dt></div>
      <div class="${comRegistro < turmas.length ? 'atencao' : ''}"><dd>${comRegistro} de ${turmas.length}</dd><dt>turmas com algum registro</dt></div>
      <div class="${atrasadas.length ? 'alerta' : ''}"><dd>${atrasadas.length}</dd><dt>${plural(atrasadas.length, 'turma', 'turmas')} sem registro há mais de ${LIMITE_SEM_REGISTRO_DIAS} dias</dt></div>
    </dl>
    <h2>Situação de cada turma</h2>
    <div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Último registro de aula de cada turma</caption>
      <thead><tr><th scope="col">Turma</th><th scope="col">Último registro</th><th scope="col">Situação</th></tr></thead>
      <tbody>${turmas.map((t) => ({ t, s: situacaoDosRegistros(t.id, daEscola, hoje) })).sort((a, b) => (b.s.dias ?? Infinity) - (a.s.dias ?? Infinity)).map(({ t, s }) => `<tr><td class="titulo-linha"><strong>${esc(t.nome)}</strong></td><td data-rotulo="Último registro"><div>${s.ultimo ? dataBR(s.ultimo) : '—'}</div></td><td data-rotulo="Situação"><div>${semaforo(s)}</div></td></tr>`).join('')}</tbody></table></div>
    <h2>Registros</h2>
    ${campo({ nome: 'turma', rotulo: 'Turma', valor: filtro, opcoes: [['', 'Todas as turmas'], ...turmas.map((t) => [t.id, t.nome])] })}
    ${lista.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Registros de aula</caption>
      <thead><tr><th scope="col">Data</th><th scope="col">Turma</th><th scope="col">Professor</th><th scope="col" class="num">Aulas</th><th scope="col">Conteúdo</th></tr></thead>
      <tbody>${lista.map((r) => `<tr><td class="titulo-linha"><strong>${dataBR(r.data)}</strong></td><td data-rotulo="Turma"><div>${esc(r.turma)}<small>${esc(r.componente)}</small></div></td><td data-rotulo="Professor"><div>${esc(nomeProf(r.professorId))}</div></td><td class="num" data-rotulo="Aulas"><div>${r.aulas}</div></td><td data-rotulo="Conteúdo"><div>${esc(r.conteudo)}${r.tarefa ? `<small>Tarefa: ${esc(r.tarefa)}</small>` : ''}</div></td></tr>`).join('')}</tbody></table></div>
      <p class="contagem">${lista.length} ${plural(lista.length, 'registro', 'registros')}</p>`
    : vazio('Nenhum registro de aula', filtro ? 'Esta turma ainda não tem aula registrada.' : 'Quando os professores registrarem as aulas, elas aparecem aqui.')}
    <h2>Planos de aula</h2>
    ${planosLista.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Planos de aula</caption>
      <thead><tr><th scope="col">Data prevista</th><th scope="col">Turma</th><th scope="col">Professor</th><th scope="col">Tema</th><th scope="col">Habilidades da BNCC</th></tr></thead>
      <tbody>${planosLista.map((p) => `<tr><td class="titulo-linha"><strong>${dataBR(p.data)}</strong></td><td data-rotulo="Turma"><div>${esc(p.turma)}<small>${esc(p.componente)}</small></div></td><td data-rotulo="Professor"><div>${esc(nomeProf(p.professorId))}</div></td><td data-rotulo="Tema"><div>${esc(p.tema)}<small>${esc(p.objetivos)}</small></div></td><td data-rotulo="Habilidades"><div>${p.habilidades.map((c) => `<span class="codigo-bncc">${esc(c)}</span>`).join(' ')}</div></td></tr>`).join('')}</tbody></table></div>
      <p class="contagem">${planosLista.length} ${plural(planosLista.length, 'plano', 'planos')}</p>` : vazio('Nenhum plano de aula', 'Os planos feitos pelos professores aparecem aqui.')}`;
  if (foco) main.querySelector(foco)?.focus();
}
async function mostrar() {
  try { [turmas, professores, registros, planos, hoje] = await Promise.all([turmasEscola(), carregar('professores'), conjunto('registros-aula'), conjunto('planos-aula'), dataDeReferencia()]); desenhar(); } catch { falhaDados(main, mostrar); }
}
main.addEventListener('change', (e) => { if (e.target.id === 'f-turma') { filtro = e.target.value; desenhar('#f-turma'); } });
mostrar();
