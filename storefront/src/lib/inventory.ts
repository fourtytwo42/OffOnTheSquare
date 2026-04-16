type InvItem = {
  inventory?: { stocked_quantity?: number | null } | null;
  required_quantity?: number | null;
};

type VariantLike = {
  manage_inventory?: boolean | null;
  allow_backorder?: boolean | null;
  inventory_items?: InvItem[] | null;
};

export function getVariantStock(variant: VariantLike): number | null {
  if (!variant.manage_inventory) return null;
  const items = variant.inventory_items;
  if (!items?.length) return 0;
  let min = Number.POSITIVE_INFINITY;
  for (const it of items) {
    const stocked = it.inventory?.stocked_quantity ?? 0;
    const req = it.required_quantity ?? 1;
    if (req > 0) min = Math.min(min, Math.floor(stocked / req));
  }
  if (!Number.isFinite(min)) return 0;
  return min;
}
