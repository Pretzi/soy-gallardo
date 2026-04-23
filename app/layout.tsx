import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
        className={`${plusJakarta.variable} antialiased bg-gray-50`}
      >
        <ServiceWorkerRegister />
        <OfflineProvider>
        <AppHeader />
        {children}
        </OfflineProvider>
      </body>
    </html>
  );
}
