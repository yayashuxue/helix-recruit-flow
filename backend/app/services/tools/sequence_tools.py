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

async def _refine_sequence_step(step_id: str = None, feedback: str = None, content: str = None, user_id: Optional[str] = None, sequence_id: Optional[str] = None):
    """Refine a specific step in a sequence."""
    try:
        from ..sequence_service import SequenceService
        from ...models import SequenceStep, Sequence
        from ...database.db import db
        
        # 获取步骤逻辑（与之前相同）
        if not step_id and sequence_id:
            steps = SequenceStep.query.filter_by(sequence_id=sequence_id).order_by(SequenceStep.order).all()
            if steps:
                step_id = steps[0].id
        
        if not step_id:
            return {"error": "No step ID provided or found", "status": "error"}
            
        step = SequenceStep.query.get(step_id)
        if not step:
            # 如果找不到步骤，尝试从活跃序列中找
            if sequence_id:
                steps = SequenceStep.query.filter_by(sequence_id=sequence_id).all()
                if steps:
                    step = steps[0]
                    step_id = step.id
        
        if not step:
            return {"error": f"Step not found", "status": "error"}
            
        # 执行修改逻辑 - 关键修改：使用content或feedback
        sequence_service = SequenceService.get_instance()
        if content:  # 如果提供了content，直接使用
            result = await sequence_service.refine_sequence_step(step_id, feedback, content)
        else:  # 否则只使用feedback
            result = await sequence_service.refine_sequence_step(step_id, feedback)
        
        return {
            "step_id": step_id,
            "content": result.content,
            "title": result.title,
            "status": "success"
        }
        
    except Exception as e:
        return {"error": str(e), "status": "error"}

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
    "description": "Refine or modify a specific step in a recruiting sequence based on feedback",
    "function": _refine_sequence_step,
    "input_schema": {
        "type": "object",
        "properties": {
            "step_id": {
                "type": "string",
                "description": "ID of the sequence step to refine"
            },
            "feedback": {
                "type": "string", 
                "description": "Feedback or instructions for refining the step"
            },
            "content": {
                "type": "string",
                "description": "New content to replace the step content directly"
            },
            "user_id": {
                "type": "string",
                "description": "ID of the user who owns the sequence"
            },
            "sequence_id": {
                "type": "string",
                "description": "ID of the sequence containing the step"
            }
        },
        "required": []  # 没有必须参数，允许更灵活的调用
    }
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