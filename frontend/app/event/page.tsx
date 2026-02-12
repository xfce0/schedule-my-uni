"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Building2, Info, Plus, Link as LinkIcon } from "lucide-react"
import { apiGet } from "@/lib/api"
import { useTelegram } from "@/components/providers/telegram-provider"
import { HomeworkCreateDialog } from "@/components/homework/homework-create-dialog"
import { HomeworkDetailDialog } from "@/components/homework/homework-detail-dialog"
import type { ScheduleEvent, Homework } from "@/lib/types"

function EventDetailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { webApp } = useTelegram()

  const [event, setEvent] = useState<ScheduleEvent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [homework, setHomework] = useState<Homework[]>([])
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Get query params
  const date = searchParams.get("date")
  const startTime = searchParams.get("start_time")

  useEffect(() => {
    // Setup Telegram Back Button
    if (webApp) {
      const handleBack = () => {
        router.push("/schedule")
      }

      webApp.BackButton.onClick(handleBack)
      webApp.BackButton.show()

      return () => {
        webApp.BackButton.offClick(handleBack)
        webApp.BackButton.hide()
      }
    }
  }, [webApp, router])

  useEffect(() => {
    if (!date || !startTime) {
      setError("Отсутствуют параметры события")
      setIsLoading(false)
      return
    }

    fetchEventDetail()
  }, [date, startTime])

  const fetchEventDetail = async () => {
    if (!date || !startTime) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch detailed event information
      const eventData = await apiGet<ScheduleEvent>("/api/schedule/event-detail", {
        date: date,
        start_time: startTime
      })

      setEvent(eventData)

      // Fetch homework for this event
      await fetchHomework(date, startTime)
    } catch (err) {
      console.error("Failed to fetch event detail:", err)
      setError(err instanceof Error ? err.message : "Ошибка загрузки")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchHomework = async (classDate: string, classTime: string) => {
    try {
      const homeworkData = await apiGet<Homework[]>("/api/homework", {
        class_date: classDate,
        class_time: classTime,
      })
      setHomework(homeworkData)
    } catch (err) {
      console.error("Failed to fetch homework:", err)
      // Don't set error for homework - it's optional
    }
  }

  const handleHomeworkClick = (hw: Homework) => {
    setSelectedHomework(hw)
    setDetailDialogOpen(true)
  }

  const handleHomeworkUpdate = () => {
    if (date && startTime) {
      fetchHomework(date, startTime)
    }
  }

  const getEventTypeLabel = (type: string | undefined) => {
    if (!type) return "ЗАНЯТИЕ"
    const typeStr = type.toLowerCase()

    if (typeStr.includes("лекц")) return "ЛЕКЦИЯ"
    if (typeStr.includes("практ")) return "ПРАКТ. ЗАНЯТИЕ"
    if (typeStr.includes("семинар")) return "СЕМИНАР"
    if (typeStr.includes("лаб")) return "ЛАБ. РАБОТА"
    if (typeStr.includes("консультац")) return "КОНСУЛЬТАЦИЯ"

    return type.toUpperCase()
  }

  const getInitials = (name: string) => {
    if (!name) return "?"
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name[0].toUpperCase()
  }

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number)
    const date = new Date(year, month - 1, day)

    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date)
  }

  // Check if location is online
  const isOnline = event?.address?.toLowerCase().includes("онлайн") ||
                   event?.address?.toLowerCase().includes("дистанционн") ||
                   event?.room?.toLowerCase().includes("дистанционн")

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive mb-2">{error || "Событие не найдено"}</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/schedule")}>
            Вернуться к расписанию
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl pb-24">
      {/* Header */}
      <div className="mb-4">
        <Badge className="mb-3 bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30">
          {getEventTypeLabel(event.event_type)}
        </Badge>
        <h1 className="text-2xl font-bold mb-2">{event.course_name}</h1>
        <p className="text-sm text-muted-foreground">{date ? formatDate(date) : ""}</p>
      </div>

      <div className="space-y-4">
        {/* Time and Location */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">{event.start_time} - {event.end_time}</span>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div>
                {isOnline ? (
                  <span className="font-medium">Онлайн</span>
                ) : (
                  <span className="font-medium">{event.address || "Не указано"}</span>
                )}
              </div>
            </div>

            {/* Room - only for non-online classes */}
            {!isOnline && event.room && (
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Ауд. {event.room}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Professor */}
        {event.teacher && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
                Преподаватель
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {/* Avatar with initials */}
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {getInitials(event.teacher)}
                  </span>
                </div>

                {/* Teacher info */}
                <div>
                  <p className="font-medium">{event.teacher}</p>
                  <p className="text-sm text-muted-foreground">Преподаватель</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Information - только если есть ссылка */}
        {event.meeting_link && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
                Дополнительная информация
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Meeting Link */}
              <div className="flex items-start gap-3">
                <LinkIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Ссылка на встречу</p>
                  <a
                    href={event.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {event.meeting_link}
                  </a>
                </div>
              </div>

              {/* Group */}
              {event.group && (
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Группа</p>
                    <p className="font-medium">{event.group}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Homework */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Задание {homework.length > 0 && `(${homework.length})`}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Добавить задание
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {homework.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет заданий к этому занятию</p>
            ) : (
              <div className="space-y-2">
                {homework.map((hw) => (
                  <div
                    key={hw.id}
                    onClick={() => handleHomeworkClick(hw)}
                    className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium text-sm mb-1 ${hw.is_completed ? "line-through text-muted-foreground" : ""}`}>
                          {hw.title}
                        </h4>
                        {hw.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {hw.description}
                          </p>
                        )}
                      </div>
                      {hw.is_completed && (
                        <span className="text-xs text-green-600 dark:text-green-400 shrink-0">
                          ✓ Готово
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Homework Create Dialog */}
      <HomeworkCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        courseName={event.course_name}
        classDate={date || ""}
        classTime={event.start_time}
        onSuccess={() => {
          // Refresh homework list after creation
          if (date && startTime) {
            fetchHomework(date, startTime)
          }
        }}
      />

      {/* Homework Detail Dialog */}
      <HomeworkDetailDialog
        homework={selectedHomework}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onUpdate={handleHomeworkUpdate}
      />
    </div>
  )
}

export default function EventDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <EventDetailContent />
    </Suspense>
  )
}
