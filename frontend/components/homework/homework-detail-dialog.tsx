"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, Pencil, Check } from "lucide-react"
import { apiPut, apiDelete, apiPatch } from "@/lib/api"
import type { Homework } from "@/lib/types"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface HomeworkDetailDialogProps {
  homework: Homework | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

export function HomeworkDetailDialog({ homework, open, onOpenChange, onUpdate }: HomeworkDetailDialogProps) {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editData, setEditData] = useState({ title: "", description: "" })

  useEffect(() => {
    if (homework) {
      setEditData({
        title: homework.title,
        description: homework.description || "",
      })
      setIsEditing(false)
    }
  }, [homework])

  const handleSave = async () => {
    if (!homework || !editData.title.trim()) return

    setIsSubmitting(true)
    try {
      await apiPut(`/api/homework/${homework.id}`, {
        title: editData.title,
        description: editData.description || undefined,
      })

      setIsEditing(false)

      // Close dialog to force parent to reload data
      onOpenChange(false)

      if (onUpdate) {
        onUpdate()
      }
    } catch (err) {
      console.error("Failed to update homework:", err)
      alert("Ошибка при обновлении заметки")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!homework || !confirm("Удалить эту заметку?")) return

    try {
      await apiDelete(`/api/homework/${homework.id}`)
      onOpenChange(false)
      if (onUpdate) {
        onUpdate()
      }
    } catch (err) {
      console.error("Failed to delete homework:", err)
      alert("Ошибка при удалении заметки")
    }
  }

  const handleToggleComplete = async () => {
    if (!homework) return

    try {
      const newStatus = !homework.is_completed
      await apiPatch(`/api/homework/${homework.id}/complete`, {
        is_completed: newStatus
      })

      // Close dialog
      onOpenChange(false)

      // Show toast
      toast({
        description: newStatus
          ? "✓ Задача успешно перемещена в выполненные"
          : "↺ Задача успешно перемещена в активные",
        duration: 1000,
      })

      // Update list
      if (onUpdate) {
        onUpdate()
      }
    } catch (err) {
      console.error("Failed to toggle homework:", err)
      toast({
        description: "Ошибка при изменении статуса",
        variant: "destructive",
        duration: 1000,
      })
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  if (!homework) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-center pr-8">{homework.course_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-hidden">
          {/* Date and Time */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="break-words">{formatDate(homework.class_date)}</span>
            </div>
            {homework.class_time && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                <span>{homework.class_time}</span>
              </div>
            )}
          </div>

          {/* View/Edit Mode */}
          {!isEditing ? (
            <>
              <div className="space-y-2 overflow-hidden">
                <h3 className={`font-semibold text-lg break-words ${homework.is_completed ? "line-through text-muted-foreground" : ""}`}>
                  {homework.title}
                </h3>
                {homework.description && (
                  <div className="text-muted-foreground prose prose-sm max-w-none dark:prose-invert overflow-hidden [&_*]:break-words [&_*]:max-w-full [&_a]:break-all [&_code]:break-all [&_pre]:overflow-x-auto [&_pre]:max-w-full">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {homework.description}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Completion Status */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant={homework.is_completed ? "outline" : "default"}
                  size="sm"
                  onClick={handleToggleComplete}
                  className="rounded-xl w-full"
                >
                  {homework.is_completed ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Вернуть в активные
                    </>
                  ) : (
                    "Отметить как выполненное"
                  )}
                </Button>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="rounded-xl w-full"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Редактировать
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  className="rounded-xl w-full"
                >
                  Удалить
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="edit-title">Заголовок</Label>
                  <Input
                    id="edit-title"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    disabled={isSubmitting}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Описание</Label>
                  <Textarea
                    id="edit-description"
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={5}
                    disabled={isSubmitting}
                    className="rounded-xl focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSubmitting || !editData.title.trim()}
                  className="rounded-xl"
                >
                  {isSubmitting ? "Сохранение..." : "Сохранить"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false)
                    setEditData({
                      title: homework.title,
                      description: homework.description || "",
                    })
                  }}
                  disabled={isSubmitting}
                  className="rounded-xl"
                >
                  Отмена
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
