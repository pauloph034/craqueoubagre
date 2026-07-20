"use client";

import Image from "next/image";

export function SoccerBallHero() {
  return (
    <div
      className="relative min-h-[330px] overflow-visible sm:min-h-[390px] lg:-ml-12 lg:min-h-[460px]"
      aria-label="Bola de futebol 3D animada"
    >
      <div className="absolute left-1/2 top-[45%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300/10 blur-3xl sm:h-96 sm:w-96 lg:left-[44%] lg:h-[480px] lg:w-[480px]" />
      <div className="absolute bottom-12 left-1/2 h-20 w-80 -translate-x-1/2 rounded-full bg-emerald-300/10 blur-3xl lg:left-[44%]" />

      <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 sm:h-96 sm:w-96 lg:left-[44%] lg:h-[430px] lg:w-[430px]">
        <div className="real-soccer-ball-bounce">
          <Image
            src="/assets/soccer-ball-3d.png"
            alt="Bola de futebol 3D"
            width={640}
            height={640}
            priority
            className="h-full w-full object-contain drop-shadow-[0_24px_42px_rgba(0,0,0,.62)]"
          />
        </div>
        <div className="ball-soft-shadow absolute bottom-0 left-1/2 h-10 w-56 -translate-x-1/2 rounded-full bg-black/45 blur-lg" />
      </div>
    </div>
  );
}
