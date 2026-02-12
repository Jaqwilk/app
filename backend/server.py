from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'fridgeai_db')]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'fridgeai_secret_2025')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# OpenAI Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI(title="FridgeAI API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Rate limiting storage (in-memory for MVP)
rate_limits: Dict[str, List[datetime]] = {}
MAX_REQUESTS_PER_HOUR = 30  # Hidden limit for AI features

# ============== Models ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    age: int = 25
    sex: Optional[str] = None
    height_cm: float = 170
    weight_kg: float = 70
    activity_level: str = "moderate"  # sedentary, light, moderate, active, very_active
    goal: str = "maintain"  # cut, bulk, maintain
    target_rate: Optional[float] = None  # kg per week
    dietary_type: str = "none"  # none, keto, vegan, vegetarian, halal, etc.
    allergies: List[str] = []
    dislikes: List[str] = []
    cooking_time: str = "normal"  # quick, normal
    budget_mode: bool = False

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    profile: Optional[UserProfile] = None
    daily_calories: int = 2000
    daily_protein: int = 150
    daily_carbs: int = 200
    daily_fat: int = 67
    is_premium: bool = False
    streak: int = 0
    created_at: datetime

class ProfileUpdate(BaseModel):
    profile: UserProfile

class MacroTargets(BaseModel):
    calories: int
    protein: int
    carbs: int
    fat: int

class MealLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    calories: int
    protein: int
    carbs: int
    fat: int
    mode: str  # fridge, mood, hybrid, manual
    meal_time: str  # breakfast, lunch, dinner, snack
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    ingredients: List[Dict[str, str]] = []
    steps: List[str] = []
    why_it_fits: str = ""

class DailyLog(BaseModel):
    date: str
    total_calories: int = 0
    total_protein: int = 0
    total_carbs: int = 0
    total_fat: int = 0
    meals: List[MealLog] = []

class WeightEntry(BaseModel):
    date: str
    weight: float

class IngredientScanRequest(BaseModel):
    image_base64: str

class IngredientScanResponse(BaseModel):
    ingredients: List[Dict[str, Any]]
    uncertain: List[Dict[str, Any]]

class MealGenerateRequest(BaseModel):
    mode: str  # fridge, mood, hybrid
    ingredients: List[str] = []
    craving: str = ""
    meal_time: str = "auto"  # breakfast, lunch, dinner, auto
    remaining_calories: int
    remaining_protein: int
    remaining_carbs: int
    remaining_fat: int

class MealOption(BaseModel):
    name: str
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    prep_time_min: int
    ingredients: List[Dict[str, str]]
    steps: List[str]
    why_it_fits: str
    shopping_addons: List[str] = []

class MealGenerateResponse(BaseModel):
    meal_time: str
    options: List[MealOption]

class LogMealRequest(BaseModel):
    meal: MealOption
    mode: str
    meal_time: str

# ============== Helper Functions ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def check_rate_limit(user_id: str) -> bool:
    """Check if user has exceeded rate limit. Returns True if allowed."""
    now = datetime.utcnow()
    hour_ago = now - timedelta(hours=1)
    
    if user_id not in rate_limits:
        rate_limits[user_id] = []
    
    # Clean old entries
    rate_limits[user_id] = [t for t in rate_limits[user_id] if t > hour_ago]
    
    if len(rate_limits[user_id]) >= MAX_REQUESTS_PER_HOUR:
        return False
    
    rate_limits[user_id].append(now)
    return True

def calculate_tdee(profile: UserProfile) -> Dict[str, int]:
    """Calculate TDEE and macro targets based on profile."""
    # Mifflin-St Jeor Equation
    if profile.sex == "male":
        bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age + 5
    else:
        bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age - 161
    
    # Activity multipliers
    activity_multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9
    }
    
    tdee = bmr * activity_multipliers.get(profile.activity_level, 1.55)
    
    # Goal adjustments
    if profile.goal == "cut":
        calories = int(tdee - 500)
    elif profile.goal == "bulk":
        calories = int(tdee + 300)
    else:
        calories = int(tdee)
    
    # Macro split (protein-focused for fitness)
    protein = int(profile.weight_kg * 2.0)  # 2g per kg
    fat = int(calories * 0.25 / 9)  # 25% from fat
    carbs = int((calories - protein * 4 - fat * 9) / 4)
    
    return {
        "calories": max(1200, calories),
        "protein": protein,
        "carbs": max(50, carbs),
        "fat": fat
    }

