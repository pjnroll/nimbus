import type { Metadata } from "next"
import localFont from "next/font/local"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const jakarta = localFont({
  src: "../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2",
  weight: "200 800",
  style: "normal",
  variable: "--font-jakarta",
})

export const metadata: Metadata = {
  title: "Nimbus",
  description:
    "Organizza attività, progetti e impegni in un’unica scrivania personale.",
}

const paletteBootScript = `(function(){try{var p=localStorage.getItem("nimbus-palette");if(p==="indigo"||p==="ocean"||p==="forest"){document.documentElement.setAttribute("data-palette",p);}else{document.documentElement.setAttribute("data-palette","indigo");}}catch(e){document.documentElement.setAttribute("data-palette","indigo");}})();`

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={`${jakarta.variable} h-full antialiased`}
      suppressHydrationWarning
      data-palette="indigo"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: paletteBootScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          {children}
          <Toaster position="bottom-center" richColors offset={24} mobileOffset={24} />
        </ThemeProvider>
      </body>
    </html>
  )
}
