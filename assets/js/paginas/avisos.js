// Avisos da escola para professor e escola (mapa de navegação W16). O perfil vem de <body data-perfil>.
import { iniciar, falhaDados, atualizarContadorDeAvisos } from '../app.js';
import { esc, vazio } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { carregar } from '../dados.js';
import { cartaoDeAviso, barraDeLeitura } from '../componentes/avisos.js';
import { avisosDoPerfil, lerLidos, marcarAvisos } from '../avisos-dados.js';
import { chaveDoAviso } from '../dominio/avisos.js';

const perfil = document.body.dataset.perfil;
const main = await iniciar({ perfil, pagina: `${perfil}/avisos.html`, assistente: true });
let listaAtual = [];
async function mostrar() {
  try {
    const [avisos, cal, lidos] = await Promise.all([avisosDoPerfil(perfil), carregar('calendario'), lerLidos()]);
    listaAtual = avisos;
    main.innerHTML = `
      <h1>Avisos da escola</h1>
      ${barraDeLeitura(avisos, lidos)}
      ${avisos.length ? avisos.map((a) => cartaoDeAviso(a, lidos, { nivel: 2, publicado: 'publicado em' })).join(''): vazio('Nenhum aviso publicado', 'Os avisos da escola aparecem aqui.', 'megafone')}
      <h2>Calendário letivo da rede</h2>
      <div class="tabela-rolagem"><table class="tabela min-0"><caption class="sr-only">Próximas datas</caption>
        <thead><tr><th scope="col">Data</th><th scope="col">Evento</th></tr></thead>
        <tbody>${cal.map((c) => `<tr><td class="sem-quebra-texto">${esc(c.data)}</td><td>${esc(c.titulo)}</td></tr>`).join('')}</tbody>
      </table></div>`;
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('click', async (e) => {
  const lido = e.target.closest('[data-lido]');
  if (lido) { await marcarAvisos([lido.dataset.lido], lido.dataset.estado === 'novo'); await mostrar(); atualizarContadorDeAvisos(); main.querySelector(`[data-lido="${CSS.escape(lido.dataset.lido)}"]`)?.focus(); return; }
  if (e.target.closest('[data-todos-lidos]')) { await marcarAvisos(listaAtual.map(chaveDoAviso)); await mostrar(); atualizarContadorDeAvisos(); main.querySelector('.barra-leitura')?.focus(); }
});
mostrar();
