"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X } from "lucide-react"
import { apiPost } from "@/lib/api"

interface TimeSlot {
  start: string
  end: string
}

interface DaySchedule {
  dayName: string
  dayNumber: number
  enabled: boolean
  timeSlots: TimeSlot[]
}

const DAYS_OF_WEEK: { name: string; number: number }[] = [
  { name: "Понедельник", number: 1 },
  { name: "Вторник", number: 2 },
  { name: "Среда", number: 3 },
  { name: "Четверг", number: 4 },
  { name: "Пятница", number: 5 },
  { name: "Суббота", number: 6 },
  { name: "Воскресенье", number: 7 },
]

const EVENT_TYPES = [
  { value: "ППК", label: "ППК" },
  { value: "Лекция", label: "Лекция" },
  { value: "Практическое занятие", label: "Практическое занятие" },
  { value: "Семинар", label: "Семинар" },
  { value: "Лабораторная работа", label: "Лабораторная работа" },
  { value: "Консультация", label: "Консультация" },
  { value: "Репетиторство", label: "Репетиторство" },
  { value: "Кастомное", label: "Другое" },
]

export default function NewCustomEventPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [teacher, setTeacher] = useState("")
  const [room, setRoom] = useState("")
  const [address, setAddress] = useState("")
  const [eventType, setEventType] = useState("ППК")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize schedule for each day
  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>(
    DAYS_OF_WEEK.map(day => ({
      dayName: day.name,
      dayNumber: day.number,
      enabled: false,
      timeSlots: [{ start: "", end: "" }],
    }))
  )

  // Setup Telegram BackButton
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      tg.BackButton.show()
      tg.BackButton.onClick(() => router.back())

      return () => {
        tg.BackButton.hide()
        tg.BackButton.offClick(() => router.back())
      }
    }
  }, [router])

  const toggleDay = (index: number) => {
    setDaySchedules(prev =>
      prev.map((day, i) =>
        i === index ? { ...day, enabled: !day.enabled } : day
      )
    )
  }

  const addTimeSlot = (dayIndex: number) => {
    setDaySchedules(prev =>
      prev.map((day, i) =>
        i === dayIndex && day.timeSlots.length < 5
          ? { ...day, timeSlots: [...day.timeSlots, { start: "", end: "" }] }
          : day
      )
    )
  }

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    setDaySchedules(prev =>
      prev.map((day, i) =>
        i === dayIndex && day.timeSlots.length > 1
          ? { ...day, timeSlots: day.timeSlots.filter((_, si) => si !== slotIndex) }
          : day
      )
    )
  }

  const updateTimeSlot = (
    dayIndex: number,
    slotIndex: number,
    field: "start" | "end",
    value: string
  ) => {
    setDaySchedules(prev =>
      prev.map((day, i) =>
        i === dayIndex
          ? {
              ...day,
              timeSlots: day.timeSlots.map((slot, si) =>
                si === slotIndex ? { ...slot, [field]: value } : slot
              ),
            }
          : day
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!title.trim()) {
      setError("Введите название занятия")
      return
    }

    // Get enabled days with valid time slots
    const enabledDays = daySchedules.filter(day => day.enabled)
    if (enabledDays.length === 0) {
      setError("Выберите хотя бы один день недели")
      return
    }

    // Build recurrence rule
    const recurrenceRule: Record<string, { start: string; end: string }[]> = {}

    for (const day of enabledDays) {
      const validSlots = day.timeSlots.filter(
        slot => slot.start.trim() !== "" && slot.end.trim() !== ""
      )

      if (validSlots.length === 0) {
        setError(`Добавьте хотя бы одно время для ${day.dayName}`)
        return
      }

      recurrenceRule[day.dayNumber.toString()] = validSlots
    }

    try {
      setIsSubmitting(true)

      await apiPost("/api/custom-events", {
        title: title.trim(),
        teacher: teacher.trim() || null,
        room: room.trim() || null,
        address: address.trim() || null,
        event_type: eventType,
        recurrence_rule: recurrenceRule,
      })

      // Success - navigate back with timestamp to force refresh
      router.push(`/schedule?refresh=${Date.now()}`)
      router.refresh()
    } catch (err) {
      console.error("Failed to create custom event:", err)
      setError(err instanceof Error ? err.message : "Ошибка создания занятия")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Добавить занятие</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Название занятия *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Английский с репетитором"
            required
          />
        </div>

        {/* Teacher */}
        <div className="space-y-2">
          <Label htmlFor="teacher">Преподаватель (необязательно)</Label>
          <Input
            id="teacher"
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
            placeholder="Например: Иванов И.И."
          />
        </div>

        {/* Room */}
        <div className="space-y-2">
          <Label htmlFor="room">Аудитория (необязательно)</Label>
          <Input
            id="room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="Например: 206"
          />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address">Адрес (необязательно)</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Например: Комсомольский пр-кт, д.6"
          />
        </div>

        {/* Event Type */}
        <div className="space-y-2">
          <Label htmlFor="eventType">Тип занятия</Label>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger id="eventType">
              <SelectValue placeholder="Выберите тип" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Days of week */}
        <div className="space-y-4">
          <Label>Дни недели и время</Label>

          {daySchedules.map((day, dayIndex) => (
            <Card key={day.dayNumber} className={day.enabled ? "border-primary" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`day-${day.dayNumber}`}
                    checked={day.enabled}
                    onCheckedChange={() => toggleDay(dayIndex)}
                  />
                  <CardTitle className="text-base font-medium">
                    {day.dayName}
                  </CardTitle>
                </div>
              </CardHeader>

              {day.enabled && (
                <CardContent className="space-y-3">
                  {day.timeSlots.map((slot, slotIndex) => (
                    <div key={slotIndex} className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          type="time"
                          value={slot.start}
                          onChange={(e) =>
                            updateTimeSlot(dayIndex, slotIndex, "start", e.target.value)
                          }
                          className="flex-1"
                          required
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="time"
                          value={slot.end}
                          onChange={(e) =>
                            updateTimeSlot(dayIndex, slotIndex, "end", e.target.value)
                          }
                          className="flex-1"
                          required
                        />
                      </div>
                      {day.timeSlots.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                          className="h-9 w-9"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  {day.timeSlots.length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addTimeSlot(dayIndex)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить еще время
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Отмена
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </form>
    </div>
  )
}
