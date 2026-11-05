// Documentos: declarações para imprimir, o que levar para a matrícula e contato da secretaria
// (destino de "Contato da escola" no assistente).
import { iniciar, link, falhaDados } from '../app.js';
import { esc } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { estudantes, carregar } from '../dados.js';
import { sessao } from '../auth.js';
import { blocoDePedidos, ligarPedidos } from '../componentes/pedidos.js';
import { documentosDaMatricula } from '../dominio/matricula-online.js';
import { hojeISO } from '../dominio/hoje.js';

const main = await iniciar({ perfil: 'aluno', assistente: true, titulo: 'Documentos', voltar: 'aluno/index.html', estreito: true });
const lista = (itens) => `<ul class="lista-texto">${itens.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
const DECLARACOES = [
  ['matricula', 'Declaração de matrícula', 'Para bolsa, transporte, trabalho ou benefícios'],
  ['frequencia', 'Declaração de frequência', 'Mostra a presença nas aulas até hoje'],
  ['transferencia', 'Declaração de transferência', 'Para levar à nova escola']
];

let atual;
async function mostrar() {
  try {
    const [{ lista: todos, atual: est }, escolas, online] = await Promise.all([estudantes(), carregar('escolas'), carregar('matricula-online')]);
    // A lista oficial de documentos (data/matricula-online.json), a mesma do pedido de matrícula.
    const matricula = documentosDaMatricula(online.documentos, { tipo: 'nova', nascimento: est.nascimento, hoje: hojeISO() });
    const naTransferencia = online.documentos.filter((d) => d.quando === 'transferencia').map((d) => d.texto);
    atual = est;
    const escola = escolas.find((e) => e.id === est.escolaId);
    main.innerHTML = `
      <h1>Documentos e declarações</h1>
      <p class="pagina-descricao">De <strong class="cor-tinta">${esc(est.nome)}</strong>, prontos para imprimir ou salvar em PDF.${todos.length > 1 ? ` Para outro estudante, troque na <a href="${link('aluno/index.html')}">página inicial da família</a>.` : ''}</p>
      <h2 class="esp-t-0">Declarações</h2>
      <div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Declarações disponíveis para emissão</caption>
        <thead><tr><th scope="col">Declaração</th><th scope="col">Para que serve</th><th scope="col"><span class="sr-only">Ação</span></th></tr></thead>
        <tbody>${DECLARACOES.map(([t, nome, desc]) => `<tr><td class="titulo-linha"><strong>${nome}</strong></td><td data-rotulo="Para que serve">${desc}</td><td class="acoes"><a class="botao botao-secundario botao-mini" href="${link('aluno/declaracao.html')}?tipo=${t}&estudante=${est.id}" aria-label="Emitir ${esc(nome.toLowerCase())}">Emitir</a></td></tr>`).join('')}</tbody>
      </table></div>
      ${await blocoDePedidos(est)}
      <div class="linha-botoes entre esp-t-5"><h2 class="esp-t-0 esp-b-0">Documentos para a matrícula</h2>${botaoOuvir(`Para a matrícula, leve: ${matricula.join('. ')}.`, 'Ouvir a lista')}</div>
      ${lista(matricula)}
      <h2>Na transferência, leve também</h2>${lista(naTransferencia)}
      <p>Depois de enviar o pedido pelo portal, leve os documentos à secretaria da escola em até ${online.prazoDocumentosDiasUteis || 5} dias úteis.</p>
      <h2 id="contato" tabindex="-1">Contato da escola</h2>
      <p class="esp-b-1"><strong>Secretaria do ${esc(escola.nome)}</strong></p>
      <p class="esp-t-0 esp-b-1">Atende de segunda a sexta, das 7h às 17h.</p>
      <p class="texto-suave esp-t-0">Telefone (fictício): (79) 3000-0000</p>`;
    if (location.hash === '#contato') document.getElementById('contato').focus();
  } catch { falhaDados(main, mostrar); }
}
ligarPedidos(main, { estAtual: () => atual, solicitante: () => sessao()?.nome || atual.responsavel, aoMudar: mostrar });
mostrar();
