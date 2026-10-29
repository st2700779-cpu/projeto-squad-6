# Leitura do sistema por perfil: o que faltava e o que foi acrescentado

Esta rodada partiu de uma leitura de todas as telas **como se eu fosse cada usuário**, abrindo o menu do perfil, tentando fazer o trabalho do dia e anotando onde travaria. Cada achado virou **feito** ou **corrigido** (era erro, não falta). Na segunda rodada foram feitos todos os itens que tinham ficado para depois; o que continua limitado está em "Limites que continuam", no fim.

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
- **Feito na segunda rodada:** **avisos lidos**. Cada aviso tem a etiqueta *Novo* e o botão **Marcar como lido** (ou *não lido*); há **Marcar todos como lidos** e um contador no item de avisos do menu. A marcação é por usuário e fica neste aparelho. Vale também para responsável, professor e secretaria.
- **Feito na segunda rodada:** se a matrícula do estudante foi transferida ou cancelada, o aluno e o responsável veem um aviso no alto da tela (o acesso continua, só para consulta).

## Responsável

Como mãe de três filhos, o que eu faria no dia: ver o boletim, entender uma falta e **avisar a escola do motivo**. O avisar não existia.

- **Feito:** **Justificar falta** (menu, início e boletim). Escolho o filho, a data (ou período de até 15 dias), o motivo, escrevo a explicação (obrigatória em "outro motivo") e anexo atestado (PDF ou foto até 5 MB; obrigatório para saúde acima de 3 dias). O prazo é de 30 dias depois da falta. Sugere as datas em que a escola registrou falta. Gera protocolo `JUS-…` e a tela lista o andamento: *aguardando análise*, *aceita* (falta abonada) ou *recusada*, com o motivo escrito pela secretaria. Não aceita datas já justificadas nem datas no futuro.
- **Feito:** **Imprimir boletim** (mesma impressão do aluno).
- **Feito na segunda rodada:** **abono na frequência**. Quando a secretaria aceita, as faltas registradas na chamada dentro do período passam a ficar fora da frequência que o aluno, o responsável e os painéis veem (boletim, frequência, declaração, boletim falado). O diário do professor **não muda**: a falta continua lá, marcada como "abonada". Limite: só se abona falta que veio da chamada; falta digitada direto na coluna "Faltas" do diário não tem data e não é abonada.

## Professor

O diário tinha chamada e notas, mas nada para dizer **o que foi ensinado**, que é o que a coordenação cobra.

- **Feito:** **Registro de aula**: turma e componente, data (não pode ser futura nem ter mais de 6 meses), de 1 a 6 aulas, conteúdo trabalhado (mínimo 10 letras) e tarefa de casa opcional. Sugere os dias com chamada feita e sem registro. Edita e remove (com confirmação) e não deixa duplicar a mesma turma, componente e data.
- **Corrigido:** o diário e a lista de turmas usavam a data do aparelho no "hoje".
- **Feito na segunda rodada:** **Plano de aula** (menu do professor): turma e componente, tema, data prevista, nº de aulas, **habilidades da BNCC pelo código**, objetivos, atividades, recursos e avaliação. O protótipo confere o **formato** do código (EF06MA01, EM13MAT101…) e se ele **combina com a etapa e o ano da turma** (um código do 6º ano não entra em turma do Ensino Médio); não confere o texto da habilidade, que deve ser lido na BNCC. Edita, remove e **imprime** um plano por vez.

## Coordenação pedagógica

- **Feito:** **Registros de aula** (só leitura): lista por turma com professor, aulas e conteúdo, e quantas turmas já têm algum registro.
- **Feito na segunda rodada:** **alerta de turma sem registro de aula**: tabela com o último registro de cada turma e semáforo (verde até 7 dias, amarelo de 8 a 14, vermelho acima disso ou sem nenhum registro, sempre com símbolo e palavra), e a contagem no início da coordenação. A consulta também lista os **planos de aula**.

## Secretaria

A secretaria recebia matrícula, enturmação e solicitações, mas as famílias não tinham como justificar falta, então a fila ficava de fora.

- **Feito:** **Justificativas** (menu e fila do início): abas *aguardando*, *decididas* e *todas*; **Aceitar** abona; **Recusar** exige uma explicação que a família lê. Fica registrado quem decidiu e quando. O início da secretaria mostra "justificativas para analisar" com prazo de 5 dias.
- **Feito na segunda rodada:** **Transferências** (menu): *transferir para outra escola* e *cancelar matrícula*. A transferência só aceita destino com **ato vigente e vaga** na série; gera um pedido (tipo Transferência) na secretaria de destino, libera a vaga na origem e reserva no destino. O cancelamento pede o motivo (lista, com explicação em "outro"). Os dois baixam a turma em 1 matriculado, tiram o estudante da chamada do professor e dos painéis, e podem ser **desfeitos** (a transferência só enquanto o destino não confirmou). O estudante mostra a situação na lista, na busca e na ficha.
- **Feito na segunda rodada:** **Acessos e senhas** (menu): a secretaria gera **senha temporária** para aluno, responsável e professor da própria escola. A senha aparece uma vez, na tela de quem gerou, e **não vai para o histórico**. A pessoa é obrigada a definir a senha nova no primeiro acesso: até lá só a tela de Configurações abre.

