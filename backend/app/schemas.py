from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class JobInput(BaseModel):
    platform: Literal["fiverr", "upwork", "generic"]
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=12_000)
    budget_text: str | None = Field(default=None, max_length=200)
    skills: list[str] = Field(default_factory=list, max_length=30)

    @field_validator("title", "description", "budget_text", mode="before")
    @classmethod
    def strip_controls(cls, value: object) -> object:
        if isinstance(value, str):
            return "".join(
                ch for ch in value if ch in ("\n", "\t") or ord(ch) >= 32
            )
        return value

    @field_validator("skills")
    @classmethod
    def limit_skill_lengths(cls, value: list[str]) -> list[str]:
        return [s[:80] for s in value][:30]


class ProfileInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    headline: str = Field(min_length=1, max_length=200)
    skills: list[str] = Field(default_factory=list, max_length=30)
    years_experience: int = Field(ge=0, le=60)
    hourly_rate: float | None = Field(default=None, ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    highlights: list[str] = Field(default_factory=list, max_length=5)


class OptionsInput(BaseModel):
    tone: Literal["friendly", "professional", "concise"] = "professional"
    length: Literal["short", "medium"] = "short"


class ProposalRequest(BaseModel):
    install_id: UUID
    job: JobInput
    profile: ProfileInput
    options: OptionsInput = Field(default_factory=OptionsInput)


class SuggestedPrice(BaseModel):
    amount: float
    currency: str
    rationale: str


class ProposalResponse(BaseModel):
    proposal: str
    suggested_price: SuggestedPrice
    delivery_days: int
    questions_to_ask: list[str]
    warnings: list[str] = Field(default_factory=list)


class ErrorBody(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorBody


class HealthResponse(BaseModel):
    status: str
    version: str
