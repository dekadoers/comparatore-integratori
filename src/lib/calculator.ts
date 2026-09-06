import { Product } from "@/types/database";

export type Obiettivo = "dimagrimento" | "mantenimento" | "massa";
export type Alimentazione = "onnivora" | "vegana";
export type FrequenzaAllenamento = "0-1" | "2-3" | "4-5" | "6+";
export type CategoriaIntegratore = "proteine" | "creatina" | "omega3" | "altro";

export interface CalculatorInput {
  pesoKg: number;
  obiettivo: Obiettivo;
  alimentazione: Alimentazione;
  frequenza: FrequenzaAllenamento;
}

export interface Range {
  min: number;
  max: number;
}

export interface CalculatorResult {
  proteinaG: Range;
  creatinaConsigliata: boolean;
  creatinaG: Range;
  omega3G: Range;
  note: string[];
}

// Fattori g di proteina per kg di peso corporeo, in base all'obiettivo
const PROTEIN_FACTORS: Record<Obiettivo, Range> = {
  dimagrimento: { min: 2.0, max: 2.4 },
  mantenimento: { min: 1.6, max: 1.8 },
  massa: { min: 1.8, max: 2.2 },
};

export function calculateNeeds(input: CalculatorInput): CalculatorResult {
  const { pesoKg, obiettivo, alimentazione, frequenza } = input;
  const proteinFactor = PROTEIN_FACTORS[obiettivo];

  const proteinaG: Range = {
    min: Math.round(pesoKg * proteinFactor.min),
    max: Math.round(pesoKg * proteinFactor.max),
  };

  const creatinaConsigliata = frequenza !== "0-1";
  const creatinaG: Range = { min: 3, max: 5 };
  const omega3G: Range = { min: 1, max: 2 };

  const note: string[] = [];
  if (!creatinaConsigliata) {
    note.push(
      "Con meno di 2 allenamenti a settimana la creatina non è prioritaria: valuta comunque un dosaggio di mantenimento (3g/die) se vuoi comunque i benefici cognitivi."
    );
  }
  if (alimentazione === "vegana") {
    note.push(
      "Alimentazione vegana: privilegia proteine da fonti vegetali (pisello, riso, soia) e un omega-3 da olio algale, l'unica fonte vegana di EPA/DHA."
    );
  }
  note.push(
    "Copri il fabbisogno proteico prioritariamente con il cibo: usa l'integratore per colmare la quota che non riesci a raggiungere con la dieta."
  );

  return { proteinaG, creatinaConsigliata, creatinaG, omega3G, note };
}

// Categorizza un prodotto in base a nome e % proteica (euristica, in attesa di un campo categoria dedicato)
export function categorizeProduct(product: Product): CategoriaIntegratore {
  const name = product.name.toLowerCase();
  if (/creatin/.test(name)) return "creatina";
  if (/omega/.test(name)) return "omega3";
  if ((product.protein_percentage ?? 0) > 40) return "proteine";
  return "altro";
}
