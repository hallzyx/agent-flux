from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    vultr_api_key: str = ""
    vultr_base_url: str = "https://api.vultrinference.com/v1"
    vultr_executor_model: str = "llama-3.3-70b-instruct"
    vultr_critic_model: str = "llama-3.1-8b-instruct"
    demo_cache_enabled: bool = False
    frontend_origin: str = "http://localhost:3000"


settings = Settings()
