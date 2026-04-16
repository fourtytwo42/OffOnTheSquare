"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

type PreviewProduct = {
  id: string;
  handle: string;
  title: string;
  thumbnail: string | null;
};

const bookEase = [0.22, 1, 0.36, 1] as const;

/** Cover open motion is ~1.15s; show catalogue once the flip is far enough along (was 1180ms — too slow for UX). */
const VAULT_CATALOGUE_REVEAL_MS = 720;

/** Match book shell perspective; inner cover is ~rotateY(-158°) — portaled UI tilts from the spine to sit on the cream. */
const LEFT_PORTAL_PERSPECTIVE = 1120;
/** Pivot = right edge (spine). Positive = outer (left) edge swings toward the viewer (opposite of the previous wrong sign). */
const LEFT_PORTAL_ROTATE_Y = 19;
/** Symmetric gutter inset (px): left block shifts −X after rotateY, right block shifts +X. */
const FACING_SPINE_OFFSET_PX = 18;
const LEFT_PORTAL_TRANSLATE_X = -FACING_SPINE_OFFSET_PX;
const RIGHT_PORTAL_TRANSLATE_X = FACING_SPINE_OFFSET_PX;
/** Widen the left block; transform-origin is the spine so width grows toward the fore-edge. */
const LEFT_PORTAL_SCALE_X = 1.03;
/** ~1% taller on the tilted left leaf (height only). */
const LEFT_PORTAL_SCALE_Y = 1.01;

/** When open, extend paper & case layers past the shell’s right edge so the right sheet isn’t visually narrower than the overlay. */
const BOOK_OPEN_RIGHT_BLEED_PX = 14;

const bfHidden = {
  backfaceVisibility: "hidden" as const,
  WebkitBackfaceVisibility: "hidden" as const,
};

/** First spread: 6 items on right leaf only; later spreads 6 + 6 on both leaves. */
const FIRST_RIGHT = 6;
const PER_SPREAD = 12;

/** Single parchment layer (never nest two of these — the outer shows as a “ghost” margin). */
const vaultParchment =
  "border border-[#c4b8a4]/85 bg-gradient-to-br from-[#faf6f0] via-[#f0e9df] to-[#e6ddd0] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]";

/** Flat spread grid (both leaves use this — no 3D parent). */
const spreadProductGrid =
  "grid min-h-0 min-w-0 h-full w-full auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))] sm:gap-3";

const DEMO_TITLES = [
  "Sealed wax assortment",
  "Brass corner protectors",
  "Hand-bound ledger (blank)",
  "Velvet cord & tassel",
  "Antique map fragment",
  "Iron wax stamp",
  "Glass inkwell, midnight",
  "Gilded page markers",
  "Leather cord, oxblood",
  "Obsidian worry stone",
  "Calligrapher’s quill set",
  "Embossed ex libris plate",
  "Ribbon bookmark trio",
  "Candle snuffer, forged",
  "Small skeleton key",
  "Parchment sheets (25)",
  "Crimson sealing powder",
  "Travel compass, pocket",
  "Monogram embosser",
  "Herbalist’s label set",
  "Miniature hourglass",
  "Thread & needle case",
  "Stone rune markers",
  "Velvet drawstring pouch",
  "Brass page weights",
  "Cabinet card frame",
  "Feather dip pen",
  "Cabinet of curiosities tag",
  "Antique ribbon spool",
  "Copper foil sheets",
  "Silk screen mesh, small",
];

function buildCatalog(real: PreviewProduct[]): PreviewProduct[] {
  const out: PreviewProduct[] = [...real];
  const handles = new Set(out.map((p) => p.handle));
  let n = 0;
  while (out.length < 42) {
    const handle = `vault-demo-${n}`;
    if (!handles.has(handle)) {
      handles.add(handle);
      out.push({
        id: `demo_${n}`,
        handle,
        title: DEMO_TITLES[n % DEMO_TITLES.length],
        thumbnail: `https://picsum.photos/seed/${encodeURIComponent(handle)}/320/320`,
      });
    }
    n += 1;
  }
  return out;
}

function totalSpreads(catalogLen: number): number {
  if (catalogLen <= FIRST_RIGHT) return 1;
  return 1 + Math.ceil((catalogLen - FIRST_RIGHT) / PER_SPREAD);
}

