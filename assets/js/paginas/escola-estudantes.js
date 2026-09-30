// Estudantes da escola com cadastro completo: lista e acesso à ficha.
import { iniciar, falhaDados, link } from '../app.js';
import { sessao } from '../auth.js';
import { esc, vazio } from '../ui.js';
import { carregar } from '../dados.js';
import { serieCompleta } from '../regras.js';

const main = await iniciar({ perfil: 'escola', pagina: 'escola/estudantes.html', assistente: true });
async function mostrar() {
  try {
    const escolaId = sessao()?.escolaId;
    const lista = (await carregar('estudantes')).filter((e) => !escolaId || e.escolaId === escolaId);
    main.innerHTML = `<h1>Estudantes</h1>
      ${lista.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Estudantes da escola</caption>
        <thead><tr><th scope="col">Estudante</th><th scope="col">Matrícula</th><th scope="col">Série e turma</th><th scope="col">Responsável</th><th scope="col">Ficha</th></tr></thead>
        <tbody>${lista.map((e) => `<tr><td class="titulo-linha"><strong>${esc(e.nome)}</strong></td><td data-rotulo="Matrícula">${esc(e.matricula)}</td><td data-rotulo="Série e turma">${esc(serieCompleta(e.serie))} · ${esc(e.turma)}</td><td data-rotulo="Responsável">${esc(e.responsavel)}</td><td class="acoes"><a class="botao botao-secundario botao-mini" href="${link('escola/estudante.html')}?id=${encodeURIComponent(e.id)}" aria-label="Abrir ficha de ${esc(e.nome)}">Abrir ficha</a></td></tr>`).join('')}</tbody></table></div>
        <p class="contagem">${lista.length} ${lista.length === 1 ? 'estudante' : 'estudantes'} com cadastro completo.</p>` : vazio('Nenhum estudante cadastrado', 'Os estudantes matriculados aparecem aqui depois da confirmação.')}`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
