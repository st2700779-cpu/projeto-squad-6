// Interface do assistente: botão flutuante, painel, estados e mensagens (Tópicos 3.1 e 4.2).
import { esc, icone, $ } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { link } from '../app.js';
import { MSG, SUGESTOES, ACOES } from './mensagens.js';
import { perguntar, modoSemIA, segundosDeCota } from './servicoIA.js';
import { responderSemIA } from './faqLocal.js';
import { pareceDadoPessoal } from './dadosPessoais.js';
import { podeOuvir, ouvir, pararDeOuvir, estaOuvindo } from './voz.js';

const LIMITE = 300;
const SIMULACAO = new URLSearchParams(location.search).get('simular') || window.APP_CONFIG?.simular || '';

export function montarAssistente({ perfil }) {
  const historico = [];
  let enviando = false;
  let ultimaPergunta = '';

  const abrirBotao = document.createElement('button');
  abrirBotao.type = 'button';
  abrirBotao.className = 'assistente-botao';
  abrirBotao.setAttribute('aria-controls', 'assistente');
  abrirBotao.setAttribute('aria-expanded', 'false');
  abrirBotao.innerHTML = `${icone('conversa', 22)}<span>Tirar dúvida</span>`;

  const painel = document.createElement('aside');
  painel.id = 'assistente';
  painel.className = 'assistente-painel';
  painel.hidden = true;
  painel.setAttribute('aria-label', 'Assistente do portal');
  const avisoModo = modoSemIA() ? MSG.modoSemIA : (SIMULACAO ? `Modo de simulação ativo: “${SIMULACAO}”. Nenhuma pergunta vai para a IA.` : '');
  painel.innerHTML = `
    <div class="assistente-topo">
      <div><strong>Assistente do portal</strong><br><span class="texto-suave" style="font-size:.88rem">Responde com as informações cadastradas pela rede.</span></div>
      <button type="button" class="icone-botao" data-fechar aria-label="Fechar assistente">${icone('fechar', 22)}</button>
    </div>
    ${avisoModo ? `<p class="modo-aviso">${esc(avisoModo)}</p>` : ''}
    <div class="assistente-mensagens" aria-live="polite"></div>
    <div class="sugestoes">${(SUGESTOES[perfil] || SUGESTOES.familia).map((s) => `<button type="button" data-sugestao="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    <p class="aviso-dados">${esc(MSG.avisoDados)}</p>
    <p class="erro" id="assistente-erro" role="alert" style="margin:0 1rem"></p>
    <form class="assistente-rodape">
      <label for="assistente-pergunta" class="sr-only">Sua pergunta</label>
      <input id="assistente-pergunta" class="entrada" type="text" maxlength="${LIMITE + 50}" autocomplete="off" placeholder="Escreva sua dúvida" aria-describedby="assistente-erro">
      ${podeOuvir() ? `<button type="button" class="icone-botao" data-microfone aria-label="Falar a pergunta">${icone('microfone', 22)}</button>` : ''}
      <button type="submit" class="icone-botao enviar" aria-label="Enviar pergunta">${icone('enviar', 22)}</button>
    </form>`;
  document.body.append(abrirBotao, painel);

  const lista = $('.assistente-mensagens', painel);
  const campo = $('#assistente-pergunta', painel);
  const erroCampo = $('#assistente-erro', painel);

  function abrir() {
    painel.hidden = false;
    abrirBotao.hidden = true;
    abrirBotao.setAttribute('aria-expanded', 'true');
    if (!lista.children.length) adicionarAssistente(MSG.saudacao, { fonte: false });
    campo.focus();
  }
  function fechar() {
    pararDeOuvir();
    painel.hidden = true;
    abrirBotao.hidden = false;
    abrirBotao.setAttribute('aria-expanded', 'false');
    abrirBotao.focus();
  }
  function rolar() { lista.scrollTop = lista.scrollHeight; }
  function bolha(classe, html) {
    const el = document.createElement('div');
    el.className = `msg ${classe}`;
    el.innerHTML = html;
    lista.appendChild(el);
    rolar();
    return el;
  }
  function adicionarUsuario(texto) { bolha('msg-usuario', `<span>${esc(texto)}</span>`); }
  function adicionarAssistente(texto, { acao = null, fonte = true, semIA = false } = {}) {
    const destino = acao && ACOES[acao];
    bolha('msg-assistente', `
      ${semIA ? `<span class="rotulo-sem-ia">${esc(MSG.semIA)}</span>` : ''}
      <span>${esc(texto)}</span>
      <div class="linha-botoes">${botaoOuvir(texto)}${destino ? `<a class="botao botao-ia" href="${link(destino[0])}">${esc(destino[1])} ${icone('seta', 18)}</a>` : ''}</div>
      ${fonte ? `<span class="fonte">${esc(MSG.fonte)}</span>` : ''}`);
  }
  async function responderPelasFrequentes(pergunta) {
    try {
      const item = await responderSemIA(pergunta);
      adicionarAssistente(item ? item.resposta : MSG.semResposta, { semIA: true, acao: null });
    } catch {
      adicionarAssistente(MSG.semResposta, { semIA: true });
    }
  }
  function bloquear(sim) {
    enviando = sim;
    campo.disabled = sim;
    painel.querySelectorAll('.assistente-rodape button, .sugestoes button').forEach((b) => { b.disabled = sim; });
    campo.placeholder = sim ? 'Aguarde a resposta…' : 'Escreva sua dúvida';
  }

  async function enviar(texto, { reenvio = false } = {}) {
    if (enviando) return;
    const pergunta = texto.trim();
    erroCampo.textContent = '';
    if (!pergunta) { erroCampo.textContent = MSG.erros.ENTRADA_VAZIA; campo.focus(); return; }
    if (pergunta.length > LIMITE) { erroCampo.textContent = MSG.erros.ENTRADA_LONGA; campo.focus(); return; }
    if (pareceDadoPessoal(pergunta)) {
      campo.value = '';
      bolha('msg-falha', `<span>${esc(MSG.erros.DADO_PESSOAL)}</span>`);
      return;
    }
    campo.value = '';
    ultimaPergunta = pergunta;
    if (!reenvio) adicionarUsuario(pergunta);
    bloquear(true);
    const controle = new AbortController();
    const espera = bolha('msg-assistente', `<span><span class="pontos"><i></i><i></i><i></i></span>${esc(MSG.carregando)}</span>
      <div><button type="button" class="botao botao-secundario" data-cancelar>Cancelar</button></div>`);
    espera.querySelector('[data-cancelar]').addEventListener('click', () => controle.abort());

    const tentar = async (vez) => {
      try {
        return await perguntar(pergunta, perfil, historico, controle.signal);
      } catch (e) {
        if (vez === 1 && ['SEM_CONEXAO', 'SERVICO_INDISPONIVEL'].includes(e.codigo) && !controle.signal.aborted) {
          await new Promise((ok) => setTimeout(ok, 2000));
          if (controle.signal.aborted) throw Object.assign(new Error('CANCELADO'), { codigo: 'CANCELADO' });
          return tentar(2);
        }
        throw e;
      }
    };

    try {
      const r = await tentar(1);
      espera.remove();
      adicionarAssistente(r.resposta, { acao: r.acao });
      historico.push({ papel: 'usuario', texto: pergunta }, { papel: 'assistente', texto: r.resposta });
    } catch (e) {
      espera.remove();
      if (e.codigo === 'CANCELADO') { /* o usuário desistiu: volta ao estado inicial sem mensagem de erro */ }
      else if (e.codigo === 'NAO_CONFIGURADO') await responderPelasFrequentes(pergunta);
      else { mostrarFalha(e.codigo); await responderPelasFrequentes(pergunta); }
    } finally {
      bloquear(false);
      campo.focus();
    }
  }

  function mostrarFalha(codigo) {
    const podeTentar = codigo !== 'PAUSADO';
    const el = bolha('msg-falha', `
      <span style="display:flex;gap:.5rem;align-items:flex-start">${icone('alerta', 20)}<strong>${esc(MSG.erros[codigo] || MSG.erros.SERVICO_INDISPONIVEL)}</strong></span>
      ${podeTentar ? `<span>${esc(MSG.dica)}</span><div class="linha-botoes"><button type="button" class="botao" data-tentar>Tentar de novo</button></div>` : ''}`);
    const b = el.querySelector('[data-tentar]');
    if (!b) return;
    b.addEventListener('click', () => enviar(ultimaPergunta, { reenvio: true }));
    if (codigo === 'LIMITE_COTA') {
      const atualizar = () => {
        const s = segundosDeCota();
        b.disabled = s > 0;
        b.textContent = s > 0 ? `Tentar de novo (${s} s)` : 'Tentar de novo';
        if (s > 0) setTimeout(atualizar, 1000);
      };
      atualizar();
    }
  }

  function iniciarVoz() {
    // Segundo toque no microfone para a escuta em vez de abrir outra bolha "Estou ouvindo…".
    if (estaOuvindo()) { pararDeOuvir(); return; }
    const mic = painel.querySelector('[data-microfone]');
    const escuta = bolha('escuta', `<strong>Estou ouvindo…</strong><span class="texto-suave">Fale sua pergunta devagar.</span><div><button type="button" class="botao botao-secundario" data-parar>Parar</button></div>`);
    escuta.querySelector('[data-parar]').addEventListener('click', pararDeOuvir);
    mic?.classList.add('ouvindo');
    ouvir({
      aoEntender: (texto) => {
        escuta.innerHTML = `<span class="texto-suave">Entendi assim:</span><strong>“${esc(texto)}”</strong><span>Está certo?</span>
          <div class="linha-botoes"><button type="button" class="botao" data-sim>Sim, enviar</button><button type="button" class="botao botao-secundario" data-de-novo>Falar de novo</button></div>`;
        escuta.querySelector('[data-sim]').addEventListener('click', () => { escuta.remove(); enviar(texto); });
        escuta.querySelector('[data-de-novo]').addEventListener('click', () => { escuta.remove(); iniciarVoz(); });
      },
      aoFalhar: (codigo) => { escuta.remove(); erroCampo.textContent = MSG.erros[codigo] || MSG.erros.VOZ_NAO_ENTENDIDA; },
      aoTerminar: () => { mic?.classList.remove('ouvindo'); if (escuta.querySelector('[data-parar]')) escuta.remove(); }
    });
  }

  abrirBotao.addEventListener('click', abrir);
  painel.addEventListener('click', (e) => {
    if (e.target.closest('[data-fechar]')) fechar();
    const s = e.target.closest('[data-sugestao]');
    if (s) enviar(s.dataset.sugestao);
    if (e.target.closest('[data-microfone]')) iniciarVoz();
  });
  painel.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
  $('.assistente-rodape', painel).addEventListener('submit', (e) => { e.preventDefault(); enviar(campo.value); });
  if (new URLSearchParams(location.search).has('assistente')) abrir();
}
