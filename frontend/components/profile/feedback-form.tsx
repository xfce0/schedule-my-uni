"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare } from "lucide-react"
import { apiPost } from "@/lib/api"
import type { FeedbackCreate } from "@/lib/types"

export function FeedbackForm() {
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim()) {
      return
    }

    setIsSubmitting(true)

    try {
      const feedbackData: FeedbackCreate = {
        message: message.trim(),
      }

      await apiPost("/api/feedback", feedbackData)

      // Show success message
      setShowSuccess(true)
      setMessage("")

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
    } catch (err) {
      console.error("Failed to send feedback:", err)
      alert("Ошибка при отправке сообщения")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Обратная связь
        </CardTitle>
        <CardDescription>
          Есть вопрос, идея или нашли ошибку? Напишите нам!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ваше сообщение..."
            rows={4}
            disabled={isSubmitting}
            required
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {message.length > 0 ? `${message.length} символов` : ""}
            </p>
            <Button type="submit" disabled={isSubmitting || !message.trim()}>
              {isSubmitting ? "Отправка..." : "Отправить"}
            </Button>
          </div>
          {showSuccess && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-600 dark:text-green-400">
              ✓ Сообщение отправлено! Мы ответим вам в Telegram.
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
