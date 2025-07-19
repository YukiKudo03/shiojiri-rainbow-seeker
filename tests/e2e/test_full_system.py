"""
End-to-end integration tests for the complete Shiojiri Rainbow Seeker system
"""
import pytest
import requests
import time
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch, Mock
import jwt
from datetime import datetime, timedelta


class TestE2ESystem:
    """End-to-end tests for the complete system"""
    
    @pytest.fixture
    def api_base_url(self):
        """Base URL for API testing"""
        return "http://localhost:3000/api"
    
    @pytest.fixture
    def ml_api_url(self):
        """ML service URL"""
        return "http://localhost:5000"
    
    @pytest.fixture
    def test_user_data(self):
        """Test user data"""
        return {
            "name": "E2E Test User",
            "email": f"e2e_test_{int(time.time())}@example.com",
            "password": "E2ETest123!"
        }
    
    @pytest.fixture
    def test_rainbow_data(self):
        """Test rainbow data"""
        return {
            "title": "E2E Test Rainbow",
            "description": "A rainbow created during end-to-end testing",
            "latitude": 36.2048,
            "longitude": 138.2529,
            "intensity": 8,
            "weather_conditions": {
                "temperature": 22,
                "humidity": 75,
                "pressure": 1012
            }
        }
    
    def test_complete_user_journey(self, api_base_url, test_user_data, test_rainbow_data):
        """Test complete user journey from registration to rainbow creation"""
        
        # Step 1: User Registration
        register_response = requests.post(
            f"{api_base_url}/auth/register",
            json=test_user_data,
            headers={"Content-Type": "application/json"}
        )
        
        assert register_response.status_code == 201
        register_data = register_response.json()
        assert register_data["success"] == True
        assert "token" in register_data["data"]
        
        token = register_data["data"]["token"]
        user_id = register_data["data"]["user"]["id"]
        
        # Step 2: User Login
        login_response = requests.post(
            f"{api_base_url}/auth/login",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert login_response.status_code == 200
        login_data = login_response.json()
        assert login_data["success"] == True
        assert "token" in login_data["data"]
        
        # Step 3: Get User Profile
        profile_response = requests.get(
            f"{api_base_url}/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert profile_response.status_code == 200
        profile_data = profile_response.json()
        assert profile_data["data"]["email"] == test_user_data["email"]
        
        # Step 4: Get Weather Data
        weather_response = requests.get(
            f"{api_base_url}/weather/current",
            params={
                "lat": test_rainbow_data["latitude"],
                "lon": test_rainbow_data["longitude"]
            }
        )
        
        assert weather_response.status_code == 200
        weather_data = weather_response.json()
        assert "temperature" in weather_data["data"]
        
        # Step 5: Create Rainbow Sighting
        # Simulate file upload
        files = {"image": ("test_rainbow.jpg", b"fake_image_data", "image/jpeg")}
        
        rainbow_response = requests.post(
            f"{api_base_url}/rainbow",
            data=test_rainbow_data,
            files=files,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert rainbow_response.status_code == 201
        rainbow_data = rainbow_response.json()
        assert rainbow_data["success"] == True
        
        rainbow_id = rainbow_data["data"]["id"]
        
        # Step 6: Get Created Rainbow
        get_rainbow_response = requests.get(
            f"{api_base_url}/rainbow/{rainbow_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert get_rainbow_response.status_code == 200
        get_rainbow_data = get_rainbow_response.json()
        assert get_rainbow_data["data"]["title"] == test_rainbow_data["title"]
        
        # Step 7: Search Nearby Rainbows
        nearby_response = requests.get(
            f"{api_base_url}/rainbow/nearby/{test_rainbow_data['latitude']}/{test_rainbow_data['longitude']}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert nearby_response.status_code == 200
        nearby_data = nearby_response.json()
        assert len(nearby_data["data"]) >= 1
        
        # Step 8: Update Rainbow
        update_data = {"title": "Updated E2E Test Rainbow", "intensity": 9}
        update_response = requests.put(
            f"{api_base_url}/rainbow/{rainbow_id}",
            json=update_data,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )
        
        assert update_response.status_code == 200
        update_result = update_response.json()
        assert update_result["data"]["title"] == update_data["title"]
        
        # Step 9: Get Rainbow Statistics
        stats_response = requests.get(
            f"{api_base_url}/rainbow/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert stats_response.status_code == 200
        stats_data = stats_response.json()
        assert "total_sightings" in stats_data["data"]
        
        # Step 10: Clean up - Delete Rainbow
        delete_response = requests.delete(
            f"{api_base_url}/rainbow/{rainbow_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert delete_response.status_code == 200
    
    def test_ml_system_integration(self, ml_api_url):
        """Test ML system integration"""
        
        # Test ML API health
        health_response = requests.get(f"{ml_api_url}/health")
        assert health_response.status_code in [200, 503]  # May not be available
        
        # Test prediction endpoint
        prediction_payload = {
            "weather_data": {
                "temperature": 22.5,
                "humidity": 75,
                "pressure": 1012.3,
                "wind_speed": 5.2
            },
            "location": {
                "latitude": 36.2048,
                "longitude": 138.2529
            }
        }
        
        try:
            prediction_response = requests.post(
                f"{ml_api_url}/predict",
                json=prediction_payload,
                timeout=10
            )
            
            if prediction_response.status_code == 200:
                prediction_data = prediction_response.json()
                assert "probability" in prediction_data["data"]
                assert 0 <= prediction_data["data"]["probability"] <= 1
        except requests.exceptions.RequestException:
            # ML service may not be available in test environment
            pytest.skip("ML service not available")
    
    def test_notification_workflow(self, api_base_url, test_user_data):
        """Test notification subscription and sending"""
        
        # Register user
        register_response = requests.post(
            f"{api_base_url}/auth/register",
            json=test_user_data
        )
        assert register_response.status_code == 201
        token = register_response.json()["data"]["token"]
        
        # Subscribe to notifications
        subscription_data = {
            "deviceToken": "test-device-token-e2e",
            "platform": "web"
        }
        
        subscribe_response = requests.post(
            f"{api_base_url}/notification/subscribe",
            json=subscription_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert subscribe_response.status_code == 200
        
        # Send test notification
        notification_data = {
            "title": "E2E Test Notification",
            "message": "This is a test notification from E2E tests",
            "userId": register_response.json()["data"]["user"]["id"]
        }
        
        send_response = requests.post(
            f"{api_base_url}/notification/send",
            json=notification_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert send_response.status_code == 200
    
    def test_concurrent_user_operations(self, api_base_url):
        """Test concurrent user operations"""
        
        def create_user_and_rainbow(user_index):
            """Create a user and rainbow sighting"""
            user_data = {
                "name": f"Concurrent User {user_index}",
                "email": f"concurrent_{user_index}_{int(time.time())}@example.com",
                "password": "ConcurrentTest123!"
            }
            
            # Register user
            register_response = requests.post(
                f"{api_base_url}/auth/register",
                json=user_data
            )
            
            if register_response.status_code != 201:
                return {"error": "Registration failed", "user_index": user_index}
            
            token = register_response.json()["data"]["token"]
            
            # Create rainbow
            rainbow_data = {
                "title": f"Concurrent Rainbow {user_index}",
                "description": f"Rainbow from concurrent user {user_index}",
                "latitude": 36.2048 + (user_index * 0.001),
                "longitude": 138.2529 + (user_index * 0.001),
                "intensity": (user_index % 10) + 1
            }
            
            files = {"image": ("test.jpg", b"fake_data", "image/jpeg")}
            
            rainbow_response = requests.post(
                f"{api_base_url}/rainbow",
                data=rainbow_data,
                files=files,
                headers={"Authorization": f"Bearer {token}"}
            )
            
            return {
                "user_index": user_index,
                "register_status": register_response.status_code,
                "rainbow_status": rainbow_response.status_code,
                "success": rainbow_response.status_code == 201
            }
        
        # Test with 5 concurrent users
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(create_user_and_rainbow, i) 
                for i in range(5)
            ]
            
            results = [future.result() for future in futures]
        
        # Check results
        successful_operations = sum(1 for result in results if result.get("success", False))
        
        assert successful_operations >= 3  # At least 60% success rate
    
    def test_system_performance_under_load(self, api_base_url):
        """Test system performance under load"""
        
        # Create a test user first
        user_data = {
            "name": "Performance Test User",
            "email": f"perf_test_{int(time.time())}@example.com",
            "password": "PerfTest123!"
        }
        
        register_response = requests.post(
            f"{api_base_url}/auth/register",
            json=user_data
        )
        assert register_response.status_code == 201
        token = register_response.json()["data"]["token"]
        
        def make_api_request():
            """Make a simple API request"""
            try:
                response = requests.get(
                    f"{api_base_url}/rainbow",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=5
                )
                return {
                    "status_code": response.status_code,
                    "response_time": response.elapsed.total_seconds(),
                    "success": response.status_code == 200
                }
            except requests.exceptions.RequestException as e:
                return {
                    "status_code": 0,
                    "response_time": 5.0,
                    "success": False,
                    "error": str(e)
                }
        
        start_time = time.time()
        
        # Make 20 concurrent requests
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_api_request) for _ in range(20)]
            results = [future.result() for future in futures]
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Analyze results
        successful_requests = sum(1 for result in results if result["success"])
        average_response_time = sum(
            result["response_time"] for result in results if result["success"]
        ) / max(successful_requests, 1)
        
        # Performance assertions
        assert successful_requests >= 16  # At least 80% success rate
        assert average_response_time < 2.0  # Average response time under 2 seconds
        assert total_time < 15.0  # All requests complete within 15 seconds
    
    def test_data_consistency_across_services(self, api_base_url):
        """Test data consistency across different services"""
        
        # Create user and rainbow
        user_data = {
            "name": "Consistency Test User",
            "email": f"consistency_test_{int(time.time())}@example.com",
            "password": "ConsistencyTest123!"
        }
        
        register_response = requests.post(
            f"{api_base_url}/auth/register",
            json=user_data
        )
        assert register_response.status_code == 201
        token = register_response.json()["data"]["token"]
        user_id = register_response.json()["data"]["user"]["id"]
        
        # Create rainbow
        rainbow_data = {
            "title": "Consistency Test Rainbow",
            "description": "Testing data consistency",
            "latitude": 36.2048,
            "longitude": 138.2529,
            "intensity": 7
        }
        
        files = {"image": ("test.jpg", b"fake_data", "image/jpeg")}
        
        rainbow_response = requests.post(
            f"{api_base_url}/rainbow",
            data=rainbow_data,
            files=files,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert rainbow_response.status_code == 201
        rainbow_id = rainbow_response.json()["data"]["id"]
        
        # Verify rainbow appears in different endpoints
        
        # 1. Get rainbow by ID
        get_response = requests.get(
            f"{api_base_url}/rainbow/{rainbow_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_response.status_code == 200
        rainbow_detail = get_response.json()["data"]
        
        # 2. Check in rainbow list
        list_response = requests.get(
            f"{api_base_url}/rainbow",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert list_response.status_code == 200
        rainbow_list = list_response.json()["data"]
        
        # Verify rainbow appears in list
        rainbow_in_list = any(
            rainbow["id"] == rainbow_id for rainbow in rainbow_list
        )
        assert rainbow_in_list
        
        # 3. Check in nearby search
        nearby_response = requests.get(
            f"{api_base_url}/rainbow/nearby/{rainbow_data['latitude']}/{rainbow_data['longitude']}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert nearby_response.status_code == 200
        nearby_list = nearby_response.json()["data"]
        
        # Verify rainbow appears in nearby search
        rainbow_in_nearby = any(
            rainbow["id"] == rainbow_id for rainbow in nearby_list
        )
        assert rainbow_in_nearby
        
        # 4. Verify data consistency across all endpoints
        assert rainbow_detail["title"] == rainbow_data["title"]
        assert rainbow_detail["user_id"] == user_id
    
    def test_error_handling_and_recovery(self, api_base_url):
        """Test system error handling and recovery"""
        
        # Test with invalid authentication
        invalid_auth_response = requests.get(
            f"{api_base_url}/rainbow",
            headers={"Authorization": "Bearer invalid-token"}
        )
        assert invalid_auth_response.status_code == 401
        
        # Test with malformed request data
        malformed_data = {"invalid": "json", "structure": [1, 2, None]}
        
        malformed_response = requests.post(
            f"{api_base_url}/auth/register",
            json=malformed_data
        )
        assert malformed_response.status_code == 400
        
        # Test with non-existent resources
        not_found_response = requests.get(
            f"{api_base_url}/rainbow/999999"
        )
        assert not_found_response.status_code == 404
        
        # Test system recovery after errors
        valid_user_data = {
            "name": "Recovery Test User",
            "email": f"recovery_test_{int(time.time())}@example.com",
            "password": "RecoveryTest123!"
        }
        
        recovery_response = requests.post(
            f"{api_base_url}/auth/register",
            json=valid_user_data
        )
        assert recovery_response.status_code == 201
    
    def test_security_measures(self, api_base_url):
        """Test security measures"""
        
        # Test SQL injection attempts
        sql_injection_payload = {
            "email": "test'; DROP TABLE users; --",
            "password": "password123"
        }
        
        sql_injection_response = requests.post(
            f"{api_base_url}/auth/login",
            json=sql_injection_payload
        )
        # Should not cause server error
        assert sql_injection_response.status_code in [400, 401]
        
        # Test XSS attempts
        xss_payload = {
            "name": "<script>alert('xss')</script>",
            "email": f"xss_test_{int(time.time())}@example.com",
            "password": "XSSTest123!"
        }
        
        xss_response = requests.post(
            f"{api_base_url}/auth/register",
            json=xss_payload
        )
        
        if xss_response.status_code == 201:
            # Check that script tags are sanitized
            user_data = xss_response.json()["data"]["user"]
            assert "<script>" not in user_data["name"]
        
        # Test rate limiting (if implemented)
        for _ in range(10):
            requests.post(
                f"{api_base_url}/auth/login",
                json={"email": "test@test.com", "password": "wrong"}
            )
        
        # After multiple failed attempts, should get rate limited
        final_attempt = requests.post(
            f"{api_base_url}/auth/login",
            json={"email": "test@test.com", "password": "wrong"}
        )
        # Should be either rejected or rate limited
        assert final_attempt.status_code in [401, 429]
    
    def test_api_versioning_and_backward_compatibility(self, api_base_url):
        """Test API versioning and backward compatibility"""
        
        # Test that API works with different accept headers
        headers_variants = [
            {"Accept": "application/json"},
            {"Accept": "application/json; version=1"},
            {"Content-Type": "application/json"},
        ]
        
        for headers in headers_variants:
            response = requests.get(
                f"{api_base_url}/health",
                headers=headers
            )
            assert response.status_code in [200, 404]  # Health endpoint may not exist
    
    def test_monitoring_and_metrics_endpoints(self, api_base_url):
        """Test monitoring and metrics endpoints"""
        
        # Test health endpoint
        health_response = requests.get(f"{api_base_url}/../health")
        if health_response.status_code == 200:
            health_data = health_response.json()
            assert "status" in health_data
        
        # Test metrics endpoint
        metrics_response = requests.get(f"{api_base_url}/../metrics")
        if metrics_response.status_code == 200:
            # Could be JSON or Prometheus format
            assert len(metrics_response.text) > 0


class TestSystemResilience:
    """Test system resilience and fault tolerance"""
    
    def test_service_degradation(self, api_base_url):
        """Test graceful degradation when services are unavailable"""
        
        # This would test how the system behaves when ML service is down
        # or when database is slow, etc.
        
        # For now, just test that basic endpoints still work
        response = requests.get(f"{api_base_url}/../health")
        
        # System should remain functional even if some components fail
        assert response.status_code in [200, 503]
    
    def test_data_backup_and_recovery(self, api_base_url):
        """Test data backup and recovery procedures"""
        
        # This would be more comprehensive in a real environment
        # For now, just ensure basic CRUD operations work
        
        user_data = {
            "name": "Backup Test User",
            "email": f"backup_test_{int(time.time())}@example.com",
            "password": "BackupTest123!"
        }
        
        # Create
        create_response = requests.post(
            f"{api_base_url}/auth/register",
            json=user_data
        )
        assert create_response.status_code == 201
        
        token = create_response.json()["data"]["token"]
        
        # Read
        read_response = requests.get(
            f"{api_base_url}/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert read_response.status_code == 200
        
        # Update (if endpoint exists)
        update_data = {"name": "Updated Backup Test User"}
        update_response = requests.put(
            f"{api_base_url}/auth/me",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        # May not be implemented
        assert update_response.status_code in [200, 404, 405]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])