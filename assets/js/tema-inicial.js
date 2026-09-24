// Modo claro/escuro, compartilhado pelo portal e pelo protótipo (sistema-academico-seduc-prototipo.html).
// Script comum (não módulo) carregado no <head>: aplica o tema antes da página aparecer, sem piscar.
// A escolha fica no navegador; sem escolha, segue o modo do sistema (Windows, celular).
(function () {
  var CHAVE = 'portal-tema';
  var raiz = document.documentElement;
  var sistema = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;

  function escolhido() {
    try { var t = localStorage.getItem(CHAVE); return t === 'escuro' || t === 'claro' ? t : null; } catch (e) { return null; }
  }
  function aplicar(tema) {
    raiz.setAttribute('data-tema', tema);
    var escuro = tema === 'escuro';
    document.querySelectorAll('[data-alternar-tema]').forEach(function (b) { b.setAttribute('aria-pressed', String(escuro)); });
    var cor = document.querySelector('meta[name="theme-color"]');
    if (cor) cor.setAttribute('content', escuro ? '#1c1d19' : '#ffffff');
  }
  aplicar(escolhido() || (sistema && sistema.matches ? 'escuro' : 'claro'));

  // Sem escolha salva, acompanha a mudança do sistema com a página aberta.
  if (sistema && sistema.addEventListener) {
    sistema.addEventListener('change', function (e) { if (!escolhido()) aplicar(e.matches ? 'escuro' : 'claro'); });
  }

  // Botão de alternar: qualquer elemento com data-alternar-tema (cabeçalho do portal e do protótipo).
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('[data-alternar-tema]')) return;
    var novo = raiz.getAttribute('data-tema') === 'escuro' ? 'claro' : 'escuro';
    try { localStorage.setItem(CHAVE, novo); } catch (err) { /* segue sem guardar */ }
    aplicar(novo);
  });

  // HTML do botão, usado pelos cabeçalhos. Os dois ícones ficam no botão e o CSS mostra o certo.
  window.botaoTema = function () {
    var escuro = raiz.getAttribute('data-tema') === 'escuro';
    var svg = function (classe, d) {
      return '<svg class="' + classe + '" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
    };
    return '<button type="button" class="ferramenta" data-alternar-tema aria-pressed="' + escuro + '" aria-label="Modo escuro" title="Modo escuro">' +
      svg('icone-lua', 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z') +
      svg('icone-sol', 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4') +
      '</button>';
  };
})();
