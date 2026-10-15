// Equipe do PROFIN vista pelo próprio PROFIN: coordenação, analistas e apoio.
import { iniciar, falhaDados } from '../app.js';
import { montarEquipe } from '../componentes/equipe-profin.js';

const main = await iniciar({ perfil: 'profin', pagina: 'profin/equipe.html', assistente: true });
await montarEquipe(main, falhaDados);
