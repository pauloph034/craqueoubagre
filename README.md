# Craque ou Bagre

Jogo web independente de montagem de elenco historico. O jogador sorteia clube-temporadas, escolhe atletas compativeis, monta 11 titulares e simula uma campanha europeia de sete partidas.

## Tecnologias

Next.js App Router, TypeScript strict, React, Tailwind CSS, Zustand, Zod, Framer Motion, Lucide React, seedrandom, Vitest, Testing Library e Playwright.

## Como executar

```bash
npm install
npm run dev
```

Crie um `.env.local` a partir de `.env.example` quando quiser habilitar a API-Football:

```env
API_FOOTBALL_KEY=sua_chave_aqui
```

Nao use `NEXT_PUBLIC_` nessa chave. Ela e lida somente pelo endpoint server-side `GET /api/football/teams`.

## Validacao

```bash
npm run validate:data
npm run lint
npm test
npm run build
```

## API-Football e escudos

O projeto possui uma integracao segura com a API-Football para escudos e dados basicos dos clubes.

1. Crie uma conta em https://www.api-football.com/ ou no painel API-Sports.
2. Copie sua chave da API-Football.
3. Configure `API_FOOTBALL_KEY` no `.env.local`.
4. Rode `npm run dev`.
5. Teste `GET /api/football/teams?search=real` ou use o painel admin em `/admin/dados`.

O endpoint interno aceita:

```text
GET /api/football/teams?league=2&season=2025
GET /api/football/teams?search=Real Madrid
GET /api/football/teams?teamId=541
GET /api/football/teams?local=1
```

A chave nunca e enviada ao navegador. A resposta e normalizada para o formato do jogo e retorna somente campos necessarios como `apiId`, `name`, `code`, `country`, `logo`, `fallbackLogo` e `source`.

### Cache

Os dados ficam em cache de memoria por 24 horas em `src/services/footballApi.ts`. O fluxo e:

1. procura no cache;
2. usa cache valido;
3. chama a API apenas quando necessario;
4. atualiza o cache se a API responder;
5. usa `src/data/football-clubs.ts` como fallback local se a chave estiver ausente, a API falhar ou o limite for atingido.

### Cadastro local e IDs

O mapeamento local fica em `src/data/football-clubs.ts`. Ele preserva os IDs internos do jogo e relaciona aliases como `psg`, `paris-saint-germain`, `man-city`, `manchester-city`, `inter` e `internazionale` aos IDs da API quando conhecidos.

Para descobrir ou confirmar o ID de um time:

1. entre como admin;
2. abra `/admin/dados`;
3. use a busca "API-Football";
4. confira nome, pais, codigo, escudo e `apiId`;
5. atualize o mapeamento local se necessario.

### Placeholder

O fallback visual fica em `public/images/team-placeholder.svg`. O componente `src/components/game/TeamCrest.tsx` troca automaticamente para esse SVG se a imagem externa falhar, evitando quebra de layout.

Arquivos principais da integracao:

- `src/types/football.ts`
- `src/data/football-clubs.ts`
- `src/services/footballApi.ts`
- `src/app/api/football/teams/route.ts`
- `src/components/game/TeamCrest.tsx`
- `src/components/game/TeamNameWithCrest.tsx`
- `public/images/team-placeholder.svg`
- `scripts/football-api-tests.ts`

## Dados

O dataset demonstrativo fica em `src/data`. Ele inclui clube-temporadas, jogadores gerados editorialmente, adversarios e conquistas. Os ratings e elencos editoriais continuam substituiveis. Os escudos oficiais sao carregados pela API-Football quando a chave estiver configurada; sem chave, o jogo usa o cadastro local e placeholder.

Para adicionar elencos, veja `docs/ADDING_CLUB_SEASONS.md`. Para alterar probabilidades, edite `src/config/game-balance.ts`.

## Supabase futuro

O MVP funciona offline/local. Para ranking online, configure variaveis em `.env.local` a partir de `.env.example` e implemente validacao server-side dos resultados.

## Propriedade intelectual

Champions XI e um projeto independente, nao afiliado a UEFA, clubes, competicoes ou atletas.
