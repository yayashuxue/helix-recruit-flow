import re
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

def process_ai_response(response_text: str) -> str:
    """
    Process and clean AI responses before sending to the frontend.
    
    Args:
        response_text: Raw response from the AI model
        
    Returns:
        Cleaned response with thinking tags and other metadata removed
    """
    # Remove thinking tags and their content
    filtered_text = re.sub(r'<thinking>.*?</thinking>', '', response_text, flags=re.DOTALL)
    
    # Remove any other potential model artifacts
    filtered_text = re.sub(r'<.*?>', '', filtered_text)  # Remove any remaining tags
    
    # Trim whitespace
    filtered_text = filtered_text.strip()
    
    # Log the processing
    if filtered_text != response_text:
        logger.info(f"Processed AI response: removed {len(response_text) - len(filtered_text)} characters")
    
    # Validate non-empty response
    if not filtered_text:
        filtered_text = "I'm processing your request. Please provide more details about your recruiting needs."
        logger.warning("Empty response after processing, using fallback message")
    
    return filtered_text

def validate_response_quality(content: str, user_input: str) -> Optional[str]:
    """
    Validate the quality of an AI response and return a new response if quality is poor.
    
    Args:
        content: The processed AI response content
        user_input: The original user input that prompted this response
        
    Returns:
        A replacement response if quality is poor, None if quality is acceptable
    """
    # Too short response
    if len(content) < 20:
        logger.warning(f"Response too short ({len(content)} chars), generating fallback")
        return generate_fallback_response(user_input)
    
    # Check for common error patterns
    error_patterns = [
        "I apologize, but I cannot",
        "I'm sorry, I cannot",
        "I cannot assist with",
        "I'm not able to"
    ]
    
    for pattern in error_patterns:
        if pattern.lower() in content.lower():
            logger.warning(f"Response contains refusal pattern: {pattern}")
            return generate_fallback_response(user_input, refusal=True)
    
    return None  # Response is fine

def generate_fallback_response(user_input: str, refusal: bool = False) -> str:
    """
    Generate a fallback response when the AI response is inadequate.
    
    Args:
        user_input: The original user input
        refusal: Whether the original response was a refusal
        
    Returns:
        A fallback response
    """
    if refusal:
        return ("As your recruiting assistant, I'm here to help with your recruiting needs. "
                "Could you tell me more about the position you're recruiting for?")
    
    # Simple input gets a standard recruiting prompt
    if len(user_input) < 10:
        return ("I'm Helix, your recruiting assistant. I can help you create personalized "
                "outreach sequences for your candidates. What position are you recruiting for?")
    
    # More complex input gets a more tailored response
    return ("I'd like to help you with your recruiting needs. To create an effective outreach "
            "sequence, I need some information about the role, key requirements, and what "
            "makes your company attractive to candidates. Could you share more details?")

def process_tool_calls(tool_calls: list) -> list:
    """
    Process tool calls to ensure they're properly formatted.
    
    Args:
        tool_calls: List of tool call objects from the AI
        
    Returns:
        Processed tool calls
    """
    processed_calls = []
    
    for call in tool_calls:
        # Ensure call has all required fields
        if not isinstance(call, dict):
            logger.warning(f"Invalid tool call format: {call}")
            continue
            
        if 'name' not in call:
            logger.warning("Tool call missing name field")
            continue
            
        processed_calls.append(call)
    
    return processed_calls

def process_complete_response(response: Dict[str, Any], user_message: str) -> Dict[str, Any]:
    """
    Process the complete AI response including content and tool calls.
    
    Args:
        response: The complete response object from the AI service
        user_message: The original user input
        
    Returns:
        Processed response object
    """
    if not response:
        logger.error("Empty response object received")
        return {
            "content": generate_fallback_response(user_message),
            "tool_calls": []
        }
    
    # Process content
    content = response.get("content", "")
    processed_content = process_ai_response(content)
    
    # Validate quality
    fallback = validate_response_quality(processed_content, user_message)
    if fallback:
        processed_content = fallback
    
    # Process tool calls
    tool_calls = response.get("tool_calls", [])
    processed_tool_calls = process_tool_calls(tool_calls)
    
    return {
        "content": processed_content,
        "tool_calls": processed_tool_calls
    } 