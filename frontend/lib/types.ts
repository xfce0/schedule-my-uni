/**
 * TypeScript types matching backend schemas
 */

// User types
export interface User {
  id: number
  telegram_id: number
  username?: string
  first_name: string
  last_name?: string
  language_code?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserCredentials {
  id: number
  user_id: number
  eios_username: string
  base_plan_id: string
  is_valid: boolean
  last_verified_at?: string
  created_at: string
  updated_at: string
}

// Schedule types
export interface ScheduleEvent {
  course_name: string
  teacher: string
  start_time: string
  end_time: string
  event_type: string
  room: string
  address: string
  group: string
  meeting_link: string
  day: number
  month: number
  year: number
  start_date?: string
  // Custom event fields
  is_custom?: boolean
  custom_event_id?: number
  color?: string
}

export interface DaySchedule {
  date: string
  events: ScheduleEvent[]
}

export interface WeekSchedule {
  [date: string]: ScheduleEvent[]
}

// Homework types
export interface Attachment {
  type: string
  name: string
  url: string
  size?: number
}

export interface Homework {
  id: number
  user_id: number
  course_name: string
  class_date: string
  class_time?: string
  title: string
  description?: string
  due_date?: string
  is_completed: boolean
  completed_at?: string
  priority?: "low" | "medium" | "high"
  attachments?: Attachment[]
  created_at: string
  updated_at: string
}

export interface HomeworkCreate {
  course_name: string
  class_date: string
  class_time?: string
  title: string
  description?: string
  due_date?: string
  priority?: "low" | "medium" | "high"
  attachments?: Attachment[]
}

export interface HomeworkUpdate {
  course_name?: string
  class_date?: string
  class_time?: string
  title?: string
  description?: string
  due_date?: string
  priority?: "low" | "medium" | "high"
  attachments?: Attachment[]
}

// Feedback types
export interface Feedback {
  id: number
  user_id?: number
  telegram_id: number
  message: string
  status: "new" | "read" | "replied"
  admin_reply?: string
  created_at: string
  replied_at?: string
}

export interface FeedbackCreate {
  message: string
}

// Auth types
export interface AuthInitResponse {
  user_id: number
  is_new_user: boolean
  needs_credentials: boolean
}

export interface CredentialsSave {
  eios_username: string
  eios_password: string
  base_plan_id: string
}

export interface CredentialsCheckResponse {
  has_credentials: boolean
  credentials?: UserCredentials
}

// Custom Event types
export interface TimeSlot {
  start: string
  end: string
}

export interface CustomEvent {
  id: number
  user_id: number
  title: string
  teacher?: string
  room?: string
  address?: string
  description?: string
  event_type: string
  color: string
  is_recurring: boolean
  recurrence_rule: Record<string, TimeSlot[]>
  created_at: string
  updated_at: string
}

export interface CustomEventCreate {
  title: string
  teacher?: string
  room?: string
  address?: string
  description?: string
  event_type: string
  color?: string
  recurrence_rule: Record<string, TimeSlot[]>
}

export interface CustomEventUpdate {
  title?: string
  teacher?: string
  room?: string
  address?: string
  description?: string
  event_type?: string
  color?: string
  recurrence_rule?: Record<string, TimeSlot[]>
}
