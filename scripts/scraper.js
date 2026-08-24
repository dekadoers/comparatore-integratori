const puppeteer = require("puppeteer");
const { GoogleGenAI } = require("@google/genai");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Carica le variabili d'ambiente da .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_URL = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "");
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ ERRORE: Variabili Supabase mancanti in .env.local!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Attesa casuale (polite delay) tra minMs e maxMs
 */
function randomSleep(minMs = 2000, maxMs = 4500) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
  console.log(`⏳ Attesa di sicurezza anti-ban (${(ms / 1000).toFixed(1)}s)...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 1. Estrae il testo, metadati e varianti di formato della pagina usando Puppeteer
 */
async function scrapeProductPage(browser, url) {
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    // Blocca immagini pesanti, font e media per velocizzare l'elaborazione
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "font", "media"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 35000 });

    // Attesa per rendering prezzi dinamici e selettori di formato
    await new Promise((r) => setTimeout(r, 2000));

    // Estrai dati JSON-LD Schema.org
    const jsonLdData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      return scripts.map((s) => s.textContent).filter(Boolean);
    });

    // Estrai testo, metadati, prezzi e opzioni di formato
    const pageData = await page.evaluate(() => {
      // Cattura prezzi espliciti da meta tag
      const metaPrice =
        document.querySelector('meta[property="product:price:amount"]')?.getAttribute("content") ||
        document.querySelector('meta[property="og:price:amount"]')?.getAttribute("content") ||
        "";

      // Cattura etichette di formati/varianti (es. bottoni 500g, 1kg, 2kg, dropdown)
      const variantElements = Array.from(
        document.querySelectorAll(
          "[class*='format'], [class*='variant'], [class*='size'], [class*='weight'], [class*='option'], [data-attribute*='format'], [class*='price']"
        )
      );
      const variantSnippets = variantElements
        .map((el) => el.innerText?.trim())
        .filter((t) => t && t.length > 0 && t.length < 150)
        .slice(0, 30)
        .join(" | ");

      // Rimuovi elementi non pertinenti
      const elementsToRemove = document.querySelectorAll(
        "script, style, noscript, nav, footer, iframe, svg, [id*='cookie'], [class*='cookie'], [id*='consent'], [class*='banner']"
      );
      elementsToRemove.forEach((el) => el.remove());

      const ogImage =
        document.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
        document.querySelector('meta[name="twitter:image"]')?.getAttribute("content") ||
        "";

      const title = document.title;
      const bodyText = document.body?.innerText?.replace(/\s+/g, " ").trim() || "";

      return {
        title,
        ogImage,
        metaPrice,
        variantSnippets,
        text: bodyText.slice(0, 25000), // Ampio range per catturare tutte le tabelle formati
      };
    });

    await page.close();

    return {
      url,
      title: pageData.title,
      ogImage: pageData.ogImage,
      metaPrice: pageData.metaPrice,
      variantSnippets: pageData.variantSnippets,
      text: pageData.text,
      jsonLd: jsonLdData.join("\n"),
    };
  } catch (error) {
    await page.close().catch(() => {});
    throw error;
  }
}

/**
 * 2. Invia i dati a Gemini con prompt ottimizzato per formati e prezzi dinamici
 */
async function parseWithGemini(scrapedData) {
  if (!GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY mancante, uso fallback.");
    return {
      brand: "Brand Rilevato",
      name: scrapedData.title.split("|")[0].split("-")[0].trim() || "Integratore",
      selected_format: "Polvere 1000g",
      price: 24.99,
      protein_percentage: 80.0,
      vegan: false,
      link: scrapedData.url,
      image_url: scrapedData.ogImage || "",
      values_json: {
        format: "Polvere 1000g",
        weight_g: 1000,
        serving_size_g: 30,
        protein_per_serving_g: 24,
        calories: 115,
        sugar_g: 1.0,
      },
    };
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const prompt = `Sei un esperto nutrizionista ed estrattore dati specializzato in e-commerce di integratori alimentari (HSN, Bulk, MyProtein, Yamamoto, ecc.).

ANALISI E REGOLE DI ESTRAZIONE RIGOROSE:

1. DISTINZIONE PREZZO LISTINO VS PREZZO EFFETTIVO:
   - Distingui categoricamente tra il prezzo di listino originale (PVP o prezzo barrato) e il **PREZZO EFFETTIVO SCONTATO / FINALE DA PAGARE**.
   - Il campo "price" DEVE contenere il prezzo finale scontato del formato selezionato (solo numero decimale es. 29.90).

2. SELEZIONE DEL FORMATO CON MIGLIOR RAPPORTO QUANTITÀ/PREZZO:
   - Se sulla pagina sono presenti più formati/pesi (ad esempio: 500g, 1kg, 2kg, 4kg oppure confezioni da 90 vs 180 capsule):
     * Seleziona il formato standard più conveniente con il miglior rapporto qualità/prezzo (solitamente il taglio da **1kg** o **2kg**).
   - Inserisci nel campo "selected_format" la descrizione chiara del formato scelto (es. "Polvere 2kg", "Polvere 1kg", "Polvere 500g").
   - Il campo "price" DEVE essere il prezzo ESATTO di QUEL formato scelto ("selected_format").
   - Imposta "values_json.weight_g" sul peso esatto in grammi di quel formato (es. 2000 per 2kg, 1000 per 1kg, 500 per 500g).
   - Inserisci in "values_json.available_formats" la lista di tutte le varianti di formato individuate con i loro prezzi.

3. VALORI NUTRIZIONALI & PERCENTUALE PROTEICA:
   - "protein_percentage": % esatta di proteine su 100g di prodotto (numero tra 0 e 100). Se creatina pura, omega-3 o vitamine senza proteine imposta 0.
   - "vegan": true se 100% vegetale/vegano, false se derivato da siero di latte (whey), caseina, uova o gelatina animale.

SCHEMA JSON OBBLIGATORIO DA RESTITUIRE:
{
  "brand": "Nome del Brand (es. HSN, Bulk, MyProtein, Yamamoto)",
  "name": "Nome completo e pulito del prodotto (es. Evowhey Protein 2.0)",
  "selected_format": "es. Polvere 2kg", // oppure 1kg o il formato scelto
  "price": 31.90, // Prezzo finale effettivo in Euro corrispondente a selected_format (solo numero)
  "protein_percentage": 80.0, // % Proteine per 100g (numero)
  "vegan": false, // boolean
  "link": "${scrapedData.url}",
  "image_url": "${scrapedData.ogImage || ""}",
  "values_json": {
    "format": "Polvere 2kg", // deve coincidere con selected_format
    "weight_g": 2000, // peso in grammi del formato scelto (es. 2000 per 2kg, 1000 per 1kg)
    "serving_size_g": 30, // grammi per singola porzione
    "protein_per_serving_g": 24.0, // proteine per porzione
    "bcaa_g": 5.5, // BCAA se presenti (numero o null)
    "sugar_g": 1.2, // zuccheri se presenti (numero o null)
    "calories": 115, // kcal per porzione (numero o null)
    "available_formats": [
      { "format": "500g", "price": 9.13 },
      { "format": "2kg", "price": 31.90 }
    ],
    "notes": "certificazioni o note qualitative (es. Fonterra WPC, Creapure, DigeZyme)"
  }
}

DATI ESTRATTI DALLA PAGINA:
Titolo: ${scrapedData.title}
URL: ${scrapedData.url}
Meta Prezzo: ${scrapedData.metaPrice || "N/A"}
Varianti Rilevate: ${scrapedData.variantSnippets || "N/A"}
JSON-LD: ${scrapedData.jsonLd || "N/A"}

TESTO COMPLETO DELLA PAGINA:
${scrapedData.text}
`;

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
  } catch (mErr) {
    response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
  }

  const jsonText = response.text.trim();
  const parsed = JSON.parse(jsonText);

  const selectedFormat = parsed.selected_format || parsed.values_json?.format || "Standard";

  const valuesJson = {
    ...(parsed.values_json || {}),
    format: selectedFormat,
    weight_g: parsed.values_json?.weight_g || 1000,
  };

  return {
    brand: String(parsed.brand || "Brand Sconosciuto"),
    name: String(parsed.name || scrapedData.title),
    price: Number(parsed.price) || 19.99,
    protein_percentage: parsed.protein_percentage !== undefined ? Number(parsed.protein_percentage) : null,
    vegan: Boolean(parsed.vegan),
    link: scrapedData.url,
    image_url:
      parsed.image_url ||
      scrapedData.ogImage ||
      "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=500&auto=format&fit=crop&q=60",
    values_json: valuesJson,
  };
}

/**
 * 3. Inserisce/aggiorna il prodotto e registra il punto nello Storico Prezzi (price_history)
 */
async function saveToSupabase(productData) {
  try {
    let productRecord = null;

    // Verifica se il prodotto esiste già tramite link o coppia (brand, name)
    const { data: existingProducts } = await supabase
      .from("products")
      .select("id, price, values_json")
      .or(`link.eq."${productData.link}",and(brand.eq."${productData.brand}",name.eq."${productData.name}")`)
      .limit(1);

    if (existingProducts && existingProducts.length > 0) {
      const existing = existingProducts[0];
      console.log(`🔄 Prodotto già presente (ID: ${existing.id}). Aggiornamento prezzo e scheda...`);

      const { data: updated, error: updateErr } = await supabase
        .from("products")
        .update({
          price: productData.price,
          protein_percentage: productData.protein_percentage,
          vegan: productData.vegan,
          image_url: productData.image_url,
          values_json: productData.values_json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select();

      if (updateErr) {
        console.error("❌ Errore aggiornamento prodotto:", updateErr.message);
      }
      productRecord = updated ? updated[0] : existing;
    } else {
      // Inserimento nuovo prodotto
      const { data: inserted, error: insertErr } = await supabase
        .from("products")
        .insert([productData])
        .select();

      if (insertErr) {
        console.error("❌ Errore inserimento nuovo prodotto:", insertErr.message);
        return null;
      }
      productRecord = inserted[0];
    }

    if (!productRecord) return null;

    // Registra la voce nella tabella price_history
    const historyPayload = {
      product_id: productRecord.id,
      price: productData.price,
      format: productData.values_json?.format || "Standard",
      created_at: new Date().toISOString(),
    };

    const { error: histErr } = await supabase
      .from("price_history")
      .insert([historyPayload]);

    if (histErr) {
      console.warn("⚠️ Nota: Impossibile inserire in price_history (verifica di aver eseguito lo script SQL migration):", histErr.message);
    } else {
      console.log(`📈 Storico Prezzi registrato: €${productData.price} (${historyPayload.format})`);
    }

    return productRecord;
  } catch (error) {
    console.error("❌ Errore connessione Supabase:", error.message);
    return null;
  }
}

/**
 * Helper per caricare gli URL
 */
function loadUrls(arg) {
  const defaultFile = path.resolve(process.cwd(), "scripts/urls.txt");

  if (arg && (arg.startsWith("http://") || arg.startsWith("https://"))) {
    return [arg];
  }

  const filePath = arg ? path.resolve(process.cwd(), arg) : defaultFile;

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    return content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));
  }

  return [];
}

/**
 * Main Controller
 */
async function main() {
  const arg = process.argv[2];
  const urls = loadUrls(arg);

  console.log(`
========================================================================
🚀  COMPARATORE INTEGRATORI - SCRAPER AVANZATO FORMATI & PREZZI DINAMICI
========================================================================
🎯 Target da elaborare: ${urls.length}
========================================================================
`);

  if (urls.length === 0) {
    console.log("⚠️ Nessun URL trovato. Specifica un URL o inserisci i link in scripts/urls.txt.");
    return;
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--disable-crash-reporter",
      "--disable-breakpad",
    ],
  });

  const results = [];

  for (let i = 0; i < urls.length; i++) {
    const currentUrl = urls[i];
    console.log(`\n------------------------------------------------------------------------`);
    console.log(`📦 [${i + 1}/${urls.length}] Analisi: ${currentUrl}`);

    try {
      const scraped = await scrapeProductPage(browser, currentUrl);
      console.log(`✅ Pagina scaricata: "${scraped.title}" (${scraped.text.length} caratteri)`);

      console.log(`🤖 Estrazione intelligente (Prezzo effettivo & Miglior Formato) con Gemini AI...`);
      const structuredProduct = await parseWithGemini(scraped);

      console.log("\n📄 RISULTATO JSON STRUTTURATO:");
      console.log(JSON.stringify(structuredProduct, null, 2));

      const saved = await saveToSupabase(structuredProduct);
      if (saved) {
        console.log(`\n🎉 Salvato su Supabase con ID: ${saved.id}`);
        results.push({
          status: "SUCCESS",
          brand: structuredProduct.brand,
          name: structuredProduct.name,
          format: structuredProduct.values_json?.format,
          weight: `${structuredProduct.values_json?.weight_g}g`,
          price: `€${structuredProduct.price}`,
          protein: `${structuredProduct.protein_percentage || 0}%`,
          vegan: structuredProduct.vegan ? "Sì 🌱" : "No",
          id: saved.id,
        });
      } else {
        results.push({
          status: "DB_ERROR",
          url: currentUrl,
        });
      }
    } catch (err) {
      console.error(`❌ Errore elaborazione URL ${currentUrl}:`, err.message);
      results.push({
        status: "FAILED",
        url: currentUrl,
        error: err.message,
      });
    }

    if (i < urls.length - 1) {
      await randomSleep(2000, 4000);
    }
  }

  await browser.close();

  if (results.length > 1) {
    console.log(`
========================================================================
📊 RESOCONTO FINALE
========================================================================
`);
    const successful = results.filter((r) => r.status === "SUCCESS");
    console.log(`✅ Prodotti salvati: ${successful.length} su ${urls.length}`);
    if (successful.length > 0) {
      console.table(
        successful.map((s, idx) => ({
          "#": idx + 1,
          Brand: s.brand,
          Nome: s.name,
          Formato: s.format,
          Peso: s.weight,
          Prezzo: s.price,
          "% Prot": s.protein,
        }))
      );
    }
  }
}

main();
