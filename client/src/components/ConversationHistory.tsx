import React, { useState, useEffect } from 'react';
import { getConversations, deleteConversation, ConversationSession } from '@/utils/conversationHistory';
import { Message } from '@/types/llm';
import { Clock, MessageSquare, Trash2 } from 'lucide-react';

interface ConversationHistoryProps {
  onSelectConversation: (messages: Message[], modelId: string) => void;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({ 
  onSelectConversation 
}) => {
  const [conversations, setConversations] = useState<ConversationSession[]>([]);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const savedConversations = getConversations();
    setConversations(savedConversations);
  }, []);

  // Format timestamp to readable date
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle conversation selection
  const handleSelectConversation = (conversation: ConversationSession) => {
    onSelectConversation(conversation.messages, conversation.modelId);
  };

  // Handle conversation deletion
  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the conversation
    deleteConversation(id);
    setConversations(prev => prev.filter(conv => conv.id !== id));
  };

  // If no conversations available
  if (conversations.length === 0) {
    return (
      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-400 mb-2 flex items-center">
          <Clock size={12} className="mr-1" />
          <span>Recent Conversations</span>
        </div>
        <div className="py-3 text-center text-xs text-gray-500">
          No recent conversations
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-gray-700">
      <div className="text-xs text-gray-400 mb-2 flex items-center">
        <Clock size={12} className="mr-1" />
        <span>Recent Conversations</span>
      </div>
      
      <div className="space-y-2">
        {conversations.map(conversation => (
          <div
            key={conversation.id}
            onClick={() => handleSelectConversation(conversation)}
            className="cursor-pointer p-2 rounded-md bg-gray-800 border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-medium mb-1 line-clamp-1">
                  {conversation.title}
                </div>
                <div className="text-[10px] text-gray-400 flex items-center">
                  <MessageSquare size={10} className="mr-1" />
                  <span className="mr-2">{conversation.messages.length} messages</span>
                  <span>{formatDate(conversation.timestamp)}</span>
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteConversation(conversation.id, e)}
                className="text-gray-500 hover:text-gray-300 p-1 rounded"
                title="Delete conversation"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};