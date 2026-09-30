import { iniciar, falhaDados } from '../app.js';
import { esc, etiqueta } from '../ui.js';
import { carregar } from '../dados.js';

const main = await iniciar({ perfil: 'rede', pagina: 'rede/matrizes.html', assistente: true });
async function mostrar() {
  try {
    const m = await carregar('matrizes');
    const [nova, antiga] = m.versoes;
    const tabela = (v, ref) => `<div class="tabela-rolagem"><table class="tabela min-0"><caption class="sr-only">Matriz versão ${esc(v.versao)}</caption>
      <thead><tr><th scope="col">Componente</th><th scope="col" class="num">1ª série</th><th scope="col" class="num">2ª série</th><th scope="col" class="num">3ª série</th></tr></thead>
      <tbody>${v.componentes.map(([c, ...h]) => {
        const o = ref?.componentes.find((x) => x[0] === c);
        const marca = ref ? (!o ? etiqueta('Novo', 'info') : h.some((x, i) => x !== o[i + 1]) ? etiqueta('Carga alterada', 'atencao') : '') : '';
        return `<tr><td>${esc(c)} ${marca}</td>${h.map((x) => `<td class="num">${x}</td>`).join('')}</tr>`;
      }).join('')}</tbody></table></div>`;
    main.innerHTML = `
      <h1>Matrizes curriculares</h1>
      <p class="texto-suave">${esc(m.curso)} · aulas por semana. Cada estudante segue a versão da matriz do ano em que entrou.</p>
      <h2>Versão ${esc(nova.versao)} ${etiqueta(nova.aplicacao, 'ok')}</h2>${tabela(nova, antiga)}
      <h2>Versão ${esc(antiga.versao)} ${etiqueta(antiga.aplicacao, 'neutra')}</h2>${tabela(antiga)}`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
