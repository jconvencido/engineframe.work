'use client';

interface ForkConversationModalProps {
  isOpen: boolean;
  conversationTitle: string;
  messageCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ForkConversationModal({
  isOpen,
  conversationTitle,
  messageCount,
  onConfirm,
  onCancel,
}: ForkConversationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#4169E1]/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#4169E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-1">Create Your Own Copy?</h2>
            <p className="text-sm text-gray-400">
              This is a shared conversation. To add your message, we'll create your own copy.
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-4 mb-6">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-300">All {messageCount} previous messages will be included</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-300">Your new message will be added</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-300">You'll own the new conversation</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-gray-400">The original conversation stays unchanged</span>
            </div>
          </div>
        </div>

        {/* Conversation Details */}
        <div className="mb-6 text-sm">
          <div className="text-gray-500">Creating copy of:</div>
          <div className="font-medium text-white mt-1 truncate">{conversationTitle}</div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-[#4169E1] hover:bg-[#3557c7] rounded-lg font-medium transition-colors"
          >
            Create Copy & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
