"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Product } from "@/types/database";
import {
  calculateNeeds,
  categorizeProduct,
  type Alimentazione,
  type CategoriaIntegratore,
  type FrequenzaAllenamento,
  type Obiettivo,
} from "@/lib/calculator";
import { calculateCostPer100g, calculateCostPer100gProtein } from "@/lib/pricing";
import { Calculator, Dumbbell, Leaf, Info, ExternalLink } from "lucide-react";

interface NeedsCalculatorProps {
  products: Product[];
}

const CATEGORY_LABELS: Record<Exclude<CategoriaIntegratore, "altro">, string> = {
  proteine: "Proteine",
  creatina: "Creatina",
  omega3: "Omega-3",
};

function getTopProducts(
  products: Product[],
  category: Exclude<CategoriaIntegratore, "altro">,
  alimentazione: Alimentazione,
  count: number
): Product[] {
  return products
    .filter((p) => categorizeProduct(p) === category)
    .filter((p) => (alimentazione === "vegana" ? p.vegan : true))
    .sort((a, b) => {
      const costA = calculateCostPer100gProtein(a) ?? calculateCostPer100g(a);
      const costB = calculateCostPer100gProtein(b) ?? calculateCostPer100g(b);
      return costA - costB;
    })
    .slice(0, count);
}

export default function NeedsCalculator({ products }: NeedsCalculatorProps) {
  const [pesoKg, setPesoKg] = useState<number>(75);
  const [obiettivo, setObiettivo] = useState<Obiettivo>("mantenimento");
  const [alimentazione, setAlimentazione] = useState<Alimentazione>("onnivora");
  const [frequenza, setFrequenza] = useState<FrequenzaAllenamento>("2-3");

  const result = useMemo(
    () => calculateNeeds({ pesoKg, obiettivo, alimentazione, frequenza }),
    [pesoKg, obiettivo, alimentazione, frequenza]
  );

  const relatedProducts = useMemo(() => {
    const categories: Array<Exclude<CategoriaIntegratore, "altro">> = ["proteine", "creatina", "omega3"];
    return categories.map((category) => ({
      category,
      products: getTopProducts(products, category, alimentazione, 3),
    }));
  }, [products, alimentazione]);

  return (
    <section id="calcolatore" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-10 scroll-mt-20">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Calcola il tuo fabbisogno</h2>
            <p className="text-xs text-slate-500">
              Una stima generica di dosaggio in base ai tuoi parametri
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Peso corporeo (kg)</span>
            <input
              type="number"
              min={30}
              max={200}
              value={pesoKg}
              onChange={(e) => setPesoKg(Math.max(0, Number(e.target.value)))}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Obiettivo</span>
            <select
              value={obiettivo}
              onChange={(e) => setObiettivo(e.target.value as Obiettivo)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="dimagrimento">Dimagrimento</option>
              <option value="mantenimento">Mantenimento</option>
              <option value="massa">Aumento massa</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Alimentazione</span>
            <select
              value={alimentazione}
              onChange={(e) => setAlimentazione(e.target.value as Alimentazione)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="onnivora">Onnivora</option>
              <option value="vegana">Vegana</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Allenamenti / settimana</span>
            <select
              value={frequenza}
              onChange={(e) => setFrequenza(e.target.value as FrequenzaAllenamento)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="0-1">0-1 volte</option>
              <option value="2-3">2-3 volte</option>
              <option value="4-5">4-5 volte</option>
              <option value="6+">6+ volte</option>
            </select>
          </label>
        </div>

        {/* Risultati */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/50 p-4">
            <div className="text-2xs font-bold uppercase tracking-wider text-emerald-800">Proteine / giorno</div>
            <div className="mt-1 text-2xl font-black text-emerald-700">
              {result.proteinaG.min}-{result.proteinaG.max} g
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-2xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Dumbbell className="h-3 w-3" /> Creatina / giorno
            </div>
            <div className="mt-1 text-2xl font-black text-slate-900">
              {result.creatinaConsigliata ? `${result.creatinaG.min}-${result.creatinaG.max} g` : "Opzionale"}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-2xs font-bold uppercase tracking-wider text-slate-500">
              Omega-3 (EPA+DHA) / giorno
            </div>
            <div className="mt-1 text-2xl font-black text-slate-900">
              {result.omega3G.min}-{result.omega3G.max} g
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="mt-4 space-y-2">
          {result.note.map((n, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 border border-slate-100"
            >
              <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{n}</span>
            </div>
          ))}
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 border border-amber-200">
            <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Stima generica a scopo informativo: non sostituisce il parere di un medico o nutrizionista, soprattutto in presenza di patologie.
            </span>
          </div>
        </div>

        {/* Prodotti correlati */}
        <div className="mt-8 space-y-6">
          {relatedProducts.map(({ category, products: catProducts }) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                {alimentazione === "vegana" && <Leaf className="h-3.5 w-3.5 text-emerald-600" />}
                <h3 className="text-sm font-bold text-slate-800">{CATEGORY_LABELS[category]} consigliate</h3>
              </div>

              {catProducts.length === 0 ? (
                <p className="text-xs text-slate-400">Nessun prodotto disponibile per questa categoria al momento.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {catProducts.map((product) => {
                    const cost100g = calculateCostPer100g(product);
                    return (
                      <Link
                        key={product.id}
                        href={`/product/${product.id}`}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 hover:border-emerald-300 hover:bg-emerald-50/30 transition"
                      >
                        <div className="min-w-0">
                          <div className="text-2xs font-semibold uppercase text-slate-400 truncate">
                            {product.brand}
                          </div>
                          <div className="text-xs font-bold text-slate-900 truncate">{product.name}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 pl-2">
                          <span className="text-sm font-black text-emerald-600">€{cost100g.toFixed(2)}</span>
                          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
