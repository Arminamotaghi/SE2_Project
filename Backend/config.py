from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Redis Configuration ---
    REDIS_HOST: str
    REDIS_PORT: int

    # --- PostgreSQL Configuration ---
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int

    # --- Business Logic ---
    SEAT_LOCK_TTL_SECONDS: int

    # --- RabbitMQ ---
    RABBITMQ_HOST: str

    # --- Security (JWT) ---
    SECRET_KEY: str
    ALGORITHM: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()