# ============== Auth Routes ==============

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "profile": None,
        "daily_calories": 2000,
        "daily_protein": 150,
        "daily_carbs": 200,
        "daily_fat": 67,
        "is_premium": True,  # Free trial
        "premium_expires": (datetime.utcnow() + timedelta(days=7)).isoformat(),
        "streak": 0,
        "last_log_date": None,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user)
    token = create_token(user_id)
    
    return {
        "token": token,
        "user": UserResponse(**user)
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"])
    return {
        "token": token,
        "user": UserResponse(**user)
    }

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return UserResponse(**user)

# ============== Profile Routes ==============

@api_router.put("/profile")
async def update_profile(data: ProfileUpdate, user=Depends(get_current_user)):
    targets = calculate_tdee(data.profile)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "profile": data.profile.dict(),
            "daily_calories": targets["calories"],
            "daily_protein": targets["protein"],
            "daily_carbs": targets["carbs"],
            "daily_fat": targets["fat"]
        }}
    )
    
    updated_user = await db.users.find_one({"id": user["id"]})
    return UserResponse(**updated_user)

@api_router.get("/profile/targets")
async def get_targets(user=Depends(get_current_user)):
    return MacroTargets(
        calories=user.get("daily_calories", 2000),
        protein=user.get("daily_protein", 150),
        carbs=user.get("daily_carbs", 200),
        fat=user.get("daily_fat", 67)
    )

# ============== Daily Log Routes ==============

@api_router.get("/daily/{date}")
async def get_daily_log(date: str, user=Depends(get_current_user)):
    log = await db.daily_logs.find_one({"user_id": user["id"], "date": date})
    if not log:
        return DailyLog(date=date)
    return DailyLog(**log)

@api_router.post("/daily/{date}/meal")
async def log_meal(date: str, request: LogMealRequest, user=Depends(get_current_user)):
    meal_log = MealLog(
        name=request.meal.name,
        calories=request.meal.calories,
        protein=request.meal.protein_g,
        carbs=request.meal.carbs_g,
        fat=request.meal.fat_g,
        mode=request.mode,
        meal_time=request.meal_time,
        ingredients=request.meal.ingredients,
        steps=request.meal.steps,
        why_it_fits=request.meal.why_it_fits
    )
    
    existing = await db.daily_logs.find_one({"user_id": user["id"], "date": date})
    
    if existing:
        new_totals = {
            "total_calories": existing.get("total_calories", 0) + meal_log.calories,
            "total_protein": existing.get("total_protein", 0) + meal_log.protein,
            "total_carbs": existing.get("total_carbs", 0) + meal_log.carbs,
            "total_fat": existing.get("total_fat", 0) + meal_log.fat
        }
        await db.daily_logs.update_one(
            {"user_id": user["id"], "date": date},
            {
                "$push": {"meals": meal_log.dict()},
                "$set": new_totals
            }
        )
    else:
        log_data = {
            "user_id": user["id"],
            "date": date,
            "total_calories": meal_log.calories,
            "total_protein": meal_log.protein,
            "total_carbs": meal_log.carbs,
            "total_fat": meal_log.fat,
            "meals": [meal_log.dict()]
        }
        await db.daily_logs.insert_one(log_data)
    
    # Update streak
    today = datetime.utcnow().strftime("%Y-%m-%d")
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    last_log = user.get("last_log_date")
    if last_log == yesterday:
        new_streak = user.get("streak", 0) + 1
    elif last_log != today:
        new_streak = 1
    else:
        new_streak = user.get("streak", 1)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"streak": new_streak, "last_log_date": today}}
    )
    
    updated_log = await db.daily_logs.find_one({"user_id": user["id"], "date": date})
    return DailyLog(**updated_log)

@api_router.delete("/daily/{date}/meal/{meal_id}")
async def delete_meal(date: str, meal_id: str, user=Depends(get_current_user)):
    log = await db.daily_logs.find_one({"user_id": user["id"], "date": date})
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    
    meals = log.get("meals", [])
    meal_to_delete = next((m for m in meals if m.get("id") == meal_id), None)
    
    if not meal_to_delete:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    new_meals = [m for m in meals if m.get("id") != meal_id]
    new_totals = {
        "total_calories": log.get("total_calories", 0) - meal_to_delete.get("calories", 0),
        "total_protein": log.get("total_protein", 0) - meal_to_delete.get("protein", 0),
        "total_carbs": log.get("total_carbs", 0) - meal_to_delete.get("carbs", 0),
        "total_fat": log.get("total_fat", 0) - meal_to_delete.get("fat", 0)
    }
    
    await db.daily_logs.update_one(
        {"user_id": user["id"], "date": date},
        {"$set": {"meals": new_meals, **new_totals}}
    )
    
    return {"success": True}

