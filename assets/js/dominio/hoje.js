// "Hoje" da demonstração: a data de referência de data/letivo.json (definida por app.js ao abrir cada página).
// Sem ela vale a data do aparelho. Assim atos, prazos, diário e carteirinha usam o mesmo dia.
let dataBase = null;
export const definirDataBase = (iso) => { dataBase = /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso : null; };
/** AAAA-MM-DD */
export const hojeISO = () => dataBase || new Date().toISOString().slice(0, 10);
/** Dias do calendário de uma data a outra (AAAA-MM-DD); negativo se a segunda é anterior. */
export const diasEntreDatas = (de, ate) => Math.round((Date.parse(ate + 'T00:00:00Z') - Date.parse(de + 'T00:00:00Z')) / 86400000);
