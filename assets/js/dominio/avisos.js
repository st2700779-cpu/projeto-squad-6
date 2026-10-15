// Avisos lidos e não lidos. Cada pessoa tem a sua marcação (por usuário do login), guardada neste aparelho.
export const isoDoAviso = (a) => (a.data.includes('/') ? a.data.split('/').reverse().join('-') : a.data);
/** Identifica um aviso sem depender de posição na lista: data e título. */
export const chaveDoAviso = (a) => `${a.iso || isoDoAviso(a)}|${a.titulo}`;
export const lidosDe = (todos, login) => new Set((todos && todos[login]) || []);
/** Devolve uma cópia de `todos` com as chaves marcadas como lidas (ou como não lidas, se lido for false). */
export function marcarLidos(todos, login, chaves, lido = true) {
  const set = lidosDe(todos, login);
  for (const c of chaves) { if (lido) set.add(c); else set.delete(c); }
  return { ...(todos || {}), [login]: [...set] };
}
export const naoLidos = (avisos, lidos) => avisos.filter((a) => !lidos.has(chaveDoAviso(a)));
