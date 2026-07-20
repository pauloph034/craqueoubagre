# Modelo de Dados

Os dados ficam em `src/data/*.json` e sao validados por Zod em `src/data/schemas.ts`.

`ClubSeason` descreve clube, temporada, cores genericas, raridade, fase alcancada e ids de jogadores.

`Player` descreve identidade canonica, posicoes, atributos editoriais proprios, raridade e confianca dos dados. O campo `canonicalPlayerId` impede duplicidade do mesmo atleta entre elencos.
