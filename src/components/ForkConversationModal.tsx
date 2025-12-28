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
  onConfirm,
  onCancel,
}: ForkConversationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-1">Create Your Own Copy?</h2>
            <p className="text-sm text-gray-400">
              This is a shared conversation. To add your message, we'll create your own copy.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="cursor-pointer flex-1 px-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="cursor-pointer flex-1 px-4 py-2.5 bg-[#4169E1] hover:bg-[#3557c7] rounded-lg font-medium transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
