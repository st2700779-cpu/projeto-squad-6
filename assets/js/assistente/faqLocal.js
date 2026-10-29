// Respostas sem IA: busca por palavras-chave na mesma base de conhecimento usada pelo proxy.
import { carregar } from '../dados.js';

const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export async function responderSemIA(pergunta) {
  const base = await carregar('base-conhecimento');
  const q = normalizar(pergunta);
  let melhor = null;
  let pontos = 0;
  for (const item of base.itens) {
    let p = 0;
    for (const chave of item.palavras_chave) if (q.includes(normalizar(chave))) p += normalizar(chave).split(' ').length;
    if (p > pontos) { pontos = p; melhor = item; }
  }
  return melhor;
}

// Ação sugerida a partir do tema do item, usada no modo de simulação.
export const acaoDoTema = (tema) => ({ matricula: 'matricula', documentos: 'documentos', notas: 'notas', calendario: 'calendario', transferencia: 'matricula' }[tema] || null);
