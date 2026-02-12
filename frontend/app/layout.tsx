import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import { TelegramProvider } from "@/components/providers/telegram-provider"
import { BottomNav } from "@/components/navigation/bottom-nav"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const inter = Inter({ subsets: ["latin", "cyrillic"] })

export const metadata: Metadata = {
  title: "Schedule My Uni - МГЛУ",
  description: "Telegram Mini App for university schedule management",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async></script>
      </head>
      <body className={inter.className}>
        <TelegramProvider>
          <div className="pb-16">
            {children}
          </div>
          <BottomNav />
          <Toaster />
        </TelegramProvider>
      </body>
    </html>
  )
}
