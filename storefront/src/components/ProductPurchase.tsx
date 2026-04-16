"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { addLineItem } from "@/app/actions/cart";
import { formatMoney } from "@/lib/money";
import { getVariantStock } from "@/lib/inventory";

type Variant = {
  id?: string;
  title?: string | null;
  calculated_price?: {
    calculated_amount?: number;
    currency_code?: string;
  };
  manage_inventory?: boolean | null;
  inventory_items?: {
    inventory?: { stocked_quantity?: number | null } | null;
    required_quantity?: number | null;
  }[];
};

export default function ProductPurchase({ variants }: { variants: Variant[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [vid, setVid] = useState(variants[0]?.id ?? "");
  const variant = useMemo(
    () => variants.find((v) => v.id === vid) ?? variants[0],
    [variants, vid]
  );
  const stock = variant ? getVariantStock(variant) : null;
  const out = stock !== null && stock <= 0;

  return (
    <div className="mt-6 space-y-4 rounded-lg border border-[color:var(--color-vault-gold)]/25 bg-black/40 p-4">
      {variants.length > 1 ? (
        <label className="block text-sm">
          <span className="text-[color:var(--color-vault-parchment)]/80">
            Variant
          </span>
          <select
            className="mt-1 w-full rounded border border-[color:var(--color-vault-gold)]/30 bg-black px-3 py-2 text-sm"
            value={vid}
            onChange={(e) => setVid(e.target.value)}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="text-lg text-[color:var(--color-vault-gold)]">
        {formatMoney(
          variant?.calculated_price?.calculated_amount,
          variant?.calculated_price?.currency_code
        )}
      </div>

      {stock !== null ? (
        <p className="text-sm text-[color:var(--color-vault-parchment)]/80">
          {out ? "Out of stock" : `${stock} left in the vault`}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!variant?.id || out || pending}
        onClick={() => {
          if (!variant?.id) return;
          start(async () => {
            await addLineItem(variant.id!, 1);
            router.push("/cart");
          });
        }}
        className="w-full rounded border border-[color:var(--color-vault-gold)]/50 bg-[color:var(--color-vault-crimson)]/80 py-3 text-sm font-semibold uppercase tracking-widest text-[color:var(--color-vault-parchment)] hover:bg-[color:var(--color-vault-crimson-bright)]/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Adding…" : out ? "Unavailable" : "Add to cart"}
      </button>
    </div>
  );
}
