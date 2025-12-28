'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAnalyze, useConversations } from '@/hooks';
import { useRouter } from 'next/navigation';
import { truncateConversationHistory } from '@/lib/conversation-utils';
import ForkConversationModal from './ForkConversationModal';
import { useAuth } from '@/hooks';

type OutputSection = {
  section_name: string;
  content: string;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sections?: OutputSection[];
};

interface ChatInterfaceProps {
  selectedMode?: string | null;
  disabled?: boolean;
  onFirstMessage?: () => void;
  conversationId?: string | null;
  onConversationCreated?: (title: string, modeSlug: string) => Promise<string | undefined>;
  onMessageSaved?: () => void;
  conversationMessages?: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sections?: OutputSection[];
  }>;
  conversationOwnerId?: string | null;
  conversationTitle?: string;
  conversationIsShared?: boolean;
  onConversationForked?: (newConversationId: string, shouldReload?: boolean) => void;
}

export default function ChatInterface({ 
  selectedMode, 
  disabled = false, 
  onFirstMessage,
  conversationId,
  onConversationCreated,
  onMessageSaved,
  conversationMessages,
  conversationOwnerId,
  conversationTitle,
  conversationIsShared,
  onConversationForked,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);
  const [showForkModal, setShowForkModal] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const router = useRouter();
  const { currentOrg, canCreateAnalysis } = useOrganization();
  const { analyze, isAnalyzing } = useAnalyze();
  const { addMessage, forkConversation } = useConversations(currentOrg?.id);
  const { user } = useAuth();

  // Update conversation ID when prop changes
  useEffect(() => {
    setCurrentConversationId(conversationId || null);
  }, [conversationId]);

  // Load messages when conversation changes or when explicitly loading a conversation  
  useEffect(() => {
    if (conversationId && conversationMessages && conversationMessages.length > 0) {
      const uiMessages = conversationMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        sections: msg.sections,
      }));
      setMessages(uiMessages);
    } else if (!conversationId) {
      setMessages([]);
    }
  }, [conversationId, conversationMessages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;

    const currentInput = input.trim();

    // Check if user needs to fork (viewing shared conversation they don't own)
    const needsFork = conversationId && 
                     conversationOwnerId && 
                     user?.id && 
                     conversationOwnerId !== user.id &&
                     conversationIsShared;

    if (needsFork) {
      // Store the message and show fork modal
      setPendingMessage(currentInput);
      setShowForkModal(true);
      return;
    }

    // Continue with normal message flow
    await sendMessage(currentInput);
  };

  const handleForkConfirm = async () => {
    setShowForkModal(false);
    
    if (!conversationId || !pendingMessage) return;

    try {
      // Fork the conversation
      const result = await forkConversation(conversationId);
      
      if (!result.success || !result.conversation) {
        setError('Failed to fork conversation. Please try again.');
        setPendingMessage(null);
        return;
      }

      // Switch to the forked conversation
      const forkedConvId = result.conversation.id;
      setCurrentConversationId(forkedConvId);
      
      // Notify parent to update sidebar (but don't reload yet)
      if (onConversationForked) {
        await onConversationForked(forkedConvId, false);
      }
      
      // Send the pending message to the forked conversation
      // This will save the message to the database
      await sendMessage(pendingMessage, forkedConvId);
      setPendingMessage(null);
      
      // Now reload to sync everything
      if (onConversationForked) {
        await onConversationForked(forkedConvId, true);
      }
      
    } catch (err: any) {
      console.error('Error forking conversation:', err);
      setError('Failed to fork conversation. Please try again.');
      setPendingMessage(null);
    }
  };

  const handleForkCancel = () => {
    setShowForkModal(false);
    setPendingMessage(null);
    // Restore the input
    if (pendingMessage) {
      setInput(pendingMessage);
    }
  };

  const sendMessage = async (currentInput: string, targetConversationId?: string) => {
    setInput('');
    setError(null);

    // Check permissions
    if (!canCreateAnalysis()) {
      setError('You do not have permission to create analyses. Contact your organization admin.');
      return;
    }

    // Check organization
    if (!currentOrg) {
      setError('No organization selected. Please select or create an organization.');
      return;
    }

    // Check advisor mode
    if (!selectedMode) {
      setError('Please select an advisor mode.');
      return;
    }

    // Trigger collapse to dropdown on first message
    const isFirstMessage = messages.length === 0;
    if (isFirstMessage && onFirstMessage) {
      onFirstMessage();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
    };

    setMessages(prev => [...prev, userMessage]);

    // Use target conversation ID if provided (for forked conversations)
    let activeConversationId = targetConversationId || currentConversationId;
    
    // If we have a target conversation ID, update the current conversation ID
    if (targetConversationId) {
      setCurrentConversationId(targetConversationId);
    }
    
    // Create conversation if this is the first message and no active conversation
    if (!activeConversationId && isFirstMessage && onConversationCreated && selectedMode) {
      try {
        const newConvId = await onConversationCreated(currentInput, selectedMode);
        if (newConvId) {
          activeConversationId = newConvId;
          setCurrentConversationId(newConvId);
        }
      } catch (err: any) {
        console.error('Error creating conversation:', err);
        setError('Failed to create conversation.');
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        return;
      }
    }

    // Call the analyze hook with truncated conversation history
    // Only send recent messages to reduce token costs, but keep full history in UI
    const truncatedMessages = truncateConversationHistory(messages);
    const result = await analyze(selectedMode, currentInput, currentOrg.id, truncatedMessages);

    if (!result.success) {
      setError(result.error || 'Failed to analyze');
      // Remove the user message if there was an error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      
      // If session expired, redirect to login
      if (result.error?.includes('Session expired')) {
        router.push('/');
      }
      return;
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      sections: result.sections,
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Save messages to conversation
    if (activeConversationId && addMessage) {
      try {
        // Save user message
        await addMessage(activeConversationId, 'user', currentInput);

        // Save assistant message
        await addMessage(activeConversationId, 'assistant', '', result.sections);

        // Reload conversation to sync with database
        if (onMessageSaved) {
          await onMessageSaved();
        }
      } catch (err) {
        console.error('Error saving messages:', err);
        // Don't show error to user, messages are still displayed
      }
    }
  };

  return (
    <div className="w-full">
      {/* Fork Conversation Modal */}
      <ForkConversationModal
        isOpen={showForkModal}
        conversationTitle={conversationTitle || 'this conversation'}
        messageCount={messages.length}
        onConfirm={handleForkConfirm}
        onCancel={handleForkCancel}
      />

      {/* Messages Area */}
      {messages.length > 0 && (
        <div className="max-w-4xl mx-auto mb-8 space-y-6 max-h-[500px] overflow-y-auto px-4">
          {messages.map((message) => (
            <div key={message.id} className="space-y-4">
              {message.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-[#4169E1] text-white rounded-2xl px-6 py-4">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-start">
                  <div className="max-w-[85%] space-y-3">
                    {message.sections?.map((section, index) => (
                      <div
                        key={index}
                        className="bg-[#111111] border border-gray-800 rounded-2xl p-6"
                      >
                        <h3 className="font-semibold text-[#4169E1] mb-3 text-lg">
                          {section.section_name}
                        </h3>
                        <p className="text-gray-300 whitespace-pre-line leading-relaxed">
                          {section.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {isAnalyzing && (
            <div className="flex justify-start">
              <div className="bg-[#111111] border border-gray-800 rounded-2xl px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto w-full">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={disabled ? "Select an advisor mode to start..." : "Ask your business advisor anything..."}
            className="w-full rounded-2xl bg-[#111111] border border-gray-800 px-6 py-4 pr-14 text-white placeholder-gray-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isAnalyzing || disabled}
          />
          <button
            type="submit"
            disabled={!input.trim() || isAnalyzing || disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[#4169E1] hover:bg-[#3557c7] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Send message"
          >
            {isAnalyzing ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="max-w-4xl mx-auto mt-4 bg-red-500/10 border border-red-500/50 rounded-lg p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
