"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { apiPost } from "@/lib/api"

interface HomeworkCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseName?: string
  classDate?: string
  classTime?: string
  onSuccess?: () => void
}

export function HomeworkCreateDialog({
  open,
  onOpenChange,
  courseName = "",
  classDate = "",
  classTime = "",
  onSuccess
}: HomeworkCreateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    course_name: courseName,
    class_date: classDate,
    class_time: classTime,
    title: "",
    description: "",
  })

  // Update form when props change
  useEffect(() => {
    setFormData({
      course_name: courseName,
      class_date: classDate,
      class_time: classTime,
      title: "",
      description: "",
    })
  }, [courseName, classDate, classTime, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.course_name || !formData.class_date) {
      return
    }

    setIsSubmitting(true)
    try {
      await apiPost("/api/homework", {
        course_name: formData.course_name,
        class_date: formData.class_date,
        class_time: formData.class_time || undefined,
        title: formData.title,
        description: formData.description || undefined,
      })

      // Reset form
      setFormData({
        course_name: courseName,
        class_date: classDate,
        class_time: classTime,
        title: "",
        description: "",
      })

      onOpenChange(false)

      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error("Failed to create homework:", err)
      alert("Ошибка при создании задания")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Новое задание</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4">
          {/* Course Info */}
          <div className="space-y-1">
            <p className="text-sm font-medium">{formData.course_name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(formData.class_date)}
              {formData.class_time && ` в ${formData.class_time}`}
            </p>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Заголовок *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Например: Выучить новые слова"
              disabled={isSubmitting}
              className="rounded-xl"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Дополнительная информация о задании..."
              rows={5}
              disabled={isSubmitting}
              className="rounded-xl"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !formData.title.trim()}
              className="rounded-xl"
            >
              {isSubmitting ? "Создание..." : "Создать"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              Отмена
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
