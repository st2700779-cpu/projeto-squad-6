// Carteirinha digital do estudante: foto (avatar fictício), dados, validade, QR Code de verificação e uma faixa com data e hora
// atuais para dificultar print falsificado. Abre sem internet depois do primeiro acesso (sw.js).
import { iniciar, falhaDados } from '../app.js';
import { esc, icone, dataBR } from '../ui.js';
import { carregar, estudantes } from '../dados.js';
import { qrParaElemento } from '../qr.js';
import { codigoDeVerificacao, verificacaoDisponivel } from '../dominio/verificacao.js';
import { serieCompleta } from '../regras.js';

const main = await iniciar({ perfil: 'aluno', pagina: 'aluno/carteirinha.html', assistente: false });
let instalar = null; // evento beforeinstallprompt guardado

const iniciais = (nome) => nome.split(' ').filter((p) => p.length > 2).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const agora = () => new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

async function mostrar() {
  try {
    const [{ atual: est }, escolas] = await Promise.all([estudantes(), carregar('escolas')]);
    const escola = escolas.find((e) => e.id === est.escolaId);
    const vencida = new Date().toISOString().slice(0, 10) > est.validade;
    const codigo = verificacaoDisponivel()
      ? await codigoDeVerificacao({ tipo: 'carteirinha', fonte: 'E', chave: est.matricula, nome: est.nome, nascimento: est.nascimento, serie: est.serie, turma: est.turma, escola: escola.nome })
      : null;
    const url = codigo ? new URL(`verificar.html?codigo=${codigo}`, location.href.replace(/aluno\/[^/]*$/, '')).href : '';
    main.innerHTML = `
      <h1>Carteirinha</h1>
      <p class="pagina-descricao">Apresente na entrada da escola. Abre também sem internet.</p>
      <article class="carteirinha${vencida ? ' vencida' : ''}" aria-label="Carteirinha de ${esc(est.nome)}">
        <header><span>Rede Estadual de Ensino de Sergipe</span><strong>Carteirinha do estudante ${new Date().getFullYear()}</strong></header>
        <div class="carteirinha-corpo">
          <div class="avatar-carteirinha" aria-hidden="true">${esc(iniciais(est.nome))}</div>
          <dl>
            <dt>Nome</dt><dd class="nome">${esc(est.nome)}</dd>
            <dt>Escola</dt><dd>${esc(escola.nome)}</dd>
            <dt>Série e turma</dt><dd>${esc(serieCompleta(est.serie))} · ${esc(est.turma)} · ${esc(est.turno)}</dd>
            <dt>Matrícula</dt><dd class="mono">${esc(est.matricula)}</dd>
            <dt>Validade</dt><dd>${vencida ? 'Vencida em ' : 'Até '}${dataBR(est.validade)}</dd>
          </dl>
          <div class="carteirinha-qr">
            ${codigo ? `<div class="qr-cart" data-qr="${esc(url)}"></div><p class="mono">${esc(codigo)}</p>` : '<p class="texto-pequeno">Código de verificação indisponível neste endereço (precisa de https ou localhost).</p>'}
          </div>
        </div>
        <footer class="carteirinha-faixa">
          <span class="ponto" aria-hidden="true"></span>
          <span class="sr-only">${vencida ? 'Carteirinha vencida.' : 'Carteirinha válida.'} A data e a hora na faixa mudam a cada segundo.</span>
          <span aria-hidden="true">Conferido em <time id="agora">${agora()}</time></span>
        </footer>
      </article>
      <p class="texto-suave texto-pequeno">A faixa com data e hora dificulta cópia por print. A autenticidade se confere pelo código do QR.</p>
      <div class="linha-botoes esp-t-3">
        <button type="button" class="botao" id="instalar" hidden>${icone('celular', 20)}Adicionar à tela inicial</button>
        <a class="botao botao-secundario" href="verificar.html${codigo ? `?codigo=${codigo}` : ''}">Verificar este código</a>
      </div>
      <p class="texto-suave texto-pequeno" id="dica-instalar" role="status"></p>
      <p class="texto-suave texto-pequeno" id="estado-rede" role="status"></p>`;
    const qr = main.querySelector('[data-qr]');
    if (qr) qrParaElemento(qr, qr.dataset.qr, 132);
    setInterval(() => { const t = main.querySelector('#agora'); if (t) t.textContent = agora(); }, 1000);
    avisosDeInstalacao();
  } catch { falhaDados(main, mostrar); }
}

function avisosDeInstalacao() {
  const botao = main.querySelector('#instalar');
  const dica = main.querySelector('#dica-instalar');
  const rede = main.querySelector('#estado-rede');
  const atualizarRede = () => { rede.textContent = navigator.onLine ? '' : 'Sem internet: esta carteirinha está aberta a partir do que foi guardado neste aparelho.'; };
  addEventListener('online', atualizarRede); addEventListener('offline', atualizarRede); atualizarRede();
  if (instalar) botao.hidden = false;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); instalar = e; botao.hidden = false; });
  addEventListener('appinstalled', () => { instalar = null; botao.hidden = true; dica.textContent = 'Portal instalado neste aparelho.'; });
  botao.addEventListener('click', async () => {
    if (!instalar) return;
    instalar.prompt();
    await instalar.userChoice.catch(() => {});
    instalar = null; botao.hidden = true;
  });
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone;
  if (ios) dica.textContent = 'No iPhone: toque em Compartilhar e depois em Adicionar à Tela de Início.';
}
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); instalar = e; main.querySelector('#instalar')?.removeAttribute('hidden'); });
mostrar();
