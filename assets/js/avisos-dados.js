// Avisos de cada perfil com a marcação de lido. A lista vem do mesmo lugar de sempre; aqui só se junta a leitura.
import { carregar, conjunto, salvar, estudantes } from './dados.js';
import { avisosVisiveis } from './painel-dados.js';
import { sessao } from './auth.js';
import { dataBR } from './ui.js';
import { isoDoAviso, chaveDoAviso, lidosDe, marcarLidos, naoLidos } from './dominio/avisos.js';

/** Aluno e responsável veem os avisos da turma (do estudante escolhido); professor e secretaria, os avisos da escola. */
export async function avisosDoPerfil(perfil) {
  if (perfil === 'aluno' || perfil === 'responsavel') { const { atual } = await estudantes(); return avisosVisiveis({ perfil, est: atual }); }
  return (await carregar('avisos')).map((a) => ({ titulo: a.titulo, texto: a.texto, iso: isoDoAviso(a), data: dataBR(isoDoAviso(a)), origem: 'Escola', reuniao: false })).sort((a, b) => b.iso.localeCompare(a.iso));
}
export async function lerLidos() { return lidosDe(await conjunto('avisos-lidos'), sessao()?.login); }
export async function marcarAvisos(chaves, lido = true) {
  await salvar('avisos-lidos', marcarLidos(await conjunto('avisos-lidos'), sessao()?.login, chaves, lido));
}
export async function contarNaoLidos(perfil) {
  const [avisos, lidos] = await Promise.all([avisosDoPerfil(perfil), lerLidos()]);
  return naoLidos(avisos, lidos).length;
}
export { chaveDoAviso };
