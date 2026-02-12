"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiPost } from "@/lib/api"
import type { CredentialsSave } from "@/lib/types"

export function AuthForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    eios_username: "",
    eios_password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await apiPost<void>("/api/auth/credentials", formData as CredentialsSave)

      // Redirect to schedule page on success
      router.push("/schedule")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при сохранении данных")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Вход в linguanet МГЛУ</CardTitle>
        <CardDescription>
          Введите ваши данные для доступа к расписанию
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Логин linguanet</Label>
            <Input
              id="username"
              type="text"
              placeholder="Ваш логин"
              value={formData.eios_username}
              onChange={(e) =>
                setFormData({ ...formData, eios_username: e.target.value })
              }
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль linguanet</Label>
            <Input
              id="password"
              type="password"
              placeholder="Ваш пароль"
              value={formData.eios_password}
              onChange={(e) =>
                setFormData({ ...formData, eios_password: e.target.value })
              }
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Сохранение..." : "Сохранить"}
          </Button>
        </form>

        <div className="mt-6 rounded-md bg-muted p-4">
          <h4 className="text-sm font-medium mb-2">ℹ️ Важная информация</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Данные хранятся в зашифрованном виде</li>
            <li>Вы можете удалить их в любой момент в профиле</li>
            <li>
              Приложение полностью{" "}
              <a
                href="https://github.com/xfce0/schedule-my-uni"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              >
                opensource
              </a>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
