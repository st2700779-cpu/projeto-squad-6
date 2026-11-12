// Entrada do portal: os perfis agrupados em 5 portais (Estudante, Professor, Escola, Rede e Financeiro), cada perfil com o seu
// login. A Matrícula On-line (família) fica numa caixa acima dos portais e não pede login. Lista simples, sem cartões.
import { iniciar, link } from '../app.js';
import { avisar, confirmar, esc } from '../ui.js';
import { sessao, sair, PERFIS } from '../auth.js';
import { reiniciarDados } from '../dados.js';

const main = await iniciar();
// Os perfis agrupados em portais. Cada perfil continua com o seu login (login.html?perfil=...).
const portais = [
  ['Portal do Estudante', [
    ['aluno', 'Aluno', 'Notas, faltas, horário, provas e quiz'],
    ['responsavel', 'Responsável', 'Boletim e frequência dos filhos e a situação da matrícula']]],
  ['Portal do Professor', [
    ['professor', 'Professor', 'Turmas, horário, chamada, notas e plano de aula']]],
  ['Portal da Escola', [
    ['diretor', 'Direção', 'Visão da escola, turmas, vagas, financeiro e prestação de contas'],
    ['coordenador', 'Coordenação pedagógica', 'Turmas lado a lado, horários e reunião pedagógica'],
    ['escola', 'Secretaria', 'Matrículas, solicitações, enturmação e professores']]],
  ['Portal da Rede', [
    ['rede', 'SEED, DEA e DREs', 'Escolas, atos, cursos, vagas e professores. Cada DRE e a DEA veem só a sua regional']]],
  ['Portal Financeiro (PROFIN)', [
    ['profin', 'Equipe do PROFIN', 'Prestação de contas das escolas, análise das declarações e relatório']]]
];
const s = sessao();
main.innerHTML = `
  <h1 class="entrada-titulo">Entrar no Portal Acadêmico</h1>
  <p class="entrada-sub">Escolha o portal e o seu perfil. Acesso simulado: as contas de teste ficam na tela de login.</p>
  ${!s && new URLSearchParams(location.search).get('motivo') === 'inatividade' ? `<div class="sessao-atual" role="status"><span>Por segurança, a sua sessão foi encerrada depois de 30 minutos sem uso. Entre de novo para continuar.</span></div>` : ''}
  ${s ? `<div class="sessao-atual" role="status"><span>Você entrou como <strong>${esc(s.nome)}</strong> (${esc(PERFIS[s.perfil]?.rotulo || s.perfil)}).</span><a class="botao botao-secundario botao-mini" href="${link(PERFIS[s.perfil]?.inicio || 'index.html')}">Continuar</a><button type="button" class="botao botao-texto botao-mini" id="sair">Sair</button></div>` : ''}
  <section class="caixa-matricula" aria-labelledby="matricula-titulo">
    <h2 id="matricula-titulo">Matrícula On-line</h2>
    <p>Para as famílias. Não precisa de login.</p>
    <ul>
      <li><a class="botao" href="${link('familia/matricula.html')}">Fazer matrícula</a></li>
      <li><a href="${link('familia/mapa.html')}">Ver vagas perto de casa</a></li>
      <li><a href="${link('familia/acompanhar.html')}">Acompanhar meu pedido</a></li>
    </ul>
  </section>
  <div class="portais">
    ${portais.map(([nome, perfis], i) => `<section class="portal portal-${i + 1}" aria-labelledby="portal-${i}">
      <h2 id="portal-${i}">${esc(nome)}</h2>
      <ul>${perfis.map(([perfil, rotulo, d]) => `<li><a href="${link(`login.html?perfil=${perfil}`)}">${esc(rotulo)}</a><span>${esc(d)}</span></li>`).join('')}</ul>
    </section>`).join('')}
  </div>
  <p class="entrada-rodape"><a href="${link('verificar.html')}">Verificar um documento pelo código</a></p>
  <p class="aviso-prototipo">Squad 6 · Residência RiseUp · Escolas, pessoas e dados fictícios · <button type="button" class="botao botao-texto botao-mini" id="reiniciar">Restaurar dados de demonstração</button></p>`;
main.querySelector('#sair')?.addEventListener('click', sair);
main.querySelector('#reiniciar').addEventListener('click', async () => {
  if (!(await confirmar({ titulo: 'Restaurar os dados de demonstração?', texto: 'Apaga o que foi feito neste navegador e no servidor local: pedidos de matrícula, confirmações, turmas, notas lançadas, chamadas e declarações. Os dados voltam ao início.', botao: 'Restaurar dados', perigo: true }))) return;
  try { await reiniciarDados(); avisar('Dados de demonstração restaurados.'); } catch { avisar('Não foi possível restaurar os dados. Recarregue a página e tente de novo.'); }
});
