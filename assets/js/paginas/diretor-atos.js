// Atos autorizativos da escola, vistos pela direção: validade, situação e quantas turmas e estudantes dependem de cada ato.
// A renovação é pedida pela rede (SEDUC/DRE); aqui a direção acompanha.
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, dataBR, dataHoraBR, vazio, plural } from '../ui.js';
import { carregar, conjunto, turmasDaRede } from '../dados.js';
import { situacaoAto, DIAS_RENOVACAO } from '../regras.js';
import { faixaDoAto, impactoDoAto } from '../dominio/impacto-atos.js';

const main = await iniciar({ perfil: 'diretor', pagina: 'diretor/atos.html', assistente: false });
async function mostrar() {
  try {
    const escolaId = sessao().escolaId;
    const [atos, renovacoes, turmas] = await Promise.all([carregar('atos'), conjunto('renovacoes'), turmasDaRede()]);
    const meus = atos.filter((a) => a.escolaId === escolaId).map((a) => ({ a, s: situacaoAto(a), impacto: impactoDoAto(a, turmas), r: renovacoes.find((x) => x.ato === `${a.escolaId}|${a.etapa}`) })).map((l) => ({ ...l, faixa: faixaDoAto(l.s.dias) })).sort((x, y) => x.s.dias - y.s.dias);
    main.innerHTML = `<h1>Atos autorizativos</h1>
      <p class="pagina-descricao">Sem ato vigente, a escola não pode abrir turma nem certificar estudantes da etapa. A renovação é pedida pela rede; aqui você acompanha.</p>
      ${meus.length ? `<div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Atos autorizativos da escola, do vencimento mais próximo ao mais distante</caption>
        <thead><tr><th scope="col">Etapa</th><th scope="col">Ato</th><th scope="col">Situação</th><th scope="col">Quem depende</th><th scope="col">Renovação</th></tr></thead>
        <tbody>${meus.map(({ a, s, faixa, impacto, r }) => `<tr><td class="titulo-linha">${esc(a.etapa)}</td><td data-rotulo="Ato"><div>${esc(a.tipo)}<small>${esc(a.numero)}</small></div></td><td data-rotulo="Situação"><div>${etiqueta(faixa.rotulo, faixa.tipo)}<small>${dataBR(a.validade)} · ${s.dias < 0 ? `venceu há ${-s.dias} ${plural(-s.dias, 'dia', 'dias')}` : `faltam ${s.dias} ${plural(s.dias, 'dia', 'dias')}`}</small></div></td><td data-rotulo="Quem depende"><div>${impacto.turmas ? `${impacto.turmas} ${plural(impacto.turmas, 'turma', 'turmas')}<small>${impacto.alunos} estudantes</small>` : '<span class="texto-suave">nenhuma turma</span>'}</div></td><td data-rotulo="Renovação"><div>${r ? `${etiqueta('Pedida pela rede', 'info')}<small>${dataHoraBR(r.quando)}</small>` : s.dias <= DIAS_RENOVACAO ? `${etiqueta('Ainda não pedida', 'atencao')}<small>Fale com a DRE</small>` : '<span class="texto-suave">—</span>'}</div></td></tr>`).join('')}</tbody></table></div>
        <p class="contagem">${meus.length} ${plural(meus.length, 'ato', 'atos')} · a renovação pode ser pedida a partir de ${DIAS_RENOVACAO} dias antes do vencimento</p>` : vazio('Nenhum ato cadastrado', 'Os atos autorizativos da escola aparecem aqui.')}`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
