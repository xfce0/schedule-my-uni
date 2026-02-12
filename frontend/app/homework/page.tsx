"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { HomeworkItem } from "@/components/homework/homework-item"
import { HomeworkDetailDialog } from "@/components/homework/homework-detail-dialog"
import { apiGet, apiPatch } from "@/lib/api"
import type { Homework } from "@/lib/types"

export default function HomeworkPage() {
  const [homework, setHomework] = useState<Homework[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchHomework()
  }, [showCompleted])

  const fetchHomework = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await apiGet<Homework[]>("/api/homework", {
        is_completed: showCompleted,
      })
      setHomework(data)
    } catch (err) {
      console.error("Failed to fetch homework:", err)
      setError(err instanceof Error ? err.message : "Ошибка загрузки заданий")
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleComplete = async (id: number, isCompleted: boolean) => {
    try {
      await apiPatch(`/api/homework/${id}/complete`, { is_completed: isCompleted })
      // Refresh list
      fetchHomework()
    } catch (err) {
      console.error("Failed to toggle homework:", err)
    }
  }

  const handleHomeworkClick = (hw: Homework) => {
    setSelectedHomework(hw)
    setDialogOpen(true)
  }

  const handleDialogUpdate = () => {
    fetchHomework()
    // Update selected homework with fresh data
    if (selectedHomework) {
      const updated = homework.find(h => h.id === selectedHomework.id)
      if (updated) {
        setSelectedHomework(updated)
      }
    }
  }

  const incompleteCount = homework.filter((hw) => !hw.is_completed).length

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Домашние задания</h1>
        {incompleteCount > 0 && !showCompleted && (
          <p className="text-sm text-muted-foreground">
            Активных заданий: {incompleteCount}
          </p>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant={!showCompleted ? "default" : "outline"}
          size="sm"
          onClick={() => setShowCompleted(false)}
          className="rounded-xl"
        >
          Активные
        </Button>
        <Button
          variant={showCompleted ? "default" : "outline"}
          size="sm"
          onClick={() => setShowCompleted(true)}
          className="rounded-xl"
        >
          Выполненные
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        💡 Добавляйте заметки к занятиям через расписание
      </p>

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
          <Button variant="outline" size="sm" onClick={fetchHomework}>
            Попробовать снова
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && homework.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground mb-2">
            {showCompleted ? "Нет выполненных заданий" : "Нет активных заданий"}
          </p>
          <p className="text-sm text-muted-foreground">
            {showCompleted ? "Время поработать! 💪" : "Отлично! 🎉"}
          </p>
        </div>
      )}

      {/* Homework list */}
      {!isLoading && !error && homework.length > 0 && (
        <div className="space-y-3">
          {homework.map((hw) => (
            <HomeworkItem
              key={hw.id}
              homework={hw}
              onToggleComplete={handleToggleComplete}
              onClick={handleHomeworkClick}
            />
          ))}
        </div>
      )}

      {/* Homework detail dialog */}
      <HomeworkDetailDialog
        homework={selectedHomework}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={handleDialogUpdate}
      />
    </div>
  )
}
