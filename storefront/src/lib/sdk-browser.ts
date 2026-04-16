"use client";

import Medusa from "@medusajs/js-sdk";

let sdk: Medusa | null = null;

export function getBrowserMedusa(): Medusa {
  if (!sdk) {
    const baseUrl =
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://127.0.0.1:9000";
    const publishableKey =
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
    sdk = new Medusa({ baseUrl, publishableKey });
  }
  return sdk;
}
