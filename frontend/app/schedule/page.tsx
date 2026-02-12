"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { ScheduleEventCard } from "@/components/schedule/schedule-event-card"
import { CalendarIcon, Plus } from "lucide-react"
import { apiGet } from "@/lib/api"
import type { ScheduleEvent } from "@/lib/types"

interface DaySchedule {
  date: Date
  dateStr: string
  events: ScheduleEvent[]
}

export default function SchedulePage() {
  const router = useRouter()
  const pathname = usePathname()
  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [nextWeekCache, setNextWeekCache] = useState<DaySchedule[]>([])
  const [currentWeekStartDate, setCurrentWeekStartDate] = useState<string>("")
  const [showScrollToTop, setShowScrollToTop] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  const observerTarget = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSchedule()
  }, [])

  // Reload schedule when navigating to this page (including from profile after edit/delete)
  useEffect(() => {
    if (pathname === '/schedule') {
      fetchSchedule()
    }
  }, [pathname])

  // Also reload when window gains focus (for external changes)
  useEffect(() => {
    const handleFocus = () => {
      fetchSchedule()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Track scroll position to show "Back to top" button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      setShowScrollToTop(scrollTop > 400)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Helper function to calculate next week's start date
  const getNextWeekDate = (currentDate: string): string => {
    const date = new Date(currentDate)
    date.setDate(date.getDate() + 7)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Helper function to convert API response to DaySchedule array
  const convertToDaySchedules = (weekData: Record<string, ScheduleEvent[]>): DaySchedule[] => {
    const schedules: DaySchedule[] = []
    const now = new Date()
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    // Get current time in Moscow (UTC+3)
    const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }))
    const currentHours = moscowTime.getHours()
    const currentMinutes = moscowTime.getMinutes()
    const currentTimeInMinutes = currentHours * 60 + currentMinutes

    const sortedDates = Object.keys(weekData).sort()

    for (const dateStr of sortedDates) {
      let events = weekData[dateStr]

      if (events.length > 0) {
        const [y, m, d] = dateStr.split('-').map(Number)
        const date = new Date(y, m - 1, d)

        // Only show today and future dates
        if (date >= todayMidnight) {
          // Filter out past events for today only
          if (dateStr === todayStr) {
            events = events.filter(event => {
              // Parse end time (format: "HH:MM")
              const [endHours, endMinutes] = event.end_time.split(':').map(Number)
              const endTimeInMinutes = endHours * 60 + endMinutes

              // Keep event if it hasn't ended yet
              return endTimeInMinutes > currentTimeInMinutes
            })
          }

          // Only add if there are events left after filtering
          if (events.length > 0) {
            schedules.push({
              date,
              dateStr,
              events
            })
          }
        }
      }
    }

    return schedules
  }

  // Prefetch next week in background
  const prefetchNextWeek = useCallback(async (startDate: string) => {
    if (!hasMore) return

    try {
      const weekData = await apiGet<Record<string, ScheduleEvent[]>>("/api/schedule/week", {
        start_date: startDate
      })

      const schedules = convertToDaySchedules(weekData)

      if (schedules.length === 0) {
        setHasMore(false)
        return
      }

      setNextWeekCache(schedules)
    } catch (err) {
      console.error("Failed to prefetch next week:", err)
    }
  }, [hasMore])

  const fetchSchedule = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const startDate = `${year}-${month}-${day}`

      // Fetch week schedule (optimized - one request)
      const weekData = await apiGet<Record<string, ScheduleEvent[]>>("/api/schedule/week", {
        start_date: startDate
      })

      // Convert to DaySchedule array
      const schedules = convertToDaySchedules(weekData)

      setDaySchedules(schedules)
      setCurrentWeekStartDate(startDate)

      // Prefetch next week in background
      if (schedules.length > 0) {
        const nextWeekDate = getNextWeekDate(startDate)
        prefetchNextWeek(nextWeekDate)
      }
    } catch (err) {
      console.error("Failed to fetch schedule:", err)
      const errorMessage = err instanceof Error ? err.message : "Ошибка загрузки расписания"

      // Redirect to auth if credentials are missing or invalid
      if (errorMessage.includes("Credentials not found") ||
          errorMessage.includes("Invalid") ||
          errorMessage.includes("not found")) {
        router.push("/auth")
        return
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Load more schedule when user scrolls to bottom
  const loadMoreSchedule = useCallback(async () => {
    if (isLoadingMore || !hasMore || nextWeekCache.length === 0) return

    setIsLoadingMore(true)

    try {
      // Filter out duplicates - only add dates that don't exist yet
      setDaySchedules(prev => {
        const existingDates = new Set(prev.map(d => d.dateStr))
        const newSchedules = nextWeekCache.filter(schedule => !existingDates.has(schedule.dateStr))

        // If no new dates, we've reached the end
        if (newSchedules.length === 0) {
          setHasMore(false)
          return prev
        }

        // Merge and sort by date to maintain chronological order
        const merged = [...prev, ...newSchedules]
        merged.sort((a, b) => a.dateStr.localeCompare(b.dateStr))
        return merged
      })

      // Calculate next week after the one we just added
      const nextWeekDate = getNextWeekDate(currentWeekStartDate)
      const weekAfterNext = getNextWeekDate(nextWeekDate)

      setCurrentWeekStartDate(nextWeekDate)
      setNextWeekCache([])

      // Prefetch the week after next
      await prefetchNextWeek(weekAfterNext)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, nextWeekCache, currentWeekStartDate, prefetchNextWeek])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && hasMore) {
          loadMoreSchedule()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [loadMoreSchedule, isLoadingMore, hasMore])

  const formatDayHeader = (date: Date) => {
    // Check if date is today
    const today = new Date()
    const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear()

    if (isToday) {
      return "СЕГОДНЯ"
    }

    return new Intl.DateTimeFormat("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(date).toUpperCase()
  }

  const handleEventClick = (event: ScheduleEvent, dateStr: string) => {
    // Navigate to event detail page with query parameters
    router.push(`/event?date=${dateStr}&start_time=${event.start_time}`)
  }

  const scrollToTop = () => {
    // Reset to today's schedule
    setSelectedDate(undefined)
    fetchSchedule()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return

    setSelectedDate(date)
    setCalendarOpen(false)

    // Format selected date as YYYY-MM-DD
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    try {
      setIsLoading(true)
      setError(null)

      // Check if date is in cache
      const cachedSchedule = nextWeekCache.find(s => s.dateStr === dateStr)

      if (cachedSchedule) {
        // Use cached data - filter to show from selected date onwards
        const filteredSchedules = nextWeekCache.filter(s => s.dateStr >= dateStr)
        setDaySchedules(filteredSchedules)
        setCurrentWeekStartDate(dateStr)

        // Prefetch next week
        const nextWeekDate = getNextWeekDate(dateStr)
        prefetchNextWeek(nextWeekDate)
      } else {
        // Fetch from API
        const weekData = await apiGet<Record<string, ScheduleEvent[]>>("/api/schedule/week", {
          start_date: dateStr
        })

        // Convert to DaySchedule array (only from selected date onwards)
        const schedules = convertToDaySchedules(weekData).filter(s => s.dateStr >= dateStr)

        setDaySchedules(schedules)
        setCurrentWeekStartDate(dateStr)

        // Prefetch next week in background
        if (schedules.length > 0) {
          const nextWeekDate = getNextWeekDate(dateStr)
          prefetchNextWeek(nextWeekDate)
        }
      }

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error("Failed to fetch schedule for date:", err)
      const errorMessage = err instanceof Error ? err.message : "Ошибка загрузки расписания"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl pb-24">
      {/* Header */}
      <div ref={topRef} className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Расписание</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => router.push('/schedule/custom/new')}
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Sheet open={calendarOpen} onOpenChange={setCalendarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <CalendarIcon className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto rounded-t-3xl border-t-2 bg-background backdrop-blur-xl">
              <SheetTitle className="sr-only">Выбрать дату</SheetTitle>
              <div className="flex items-center justify-center py-6">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  className="rounded-lg"
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchSchedule}>
            Попробовать снова
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && daySchedules.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground mb-2">Нет занятий</p>
          <p className="text-sm text-muted-foreground">Отдыхайте! 🎉</p>
        </div>
      )}

      {/* Schedule by days */}
      {!isLoading && !error && daySchedules.length > 0 && (
        <>
          <div className="space-y-8">
            {daySchedules.map((daySchedule, dayIndex) => (
              <div key={`${daySchedule.dateStr}-${dayIndex}`} className="space-y-3">
                {/* Day header */}
                <h2 className="text-xs font-medium text-muted-foreground tracking-wide">
                  {formatDayHeader(daySchedule.date)}
                </h2>

                {/* Events for this day */}
                <div className="space-y-0">
                  {daySchedule.events.map((event, index) => (
                    <ScheduleEventCard
                      key={`${daySchedule.dateStr}-${event.start_time}-${index}`}
                      event={event}
                      onClick={() => handleEventClick(event, daySchedule.dateStr)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Intersection Observer target */}
          <div ref={observerTarget} className="h-10" />

          {/* Loading more indicator */}
          {isLoadingMore && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          {/* End of schedule message */}
          {!hasMore && !isLoadingMore && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Это всё расписание на данный момент</p>
            </div>
          )}
        </>
      )}

      {/* Floating Scroll to top button */}
      {showScrollToTop && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={scrollToTop}
            className="inline-flex items-center px-6 py-3 rounded-full bg-blue-500/30 text-blue-600 dark:text-blue-400 font-medium shadow-2xl hover:bg-blue-500/40 transition-colors backdrop-blur-md"
          >
            В начало ↑
          </button>
        </div>
      )}
    </div>
  )
}
