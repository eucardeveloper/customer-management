import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "Customer Management System",
  description: "Spring Boot Microservices · Railway",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <AppHeader />
        <div style={{ marginTop: 64 }}>{children}</div>
      </body>
    </html>
  );
}