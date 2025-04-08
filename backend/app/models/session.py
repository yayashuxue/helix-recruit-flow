from datetime import datetime
import uuid
import json
from sqlalchemy import String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database.db import db

class SessionState(db.Model):
    """Model to track conversation context and active sequences for users"""
    __tablename__ = 'session_states'
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), nullable=False)
    active_sequence_id: Mapped[str] = mapped_column(ForeignKey('sequences.id'), nullable=True)
    last_action: Mapped[str] = mapped_column(String(100), nullable=True)
    last_action_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    context_data: Mapped[str] = mapped_column(Text, nullable=True)  # Stored as JSON string
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship('User', back_populates='session_states')
    active_sequence = relationship('Sequence')
    
    def set_context_data(self, data_dict):
        """Set context data as a dictionary, stored as JSON string"""
        self.context_data = json.dumps(data_dict)
    
    def get_context_data(self):
        """Get context data as a dictionary"""
        if not self.context_data:
            return {}
        try:
            return json.loads(self.context_data)
        except json.JSONDecodeError:
            return {}
    
    def to_dict(self):
        """Convert session state to dictionary"""
        return {
            'id': self.id,
            'userId': self.user_id,
            'activeSequenceId': self.active_sequence_id,
            'lastAction': self.last_action,
            'lastActionTime': self.last_action_time.isoformat() if self.last_action_time else None,
            'contextData': self.get_context_data(),
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        } 