"use client";
/** Accessible numerical equivalent for every chart and a compact scoring record. */
export function ScoringTable({title, columns, rows}: {title: string; columns: readonly string[]; rows: readonly (readonly (string | number | null | undefined)[])[]}) {
  if (!rows.length) return null;
  return <details className="rounded-lg border border-border">
    <summary className="min-h-11 cursor-pointer p-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">{title}</summary>
    <div className="overflow-x-auto px-3 pb-3">
      <table className="w-full text-left text-xs tabular-nums">
        <caption className="sr-only">{title}</caption>
        <thead><tr>{columns.map(column => <th key={column} scope="col" className="whitespace-nowrap border-b border-border p-2 font-medium text-muted-foreground">{column}</th>)}</tr></thead>
        <tbody>{rows.map((row,index) => <tr key={index}>{row.map((value,column) => <td key={column} className="border-b border-border/50 p-2">{value ?? "—"}</td>)}</tr>)}</tbody>
      </table>
    </div>
  </details>;
}
