// Meus dados: cadastro do estudante só para leitura. Dado sensível não se edita aqui: a correção é pedida à secretaria.
import { iniciar, falhaDados } from '../app.js';
import { esc, icone, dataBR, avisar, pedirTexto, etiqueta, vazio, comEspera } from '../ui.js';
import { estudantes, carregar } from '../dados.js';
import { serieCompleta } from '../regras.js';
import { criarSolicitacao, solicitacoesDoEstudante } from '../solicitacoes.js';
import { sessao } from '../auth.js';

const main = await iniciar({ perfil: 'aluno', pagina: 'aluno/cadastro.html', assistente: true, titulo: 'Meus dados', estreito: true });
const TIPO = { Pendente: 'atencao', 'Em andamento': 'info', Pronta: 'ok', Entregue: 'neutra' };
let est;

async function mostrar() {
  try {
    ({ atual: est } = await estudantes());
    const [escolas, pedidos] = await Promise.all([carregar('escolas'), solicitacoesDoEstudante(est.id)]);
    const escola = escolas.find((e) => e.id === est.escolaId);
    const correcoes = pedidos.filter((p) => p.tipo === 'Correção de dado cadastral');
    main.innerHTML = `
      <h1>Meus dados</h1>
      <p class="pagina-descricao">Dados do seu cadastro na escola. Aqui você só consulta: se algo estiver errado, peça a correção à secretaria.</p>
      <p class="esp-b-3">${etiqueta('Somente leitura', 'neutra')}</p>
      <dl class="codigos-aluno">
        <div class="codigo-par"><dt>Código do aluno</dt><dd>${esc(est.codigoAluno || '—')}</dd><small>Identifica você na rede. Não muda de ano nem de escola.</small></div>
        <div class="codigo-par"><dt>Código da matrícula</dt><dd>${esc(est.matricula)}</dd><small>Identifica a sua matrícula neste ano, nesta escola. É o número do seu acesso.</small></div>
      </dl>
      <dl class="dados-verificacao">
        <dt>Nome</dt><dd>${esc(est.nome)}</dd>
        <dt>Nascimento</dt><dd>${dataBR(est.nascimento)}</dd>
        <dt>Série e turma</dt><dd>${esc(serieCompleta(est.serie))}, ${esc(est.turma)}, ${esc(est.turno.toLowerCase())}</dd>
        <dt>Escola</dt><dd>${esc(escola.nome)}</dd>
        <dt>Responsável</dt><dd>${esc(est.responsavel)}</dd>
        <dt>Endereço</dt><dd>${esc(est.endereco || 'Não informado')}</dd>
        <dt>Telefone de contato</dt><dd>${esc(est.telefone || 'Não informado')} <small class="texto-suave">(parte do número fica escondida)</small></dd>
        <dt>E-mail</dt><dd>${esc(est.email || 'Não informado')}</dd>
      </dl>
      <div class="linha-botoes esp-t-4"><button type="button" class="botao botao-secundario" id="pedir-correcao">${icone('formulario', 20)}Pedir correção de um dado</button></div>
      <h2>Pedidos de correção</h2>
      ${correcoes.length ? `<ul class="lista-limpa">${correcoes.map((p) => `<li class="aviso-item"><strong>${esc(p.id)}</strong> ${etiqueta(p.situacao, TIPO[p.situacao])}<br><span class="texto-suave texto-pequeno">Pedido em ${dataBR(p.criadaEm)} · prazo da secretaria: ${dataBR(p.prazo)}</span>${p.observacao ? `<p class="esp-t-1 esp-b-0">${esc(p.observacao)}</p>` : ''}</li>`).join('')}</ul>` : vazio('Nenhum pedido de correção', 'Se algum dado estiver errado, use o botão acima. A secretaria responde dentro do prazo.')}`;
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('click', async (e) => {
  const b = e.target.closest('#pedir-correcao');
  if (!b) return;
  const texto = await pedirTexto({ titulo: 'Qual dado precisa de correção?', rotulo: 'Explique o que está errado e como deveria ser', minimo: 8 });
  if (!texto) return;
  try {
    await comEspera(b, () => criarSolicitacao({ tipo: 'Correção de dado cadastral', estudante: est, solicitante: sessao()?.nome || est.nome, observacao: texto }));
    avisar('Pedido enviado à secretaria. Você acompanha a situação nesta página.');
    mostrar();
  } catch { avisar('Não foi possível enviar o pedido. Confira a conexão e tente de novo.'); }
});
mostrar();
