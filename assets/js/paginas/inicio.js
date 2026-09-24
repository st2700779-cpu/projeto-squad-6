import { iniciar, link } from '../app.js';
import { icone } from '../ui.js';
import { reiniciarDados } from '../dados.js';
import { avisar } from '../ui.js';

const main = await iniciar();
const perfis = [
  ['familia/index.html', 'Família e estudante', 'Matrícula, notas, documentos e avisos, com leitura em voz alta.', 'usuario'],
  ['professor/index.html', 'Professor', 'Turmas, carga horária e diário de notas e faltas.', 'livro'],
  ['escola/index.html', 'Escola', 'Secretaria, coordenação e direção: matrículas e turmas.', 'escola'],
  ['rede/atos.html', 'Rede (SEDUC e DRE)', 'Atos autorizativos, vagas e matrizes curriculares.', 'rede']
];
main.innerHTML = `
  <h1 style="font-size:clamp(1.8rem,4vw,2.5rem);max-width:18ch">Quem está usando o portal agora?</h1>
  <p class="texto-suave" style="font-size:1.1rem;max-width:52ch">Escolha seu perfil. No protótipo, o acesso é simulado e todos os dados são fictícios.</p>
  <div class="row g-3" style="margin-top:.5rem">
    ${perfis.map(([h, t, d, i]) => `<div class="col-12 col-md-6"><div class="bloco" style="height:100%;margin:0"><a href="${link(h)}"><span class="icone">${icone(i, 30)}</span><span><strong>${t}</strong><small>${d}</small></span></a></div></div>`).join('')}
  </div>
  <p class="texto-suave" style="margin-top:2rem;font-size:.9rem">Squad 6 · Residência RiseUp · <button type="button" class="botao botao-secundario" id="reiniciar" style="min-height:36px;padding:.2rem .7rem">Reiniciar demonstração</button></p>`;
main.querySelector('#reiniciar').addEventListener('click', async () => {
  try { await reiniciarDados(); avisar('Demonstração reiniciada.'); } catch { avisar('Não foi possível reiniciar. Tente de novo.'); }
});
