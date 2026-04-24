# Sistema de Planejamento de Producao

Aplicacao web local para substituir a planilha `planejamento_producao.xlsx` com:

- fila sequencial de ordens
- calculo automatico de horas, inicio e termino
- calendario semanal de producao
- lancamento de refugo por ordem com recalculo imediato
- exportacao em CSV compativel com Excel e impressao em PDF
- interface separada em telas de visao geral, planejamento, refugos e configuracoes

## Como executar

1. Rode `python server.py`
2. Abra `http://127.0.0.1:8000`
3. Para testar o motor de calculo, rode `node tests/planner.test.js`

## Como funciona

- Os dados ficam salvos no `localStorage` do navegador.
- A base inicial da fila foi carregada a partir da planilha atual.
- A interface foi separada em quatro telas para reduzir poluicao visual:
  - `Visao geral`: indicadores e leitura rapida da fila
  - `Planejamento`: agora dividido em `Fila` e `Cadastro de ordem`
  - `Refugos`: agora dividido em `Lancar refugo` e `Historico`
  - `Configuracoes`: calendario, produtividade e utilitarios
- O calendario vem configurado para:
  - abertura: `domingo 22:40`
  - fechamento: `sabado 16:00`
- A produtividade padrao inicial e `750 kg/h`, mas pode ser alterada por ordem ou na configuracao global.

## Observacoes

- O botao `Exportar CSV` gera um arquivo que abre normalmente no Excel.
- O botao `Gerar PDF` usa a impressao do navegador.
- O botao `Restaurar base inicial` apaga os dados locais atuais e volta para a carga original.
