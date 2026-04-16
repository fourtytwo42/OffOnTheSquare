"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getMedusa } from "@/lib/medusa";
import { CART_COOKIE } from "@/lib/constants";

async function getRegionId(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID;
  if (fromEnv) return fromEnv;
  const sdk = getMedusa();
  const { regions } = await sdk.store.region.list({ limit: 1 });
  const id = regions?.[0]?.id;
  if (!id) throw new Error("No region configured in Medusa");
  return id;
}

export async function getOrCreateCartId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;
  const sdk = getMedusa();
  if (existing) {
    try {
      await sdk.store.cart.retrieve(existing);
      return existing;
    } catch {
      jar.delete(CART_COOKIE);
    }
  }
  const region_id = await getRegionId();
  const { cart } = await sdk.store.cart.create({ region_id });
  if (!cart?.id) throw new Error("Failed to create cart");
  jar.set(CART_COOKIE, cart.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return cart.id;
}

export async function addLineItem(variantId: string, quantity: number) {
  const cartId = await getOrCreateCartId();
  const sdk = getMedusa();
  await sdk.store.cart.createLineItem(cartId, {
    variant_id: variantId,
    quantity,
  });
  revalidatePath("/cart");
  revalidatePath("/");
}

export async function updateLineItemQuantity(lineItemId: string, quantity: number) {
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  if (!cartId) return;
  const sdk = getMedusa();
  if (quantity < 1) {
    await sdk.store.cart.deleteLineItem(cartId, lineItemId);
  } else {
    await sdk.store.cart.updateLineItem(cartId, lineItemId, { quantity });
  }
  revalidatePath("/cart");
}

export async function removeLineItem(lineItemId: string) {
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  if (!cartId) return;
  const sdk = getMedusa();
  await sdk.store.cart.deleteLineItem(cartId, lineItemId);
  revalidatePath("/cart");
}

export async function clearCartCookie() {
  const jar = await cookies();
  jar.delete(CART_COOKIE);
}
