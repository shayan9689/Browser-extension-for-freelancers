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

export type ConversationApiRequest = {
  install_id: string;
  platform: 'fiverr' | 'upwork' | 'generic';
  messages: { role: 'client' | 'me'; text: string }[];
};

export type ConversationAnalysis = {
  has_project: boolean;
  title: string;
  summary: string;
  requirements: string[];
  budget_text: string | null;
  deadline: string | null;
  reason: string;
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
  // Dev-only fallback; the DEV branch is stripped from production bundles.
  if (!url && import.meta.env.DEV) return 'http://localhost:8000';
  return (url ?? '').replace(/\/$/, '');
}

async function postJson(path: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}${path}`, {
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
  return json;
}

export async function generateProposal(
  body: ProposalApiRequest,
  signal?: AbortSignal,
): Promise<ProposalApiResponse> {
  const data = (await postJson('/v1/proposals', body, signal)) as ProposalApiResponse;
  if (typeof data.proposal !== 'string' || !data.suggested_price) {
    throw new ApiError('INVALID_RESPONSE', 'Server response was missing required fields.');
  }
  return data;
}

/** Ask the backend whether a chat contains a project and extract its details. */
export async function analyzeConversation(
  body: ConversationApiRequest,
  signal?: AbortSignal,
): Promise<ConversationAnalysis> {
  const data = (await postJson('/v1/conversation', body, signal)) as ConversationAnalysis;
  if (typeof data.has_project !== 'boolean') {
    throw new ApiError('INVALID_RESPONSE', 'Server response was missing required fields.');
  }
  return {
    ...data,
    title: data.title ?? '',
    summary: data.summary ?? '',
    requirements: Array.isArray(data.requirements) ? data.requirements : [],
    reason: data.reason ?? '',
  };
}
