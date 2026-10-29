// Estudantes da escola. A busca por nome ou código mostra, lado a lado e com rótulo, o "código do aluno" e o "código da matrícula",
// e diz qual dos dois a pessoa digitou. Abaixo, a lista dos cadastros completos.
import { iniciar, falhaDados, link } from '../app.js';
import { sessao } from '../auth.js';
import { esc, vazio, avisar, debounce, normalizar, icone, plural, etiqueta } from '../ui.js';
import { carregar, conjunto, diarioParaLeitura, turmasDaRede } from '../dados.js';
import { situacaoDoEstudante } from '../dominio/movimentacao.js';
import { serieCompleta, codigosDoEstudante, tipoDoCodigo, normalizarCodigo } from '../regras.js';

const main = await iniciar({ perfil: 'escola', pagina: 'escola/estudantes.html', assistente: true });
let todos = [], movs = [];
const selo = (id) => { const s = situacaoDoEstudante(id, movs); return s.chave === 'ativo' ? '' : ` ${etiqueta(s.texto, s.chave === 'cancelado' ? 'erro' : 'neutra')}`; };
const ROTULO = { aluno: 'código do aluno', matricula: 'código da matrícula' };

const parDeCodigos = (e, destaque) => { const c = e.codigos; return `<dl class="codigos-aluno">
  <div class="codigo-par"${destaque === 'aluno' ? ' style="border-width:3px"' : ''}><dt>Código do aluno${destaque === 'aluno' ? ' · o que você digitou' : ''}</dt><dd>${esc(c.aluno)}</dd><small>Identifica a pessoa na rede. Nunca muda.</small></div>
  <div class="codigo-par"${destaque === 'matricula' ? ' style="border-width:3px"' : ''}><dt>Código da matrícula${destaque === 'matricula' ? ' · o que você digitou' : ''}</dt><dd>${esc(c.matricula)}</dd><small>Identifica a matrícula deste ano, nesta escola.</small></div></dl>`; };

function resultados(q) {
  if (!q.trim()) return '';
  const tipo = tipoDoCodigo(q);
  const achados = tipo
    ? todos.filter((e) => (tipo === 'aluno' ? normalizarCodigo(e.codigos.aluno) : e.codigos.matricula) === normalizarCodigo(q))
    : todos.filter((e) => normalizar(e.nome).includes(normalizar(q.trim())));
  if (!achados.length) return `<div class="alerta-atencao" role="status">${icone('alerta', 20)}<span>${tipo ? `Nenhum estudante com este ${ROTULO[tipo]}. Confira o número.` : /\d/.test(q) ? 'Nenhum estudante com este número. O código do aluno começa com ALU- e tem 5 números; o código da matrícula tem 9 números.' : 'Nenhum estudante com este nome. Tente só o primeiro nome.'}</span></div>`;
  return `<p class="contagem" role="status">${achados.length} ${plural(achados.length, 'estudante encontrado', 'estudantes encontrados')}${tipo ? `. O número digitado é o <strong>${ROTULO[tipo]}</strong>.` : ''}</p>
    ${achados.slice(0, 20).map((e) => `<article class="ficha-resultado"><h3>${esc(e.nome)}${selo(e.id)}</h3><p class="texto-suave esp-t-0">${esc(e.serie ? `${serieCompleta(e.serie)} · ` : '')}${esc(e.turma)}</p>${parDeCodigos(e, tipo)}
      <div class="linha-botoes"><button type="button" class="botao botao-secundario botao-mini" data-copiar="${esc(e.codigos.aluno)}" data-rotulo="código do aluno">Copiar código do aluno</button><button type="button" class="botao botao-secundario botao-mini" data-copiar="${esc(e.codigos.matricula)}" data-rotulo="código da matrícula">Copiar código da matrícula</button>${e.completo ? `<a class="botao botao-secundario botao-mini" href="${link('escola/estudante.html')}?id=${encodeURIComponent(e.id)}">Abrir ficha</a>` : '<span class="texto-suave texto-pequeno">Cadastro resumido: vem do diário da turma</span>'}</div></article>`).join('')}
    ${achados.length > 20 ? '<p class="texto-suave">Mostrando os 20 primeiros. Digite mais letras do nome para filtrar.</p>' : ''}`;
}

