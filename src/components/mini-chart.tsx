export function MiniChart({ values, color = "#2f6b55" }: { values: number[]; color?: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 28 - ((value - min) / Math.max(1, max - min)) * 24;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 32" className="h-10 w-24 overflow-visible" role="img" aria-label="Recent trend">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
