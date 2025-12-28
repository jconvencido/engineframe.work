/**
 * Utility functions for conversation and message management
 */

export interface ConversationMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  sections?: Array<{ section_name: string; content: string }>;
  position?: number;
  created_at?: string;
}

/**
 * Configuration for conversation history truncation
 */
export const CONVERSATION_CONFIG = {
  MAX_HISTORY_MESSAGES: 15, // Maximum number of messages to send to AI API
  MIN_HISTORY_MESSAGES: 4, // Minimum to maintain context (2 user + 2 assistant)
  ESTIMATED_TOKENS_PER_MESSAGE: 200, // Average tokens per message for estimation
} as const;

/**
 * Truncates conversation history to the most recent messages
 * while maintaining proper user/assistant message pairing.
 * 
 * @param messages - Full conversation history
 * @param maxMessages - Maximum number of messages to keep (default: 15)
 * @returns Truncated message array with most recent messages
 * 
 * @example
 * const fullHistory = [...100 messages];
 * const recent = truncateConversationHistory(fullHistory);
 * // Returns last 15 messages, ensuring proper pairing
 */
export function truncateConversationHistory(
  messages: ConversationMessage[],
  maxMessages: number = CONVERSATION_CONFIG.MAX_HISTORY_MESSAGES
): ConversationMessage[] {
  if (!messages || messages.length === 0) {
    return [];
  }

  // If within limit, return all messages
  if (messages.length <= maxMessages) {
    return messages;
  }

  // Take the most recent messages
  let truncated = messages.slice(-maxMessages);

  // Ensure we start with a user message for proper context
  // If the first message in truncated array is an assistant message, remove it
  if (truncated.length > 0 && truncated[0].role === 'assistant') {
    truncated = truncated.slice(1);
  }

  return truncated;
}

/**
 * Estimates the total token count for a conversation history.
 * This is a rough estimation and not as accurate as tiktoken.
 * 
 * @param messages - Conversation messages
 * @returns Estimated token count
 */
export function estimateTokenCount(messages: ConversationMessage[]): number {
  let totalTokens = 0;

  for (const msg of messages) {
    // Estimate based on content length
    if (msg.content) {
      // Rough estimation: ~4 characters per token
      totalTokens += Math.ceil(msg.content.length / 4);
    }

    // Add tokens from sections if present
    if (msg.sections && Array.isArray(msg.sections)) {
      for (const section of msg.sections) {
        const sectionContent = `${section.section_name}:\n${section.content}`;
        totalTokens += Math.ceil(sectionContent.length / 4);
      }
    }

    // Add overhead for role and formatting
    totalTokens += 10;
  }

  return totalTokens;
}

/**
 * Formats a message with sections into a single content string
 * 
 * @param message - Message with potential sections
 * @returns Formatted content string
 */
export function formatMessageContent(message: ConversationMessage): string {
  if (message.role === 'user') {
    return message.content;
  }

  // For assistant messages, check if sections exist
  if (message.sections && Array.isArray(message.sections) && message.sections.length > 0) {
    return message.sections
      .map((s) => `${s.section_name}:\n${s.content}`)
      .join('\n\n');
  }

  return message.content || '';
}
