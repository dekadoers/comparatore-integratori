-- ==============================================================================
-- SCHEMA COMPARATORE INTEGRATORI (SUPABASE POSTGRESQL)
-- ==============================================================================

-- 1. Abilitazione estensione pgcrypto per generazione UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELLA: products (Integratori e prodotti)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand TEXT NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    protein_percentage NUMERIC(5, 2),
    vegan BOOLEAN DEFAULT FALSE,
    link TEXT,
    image_url TEXT,
    values_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELLA: reviews (Recensioni utenti)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. INDICI DI PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_products_protein_percentage ON public.products(protein_percentage);
CREATE INDEX IF NOT EXISTS idx_products_vegan ON public.products(vegan);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policy Products: Lettura aperta a tutti (anche anonimi)
CREATE POLICY "Lettura pubblica prodotti"
    ON public.products FOR SELECT
    USING (true);

-- Policy Products: Inserimento/Modifica aperta a scraper e admin
CREATE POLICY "Inserimento e modifica prodotti scraper"
    ON public.products FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy Reviews: Lettura aperta a tutti
CREATE POLICY "Lettura pubblica recensioni"
    ON public.reviews FOR SELECT
    USING (true);

-- Policy Reviews: Inserimento consentito (pubblico o autenticato)
CREATE POLICY "Inserimento recensioni consentito"
    ON public.reviews FOR INSERT
    WITH CHECK (true);

-- Policy Reviews: Modifica/Cancellazione delle proprie recensioni
CREATE POLICY "Modifica propria recensione"
    ON public.reviews FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Cancellazione propria recensione"
    ON public.reviews FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 6. DATI DI ESEMPIO (SEED DATA)
-- ==============================================================================
INSERT INTO public.products (brand, name, price, protein_percentage, vegan, link, image_url, values_json)
VALUES 
(
    'Optimum Nutrition',
    'Gold Standard 100% Whey',
    34.99,
    78.00,
    FALSE,
    'https://www.optimumnutrition.com',
    'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=500&auto=format&fit=crop&q=60',
    '{
        "serving_size_g": 30,
        "protein_per_serving_g": 24,
        "bcaa_g": 5.5,
        "sugar_g": 1.2,
        "calories": 116,
        "format": "Polvere 900g"
    }'::jsonb
),
(
    'MyProtein',
    'Impact Whey Isolate',
    29.50,
    90.00,
    FALSE,
    'https://www.myprotein.it',
    'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=500&auto=format&fit=crop&q=60',
    '{
        "serving_size_g": 25,
        "protein_per_serving_g": 22.5,
        "bcaa_g": 4.5,
        "sugar_g": 0.6,
        "calories": 93,
        "format": "Polvere 1kg"
    }'::jsonb
),
(
    'Yamamoto Nutrition',
    'Hydro RAZAN Isolated Whey',
    49.90,
    86.00,
    FALSE,
    'https://www.yamamotonutrition.com',
    'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60',
    '{
        "serving_size_g": 30,
        "protein_per_serving_g": 26,
        "sugar_g": 0.2,
        "calories": 108,
        "enzymes": "Optipep & Lactase",
        "format": "Polvere 700g"
    }'::jsonb
),
(
    'Alpha Foods',
    'Vegan Protein Polvere Vaniglia',
    28.90,
    76.00,
    TRUE,
    'https://alphafoods.info',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60',
    '{
        "serving_size_g": 30,
        "protein_per_serving_g": 22.8,
        "sources": ["Pisello", "Riso", "Zucca", "Semi di girasole"],
        "sugar_g": 0.5,
        "calories": 112,
        "format": "Polvere 600g"
    }'::jsonb
),
(
    'Creapure',
    'Creatina Monoidrato 100% Pura',
    22.00,
    0.00,
    TRUE,
    'https://www.creapure.com',
    'https://images.unsplash.com/photo-1594882645126-14020914d58d?w=500&auto=format&fit=crop&q=60',
    '{
        "serving_size_g": 3.4,
        "creatine_per_serving_g": 3.0,
        "mesh": 200,
        "purity": "99.99%",
        "format": "Polvere 500g"
    }'::jsonb
);
