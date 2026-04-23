"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import VaultBook, { type VaultBookItem } from "@/components/vault/VaultBook";

export type VaultTabletopProp = "dice" | "map" | "candle" | "coin" | "potion";

export type VaultBookDefinition = {
  id: string;
  slug: string;
  title: string;
  spineTitle: string;
  coverImageSrc?: string;
  categoryHandle?: string;
  items?: VaultBookItem[];
  tabletopProp?: VaultTabletopProp;
};

export type ResolvedVaultBookDefinition = VaultBookDefinition & {
  items: VaultBookItem[];
};

const DESKTOP_BINDER_ASSETS = [
  "/mtg-binder-black-alpha-v4.png",
  "/mtg-binder-blue-alpha-v4.png",
  "/mtg-binder-green-alpha-v4.png",
  "/mtg-binder-white-alpha-v4.png",
  "/mtg-binder-red-alpha-v4.png",
] as const;

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--color-vault-gold)]/26 bg-black/45 text-[color:var(--color-vault-parchment)]/82 shadow-[0_10px_20px_rgba(0,0,0,0.24)] transition hover:border-[color:var(--color-vault-gold)]/55 hover:text-[color:var(--color-vault-gold)]"
    >
      {children}
    </a>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M13.5 21v-7h2.4l.36-2.78H13.5V9.44c0-.8.22-1.34 1.38-1.34H16.4V5.61c-.27-.04-1.18-.11-2.24-.11-2.21 0-3.72 1.35-3.72 3.83v1.89H8v2.78h2.44v7z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" strokeWidth="1.8" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M19.54 5.34A16.4 16.4 0 0 0 15.5 4l-.2.4a15.2 15.2 0 0 1 3.7 1.28A12.7 12.7 0 0 0 12 4.2a12.7 12.7 0 0 0-7 1.48A15.2 15.2 0 0 1 8.7 4.4L8.5 4a16.4 16.4 0 0 0-4.04 1.34C1.9 9.2 1.2 12.94 1.53 16.63A16.6 16.6 0 0 0 6.5 19l1.2-1.62c-.66-.23-1.28-.5-1.87-.82l.45-.35a11.5 11.5 0 0 0 11.44 0l.45.35c-.59.32-1.21.6-1.87.82L17.5 19a16.6 16.6 0 0 0 4.97-2.37c.4-4.28-.67-8-2.93-11.29M9.55 14.4c-.93 0-1.68-.86-1.68-1.92 0-1.07.75-1.93 1.68-1.93.94 0 1.69.86 1.68 1.93 0 1.06-.74 1.92-1.68 1.92m4.9 0c-.93 0-1.68-.86-1.68-1.92 0-1.07.75-1.93 1.68-1.93.94 0 1.69.86 1.68 1.93 0 1.06-.74 1.92-1.68 1.92" />
    </svg>
  );
}

