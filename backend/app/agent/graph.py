import json
import re
import datetime
from typing import Dict, Any, List, TypedDict, Optional
from sqlalchemy.orm import Session

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END

from app.config import GROQ_API_KEY, GROQ_MODEL
from app.agent.tools import (
    tool_log_interaction,
    tool_edit_interaction,
    tool_search_history,
    tool_generate_summary,
    tool_next_best_action,
    tool_email_draft,
    tool_doctor_summary
)

# Define State Structure
class AgentState(TypedDict):
    messages: List[Dict[str, str]]
    current_input: str
    intent: str
    resolved_input: str
    extracted_entities: Dict[str, Any]
    tool_output: Dict[str, Any]
    validation_passed: bool
    validation_error: str
    database_committed: bool
    final_response: Dict[str, Any]

class CRMGraphWrapper:
    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id
        
        # Initialize Groq LLM if API key is present
        if GROQ_API_KEY and "your_groq_api_key" not in GROQ_API_KEY:
            try:
                self.llm = ChatGroq(
                    groq_api_key=GROQ_API_KEY, 
                    model_name=GROQ_MODEL, 
                    temperature=0.1
                )
            except Exception as e:
                print(f"Error initializing ChatGroq: {e}. Fallback to simulated NLP active.")
                self.llm = None
        else:
            self.llm = None

    def _call_llm_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Helper to invoke Groq and parse JSON safely."""
        if not self.llm:
            raise ValueError("No LLM client configured")
            
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]
        
        response = self.llm.invoke(messages)
        content = response.content.strip()
        
        # Clean JSON format block if returned (e.g. ```json ... ```)
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            print(f"Failed to parse LLM JSON: {content}. Error: {e}")
            raise e

    def _fallback_intent_detection(self, text: str) -> str:
        """Parse intent based on explicit verbs/keywords in case LLM is unavailable."""
        text_lower = text.lower()
        
        # 1. Summarization check
        if "summarize" in text_lower or "summary" in text_lower:
            return "generate_summary"
            
        # 2. Logging indicators (explicit logging statements)
        log_indicators = ["visited", "met today", "met dr", "spoke to", "visited dr", "introduced", "logged meeting", "log the interaction", "log this interaction", "i met", "log interaction"]
        if any(indicator in text_lower for indicator in log_indicators):
            return "log_interaction"
            
        # 3. Edit/update check
        edit_keywords = ["update", "edit", "modify", "change", "correct", "delete"]
        if any(re.search(rf"\b{re.escape(kw)}\b", text_lower) for kw in edit_keywords):
            return "edit_interaction"
            
        # 4. Email check
        if "email" in text_lower and ("draft" in text_lower or "write" in text_lower or "send" in text_lower or "follow" in text_lower):
            return "email_draft"
            
        # 5. Next Best Action check
        if any(kw in text_lower for kw in ["next", "nba", "recommend", "suggest", "action"]):
            return "next_best_action"
            
        # 6. History check
        if any(kw in text_lower for kw in ["history", "previous", "past", "meetings", "records", "visits"]):
            return "search_history"
            
        return "log_interaction"

    def _fallback_entity_extraction(self, text: str) -> Dict[str, Any]:
        """Regex and heuristic rule-based NLP extraction when Groq is unavailable."""
        text_lower = text.lower()
        
        # Extract Doctor
        doctor_name = ""
        doc_matches = re.findall(r"(?:dr\.|doctor)\s+([a-z\s]+?)(?:\s+at|\s+today|\s+met|\s+spoke|\s+discussed|\.|\,|$)", text_lower)
        if doc_matches:
            doctor_name = f"Dr. {doc_matches[0].strip().title()}"
        else:
            doc_matches_simple = re.findall(r"(?:dr\.|doctor)\s+([a-z]+(?:\s+[a-z]+)?)", text_lower)
            if doc_matches_simple:
                doctor_name = f"Dr. {doc_matches_simple[0].title()}"
                
        # Extract Product
        product_name = ""
        # 1. Look for matching product after keywords
        prod_match = re.search(r"\b(?:introduced|discussed|promoted|regarding|about|switch to)\s+([a-z0-9\s\-+]+?)(?:\s+for\s+|\s+at\s+|\s+with\s+|\.|\,|$)", text_lower)
        if prod_match:
            product_name = prod_match.group(1).strip().title()
        else:
            # 2. Look for capitalized patterns in original text if any
            for p in ["cardioshield", "neuromax", "glycostop", "pulmoclear", "painrelief plus"]:
                if p in text_lower:
                    product_name = p.title()
            
        # Extract Hospital
        hospital = ""
        hosp_match = re.search(r"\b(?:at|in|visited)\s+([a-z0-9\s\-]+?(?:hospital|clinic|center|institute|health|infirmary))\b", text_lower)
        if hosp_match:
            hospital = hosp_match.group(1).strip().title()
            
        # Extract Specialty
        specialty = "General Medicine"
        if any(w in text_lower for w in ["arthritis", "joint", "rheum"]):
            specialty = "Rheumatology"
        elif any(w in text_lower for w in ["cardio", "heart", "hypertension", "blood pressure"]):
            specialty = "Cardiology"
        elif any(w in text_lower for w in ["neuro", "brain", "alzheimer", "cognitive"]):
            specialty = "Neurology"
        elif any(w in text_lower for w in ["glyco", "diabet", "sugar", "endocrin"]):
            specialty = "Endocrinology"
        elif any(w in text_lower for w in ["pulmo", "asthma", "bronch", "lung"]):
            specialty = "Pulmonology"

        # Extract Channel
        channel = "In-Person"
        if "virtual" in text_lower or "zoom" in text_lower or "online" in text_lower:
            channel = "Virtual"
        elif "phone" in text_lower or "called" in text_lower or "tele" in text_lower:
            channel = "Phone"
        elif "email" in text_lower or "emailed" in text_lower:
            channel = "Email"
            
        # Natural language follow-up duration mapping
        follow_up_days = 14
        today_date = datetime.date.today()
        
        if "tomorrow" in text_lower:
            follow_up_days = 1
        elif "six months" in text_lower or "6 months" in text_lower:
            follow_up_days = 180
        elif "three months" in text_lower or "3 months" in text_lower:
            follow_up_days = 90
        elif "one month" in text_lower or "1 month" in text_lower or "a month" in text_lower:
            follow_up_days = 30
        elif "two weeks" in text_lower or "2 weeks" in text_lower:
            follow_up_days = 14
        elif "next week" in text_lower:
            follow_up_days = 7
        elif "next monday" in text_lower:
            days_ahead = 7 - today_date.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            follow_up_days = days_ahead
        elif "end of this month" in text_lower:
            if today_date.month == 12:
                last_day = datetime.date(today_date.year + 1, 1, 1) - datetime.timedelta(days=1)
            else:
                last_day = datetime.date(today_date.year, today_date.month + 1, 1) - datetime.timedelta(days=1)
            follow_up_days = (last_day - today_date).days
        else:
            months_match = re.search(r"(\d+)\s+months?", text_lower)
            weeks_match = re.search(r"(\d+)\s+weeks?", text_lower)
            days_match = re.search(r"(\d+)\s+days?", text_lower)
            if months_match:
                follow_up_days = int(months_match.group(1)) * 30
            elif weeks_match:
                follow_up_days = int(weeks_match.group(1)) * 7
            elif days_match:
                follow_up_days = int(days_match.group(1))
                
        follow_up_date = (datetime.date.today() + datetime.timedelta(days=follow_up_days)).isoformat()
            
        # Extract follow up title / recommendation
        follow_up_title = ""
        rec_match = re.search(r"\b(?:remind me to|reconnect after|recommendation is to)\s+([a-z0-9\s\-+.,]+)$", text_lower)
        if rec_match:
            follow_up_title = rec_match.group(1).strip().capitalize()
        else:
            follow_up_title = f"Follow up regarding {product_name or 'discussion'}."
            
        # Extract sentiment according to specific business rules:
        # Positive: Doctor interested, Requested samples, Accepted brochure, Wants follow-up, Interested in prescribing
        # Negative: Not interested, Declined samples, Refused brochures, Prefers competitor, Bad previous experience, Rejected product
        # Neutral: Needs more evidence, Waiting, Undecided, Needs committee approval, Needs pricing, satisfied with current
        sentiment = "Neutral"
        
        positive_indicators = [
            "satisfied", "interested", "receptive", "positive", "great", "keen", "appreciate", 
            "excited", "prescribe", "requested", "accepted"
        ]
        negative_indicators = [
            "not satisfied", "declined", "refused", "not interested", "competitor", "competing", 
            "no benefit", "dislike", "reject", "skeptical", "negative", "concerned", "no future"
        ]
        neutral_indicators = [
            "satisfied with current", "satisfied with the medicine", "satisfied with medicines", 
            "not planning to switch", "undecided", "waiting", "pricing", "committee"
        ]
        
        if any(w in text_lower for w in negative_indicators):
            sentiment = "Negative"
        elif any(w in text_lower for w in neutral_indicators):
            sentiment = "Neutral"
        elif any(w in text_lower for w in positive_indicators):
            sentiment = "Positive"
            
        # Priority
        priority = "Medium"
        if "high" in text_lower or "urgent" in text_lower:
            priority = "High"
        elif "low" in text_lower:
            priority = "Low"
            
        # Samples
        samples_distributed = "0"
        samples_match = re.search(r"(\d+)\s+samples?", text_lower)
        if samples_match:
            samples_distributed = samples_match.group(1)
        elif "no samples" in text_lower or "zero samples" in text_lower:
            samples_distributed = "0"
            
        # Notes and rich fallback summary
        notes = text
        if len(text) > 40:
            summary = text.strip()
        else:
            pname = product_name or "therapeutic options"
            dname = doctor_name or "HCP"
            hname = hospital or "practice location"
            summary = f"Completed scientific detailing session with {dname} at {hname} regarding {pname} efficacy clinical data."
        
        conf = 0.96
        if not doctor_name:
            conf = 0.74
        elif not product_name:
            conf = 0.88
            
        entities = {
            "doctor_name": doctor_name or "Unknown Doctor",
            "hospital": hospital or "Unknown Clinic",
            "specialty": specialty,
            "meeting_date": datetime.date.today().isoformat(),
            "channel": channel,
            "product_name": product_name or "General Discussion",
            "clinical_questions": "Requested safety profile guidelines." if "question" in text_lower or "safety" in text_lower else "",
            "samples_distributed": samples_distributed,
            "follow_up_date": follow_up_date,
            "follow_up_days": follow_up_days,
            "follow_up_title": follow_up_title,
            "priority": priority,
            "sentiment": sentiment,
            "summary": summary,
            "confidence_score": conf,
            "interaction_id": None
        }
        
        # Extract ID for edit scenario
        id_match = re.search(r"(?:id|interaction)\s+(\d+)", text_lower)
        if id_match:
            entities["interaction_id"] = int(id_match.group(1))
        
        return entities

    # ==========================================
    # LANGGRAPH NODES
    # ==========================================
    
    def node_intent_detection(self, state: AgentState) -> Dict[str, Any]:
        """Classify user intent using Groq LLM or custom failsafe rules."""
        input_text = state["current_input"]
        
        if not self.llm:
            intent = self._fallback_intent_detection(input_text)
            return {"intent": intent}
            
        system_prompt = """You are an AI NLU intent classifier for a Healthcare CRM used by pharmaceutical sales representatives.
