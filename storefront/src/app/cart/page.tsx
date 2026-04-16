import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { getMedusa } from "@/lib/medusa";
import { CART_COOKIE } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import CartLineActions from "@/components/CartLineActions";

export default async function CartPage() {
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  if (!cartId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-[family-name:var(--font-cinzel)] text-2xl text-[color:var(--color-vault-gold)]">
          Your cart is empty
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-vault-parchment)]/75">
          Step into the vault and add something worth taking home.
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-block rounded border border-[color:var(--color-vault-gold)]/50 px-6 py-3 text-sm text-[color:var(--color-vault-gold)] hover:bg-[color:var(--color-vault-gold)]/10"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  const sdk = getMedusa();
  let cart;
  try {
    const res = await sdk.store.cart.retrieve(cartId, {
      fields:
        "*items,*items.variant,*items.variant.product,*items.thumbnail,*region",
    });
    cart = res.cart;
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-[color:var(--color-vault-parchment)]/80">
        This cart could not be loaded.{" "}
        <Link href="/shop" className="text-[color:var(--color-vault-gold)]">
          Start over
        </Link>
      </div>
    );
  }

  type Line = {
    id?: string;
    title?: string | null;
    quantity?: number | null;
    unit_price?: number | null;
    thumbnail?: string | null;
    variant?: {
      title?: string | null;
      product?: { title?: string | null; thumbnail?: string | null };
    } | null;
  };
  const items = (cart?.items ?? []) as Line[];
  const currency = cart?.region?.currency_code;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-[family-name:var(--font-cinzel)] text-3xl text-[color:var(--color-vault-gold)]">
        Cart
      </h1>

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-[color:var(--color-vault-parchment)]/80">
          Nothing here yet.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {items.map((li) => {
            const thumb =
              li.thumbnail ?? li.variant?.product?.thumbnail ?? null;
            const title =
              li.title ??
              li.variant?.product?.title ??
              li.variant?.title ??
              "Item";
            const unit = li.unit_price ?? 0;
            return (
              <li
                key={li.id}
                className="flex gap-4 rounded-lg border border-[color:var(--color-vault-gold)]/20 bg-black/40 p-3"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-black">
                  {thumb ? (
                    <Image src={thumb} alt="" fill className="object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[color:var(--color-vault-parchment)]">
                    {title}
                  </p>
                  <p className="text-xs text-[color:var(--color-vault-parchment)]/60">
                    {li.variant?.title}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--color-vault-gold)]">
                    {formatMoney(unit, currency)}{" "}
                    <span className="text-[color:var(--color-vault-parchment)]/60">
                      × {li.quantity}
                    </span>
                  </p>
                  <CartLineActions lineItemId={li.id!} quantity={li.quantity!} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10 flex flex-col gap-4 border-t border-[color:var(--color-vault-gold)]/20 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-lg text-[color:var(--color-vault-gold)]">
          Total{" "}
          <span className="text-[color:var(--color-vault-parchment)]">
            {formatMoney(
              items.reduce(
                (n, li) => n + (li.unit_price ?? 0) * (li.quantity ?? 0),
                0
              ),
              currency
            )}
          </span>
        </p>
        {items.length > 0 ? (
          <Link
            href="/checkout"
            className="inline-flex justify-center rounded border border-[color:var(--color-vault-gold)]/60 bg-[color:var(--color-vault-crimson)]/85 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-[color:var(--color-vault-parchment)] hover:bg-[color:var(--color-vault-crimson-bright)]/90"
          >
            Checkout
          </Link>
        ) : null}
      </div>
    </div>
  );
}
