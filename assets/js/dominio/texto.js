// Texto sem acento e sem diferença de maiúsculas, para comparar nomes (Node e navegador).
export const normalizar = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
