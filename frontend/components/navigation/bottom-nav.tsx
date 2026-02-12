"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calendar, ClipboardList, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/schedule", label: "Расписание", Icon: Calendar },
  { href: "/homework", label: "Задания", Icon: ClipboardList },
  { href: "/profile", label: "Профиль", Icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  // Don't show navigation on home and auth pages
  if (pathname === "/" || pathname === "/auth") {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[70px]",
                  isActive
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.Icon className="w-6 h-6" />
                <span className="text-xs">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
