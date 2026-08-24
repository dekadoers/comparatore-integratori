-- ==============================================================================
-- SCHEMA & MIGRAZIONE: price_history (Storico Prezzi Integratori)
-- ==============================================================================

-- 1. Creazione Tabella price_history
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    format TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Indici di performance per query veloci sul grafico
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON public.price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON public.price_history(created_at);

-- 3. Row Level Security (RLS)
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Lettura pubblica dello storico prezzi
DROP POLICY IF EXISTS "Lettura pubblica price_history" ON public.price_history;
CREATE POLICY "Lettura pubblica price_history"
    ON public.price_history FOR SELECT
    USING (true);

-- Inserimento e gestione aperto allo scraper / utenti
DROP POLICY IF EXISTS "Inserimento price_history scraper" ON public.price_history;
CREATE POLICY "Inserimento price_history scraper"
    ON public.price_history FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 4. SEED DATI CRONOLOGIA STORICA (Per popolare i grafici dei prodotti attuali)
-- ==============================================================================
-- Inserimento datapoints storici per tutti i prodotti esistenti
INSERT INTO public.price_history (product_id, price, format, created_at)
SELECT 
    p.id, 
    ROUND((p.price * (1 + (random() * 0.15 - 0.05)))::numeric, 2) AS price,
    COALESCE(p.values_json->>'format', 'Standard') AS format,
    now() - (interval '1 day' * s.day_offset) AS created_at
FROM public.products p
CROSS JOIN (
    VALUES (45), (30), (20), (12), (5), (0)
) AS s(day_offset)
WHERE NOT EXISTS (
    SELECT 1 FROM public.price_history ph WHERE ph.product_id = p.id
);
