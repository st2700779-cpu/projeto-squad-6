// Calendário letivo e avisos. Serve ao aluno e ao responsável (o perfil vem de <body data-perfil>); o responsável também vê os avisos de reunião de pais.
import { iniciar, falhaDados, controleModoSimples } from '../app.js';
import { esc, vazio, etiqueta } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { carregar, estudantes, escolherEstudante } from '../dados.js';
import { avisosVisiveis } from '../painel-dados.js';
import { seletorDeEstudante } from '../componentes/indicadores.js';

const perfil = document.body.dataset.perfil || 'aluno';
const main = await iniciar({ perfil, pagina: `${perfil}/calendario.html`, assistente: true, titulo: 'Calendário e avisos', estreito: true });
async function mostrar() {
  try {
    const { lista, atual: est } = await estudantes();
    const [cal, avisos] = await Promise.all([carregar('calendario'), avisosVisiveis({ perfil, est })]);
    const doPublico = cal.filter((c) => !c.para || (perfil === 'professor' ? c.para === 'professores' : false));
    const falado = doPublico.map((c) => `${c.titulo}, ${c.data.replace(/\//g, ' de ')}`).join('. ');
    main.innerHTML = `
      <h1>Calendário letivo 2026</h1>
      ${perfil === 'responsavel' ? `${seletorDeEstudante(lista, est.id)}<div class="esp-b-3">${controleModoSimples()}</div>` : ''}
      ${doPublico.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Datas do calendário letivo</caption>
        <thead><tr><th scope="col">Data</th><th scope="col">Evento</th></tr></thead>
        <tbody>${doPublico.map((c) => `<tr><td class="sem-quebra-texto" data-rotulo="Data">${esc(c.data)}</td><td class="titulo-linha">${esc(c.titulo)}${c.tipo === 'reuniao' ? ` ${etiqueta('Reunião de pais', 'info')}` : ''}</td></tr>`).join('')}</tbody>
      </table></div>
      <div class="linha-botoes">${botaoOuvir(falado, 'Ouvir as datas')}</div>` : vazio('Nenhuma data marcada', 'Provas, feriados e prazos aparecem aqui quando forem definidos.')}
      <h2 id="avisos">Avisos da escola</h2>
      ${avisos.length ? avisos.map((a) => `<article class="aviso-item"><div class="linha-botoes entre"><h3 class="esp-t-0 esp-b-0">${esc(a.titulo)}${a.reuniao ? ` ${etiqueta('Reunião de pais', 'info')}` : ''}</h3>${botaoOuvir(`${a.titulo}. ${a.texto}`, 'Ouvir')}</div><p class="esp-t-2 esp-b-1">${esc(a.texto)}</p><span class="texto-suave texto-pequeno">${esc(a.origem)} · publicado em ${esc(a.data)}</span></article>`).join('') : vazio('Nenhum aviso publicado', 'Os avisos da escola aparecem aqui.')}`;
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('click', (e) => {
  const b = e.target.closest('[data-estudante]');
  if (!b) return;
  escolherEstudante(b.dataset.estudante);
  mostrar().then(() => main.querySelector(`[data-estudante="${b.dataset.estudante}"]`)?.focus());
});
mostrar();
