// Plano de aula: modelo com tema, data, objetivos, habilidades da BNCC (pelo código), atividades, recursos e avaliação.
// O protótipo confere o formato do código e se ele combina com o ano da turma. A lista tem "Imprimir" por plano.
import { iniciar, falhaDados } from '../app.js';
import { esc, avisar, confirmar, dataBR, vazio, comEspera, plural, icone } from '../ui.js';
import { carregar, turmasEscola, conjunto, salvar, registrarAcao, dataDeReferencia } from '../dados.js';
import { turmasDoProfessor } from '../regras.js';
import { campo, lerFormulario, mostrarErros } from '../componentes/formulario.js';
import { validarPlano, montarPlano, EXEMPLOS_DE_CODIGOS, PLANO } from '../dominio/plano-aula.js';

const main = await iniciar({ perfil: 'professor', pagina: 'professor/plano-aula.html', assistente: true });
let prof, minhas, planos, hoje, editando = null, rascunho = {};

const chaveTurma = (m) => `${m.turma.id}|${m.componente}`;
const area = (id, rotulo, valor, { obrigatorio = false, dica = '', max = 800, linhas = 3 } = {}) => `<div class="campo"><label for="f-${id}">${rotulo}${obrigatorio ? ' <span class="obrigatorio" aria-hidden="true">*</span>' : ' <span class="dica">(opcional)</span>'}</label><textarea id="f-${id}" name="${id}" class="entrada" rows="${linhas}" maxlength="${max}" aria-describedby="${dica ? `f-${id}-dica ` : ''}f-${id}-erro">${esc(valor)}</textarea>${dica ? `<span class="dica" id="f-${id}-dica">${esc(dica)}</span>` : ''}<p class="erro" id="f-${id}-erro" role="alert"></p></div>`;

function formulario() {
  const r = editando ? planos.find((x) => x.id === editando) : null;
  const v = { turma: r ? `${r.turmaId}|${r.componente}` : rascunho.turma || chaveTurma(minhas[0]), tema: r?.tema ?? rascunho.tema ?? '', data: r?.data || rascunho.data || hoje, aulas: String(r?.aulas || rascunho.aulas || 2), habilidades: r ? r.habilidades.join(', ') : rascunho.habilidades ?? '', objetivos: r?.objetivos ?? rascunho.objetivos ?? '', atividades: r?.atividades ?? rascunho.atividades ?? '', recursos: r?.recursos ?? rascunho.recursos ?? '', avaliacao: r?.avaliacao ?? rascunho.avaliacao ?? '' };
  return `<form id="form-plano" class="form-cadastro" novalidate>
    <h2 class="esp-t-0">${r ? 'Editar plano' : 'Novo plano de aula'}</h2>
    ${campo({ nome: 'turma', rotulo: 'Turma e componente', valor: v.turma, opcoes: minhas.map((m) => [chaveTurma(m), `${m.turma.nome} · ${m.componente}`]), obrigatorio: true })}
    ${campo({ nome: 'tema', rotulo: 'Tema da aula', valor: v.tema, obrigatorio: true, atributos: 'maxlength="90" autocomplete="off"' })}
    <div class="grade-2">
      ${campo({ nome: 'data', rotulo: 'Data prevista', tipo: 'date', valor: v.data, obrigatorio: true })}
      ${campo({ nome: 'aulas', rotulo: 'Quantas aulas', tipo: 'number', valor: v.aulas, obrigatorio: true, atributos: `min="1" max="${PLANO.aulasMax}" inputmode="numeric"` })}
    </div>
    ${campo({ nome: 'habilidades', rotulo: 'Habilidades da BNCC (códigos)', valor: v.habilidades, obrigatorio: true, dica: 'Separe por vírgula. Exemplo: EF06MA01, EF06MA02. A leitura do código: EF06MA01 = Ensino Fundamental, 6º ano, Matemática, habilidade 01. Confira o texto da habilidade na BNCC.', atributos: 'autocomplete="off" autocapitalize="characters" spellcheck="false"' })}
    <p class="texto-pequeno esp-b-2" id="exemplos-codigos">Exemplos de Matemática: ${EXEMPLOS_DE_CODIGOS.map(([c, t]) => `<button type="button" class="botao botao-secundario botao-mini" data-codigo="${c}" title="${esc(t)}" aria-label="Acrescentar ${c}: ${esc(t)}">${c}</button>`).join(' ')}</p>
    ${area('objetivos', 'Objetivos de aprendizagem', v.objetivos, { obrigatorio: true, dica: 'O que o estudante deve ser capaz de fazer ao fim da aula.' })}
    ${area('atividades', 'Atividades e metodologia', v.atividades, { obrigatorio: true, dica: 'Como a aula acontece, passo a passo.', linhas: 4 })}
    ${area('recursos', 'Recursos', v.recursos, { max: 400, linhas: 2 })}
    ${area('avaliacao', 'Como avaliar', v.avaliacao, { max: 400, linhas: 2 })}
    <p class="erro" id="f-geral-erro" role="alert"></p>
    <div class="linha-botoes"><button type="submit" class="botao">${r ? 'Salvar alterações' : 'Salvar plano'}</button>${r ? '<button type="button" class="botao botao-texto" data-acao="cancelar">Cancelar edição</button>' : ''}</div>
  </form>`;
}

