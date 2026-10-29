// Monta o prompt de sistema a partir do modelo versionado e da base de conhecimento.
// O wrangler.toml importa arquivos .md como texto (regra "Text").
import MODELO from '../../prompts/assistente/v1.md';
import BASE from '../../data/base-conhecimento.json';

const PERFIS = {
  familia: 'família e estudantes',
  professor: 'professores',
  escola: 'equipe da escola',
  rede: 'técnicos da SEED e das DREs'
};

const itens = BASE.itens.map((i) => `- [${i.tema}] ${i.pergunta} → ${i.resposta}`).join('\n');

export function montarPrompt(perfil) {
  return MODELO
    .replace('{perfil}', PERFIS[perfil] || PERFIS.familia)
    .replace('{versao}', BASE.versao)
    .replace('{data}', BASE.atualizado_em)
    .replace('{itens}', itens);
}
