"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Product } from "@/types/database";
import { getProductWeightGrams, calculateCostPer100g, calculateCostPer100gProtein } from "@/lib/pricing";
import NeedsCalculator from "@/components/NeedsCalculator";
import AuthWidget from "@/components/AuthWidget";
import {
  Search,
  Scale,
  Sparkles,
  Leaf,
  ArrowUpDown,
  ExternalLink,
  Check,
  X,
  Plus,
  RefreshCw,
  Flame,
  Award,
  Zap,
  Info,
  SlidersHorizontal,
  ChevronDown
} from "lucide-react";

// Dati di fallback nel caso in cui la rete o le chiavi Supabase debbano ancora sincronizzarsi
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: "1",
    brand: "Optimum Nutrition",
    name: "Gold Standard 100% Whey",
    price: 34.99,
    protein_percentage: 78.0,
    vegan: false,
    link: "https://www.optimumnutrition.com",
    image_url: "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=500&auto=format&fit=crop&q=60",
    values_json: {
      serving_size_g: 30,
      protein_per_serving_g: 24,
      bcaa_g: 5.5,
      sugar_g: 1.2,
      calories: 116,
      format: "Polvere 900g",
      weight_g: 900
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "2",
    brand: "MyProtein",
    name: "Impact Whey Isolate",
    price: 29.5,
    protein_percentage: 90.0,
    vegan: false,
    link: "https://www.myprotein.it",
    image_url: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=500&auto=format&fit=crop&q=60",
    values_json: {
      serving_size_g: 25,
      protein_per_serving_g: 22.5,
      bcaa_g: 4.5,
      sugar_g: 0.6,
      calories: 93,
      format: "Polvere 1000g",
      weight_g: 1000
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "3",
    brand: "Yamamoto Nutrition",
    name: "Hydro RAZAN Isolated Whey",
    price: 49.9,
    protein_percentage: 86.0,
    vegan: false,
    link: "https://www.yamamotonutrition.com",
    image_url: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60",
    values_json: {
      serving_size_g: 30,
      protein_per_serving_g: 26,
      sugar_g: 0.2,
      calories: 108,
      enzymes: "Optipep & Lactase",
      format: "Polvere 700g",
      weight_g: 700
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "4",
    brand: "Alpha Foods",
    name: "Vegan Protein Polvere Vaniglia",
    price: 28.9,
    protein_percentage: 76.0,
    vegan: true,
    link: "https://alphafoods.info",
    image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60",
    values_json: {
      serving_size_g: 30,
      protein_per_serving_g: 22.8,
      sources: ["Pisello", "Riso", "Zucca", "Semi di girasole"],
      sugar_g: 0.5,
      calories: 112,
      format: "Polvere 600g",
      weight_g: 600
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "5",
    brand: "Creapure",
    name: "Creatina Monoidrato 100% Pura",
    price: 22.0,
    protein_percentage: 0.0,
    vegan: true,
    link: "https://www.creapure.com",
    image_url: "https://images.unsplash.com/photo-1594882645126-14020914d58d?w=500&auto=format&fit=crop&q=60",
    values_json: {
      serving_size_g: 3.4,
      creatine_per_serving_g: 3.0,
      mesh: 200,
      purity: "99.99%",
      format: "Polvere 500g",
      weight_g: 500
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export default function SupplementComparator() {
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterVeganOnly, setFilterVeganOnly] = useState<boolean>(false);
  const [filterNonVeganOnly, setFilterNonVeganOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "protein-desc" | "cost100g-asc" | "cost-protein-asc">("cost100g-asc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Fetch da Supabase
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Supabase fetch error, using sample data:", error.message);
        } else if (data && data.length > 0) {
          setProducts(data);
        }
      } catch (err) {
        console.error("Fetch exception:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Filtraggio e Ordinamento
  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter((product) => {
        // Ricerca testuale su nome e brand
        const matchesSearch =
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.brand.toLowerCase().includes(searchQuery.toLowerCase());

        // Filtro Vegano
        if (filterVeganOnly && !product.vegan) return false;
        if (filterNonVeganOnly && product.vegan) return false;

        return matchesSearch;
      })
      .sort((a, b) => {
        const costA = calculateCostPer100g(a);
        const costB = calculateCostPer100g(b);
        const costProtA = calculateCostPer100gProtein(a) ?? Infinity;
        const costProtB = calculateCostPer100gProtein(b) ?? Infinity;

        switch (sortBy) {
          case "price-asc":
            return a.price - b.price;
          case "price-desc":
            return b.price - a.price;
          case "protein-desc":
            return (b.protein_percentage || 0) - (a.protein_percentage || 0);
          case "cost100g-asc":
            return costA - costB;
          case "cost-protein-asc":
            return costProtA - costProtB;
          default:
            return 0;
        }
      });
  }, [products, searchQuery, filterVeganOnly, filterNonVeganOnly, sortBy]);

  // Prodotti selezionati per il confronto diretto
  const comparedProducts = useMemo(() => {
    return products.filter((p) => selectedIds.includes(p.id));
  }, [products, selectedIds]);

  const toggleSelectProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xl shadow-sm">
              ⚡
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900">
                Nutri<span className="text-emerald-600">Compare</span>
              </span>
              <span className="ml-2 hidden text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full sm:inline-block">
                Comparatore Ufficiale
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                onClick={() => {
                  const compElement = document.getElementById("comparison-table-section");
                  compElement?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                <Scale className="h-4 w-4" />
                <span>Confronta ({selectedIds.length})</span>
              </button>
            )}
            <a
              href="#calcolatore"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition"
            >
              Calcola il tuo fabbisogno
            </a>
            <AuthWidget />
          </div>
        </div>
      </header>

      {/* Hero & Search Area */}
      <div className="bg-gradient-to-b from-emerald-900 via-slate-900 to-slate-900 text-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 text-xs font-medium text-emerald-300 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>Algoritmo di calcolo automatico Costo / 100g e purezza proteica</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            Confronta Integratori & Prezzi
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            Trova il miglior rapporto qualità/prezzo tra integratori onnivori e vegani. Calcola in tempo reale la convenienza effettiva per porzione e per 100g.
          </p>

          {/* Search Bar */}
          <div className="mt-8 mx-auto max-w-2xl">
            <div className="relative flex items-center rounded-2xl bg-white p-2 shadow-2xl">
              <Search className="ml-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca per prodotto o marca (es. Whey, Isolate, Creapure, Yamamoto)..."
                className="w-full border-0 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mr-2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <NeedsCalculator products={products} />

      {/* Main Dashboard Section */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        {/* Controls Bar: Filters & Sorters */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setFilterVeganOnly(false);
                setFilterNonVeganOnly(false);
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                !filterVeganOnly && !filterNonVeganOnly
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Tutti ({products.length})
            </button>

            <button
              onClick={() => {
                setFilterVeganOnly(!filterVeganOnly);
                setFilterNonVeganOnly(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                filterVeganOnly
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <Leaf className="h-3.5 w-3.5" />
              <span>Solo Vegani</span>
            </button>

            <button
              onClick={() => {
                setFilterNonVeganOnly(!filterNonVeganOnly);
                setFilterVeganOnly(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                filterNonVeganOnly
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              <span>Whey & Latte</span>
            </button>
          </div>

          {/* Sorting and View Mode */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <ArrowUpDown className="h-4 w-4 text-slate-400" />
              <span>Ordina:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:outline-none"
              >
                <option value="cost100g-asc">Miglior € / 100g Prodotto</option>
                <option value="cost-protein-asc">Miglior € / 100g Proteina</option>
                <option value="protein-desc">% Proteica più alta</option>
                <option value="price-asc">Prezzo: dal più basso</option>
                <option value="price-desc">Prezzo: dal più alto</option>
              </select>
            </div>

            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  viewMode === "grid"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Griglia
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  viewMode === "table"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tabella
              </button>
            </div>
          </div>
        </div>

        {/* Results Counter */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            Visualizzati <strong className="text-slate-800">{filteredAndSortedProducts.length}</strong> prodotti
          </span>
          {selectedIds.length > 0 && (
            <button
              onClick={clearSelection}
              className="text-rose-600 hover:underline font-medium"
            >
              Deseleziona tutti ({selectedIds.length})
            </button>
          )}
        </div>

        {/* ======================================================== */}
        {/* VIEW 1: PRODUCTS GRID                                    */}
        {/* ======================================================== */}
        {viewMode === "grid" && (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedProducts.map((product) => {
              const weightG = getProductWeightGrams(product);
              const cost100g = calculateCostPer100g(product);
              const cost100gProtein = calculateCostPer100gProtein(product);
              const isSelected = selectedIds.includes(product.id);

              return (
                <div
                  key={product.id}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-xs transition-all hover:shadow-md ${
                    isSelected
                      ? "border-emerald-500 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Top Product Header & Image */}
                  <div>
                    <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
                      <Link href={`/product/${product.id}`} className="block h-full w-full">
                        <img
                          src={
                            product.image_url ||
                            "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=500&auto=format&fit=crop&q=60"
                          }
                          alt={product.name}
                          className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                        />
                      </Link>

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                        <span className="rounded-md bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 text-2xs font-semibold text-white">
                          {product.brand}
                        </span>
                        {product.vegan ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/90 backdrop-blur-xs px-2 py-0.5 text-2xs font-semibold text-white">
                            <Leaf className="h-3 w-3" /> Vegano
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-600/90 backdrop-blur-xs px-2 py-0.5 text-2xs font-semibold text-white">
                            Whey / Latte
                          </span>
                        )}
                      </div>

                      {/* Compare Checkbox Icon Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectProduct(product.id);
                        }}
                        className={`absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-xl transition z-10 ${
                          isSelected
                            ? "bg-emerald-600 text-white shadow-md"
                            : "bg-white/90 text-slate-700 hover:bg-white backdrop-blur-xs shadow-xs"
                        }`}
                        title={isSelected ? "Rimuovi dal confronto" : "Aggiungi al confronto"}
                      >
                        {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <Link href={`/product/${product.id}`}>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition">
                          {product.name}
                        </h3>
                      </Link>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <span>Formato: {product.values_json?.format || `${weightG}g`}</span>
                      </div>

                      {/* Nutritional Highlights */}
                      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
                        <div>
                          <div className="text-2xs uppercase tracking-wider text-slate-500 font-medium">
                            % Proteica
                          </div>
                          <div className="text-base font-extrabold text-slate-900">
                            {product.protein_percentage ? `${product.protein_percentage}%` : "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-2xs uppercase tracking-wider text-slate-500 font-medium">
                            Costo / 100g
                          </div>
                          <div className="text-base font-extrabold text-emerald-600">
                            €{cost100g.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Metric: €/100g di proteina pura */}
                      {cost100gProtein !== null && (
                        <div className="mt-2.5 flex items-center justify-between text-2xs text-slate-500 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 border border-emerald-100/60">
                          <span>€ per 100g proteina pura:</span>
                          <span className="font-bold text-emerald-700">€{cost100gProtein.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer with Price and Actions */}
                  <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <div className="text-2xs uppercase tracking-wider text-slate-400 font-medium">Prezzo</div>
                      <div className="text-xl font-black text-slate-900">
                        €{Number(product.price).toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/product/${product.id}`}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition shadow-2xs"
                      >
                        Scheda
                      </Link>

                      {product.link && (
                        <a
                          href={product.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition shadow-xs"
                        >
                          <span>Store</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: FULL COMPARATIVE TABLE                           */}
        {/* ======================================================== */}
        {viewMode === "table" && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-2xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-4 py-3.5">Confronto</th>
                    <th scope="col" className="px-4 py-3.5">Prodotto / Brand</th>
                    <th scope="col" className="px-4 py-3.5">Tipo</th>
                    <th scope="col" className="px-4 py-3.5">Formato</th>
                    <th scope="col" className="px-4 py-3.5">% Proteine</th>
                    <th scope="col" className="px-4 py-3.5 text-right font-bold text-emerald-700">Costo / 100g</th>
                    <th scope="col" className="px-4 py-3.5 text-right">Costo / 100g Prot.</th>
                    <th scope="col" className="px-4 py-3.5 text-right">Prezzo</th>
                    <th scope="col" className="px-4 py-3.5 text-center">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedProducts.map((product) => {
                    const weightG = getProductWeightGrams(product);
                    const cost100g = calculateCostPer100g(product);
                    const cost100gProtein = calculateCostPer100gProtein(product);
                    const isSelected = selectedIds.includes(product.id);

                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-slate-50/80 transition ${
                          isSelected ? "bg-emerald-50/40" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectProduct(product.id)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/product/${product.id}`} className="hover:text-emerald-600 transition">
                            <div className="font-bold text-slate-900">{product.name}</div>
                          </Link>
                          <div className="text-xs text-slate-400 font-medium">{product.brand}</div>
                        </td>
                        <td className="px-4 py-3">
                          {product.vegan ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-2xs font-semibold text-emerald-700 border border-emerald-200">
                              <Leaf className="h-3 w-3" /> Vegano
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-2xs font-semibold text-blue-700 border border-blue-200">
                              Whey
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">
                          {product.values_json?.format || `${weightG}g`}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {product.protein_percentage ? `${product.protein_percentage}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 text-base">
                          €{cost100g.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {cost100gProtein ? `€${cost100gProtein.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          €{Number(product.price).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              href={`/product/${product.id}`}
                              className="rounded-lg p-1.5 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
                              title="Vedi Scheda Completa"
                            >
                              <Info className="h-4 w-4" />
                            </Link>
                            {product.link && (
                              <a
                                href={product.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition"
                                title="Vai allo Store"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* DEDICATED SIDE-BY-SIDE COMPARISON SECTION                */}
        {/* ======================================================== */}
        {comparedProducts.length > 0 && (
          <section id="comparison-table-section" className="mt-14 scroll-mt-20">
            <div className="rounded-3xl border-2 border-emerald-500/30 bg-white p-6 shadow-xl lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full mb-2">
                    <Scale className="h-3.5 w-3.5" />
                    <span>Confronto Affiancato Diretto</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Tabella Comparativa ({comparedProducts.length} integratori)
                  </h2>
                </div>
                <button
                  onClick={clearSelection}
                  className="self-start sm:self-auto rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Azzera Confronto
                </button>
              </div>

              {/* Side-by-side Matrix */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <tbody>
                    {/* Header: Images & Names */}
                    <tr className="border-b border-slate-200">
                      <td className="w-44 py-4 pr-4 font-bold text-slate-400 uppercase text-xs">
                        Prodotto
                      </td>
                      {comparedProducts.map((p) => (
                        <td key={p.id} className="min-w-[200px] p-4 align-top">
                          <div className="flex flex-col items-start gap-2">
                            <img
                              src={p.image_url || ""}
                              alt={p.name}
                              className="h-20 w-20 rounded-xl object-cover border border-slate-200 shadow-2xs"
                            />
                            <span className="text-2xs font-bold uppercase text-slate-500">{p.brand}</span>
                            <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Prezzo Totale */}
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <td className="py-3 pr-4 font-semibold text-slate-600 text-xs">Prezzo Totale</td>
                      {comparedProducts.map((p) => (
                        <td key={p.id} className="p-3 font-extrabold text-slate-900 text-base">
                          €{Number(p.price).toFixed(2)}
                        </td>
                      ))}
                    </tr>

                    {/* Formato */}
                    <tr className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-semibold text-slate-600 text-xs">Formato & Peso</td>
                      {comparedProducts.map((p) => (
                        <td key={p.id} className="p-3 font-medium text-slate-700">
                          {p.values_json?.format || `${getProductWeightGrams(p)}g`}
                        </td>
                      ))}
                    </tr>

                    {/* COSTO PER 100G (Highlight) */}
                    <tr className="border-b border-emerald-200 bg-emerald-50/60">
                      <td className="py-4 pr-4 font-black text-emerald-900 text-xs uppercase">
                        ⚡ Costo per 100g
                      </td>
                      {comparedProducts.map((p) => {
                        const cost = calculateCostPer100g(p);
                        return (
                          <td key={p.id} className="p-4">
                            <div className="text-xl font-black text-emerald-700">
                              €{cost.toFixed(2)}
                            </div>
                            <div className="text-2xs text-emerald-800/80 font-medium">per 100g di prodotto</div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* % Proteica */}
                    <tr className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-semibold text-slate-600 text-xs">% Proteica</td>
                      {comparedProducts.map((p) => (
                        <td key={p.id} className="p-3 font-bold text-slate-800">
                          {p.protein_percentage ? `${p.protein_percentage}%` : "—"}
                        </td>
                      ))}
                    </tr>

                    {/* Costo per 100g di Proteine Pure */}
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <td className="py-3 pr-4 font-semibold text-slate-600 text-xs">
                        Costo / 100g Proteine Pure
                      </td>
                      {comparedProducts.map((p) => {
                        const costProt = calculateCostPer100gProtein(p);
                        return (
                          <td key={p.id} className="p-3 font-semibold text-slate-800">
                            {costProt ? `€${costProt.toFixed(2)}` : "—"}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Vegano */}
                    <tr className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-semibold text-slate-600 text-xs">Tipologia</td>
                      {comparedProducts.map((p) => (
                        <td key={p.id} className="p-3">
                          {p.vegan ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                              <Leaf className="h-3.5 w-3.5" /> Vegano 100%
                            </span>
                          ) : (
                            <span className="text-slate-700 font-medium text-xs">Whey / Proteine del Latte</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Valori per porzione (serving) */}
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <td className="py-3 pr-4 font-semibold text-slate-600 text-xs">Porzione Consigliata</td>
                      {comparedProducts.map((p) => (
                        <td key={p.id} className="p-3 text-slate-700 text-xs">
                          {p.values_json?.serving_size_g ? `${p.values_json.serving_size_g}g` : "—"}
                        </td>
                      ))}
                    </tr>

                    {/* Calorie per porzione */}
                    <tr className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-semibold text-slate-600 text-xs">Calorie / Porzione</td>
                      {comparedProducts.map((p) => (
                        <td key={p.id} className="p-3 text-slate-700 text-xs font-medium">
                          {p.values_json?.calories ? `${p.values_json.calories} kcal` : "—"}
                        </td>
                      ))}
                    </tr>

                    {/* Store Link */}
                    <tr>
                      <td className="py-4 pr-4 font-semibold text-slate-600 text-xs">Acquista</td>
                      {comparedProducts.map((p) => (
                        <td key={p.id} className="p-4">
                          {p.link ? (
                            <a
                              href={p.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs"
                            >
                              <span>Vedi Offerta</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">Non disponibile</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ======================================================== */}
      {/* FLOATING COMPARISON DOCK (WHEN PRODUCTS ARE SELECTED)    */}
      {/* ======================================================== */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-2xl">
          <div className="flex items-center justify-between rounded-2xl bg-slate-900/95 text-white p-3 sm:px-5 backdrop-blur-md shadow-2xl border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs">
                {selectedIds.length}
              </div>
              <div className="text-xs sm:text-sm">
                <span className="font-bold">Prodotti selezionati per il confronto</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={clearSelection}
                className="rounded-xl px-3 py-1.5 text-xs text-slate-400 hover:text-white transition"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  const compElement = document.getElementById("comparison-table-section");
                  compElement?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition shadow-md"
              >
                <Scale className="h-3.5 w-3.5" />
                <span>Visualizza Tabella</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PRODUCT DETAIL & NUTRITIONAL INFO                 */}
      {/* ======================================================== */}
      {selectedProductForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">
                  {selectedProductForModal.brand}
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {selectedProductForModal.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProductForModal(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <div className="text-2xs text-slate-400 font-medium uppercase">Prezzo</div>
                  <div className="text-xl font-black text-slate-900">
                    €{Number(selectedProductForModal.price).toFixed(2)}
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-100">
                  <div className="text-2xs text-emerald-800 font-medium uppercase">Costo per 100g</div>
                  <div className="text-xl font-black text-emerald-700">
                    €{calculateCostPer100g(selectedProductForModal).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* JSON Values breakdown */}
              {selectedProductForModal.values_json && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    Dettagli Nutrizionali
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                    {Object.entries(selectedProductForModal.values_json).map(([key, val]) => (
                      <div key={key} className="flex justify-between border-b border-slate-200/50 py-1">
                        <span className="text-slate-500 capitalize">{key.replace(/_/g, " ")}:</span>
                        <span className="font-semibold text-slate-800">
                          {Array.isArray(val) ? val.join(", ") : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setSelectedProductForModal(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
              >
                Chiudi
              </button>
              {selectedProductForModal.link && (
                <a
                  href={selectedProductForModal.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                >
                  <span>Visita Store Ufficiale</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
