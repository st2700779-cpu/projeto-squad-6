// Service worker do Portal Acadêmico (JavaScript puro, sem biblioteca).
// - Instalação: guarda em cache as páginas e arquivos que a carteirinha digital e o diário do professor precisam para abrir
//   sem internet, além de Bootstrap, fonte e qrcodejs das CDNs. Se você acrescentar arquivos a essas telas, acrescente-os em NUCLEO.
// - Uso: arquivos do próprio site vão "rede primeiro" (a versão nova aparece quando há internet e a guardada serve quando não há);
//   arquivos de CDN vão "cache primeiro". A API local (/api/) nunca passa pelo cache.
// Só funciona em https ou localhost. Ao mudar o NUCLEO, mude também VERSAO para renovar o cache.
const VERSAO = 'portal-v1';
const NUCLEO = [
  "index.html",
  "login.html",
  "verificar.html",
  "manifest.json",
  "config.js",
  "aluno/index.html",
  "aluno/carteirinha.html",
  "aluno/notas.html",
  "aluno/documentos.html",
  "aluno/calendario.html",
  "aluno/linha-do-tempo.html",
  "aluno/boletim-falado.html",
  "professor/index.html",
  "professor/diario.html",
  "professor/avisos.html",
  "assets/css/acesso.css",
  "assets/css/assistente.css",
  "assets/css/balcao.css",
  "assets/css/componentes.css",
  "assets/css/documento.css",
  "assets/css/layout.css",
  "assets/css/mapa.css",
  "assets/css/tema.css",
  "assets/css/tour.css",
  "assets/js/acessibilidade.js",
  "assets/js/app.js",
  "assets/js/auth.js",
  "assets/js/dados.js",
  "assets/js/dominio/equivalencias.js",
  "assets/js/dominio/matricula.js",
  "assets/js/dominio/notas.js",
  "assets/js/dominio/turmas.js",
  "assets/js/dominio/verificacao.js",
  "assets/js/estado.js",
  "assets/js/mapa/distancia.js",
  "assets/js/mapa/leaflet.js",
  "assets/js/matricula/formulario.js",
  "assets/js/matricula/rascunho-link.js",
  "assets/js/paginas/aluno-calendario.js",
  "assets/js/paginas/aluno-documentos.js",
  "assets/js/paginas/aluno-inicio.js",
  "assets/js/paginas/aluno-notas.js",
  "assets/js/paginas/avisos.js",
  "assets/js/paginas/declaracao.js",
  "assets/js/paginas/inicio.js",
  "assets/js/paginas/login.js",
  "assets/js/paginas/professor-diario.js",
  "assets/js/paginas/professor-turmas.js",
  "assets/js/paginas/verificar.js",
  "assets/js/qr.js",
  "assets/js/regras.js",
  "assets/js/tema-inicial.js",
  "assets/js/tour.js",
  "assets/js/ui.js",
  "data/estudantes.json",
  "data/escolas.json",
  "data/letivo.json",
  "data/tour.json",
  "data/calendario.json",
  "data/avisos.json",
  "data/matriculas.json",
  "data/professor.json",
  "data/professores.json",
  "data/turmas.json",
  "data/alocacoes.json",
  "data/vagas.json",
  "data/atos.json",
  "data/usuarios.json",
  "data/matrizes.json",
  "data/chamadas.json"
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
