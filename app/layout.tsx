import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Elm Sans is not available on Google Fonts; Plus Jakarta Sans is the closest match.
// Replace with self-hosted Elm Sans via next/font/local when the font files are provided.
const elmSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TM Slate | Takeout Media",
  description: "Every project, on slate.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${elmSans.variable} dark h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: `(function(){const t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.remove('dark');})();` }} />
        {children}
      </body>
    </html>
  );
}
