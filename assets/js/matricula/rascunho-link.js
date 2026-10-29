// Rascunho da matrícula dentro do próprio endereço (fragmento #rascunho=...), para outra pessoa
// continuar de onde parou em outro aparelho sem servidor. O texto é JSON, compactado com deflate
// quando o navegador tem CompressionStream (prefixo "z") ou só codificado em base64 (prefixo "j").
// O fragmento nunca vai para o servidor e o endereço carrega dados pessoais: quem tiver o link vê os dados.
const paraBase64Url = (bytes) => {
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const deBase64Url = (texto) => {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (texto.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};
async function passar(bytes, Fluxo, formato) {
  const fluxo = new Fluxo(formato);
  const escritor = fluxo.writable.getWriter();
  escritor.write(bytes).catch(() => {}); // entrada inválida rejeita aqui e de novo na leitura, que é onde tratamos
  escritor.close().catch(() => {});
  return new Uint8Array(await new Response(fluxo.readable).arrayBuffer());
}

/** Campos do formulário que viajam no link. Nunca inclui anexos. */
const CAMPOS = ['estudante', 'nascimento', 'responsavel', 'telefone', 'tipo', 'serie', 'escolaId', 'cidade', 'bairro', 'documentos'];

export async function codificarRascunho(dados, passo) {
  const objeto = { p: passo, em: Date.now(), d: Object.fromEntries(CAMPOS.filter((c) => dados[c] !== undefined && dados[c] !== '').map((c) => [c, dados[c]])) };
  const bytes = new TextEncoder().encode(JSON.stringify(objeto));
  if (typeof CompressionStream === 'function') return 'z' + paraBase64Url(await passar(bytes, CompressionStream, 'deflate-raw'));
  return 'j' + paraBase64Url(bytes);
}

/** @returns {Promise<{passo:number, dados:object, em:number}|null>} null se o texto não for um rascunho válido. */
export async function decodificarRascunho(codigo) {
  try {
    const bytes = deBase64Url(codigo.slice(1));
    let texto;
    if (codigo[0] === 'z') {
      if (typeof DecompressionStream !== 'function') return null;
      texto = new TextDecoder().decode(await passar(bytes, DecompressionStream, 'deflate-raw'));
    } else if (codigo[0] === 'j') texto = new TextDecoder().decode(bytes);
    else return null;
    const o = JSON.parse(texto);
    const dados = Object.fromEntries(Object.entries(o.d || {}).filter(([c]) => CAMPOS.includes(c)));
    const passo = Math.min(5, Math.max(1, Number(o.p) || 1));
    return { passo, dados, em: o.em };
  } catch { return null; }
}

/** Lê #rascunho=... do endereço atual. */
export const codigoNoEndereco = () => new URLSearchParams(location.hash.slice(1)).get('rascunho');
