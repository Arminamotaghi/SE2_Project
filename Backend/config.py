from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int

    SEAT_LOCK_TTL_SECONDS: int = 600

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")


settings = Settings()