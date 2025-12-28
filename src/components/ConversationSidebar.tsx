'use client';

import { useEffect } from 'react';
import { Conversation } from '@/types';

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onToggleShare: (conversationId: string, isShared: boolean) => void;
  currentUserId?: string;
}

export default function ConversationSidebar({
  conversations,
  currentConversationId,
  isOpen,
  onClose,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onToggleShare,
  currentUserId,
}: ConversationSidebarProps) {
  // Group conversations by date
  const groupConversations = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: { [key: string]: Conversation[] } = {
      Today: [],
      Yesterday: [],
      'Last 7 days': [],
      Older: [],
    };

    conversations.forEach(conv => {
      const convDate = new Date(conv.updated_at);
      if (convDate >= today) {
        groups.Today.push(conv);
      } else if (convDate >= yesterday) {
        groups.Yesterday.push(conv);
      } else if (convDate >= lastWeek) {
        groups['Last 7 days'].push(conv);
      } else {
        groups.Older.push(conv);
      }
    });

    return groups;
  };

  const groupedConversations = groupConversations();

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed h-[100dvh] lg:relative top-0 left-0 w-80 bg-[#111111] border-r border-gray-800 z-50 transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={onNewChat}
            className="w-full px-4 py-3 bg-[#4169E1] hover:bg-[#3557c7] rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No conversations yet. Start a new chat!
            </div>
          ) : (
            Object.entries(groupedConversations).map(([groupName, convs]) => {
              if (convs.length === 0) return null;

              return (
                <div key={groupName} className="mb-4">
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase sticky top-0 bg-[#111111]">
                    {groupName}
                  </div>
                  <div className="space-y-1 px-2">
                    {convs.map(conv => {
                      const isOwner = conv.user_id === currentUserId;
                      const isActive = conv.id === currentConversationId;

                      return (
                        <div
                          key={conv.id}
                          className={`group relative rounded-lg transition-colors ${
                            isActive ? 'bg-[#4169E1]/10' : 'hover:bg-gray-800'
                          }`}
                        >
                          <button
                            onClick={() => onSelectConversation(conv.id)}
                            className="w-full text-left px-3 py-2.5 rounded-lg"
                          >
                            <div className="flex items-start gap-2">
                              <svg
                                className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                                />
                              </svg>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm truncate">{conv.title}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  {conv.is_shared && (
                                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                      </svg>
                                      Shared
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>

                          {/* Action buttons - only show for owner */}
                          {isOwner && (
                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleShare(conv.id, !conv.is_shared);
                                }}
                                className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                                title={conv.is_shared ? 'Make private' : 'Share with team'}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {conv.is_shared ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                  )}
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete this conversation?')) {
                                    onDeleteConversation(conv.id);
                                  }
                                }}
                                className="p-1.5 hover:bg-red-500/20 rounded transition-colors text-red-400"
                                title="Delete conversation"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
