"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeLineItem, updateLineItemQuantity } from "@/app/actions/cart";

export default function CartLineActions({
  lineItemId,
  quantity,
}: {
  lineItemId: string;
  quantity: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-xs text-[color:var(--color-vault-parchment)]/70">
        Qty
        <select
          disabled={pending}
          className="rounded border border-[color:var(--color-vault-gold)]/30 bg-black px-2 py-1 text-sm"
          value={quantity}
          onChange={(e) => {
            const q = Number(e.target.value);
            start(async () => {
              await updateLineItemQuantity(lineItemId, q);
              router.refresh();
            });
          }}
        >
          {Array.from(
            { length: Math.max(10, quantity) },
            (_, i) => i + 1
          ).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await removeLineItem(lineItemId);
            router.refresh();
          })
        }
        className="text-xs text-red-400 hover:underline"
      >
        Remove
      </button>
    </div>
  );
}
