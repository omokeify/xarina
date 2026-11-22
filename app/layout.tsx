import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted so builds never depend on Google Fonts returning a parseable CSS response.
// The Latin woff2 files are the same ones next/font/google downloads at build time.
const cormorant = localFont({
  src: [
    { path: "./fonts/cormorant-garamond-latin-normal.woff2", weight: "500 600", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-italic.woff2", weight: "500 600", style: "italic" },
  ],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Xarina", template: "%s · Xarina" },
  description: "Wearable statement dressing.",
};

// Runs before first paint so a saved dark choice never flashes light. Default is light.
const THEME_SCRIPT = `try{if(localStorage.getItem("xarina-theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
