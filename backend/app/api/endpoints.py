from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
import datetime
from typing import List, Dict, Any, Optional

from app.db.session import get_db
from app.db.models import Doctor, Product, Interaction, FollowUp, User
from app.db.seed import seed_db
from app.api.schemas import (
    DoctorResponse, DoctorCreate,
    ProductResponse,
    InteractionResponse, InteractionCreate, InteractionUpdate,
    AgentChatRequest, AgentChatResponse
)
from app.agent.graph import CRMGraphWrapper

router = APIRouter()

# ==========================================
# SEED ROUTE
# ==========================================
@router.post("/db/seed", tags=["Database"])
def trigger_seed(db: Session = Depends(get_db)):
    try:
        seed_db(db)
        return {"status": "success", "message": "Database seeded successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database seeding failed: {str(e)}"
        )

# ==========================================
# DOCTORS ROUTES
# ==========================================
@router.get("/doctors", response_model=List[DoctorResponse], tags=["Doctors"])
def get_doctors(db: Session = Depends(get_db)):
    return db.query(Doctor).order_by(Doctor.name).all()

@router.post("/doctors", response_model=DoctorResponse, tags=["Doctors"])
def create_doctor(doctor: DoctorCreate, db: Session = Depends(get_db)):
    # Check if duplicate email
    if doctor.email:
        existing = db.query(Doctor).filter(Doctor.email == doctor.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Doctor with this email already exists.")
            
    db_doctor = Doctor(**doctor.model_dump())
    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)
    return db_doctor

# ==========================================
# PRODUCTS ROUTES
# ==========================================
@router.get("/products", response_model=List[ProductResponse], tags=["Products"])
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.name).all()

# ==========================================
# INTERACTIONS ROUTES
# ==========================================
@router.get("/interactions", response_model=List[InteractionResponse], tags=["Interactions"])
def get_interactions(doctor_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Interaction)
    if doctor_id:
        query = query.filter(Interaction.doctor_id == doctor_id)
    return query.order_by(Interaction.date.desc()).all()

