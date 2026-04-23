import VaultLibrary, {
  type VaultBookDefinition,
  type ResolvedVaultBookDefinition,
} from "@/components/vault/VaultLibrary";
import { type VaultBookItem } from "@/components/vault/VaultBook";
import { getMedusa } from "@/lib/medusa";
import { getDefaultRegionId } from "@/lib/region";

type PreviewProduct = {
  id: string;
  handle: string;
  title: string;
  thumbnail: string | null;
};

type PreviewCategory = {
  id: string;
  handle: string;
  name: string;
};

const VAULT_BOOK_DEFINITIONS: VaultBookDefinition[] = [
  {
    id: "shirts",
    slug: "shirts",
    title: "Shirts",
    spineTitle: "Shirts",
    categoryHandle: "shirts",
    coverImageSrc: "/book.png",
    tabletopProp: "dice",
  },
  {
    id: "sweatshirts",
    slug: "sweatshirts",
    title: "Sweatshirts",
    spineTitle: "Sweatshirts",
    categoryHandle: "sweatshirts",
    coverImageSrc: "/book2.png",
    tabletopProp: "candle",
  },
  {
    id: "pants",
    slug: "pants",
    title: "Pants",
    spineTitle: "Pants",
    categoryHandle: "pants",
    coverImageSrc: "/book.png",
    tabletopProp: "coin",
  },
  {
    id: "merch",
    slug: "merch",
    title: "Merch",
    spineTitle: "Merch",
    categoryHandle: "merch",
    coverImageSrc: "/book2.png",
    tabletopProp: "map",
  },
];

function toVaultBookItems(
  products: PreviewProduct[],
  badge?: string,
): VaultBookItem[] {
  return products.map((product) => ({
    id: product.id,
    title: product.title,
    href: `/products/${product.handle}`,
    imageSrc: product.thumbnail,
    badge,
  }));
}

export default async function VaultEnterPage() {
  let books: ResolvedVaultBookDefinition[] = VAULT_BOOK_DEFINITIONS.map((book) => ({
    ...book,
    items: book.items ?? [],
  }));

  try {
    const sdk = getMedusa();
    const region_id = await getDefaultRegionId();
    const { product_categories } = await sdk.store.category.list({ limit: 50 });
    const categories = (product_categories ?? []) as PreviewCategory[];
    const categoryByHandle = new Map(
      categories.map((category) => [category.handle, category]),
    );

    books = await Promise.all(
      VAULT_BOOK_DEFINITIONS.map(async (book) => {
        if (book.items?.length) {
          return { ...book, items: book.items };
        }

        if (!book.categoryHandle) {
          return { ...book, items: [] };
        }

        const category = categoryByHandle.get(book.categoryHandle);
        if (!category?.id) {
          return { ...book, items: [] };
        }

        try {
          const { products } = await sdk.store.product.list({
            region_id,
            limit: 48,
            category_id: [category.id],
            fields: "*variants.calculated_price,*variants.inventory_items",
          } as {
            region_id: string;
            limit: number;
            category_id: string[];
            fields: string;
          });

          return {
            ...book,
            title: category.name ?? book.title,
            spineTitle: category.name ?? book.spineTitle,
            items: toVaultBookItems(
              (products ?? []) as PreviewProduct[],
              category.name ?? book.title,
            ),
          };
        } catch {
          return {
            ...book,
            title: category.name ?? book.title,
            spineTitle: category.name ?? book.spineTitle,
            items: [],
          };
        }
      }),
    );

  } catch {
    // Fall back to placeholder-backed books when the backend is unavailable.
  }

  return <VaultLibrary books={books} />;
}
