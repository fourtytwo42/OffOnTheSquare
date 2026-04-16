"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserMedusa } from "@/lib/sdk-browser";
import { clearCartCookie } from "@/app/actions/cart";

type Cart = Record<string, unknown>;

export default function CheckoutClient({
  cartId,
  initialCart,
}: {
  cartId: string;
  initialCart: Cart;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Cart>(initialCart);
  const [email, setEmail] = useState(String((initialCart as { email?: string }).email ?? ""));
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("gb");
  const [step, setStep] = useState<"address" | "pay">("address");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sdk = useMemo(() => getBrowserMedusa(), []);

  const refreshCart = useCallback(async () => {
    const { cart: c } = await sdk.store.cart.retrieve(cartId, {
      fields:
        "*items,*items.variant,*region,+payment_collection.payment_sessions,+payment_collection.payment_sessions.data",
    });
    setCart(c as Cart);
    return c as Cart;
  }, [sdk, cartId]);

  const prepareShippingAndPayment = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await sdk.store.cart.update(cartId, {
        email: email || undefined,
        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          address_1: address1,
          city,
          postal_code: postal,
          country_code: country,
        },
      });

      const { shipping_options } = await sdk.store.fulfillment.listCartOptions({
        cart_id: cartId,
      });
      const opt = shipping_options?.[0];
      if (!opt?.id) {
        throw new Error("No shipping options available for this cart.");
      }
      await sdk.store.cart.addShippingMethod(cartId, {
        option_id: opt.id,
      });

      const { cart: latest } = await sdk.store.cart.retrieve(cartId, {
        fields:
          "*items,*items.variant,*region,+payment_collection.payment_sessions,+payment_collection.payment_sessions.data",
      });
      await sdk.store.payment.initiatePaymentSession(latest!, {
        provider_id: "pp_paypal_paypal",
      });
      await refreshCart();
      setStep("pay");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Checkout preparation failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }, [
    sdk,
    cartId,
    email,
    firstName,
    lastName,
    address1,
    city,
    postal,
    country,
    refreshCart,
  ]);

  const paypalOrderId = useMemo(() => {
    const c = cart as {
      payment_collection?: {
        payment_sessions?: { provider_id?: string; data?: { id?: string } }[];
      };
    };
    const sessions = c.payment_collection?.payment_sessions ?? [];
    const paypal = sessions.find((s) => s.provider_id === "pp_paypal_paypal");
    return paypal?.data?.id as string | undefined;
  }, [cart]);

  const paypalClientId =
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "sandbox-placeholder";

  return (
    <div className="mt-8 space-y-6">
      {error ? (
        <p className="rounded border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {step === "address" ? (
        <form
          className="space-y-4 rounded-lg border border-[color:var(--color-vault-gold)]/25 bg-black/40 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void prepareShippingAndPayment();
          }}
        >
          <p className="text-sm text-[color:var(--color-vault-parchment)]/80">
            Shipping details (Europe region — adjust country as needed).
          </p>
          <label className="block text-sm">
            <span className="text-[color:var(--color-vault-parchment)]/70">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-[color:var(--color-vault-gold)]/30 bg-black px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-[color:var(--color-vault-parchment)]/70">First name</span>
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded border border-[color:var(--color-vault-gold)]/30 bg-black px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-[color:var(--color-vault-parchment)]/70">Last name</span>
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded border border-[color:var(--color-vault-gold)]/30 bg-black px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-[color:var(--color-vault-parchment)]/70">Address</span>
            <input
              required
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
              className="mt-1 w-full rounded border border-[color:var(--color-vault-gold)]/30 bg-black px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-[color:var(--color-vault-parchment)]/70">City</span>
              <input
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded border border-[color:var(--color-vault-gold)]/30 bg-black px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-[color:var(--color-vault-parchment)]/70">Postal code</span>
              <input
                required
                value={postal}
                onChange={(e) => setPostal(e.target.value)}
                className="mt-1 w-full rounded border border-[color:var(--color-vault-gold)]/30 bg-black px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-[color:var(--color-vault-parchment)]/70">Country</span>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1 w-full rounded border border-[color:var(--color-vault-gold)]/30 bg-black px-3 py-2 text-sm"
            >
              <option value="gb">United Kingdom</option>
              <option value="de">Germany</option>
              <option value="fr">France</option>
              <option value="es">Spain</option>
              <option value="it">Italy</option>
              <option value="se">Sweden</option>
              <option value="dk">Denmark</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded border border-[color:var(--color-vault-gold)]/50 bg-[color:var(--color-vault-crimson)]/85 py-3 text-sm font-semibold uppercase tracking-widest text-[color:var(--color-vault-parchment)] disabled:opacity-50"
          >
            {busy ? "Preparing…" : "Continue to PayPal"}
          </button>
        </form>
      ) : (
        <div className="rounded-lg border border-[color:var(--color-vault-gold)]/25 bg-black/40 p-4">
          <p className="mb-4 text-sm text-[color:var(--color-vault-parchment)]/80">
            Pay with PayPal (cards supported in the PayPal window). Use real sandbox
            keys in{" "}
            <code className="text-[color:var(--color-vault-gold)]">.env.local</code>{" "}
            for a live test.
          </p>
          {!paypalOrderId ? (
            <p className="text-sm text-amber-200/90">
              Waiting for PayPal order from Medusa… try refreshing this page.
            </p>
          ) : (
            <PayPalScriptProvider
              options={{
                clientId: paypalClientId,
                currency: "EUR",
                intent: "capture",
              }}
            >
              <PayPalButtons
                style={{ layout: "vertical", shape: "rect" }}
                createOrder={async () => paypalOrderId}
                onApprove={async () => {
                  const result = await sdk.store.cart.complete(cartId);
                  if (result.type === "order" && result.order) {
                    await clearCartCookie();
                    router.push(`/checkout/success?order=${result.order.id}`);
                  } else {
                    setError(
                      (result as { error?: { message?: string } }).error?.message ??
                        "Could not complete order"
                    );
                  }
                }}
              />
            </PayPalScriptProvider>
          )}
        </div>
      )}
    </div>
  );
}
