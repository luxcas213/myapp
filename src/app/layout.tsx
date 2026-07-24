import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ViewportHeightFix } from "@/components/viewport-height-fix";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// iOS doesn't generate a splash screen from the manifest the way Android
// does — each screen size needs its own apple-touch-startup-image, matched
// by an exact device-width/device-height/pixel-ratio media query. Images
// generated from public/icons/icon-512.png (see the gen-splash script run
// noted in CLAUDE.md); covers roughly the last ~5 years of iPhones, not
// the full historical Apple matrix.
const SPLASH_SCREENS = [
  { file: "se-750x1334.png", width: 375, height: 667, ratio: 2 },
  { file: "6.1-2x-828x1792.png", width: 414, height: 896, ratio: 2 },
  { file: "mini-1080x2340.png", width: 360, height: 780, ratio: 3 },
  { file: "standard-1170x2532.png", width: 390, height: 844, ratio: 3 },
  { file: "plus-1284x2778.png", width: 428, height: 926, ratio: 3 },
  { file: "pro-1179x2556.png", width: 393, height: 852, ratio: 3 },
  { file: "pro-max-1290x2796.png", width: 430, height: 932, ratio: 3 },
  { file: "16-pro-1206x2622.png", width: 402, height: 874, ratio: 3 },
  { file: "16-pro-max-1320x2868.png", width: 440, height: 956, ratio: 3 },
];

export const metadata: Metadata = {
  title: "Mi App",
  description: "App personal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mi App",
    startupImage: SPLASH_SCREENS.map(({ file, width, height, ratio }) => ({
      url: `/icons/splash/${file}`,
      media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`,
    })),
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-[var(--app-height)] antialiased`}
    >
      <body className="flex h-full flex-col overscroll-none">
        <ViewportHeightFix />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
