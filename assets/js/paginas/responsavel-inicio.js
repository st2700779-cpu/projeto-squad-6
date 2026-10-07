// Início do responsável: escolhe o filho, vê numa tela só o que precisa de atenção (frequência, notas, documentos e datas)
// e tem o modo simplificado (nota, faltas e próxima data). Semáforo sempre com cor, símbolo e palavra.
import { iniciar, link, falhaDados, controleModoSimples } from '../app.js';
import { sessao } from '../auth.js';
import { esc, icone, numeroBR, plural } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { carregar, estudantes, escolherEstudante } from '../dados.js';
import { painelDoEstudante, avisosVisiveis } from '../painel-dados.js';
import { prioridades, semaforoNota, mediaGeral, PRESENCA_MINIMA } from '../regras.js';
import { semaforo, seletorDeEstudante, dataPorExtenso, diaMes } from '../componentes/indicadores.js';

const main = await iniciar({ perfil: 'responsavel', pagina: 'responsavel/index.html', assistente: true });
const DESTINO = { frequencia: 'responsavel/boletim.html', notas: 'responsavel/boletim.html', documentos: 'responsavel/matricula.html', calendario: 'responsavel/calendario.html' };
const ROTULO_LINK = { frequencia: 'Ver faltas', notas: 'Ver boletim', documentos: 'Ver documentos', calendario: 'Ver calendário' };

async function mostrar() {
  try {
    const { lista, atual: est } = await estudantes();
    const [p, calendario, avisos] = await Promise.all([painelDoEstudante(est), carregar('calendario'), avisosVisiveis({ perfil: 'responsavel', est })]);
    const { d, margem, semFreq, hoje } = p;
    const nome = est.nome.split(' ')[0];
    const media = mediaGeral(Object.fromEntries(d.linhas.map((l) => [l.materia, l.media])));
    const semMedia = media === null ? { chave: 'neutro', icone: '', texto: 'Sem notas' } : semaforoNota(media);
    const eventos = calendario.filter((c) => !c.para);
    const itens = prioridades({ nome, presenca: d.presenca, margem, linhas: d.linhas, documentos: est.documentos, eventos, hoje });
    const urgentes = itens.filter((i) => i.ordem < 6);
    const proximo = itens.find((i) => i.destino === 'calendario');
    const proximoEvento = eventos.filter((e) => e.inicio >= hoje).sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
    const ultimoAviso = avisos[0];
    const falado = `${est.nome}. ${itens.length ? itens.map((i) => `${i.titulo}. ${i.texto}`).join(' ') : 'Nada precisa da sua atenção agora.'}`;
    main.innerHTML = `
      <header class="heroi">
        <span class="heroi-selo">Acompanhe de perto</span>
        <h1>Olá, ${esc((sessao()?.nome || '').split(' ')[0] || 'responsável')}</h1>
        <p class="heroi-linha">Veja como ${esc(nome)} está na escola. Cor, símbolo e palavra mostram a situação.</p>
      </header>
      ${seletorDeEstudante(lista, est.id)}
      <div class="esp-b-3">${controleModoSimples()}</div>
      <div class="resumo-filho">
        <div><dl><dt>Nota</dt><dd>${media === null ? '—' : numeroBR(media)}</dd></dl>${semaforo(semMedia)}</div>
        <div><dl><dt>Frequência</dt><dd>${numeroBR(d.presenca)}%</dd></dl>${semaforo(semFreq)}<p class="texto-suave esp-t-2 esp-b-0 so-completo">${d.faltas} ${plural(d.faltas, 'falta', 'faltas')} · mínimo ${PRESENCA_MINIMA}%</p></div>
        <div><dl><dt>Próxima data</dt><dd>${proximoEvento ? diaMes(proximoEvento.inicio) : '—'}</dd></dl><span>${proximoEvento ? esc(proximoEvento.titulo) : 'Nenhuma data marcada'}</span>${proximo ? `<p class="esp-t-2 esp-b-0">${semaforo(proximo.nivel)}</p>` : ''}</div>
      </div>
      <section aria-labelledby="atencao-titulo" id="painel-prioridade" class="so-completo">
        <h2 id="atencao-titulo" class="esp-t-0">O que precisa da sua atenção</h2>
        ${urgentes.length ? `<ul class="prioridades">${itens.map((i) => `<li class="prioridade nivel-${i.nivel.chave}">${semaforo({ ...i.nivel, texto: '' })}<p><strong>${esc(i.titulo)}</strong>${esc(i.texto)} <span class="quando">${esc(i.nivel.texto)}</span></p><a class="botao botao-secundario" href="${link(DESTINO[i.destino])}">${ROTULO_LINK[i.destino]}</a></li>`).join('')}</ul>` : `<p class="fila-ok">${icone('ok', 24)}Nada urgente agora. Tudo certo com ${esc(nome)}.</p>${itens.length ? `<ul class="prioridades">${itens.map((i) => `<li class="prioridade nivel-${i.nivel.chave}">${semaforo({ ...i.nivel, texto: '' })}<p><strong>${esc(i.titulo)}</strong>${esc(i.texto)} <span class="quando">${esc(i.nivel.texto)}</span></p><a class="botao botao-secundario" href="${link(DESTINO[i.destino])}">${ROTULO_LINK[i.destino]}</a></li>`).join('')}</ul>` : ''}`}
        <div class="linha-botoes esp-t-3">${botaoOuvir(falado, 'Ouvir o que precisa de atenção')}</div>
      </section>
      <div class="linha-botoes esp-t-4 esp-b-4">
        <a class="botao" href="${link('responsavel/boletim.html')}">${icone('livro', 22)}Ver boletim</a>
        <a class="botao botao-secundario so-completo" href="${link('responsavel/calendario.html')}">${icone('calendario', 22)}Calendário e avisos</a>
        <a class="botao botao-secundario so-completo" href="${link('responsavel/matricula.html')}">${icone('documento', 22)}Matrícula e documentos</a>
      </div>
      ${ultimoAviso ? `<section class="so-completo" aria-labelledby="aviso-titulo"><h2 id="aviso-titulo">Último aviso da escola</h2><article class="aviso-item"><div class="linha-botoes entre"><h3 class="esp-t-0 esp-b-0">${esc(ultimoAviso.titulo)}</h3>${botaoOuvir(`${ultimoAviso.titulo}. ${ultimoAviso.texto}`, 'Ouvir')}</div><p class="esp-t-2 esp-b-1">${esc(ultimoAviso.texto)}</p><span class="texto-suave texto-pequeno">${esc(ultimoAviso.origem)} · ${esc(ultimoAviso.data)}</span></article></section>` : ''}
      <p class="texto-suave texto-pequeno so-completo">Hoje é ${esc(dataPorExtenso(hoje))}.</p>`;
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('click', (e) => {
  const b = e.target.closest('[data-estudante]');
  if (!b) return;
  escolherEstudante(b.dataset.estudante);
  mostrar().then(() => main.querySelector(`[data-estudante="${b.dataset.estudante}"]`)?.focus());
});
mostrar();
