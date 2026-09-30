// Boletim falado semanal: resumo por modelo de texto fixo, com botão para ouvir e uma prévia no estilo de mensagem de WhatsApp.
// Nada é enviado: é uma simulação do que a escola mandaria à família.
import { iniciar, falhaDados } from '../app.js';
import { esc, icone } from '../ui.js';
import { carregar, estudantes, diario, letivo, conjunto } from '../dados.js';
import { desempenho } from '../regras.js';
import { faltasDaSemana, disciplinaEmDestaque, avisoRecente, montarBoletim } from '../dominio/boletim-semanal.js';
import { ler, podeLer } from '../acessibilidade.js';

const main = await iniciar({ perfil: 'aluno', pagina: 'aluno/boletim-falado.html', assistente: false });
async function mostrar() {
  try {
    const [{ atual: est }, dia, lv, chamadas, avisos] = await Promise.all([estudantes(), diario(), letivo(), conjunto('chamadas'), carregar('avisos')]);
    const d = desempenho(est, dia, lv.aulasDadas);
    const semana = faltasDaSemana(chamadas, est.turmaId, est.id);
    const foco = disciplinaEmDestaque(d.linhas);
    const ultima = foco.n2 ?? foco.n1;
    const texto = montarBoletim({ nome: est.nome, faltas: semana.faltas, disciplina: foco.materia, nota: ultima, aviso: avisoRecente(avisos) });
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    main.innerHTML = `
      <h1>Boletim falado da semana</h1>
      <p class="pagina-descricao">${semana.de ? `Semana de ${new Date(semana.de + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(semana.ate + 'T12:00:00').toLocaleDateString('pt-BR')}` : 'Sem chamadas registradas nesta semana'} · ${esc(est.nome.split(' ')[0])}</p>
      <p class="rotulo-simulacao">Simulação: nenhuma mensagem é enviada.</p>
      <div class="zap" role="group" aria-label="Prévia da mensagem no estilo de aplicativo de conversa">
        <div class="zap-topo"><span class="zap-avatar" aria-hidden="true">${icone('escola', 20)}</span><span><strong>Escola · mensagem automática</strong><small>Portal Acadêmico</small></span></div>
        <div class="zap-conversa"><div class="zap-balao"><p>${esc(texto)}</p><span class="zap-hora">${hora}<span class="zap-visto" aria-label="Lida">✓✓</span></span></div></div>
      </div>
      <div class="linha-botoes esp-t-3">${podeLer() ? `<button type="button" class="botao" id="ouvir-boletim">${icone('alto', 20)}Ouvir boletim</button>` : '<p class="texto-suave">Este aparelho não lê em voz alta. O texto está na mensagem acima.</p>'}</div>
      <p class="texto-suave texto-pequeno esp-t-3">Faltas da semana, disciplina de menor média e aviso mais recente da escola.</p>`;
    main.querySelector('#ouvir-boletim')?.addEventListener('click', () => ler(texto));
  } catch { falhaDados(main, mostrar); }
}
mostrar();
