// Documentos para a matrícula e contato da secretaria (destino de "Contato da escola" no assistente).
import { iniciar } from '../app.js';
import { icone, esc } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';

const main = await iniciar({ perfil: 'familia', assistente: true, titulo: 'Documentos', voltar: 'familia/index.html' });
const matricula = ['Certidão de nascimento ou RG do estudante', 'CPF do estudante, se tiver', 'Comprovante de residência (conta de luz ou de água)', 'Documento com foto do responsável'];
const lista = (itens) => `<ul class="opcoes" style="list-style:none;padding:0">${itens.map((x) => `<li class="opcao" style="cursor:default;font-weight:400">${icone('documento', 26)}<span>${esc(x)}</span>${botaoOuvir(x, '')}</li>`).join('')}</ul>`;
main.innerHTML = `
  <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap"><h1 style="margin:0">Para a matrícula</h1>${botaoOuvir(`Para a matrícula, leve: ${matricula.join('. ')}.`, 'Ouvir a lista')}</div>
  <div style="margin-top:1rem">${lista(matricula)}</div>
  <h2>Na transferência, leve também</h2>${lista(['Declaração de transferência da escola anterior'])}
  <div class="cartao" style="margin-top:1rem"><strong>Prazo:</strong> depois de enviar o pedido pelo portal, leve os documentos à secretaria da escola em até 5 dias úteis.</div>
  <h2 id="contato" tabindex="-1">Contato da escola</h2>
  <div class="cartao">
    <strong>Secretaria do C. E. Rio Sergipe</strong>
    <p style="margin:.3rem 0">Atende de segunda a sexta, das 7h às 17h.</p>
    <p class="texto-suave" style="margin:0">Telefone (fictício): (79) 3000-0000</p>
  </div>`;
if (location.hash === '#contato') document.getElementById('contato').focus();
