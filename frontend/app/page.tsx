"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTelegram } from "@/components/providers/telegram-provider"
import { apiPost, apiGet } from "@/lib/api"
import type { AuthInitResponse } from "@/lib/types"

export default function HomePage() {
  const router = useRouter()
  const { isReady, webApp } = useTelegram()
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isReady) return

    const initializeUser = async () => {
      try {
        // Get initData from Telegram WebApp
        const initData = webApp?.initData || ""

        // Initialize user in backend
        const initResponse = await apiPost<AuthInitResponse>("/api/auth/init", { init_data: initData })

        // Redirect based on credentials status (needs_credentials = true means no credentials)
        if (!initResponse.needs_credentials) {
          router.push("/schedule")
        } else {
          router.push("/auth")
        }
      } catch (err) {
        console.error("Initialization error:", err)
        setError(err instanceof Error ? err.message : "Ошибка инициализации")
        setIsChecking(false)
      }
    }

    initializeUser()
  }, [isReady, router, webApp])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-destructive">Ошибка</h1>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">
            Попробуйте перезапустить приложение
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Schedule My Uni</h1>
        <p className="text-muted-foreground">
          Telegram Mini App для управления расписанием МГЛУ
        </p>
        <div className="flex items-center justify-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" />
        </div>
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      </div>
    </div>
  )
}
