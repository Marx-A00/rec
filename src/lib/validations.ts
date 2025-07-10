export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }

  return { isValid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long',
    };
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasUppercase || !hasLowercase || !hasNumber) {
    return {
      isValid: false,
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    };
  }

  return { isValid: true };
}

// Strict validation function (minimum 2 characters for all new names)
export function validateNameStrict(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return {
      isValid: false,
      message: 'Name is required',
    };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    return {
      isValid: false,
      message: 'Name must be at least 2 characters long',
    };
  }

  if (trimmedName.length > 30) {
    return {
      isValid: false,
      message: 'Name must be 30 characters or less',
    };
  }

  if (!/^[a-zA-Z0-9\s\-_.]+$/.test(trimmedName)) {
    return {
      isValid: false,
      message:
        'Name can only contain letters, numbers, spaces, hyphens, underscores, and periods',
    };
  }

  if (trimmedName !== name) {
    return {
      isValid: false,
      message: 'Name cannot start or end with spaces',
    };
  }

  return { isValid: true };
}

// For new user registration (name required)
export function validateNameForRegistration(name: string): ValidationResult {
  return validateNameStrict(name);
}

// For profile updates (name required, minimum 2 characters)
export function validateNameForProfile(name: string): ValidationResult {
  return validateNameStrict(name);
}

// Keep existing function for backward compatibility
export function validateName(name: string): ValidationResult {
  if (!name) {
    return { isValid: true }; // Name is optional
  }

  if (name.length < 2) {
    return {
      isValid: false,
      message: 'Name must be at least 2 characters long',
    };
  }

  if (name.length > 50) {
    return {
      isValid: false,
      message: 'Name must be less than 50 characters long',
    };
  }

  return { isValid: true };
}

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;

  if (score <= 2) {
    return { score, label: 'Weak', color: 'text-red-500' };
  } else if (score <= 4) {
    return { score, label: 'Medium', color: 'text-yellow-500' };
  } else {
    return { score, label: 'Strong', color: 'text-green-500' };
  }
}
