import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Ajan Orkestrasyon Sistemi",
  description: "n8n + Spring Boot + GPT-4o Mini",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}