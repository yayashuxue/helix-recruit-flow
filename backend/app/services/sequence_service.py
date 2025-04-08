from typing import List, Dict, Any, Optional
from flask import current_app
from ..database.db import db
from ..models import Sequence, SequenceStep, User

class SequenceService:
    _instance = None
    
    @classmethod
    def get_instance(cls):
        """Get or create a singleton instance of SequenceService."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        # Don't initialize AIService here, get it when needed
        pass
    
    async def create_sequence(self, user_id: str, title: str, position: str, additional_info: Optional[str] = None) -> Sequence:
        """Create a new recruiting sequence."""
        # Get user information for context
        user = User.query.get(user_id)
        if not user:
            raise ValueError(f"User with ID {user_id} not found")
        
        company_context = {
            "name": user.company if hasattr(user, 'company') and user.company else "your company"
        }
        
        # Get AIService instance and generate sequence steps
        # Import here to avoid circular imports
        from .ai_service import AIService
        
        ai_service = AIService.get_instance()
        steps = await ai_service.generate_sequence(
            position=position,
            company_context=company_context,
            additional_info=additional_info
        )
        
        # Create sequence in database
        sequence = Sequence(
            user_id=user_id,
            title=title,
            position=position,
            additional_info=additional_info
        )
        
        db.session.add(sequence)
        db.session.flush()  # Get the ID without committing
        
        # Create steps
        for i, step_data in enumerate(steps):
            step = SequenceStep(
                sequence_id=sequence.id,
                title=step_data["title"],
                content=step_data["content"],
                order=i
            )
            db.session.add(step)
        
        db.session.commit()
        return sequence
    
    async def update_sequence(self, sequence_id: str, updated_steps: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Update an existing sequence with new steps."""
        sequence = Sequence.query.get(sequence_id)
        if not sequence:
            # If the sequence doesn't exist yet (first update), create a placeholder
            sequence = Sequence(
                id=sequence_id,
                user_id="demo-user-123",  # Default user for demo purposes
                title="New Sequence",
                position="Untitled Position"
            )
            db.session.add(sequence)
            db.session.flush()
        
        # Remove existing steps
        SequenceStep.query.filter_by(sequence_id=sequence_id).delete()
        
        # Add updated steps
        for i, step_data in enumerate(updated_steps):
            step = SequenceStep(
                sequence_id=sequence_id,
                title=step_data["title"],
                content=step_data["content"],
                order=i
            )
            db.session.add(step)
        
        db.session.commit()
        return sequence.to_dict()
    
    async def get_sequence(self, sequence_id: str) -> Optional[Sequence]:
        """Get a sequence by ID."""
        sequence = Sequence.query.get(sequence_id)
        return sequence
    
    async def refine_sequence_step(self, step_id: str, feedback: str, content: Optional[str] = None) -> Optional[SequenceStep]:
        """Refine a specific step in a sequence based on feedback."""
        step = SequenceStep.query.get(step_id)
        if not step:
            raise ValueError(f"Step with ID {step_id} not found")
        
        # If content is provided, use it directly
        if content:
            step.content = content
        else:
            # Otherwise, use AI to refine the step
            # Import here to avoid circular imports
            from .ai_service import AIService
            
            ai_service = AIService.get_instance()
            refined_content = await ai_service.refine_sequence_step(step.content, feedback)
            step.content = refined_content
        
        db.session.commit()
        return step
    
    def get_user_sequences(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all sequences for a user."""
        sequences = Sequence.query.filter_by(user_id=user_id).all()
        return [seq.to_dict() for seq in sequences]
    
    async def delete_sequence(self, sequence_id: str) -> bool:
        """Delete a sequence and all its steps."""
        sequence = Sequence.query.get(sequence_id)
        if not sequence:
            return False
        
        try:
            # First delete all related steps
            SequenceStep.query.filter_by(sequence_id=sequence_id).delete()
            
            # Then delete the sequence itself
            db.session.delete(sequence)
            db.session.commit()
            
            current_app.logger.info(f"Sequence {sequence_id} deleted successfully")
            return True
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting sequence {sequence_id}: {str(e)}")
            return False
    
    async def refine_step(self, sequence_id: str, step_id: str, feedback: str) -> Optional[Dict[str, Any]]:
        """Refine a specific step based on user feedback."""
        step = SequenceStep.query.filter_by(id=step_id, sequence_id=sequence_id).first()
        if not step:
            return None
        
        # Get AIService instance and use it to refine the step content
        # Import here to avoid circular imports
        from .ai_service import AIService
        
        ai_service = AIService.get_instance()
        refined_content = await ai_service.refine_sequence_step(step.content, feedback)
        
        # Update the step
        step.content = refined_content
        db.session.commit()
        
        return step.to_dict() 