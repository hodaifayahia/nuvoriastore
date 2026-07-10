export function formatPrice(price: number): string {
  return `${price.toLocaleString('fr-DZ')} DZD`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-DZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
