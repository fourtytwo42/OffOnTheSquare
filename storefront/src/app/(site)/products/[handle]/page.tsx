import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductPurchase from "@/components/ProductPurchase";
import { getMedusa } from "@/lib/medusa";
import { getDefaultRegionId } from "@/lib/region";

type Props = { params: Promise<{ handle: string }> };

export default async function ProductPage({ params }: Props) {
  const { handle } = await params;
  const sdk = getMedusa();
  const region_id = await getDefaultRegionId();
  const { products } = await sdk.store.product.list({
    region_id,
    handle,
    limit: 1,
    fields:
      "+variants.calculated_price,+variants.inventory_items,+variants.options",
  });

  const product = products?.[0];
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link
        href="/shop"
        className="text-sm text-[color:var(--color-vault-gold)] hover:underline"
      >
        ← Back to shop
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-lg border border-[color:var(--color-vault-gold)]/25 bg-black">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title ?? ""}
              fill
              priority
              className="object-cover"
              sizes="(max-width:768px) 100vw, 50vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[color:var(--color-vault-parchment)]/50">
              No image
            </div>
          )}
        </div>

        <div>
          <h1 className="font-[family-name:var(--font-cinzel)] text-3xl text-[color:var(--color-vault-gold)]">
            {product.title}
          </h1>
          {product.subtitle ? (
            <p className="mt-1 text-sm text-[color:var(--color-vault-parchment)]/75">
              {product.subtitle}
            </p>
          ) : null}
          {product.description ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--color-vault-parchment)]/90">
              {product.description}
            </p>
          ) : null}

          <ProductPurchase variants={product.variants ?? []} />
        </div>
      </div>
    </div>
  );
}