# ============== Weight Tracking ==============

@api_router.get("/weight")
async def get_weight_history(user=Depends(get_current_user)):
    entries = await db.weights.find({"user_id": user["id"]}).sort("date", -1).limit(90).to_list(90)
    return [WeightEntry(**e) for e in entries]

@api_router.post("/weight")
async def log_weight(entry: WeightEntry, user=Depends(get_current_user)):
    existing = await db.weights.find_one({"user_id": user["id"], "date": entry.date})
    if existing:
        await db.weights.update_one(
            {"user_id": user["id"], "date": entry.date},
            {"$set": {"weight": entry.weight}}
        )
    else:
        await db.weights.insert_one({
            "user_id": user["id"],
            "date": entry.date,
            "weight": entry.weight
        })
    
    # Update profile weight
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"profile.weight_kg": entry.weight}}
    )
    
    return {"success": True}

# ============== AI Features (Premium) ==============

@api_router.post("/scan/ingredients", response_model=IngredientScanResponse)
async def scan_ingredients(request: IngredientScanRequest, user=Depends(get_current_user)):
    # Check premium
    if not user.get("is_premium", False):
        raise HTTPException(status_code=403, detail="Premium feature. Please upgrade.")
    
    # Check rate limit
    if not check_rate_limit(user["id"]):
        raise HTTPException(status_code=429, detail="You've reached your usage limit. Please try again later.")
    
    import json
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"scan-{user['id']}-{uuid.uuid4()}",
            system_message="""You are a professional diet assistant. Extract visible ingredients from a fridge photo.
Do not invent items. Be conservative and only list items you can clearly identify.
If uncertain about an item, list it under 'uncertain' with lower confidence.

Output ONLY valid JSON in this exact format:
{
  "ingredients": [{"name": "eggs", "confidence": 0.85}],
  "uncertain": [{"name": "jar sauce", "confidence": 0.45}]
}

Rules:
- Only list food items, not containers or packaging
- Use simple, common names (e.g., "chicken breast" not "poultry product")
- Confidence should be 0.0-1.0
- Items with confidence < 0.6 go in uncertain"""
        ).with_model("openai", "gpt-4o-mini")
        
        image_content = ImageContent(image_base64=request.image_base64)
        
        user_message = UserMessage(
            text="Please analyze this fridge photo and extract all visible food ingredients.",
            images=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        # Clean response - extract JSON
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        result = json.loads(response_text.strip())
        
        return IngredientScanResponse(
            ingredients=result.get("ingredients", []),
            uncertain=result.get("uncertain", [])
        )
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}, response: {response}")
        return IngredientScanResponse(
            ingredients=[{"name": "Unable to parse", "confidence": 0}],
            uncertain=[]
        )
    except Exception as e:
        logger.error(f"Scan error: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze image")

