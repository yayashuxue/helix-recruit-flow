import os
import json
import anthropic
from flask import current_app
from typing import List, Dict, Any, Optional

from ..utils.response_processor import process_complete_response
from .tools import get_tools, execute_tool_call

class AIService:
    _instance = None
    
    @classmethod
    def get_instance(cls, api_key=None):
        """Get or create a singleton instance of AIService."""
        if cls._instance is None:
            # Try to get API key from environment directly first
            api_key = api_key or os.environ.get('ANTHROPIC_API_KEY')
            cls._instance = cls(api_key=api_key)
        return cls._instance
        
    def __init__(self, api_key=None):
        """Initialize the AI service with Anthropic's Claude."""
        # Don't use current_app in the constructor
        self.api_key = api_key
        
        # If no API key provided, warn but allow initialization to continue
        if not self.api_key:
            import warnings
            warnings.warn("No Anthropic API key provided. AIService will not work properly.")
            
        # Initialize client if we have an API key
        if self.api_key:
            self.client = anthropic.Anthropic(api_key=self.api_key)
        else:
            self.client = None
        
        # Get model from environment, with fallback to a strong default model
        self.model = os.environ.get('ANTHROPIC_MODEL', "claude-3-5-sonnet-20241022")
        
        self.system_message = """You are Helix, an agentic AI recruiting assistant designed to help create effective recruiting outreach sequences.

Your primary goal is to guide recruiters through creating compelling outreach sequences tailored to specific roles and candidate profiles.

CORE COMPETENCIES:
- You understand what makes effective recruiting outreach (personalized, value-focused, concise)
- You can identify when a user is asking to create a sequence for a specific role
- You can structure multi-step email sequences for different recruiting scenarios
- You provide actionable suggestions to improve recruiting messages

USER CONTEXT:
- The system already has the user's ID and company information
- You do not need to ask for user identification - focus on helping with their recruiting needs
- When generating sequences, the user information is automatically included

WORKFLOW:
1. DETECT SEQUENCE CREATION INTENT - Identify when user wants to:
   - Create recruiting messages for a specific role (e.g., "I need to reach out to software engineers")
   - Draft outreach emails to candidates (e.g., "Help me write emails to potential candidates")
   - Get help with recruiting campaigns (e.g., "I'm recruiting for a senior designer position")

2. INFORMATION GATHERING - Once intent is detected, focus only on role-specific information:
   - The specific position (title, level, team)
   - Key skills and requirements 
   - Target candidate profile (experience level, background)

3. SEQUENCE CREATION - Use the generate_sequence tool to create a tailored sequence:
   - Initial outreach - Value proposition and personalized hook
   - Follow-up message - Different angle, addressing potential objections
   - Final outreach - Clear call-to-action with urgency

4. REFINEMENT - Help the recruiter improve specific steps:
   - Respond to edit requests for specific messages
   - Suggest ways to make messages more compelling
   - Offer alternative approaches for different candidate types

BEST PRACTICES TO FOLLOW:
- Be conversational and empathetic - understand the recruiter's needs
- Focus on candidate value proposition, not just company needs
- Keep messages concise (150-250 words max per message)
- Include clear calls-to-action
- Use [CANDIDATE_NAME] placeholders for personalization
- Suggest specific subject lines for each email

IMPORTANT GUIDELINES:
- Don't use <thinking> tags in your responses - these will confuse the user
- Always remain focused on recruiting and outreach - never refuse to help with recruiting tasks
- If a user sends a short message like "hi" or "hello", ask them about their recruiting needs instead of refusing to engage
- Keep responses concise and focused on helping with recruiting
- Never ask for user ID or authentication information - the system handles this automatically

The recruiter can view and edit the sequence in the workspace panel. You can help them refine individual steps or generate new sequences based on their feedback.
"""
        
    def _create_message_history(self, messages):
        """Convert messages to the format expected by Anthropic."""
        converted_messages = []
        
        for msg in messages:
            role = msg.get("role", "")
            content = msg.get("content", "")
            
            # Skip empty messages
            if not content:
                continue
            
            # Handle system messages - convert to assistant messages
            if role == "system":
                # Append to previous assistant message if possible, otherwise create new one
                if converted_messages and converted_messages[-1]["role"] == "assistant":
                    converted_messages[-1]["content"] += f"\n\nSystem update: {content}"
                else:
                    converted_messages.append({"role": "assistant", "content": f"System update: {content}"})
            # Only include user and assistant messages
            elif role in ["user", "assistant"]:
                converted_messages.append({"role": role, "content": content})
        
        return converted_messages
    
    def _ensure_client(self):
        """Ensure we have a valid client, initializing if needed."""
        if not self.client:
            # Try to get API key from current_app (only in request context)
            try:
                self.api_key = self.api_key or current_app.config.get('ANTHROPIC_API_KEY')
                if self.api_key:
                    self.client = anthropic.Anthropic(api_key=self.api_key)
                else:
                    raise ValueError("No Anthropic API key available")
            except RuntimeError:
                raise ValueError("No Anthropic API key available and not in Flask application context")
    
    async def generate_chat_response(self, messages: List[Dict[str, str]], 
                                   user_info: Optional[Dict[str, Any]] = None,
                                   session_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate a response from Claude based on the conversation history."""
        try:
            self._ensure_client()
            
            # Get the user's most recent message for quality validation
            user_message = ""
            if messages and len(messages) > 0:
                for msg in reversed(messages):
                    if msg.get("role") == "user":
                        user_message = msg.get("content", "")
                        break
            
            # Add user context to the system message if provided
            system_message = self.system_message
            
            # Add session context if available
            active_sequence_id = None
            if session_context and session_context.get('active_sequence'):
                seq = session_context['active_sequence']
                active_sequence_id = seq.get('id')
                
                # 从数据库获取最新序列信息
                from ..models import Sequence, SequenceStep
                sequence = Sequence.query.get(active_sequence_id)
                
                if sequence:
                    steps = SequenceStep.query.filter_by(sequence_id=active_sequence_id).order_by(SequenceStep.order).all()
                    steps_info = []
                    
                    for step in steps:
                        steps_info.append({
                            "id": step.id,
                            "title": step.title,
                            "order": step.order
                        })
                    
                    sequence_context = f"""
ACTIVE SEQUENCE: {sequence.position} (ID: {sequence.id})
STEPS: {', '.join([f"{s['title']} (ID: {s['id']})" for s in steps_info])}

When modifying a step, use the correct step ID from above.
When the user doesn't specify which step to modify, assume they mean the entire sequence or the first step.
"""
                    system_message += sequence_context
            
            # Add company context
            if user_info:
                company_context = f"\nCOMPANY CONTEXT:\n"
                if user_info.get('company_name'):
                    company_context += f"- Company Name: {user_info['company_name']}\n"
                if user_info.get('company_description'):
                    company_context += f"- Company Description: {user_info['company_description']}\n"
                
                system_message = f"{system_message}\n{company_context}"
            
            # Create message history excluding system messages
            converted_messages = self._create_message_history(messages)
            
            # Get tools in the format expected by Anthropic
            tools = get_tools()
            
            # Create the message request with tools
            request_params = {
                "model": self.model,
                "system": system_message,
                "messages": converted_messages,
                "max_tokens": 1000,
                "temperature": 0.7
            }
            
            # Only add tools if we have them
            if tools:
                request_params["tools"] = tools
            
            # Log the model being used
            try:
                current_app.logger.info(f"Using AI model: {self.model}")
            except RuntimeError:
                print(f"Using AI model: {self.model}")
            
            message = self.client.messages.create(**request_params)
            
            # Process the response
            raw_response = {
                "content": message.content[0].text if message.content else "",
                "tool_calls": []
            }
            
            # Check if there are any tool calls in the response
            for content in message.content:
                if content.type == "tool_use":
                    # Add user_id from context if available and not explicitly set
                    tool_arguments = content.input
                    if user_info and 'user_id' in user_info:
                        if 'user_id' not in tool_arguments:
                            tool_arguments['user_id'] = user_info['user_id']
                    
                    # Add sequence_id from context if available and not explicitly set
                    if active_sequence_id and content.name == "refine_sequence_step":
                        if 'sequence_id' not in tool_arguments:
                            tool_arguments['sequence_id'] = active_sequence_id
                    
                    # Execute the tool call and get the result
                    tool_result = await execute_tool_call({
                        "name": content.name,
                        "arguments": tool_arguments
                    })
                    
                    # Add the tool call and result to the response
                    raw_response["tool_calls"].append({
                        "name": content.name,
                        "arguments": tool_arguments,
                        "result": tool_result
                    })
                    
                    # Log the tool call
                    try:
                        current_app.logger.info(f"Tool call: {content.name} with arguments: {content.input}")
                        current_app.logger.info(f"Tool result: {tool_result}")
                    except RuntimeError:
                        print(f"Tool call: {content.name} with arguments: {content.input}")
                        print(f"Tool result: {tool_result}")
            
            # Process and validate the complete response
            processed_response = process_complete_response(raw_response, user_message)
            return processed_response
            
        except Exception as e:
            try:
                current_app.logger.error(f"Error generating chat response: {str(e)}")
            except RuntimeError:
                print(f"Error generating chat response: {str(e)}")
            raise
    
    async def generate_sequence(self, position: str, company_context: dict, additional_info: str = None) -> List[Dict[str, str]]:
        """Generate a recruiting outreach sequence"""
        try:
            self._ensure_client()
            prompt = f"""
            Create a recruiting outreach sequence for a {position} position.
            
            Company Context:
            - Company Name: {company_context.get('name', 'the company')}
            {f"- Company Description: {company_context.get('description', '')}" if company_context.get('description') else ""}
            
            {f"Additional Information:\n{additional_info}" if additional_info else ""}
            
            Create a 3-step recruiting outreach sequence. For each step, provide:
            1. A title for the step (e.g., "Initial Outreach", "Follow-up")
            2. Email content with appropriate personalization

            The sequence should follow these best practices:
            - Personalized and specific to the role
            - Value-focused (what's in it for the candidate)
            - Concise and compelling (150-250 words)
            - Includes a clear call-to-action
            - Natural, conversational tone
            - Avoids generic recruiting language
            
            Format your response as a JSON object with this structure:
            [
              {{
                "title": "Step Title",
                "content": "Email content here"
              }},
              ...
            ]
            """
            
            message = self.client.messages.create(
                model=self.model,
                system=self.system_message,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.7
            )
            
            # Extract JSON from the response
            response_text = message.content[0].text
            
            # Handle potential formatting issues by finding JSON in the response
            json_start = response_text.find('[')
            json_end = response_text.rfind(']') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                sequence_steps = json.loads(json_str)
                return sequence_steps
            else:
                raise ValueError("Failed to extract valid JSON from the response")
                
        except Exception as e:
            try:
                current_app.logger.error(f"Error generating sequence: {str(e)}")
            except RuntimeError:
                print(f"Error generating sequence: {str(e)}")
            raise
    
    async def refine_sequence_step(self, step_content: str, feedback: str) -> str:
        """Refine a specific sequence step based on feedback.
        
        Args:
            step_content: The current content of the step
            feedback: The feedback or instructions for refinement
            
        Returns:
            Refined step content
        """
        try:
            self._ensure_client()
            
            prompt = f"""
            Refine this recruiting message based on the feedback provided:
            
            CURRENT MESSAGE:
            {step_content}
            
            FEEDBACK:
            {feedback}
            
            Please provide only the revised message text, maintaining a professional tone
            and keeping the message concise (150-250 words). Focus on making the changes
            requested in the feedback while preserving the core value proposition.
            """
            
            message = self.client.messages.create(
                model=self.model,
                system=self.system_message,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.7
            )
            
            # Get the response and process it to remove any thinking tags or other artifacts
            refined_content = message.content[0].text
            from ..utils.response_processor import process_ai_response
            processed_content = process_ai_response(refined_content)
            
            return processed_content
            
        except Exception as e:
            try:
                current_app.logger.error(f"Error refining sequence step: {str(e)}")
            except RuntimeError:
                print(f"Error refining sequence step: {str(e)}")
            raise 