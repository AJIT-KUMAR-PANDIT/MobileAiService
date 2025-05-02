import { Message } from '@/types/llm';

// Type for a conversation session
export interface ConversationSession {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
  modelId: string;
}

// Maximum number of conversations to keep
const MAX_CONVERSATIONS = 5;

// Storage key for conversations
const STORAGE_KEY = 'luna-conversations';

// Generate a unique ID for new conversations
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Extract a title from the first user message
const extractTitle = (messages: Message[]): string => {
  const firstUserMessage = messages.find(msg => msg.role === 'user');
  if (!firstUserMessage || !firstUserMessage.content) {
    return 'New Conversation';
  }

  // Extract the first 3-5 words or up to 30 characters
  const content = firstUserMessage.content.trim();
  const words = content.split(/\s+/);
  let title = words.slice(0, Math.min(5, words.length)).join(' ');
  
  if (title.length > 30) {
    title = title.substring(0, 30) + '...';
  }
  
  return title;
};

// Save a conversation to localStorage
export const saveConversation = (messages: Message[], modelId: string): void => {
  try {
    // Don't save empty conversations
    if (messages.length === 0) {
      return;
    }
    
    // Get existing conversations
    const savedData = localStorage.getItem(STORAGE_KEY);
    const conversations: ConversationSession[] = savedData 
      ? JSON.parse(savedData) 
      : [];
    
    // Create new conversation
    const newConversation: ConversationSession = {
      id: generateId(),
      title: extractTitle(messages),
      timestamp: Date.now(),
      messages,
      modelId
    };
    
    // Add to beginning of array (newest first)
    conversations.unshift(newConversation);
    
    // Keep only the recent MAX_CONVERSATIONS
    const limitedConversations = conversations.slice(0, MAX_CONVERSATIONS);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedConversations));
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
};

// Get all saved conversations
export const getConversations = (): ConversationSession[] => {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    return savedData ? JSON.parse(savedData) : [];
  } catch (error) {
    console.error('Error retrieving conversations:', error);
    return [];
  }
};

// Get a specific conversation by ID
export const getConversationById = (id: string): ConversationSession | null => {
  try {
    const conversations = getConversations();
    return conversations.find(conv => conv.id === id) || null;
  } catch (error) {
    console.error('Error retrieving conversation:', error);
    return null;
  }
};

// Delete a conversation by ID
export const deleteConversation = (id: string): void => {
  try {
    const conversations = getConversations();
    const filteredConversations = conversations.filter(conv => conv.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredConversations));
  } catch (error) {
    console.error('Error deleting conversation:', error);
  }
};

// Clear all conversations
export const clearAllConversations = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing conversations:', error);
  }
};