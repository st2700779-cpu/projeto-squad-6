// Peças das anotações do PROFIN (pendência ou contexto da escola), usadas no painel, na ficha da escola e na visão da gestão.
// As regras ficam em dominio/notas-profin.js; aqui ficam o desenho e o salvamento.
import { esc, icone, dataBR, etiqueta } from '../ui.js';
import { conjunto, salvar, registrarAcao } from '../dados.js';
import { TIPOS_DE_NOTA, GERAL, validarNota, acrescentarNota, alternarResolvida, normalizarNota } from '../dominio/notas-profin.js';

const ROTULO_DA_GRAVIDADE = { erro: 'Resolver já', atencao: 'Resolver logo', info: 'Acompanhar' };
const TIPO_DA_GRAVIDADE = { erro: 'erro', atencao: 'atencao', info: 'info' };

/** Anotação do PROFIN. tecnico: mostra se é interna ou compartilhada e o botão de resolver/reabrir. */
export function notaHtml(n, { tecnico = false } = {}) {
  const pen = n.tipo === 'pendencia';
  const resolvida = pen && !n.aberta;
  const tags = [
    `<strong>${icone(pen ? 'alerta' : 'info', 16)} ${pen ? 'Pendência' : 'Contexto da escola'}</strong>`,
    `<span>${esc(n.categoria === GERAL ? 'Escola em geral' : n.categoria)}</span>`,
    n.nf ? `<span>${esc(n.nf)}</span>` : '',
    `<span>${dataBR(n.quando)}</span>`,
    tecnico ? `<span>${n.compartilhada ? 'Compartilhada com a gestão' : 'Interna do PROFIN'}</span>` : '',
    resolvida ? `<span>${icone('ok', 16)} Resolvida${n.resolvidaEm ? ` em ${dataBR(n.resolvidaEm)}` : ''}</span>` : ''
  ].filter(Boolean).join('');
  return `<div class="nota-profin nota-tipo-${n.tipo}${resolvida ? ' resolvida' : ''}"><div class="tags-nota">${tags}</div>
    <p class="esp-t-1 esp-b-0">${esc(n.texto)}</p><p class="texto-pequeno texto-suave esp-t-1 esp-b-0">${esc(n.por)}</p>
    ${tecnico && pen ? `<button type="button" class="botao botao-secundario botao-mini esp-t-2" data-resolver="${esc(n.chave)}" data-indice="${n.indice}">${resolvida ? 'Reabrir' : 'Marcar como resolvida'}</button>` : ''}</div>`;
}

