# Модель цифровых компетенций

Статический веб-сервис для визуализации модели цифровых компетенций и развивающих действий. Данные извлекаются из Excel и PowerPoint и сохраняются в `frontend/data/`.

## Структура проекта

```
.
├── data/                  # Исходные файлы данных
│   ├── Модель_цифровых_компетенций.xlsx
│   ├── Меню развивающих действий_ШЦР.pptx
│   └── zn_logo.svg
├── scripts/               # Скрипты извлечения данных
│   ├── extract_all.sh     # Полный прогон (Excel + PPTX + нормализация)
│   ├── extract_excel.py   # Извлечение данных из Excel
│   ├── extract_pptx.py    # Извлечение действий из PowerPoint
│   ├── extract_resources.py # Извлечение ресурсов из PowerPoint
│   └── normalize_data.py  # Нормализация и объединение данных
├── frontend/              # Фронтенд приложение
│   ├── index.html
│   ├── css/styles.css
│   ├── js/
│   │   ├── app.js
│   │   ├── router.js
│   │   └── data.js
│   └── data/
│       ├── actions.json   # Развивающие действия (генерируется)
│       ├── model.json     # Модель компетенций (генерируется)
│       ├── data.json      # Объединенные данные (генерируется)
│       ├── resources.json # Ресурсы по кластерам (генерируется)
│       └── unmatched_actions.json # Несопоставленные действия (генерируется)
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
└── requirements.txt
```

## Установка и запуск

### Предварительные требования

- Python 3.8+
- pip
- Docker и Docker Compose (опционально)

### Извлечение данных

1. Установите зависимости Python:
```bash
pip install -r requirements.txt
```

2. Убедитесь, что исходные файлы лежат в `data/`:
   - `data/Модель_цифровых_компетенций.xlsx`
   - `data/Меню развивающих действий_ШЦР.pptx`

3. Запустите полный прогон:
```bash
bash scripts/extract_all.sh
```

После выполнения скриптов в `frontend/data/` будут созданы JSON файлы:
- `model.json` - модель компетенций
- `actions.json` - развивающие действия
- `resources.json` - ресурсы по кластерам
- `data.json` - объединенные данные для фронтенда
- `unmatched_actions.json` - несопоставленные действия

### Локальный запуск

```bash
python3 -m http.server 8000 --directory frontend
```

Откройте в браузере: `http://localhost:8000`

### Docker

Сборка и запуск:
```bash
docker build -t competency-model .
docker run --rm -p 8080:8080 competency-model
```

Или через Compose:
```bash
docker-compose up --build
```

Приложение будет доступно по адресу: `http://localhost:8080`

### Оффлайн установка зависимостей (Astra Linux 1.7.5)

1. На машине с интернетом скачайте колеса под нужный Python:
```bash
pip download -r requirements.txt -d wheels
```

2. Передайте папку `wheels/` в закрытый контур и установите:
```bash
pip install --no-index --find-links wheels -r requirements.txt
```

## Использование

1. Выберите категорию персонала на первом экране.
2. Откройте кластер и компетенцию.
3. Просматривайте уровни, действия 70/20/10 и ресурсы из модалки.

## Поддержка

Если не отображаются действия или ресурсы:
- проверьте исходные файлы в `data/`;
- выполните `bash scripts/extract_all.sh`;
- посмотрите `frontend/data/unmatched_actions.json`.

## Лицензия

Внутренний корпоративный проект.
