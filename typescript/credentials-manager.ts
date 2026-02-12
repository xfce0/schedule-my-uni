/**
 * Менеджер учетных данных ЭИОС
 * Получает credentials с Backend и хранит в памяти (не в localStorage!)
 */

import { UserCredentials, TelegramWebApp } from './types';

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

/**
 * Конфигурация менеджера
 */
interface CredentialsManagerConfig {
  /** URL Backend API */
  apiUrl: string;
}

/**
 * Менеджер учетных данных
 */
export class CredentialsManager {
  private config: CredentialsManagerConfig;

  /**
   * Кэшированные credentials (только в памяти!)
   * Очищаются при перезагрузке страницы
   */
  private cachedCredentials: UserCredentials | null = null;

  /**
   * @param config - Конфигурация
   */
  constructor(config: CredentialsManagerConfig) {
    this.config = config;

    // Очистка при закрытии страницы
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.clear();
      });
    }
  }

  /**
   * Получение initData от Telegram для авторизации
   *
   * @returns initData строка
   */
  private getTelegramInitData(): string {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      return window.Telegram.WebApp.initData;
    }
    throw new Error('Telegram WebApp недоступен');
  }

  /**
   * Проверка наличия сохраненных credentials
   *
   * @returns true если есть credentials на сервере
   */
  async hasCredentials(): Promise<boolean> {
    try {
      const initData = this.getTelegramInitData();

      const response = await fetch(`${this.config.apiUrl}/api/auth/check`, {
        method: 'GET',
        headers: {
          'X-Telegram-Init-Data': initData,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.has_credentials === true;
    } catch (error) {
      console.error('Ошибка проверки credentials:', error);
      return false;
    }
  }

  /**
   * Получение credentials с Backend
   *
   * @returns Учетные данные
   */
  async get(): Promise<UserCredentials> {
    // Если уже загружены в текущей сессии - возвращаем из памяти
    if (this.cachedCredentials) {
      console.log('✅ Credentials загружены из памяти');
      return this.cachedCredentials;
    }

    console.log('🔄 Получаю credentials с Backend...');

    const initData = this.getTelegramInitData();

    const response = await fetch(`${this.config.apiUrl}/api/user/credentials`, {
      method: 'GET',
      headers: {
        'X-Telegram-Init-Data': initData,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Учетные данные не найдены. Пожалуйста, введите логин и пароль.');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Валидация ответа
    if (!data.username || !data.password || !data.base_plan_id) {
      throw new Error('Неполные учетные данные от сервера');
    }

    // Сохраняем только в памяти!
    this.cachedCredentials = {
      username: data.username,
      password: data.password,
      base_plan_id: data.base_plan_id,
    };

    console.log('✅ Credentials получены и сохранены в памяти');
    console.log(`📝 Логин: ${this.cachedCredentials.username}`);

    return this.cachedCredentials;
  }

  /**
   * Сохранение новых credentials на Backend
   *
   * @param credentials - Учетные данные для сохранения
   */
  async save(credentials: UserCredentials): Promise<void> {
    console.log('🔄 Сохраняю credentials на Backend...');

    const initData = this.getTelegramInitData();

    const response = await fetch(`${this.config.apiUrl}/api/auth/credentials`, {
      method: 'POST',
      headers: {
        'X-Telegram-Init-Data': initData,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eios_username: credentials.username,
        eios_password: credentials.password,
        base_plan_id: credentials.base_plan_id,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка сохранения credentials');
    }

    // Сохраняем в памяти
    this.cachedCredentials = credentials;

    console.log('✅ Credentials сохранены на Backend');
  }

  /**
   * Удаление credentials с Backend и из памяти
   */
  async delete(): Promise<void> {
    console.log('🗑 Удаляю credentials...');

    const initData = this.getTelegramInitData();

    const response = await fetch(`${this.config.apiUrl}/api/user/credentials`, {
      method: 'DELETE',
      headers: {
        'X-Telegram-Init-Data': initData,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Ошибка удаления credentials');
    }

    // Очищаем из памяти
    this.clear();

    console.log('✅ Credentials удалены');
  }

  /**
   * Очистка кэша credentials (только из памяти)
   */
  clear(): void {
    this.cachedCredentials = null;
    console.log('🗑 Credentials очищены из памяти');
  }

  /**
   * Проверка валидности credentials через попытку входа
   *
   * @param credentials - Учетные данные для проверки
   * @returns true если валидны
   */
  async validate(credentials: UserCredentials): Promise<boolean> {
    try {
      console.log('🔍 Проверяю валидность credentials...');

      // Простой GET запрос к ЭИОС для проверки авторизации
      const authHeader = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;

      const response = await fetch(
        `https://eios.linguanet.ru/_layouts/sinc/ia/v1.0/pages/MySchedule.aspx?base_plan_ids=${credentials.base_plan_id}`,
        {
          method: 'HEAD', // Только проверка, не загружаем контент
          headers: {
            Authorization: authHeader,
          },
          credentials: 'include',
        }
      );

      const isValid = response.ok;

      if (isValid) {
        console.log('✅ Credentials валидны');
      } else {
        console.log('❌ Credentials невалидны');
      }

      return isValid;
    } catch (error) {
      console.error('Ошибка валидации:', error);
      return false;
    }
  }

  /**
   * Получение только логина (для отображения в UI)
   *
   * @returns Логин или null
   */
  async getUsername(): Promise<string | null> {
    try {
      if (this.cachedCredentials) {
        return this.cachedCredentials.username;
      }

      const credentials = await this.get();
      return credentials.username;
    } catch (error) {
      return null;
    }
  }

  /**
   * Обновление credentials (например, при смене пароля)
   *
   * @param credentials - Новые учетные данные
   */
  async update(credentials: UserCredentials): Promise<void> {
    // Сначала валидируем
    const isValid = await this.validate(credentials);

    if (!isValid) {
      throw new Error('Неверный логин или пароль');
    }

    // Сохраняем
    await this.save(credentials);

    console.log('✅ Credentials обновлены');
  }
}

/**
 * Создание экземпляра менеджера credentials
 *
 * @param apiUrl - URL Backend API
 * @returns Экземпляр менеджера
 */
export function createCredentialsManager(apiUrl: string): CredentialsManager {
  return new CredentialsManager({ apiUrl });
}
