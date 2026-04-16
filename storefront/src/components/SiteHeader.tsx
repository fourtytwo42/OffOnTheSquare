import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { cookies } from "next/headers";
import { getMedusa } from "@/lib/medusa";
import { CART_COOKIE } from "@/lib/constants";

async function cartCount(): Promise<number> {
  const jar = await cookies();
  const id = jar.get(CART_COOKIE)?.value;
  if (!id) return 0;
  try {
    const sdk = getMedusa();
    const { cart } = await sdk.store.cart.retrieve(id);
    return (
      cart?.items?.reduce(
        (n: number, li: { quantity?: number | null }) => n + (li.quantity ?? 0),
        0
      ) ?? 0
    );
  } catch {
    return 0;
  }
}

export default async function SiteHeader() {
  const count = await cartCount();
  return (
    <header className="border-b border-[color:var(--color-vault-gold)]/25 bg-black/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <nav className="flex flex-wrap items-center gap-4 text-sm tracking-wide text-[color:var(--color-vault-parchment)]">
          <Link href="/" className="font-[family-name:var(--font-cinzel)] text-[color:var(--color-vault-gold)] hover:text-amber-200">
            Home
          </Link>
          <Link href="/shop" className="hover:text-[color:var(--color-vault-gold)]">
            Shop
          </Link>
          <Link href="/contact" className="hover:text-[color:var(--color-vault-gold)]">
            Contact
          </Link>
        </nav>
        <Link
          href="/cart"
          className="relative inline-flex items-center gap-2 rounded-md border border-[color:var(--color-vault-gold)]/40 px-3 py-1.5 text-sm text-[color:var(--color-vault-gold)] hover:bg-[color:var(--color-vault-gold)]/10"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden />
          <span>Cart</span>
          {count > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--color-vault-crimson)] px-1 text-xs font-semibold text-white">
              {count}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
