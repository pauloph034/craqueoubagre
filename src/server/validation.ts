export function cleanText(value: unknown, maxLength = 60) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function cleanUsername(value: unknown) {
  return cleanText(value, 28).toLowerCase();
}

export function isValidUsername(username: string) {
  return /^[a-z0-9_.-]{3,28}$/.test(username);
}

export function isStrongEnoughPassword(password: string) {
  return password.length >= 6 && password.length <= 128;
}
