# Leitura do sistema por perfil: o que faltava e o que foi acrescentado

Esta rodada partiu de uma leitura de todas as telas **como se eu fosse cada usuário**, abrindo o menu do perfil, tentando fazer o trabalho do dia e anotando onde travaria. Cada achado virou uma de três coisas: **feito agora**, **corrigido** (era erro, não falta) ou **fica para depois** (com o motivo).

Todos os dados continuam fictícios e tudo roda sem servidor (`localStorage`, ou a API local do `iniciar.bat`).

## Em todos os perfis

| Como usuário eu precisaria de… | Situação |
| --- | --- |
| Trocar a senha de teste por uma minha | **Feito.** Configurações › Conta › **Alterar senha**: senha atual, nova (8 caracteres ou mais, com letras e números, sem conter o usuário, diferente da atual) e confirmação, com indicador de força. A senha trocada vale só neste aparelho e fica guardada como resumo SHA-256 (nunca em texto). |
| Saber o que fazer se esquecer a senha | **Feito.** "Esqueci minha senha" no login: alunos, responsáveis e professores procuram a secretaria; os demais, a equipe técnica da SEED. Na demonstração, "Restaurar dados de demonstração" devolve as senhas de teste. |
| Não deixar a sessão aberta num computador compartilhado da escola | **Feito.** A sessão encerra sozinha depois de **30 minutos sem uso** (clique, tecla, rolagem ou toque reinicia a contagem) e a tela de entrada explica o motivo. |
| Ver o mesmo "hoje" em todas as telas | **Corrigido.** Atos, carteirinha, diário e boletim semanal usavam a data do aparelho, enquanto os painéis usavam 07/10/2026. Agora todos usam a data de referência de `data/letivo.json` (`assets/js/dominio/hoje.js`). |
| Prazos de ato certos | **Corrigido.** Um ato vencido há menos de 24 horas ainda aparecia como "vigente" (arredondamento de `Math.ceil` com −0). Agora os dias são contados no calendário: no dia da validade ele ainda vale ("Vence hoje"), no dia seguinte aparece "Vencido". |

## Aluno

Li o início, notas, frequência, rotina, carteirinha, boletim falado e documentos. A tela já responde "como estou?" e "o que preciso fazer?".

- **Feito:** botão **Imprimir boletim** (a impressão esconde menu e cabeçalho e traz a linha "emitido em… situação parcial, sem valor de documento oficial").
- **Corrigido:** a carteirinha mostrava o ano e a validade pela data do aparelho; agora usa o "hoje" da demonstração.
- **Fica para depois:** marcar avisos como lidos (a lista de avisos não guarda quem já leu).

## Responsável

Como mãe de três filhos, o que eu faria no dia: ver o boletim, entender uma falta e **avisar a escola do motivo**. O avisar não existia.

- **Feito:** **Justificar falta** (menu, início e boletim). Escolho o filho, a data (ou período de até 15 dias), o motivo, escrevo a explicação (obrigatória em "outro motivo") e anexo atestado (PDF ou foto até 5 MB; obrigatório para saúde acima de 3 dias). O prazo é de 30 dias depois da falta. Sugere as datas em que a escola registrou falta. Gera protocolo `JUS-…` e a tela lista o andamento: *aguardando análise*, *aceita* (falta abonada) ou *recusada*, com o motivo escrito pela secretaria. Não aceita datas já justificadas nem datas no futuro.
- **Feito:** **Imprimir boletim** (mesma impressão do aluno).
- **Fica para depois:** abono automático no cálculo de frequência. Hoje a justificativa aceita fica registrada, mas o diário do professor não muda a contagem de faltas.

## Professor

O diário tinha chamada e notas, mas nada para dizer **o que foi ensinado**, que é o que a coordenação cobra.

- **Feito:** **Registro de aula**: turma e componente, data (não pode ser futura nem ter mais de 6 meses), de 1 a 6 aulas, conteúdo trabalhado (mínimo 10 letras) e tarefa de casa opcional. Sugere os dias com chamada feita e sem registro. Edita e remove (com confirmação) e não deixa duplicar a mesma turma, componente e data.
- **Corrigido:** o diário e a lista de turmas usavam a data do aparelho no "hoje".
- **Fica para depois:** modelo de plano de aula com habilidades da BNCC.

## Coordenação pedagógica

