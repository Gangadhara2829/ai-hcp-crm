import datetime
from sqlalchemy.orm import Session
from app.db.session import engine, Base, SessionLocal
from app.db.models import User, Doctor, Product, Interaction, FollowUp

def seed_db(db: Session = None):
    # Ensure tables are created (useful for SQLite fallback)
    Base.metadata.create_all(bind=engine)
    
    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True
        
    try:
        # Check if we already have data
        if db.query(User).count() > 0:
            print("Database already seeded.")
            return

        print("Seeding database...")
        
        # 1. Create a User
        user = User(
            id=1,
            name="Alex Mercer",
            email="alex.mercer@biopharma.com",
            role="Senior Medical Representative"
        )
        db.add(user)
        db.flush() # Populate ID

        # 2. Create Products
        products = [
            Product(
                id=1,
                name="CardioShield",
                therapeutic_class="Cardiology",
                description="Next-generation beta-blocker with improved safety profile for hypertension control."
            ),
            Product(
                id=2,
                name="NeuroMax",
                therapeutic_class="Neurology",
                description="Cognitive enhancement and neuroprotection agent for early-stage Alzheimer's."
            ),
            Product(
                id=3,
                name="GlycoStop",
                therapeutic_class="Endocrinology",
                description="Once-weekly oral GLP-1 receptor agonist for type 2 diabetes management."
            ),
            Product(
                id=4,
                name="PulmoClear",
                therapeutic_class="Pulmonology",
                description="Inhaled corticosteroid combination for moderate-to-severe chronic asthma."
            )
        ]
        for p in products:
            db.add(p)
        db.flush()

        # 3. Create Doctors
        doctors = [
            Doctor(
                id=1,
                name="Dr. Sarah Jenkins",
                specialty="Cardiology",
                hospital="Grace General Hospital",
                email="sjenkins@gracehospital.org",
                phone="+1-555-0192",
                status="Active",
                priority="High"
            ),
            Doctor(
                id=2,
                name="Dr. Robert Chen",
                specialty="Endocrinology",
                hospital="Metro Health Center",
                email="r.chen@metrohealth.net",
                phone="+1-555-0144",
                status="Active",
                priority="High"
            ),
            Doctor(
                id=3,
                name="Dr. Emily Taylor",
                specialty="Neurology",
                hospital="City General Hospital",
                email="e.taylor@citygeneral.com",
                phone="+1-555-0188",
                status="Target",
                priority="Medium"
            ),
            Doctor(
                id=4,
                name="Dr. James Carter",
                specialty="Cardiology",
                hospital="Valley Heart Institute",
                email="jcarter@valleyheart.org",
                phone="+1-555-0155",
                status="Target",
                priority="Low"
            ),
            Doctor(
                id=5,
                name="Dr. Lisa Patel",
                specialty="Pediatrics",
                hospital="Children's Medical Center",
                email="lpatel@childrensmed.org",
                phone="+1-555-0112",
                status="Active",
                priority="Medium"
            ),
            Doctor(
                id=6,
                name="Dr. David Kim",
                specialty="Endocrinology",
                hospital="St. Jude Clinic",
                email="dkim@stjudeclinic.com",
                phone="+1-555-0177",
                status="Target",
                priority="High"
            )
        ]
        for d in doctors:
            db.add(d)
        db.flush()

        # 4. Add some past interactions & follow-ups for realistic dashboards
        interaction_1 = Interaction(
            id=1,
            doctor_id=1,
            user_id=1,
            product_id=1,
            date=datetime.date.today() - datetime.timedelta(days=5),
            interaction_type="In-Person",
            notes="Discussed CardioShield efficacy data. Dr. Jenkins was receptive but wanted details on renal safety.",
            summary="Introductory meeting on CardioShield. Receptive to safety profile; requested renal safety data.",
            sentiment="Positive",
            next_action="Provide renal clearance clinical study papers."
        )
        interaction_2 = Interaction(
            id=2,
            doctor_id=2,
            user_id=1,
            product_id=3,
            date=datetime.date.today() - datetime.timedelta(days=3),
            interaction_type="Virtual",
            notes="Brief Zoom check-in on GlycoStop samples. Reports positive initial patient feedback. Still has inventory for 2 weeks.",
            summary="Zoom call regarding GlycoStop samples. Positive feedback, monitoring sample counts.",
            sentiment="Positive",
            next_action="Re-supply samples in next visit."
        )
        db.add(interaction_1)
        db.add(interaction_2)
        db.flush()

        # 5. Add some follow-ups
        follow_ups = [
            FollowUp(
                id=1,
                interaction_id=1,
                doctor_id=1,
                user_id=1,
                title="Deliver CardioShield Renal Study",
                due_date=datetime.date.today() + datetime.timedelta(days=2),
                status="Pending",
                priority="High",
                educational_material="CardioShield Renal Safety Report (PDF)"
            ),
            FollowUp(
                id=2,
                interaction_id=2,
                doctor_id=2,
                user_id=1,
                title="Deliver GlycoStop Sample Kit",
                due_date=datetime.date.today() + datetime.timedelta(days=6),
                status="Pending",
                priority="Medium",
                educational_material="GlycoStop Patient Starter Kit"
            )
        ]
        for f in follow_ups:
            db.add(f)
        
        db.commit()
        print("Database seeding completed successfully.")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        if close_session:
            db.close()

if __name__ == "__main__":
    seed_db()
