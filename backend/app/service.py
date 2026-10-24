import json
import logging

from pydantic import ValidationError

from app.providers.fake import FakeProvider
from app.schemas import ProposalRequest, ProposalResponse

logger = logging.getLogger("proposalpilot")


def generate_proposal(
    request: ProposalRequest,
    provider: FakeProvider,
) -> ProposalResponse:
    # Never log job/profile text.
    logger.info(
        "Generating proposal platform=%s install=%s",
        request.job.platform,
        str(request.install_id)[:8],
        extra={"request_id": "-"},
    )

    if hasattr(provider, "generate_from_request"):
        raw = provider.generate_from_request(request)
    else:
        raw = provider.generate("unused")

    try:
        data = json.loads(raw)
        return ProposalResponse.model_validate(data)
    except (json.JSONDecodeError, ValidationError) as exc:
        raise ValueError("INVALID_UPSTREAM") from exc
