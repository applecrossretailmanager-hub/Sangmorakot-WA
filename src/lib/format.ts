export function formatMoney(cents: number, currency = "AUD") {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function formatInterval(interval: string, intervalCount: number) {
  if (intervalCount === 1) return `per ${interval}`;
  return `every ${intervalCount} ${interval}s`;
}

export function formatDateTime(iso: string, timeZone = "Australia/Perth") {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

export function formatTime(iso: string, timeZone = "Australia/Perth") {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

export function formatDayHeading(iso: string, timeZone = "Australia/Perth") {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(new Date(iso));
}
