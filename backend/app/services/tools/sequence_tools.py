from typing import Dict, Any, List, Optional
from flask import current_app
import json

# Tool implementation functions
async def _generate_sequence(position: str, additional_info: str = None, user_id: str = None, title: str = None):
    """Generate a new sequence for the specified position."""
    from ...database.db import db
    from ...models import User
    from ..sequence_service import SequenceService
    
    try:
        # Use either provided user_id or a fallback
        user_id = user_id or "demo-user-123"  # Default fallback
        
        # Check if user exists
        user = User.query.get(user_id)
        if not user:
            # Create a demo user if not found
            user = User(
                id=user_id,
                email=f"{user_id}@example.com",
                name="Demo User"
            )
            db.session.add(user)
            db.session.commit()
            print(f"Created new demo user: {user_id}")
        
        # Get company context from user if available
        company_context = {
            "name": getattr(user, "company", "Example Company"),
            "description": getattr(user, "company_description", "A great place to work")
        }
        
        # Use title parameter if provided
        sequence_title = title or f"Recruiting for {position}"
        
        # Generate the sequence
        sequence_service = SequenceService.get_instance()
        sequence_coroutine = sequence_service.create_sequence(
            user_id=user_id,
            title=sequence_title,
            position=position,
            additional_info=additional_info
        )
        
        # Properly await the coroutine
        sequence = await sequence_coroutine
        
        # Use to_dict method or extract steps manually if to_dict doesn't exist
        if hasattr(sequence, 'to_dict'):
            sequence_data = sequence.to_dict()
            return {
                "id": sequence.id,
                "position": position,
                "title": sequence_title,
                "steps": sequence_data['steps'],
                "additionalInfo": additional_info
            }
        else:
            # Fallback if to_dict doesn't exist
            return {
                "position": position,
                "title": sequence_title,
                "steps": [step.to_dict() for step in sequence.steps],
                "additionalInfo": additional_info
            }
    except Exception as e:
        import traceback
        print(f"Error generating sequence: {str(e)}")
        print(traceback.format_exc())
        return {"error": str(e)}

async def _refine_sequence_step(
    step_id: str, 
    feedback: str,
    content: Optional[str] = None
) -> Dict[str, Any]:
    """Refine a specific step in a recruiting sequence.
    
    Args:
        step_id: The ID of the step to refine
        feedback: Feedback or instructions for refining the step
        content: Optional new content for the step
        
    Returns:
        The updated step as a dictionary
    """
    try:
        # Import here to avoid circular imports
        from ..sequence_service import SequenceService
        
        # Get SequenceService instance and refine step
        sequence_service = SequenceService.get_instance()
        updated_step = await sequence_service.refine_sequence_step(
            step_id=step_id,
            feedback=feedback,
            content=content
        )
        
        return updated_step.to_dict()
    except Exception as e:
        # Log the error
        try:
            current_app.logger.error(f"Error refining sequence step: {str(e)}")
        except RuntimeError:
            print(f"Error refining sequence step: {str(e)}")
        raise

async def _analyze_sequence(sequence_id: str) -> Dict[str, Any]:
    """Analyze a recruiting sequence and provide suggestions for improvement.
    
    Args:
        sequence_id: The ID of the sequence to analyze
        
    Returns:
        Analysis and suggestions as a dictionary
    """
    try:
        # Import here to avoid circular imports
        from ..sequence_service import SequenceService
        
        # Get SequenceService instance and analyze sequence
        sequence_service = SequenceService.get_instance()
        sequence = await sequence_service.get_sequence(sequence_id)
        
        # The analysis would normally be done by calling the AI service
        # Here we're just returning a placeholder
        return {
            "sequence_id": sequence_id,
            "analysis": {
                "overall_quality": "Good",
                "suggestions": [
                    "Consider adding more personalization",
                    "The second step could be more specific about the role",
                    "Add a stronger call-to-action in the final step"
                ]
            }
        }
    except Exception as e:
        # Log the error
        try:
            current_app.logger.error(f"Error analyzing sequence: {str(e)}")
        except RuntimeError:
            print(f"Error analyzing sequence: {str(e)}")
        raise

# Define generate sequence tool
generate_sequence_tool = {
    "name": "generate_sequence",
    "description": "Generate a recruiting outreach sequence for a specific position",
    "input_schema": {
        "type": "object",
        "properties": {
            "position": {
                "type": "string",
                "description": "The job position to create a sequence for (e.g., 'Software Engineer')"
            },
            "user_id": {
                "type": "string",
                "description": "The ID of the user creating the sequence (optional, will use system context if not provided)"
            },
            "title": {
                "type": "string",
                "description": "A title for the sequence (optional, will be generated if not provided)"
            },
            "additional_info": {
                "type": "string",
                "description": "Additional information about the position or candidate profile"
            }
        },
        "required": ["position"]
    },
    "function": _generate_sequence
}

# Define refine sequence step tool
refine_sequence_step_tool = {
    "name": "refine_sequence_step",
    "description": "Refine a specific step in a recruiting sequence",
    "input_schema": {
        "type": "object",
        "properties": {
            "step_id": {
                "type": "string",
                "description": "The ID of the step to refine"
            },
            "content": {
                "type": "string",
                "description": "The new content for the step"
            },
            "feedback": {
                "type": "string",
                "description": "Feedback or instructions for refining the step"
            }
        },
        "required": ["step_id", "feedback"]
    },
    "function": _refine_sequence_step
}

# Define analyze sequence tool
analyze_sequence_tool = {
    "name": "analyze_sequence",
    "description": "Analyze a recruiting sequence and provide suggestions for improvement",
    "input_schema": {
        "type": "object",
        "properties": {
            "sequence_id": {
                "type": "string",
                "description": "The ID of the sequence to analyze"
            }
        },
        "required": ["sequence_id"]
    },
    "function": _analyze_sequence
} 