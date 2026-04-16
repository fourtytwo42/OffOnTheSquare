import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/lib/money";

type Variant = {
  id?: string;
  calculated_price?: {
    calculated_amount?: number;
    currency_code?: string;
  };
};

export default function ProductCard({
  handle,
  title,
  thumbnail,
  variants,
}: {
  handle: string;
  title: string;
  thumbnail: string | null;
  variants?: Variant[] | null;
}) {
  const v = variants?.find((x) => x?.calculated_price) ?? variants?.[0];
  const price = v?.calculated_price?.calculated_amount;
  const cur = v?.calculated_price?.currency_code;
  return (
    <Link
      href={`/products/${handle}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-[color:var(--color-vault-gold)]/20 bg-black/50 shadow-lg transition hover:border-[color:var(--color-vault-gold)]/55 hover:shadow-[0_0_24px_rgba(120,20,20,0.35)]"
    >
      <div className="relative aspect-square w-full bg-[#0a0a0a]">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="(max-width:768px) 50vw, 280px"
            className="object-cover opacity-90 transition group-hover:opacity-100"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[color:var(--color-vault-parchment)]/50">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-semibold text-[color:var(--color-vault-parchment)] group-hover:text-[color:var(--color-vault-gold)] sm:text-base">
          {title}
        </h2>
        <p className="mt-auto text-sm text-[color:var(--color-vault-gold)]">
          {formatMoney(price, cur)}
        </p>
      </div>
    </Link>
  );
}