## Direção

Prestação de contas, atos e comunicados já cobriam o dia a dia. Nada novo em tela; a direção se beneficia do prazo de ato corrigido e de a PROFIN poder lançar repasses (a prestação ganha novo prazo e aparece na direção).

## Rede (SEED e DRE)

Aqui estavam as maiores faltas: era possível **criar**, mas não **corrigir**.

- **Feito:** **Editar escola** (nome, INEP, município, DRE, endereço, telefone e e-mail; não deixa repetir nome no município nem INEP de outra escola).
- **Feito:** **Registrar ato renovado**: botão "Ato" em Escolas e link "Registrar ato renovado" na tela de Atos depois de "Iniciar renovação". O novo número tem de ser diferente, a publicação não pode ser futura e o vencimento tem de ser depois do atual. O ato antigo fica guardado (`numeroAnterior`, `validadeAnterior`).
- **Feito:** **Editar professor** (vínculo, formação, habilitação, carga e lotação; matrícula funcional e CPF não mudam) e **Desligar / Reativar**. Desligar só é possível sem turma alocada, e a mensagem diz quantas turmas faltam tirar.
- **Feito na segunda rodada:** **mudar o professor de escola**: pede o motivo, mostra e confirma as turmas de que ele sai (elas ficam sem professor naquele componente, e as alocações são liberadas), e guarda o **histórico de lotação** (escola, período e motivo), visível na edição.
- **Feito na segunda rodada:** **Acessos e senhas** também na rede, para as contas institucionais (secretaria, direção, coordenação e PROFIN).

## PROFIN

- **Feito:** **Lançar repasse** no painel da escola: categoria, valor (até 2 casas, no máximo R$ 5.000.000,00), data do crédito (dentro do ano, não futura) e prazo depois do crédito. O valor soma ao recebido, a prestação da categoria ganha novo prazo e volta a ficar pendente até a escola declarar de novo.
- **Feito na segunda rodada:** **Estornar repasse**: pede o motivo e só deixa estornar se o valor ainda estiver livre (o que a escola executou ou declarou não pode passar do que sobraria). O repasse estornado sai do recebido e o prazo anterior volta; ele continua na lista, marcado como *Estornado*, com data, quem fez e o motivo.

## Erros que a leitura e os testes de navegador acharam

| Onde | O quê | Correção |
| --- | --- | --- |
| Rede › Escolas e Professores | Os formulários de edição repetiam os `id` do formulário de cadastro escondido na mesma página; o rótulo (`label for`) do formulário de edição apontava para o campo escondido, o que atrapalha leitor de tela | `campo()` e `marcas()` ganharam `prefixo`; edição usa `ed-`, `at-` e `pe-` |
| PROFIN › Lançar repasse | O formulário tinha `data-escola`, o mesmo atributo dos botões da lista; qualquer clique nele redesenhava o painel antes do envio, e o repasse nunca era lançado | Atributo renomeado para `data-escola-id` e o clique da lista só vale para `button` |
| Rede › Matrizes (celular) | A etiqueta longa do título fazia a página rolar na horizontal | Etiquetas em títulos quebram linha |
| Atos | Ato vencido há menos de 24 h aparecia como vigente | Ver "Em todos os perfis" |

## Como isso foi verificado

- `node tools/testar-cadastros.mjs`: 32 grupos (senha e redefinição, data do "hoje", editar escola, ato renovado, professor e lotação, repasse e estorno, registro de aula e alerta, justificativa, decisão e abono, plano de aula com BNCC, avisos lidos, transferência e cancelamento).
- Roteiros de navegador (Playwright) com contexto compartilhado (primeira e segunda rodada): justificativa de ponta a ponta (responsável → secretaria recusa → responsável reenvia com anexo → secretaria aceita), registro de aula e consulta da coordenação, troca de senha (senha antiga deixa de valer, nova entra, restaurar dados volta à original), inatividade com relógio simulado (29 min continua, atividade reinicia, 30 min encerra), editar escola, ato renovado, editar e desligar professor, repasse.
- Varredura de todas as telas dos 8 perfis em 1280 e 390 px: sem erro de console, sem rolagem horizontal, com `h1` e sem `id` repetido.
- Esses roteiros de navegador não fazem parte do repositório (rodam fora dele, como os anteriores).

## Limites que continuam

- **Senhas** (troca e redefinição): valem no navegador em que foram feitas, porque o protótipo não tem servidor de contas. Em produção seria no servidor, com senha em hash e sal.
- **Transferência:** quem confirma ou recusa no destino é a secretaria da outra escola; a demonstração só tem a secretaria de uma escola, então o pedido fica visível como *Aguardando confirmação* na origem. As duas pontas funcionam e estão testadas.
- **Abono:** só vale para falta que veio da chamada, com data.
- **Plano de aula:** confere o formato e a combinação do código com o ano da turma, não o texto da habilidade.
- **Avisos lidos:** a marcação fica neste aparelho, por usuário.
