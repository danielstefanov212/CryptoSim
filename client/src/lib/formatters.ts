export const formatCurrency = (decimalNumber: number, decimals?: number) => {
  const priceString = decimalNumber.toString();
  const decimalIndex = priceString.indexOf(".");
  const fractionDigits =
    decimalIndex !== -1 ? priceString.length - decimalIndex - 1 : 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals ? decimals : Math.max(fractionDigits, 2),
    maximumFractionDigits: decimals ? decimals : Math.max(fractionDigits, 2),
  }).format(decimalNumber);
};

export const formatDecimal = (value: number, decimals?: number): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals ?? 8,
  });
};

export const formatDate = (date: string | Date) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
};
