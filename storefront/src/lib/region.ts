import { getMedusa } from "@/lib/medusa";

export async function getDefaultRegionId(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID;
  if (fromEnv) return fromEnv;
  const sdk = getMedusa();
  const { regions } = await sdk.store.region.list({ limit: 1 });
  const id = regions?.[0]?.id;
  if (!id) throw new Error("No Medusa region found");
  return id;
}
