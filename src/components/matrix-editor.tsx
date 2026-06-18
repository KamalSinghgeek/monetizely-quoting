'use client';

import { useState, useTransition } from 'react';
import { saveMatrix } from '@/lib/actions/catalog';
import { Button, Select } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatUsd } from '@/lib/pricing/money';

type Availability = 'INCLUDED' | 'ADDON' | 'NOT_AVAILABLE';
type AddonModel = 'FIXED_MONTHLY' | 'PER_SEAT' | 'PERCENT_OF_PRODUCT';

export type CellState = {
  availability: Availability;
  addonModel: AddonModel | null;
  addonValue: number | null; // analyst units: dollars (fixed/per-seat) or percent
};

export type MatrixData = {
  productId: string;
  tiers: { id: string; name: string; basePriceCents: number }[];
  features: { id: string; name: string }[];
  cells: Record<string, CellState>;
};

const key = (tierId: string, featureId: string) => `${tierId}:${featureId}`;
const DEFAULT_CELL: CellState = { availability: 'NOT_AVAILABLE', addonModel: null, addonValue: null };

const VALUE_UNIT: Record<AddonModel, string> = {
  FIXED_MONTHLY: '$ / month',
  PER_SEAT: '$ / seat / mo',
  PERCENT_OF_PRODUCT: '% of product',
};

export function MatrixEditor({ data }: { data: MatrixData }) {
  const [cells, setCells] = useState<Record<string, CellState>>(() => {
    const init: Record<string, CellState> = {};
    for (const t of data.tiers) {
      for (const f of data.features) {
        init[key(t.id, f.id)] = data.cells[key(t.id, f.id)] ?? { ...DEFAULT_CELL };
      }
    }
    return init;
  });
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: 'idle' | 'saved' | 'error'; message?: string }>({ kind: 'idle' });

  function update(tierId: string, featureId: string, patch: Partial<CellState>) {
    setCells((prev) => {
      const k = key(tierId, featureId);
      const next = { ...prev[k], ...patch };
      // When a cell first becomes an add-on, default the model so the value input is meaningful.
      if (patch.availability === 'ADDON' && next.addonModel == null) next.addonModel = 'FIXED_MONTHLY';
      return { ...prev, [k]: next };
    });
    setStatus({ kind: 'idle' });
  }

  function onSave() {
    const payload = {
      productId: data.productId,
      cells: Object.entries(cells).map(([k, c]) => {
        const [tierId, featureId] = k.split(':');
        const isAddon = c.availability === 'ADDON';
        return {
          tierId,
          featureId,
          availability: c.availability,
          addonModel: isAddon ? c.addonModel : null,
          addonValue: isAddon ? c.addonValue : null,
        };
      }),
    };

    const invalid = payload.cells.find(
      (c) => c.availability === 'ADDON' && (!c.addonModel || c.addonValue == null || !(c.addonValue >= 0)),
    );
    if (invalid) {
      setStatus({ kind: 'error', message: 'Every add-on cell needs a pricing model and a value of 0 or more.' });
      return;
    }

    startTransition(async () => {
      const res = await saveMatrix(payload);
      setStatus(res.ok ? { kind: 'saved' } : { kind: 'error', message: res.message });
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700">
                Feature
              </th>
              {data.tiers.map((t) => (
                <th key={t.id} className="min-w-56 px-4 py-3 text-left font-semibold text-slate-700">
                  {t.name}
                  <span className="ml-1 font-normal text-slate-400 tabular-nums">
                    {formatUsd(t.basePriceCents)}/seat/mo
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.features.map((f, rowIdx) => (
              <tr key={f.id} className={rowIdx % 2 ? 'bg-slate-50/40' : ''}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-t border-slate-100 bg-inherit px-4 py-3 text-left font-medium text-slate-900"
                >
                  {f.name}
                </th>
                {data.tiers.map((t) => (
                  <td key={t.id} className="border-t border-slate-100 px-4 py-3 align-top">
                    <CellEditor
                      cell={cells[key(t.id, f.id)]}
                      onChange={(patch) => update(t.id, f.id, patch)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onSave} disabled={pending}>
          {pending ? 'Saving…' : 'Save matrix'}
        </Button>
        {status.kind === 'saved' ? <span className="text-sm font-medium text-green-700">Saved ✓</span> : null}
        {status.kind === 'error' ? (
          <span role="alert" className="text-sm font-medium text-red-600">
            {status.message}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CellEditor({ cell, onChange }: { cell: CellState; onChange: (patch: Partial<CellState>) => void }) {
  return (
    <div className="space-y-2">
      <Select
        aria-label="Availability"
        value={cell.availability}
        onChange={(e) => onChange({ availability: e.target.value as Availability })}
        className={cn(
          cell.availability === 'INCLUDED' && 'text-green-700',
          cell.availability === 'ADDON' && 'text-blue-700',
          cell.availability === 'NOT_AVAILABLE' && 'text-slate-400',
        )}
      >
        <option value="INCLUDED">Included</option>
        <option value="ADDON">Add-on</option>
        <option value="NOT_AVAILABLE">Not available</option>
      </Select>

      {cell.availability === 'ADDON' ? (
        <div className="space-y-2 rounded-md bg-blue-50/60 p-2">
          <Select
            aria-label="Pricing model"
            value={cell.addonModel ?? 'FIXED_MONTHLY'}
            onChange={(e) => onChange({ addonModel: e.target.value as AddonModel })}
          >
            <option value="FIXED_MONTHLY">Fixed monthly</option>
            <option value="PER_SEAT">Per seat / month</option>
            <option value="PERCENT_OF_PRODUCT">% of product</option>
          </Select>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={cell.addonModel === 'PERCENT_OF_PRODUCT' ? '0.01' : '0.01'}
              aria-label="Add-on value"
              value={cell.addonValue ?? ''}
              onChange={(e) => onChange({ addonValue: e.target.value === '' ? null : Number(e.target.value) })}
              className="block w-24 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
            <span className="text-xs text-slate-500">{VALUE_UNIT[cell.addonModel ?? 'FIXED_MONTHLY']}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
