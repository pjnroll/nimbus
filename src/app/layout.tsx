import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
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
      className={`${jakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="bottom-right" theme="light" richColors />
      </body>
    </html>
  )
}
