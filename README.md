# Dashboard WAPE

Данный проект представляет собой веб-приложение (дашборд) для отслеживания качества прогнозирования, где основной метрикой качества является WAPE (Weighted Absolute Percentage Error). Приложение состоит из фронтенд-части на HTML/JS/CSS, бекенд-части на Python (FastAPI) и базы данных, с конфигурацией через Docker и docker-compose.

## Структура проекта

```
dashboard-wape/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints.py
│   │   ├── services/
│   │   │   └── database.py
│   │   ├── config.py
│   │   ├── main.py
│   │   └── models.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .env
├── nginx/
│   ├── html/
│   │   ├── css/
│   │   │   └── styles.css
│   │   ├── js/
│   │   │   ├── charts.js
│   │   │   ├── main.js
│   │   │   └── quotes.js
│   │   └── index.html
│   └── default.conf
├── docker-compose.yml
└── Dockerfile
```

## Установка и запуск

### Предварительные условия

- Docker
- Docker Compose

### Шаг 1: Клонируйте репозиторий

```bash
git clone https://github.com/shakhbanov/dashboard-wape.git
cd dashboard-wape
```

### Шаг 2: Настройка переменных окружения

Отредактируйте файл `.env` в папке `backend`, указав подключение к базе данных:

```env
POSTGRESQL_HOST=your_host
POSTGRESQL_PORT=5432
POSTGRESQL_USER=your_user
POSTGRESQL_PASSWORD=your_password
POSTGRESQL_DBNAME=your_dbname
```

### Шаг 3: Указание таблиц базы данных

Откройте файл `backend/app/services/database.py` и укажите таблицы, используемые в вашем проекте.

### Шаг 4: Запуск приложения с Docker Compose

В корневой директории проекта выполните:

```bash
docker-compose up --build
```

После запуска:

- API доступен по адресу: `http://localhost:8000`
- Фронтенд доступен по адресу: `http://localhost:8080`

## Технические детали

- **FastAPI** используется для реализации бекенда.
- В качестве базы данных рекомендуется использовать PostgreSQL.
- Nginx используется как веб-сервер и прокси для фронтенда и бекенда.
- Статические файлы фронтенда расположены в директории `nginx/html`.


## Полезные команды

- Пересборка контейнеров:
```bash
docker-compose up --build -d
```

- Остановка контейнеров:
```bash
docker-compose down
```

- Логи контейнеров:
```bash
docker-compose logs -f
```

## Лицензия

Проект распространяется под лицензией MIT. Подробнее смотрите файл [LICENSE](LICENSE).

