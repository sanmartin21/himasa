# Himasa Production Planner

Aplicacao web local para planejamento operacional de producao da Himasa. O projeto substitui a planilha operacional por uma interface web simples, com persistencia local no navegador e recalculo automatico da fila.

## Principais capacidades

- fila sequencial de ordens com reordenacao manual
- calculo automatico de horas, inicio e termino por ordem
- janela semanal de producao configuravel
- lancamento de refugo por ordem com impacto imediato no plano
- registro de pedidos prontos com historico dedicado
- exportacao em CSV e impressao em PDF
- persistencia local via `localStorage`

## Estrutura funcional

- `Visao geral`: indicadores principais e leitura rapida das proximas ordens
- `Planejamento > Fila`: edicao, sequenciamento e acoes operacionais
- `Planejamento > Cadastro de ordem`: criacao de novas ordens
- `Pedidos prontos`: historico de ordens finalizadas
- `Refugos > Lancar refugo`: apontamento por ordem
- `Refugos > Historico`: auditoria e remocao de lancamentos
- `Configuracoes`: calendario, produtividade e utilitarios

## Requisitos

- Python 3.11+ para servir os arquivos localmente
- Node.js 20+ para executar os testes do motor de calculo

## Como executar

```bash
python server.py
```

Abra `http://127.0.0.1:8000`.

Alternativamente:

```bash
npm run serve
```

## Testes

```bash
npm test
```

## Regras operacionais importantes

- `numero da ordem` e `numero do pedido do cliente` representam o mesmo identificador comercial
- `Seq.` representa apenas a posicao da ordem dentro da fila ativa
- ao marcar um pedido como pronto, a ordem sai da fila ativa e vai para o historico de pedidos prontos
- qualquer alteracao de fila, refugo ou finalizacao recalcula o plano restante

## Persistencia

- Os dados ficam salvos no navegador desta maquina.
- O estado persistido inclui configuracoes, fila ativa, historico de refugos e historico de pedidos prontos.
- `Restaurar base inicial` apaga os dados locais atuais e volta para a carga seed.

## Estrutura do repositorio

- `index.html`: estrutura da interface
- `app.js`: controle de estado, interacoes e renderizacao
- `planner.js`: motor de calculo e normalizacao dos dados
- `styles.css`: estilos da aplicacao e impressao
- `tests/planner.test.js`: cobertura principal do motor de calculo
- `AGENTS.md`: fonte de verdade para regras de negocio e decisoes acumuladas

## Fonte dos dados iniciais

O arquivo `planejamento_producao.xlsx` permanece no repositorio como referencia da base operacional original.
