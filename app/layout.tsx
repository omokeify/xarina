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

// Runs before first paint so saved theme choices or ?theme= query never flash. Default is light ivory.
const THEME_SCRIPT = `try{var u=new URLSearchParams(window.location.search).get("theme");var t=u||localStorage.getItem("xarina-theme");if(t&&t!=="light"&&t!=="default"){document.documentElement.dataset.theme=t;if(u)localStorage.setItem("xarina-theme",u);}}catch(e){}`;

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
