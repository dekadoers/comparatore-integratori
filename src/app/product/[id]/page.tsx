import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Product, PriceHistory } from "@/types/database";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import {
  ArrowLeft,
  ExternalLink,
  Leaf,
  Scale,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Package,
  Flame,
  Award,
  Zap,
  Info,
  TrendingDown
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Helper per calcolare il costo per 100g
function getWeightGrams(product: Product): number {
  if (product.values_json?.weight_g && Number(product.values_json.weight_g) > 0) {
    return Number(product.values_json.weight_g);
  }
  const formatStr = String(product.values_json?.format || "");
  const matchKg = formatStr.match(/(\d+(?:\.\d+)?)\s*kg/i);
  if (matchKg) return parseFloat(matchKg[1]) * 1000;
  const matchG = formatStr.match(/(\d+)\s*g/i);
  if (matchG) return parseInt(matchG[1], 10);
  return 1000;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;

  // 1. Fetch del prodotto da Supabase
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mx-auto mb-4">
            <Info className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Prodotto non trovato</h2>
          <p className="mt-2 text-sm text-slate-600">
            L'integratore cercato non è presente nel database o l'ID non è valido.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Torna al Comparatore</span>
          </Link>
        </div>
      </div>
    );
  }

  // 2. Fetch della cronologia prezzi per il grafico
  const { data: priceHistory } = await supabase
    .from("price_history")
    .select("*")
    .eq("product_id", id)
    .order("created_at", { ascending: true });

  // Calcoli economici e nutrizionali
  const weightG = getWeightGrams(product);
  const costPer100g = weightG > 0 ? (Number(product.price) / weightG) * 100 : 0;
  const proteinPct = product.protein_percentage || 0;
  const costPer100gProtein = proteinPct > 0 ? (costPer100g / proteinPct) * 100 : null;

  const valuesJson = product.values_json || {};
  const availableFormats: Array<{ format: string; price: number }> =
    Array.isArray(valuesJson.available_formats) ? valuesJson.available_formats : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header di navigazione */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Torna al Comparatore</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">ID Prodotto:</span>
            <span className="text-2xs font-mono bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
              {product.id.slice(0, 8)}...
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-emerald-600">Home</Link>
          <span>/</span>
          <span className="font-semibold text-slate-700">{product.brand}</span>
          <span>/</span>
          <span className="text-slate-400 truncate max-w-xs">{product.name}</span>
        </div>

        {/* Hero Card Prodotto */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid lg:grid-cols-12">
          {/* Immagine */}
          <div className="relative bg-slate-100 lg:col-span-5 flex items-center justify-center p-8 border-b lg:border-b-0 lg:border-r border-slate-200">
            <img
              src={
                product.image_url ||
                "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=600&auto=format&fit=crop&q=60"
              }
              alt={product.name}
              className="max-h-80 w-auto object-contain rounded-2xl drop-shadow-md"
            />
            {/* Badges in sovrimpressione */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <span className="rounded-lg bg-slate-900/90 backdrop-blur-xs px-3 py-1 text-xs font-bold text-white shadow-xs">
                {product.brand}
              </span>
              {product.vegan ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
                  <Leaf className="h-3.5 w-3.5" /> 100% Vegano
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
                  <Flame className="h-3.5 w-3.5" /> Whey / Derivati Latte
                </span>
              )}
            </div>
          </div>

          {/* Dettagli e Prezzo */}
          <div className="p-6 sm:p-8 lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  Scheda Ufficiale
                </span>
                <span className="text-xs text-slate-500">
                  Formato: <strong className="text-slate-800">{valuesJson.format || `${weightG}g`}</strong>
                </span>
              </div>

              <h1 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {product.name}
              </h1>

              {/* Note di Qualità / Certificazioni */}
              {valuesJson.notes && (
                <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-slate-50 p-3.5 border border-slate-200/70 text-xs text-slate-700">
                  <Award className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Qualità e Materie Prime: </strong>
                    <span>{valuesJson.notes}</span>
                  </div>
                </div>
              )}

              {/* Box Metriche Economiche & Calcolate */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Prezzo Attuale */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
                    Prezzo Effettivo
                  </div>
                  <div className="mt-1 text-2xl font-black text-slate-900">
                    €{Number(product.price).toFixed(2)}
                  </div>
                  <div className="text-2xs text-slate-500 mt-0.5">
                    Per {valuesJson.format || `${weightG}g`}
                  </div>
                </div>

                {/* Costo per 100g Prodotto */}
                <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/50 p-4 shadow-xs">
                  <div className="text-2xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" /> Costo / 100g
                  </div>
                  <div className="mt-1 text-2xl font-black text-emerald-700">
                    €{costPer100g.toFixed(2)}
                  </div>
                  <div className="text-2xs text-emerald-800/80 mt-0.5">
                    €{(costPer100g * 10).toFixed(2)} / kg
                  </div>
                </div>

                {/* Costo per 100g Proteina Pura */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
                    € / 100g Proteina Pura
                  </div>
                  <div className="mt-1 text-2xl font-black text-slate-900">
                    {costPer100gProtein !== null ? `€${costPer100gProtein.toFixed(2)}` : "—"}
                  </div>
                  <div className="text-2xs text-slate-500 mt-0.5">
                    Base: {product.protein_percentage || 0}% proteine
                  </div>
                </div>
              </div>
            </div>

            {/* Pulsante Store Ufficiale */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 text-center sm:text-left">
                Dati aggiornati e monitorati tramite il web scraper intelligente.
              </div>

              {product.link ? (
                <a
                  href={product.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 hover:shadow-lg transition"
                >
                  <span>Acquista allo Store Ufficiale ({product.brand})</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <span className="text-xs text-slate-400">Link store non disponibile</span>
              )}
            </div>
          </div>
        </div>

        {/* GRAFICO STORICO PREZZI NEL TEMPO */}
        <section>
          <PriceHistoryChart
            history={priceHistory || []}
            currentPrice={Number(product.price)}
            currentFormat={valuesJson.format || `${weightG}g`}
          />
        </section>

        {/* Griglia Informazioni Dettagliate & Formati Disponibili */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Tabella Valori Nutrizionali */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold">
                <Scale className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Scheda Valori Nutrizionali</h2>
                <p className="text-xs text-slate-500">Dettaglio composizione e dosaggi per porzione</p>
              </div>
            </div>

            <div className="mt-6 divide-y divide-slate-100 text-sm">
              <div className="flex items-center justify-between py-3">
                <span className="text-slate-600 font-medium">Percentuale Proteica Totale</span>
                <span className="font-extrabold text-slate-900 text-base">
                  {product.protein_percentage ? `${product.protein_percentage}%` : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-slate-600 font-medium">Porzione Singola Consigliata</span>
                <span className="font-bold text-slate-800">
                  {valuesJson.serving_size_g ? `${valuesJson.serving_size_g} g` : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-slate-600 font-medium">Proteine per Porzione</span>
                <span className="font-bold text-emerald-700">
                  {valuesJson.protein_per_serving_g ? `${valuesJson.protein_per_serving_g} g` : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-slate-600 font-medium">Calorie (Kcal) per Porzione</span>
                <span className="font-bold text-slate-800">
                  {valuesJson.calories ? `${valuesJson.calories} kcal` : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-slate-600 font-medium">BCAA / Aminoacidi Ramificati</span>
                <span className="font-bold text-slate-800">
                  {valuesJson.bcaa_g ? `${valuesJson.bcaa_g} g` : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-slate-600 font-medium">Zuccheri per Porzione</span>
                <span className="font-bold text-slate-800">
                  {valuesJson.sugar_g !== undefined && valuesJson.sugar_g !== null
                    ? `${valuesJson.sugar_g} g`
                    : "—"}
                </span>
              </div>

              {valuesJson.active_substances && (
                <div className="flex items-center justify-between py-3">
                  <span className="text-slate-600 font-medium">Principi Attivi Chiave</span>
                  <span className="font-bold text-slate-800 text-right max-w-xs">
                    {String(valuesJson.active_substances)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Formati e Tagli Disponibili (available_formats) */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Formati & Tagli Prezzo</h2>
                  <p className="text-xs text-slate-500">Varianti disponibili sullo store</p>
                </div>
              </div>

              {availableFormats.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {availableFormats.map((fmt, idx) => {
                    const isCurrent = fmt.format === valuesJson.format;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between rounded-2xl p-4 border transition ${
                          isCurrent
                            ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20"
                            : "border-slate-200 bg-slate-50/60 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                              isCurrent
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {fmt.format}
                            </div>
                            {isCurrent && (
                              <span className="text-2xs font-semibold text-emerald-700">
                                ✓ Formato Selezionato (Miglior Convenienza)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-black text-slate-900">
                            €{Number(fmt.price).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-center border border-slate-100">
                  <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    Formato Unico: {valuesJson.format || `${weightG}g`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Prezzo di listino verificato: €{Number(product.price).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {/* Box Garanzia Comparatore */}
            <div className="mt-8 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 p-4">
              <div className="flex items-start gap-2 text-xs text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Prezzo verificato: </strong>I calcoli sul costo al grammo tengono conto della materia prima pura senza zuccheri o riempitivi.
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
