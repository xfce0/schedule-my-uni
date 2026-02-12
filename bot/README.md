# MSLU Schedule Bot

Простой Telegram бот для Mini App расписания МГЛУ.

## Функции

- Отвечает на команду `/start`
- Отправляет приветственное сообщение с описанием приложения
- Предоставляет кнопку для запуска Mini App
- Ссылка на исходный код на GitHub

## Установка

1. Установите зависимости:
```bash
pip install -r requirements.txt
```

2. Создайте файл `.env`:
```bash
cp .env.example .env
```

3. Добавьте токен бота в `.env`:
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

## Запуск

### Локально
```bash
python bot.py
```

### На сервере (с systemd)

1. Создайте systemd service файл `/etc/systemd/system/mslu-bot.service`:
```ini
[Unit]
Description=MSLU Schedule Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/mslu-schedule/bot
Environment="PATH=/opt/mslu-schedule/bot/venv/bin"
ExecStart=/opt/mslu-schedule/bot/venv/bin/python bot.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

2. Установите зависимости в venv:
```bash
cd /opt/mslu-schedule/bot
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. Запустите сервис:
```bash
systemctl daemon-reload
systemctl enable mslu-bot
systemctl start mslu-bot
```

4. Проверьте статус:
```bash
systemctl status mslu-bot
```

## Логи

Просмотр логов:
```bash
journalctl -u mslu-bot -f
```

## Примечания

- Бот работает в режиме polling (не webhook)
- Использует aiogram 3.x
- Поддерживает Web App для запуска Mini App
