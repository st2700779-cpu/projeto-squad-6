// Avisos da escola para professor e escola (mapa de navegação W16). O perfil vem de <body data-perfil>.
import { iniciar, falhaDados } from '../app.js';
import { esc, vazio } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { carregar } from '../dados.js';

const perfil = document.body.dataset.perfil;
const main = await iniciar({ perfil, pagina: `${perfil}/avisos.html`, assistente: true });
async function mostrar() {
  try {
    const [avisos, cal] = await Promise.all([carregar('avisos'), carregar('calendario')]);
    main.innerHTML = `
      <h1>Avisos</h1>
      ${avisos.length ? avisos.map((a) => `<article class="aviso-item"><div class="d-flex justify-content-between align-items-center gap-2"><h2 class="esp-t-0 esp-b-0 titulo-cartao">${esc(a.titulo)}</h2>${botaoOuvir(`${a.titulo}. ${a.texto}`, '')}</div><p class="esp-t-2 esp-b-2">${esc(a.texto)}</p><span class="texto-suave texto-pequeno">Publicado em ${esc(a.data)}</span></article>`).join('') : vazio('Nenhum aviso publicado', 'Os avisos da escola aparecem aqui.', 'megafone')}
      <h2>Calendário da rede</h2>
      <div class="tabela-rolagem"><table class="tabela min-0"><caption class="sr-only">Próximas datas</caption>
        <thead><tr><th scope="col">Data</th><th scope="col">Evento</th></tr></thead>
        <tbody>${cal.map((c) => `<tr><td class="sem-quebra-texto">${esc(c.data)}</td><td>${esc(c.titulo)}</td></tr>`).join('')}</tbody>
      </table></div>`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
