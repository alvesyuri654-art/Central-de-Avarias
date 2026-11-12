import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return '—';
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return cnpj;
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function formatAccessKey(key: string | null | undefined): string {
  if (!key) return '—';
  const clean = key.replace(/\D/g, '');
  if (clean.length !== 44) return key;
  return clean.match(/.{1,4}/g)?.join(' ') || key;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function formatBoxes(boxes: number | null | undefined): string {
  if (boxes === null || boxes === undefined) return '0 cx';
  return `${boxes.toLocaleString('pt-BR')} cx`;
}
