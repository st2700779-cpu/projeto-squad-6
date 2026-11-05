// Turmas na secretaria: só consulta. Desde a rodada 4, quem cria as turmas e diz quantas vagas cada uma tem é a direção
// (Direção › Turmas, com série, turno e sala de Direção › Estrutura da escola). A secretaria coloca os estudantes nas turmas
// aprovadas em Enturmação. A página continua existindo para quem guardou o endereço antigo.
import { iniciar, falhaDados, link } from '../app.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, icone, vazio, plural } from '../ui.js';
import { turmasEscola, conjunto } from '../dados.js';
import { codigoDaTurma } from '../regras.js';
import { ordemDaSerie } from '../dominio/niveis.js';
import { ocupadosDaTurma } from '../dominio/estrutura.js';

const main = await iniciar({ perfil: 'escola', pagina: 'escola/turmas.html', assistente: true, titulo: 'Turmas' });
const escolaId = sessao()?.escolaId || 'e1';

async function mostrar() {
  try {
    const [todas, enturmacao] = await Promise.all([turmasEscola(), conjunto('enturmacao')]);
    const turmas = todas.filter((t) => t.escolaId === escolaId && t.situacao === 'Aprovada').sort((a, b) => ordemDaSerie(a.serie) - ordemDaSerie(b.serie) || a.nome.localeCompare(b.nome, 'pt-BR'));
    main.innerHTML = `
      <h1>Turmas</h1>
      <p class="alerta-info">${icone('info', 20)}<span>As turmas e as vagas agora são criadas pela <strong>direção</strong> da escola (Direção › Turmas). Aqui a secretaria só consulta as turmas aprovadas. Para colocar estudantes nas turmas, use <a href="${link('escola/enturmacao.html')}">Enturmação</a>.</span></p>
      ${turmas.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Turmas aprovadas da escola</caption>
        <thead><tr><th scope="col">Turma</th><th scope="col">Série</th><th scope="col">Turno</th><th scope="col">Sala</th><th scope="col">Estudantes e vagas</th></tr></thead>
        <tbody>${turmas.map((t) => { const oc = ocupadosDaTurma(t, enturmacao); return `<tr><td class="titulo-linha"><strong>${esc(t.nome)}</strong><small>${esc(codigoDaTurma(t))}</small></td><td data-rotulo="Série">${esc(t.serie)}</td><td data-rotulo="Turno">${esc(t.turno)}</td><td data-rotulo="Sala">${esc(t.sala || '—')}</td><td data-rotulo="Estudantes e vagas"><div>${oc} de ${t.capacidade || 0} ${oc >= (t.capacidade || 0) ? etiqueta('Cheia', 'atencao') : ''}</div></td></tr>`; }).join('')}</tbody></table></div>
        <p class="contagem">${turmas.length} ${plural(turmas.length, 'turma aprovada', 'turmas aprovadas')}</p>` : vazio('Nenhuma turma aprovada', 'Quando a direção criar as turmas, elas aparecem aqui.')}`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
