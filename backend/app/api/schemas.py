from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Dict
from datetime import date, datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class DoctorBase(BaseModel):
    name: str
    specialty: str
    hospital: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: str = "Target"
    priority: str = "Medium"

class DoctorCreate(DoctorBase):
    pass

class DoctorResponse(DoctorBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    therapeutic_class: str
    description: Optional[str] = None

class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class InteractionBase(BaseModel):
    doctor_id: int
    product_id: Optional[int] = None
    date: date
    interaction_type: str = "In-Person"
    notes: Optional[str] = None
    summary: Optional[str] = None
    sentiment: str = "Neutral"
    transcript: Optional[str] = None
    next_action: Optional[str] = None

class InteractionCreate(InteractionBase):
    user_id: int = 1 # Default to logged in user
    follow_up_date: Optional[date] = None
    follow_up_title: Optional[str] = None

class InteractionUpdate(BaseModel):
    notes: Optional[str] = None
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    next_action: Optional[str] = None
    product_id: Optional[int] = None
    interaction_type: Optional[str] = None

class InteractionResponse(InteractionBase):
    id: int
    doctor_name: str
    user_name: str
    product_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class AgentChatRequest(BaseModel):
    message: str
    user_id: int = 1
    history: List[Dict[str, str]] = []

class AgentChatResponse(BaseModel):
    text: str
    intent: str
    success: bool
    data: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = 0.95
    steps: Optional[List[Dict[str, Any]]] = None
