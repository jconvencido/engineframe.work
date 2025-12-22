'use client';

import { FormEvent, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRouter } from 'next/navigation';

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
}

export default function ChatInterface({ selectedMode, disabled = false, onFirstMessage }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const router = useRouter();
  const { currentOrg, canCreateAnalysis } = useOrganization();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    // Check permissions
    if (!canCreateAnalysis()) {
      setError('You do not have permission to create analyses. Contact your organization admin.');
      setLoading(false);
      return;
    }

    // Check organization
    if (!currentOrg) {
      setError('No organization selected. Please select or create an organization.');
      setLoading(false);
      return;
    }

    // Trigger collapse to dropdown on first message
    if (messages.length === 0 && onFirstMessage) {
      onFirstMessage();
    }

    try {
      // Get current session to extract access token
      const {
        data: { session },
        error: sessionError,
      } = await supabaseBrowser.auth.getSession();

      if (sessionError || !session) {
        setError('Session expired. Please log in again.');
        router.push('/');
        return;
      }

      const accessToken = session.access_token;

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          advisor_mode_id: selectedMode,
          prompt: currentInput,
          organization_id: currentOrg.id,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to analyze');
      }

      const data = await res.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        sections: data.sections as OutputSection[],
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message ?? 'Error occurred');
      // Remove the user message if there was an error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
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
          {loading && (
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
            disabled={loading || disabled}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading || disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[#4169E1] hover:bg-[#3557c7] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Send message"
          >
            {loading ? (
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