function cartao(p) {
  return `<article class="cartao-plano" data-plano="${esc(p.id)}" aria-labelledby="pl-${esc(p.id)}">
    <h3 id="pl-${esc(p.id)}" class="esp-t-0">${esc(p.tema)}</h3>
    <p class="texto-suave texto-pequeno esp-t-0">${esc(p.turma)} · ${esc(p.componente)} · ${dataBR(p.data)} · ${p.aulas} ${plural(p.aulas, 'aula', 'aulas')}</p>
    <p class="esp-b-1"><strong>Habilidades:</strong> ${p.habilidades.map((c) => `<span class="codigo-bncc">${esc(c)}</span>`).join(' ')}</p>
    <p class="esp-b-1"><strong>Objetivos:</strong> ${esc(p.objetivos)}</p>
    <p class="esp-b-1"><strong>Atividades:</strong> ${esc(p.atividades)}</p>
    ${p.recursos ? `<p class="esp-b-1"><strong>Recursos:</strong> ${esc(p.recursos)}</p>` : ''}${p.avaliacao ? `<p class="esp-b-1"><strong>Avaliação:</strong> ${esc(p.avaliacao)}</p>` : ''}
    <div class="linha-botoes nao-imprimir"><button type="button" class="botao botao-secundario botao-mini" data-imprimir="${esc(p.id)}">${icone('imprimir', 18)}Imprimir</button><button type="button" class="botao botao-secundario botao-mini" data-editar="${esc(p.id)}" aria-label="Editar o plano ${esc(p.tema)}">Editar</button><button type="button" class="botao botao-texto botao-mini" data-remover="${esc(p.id)}" aria-label="Remover o plano ${esc(p.tema)}">Remover</button></div>
  </article>`;
}
function lista() {
  const meus = planos.filter((p) => p.professorId === prof.id).sort((a, b) => b.data.localeCompare(a.data));
  if (!meus.length) return vazio('Nenhum plano de aula', 'Os planos que você salvar aparecem aqui, do mais recente ao mais antigo.');
  return `<div class="lista-planos">${meus.map(cartao).join('')}</div><p class="contagem">${meus.length} ${plural(meus.length, 'plano', 'planos')}</p>`;
}
function desenhar(foco = '') {
  main.innerHTML = `<h1 tabindex="-1">Plano de aula</h1>
    <p class="pagina-descricao">Planeje a aula com os objetivos e as habilidades da BNCC. A coordenação consulta os planos.</p>
    ${minhas.length ? `${formulario()}<h2>Meus planos</h2>${lista()}` : vazio('Nenhuma turma alocada', 'Quando a coordenação alocar você em uma turma, dá para planejar as aulas.')}`;
  if (foco) main.querySelector(foco)?.focus();
}
async function mostrar() {
  try {
    const [logado, professores, turmas, alocacoes, matrizes, ps, dia] = await Promise.all([carregar('professor'), carregar('professores'), turmasEscola(), conjunto('alocacoes'), carregar('matrizes'), conjunto('planos-aula'), dataDeReferencia()]);
    prof = professores.find((p) => p.id === logado.professorId);
    minhas = turmasDoProfessor(prof.id, { alocacoes, turmas, matriz: matrizes });
    planos = ps; hoje = dia;
    desenhar();
  } catch { falhaDados(main, mostrar); }
}

