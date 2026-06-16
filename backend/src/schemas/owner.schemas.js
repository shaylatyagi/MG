/**
 * Zod schemas — Owner routes
 */
const { z } = require('zod');

const phone = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');
const positiveInt = z.coerce.number().int().positive();
const optionalStr = z.string().trim().optional();

// Driver management
const AddDriverSchema = z.object({
  name:     z.string().trim().min(2, 'Name must be at least 2 characters'),
  phone:    phone,
  license:  optionalStr,
  address:  optionalStr,
  vehicle_id: z.coerce.number().int().positive().optional(),
});

const UpdateDriverSchema = AddDriverSchema.partial();

// Vehicle management
const AddVehicleSchema = z.object({
  registration_number: z.string().trim().min(4, 'Invalid registration number'),
  make:     optionalStr,
  model:    optionalStr,
  year:     z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1).optional(),
  fuel_type: z.enum(['PETROL', 'DIESEL', 'ELECTRIC', 'CNG', 'HYBRID']).optional(),
  type:     optionalStr,
});

const UpdateVehicleSchema = AddVehicleSchema.partial();

// Advance / payment
const AdvanceSchema = z.object({
  driver_id:  positiveInt,
  amount:     z.coerce.number().positive('Amount must be positive'),
  note:       optionalStr,
});

// Assign vehicle to driver
const AssignVehicleSchema = z.object({
  driver_id:  positiveInt,
  vehicle_id: positiveInt,
});

// Branch
const BranchSchema = z.object({
  name:     z.string().trim().min(2),
  address:  optionalStr,
  city:     optionalStr,
  state:    optionalStr,
  phone:    phone.optional(),
});

// Manager
const AddManagerSchema = z.object({
  name:        z.string().trim().min(2),
  phone:       phone,
  permissions: z.record(z.boolean()).optional(),
});

module.exports = {
  AddDriverSchema, UpdateDriverSchema,
  AddVehicleSchema, UpdateVehicleSchema,
  AdvanceSchema, AssignVehicleSchema,
  BranchSchema, AddManagerSchema,
};
