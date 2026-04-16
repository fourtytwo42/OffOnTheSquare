import Medusa from "@medusajs/js-sdk";

export function getMedusa(): Medusa {
  const baseUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://127.0.0.1:9000";
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
  return new Medusa({
    baseUrl,
    publishableKey,
  });
}
