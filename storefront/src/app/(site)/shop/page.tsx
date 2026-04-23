import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getMedusa } from "@/lib/medusa";
import { getDefaultRegionId } from "@/lib/region";

export default async function ShopPage() {
  const sdk = getMedusa();
  const region_id = await getDefaultRegionId();
  const [{ products }, { product_categories }] = await Promise.all([
    sdk.store.product.list({
      region_id,
      limit: 48,
      fields: "*variants.calculated_price,*variants.inventory_items",
    }),
    sdk.store.category.list({ limit: 50 }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 text-center font-[family-name:var(--font-cinzel)] text-3xl text-[color:var(--color-vault-gold)] sm:text-4xl">
        The Shop
      </h1>
      <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-[color:var(--color-vault-parchment)]/80">
        Browse every listing. Filter by category to narrow the vault.
      </p>

      <div className="mb-8 flex flex-wrap justify-center gap-2">
        <Link
          href="/shop"
          className="rounded-full border border-[color:var(--color-vault-gold)]/50 bg-[color:var(--color-vault-gold)]/10 px-4 py-1.5 text-sm text-[color:var(--color-vault-gold)]"
        >
          All
        </Link>
        {product_categories?.map((c: { id: string; handle: string; name: string }) => (
          <Link
            key={c.id}
            href={`/shop/${c.handle}`}
            className="rounded-full border border-[color:var(--color-vault-gold)]/25 px-4 py-1.5 text-sm text-[color:var(--color-vault-parchment)] hover:border-[color:var(--color-vault-gold)]/60 hover:text-[color:var(--color-vault-gold)]"
          >
            {c.name}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {(products as {
          id: string;
          handle: string;
          title: string;
          thumbnail: string | null;
          variants: React.ComponentProps<typeof ProductCard>["variants"];
        }[])?.map((p) => (
          <ProductCard
            key={p.id}
            handle={p.handle}
            title={p.title}
            thumbnail={p.thumbnail}
            variants={p.variants}
          />
        ))}
      </div>
    </div>
  );
}
