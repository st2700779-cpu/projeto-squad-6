// Estado de conexão do diário offline: indicador fixo (online/offline), contador de registros pendentes e botão que simula a
// falta de internet para a demonstração. O "servidor" do protótipo é o próprio navegador; a fila fica em IndexedDB (idb.js).
import { esc, icone } from './ui.js';
import { gravar, listar, remover, buscar } from './idb.js';

const CHAVE_SIMULACAO = 'portal-offline-simulado';
export const simulado = () => { try { return sessionStorage.getItem(CHAVE_SIMULACAO) === '1'; } catch { return false; } };
/** Só online se o navegador diz que há rede e a simulação de "ficar offline" está desligada. */
export const estaOnline = () => navigator.onLine && !simulado();

function definirSimulacao(ligada) {
  try { if (ligada) sessionStorage.setItem(CHAVE_SIMULACAO, '1'); else sessionStorage.removeItem(CHAVE_SIMULACAO); } catch { /* sem armazenamento: a simulação vale só até recarregar */ }
  window.dispatchEvent(new Event('conexao-mudou'));
}
addEventListener('online', () => window.dispatchEvent(new Event('conexao-mudou')));
addEventListener('offline', () => window.dispatchEvent(new Event('conexao-mudou')));

const avisarMudanca = () => window.dispatchEvent(new Event('pendentes-mudaram'));
/** Grava (ou substitui) um registro pendente. */
export async function guardarPendente(registro) { await gravar({ ...registro, status: 'pendente' }); avisarMudanca(); }
export async function pendentes() { try { return await listar(); } catch { return []; } }
export async function baixarPendente(chave) { await remover(chave); avisarMudanca(); }
export const pendentePorChave = (chave) => buscar(chave).catch(() => undefined);

/**
 * Cria o indicador fixo. `aoSincronizar` roda quando a conexão volta com registros na fila (ou no botão Sincronizar agora).
 * @returns {{atualizar: () => Promise<void>}}
 */
export function montarIndicador({ aoSincronizar }) {
  const el = document.createElement('div');
  el.className = 'estado-conexao';
  el.setAttribute('role', 'status');
  (document.querySelector('.topo') || document.body).after(el);
  let ultimoOnline = estaOnline();
  let sincronizando = false;
  async function atualizar() {
    const n = (await pendentes()).length;
    const on = estaOnline();
    const motivo = !navigator.onLine ? 'sem internet' : 'simulado';
    el.className = `estado-conexao ${on ? 'on' : 'off'}`;
    el.innerHTML = `<span class="ponto" aria-hidden="true"></span>
      <strong>${on ? 'Online' : `Offline (${motivo})`}</strong>
      <span class="pendentes">${n ? `${n} ${n === 1 ? 'registro pendente' : 'registros pendentes'}` : 'nada pendente'}</span>
      ${on && n ? `<button type="button" class="botao botao-mini" data-sincronizar ${sincronizando ? 'disabled' : ''}>Sincronizar agora</button>` : ''}
      <button type="button" class="botao botao-secundario botao-mini" data-simular aria-pressed="${simulado()}">${icone('semrede', 16)}${simulado() ? 'Voltar online' : 'Ficar offline'}</button>`;
  }
  async function sincronizar() {
    if (sincronizando || !estaOnline()) return;
    sincronizando = true; await atualizar();
    try { await aoSincronizar(); } finally { sincronizando = false; await atualizar(); }
  }
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-simular]')) definirSimulacao(!simulado());
    if (e.target.closest('[data-sincronizar]')) sincronizar();
  });
  addEventListener('pendentes-mudaram', atualizar);
  addEventListener('conexao-mudou', async () => {
    const on = estaOnline();
    await atualizar();
    if (on && !ultimoOnline && (await pendentes()).length) await sincronizar();
    ultimoOnline = on;
  });
  atualizar();
  if (estaOnline()) pendentes().then((p) => { if (p.length) sincronizar(); });
  return { atualizar };
}
