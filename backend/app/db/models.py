from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
import datetime
from typing import Optional
from app.db.session import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, default="Medical Representative")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    interactions = relationship("Interaction", back_populates="user", cascade="all, delete-orphan")
    follow_ups = relationship("FollowUp", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Doctor(Base):
    __tablename__ = "doctors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    specialty = Column(String, nullable=False)
    hospital = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    status = Column(String, default="Target")  # Active, Target, Inactive
    priority = Column(String, default="Medium") # High, Medium, Low
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    interactions = relationship("Interaction", back_populates="doctor", cascade="all, delete-orphan")
    follow_ups = relationship("FollowUp", back_populates="doctor", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "specialty": self.specialty,
            "hospital": self.hospital,
            "email": self.email,
            "phone": self.phone,
            "status": self.status,
            "priority": self.priority,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    therapeutic_class = Column(String, nullable=False) # e.g. Cardiology, Neurology, Endocrinology
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    interactions = relationship("Interaction", back_populates="product")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "therapeutic_class": self.therapeutic_class,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Interaction(Base):
    __tablename__ = "interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    date = Column(Date, default=datetime.date.today)
    interaction_type = Column(String, default="In-Person") # In-Person, Virtual, Phone, Email
    notes = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    sentiment = Column(String, default="Neutral") # Positive, Neutral, Negative
    transcript = Column(Text, nullable=True) # Full conversation transcript for AI logged meetings
    next_action = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    doctor = relationship("Doctor", back_populates="interactions")
    user = relationship("User", back_populates="interactions")
    product = relationship("Product", back_populates="interactions")
    follow_ups = relationship("FollowUp", back_populates="interaction", cascade="all, delete-orphan")

    @property
    def doctor_name(self) -> str:
        return self.doctor.name if self.doctor else "Unknown Doctor"

    @property
    def user_name(self) -> str:
        return self.user.name if self.user else "Unknown Representative"

    @property
    def product_name(self) -> Optional[str]:
        return self.product.name if self.product else None

    def to_dict(self):
        return {
            "id": self.id,
            "doctor_id": self.doctor_id,
            "doctor_name": self.doctor.name if self.doctor else "Unknown Doctor",
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else "Unknown Representative",
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "date": self.date.isoformat() if self.date else None,
            "interaction_type": self.interaction_type,
            "notes": self.notes,
            "summary": self.summary,
            "sentiment": self.sentiment,
            "transcript": self.transcript,
            "next_action": self.next_action,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class FollowUp(Base):
    __tablename__ = "follow_ups"
    
    id = Column(Integer, primary_key=True, index=True)
    interaction_id = Column(Integer, ForeignKey("interactions.id", ondelete="CASCADE"), nullable=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(String, default="Pending") # Pending, Completed, Overdue
    priority = Column(String, default="Medium") # High, Medium, Low
    educational_material = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    interaction = relationship("Interaction", back_populates="follow_ups")
    doctor = relationship("Doctor", back_populates="follow_ups")
    user = relationship("User", back_populates="follow_ups")

    def to_dict(self):
        return {
            "id": self.id,
            "interaction_id": self.interaction_id,
            "doctor_id": self.doctor_id,
            "doctor_name": self.doctor.name if self.doctor else "Unknown Doctor",
            "user_id": self.user_id,
            "title": self.title,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "status": self.status,
            "priority": self.priority,
            "educational_material": self.educational_material,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