Classify the representative's input message into exactly one of the following intents:
- "log_interaction": Representative wants to log a new visit/meeting with a doctor (e.g. "I met Dr Kumar today", "visited Dr Patel", etc.).
- "edit_interaction": Representative explicitly wants to update, edit, modify, change, correct, or delete a past/existing interaction (e.g. "Change follow up to next week", "Update interaction 5 notes").
- "search_history": Representative wants to search or view past meeting logs/records for a doctor (e.g. "Show previous meetings", "Show past visits for Dr Sarah").
- "generate_summary": Representative wants to generate a summary or profile of all interactions with a doctor (e.g. "Summarize all interactions", "Give me a summary profile of Dr Jenkins").
- "next_best_action": Representative wants recommendations, next steps, or a plan for the next visit to a doctor (e.g. "What is the next best action for Dr Kumar?", "Suggest next steps for Dr Patel").

CRITICAL INSTRUCTION:
Only classify as "edit_interaction" if the user explicitly uses action verbs like "update", "edit", "modify", "change", "correct", or "delete". If the user is describing a visit (even if they specify details of a meeting), it is a NEW interaction and must be classified as "log_interaction".

Output format MUST be valid JSON conforming to:
{
  "intent": "log_interaction" | "edit_interaction" | "search_history" | "generate_summary" | "next_best_action"
}
Return only JSON inside a block."""
        
        try:
            result = self._call_llm_json(system_prompt, f"Classify this CRM prompt: '{input_text}'")
            intent = result.get("intent", "log_interaction")
        except Exception as e:
            print(f"Groq intent detection error: {e}. Falling back to rules.")
            intent = self._fallback_intent_detection(input_text)
            
        # Critical Issue rule enforcement: Edit Interaction should ONLY execute when user explicitly uses edit keywords
        edit_keywords = ["update", "edit", "modify", "change", "correct", "delete", "changed", "updated", "modified", "corrected", "deleted"]
        if intent == "edit_interaction":
            has_edit_word = any(re.search(rf"\b{re.escape(kw)}\b", input_text.lower()) for kw in edit_keywords)
            
            # Failsafe: if it contains logging indicators, override to log_interaction
            log_indicators = ["visited", "met today", "met dr", "spoke to", "visited dr", "introduced", "logged meeting", "log the interaction", "log this interaction", "i met", "log interaction"]
            is_logging = any(indicator in input_text.lower() for indicator in log_indicators)
            
            if not has_edit_word or is_logging:
                intent = "log_interaction"
                
        return {"intent": intent}

    def node_conversation_memory(self, state: AgentState) -> Dict[str, Any]:
        """Resolve coreferences by combining historical chat logs with the current input."""
        input_text = state["current_input"]
        history = state.get("messages", [])
        
        if not self.llm or not history:
            return {"resolved_input": input_text}
            
        system_prompt = """You are a conversational CRM assistant. Given the chat history and the current user input, produce a single, unified text description of the current request that resolves any coreferences (like "him", "her", "that meeting", "yesterday", "we") and includes crucial context (like the doctor's name, hospital, or product discussed in recent turns) from the conversation history.
        
Example:
History:
User: "I met Dr. Anil Kumar today at Manipal Hospital."
Assistant: "Understood, logging interaction..."
User: "We discussed CardioShield."
Output: "I met Dr. Anil Kumar today at Manipal Hospital and we discussed CardioShield."

History:
User: "Show previous meetings with Dr Jenkins."
Assistant: "Here are the previous meetings..."
User: "Summarize them."
Output: "Summarize all previous meetings with Dr. Jenkins."

Return the resolved, fully self-contained description. Do not reply to the user. Just return the resolved description as plain text."""

        history_str = ""
        for m in history[-6:]: # Limit to last 3 exchanges
            role = "User" if m.get("role") == "user" or m.get("sender") == "user" else "Assistant"
            text = m.get("content") or m.get("text") or ""
            history_str += f"{role}: \"{text}\"\n"
            
        user_prompt = f"History:\n{history_str}\nUser: \"{input_text}\"\nOutput:"
        
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            response = self.llm.invoke(messages)
            resolved = response.content.strip()
            return {"resolved_input": resolved}
        except Exception as e:
            print(f"Groq memory coreference resolution error: {e}.")
            return {"resolved_input": input_text}

    def node_entity_extraction(self, state: AgentState) -> Dict[str, Any]:
        """Extract all structured clinical CRM variables from the resolved query text."""
        resolved_text = state.get("resolved_input") or state["current_input"]
        
        if not self.llm:
            entities = self._fallback_entity_extraction(resolved_text)
            return {"extracted_entities": entities}
            
        system_prompt = f"""You are an expert clinical CRM data extractor. Extract the following entities from the user's resolved CRM message.
Today's date is {datetime.date.today().isoformat()}.

Extract these fields:
- "doctor_name": Full name of doctor (include 'Dr.' prefix if appropriate)
- "hospital": Name of hospital or clinic practicing at
- "specialty": Specialty of the doctor (e.g. Cardiology, Neurology, Endocrinology, General Medicine)
- "meeting_date": The date of the meeting. If not specified, default to today's date ({datetime.date.today().isoformat()}).
- "channel": The communication channel. One of: "In-Person", "Virtual", "Phone", "Email" (default to "In-Person" if not specified)
- "product_name": Name of product discussed
- "clinical_questions": Any clinical questions, feedback, or objections raised by the doctor
- "samples_distributed": Number of samples distributed (integer or string)
- "follow_up_days": Estimated follow-up duration in days (integer). Parse natural follow-up periods accurately:
  * "Tomorrow" -> 1
  * "Next Monday" -> Days until next Monday
  * "Next Week" -> 7
  * "Two Weeks" / "2 Weeks" -> 14
  * "One Month" / "a month" -> 30
  * "Three Months" -> 90
  * "Six Months" -> 180
  * "End of this month" -> Days until last day of current month
  Default to 14 if none specified.
- "follow_up_date": Calculate the exact date using today's date ({datetime.date.today().isoformat()}) + follow_up_days.
- "follow_up_title": The brief objective for the follow-up.
- "priority": Priority level. One of: "High", "Medium", "Low"
- "sentiment": Doctor's reception/sentiment. Classify strictly using these business rules:
  * "Positive": Doctor interested, Requested samples, Accepted brochure, Wants follow-up, Interested in prescribing.
  * "Neutral": Needs more evidence, Waiting, Undecided, Needs committee approval, Needs pricing, satisfied with current medicines/treatment.
  * "Negative": Not interested, Declined samples, Refused brochures, Prefers competitor, Bad previous experience, Does not want future visits, Rejected product.
- "summary": A detailed professional CRM notes summary containing doctor objections, products discussed, questions, and relationship dynamics. Avoid generic summaries like "Discussed medical solutions" or "Meeting at clinic".
- "confidence_score": Simulated extraction confidence score (float between 0.85 and 0.98 depending on data completeness)
- "interaction_id": If updating, the database ID of the interaction (integer or null)

Output format MUST be valid JSON conforming to:
{{
  "doctor_name": "...",
  "hospital": "...",
  "specialty": "...",
  "meeting_date": "YYYY-MM-DD",
  "channel": "In-Person" | "Virtual" | "Phone" | "Email",
  "product_name": "...",
  "clinical_questions": "...",
  "samples_distributed": "...",
  "follow_up_date": "YYYY-MM-DD",
  "follow_up_days": 14,
  "follow_up_title": "...",
  "priority": "High" | "Medium" | "Low",
  "sentiment": "Positive" | "Neutral" | "Negative",
  "summary": "...",
  "confidence_score": 0.95,
  "interaction_id": null
}}
Return only JSON inside a block."""

        try:
            entities = self._call_llm_json(system_prompt, f"Extract CRM elements from: '{resolved_text}'")
            if not entities.get("meeting_date"):
                entities["meeting_date"] = datetime.date.today().isoformat()
            if not entities.get("follow_up_date"):
                days = entities.get("follow_up_days", 14)
                entities["follow_up_date"] = (datetime.date.today() + datetime.timedelta(days=int(days))).isoformat()
            return {"extracted_entities": entities}
        except Exception as e:
            print(f"Groq entity extraction error: {e}. Falling back to heuristics.")
            entities = self._fallback_entity_extraction(resolved_text)
            return {"extracted_entities": entities}

    def node_tool_router(self, state: AgentState) -> Dict[str, Any]:
        """Intermediate routing gateway."""
        return {}

    def node_execute_tool(self, state: AgentState) -> Dict[str, Any]:
        """Execute corresponding DB tool calculations."""
        intent = state["intent"]
        entities = state["extracted_entities"]
        
        output = {"success": False}
        
        try:
            if intent == "log_interaction":
                output = tool_log_interaction(self.db, self.user_id, entities)
            elif intent == "edit_interaction":
                output = tool_edit_interaction(self.db, self.user_id, entities)
            elif intent == "search_history":
                output = tool_search_history(self.db, entities)
            elif intent == "generate_summary":
                output = tool_generate_summary(self.db, entities)
            elif intent == "next_best_action":
                output = tool_next_best_action(self.db, entities)
            elif intent == "email_draft":
                output = tool_email_draft(self.db, entities)
            else:
                output = tool_doctor_summary(self.db, entities)
        except Exception as e:
            output = {"success": False, "error": f"Tool execution failed: {str(e)}"}
            
        return {"tool_output": output}

    def node_validation(self, state: AgentState) -> Dict[str, Any]:
        """Validate execution results and essential variables."""
        tool_output = state["tool_output"]
        intent = state["intent"]
        entities = state["extracted_entities"]
        
        if not tool_output.get("success", False):
            return {
                "validation_passed": False,
                "validation_error": tool_output.get("error", "General tool execution error")
            }
            
        if intent in ["log_interaction", "generate_summary", "next_best_action", "email_draft"] and not entities.get("doctor_name"):
            return {
                "validation_passed": False,
                "validation_error": "HCP (Doctor) name is missing or could not be parsed."
            }
            
        return {
            "validation_passed": True,
            "validation_error": ""
        }

    def node_database_commit(self, state: AgentState) -> Dict[str, Any]:
        """Finalize and commit any pending modifications."""
        validation_passed = state.get("validation_passed", True)
        if not validation_passed:
            return {"database_committed": False}
            
        try:
            self.db.commit()
            return {"database_committed": True}
        except Exception as e:
            print(f"Database commit error: {e}")
            return {"database_committed": False, "validation_error": f"Database commit failure: {str(e)}"}

    def node_response_generator(self, state: AgentState) -> Dict[str, Any]:
        """Generate chatbot markdown message and pack structured card data."""
        intent = state["intent"]
        entities = state["extracted_entities"]
        tool_output = state["tool_output"]
        validation_passed = state["validation_passed"]
        validation_error = state["validation_error"]
        
        # If validation failed, report error
        if not validation_passed:
            return {
                "final_response": {
                    "text": f"Sorry, I encountered an issue processing your request: {validation_error}. Please provide more details.",
                    "intent": intent,
                    "success": False,
                    "data": None
                }
            }
            
        # Build clean structural fields for frontend card
        doc_val = entities.get("doctor_name") or tool_output.get("doctor", {}).get("name") or "Unknown Doctor"
        hosp_val = entities.get("hospital") or tool_output.get("doctor", {}).get("hospital") or "General Clinic"
        spec_val = entities.get("specialty") or tool_output.get("doctor", {}).get("specialty") or "General Medicine"
        prod_val = entities.get("product_name") or tool_output.get("interaction", {}).get("product_name") or "General Discussion"
        
        card_data = {
            "doctor_name": doc_val,
            "hospital": hosp_val,
            "specialty": spec_val,
            "product_name": prod_val,
            "summary": entities.get("summary") or tool_output.get("interaction", {}).get("summary") or "Logged visit discussion.",
            "sentiment": entities.get("sentiment") or tool_output.get("interaction", {}).get("sentiment") or "Neutral",
            "priority": entities.get("priority") or tool_output.get("doctor", {}).get("priority") or "Medium",
            "samples_distributed": entities.get("samples_distributed") or "0",
            "follow_up_days": entities.get("follow_up_days") or 14,
            "follow_up_date": entities.get("follow_up_date") or "",
            "follow_up_title": entities.get("follow_up_title") or "Follow up meeting.",
            "confidence_score": entities.get("confidence_score") or 0.95,
            "ai_recommendations": [
                f"Share product monographs and clinical trials details for {prod_val}.",
                f"Schedule a revisit to check clinical feedback at {hosp_val}."
            ]
        }

        # Override recommendations dynamically if next best action was run
        if intent == "next_best_action":
            card_data["ai_recommendations"] = tool_output.get("talking_points") or [f"Discuss treatment metrics for {tool_output.get('recommended_product')}."]
            card_data["follow_up_days"] = tool_output.get("recommended_timing_days", 14)
            card_data["product_name"] = tool_output.get("recommended_product") or "General Product"
            card_data["recommended_timing_days"] = tool_output.get("recommended_timing_days", 14)
            card_data["recommended_product"] = tool_output.get("recommended_product") or "General Product"
            card_data["educational_material"] = tool_output.get("educational_material") or "Trial Reports"
            card_data["talking_points"] = tool_output.get("talking_points")

        # Include summary and sentiment trend for summary profiles
        if intent == "generate_summary" and tool_output.get("summary"):
            card_data["summary"] = tool_output["summary"]
            if tool_output.get("sentiment_trend"):
                card_data["sentiment"] = tool_output["sentiment_trend"]

        # Include subject and body for email drafts
        if tool_output.get("subject"):
            card_data["subject"] = tool_output["subject"]
        if tool_output.get("body"):
            card_data["body"] = tool_output["body"]

        # Refined LLM Response generator
        if self.llm:
            system_prompt = """You are a premium AI CRM assistant. Read the user input, the intent, and the tool execution results.
Draft a highly professional conversational summary in markdown.
Additionally, formulate the structured AI Card values in JSON.

CRITICAL INSTRUCTION:
Never use hardcoded placeholder values such as "CardioShield" or "Manipal Hospital" in your response or in the card data unless they were explicitly mentioned in the user input. Every single output value (doctor name, hospital, product discussed, specialty, summary, sentiment, follow-up, samples) must represent the actual conversation. If a product is not in the system, register it exactly as described.

Your output MUST be a JSON object containing:
{
  "text": "Your markdown conversational message...",
  "card_data": {
     "doctor_name": "...",
     "hospital": "...",
     "specialty": "...",
     "product_name": "...",
     "summary": "...",
     "sentiment": "Positive" | "Neutral" | "Negative",
     "priority": "High" | "Medium" | "Low",
     "samples_distributed": "...",
     "follow_up_days": 14,
     "follow_up_date": "...",
     "follow_up_title": "...",
     "confidence_score": 0.98,
     "ai_recommendations": ["..."],
     "recommended_timing_days": 14,
     "recommended_product": "...",
     "educational_material": "...",
     "objective": "...",
     "talking_points": ["..."],
     "subject": "...",
     "body": "..."
  }
}
Return only JSON inside a block. Keep the summary detailed and clear."""

            user_prompt = f"""
User Input: '{state['current_input']}'
Intent: {intent}
Tool Output: {json.dumps(tool_output)}
Extracted Card Base: {json.dumps(card_data)}
Draft JSON reply:"""

            try:
                result = self._call_llm_json(system_prompt, user_prompt)
                return {
                    "final_response": {
                        "text": result.get("text") or "Processed successfully.",
                        "intent": intent,
                        "success": True,
                        "data": result.get("card_data") or card_data
                    }
                }
            except Exception as e:
                print(f"Groq response generation failed: {e}. Using simulated.")
                
        # Simulated responses
        text_response = self._get_simulated_response(intent, tool_output)
        return {
            "final_response": {
                "text": text_response,
                "intent": intent,
                "success": True,
                "data": card_data
            }
        }

    def _get_simulated_response(self, intent: str, tool_output: Dict[str, Any]) -> str:
        """Fallback conversational responses for local execution without LLM API key."""
        if intent == "log_interaction":
            interaction = tool_output.get("interaction", {})
            doc_name = interaction.get("doctor_name", "the doctor")
            return f"### ✅ Interaction Successfully Logged\n\nI have logged the meeting with **{doc_name}** in the CRM database.\n- **Product:** {interaction.get('product_name') or 'General'}\n- **Sentiment:** {interaction.get('sentiment')}"
        elif intent == "edit_interaction":
            interaction = tool_output.get("interaction", {})
            return f"### 🔄 Record Updated Successfully\n\nI have modified interaction **ID {interaction.get('id')}** with Dr. {interaction.get('doctor_name', 'HCP')}."
        elif intent == "search_history":
            count = tool_output.get("count", 0)
            doc_name = tool_output.get("doctor", {}).get("name", "Doctor")
            return f"### 🔍 Search Results for {doc_name}\n\nRetrieved **{count}** meetings from logs."
        elif intent == "generate_summary":
            doc_name = tool_output.get("doctor", {}).get("name", "HCP")
            return f"### 📋 HCP Summary Profile for {doc_name}\n\nCompiled interaction trends."
        elif intent == "next_best_action":
            doc_name = tool_output.get("doctor", {}).get("name", "HCP")
            return f"### 💡 Next Best Action recommendation for {doc_name} compiled."
        else:
            return "CRM transaction executed successfully."

    def build_graph(self):
        """Assembles the LangGraph workflow sequentially matching requirement specifications."""
        builder = StateGraph(AgentState)
        
        # Add Nodes
        builder.add_node("intent_detection", self.node_intent_detection)
        builder.add_node("conversation_memory", self.node_conversation_memory)
        builder.add_node("entity_extraction", self.node_entity_extraction)
        builder.add_node("tool_router", self.node_tool_router)
        builder.add_node("execute_tool", self.node_execute_tool)
        builder.add_node("validation", self.node_validation)
        builder.add_node("database", self.node_database_commit)
        builder.add_node("response_generator", self.node_response_generator)
        
        # Sequentially map edges:
        # START -> Intent Detection -> Conversation Memory -> Entity Extraction -> Tool Router -> Execute Tool -> LLM Validation -> Database -> Generate Response -> END
        builder.add_edge(START, "intent_detection")
        builder.add_edge("intent_detection", "conversation_memory")
        builder.add_edge("conversation_memory", "entity_extraction")
        builder.add_edge("entity_extraction", "tool_router")
        builder.add_edge("tool_router", "execute_tool")
        builder.add_edge("execute_tool", "validation")
        builder.add_edge("validation", "database")
        builder.add_edge("database", "response_generator")
        builder.add_edge("response_generator", END)
        
        return builder.compile()
