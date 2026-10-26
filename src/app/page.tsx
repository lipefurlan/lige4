import Game from "@/components/Game";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-4 px-4 py-6">
      <header className="text-center">
        <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl">
          Lig <span className="text-red-500">4</span>
        </h1>
        <p className="mt-2 text-white/60">Alinhe 4 peças na horizontal, vertical ou diagonal.</p>
      </header>
      <Game />
    </main>
  );
}
