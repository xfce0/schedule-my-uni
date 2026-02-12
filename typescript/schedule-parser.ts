/**
 * Парсер расписания ЭИОС МГЛУ
 * Портированная версия с Python (schedule_final.py)
 */

import { ScheduleEvent, MONTH_NAMES } from './types';

/**
 * Парсер расписания из ответа ЭИОС
 */
export class ScheduleParser {
  /**
   * Парсинг ответа от ЭИОС МГЛУ
   *
   * @param html - HTML ответ от сервера
   * @returns Массив событий расписания
   */
  parseResponse(html: string): ScheduleEvent[] {
    const events: ScheduleEvent[] = [];

    // Извлекаем дату из visibleDays в stateObject
    const { day, month, year } = this.extractDate(html);

    // Паттерн для извлечения событий
    // Формат: [\'133683_0\',2,[\'<данные>\',\'14:30\',\'15:50\'
    const pattern = /\['(\d+)_\d+',2,\['(.+?)','(\d{2}:\d{2})','(\d{2}:\d{2})'/g;

    let match: RegExpExecArray | null;

    while ((match = pattern.exec(html)) !== null) {
      try {
        const fullString = match[2]; // Вся строка с информацией
        const startTime = match[3];  // Время начала
        const endTime = match[4];    // Время окончания

        // Разбираем строку по \\r\\n (экранированные 4 раза!)
        const parts = fullString.split('\\\\r\\\\n');

        if (parts.length < 4) {
          continue;
        }

        // Извлекаем компоненты
        const courseName = parts[0];
        const details = parts[1].replace(/^-/, '').trim(); // Убираем дефис в начале
        const teacherLine = parts[2];
        const group = parts[3] || '';

        // Извлекаем преподавателя из строки "(пр: Фамилия И.О.)"
        const teacher = this.extractTeacher(teacherLine);

        // Создаем объект события
        const event: ScheduleEvent = {
          course_name: courseName,
          teacher: teacher,
          start_time: startTime,
          end_time: endTime,
          group: group,
          type: '',
          room: '',
          address: '',
          day: day,
          month: month,
          year: year,
          start_date: month ? `${day} ${MONTH_NAMES[month]} ${year}` : '',
        };

        // Парсим детали (тип, аудитория, адрес)
        this.parseDetails(details, event);

        events.push(event);
      } catch (error) {
        console.warn('Ошибка парсинга события:', error);
        continue;
      }
    }

    console.log(`✅ Извлечено событий: ${events.length}`);
    return events;
  }

  /**
   * Извлечение даты из ответа
   *
   * @param html - HTML ответ
   * @returns Объект с днем, месяцем и годом
   */
  private extractDate(html: string): { day: number; month: number; year: number } {
    // Формат: 'visibleDays':'6/3/2026'
    const dateMatch = html.match(/'visibleDays':'(\d+)\/(\d+)\/(\d+)'/);

    if (dateMatch) {
      return {
        day: parseInt(dateMatch[1], 10),
        month: parseInt(dateMatch[2], 10),
        year: parseInt(dateMatch[3], 10),
      };
    }

    return { day: 0, month: 0, year: 0 };
  }

  /**
   * Извлечение преподавателя из строки
   *
   * @param line - Строка с преподавателем
   * @returns ФИО преподавателя
   */
  private extractTeacher(line: string): string {
    // Формат: "(пр: Фамилия И.О.)"
    const teacherMatch = line.match(/\(пр:\s*([^)]+)\)/);

    if (teacherMatch) {
      return teacherMatch[1].trim();
    }

    return '';
  }

  /**
   * Парсинг деталей занятия (тип, аудитория, адрес)
   *
   * @param details - Строка с деталями
   * @param event - Объект события для заполнения
   */
  private parseDetails(details: string, event: ScheduleEvent): void {
    // Тип занятия
    if (details.includes('Лекция')) {
      event.type = 'Лекция';
    } else if (details.includes('Практическое занятие')) {
      event.type = 'Практическое занятие';
    } else if (details.includes('Семинар')) {
      event.type = 'Семинар';
    } else if (details.includes('Лабораторная работа')) {
      event.type = 'Лабораторная работа';
    }

    // Аудитория (формат: "ауд.626" или "ауд 626")
    const roomMatch = details.match(/ауд\.?\s*(\d+)/);
    if (roomMatch) {
      event.room = roomMatch[1];
    }

    // Адрес (в скобках)
    const addressMatch = details.match(/\(([^)]+)\)/);
    if (addressMatch) {
      event.address = addressMatch[1];
    }
  }

  /**
   * Группировка событий по дате
   *
   * @param events - Массив событий
   * @returns Объект с группировкой по датам
   */
  groupByDate(events: ScheduleEvent[]): Record<string, ScheduleEvent[]> {
    const grouped: Record<string, ScheduleEvent[]> = {};

    for (const event of events) {
      // Формируем дату в формате YYYY-MM-DD
      const dateKey = `${event.year}-${String(event.month).padStart(2, '0')}-${String(event.day).padStart(2, '0')}`;

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push(event);
    }

    return grouped;
  }

