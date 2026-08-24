import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Rimuove eventuale path /rest/v1 o /rest/v1/ per garantire il corretto funzionamento del client Supabase
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "");

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
