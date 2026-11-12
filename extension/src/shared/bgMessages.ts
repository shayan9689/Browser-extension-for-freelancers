/** Messages from the popup / side panel to the background worker. */
import type { ConversationApiRequest, Length, ProposalApiRequest, Tone } from './api';
import type { Conversation, JobPost } from './types';

export type GenerateMessage = {
  type: 'PP_GENERATE';
  requestId: string;
  payload: ProposalApiRequest;
  job: JobPost;
  editedDescription: string;
  tone: Tone;
  length: Length;
  signOff?: string;
};

export type AnalyzeMessage = {
  type: 'PP_ANALYZE';
  requestId: string;
  payload: ConversationApiRequest;
  conversation: Conversation;
};

export type CancelGenerateMessage = {
  type: 'PP_CANCEL_GENERATE';
  requestId: string;
};

function hasType(msg: unknown, type: string): msg is Record<string, unknown> {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as { type?: unknown }).type === type
  );
}

export function isGenerateMessage(msg: unknown): msg is GenerateMessage {
  return (
    hasType(msg, 'PP_GENERATE') &&
    typeof msg.requestId === 'string' &&
    typeof msg.payload === 'object' &&
    msg.payload !== null &&
    typeof msg.job === 'object' &&
    msg.job !== null &&
    typeof msg.editedDescription === 'string'
  );
}

export function isAnalyzeMessage(msg: unknown): msg is AnalyzeMessage {
  return (
    hasType(msg, 'PP_ANALYZE') &&
    typeof msg.requestId === 'string' &&
    typeof msg.payload === 'object' &&
    msg.payload !== null &&
    typeof msg.conversation === 'object' &&
    msg.conversation !== null
  );
}

export function isCancelGenerateMessage(msg: unknown): msg is CancelGenerateMessage {
  return hasType(msg, 'PP_CANCEL_GENERATE') && typeof msg.requestId === 'string';
}

/** Append the profile sign-off unless the model already included it. */
export function withSignOff(proposal: string, signOff?: string): string {
  const s = signOff?.trim();
  return s && !proposal.includes(s) ? `${proposal}\n\n${s}` : proposal;
}
