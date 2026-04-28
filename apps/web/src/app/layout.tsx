import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Timewell",
  description: "Collaborative digital memory cards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-cream text-ink font-sans antialiased min-h-screen">{children}</body>
    </html>
  );
}
