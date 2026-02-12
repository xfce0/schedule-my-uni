"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FeedbackForm } from "@/components/profile/feedback-form"
import { FAQSection } from "@/components/profile/faq-section"
import { MyClassesSection } from "@/components/profile/my-classes-section"
import { useTelegram } from "@/components/providers/telegram-provider"
import { apiDelete } from "@/lib/api"
import { Calendar } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useTelegram()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteCredentials = async () => {
    if (!confirm("Удалить сохраненные данные для входа в linguanet? Вам потребуется ввести их заново.")) {
      return
    }

    setIsDeleting(true)
    try {
      await apiDelete("/api/user/credentials")
      router.push("/auth")
    } catch (err) {
      console.error("Failed to delete credentials:", err)
      alert("Ошибка при удалении данных")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Профиль</h1>

      <div className="space-y-4">
        {/* User info */}
        <Card>
          <CardHeader>
            <CardTitle>Информация</CardTitle>
            <CardDescription>Ваши данные из Telegram</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {user && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Имя:</span>
                  <span className="font-medium">
                    {user.first_name} {user.last_name}
                  </span>
                </div>
                {user.username && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Username:</span>
                    <span className="font-medium">@{user.username}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telegram ID:</span>
                  <span className="font-mono text-xs">{user.id}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* My Classes */}
        <MyClassesSection />

        {/* Credentials */}
        <Card>
          <CardHeader>
            <CardTitle>Данные linguanet</CardTitle>
            <CardDescription>Управление сохраненными данными для входа</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteCredentials}
              disabled={isDeleting}
            >
              {isDeleting ? "Удаление..." : "Удалить данные для входа"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              После удаления вам потребуется заново ввести логин и пароль
            </p>
          </CardContent>
        </Card>

        {/* Feedback */}
        <FeedbackForm />

        {/* FAQ */}
        <FAQSection />
      </div>
    </div>
  )
}
