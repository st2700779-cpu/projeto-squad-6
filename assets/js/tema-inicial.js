// Exibição: modo escuro e alto contraste, compartilhados pelo portal e pelo protótipo
// (sistema-academico-seduc-prototipo.html). Script comum (não módulo) carregado no <head>:
// aplica as escolhas antes da página aparecer, sem piscar. As escolhas ficam no navegador;
// sem escolha, o modo escuro segue o sistema (Windows, celular).
(function () {
  var raiz = document.documentElement;
  var sistema = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;

  function ler(chave) { try { return localStorage.getItem(chave); } catch (e) { return null; } }
  function gravar(chave, valor) { try { localStorage.setItem(chave, valor); } catch (e) { /* segue sem guardar */ } }
  function temaEscolhido() { var t = ler('portal-tema'); return t === 'escuro' || t === 'claro' ? t : null; }

  function atualizarBotoes() {
    var escuro = raiz.getAttribute('data-tema') === 'escuro';
    var contraste = raiz.getAttribute('data-contraste') === 'alto';
    document.querySelectorAll('[data-alternar-tema]').forEach(function (b) { b.setAttribute('aria-checked', String(escuro)); });
    document.querySelectorAll('[data-alternar-contraste]').forEach(function (b) { b.setAttribute('aria-checked', String(contraste)); });
    var cor = document.querySelector('meta[name="theme-color"]');
    if (cor) cor.setAttribute('content', escuro ? (contraste ? '#000000' : '#1c1d19') : '#ffffff');
  }
  function aplicarTema(tema) { raiz.setAttribute('data-tema', tema); atualizarBotoes(); }
  function aplicarContraste(alto) {
    if (alto) raiz.setAttribute('data-contraste', 'alto'); else raiz.removeAttribute('data-contraste');
    atualizarBotoes();
  }

  aplicarTema(temaEscolhido() || (sistema && sistema.matches ? 'escuro' : 'claro'));
  aplicarContraste(ler('portal-contraste') === 'alto');

  // Sem escolha salva, acompanha a mudança do sistema com a página aberta.
  if (sistema && sistema.addEventListener) {
    sistema.addEventListener('change', function (e) { if (!temaEscolhido()) aplicarTema(e.matches ? 'escuro' : 'claro'); });
  }

  function fecharPainel(devolverFoco) {
    document.querySelectorAll('[data-exibicao][aria-expanded="true"]').forEach(function (b) {
      b.setAttribute('aria-expanded', 'false');
      var painel = document.getElementById(b.getAttribute('aria-controls'));
      if (painel) painel.hidden = true;
      if (devolverFoco) b.focus();
    });
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var abrir = e.target.closest('[data-exibicao]');
    if (abrir) {
      var aberto = abrir.getAttribute('aria-expanded') === 'true';
      fecharPainel(false);
      if (!aberto) {
        abrir.setAttribute('aria-expanded', 'true');
        document.getElementById(abrir.getAttribute('aria-controls')).hidden = false;
      }
      return;
    }
    if (e.target.closest('[data-alternar-tema]')) {
      var novo = raiz.getAttribute('data-tema') === 'escuro' ? 'claro' : 'escuro';
      gravar('portal-tema', novo);
      aplicarTema(novo);
      return;
    }
    if (e.target.closest('[data-alternar-contraste]')) {
      var alto = raiz.getAttribute('data-contraste') !== 'alto';
      gravar('portal-contraste', alto ? 'alto' : 'normal');
      aplicarContraste(alto);
      return;
    }
    if (!e.target.closest('.painel-exibicao')) fecharPainel(false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharPainel(true); });

  // HTML do botão "Exibição" e do painel, usado pelos cabeçalhos do portal e do protótipo.
  window.botaoTema = function () {
    var escuro = raiz.getAttribute('data-tema') === 'escuro';
    var contraste = raiz.getAttribute('data-contraste') === 'alto';
    var svg = function (d) {
      return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
    };
    var chave = function (atributo, marcado, icone, rotulo) {
      return '<button type="button" class="chave" role="switch" ' + atributo + ' aria-checked="' + marcado + '">' + svg(icone) +
        '<span>' + rotulo + '</span><span class="chave-trilho" aria-hidden="true"><span></span></span></button>';
    };
    return '<div class="exibicao">' +
      '<button type="button" class="ferramenta" data-exibicao aria-expanded="false" aria-controls="painel-exibicao" aria-label="Exibição: modo escuro e alto contraste" title="Exibição">' +
        svg('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 3v18M12 7h5M12 11h7M12 15h7') + '</button>' +
      '<div id="painel-exibicao" class="painel-exibicao" role="group" aria-label="Exibição" hidden>' +
        '<strong>Exibição</strong>' +
        chave('data-alternar-tema', escuro, 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z', 'Modo escuro') +
        chave('data-alternar-contraste', contraste, 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 3v18', 'Alto contraste') +
      '</div></div>';
  };
})();
