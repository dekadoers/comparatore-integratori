import { Product } from "@/types/database";

// Helper per estrarre il peso in grammi dal formato o JSON
export function getProductWeightGrams(product: Product): number {
  if (product.values_json?.weight_g && Number(product.values_json.weight_g) > 0) {
    return Number(product.values_json.weight_g);
  }

  const formatStr = String(product.values_json?.format || "");
  const matchKg = formatStr.match(/(\d+(?:\.\d+)?)\s*kg/i);
  if (matchKg) return parseFloat(matchKg[1]) * 1000;

  const matchG = formatStr.match(/(\d+)\s*g/i);
  if (matchG) return parseInt(matchG[1], 10);

  return 1000; // default 1kg se non specificato
}

// Calcola il Costo per 100g di prodotto
export function calculateCostPer100g(product: Product): number {
  const weightG = getProductWeightGrams(product);
  if (!weightG || weightG <= 0) return 0;
  return (product.price / weightG) * 100;
}

// Calcola il Costo per 100g di Proteina Pura
export function calculateCostPer100gProtein(product: Product): number | null {
  const proteinPct = product.protein_percentage || 0;
  if (proteinPct <= 0) return null;
  const cost100gProduct = calculateCostPer100g(product);
  return (cost100gProduct / proteinPct) * 100;
}
