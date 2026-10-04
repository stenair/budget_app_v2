export function formatMoney(
  cents: number,
  options: { compact?: boolean; showSign?: boolean } = {},
) {
  const { compact = false, showSign = false } = options;
  const value = cents === 0 ? 0 : cents / 100;

  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: compact ? 0 : 2,
    notation: compact ? "compact" : "standard",
    signDisplay: showSign ? "exceptZero" : "auto",
  }).format(value);
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00+08:00`));
}

export function formatDateTime(value: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Perth",
  }).format(new Date(value));
}
