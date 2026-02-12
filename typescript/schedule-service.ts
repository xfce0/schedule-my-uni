/**
 * Главный сервис для работы с расписанием
 * Объединяет EIOSClient, ScheduleCache и CredentialsManager
 */

import { ScheduleEvent, DaySchedule, WeekSchedule } from './types';
import { eiosClient, EIOSClient } from './eios-client';
import { scheduleCache, ScheduleCache } from './cache';
import { CredentialsManager, createCredentialsManager } from './credentials-manager';

/**
 * Конфигурация сервиса
 */
interface ScheduleServiceConfig {
  /** URL Backend API */
  apiUrl: string;

  /** Использовать кэш */
  useCache?: boolean;

  /** TTL кэша (мс) */
  cacheTTL?: number;
}

/**
 * Главный сервис расписания
 */
export class ScheduleService {
  private eiosClient: EIOSClient;
  private cache: ScheduleCache;
  private credentialsManager: CredentialsManager;
  private config: ScheduleServiceConfig;

  /**
   * @param config - Конфигурация сервиса
   */
  constructor(config: ScheduleServiceConfig) {
    this.config = {
      useCache: true,
      cacheTTL: 24 * 60 * 60 * 1000, // 24 часа по умолчанию
      ...config,
    };

    this.eiosClient = eiosClient;
    this.cache = scheduleCache;
    this.credentialsManager = createCredentialsManager(config.apiUrl);
  }

  /**
   * Получение расписания на день
   *
   * @param date - Дата (формат: "YYYY-MM-DD")
   * @param forceRefresh - Игнорировать кэш и загрузить заново
   * @returns Расписание на день
   */
  async getScheduleForDay(date: string, forceRefresh: boolean = false): Promise<ScheduleEvent[]> {
    console.log(`📅 Получение расписания на ${date}...`);

    // Шаг 1: Проверка кэша (если не forceRefresh)
    if (this.config.useCache && !forceRefresh) {
      const cached = await this.cache.get(date);
      if (cached) {
        console.log(`✅ Расписание загружено из кэша`);
        return cached;
      }
    }

    // Шаг 2: Получить credentials с Backend
    console.log('🔑 Получаю учетные данные...');
    const credentials = await this.credentialsManager.get();

    // Шаг 3: Запрос к ЭИОС НАПРЯМУЮ из браузера
    console.log('🌐 Делаю запрос к ЭИОС из браузера...');
    const events = await this.eiosClient.fetchSchedule({
      credentials,
      targetDate: date,
    });

    // Шаг 4: Сохранить в кэш
    if (this.config.useCache && events.length > 0) {
      await this.cache.save(date, events, {
        ttl: this.config.cacheTTL,
        useCloudStorage: true,
      });
    }

    return events;
  }

  /**
   * Получение расписания на неделю
   *
   * @param startDate - Дата начала недели (формат: "YYYY-MM-DD")
   * @param forceRefresh - Игнорировать кэш
   * @returns Расписание на неделю
   */
  async getScheduleForWeek(
    startDate: string,
    forceRefresh: boolean = false
  ): Promise<WeekSchedule> {
    console.log(`📅 Получение расписания на неделю с ${startDate}...`);

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const weekSchedule: WeekSchedule = {
      start_date: startDate,
      end_date: end.toISOString().split('T')[0],
      days: {},
    };

    // Получаем расписание на каждый день недели
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      try {
        const events = await this.getScheduleForDay(dateStr, forceRefresh);

        weekSchedule.days[dateStr] = {
          date: dateStr,
          events: events,
          custom_events: [], // TODO: Загрузить из Backend
          homework: [], // TODO: Загрузить из Backend
        };

        console.log(`✅ ${dateStr}: ${events.length} событий`);
      } catch (error) {
        console.error(`❌ Ошибка для ${dateStr}:`, error);
        weekSchedule.days[dateStr] = {
          date: dateStr,
          events: [],
          custom_events: [],
          homework: [],
        };
      }
    }

