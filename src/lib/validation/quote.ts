import { z } from 'zod';

export const termEnum = z.enum(['MONTHLY', 'ANNUAL', 'TWO_YEAR']);

/** One add-on the analyst selected. `addonSeats` is required (and used) only for per-seat add-ons. */
export const quoteAddonInput = z.object({
  tierFeatureId: z.string().min(1),
  addonSeats: z
    .number()
    .int('Seats must be a whole number')
    .min(0, 'Seats must be 0 or more')
    .max(1_000_000, 'That seat count is too large')
    .optional(),
});

export const quoteInput = z.object({
  name: z.string().trim().min(1, 'Quote name is required').max(150),
  customerName: z.string().trim().min(1, 'Customer name is required').max(150),
  productId: z.string().min(1, 'Choose a product'),
  tierId: z.string().min(1, 'Choose a tier'),
  seats: z
    .number()
    .int('Seats must be a whole number')
    .min(0, 'Seats must be 0 or more')
    .max(1_000_000, 'That seat count is too large'),
  term: termEnum,
  overallDiscountPercent: z
    .number()
    .refine(Number.isFinite, 'Enter a valid discount')
    .min(0, 'Discount must be between 0 and 100')
    .max(100, 'Discount must be between 0 and 100'),
  addons: z.array(quoteAddonInput),
});
export type QuoteInput = z.infer<typeof quoteInput>;
