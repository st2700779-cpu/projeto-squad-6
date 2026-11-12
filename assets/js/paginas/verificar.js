// Página pública de verificação de documentos (sem login). Recalcula o código a partir do arquivo central de dados.
import { iniciar, link } from '../app.js';
import { esc, icone, comEspera } from '../ui.js';
import { carregar } from '../dados.js';
import { TIPOS, ANO_LETIVO, limparCodigo, procurarDocumento, verificacaoDisponivel } from '../dominio/verificacao.js';
import { serieCompleta } from '../regras.js';

const main = await iniciar();
const inicial = new URLSearchParams(location.search).get('codigo') || '';

function resultado(doc, codigo) {
  if (doc === 'indisponivel') return `<div class="alerta-erro" role="status">${icone('alerta', 20)}<span>A verificação precisa do navegador em conexão segura. Abra esta página pelo endereço publicado (https) ou por localhost.</span></div>`;
  if (!doc) {
    return `<div class="alerta-erro" role="status">${icone('alerta', 20)}<div><strong>Documento não encontrado</strong><br>Nenhum documento do cadastro central gera o código ${esc(codigo)}. Confira os caracteres. Documentos de matrículas feitas ou confirmadas depois da última atualização do cadastro ainda não podem ser verificados.</div></div>`;
  }
  const nota = doc.tipo === 'frequencia' ? 'O percentual de frequência escrito no documento não é conferido aqui: a verificação confirma o estudante, a escola e a série.' : 'Os dados essenciais conferem com o cadastro central da rede.';
  return `<div class="resultado-verificacao" role="status"><p class="selo-autentico">${icone('verificado', 26)}Documento autêntico</p>
    <dl class="dados-verificacao">
      <dt>Documento</dt><dd>${esc(TIPOS[doc.tipo])}</dd>
      <dt>Estudante</dt><dd>${esc(doc.nome)}</dd>
      <dt>${doc.fonte === 'P' ? 'Protocolo' : 'Matrícula'}</dt><dd>${esc(doc.chave)}</dd>
      <dt>Série</dt><dd>${esc(serieCompleta(doc.serie))}</dd>
      <dt>Escola</dt><dd>${esc(doc.escola)}</dd>
      <dt>Ano letivo</dt><dd>${ANO_LETIVO}</dd>
    </dl><p class="texto-suave texto-pequeno">${nota} O código não informa a data de emissão.</p></div>`;
}

async function verificar(texto) {
  const alvo = main.querySelector('#resultado');
  const codigo = limparCodigo(texto);
  if (!codigo) { alvo.innerHTML = `<p class="erro" role="alert">O código tem 10 letras e números, no formato XXXX-XXXX-XX.</p>`; main.querySelector('#codigo').setAttribute('aria-invalid', 'true'); main.querySelector('#codigo').focus(); return; }
  main.querySelector('#codigo').removeAttribute('aria-invalid');
  if (!verificacaoDisponivel()) { alvo.innerHTML = resultado('indisponivel'); return; }
  await comEspera(main.querySelector('#verificar'), async () => {
    try {
      const [estudantes, matriculas, escolas] = await Promise.all([carregar('estudantes'), carregar('matriculas'), carregar('escolas')]);
      const doc = await procurarDocumento(codigo, { estudantes, matriculas, escolas });
      alvo.innerHTML = resultado(doc, `${codigo.slice(0, 4)}-${codigo.slice(4, 8)}-${codigo.slice(8)}`);
    } catch { alvo.innerHTML = `<div class="alerta-erro" role="alert">${icone('alerta', 20)}<span>Não foi possível consultar o cadastro agora. Confira a conexão e clique em Verificar de novo.</span></div>`; }
  });
}

main.innerHTML = `
  <h1>Verificar documento</h1>
  <p class="pagina-descricao">Digite o código impresso no rodapé da declaração ou da carteirinha, ou leia o QR Code.</p>
  <form id="form-verificar" class="form-login" novalidate>
    <div class="campo"><label for="codigo">Código de verificação</label>
      <input id="codigo" class="entrada" type="text" data-formato="codigo" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XX" maxlength="14" value="${esc(inicial)}">
      <span class="dica">Exemplo: 1A2B-3C4D-5E</span></div>
    <button type="submit" class="botao botao-grande" id="verificar">Verificar</button>
  </form>
  <div id="resultado" class="esp-t-4" aria-live="polite"></div>
  <p class="esp-t-5"><a href="${link('index.html')}">Voltar à entrada</a></p>`;
main.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); verificar(main.querySelector('#codigo').value); });
if (inicial) verificar(inicial);
