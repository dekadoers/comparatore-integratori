-- ==============================================================================
-- MIGRAZIONE: rimozione tabella price_history
-- ==============================================================================
-- Lo storico prezzi è stato rimosso dal prodotto per scelta strategica
-- (evitare conflitti commerciali con i brand partner). Esegui questo script
-- manualmente nello Supabase SQL Editor per allineare il database allo schema
-- attuale dell'app.

DROP TABLE IF EXISTS public.price_history;
