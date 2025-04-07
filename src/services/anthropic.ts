
import { Message } from '@/types/chat';
import { SequenceStep } from '@/types/sequence';
import { ANTHROPIC_CONFIG } from '@/config/appConfig';

// For direct client-side calls during development
export async function generateCompletion(messages: Message[]): Promise<string> {
  try {
    if (!ANTHROPIC_CONFIG.API_KEY) {
      console.error('Anthropic API key not found');
      return 'API key not configured. Please set VITE_ANTHROPIC_API_KEY in your environment.';
    }

    // Format messages for Anthropic API
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    const response = await fetch(ANTHROPIC_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_CONFIG.API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: ANTHROPIC_CONFIG.DEFAULT_MODEL,
        messages: formattedMessages,
        system: ANTHROPIC_CONFIG.SYSTEM_MESSAGE,
        max_tokens: ANTHROPIC_CONFIG.MAX_TOKENS,
        temperature: ANTHROPIC_CONFIG.TEMPERATURE
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return 'Error communicating with Anthropic. Please try again.';
    }

    return data.content[0].text;
  } catch (error) {
    console.error('Anthropic request failed:', error);
    return 'Failed to generate response. Please try again.';
  }
}

// Function to generate a recruiting sequence
export async function generateSequence(position: string, details: string): Promise<SequenceStep[]> {
  try {
    if (!ANTHROPIC_CONFIG.API_KEY) {
      console.error('Anthropic API key not found');
      return [];
    }

    const prompt = `Create a 3-step recruiting outreach sequence for a ${position} position. Additional details: ${details}. 
    
Please format your response as a JSON array of steps with the following structure:
[
  {
    "title": "Initial Outreach",
    "content": "..."
  },
  {
    "title": "Follow-up",
    "content": "..."
  },
  {
    "title": "Final Attempt",
    "content": "..."
  }
]`;

    const response = await fetch(ANTHROPIC_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_CONFIG.API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: ANTHROPIC_CONFIG.DEFAULT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        system: 'You are an expert recruiter. Create effective, professional recruiting outreach sequences. Always format your response exactly as requested.',
        max_tokens: 1500,
        temperature: ANTHROPIC_CONFIG.TEMPERATURE
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return [];
    }

    try {
      const content = data.content[0].text;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const parsedContent = JSON.parse(jsonMatch[0]);
        
        if (Array.isArray(parsedContent)) {
          return parsedContent.map((step: any, index: number) => ({
            id: crypto.randomUUID(),
            title: step.title || `Step ${index + 1}`,
            content: step.content || ''
          }));
        }
      }
      
      return [];
    } catch (parseError) {
      console.error('Error parsing Anthropic response:', parseError);
      return [];
    }
  } catch (error) {
    console.error('Anthropic sequence generation failed:', error);
    return [];
  }
}
