"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type VaultBookItem = {
  id: string;
  title: string;
  href: string;
  imageSrc: string | null;
  badge?: string;
  isPlaceholder?: boolean;
};

const bookEase = [0.22, 1, 0.36, 1] as const;
const catalogueFadeDuration = 0.14;
const VAULT_COVER_OPEN_DURATION = 1.15;
const VAULT_PAGE_REVEAL_MS = 620;
const VAULT_CONTROLS_REVEAL_MS = 1080;

/** Viewports below `md` (768px): spread 2+ hides cards on the left leaf; nine slots + nav stay on the right half only. */
const VAULT_CATALOGUE_NARROW_MQ = "(max-width: 767px)";

function useNarrowVaultCatalogue(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(VAULT_CATALOGUE_NARROW_MQ).matches
      : false,
  );
  useLayoutEffect(() => {
    const mq = window.matchMedia(VAULT_CATALOGUE_NARROW_MQ);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return narrow;
}

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

/** 3×3 “binder page” slots per leaf (magic-card-sized tiles). */
const SLOTS_PER_PAGE = 9;
/** First spread: right leaf only (left is Close). */
const FIRST_RIGHT = SLOTS_PER_PAGE;
/** Facing spreads: 9 + 9 listings per spread. */
const PER_SPREAD = SLOTS_PER_PAGE * 2;

/** Minimum demo catalogue length (multiples of full spreads after page 1). */
const MIN_CATALOG_LEN = FIRST_RIGHT + 3 * PER_SPREAD;

/** Single parchment layer (never nest two of these — the outer shows as a “ghost” margin). */
const vaultParchment =
  "border border-[#c4b8a4]/85 bg-gradient-to-br from-[#faf6f0] via-[#f0e9df] to-[#e6ddd0] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]";

/** White insert on the parchment leaf (binder “sheet”). */
const binderPageShelf =
  "flex min-h-0 min-w-0 w-full flex-1 flex-col rounded-[4px] bg-white p-[2px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] sm:p-[3px]";

/** 9-pocket grid: gap shows soft gray “slot seams” between cards. */
const binderPageGrid =
  "grid min-h-0 min-w-0 h-full w-full grid-cols-3 grid-rows-3 gap-[2px] rounded-[2px] bg-[#d4d2cf] sm:gap-[3px]";

function BinderNineGrid({ children }: { children: ReactNode }) {
  return (
    <div className={binderPageShelf}>
      <div className={`${binderPageGrid} min-h-0 min-w-0 flex-1`}>{children}</div>
    </div>
  );
}

const PLACEHOLDER_CARDS = [
  { title: "Dig Through Time", imageSrc: "/cards/magic-card-01.jpg" },
  { title: "Alhammarret, High Arbiter", imageSrc: "/cards/magic-card-02.jpg" },
  { title: "City on Fire", imageSrc: "/cards/magic-card-03.jpg" },
  { title: "Witch's Cottage", imageSrc: "/cards/magic-card-04.jpg" },
  { title: "Winter, Misanthropic Guide", imageSrc: "/cards/magic-card-05.jpeg" },
  { title: "Totally Lost", imageSrc: "/cards/magic-card-06.jpg" },
  { title: "Take Flight", imageSrc: "/cards/magic-card-07.jpg" },
  { title: "Frantic Search", imageSrc: "/cards/magic-card-08.jpg" },
  { title: "Harrow", imageSrc: "/cards/magic-card-09.jpg" },
] as const;

const PLACEHOLDER_PAGE_MULTIPLIERS = [1, 2, 4, 5, 7, 8] as const;

function getPlaceholderCardForPosition(position: number) {
  const cardCount = PLACEHOLDER_CARDS.length;
  const pageIndex =
    position < FIRST_RIGHT
      ? 0
      : 1 + Math.floor((position - FIRST_RIGHT) / SLOTS_PER_PAGE);
  const slotIndex =
    position < FIRST_RIGHT ? position : (position - FIRST_RIGHT) % SLOTS_PER_PAGE;

  // Deterministic page-aware permutation so each page presents the same pool
  // of placeholder cards in a different layout.
  const multiplier =
    PLACEHOLDER_PAGE_MULTIPLIERS[
      pageIndex % PLACEHOLDER_PAGE_MULTIPLIERS.length
    ];
  const offset = (pageIndex * 3 + Math.floor(pageIndex / 6)) % cardCount;
  const cardIndex =
    (slotIndex * multiplier + offset) % cardCount;

  return PLACEHOLDER_CARDS[cardIndex];
}

function buildCatalog(real: VaultBookItem[]): VaultBookItem[] {
  const out: VaultBookItem[] = [...real];
  const ids = new Set(out.map((p) => p.id));
  let n = 0;
  while (out.length < MIN_CATALOG_LEN) {
    const id = `vault-placeholder-${n}`;
    if (!ids.has(id)) {
      ids.add(id);
      const placeholderCard = getPlaceholderCardForPosition(out.length);
      out.push({
        id,
        title: placeholderCard.title,
        href: "/shop",
        imageSrc: placeholderCard.imageSrc,
        badge: "Archive",
        isPlaceholder: true,
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
  catalog: VaultBookItem[],
  spreadIndex: number
): { left: VaultBookItem[]; right: VaultBookItem[] } {
  if (spreadIndex === 0) {
    return { left: [], right: catalog.slice(0, FIRST_RIGHT) };
  }
  const offset = FIRST_RIGHT + (spreadIndex - 1) * PER_SPREAD;
  return {
    left: catalog.slice(offset, offset + SLOTS_PER_PAGE),
    right: catalog.slice(offset + SLOTS_PER_PAGE, offset + PER_SPREAD),
  };
}

function nineSlots(products: VaultBookItem[]): (VaultBookItem | null)[] {
  return Array.from({ length: SLOTS_PER_PAGE }, (_, i) => products[i] ?? null);
}

/** Book page numbers shown in the footer (spread 0 = page 1 only; later = two facing pages). */
function spreadPageLabel(spreadIndex: number): string {
  if (spreadIndex === 0) return "Page 1";
  const start = 2 + (spreadIndex - 1) * 2;
  return `Pages ${start}–${start + 1}`;
}

/** Empty 9-pocket slot (perforated binder look). */
function BinderEmptySlot() {
  return (
    <div
      aria-hidden
      className="h-full min-h-0 w-full min-w-0 rounded-[5px] border border-dashed border-zinc-400/70 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(0,0,0,0.06)]"
    />
  );
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

type CatalogueView = {
  spreadIndex: number;
  mobileFacingLeaf: "L" | "R";
};

function normalizeCatalogueView(
  view: CatalogueView,
  narrowCatalogue: boolean,
): CatalogueView {
  if (narrowCatalogue) return view;
  return { spreadIndex: view.spreadIndex, mobileFacingLeaf: "L" };
}

function getNextView(
  view: CatalogueView,
  narrowCatalogue: boolean,
  spreads: number,
): CatalogueView | null {
  const current = normalizeCatalogueView(view, narrowCatalogue);
  if (!narrowCatalogue) {
    if (current.spreadIndex >= spreads - 1) return null;
    return { spreadIndex: current.spreadIndex + 1, mobileFacingLeaf: "L" };
  }
  if (current.spreadIndex === 0) {
    if (spreads <= 1) return null;
    return { spreadIndex: 1, mobileFacingLeaf: "L" };
  }
  if (current.mobileFacingLeaf === "L") {
    return { ...current, mobileFacingLeaf: "R" };
  }
  if (current.spreadIndex >= spreads - 1) return null;
  return { spreadIndex: current.spreadIndex + 1, mobileFacingLeaf: "L" };
}

function getPrevView(
  view: CatalogueView,
  narrowCatalogue: boolean,
): CatalogueView | null {
  const current = normalizeCatalogueView(view, narrowCatalogue);
  if (!narrowCatalogue) {
    if (current.spreadIndex <= 0) return null;
    return { spreadIndex: current.spreadIndex - 1, mobileFacingLeaf: "L" };
  }
  if (current.spreadIndex === 0) return null;
  if (current.mobileFacingLeaf === "R") {
    return { ...current, mobileFacingLeaf: "L" };
  }
  if (current.spreadIndex === 1) {
    return { spreadIndex: 0, mobileFacingLeaf: "L" };
  }
  return { spreadIndex: current.spreadIndex - 1, mobileFacingLeaf: "R" };
}

function getPaneLayout(portalWidth: number) {
  const leftW = Math.max(0, Math.floor(portalWidth / 2));
  const rightW = Math.max(0, portalWidth - leftW);
  return {
    leftW,
    rightW,
    leftPane: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: leftW,
      boxSizing: "border-box",
    } satisfies CSSProperties,
    rightPane: {
      position: "absolute",
      left: leftW,
      top: 0,
      bottom: 0,
      width: rightW,
      boxSizing: "border-box",
    } satisfies CSSProperties,
  };
}

function getLeftLeafRestStyle(
  reduceMotion: boolean,
): CSSProperties | undefined {
  if (reduceMotion) return undefined;
  return {
    transform: getLeftLeafRestTransform(),
    transformOrigin: "right center",
    transformStyle: "preserve-3d",
    willChange: "transform",
  };
}

function getRightLeafRestStyle(
  reduceMotion: boolean,
): CSSProperties | undefined {
  if (reduceMotion) return undefined;
  return {
    transform: getRightLeafRestTransform(),
    willChange: "transform",
  };
}

function getLeftLeafRestTransform(): string {
  return `perspective(${LEFT_PORTAL_PERSPECTIVE}px) rotateY(${LEFT_PORTAL_ROTATE_Y}deg) translateX(${LEFT_PORTAL_TRANSLATE_X}px) scaleX(${LEFT_PORTAL_SCALE_X}) scaleY(${LEFT_PORTAL_SCALE_Y})`;
}

function getRightLeafRestTransform(): string {
  return `perspective(${LEFT_PORTAL_PERSPECTIVE}px) rotateY(0deg) translateX(${RIGHT_PORTAL_TRANSLATE_X}px) scaleX(1) scaleY(1)`;
}

function getLeafShellClass(pane: "left" | "right"): string {
  return pane === "right"
    ? "box-border flex min-h-0 min-w-0 flex-col gap-1.5 overflow-visible p-1.5 sm:pl-1.5 sm:pr-2 sm:pt-2 sm:pb-2"
    : "box-border flex min-h-0 min-w-0 flex-col gap-1.5 overflow-visible py-1.5 pl-0.5 pr-1 sm:py-2 sm:pl-1 sm:pr-1.5";
}

function CatalogueProductPage({
  products,
  vaultParchment,
  pageKey,
  prioritizeImages = false,
}: {
  products: VaultBookItem[];
  vaultParchment: string;
  pageKey: string;
  prioritizeImages?: boolean;
}) {
  return (
    <div
      key={pageKey}
      data-vault-page-surface={pageKey}
      className={`flex min-h-0 min-w-0 flex-1 flex-col rounded-sm p-2 ${vaultParchment}`}
    >
      <BinderNineGrid>
        {nineSlots(products).map((p, i) =>
          p ? (
            <ProductTile
              key={p.id}
              p={p}
              prioritizeImage={prioritizeImages && i < 4}
            />
          ) : (
            <BinderEmptySlot key={`${pageKey}-empty-${i}`} />
          ),
        )}
      </BinderNineGrid>
    </div>
  );
}

function CatalogueBlankPage({
  vaultParchment,
  pageKey,
}: {
  vaultParchment: string;
  pageKey: string;
}) {
  return (
    <div
      key={pageKey}
      data-vault-page-surface={pageKey}
      className={`flex min-h-0 min-w-0 w-full flex-1 flex-col rounded-sm p-2 ${vaultParchment}`}
      aria-hidden
    />
  );
}

function getRightLeafProducts(
  view: CatalogueView,
  spread: { left: VaultBookItem[]; right: VaultBookItem[] },
  narrowCatalogue: boolean,
): VaultBookItem[] {
  if (view.spreadIndex === 0) return spread.right;
  if (!narrowCatalogue) return spread.right;
  return view.mobileFacingLeaf === "L" ? spread.left : spread.right;
}

/** Page 1: two-page-wide portal; Close sits on the physical left leaf (same half as spread 2+). */
function FirstSpreadCatalogue({
  portalWidth,
  spread,
  vaultParchment,
  spreadPageLabel,
  goNext,
  closeVault,
  spreads,
  reduceMotion,
  narrowCatalogue,
  controlsDisabled,
  showLeftControls,
}: {
  portalWidth: number;
  spread: { left: VaultBookItem[]; right: VaultBookItem[] };
  vaultParchment: string;
  spreadPageLabel: (i: number) => string;
  goNext: () => void;
  closeVault: () => void;
  spreads: number;
  reduceMotion: boolean;
  narrowCatalogue: boolean;
  controlsDisabled: boolean;
  showLeftControls: boolean;
}) {
  const { leftPane, rightPane } = getPaneLayout(portalWidth);
  const leftTiltStyle = getLeftLeafRestStyle(reduceMotion);
  const rightSpineNudgeStyle = getRightLeafRestStyle(reduceMotion);
  return (
    <div
      data-vault-first-spread
      className="relative h-full min-h-0 min-w-0 overflow-visible"
      dir="ltr"
    >
      <div
        data-vault-first-left-leaf
        className={getLeafShellClass("left")}
        style={leftPane}
      >
        <div
          className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col"
          style={leftTiltStyle}
        >
          {narrowCatalogue ? (
            <CatalogueBlankPage
              vaultParchment={vaultParchment}
              pageKey="first-left-blank"
            />
          ) : (
            <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col justify-end gap-1.5">
              <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={closeVault}
                  disabled={controlsDisabled}
                  aria-hidden={!showLeftControls}
                  className="inline-flex items-center gap-1 rounded border border-[#8a7a62]/50 bg-white/50 px-2 py-1.5 text-[10px] font-[family-name:var(--font-cinzel)] uppercase tracking-widest text-[#3d3528] hover:border-[#6b5c42]/70 sm:text-xs"
                  style={{
                    opacity: showLeftControls ? 1 : 0,
                    pointerEvents: showLeftControls ? "auto" : "none",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div
        data-vault-first-right-leaf
        className={getLeafShellClass("right")}
        style={rightPane}
      >
        <div
          className="flex h-full min-h-0 min-w-0 flex-1 flex-col"
          style={rightSpineNudgeStyle}
        >
          <CatalogueProductPage
            products={spread.right}
            vaultParchment={vaultParchment}
            pageKey="first-right"
            prioritizeImages
          />
          <div className="flex w-full shrink-0 flex-wrap items-center justify-center gap-2">
            {narrowCatalogue ? (
              <button
                type="button"
                onClick={closeVault}
                disabled={controlsDisabled}
                className="inline-flex items-center gap-1 rounded border border-[#8a7a62]/50 bg-white/50 px-2 py-1.5 text-[10px] font-[family-name:var(--font-cinzel)] uppercase tracking-widest text-[#3d3528] hover:border-[#6b5c42]/70 sm:text-xs"
              >
                Close
              </button>
            ) : null}
            <span className="text-[10px] tabular-nums text-[#3d3528] sm:text-xs">
              {spreadPageLabel(0)}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={controlsDisabled || spreads <= 1}
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
  view,
  spread,
  vaultParchment,
  spreadPageLabel,
  goPrev,
  goNext,
  closeVault,
  spreads,
  reduceMotion,
  narrowCatalogue,
  controlsDisabled,
  showLeftControls,
}: {
  portalWidth: number;
  view: CatalogueView;
  spread: { left: VaultBookItem[]; right: VaultBookItem[] };
  vaultParchment: string;
  spreadPageLabel: (i: number) => string;
  goPrev: () => void;
  goNext: () => void;
  closeVault: () => void;
  spreads: number;
  reduceMotion: boolean;
  narrowCatalogue: boolean;
  controlsDisabled: boolean;
  showLeftControls: boolean;
}) {
  const { leftPane, rightPane } = getPaneLayout(portalWidth);
  const leftTiltStyle = getLeftLeafRestStyle(reduceMotion);
  const rightSpineNudgeStyle = getRightLeafRestStyle(reduceMotion);
  const rightProducts = getRightLeafProducts(view, spread, narrowCatalogue);
  return (
    <div
      data-vault-facing-split
      className="relative h-full min-h-0 min-w-0 overflow-visible"
      dir="ltr"
    >
      <div
        data-vault-left-leaf
        className={getLeafShellClass("left")}
        style={leftPane}
      >
        <div
          className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col"
          style={leftTiltStyle}
        >
          {narrowCatalogue ? (
            <CatalogueBlankPage
              vaultParchment={vaultParchment}
              pageKey={`left-blank-${view.spreadIndex}`}
            />
          ) : (
            <div
              key={`L-${view.spreadIndex}`}
              data-vault-left-page
              className="flex min-h-0 min-w-0 w-full flex-1 flex-col"
            >
              <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-1.5">
                <CatalogueProductPage
                  products={spread.left}
                  vaultParchment={vaultParchment}
                  pageKey={`left-${view.spreadIndex}`}
                />
                <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={controlsDisabled}
                    aria-hidden={!showLeftControls}
                    className="inline-flex items-center gap-1 rounded border border-[#8a7a62]/50 bg-white/50 px-2 py-1.5 text-[10px] text-[#3d3528] hover:border-[#6b5c42]/70 sm:text-xs"
                    style={{
                      opacity: showLeftControls ? 1 : 0,
                      pointerEvents: showLeftControls ? "auto" : "none",
                    }}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={closeVault}
                    disabled={controlsDisabled}
                    aria-hidden={!showLeftControls}
                    className="inline-flex items-center gap-1 rounded border border-[#8a7a62]/50 bg-white/50 px-2 py-1.5 text-[10px] font-[family-name:var(--font-cinzel)] uppercase tracking-widest text-[#3d3528] hover:border-[#6b5c42]/70 sm:text-xs"
                    style={{
                      opacity: showLeftControls ? 1 : 0,
                      pointerEvents: showLeftControls ? "auto" : "none",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div
        data-vault-right-leaf
        className={getLeafShellClass("right")}
        style={rightPane}
      >
        <div
          className="flex h-full min-h-0 min-w-0 flex-1 flex-col"
          style={rightSpineNudgeStyle}
        >
          <CatalogueProductPage
            products={rightProducts}
            vaultParchment={vaultParchment}
            pageKey={`right-${view.spreadIndex}-${narrowCatalogue ? view.mobileFacingLeaf : "wide"}`}
          />
          <div className="flex w-full shrink-0 flex-wrap items-center justify-center gap-2">
            {narrowCatalogue ? (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={controlsDisabled}
                  className="inline-flex items-center gap-1 rounded border border-[#8a7a62]/50 bg-white/50 px-2 py-1.5 text-[10px] text-[#3d3528] hover:border-[#6b5c42]/70 sm:text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={closeVault}
                  disabled={controlsDisabled}
                  className="inline-flex items-center gap-1 rounded border border-[#8a7a62]/50 bg-white/50 px-2 py-1.5 text-[10px] font-[family-name:var(--font-cinzel)] uppercase tracking-widest text-[#3d3528] hover:border-[#6b5c42]/70 sm:text-xs"
                >
                  Close
                </button>
              </>
            ) : null}
            <span className="text-[10px] tabular-nums text-[#3d3528] sm:text-xs">
              {spreadPageLabel(view.spreadIndex)}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={
                controlsDisabled ||
                (narrowCatalogue
                  ? view.spreadIndex >= spreads - 1 &&
                    view.mobileFacingLeaf === "R"
                  : view.spreadIndex >= spreads - 1)
              }
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

function VaultCatalogueSpread({
  view,
  catalog,
  portalWidth,
  vaultParchment,
  spreadPageLabel,
  goNextCatalogue,
  goPrevCatalogue,
  closeVault,
  spreads,
  reduceMotion,
  narrowCatalogue,
  controlsDisabled,
  showLeftControls,
}: {
  view: CatalogueView;
  catalog: VaultBookItem[];
  portalWidth: number;
  vaultParchment: string;
  spreadPageLabel: (i: number) => string;
  goNextCatalogue: () => void;
  goPrevCatalogue: () => void;
  closeVault: () => void;
  spreads: number;
  reduceMotion: boolean;
  narrowCatalogue: boolean;
  controlsDisabled: boolean;
  showLeftControls: boolean;
}) {
  const spread = sliceSpread(catalog, view.spreadIndex);
  if (view.spreadIndex === 0) {
    return (
      <FirstSpreadCatalogue
        portalWidth={portalWidth}
        spread={spread}
        vaultParchment={vaultParchment}
        spreadPageLabel={spreadPageLabel}
        goNext={goNextCatalogue}
        closeVault={closeVault}
        spreads={spreads}
        reduceMotion={reduceMotion}
        narrowCatalogue={narrowCatalogue}
        controlsDisabled={controlsDisabled}
        showLeftControls={showLeftControls}
      />
    );
  }
  return (
    <FacingCatalogueSpread
      portalWidth={portalWidth}
      view={view}
      spread={spread}
      vaultParchment={vaultParchment}
      spreadPageLabel={spreadPageLabel}
      goPrev={goPrevCatalogue}
      goNext={goNextCatalogue}
      closeVault={closeVault}
      spreads={spreads}
      reduceMotion={reduceMotion}
      narrowCatalogue={narrowCatalogue}
      controlsDisabled={controlsDisabled}
      showLeftControls={showLeftControls}
    />
  );
}

function ProductTile({
  p,
  prioritizeImage = false,
}: {
  p: VaultBookItem;
  prioritizeImage?: boolean;
}) {
  return (
    <Link
      href={p.href}
      className="group flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden rounded-[5px] border border-zinc-950/90 bg-[#0a0908] shadow-[0_1px_0_rgba(212,175,55,0.12),inset_0_0_0_1px_rgba(212,175,55,0.1)] transition hover:border-[color:var(--color-vault-gold)] hover:shadow-[0_0_14px_rgba(212,175,55,0.22)]"
    >
      <div className="relative min-h-0 w-full flex-1 bg-black">
        {p.imageSrc ? (
          <Image
            src={p.imageSrc}
            alt=""
            fill
            sizes="(max-width: 640px) 22vw, 120px"
            loading="eager"
            fetchPriority={prioritizeImage ? "high" : undefined}
            priority={prioritizeImage}
            unoptimized
            className="object-contain transition group-hover:brightness-105"
          />
        ) : (
          <PlaceholderThumb seed={p.id} />
        )}
      </div>
      <div className="line-clamp-2 shrink-0 px-1 py-0.5 text-center font-[family-name:var(--font-cinzel)] text-[7px] leading-tight text-[color:var(--color-vault-parchment)] group-hover:text-[color:var(--color-vault-gold)] sm:text-[8px]">
        {p.title}
        {p.badge ? (
          <span className="mt-0.5 block text-[6px] font-normal tracking-wide text-[color:var(--color-vault-gold)]/45 sm:text-[7px]">
            {p.badge}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export type VaultBookProps = {
  items: VaultBookItem[];
  coverImageSrc?: string;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

export default function VaultBook({
  items,
  coverImageSrc = "/book.png",
  onOpenChange,
  className,
}: {
  items: VaultBookItem[];
  coverImageSrc?: string;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const narrowCatalogue = useNarrowVaultCatalogue();
  const catalog = useMemo(() => buildCatalog(items), [items]);
  const spreads = useMemo(() => totalSpreads(catalog.length), [catalog.length]);
  const initialRightLeafProducts = useMemo(
    () => sliceSpread(catalog, 0).right.filter((product) => product.imageSrc),
    [catalog],
  );

  const [open, setOpen] = useState(false);
  const [catalogueView, setCatalogueView] = useState<CatalogueView>({
    spreadIndex: 0,
    mobileFacingLeaf: "L",
  });
  /** Show catalogue portal only after cover open animation so it does not sit on top of the cover mid-flip. */
  const [vaultCatalogueMounted, setVaultCatalogueMounted] = useState(false);
  const [vaultCatalogueVisible, setVaultCatalogueVisible] = useState(false);
  const [vaultLeftControlsVisible, setVaultLeftControlsVisible] = useState(false);
  const bookShellRef = useRef<HTMLDivElement>(null);
  const prevNarrowCatalogueRef = useRef(narrowCatalogue);
  const [portalBox, setPortalBox] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const previous = prevNarrowCatalogueRef.current;
    prevNarrowCatalogueRef.current = narrowCatalogue;
    if (previous === narrowCatalogue) return;
    const id = window.requestAnimationFrame(() => {
      setCatalogueView((current) =>
        normalizeCatalogueView(current, narrowCatalogue),
      );
    });
    return () => window.cancelAnimationFrame(id);
  }, [narrowCatalogue]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [onOpenChange, open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const preloaders = initialRightLeafProducts
      .map((product) => product.imageSrc)
      .filter((imageSrc): imageSrc is string => Boolean(imageSrc))
      .map((imageSrc) => {
        const img = new window.Image();
        img.decoding = "async";
        img.loading = "eager";
        img.src = imageSrc;
        return img;
      });

    return () => {
      preloaders.length = 0;
    };
  }, [initialRightLeafProducts]);

  useEffect(() => {
    if (!open || !vaultCatalogueMounted) return;
    if (reduceMotion) return;

    const pageTimer = window.setTimeout(() => {
      setVaultCatalogueVisible(true);
    }, VAULT_PAGE_REVEAL_MS);

    const controlsTimer = window.setTimeout(() => {
      setVaultLeftControlsVisible(true);
    }, VAULT_CONTROLS_REVEAL_MS);

    return () => {
      window.clearTimeout(pageTimer);
      window.clearTimeout(controlsTimer);
    };
  }, [open, reduceMotion, vaultCatalogueMounted]);

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
    if (!open || !vaultCatalogueMounted) return;
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
  }, [open, vaultCatalogueMounted, syncPortalBox]);

  const currentView = useMemo(
    () => normalizeCatalogueView(catalogueView, narrowCatalogue),
    [catalogueView, narrowCatalogue],
  );
  const spreadMotionKey = `${currentView.spreadIndex}-${currentView.mobileFacingLeaf}-${narrowCatalogue ? "narrow" : "wide"}`;
  const controlsDisabled = false;

  const handleVault = useCallback(() => {
    const resetView = { spreadIndex: 0, mobileFacingLeaf: "L" as const };
    const reopen = () => {
      setCatalogueView(resetView);
      setPortalBox(null);
      setOpen(true);
      setVaultCatalogueMounted(true);
      setVaultCatalogueVisible(Boolean(reduceMotion));
      setVaultLeftControlsVisible(Boolean(reduceMotion));
    };
    if (open) {
      setOpen(false);
      setVaultCatalogueMounted(false);
      setVaultCatalogueVisible(false);
      setVaultLeftControlsVisible(false);
      window.requestAnimationFrame(reopen);
      return;
    }
    reopen();
  }, [open, reduceMotion]);

  const requestTurn = useCallback(
    (direction: "forward" | "backward") => {
      const nextView =
        direction === "forward"
          ? getNextView(currentView, narrowCatalogue, spreads)
          : getPrevView(currentView, narrowCatalogue);
      if (!nextView) return;
      const normalizedNextView = normalizeCatalogueView(
        nextView,
        narrowCatalogue,
      );
      setCatalogueView(normalizedNextView);
    },
    [currentView, narrowCatalogue, spreads],
  );

  const goNextCatalogue = useCallback(() => {
    requestTurn("forward");
  }, [requestTurn]);

  const goPrevCatalogue = useCallback(() => {
    requestTurn("backward");
  }, [requestTurn]);

  const closeVault = useCallback(() => {
    setOpen(false);
    setCatalogueView({ spreadIndex: 0, mobileFacingLeaf: "L" });
    setVaultCatalogueMounted(false);
    setVaultCatalogueVisible(false);
    setVaultLeftControlsVisible(false);
    setPortalBox(null);
  }, []);

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
          pointerEvents: vaultCatalogueVisible ? "auto" : "none",
          opacity: vaultCatalogueVisible ? 1 : 0,
        };

  const cataloguePortal =
    open &&
    vaultCatalogueMounted &&
    portalBox &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        data-vault-spread-portal
        dir="ltr"
        className="min-h-0 min-w-0 overflow-visible bg-transparent"
        style={portalShellStyle}
      >
        <div
          className="relative h-full min-h-0 min-w-0"
          style={{ perspective: "min(1600px, 200vw)" }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={spreadMotionKey}
              className="absolute inset-0"
              initial={reduceMotion ? false : { opacity: 0.74 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0.74 }}
              transition={{
                duration: reduceMotion ? 0 : catalogueFadeDuration,
                ease: "easeOut",
              }}
            >
              <VaultCatalogueSpread
                view={currentView}
                catalog={catalog}
                portalWidth={portalBox.width}
                vaultParchment={vaultParchment}
                spreadPageLabel={spreadPageLabel}
                goNextCatalogue={goNextCatalogue}
                goPrevCatalogue={goPrevCatalogue}
                closeVault={closeVault}
              spreads={spreads}
              reduceMotion={Boolean(reduceMotion)}
              narrowCatalogue={narrowCatalogue}
              controlsDisabled={controlsDisabled}
              showLeftControls={vaultLeftControlsVisible}
            />
          </motion.div>
        </AnimatePresence>
        </div>
      </div>,
      document.body,
    );

  return (
    <div
      className={`relative flex min-h-dvh flex-col items-center px-4 pb-16 pt-8 sm:pt-12 ${className ?? ""}`}
    >
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
                transition={{ duration: reduceMotion ? 0 : VAULT_COVER_OPEN_DURATION, ease: bookEase }}
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
                aria-pressed={open}
                onClick={handleVault}
                className="absolute inset-0 z-10 cursor-pointer overflow-hidden rounded-r-md rounded-l-sm border-0 bg-transparent p-0 shadow-[0_10px_32px_rgba(0,0,0,0.65),inset_0_0_0_1px_rgba(0,0,0,0.25)] outline-none ring-0 focus-visible:ring-2 focus-visible:ring-[color:var(--color-vault-gold)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0604]"
                style={{
                  ...bfHidden,
                  transform: "translateZ(0.75px)",
                }}
              >
                <Image
                  src={coverImageSrc}
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
