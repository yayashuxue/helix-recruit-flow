from datetime import datetime
import uuid
from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database.db import db

class SequenceStep(db.Model):
    __tablename__ = 'sequence_steps'
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sequence_id: Mapped[str] = mapped_column(ForeignKey('sequences.id'), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    sequence = relationship('Sequence', back_populates='steps')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'order': self.order
        }

class Sequence(db.Model):
    __tablename__ = 'sequences'
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    position: Mapped[str] = mapped_column(String(255), nullable=False)
    additional_info: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship('User', back_populates='sequences')
    steps = relationship('SequenceStep', back_populates='sequence', cascade='all, delete-orphan', order_by='SequenceStep.order')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'position': self.position,
            'userId': self.user_id,
            'additionalInfo': self.additional_info,
            'steps': [step.to_dict() for step in self.steps],
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        } 