async function mostrar() {
  try {
    const escolaId = sessao()?.escolaId;
    const [estudantes, dia, turmas, movimentos] = await Promise.all([carregar('estudantes'), diarioParaLeitura(), turmasDaRede(), conjunto('movimentacoes')]);
    movs = movimentos;
    const completos = estudantes.filter((e) => !escolaId || e.escolaId === escolaId).map((e) => ({ ...e, completo: true, codigos: codigosDoEstudante(e) }));
    const ids = new Set(completos.map((e) => e.id));
    const doDiario = turmas.filter((t) => t.escolaId === escolaId).flatMap((t) => (dia[t.id] || []).filter((a) => !ids.has(a.id)).map((a) => ({ id: a.id, nome: a.nome, turma: t.nome, serie: t.serie, completo: false, codigos: codigosDoEstudante(a) })));
    todos = [...completos, ...doDiario].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    main.innerHTML = `<h1>Estudantes</h1>
      <div class="campo"><label for="busca">Buscar estudante por nome ou código</label><div class="campo-busca">${icone('busca', 20)}<input id="busca" class="entrada" type="search" autocomplete="off" aria-describedby="busca-dica"></div><span class="dica" id="busca-dica">Código do aluno: ALU- e 5 números. Código da matrícula: 9 números, começa com o ano. O resultado diz qual dos dois você digitou.</span></div>
      <div id="resultado-busca" aria-live="polite"></div>
      <h2>Cadastros completos</h2>
      ${completos.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Estudantes da escola com cadastro completo</caption>
        <thead><tr><th scope="col">Estudante</th><th scope="col">Código do aluno</th><th scope="col">Código da matrícula</th><th scope="col">Série e turma</th><th scope="col">Responsável</th><th scope="col">Ficha</th></tr></thead>
        <tbody>${completos.map((e) => `<tr><td class="titulo-linha"><strong>${esc(e.nome)}</strong>${selo(e.id)}</td><td data-rotulo="Código do aluno"><div>${esc(e.codigos.aluno)}</div></td><td data-rotulo="Código da matrícula"><div>${esc(e.codigos.matricula)}</div></td><td data-rotulo="Série e turma"><div>${esc(serieCompleta(e.serie))} · ${esc(e.turma)}</div></td><td data-rotulo="Responsável"><div>${esc(e.responsavel)}</div></td><td class="acoes"><a class="botao botao-secundario botao-mini" href="${link('escola/estudante.html')}?id=${encodeURIComponent(e.id)}" aria-label="Abrir ficha de ${esc(e.nome)}">Abrir ficha</a> <a class="botao botao-texto botao-mini" href="${link('escola/movimentacoes.html')}?estudante=${encodeURIComponent(e.id)}" aria-label="Transferir ou cancelar a matrícula de ${esc(e.nome)}">Transferir ou cancelar</a></td></tr>`).join('')}</tbody></table></div>
        <p class="contagem">${completos.length} ${completos.length === 1 ? 'estudante' : 'estudantes'} com cadastro completo · ${doDiario.length} ${plural(doDiario.length, 'estudante', 'estudantes')} só no diário das turmas (aparecem na busca)</p>` : vazio('Nenhum estudante cadastrado', 'Os estudantes matriculados aparecem aqui depois da confirmação.')}`;
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('input', debounce((e) => { if (e.target.id === 'busca') main.querySelector('#resultado-busca').innerHTML = resultados(e.target.value); }, 150));
main.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-copiar]');
  if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.copiar); avisar(`Copiado: ${b.dataset.rotulo} ${b.dataset.copiar}.`); }
  catch { avisar(`Não foi possível copiar sozinho. O ${b.dataset.rotulo} é ${b.dataset.copiar}.`, 'info'); }
});
mostrar();
