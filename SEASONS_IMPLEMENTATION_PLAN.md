# Temporadas Ranqueadas - Plano de Implementacao

## Objetivo

Adicionar o modo `/temporadas` sem alterar as regras ou a persistencia dos modos solo e multiplayer. O modo reutiliza o elenco montado no draft, o motor de partidas, a conta autenticada e o design system editorial atual.

## Arquivos e responsabilidades

- `src/types/seasons.ts`: contratos de temporada, partida, recompensa e participantes.
- `src/config/seasons-balance.ts`: limites, metas das divisoes e valores de XP.
- `src/game-engine/seasons/*`: regras puras de progressao, limite diario e XP.
- `src/server/seasons.ts`: autoridade de servidor para iniciar temporadas, jogar partidas e consultar ranking.
- `src/server/db.ts`: persistencia local e Supabase para temporadas, partidas e recompensas.
- `src/app/api/seasons/*`: leitura do painel, inicio de temporada, partida e ranking Top 100.
- `src/app/temporadas/*`: dashboard responsivo, partida e resultado.
- `src/components/seasons/*`: lista Global/Nacional, progresso e resumo do elenco.
- `src/app/conta/page.tsx` e APIs de autenticacao: pais obrigatorio no cadastro e editavel no perfil.
- `src/components/AppHeader.tsx`: entrada para Temporadas.

## Banco e migracao

Adicionar `country` em `cob_users` e criar:

- `cob_ranked_seasons`: estado autoritativo e snapshot do elenco.
- `cob_ranked_matches`: resultados, idempotencia e limite diario.
- `cob_ranked_rewards`: trofeus e Escudo Elite permanentes.

O fallback local usa o mesmo arquivo `.data/craque-ou-bagre-db.json`, em chaves separadas.

## Endpoints

- `GET /api/seasons/current`: temporada, partidas, limite diario e perfil.
- `POST /api/seasons/start`: valida o elenco e inicia/avanca a temporada.
- `POST /api/seasons/match`: valida limite, gera resultado com seed do servidor e concede XP uma vez.
- `GET /api/seasons/participants?scope=global|national`: Top 100 real, sem perfis artificiais.

## Regras

- 8 partidas por temporada e 8 partidas por dia em `America/Sao_Paulo`.
- Divisoes 10 a 1 e Lenda.
- Pontuacao 3/1/0 e metas configuradas em um unico arquivo.
- 3 trocas opcionais e 2 novos sorteios por temporada.
- XP idempotente, sem alterar rating ou chance de vitoria.
- Trofeu comum nas divisoes 10-1, trofeu Lenda e Escudo Elite no primeiro titulo Lenda.

## Riscos e mitigacoes

- Concorrencia em duas abas: chave de idempotencia e bloqueio de partida ativa no servidor.
- Banco de producao sem migracao: entregar SQL versionado e mensagens de erro explicitas.
- Snapshot adulterado: validar onze atletas, ids canonicos unicos, posicoes e ratings contra a base local.
- Regressao dos modos atuais: estado e tabelas separados; nenhuma chamada a `reset()` ao abrir Temporadas.

## Testes

- Regras puras de divisao, XP e limite diario.
- APIs sem autenticacao, idempotencia e nona partida bloqueada.
- Cadastro/perfil com pais.
- Layout 1366x768 e mobile com abas sem overflow horizontal.
- Regressao: lint, testes existentes e `next build`.
