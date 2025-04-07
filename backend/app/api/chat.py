import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_socketio import emit

from ..database.db import db
from ..models import User, ChatMessage
from ..services.ai_service import AIService
from .. import socketio

bp = Blueprint('chat', __name__)

# Don't initialize AIService at module level
# We'll get an instance when needed within route functions

@bp.route('/message', methods=['POST'])
async def send_message():
    """
    Handle a new message from the user and generate a response.
    """
    data = request.json
    
    if not data or 'message' not in data or 'userId' not in data:
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
    
    user_id = data['userId']
    message_content = data['message']
    sequence_id = data.get('sequenceId')
    
    # Check if user exists, create if not (for demo purposes)
    user = User.query.get(user_id)
    if not user:
        user = User(
            id=user_id,
            email=f"user_{user_id}@example.com",  # Placeholder
            name="Demo User"
        )
        db.session.add(user)
    
    # Store user message
    user_message = ChatMessage(
        id=str(uuid.uuid4()),
        user_id=user_id,
        sequence_id=sequence_id,
        role='user',
        content=message_content
    )
    db.session.add(user_message)
    db.session.commit()
    
    # Emit the user message via Socket.IO
    socketio.emit('new_message', {
        'id': user_message.id,
        'role': 'user',
        'content': user_message.content
    })
    
    try:
        # Get conversation history for context
        history = get_conversation_history(user_id, limit=10)
        
        # Get user info for context
        user_info = {
            'user_id': user_id,
            'company_name': user.company if hasattr(user, 'company') and user.company else None,
            'company_description': user.company_description if hasattr(user, 'company_description') and user.company_description else None
        }
        
        # Log the user's message for debugging
        current_app.logger.info(f"Processing message from user {user_id}: {message_content[:50]}...")
        
        # Get AIService instance and generate response
        ai_service = AIService.get_instance()
        print("Generating chat response... 🌟 user_info:", user_info)
        response = await ai_service.generate_chat_response(history, user_info)
        
        
        # The response now contains both processed content and any tool calls
        response_content = response.get('content', '')
        tool_calls = response.get('tool_calls', [])
        
        # Validate that we have a non-empty response
        if not response_content.strip():
            current_app.logger.warning("Empty response content after processing")
            response_content = "I'm here to help with your recruiting needs. Could you provide more details about what you're looking for?"
        
        # Log the processed response for debugging
        current_app.logger.info(f"Processed AI response: {response_content[:50]}...")
        
        # Store assistant response
        assistant_message = ChatMessage(
            id=str(uuid.uuid4()),
            user_id=user_id,
            sequence_id=sequence_id,
            role='assistant',
            content=response_content
        )
        db.session.add(assistant_message)
        
        # Emit the assistant message via Socket.IO
        socketio.emit('new_message', {
            'id': assistant_message.id,
            'role': 'assistant',
            'content': response_content
        })
        
        # Handle any tool calls
        for tool_call in tool_calls:
            # Emit the tool call notification
            socketio.emit('tool_call', {
                'name': tool_call['name'],
                'arguments': tool_call['arguments']
            })
            
            # Handle specific tool responses if needed
            if tool_call['name'] == 'generate_sequence' and 'result' in tool_call:
                # If a sequence was generated, emit a sequence update
                socketio.emit('sequence_updated', tool_call['result'])
        
        # Commit all database changes
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'id': assistant_message.id,
                'role': 'assistant',
                'content': response_content,
                'tool_calls': tool_calls
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Error processing message: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/history/<user_id>', methods=['GET'])
def get_chat_history(user_id):
    """
    Get chat history for a specific user.
    """
    try:
        limit = request.args.get('limit', 20, type=int)
        
        # Query messages from the database
        messages = ChatMessage.query.filter_by(user_id=user_id) \
            .order_by(ChatMessage.created_at.asc()) \
            .limit(limit) \
            .all()
        
        # Format for client consumption (include all fields)
        formatted_messages = [
            {
                'id': msg.id,
                'role': msg.role,
                'content': msg.content,
                'created_at': msg.created_at.isoformat() if hasattr(msg, 'created_at') and msg.created_at else None
            }
            for msg in messages
        ]
        
        return jsonify({
            'success': True,
            'data': formatted_messages
        })
        
    except Exception as e:
        current_app.logger.error(f"Error retrieving chat history: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

def get_conversation_history(user_id, limit=10):
    """
    Get recent conversation history for a user.
    
    Args:
        user_id: The user's ID
        limit: Maximum number of messages to retrieve
        
    Returns:
        List of messages in the format expected by the AI service
    """
    messages = ChatMessage.query.filter_by(user_id=user_id) \
        .order_by(ChatMessage.created_at.desc()) \
        .limit(limit) \
        .all()
    
    # Reverse to get chronological order
    messages.reverse()
    
    # Format for the AI service
    return [
        {
            'role': msg.role,
            'content': msg.content
        }
        for msg in messages
    ] 