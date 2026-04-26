export type PasswordChecklist = {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  symbol: boolean;
};

export const getPasswordChecklist = (password: string): PasswordChecklist => ({
  minLength: password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  number: /\d/.test(password),
  symbol: /[^A-Za-z0-9]/.test(password),
});

export const getPasswordStrength = (password: string) => {
  const checklist = getPasswordChecklist(password);
  const score = Object.values(checklist).filter(Boolean).length;

  if (!password) {
    return { score: 0, label: 'Add a password', color: 'gray' };
  }

  if (score <= 2) {
    return { score, label: 'Weak', color: 'red' };
  }

  if (score <= 4) {
    return { score, label: 'Good', color: 'orange' };
  }

  return { score, label: 'Strong', color: 'teal' };
};

export const normalizeInviteList = (value: string) =>
  value
    .split(/[,\n]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((item, index, all) => all.indexOf(item) === index);
