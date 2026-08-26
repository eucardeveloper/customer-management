import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "AI Agent Orchestration System",
  description: "n8n + Spring Boot + GPT-4o Mini",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>{children}</body>
    </html>
  );
}