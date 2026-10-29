// Peças da lista de avisos com "lido": cartão com etiqueta Novo e botão de marcar, e a barra do topo.
import { esc, etiqueta, plural } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { chaveDoAviso } from '../dominio/avisos.js';

export function cartaoDeAviso(a, lidos, { nivel = 3, publicado = 'publicado em' } = {}) {
  const lido = lidos.has(chaveDoAviso(a));
  const h = `h${nivel}`;
  return `<article class="aviso-item${lido ? '' : ' aviso-novo'}"><div class="linha-botoes entre"><${h} class="esp-t-0 esp-b-0">${esc(a.titulo)}${lido ? '' : ` ${etiqueta('Novo', 'info')}`}${a.reuniao ? ` ${etiqueta('Reunião de pais', 'info')}` : ''}</${h}>${botaoOuvir(`${a.titulo}. ${a.texto}`, 'Ouvir')}</div>
    <p class="esp-t-2 esp-b-1">${esc(a.texto)}</p>
    <div class="linha-botoes entre"><span class="texto-suave texto-pequeno">${esc(a.origem)} · ${publicado} ${esc(a.data)}</span><button type="button" class="botao botao-texto botao-mini" data-lido="${esc(chaveDoAviso(a))}" data-estado="${lido ? 'lido' : 'novo'}" aria-label="${lido ? 'Marcar como não lido' : 'Marcar como lido'}: ${esc(a.titulo)}">${lido ? 'Marcar como não lido' : 'Marcar como lido'}</button></div></article>`;
}
/** Contagem de não lidos e botão "Marcar todos como lidos" (só aparece se houver não lidos). */
export function barraDeLeitura(avisos, lidos) {
  const n = avisos.filter((a) => !lidos.has(chaveDoAviso(a))).length;
  if (!avisos.length) return '';
  return `<div class="linha-botoes entre barra-leitura" role="status" tabindex="-1"><span><strong>${n}</strong> ${plural(n, 'aviso não lido', 'avisos não lidos')}</span>${n ? '<button type="button" class="botao botao-secundario botao-mini" data-todos-lidos>Marcar todos como lidos</button>' : '<span class="texto-suave">Tudo lido.</span>'}</div>`;
}
