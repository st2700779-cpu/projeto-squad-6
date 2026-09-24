import { iniciar, link, falhaDados } from '../app.js';
import { esc, etiqueta } from '../ui.js';
import { carregar } from '../dados.js';

const main = await iniciar({ perfil: 'professor', pagina: 'professor/index.html', assistente: true });
async function mostrar() {
  try {
    const [prof, escolas] = await Promise.all([carregar('professor'), carregar('escolas')]);
    const usadas = prof.turmas.reduce((s, t) => s + t.aulasSemana, 0);
    main.innerHTML = `
      <h1>Minhas turmas</h1>
      <div class="cartao">
        <div class="d-flex justify-content-between flex-wrap gap-2"><div><strong style="font-size:1.15rem">${esc(prof.nome)}</strong><br><span class="texto-suave">Concurso: ${esc(prof.concurso)} · Formação: ${esc(prof.formacao)}</span></div>${etiqueta('Habilitada: ' + prof.habilitacao.join(', '), 'ok')}</div>
        <p class="texto-suave" style="font-size:.92rem;margin:.6rem 0">Pela regra de habilitação, só há alocação em componentes compatíveis com o cargo do concurso e com a formação.</p>
        <div class="d-flex justify-content-between"><strong>Carga horária semanal</strong><span>${usadas}h de ${prof.cargaHorariaSemanal}h</span></div>
        <div class="barra" role="img" aria-label="${usadas} de ${prof.cargaHorariaSemanal} horas alocadas"><span style="width:${(usadas / prof.cargaHorariaSemanal) * 100}%"></span></div>
      </div>
      <div class="tabela-rolagem"><table class="tabela"><caption class="sr-only">Turmas da professora</caption>
        <thead><tr><th scope="col">Turma</th><th scope="col">Escola</th><th scope="col">Componente</th><th scope="col">Aulas por semana</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
        <tbody>${prof.turmas.map((t) => `<tr><td><strong>${esc(t.nome)}</strong></td><td>${esc(escolas.find((e) => e.id === t.escolaId).nome)}</td><td>${esc(t.componente)}</td><td>${t.aulasSemana}</td><td>${prof.diario[t.id] ? `<a class="botao botao-secundario" href="${link('professor/diario.html')}?turma=${t.id}">Abrir diário</a>` : '<span class="texto-suave">Diário ainda não aberto</span>'}</td></tr>`).join('')}</tbody>
      </table></div>`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
