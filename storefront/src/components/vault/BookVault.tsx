"use client";

import VaultBook, { type VaultBookItem } from "@/components/vault/VaultBook";
import { useMemo } from "react";

type PreviewProduct = {
  id: string;
  handle: string;
  title: string;
  thumbnail: string | null;
};

function toVaultBookItems(products: PreviewProduct[]): VaultBookItem[] {
  return products.map((product) => ({
    id: product.id,
    title: product.title,
    href: `/products/${product.handle}`,
    imageSrc: product.thumbnail,
  }));
}

export default function BookVault({
  products,
}: {
  products: PreviewProduct[];
}) {
  const items = useMemo(() => toVaultBookItems(products), [products]);

  return <VaultBook items={items} />;
}
