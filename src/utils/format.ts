export const formatCurrency = (value: number | string): string => {
  const amount = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(amount)) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const parseCurrencyToNumber = (value: string): number => {
  const cleanValue = value.replace(/[R$\s.]/g, '').replace(',', '.');
  return parseFloat(cleanValue) || 0;
};