function MobileBookCard({
  book,
  open,
  onToggle,
}: {
  book: ResolvedVaultBookDefinition;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="rounded-[1.8rem] border border-[color:var(--color-vault-gold)]/20 bg-[linear-gradient(180deg,rgba(19,12,9,0.94),rgba(7,5,4,0.98))] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 text-left"
      >
        <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-[0.9rem] border border-[color:var(--color-vault-gold)]/25 shadow-[0_12px_24px_rgba(0,0,0,0.35)]">
          <Image
            src={book.coverImageSrc ?? "/book.png"}
            alt=""
            fill
            sizes="80px"
            className="object-cover object-left"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-[family-name:var(--font-cinzel)] text-lg text-[color:var(--color-vault-gold)]">
            {book.spineTitle}
          </p>
          <p className="mt-1 text-sm text-[color:var(--color-vault-parchment)]/75">
            {book.items.length} item{book.items.length === 1 ? "" : "s"} inside
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.24em] text-[color:var(--color-vault-gold)]/55">
            {open ? "Tap to close" : "Tap to open"}
          </p>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key={`${book.id}-mobile-open`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="pt-6"
          >
            <VaultBook
              key={`${book.id}-mobile`}
              items={book.items}
              coverImageSrc={book.coverImageSrc}
              defaultOpen
              variant="inline"
              className="px-0"
              instanceId={`mobile-${book.id}`}
              onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                  onToggle();
                }
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function DesktopShelfBinder({
  book,
  index,
  assetSrc,
  onClick,
}: {
  book: ResolvedVaultBookDefinition;
  index: number;
  assetSrc: string;
  onClick: () => void;
}) {
  const widthPx = 338;
  const heightPx = 64;

  return (
    <button
      type="button"
      data-vault-library-trigger
      onClick={onClick}
      className="absolute left-1/2 top-1/2 text-left"
      style={{
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        transform: "translate(-50%, -50%)",
        zIndex: 20 + index,
      }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 block bg-contain bg-center bg-no-repeat"
        style={{
          width: "92px",
          height: "318px",
          transform: "translate(-50%, -50%) rotate(90deg)",
          backgroundImage: `url(${assetSrc})`,
        }}
      />
      <span className="absolute inset-[24%_15%_24%_15%] flex items-center justify-center">
        <span className="rounded-full border border-[color:var(--color-vault-gold)]/18 bg-black/28 px-4 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <span
            className="block font-[family-name:var(--font-cinzel)] text-[14px] uppercase tracking-[0.08em] text-[color:var(--color-vault-gold)]"
          >
            {book.spineTitle}
          </span>
        </span>
      </span>
    </button>
  );
}

function DesktopBinderStack({
  entries,
  stackIndex,
  onSelect,
}: {
  entries: Array<{
    renderId: string;
    book: ResolvedVaultBookDefinition;
    assetSrc: string;
    displayIndex: number;
  }>;
  stackIndex: number;
  onSelect: (bookId: string) => void;
}) {
  const xOffsets = [
    [0, 10, -8, 6],
    [0, -10, 8, -6],
    [0, 8, -10, 4],
  ];
  const yOffsets = [
    [132, 88, 44, 0],
    [132, 88, 44, 0],
    [132, 88, 44, 0],
  ];

  return (
    <div className="relative h-[18rem] w-[30rem]">
      {entries.map(({ renderId, book, assetSrc, displayIndex }, localIndex) => (
        <div
          key={renderId}
          className="absolute left-1/2 top-1/2"
          style={{
            transform: `translate(-50%, -50%) translate(${xOffsets[stackIndex % xOffsets.length][localIndex % 4]}px, ${yOffsets[stackIndex % yOffsets.length][localIndex % 4]}px)`,
            zIndex: localIndex + 1,
          }}
        >
          <DesktopShelfBinder
            book={book}
            index={displayIndex}
            assetSrc={assetSrc}
            onClick={() => onSelect(book.id)}
          />
        </div>
      ))}
    </div>
  );
}

export default function VaultLibrary({
  books,
}: {
  books: ResolvedVaultBookDefinition[];
}) {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  const displayedDesktopBooks = useMemo(
    () =>
      Array.from({ length: books.length * 3 }, (_, index) => {
        const book = books[index % books.length];
        return {
          renderId: `${book.id}-${index}`,
          book,
          assetSrc: DESKTOP_BINDER_ASSETS[index % DESKTOP_BINDER_ASSETS.length],
          displayIndex: index,
        };
      }),
    [books],
  );

  const desktopStacks = useMemo(
    () => [
      displayedDesktopBooks.slice(0, 4),
      displayedDesktopBooks.slice(4, 8),
      displayedDesktopBooks.slice(8, 12),
    ],
    [displayedDesktopBooks],
  );

  const selectedBook = useMemo(
    () => books.find((book) => book.id === selectedBookId) ?? null,
    [books, selectedBookId],
  );

  useEffect(() => {
    if (!selectedBookId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(`[data-vault-book-instance="desktop-${selectedBookId}"]`)) {
        return;
      }
      if (target.closest("[data-vault-library-trigger]")) {
        return;
      }
      setSelectedBookId(null);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [selectedBookId]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-18 pt-6 sm:px-6 sm:pt-8">
      <div className="mt-10 space-y-5 [@media(min-width:1085px)]:hidden">
        {books.map((book) => {
          const open = selectedBookId === book.id;
          return (
            <MobileBookCard
              key={book.id}
              book={book}
              open={open}
              onToggle={() =>
                setSelectedBookId((current) => (current === book.id ? null : book.id))
              }
            />
          );
        })}
      </div>

      <div className="relative mt-14 hidden [@media(min-width:1085px)]:block">
        <div className="relative overflow-hidden rounded-[2.7rem] border border-[color:var(--color-vault-gold)]/14 bg-[linear-gradient(180deg,rgba(14,10,8,0.92),rgba(7,5,4,0.98))] px-6 pb-10 pt-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="relative h-[min(52rem,calc(100dvh-8rem))] min-h-[46rem]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,214,140,0.08),transparent_20%),linear-gradient(180deg,#33231b_0%,#221611_28%,#17100c_58%,#0e0907_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[62%] bg-[linear-gradient(180deg,rgba(102,68,46,0.18),rgba(15,10,8,0)_76%)]" />
            <div className="pointer-events-none absolute inset-x-[18%] top-[7.8rem] h-16 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,213,148,0.22),transparent_72%)] blur-3xl" />

            <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
              <div className="relative h-[8.5rem] w-[33rem] max-w-[56vw]">
                <Image
                  src="/name.png"
                  alt="Off On The Square"
                  fill
                  sizes="(min-width: 1280px) 33rem, 56vw"
                  className="object-contain"
                />
              </div>
            </div>

            <div className="absolute inset-x-[1%] top-[15.7rem] z-20">
              <div className="relative mx-auto h-[22rem] max-w-[96rem]">
                <div className="pointer-events-none absolute inset-0 rounded-[2.6rem] border border-[#62442d]/28 bg-[linear-gradient(180deg,rgba(63,42,30,0.18),rgba(16,10,8,0.04))] shadow-[inset_0_1px_0_rgba(255,228,181,0.04)]" />
                <div className="pointer-events-none absolute inset-x-0 bottom-[1rem] h-[6.2rem]">
                  <Image
                    src="/shelf-wide-alpha.png"
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 96rem, 98vw"
                    className="object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.32)]"
                  />
                </div>
                <div className="pointer-events-none absolute inset-x-[6%] bottom-[0.8rem] h-[1.1rem] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.42),transparent_70%)] blur-md" />
                <div className="absolute inset-x-[1%] top-[0.2rem] bottom-[4.1rem] flex items-end justify-between px-0">
                  {desktopStacks.map((stack, stackIndex) => (
                    <DesktopBinderStack
                      key={`stack-${stackIndex}`}
                      entries={stack}
                      stackIndex={stackIndex}
                      onSelect={setSelectedBookId}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute bottom-4 left-2 z-30 flex items-center gap-3">
              <SocialIcon href="https://facebook.com" label="Facebook">
                <FacebookIcon />
              </SocialIcon>
              <SocialIcon href="https://instagram.com" label="Instagram">
                <InstagramIcon />
              </SocialIcon>
              <SocialIcon href="https://discord.com" label="Discord">
                <DiscordIcon />
              </SocialIcon>
            </div>

            <AnimatePresence>
              {selectedBook ? (
                <motion.button
                  type="button"
                  aria-label="Close the open binder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  onClick={() => setSelectedBookId(null)}
                  className="fixed inset-0 z-40 cursor-default bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.08),rgba(0,0,0,0.28))]"
                />
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {selectedBook ? (
                <motion.div
                  key={selectedBook.id}
                  initial={{ opacity: 0, y: 36, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 22, scale: 0.97 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="absolute inset-x-0 top-[13.4rem] z-60 flex justify-center"
                >
                  <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(8,5,4,0.3),transparent_70%)]" />
                  <div className="origin-top scale-[0.64] lg:scale-[0.72] xl:scale-[0.82] 2xl:scale-[0.9]">
                    <VaultBook
                      key={`desktop-${selectedBook.id}`}
                      items={selectedBook.items}
                      coverImageSrc={selectedBook.coverImageSrc}
                      variant="inline"
                      instanceId={`desktop-${selectedBook.id}`}
                      onOpenChange={(nextOpen) => {
                        if (!nextOpen) {
                          setSelectedBookId(null);
                        }
                      }}
                    />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {!selectedBook ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-8 text-center">
                <p className="font-[family-name:var(--font-cinzel)] text-xs uppercase tracking-[0.26em] text-[color:var(--color-vault-gold)]/28">
                  Click any binder stack to bring a book forward
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
