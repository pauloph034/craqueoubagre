import { EditorialPageHeader } from "@/components/ui/editorial";

const principles = [
  ["01", "História em campo", "Clubes, temporadas e jogadores aparecem como referência histórica e editorial."],
  ["02", "Decisão importa", "Formação, estilo tático, encaixe de posição e qualidade do elenco influenciam as partidas."],
  ["03", "Projeto independente", "O jogo não representa nem possui vínculo oficial com competições, clubes ou atletas."]
] as const;

export default function AboutPage() {
  return (
    <main className="editorial-shell max-w-6xl py-6">
      <EditorialPageHeader
        chapter="Sobre o projeto"
        title="Futebol de épocas diferentes"
        description="Craque ou Bagre é um jogo de montagem de elenco histórico: sorteie clubes, escolha jogadores e descubra até onde o seu time consegue chegar."
      />

      <section className="mt-5 grid border-l border-t border-black md:grid-cols-3">
        {principles.map(([number, title, description]) => (
          <article key={number} className="min-h-48 border-b border-r border-black bg-white p-5">
            <span className="editorial-number">{number}</span>
            <h2 className="mt-8 font-display text-2xl font-black uppercase">{title}</h2>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
