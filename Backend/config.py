from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "ticketing"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    SEAT_LOCK_TTL_SECONDS: int = 600

    RABBITMQ_HOST: str = "localhost"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()