"use client";

import { Button } from "@/components/ui/button";
import { achievements, clubSeasons, opponents, players } from "@/data/loaders";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/stores/game-store";
import { BarChart3, Clock3, Database, KeyRound, Lock, Search, ShieldCheck, Trash2, Trophy, UserCog, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DashboardMetrics = {
  visits: number;
  users: number;
  campaigns: number;
  matches: number;
  estimatedHours: number;
  trophies: number;
  players: number;
  teams: number;
};

export default function AdminDataPage() {
  const currentUser = useGameStore((state) => state.currentUser);
  const users = useGameStore((state) => state.users);
  const loadAccount = useGameStore((state) => state.loadAccount);
  const loadHistory = useGameStore((state) => state.loadHistory);
  const adminResetPassword = useGameStore((state) => state.adminResetPassword);
  const adminDeleteUser = useGameStore((state) => state.adminDeleteUser);
  const adminToggleRole = useGameStore((state) => state.adminToggleRole);
  const [dashboard, setDashboard] = useState<DashboardMetrics>();
  const [query, setQuery] = useState("");
  const [temporaryAccess, setTemporaryAccess] = useState<{ username: string; password: string }>();

  useEffect(() => {
    void loadAccount();
    loadHistory();
  }, [loadAccount, loadHistory]);

  useEffect(() => {
    if (currentUser?.role !== "admin") return;
    fetch("/api/admin/dashboard")
      .then((response) => response.json())
      .then((data: { metrics?: DashboardMetrics }) => {
        if (data.metrics) setDashboard(data.metrics);
      })
      .catch(() => undefined);
  }, [currentUser?.role]);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [user.username, user.playerName, user.teamName, user.role].filter(Boolean).some((value) => String(value).toLowerCase().includes(term))
    );
  }, [query, users]);

  const missingGk = clubSeasons.filter((season) => !players.some((player) => player.clubSeasonId === season.id && player.primaryPosition === "GK"));
  const activeSeasons = clubSeasons.filter((season) => season.isActive);

  if (currentUser?.role !== "admin") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section className="rounded-2xl border border-white/12 bg-night/80 p-7 shadow-card">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-gold">Acesso restrito</p>
          <h1 className="mt-3 text-4xl font-black">Painel administrativo</h1>
          <p className="mt-2 text-slate-300">Entre com uma conta administradora para ver metricas, usuarios e ferramentas de manutencao.</p>
          <Link href="/conta?modo=entrar"><Button className="mt-5">Entrar</Button></Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="rounded-2xl border border-white/15 bg-[linear-gradient(135deg,rgba(5,22,49,.92),rgba(3,64,70,.72))] p-6 shadow-2xl backdrop-blur md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-gold">Admin</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black md:text-5xl">Dashboard do jogo</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Controle local de usuarios, base de dados, campanhas e sinais de uso do Craque ou Bagre.
            </p>
          </div>
          <div className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-5 py-3 text-sm font-black text-emerald-100">
            {currentUser.playerName ?? currentUser.username}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={BarChart3} label="Visitas no site" value={dashboard?.visits ?? "..."} />
        <Metric icon={Users} label="Usuarios cadastrados" value={dashboard?.users ?? users.length} />
        <Metric icon={Trophy} label="Partidas jogadas" value={dashboard?.matches ?? "..."} />
        <Metric icon={Clock3} label="Horas jogadas" value={dashboard ? `${dashboard.estimatedHours.toFixed(1)}h` : "..."} />
        <Metric icon={Database} label="Jogadores cadastrados" value={dashboard?.players ?? players.length} />
        <Metric icon={ShieldCheck} label="Times cadastrados" value={dashboard?.teams ?? activeSeasons.length} />
        <Metric icon={Trophy} label="Campanhas salvas" value={dashboard?.campaigns ?? "..."} />
        <Metric icon={Trophy} label="Tacas conquistadas" value={dashboard?.trophies ?? "..."} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-2xl border border-white/12 bg-night/75 p-5 shadow-card backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">Usuarios</p>
              <h2 className="mt-2 text-2xl font-black">Acessos cadastrados</h2>
            </div>
            <label className="relative block md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-full border border-white/12 bg-[#050b18]/80 py-3 pl-10 pr-4 text-sm outline-none focus:border-electric/70"
                value={query}
                placeholder="Pesquisar por usuario, nome ou time"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          {temporaryAccess && (
            <div className="mt-4 rounded-xl border border-gold/35 bg-gold/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">Senha temporaria gerada</p>
              <p className="mt-1 font-mono text-lg font-black">{temporaryAccess.username}: {temporaryAccess.password}</p>
              <p className="mt-1 text-xs text-slate-300">O jogador entra com essa senha e troca por uma nova em Conta.</p>
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr><th>ID</th><th>Nome</th><th>Time</th><th>Perfil</th><th>Criado</th><th className="text-right">Acoes</th></tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isProtected = user.username.toLowerCase() === "admin" || user.username === currentUser.username;
                  return (
                    <tr key={user.username} className="bg-white/[0.045]">
                      <td className="rounded-l-xl px-3 py-3 font-mono font-black">{user.username}</td>
                      <td className="px-3 py-3">{user.playerName ?? user.username}</td>
                      <td className="px-3 py-3">{user.teamName ?? `${user.username} FC`}</td>
                      <td className="px-3 py-3">
                        <span className={cn("rounded-full px-3 py-1 text-xs font-black", user.role === "admin" ? "bg-gold/15 text-gold" : "bg-cyan-300/10 text-cyan-100")}>
                          {user.role === "admin" ? "Admin" : "Jogador"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-300">{new Date(user.createdAt).toLocaleDateString("pt-BR")}</td>
                      <td className="rounded-r-xl px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <IconButton
                            label="Gerar senha"
                            disabled={isProtected}
                            icon={KeyRound}
                            onClick={async () => {
                              const password = await adminResetPassword(user.username);
                              if (password) setTemporaryAccess({ username: user.username, password });
                            }}
                          />
                          <IconButton label={user.role === "admin" ? "Remover admin" : "Dar admin"} disabled={isProtected} icon={UserCog} onClick={() => void adminToggleRole(user.username)} />
                          <IconButton label="Excluir" disabled={isProtected} icon={Trash2} danger onClick={() => void adminDeleteUser(user.username)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-6">
          <section className="rounded-2xl border border-white/12 bg-night/75 p-5 shadow-card backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">Base de dados</p>
            <h2 className="mt-2 text-2xl font-black">Saude do cadastro</h2>
            <div className="mt-4 grid gap-3">
              <Health label="Elencos ativos" value={activeSeasons.length} />
              <Health label="Adversarios" value={opponents.length} />
              <Health label="Conquistas" value={achievements.length} />
              <Health label="Elencos sem goleiro" value={missingGk.length} warning={missingGk.length > 0} />
            </div>
          </section>

          <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-5 shadow-card backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-200/40 bg-cyan-200/10 text-cyan-100">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-200">Seguranca</p>
                <h2 className="text-xl font-black">Protecao aplicada</h2>
              </div>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <li>Senha nao vai mais para o front-end: fica como hash no servidor.</li>
              <li>Sessao usa cookie HTTP-only assinado.</li>
              <li>Acoes admin sao bloqueadas na API quando a conta nao e admin.</li>
              <li>Senhas temporarias so aparecem apos geracao manual.</li>
            </ul>
            <p className="mt-4 rounded-xl border border-gold/25 bg-gold/10 p-3 text-xs leading-5 text-slate-200">
              Para fechar producao, configure Supabase e variaveis de ambiente no deploy. Sem banco externo, hospedagem serverless gratuita nao preserva dados.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | string }) {
  return (
    <article className="rounded-2xl border border-white/12 bg-night/75 p-4 shadow-card backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{label}</p>
        <Icon className="h-5 w-5 text-emerald-300" />
      </div>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </article>
  );
}

function Health({ label, value, warning }: { label: string; value: number; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <span className={cn("font-mono text-lg font-black", warning ? "text-red-200" : "text-gold")}>{value}</span>
    </div>
  );
}

function IconButton({ label, icon: Icon, danger, disabled, onClick }: { label: string; icon: LucideIcon; danger?: boolean; disabled?: boolean; onClick: () => void | Promise<void> }) {
  return (
    <button
      className={cn(
        "grid h-10 w-10 place-items-center rounded-xl border transition",
        danger ? "border-red-300/25 bg-red-400/10 text-red-100 hover:bg-red-400/20" : "border-white/12 bg-white/[0.06] text-slate-100 hover:bg-white/12",
        disabled && "cursor-not-allowed opacity-35"
      )}
      type="button"
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
