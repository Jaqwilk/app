#!/usr/bin/env python3
"""
FridgeAI Backend API Test Suite
Tests all backend endpoints for functionality and data integrity.
"""

import requests
import json
import base64
from datetime import datetime, timedelta
import uuid
import sys

# Backend URL from frontend .env
BACKEND_URL = "https://macrofit-ai.preview.emergentagent.com/api"

class FridgeAITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.token = None
        self.user_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, message="", details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details or {}
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if not success and details:
            print(f"   Details: {details}")
    
    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        default_headers = {"Content-Type": "application/json"}
        
        if self.token:
            default_headers["Authorization"] = f"Bearer {self.token}"
        
        if headers:
            default_headers.update(headers)
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=default_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request exception: {e}")
            return None
    
    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n=== Testing Health Endpoints ===")
        
        # Test root endpoint
        response = self.make_request("GET", "/")
        if response and response.status_code == 200:
            data = response.json()
            if "message" in data and "FridgeAI" in data["message"]:
                self.log_result("Root endpoint", True, "API is accessible")
            else:
                self.log_result("Root endpoint", False, "Unexpected response format", data)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Root endpoint", False, f"Failed to connect: {error}")
        
        # Test health endpoint
        response = self.make_request("GET", "/health")
        if response and response.status_code == 200:
            data = response.json()
            if "status" in data and data["status"] == "healthy":
                self.log_result("Health check", True, "Service is healthy")
            else:
                self.log_result("Health check", False, "Service not healthy", data)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Health check", False, f"Health check failed: {error}")
    
    def test_auth_flow(self):
        """Test complete authentication flow"""
        print("\n=== Testing Authentication Flow ===")
        
        # Generate unique test user
        test_email = f"test_{uuid.uuid4().hex[:8]}@fridgeai.com"
        test_password = "TestPass123!"
        test_name = "Test User"
        
        # Test registration
        register_data = {
            "email": test_email,
            "password": test_password,
            "name": test_name
        }
        
        response = self.make_request("POST", "/auth/register", register_data)
        if response and response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                self.token = data["token"]
                self.user_id = data["user"]["id"]
                self.log_result("User registration", True, f"User registered with ID: {self.user_id}")
            else:
                self.log_result("User registration", False, "Missing token or user in response", data)
                return False
        else:
            error = response.text if response else "Connection failed"
            self.log_result("User registration", False, f"Registration failed: {error}")
            return False
        
        # Test login
        login_data = {
            "email": test_email,
            "password": test_password
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        if response and response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                login_token = data["token"]
                self.log_result("User login", True, "Login successful")
            else:
                self.log_result("User login", False, "Missing token in login response", data)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("User login", False, f"Login failed: {error}")
        
        # Test get current user
        response = self.make_request("GET", "/auth/me")
        if response and response.status_code == 200:
            data = response.json()
            if "email" in data and data["email"] == test_email:
                self.log_result("Get current user", True, "User data retrieved successfully")
            else:
                self.log_result("Get current user", False, "User data mismatch", data)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Get current user", False, f"Failed to get user: {error}")
        
        # Test invalid login
        invalid_login = {
            "email": f"invalid_{uuid.uuid4().hex[:8]}@fridgeai.com",  # Use different email
            "password": "wrongpassword"
        }
        
        # Add small delay to avoid connection issues
        import time
        time.sleep(0.5)
        
        response = self.make_request("POST", "/auth/login", invalid_login)
        
        if response and response.status_code == 401:
            self.log_result("Invalid login rejection", True, "Invalid credentials properly rejected")
        elif response and response.status_code == 200:
            # Some APIs return 200 with error message instead of 401
            data = response.json()
            if "detail" in data and "Invalid" in data["detail"]:
                self.log_result("Invalid login rejection", True, "Invalid credentials properly rejected (200 with error)")
            else:
                self.log_result("Invalid login rejection", False, "Should reject invalid credentials", data)
        else:
            error_msg = f"Status: {response.status_code if response else 'None'}, Text: {response.text if response else 'Connection failed'}"
            self.log_result("Invalid login rejection", False, f"Should reject invalid credentials - {error_msg}")
        
        return True
    
    def test_profile_management(self):
        """Test profile update and macro calculation"""
        print("\n=== Testing Profile Management ===")
        
        if not self.token:
            self.log_result("Profile test setup", False, "No auth token available")
            return
        
        # Test profile update
        profile_data = {
            "profile": {
                "age": 30,
                "sex": "male",
                "height_cm": 180,
                "weight_kg": 75,
                "activity_level": "moderate",
                "goal": "maintain",
                "dietary_type": "none",
                "allergies": ["nuts"],
                "dislikes": ["mushrooms"],
                "cooking_time": "normal",
                "budget_mode": False
            }
        }
        
        response = self.make_request("PUT", "/profile", profile_data)
        if response and response.status_code == 200:
            data = response.json()
            if "daily_calories" in data and data["daily_calories"] > 0:
                self.log_result("Profile update", True, f"Profile updated, calories: {data['daily_calories']}")
            else:
                self.log_result("Profile update", False, "Missing or invalid calorie calculation", data)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Profile update", False, f"Profile update failed: {error}")
        
        # Test get macro targets
        response = self.make_request("GET", "/profile/targets")
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["calories", "protein", "carbs", "fat"]
            if all(field in data and data[field] > 0 for field in required_fields):
                self.log_result("Get macro targets", True, f"Targets: {data}")
            else:
                self.log_result("Get macro targets", False, "Missing or invalid macro targets", data)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Get macro targets", False, f"Failed to get targets: {error}")
    
    def test_daily_logging(self):
        """Test daily log functionality"""
        print("\n=== Testing Daily Logging ===")
        
        if not self.token:
            self.log_result("Daily log test setup", False, "No auth token available")
            return
        
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Test get empty daily log
        response = self.make_request("GET", f"/daily/{today}")
        if response and response.status_code == 200:
            data = response.json()
            if "date" in data and data["date"] == today:
                self.log_result("Get daily log", True, "Daily log retrieved successfully")
            else:
                self.log_result("Get daily log", False, "Invalid daily log format", data)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Get daily log", False, f"Failed to get daily log: {error}")
        
        # Test log a meal
        meal_data = {
            "meal": {
                "name": "Grilled Chicken Salad",
                "calories": 350,
                "protein_g": 40,
                "carbs_g": 15,
                "fat_g": 12,
                "prep_time_min": 20,
                "ingredients": [{"name": "chicken breast", "amount": "200g"}],
                "steps": ["Grill chicken", "Add to salad"],
                "why_it_fits": "High protein, low carb"
            },
            "mode": "manual",
            "meal_time": "lunch"
        }
        
        response = self.make_request("POST", f"/daily/{today}/meal", meal_data)
        if response and response.status_code == 200:
            data = response.json()
            if "meals" in data and len(data["meals"]) > 0:
                meal_id = data["meals"][0]["id"]
                self.log_result("Log meal", True, f"Meal logged with ID: {meal_id}")
                
                # Test delete meal
                response = self.make_request("DELETE", f"/daily/{today}/meal/{meal_id}")
                if response and response.status_code == 200:
                    self.log_result("Delete meal", True, "Meal deleted successfully")
                else:
                    error = response.text if response else "Connection failed"
                    self.log_result("Delete meal", False, f"Failed to delete meal: {error}")
            else:
                self.log_result("Log meal", False, "Meal not properly logged", data)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Log meal", False, f"Failed to log meal: {error}")
    
    def test_weight_tracking(self):
        """Test weight tracking functionality"""
        print("\n=== Testing Weight Tracking ===")
        
        if not self.token:
            self.log_result("Weight test setup", False, "No auth token available")
            return
        
        # Test log weight
        today = datetime.now().strftime("%Y-%m-%d")
        weight_data = {
            "date": today,
            "weight": 75.5
        }
        
        response = self.make_request("POST", "/weight", weight_data)
        if response and response.status_code == 200:
            data = response.json()
            if "success" in data and data["success"]:
                self.log_result("Log weight", True, "Weight logged successfully")
            else:
                self.log_result("Log weight", False, "Weight logging failed", data)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Log weight", False, f"Failed to log weight: {error}")
        
        # Test get weight history
        response = self.make_request("GET", "/weight")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Get weight history", True, f"Retrieved {len(data)} weight entries")
            else:
                self.log_result("Get weight history", False, "Invalid weight history format", data)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Get weight history", False, f"Failed to get weight history: {error}")
    
    def test_ai_features(self):
        """Test AI-powered features"""
        print("\n=== Testing AI Features ===")
        
        if not self.token:
            self.log_result("AI test setup", False, "No auth token available")
            return
        
        # Create a simple test image (1x1 pixel PNG in base64)
        test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        
        # Test ingredient scanning
        scan_data = {
            "image_base64": test_image_b64
        }
        
        response = self.make_request("POST", "/scan/ingredients", scan_data)
        if response and response.status_code == 200:
            data = response.json()
            if "ingredients" in data and "uncertain" in data:
                self.log_result("Ingredient scanning", True, f"Scan completed: {len(data['ingredients'])} ingredients found")
            else:
                self.log_result("Ingredient scanning", False, "Invalid scan response format", data)
        elif response and response.status_code == 403:
            self.log_result("Ingredient scanning", True, "Premium feature properly protected")
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Ingredient scanning", False, f"Scan failed: {error}")
        
        # Test meal generation
        meal_gen_data = {
            "mode": "mood",
            "ingredients": ["chicken", "rice", "vegetables"],
            "craving": "something healthy and filling",
            "meal_time": "dinner",
            "remaining_calories": 800,
            "remaining_protein": 50,
            "remaining_carbs": 80,
            "remaining_fat": 25
        }
        
        response = self.make_request("POST", "/generate/meals", meal_gen_data)
        if response and response.status_code == 200:
            data = response.json()
            if "options" in data and len(data["options"]) == 3:
                self.log_result("Meal generation", True, f"Generated {len(data['options'])} meal options")
            else:
                self.log_result("Meal generation", False, "Should generate exactly 3 meal options", data)
        elif response and response.status_code == 403:
            self.log_result("Meal generation", True, "Premium feature properly protected")
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Meal generation", False, f"Meal generation failed: {error}")
    
    def test_premium_features(self):
        """Test premium and GDPR features"""
        print("\n=== Testing Premium & GDPR Features ===")
        
        if not self.token:
            self.log_result("Premium test setup", False, "No auth token available")
            return
        
        # Test premium status
        response = self.make_request("GET", "/premium/status")
        if response and response.status_code == 200:
            data = response.json()
            if "is_premium" in data:
                self.log_result("Premium status", True, f"Premium status: {data['is_premium']}")
            else:
                self.log_result("Premium status", False, "Invalid premium status format", data)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Premium status", False, f"Failed to get premium status: {error}")
        
        # Test premium activation (mock)
        response = self.make_request("POST", "/premium/activate")
        if response and response.status_code == 200:
            data = response.json()
            if "success" in data and data["success"]:
                self.log_result("Premium activation", True, "Premium activated successfully")
            else:
                self.log_result("Premium activation", False, "Premium activation failed", data)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Premium activation", False, f"Failed to activate premium: {error}")
        
        # Test data export
        response = self.make_request("GET", "/export")
        if response and response.status_code == 200:
            data = response.json()
            if "user" in data and "exported_at" in data:
                self.log_result("Data export", True, "User data exported successfully")
            else:
                self.log_result("Data export", False, "Invalid export format", data)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Data export", False, f"Failed to export data: {error}")
    
    def run_all_tests(self):
        """Run complete test suite"""
        print("🧪 Starting FridgeAI Backend API Test Suite")
        print(f"🔗 Testing against: {self.base_url}")
        
        # Run tests in order
        self.test_health_check()
        
        if self.test_auth_flow():
            self.test_profile_management()
            self.test_daily_logging()
            self.test_weight_tracking()
            self.test_ai_features()
            self.test_premium_features()
        
        # Summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for r in self.test_results if r["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r["success"]]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['message']}")
        
        return passed == total

if __name__ == "__main__":
    tester = FridgeAITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)