import uvicorn
from fastapi import FastAPI
from app.api import endpoints
import logging
from logging.handlers import TimedRotatingFileHandler
import os

# Создаем директорию для логов, если не существует
os.makedirs("logs", exist_ok=True)

# Консоль логирование
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Файл логирование
file_handler = TimedRotatingFileHandler('logs/app.log', when='D', interval=30, backupCount=1, encoding='utf-8')
file_handler.setLevel(logging.INFO)
file_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(file_formatter)
logging.getLogger().addHandler(file_handler)

app = FastAPI()
app.include_router(endpoints.router)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)