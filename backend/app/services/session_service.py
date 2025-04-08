from datetime import datetime
from typing import Optional, Dict, Any
from ..database.db import db
from ..models import SessionState, Sequence

class SessionService:
    _instance = None
    
    @classmethod
    def get_instance(cls):
        """Get or create a singleton instance of SessionService."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        pass
    
    def get_or_create_session(self, user_id: str) -> SessionState:
        """Get the current session for a user or create a new one if none exists."""
        session = SessionState.query.filter_by(user_id=user_id).first()
        
        if not session:
            session = SessionState(user_id=user_id)
            db.session.add(session)
            db.session.commit()
            
        return session
    
    def update_session(self, user_id: str, updates: Dict[str, Any]) -> SessionState:
        """Update a user's session with new data."""
        session = self.get_or_create_session(user_id)
        
        # Update basic fields
        if 'active_sequence_id' in updates:
            session.active_sequence_id = updates['active_sequence_id']
            
        if 'last_action' in updates:
            session.last_action = updates['last_action']
            session.last_action_time = datetime.utcnow()
            
        # Update context data if provided
        if 'context_data' in updates:
            # Merge with existing context data
            current_data = session.get_context_data()
            current_data.update(updates['context_data'])
            session.set_context_data(current_data)
            
        db.session.commit()
        return session
    
    def get_session_context(self, user_id: str) -> Dict[str, Any]:
        """Get the full context for a user session, including active sequence details."""
        session = self.get_or_create_session(user_id)
        context = {
            'session_id': session.id,
            'active_sequence_id': session.active_sequence_id,
            'last_action': session.last_action,
            'last_action_time': session.last_action_time.isoformat() if session.last_action_time else None
        }
        
        # Add context data
        context.update(session.get_context_data())
        
        # Add active sequence details if available
        if session.active_sequence_id:
            sequence = Sequence.query.get(session.active_sequence_id)
            if sequence:
                context['active_sequence'] = {
                    'id': sequence.id,
                    'title': sequence.title,
                    'position': sequence.position,
                    'steps_count': len(sequence.steps) if sequence.steps else 0
                }
                
        return context
    
    def build_context_aware_system_prompt(self, base_prompt: str, user_id: str) -> str:
        """Build a system prompt enhanced with session context."""
        context = self.get_session_context(user_id)
        
        # If we have an active sequence, add context information
        if context.get('active_sequence'):
            seq = context['active_sequence']
            
            context_addition = f"""
CURRENT CONTEXT:
- Active Sequence: [ID: {seq['id']} | Position: {seq['position']} | Title: {seq['title']} | Steps: {seq['steps_count']}]
- Last Action: {context['last_action'] or 'None'} at {context['last_action_time'] or 'Never'}

HANDLING SHORT MESSAGES:
- When you see short inputs like "sg", "ok", "yes", or similar, interpret them as continuing the current conversation about the active sequence
- Never generate a new sequence if a valid sequence is already active unless explicitly requested with clear intent
- For ambiguous commands, ask for clarification rather than assuming a new sequence generation intent
- If the user wants to modify the current sequence, help them do so rather than creating a new one
"""
            return base_prompt + "\n" + context_addition
            
        return base_prompt
    
    def clear_session(self, user_id: str) -> None:
        """Clear a user's session state."""
        session = SessionState.query.filter_by(user_id=user_id).first()
        if session:
            db.session.delete(session)
            db.session.commit() 