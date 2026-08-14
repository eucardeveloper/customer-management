import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Müşteri Yönetim Sistemi",
  description: "Spring Boot Microservices · Railway",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}