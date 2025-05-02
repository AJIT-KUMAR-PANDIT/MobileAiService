import { logger, LogCategory } from '../utils/logger';

interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations: string[];
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: "assistant";
      content: string;
    };
    delta: {
      role: "assistant";
      content: string;
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface SearchOptions {
  query: string;
  isOnline: boolean; // Flag to know if we should attempt an online search
  systemPrompt?: string;
  temperature?: number;
}

/**
 * Performs an online search using the Perplexity API
 * @param options Search options including query, online status, and optional params
 * @returns Search results or error message
 */
import { isOnlineSearchAvailable } from '../config/internetConfig';

export async function performOnlineSearch(options: SearchOptions): Promise<{ 
  result: string; 
  isOnline: boolean;
  source?: 'online' | 'offline';
  citations?: string[];
}> {
  const { query, isOnline, systemPrompt, temperature = 0.2 } = options;
  
  logger.info(LogCategory.SEARCH, `Online search request: "${query}"`);
  
  // Check if online search is enabled and available
  if (!isOnlineSearchAvailable()) {
    logger.info(LogCategory.SEARCH, 'Online search requested but device is offline');
    return {
      result: "I can't perform an online search right now because you're offline. I'll answer based on my knowledge, but it may not include the most current information.",
      isOnline: false,
      source: 'offline'
    };
  }
  
  // Check if PERPLEXITY_API_KEY is available in environment
  if (!import.meta.env.VITE_PERPLEXITY_API_KEY) {
    logger.warn(LogCategory.SEARCH, 'Perplexity API key is missing');
    return {
      result: "I'm unable to search online at the moment because the Perplexity API key is not configured. I'll answer based on my existing knowledge.",
      isOnline: true,
      source: 'offline'
    };
  }
  
  try {
    logger.info(LogCategory.SEARCH, 'Sending request to Perplexity API');
    
    // Prepare messages for the API request
    const messages: PerplexityMessage[] = [
      {
        role: "system",
        content: systemPrompt || "You are a helpful assistant providing accurate and up-to-date information. Be precise and concise."
      },
      {
        role: "user",
        content: query
      }
    ];
    
    // Make the API request
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages,
        temperature,
        max_tokens: 500,
        top_p: 0.9,
        search_domain_filter: [], // No domain filtering
        return_images: false,
        return_related_questions: false,
        search_recency_filter: "month", // Recent information
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Perplexity API returned status ${response.status}: ${await response.text()}`);
    }
    
    const data: PerplexityResponse = await response.json();
    
    logger.info(LogCategory.SEARCH, 'Received response from Perplexity API', data);
    
    // Extract the search result
    const result = data.choices[0]?.message.content || 
      "I couldn't find specific information about that. Please try a different search query.";
    
    return {
      result,
      isOnline: true,
      source: 'online',
      citations: data.citations
    };
    
  } catch (error) {
    logger.error(LogCategory.SEARCH, 'Error performing online search', error);
    
    // Return a graceful error message
    return {
      result: "I encountered an issue while searching online. Please try again later or rephrase your question.",
      isOnline: true,
      source: 'offline'
    };
  }
}

/**
 * Determines if a message contains a search request
 * @param message The user's message
 * @returns Boolean indicating whether this is a search request
 */
export function isSearchRequest(message: string): boolean {
  const searchPatterns = [
    /search (online|the web|internet) for/i,
    /search for/i,
    /look up/i,
    /find information (about|on)/i,
    /search (about|on)/i,
    /what('s| is) the (latest|current|recent)/i,
    /can you search/i,
    /can you find/i,
    /what are the/i,
    /who is/i,
    /where is/i,
    /when (did|was|is)/i,
    /how (to|do|can|does)/i,
    /tell me about/i
  ];
  
  return searchPatterns.some(pattern => pattern.test(message));
}