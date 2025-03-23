import os
from pydantic import BaseSettings, Field

class Settings(BaseSettings):
    postgres_host: str = Field(..., env="POSTGRESQL_HOST")
    postgres_port: int = Field(..., env="POSTGRESQL_PORT")
    postgres_user: str = Field(..., env="POSTGRESQL_USER")
    postgres_password: str = Field(..., env="POSTGRESQL_PASSWORD")
    postgres_dbname: str = Field(..., env="POSTGRESQL_DBNAME")

    class Config:
        env_file = ".env"

settings = Settings()
