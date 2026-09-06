-- ==============================================================================
-- MIGRAZIONE: recensioni vincolate agli utenti autenticati
-- ==============================================================================
-- La policy originale in schema.sql permetteva l'inserimento di recensioni
-- anche a utenti anonimi (WITH CHECK (true)). Con l'introduzione del login
-- Supabase Auth, solo utenti autenticati possono pubblicare una recensione,
-- e solo a proprio nome (auth.uid() = user_id).
--
-- Esegui questo script manualmente nello Supabase SQL Editor.

DROP POLICY IF EXISTS "Inserimento recensioni consentito" ON public.reviews;

CREATE POLICY "Inserimento recensioni autenticate"
    ON public.reviews FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Un utente può lasciare una sola recensione per prodotto
ALTER TABLE public.reviews
    ADD CONSTRAINT unique_review_per_user_product UNIQUE (product_id, user_id);
