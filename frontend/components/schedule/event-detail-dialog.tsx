"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, MapPin, User, BookOpen, Plus, Trash2, Link } from "lucide-react"
import { apiPost, apiGet, apiDelete } from "@/lib/api"
import type { ScheduleEvent, Homework, HomeworkCreate } from "@/lib/types"
import { HomeworkDetailDialog } from "@/components/homework/homework-detail-dialog"

interface EventDetailDialogProps {
  event: ScheduleEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EventDetailDialog({ event, open, onOpenChange }: EventDetailDialogProps) {
  const [homework, setHomework] = useState<Homework[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [newNote, setNewNote] = useState({ title: "", description: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null)
  const [homeworkDialogOpen, setHomeworkDialogOpen] = useState(false)

  useEffect(() => {
    if (open && event) {
      loadHomework()
    }
  }, [open, event])

  const loadHomework = async () => {
    if (!event) return

    setIsLoading(true)
    try {
      // Format date as YYYY-MM-DD
      const classDate = `${event.year}-${String(event.month).padStart(2, '0')}-${String(event.day).padStart(2, '0')}`

      // Get all homework for this user
      const allHomework = await apiGet<Homework[]>("/api/homework")

      // Filter homework for this specific class
      const filteredHomework = allHomework.filter(
        (hw) => hw.class_date === classDate && hw.course_name === event.course_name
      )

      setHomework(filteredHomework)
    } catch (err) {
      console.error("Failed to load homework:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!event || !newNote.title.trim()) return

    setIsSubmitting(true)
    try {
      const classDate = `${event.year}-${String(event.month).padStart(2, '0')}-${String(event.day).padStart(2, '0')}`

      const homeworkData: HomeworkCreate = {
        course_name: event.course_name,
        class_date: classDate,
        class_time: event.start_time,
        title: newNote.title,
        description: newNote.description || undefined,
      }

      await apiPost("/api/homework", homeworkData)

      // Reset form
      setNewNote({ title: "", description: "" })
      setIsAddingNote(false)

      // Reload homework
      await loadHomework()
    } catch (err) {
      console.error("Failed to add note:", err)
      alert("Ошибка при добавлении заметки")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteNote = async (id: number) => {
    if (!confirm("Удалить эту заметку?")) return

    try {
      await apiDelete(`/api/homework/${id}`)
      await loadHomework()
    } catch (err) {
      console.error("Failed to delete note:", err)
      alert("Ошибка при удалении заметки")
    }
  }

  const handleHomeworkClick = (hw: Homework) => {
    setSelectedHomework(hw)
    setHomeworkDialogOpen(true)
  }

  const handleHomeworkUpdate = () => {
    loadHomework()
  }

  if (!event) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{event.course_name}</DialogTitle>
          <DialogDescription>
            {event.start_date || `${event.day}.${event.month}.${event.year}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event Details */}
          <div className="space-y-2">
            {event.start_time && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{event.start_time} - {event.end_time}</span>
              </div>
            )}
            {event.teacher && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{event.teacher}</span>
              </div>
            )}
            {event.room && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{event.room} {event.address && `- ${event.address}`}</span>
              </div>
            )}
            {event.event_type && (
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span>{event.event_type}</span>
              </div>
            )}
            {event.group && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{event.group}</span>
              </div>
            )}
            {event.meeting_link && (
              <div className="flex items-center gap-2 text-sm">
                <Link className="w-4 h-4 text-muted-foreground" />
                <a
                  href={event.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Ссылка на онлайн-встречу
                </a>
              </div>
            )}
          </div>

          {/* Homework Notes */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Заметки к занятию</h3>
              {!isAddingNote && (
                <Button size="sm" variant="outline" onClick={() => setIsAddingNote(true)} className="rounded-xl">
                  <Plus className="w-4 h-4 mr-1" />
                  Добавить заметку
                </Button>
              )}
            </div>

            {isLoading && (
              <p className="text-sm text-muted-foreground">Загрузка...</p>
            )}

            {/* Add Note Form */}
            {isAddingNote && (
              <div className="space-y-3 mb-4 p-3 border rounded-2xl bg-muted/50">
                <div>
                  <Label htmlFor="note-title">Заголовок</Label>
                  <Input
                    id="note-title"
                    value={newNote.title}
                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                    placeholder="Домашнее задание"
                    disabled={isSubmitting}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="note-description">Описание (необязательно)</Label>
                  <Textarea
                    id="note-description"
                    value={newNote.description}
                    onChange={(e) => setNewNote({ ...newNote, description: e.target.value })}
                    placeholder="Детали задания..."
                    rows={3}
                    disabled={isSubmitting}
                    className="rounded-xl"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddNote} disabled={isSubmitting || !newNote.title.trim()} className="rounded-xl">
                    {isSubmitting ? "Сохранение..." : "Сохранить"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAddingNote(false)
                      setNewNote({ title: "", description: "" })
                    }}
                    disabled={isSubmitting}
                    className="rounded-xl"
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            )}

            {/* Homework List */}
            {!isLoading && homework.length === 0 && !isAddingNote && (
              <p className="text-sm text-muted-foreground">Нет заметок к этому занятию</p>
            )}

            {homework.length > 0 && (
              <div className="space-y-2 px-4">
                {homework.map((hw) => (
                  <div
                    key={hw.id}
                    className="p-3 border rounded-2xl hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleHomeworkClick(hw)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{hw.title}</h4>
                        {hw.description && (
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{hw.description}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteNote(hw.id)
                        }}
                        className="rounded-xl"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Homework detail dialog */}
      <HomeworkDetailDialog
        homework={selectedHomework}
        open={homeworkDialogOpen}
        onOpenChange={setHomeworkDialogOpen}
        onUpdate={handleHomeworkUpdate}
      />
    </Dialog>
  )
}
