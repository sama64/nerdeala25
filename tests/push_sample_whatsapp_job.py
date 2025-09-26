#!/usr/bin/env python3
"""Simple test script to add WhatsApp messages to Redis queue for testing."""

import json
import subprocess
import uuid
from datetime import datetime, timezone

# Test configuration - modify these values for your tests
TEST_PHONE = "+5491122334455"  # Change this to your test phone number
TEST_MESSAGE = "🚀 ekisde"
COMPOSE_FILE = "docker-compose.whatsapp.yml"
QUEUE_NAME = "whatsapp:pending"


def create_test_job(phone: str, message: str) -> dict:
    """Create a test WhatsApp job with the required structure."""
    return {
        "id": uuid.uuid4().hex,
        "recipient": {
            "phone": phone,
            "name": "Test User",
        },
        "message": {
            "type": "text",
            "text": message,
        },
        "metadata": {
            "initiatedBy": "tests.push_sample_whatsapp_job",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "retries": 0,
            "priority": "normal",
        },
    }


def enqueue_job(job: dict) -> bool:
    """Add a job to the Redis queue."""
    payload = json.dumps(job)
    command = [
        "docker", "compose", "-f", COMPOSE_FILE,
        "exec", "redis", "redis-cli",
        "LPUSH", QUEUE_NAME, payload
    ]
    
    print(f"📱 Sending test message to: {job['recipient']['phone']}")
    print(f"💬 Message: {job['message']['text']}")
    print(f"🆔 Job ID: {job['id']}")
    
    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        print(f"✅ Message queued successfully! Queue position: {result.stdout.strip()}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to queue message: {e}")
        print(f"Error output: {e.stderr}")
        return False


def main():
    """Main function to run the test."""
    print("🧪 WhatsApp Service Test Script")
    print("=" * 40)
    
    # Create test job
    job = create_test_job(TEST_PHONE, TEST_MESSAGE)
    
    # Queue the job
    success = enqueue_job(job)
    
    if success:
        print("\n🎉 Test message queued! Check the service logs to see it being processed:")
        print("   docker compose -f docker-compose.whatsapp.yml logs -f whatsapp-service")
    else:
        print("\n💥 Failed to queue test message. Make sure Redis is running:")
        print("   docker compose -f docker-compose.whatsapp.yml up -d redis")


if __name__ == "__main__":
    main()
