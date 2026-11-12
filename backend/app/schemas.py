from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


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

    @field_validator("questions_to_ask", "warnings", mode="before")
    @classmethod
    def coerce_str_list(cls, value: object) -> object:
        # Models sometimes return a single string or null instead of a list.
        if value is None:
            return []
        if isinstance(value, str):
            return [value] if value.strip() else []
        return value


# Strict JSON schema for OpenAI Structured Outputs; mirrors ProposalResponse.
PROPOSAL_JSON_SCHEMA: dict = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "proposal",
        "suggested_price",
        "delivery_days",
        "questions_to_ask",
        "warnings",
    ],
    "properties": {
        "proposal": {"type": "string"},
        "suggested_price": {
            "type": "object",
            "additionalProperties": False,
            "required": ["amount", "currency", "rationale"],
            "properties": {
                "amount": {"type": "number"},
                "currency": {"type": "string"},
                "rationale": {"type": "string"},
            },
        },
        "delivery_days": {"type": "integer"},
        "questions_to_ask": {"type": "array", "items": {"type": "string"}},
        "warnings": {"type": "array", "items": {"type": "string"}},
    },
}


CONVERSATION_MAX_CHARS = 24_000


def _strip_controls(value: object) -> object:
    if isinstance(value, str):
        return "".join(ch for ch in value if ch in ("\n", "\t") or ord(ch) >= 32)
    return value


class ConversationMessage(BaseModel):
    """One chat message; names are replaced by roles before sending."""

    role: Literal["client", "me"]
    text: str = Field(min_length=1, max_length=4_000)

    _clean = field_validator("text", mode="before")(_strip_controls)


class ConversationRequest(BaseModel):
    install_id: UUID
    platform: Literal["fiverr", "upwork", "generic"] = "fiverr"
    messages: list[ConversationMessage] = Field(min_length=1, max_length=80)

    @model_validator(mode="after")
    def limit_total_size(self) -> "ConversationRequest":
        if sum(len(m.text) for m in self.messages) > CONVERSATION_MAX_CHARS:
            raise ValueError("Conversation is too long")
        return self


class ConversationAnalysis(BaseModel):
    has_project: bool
    title: str = ""
    summary: str = ""
    requirements: list[str] = Field(default_factory=list)
    budget_text: str | None = None
    deadline: str | None = None
    reason: str = ""

    @field_validator("requirements", mode="before")
    @classmethod
    def coerce_list(cls, value: object) -> object:
        if value is None:
            return []
        if isinstance(value, str):
            return [value] if value.strip() else []
        return value

    @field_validator("budget_text", "deadline", mode="before")
    @classmethod
    def empty_to_none(cls, value: object) -> object:
        if isinstance(value, str) and value.strip().lower() in ("", "none", "null", "n/a"):
            return None
        return value


# Strict JSON schema for OpenAI Structured Outputs; mirrors ConversationAnalysis.
CONVERSATION_JSON_SCHEMA: dict = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "has_project",
        "title",
        "summary",
        "requirements",
        "budget_text",
        "deadline",
        "reason",
    ],
    "properties": {
        "has_project": {"type": "boolean"},
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "requirements": {"type": "array", "items": {"type": "string"}},
        "budget_text": {"type": ["string", "null"]},
        "deadline": {"type": ["string", "null"]},
        "reason": {"type": "string"},
    },
}


class ErrorBody(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorBody


class HealthResponse(BaseModel):
    status: str
    version: str
