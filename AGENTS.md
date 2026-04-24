# AGENTS.md

## Objetivo

Este arquivo existe para preservar contexto de negocio e reduzir retrabalho entre tasks.
Qualquer agente que atuar neste projeto deve usar este documento como referencia primaria
para regras de negocio, fluxos operacionais e decisoes ja tomadas.

Quando uma task mudar comportamento do sistema, este arquivo deve ser atualizado no mesmo trabalho.

## Produto

- Aplicacao web local para planejamento de producao da Himasa.
- Objetivo principal: substituir a planilha operacional por uma interface web simples,
  persistida no navegador da maquina.
- Stack atual:
  - `index.html`
  - `app.js`
  - `planner.js`
  - `styles.css`
  - `server.py`
- Persistencia local via `localStorage`.

## Versionamento

- O projeto deve ser versionado em Git.
- Repositorio local inicializado com branch principal `main`.
- Publicacao prevista no GitHub pessoal:
  - `https://github.com/sanmartin21`
- Nao assumir disponibilidade de GitHub CLI (`gh`) neste ambiente sem verificar antes.

## Convencoes de repositorio

- Nomes de arquivos e pastas publicados no Git devem ser descritivos e estaveis.
- Evitar nomes provisiorios ou informais como `copy`, `novo`, `teste`, `final`, `ajuste`.
- Assets visuais devem ficar em pastas dedicadas como `assets/` sempre que fizer sentido.
- `README.md` deve refletir a estrutura funcional atual do sistema.
- Alteracao funcional relevante exige sincronizacao entre codigo, `README.md` e `AGENTS.md`.

## Regras de negocio atuais

### Fila de producao

- A fila e sequencial.
- A ordem das ordens impacta diretamente inicio, termino e horas das ordens seguintes.
- Cada ordem possui no minimo:
  - numero da ordem
  - cliente
  - kg planejado
  - produtividade em kg/h
- Regra semantica:
  - `numero da ordem` e `numero do pedido do cliente` significam a mesma coisa neste sistema
  - esse campo identifica o pedido comercial do cliente
  - isso nao deve ser confundido com `Seq.`, que representa apenas a posicao da ordem na fila
- A produtividade padrao inicial e `750 kg/h`, mas pode ser alterada:
  - globalmente nas configuracoes
  - individualmente por ordem
- A fila usa janela semanal de producao configuravel.
- Configuracao inicial da janela:
  - abertura: `domingo 22:40`
  - fechamento: `sabado 16:00`
- Quando a producao ultrapassa a janela semanal, o restante continua na proxima janela valida.

### Recalculo

- Qualquer alteracao estrutural deve recalcular a fila:
  - cadastrar ordem
  - editar ordem
  - reordenar
  - excluir
  - lancar ou remover refugo
  - marcar pedido como pronto
- O recalculo atualiza:
  - sequencia
  - horas
  - inicio previsto
  - termino previsto
  - fim previsto da fila

### Refugos

- Refugo e sempre registrado por ordem.
- Cada lancamento de refugo possui:
  - ordem vinculada
  - kg
  - data/hora do lancamento
  - observacao opcional
- O refugo aumenta o total efetivo da ordem:
  - `totalKg = plannedKg + scrapKg`
- O refugo impacta a duracao da ordem atual e desloca as seguintes.
- O historico de refugo deve permitir auditoria e remocao de lancamentos.

### Pedidos prontos

- `Pedido pronto` significa conclusao operacional da ordem.
- Ao marcar um pedido como pronto:
  - a ordem sai da fila ativa
  - a fila restante e recalculada
  - o sistema redireciona para a tela de historico de pedidos prontos
- O registro de pedido pronto e confirmado em modal.
- A data/hora da finalizacao pode ser ajustada manualmente antes de salvar.
- O historico de pedidos prontos deve exibir a hora da finalizacao em verde.
- O historico de pedidos prontos e uma tela principal propria, nao uma subtela.
- O registro salvo no historico deve manter um snapshot da ordem no momento da conclusao,
  incluindo pelo menos:
  - `orderId`
  - `orderNumber`
  - `client`
  - `plannedKg`
  - `scrapKg`
  - `totalKg`
  - `rateKgPerHour`
  - `hours`
  - `startAt`
  - `endAt`
  - `completedAt`

### Persistencia e restauracao

- Os dados operacionais ficam salvos no navegador desta maquina.
- O estado persistido atual inclui:
  - `config`
  - `orders`
  - `scrapEvents`
  - `completedOrders`
  - `lastRecalculatedAt`
- O sistema deve continuar carregando estados antigos que nao tenham `completedOrders`.
- `Restaurar base inicial` apaga os dados locais atuais e volta para a carga seed.
- A fila vazia e um estado valido e nao deve recriar automaticamente a base seed.

## Estrutura funcional atual

- `Visao geral`
  - indicadores principais
  - leitura rapida das proximas ordens
- `Planejamento`
  - `Fila`
  - `Cadastro de ordem`
- `Pedidos prontos`
  - historico de ordens finalizadas
- `Refugos`
  - `Lancar refugo`
  - `Historico`
- `Configuracoes`
  - calendario
  - produtividade
  - exportacao
  - restauracao

## Convencoes para futuras tasks

- Antes de implementar, conferir se a regra ja existe neste arquivo.
- Se a task criar uma nova regra de negocio, registrar aqui no mesmo turno.
- Se a task apenas refinar comportamento existente, atualizar a secao correspondente
  e evitar duplicar regras em varias secoes.
- Em caso de conflito entre implementacao atual e este documento:
  - corrigir a implementacao se a task confirmar que a regra deste arquivo e a valida
  - ou atualizar este arquivo se a regra tiver mudado oficialmente
- Evitar inferir comportamento de negocio sem registrar a decisao depois.

## Pendencias conhecidas

- Exportacao CSV e relatorio impresso ainda refletem apenas a fila ativa, nao o historico
  de pedidos prontos.
- Nao existe, por enquanto, edicao ou remocao de pedidos prontos no historico.

## Modelo de atualizacao deste arquivo

Ao fechar uma nova task relevante, atualizar:

1. `Regras de negocio atuais`, se houver nova decisao funcional.
2. `Estrutura funcional atual`, se houver nova tela, subtela ou fluxo.
3. `Pendencias conhecidas`, se a task deixar limites assumidos para depois.

Se a task for puramente tecnica e nao alterar regra de negocio, nao inventar regra nova.
