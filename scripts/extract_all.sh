#!/bin/bash
# Скрипт для извлечения всех данных из исходных файлов

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=== Извлечение данных из Excel ==="
python3 scripts/extract_excel.py

echo ""
echo "=== Извлечение данных из PowerPoint ==="
python3 scripts/extract_pptx.py

echo ""
echo "=== Извлечение ресурсов из PowerPoint ==="
python3 scripts/extract_resources.py

echo ""
echo "=== Нормализация и объединение данных ==="
python3 scripts/normalize_data.py

echo ""
echo "=== Готово! Данные сохранены в frontend/data/ ==="
