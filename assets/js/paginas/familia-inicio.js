// W2 · Início da família.
import { iniciar, link, falhaDados } from '../app.js';
import { icone, esc, etiqueta } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { carregar, matriculas } from '../dados.js';
import { nomeCurto } from '../regras.js';

const main = await iniciar({ perfil: 'familia', assistente: true });
async function mostrar() {
  try {
    const [est, escolas, pedidos] = await Promise.all([carregar('estudante'), carregar('escolas'), matriculas()]);
    const escola = escolas.find((e) => e.id === est.escolaId);
    const meus = pedidos.filter((p) => p.meu);
    const primeiroNome = est.nome.split(' ')[0];
    const blocos = [
      ['familia/matricula.html', 'Fazer matrícula', 'Nova, rematrícula ou transferência', 'formulario'],
      ['familia/notas.html', 'Ver notas e faltas', `Como a ${primeiroNome} está indo`, 'livro'],
      ['familia/documentos.html', 'Documentos', 'O que levar à escola', 'documento'],
      ['familia/calendario.html', 'Calendário e avisos', 'Provas, feriados e prazos', 'calendario']
    ];
    main.innerHTML = `
      <h1 style="margin-top:.4rem">Olá! O que você quer fazer?</h1>
      <div class="estudante"><span class="avatar" aria-hidden="true">${esc(est.nome[0])}</span><div><strong style="font-size:1.1rem">${esc(est.nome)}</strong><br><span class="texto-suave">${esc(est.turma)} · ${esc(nomeCurto(escola.nome))}</span></div></div>
      ${blocos.map(([h, t, d, i]) => `<div class="bloco"><a href="${link(h)}"><span class="icone">${icone(i, 30)}</span><span><strong>${t}</strong><small>${d}</small></span></a>${botaoOuvir(`${t}. ${d}.`, '')}</div>`).join('')}
      ${meus.length ? `<h2>Seus pedidos de matrícula</h2>${meus.map((p) => `
        <div class="cartao"><div class="d-flex justify-content-between flex-wrap gap-2"><strong>${esc(p.estudante)}</strong>${etiqueta(p.situacao, p.situacao === 'Confirmada' ? 'ok' : p.situacao === 'Recusada' ? 'erro' : 'atencao')}</div>
        <span class="texto-suave">${esc(p.serie)} · ${esc(nomeCurto(escolas.find((e) => e.id === p.escolaId).nome))} · Protocolo ${esc(p.protocolo)}</span>
        ${p.motivo ? `<p style="margin:.4rem 0 0">Motivo: ${esc(p.motivo)}</p>` : ''}</div>`).join('')}` : ''}
      <p class="aviso-prototipo" style="margin-top:1.5rem">Protótipo de demonstração com dados fictícios.</p>`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