    console.log(`✅ Расписание на неделю получено`);
    return weekSchedule;
  }

  /**
   * Предзагрузка расписания на диапазон дат
   *
   * @param startDate - Дата начала
   * @param endDate - Дата окончания
   */
  async preloadRange(startDate: string, endDate: string): Promise<void> {
    console.log(`📦 Предзагрузка расписания с ${startDate} по ${endDate}...`);

    // Получаем credentials один раз
    const credentials = await this.credentialsManager.get();

    const start = new Date(startDate);
    const end = new Date(endDate);

    const promises: Promise<void>[] = [];

    for (
      let current = new Date(start);
      current <= end;
      current.setDate(current.getDate() + 1)
    ) {
      const dateStr = current.toISOString().split('T')[0];

      // Проверяем есть ли уже в кэше
      const cached = await this.cache.get(dateStr);
      if (cached) {
        console.log(`✅ ${dateStr} уже в кэше`);
        continue;
      }

      // Загружаем и сохраняем
      const promise = this.eiosClient
        .fetchSchedule({ credentials, targetDate: dateStr })
        .then((events) =>
          this.cache.save(dateStr, events, {
            ttl: this.config.cacheTTL,
            useCloudStorage: true,
          })
        )
        .then(() => console.log(`✅ ${dateStr} предзагружен`))
        .catch((error) => {
          console.error(`❌ Ошибка предзагрузки ${dateStr}:`, error);
        });

      promises.push(promise);

      // Небольшая задержка между запросами
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    await Promise.all(promises);
    console.log('✅ Предзагрузка завершена');
  }

  /**
   * Очистка кэша
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Получение размера кэша
   *
   * @returns Количество закэшированных дат
   */
  async getCacheSize(): Promise<number> {
    return this.cache.size();
  }

  /**
   * Получение списка закэшированных дат
   *
   * @returns Массив дат
   */
  async getCachedDates(): Promise<string[]> {
    return this.cache.getCachedDates();
  }

  /**
   * Проверка наличия credentials
   *
   * @returns true если есть сохраненные credentials
   */
  async hasCredentials(): Promise<boolean> {
    return this.credentialsManager.hasCredentials();
  }

  /**
   * Сохранение credentials
   *
   * @param username - Логин
   * @param password - Пароль
   * @param basePlanId - ID учебного плана
   */
  async saveCredentials(
    username: string,
    password: string,
    basePlanId: string
  ): Promise<void> {
    const credentials = {
      username,
      password,
      base_plan_id: basePlanId,
    };

    // Сначала валидируем credentials
    const isValid = await this.credentialsManager.validate(credentials);

    if (!isValid) {
      throw new Error('Неверный логин или пароль. Проверьте учетные данные.');
    }

    // Сохраняем на Backend
    await this.credentialsManager.save(credentials);
  }

  /**
   * Удаление credentials
   */
  async deleteCredentials(): Promise<void> {
    await this.credentialsManager.delete();

    // Также очищаем кэш расписания
    await this.clearCache();
  }

  /**
   * Получение логина (для отображения в UI)
   *
   * @returns Логин или null
   */
  async getUsername(): Promise<string | null> {
    return this.credentialsManager.getUsername();
  }

  /**
   * Тестирование подключения к ЭИОС (для проверки CORS)
   *
   * @returns true если подключение работает
   */
  async testConnection(): Promise<boolean> {
    return this.eiosClient.testConnection();
  }

  /**
   * Получение расписания с автоматической обработкой ошибок
   *
   * @param date - Дата
   * @returns Расписание или пустой массив при ошибке
   */
  async getScheduleSafe(date: string): Promise<ScheduleEvent[]> {
    try {
      return await this.getScheduleForDay(date);
    } catch (error) {
      console.error('Ошибка получения расписания:', error);

      // Если ошибка из-за отсутствия credentials
      if (error instanceof Error && error.message.includes('credentials')) {
        throw error; // Пробрасываем дальше для редиректа на /auth
      }

      // Для других ошибок возвращаем пустой массив
      return [];
    }
  }
}

/**
 * Создание экземпляра сервиса
 *
 * @param apiUrl - URL Backend API
 * @returns Экземпляр сервиса
 */
export function createScheduleService(apiUrl: string): ScheduleService {
  return new ScheduleService({ apiUrl });
}

/**
 * Хук для использования в React компонентах
 * (для Next.js)
 */
export function useScheduleService(apiUrl: string): ScheduleService {
  // В реальном приложении можно использовать useMemo
  return createScheduleService(apiUrl);
}
