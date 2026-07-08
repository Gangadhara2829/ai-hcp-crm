import datetime
from sqlalchemy.orm import Session
from app.db.models import Doctor, Product, Interaction, FollowUp, User
from typing import Dict, Any, List

def resolve_doctor(db: Session, doctor_name: str, hospital: str = None, specialty: str = None) -> Doctor:
    """Helper to resolve a doctor by name (case-insensitive, fuzzy-ish match) or create one."""
    if not doctor_name:
        return None
        
    # Clean prefix
    clean_name = doctor_name.replace("Dr. ", "").replace("Dr ", "").replace("dr. ", "").replace("dr ", "").strip()
    
    # Query database
    doctor = db.query(Doctor).filter(Doctor.name.ilike(f"%{clean_name}%")).first()
    if doctor:
        modified = False
        if hospital and hospital.strip() and doctor.hospital in ["Community Health Clinic", "CRM Resolved Hospital"]:
            doctor.hospital = hospital.strip()
            modified = True
        if specialty and specialty.strip() and doctor.specialty == "General Medicine":
            doctor.specialty = specialty.strip()
            modified = True
        if modified:
            db.commit()
            db.refresh(doctor)
        return doctor
        
    # If not found, create a new doctor
    new_doc = Doctor(
        name=f"Dr. {clean_name}",
        specialty=specialty or "General Medicine",
        hospital=hospital or "Community Health Clinic",
        status="Target",
        priority="Medium"
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return new_doc

def resolve_product(db: Session, product_name: str) -> Product:
    """Helper to resolve product by name or create a new one."""
    if not product_name:
        return None
    product = db.query(Product).filter(Product.name.ilike(f"%{product_name}%")).first()
    if product:
        return product
        
    # If not found, dynamically create the product
    new_product = Product(
        name=product_name.strip(),
        therapeutic_class="General Therapeutics",
        description=f"Dynamically registered clinical solution for {product_name.strip()}."
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

# 1. Log Interaction Tool
def tool_log_interaction(db: Session, user_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract information and log a new meeting with an HCP."""
    doctor_name = data.get("doctor_name")
    product_name = data.get("product_name")
    notes = data.get("notes", "")
    summary = data.get("summary", "")
    sentiment = data.get("sentiment", "Neutral")
    follow_up_title = data.get("follow_up_title", "")
    follow_up_days = data.get("follow_up_days", 14)
    follow_up_date = data.get("follow_up_date")
    educational_material = data.get("educational_material", "")
    hospital = data.get("hospital", "")
    specialty = data.get("specialty", "")
    meeting_date_str = data.get("meeting_date")
    
    # Resolve meeting date
    meeting_date = datetime.date.today()
    if meeting_date_str:
        try:
            if isinstance(meeting_date_str, str):
                meeting_date = datetime.date.fromisoformat(meeting_date_str)
        except Exception:
            pass

    # Resolve references
    doctor = resolve_doctor(db, doctor_name, hospital=hospital, specialty=specialty)
    if not doctor:
        return {"success": False, "error": "Could not identify or create Doctor."}
        
    product = resolve_product(db, product_name)
    
    # Create Interaction
    interaction = Interaction(
        doctor_id=doctor.id,
        user_id=user_id,
        product_id=product.id if product else None,
        date=meeting_date,
        interaction_type=data.get("channel", "In-Person"),
        notes=notes or summary,
        summary=summary or f"Logged meeting regarding {product_name or 'unspecified product'}",
        sentiment=sentiment,
        next_action=follow_up_title or "Follow up on discussion points."
    )
    db.add(interaction)
    db.flush() # get ID

    # Create FollowUp if requested
    follow_up = None
    if follow_up_title or follow_up_days or follow_up_date:
        due = datetime.date.today() + datetime.timedelta(days=14)
        if follow_up_date:
            try:
                if isinstance(follow_up_date, str):
                    due = datetime.date.fromisoformat(follow_up_date)
            except Exception:
                pass
        elif follow_up_days:
            try:
                due = datetime.date.today() + datetime.timedelta(days=int(follow_up_days))
            except Exception:
                pass
                
        follow_up = FollowUp(
            interaction_id=interaction.id,
            doctor_id=doctor.id,
            user_id=user_id,
            title=follow_up_title or f"Follow up meeting regarding {product_name or 'treatment'}",
            due_date=due,
            status="Pending",
            priority=data.get("priority", "Medium"),
            educational_material=educational_material
        )
        db.add(follow_up)
    
    db.commit()

    return {
        "success": True,
        "interaction": interaction.to_dict(),
        "follow_up": follow_up.to_dict() if follow_up else None,
        "message": f"Successfully logged interaction {interaction.id} for {doctor.name}."
    }

# 2. Edit Interaction Tool
def tool_edit_interaction(db: Session, user_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
    """Modify an existing interaction."""
    interaction_id = data.get("interaction_id")
    if not interaction_id:
        doctor_name = data.get("doctor_name")
        if doctor_name:
            doctor = resolve_doctor(db, doctor_name)
            if doctor:
                last_int = db.query(Interaction).filter(Interaction.doctor_id == doctor.id).order_by(Interaction.date.desc()).first()
                if last_int:
                    interaction_id = last_int.id
                    
    if not interaction_id:
        return {"success": False, "error": "Interaction ID is required."}
        
    interaction = db.query(Interaction).filter(Interaction.id == int(interaction_id)).first()
    if not interaction:
        return {"success": False, "error": f"Interaction {interaction_id} not found."}
        
    if "notes" in data and data["notes"]:
        interaction.notes = data["notes"]
    if "summary" in data and data["summary"]:
        interaction.summary = data["summary"]
    if "sentiment" in data and data["sentiment"]:
        interaction.sentiment = data["sentiment"]
    if "next_action" in data and data["next_action"]:
        interaction.next_action = data["next_action"]
    if "follow_up_title" in data and data["follow_up_title"]:
        interaction.next_action = data["follow_up_title"]
    if "product_name" in data and data["product_name"]:
        product = resolve_product(db, data["product_name"])
        if product:
            interaction.product_id = product.id

    db.commit()
    db.refresh(interaction)
    
    return {
        "success": True,
        "interaction": interaction.to_dict(),
        "message": f"Interaction {interaction_id} updated successfully."
    }

# 3. Search Interaction History Tool
def tool_search_history(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Search for previous meetings with a Doctor."""
    doctor_name = data.get("doctor_name")
    doctor = resolve_doctor(db, doctor_name)
    if not doctor:
        return {"success": False, "error": "Doctor not found."}
        
    interactions = db.query(Interaction).filter(Interaction.doctor_id == doctor.id).order_by(Interaction.date.desc()).all()
    
    return {
        "success": True,
        "doctor": doctor.to_dict(),
        "interactions": [i.to_dict() for i in interactions],
        "count": len(interactions)
    }

# 4. Generate Summary Tool
def tool_generate_summary(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate summary of all meetings for an HCP."""
    doctor_name = data.get("doctor_name")
    doctor = resolve_doctor(db, doctor_name)
    if not doctor:
        return {"success": False, "error": "Doctor not found."}
        
    interactions = db.query(Interaction).filter(Interaction.doctor_id == doctor.id).order_by(Interaction.date.desc()).all()
    if not interactions:
        return {
            "success": True,
            "doctor": doctor.to_dict(),
            "summary": "No interaction history available. Log your first interaction to unlock summary profile.",
            "sentiment_trend": "Neutral"
        }
        
    # Textual compilation
    meeting_summaries = []
    sentiments = []
    products_discussed = set()
    
    for i in interactions:
        pname = i.product.name if i.product else "therapeutic options"
        products_discussed.add(pname)
        sentiments.append(i.sentiment)
        
    # Simple consensus sentiment
    positive_count = sentiments.count("Positive")
    negative_count = sentiments.count("Negative")
    if positive_count > negative_count:
        trend = "Positive"
    elif negative_count > positive_count:
        trend = "Negative"
    else:
        trend = "Neutral"

    # Build professional narrative summary
    latest = interactions[0]
    pnames = ", ".join(products_discussed)
    latest_product = latest.product.name if latest.product else "efficacy trials"
    
    narrative_parts = [
        f"Visited {doctor.name} at {doctor.hospital}.",
        f"Across {len(interactions)} professional detailing sessions, discussions focused on clinical data for {pnames}."
    ]
    
    if latest.summary or latest.notes:
        feedback = latest.summary or latest.notes
        narrative_parts.append(f"During the most recent session regarding {latest_product}, the feedback was: '{feedback}'.")
        
    if latest.sentiment == "Positive":
        narrative_parts.append("The doctor appreciated the clinical evidence and demonstrated high receptivity to prescribing.")
    elif latest.sentiment == "Negative":
        narrative_parts.append("The doctor raised objections, preferred competing brands, or requested significant new comparative clinical evidence.")
    else:
        narrative_parts.append("The doctor is satisfied with current medicines and is evaluating trial outcomes.")
        
    if latest.next_action:
        narrative_parts.append(f"Follow-up is scheduled: '{latest.next_action}'.")
        
    full_text_summary = " ".join(narrative_parts)
    
    return {
        "success": True,
        "doctor": doctor.to_dict(),
        "summary": full_text_summary,
        "products_discussed": list(products_discussed),
        "sentiment_trend": trend,
        "meeting_count": len(interactions)
    }

# 5. Next Best Action Tool
def tool_next_best_action(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Recommend next meeting focus, priority, timing and materials."""
    doctor_name = data.get("doctor_name")
    doctor = resolve_doctor(db, doctor_name)
    if not doctor:
        return {"success": False, "error": "Doctor not found."}
        
    # Pull recent meetings
    last_interaction = db.query(Interaction).filter(Interaction.doctor_id == doctor.id).order_by(Interaction.date.desc()).first()
    
    # Recommendation logic (Heuristics supplemented by LLM in response generator)
    priority = doctor.priority
    
    if last_interaction:
        days_since = (datetime.date.today() - last_interaction.date).days
        last_product = last_interaction.product.name if last_interaction.product else "none"
        last_sentiment = last_interaction.sentiment
    else:
        days_since = 999
        last_product = "none"
        last_sentiment = "Neutral"
        
    # Build recommendation timing
    if priority == "High":
        timing_days = 7 if days_since > 14 else 14
    elif priority == "Medium":
        timing_days = 14 if days_since > 30 else 30
    else:
        timing_days = 30
        
    # Product focus sequence
    products = db.query(Product).all()
    product_names = [p.name for p in products]
    
    # Simple recommendation
    if last_product == "none" or last_product not in product_names:
        suggested_product = product_names[0] if product_names else "therapeutic options"
    else:
        # recommend a different product for cross-selling, or same if sentiment is high
        if last_sentiment == "Positive" and days_since < 30:
            suggested_product = last_product # stick with it
        else:
            idx = (product_names.index(last_product) + 1) % len(product_names)
            suggested_product = product_names[idx]

    # Specialty specific items to bring
    specialty_brings = {
        "Cardiology": "hypertension safety outcome trials and dosage studies",
        "Neurology": "safety profile data and long-term efficacy studies",
        "Endocrinology": "diabetes treatment outcome reports and HbA1c metrics",
        "General Medicine": "comprehensive product monographs and safety brochures",
    }
    bring_item = specialty_brings.get(doctor.specialty, "clinical efficacy brochures")
    
    # Analyze doctor's previous objections/notes
    objection = "compliance and efficacy reviews"
    if last_interaction and last_interaction.notes:
        notes_lower = last_interaction.notes.lower()
        if "safety" in notes_lower or "side effect" in notes_lower:
            objection = "long-term safety profiles and risk data"
        elif "price" in notes_lower or "cost" in notes_lower:
            objection = "comparative cost-efficacy pricing sheets"
        elif "evidence" in notes_lower or "study" in notes_lower:
            objection = "clinical trial data evidence"
            
    # Timing label
    timing_text = f"Visit after {timing_days} days"
    if timing_days == 1:
        timing_text = "Visit tomorrow"
    elif timing_days == 7:
        timing_text = "Visit after one week"
    elif timing_days == 14:
        timing_text = "Visit after two weeks"
    elif timing_days == 30:
        timing_text = "Visit after one month"

    # Dynamic material name based on the recommended product
    material = f"Updated clinical trials and {bring_item}."

    return {
        "success": True,
        "doctor": doctor.to_dict(),
        "recommended_timing_days": timing_days,
        "recommended_timing_text": timing_text,
        "recommended_priority": "High" if (priority == "High" or last_sentiment == "Negative") else "Medium",
        "recommended_product": suggested_product,
        "educational_material": material,
        "objective": f"Address {objection} and review therapeutic benefits of {suggested_product}.",
        "talking_points": [
            f"Discuss clinical studies regarding {suggested_product} for {doctor.specialty}.",
            f"Resolve specific feedback regarding {objection} raised in the last meeting."
        ]
    }

# 6. Email Draft Generator Tool (Bonus)
def tool_email_draft(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a professional follow-up email draft."""
    doctor_name = data.get("doctor_name")
    doctor = resolve_doctor(db, doctor_name)
    if not doctor:
        return {"success": False, "error": "Doctor not found."}
        
    # Get last interaction to personalise
    last_interaction = db.query(Interaction).filter(Interaction.doctor_id == doctor.id).order_by(Interaction.date.desc()).first()
    
    product_name = "our therapeutic solutions"
    notes_clause = "our discussion"
    due_clause = "two weeks"
    
    if last_interaction:
        if last_interaction.product:
            product_name = last_interaction.product.name
        if last_interaction.notes:
            notes_clause = f"your questions regarding {last_interaction.notes.strip('.')}"
        if last_interaction.next_action:
            due_clause = "soon"
            
    subject = f"Follow-up regarding {product_name} discussion"
    body = (
        f"Dear {doctor.name},\n\n"
        f"Thank you for taking the time to meet with me today at {doctor.hospital}.\n\n"
        f"I appreciate your valuable feedback regarding {product_name}. "
        f"As requested, I have compiled and attached the latest clinical evidence papers to address {notes_clause}.\n\n"
        f"Please let me know if you need any additional information. Looking forward to meeting you again {due_clause}.\n\n"
        f"Kind regards,\n\n"
        f"Alex Mercer\n"
        f"Medical Representative"
    )
    
    return {
        "success": True,
        "doctor": doctor.to_dict(),
        "subject": subject,
        "body": body
    }

# 7. Doctor Profile Summary Tool (Bonus)
def tool_doctor_summary(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Get aggregated HCP information, status, and summary statistics."""
    doctor_name = data.get("doctor_name")
    doctor = resolve_doctor(db, doctor_name)
    if not doctor:
        return {"success": False, "error": "Doctor not found."}
        
    interactions_count = db.query(Interaction).filter(Interaction.doctor_id == doctor.id).count()
    pending_follow_ups = db.query(FollowUp).filter(FollowUp.doctor_id == doctor.id, FollowUp.status == "Pending").count()
    
    return {
        "success": True,
        "doctor": doctor.to_dict(),
        "stats": {
            "total_meetings": interactions_count,
            "pending_followups": pending_follow_ups,
        }
    }
