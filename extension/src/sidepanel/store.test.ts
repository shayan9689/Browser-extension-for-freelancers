import { beforeEach, describe, expect, it } from 'vitest';
import { usePanelStore } from './store';

describe('panel store state machine', () => {
  beforeEach(() => {
    usePanelStore.setState({ state: { status: 'idle' } });
  });

  it('starts idle', () => {
    expect(usePanelStore.getState().state.status).toBe('idle');
  });

  it('moves to ready', () => {
    usePanelStore.getState().setState({
      status: 'ready',
      job: {
        platform: 'generic',
        url: 'https://example.com',
        title: 'T',
        description: 'D',
        skills: [],
        extractedAt: new Date().toISOString(),
        truncated: false,
      },
      editedDescription: 'D',
    });
    expect(usePanelStore.getState().state.status).toBe('ready');
  });

  it('moves to generating then result', () => {
    const job = {
      platform: 'generic' as const,
      url: 'https://example.com',
      title: 'T',
      description: 'D',
      skills: [] as string[],
      extractedAt: new Date().toISOString(),
      truncated: false,
    };
    usePanelStore.getState().setState({
      status: 'generating',
      job,
      editedDescription: 'D',
    });
    expect(usePanelStore.getState().state.status).toBe('generating');
    usePanelStore.getState().setState({
      status: 'result',
      job,
      editedDescription: 'D',
      result: {
        proposal: 'Hello',
        suggested_price: { amount: 1, currency: 'USD', rationale: 'x' },
        delivery_days: 3,
        questions_to_ask: [],
        warnings: [],
      },
      draft: 'Hello',
      tone: 'professional',
      length: 'short',
    });
    expect(usePanelStore.getState().state.status).toBe('result');
  });

  it('supports error state', () => {
    usePanelStore.getState().setState({
      status: 'error',
      error: { code: 'NETWORK', message: 'down' },
    });
    expect(usePanelStore.getState().state.status).toBe('error');
  });
});
