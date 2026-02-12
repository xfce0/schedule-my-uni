/**
 * Клиент для работы с ЭИОС МГЛУ напрямую из браузера
 */

import { ScheduleEvent, UserCredentials } from './types';
import { scheduleParser } from './schedule-parser';

/**
 * Конфигурация ЭИОС клиента
 */
interface EIOSConfig {
  /** Базовый URL ЭИОС */
  baseUrl: string;

  /** Timeout для запросов (мс) */
  timeout: number;
}

/**
 * Параметры для получения расписания
 */
interface FetchScheduleParams {
  /** Учетные данные */
  credentials: UserCredentials;

  /** Целевая дата (формат: "YYYY-MM-DD") */
  targetDate: string;
}

/**
 * Клиент для прямых запросов к ЭИОС МГЛУ из браузера
 */
export class EIOSClient {
  private config: EIOSConfig;

  /**
   * @param config - Конфигурация клиента
   */
  constructor(config?: Partial<EIOSConfig>) {
    this.config = {
      baseUrl: 'https://eios.linguanet.ru',
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Формирование URL для расписания
   *
   * @param basePlanId - ID учебного плана
   * @returns Полный URL
   */
  private getScheduleUrl(basePlanId: string): string {
    return `${this.config.baseUrl}/_layouts/sinc/ia/v1.0/pages/MySchedule.aspx?base_plan_ids=${basePlanId}`;
  }

  /**
   * Создание Basic Auth заголовка
   *
   * @param username - Логин
   * @param password - Пароль
   * @returns Base64 encoded credentials
   */
  private createAuthHeader(username: string, password: string): string {
    const credentials = `${username}:${password}`;
    return `Basic ${btoa(credentials)}`;
  }

  /**
   * Конвертация даты в Unix timestamp (миллисекунды)
   *
   * @param dateStr - Дата в формате "YYYY-MM-DD"
   * @returns Timestamp в миллисекундах
   */
  private dateToTimestamp(dateStr: string): number {
    const date = new Date(dateStr);
    return date.getTime();
  }

  /**
   * Шаг 1: Получить ViewState со страницы
   *
   * @param credentials - Учетные данные
   * @returns HTML страницы с ViewState
   */
  private async fetchInitialPage(credentials: UserCredentials): Promise<string> {
    const url = this.getScheduleUrl(credentials.base_plan_id);
    const authHeader = this.createAuthHeader(credentials.username, credentials.password);

    console.log('📡 Загружаю начальную страницу ЭИОС...');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`✅ Страница загружена (${html.length} символов)`);

    return html;
  }

  /**
   * Извлечение скрытых полей формы из HTML
   *
   * @param html - HTML страницы
   * @returns Объект с полями формы
   */
  private extractFormData(html: string): Record<string, string> {
    const formData: Record<string, string> = {};

    // Паттерн для поиска скрытых input полей
    const inputPattern = /<input[^>]*type=["']hidden["'][^>]*>/gi;
    const matches = html.match(inputPattern) || [];

    for (const inputHtml of matches) {
      // Извлекаем name
      const nameMatch = inputHtml.match(/name=["']([^"']+)["']/i);
      // Извлекаем value
      const valueMatch = inputHtml.match(/value=["']([^"']*)["']/i);

      if (nameMatch) {
        const name = nameMatch[1];
        const value = valueMatch ? valueMatch[1] : '';
        formData[name] = value;
      }
    }

    console.log(`✅ Извлечено полей формы: ${Object.keys(formData).length}`);

    return formData;
  }

  /**
   * Шаг 2: Переключиться на Day view
   *
   * @param credentials - Учетные данные
   * @param formData - Данные формы с ViewState
   * @returns HTML ответ после переключения
   */
  private async switchToDayView(
    credentials: UserCredentials,
    formData: Record<string, string>
  ): Promise<string> {
    const url = this.getScheduleUrl(credentials.base_plan_id);
    const authHeader = this.createAuthHeader(credentials.username, credentials.password);

    // Добавляем callback параметры для переключения на Day view
    formData['__CALLBACKID'] = 'ctl00$PlaceHolderMain$_scheduler_ASPxScheduler';
    formData['__CALLBACKPARAM'] = 'c0:SAVT|Day';

    console.log('🔄 Переключаюсь на Day view...');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: url,
        'User-Agent': 'Mozilla/5.0',
      },
      body: new URLSearchParams(formData).toString(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`✅ Day view установлен (${html.length} символов)`);

    return html;
  }

  /**
   * Обновление ViewState из ответа
   *
   * @param html - HTML ответ
   * @param formData - Объект с данными формы для обновления
   */
  private updateViewState(html: string, formData: Record<string, string>): void {
    // ViewState возвращается в формате: '__VIEWSTATE':'...'
    const viewStateMatch = html.match(/'__VIEWSTATE'\s*:\s*'([^']+)'/);

    if (viewStateMatch) {
      formData['__VIEWSTATE'] = viewStateMatch[1];
      console.log('✅ ViewState обновлен');
    }
  }

