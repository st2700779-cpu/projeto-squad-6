import { iniciar, link } from '../app.js';
import { icone, esc } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';

const main = await iniciar({ perfil: 'familia', assistente: true });
const matricula = ['Certidão de nascimento ou RG do estudante', 'CPF do estudante, se tiver', 'Comprovante de residência (conta de luz ou de água)', 'Documento com foto do responsável'];
const lista = (itens) => `<ul class="opcoes" style="list-style:none;padding:0">${itens.map((x) => `<li class="opcao" style="cursor:default">${icone('documento', 26)}<span style="flex:1">${esc(x)}</span>${botaoOuvir(x, '')}</li>`).join('')}</ul>`;
main.innerHTML = `
  <a class="voltar" href="${link('familia/index.html')}">${icone('voltar', 20)}Voltar ao início</a>
  <h1 style="margin-top:.5rem">Documentos</h1>
  <h2>Para a matrícula</h2>${botaoOuvir(`Para a matrícula, leve: ${matricula.join('. ')}.`, 'Ouvir a lista')}
  <div style="margin-top:.8rem">${lista(matricula)}</div>
  <h2>Na transferência, leve também</h2>${lista(['Declaração de transferência da escola anterior'])}
  <div class="cartao" style="margin-top:1rem"><strong>Prazo:</strong> depois de enviar o pedido pelo portal, leve os documentos à secretaria da escola em até 5 dias úteis.</div>`;
