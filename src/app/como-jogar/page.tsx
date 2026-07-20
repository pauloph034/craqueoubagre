export default function HowToPage() {
  const steps = ["Escolha formacao, dificuldade e estilo tatico.", "Selecione uma vaga vazia e sorteie um clube-temporada.", "Escolha um jogador compativel, evitando duplicados canonicos.", "Complete 11 jogadores, confirme o elenco e simule a campanha.", "Busque sete vitorias sem sofrer gols para a Campanha Perfeita."];
  return <main className="mx-auto max-w-4xl px-4 py-8"><h1 className="text-4xl font-black">Como jogar</h1><ol className="mt-6 space-y-3">{steps.map((step, index) => <li key={step} className="rounded-lg border border-white/12 bg-white/[0.06] p-4"><strong>{index + 1}.</strong> {step}</li>)}</ol></main>;
}
