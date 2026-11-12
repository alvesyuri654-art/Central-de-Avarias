/**
 * Validação algorítmica da Chave de Acesso da NF-e (44 dígitos - Módulo 11 SEFAZ)
 */
export function validateNfeAccessKey(key: string): boolean {
  const cleanKey = key.replace(/\D/g, '');
  if (cleanKey.length !== 44) return false;

  let sum = 0;
  let weight = 2;

  for (let i = 42; i >= 0; i--) {
    sum += parseInt(cleanKey.charAt(i), 10) * weight;
    weight++;
    if (weight > 9) weight = 2;
  }

  const remainder = sum % 11;
  const expectedDigit = remainder === 0 || remainder === 1 ? 0 : 11 - remainder;
  const actualDigit = parseInt(cleanKey.charAt(43), 10);

  return expectedDigit === actualDigit;
}

/**
 * Validação de CNPJ brasileiro com dígitos verificadores
 */
export function validateCnpj(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return false;
  if (/^(\d)\1+$/.test(clean)) return false;

  let size = 12;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0), 10)) return false;

  size = 13;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1), 10);
}

/**
 * Validador estrito de Caixas Inteiras
 */
export function validatePositiveBoxes(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}
