import Link from "next/link";

type Props = { searchParams: Promise<{ order?: string }> };

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { order } = await searchParams;
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="font-[family-name:var(--font-cinzel)] text-3xl text-[color:var(--color-vault-gold)]">
        Order received
      </h1>
      <p className="mt-4 text-sm text-[color:var(--color-vault-parchment)]/85">
        Thank you. Your goods are being pulled from the vault.
      </p>
      {order ? (
        <p className="mt-2 text-xs text-[color:var(--color-vault-parchment)]/60">
          Reference: <span className="text-[color:var(--color-vault-gold)]">{order}</span>
        </p>
      ) : null}
      <Link
        href="/shop"
        className="mt-10 inline-block rounded border border-[color:var(--color-vault-gold)]/50 px-6 py-3 text-sm text-[color:var(--color-vault-gold)] hover:bg-[color:var(--color-vault-gold)]/10"
      >
        Back to shop
      </Link>
    </div>
  );
}
