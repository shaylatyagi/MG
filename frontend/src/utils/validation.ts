// validation.ts — first TypeScript file in the project
// Identical logic to validation.js but fully typed.

interface ValidationResult {
  isValid: boolean;
  message: string;
  cleaned?: string;
}

export const validatePhoneNumber = (phone: string | number): ValidationResult => {
  const cleaned = phone.toString().replace(/\D/g, '');
  if (!cleaned) return { isValid: false, message: 'Phone number is required' };
  if (cleaned.length !== 10) return { isValid: false, message: 'Phone number must be exactly 10 digits' };
  if (!['6','7','8','9'].includes(cleaned[0]))
    return { isValid: false, message: 'Phone number must start with 6, 7, 8, or 9' };
  return { isValid: true, cleaned, message: '' };
};

export const validateName = (name: string): ValidationResult => {
  if (!name?.trim()) return { isValid: false, message: 'Name is required' };
  if (/\d/.test(name))  return { isValid: false, message: 'Name cannot contain numbers' };
  if (name.trim().length < 2) return { isValid: false, message: 'Name must be at least 2 characters' };
  return { isValid: true, message: '' };
};

export const validateLicense = (license: string): ValidationResult => {
  if (!license?.trim()) return { isValid: false, message: 'License number is required' };
  const pattern1 = /^[A-Z]{2}-\d{12,15}$/;
  const pattern2 = /^[A-Z]{2}\d{13,16}$/;
  const pattern3 = /^[A-Z]{2}[0-9]{13,16}$/i;
  if (pattern1.test(license) || pattern2.test(license) || pattern3.test(license))
    return { isValid: true, message: '' };
  return { isValid: false, message: 'Enter valid license number (e.g., DL-142021008892 or MH0120220012345)' };
};

export const validateEmail = (email: string): ValidationResult => {
  if (!email) return { isValid: true, message: '' }; // optional
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(email)) return { isValid: false, message: 'Enter valid email address' };
  return { isValid: true, message: '' };
};

export const validatePin = (pin: string): ValidationResult => {
  if (!pin) return { isValid: false, message: 'PIN is required' };
  if (!/^\d{4,6}$/.test(pin)) return { isValid: false, message: 'PIN must be 4-6 digits' };
  return { isValid: true, message: '' };
};

export const formatPhoneInput  = (v: string): string => v.replace(/\D/g, '').slice(0, 10);
export const formatNameInput   = (v: string): string => v.replace(/[0-9]/g, '');
