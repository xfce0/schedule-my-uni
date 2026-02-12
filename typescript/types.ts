/**
 * Типы данных для приложения расписания
 */

// ============================
// ТИПЫ ДЛЯ РАСПИСАНИЯ (ЭИОС)
// ============================

/**
 * Событие расписания из ЭИОС МГЛУ
 */
export interface ScheduleEvent {
  /** Название курса/предмета */
  course_name: string;

  /** ФИО преподавателя */
  teacher: string;

  /** Время начала (формат: "HH:MM") */
  start_time: string;

  /** Время окончания (формат: "HH:MM") */
  end_time: string;

  /** Тип занятия */
  type: 'Лекция' | 'Практическое занятие' | 'Семинар' | 'Лабораторная работа' | string;

  /** Номер аудитории */
  room: string;

  /** Адрес (корпус) */
  address: string;

  /** Группа */
  group: string;

  /** День */
  day: number;

  /** Месяц */
  month: number;

  /** Год */
  year: number;

  /** Дата в читаемом формате */
  start_date: string;
}

/**
 * Расписание на день
 */
export interface DaySchedule {
  /** Дата (ISO формат: "YYYY-MM-DD") */
  date: string;

  /** События из ЭИОС */
  events: ScheduleEvent[];

  /** Пользовательские события */
  custom_events?: CustomEvent[];

  /** Домашние задания на этот день */
  homework?: Homework[];
}

/**
 * Расписание на неделю
 */
export interface WeekSchedule {
  /** Дата начала недели */
  start_date: string;

  /** Дата окончания недели */
  end_date: string;

  /** Расписание по дням */
  days: Record<string, DaySchedule>;
}

// ============================
// ПОЛЬЗОВАТЕЛЬСКИЕ СОБЫТИЯ
// ============================

/**
 * Пользовательское событие (дополнительная пара, встреча и т.д.)
 */
export interface CustomEvent {
  /** ID события */
  id: number;

  /** ID пользователя */
  user_id: number;

  /** Название события */
  title: string;

  /** Описание */
  description?: string;

  /** Тип события */
  event_type: 'custom' | 'meeting' | 'consultation' | 'exam';

  /** Дата и время начала */
  start_datetime: string; // ISO format

  /** Дата и время окончания */
  end_datetime: string; // ISO format

  /** Место проведения */
  location?: string;

  /** Цвет для календаря (HEX) */
  color: string;

  /** Повторяющееся событие */
  is_recurring: boolean;

  /** Правило повторения (RRULE) */
  recurrence_rule?: string;

  /** Дата создания */
  created_at: string;

  /** Дата обновления */
  updated_at: string;
}

/**
 * Данные для создания пользовательского события
 */
export interface CreateCustomEventDto {
  title: string;
  description?: string;
  event_type?: 'custom' | 'meeting' | 'consultation' | 'exam';
  start_datetime: string;
  end_datetime: string;
  location?: string;
  color?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
}

// ============================
// ДОМАШНИЕ ЗАДАНИЯ
// ============================

/**
 * Домашнее задание
 */
export interface Homework {
  /** ID задания */
  id: number;

  /** ID пользователя */
  user_id: number;

  /** Название курса */
  course_name: string;

  /** Название задания */
  title: string;

  /** Описание */
  description?: string;

  /** Срок сдачи */
  due_date: string; // ISO format

  /** Выполнено */
  is_completed: boolean;

  /** Дата выполнения */
  completed_at?: string;

  /** Приоритет */
  priority: 'low' | 'medium' | 'high';

  /** Вложения */
  attachments?: HomeworkAttachment[];

  /** Дата создания */
  created_at: string;

  /** Дата обновления */
  updated_at: string;
}

/**
 * Вложение к домашнему заданию
 */
export interface HomeworkAttachment {
  /** Имя файла */
  name: string;

  /** URL файла */
  url: string;

  /** Размер в байтах */
  size: number;

  /** MIME тип */
  type?: string;
}

/**
 * Данные для создания домашнего задания
 */
export interface CreateHomeworkDto {
  course_name: string;
  title: string;
  description?: string;
  due_date: string;
  priority?: 'low' | 'medium' | 'high';
  attachments?: HomeworkAttachment[];
}

// ============================
// ПОЛЬЗОВАТЕЛЬ
// ============================

/**
 * Пользователь Telegram
 */
export interface User {
  /** ID пользователя в БД */
  id: number;

  /** Telegram ID */
  telegram_id: number;

  /** Username в Telegram */
  username?: string;

  /** Имя */
  first_name: string;

  /** Фамилия */
  last_name?: string;

  /** Код языка */
  language_code?: string;

  /** Активен */
  is_active: boolean;

  /** Дата регистрации */
  created_at: string;

  /** Дата обновления */
  updated_at: string;
}

/**
 * Учетные данные для ЭИОС
 */
export interface UserCredentials {
  /** Логин для ЭИОС */
  username: string;

  /** Пароль для ЭИОС */
  password: string;

  /** Base Plan ID */
  base_plan_id: string;
}

/**
 * Профиль пользователя
 */
