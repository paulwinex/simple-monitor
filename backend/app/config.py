from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="SIMPLE_MONITOR_"
    )

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    DB_HOST: str = 'localhost'
    DB_PORT: int = 5432

    @property
    def DATABASE_URL(self):
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    RESAMPLE_MINUTE_INTERVAL: int = 60
    RESAMPLE_HOURLY_INTERVAL: int = 3600

    RETENTION_RAW_DAYS: int = 90
    RETENTION_MINUTE_DAYS: int = 90
    RETENTION_HOURLY_DAYS: int = 365


def get_settings(**kwargs) -> Settings:
    return Settings(**kwargs)


settings = get_settings()