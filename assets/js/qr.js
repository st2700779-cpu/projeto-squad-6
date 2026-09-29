// QR Code com a biblioteca qrcodejs (cdnjs), carregada só quando alguma tela precisa dele.
// Se a biblioteca não carregar (sem internet, CDN bloqueada) ou o texto for grande demais, devolve false
// e a tela mostra o endereço em texto no lugar do código.
const URL_QRCODE = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
const carregados = new Map();

/** Carrega um script externo uma única vez. */
export function carregarScript(url) {
  if (!carregados.has(url)) {
    carregados.set(url, new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = ok;
      s.onerror = () => { carregados.delete(url); s.remove(); falha(new Error('SCRIPT_INDISPONIVEL')); };
      document.head.append(s);
    }));
  }
  return carregados.get(url);
}

/**
 * Desenha o QR Code de `texto` dentro de `el`.
 * @returns {Promise<boolean>} true se desenhou.
 */
export async function qrParaElemento(el, texto, tamanho = 192) {
  try {
    await carregarScript(URL_QRCODE);
    el.textContent = '';
    // eslint-disable-next-line no-undef
    new QRCode(el, { text: texto, width: tamanho, height: tamanho, correctLevel: QRCode.CorrectLevel.M });
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', 'QR Code com o endereço em texto logo abaixo');
    return true;
  } catch { el.textContent = ''; return false; }
}
