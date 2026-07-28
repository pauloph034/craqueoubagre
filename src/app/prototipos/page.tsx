import { ArrowLeft, ArrowRight, Trophy } from "lucide-react";
import Link from "next/link";

const concepts = [
  {
    id: "A",
    name: "Impacto condensado",
    font: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif",
    note: "Mais esportiva, direta e com leitura de placar.",
    layout: "split"
  },
  {
    id: "B",
    name: "Editorial técnico",
    font: "'Bahnschrift Condensed', 'Arial Narrow', sans-serif",
    note: "Mais elegante e versátil para títulos e interface.",
    layout: "stripe"
  },
  {
    id: "C",
    name: "Pôster brutalista",
    font: "'Arial Black', Arial, sans-serif",
    note: "Mais larga, pesada e com presença de campanha.",
    layout: "poster"
  }
] as const;

export default function HomePrototypesPage() {
  return (
    <main className="editorial-shell py-6">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-black pb-5">
        <div>
          <p className="editorial-kicker">Estudo tipográfico · Tela inicial</p>
          <h1 className="editorial-page-title mt-2">Escolha uma direção</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            As três opções mantêm “OU BAGRE?” na mesma linha e usam fontes disponíveis no Windows.
          </p>
        </div>
        <Link className="inline-flex items-center gap-2 border border-black bg-white px-4 py-3 text-xs font-black uppercase" href="/">
          <ArrowLeft size={15} /> Voltar à home
        </Link>
      </header>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        {concepts.map((concept) => (
          <article key={concept.id} className="flex min-h-[680px] flex-col border border-black bg-white">
            <div className="grid grid-cols-[4.25rem_1fr] border-b border-black">
              <span className="grid min-h-16 place-items-center bg-black font-display text-3xl font-black text-white">{concept.id}</span>
              <div className="p-3">
                <h2 className="text-sm font-black uppercase">{concept.name}</h2>
                <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">{concept.note}</p>
              </div>
            </div>
            <Prototype concept={concept} />
            <div className="mt-auto grid grid-cols-[1fr_auto] border-t border-black">
              <div className="p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">Fonte</p>
                <p className="mt-1 text-xs font-bold">{concept.font.split(",")[0]?.replaceAll("'", "")}</p>
              </div>
              <span className="grid w-14 place-items-center border-l border-black bg-[var(--accent)]">
                <ArrowRight size={18} />
              </span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

function Prototype({ concept }: { concept: (typeof concepts)[number] }) {
  if (concept.layout === "stripe") {
    return (
      <div className="flex flex-1 flex-col bg-[var(--background)] p-5">
        <p className="text-[9px] font-black uppercase tracking-[0.18em]">Liga dos Craques · Ed. 01</p>
        <div className="my-auto">
          <p className="text-xs font-bold uppercase text-[var(--accent)]">Monte. Escale. Dispute.</p>
          <h3 className="mt-3 uppercase leading-[0.78]" style={{ fontFamily: concept.font, fontSize: "clamp(3.8rem, 6vw, 6.3rem)", fontWeight: 900 }}>
            Craque
            <span className="block whitespace-nowrap text-[0.64em]">ou Bagre?</span>
          </h3>
          <p className="mt-6 max-w-sm text-sm leading-6 text-[var(--muted)]">Onze escolhas. Uma campanha. Nenhuma desculpa.</p>
        </div>
        <div className="grid grid-cols-3 border border-black">
          {["01 Sorteie", "02 Escale", "03 Dispute"].map((step) => (
            <span key={step} className="border-r border-black p-2 text-[9px] font-black uppercase last:border-0">{step}</span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between bg-black p-4 text-white">
          <span className="text-xs font-black uppercase">Jogar agora</span>
          <ArrowRight size={16} className="text-[var(--accent)]" />
        </div>
      </div>
    );
  }

  if (concept.layout === "poster") {
    return (
      <div className="relative flex flex-1 flex-col overflow-hidden bg-[var(--accent)] p-5">
        <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.14em]">
          <span>Temporada aberta</span>
          <span>2026</span>
        </div>
        <div className="relative z-10 my-auto">
          <h3 className="uppercase leading-[0.83]" style={{ fontFamily: concept.font, fontSize: "clamp(3rem, 5vw, 5rem)", fontWeight: 900 }}>
            Craque
            <span className="block whitespace-nowrap text-[0.62em] text-white">ou Bagre?</span>
          </h3>
          <p className="mt-5 max-w-[16rem] text-xs font-bold leading-5">O futebol não perdoa escalação ruim. Monte a sua e prove o contrário.</p>
        </div>
        <div className="absolute -right-8 top-1/2 grid h-52 w-52 -translate-y-1/2 place-items-center rounded-full border border-black/30">
          <Trophy className="h-20 w-20 text-black/15" strokeWidth={1} />
        </div>
        <div className="relative z-10 grid grid-cols-[1fr_4rem] border border-black bg-white">
          <span className="p-4 text-xs font-black uppercase">Entrar em campo</span>
          <span className="grid place-items-center border-l border-black"><ArrowRight size={16} /></span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="flex flex-1 flex-col justify-between p-5">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">A decisão começa no draft</p>
        <div>
          <h3 className="uppercase leading-[0.75]" style={{ fontFamily: concept.font, fontSize: "clamp(3.7rem, 6vw, 6.4rem)", fontWeight: 900 }}>
            Craque
            <span className="block whitespace-nowrap text-[0.66em] text-[var(--accent)]">ou Bagre?</span>
          </h3>
          <p className="mt-6 max-w-[18rem] text-sm leading-6 text-[var(--muted)]">Sorteie lendas, monte o onze e sobreviva ao mata-mata.</p>
        </div>
        <div className="flex items-center justify-between border-t border-black pt-4">
          <span className="text-xs font-black uppercase">Jogar agora</span>
          <ArrowRight size={17} />
        </div>
      </div>
      <div className="grid h-44 grid-cols-2 border-t border-black bg-[var(--accent)]">
        <div className="border-r border-black p-4">
          <span className="text-[9px] font-black uppercase tracking-[0.14em]">Seu elenco</span>
          <p className="mt-4 font-display text-5xl font-black">11</p>
        </div>
        <div className="p-4">
          <span className="text-[9px] font-black uppercase tracking-[0.14em]">Objetivo</span>
          <p className="mt-4 text-lg font-black uppercase leading-tight">Erguer<br />a taça</p>
        </div>
      </div>
    </div>
  );
}
