// Equipe do PROFIN vista pela rede (SEED): a mesma lista e o mesmo cadastro da tela do PROFIN.
import { iniciar, falhaDados } from '../app.js';
import { montarEquipe } from '../componentes/equipe-profin.js';

const main = await iniciar({ perfil: 'rede', pagina: 'rede/equipe-profin.html', assistente: true });
await montarEquipe(main, falhaDados);