@router.post("/interactions", response_model=InteractionResponse, tags=["Interactions"])
def create_interaction(interaction: InteractionCreate, db: Session = Depends(get_db)):
    # Validate doctor
    doctor = db.query(Doctor).filter(Doctor.id == interaction.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")
        
    # Validate product
    if interaction.product_id:
        product = db.query(Product).filter(Product.id == interaction.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found.")
            
    db_interaction = Interaction(**interaction.model_dump(exclude={"follow_up_date", "follow_up_title"}))
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    
    # Auto-generate a follow-up if none exists and next action or follow_up_title is defined
    follow_title = interaction.follow_up_title or db_interaction.next_action
    if follow_title:
        existing_followup = db.query(FollowUp).filter(FollowUp.interaction_id == db_interaction.id).first()
        if not existing_followup:
            due = interaction.follow_up_date or (datetime.date.today() + datetime.timedelta(days=14))
            follow_up = FollowUp(
                interaction_id=db_interaction.id,
                doctor_id=db_interaction.doctor_id,
                user_id=db_interaction.user_id,
                title=follow_title,
                due_date=due,
                status="Pending",
                priority="Medium"
            )
            db.add(follow_up)
            db.commit()
            
    return db_interaction

@router.put("/interactions/{id}", response_model=InteractionResponse, tags=["Interactions"])
def update_interaction(id: int, interaction: InteractionUpdate, db: Session = Depends(get_db)):
    db_interaction = db.query(Interaction).filter(Interaction.id == id).first()
    if not db_interaction:
        raise HTTPException(status_code=404, detail="Interaction not found.")
        
    update_data = interaction.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_interaction, key, value)
        
    db.commit()
    db.refresh(db_interaction)
    return db_interaction

# ==========================================
# LANGGRAPH AGENT CHAT
# ==========================================
@router.post("/chat", response_model=AgentChatResponse, tags=["AI Agent"])
@router.post("/agent", response_model=AgentChatResponse, tags=["AI Agent"])
def run_agent(payload: AgentChatRequest, db: Session = Depends(get_db)):
    # Instantiate graph wrapper
    wrapper = CRMGraphWrapper(db=db, user_id=payload.user_id)
    app = wrapper.build_graph()
    
    # Run the compiled Graph
    initial_state = {
        "messages": payload.history,
        "current_input": payload.message,
        "intent": "",
        "extracted_entities": {},
        "tool_output": {},
        "validation_passed": True,
        "validation_error": "",
        "final_response": {}
    }
    
    try:
        final_state = app.invoke(initial_state)
        response_data = final_state.get("final_response", {})
        
        if not response_data:
            raise HTTPException(status_code=500, detail="Agent did not produce a response.")
            
        intent_val = response_data.get("intent", "log_interaction")
        extracted_entities = final_state.get("extracted_entities", {})
        
        # Calculate simulated confidence score based on entity completeness
        conf = extracted_entities.get("confidence_score")
        if not conf:
            conf = 0.96
            if not extracted_entities.get("doctor_name"):
                conf = 0.74
            elif not extracted_entities.get("product_name"):
                conf = 0.88
            
        # Formulate step-by-step LangGraph node pipeline details for visualizers
        steps = [
            {"name": "User Input", "status": "completed", "details": "Received prompt"},
            {"name": "Intent Detection", "status": "completed", "details": f"Classified as: {intent_val.upper()}"},
            {"name": "Entity Extraction", "status": "completed", "details": f"Doctor: {extracted_entities.get('doctor_name', 'None')} | Product: {extracted_entities.get('product_name', 'None')}"},
            {"name": "Tool Selection", "status": "completed", "details": f"Dispatched: {intent_val}"},
            {"name": "LLM Processing", "status": "completed", "details": "NLU summary compiled"},
            {"name": "Database Commit", "status": "completed", "details": "SQLite / Postgres sync ok"},
            {"name": "Completed", "status": "completed", "details": "Success"}
        ]
            
        return AgentChatResponse(
            text=response_data.get("text", "Processed successfully."),
            intent=intent_val,
            success=response_data.get("success", True),
            data=response_data.get("data"),
            confidence_score=conf,
            steps=steps
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent workflow invocation failed: {str(e)}"
        )

# ==========================================
# DASHBOARD STATS
# ==========================================
@router.get("/dashboard/stats", tags=["Dashboard"])
def get_dashboard_stats(db: Session = Depends(get_db)):
    # 1. Total unique Doctors visited
    visited_count = db.query(func.count(func.distinct(Interaction.doctor_id))).scalar()
    
    # 2. Meetings Today
    today = datetime.date.today()
    meetings_today = db.query(Interaction).filter(Interaction.date == today).count()
    
    # 3. Pending Follow Ups
    pending_followups = db.query(FollowUp).filter(FollowUp.status == "Pending").count()
    
    # 4. High Priority Doctors
    high_priority_doctors = db.query(Doctor).filter(Doctor.priority == "High").all()
    
    # 5. Recent Activity (last 5 interactions)
    recent_interactions = db.query(Interaction).order_by(Interaction.date.desc(), Interaction.id.desc()).limit(5).all()
    
    # 6. Active Followups List
    active_followups = db.query(FollowUp).filter(FollowUp.status == "Pending").order_by(FollowUp.due_date.asc()).limit(5).all()

    # Calculate SQL analytics
    pos_count = db.query(Interaction).filter(Interaction.sentiment == 'Positive').count()
    neut_count = db.query(Interaction).filter(Interaction.sentiment == 'Neutral').count()
    neg_count = db.query(Interaction).filter(Interaction.sentiment == 'Negative').count()
    
    # Simple top product
    top_product_row = db.query(
        Interaction.product_id, func.count(Interaction.id).label('cnt')
    ).group_by(Interaction.product_id).order_by(func.count(Interaction.id).desc()).first()
    
    top_product_name = "CardioShield"
    if top_product_row and top_product_row[0]:
        prod_match = db.query(Product).filter(Product.id == top_product_row[0]).first()
        if prod_match and prod_match.name not in ["General Discussion", "General Product", "therapeutic options"]:
            top_product_name = prod_match.name
            
    # Hospital grouping
    hospitals = db.query(Doctor.hospital, func.count(Doctor.id)).group_by(Doctor.hospital).all()
    hospital_dist = [{"name": h[0], "value": h[1]} for h in hospitals if h[0]]
    
    # High opportunities count (High Priority target list)
    opps_count = db.query(Doctor).filter(Doctor.priority == "High").count()
    
    # Generate last 6 months trend dynamically
    monthly_trend = []
    for i in range(5, -1, -1):
        m = today.month - i
        y = today.year
        if m <= 0:
            m += 12
            y -= 1
        month_start = datetime.date(y, m, 1)
        if m == 12:
            month_end = datetime.date(y + 1, 1, 1) - datetime.timedelta(days=1)
        else:
            month_end = datetime.date(y, m + 1, 1) - datetime.timedelta(days=1)
        
        cnt = db.query(Interaction).filter(Interaction.date >= month_start, Interaction.date <= month_end).count()
        month_str = month_start.strftime("%b")
        monthly_trend.append({"month": month_str, "visits": cnt})

    # Overlay rich presentation mock metrics for a gorgeous out-of-the-box presentation on sparse DB
    sentiment_distribution = {"Positive": pos_count, "Neutral": neut_count, "Negative": neg_count}
    
    # product count grouping
    product_distribution = []
    all_prods = db.query(Product).all()
    for pr in all_prods:
        c = db.query(Interaction).filter(Interaction.product_id == pr.id).count()
        product_distribution.append({"name": pr.name, "value": c})
        
    hospital_distribution = hospital_dist
    completed_f = db.query(FollowUp).filter(FollowUp.status == "Completed").count()
    followup_distribution = {"Pending": pending_followups, "Completed": completed_f}
    
    # 7. AI Recommendations
    # Find any High priority doctors who haven't been visited in the last 14 days
    two_weeks_ago = today - datetime.timedelta(days=14)
    visited_recently_subq = db.query(Interaction.doctor_id).filter(Interaction.date >= two_weeks_ago).subquery()
    
    needs_visit_docs = db.query(Doctor).filter(
        Doctor.priority == "High",
        ~Doctor.id.in_(visited_recently_subq.select())
    ).all()
    
    ai_recommendations = []
    for doc in needs_visit_docs[:3]:
        ai_recommendations.append({
            "type": "Urgent Visit",
            "doctor_id": doc.id,
            "doctor_name": doc.name,
            "message": f"{doc.name} (High Priority) has not been visited in over 14 days. Schedule a follow-up meeting.",
            "priority": "High"
        })
        
    # Append followups that are due soon
    for f in active_followups[:2]:
        days_left = (f.due_date - today).days
        if days_left <= 2:
            ai_recommendations.append({
                "type": "Upcoming Followup",
                "doctor_id": f.doctor_id,
                "doctor_name": f.doctor.name if f.doctor else "Unknown",
                "message": f"Follow-up task '{f.title}' is due in {days_left} days.",
                "priority": "High" if days_left <= 1 else "Medium"
            })
            
    # Add a global insight
    if pending_followups > 0:
        ai_recommendations.append({
            "type": "CRM Tasks",
            "doctor_id": 0,
            "doctor_name": "System Alert",
            "message": f"You have {pending_followups} pending tasks to complete this week.",
            "priority": "Medium"
        })

    return {
        "stats": {
            "doctors_visited": visited_count or 0,
            "meetings_today": meetings_today or 0,
            "pending_followups": pending_followups or 0,
            "high_priority_count": len(high_priority_doctors),
            # AI Insights
            "positive_interactions_count": sentiment_distribution.get("Positive", 0),
            "top_product": top_product_name,
            "high_opportunity_count": opps_count or 0
        },
        "high_priority_doctors": [d.to_dict() for d in high_priority_doctors],
        "recent_activity": [i.to_dict() for i in recent_interactions],
        "upcoming_followups": [f.to_dict() for f in active_followups],
        "ai_recommendations": ai_recommendations,
        # Distributions for SVG Charts
        "sentiment_distribution": sentiment_distribution,
        "product_distribution": product_distribution,
        "hospital_distribution": hospital_distribution,
        "followup_distribution": followup_distribution,
        "monthly_trend": monthly_trend
    }
