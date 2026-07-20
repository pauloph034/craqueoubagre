"use client";

import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { Lock, ShieldCheck, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { Suspense, useEffect, useRef, useState } from "react";

export default function AccountPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-6xl px-4 py-10"><section className="rounded-lg border border-white/12 bg-white/[0.07] p-6 shadow-card">Carregando acesso...</section></main>}>
      <AccountContent />
    </Suspense>
  );
}

function AccountContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentUser = useGameStore((state) => state.currentUser);
  const authError = useGameStore((state) => state.authError);
  const login = useGameStore((state) => state.login);
  const register = useGameStore((state) => state.register);
  const updateProfile = useGameStore((state) => state.updateProfile);
  const changePassword = useGameStore((state) => state.changePassword);
  const logout = useGameStore((state) => state.logout);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [teamName, setTeamName] = useState("");
  const [password, setPassword] = useState("");
  const [profilePlayerName, setProfilePlayerName] = useState("");
  const [profileTeamName, setProfileTeamName] = useState("");
  const [profileSaved, setProfileSaved] = useState("");
  const [passwordSaved, setPasswordSaved] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [inputsLocked, setInputsLocked] = useState(true);
  const usernameRef = useRef<HTMLInputElement>(null);
  const teamNameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const redirectPath = safeRedirect(searchParams.get("redirect"));

  useEffect(() => {
    setMode(searchParams.get("modo") === "criar" ? "register" : "login");
  }, [searchParams]);

  useEffect(() => {
    if (!currentUser) return;
    const playerName = currentUser.playerName?.trim() || currentUser.username;
    setProfilePlayerName(playerName);
    setProfileTeamName(currentUser.teamName?.trim() || `${playerName} FC`);
    setProfileSaved("");
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) return;
    setInputsLocked(true);
    const clearCredentials = () => {
      setUsername("");
      setTeamName("");
      setPassword("");
      if (usernameRef.current) usernameRef.current.value = "";
      if (teamNameRef.current) teamNameRef.current.value = "";
      if (passwordRef.current) passwordRef.current.value = "";
    };
    clearCredentials();
    const timers = [80, 350, 900].map((delay) => window.setTimeout(clearCredentials, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [currentUser, mode]);

  async function submit() {
    const ok = mode === "login" ? await login(username, password) : await register(username, password, teamName);
    if (ok) {
      setUsername("");
      setTeamName("");
      setPassword("");
      if (redirectPath) router.push(redirectPath);
    }
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaved("");
    const ok = await updateProfile({ playerName: profilePlayerName, teamName: profileTeamName });
    if (ok) setProfileSaved("Perfil atualizado.");
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSaved("");
    const ok = await changePassword(currentPassword, nextPassword);
    if (ok) {
      setCurrentPassword("");
      setNextPassword("");
      setPasswordSaved("Senha atualizada.");
      window.setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSaved("");
      }, 900);
    }
  }

  const displayPlayerName = currentUser?.playerName?.trim() || currentUser?.username || "";
  const displayTeamName = currentUser ? currentUser.teamName?.trim() || `${displayPlayerName} FC` : "";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="overflow-hidden rounded-lg border border-white/12 bg-[#06162d]/90 shadow-card">
        <div className="grid lg:grid-cols-[.9fr_1fr]">
          <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(40,184,255,.22),_transparent_38%),linear-gradient(135deg,_rgba(7,24,50,.98),_rgba(3,8,24,.98))] p-8 lg:border-b-0 lg:border-r">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-gold">Acesso local</p>
            <h1 className="mt-3 text-5xl font-black leading-tight">Sua conta no Craque ou Bagre</h1>
            <p className="mt-4 max-w-xl text-slate-300">Entre para salvar campanhas, tacas e historico do seu clube neste navegador.</p>
            <div className="mt-8 grid gap-3">
              <Feature icon={<Lock size={18} />} text="Sem Google e sem cadastro externo." />
              <Feature icon={<ShieldCheck size={18} />} text="Admin reservado ao painel de dados." />
              <Feature icon={<UserPlus size={18} />} text="Crie usuario, nome do time e senha em poucos segundos." />
            </div>
          </div>

          <div className="p-6 md:p-8">
            {currentUser ? (
              <div className="rounded-md border border-gold/25 bg-night/70 p-5">
                <p className="text-sm text-slate-400">Logado como</p>
                <h2 className="text-3xl font-black">{displayPlayerName}</h2>
                <p className="mt-1 text-slate-300">Perfil: {currentUser.role === "admin" ? "Administrador" : "Jogador"}</p>
                <p className="mt-1 text-slate-300">Time: <strong className="text-white">{displayTeamName}</strong></p>
                <form className="mt-5 grid gap-4 rounded-md border border-white/10 bg-[#050b18]/70 p-4" onSubmit={submitProfile}>
                  <label className="grid gap-2 text-sm font-semibold text-slate-200">
                    Nome do jogador
                    <input
                      className="w-full rounded bg-[#071225] p-3"
                      value={profilePlayerName}
                      placeholder="ex: Jogador"
                      onChange={(event) => {
                        setProfileSaved("");
                        setProfilePlayerName(event.target.value);
                      }}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-form-type="other"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-200">
                    Nome do time
                    <input
                      className="w-full rounded bg-[#071225] p-3"
                      value={profileTeamName}
                      placeholder="ex: Meu Clube FC"
                      onChange={(event) => {
                        setProfileSaved("");
                        setProfileTeamName(event.target.value);
                      }}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-form-type="other"
                    />
                  </label>
                  {authError && <p className="rounded border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{authError}</p>}
                  {profileSaved && <p className="rounded border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-bold text-emerald-100">{profileSaved}</p>}
                  <Button type="submit">Salvar perfil</Button>
                </form>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={redirectPath || "/jogar"}><Button>{redirectPath ? "Continuar" : "Jogar"}</Button></Link>
                  {currentUser.role === "admin" && <Link href="/admin/dados"><Button variant="secondary">Painel admin</Button></Link>}
                  <Button variant="secondary" onClick={logout}>Sair</Button>
                </div>
                <button
                  className="mt-4 text-xs font-bold text-slate-400 underline-offset-4 hover:text-electric hover:underline"
                  type="button"
                  onClick={() => {
                    setPasswordSaved("");
                    setCurrentPassword("");
                    setNextPassword("");
                    setShowPasswordModal(true);
                  }}
                >
                  Trocar senha
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 rounded-md border border-white/10 bg-night/70 p-2">
                  <button className={mode === "login" ? "rounded bg-electric px-4 py-3 font-black text-night" : "rounded px-4 py-3 font-black text-slate-200 hover:bg-white/10"} onClick={() => setMode("login")}>
                    Entrar
                  </button>
                  <button className={mode === "register" ? "rounded bg-electric px-4 py-3 font-black text-night" : "rounded px-4 py-3 font-black text-slate-200 hover:bg-white/10"} onClick={() => setMode("register")}>
                    Criar conta
                  </button>
                </div>

                <form className="mt-5 rounded-md border border-white/10 bg-night/70 p-5" autoComplete="off" onSubmit={(event) => { event.preventDefault(); submit(); }}>
                  <input className="hidden" name="fake-user" type="text" autoComplete="off" tabIndex={-1} />
                  <input className="hidden" name="fake-pass" type="password" autoComplete="new-password" tabIndex={-1} />
                  <label className="grid gap-2 text-sm font-semibold text-slate-200">
                    Usuario
                    <input
                      ref={usernameRef}
                      className="w-full rounded bg-[#050b18] p-3"
                      name="craque-ou-bagre-local-user"
                      value={username}
                      placeholder="ex: jogador01"
                      onFocus={() => setInputsLocked(false)}
                      onChange={(event) => setUsername(event.target.value)}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-form-type="other"
                      readOnly={inputsLocked}
                    />
                  </label>
                  {mode === "register" && (
                    <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-200">
                      Nome do time
                      <input
                        ref={teamNameRef}
                        className="w-full rounded bg-[#050b18] p-3"
                        name="craque-ou-bagre-local-team"
                        value={teamName}
                        placeholder="ex: Meu Clube FC"
                        onFocus={() => setInputsLocked(false)}
                        onChange={(event) => setTeamName(event.target.value)}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-form-type="other"
                        readOnly={inputsLocked}
                      />
                    </label>
                  )}
                  <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-200">
                    Senha
                    <input
                      ref={passwordRef}
                      className="w-full rounded bg-[#050b18] p-3"
                      name="craque-ou-bagre-local-secret"
                      type="password"
                      value={password}
                      placeholder="ex: senha1234"
                      onFocus={() => setInputsLocked(false)}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                      readOnly={inputsLocked}
                    />
                  </label>
                  {authError && <p className="mt-3 rounded border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{authError}</p>}
                  <Button className="mt-5 w-full" type="submit">{mode === "login" ? "Entrar" : "Criar conta"}</Button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
      {currentUser && showPasswordModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Trocar senha">
          <form className="w-full max-w-md rounded-2xl border border-white/15 bg-[#06162d] p-5 shadow-2xl" onSubmit={submitPassword}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Seguranca</p>
                <h2 className="mt-1 text-2xl font-black">Trocar senha</h2>
              </div>
              <button
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/12"
                type="button"
                aria-label="Fechar"
                onClick={() => setShowPasswordModal(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-5 grid gap-2 text-sm font-semibold text-slate-200">
              Senha atual ou temporaria
              <input
                className="w-full rounded-lg bg-[#071225] p-3 outline-none focus:ring-2 focus:ring-electric/50"
                type="password"
                value={currentPassword}
                placeholder="senha atual ou fornecida pelo admin"
                onChange={(event) => {
                  setPasswordSaved("");
                  setCurrentPassword(event.target.value);
                }}
                autoComplete="current-password"
              />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-200">
              Nova senha
              <input
                className="w-full rounded-lg bg-[#071225] p-3 outline-none focus:ring-2 focus:ring-electric/50"
                type="password"
                value={nextPassword}
                placeholder="minimo de 6 caracteres"
                onChange={(event) => {
                  setPasswordSaved("");
                  setNextPassword(event.target.value);
                }}
                autoComplete="new-password"
              />
            </label>
            {authError && <p className="mt-4 rounded border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{authError}</p>}
            {passwordSaved && <p className="mt-4 rounded border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-bold text-emerald-100">{passwordSaved}</p>}
            <Button className="mt-5 w-full" type="submit">Salvar nova senha</Button>
          </form>
        </div>
      )}
    </main>
  );
}

function safeRedirect(value: string | null) {
  return value === "/salas" ? "/salas" : "";
}

function Feature({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-200">
      <span className="text-electric">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
