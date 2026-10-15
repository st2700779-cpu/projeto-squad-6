// Service worker do Portal Acadêmico (JavaScript puro, sem biblioteca).
// - Instalação: guarda em cache as páginas e arquivos que a carteirinha digital e o diário do professor precisam para abrir
//   sem internet, além de Bootstrap, fonte e qrcodejs das CDNs. A lista NUCLEO e a VERSAO são geradas: rode  node tools/gerar-sw.mjs  depois de acrescentar arquivos a essas telas.
// - Uso: arquivos do próprio site vão "rede primeiro" (a versão nova aparece quando há internet e a guardada serve quando não há);
//   arquivos de CDN vão "cache primeiro". A API local (/api/) nunca passa pelo cache.
// Só funciona em https ou localhost.
const VERSAO = 'portal-18a870e4';
const NUCLEO = [
  "index.html",
  "login.html",
  "verificar.html",
  "manifest.json",
  "config.js",
  "aluno/boletim-falado.html",
  "aluno/cadastro.html",
  "aluno/calendario.html",
  "aluno/carteirinha.html",
  "aluno/declaracao.html",
  "aluno/documentos.html",
  "aluno/frequencia.html",
  "aluno/horario.html",
  "aluno/index.html",
  "aluno/linha-do-tempo.html",
  "aluno/notas.html",
  "aluno/quiz.html",
  "aluno/rotina.html",
  "professor/avisos.html",
  "professor/comunicados.html",
  "professor/diario.html",
  "professor/horario.html",
  "professor/index.html",
  "professor/mapa.html",
  "professor/materiais.html",
  "professor/plano-aula.html",
  "professor/registro-aula.html",
  "assets/css/acesso.css",
  "assets/css/assistente.css",
  "assets/css/balcao.css",
  "assets/css/componentes.css",
  "assets/css/documento.css",
  "assets/css/layout.css",
  "assets/css/mapa.css",
  "assets/css/painel.css",
  "assets/css/tema.css",
  "assets/css/tour.css",
  "assets/img/icone-192.png",
  "assets/img/icone-512.png",
  "assets/img/icone.svg",
  "assets/js/acessibilidade.js",
  "assets/js/app.js",
  "assets/js/auth.js",
  "assets/js/avisos-dados.js",
  "assets/js/componentes/avisos.js",
  "assets/js/componentes/comparativo.js",
  "assets/js/componentes/declaracao.js",
  "assets/js/componentes/equipe-profin.js",
  "assets/js/componentes/formulario.js",
  "assets/js/componentes/indicadores.js",
  "assets/js/componentes/linha-do-tempo.js",
  "assets/js/componentes/pedidos.js",
  "assets/js/componentes/reuniao.js",
  "assets/js/dados.js",
  "assets/js/dominio/avisos.js",
  "assets/js/dominio/boletim-semanal.js",
  "assets/js/dominio/cadastros.js",
  "assets/js/dominio/codigos.js",
  "assets/js/dominio/equivalencias.js",
  "assets/js/dominio/habilitacao.js",
  "assets/js/dominio/hoje.js",
  "assets/js/dominio/horario.js",
  "assets/js/dominio/impacto-atos.js",
  "assets/js/dominio/matricula.js",
  "assets/js/dominio/movimentacao.js",
  "assets/js/dominio/notas.js",
  "assets/js/dominio/painel.js",
  "assets/js/dominio/plano-aula.js",
  "assets/js/dominio/prestacao.js",
  "assets/js/dominio/profin.js",
  "assets/js/dominio/senha.js",
  "assets/js/dominio/sincronizacao.js",
  "assets/js/dominio/texto.js",
  "assets/js/dominio/trajetoria.js",
  "assets/js/dominio/turmas.js",
  "assets/js/dominio/verificacao.js",
  "assets/js/dominio/vida-escolar.js",
  "assets/js/estado.js",
  "assets/js/idb.js",
  "assets/js/mapa/distancia.js",
  "assets/js/mapa/leaflet.js",
  "assets/js/matricula/formulario.js",
  "assets/js/matricula/rascunho-link.js",
  "assets/js/movimentacoes-dados.js",
  "assets/js/offline.js",
  "assets/js/paginas/acessos.js",
  "assets/js/paginas/aluno-boletim-falado.js",
  "assets/js/paginas/aluno-cadastro.js",
  "assets/js/paginas/aluno-calendario.js",
  "assets/js/paginas/aluno-carteirinha.js",
  "assets/js/paginas/aluno-documentos.js",
  "assets/js/paginas/aluno-frequencia.js",
  "assets/js/paginas/aluno-horario.js",
  "assets/js/paginas/aluno-inicio.js",
  "assets/js/paginas/aluno-linha-do-tempo.js",
  "assets/js/paginas/aluno-notas.js",
  "assets/js/paginas/aluno-quiz.js",
  "assets/js/paginas/aluno-rotina.js",
  "assets/js/paginas/avisos.js",
  "assets/js/paginas/comunicados.js",
  "assets/js/paginas/configuracoes.js",
  "assets/js/paginas/declaracao.js",
  "assets/js/paginas/inicio.js",
  "assets/js/paginas/login.js",
  "assets/js/paginas/professor-diario.js",
  "assets/js/paginas/professor-horario.js",
  "assets/js/paginas/professor-mapa.js",
  "assets/js/paginas/professor-materiais.js",
  "assets/js/paginas/professor-plano-aula.js",
  "assets/js/paginas/professor-registro-aula.js",
  "assets/js/paginas/professor-turmas.js",
  "assets/js/paginas/verificar.js",
  "assets/js/painel-dados.js",
  "assets/js/prestacao-dados.js",
  "assets/js/qr.js",
  "assets/js/regras.js",
  "assets/js/solicitacoes.js",
  "assets/js/tema-inicial.js",
  "assets/js/tour.js",
  "assets/js/ui.js",
  "data/agenda.json",
  "data/alocacoes.json",
  "data/arvore-voz.json",
  "data/atencao-turmas.json",
  "data/atos-novos.json",
  "data/atos.json",
  "data/avisos-lidos.json",
  "data/avisos.json",
  "data/base-conhecimento.json",
  "data/calendario.json",
  "data/carga-horaria.json",
  "data/chamadas.json",
  "data/componentes-etapa.json",
  "data/comunicados.json",
  "data/declaracoes-gastos.json",
  "data/demanda.json",
  "data/desempenho.json",
  "data/diario-meta.json",
  "data/enturmacao.json",
  "data/equipe-profin.json",
  "data/equivalencias.json",
  "data/escolas-novas.json",
  "data/escolas.json",
  "data/estudantes.json",
  "data/historico.json",
  "data/historicos.json",
  "data/horarios.json",
  "data/justificativas.json",
  "data/letivo.json",
  "data/localidades.json",
  "data/materiais.json",
  "data/matriculas.json",
  "data/matrizes.json",
  "data/movimentacoes.json",
  "data/planos-aula.json",
  "data/professor.json",
  "data/professores-novos.json",
  "data/professores.json",
  "data/profin-notas.json",
  "data/profin.json",
  "data/quiz.json",
  "data/registros-aula.json",
  "data/renovacoes.json",
  "data/repasses-lancados.json",
  "data/solicitacoes.json",
  "data/tour.json",
  "data/trajetorias.json",
  "data/turmas-rede.json",
  "data/turmas.json",
  "data/usuarios.json",
  "data/vagas.json"
];
const CDN = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil((async () => {
    const cache = await caches.open(VERSAO);
    // Um arquivo que falhar não impede a instalação; ele entra no cache na primeira visita.
    await Promise.all([
      ...NUCLEO.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})),
      ...CDN.map((u) => cache.add(new Request(u, { mode: 'no-cors' })).catch(() => {}))
    ]);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    for (const nome of await caches.keys()) if (nome !== VERSAO) await caches.delete(nome);
    await self.clients.claim();
  })());
});

async function redePrimeiro(pedido) {
  const cache = await caches.open(VERSAO);
  try {
    const controle = new AbortController();
    const espera = setTimeout(() => controle.abort(), 5000); // rede lenta demais: usa o que está guardado
    const resposta = await fetch(pedido, { signal: controle.signal });
    clearTimeout(espera);
    if (resposta.ok) cache.put(pedido, resposta.clone());
    return resposta;
  } catch {
    const guardado = await cache.match(pedido, { ignoreSearch: pedido.mode === 'navigate' });
    if (guardado) return guardado;
    if (pedido.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
    return Response.error();
  }
}
async function cachePrimeiro(pedido) {
  const cache = await caches.open(VERSAO);
  const guardado = await cache.match(pedido);
  const atualizar = fetch(pedido).then((r) => { if (r.ok || r.type === 'opaque') cache.put(pedido, r.clone()); return r; }).catch(() => null);
  return guardado || (await atualizar) || Response.error();
}
self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.pathname.includes('/api/')) return;
  evento.respondWith(url.origin === self.location.origin ? redePrimeiro(pedido) : cachePrimeiro(pedido));
});
