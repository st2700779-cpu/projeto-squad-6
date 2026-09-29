// W1 · Seleção de perfil (acesso simulado).
import { iniciar, link } from '../app.js';
import { avisar, confirmar } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { reiniciarDados } from '../dados.js';

const main = await iniciar();
const perfis = [
  ['familia/index.html', 'Família e estudante', 'Boletim, matrícula, documentos e avisos da escola'],
  ['professor/index.html', 'Professor', 'Turmas, chamada e lançamento de notas no diário de classe'],
  ['escola/index.html', 'Escola', 'Secretaria, coordenação e direção: matrículas, turmas e alocação de professores'],
  ['rede/atos.html', 'Rede (SEDUC e DRE)', 'Atos autorizativos, vagas por escola e matrizes curriculares']
];
main.innerHTML = `
  <h1>Entrar no sistema</h1>
  <p class="pagina-descricao">Acesso simulado. Escolha o perfil para continuar.</p>
  <ul class="lista-perfis">
    ${perfis.map(([h, t, d]) => `<li><a href="${link(h)}"><strong>${t}</strong><span>${d}</span></a>${botaoOuvir(`${t}. ${d}.`, '')}</li>`).join('')}
  </ul>
  <p class="aviso-prototipo">Squad 6 · Residência RiseUp · Escolas, pessoas e dados fictícios · <button type="button" class="botao botao-texto botao-mini" id="reiniciar">Restaurar dados de demonstração</button></p>`;
main.querySelector('#reiniciar').addEventListener('click', async () => {
  if (!(await confirmar({ titulo: 'Restaurar os dados de demonstração?', texto: 'Apaga o que foi feito neste navegador e no servidor local: pedidos de matrícula, confirmações, turmas, notas lançadas, chamadas e declarações. Os dados voltam ao início.', botao: 'Restaurar dados', perigo: true }))) return;
  try { await reiniciarDados(); avisar('Dados de demonstração restaurados.'); } catch { avisar('Não foi possível restaurar os dados. Recarregue a página e tente de novo.'); }
});
