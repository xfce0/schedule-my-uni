/**
 * Система кэширования расписания
 * Использует Telegram CloudStorage или IndexedDB/localStorage как fallback
 */

import { ScheduleEvent, CacheItem, CacheOptions, TelegramWebApp } from './types';

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

/**
 * Префикс для ключей кэша
 */
const CACHE_PREFIX = 'schedule_';

/**
 * TTL по умолчанию: 24 часа
 */
const DEFAULT_TTL = 24 * 60 * 60 * 1000;

/**
 * Менеджер кэша расписания
 */
export class ScheduleCache {
  /**
   * Проверка доступности Telegram CloudStorage
   */
  private isCloudStorageAvailable(): boolean {
    return !!(
      typeof window !== 'undefined' &&
      window.Telegram?.WebApp?.CloudStorage
    );
  }

  /**
   * Проверка доступности IndexedDB
   */
  private isIndexedDBAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  /**
   * Формирование ключа кэша
   *
   * @param date - Дата в формате "YYYY-MM-DD"
   * @returns Ключ для хранения
   */
  private getCacheKey(date: string): string {
    return `${CACHE_PREFIX}${date}`;
  }

  /**
   * Проверка актуальности кэша
   *
   * @param item - Элемент кэша
   * @returns true если актуален, false если устарел
   */
  private isValid(item: CacheItem): boolean {
    if (!item.ttl) {
      return true; // Бесконечный кэш
    }

    const now = Date.now();
    const age = now - item.timestamp;

    return age < item.ttl;
  }