  /**
   * Шаг 3: Навигация к целевой дате
   *
   * @param credentials - Учетные данные
   * @param formData - Данные формы с ViewState
   * @param targetDate - Целевая дата (формат: "YYYY-MM-DD")
   * @returns HTML ответ с расписанием на целевую дату
   */
  private async navigateToDate(
    credentials: UserCredentials,
    formData: Record<string, string>,
    targetDate: string
  ): Promise<string> {
    const url = this.getScheduleUrl(credentials.base_plan_id);
    const authHeader = this.createAuthHeader(credentials.username, credentials.password);

    // Конвертируем дату в timestamp
    const targetTimestamp = this.dateToTimestamp(targetDate);
    const dayMs = 86400000; // 24 часа в миллисекундах
    const timestampStart = targetTimestamp;
    const timestampEnd = targetTimestamp + dayMs;

    // Формируем callback параметр для навигации
    // Формат: c0:MOREBTN|{timestamp_end},{timestamp_start},86400000,null
    const callbackParam = `c0:MOREBTN|${timestampEnd},${timestampStart},${dayMs},null`;
    formData['__CALLBACKPARAM'] = callbackParam;

    console.log(`📅 Навигация к дате: ${targetDate}`);
    console.log(`🔄 Используем MOREBTN с timestamp: ${timestampStart}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: url,
        'User-Agent': 'Mozilla/5.0',
      },
      body: new URLSearchParams(formData).toString(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`✅ Навигация выполнена (${html.length} символов)`);

    // Проверяем результат навигации
    this.verifyNavigation(html, targetDate);

    return html;
  }

  /**
   * Проверка успешности навигации к дате
   *
   * @param html - HTML ответ
   * @param targetDate - Целевая дата
   */
  private verifyNavigation(html: string, targetDate: string): void {
    const visibleMatch = html.match(/'visibleDays':'([^']+)'/);

    if (visibleMatch) {
      const visibleDate = visibleMatch[1];
      console.log(`📅 Текущая дата в ответе: ${visibleDate}`);

      const [day, month, year] = visibleDate.split('/').map(Number);
      const dateFromResponse = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      if (dateFromResponse === targetDate) {
        console.log(`✅ Успешно перешли к ${targetDate}!`);
      } else {
        console.warn(`⚠️ Ожидали ${targetDate}, получили ${dateFromResponse}`);
      }
    }
  }

  /**
   * Основной метод: получить расписание на дату
   *
   * @param params - Параметры запроса
   * @returns Массив событий расписания
   */
  async fetchSchedule(params: FetchScheduleParams): Promise<ScheduleEvent[]> {
    try {
      console.log('🔄 Начинаю получение расписания через API...');

      // Шаг 1: Получить ViewState
      const initialHtml = await this.fetchInitialPage(params.credentials);
      const formData = this.extractFormData(initialHtml);

      // Шаг 2: Переключиться на Day view
      const dayViewHtml = await this.switchToDayView(params.credentials, formData);
      this.updateViewState(dayViewHtml, formData);

      // Шаг 3: Навигация к целевой дате
      const scheduleHtml = await this.navigateToDate(
        params.credentials,
        formData,
        params.targetDate
      );

      // Шаг 4: Парсинг расписания
      console.log('🔍 Парсинг расписания...');
      const events = scheduleParser.parseResponse(scheduleHtml);

      console.log(`✅ Расписание получено: ${events.length} событий`);

      return events;
    } catch (error) {
      console.error('❌ Ошибка при получении расписания:', error);
      throw error;
    }
  }

  /**
   * Получить расписание на неделю
   *
   * @param params - Параметры запроса
   * @param startDate - Дата начала недели
   * @returns Массив событий за неделю
   */
  async fetchWeekSchedule(
    params: FetchScheduleParams,
    startDate: string
  ): Promise<Record<string, ScheduleEvent[]>> {
    const weekSchedule: Record<string, ScheduleEvent[]> = {};
    const start = new Date(startDate);

    // Получаем расписание на 7 дней
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);

      const dateStr = currentDate.toISOString().split('T')[0];

      console.log(`📅 Получаю расписание на ${dateStr}...`);

      try {
        const events = await this.fetchSchedule({
          credentials: params.credentials,
          targetDate: dateStr,
        });

        weekSchedule[dateStr] = events;
        console.log(`✅ ${dateStr}: ${events.length} событий`);
      } catch (error) {
        console.error(`❌ Ошибка для ${dateStr}:`, error);
        weekSchedule[dateStr] = [];
      }
    }

    return weekSchedule;
  }

  /**
   * Проверка доступности ЭИОС (для тестирования CORS)
   *
   * @returns true если доступен, false если CORS заблокирован
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.config.baseUrl, {
        method: 'HEAD',
        mode: 'cors',
      });

      return response.ok;
    } catch (error) {
      console.error('❌ CORS заблокирован:', error);
      return false;
    }
  }
}

/**
 * Экспорт синглтона клиента
 */
export const eiosClient = new EIOSClient();