export interface UserProfile extends User {
  /** Есть ли сохраненные учетные данные */
  has_credentials: boolean;

  /** Логин для ЭИОС (только для отображения) */
  eios_username?: string;
}

// ============================
// ОБРАТНАЯ СВЯЗЬ
// ============================

/**
 * Сообщение обратной связи
 */
export interface Feedback {
  /** ID сообщения */
  id: number;

  /** ID пользователя */
  user_id: number;

  /** Telegram ID */
  telegram_id: number;

  /** Текст сообщения */
  message: string;

  /** Статус */
  status: 'new' | 'read' | 'replied';

  /** Ответ администратора */
  admin_reply?: string;

  /** Дата создания */
  created_at: string;

  /** Дата ответа */
  replied_at?: string;
}

/**
 * Данные для отправки feedback
 */
export interface SendFeedbackDto {
  message: string;
}

// ============================
// TELEGRAM MINI APP
// ============================

/**
 * Данные пользователя от Telegram
 */
export interface TelegramUser {
  /** Telegram ID */
  id: number;

  /** Имя */
  first_name: string;

  /** Фамилия */
  last_name?: string;

  /** Username */
  username?: string;

  /** Код языка */
  language_code?: string;

  /** Premium пользователь */
  is_premium?: boolean;
}

/**
 * InitData от Telegram WebApp
 */
export interface TelegramInitData {
  /** Данные пользователя */
  user?: TelegramUser;

  /** Query ID */
  query_id?: string;

  /** Auth date */
  auth_date: number;

  /** Hash для валидации */
  hash: string;
}

/**
 * Параметры темы Telegram
 */
export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

/**
 * Telegram WebApp API
 */
export interface TelegramWebApp {
  /** Сырые данные инициализации */
  initData: string;

  /** Распарсенные данные инициализации */
  initDataUnsafe: TelegramInitData;

  /** Версия */
  version: string;

  /** Цветовая схема */
  colorScheme: 'light' | 'dark';

  /** Параметры темы */
  themeParams: TelegramThemeParams;

  /** Развернуто на весь экран */
  isExpanded: boolean;

  /** Высота viewport */
  viewportHeight: number;

  /** Главная кнопка */
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    setText(text: string): void;
    onClick(callback: () => void): void;
    show(): void;
    hide(): void;
  };

  /** CloudStorage */
  CloudStorage: {
    setItem(key: string, value: string, callback?: (error: Error | null, success: boolean) => void): void;
    getItem(key: string, callback: (error: Error | null, value: string | null) => void): void;
    getItems(keys: string[], callback: (error: Error | null, values: Record<string, string>) => void): void;
    removeItem(key: string, callback?: (error: Error | null, success: boolean) => void): void;
    removeItems(keys: string[], callback?: (error: Error | null, success: boolean) => void): void;
    getKeys(callback: (error: Error | null, keys: string[]) => void): void;
  };

  /** Методы */
  ready(): void;
  expand(): void;
  close(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  onEvent(eventType: string, callback: () => void): void;
  offEvent(eventType: string, callback: () => void): void;
}

// ============================
// API ОТВЕТЫ
// ============================

/**
 * Стандартный ответ API
 */
export interface ApiResponse<T = any> {
  /** Успешно */
  success: boolean;

  /** Данные */
  data?: T;

  /** Сообщение */
  message?: string;

  /** Ошибка */
  error?: string;
}

/**
 * Ответ при инициализации
 */
export interface AuthInitResponse {
  /** ID пользователя в БД */
  user_id: number;

  /** Новый пользователь */
  is_new_user: boolean;

  /** Нужно ввести учетные данные */
  needs_credentials: boolean;
}

/**
 * Ответ при сохранении credentials
 */
export interface SaveCredentialsResponse {
  /** Успешно */
  success: boolean;

  /** Сообщение */
  message: string;
}

// ============================
// КЭШИРОВАНИЕ
// ============================

/**
 * Опции кэша
 */
export interface CacheOptions {
  /** Время жизни в миллисекундах */
  ttl?: number;

  /** Использовать CloudStorage вместо localStorage */
  useCloudStorage?: boolean;
}

/**
 * Элемент кэша
 */
export interface CacheItem<T = any> {
  /** Данные */
  data: T;

  /** Время создания */
  timestamp: number;

  /** TTL в миллисекундах */
  ttl?: number;
}

// ============================
// УТИЛИТЫ
// ============================

/**
 * Месяцы на русском
 */
export const MONTH_NAMES: Record<number, string> = {
  1: 'января',
  2: 'февраля',
  3: 'марта',
  4: 'апреля',
  5: 'мая',
  6: 'июня',
  7: 'июля',
  8: 'августа',
  9: 'сентября',
  10: 'октября',
  11: 'ноября',
  12: 'декабря'
};

/**
 * Дни недели на русском
 */
export const WEEKDAY_NAMES: string[] = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье'
];

/**
 * Дни недели (короткие)
 */
export const WEEKDAY_NAMES_SHORT: string[] = [
  'Пн',
  'Вт',
  'Ср',
  'Чт',
  'Пт',
  'Сб',
  'Вс'
];
