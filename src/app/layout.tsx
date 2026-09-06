import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Comparatore Integratori | Trova i migliori integratori al miglior prezzo",
  description: "Confronta prezzi, valori nutrizionali, recensioni e ingredienti di proteine, creatina, vitamine e integratori per il fitness e la salute.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
