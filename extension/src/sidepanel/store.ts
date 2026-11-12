import { create } from 'zustand';
import type { JobPost } from '../shared/types';
import type { Length, ProposalApiResponse, Tone } from '../shared/api';
import {
  writePanel,
  type PanelState,
  type PersistedPanel,
  type UiError,
} from '../shared/panelState';

export type { PanelState, UiError };

type Store = {
  state: PanelState;
  tone: Tone;
  length: Length;
  /** When this view last changed or adopted the shared state. */
  updatedAt: number;
  setTone: (tone: Tone) => void;
  setLength: (length: Length) => void;
  /** Change the screen and share it with the other views / next popup. */
  setState: (state: PanelState) => void;
  /** Like setState, but resolves once the shared copy is written. */
  commit: (state: PanelState) => Promise<void>;
  /** Adopt shared state written elsewhere, without writing it back. */
  hydrate: (panel: Pick<PersistedPanel, 'state' | 'tone' | 'length' | 'updatedAt'>) => void;
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

export const usePanelStore = create<Store>((set, get) => {
  const persist = (): Promise<void> => {
    const { state, tone, length } = get();
    const updatedAt = Date.now();
    set({ updatedAt });
    return writePanel({ state, tone, length, updatedAt });
  };

  return {
    state: { status: 'idle' },
    tone: 'professional',
    length: 'short',
    updatedAt: 0,
    setTone: (tone) => {
      set({ tone });
      void persist();
    },
    setLength: (length) => {
      set({ length });
      void persist();
    },
    setState: (state) => {
      set({ state });
      void persist();
    },
    commit: (state) => {
      set({ state });
      return persist();
    },
    hydrate: ({ state, tone, length, updatedAt }) =>
      set({ state, tone, length, updatedAt }),
    forceStatus: (status) => {
      if (!import.meta.env.DEV) return;
      const { tone, length, setState } = get();
      switch (status) {
        case 'idle':
          setState({ status: 'idle' });
          break;
        case 'detecting':
          setState({ status: 'detecting' });
          break;
        case 'ready':
          setState({ status: 'ready', job: mockJob, editedDescription: mockJob.description });
          break;
        case 'generating':
          setState({
            status: 'generating',
            job: mockJob,
            editedDescription: mockJob.description,
            requestId: 'demo',
          });
          break;
        case 'result':
          setState({
            status: 'result',
            job: mockJob,
            editedDescription: mockJob.description,
            result: mockResult,
            draft: mockResult.proposal,
            tone,
            length,
          });
          break;
        case 'error':
          setState({
            status: 'error',
            error: { code: 'NETWORK', message: 'Demo network error.' },
            job: mockJob,
            editedDescription: mockJob.description,
          });
          break;
      }
    },
  };
});
