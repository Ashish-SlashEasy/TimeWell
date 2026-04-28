import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Timewell",
  description: "Collaborative digital memory cards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground font-sans antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
