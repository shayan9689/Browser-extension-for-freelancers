import type { ConversationAnalysis } from './api';
import type { Conversation, JobPost } from './types';

/** Turn the AI's reading of a chat into a job card the user can review. */
export function jobFromAnalysis(
  conversation: Conversation,
  analysis: ConversationAnalysis,
): JobPost {
  const parts = [analysis.summary.trim()];
  if (analysis.requirements.length) {
    parts.push(`Requirements:\n${analysis.requirements.map((r) => `- ${r}`).join('\n')}`);
  }
  if (analysis.deadline) parts.push(`Deadline: ${analysis.deadline}`);
  return {
    platform: conversation.platform,
    url: conversation.url,
    title: analysis.title.trim() || 'Project from conversation',
    description: parts.filter(Boolean).join('\n\n'),
    budgetText: analysis.budget_text ?? undefined,
    skills: [],
    extractedAt: new Date().toISOString(),
    truncated: false,
  };
}
