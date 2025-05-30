
import { Message } from '@/types/chat';
import { SequenceStep } from '@/types/sequence';
import { OPENAI_CONFIG } from '@/config/appConfig';

// For direct client-side calls during development
// In production, these calls should go through the backend
export async function generateCompletion(messages: Message[]): Promise<string> {
  try {
    if (!OPENAI_CONFIG.API_KEY) {
      console.error('OpenAI API key not found');
      return 'API key not configured. Please set VITE_OPENAI_API_KEY in your environment.';
    }

    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const response = await fetch(OPENAI_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_CONFIG.DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: OPENAI_CONFIG.SYSTEM_MESSAGE
          },
          ...formattedMessages
        ],
        temperature: OPENAI_CONFIG.TEMPERATURE,
        max_tokens: OPENAI_CONFIG.MAX_TOKENS
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      return 'Error communicating with OpenAI. Please try again.';
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI request failed:', error);
    return 'Failed to generate response. Please try again.';
  }
}

// Function to generate a recruiting sequence
export async function generateSequence(position: string, details: string): Promise<SequenceStep[]> {
  try {
    if (!OPENAI_CONFIG.API_KEY) {
      console.error('OpenAI API key not found');
      return [];
    }

    const response = await fetch(OPENAI_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_CONFIG.DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are Helix, an AI recruiting assistant. Create a 3-step recruiting outreach sequence for the specified position, formatted as JSON. Include an initial outreach, follow-up details, and closing message.'
          },
          {
            role: 'user',
            content: `Create a recruiting sequence for a ${position} position. Additional details: ${details}`
          }
        ],
        temperature: OPENAI_CONFIG.TEMPERATURE,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      return [];
    }

    try {
      const content = data.choices[0].message.content;
      const parsedContent = JSON.parse(content);
      
      if (Array.isArray(parsedContent.steps)) {
        return parsedContent.steps.map((step: any, index: number) => ({
          id: crypto.randomUUID(),
          title: step.title || `Step ${index + 1}`,
          content: step.content || ''
        }));
      }
      
      return [];
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return [];
    }
  } catch (error) {
    console.error('OpenAI sequence generation failed:', error);
    return [];
  }
}
