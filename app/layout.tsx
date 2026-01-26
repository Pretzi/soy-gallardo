import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { HeaderNav } from "@/components/HeaderNav";
import { OfflineProvider } from "@/contexts/OfflineContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Soy Gallardo - Registro de Entradas",
  description: "Sistema de registro de afiliados Soy Gallardo",
  manifest: "/manifest.json",
  themeColor: "#f97316",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Soy Gallardo",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <OfflineProvider>
        <header className="bg-white border-b-4 border-orange-500 shadow-md">
          <div className="container mx-auto px-4 py-3 md:py-2">
            <div className="flex items-center justify-between gap-3 md:gap-4">
              <div className="flex items-center gap-3 md:gap-4">
                <img 
                  src="/logo-2.png" 
                  alt="Soy Gallardo Logo" 
                  className="h-12 md:h-12 w-auto flex-shrink-0"
                />
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-black tracking-tight text-gray-900 leading-tight">
                    Soy <span className="font-extrabold text-orange-600">Gallardo</span>
                  </h1>
                  <p className="text-base md:text-base font-normal text-gray-700 leading-tight">
                    y obtengo beneficios.
                  </p>
                </div>
              </div>
              <HeaderNav />
            </div>
          </div>
        </header>
        {children}
        </OfflineProvider>
      </body>
    </html>
  );
}
