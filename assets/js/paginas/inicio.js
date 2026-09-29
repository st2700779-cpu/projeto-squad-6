// Entrada do portal: um acesso por perfil. Aluno, Professor, Secretaria e Rede pedem login;
// Matrícula (família) é aberta e não pede.
import { iniciar, link } from '../app.js';
import { avisar, confirmar, esc } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { sessao, sair, PERFIS } from '../auth.js';
import { reiniciarDados } from '../dados.js';

const main = await iniciar();
const acessos = [
  ['login.html?perfil=aluno', 'Aluno', 'Notas e faltas, documentos e calendário. Pede matrícula e senha.'],
  ['login.html?perfil=professor', 'Professor', 'Turmas, chamada e lançamento de notas no diário de classe. Pede matrícula funcional e senha.'],
  ['login.html?perfil=escola', 'Secretaria', 'Matrículas, enturmação, turmas e alocação de professores. Pede usuário institucional e senha.'],
  ['login.html?perfil=rede', 'Rede (SEDUC e DRE)', 'Atos autorizativos, vagas por escola e matrizes curriculares. Pede usuário institucional e senha.'],
  ['familia/matricula.html', 'Matrícula', 'Para a família fazer o pedido de matrícula. Não precisa de login.']
];
const s = sessao();
main.innerHTML = `
  <h1>Entrar no sistema</h1>
  <p class="pagina-descricao">Escolha como você vai usar o portal. O acesso é simulado e as contas de teste aparecem na tela de login.</p>
  ${s ? `<div class="sessao-atual" role="status"><span>Você entrou como <strong>${esc(s.nome)}</strong> (${esc(PERFIS[s.perfil]?.rotulo || s.perfil)}).</span><a class="botao botao-secundario botao-mini" href="${link(PERFIS[s.perfil]?.inicio || 'index.html')}">Continuar</a><button type="button" class="botao botao-texto botao-mini" id="sair">Sair</button></div>` : ''}
  <ul class="lista-perfis">
    ${acessos.map(([h, t, d]) => `<li><a href="${link(h)}"><strong>${t}</strong><span>${d}</span></a>${botaoOuvir(`${t}. ${d}`, '')}</li>`).join('')}
  </ul>
  <p class="aviso-prototipo">Squad 6 · Residência RiseUp · Escolas, pessoas e dados fictícios · <button type="button" class="botao botao-texto botao-mini" id="reiniciar">Restaurar dados de demonstração</button></p>`;
main.querySelector('#sair')?.addEventListener('click', sair);
main.querySelector('#reiniciar').addEventListener('click', async () => {
  if (!(await confirmar({ titulo: 'Restaurar os dados de demonstração?', texto: 'Apaga o que foi feito neste navegador e no servidor local: pedidos de matrícula, confirmações, turmas, notas lançadas, chamadas e declarações. Os dados voltam ao início.', botao: 'Restaurar dados', perigo: true }))) return;
  try { await reiniciarDados(); avisar('Dados de demonstração restaurados.'); } catch { avisar('Não foi possível restaurar os dados. Recarregue a página e tente de novo.'); }
});
