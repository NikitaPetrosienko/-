# Быстрый старт

## Шаг 1: Извлечение данных

Запустите скрипт извлечения данных:

```bash
./scripts/extract_all.sh
```

Или вручную:

```bash
python3 scripts/extract_excel.py
python3 scripts/extract_pptx.py
python3 scripts/normalize_data.py
```

## Шаг 2: Локальный запуск (для тестирования)

```bash
cd frontend
python3 -m http.server 8000
```

Откройте в браузере: `http://localhost:8000`

## Шаг 3: Развертывание с Docker

```bash
# Сборка образа
docker build -t competency-model .

# Запуск контейнера
docker run -d -p 8080:80 --name competency-model competency-model
```

Или с Docker Compose:

```bash
docker-compose up -d
```

Приложение будет доступно на `http://localhost:8080`

## Проверка работоспособности

1. Откройте приложение в браузере
2. Выберите категорию персонала
3. Просмотрите модель компетенций
4. Откройте детали компетенции
5. Переключайтесь между уровнями и просматривайте действия

## Устранение неполадок

### Данные не загружаются

- Убедитесь, что файлы `frontend/data/data.json` существуют
- Проверьте консоль браузера на наличие ошибок
- Убедитесь, что сервер правильно обслуживает JSON файлы

### Компетенции не отображаются

- Проверьте, что данные были успешно извлечены из Excel
- Проверьте файл `frontend/data/model.json`

### Действия не отображаются

- Проверьте файл `frontend/data/actions.json`
- Проверьте файл `frontend/data/unmatched_actions.json` для несопоставленных действий
- Убедитесь, что скрипт нормализации выполнен успешно
