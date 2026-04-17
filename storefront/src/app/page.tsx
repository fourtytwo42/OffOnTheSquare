import BookVault from "@/components/vault/BookVault";
import VaultBook, { type VaultBookItem } from "@/components/vault/VaultBook";
import { getMedusa } from "@/lib/medusa";
import { getDefaultRegionId } from "@/lib/region";

export default async function HomePage() {
  const sdk = getMedusa();
  const region_id = await getDefaultRegionId();
  const { products } = await sdk.store.product.list({
    region_id,
    limit: 8,
    fields:
      "*thumbnail,*images,*variants.calculated_price,*variants.inventory_items",
  });

  type P = {
    id?: string;
    handle?: string | null;
    title?: string | null;
    thumbnail?: string | null;
    images?: { url?: string | null }[] | null;
  };
  const preview =
    (products as P[] | null)?.map((p) => {
      const firstImg = p.images?.find((im) => im?.url)?.url ?? null;
      return {
        id: p.id!,
        handle: p.handle!,
        title: p.title!,
        thumbnail: p.thumbnail ?? firstImg,
      };
    }) ?? [];

  const archiveItems: VaultBookItem[] = preview
    .slice(0, 5)
    .reverse()
    .map((product, index) => ({
      id: `archive-${product.id}`,
      title: `${product.title} Archive`,
      href: `/products/${product.handle}`,
      imageSrc: product.thumbnail,
      badge: index < 3 ? "Archive" : undefined,
    }));

  return (
    <>
      <BookVault products={preview} />
      <VaultBook
        items={archiveItems}
        coverImageSrc="/book2.png"
        className="min-h-[auto] pt-0"
      />
    </>
  );
}
