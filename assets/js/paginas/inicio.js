// W1 · Seleção de perfil.
import { iniciar, link } from '../app.js';
import { icone, avisar, confirmar } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { reiniciarDados } from '../dados.js';

const main = await iniciar();
const perfis = [
  ['familia/index.html', 'Família e estudante', 'Matrícula, notas e avisos', 'usuario'],
  ['professor/index.html', 'Professor', 'Turmas e diário', 'livro'],
  ['escola/index.html', 'Escola', 'Secretaria, coordenação e direção', 'escola'],
  ['rede/atos.html', 'Rede (SEDUC e DRE)', 'Atos, vagas e matrizes', 'rede']
];
main.innerHTML = `
  <h1 style="font-size:clamp(2rem,6vw,2.6rem);margin-top:.8rem">Quem está usando o portal?</h1>
  <p class="texto-suave" style="font-size:1.1rem;max-width:52ch">Escolha seu perfil. No protótipo, o acesso é simulado.</p>
  <div class="row g-3" style="margin-top:.2rem">
    ${perfis.map(([h, t, d, i]) => `<div class="col-12 col-lg-6"><div class="bloco" style="height:100%;margin:0"><a href="${link(h)}"><span class="icone">${icone(i, 30)}</span><span><strong>${t}</strong><small>${d}</small></span></a>${botaoOuvir(`${t}. ${d}.`, '')}</div></div>`).join('')}
  </div>
  <p class="texto-suave" style="margin-top:2rem;font-size:.9rem">Squad 6 · Residência RiseUp · Dados fictícios · <button type="button" class="botao botao-secundario" id="reiniciar" style="min-height:36px;padding:.2rem .7rem;border-width:1.5px">Reiniciar demonstração</button></p>`;
main.querySelector('#reiniciar').addEventListener('click', async () => {
  if (!(await confirmar({ titulo: 'Reiniciar a demonstração?', texto: 'Apaga tudo o que foi feito: pedidos enviados, confirmações, turmas, notas lançadas, chamadas e declarações. Os dados voltam ao início.', botao: 'Reiniciar', perigo: true }))) return;
  try { await reiniciarDados(); avisar('Demonstração reiniciada.'); } catch { avisar('Não foi possível reiniciar. Tente de novo.'); }
});
