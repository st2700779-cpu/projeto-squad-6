import { iniciar, link, falhaDados } from '../app.js';
import { icone, esc } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { carregar } from '../dados.js';

const main = await iniciar({ perfil: 'familia', assistente: true });
async function mostrar() {
  try {
    const [cal, avisos] = await Promise.all([carregar('calendario'), carregar('avisos')]);
    main.innerHTML = `
      <a class="voltar" href="${link('familia/index.html')}">${icone('voltar', 20)}Voltar ao início</a>
      <h1 style="margin-top:.5rem">Calendário e avisos</h1>
      <h2>Próximas datas</h2>
      ${cal.map((c) => `<div class="cartao d-flex justify-content-between align-items-center gap-2"><div><strong>${esc(c.titulo)}</strong><br><span class="texto-suave">${esc(c.data)}</span></div>${botaoOuvir(`${c.titulo}, ${c.data.replace(/\//g, ' de ')}`, '')}</div>`).join('')}
      <h2 id="avisos">Avisos da escola</h2>
      ${avisos.map((a) => `<article class="cartao"><div class="d-flex justify-content-between align-items-center gap-2"><h3 style="margin:0">${esc(a.titulo)}</h3>${botaoOuvir(`${a.titulo}. ${a.texto}`)}</div><p style="font-size:1.05rem;margin:.5rem 0">${esc(a.texto)}</p><span class="texto-suave" style="font-size:.9rem">Publicado em ${esc(a.data)}</span></article>`).join('')}`;
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  } catch { falhaDados(main, mostrar); }
}
mostrar();
