const ZERO_DECIMAL = ["JPY", "KRW", "VND", "CLP", "ISK"];

export function formatMinor(amountMinor, currency, minorUnitExponent) {
  const digits = typeof minorUnitExponent === "number"
    ? minorUnitExponent
    : (ZERO_DECIMAL.indexOf(currency) !== -1 ? 0 : 2);
  const value = digits === 0 ? amountMinor : amountMinor / Math.pow(10, digits);
  return value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function Money({
  amountMinor = 0,
  currency = "JPY",
  size = "md",
  kind,
  signed = true,
  showCode = true,
  muted = false,
  minorUnitExponent,
  style,
}) {
  const font =
    size === "hero" ? "var(--type-money-hero)"
    : size === "lg" ? "var(--type-money-lg)"
    : size === "sm" ? "var(--type-money-sm)"
    : "var(--type-money)";
  const negative = amountMinor < 0;
  const abs = Math.abs(amountMinor);
  let color = "var(--money-expense)";
  if (muted) color = "var(--money-zero)";
  else if (kind === "income") color = "var(--money-income)";
  else if (kind === "transfer") color = "var(--money-transfer)";
  const sign = !signed ? "" : negative ? "\u2212" : kind === "income" ? "+" : "";
  return (
    <span
      style={{
        font,
        color,
        letterSpacing: "var(--tracking-money)",
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {sign}
      {formatMinor(abs, currency, minorUnitExponent)}
      {showCode ? (
        <span
          style={{
            font: "var(--type-label)",
            letterSpacing: "var(--tracking-label)",
            color: "var(--text-tertiary)",
            marginLeft: "var(--space-3)",
          }}
        >
          {currency}
        </span>
      ) : null}
    </span>
  );
}