- **Feito:** **Registros de aula** (só leitura): lista por turma com professor, aulas e conteúdo, e quantas turmas já têm algum registro.
- **Fica para depois:** alerta de turma sem registro há mais de uma semana.

## Secretaria

A secretaria recebia matrícula, enturmação e solicitações, mas as famílias não tinham como justificar falta, então a fila ficava de fora.

- **Feito:** **Justificativas** (menu e fila do início): abas *aguardando*, *decididas* e *todas*; **Aceitar** abona; **Recusar** exige uma explicação que a família lê. Fica registrado quem decidiu e quando. O início da secretaria mostra "justificativas para analisar" com prazo de 5 dias.
- **Fica para depois:** transferência e cancelamento de matrícula iniciados pela escola; gerar nova senha para um usuário (hoje só a orientação aparece).

## Direção

Prestação de contas, atos e comunicados já cobriam o dia a dia. Nada novo em tela; a direção se beneficia do prazo de ato corrigido e de a PROFIN poder lançar repasses (a prestação ganha novo prazo e aparece na direção).

## Rede (SEED e DRE)

Aqui estavam as maiores faltas: era possível **criar**, mas não **corrigir**.

- **Feito:** **Editar escola** (nome, INEP, município, DRE, endereço, telefone e e-mail; não deixa repetir nome no município nem INEP de outra escola).
- **Feito:** **Registrar ato renovado**: botão "Ato" em Escolas e link "Registrar ato renovado" na tela de Atos depois de "Iniciar renovação". O novo número tem de ser diferente, a publicação não pode ser futura e o vencimento tem de ser depois do atual. O ato antigo fica guardado (`numeroAnterior`, `validadeAnterior`).
- **Feito:** **Editar professor** (vínculo, formação, habilitação, carga e lotação; matrícula funcional e CPF não mudam) e **Desligar / Reativar**. Desligar só é possível sem turma alocada, e a mensagem diz quantas turmas faltam tirar.
- **Fica para depois:** histórico de lotação do professor; troca de escola de um professor com turma.

## PROFIN

- **Feito:** **Lançar repasse** no painel da escola: categoria, valor (até 2 casas, no máximo R$ 5.000.000,00), data do crédito (dentro do ano, não futura) e prazo depois do crédito. O valor soma ao recebido, a prestação da categoria ganha novo prazo e volta a ficar pendente até a escola declarar de novo.
- **Fica para depois:** estornar um repasse lançado por engano.

## Erros que a leitura e os testes de navegador acharam

| Onde | O quê | Correção |
| --- | --- | --- |
| Rede › Escolas e Professores | Os formulários de edição repetiam os `id` do formulário de cadastro escondido na mesma página; o rótulo (`label for`) do formulário de edição apontava para o campo escondido, o que atrapalha leitor de tela | `campo()` e `marcas()` ganharam `prefixo`; edição usa `ed-`, `at-` e `pe-` |
| PROFIN › Lançar repasse | O formulário tinha `data-escola`, o mesmo atributo dos botões da lista; qualquer clique nele redesenhava o painel antes do envio, e o repasse nunca era lançado | Atributo renomeado para `data-escola-id` e o clique da lista só vale para `button` |
| Rede › Matrizes (celular) | A etiqueta longa do título fazia a página rolar na horizontal | Etiquetas em títulos quebram linha |
| Atos | Ato vencido há menos de 24 h aparecia como vigente | Ver "Em todos os perfis" |

## Como isso foi verificado

- `node tools/testar-cadastros.mjs`: 24 grupos (senha, data do "hoje", editar escola, ato renovado, professor, repasse, registro de aula, justificativa e decisão).
- Roteiros de navegador (Playwright) com contexto compartilhado: justificativa de ponta a ponta (responsável → secretaria recusa → responsável reenvia com anexo → secretaria aceita), registro de aula e consulta da coordenação, troca de senha (senha antiga deixa de valer, nova entra, restaurar dados volta à original), inatividade com relógio simulado (29 min continua, atividade reinicia, 30 min encerra), editar escola, ato renovado, editar e desligar professor, repasse.
- Varredura de todas as telas dos 8 perfis em 1280 e 390 px: sem erro de console, sem rolagem horizontal, com `h1` e sem `id` repetido.
- Esses roteiros de navegador não fazem parte do repositório (rodam fora dele, como os anteriores).
