// frontend/src/utils/validation.js

// Phone number validation (10 digits, only numbers)
export const validatePhoneNumber = (phone) => {
  const cleaned = phone.toString().replace(/\D/g, '');
  if (!cleaned || cleaned.length === 0) {
    return { isValid: false, message: 'Phone number is required' };
  }
  if (cleaned.length !== 10) {
    return { isValid: false, message: 'Phone number must be exactly 10 digits' };
  }
  const firstDigit = cleaned.charAt(0);
  if (!['6', '7', '8', '9'].includes(firstDigit)) {
    return { isValid: false, message: 'Phone number must start with 6, 7, 8, or 9' };
  }
  return { isValid: true, cleaned, message: '' };
};

// Name validation - No numbers allowed
export const validateName = (name) => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, message: 'Name is required' };
  }
  if (/\d/.test(name)) {
    return { isValid: false, message: 'Name cannot contain numbers' };
  }
  if (name.trim().length < 2) {
    return { isValid: false, message: 'Name must be at least 2 characters' };
  }
  return { isValid: true, message: '' };
};

// License number format - DL-XXXXXXXXXX or MH012022XXXXXXX
export const validateLicense = (license) => {
  if (!license || license.trim().length === 0) {
    return { isValid: false, message: 'License number is required' };
  }
  // Format 1: DL-142021008892 (DL- followed by 12-15 digits)
  // Format 2: MH0120220012345 (State code + digits)
  const pattern1 = /^[A-Z]{2}-\d{12,15}$/;
  const pattern2 = /^[A-Z]{2}\d{13,16}$/;
  const pattern3 = /^[A-Z]{2}[0-9]{13,16}$/i;
  
  if (pattern1.test(license) || pattern2.test(license) || pattern3.test(license)) {
    return { isValid: true, message: '' };
  }
  return { isValid: false, message: 'Enter valid license number (e.g., DL-142021008892 or MH0120220012345)' };
};

// Email validation
export const validateEmail = (email) => {
  if (!email) return { isValid: true, message: '' };
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(email)) {
    return { isValid: false, message: 'Enter valid email address' };
  }
  return { isValid: true, message: '' };
};

// Format phone input (only digits, max 10)
export const formatPhoneInput = (value) => {
  return value.toString().replace(/\D/g, '').slice(0, 10);
};

// Format name input (no numbers)
export const formatNameInput = (value) => {
  return value.replace(/[0-9]/g, '');
};