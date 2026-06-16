/**
 * Zod schemas — Driver routes
 */
const { z } = require('zod');

const positiveInt = z.coerce.number().int().positive();

// Location update
const UpdateLocationSchema = z.object({
  latitude:  z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy:  z.coerce.number().optional(),
});

// SOS alert
const SosAlertSchema = z.object({
  message:   z.string().trim().max(500).optional(),
  latitude:  z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

// Daily log entry
const DailyLogSchema = z.object({
  odometer_start: z.coerce.number().nonnegative().optional(),
  odometer_end:   z.coerce.number().nonnegative().optional(),
  fuel_added:     z.coerce.number().nonnegative().optional(),
  note:           z.string().trim().max(1000).optional(),
});

// Payment request
const PaymentRequestSchema = z.object({
  amount:    z.coerce.number().positive(),
  reason:    z.string().trim().min(3, 'Reason required'),
  mode:      z.enum(['CASH', 'UPI', 'BANK_TRANSFER']).optional(),
});

module.exports = {
  UpdateLocationSchema, SosAlertSchema, DailyLogSchema, PaymentRequestSchema,
};
