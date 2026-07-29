-- Execute no SQL Editor do Supabase para habilitar o pais no perfil.
alter table public.cob_users
  add column if not exists country text;

notify pgrst, 'reload schema';
