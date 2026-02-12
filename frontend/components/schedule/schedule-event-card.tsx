import type { ScheduleEvent } from "@/lib/types"

interface ScheduleEventCardProps {
  event: ScheduleEvent
  onClick?: (event: ScheduleEvent) => void
}

export function ScheduleEventCard({ event, onClick }: ScheduleEventCardProps) {
  const getEventTypeLabel = (type: string | undefined) => {
    if (!type) return "ЗАНЯТИЕ"

    const typeStr = type.toLowerCase()

    // Normalize to short Russian form in UPPERCASE
    if (typeStr.includes("лекц")) return "ЛЕКЦИЯ"
    if (typeStr.includes("практ")) return "ПРАКТ. ЗАНЯТИЕ"
    if (typeStr.includes("семинар")) return "СЕМИНАР"
    if (typeStr.includes("лаб")) return "ЛАБ. РАБОТА"
    if (typeStr.includes("консультац")) return "КОНСУЛЬТАЦИЯ"

    // Return original in uppercase (should already be in Russian)
    return type.toUpperCase()
  }

  // Check if location is online
  const isOnline = event.address?.toLowerCase().includes("онлайн") ||
                   event.address?.toLowerCase().includes("дистанционн") ||
                   event.room?.toLowerCase().includes("дистанционн")

  return (
    <div
      className={`flex gap-4 py-4 border-b border-border last:border-b-0 ${onClick ? 'cursor-pointer hover:bg-muted/30 transition-colors px-2 -mx-2 rounded-lg' : ''}`}
      onClick={() => onClick?.(event)}
    >
      {/* Time on the left */}
      <div className="flex flex-col items-start shrink-0 w-14 pt-1">
        <span className="text-base font-medium">{event.start_time}</span>
        <span className="text-sm text-muted-foreground">{event.end_time}</span>
      </div>

      {/* Vertical divider */}
      <div className="w-px bg-[rgb(96,165,250)] my-1 shrink-0" />

      {/* Event details */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Event type badge - purple for custom events, blue for official */}
        <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium mb-2 ${
          event.is_custom
            ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
            : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
        }`}>
          {getEventTypeLabel(event.event_type)}
        </div>

        {/* Course name */}
        <h3 className="text-base font-semibold leading-tight">
          {event.course_name}
        </h3>

        {/* Room (only if not online) */}
        {event.room && !isOnline && (
          <p className="text-sm text-muted-foreground">
            ауд. {event.room}
          </p>
        )}

        {/* Address (just value or "Онлайн") */}
        <p className="text-sm text-muted-foreground">
          {isOnline ? "Онлайн" : (event.address || "Не указано")}
        </p>
      </div>
    </div>
  )
}
