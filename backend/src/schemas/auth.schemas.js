const { z } = require('zod');

const phone = z
  .string({ required_error: 'Phone number is required' })
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

const role = z
  .enum(['DRIVER', 'OWNER', 'MANAGER'], {
    errorMap: () => ({ message: 'role must be DRIVER, OWNER, or MANAGER' }),
  });

const otp = z
  .string({ required_error: 'OTP is required' })
  .trim()
  .length(6, 'OTP must be 6 digits')
  .regex(/^\d{6}$/, 'OTP must be numeric');

const pin = z
  .string({ required_error: 'PIN is required' })
  .trim()
  .min(4, 'PIN must be 4-6 digits')
  .max(6, 'PIN must be 4-6 digits')
  .regex(/^\d+$/, 'PIN must be numeric');

// ── Schemas ───────────────────────────────────────────────────────────────────

const SendOtpSchema = z.object({
  phone: phone.optional(),
  phone_number: phone.optional(),
  role: role.optional(),
}).refine(d => d.phone || d.phone_number, {
  message: 'Phone number is required',
});

const VerifyOtpSchema = z.object({
  phone: phone.optional(),
  phone_number: phone.optional(),
  otp,
  role: role.optional(),
}).refine(d => d.phone || d.phone_number, {
  message: 'Phone number is required',
});

const LoginPinSchema = z.object({
  phone_number: phone,
  pin,
  role,
});

const SetPinSchema = z.object({
  current_pin: pin.optional(),
  new_pin: pin,
});

const ResetPinSchema = z.object({
  phone_number: phone,
  role,
  otp,
  new_pin: pin,
});

const ForgotPinSchema = z.object({
  phone_number: phone,
  role,
});

const OwnerSignupSchema = z.object({
  full_name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .regex(/^[^\d]+$/, 'Name cannot contain numbers'),
  mobile_number: phone,
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Enter a valid email address')
    .toLowerCase(),
  company_name: z.string().trim().optional(),
});

const OwnerSignupVerifySchema = OwnerSignupSchema.extend({ otp });

const AdminSendOtpSchema = z.object({
  phone_number: z.string().trim().min(1, 'phone_number required'),
  admin_secret: z.string().min(1, 'admin_secret required'),
});

const AdminVerifyOtpSchema = AdminSendOtpSchema.extend({ otp });

const AdminLoginSchema = z.object({
  phone_number: z.string().trim().min(1, 'phone_number required'),
  password: z.string().min(1, 'password required'),
});

module.exports = {
  SendOtpSchema,
  VerifyOtpSchema,
  LoginPinSchema,
  SetPinSchema,
  ResetPinSchema,
  ForgotPinSchema,
  OwnerSignupSchema,
  OwnerSignupVerifySchema,
  AdminSendOtpSchema,
  AdminVerifyOtpSchema,
  AdminLoginSchema,
};
