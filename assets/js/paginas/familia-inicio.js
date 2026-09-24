// W2 · Início da família. Seletor de estudante no topo para quem tem mais de um filho na rede,
// e rematrícula em um toque para quem já é aluno.
import { iniciar, link, falhaDados } from '../app.js';
import { icone, esc, etiqueta } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { carregar, matriculas, estudantes, escolherEstudante } from '../dados.js';
import { nomeCurto, proximaSerie, serieCompleta } from '../regras.js';

const main = await iniciar({ perfil: 'familia', assistente: true });
const cor = (s) => (s === 'Confirmada' ? 'ok' : s === 'Recusada' ? 'erro' : 'atencao');

async function mostrar() {
  try {
    const [{ lista, atual: est }, escolas, pedidos] = await Promise.all([estudantes(), carregar('escolas'), matriculas()]);
    const escola = escolas.find((e) => e.id === est.escolaId);
    const primeiroNome = est.nome.split(' ')[0];
    const meus = pedidos.filter((p) => p.meu);
    const rematricula = meus.find((p) => p.estudanteId === est.id && p.tipo === 'Rematrícula');
    const seguinte = proximaSerie(est.serie);
    const blocos = [
      ['familia/matricula.html', 'Fazer matrícula', 'Nova, rematrícula ou transferência', 'formulario'],
      ['familia/notas.html', 'Ver notas e faltas', `Como ${primeiroNome} está indo`, 'livro'],
      ['familia/documentos.html', 'Documentos e declarações', 'O que levar e declarações para imprimir', 'documento'],
      ['familia/calendario.html', 'Calendário e avisos', 'Provas, feriados e prazos', 'calendario']
    ];
    main.innerHTML = `
      <h1 style="margin-top:.4rem">Olá! O que você quer fazer?</h1>
      ${lista.length > 1 ? `
        <div class="seletor-estudante" role="group" aria-label="Escolha o estudante">
          ${lista.map((e) => `<button type="button" data-estudante="${e.id}" aria-pressed="${e.id === est.id}"><span class="avatar" aria-hidden="true">${esc(e.nome[0])}</span><span>${esc(e.nome.split(' ')[0])}<small>${esc(e.turma)}</small></span></button>`).join('')}
        </div>` : ''}
      <div class="estudante"><span class="avatar" aria-hidden="true">${esc(est.nome[0])}</span><div><strong style="font-size:1.1rem">${esc(est.nome)}</strong><br><span class="texto-suave">${esc(est.turma)} · ${esc(nomeCurto(escola.nome))}</span></div></div>
      ${seguinte ? (rematricula
        ? `<div class="cartao destaque"><strong>Rematrícula para 2027</strong><div class="linha-botoes" style="margin-top:.4rem">${etiqueta(rematricula.situacao, cor(rematricula.situacao))}<span class="texto-suave">Protocolo ${esc(rematricula.protocolo)}</span></div></div>`
        : `<div class="cartao destaque">
            <strong style="font-size:1.1rem">Rematrícula para 2027</strong>
            <p style="margin:.3rem 0 .8rem">${esc(primeiroNome)} continua em ${esc(nomeCurto(escola.nome))}, na ${esc(serieCompleta(seguinte))}. Os dados já estão preenchidos.</p>
            <a class="botao botao-grande botao-largo" href="${link('familia/matricula.html')}?rematricula=${est.id}">${icone('ok', 22)}Confirmar rematrícula</a>
          </div>`) : ''}
      ${blocos.map(([h, t, d, i]) => `<div class="bloco"><a href="${link(h)}"><span class="icone">${icone(i, 30)}</span><span><strong>${t}</strong><small>${d}</small></span></a>${botaoOuvir(`${t}. ${d}.`, '')}</div>`).join('')}
      ${meus.length ? `<h2>Seus pedidos de matrícula</h2>${meus.map((p) => `
        <div class="cartao"><div class="d-flex justify-content-between flex-wrap gap-2"><strong>${esc(p.estudante)}</strong>${etiqueta(p.situacao, cor(p.situacao))}</div>
        <span class="texto-suave">${esc(p.tipo)} · ${esc(p.serie)} · ${esc(nomeCurto(escolas.find((e) => e.id === p.escolaId).nome))} · Protocolo ${esc(p.protocolo)}</span>
        ${p.motivo ? `<p style="margin:.4rem 0 0">Motivo: ${esc(p.motivo)}</p>` : ''}</div>`).join('')}` : ''}
      <p class="aviso-prototipo" style="margin-top:1.5rem">Protótipo de demonstração com dados fictícios.</p>`;
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('click', (e) => {
  const b = e.target.closest('[data-estudante]');
  if (!b) return;
  escolherEstudante(b.dataset.estudante);
  mostrar().then(() => main.querySelector(`[data-estudante="${b.dataset.estudante}"]`)?.focus());
});
mostrar();
