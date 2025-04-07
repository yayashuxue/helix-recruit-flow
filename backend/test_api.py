#!/usr/bin/env python
"""
Simple test script to verify API endpoints and simulate polling behavior.
This helps validate the new architecture with reduced WebSocket dependency.
"""
import requests
import time
import json
import argparse

# Default values
DEFAULT_API_URL = "http://localhost:5001"
DEFAULT_USER_ID = "test-user-123"


def test_chat_history(api_url, user_id):
    """Test fetching chat history API."""
    url = f"{api_url}/api/chat/history/{user_id}"
    print(f"Testing GET {url}")
    
    response = requests.get(url)
    print(f"Status code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success: {data.get('success')}")
        messages = data.get('data', [])
        print(f"Retrieved {len(messages)} messages")
        
        # Print the last 3 messages if available
        if messages:
            print("\nMost recent messages:")
            for msg in messages[-3:]:
                content = msg.get('content', '')
                preview = content[:50] + ('...' if len(content) > 50 else '')
                print(f"[{msg.get('role')}]: {preview}")
    else:
        print(f"Error: {response.text}")


def simulate_polling(api_url, user_id, interval=3, iterations=5):
    """Simulate polling behavior to fetch updates."""
    print(f"\nSimulating polling at {interval}s intervals for {iterations} iterations")
    
    for i in range(iterations):
        print(f"\nPoll iteration {i+1}/{iterations}")
        test_chat_history(api_url, user_id)
        
        if i < iterations - 1:
            print(f"Waiting {interval} seconds before next poll...")
            time.sleep(interval)


def send_test_message(api_url, user_id, message="Test message from API script"):
    """Send a test message to the chat API."""
    url = f"{api_url}/api/chat/message"
    payload = {
        "userId": user_id,
        "message": message
    }
    
    print(f"\nSending test message to {url}")
    print(f"Payload: {json.dumps(payload)}")
    
    response = requests.post(url, json=payload)
    print(f"Status code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success: {data.get('success')}")
        if data.get('success'):
            print(f"Response: {data.get('data', {}).get('content', '')[:50]}...")
    else:
        print(f"Error: {response.text}")


def main():
    parser = argparse.ArgumentParser(description="Test API endpoints and simulate polling")
    parser.add_argument("--url", default=DEFAULT_API_URL, help="API base URL")
    parser.add_argument("--user", default=DEFAULT_USER_ID, help="User ID for testing")
    parser.add_argument("--poll", action="store_true", help="Simulate polling behavior")
    parser.add_argument("--send", action="store_true", help="Send a test message")
    parser.add_argument("--message", default="Hello from test script!", help="Message to send")
    
    args = parser.parse_args()
    
    print(f"Testing API at {args.url}")
    print(f"Using user ID: {args.user}")
    
    # Initial test of chat history
    test_chat_history(args.url, args.user)
    
    # Send a test message if requested
    if args.send:
        send_test_message(args.url, args.user, args.message)
        
        # Allow time for the message to be processed
        print("Waiting 2 seconds for message processing...")
        time.sleep(2)
        
        # Get updated chat history
        test_chat_history(args.url, args.user)
    
    # Simulate polling if requested
    if args.poll:
        simulate_polling(args.url, args.user)


if __name__ == "__main__":
    main() 