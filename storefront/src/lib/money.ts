export function formatMoney(
  amount: number | undefined,
  currencyCode: string | undefined
): string {
  if (amount == null) return "—";
  const code = (currencyCode || "usd").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
    }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}
