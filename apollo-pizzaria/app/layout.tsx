import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apollo Pizzaria",
  description: "Sistema de Delivery Apollo Pizzaria",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
