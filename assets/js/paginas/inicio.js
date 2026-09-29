// W1 · Seleção de perfil.
import { iniciar, link } from '../app.js';
import { icone, avisar, confirmar } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { reiniciarDados } from '../dados.js';

const main = await iniciar();
const perfis = [
  ['familia', 'familia/index.html', 'Família e estudante', 'Matrícula, boletim, documentos e avisos da escola', 'usuario'],
  ['professor', 'professor/index.html', 'Professor', 'Turmas, chamada e lançamento de notas no diário de classe', 'livro'],
  ['escola', 'escola/index.html', 'Escola', 'Secretaria, coordenação e direção: matrículas, turmas e alocação', 'escola'],
  ['rede', 'rede/atos.html', 'Rede (SEDUC e DRE)', 'Atos autorizativos, vagas por escola e matrizes curriculares', 'rede']
];
main.innerHTML = `
  <section class="hero">
    <span class="marca-selo" aria-hidden="true">SE</span>
    <h1>Portal Acadêmico</h1>
    <p class="lead">Sistema acadêmico da Rede Estadual de Ensino de Sergipe. Escolha como você quer entrar. No protótipo, o acesso é simulado.</p>
  </section>
  <h2 class="sr-only">Perfis de acesso</h2>
  <div class="perfis">
    ${perfis.map(([v, h, t, d, i]) => `
      <div class="cartao cartao-interativo perfil-cartao visao-${v}">
        <a href="${link(h)}"><span class="icone">${icone(i, 28)}</span><span><strong>${t}</strong><br><small>${d}</small></span></a>
        <div class="perfil-rodape"><span class="perfil-entrar">Entrar ${icone('seta', 18)}</span>${botaoOuvir(`${t}. ${d}.`, '')}</div>
      </div>`).join('')}
  </div>
  <p class="texto-suave rodape-prototipo">Squad 6 · Residência RiseUp · Dados fictícios · <button type="button" class="botao botao-texto botao-mini" id="reiniciar">Reiniciar demonstração</button></p>`;
main.querySelector('#reiniciar').addEventListener('click', async () => {
  if (!(await confirmar({ titulo: 'Reiniciar a demonstração?', texto: 'Apaga tudo o que foi feito: pedidos enviados, confirmações, turmas, notas lançadas, chamadas e declarações. Os dados voltam ao início.', botao: 'Reiniciar', perigo: true }))) return;
  try { await reiniciarDados(); avisar('Demonstração reiniciada.'); } catch { avisar('Não foi possível reiniciar. Tente de novo.'); }
});
