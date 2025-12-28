// Custom hook for conversation management

import { useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import type { 
  Conversation, 
  ConversationMessage, 
  ApiResponse, 
  ConversationListResponse, 
  ConversationDetailResponse,
  CreateConversationRequest,
  UpdateConversationRequest 
} from '@/types';

export function useConversations(organizationId?: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all conversations for organization
  const fetchConversations = useCallback(async () => {
    if (!organizationId) {
      setConversations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/conversations?organizationId=${organizationId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result: ApiResponse<ConversationListResponse> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch conversations');
      }

      setConversations(result.data!.conversations);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  // Create new conversation
  const createConversation = async (data: CreateConversationRequest) => {
    setError(null);

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<{ conversation: Conversation }> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create conversation');
      }

      const newConversation = result.data!.conversation;
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      setMessages([]);

      return { success: true, conversation: newConversation };
    } catch (err: any) {
      console.error('Error creating conversation:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Load conversation with messages
  const loadConversation = async (conversationId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/conversations/${conversationId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result: ApiResponse<ConversationDetailResponse> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load conversation');
      }

      setCurrentConversation(result.data!.conversation);
      setMessages(result.data!.messages);

      return { success: true, data: result.data };
    } catch (err: any) {
      console.error('Error loading conversation:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Update conversation
  const updateConversation = async (conversationId: string, data: UpdateConversationRequest) => {
    setError(null);

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<{ conversation: Conversation }> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update conversation');
      }

      const updatedConversation = result.data!.conversation;
      setConversations(prev =>
        prev.map(c => (c.id === conversationId ? updatedConversation : c))
      );
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(updatedConversation);
      }

      return { success: true, conversation: updatedConversation };
    } catch (err: any) {
      console.error('Error updating conversation:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId: string) => {
    setError(null);

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete conversation');
      }

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error deleting conversation:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Add message to conversation
  const addMessage = async (conversationId: string, role: 'user' | 'assistant', content: string, sections?: Array<{ section_name: string; content: string }>) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role, content, sections }),
      });

      const result: ApiResponse<{ message: ConversationMessage }> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save message');
      }

      const newMessage = result.data!.message;
      setMessages(prev => [...prev, newMessage]);

      return { success: true, message: newMessage };
    } catch (err: any) {
      console.error('Error adding message:', err);
      return { success: false, error: err.message };
    }
  };

  // Fork a shared conversation
  const forkConversation = async (conversationId: string) => {
    setError(null);

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/conversations/${conversationId}/fork`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result: ApiResponse<{ conversation: Conversation; messageCount: number }> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fork conversation');
      }

      const forkedConversation = result.data!.conversation;
      
      // Add to conversations list
      setConversations(prev => [forkedConversation, ...prev]);
      
      return { success: true, conversation: forkedConversation };
    } catch (err: any) {
      console.error('Error forking conversation:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Clear current conversation
  const clearCurrentConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
  };

  return {
    conversations,
    currentConversation,
    messages,
    isLoading,
    error,
    fetchConversations,
    createConversation,
    loadConversation,
    updateConversation,
    deleteConversation,
    addMessage,
    forkConversation,
    clearCurrentConversation,
  };
}
