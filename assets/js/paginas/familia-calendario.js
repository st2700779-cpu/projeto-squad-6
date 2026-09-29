import { iniciar, falhaDados } from '../app.js';
import { esc, vazio } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { carregar } from '../dados.js';

const main = await iniciar({ perfil: 'familia', assistente: true, titulo: 'Calendário e avisos', voltar: 'familia/index.html', estreito: true });
async function mostrar() {
  try {
    const [cal, avisos] = await Promise.all([carregar('calendario'), carregar('avisos')]);
    const falado = cal.map((c) => `${c.titulo}, ${c.data.replace(/\//g, ' de ')}`).join('. ');
    main.innerHTML = `
      <h1>Calendário letivo 2026</h1>
      ${cal.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Datas do calendário letivo</caption>
        <thead><tr><th scope="col">Data</th><th scope="col">Evento</th></tr></thead>
        <tbody>${cal.map((c) => `<tr><td class="sem-quebra-texto" data-rotulo="Data">${esc(c.data)}</td><td class="titulo-linha">${esc(c.titulo)}</td></tr>`).join('')}</tbody>
      </table></div>
      <div class="linha-botoes">${botaoOuvir(falado, 'Ouvir as datas')}</div>` : vazio('Nenhuma data marcada', 'Provas, feriados e prazos aparecem aqui quando forem definidos.')}
      <h2 id="avisos">Avisos da escola</h2>
      ${avisos.length ? avisos.map((a) => `<article class="aviso-item"><div class="linha-botoes entre"><h3 class="esp-t-0 esp-b-0">${esc(a.titulo)}</h3>${botaoOuvir(`${a.titulo}. ${a.texto}`, '')}</div><p class="esp-t-2 esp-b-1">${esc(a.texto)}</p><span class="texto-suave texto-pequeno">Publicado em ${esc(a.data)}</span></article>`).join('') : vazio('Nenhum aviso publicado', 'Os avisos da escola aparecem aqui.')}`;
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  } catch { falhaDados(main, mostrar); }
}
mostrar();
