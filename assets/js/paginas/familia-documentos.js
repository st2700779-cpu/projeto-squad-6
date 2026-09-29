// Documentos: declarações para imprimir, o que levar para a matrícula e contato da secretaria
// (destino de "Contato da escola" no assistente).
import { iniciar, link, falhaDados } from '../app.js';
import { icone, esc } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { estudantes } from '../dados.js';

const main = await iniciar({ perfil: 'familia', assistente: true, titulo: 'Documentos', voltar: 'familia/index.html' });
const matricula = ['Certidão de nascimento ou RG do estudante', 'CPF do estudante, se tiver', 'Comprovante de residência (conta de luz ou de água)', 'Documento com foto do responsável'];
const lista = (itens) => `<ul class="opcoes lista-limpa">${itens.map((x) => `<li class="opcao opcao-estatica">${icone('documento', 26)}<span>${esc(x)}</span>${botaoOuvir(x, '')}</li>`).join('')}</ul>`;
const DECLARACOES = [
  ['matricula', 'Declaração de matrícula', 'Para bolsa, transporte, trabalho ou benefícios'],
  ['frequencia', 'Declaração de frequência', 'Mostra a presença nas aulas até hoje'],
  ['transferencia', 'Declaração de transferência', 'Para levar à nova escola']
];

async function mostrar() {
  try {
    const { lista: todos, atual: est } = await estudantes();
    main.innerHTML = `
      <h1 class="esp-b-1">Declarações</h1>
      <p class="texto-suave esp-t-0">De <strong class="cor-tinta">${esc(est.nome)}</strong>, prontas para imprimir ou salvar em PDF.${todos.length > 1 ? ` Para outro estudante, troque no <a href="${link('familia/index.html')}">início</a>.` : ''}</p>
      <div class="opcoes">${DECLARACOES.map(([t, nome, desc]) => `<a class="opcao sem-sublinhado" href="${link('familia/declaracao.html')}?tipo=${t}&estudante=${est.id}">${icone('imprimir', 26)}<span>${nome}<small>${desc}</small></span></a>`).join('')}</div>
      <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap esp-t-5"><h2 class="esp-t-0 esp-b-0">Para a matrícula</h2>${botaoOuvir(`Para a matrícula, leve: ${matricula.join('. ')}.`, 'Ouvir a lista')}</div>
      <div class="esp-t-4">${lista(matricula)}</div>
      <h2>Na transferência, leve também</h2>${lista(['Declaração de transferência da escola anterior'])}
      <div class="cartao esp-t-4"><strong>Prazo:</strong> depois de enviar o pedido pelo portal, leve os documentos à secretaria da escola em até 5 dias úteis.</div>
      <h2 id="contato" tabindex="-1">Contato da escola</h2>
      <div class="cartao">
        <strong>Secretaria do C. E. Rio Sergipe</strong>
        <p class="esp-t-1 esp-b-1">Atende de segunda a sexta, das 7h às 17h.</p>
        <p class="texto-suave esp-t-0 esp-b-0">Telefone (fictício): (79) 3000-0000</p>
      </div>`;
    if (location.hash === '#contato') document.getElementById('contato').focus();
  } catch { falhaDados(main, mostrar); }
}
mostrar();
