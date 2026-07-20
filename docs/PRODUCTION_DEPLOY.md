# Deploy gratuito com login seguro

Este projeto agora suporta autenticação em servidor com:

- senha com hash `scrypt`;
- sessão em cookie HTTP-only assinado;
- permissões admin validadas nas rotas de API;
- banco externo via Supabase REST;
- fallback local em `.data/craque-ou-bagre-db.json` apenas para desenvolvimento.

## Hospedagem sugerida

Use:

- Vercel para hospedar o Next.js;
- Supabase Free para banco Postgres e REST API.

Sem banco externo, plataformas serverless gratuitas não preservam usuários, campanhas e métricas entre execuções.

## 1. Criar tabelas no Supabase

No Supabase, abra o SQL Editor e execute:

```sql
create table if not exists public.cob_users (
  username text primary key,
  player_name text,
  team_name text,
  password_hash text not null,
  role text not null check (role in ('admin', 'player')),
  created_at timestamptz not null default now()
);

create table if not exists public.cob_campaigns (
  id text primary key,
  username text,
  team_name text not null,
  stage_reached text not null,
  champion boolean not null default false,
  matches_count integer not null default 0,
  score integer not null default 0,
  created_at timestamptz not null default now(),
  summary jsonb not null
);

create table if not exists public.cob_metrics (
  key text primary key,
  visits integer not null default 0,
  first_visit_at timestamptz,
  last_visit_at timestamptz
);

create table if not exists public.cob_friend_rooms (
  id text primary key,
  room jsonb not null,
  updated_at timestamptz not null default now()
);
```

## 2. Variáveis de ambiente

Na hospedagem, configure:

```txt
AUTH_SECRET=gere-uma-chave-grande-e-secreta
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin0033
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

Importante: `SUPABASE_SERVICE_ROLE_KEY` nunca deve aparecer no front-end. Ela fica somente nas variáveis da hospedagem.

Para gerar uma `AUTH_SECRET` no PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Deploy na Vercel

1. Suba o projeto para um repositório GitHub.
2. Na Vercel, importe o repositório.
3. Configure as variáveis de ambiente acima.
4. Rode o deploy.

Build command:

```txt
npm run build
```

Output framework:

```txt
Next.js
```

## 4. Atenção ao modo Salas

O login, dashboard, usuários, visitas e campanhas já estão preparados para banco externo.

O modo `Salas` usa Supabase quando as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` existem. No seu PC, ele continua usando arquivo local para facilitar testes.

## 5. Checklist antes de publicar

- Trocar `ADMIN_PASSWORD` depois do primeiro acesso.
- Usar `AUTH_SECRET` forte.
- Não commitar `.env.local`.
- Configurar domínio com HTTPS.
- Testar cadastro, login, troca de senha e painel admin em produção.
