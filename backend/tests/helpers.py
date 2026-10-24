def sample_body(**overrides: object) -> dict:
    body: dict = {
        "install_id": "11111111-1111-4111-8111-111111111111",
        "job": {
            "platform": "upwork",
            "title": "Build a FastAPI webhook service",
            "description": "Need Stripe webhooks with tests and docs. UNIQUE_JOB_MARKER_XYZ.",
            "budget_text": "$500",
            "skills": ["Python", "FastAPI"],
        },
        "profile": {
            "name": "Alex Freelancer",
            "headline": "Python backend developer",
            "skills": ["Python", "FastAPI", "Stripe"],
            "years_experience": 5,
            "hourly_rate": 45,
            "currency": "USD",
            "highlights": ["Shipped Stripe billing for a SaaS"],
        },
        "options": {"tone": "professional", "length": "short"},
    }
    body.update(overrides)
    return body
