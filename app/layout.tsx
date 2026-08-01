import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { APP_TITLE } from "@/lib/app-title";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: APP_TITLE,
  description: "A local web UI for the beads (bd) issue tracker",
};

// viewport-fit=cover lets content extend under the iPhone notch/Dynamic
// Island so env(safe-area-inset-*) has something to compute against — without
// it, safe-area padding on bottom sheets silently no-ops (gold-mobile-ui-research §7).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0c0f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
