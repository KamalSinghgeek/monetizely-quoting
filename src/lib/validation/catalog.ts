import { z } from 'zod';

/** A monetary amount entered in dollars by the analyst (converted to cents before storage). */
const dollarsField = (label = 'amount') =>
  z
    .number({ error: `Enter a valid ${label}` })
    .refine(Number.isFinite, `Enter a valid ${label}`)
    .min(0, 'Must be 0 or more')
    .max(1_000_000, 'That value is too large');

export const productInput = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(100),
  notes: z.string().trim().max(1000).optional(),
});
export type ProductInput = z.infer<typeof productInput>;

export const tierInput = z.object({
  name: z.string().trim().min(1, 'Tier name is required').max(80),
  basePriceDollars: dollarsField('price'),
});
export type TierInput = z.infer<typeof tierInput>;

export const featureInput = z.object({
  name: z.string().trim().min(1, 'Feature name is required').max(120),
});
export type FeatureInput = z.infer<typeof featureInput>;

export const availabilityEnum = z.enum(['INCLUDED', 'ADDON', 'NOT_AVAILABLE']);
export const addonModelEnum = z.enum(['FIXED_MONTHLY', 'PER_SEAT', 'PERCENT_OF_PRODUCT']);

/**
 * A single (tier, feature) cell. `addonValue` is what the analyst typed: dollars for
 * FIXED_MONTHLY/PER_SEAT, percent for PERCENT_OF_PRODUCT. The action converts it to
 * the stored unit (cents or basis points). Add-on fields are required iff ADDON.
 */
export const matrixCellInput = z
  .object({
    tierId: z.string().min(1),
    featureId: z.string().min(1),
    availability: availabilityEnum,
    addonModel: addonModelEnum.nullish(),
    addonValue: z.number().nullish(),
  })
  .superRefine((cell, ctx) => {
    if (cell.availability !== 'ADDON') return;
    if (!cell.addonModel) {
      ctx.addIssue({ code: 'custom', message: 'Pick a pricing model', path: ['addonModel'] });
    }
    if (cell.addonValue == null || !Number.isFinite(cell.addonValue) || cell.addonValue < 0) {
      ctx.addIssue({ code: 'custom', message: 'Enter a value', path: ['addonValue'] });
      return;
    }
    // Upper bounds (mirrors the tier price ceiling; prevents absurd values overflowing at quote time).
    if (cell.addonModel === 'PERCENT_OF_PRODUCT' && cell.addonValue > 100) {
      ctx.addIssue({ code: 'custom', message: 'Percentage must be between 0 and 100', path: ['addonValue'] });
    } else if (cell.addonModel !== 'PERCENT_OF_PRODUCT' && cell.addonValue > 1_000_000) {
      ctx.addIssue({ code: 'custom', message: 'That value is too large', path: ['addonValue'] });
    }
  });
export type MatrixCellInput = z.infer<typeof matrixCellInput>;

export const matrixSaveInput = z.object({
  productId: z.string().min(1),
  cells: z.array(matrixCellInput),
});
export type MatrixSaveInput = z.infer<typeof matrixSaveInput>;
