// "Vagas por escola" saiu da rede na rodada 4: as vagas são definidas pela direção de cada escola, ao criar as turmas
// (Direção › Turmas e Direção › Vagas). A SEED e as DREs acompanham as vagas no Mapa de vagas. A página continua existindo para
// quem guardou o endereço antigo.
import { iniciar, link } from '../app.js';
import { icone } from '../ui.js';

const main = await iniciar({ perfil: 'rede', pagina: 'rede/vagas.html', assistente: true, titulo: 'Vagas por escola' });
main.innerHTML = `
  <h1>Vagas por escola</h1>
  <p class="alerta-info">${icone('info', 20)}<span>Esta tela saiu da rede. Quem cadastra a escola não cadastra vagas: a <strong>direção</strong> de cada escola cria as turmas e diz quantas vagas cada uma tem, e as vagas da matrícula nascem dessas turmas.</span></p>
  <p>Para acompanhar as vagas, a procura e a lista de espera por bairro, use o Mapa de vagas. As contas das DREs e da DEA também consultam as turmas e as vagas de cada escola da sua regional em Escolas, no botão Turmas e vagas.</p>
  <p><a class="botao" href="${link('rede/mapa.html')}">${icone('mapa', 20)}Abrir o Mapa de vagas</a></p>`;
