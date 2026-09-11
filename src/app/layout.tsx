import type { Metadata } from "next"
import { Outfit, Source_Serif_4 } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
})

const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Nimbus — Cloud PM",
  description:
    "Scrivania personale per un Technical Cloud Project Manager: inbox, attività da eseguire o coordinare, progetti e link Drive.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={`${outfit.variable} ${serif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="bottom-right" theme="light" richColors />
      </body>
    </html>
  )
}