main.addEventListener('change', (e) => {
  if (e.target.id !== 'f-turma' || editando) return;
  rascunho = lerFormulario(main.querySelector('#form-plano'));
  desenhar('#f-turma');
});
main.addEventListener('click', async (e) => {
  const cod = e.target.closest('[data-codigo]');
  if (cod) {
    const campoH = main.querySelector('#f-habilidades');
    const atuais = campoH.value.split(/[\s,;]+/).filter(Boolean);
    if (!atuais.includes(cod.dataset.codigo)) campoH.value = [...atuais, cod.dataset.codigo].join(', ');
    campoH.focus(); return;
  }
  const ed = e.target.closest('[data-editar]');
  if (ed) { editando = ed.dataset.editar; desenhar('#f-tema'); main.querySelector('#form-plano').scrollIntoView({ block: 'nearest' }); return; }
  if (e.target.closest('[data-acao="cancelar"]')) { editando = null; desenhar('h1'); return; }
  const imp = e.target.closest('[data-imprimir]');
  if (imp) {
    const cartaoAlvo = main.querySelector(`[data-plano="${CSS.escape(imp.dataset.imprimir)}"]`);
    main.dataset.imprimindo = '1'; cartaoAlvo.classList.add('plano-para-imprimir');
    const limpar = () => { delete main.dataset.imprimindo; cartaoAlvo.classList.remove('plano-para-imprimir'); removeEventListener('afterprint', limpar); };
    addEventListener('afterprint', limpar); window.print(); return;
  }
  const rem = e.target.closest('[data-remover]');
  if (rem) {
    const p = planos.find((x) => x.id === rem.dataset.remover);
    if (!p || !(await confirmar({ titulo: 'Remover este plano de aula?', texto: `${p.tema} · ${p.turma}. O plano some da sua lista e da consulta da coordenação.`, botao: 'Remover', perigo: true }))) return;
    try {
      planos = (await conjunto('planos-aula')).filter((x) => x.id !== p.id);
      await salvar('planos-aula', planos);
      await registrarAcao(prof.nome, 'Removeu plano de aula', `${p.turma} · ${p.tema}`);
      if (editando === p.id) editando = null;
      desenhar('h1'); avisar('Plano removido.');
    } catch { avisar('Não foi possível remover. Tente de novo.'); }
  }
});
main.addEventListener('submit', async (e) => {
  if (e.target.id !== 'form-plano') return;
  e.preventDefault();
  const f = e.target;
  const dados = lerFormulario(f);
  const r = editando ? planos.find((x) => x.id === editando) : null;
  const { ok, erros } = validarPlano(dados, { minhasTurmas: minhas.map((m) => m.turma), hoje });
  if (!mostrarErros(f, erros) || !ok) return;
  const turmaNome = minhas.find((m) => m.turma.id === dados.turma.split('|')[0]).turma.nome;
  try {
    await comEspera(e.submitter, async () => {
      const atuais = await conjunto('planos-aula');
      const novo = montarPlano(dados, { id: r?.id || `PL-${Date.now().toString(36)}`, professorId: prof.id, turmaNome, agora: new Date().toISOString() });
      planos = r ? atuais.map((x) => (x.id === r.id ? novo : x)) : [novo, ...atuais];
      await salvar('planos-aula', planos);
      await registrarAcao(prof.nome, r ? 'Editou plano de aula' : 'Criou plano de aula', `${turmaNome} · ${novo.tema}`);
    });
    editando = null; rascunho = {};
    desenhar('h1'); avisar(r ? 'Plano atualizado.' : 'Plano salvo.');
  } catch { f.querySelector('#f-geral-erro').textContent = 'Não foi possível salvar agora. Os dados continuam no formulário: tente de novo.'; }
});
mostrar();