@api_router.post("/generate/meals", response_model=MealGenerateResponse)
async def generate_meals(request: MealGenerateRequest, user=Depends(get_current_user)):
    # Check premium
    if not user.get("is_premium", False):
        raise HTTPException(status_code=403, detail="Premium feature. Please upgrade.")
    
    # Check rate limit
    if not check_rate_limit(user["id"]):
        raise HTTPException(status_code=429, detail="You've reached your usage limit. Please try again later.")
    
    import json
    
    profile = user.get("profile", {}) or {}
    
    # Determine meal time
    if request.meal_time == "auto":
        hour = datetime.utcnow().hour
        if hour < 11:
            meal_time = "breakfast"
        elif hour < 15:
            meal_time = "lunch"
        elif hour < 20:
            meal_time = "dinner"
        else:
            meal_time = "snack"
    else:
        meal_time = request.meal_time
    
    # Build the prompt
    mode_instruction = ""
    if request.mode == "fridge":
        mode_instruction = f"""FRIDGE MODE: Create meals using ONLY these ingredients: {', '.join(request.ingredients)}.
If the ingredients are insufficient for a complete meal, you MUST include a 'shopping_addons' list with minimal items needed."""
    elif request.mode == "mood":
        mode_instruction = f"""MOOD MODE: The user is craving: "{request.craving}". 
Create meals that satisfy this craving while meeting their targets. You can use any ingredients."""
    else:  # hybrid
        mode_instruction = f"""HYBRID MODE: The user has these ingredients: {', '.join(request.ingredients)}.
They are also craving: "{request.craving}".
Prioritize using available ingredients but can add extras to satisfy the craving."""
    
    dietary_info = f"""
Dietary type: {profile.get('dietary_type', 'none')}
Allergies (MUST AVOID): {', '.join(profile.get('allergies', [])) or 'None'}
Dislikes (avoid if possible): {', '.join(profile.get('dislikes', [])) or 'None'}
Cooking time preference: {profile.get('cooking_time', 'normal')}
Budget mode: {'Yes - suggest affordable options' if profile.get('budget_mode') else 'No'}
"""
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"meal-{user['id']}-{uuid.uuid4()}",
            system_message=f"""You are a professional fitness diet assistant. Generate exactly 3 meal options.

{mode_instruction}

User's dietary constraints:
{dietary_info}

Remaining macros for today:
- Calories: {request.remaining_calories} kcal
- Protein: {request.remaining_protein}g
- Carbs: {request.remaining_carbs}g
- Fat: {request.remaining_fat}g

IMPORTANT RULES:
1. STRICTLY respect all allergies - never include allergens
2. Each meal should fit within the remaining macros
3. Be realistic with portion sizes and macro estimates
4. Provide clear, actionable cooking steps
5. Include why this meal fits their goals

Output ONLY valid JSON in this exact format:
{{
  "meal_time": "{meal_time}",
  "options": [
    {{
      "name": "Meal Name",
      "calories": 500,
      "protein_g": 40,
      "carbs_g": 45,
      "fat_g": 18,
      "prep_time_min": 15,
      "ingredients": [{{"name": "chicken breast", "amount": "200g"}}],
      "steps": ["Step 1...", "Step 2..."],
      "why_it_fits": "Brief explanation",
      "shopping_addons": []
    }}
  ]
}}"""
        ).with_model("openai", "gpt-4o-mini")
        
        user_message = UserMessage(
            text=f"Generate 3 {meal_time} options that fit my remaining macros and preferences."
        )
        
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        result = json.loads(response_text.strip())
        
        options = []
        for opt in result.get("options", []):
            options.append(MealOption(
                name=opt.get("name", "Meal"),
                calories=opt.get("calories", 0),
                protein_g=opt.get("protein_g", 0),
                carbs_g=opt.get("carbs_g", 0),
                fat_g=opt.get("fat_g", 0),
                prep_time_min=opt.get("prep_time_min", 15),
                ingredients=opt.get("ingredients", []),
                steps=opt.get("steps", []),
                why_it_fits=opt.get("why_it_fits", ""),
                shopping_addons=opt.get("shopping_addons", [])
            ))
        
        return MealGenerateResponse(
            meal_time=result.get("meal_time", meal_time),
            options=options
        )
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logger.error(f"Meal generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate meals")

# ============== GDPR / Account ==============

@api_router.get("/export")
async def export_data(user=Depends(get_current_user)):
    """Export all user data for GDPR compliance."""
    user_data = await db.users.find_one({"id": user["id"]})
    daily_logs = await db.daily_logs.find({"user_id": user["id"]}).to_list(1000)
    weights = await db.weights.find({"user_id": user["id"]}).to_list(365)
    
    # Remove sensitive fields
    if user_data:
        user_data.pop("password_hash", None)
        user_data.pop("_id", None)
    
    for log in daily_logs:
        log.pop("_id", None)
    
    for w in weights:
        w.pop("_id", None)
    
    return {
        "user": user_data,
        "daily_logs": daily_logs,
        "weights": weights,
        "exported_at": datetime.utcnow().isoformat()
    }

@api_router.delete("/account")
async def delete_account(user=Depends(get_current_user)):
    """Delete user account and all data for GDPR compliance."""
    await db.users.delete_one({"id": user["id"]})
    await db.daily_logs.delete_many({"user_id": user["id"]})
    await db.weights.delete_many({"user_id": user["id"]})
    
    return {"success": True, "message": "Account and all data deleted"}

# ============== Premium / Subscription ==============

@api_router.post("/premium/activate")
async def activate_premium(user=Depends(get_current_user)):
    """Mock premium activation for MVP."""
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "is_premium": True,
            "premium_expires": (datetime.utcnow() + timedelta(days=30)).isoformat()
        }}
    )
    return {"success": True, "message": "Premium activated"}

@api_router.get("/premium/status")
async def premium_status(user=Depends(get_current_user)):
    return {
        "is_premium": user.get("is_premium", False),
        "expires": user.get("premium_expires"),
        "streak": user.get("streak", 0)
    }

# ============== Health Check ==============

@api_router.get("/")
async def root():
    return {"message": "FridgeAI API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
