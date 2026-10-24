export type Tone = 'friendly' | 'professional' | 'concise';
export type Length = 'short' | 'medium';

export type ProposalApiRequest = {
  install_id: string;
  job: {
    platform: 'fiverr' | 'upwork' | 'generic';
    title: string;
    description: string;
    budget_text?: string | null;
    skills: string[];
  };
  profile: {
    name: string;
    headline: string;
    skills: string[];
    years_experience: number;
    hourly_rate?: number | null;
    currency: string;
    highlights: string[];
  };
  options: { tone: Tone; length: Length };
};

export type ProposalApiResponse = {
  proposal: string;
  suggested_price: { amount: number; currency: string; rationale: string };
  delivery_days: number;
  questions_to_ask: string[];
  warnings: string[];
};

export type ApiErrorCode =
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'SERVER'
  | 'INVALID_RESPONSE'
  | 'INVALID_INPUT'
  | 'UPSTREAM'
  | 'INTERNAL';

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function apiBaseUrl(): string {
  const url = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return (url ?? 'http://localhost:8000').replace(/\/$/, '');
}

export async function generateProposal(
  body: ProposalApiRequest,
  signal?: AbortSignal,
): Promise<ProposalApiResponse> {
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}/v1/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError('NETWORK', 'Could not reach the ProposalPilot server.');
  }

  if (res.status === 429) {
    const retry = Number(res.headers.get('Retry-After') ?? '60');
    throw new ApiError(
      'RATE_LIMITED',
      'Rate limit reached. Please wait before trying again.',
      Number.isFinite(retry) ? retry : 60,
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiError('INVALID_RESPONSE', 'Server returned an unreadable response.');
  }

  if (!res.ok) {
    const errObj = json as { error?: { code?: string; message?: string } };
    const code = (errObj.error?.code as ApiErrorCode | undefined) ?? 'SERVER';
    throw new ApiError(code, errObj.error?.message ?? `Server error (${res.status})`);
  }

  const data = json as ProposalApiResponse;
  if (typeof data.proposal !== 'string' || !data.suggested_price) {
    throw new ApiError('INVALID_RESPONSE', 'Server response was missing required fields.');
  }
  return data;
}
