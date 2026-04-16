import type { ComponentProps } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { getMedusa } from "@/lib/medusa";
import { getDefaultRegionId } from "@/lib/region";

type Props = { params: Promise<{ category: string }> };

export default async function ShopCategoryPage({ params }: Props) {
  const { category: handle } = await params;
  const sdk = getMedusa();
  const region_id = await getDefaultRegionId();

  const { product_categories } = await sdk.store.category.list({
    handle,
    limit: 1,
  });
  const cat = product_categories?.[0];
  if (!cat?.id) notFound();

  const { products } = await sdk.store.product.list({
    region_id,
    limit: 48,
    category_id: [cat.id],
    fields: "*variants.calculated_price,*variants.inventory_items",
  } as { region_id: string; limit: number; category_id: string[]; fields: string });

  const { product_categories: tabs } = await sdk.store.category.list({
    limit: 50,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 text-center font-[family-name:var(--font-cinzel)] text-3xl text-[color:var(--color-vault-gold)] sm:text-4xl">
        {cat.name}
      </h1>
      <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-[color:var(--color-vault-parchment)]/80">
        Items filed under this category in the vault.
      </p>

      <div className="mb-8 flex flex-wrap justify-center gap-2">
        <Link
          href="/shop"
          className="rounded-full border border-[color:var(--color-vault-gold)]/25 px-4 py-1.5 text-sm text-[color:var(--color-vault-parchment)] hover:border-[color:var(--color-vault-gold)]/60 hover:text-[color:var(--color-vault-gold)]"
        >
          All
        </Link>
        {tabs?.map((c: { id: string; handle: string; name: string }) => (
          <Link
            key={c.id}
            href={`/shop/${c.handle}`}
            className={
              c.handle === handle
                ? "rounded-full border border-[color:var(--color-vault-gold)]/50 bg-[color:var(--color-vault-gold)]/10 px-4 py-1.5 text-sm text-[color:var(--color-vault-gold)]"
                : "rounded-full border border-[color:var(--color-vault-gold)]/25 px-4 py-1.5 text-sm text-[color:var(--color-vault-parchment)] hover:border-[color:var(--color-vault-gold)]/60 hover:text-[color:var(--color-vault-gold)]"
            }
          >
            {c.name}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products?.length ? (
          (
            products as {
              id: string;
              handle: string;
              title: string;
              thumbnail: string | null;
              variants: ComponentProps<typeof ProductCard>["variants"];
            }[]
          ).map((p) => (
            <ProductCard
              key={p.id}
              handle={p.handle}
              title={p.title}
              thumbnail={p.thumbnail}
              variants={p.variants}
            />
          ))
        ) : (
          <p className="col-span-full text-center text-sm text-[color:var(--color-vault-parchment)]/70">
            Nothing in this category yet.
          </p>
        )}
      </div>
    </div>
  );
}
