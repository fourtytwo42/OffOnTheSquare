import Image from "next/image";
import Link from "next/link";

export default function SplashPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(179,28,28,0.22),transparent_34%),radial-gradient(circle_at_bottom,rgba(212,175,55,0.08),transparent_30%)]" />
      <div className="relative z-10 flex w-full max-w-5xl flex-1 flex-col items-center">
        <div className="w-full max-w-4xl">
          <div className="relative mx-auto aspect-[1.55/1] w-full max-w-[min(92vw,58rem)]">
            <Image
              src="/name.png"
              alt="Off On The Square"
              fill
              priority
              sizes="(max-width: 1024px) 92vw, 58rem"
              className="object-contain drop-shadow-[0_0_36px_rgba(0,0,0,0.7)]"
            />
          </div>
        </div>

        <div className="mt-10 sm:mt-14">
          <Link
            href="/enter"
            className="group inline-flex items-center justify-center rounded-[1.2rem] border border-[#ff6b6b]/75 px-8 py-5 text-center font-[family-name:var(--font-cinzel)] text-3xl uppercase tracking-[0.22em] text-[#ff7e7e] shadow-[0_0_12px_rgba(255,72,72,0.55),0_0_30px_rgba(172,18,18,0.35),inset_0_0_18px_rgba(255,70,70,0.08)] transition hover:text-[#ffb0b0] hover:shadow-[0_0_20px_rgba(255,72,72,0.85),0_0_56px_rgba(172,18,18,0.5),inset_0_0_26px_rgba(255,70,70,0.14)] sm:px-12 sm:py-6 sm:text-5xl"
            style={{
              background:
                "linear-gradient(180deg, rgba(24,4,4,0.82) 0%, rgba(10,2,2,0.94) 100%)",
              textShadow:
                "0 0 8px rgba(255,120,120,0.9), 0 0 24px rgba(255,30,30,0.6)",
            }}
          >
            Click to Enter
          </Link>
        </div>
      </div>
    </main>
  );
}