  /**
   * Сохранение в Telegram CloudStorage
   *
   * @param key - Ключ
   * @param data - Данные
   */
  private saveToCloudStorage(key: string, data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      window.Telegram!.WebApp.CloudStorage.setItem(
        key,
        data,
        (error, success) => {
          if (error) {
            reject(error);
          } else {
            console.log(`☁️ Сохранено в CloudStorage: ${key}`);
            resolve();
          }
        }
      );
    });
  }

  /**
   * Получение из Telegram CloudStorage
   *
   * @param key - Ключ
   * @returns Данные или null
   */
  private getFromCloudStorage(key: string): Promise<string | null> {
    return new Promise((resolve) => {
      window.Telegram!.WebApp.CloudStorage.getItem(key, (error, value) => {
        if (error || !value) {
          resolve(null);
        } else {
          console.log(`☁️ Загружено из CloudStorage: ${key}`);
          resolve(value);
        }
      });
    });
  }

  /**
   * Удаление из Telegram CloudStorage
   *
   * @param key - Ключ
   */
  private removeFromCloudStorage(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      window.Telegram!.WebApp.CloudStorage.removeItem(key, (error, success) => {
        if (error) {
          reject(error);
        } else {
          console.log(`☁️ Удалено из CloudStorage: ${key}`);
          resolve();
        }
      });
    });
  }

  /**
   * Сохранение в localStorage
   *
   * @param key - Ключ
   * @param data - Данные
   */
  private saveToLocalStorage(key: string, data: string): void {
    try {
      localStorage.setItem(key, data);
      console.log(`💾 Сохранено в localStorage: ${key}`);
    } catch (error) {
      console.error('Ошибка сохранения в localStorage:', error);
    }
  }

  /**
   * Получение из localStorage
   *
   * @param key - Ключ
   * @returns Данные или null
   */
  private getFromLocalStorage(key: string): string | null {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        console.log(`💾 Загружено из localStorage: ${key}`);
      }
      return data;
    } catch (error) {
      console.error('Ошибка чтения из localStorage:', error);
      return null;
    }
  }

  /**
   * Удаление из localStorage
   *
   * @param key - Ключ
   */
  private removeFromLocalStorage(key: string): void {
    try {
      localStorage.removeItem(key);
      console.log(`💾 Удалено из localStorage: ${key}`);
    } catch (error) {
      console.error('Ошибка удаления из localStorage:', error);
    }
  }

  /**
   * Сохранение расписания в кэш
   *
   * @param date - Дата (формат: "YYYY-MM-DD")
   * @param events - События расписания
   * @param options - Опции кэширования
   */
  async save(
    date: string,
    events: ScheduleEvent[],
    options?: CacheOptions
  ): Promise<void> {
    const key = this.getCacheKey(date);
    const ttl = options?.ttl || DEFAULT_TTL;

    const cacheItem: CacheItem<ScheduleEvent[]> = {
      data: events,
      timestamp: Date.now(),
      ttl: ttl,
    };

    const serialized = JSON.stringify(cacheItem);

    // Приоритет: CloudStorage > localStorage
    if (this.isCloudStorageAvailable() && options?.useCloudStorage !== false) {
      try {
        await this.saveToCloudStorage(key, serialized);
      } catch (error) {
        console.warn('Fallback to localStorage из-за ошибки CloudStorage');
        this.saveToLocalStorage(key, serialized);
      }
    } else {
      this.saveToLocalStorage(key, serialized);
    }
  }

  /**
   * Получение расписания из кэша
   *
   * @param date - Дата (формат: "YYYY-MM-DD")
   * @returns События или null если не найдено/устарело
   */
  async get(date: string): Promise<ScheduleEvent[] | null> {
    const key = this.getCacheKey(date);

    let serialized: string | null = null;

    // Приоритет: CloudStorage > localStorage
    if (this.isCloudStorageAvailable()) {
      try {
        serialized = await this.getFromCloudStorage(key);
      } catch (error) {
        console.warn('Fallback to localStorage из-за ошибки CloudStorage');
      }
    }

    // Fallback на localStorage
    if (!serialized) {
      serialized = this.getFromLocalStorage(key);
    }

    if (!serialized) {
      console.log(`📭 Кэш не найден для ${date}`);
      return null;
    }

    try {
      const cacheItem: CacheItem<ScheduleEvent[]> = JSON.parse(serialized);

      // Проверка актуальности
      if (!this.isValid(cacheItem)) {
        console.log(`⏰ Кэш устарел для ${date}`);
        await this.remove(date); // Удаляем устаревший кэш
        return null;
      }

      console.log(`✅ Кэш найден для ${date}: ${cacheItem.data.length} событий`);
      return cacheItem.data;
    } catch (error) {
      console.error('Ошибка парсинга кэша:', error);
      return null;
    }
  }

  /**
   * Удаление расписания из кэша
   *
   * @param date - Дата (формат: "YYYY-MM-DD")
   */
  async remove(date: string): Promise<void> {
    const key = this.getCacheKey(date);

    if (this.isCloudStorageAvailable()) {
      try {
        await this.removeFromCloudStorage(key);
      } catch (error) {
        console.warn('Ошибка удаления из CloudStorage');
      }
    }

    this.removeFromLocalStorage(key);
  }

  /**
   * Очистка всего кэша расписания
   */
  async clear(): Promise<void> {
    console.log('🗑 Очистка кэша расписания...');

    // Очистка CloudStorage
    if (this.isCloudStorageAvailable()) {
      try {
        await new Promise<void>((resolve, reject) => {
          window.Telegram!.WebApp.CloudStorage.getKeys((error, keys) => {
            if (error) {
              reject(error);
              return;
            }

            const scheduleKeys = keys.filter((key) =>
              key.startsWith(CACHE_PREFIX)
            );

            if (scheduleKeys.length === 0) {
              resolve();
              return;
            }

            window.Telegram!.WebApp.CloudStorage.removeItems(
              scheduleKeys,
              (error, success) => {
                if (error) {
                  reject(error);
                } else {
                  console.log(`☁️ Удалено ${scheduleKeys.length} ключей из CloudStorage`);
                  resolve();
                }
              }
            );
          });
        });
      } catch (error) {
        console.warn('Ошибка очистки CloudStorage');
      }
    }

    // Очистка localStorage
    try {
      const keys = Object.keys(localStorage);
      const scheduleKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

      for (const key of scheduleKeys) {
        localStorage.removeItem(key);
      }

      console.log(`💾 Удалено ${scheduleKeys.length} ключей из localStorage`);
    } catch (error) {
      console.error('Ошибка очистки localStorage:', error);
    }

    console.log('✅ Кэш полностью очищен');
  }

  /**
   * Получение размера кэша
   *
   * @returns Количество закэшированных дат
   */
  async size(): Promise<number> {
    let count = 0;

    // CloudStorage
    if (this.isCloudStorageAvailable()) {
      try {
        await new Promise<void>((resolve, reject) => {
          window.Telegram!.WebApp.CloudStorage.getKeys((error, keys) => {
            if (!error) {
              count += keys.filter((key) => key.startsWith(CACHE_PREFIX)).length;
            }
            resolve();
          });
        });
      } catch (error) {
        console.warn('Ошибка подсчета CloudStorage');
      }
    }

    // localStorage
    try {
      const keys = Object.keys(localStorage);
      count += keys.filter((key) => key.startsWith(CACHE_PREFIX)).length;
    } catch (error) {
      console.error('Ошибка подсчета localStorage:', error);
    }

    return count;
  }

  /**
   * Получение всех закэшированных дат
   *
   * @returns Массив дат в формате "YYYY-MM-DD"
   */
  async getCachedDates(): Promise<string[]> {
    const dates: Set<string> = new Set();

    // CloudStorage
    if (this.isCloudStorageAvailable()) {
      try {
        await new Promise<void>((resolve) => {
          window.Telegram!.WebApp.CloudStorage.getKeys((error, keys) => {
            if (!error) {
              keys
                .filter((key) => key.startsWith(CACHE_PREFIX))
                .forEach((key) => {
                  const date = key.replace(CACHE_PREFIX, '');
                  dates.add(date);
                });
            }
            resolve();
          });
        });
      } catch (error) {
        console.warn('Ошибка получения ключей CloudStorage');
      }
    }

    // localStorage
    try {
      const keys = Object.keys(localStorage);
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX))
        .forEach((key) => {
          const date = key.replace(CACHE_PREFIX, '');
          dates.add(date);
        });
    } catch (error) {
      console.error('Ошибка получения ключей localStorage:', error);
    }

    return Array.from(dates).sort();
  }

  /**
   * Предзагрузка расписания на диапазон дат
   *
   * @param startDate - Дата начала
   * @param endDate - Дата окончания
   * @param fetcher - Функция для получения расписания
   */
  async preload(
    startDate: string,
    endDate: string,
    fetcher: (date: string) => Promise<ScheduleEvent[]>
  ): Promise<void> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log(`📦 Предзагрузка расписания с ${startDate} по ${endDate}...`);

    const promises: Promise<void>[] = [];

    for (
      let current = new Date(start);
      current <= end;
      current.setDate(current.getDate() + 1)
    ) {
      const dateStr = current.toISOString().split('T')[0];

      // Проверяем есть ли уже в кэше
      const cached = await this.get(dateStr);
      if (cached) {
        console.log(`✅ ${dateStr} уже в кэше`);
        continue;
      }

      // Загружаем и сохраняем
      const promise = fetcher(dateStr)
        .then((events) => this.save(dateStr, events))
        .catch((error) => {
          console.error(`❌ Ошибка загрузки ${dateStr}:`, error);
        });

      promises.push(promise);
    }

    await Promise.all(promises);
    console.log('✅ Предзагрузка завершена');
  }
}

/**
 * Экспорт синглтона кэша
 */
export const scheduleCache = new ScheduleCache();
