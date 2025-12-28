// Custom hook for analysis/chat functionality

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';

type OutputSection = {
  section_name: string;
  content: string;
};

type AnalyzeResult = {
  success: boolean;
  sections?: OutputSection[];
  error?: string;
};

export function useAnalyze() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyze = async (
    advisorModeId: string,
    prompt: string,
    organizationId: string,
    conversationHistory: Array<{
      role: 'user' | 'assistant';
      content: string;
      sections?: OutputSection[];
    }> = []
  ): Promise<AnalyzeResult> => {
    setIsAnalyzing(true);

    try {
      const { data: { session }, error: sessionError } = await supabaseBrowser.auth.getSession();

      if (sessionError || !session) {
        return { success: false, error: 'Session expired. Please log in again.' };
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          advisor_mode_id: advisorModeId,
          prompt,
          organization_id: organizationId,
          conversation_history: conversationHistory,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: text || 'Failed to analyze' };
      }

      const data = await response.json();
      return { success: true, sections: data.sections };
    } catch (err: any) {
      console.error('Error analyzing:', err);
      return { success: false, error: err.message || 'Error occurred' };
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyze,
    isAnalyzing,
  };
}
