import { EditorialPageHeader } from "@/components/ui/editorial";

const chapters = [
  ["01", "Prepare", "Escolha formação, estilo tático e dificuldade antes de começar o draft."],
  ["02", "Sorteie", "Sorteie um clube-temporada. Um novo sorteio sem escolher jogador consome um reroll."],
  ["03", "Escale", "Selecione um jogador e depois clique em uma das posições destacadas no campo."],
  ["04", "Complete", "Feche os 11 jogadores, faça as trocas disponíveis e escolha um dos três técnicos."],
  ["05", "Dispute", "Acompanhe a partida minuto a minuto e avance pela fase de grupos e pelo mata-mata."]
] as const;

export default function HowToPage() {
  return (
    <main className="editorial-shell py-6">
      <EditorialPageHeader chapter="Manual de jogo" title="Como jogar" description="Do primeiro sorteio ao último minuto da final." />
      <ol className="mt-5 grid border-l border-t border-black md:grid-cols-2 lg:grid-cols-5">
        {chapters.map(([number, title, text]) => (
          <li key={number} className="min-h-52 border-b border-r border-black bg-white p-4">
            <span className="editorial-number">{number}</span>
            <h2 className="mt-8 font-display text-2xl font-black uppercase">{title}</h2>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{text}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
