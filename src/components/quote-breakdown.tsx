import { formatUsd } from '@/lib/pricing/money';

export type BreakdownLine = {
  kind: string; // BASE | ADDON | DISCOUNT
  label: string;
  explanation: string;
  notes?: string | null;
  amountCents: number;
};

/**
 * The cost-breakdown table shared by the live preview and the saved public quote, so
 * "how each number was calculated" is shown identically in both places.
 */
export function QuoteBreakdown({
  lineItems,
  subtotalCents,
  totalCents,
}: {
  lineItems: BreakdownLine[];
  subtotalCents: number;
  /** Accepted for a complete API; the discount line itself carries the amount shown. */
  discountCents?: number;
  totalCents: number;
}) {
  const charges = lineItems.filter((li) => li.kind !== 'DISCOUNT');
  const discountLine = lineItems.find((li) => li.kind === 'DISCOUNT');

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2 font-medium">Line item</th>
            <th className="px-3 py-2 font-medium">How it was calculated</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {charges.map((li, i) => (
            <tr key={i} className="border-b border-slate-100 align-top">
              <td className="px-3 py-3">
                <div className="font-medium text-slate-900">{li.label}</div>
                {li.notes ? <div className="mt-0.5 text-xs text-slate-400">{li.notes}</div> : null}
              </td>
              <td className="px-3 py-3 text-slate-600">{li.explanation}</td>
              <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-900">
                {formatUsd(li.amountCents)}
              </td>
            </tr>
          ))}

          {discountLine ? (
            <>
              <tr className="border-b border-slate-100 align-top text-slate-500">
                <td className="px-3 py-2 font-medium">Subtotal</td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right tabular-nums">{formatUsd(subtotalCents)}</td>
              </tr>
              <tr className="border-b border-slate-100 align-top">
                <td className="px-3 py-3">
                  <div className="font-medium text-slate-900">{discountLine.label}</div>
                  {discountLine.notes ? (
                    <div className="mt-0.5 text-xs text-slate-400">{discountLine.notes}</div>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-slate-600">{discountLine.explanation}</td>
                <td className="px-3 py-3 text-right font-medium tabular-nums text-green-700">
                  {formatUsd(discountLine.amountCents)}
                </td>
              </tr>
            </>
          ) : null}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300">
            <td className="px-3 py-3 text-base font-semibold text-slate-900">Total</td>
            <td className="px-3 py-3" />
            <td className="px-3 py-3 text-right text-base font-bold tabular-nums text-slate-900">
              {formatUsd(totalCents)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
