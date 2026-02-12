import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Check } from "lucide-react"
import type { Homework } from "@/lib/types"

interface HomeworkItemProps {
  homework: Homework
  onToggleComplete: (id: number, isCompleted: boolean) => void
  onClick?: (homework: Homework) => void
}

export function HomeworkItem({ homework, onToggleComplete, onClick }: HomeworkItemProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <Card
      className={`${homework.is_completed ? "opacity-60" : ""} ${onClick ? "cursor-pointer" : ""} rounded-2xl hover:shadow-md transition-all`}
      onClick={() => onClick?.(homework)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className={`text-base ${homework.is_completed ? "line-through text-muted-foreground" : ""}`}>
              {homework.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{homework.course_name}</p>
          </div>
          <Button
            variant={homework.is_completed ? "outline" : "default"}
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onToggleComplete(homework.id, !homework.is_completed)
            }}
            className="rounded-xl"
          >
            {homework.is_completed ? "Вернуть" : "Готово"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {homework.description && (
          <p className="text-muted-foreground break-words overflow-wrap-anywhere">{homework.description}</p>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {formatDate(homework.class_date)}
            {homework.class_time && ` в ${homework.class_time}`}
          </span>
          {homework.is_completed && homework.completed_at && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="w-3 h-3" />
              {formatDate(homework.completed_at)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
