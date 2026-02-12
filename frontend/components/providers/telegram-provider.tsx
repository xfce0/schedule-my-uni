"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { getTelegramWebApp, type TelegramWebApp } from "@/lib/telegram"

interface TelegramContextType {
  webApp: TelegramWebApp | null
  user: TelegramWebApp["initDataUnsafe"]["user"] | null
  isReady: boolean
}

const TelegramContext = createContext<TelegramContextType>({
  webApp: null,
  user: null,
  isReady: false,
})

export function useTelegram() {
  const context = useContext(TelegramContext)
  if (!context) {
    throw new Error("useTelegram must be used within TelegramProvider")
  }
  return context
}

interface TelegramProviderProps {
  children: ReactNode
}

export function TelegramProvider({ children }: TelegramProviderProps) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)
  const [user, setUser] = useState<TelegramWebApp["initDataUnsafe"]["user"] | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Wait for Telegram WebApp SDK to load
    const initTelegram = () => {
      const tg = getTelegramWebApp()

      if (tg) {
        // Initialize Telegram WebApp
        tg.ready()
        tg.expand()

        setWebApp(tg)
        setUser(tg.initDataUnsafe.user || null)
        setIsReady(true)

        // Apply theme
        const root = document.documentElement
        if (tg.colorScheme === 'dark') {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }

        // Listen for theme changes
        const handleThemeChanged = () => {
          if (tg.colorScheme === 'dark') {
            root.classList.add('dark')
          } else {
            root.classList.remove('dark')
          }
        }

        tg.onEvent('themeChanged', handleThemeChanged)

        return () => {
          tg.offEvent('themeChanged', handleThemeChanged)
        }
      } else {
        // Development mode without Telegram
        console.warn('Telegram WebApp is not available. Running in development mode.')
        setIsReady(true)
      }
    }

    // Try to initialize immediately
    const cleanup = initTelegram()
    if (cleanup) return cleanup

    // If not available, wait for SDK to load
    const checkInterval = setInterval(() => {
      const tg = getTelegramWebApp()
      if (tg || isReady) {
        clearInterval(checkInterval)
        initTelegram()
      }
    }, 100)

    // Timeout after 3 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkInterval)
      if (!isReady) {
        console.warn('Telegram WebApp SDK failed to load. Running in development mode.')
        setIsReady(true)
      }
    }, 3000)

    return () => {
      clearInterval(checkInterval)
      clearTimeout(timeout)
    }
  }, [])

  return (
    <TelegramContext.Provider value={{ webApp, user, isReady }}>
      {children}
    </TelegramContext.Provider>
  )
}
