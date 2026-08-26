const fs = require('fs');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function scrapeProduct(url) {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  const content = await page.evaluate(() => document.body.innerText);
  await browser.close();

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Analizza il testo estraendo i dati in JSON puro (senza markdown):
  {"name": "Nome", "brand": "Marca", "price": 0.0, "weight_g": 1000, "protein_percentage": 0, "image_url": "URL"}
  Testo: ${content.substring(0, 4000)}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json|```/g, '').trim();
  return JSON.parse(text);
}

async function run() {
  const urls = fs.readFileSync(process.argv[2] || 'scripts/urls.txt', 'utf-8').split('\n').filter(Boolean);
  for (const url of urls) {
    try {
      const data = await scrapeProduct(url);
      const costPer100g = data.weight_g ? ((data.price / data.weight_g) * 100).toFixed(2) : null;
      await supabase.from('products').upsert({
        name: data.name,
        brand: data.brand,
        price: data.price,
        weight_g: data.weight_g,
        protein_percentage: data.protein_percentage,
        cost_per_100g: costPer100g,
        image_url: data.image_url,
        url: url
      }, { onConflict: 'url' });
    } catch (e) { console.error("Errore URL:", url, e.message); }
  }
}
run();