  /**
   * Сортировка событий по времени начала
   *
   * @param events - Массив событий
   * @returns Отсортированный массив
   */
  sortByTime(events: ScheduleEvent[]): ScheduleEvent[] {
    return events.sort((a, b) => {
      const timeA = a.start_time.split(':').map(Number);
      const timeB = b.start_time.split(':').map(Number);

      // Сравниваем часы
      if (timeA[0] !== timeB[0]) {
        return timeA[0] - timeB[0];
      }

      // Сравниваем минуты
      return timeA[1] - timeB[1];
    });
  }

  /**
   * Фильтрация событий по дате
   *
   * @param events - Массив событий
   * @param day - День
   * @param month - Месяц
   * @param year - Год
   * @returns Отфильтрованный массив
   */
  filterByDate(
    events: ScheduleEvent[],
    day: number,
    month: number,
    year?: number
  ): ScheduleEvent[] {
    return events.filter((event) => {
      const matchesDay = event.day === day;
      const matchesMonth = event.month === month;
      const matchesYear = year ? event.year === year : true;

      return matchesDay && matchesMonth && matchesYear;
    });
  }

  /**
   * Получение уникальных преподавателей
   *
   * @param events - Массив событий
   * @returns Массив уникальных преподавателей
   */
  getUniqueTeachers(events: ScheduleEvent[]): string[] {
    const teachers = new Set<string>();

    for (const event of events) {
      if (event.teacher) {
        teachers.add(event.teacher);
      }
    }

    return Array.from(teachers).sort();
  }

  /**
   * Группировка событий по преподавателю
   *
   * @param events - Массив событий
   * @returns Объект с группировкой по преподавателям
   */
  groupByTeacher(events: ScheduleEvent[]): Record<string, ScheduleEvent[]> {
    const grouped: Record<string, ScheduleEvent[]> = {};

    for (const event of events) {
      const teacher = event.teacher || 'Не указан';

      if (!grouped[teacher]) {
        grouped[teacher] = [];
      }

      grouped[teacher].push(event);
    }

    return grouped;
  }

  /**
   * Группировка событий по типу
   *
   * @param events - Массив событий
   * @returns Объект с группировкой по типам
   */
  groupByType(events: ScheduleEvent[]): Record<string, ScheduleEvent[]> {
    const grouped: Record<string, ScheduleEvent[]> = {};

    for (const event of events) {
      const type = event.type || 'Не указан';

      if (!grouped[type]) {
        grouped[type] = [];
      }

      grouped[type].push(event);
    }

    return grouped;
  }

  /**
   * Статистика по расписанию
   *
   * @param events - Массив событий
   * @returns Объект со статистикой
   */
  getStatistics(events: ScheduleEvent[]): {
    total: number;
    teachers: number;
    courses: number;
    byType: Record<string, number>;
  } {
    const uniqueTeachers = new Set<string>();
    const uniqueCourses = new Set<string>();
    const byType: Record<string, number> = {};

    for (const event of events) {
      if (event.teacher) {
        uniqueTeachers.add(event.teacher);
      }

      if (event.course_name) {
        uniqueCourses.add(event.course_name);
      }

      const type = event.type || 'Не указан';
      byType[type] = (byType[type] || 0) + 1;
    }

    return {
      total: events.length,
      teachers: uniqueTeachers.size,
      courses: uniqueCourses.size,
      byType: byType,
    };
  }

  /**
   * Форматирование события в читаемый вид
   *
   * @param event - Событие
   * @returns Строка с форматированным событием
   */
  formatEvent(event: ScheduleEvent): string {
    const lines: string[] = [];

    lines.push(`📚 ${event.course_name}`);

    if (event.teacher) {
      lines.push(`👨‍🏫 ${event.teacher}`);
    }

    lines.push(`⏰ ${event.start_time} - ${event.end_time}`);

    if (event.type) {
      lines.push(`📝 ${event.type}`);
    }

    if (event.room) {
      lines.push(`🏢 Ауд. ${event.room}`);
    }

    if (event.address) {
      lines.push(`📍 ${event.address}`);
    }

    if (event.group) {
      lines.push(`👥 ${event.group}`);
    }

    return lines.join('\n');
  }

  /**
   * Форматирование расписания на день
   *
   * @param events - События на день
   * @param date - Дата
   * @returns Строка с форматированным расписанием
   */
  formatDaySchedule(events: ScheduleEvent[], date: string): string {
    if (events.length === 0) {
      return `📅 ${date}\n\n📭 Занятий нет`;
    }

    const sortedEvents = this.sortByTime(events);
    const lines: string[] = [];

    lines.push(`📅 Расписание на ${date}`);
    lines.push(`Всего занятий: ${events.length}\n`);

    sortedEvents.forEach((event, index) => {
      lines.push(`${index + 1}. ${this.formatEvent(event)}`);
      lines.push(''); // Пустая строка между событиями
    });

    return lines.join('\n');
  }
}

/**
 * Экспорт синглтона парсера
 */
export const scheduleParser = new ScheduleParser();