function sliceSpread(
  catalog: PreviewProduct[],
  spreadIndex: number
): { left: PreviewProduct[]; right: PreviewProduct[] } {
  if (spreadIndex === 0) {
    return { left: [], right: catalog.slice(0, FIRST_RIGHT) };
  }
  const offset = FIRST_RIGHT + (spreadIndex - 1) * PER_SPREAD;
  return {
    left: catalog.slice(offset, offset + 6),
    right: catalog.slice(offset + 6, offset + 12),
  };
}

/** Book page numbers shown in the footer (spread 0 = page 1 only; later = two facing pages). */
function spreadPageLabel(spreadIndex: number): string {
  if (spreadIndex === 0) return "Page 1";
  const start = 2 + (spreadIndex - 1) * 2;
  return `Pages ${start}–${start + 1}`;
}

function PlaceholderThumb({ seed }: { seed: string }) {
  const hue = (seed.charCodeAt(0) * 47) % 360;
  return (
    <div
      className="h-full w-full"
      style={{
        background: `linear-gradient(135deg, hsla(${hue},35%,18%,1) 0%, hsla(${(hue + 40) % 360},28%,12%,1) 100%)`,
      }}
    />
  );
}

/** Page 1: two-page-wide portal; Close sits on the physical left leaf (same half as spread 2+). */
function FirstSpreadCatalogue({
  portalWidth,
  spread,
  vaultParchment,
  spreadProductGrid,
  spreadPageLabel,
  goNext,
  closeVault,
  spreads,
  reduceMotion,
}: {
  portalWidth: number;
  spread: { left: PreviewProduct[]; right: PreviewProduct[] };
  vaultParchment: string;
  spreadProductGrid: string;
  spreadPageLabel: (i: number) => string;
  goNext: () => void;
  closeVault: () => void;
  spreads: number;
  reduceMotion: boolean;
}) {
  const leftW = Math.max(0, Math.floor(portalWidth / 2));
  const rightW = Math.max(0, portalWidth - leftW);
  const leftPane: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: leftW,
    boxSizing: "border-box",
  };
  const rightPane: CSSProperties = {
    position: "absolute",
    left: leftW,
    top: 0,
    bottom: 0,
    width: rightW,
    boxSizing: "border-box",
  };
  const leftTiltStyle: CSSProperties | undefined = reduceMotion
    ? undefined
    : {
        transform: `perspective(${LEFT_PORTAL_PERSPECTIVE}px) rotateY(${LEFT_PORTAL_ROTATE_Y}deg) translateX(${LEFT_PORTAL_TRANSLATE_X}px) scaleX(${LEFT_PORTAL_SCALE_X}) scaleY(${LEFT_PORTAL_SCALE_Y})`,
        transformOrigin: "right center",
        transformStyle: "preserve-3d",
        willChange: "transform",
      };
  const rightSpineNudgeStyle: CSSProperties | undefined = reduceMotion
    ? undefined
    : {
        transform: `translateX(${RIGHT_PORTAL_TRANSLATE_X}px)`,
        willChange: "transform",
      };
  return (
    <div
      data-vault-first-spread
      className="relative h-full min-h-0 min-w-0 overflow-visible"
      dir="ltr"
    >
      <div
        data-vault-first-left-leaf
        className="box-border flex min-h-0 min-w-0 flex-col gap-1.5 overflow-visible py-1.5 pl-0.5 pr-1 sm:py-2 sm:pl-1 sm:pr-1.5"
        style={leftPane}
      >
        <div
          className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col"
          style={leftTiltStyle}
        >
          <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col justify-end gap-1.5">
            <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={closeVault}
                className="inline-flex items-center gap-1 rounded border border-[#8a7a62]/50 bg-white/50 px-2 py-1.5 text-[10px] font-[family-name:var(--font-cinzel)] uppercase tracking-widest text-[#3d3528] hover:border-[#6b5c42]/70 sm:text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        data-vault-first-right-leaf
        className="box-border flex min-h-0 min-w-0 flex-col gap-1.5 overflow-visible p-1.5 sm:pl-1.5 sm:pr-2 sm:pt-2 sm:pb-2"
        style={rightPane}
      >
        <div
          className="flex h-full min-h-0 min-w-0 flex-1 flex-col"
          style={rightSpineNudgeStyle}
        >
          <div
            key="R-0"
            data-vault-right-page
            className={`flex min-h-0 min-w-0 flex-1 flex-col rounded-sm p-2 ${vaultParchment}`}
          >
            <div className={`${spreadProductGrid} min-h-0 min-w-0 flex-1`}>
              {spread.right.map((p) => (
                <ProductTile key={p.id} p={p} />
              ))}
            </div>
          </div>
          <div className="flex w-full shrink-0 items-center justify-center gap-2">
            <span className="text-[10px] tabular-nums text-[#3d3528] sm:text-xs">
              {spreadPageLabel(0)}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={spreads <= 1}
              className="inline-flex items-center gap-1 rounded border border-[#8a7a62]/50 bg-white/50 px-2 py-1.5 text-[10px] text-[#3d3528] hover:border-[#6b5c42]/70 disabled:cursor-not-allowed disabled:opacity-35 sm:text-xs"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FacingCatalogueSpread({
  portalWidth,
  spreadIndex,
  spread,
  vaultParchment,
  spreadProductGrid,
  spreadPageLabel,
  goPrev,
  goNext,
  closeVault,
  spreads,
  reduceMotion,
}: {
  portalWidth: number;
  spreadIndex: number;
  spread: { left: PreviewProduct[]; right: PreviewProduct[] };
  vaultParchment: string;
  spreadProductGrid: string;
  spreadPageLabel: (i: number) => string;
  goPrev: () => void;
  goNext: () => void;
  closeVault: () => void;
  spreads: number;
  reduceMotion: boolean;
}) {
  const leftW = Math.max(0, Math.floor(portalWidth / 2));
  const rightW = Math.max(0, portalWidth - leftW);
  const leftPane: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: leftW,
    boxSizing: "border-box",
  };
  const rightPane: CSSProperties = {
    position: "absolute",
    left: leftW,
    top: 0,
    bottom: 0,
    width: rightW,
    boxSizing: "border-box",
  };
  const leftTiltStyle: CSSProperties | undefined = reduceMotion
    ? undefined
    : {
        transform: `perspective(${LEFT_PORTAL_PERSPECTIVE}px) rotateY(${LEFT_PORTAL_ROTATE_Y}deg) translateX(${LEFT_PORTAL_TRANSLATE_X}px) scaleX(${LEFT_PORTAL_SCALE_X}) scaleY(${LEFT_PORTAL_SCALE_Y})`,
        transformOrigin: "right center",
        transformStyle: "preserve-3d",
        willChange: "transform",
      };
  const rightSpineNudgeStyle: CSSProperties | undefined = reduceMotion
    ? undefined
    : {
        transform: `translateX(${RIGHT_PORTAL_TRANSLATE_X}px)`,
        willChange: "transform",
      };
  return (
    <div
      data-vault-facing-split
      className="relative h-full min-h-0 min-w-0 overflow-visible"
      dir="ltr"
    >
      <div
        data-vault-left-leaf
        className="box-border flex min-h-0 min-w-0 flex-col gap-1.5 overflow-visible py-1.5 pl-0.5 pr-1 sm:py-2 sm:pl-1 sm:pr-1.5"
        style={leftPane}
      >
        <div
          className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col"
          style={leftTiltStyle}
        >
          <div
            key={`L-${spreadIndex}`}
            data-vault-left-page
            className="flex min-h-0 min-w-0 w-full flex-1 flex-col"
          >
            <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-1.5">
              <div
                className={`min-h-0 w-full min-w-0 flex-1 self-stretch rounded-sm p-2 ${vaultParchment}`}
              >
                <div className={`${spreadProductGrid} w-full min-w-0`}>
                  {spread.left.map((p) => (
                    <ProductTile key={p.id} p={p} />
                  ))}
                </div>
              </div>
              <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  className="inline-flex items-center gap-1 rounded border border-[#8a7a62]/50 bg-white/50 px-2 py-1.5 text-[10px] text-[#3d3528] hover:border-[#6b5c42]/70 sm:text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={closeVault}
                  className="inline-flex items-center gap-1 rounded border border-[#8a7a62]/50 bg-white/50 px-2 py-1.5 text-[10px] font-[family-name:var(--font-cinzel)] uppercase tracking-widest text-[#3d3528] hover:border-[#6b5c42]/70 sm:text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        data-vault-right-leaf
        className="box-border flex min-h-0 min-w-0 flex-col gap-1.5 overflow-visible p-1.5 sm:pl-1.5 sm:pr-2 sm:pt-2 sm:pb-2"
        style={rightPane}
      >
        <div
          className="flex h-full min-h-0 min-w-0 flex-1 flex-col"
          style={rightSpineNudgeStyle}
        >
          <div
            key={`R-${spreadIndex}`}
            data-vault-right-page
            className={`flex min-h-0 min-w-0 flex-1 flex-col rounded-sm p-2 ${vaultParchment}`}
          >
            <div className={`${spreadProductGrid} min-h-0 min-w-0 flex-1`}>
              {spread.right.map((p) => (
                <ProductTile key={p.id} p={p} />
              ))}
            </div>
          </div>
          <div className="flex w-full shrink-0 items-center justify-center gap-2">
            <span className="text-[10px] tabular-nums text-[#3d3528] sm:text-xs">
              {spreadPageLabel(spreadIndex)}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={spreadIndex >= spreads - 1}
              className="inline-flex items-center gap-1 rounded border border-[#8a7a62]/50 bg-white/50 px-2 py-1.5 text-[10px] text-[#3d3528] hover:border-[#6b5c42]/70 disabled:cursor-not-allowed disabled:opacity-35 sm:text-xs"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductTile({ p }: { p: PreviewProduct }) {
  const isDemo = p.handle.startsWith("vault-demo");
  const href = isDemo ? "/shop" : `/products/${p.handle}`;
  return (
    <Link
      href={href}
      className="group flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden rounded border border-[color:var(--color-vault-gold)]/45 bg-[#0c0a08] shadow-md transition hover:border-[color:var(--color-vault-gold)] hover:shadow-[0_0_18px_rgba(212,175,55,0.22)]"
    >
      <div className="relative aspect-square w-full shrink-0 bg-black">
        {p.thumbnail ? (
          <Image
            src={p.thumbnail}
            alt=""
            fill
            sizes="(max-width: 640px) 28vw, 200px"
            loading="eager"
            className="object-cover transition group-hover:brightness-105"
          />
        ) : (
          <PlaceholderThumb seed={p.handle} />
        )}
      </div>
      <div className="min-h-[2.5rem] p-1.5 text-center font-[family-name:var(--font-cinzel)] text-[10px] leading-tight text-[color:var(--color-vault-parchment)] group-hover:text-[color:var(--color-vault-gold)] sm:text-[11px]">
        {p.title}
        {isDemo ? (
          <span className="mt-0.5 block text-[9px] font-normal tracking-wide text-[color:var(--color-vault-gold)]/50">
            Demo listing
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export default function BookVault({
  products,
}: {
  products: PreviewProduct[];
}) {
  const reduceMotion = useReducedMotion();
  const catalog = useMemo(() => buildCatalog(products), [products]);
  const spreads = useMemo(() => totalSpreads(catalog.length), [catalog.length]);

  const [open, setOpen] = useState(false);
  const [spreadIndex, setSpreadIndex] = useState(0);
  /** Show catalogue portal only after cover open animation so it does not sit on top of the cover mid-flip. */
  const [vaultCatalogueVisible, setVaultCatalogueVisible] = useState(false);
  const bookShellRef = useRef<HTMLDivElement>(null);
  const [portalBox, setPortalBox] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setSpreadIndex(0);
      setVaultCatalogueVisible(false);
      return;
    }
    if (reduceMotion) {
      setVaultCatalogueVisible(true);
      return;
    }
    const id = window.setTimeout(
      () => setVaultCatalogueVisible(true),
      VAULT_CATALOGUE_REVEAL_MS,
    );
    return () => clearTimeout(id);
  }, [open, reduceMotion]);

  const syncPortalBox = useCallback(() => {
    const el = bookShellRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pad = 6;
    const innerW = Math.max(0, r.width - pad * 2);
    const innerH = Math.max(0, r.height - pad * 2);
    // Shell rect ≈ one cover; overlay always spans two facing pages (page 1 uses left + right halves).
    const width = innerW * 2;
    const left = r.left + pad - innerW;
    setPortalBox({
      top: r.top + pad,
      left,
      width,
      height: innerH,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPortalBox(null);
      return;
    }
    syncPortalBox();
    const el = bookShellRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => syncPortalBox());
    ro.observe(el);
    const onWin = () => syncPortalBox();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [open, vaultCatalogueVisible, syncPortalBox]);

  const handleVault = () => {
    setOpen(true);
  };

  const goNext = useCallback(() => {
    setSpreadIndex((i) => Math.min(i + 1, spreads - 1));
  }, [spreads]);

  const goPrev = useCallback(() => {
    setSpreadIndex((i) => Math.max(i - 1, 0));
  }, []);

  const closeVault = useCallback(() => {
    setOpen(false);
    setSpreadIndex(0);
  }, []);

  const spread = sliceSpread(catalog, spreadIndex);

  const portalShellStyle: CSSProperties | undefined =
    portalBox == null
      ? undefined
      : {
          position: "fixed",
          top: portalBox.top,
          left: portalBox.left,
          width: portalBox.width,
          height: portalBox.height,
          zIndex: 200,
          pointerEvents: "auto",
          opacity: 1,
        };

  const cataloguePortal =
    open &&
    vaultCatalogueVisible &&
    portalBox &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        data-vault-spread-portal
        dir="ltr"
        className="min-h-0 min-w-0 overflow-visible bg-transparent"
        style={portalShellStyle}
      >
        {spreadIndex === 0 ? (
          <FirstSpreadCatalogue
            portalWidth={portalBox.width}
            spread={spread}
            vaultParchment={vaultParchment}
            spreadProductGrid={spreadProductGrid}
            spreadPageLabel={spreadPageLabel}
            goNext={goNext}
            closeVault={closeVault}
            spreads={spreads}
            reduceMotion={Boolean(reduceMotion)}
          />
        ) : (
          <FacingCatalogueSpread
            portalWidth={portalBox.width}
            spreadIndex={spreadIndex}
            spread={spread}
            vaultParchment={vaultParchment}
            spreadProductGrid={spreadProductGrid}
            spreadPageLabel={spreadPageLabel}
            goPrev={goPrev}
            goNext={goNext}
            closeVault={closeVault}
            spreads={spreads}
            reduceMotion={Boolean(reduceMotion)}
          />
        )}
      </div>,
      document.body,
    );

  return (
    <div className="relative flex min-h-dvh flex-col items-center px-4 pb-16 pt-8 sm:pt-12">
      <div className="relative z-0 w-full max-w-[min(100%,28rem)] sm:max-w-[30rem]">
        <div className="relative mx-auto flex max-w-full justify-center">
          <div
            ref={bookShellRef}
            className={`relative mx-auto max-w-full ${open ? "overflow-x-visible" : ""}`}
            style={{
              aspectRatio: "3.25 / 4.35",
              width: "min(92vw, 448px)",
              maxWidth: "min(100%, calc(min(82dvh, 520px) * 3.25 / 4.35))",
              maxHeight: "min(82dvh, 520px)",
              marginInline: "auto",
            }}
          >
            {/* Perspective only applies inside here — right leaf stays outside so it never 3D-interleaves with the cover. */}
            <div
              className="absolute inset-0 z-0"
              style={{
                perspective: reduceMotion ? undefined : "1120px",
                transformStyle: "preserve-3d",
              }}
            >
              <div
                className="pointer-events-none absolute -bottom-3 left-[8%] right-[6%] h-6 rounded-[50%] bg-black/55 blur-md"
                style={{ transform: "translateZ(-24px)" }}
              />

              <div
                className="pointer-events-none absolute bottom-1 left-0 top-1 z-[5] w-[14px] rounded-l-sm sm:w-[18px]"
                style={{
                  transform: "translateX(-6px) translateZ(2px) rotateY(-22deg)",
                  transformStyle: "preserve-3d",
                  background:
                    "linear-gradient(90deg, #0a0604 0%, #2a1810 22%, #4a3020 50%, #2a1810 78%, #0c0806 100%)",
                  boxShadow:
                    "inset -3px 0 6px rgba(0,0,0,0.55), inset 2px 0 4px rgba(90,60,40,0.35), 4px 0 12px rgba(0,0,0,0.45)",
                }}
              />

              <div
                className="pointer-events-none absolute left-[2px] top-[2px] bottom-[2px] rounded-r-md rounded-l-sm"
                style={{
                  right: open ? -BOOK_OPEN_RIGHT_BLEED_PX : 2,
                  transform: "translateZ(-10px)",
                  background:
                    "linear-gradient(135deg, #120a08 0%, #1c100c 45%, #0a0604 100%)",
                  boxShadow: "inset 0 0 0 1px rgba(212,175,55,0.12)",
                }}
              />

              {/* Full-width book paper (both pages). The cream sits behind both left & right leaves. */}
              <div
                className="pointer-events-none absolute left-[4px] top-[4px] bottom-[4px] rounded-r-[2px] rounded-l-sm"
                style={{
                  right: open ? -BOOK_OPEN_RIGHT_BLEED_PX : 4,
                  transform: "translateZ(-4px)",
                  background: `linear-gradient(
                  to bottom,
                  #f2ebe3 0%,
                  #e8dfd4 12%,
                  #efe6dc 50%,
                  #e4d9cc 88%,
                  #d8cbbf 100%
                )`,
                  boxShadow: `
                  inset 0 0 0 1px rgba(255,255,255,0.35),
                  1px 0 0 rgba(212,175,55,0.35),
                  2px 0 0 rgba(212,175,55,0.15)
                `,
                }}
              />
              <div
                className="pointer-events-none absolute bottom-[5px] right-[5px] top-[5px] w-[5px] rounded-sm opacity-70"
                style={{
                  transform: "translateZ(-3px)",
                  background:
                    "repeating-linear-gradient(to bottom, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px)",
                }}
              />

              {/* Front cover: artwork + inner face (inside cover = left leaf when open) */}
              <motion.div
                className="absolute inset-0"
                style={{
                  transformOrigin: "left center",
                  transformStyle: "preserve-3d",
                  zIndex: open ? 9 : 12,
                }}
                animate={{
                  rotateY: reduceMotion ? 0 : open ? -158 : 0,
                }}
                transition={{ duration: reduceMotion ? 0 : 1.15, ease: bookEase }}
              >
                <div
                  className="pointer-events-none absolute bottom-0 left-0 top-0 w-[5px] origin-left"
                  style={{
                    transform: "rotateY(90deg) translateZ(-2px)",
                    background:
                      "linear-gradient(180deg, #1a0f0c 0%, #2d1a14 40%, #1a0f0c 100%)",
                    boxShadow: "inset -1px 0 2px rgba(0,0,0,0.5)",
                  }}
                />

              <button
                type="button"
                aria-label="Open the vault"
                onClick={handleVault}
                disabled={open}
                className="absolute inset-0 z-10 cursor-pointer overflow-hidden rounded-r-md rounded-l-sm border-0 bg-transparent p-0 shadow-[0_10px_32px_rgba(0,0,0,0.65),inset_0_0_0_1px_rgba(0,0,0,0.25)] outline-none ring-0 focus-visible:ring-2 focus-visible:ring-[color:var(--color-vault-gold)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0604] disabled:pointer-events-none disabled:cursor-default"
                style={{
                  ...bfHidden,
                  transform: "translateZ(0.75px)",
                }}
              >
                <Image
                  src="/book.png"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 640px) 96vw, 448px"
                  className="object-cover object-left select-none"
                />
              </button>

              <div
                className="absolute inset-0 overflow-hidden rounded-r-md rounded-l-sm"
                style={{
                  ...bfHidden,
                  transform: "rotateY(180deg) translateZ(0.75px)",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `linear-gradient(165deg, #f2ebe3 0%, #e8dfd4 42%, #ded4c8 100%)`,
                    boxShadow:
                      "inset 0 0 0 1px rgba(90,70,50,0.1), inset 0 1px 0 rgba(255,255,255,0.45)",
                  }}
                />
                <div className="pointer-events-none absolute inset-y-6 left-[8%] w-px bg-[#c9bcaa]/45" />
                {/* Left catalogue lives in a flat overlay (see below) so 3D rotation does not foreshorten the grid. */}
              </div>
            </motion.div>
            </div>
            {/* Catalogue is portaled to document.body (fixed rect from bookShellRef) so layout never shares a subtree with preserve-3d. */}
          </div>
          {cataloguePortal}
        </div>
      </div>
    </div>
  );
}
