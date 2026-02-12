"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Plus } from "lucide-react"
import { apiGet, apiDelete } from "@/lib/api"
import type { CustomEvent } from "@/lib/types"
import { useRouter } from "next/navigation"
import { EditClassDialog } from "./edit-class-dialog"

const DAYS_MAP: Record<string, string> = {
  "1": "Понедельник",
  "2": "Вторник",
  "3": "Среда",
  "4": "Четверг",
  "5": "Пятница",
  "6": "Суббота",
  "7": "Воскресенье",
}

export function MyClassesSection() {
  const router = useRouter()
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingEvent, setEditingEvent] = useState<CustomEvent | null>(null)
  const loadingRef = useRef(false)

  const loadCustomEvents = async () => {
    // Prevent multiple simultaneous loads
    if (loadingRef.current) return

    try {
      loadingRef.current = true
      setIsLoading(true)
      const events = await apiGet<CustomEvent[]>("/api/custom-events")
      setCustomEvents(events)
    } catch (error) {
      console.error("Failed to load custom events:", error)
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }

  useEffect(() => {
    loadCustomEvents()
  }, [])

  const handleDelete = async (eventId: number, eventTitle: string) => {
    if (!confirm(`Удалить занятие "${eventTitle}"? Это удалит ВСЕ повторяющиеся занятия.`)) {
      return
    }

    try {
      await apiDelete(`/api/custom-events/${eventId}`)
      setCustomEvents(prev => prev.filter(e => e.id !== eventId))
    } catch (error) {
      console.error("Failed to delete event:", error)
      alert("Ошибка при удалении занятия")
    }
  }

  const handleEdit = (event: CustomEvent) => {
    setEditingEvent(event)
  }

  const handleEditSuccess = () => {
    setEditingEvent(null)
    loadCustomEvents()
  }

  const formatSchedule = (recurrenceRule: Record<string, any[]>) => {
    const days = Object.keys(recurrenceRule).sort()
    return days.map(day => {
      const slots = recurrenceRule[day]
      const times = slots.map(slot => `${slot.start}-${slot.end}`).join(", ")
      return `${DAYS_MAP[day]}: ${times}`
    }).join(" • ")
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Мои занятия</CardTitle>
          <CardDescription>Загрузка...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Мои занятия</CardTitle>
            </div>
            <Button
              size="sm"
              onClick={() => router.push("/schedule/custom/new")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {customEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              У вас пока нет созданных занятий
            </p>
          ) : (
            <div className="space-y-3">
              {customEvents.map((event) => (
                <div
                  key={event.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base mb-1">
                        {event.title}
                      </h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {event.teacher && (
                          <p>Преподаватель: {event.teacher}</p>
                        )}
                        {event.room && (
                          <p>Аудитория: {event.room}</p>
                        )}
                        {event.address && (
                          <p>Адрес: {event.address}</p>
                        )}
                        <p className="text-xs mt-2 text-primary">
                          {formatSchedule(event.recurrence_rule)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(event)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(event.id, event.title)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {editingEvent && (
        <EditClassDialog
          event={editingEvent}
          open={!!editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  )
}
