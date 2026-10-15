// Peças de formulário comuns às telas de cadastro: campo com rótulo sempre visível, dica e erro logo abaixo;
// grupo de caixas de marcar; leitura dos valores e exibição dos erros (foco no primeiro campo com problema).
import { esc } from '../ui.js';

/**
 * @param {{nome: string, rotulo: string, tipo?: string, valor?: string, dica?: string, obrigatorio?: boolean, opcoes?: Array<string|[string,string]>|null, atributos?: string, prefixo?: string}} p
 *   prefixo: início do id (padrão "f"). Use outro quando dois formulários com os mesmos campos ficam na mesma página (ids repetidos quebram o rótulo).
 */
export function campo({ nome, rotulo, tipo = 'text', valor = '', dica = '', obrigatorio = false, opcoes = null, atributos = '', prefixo = 'f' }) {
  const id = `${prefixo}-${nome}`;
  const desc = `${dica ? `${id}-dica ` : ''}${id}-erro`;
  const marca = obrigatorio ? ' <span class="obrigatorio" aria-hidden="true">*</span>' : '';
  const controle = opcoes
    ? `<select id="${id}" name="${nome}" class="entrada" aria-describedby="${desc}" ${obrigatorio ? 'required' : ''} ${atributos}>${opcoes.map((o) => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${v === valor ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select>`
    : `<input id="${id}" name="${nome}" type="${tipo}" class="entrada" value="${esc(valor)}" aria-describedby="${desc}" ${obrigatorio ? 'required' : ''} ${atributos}>`;
  return `<div class="campo"><label for="${id}">${esc(rotulo)}${marca}</label>${controle}${dica ? `<span class="dica" id="${id}-dica">${esc(dica)}</span>` : ''}<p class="erro" id="${id}-erro" role="alert"></p></div>`;
}

/** Grupo de caixas de marcar. itens: [valor, texto, apoio?]. */
export function marcas({ nome, rotulo, itens, marcados = [], dica = '', obrigatorio = false, prefixo = 'f' }) {
  const id = `${prefixo}-${nome}`;
  return `<fieldset class="campo" id="${id}" aria-describedby="${dica ? `${id}-dica ` : ''}${id}-erro"><legend>${esc(rotulo)}${obrigatorio ? ' <span class="obrigatorio" aria-hidden="true">*</span>' : ''}</legend>
    <div class="marcas">${itens.map(([v, t, apoio]) => `<label class="marca-item"><input type="checkbox" name="${nome}" value="${esc(v)}" ${marcados.includes(v) ? 'checked' : ''}><span>${esc(t)}${apoio ? `<small>${esc(apoio)}</small>` : ''}</span></label>`).join('')}</div>
    ${dica ? `<span class="dica" id="${id}-dica">${esc(dica)}</span>` : ''}<p class="erro" id="${id}-erro" role="alert"></p></fieldset>`;
}

/** Valores do formulário por nome; grupos de caixas viram lista. */
export function lerFormulario(form) {
  const dados = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') { (dados[el.name] ||= []); if (el.checked) dados[el.name].push(el.value); }
    else if (el.type === 'radio') { if (el.checked) dados[el.name] = el.value; }
    else if (el.type !== 'file' && el.type !== 'submit' && el.type !== 'button') dados[el.name] = el.value;
  }
  return dados;
}

export function limparErros(form) {
  form.querySelectorAll('.erro').forEach((p) => { p.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
}

/** Mostra uma mensagem por campo e leva o foco ao primeiro com problema. Devolve true se não havia erros. */
export function mostrarErros(form, erros, prefixo = 'f-') {
  limparErros(form);
  let primeiro = null;
  for (const [nome, msg] of Object.entries(erros)) {
    const p = form.querySelector(`#${prefixo}${nome}-erro`);
    if (p) p.textContent = msg;
    const el = form.querySelector(`#${prefixo}${nome}`);
    const alvo = el?.matches('fieldset') ? el.querySelector('input') : el;
    if (alvo) { alvo.setAttribute('aria-invalid', 'true'); primeiro ??= alvo; }
  }
  primeiro?.focus();
  return !Object.keys(erros).length;
}
