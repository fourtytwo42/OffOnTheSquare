import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMedusa } from "@/lib/medusa";
import { CART_COOKIE } from "@/lib/constants";
import CheckoutClient from "@/components/CheckoutClient";

export default async function CheckoutPage() {
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  if (!cartId) redirect("/cart");

  const sdk = getMedusa();
  let cart;
  try {
    const res = await sdk.store.cart.retrieve(cartId, {
      fields:
        "*items,*items.variant,*region,+payment_collection.payment_sessions,+payment_collection.payment_sessions.data",
    });
    cart = res.cart;
  } catch {
    redirect("/cart");
  }

  if (!cart?.items?.length) redirect("/cart");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-[family-name:var(--font-cinzel)] text-3xl text-[color:var(--color-vault-gold)]">
        Checkout
      </h1>
      <CheckoutClient cartId={cartId} initialCart={cart} />
    </div>
  );
}
