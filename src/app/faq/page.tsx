import { EditorialPageHeader } from "@/components/ui/editorial";

const questions = [
  ["Os resultados são totalmente aleatórios?", "Não. A simulação considera a força do elenco, encaixe nas posições, entrosamento, formação, tática e dificuldade. O acaso existe para manter cada partida imprevisível, mas não decide tudo sozinho."],
  ["De onde vêm os overalls?", "Os valores são uma avaliação editorial do desempenho do jogador naquela temporada. Eles não reproduzem uma nota oficial de outro jogo."],
  ["Posso jogar sem criar conta?", "O modo solo pode ser jogado sem conta. Para criar ou entrar em salas com amigos, é necessário ter um perfil."],
  ["Como funciona o modo com amigos?", "Cada pessoa monta o próprio elenco. As partidas avançam por rodada e os eliminados continuam acompanhando o chaveamento até a final."],
  ["Por que há várias versões do mesmo clube?", "Cada edição representa uma temporada específica. O elenco, o técnico e a força refletem aquele recorte histórico."],
  ["O jogo é oficial?", "Não. Craque ou Bagre é um projeto independente e não possui afiliação com competições, clubes ou atletas."]
] as const;

export default function FaqPage() {
  return (
    <main className="editorial-shell max-w-4xl py-6">
      <EditorialPageHeader chapter="Ajuda rápida" title="Perguntas frequentes" description="Respostas diretas sobre o draft, as partidas e os dados do jogo." />

      <section className="mt-5 border-l border-t border-black bg-white">
        {questions.map(([question, answer], index) => (
          <details key={question} className="group border-b border-r border-black">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 px-4 py-3">
              <span className="editorial-number text-sm">{String(index + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-sm font-black uppercase">{question}</span>
              <span className="inline-block text-xl font-black transition group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <p className="border-t border-black/15 px-14 py-4 text-sm leading-6 text-[var(--muted)]">{answer}</p>
          </details>
        ))}
      </section>
    </main>
  );
}
