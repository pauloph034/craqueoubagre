import Link from "next/link";

export default function NotFound() {
  return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-4xl font-black">Pagina nao encontrada</h1><p className="mt-3 text-slate-300">Nao encontramos essa rota no estadio.</p><Link className="mt-6 inline-block text-electric" href="/">Voltar ao inicio</Link></main>;
}
