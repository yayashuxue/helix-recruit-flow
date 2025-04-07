from datetime import datetime
import uuid
from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database.db import db

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), nullable=False)
    sequence_id: Mapped[str] = mapped_column(ForeignKey('sequences.id'), nullable=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # 'user' or 'assistant'
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship('User', back_populates='messages')
    
    def to_dict(self):
        return {
            'id': self.id,
            'role': self.role,
            'content': self.content,
            'created_at': self.created_at.isoformat()
        } 