/** Pendência calculada pelo portal (prestação, declaração devolvida, rascunho...). Some sozinha quando a escola regulariza. */
export function pendenciaCalculadaHtml(p) {
  return `<div class="nota-profin nota-tipo-pendencia nota-grav-${p.gravidade}"><div class="tags-nota">
      <strong>${icone('alerta', 16)} Pendência</strong>${etiqueta(ROTULO_DA_GRAVIDADE[p.gravidade], TIPO_DA_GRAVIDADE[p.gravidade])}${p.categoria ? `<span>${esc(p.categoria)}</span>` : ''}${p.declaracaoId ? `<span>${esc(p.declaracaoId)}</span>` : ''}<span>calculada pelo portal</span></div>
    <p class="esp-t-1 esp-b-0"><strong>${esc(p.titulo)}</strong></p><p class="esp-t-1 esp-b-0">${esc(p.detalhe)}</p>
    ${p.documentos?.length ? `<p class="esp-t-1 esp-b-0 texto-pequeno"><strong>Documentos com problema:</strong></p><ul class="texto-pequeno esp-b-0">${p.documentos.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}</div>`;
}

/** Formulário "Nova anotação" (o mesmo no painel e na ficha). */
export function formularioNotaHtml(escolaId, categorias) {
  const id = (c) => `nn-${escolaId}-${c}`;
  return `<form class="form-nota" data-nota-escola="${esc(escolaId)}" novalidate aria-labelledby="${id('titulo')}">
    <h3 id="${id('titulo')}" class="esp-t-0">Nova anotação</h3>
    <div class="form-bloco">
      <div class="campo"><label for="${id('tipo')}">Tipo</label><select id="${id('tipo')}" name="tipo" class="entrada">${Object.entries(TIPOS_DE_NOTA).map(([k, v]) => `<option value="${k}" ${k === 'pendencia' ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="campo"><label for="${id('categoria')}">Categoria de recurso</label><select id="${id('categoria')}" name="categoria" class="entrada"><option value="${GERAL}">Escola em geral</option>${categorias.map((c) => `<option>${esc(c)}</option>`).join('')}</select></div>
      <div class="campo"><label for="${id('nf')}">Documento <span class="dica">opcional, para pendência. Exemplo: NF 101</span></label><input id="${id('nf')}" name="nf" class="entrada" maxlength="40" autocomplete="off" aria-describedby="${id('nf')}-erro"><p class="erro" id="${id('nf')}-erro" role="alert"></p></div>
    </div>
    <div class="campo"><label for="${id('texto')}">Anotação</label><textarea id="${id('texto')}" name="texto" class="entrada" rows="3" maxlength="400" aria-describedby="${id('texto')}-erro"></textarea><p class="erro" id="${id('texto')}-erro" role="alert"></p></div>
    <label class="marca-item"><input type="checkbox" name="compartilhada" checked><span>Compartilhar com a gestão da escola<small>Aparece para a direção em Financeiro. Sem marcar, fica só para o PROFIN.</small></span></label>
    <div class="form-acoes"><button type="submit" class="botao">${icone('formulario', 20)}Salvar anotação</button></div>
  </form>`;
}

/**
 * Salva a nova anotação do formulário. Lê o conjunto de novo antes de gravar, para não apagar o que outra aba salvou.
 * @returns {Promise<{ok: boolean, notas?: object}>} ok false: os erros já foram mostrados no formulário
 */
export async function salvarNotaDoFormulario(form, { categorias, por, hoje, nomeDaEscola }) {
  const escolaId = form.dataset.notaEscola;
  const f = { tipo: form.tipo.value, categoria: form.categoria.value, nf: form.nf.value, texto: form.texto.value, compartilhada: form.compartilhada.checked };
  const { ok, erros } = validarNota(f, { categorias });
  for (const c of ['nf', 'texto']) {
    const campo = form.querySelector(`[name="${c}"]`); const erro = form.querySelector(`#${CSS.escape(campo.id)}-erro`);
    erro.textContent = erros[c] || ''; if (erros[c]) campo.setAttribute('aria-invalid', 'true'); else campo.removeAttribute('aria-invalid');
  }
  if (!ok) { form.querySelector('[aria-invalid="true"]')?.focus(); return { ok: false }; }
  const atual = await conjunto('profin-notas');
  const notas = acrescentarNota(atual, f, { escolaId, por, hoje });
  await salvar('profin-notas', notas);
  await registrarAcao(por, f.tipo === 'pendencia' ? 'Anotou pendência no PROFIN' : 'Anotou contexto no PROFIN', `${nomeDaEscola} · ${f.categoria}`);
  return { ok: true, notas };
}

/** Marca a pendência como resolvida ou reabre. Acha a anotação pela data e pelo texto no conjunto lido de novo. */
export async function alternarNotaSalva(chave, indice, referencia, { por, hoje, nomeDaEscola }) {
  const atual = await conjunto('profin-notas');
  const lista = atual[chave] || [];
  const i = lista[indice] && lista[indice].texto === referencia.texto && lista[indice].quando === referencia.quando ? indice : lista.findIndex((n) => n.texto === referencia.texto && n.quando === referencia.quando);
  if (i < 0) throw new Error('NOTA_NAO_ENCONTRADA');
  const estava = normalizarNota(lista[i]).aberta;
  const notas = alternarResolvida(atual, chave, i, { por, hoje });
  await salvar('profin-notas', notas);
  await registrarAcao(por, estava ? 'Marcou pendência como resolvida no PROFIN' : 'Reabriu pendência no PROFIN', `${nomeDaEscola} · ${chave.split('|')[1]}`);
  return { notas, resolvida: estava };
}
