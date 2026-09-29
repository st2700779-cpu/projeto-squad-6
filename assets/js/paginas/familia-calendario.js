import { iniciar, falhaDados } from '../app.js';
import { esc, vazio } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { carregar } from '../dados.js';

const main = await iniciar({ perfil: 'familia', assistente: true, titulo: 'Calendário e avisos', voltar: 'familia/index.html' });
async function mostrar() {
  try {
    const [cal, avisos] = await Promise.all([carregar('calendario'), carregar('avisos')]);
    main.innerHTML = `
      <h1>Próximas datas</h1>
      ${cal.length ? cal.map((c) => `<div class="cartao d-flex justify-content-between align-items-center gap-2"><div><strong>${esc(c.titulo)}</strong><br><span class="texto-suave">${esc(c.data)}</span></div>${botaoOuvir(`${c.titulo}, ${c.data.replace(/\//g, ' de ')}`, '')}</div>`).join('') : vazio('Nenhuma data marcada', 'Provas, feriados e prazos aparecem aqui quando forem definidos.', 'calendario')}
      <h2 id="avisos">Avisos da escola</h2>
      ${avisos.length ? avisos.map((a) => `<article class="cartao"><div class="d-flex justify-content-between align-items-center gap-2"><h3 class="esp-t-0 esp-b-0">${esc(a.titulo)}</h3>${botaoOuvir(`${a.titulo}. ${a.texto}`)}</div><p class="texto-medio esp-t-2 esp-b-2">${esc(a.texto)}</p><span class="texto-suave texto-pequeno">Publicado em ${esc(a.data)}</span></article>`).join('') : vazio('Nenhum aviso publicado', 'Os avisos da escola aparecem aqui.', 'megafone')}`;
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  } catch { falhaDados(main, mostrar); }
}
mostrar();
