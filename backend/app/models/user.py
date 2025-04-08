from datetime import datetime
import uuid
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database.db import db

class User(db.Model):
    __tablename__ = 'users'
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    sequences = relationship('Sequence', back_populates='user', cascade='all, delete-orphan')
    messages = relationship('ChatMessage', back_populates='user', cascade='all, delete-orphan')
    session_states = relationship('SessionState', back_populates='user', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'company': self.company
        } 