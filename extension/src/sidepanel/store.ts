import { create } from 'zustand';
import type { JobPost } from '../shared/types';
import type { Length, ProposalApiResponse, Tone } from '../shared/api';

export type UiError = {
  code: string;
  message: string;
  retryAfterSeconds?: number;
};

export type PanelState =
  | { status: 'idle' }
  | { status: 'detecting' }
  | { status: 'ready'; job: JobPost; editedDescription: string }
  | { status: 'generating'; job: JobPost; editedDescription: string }
  | {
      status: 'result';
      job: JobPost;
      editedDescription: string;
      result: ProposalApiResponse;
      draft: string;
      tone: Tone;
      length: Length;
    }
  | {
      status: 'error';
      error: UiError;
      job?: JobPost;
      editedDescription?: string;
    };

type Store = {
  state: PanelState;
  tone: Tone;
  length: Length;
  setTone: (tone: Tone) => void;
  setLength: (length: Length) => void;
  setState: (state: PanelState) => void;
  /** Dev-only state switcher fixtures */
  forceStatus: (status: PanelState['status']) => void;
};

const mockJob: JobPost = {
  platform: 'upwork',
  url: 'https://www.upwork.com/jobs/~demo',
  title: 'Demo FastAPI webhook project',
  description: 'Build idempotent Stripe webhooks with tests and short docs.',
  budgetText: '$500',
  skills: ['Python', 'FastAPI'],
  extractedAt: new Date().toISOString(),
  truncated: false,
};

const mockResult: ProposalApiResponse = {
  proposal:
    'Hi — I can help with Stripe webhooks on FastAPI using my backend experience. '
    + 'I would deliver idempotent handlers, tests, and short docs. What is your preferred start date?',
  suggested_price: {
    amount: 500,
    currency: 'USD',
    rationale: 'Anchored to posted budget.',
  },
  delivery_days: 5,
  questions_to_ask: ['What is your preferred start date?'],
  warnings: ['Demo fixture'],
};

export const usePanelStore = create<Store>((set, get) => ({
  state: { status: 'idle' },
  tone: 'professional',
  length: 'short',
  setTone: (tone) => set({ tone }),
  setLength: (length) => set({ length }),
  setState: (state) => set({ state }),
  forceStatus: (status) => {
    if (!import.meta.env.DEV) return;
    const tone = get().tone;
    const length = get().length;
    switch (status) {
      case 'idle':
        set({ state: { status: 'idle' } });
        break;
      case 'detecting':
        set({ state: { status: 'detecting' } });
        break;
      case 'ready':
        set({
          state: {
            status: 'ready',
            job: mockJob,
            editedDescription: mockJob.description,
          },
        });
        break;
      case 'generating':
        set({
          state: {
            status: 'generating',
            job: mockJob,
            editedDescription: mockJob.description,
          },
        });
        break;
      case 'result':
        set({
          state: {
            status: 'result',
            job: mockJob,
            editedDescription: mockJob.description,
            result: mockResult,
            draft: mockResult.proposal,
            tone,
            length,
          },
        });
        break;
      case 'error':
        set({
          state: {
            status: 'error',
            error: { code: 'NETWORK', message: 'Demo network error.' },
            job: mockJob,
            editedDescription: mockJob.description,
          },
        });
        break;
    }
  },
}));
