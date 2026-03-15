export type MetricValueType = "revenue" | "currency" | "percentage" | "number";

const ZAR_CURRENCY_FORMATTER = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});

const NUMBER_FORMATTER = new Intl.NumberFormat("en-ZA");
const TIME_FORMATTER = new Intl.DateTimeFormat("en-ZA", {
  hour: "2-digit",
  minute: "2-digit",
});

export const formatZarCurrency = (value: number): string => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return ZAR_CURRENCY_FORMATTER.format(safeValue);
};

export const formatShortTime = (value: Date): string => TIME_FORMATTER.format(value);

export const formatMetricValue = (
  value: number | null | undefined,
  type: MetricValueType,
): string => {
  const safeValue = Number(value ?? 0);

  switch (type) {
    case "revenue":
    case "currency":
      return formatZarCurrency(safeValue);
    case "percentage":
      return `${safeValue.toFixed(1)}%`;
    case "number":
    default:
      return NUMBER_FORMATTER.format(safeValue);
  }
};

export const generateDeterministicTrend = (
  currentValue: number,
  points: number,
): number[] => {
  const safeCurrent = Math.max(0, Number(currentValue) || 0);
  if (points <= 1) return [Math.round(safeCurrent)];

  const start = safeCurrent * 0.72;
  const step = (safeCurrent - start) / (points - 1);

  return Array.from({ length: points }, (_, idx) =>
    Math.round(start + step * idx),
  );
};
