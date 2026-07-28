import { clubSeasons } from "@/data/loaders";
import { EditorialPageHeader } from "@/components/ui/editorial";

type SeasonItem = (typeof clubSeasons)[number];

const byClub = Array.from(
  clubSeasons.reduce((groups, season) => {
    const seasons = groups.get(season.clubName) ?? [];
    seasons.push(season);
    groups.set(season.clubName, seasons);
    return groups;
  }, new Map<string, SeasonItem[]>())
).sort(([clubA], [clubB]) => clubA.localeCompare(clubB, "pt-BR"));

const byEdition = [...clubSeasons].sort((a, b) => {
  const seasonOrder = b.season.localeCompare(a.season);
  return seasonOrder || a.clubName.localeCompare(b.clubName, "pt-BR");
});

export default function TeamsPage() {
  return (
    <main className="editorial-shell max-w-6xl py-6">
      <EditorialPageHeader
        chapter="Base histórica"
        title="Times no jogo"
        description={`${clubSeasons.length} elencos ativos de ${byClub.length} clubes, organizados por clube e por edição.`}
        action={
          <nav className="flex border border-black bg-white text-[10px] font-black uppercase">
            <a href="#por-clube" className="px-3 py-2 hover:bg-black hover:text-white">Por clube</a>
            <a href="#por-edicao" className="border-l border-black px-3 py-2 hover:bg-black hover:text-white">Por edição</a>
          </nav>
        }
      />

      <section id="por-clube" className="scroll-mt-20 pt-7">
        <div className="mb-3 flex items-end justify-between border-b border-black pb-2">
          <div>
            <p className="editorial-kicker">Catálogo 01</p>
            <h2 className="mt-1 font-display text-2xl font-black uppercase">Clubes e temporadas</h2>
          </div>
          <span className="text-[10px] font-black uppercase text-[var(--muted)]">{byClub.length} clubes</span>
        </div>

        <div className="grid border-l border-t border-black sm:grid-cols-2 lg:grid-cols-3">
          {byClub.map(([club, seasons]) => (
            <article key={club} className="min-h-32 border-b border-r border-black bg-white p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--accent)]">{seasons[0]?.country}</p>
              <h3 className="mt-1 font-display text-xl font-black uppercase">{club}</h3>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {[...seasons].sort((a, b) => a.season.localeCompare(b.season)).map((season) => (
                  <span key={season.id} className="border border-black/25 px-2 py-1 font-mono text-[10px]">{shortSeason(season.season)}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="por-edicao" className="scroll-mt-20 pt-10">
        <div className="mb-3 flex items-end justify-between border-b border-black pb-2">
          <div>
            <p className="editorial-kicker">Catálogo 02</p>
            <h2 className="mt-1 font-display text-2xl font-black uppercase">Edições por ano</h2>
          </div>
          <span className="text-[10px] font-black uppercase text-[var(--muted)]">{byEdition.length} edições</span>
        </div>

        <div className="grid border-l border-t border-black sm:grid-cols-2 lg:grid-cols-4">
          {byEdition.map((season) => (
            <article key={season.id} className="border-b border-r border-black bg-white p-3">
              <p className="font-mono text-sm font-black text-[var(--accent)]">{shortSeason(season.season)}</p>
              <h3 className="mt-1 truncate text-xs font-black uppercase" title={season.clubName}>{season.clubName}</h3>
              <p className="mt-1 text-[9px] uppercase text-[var(--muted)]">{season.country} · {season.competitionStage}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function shortSeason(season: string) {
  const [start, end] = season.split("/");
  return `${start.slice(-2)}/${end}`;
}
