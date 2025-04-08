import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_socketio import emit

from ..database.db import db
from ..models import User, ChatMessage
from ..services.ai_service import AIService
from ..services.session_service import SessionService
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
            'company_name': user.company if user else None
        }
        
        # Log the user's message for debugging
        current_app.logger.info(f"Processing message from user {user_id}: {message_content[:50]}...")
        
        # Get session context
        session_service = SessionService.get_instance()
        session_context = session_service.get_session_context(user_id)
        
        # Get AIService instance and generate response
        ai_service = AIService.get_instance()
        print("Generating chat response... 🌟 user_info:", user_info)
        print("Generating chat response... 🌟 history:", history)
        response = await ai_service.generate_chat_response(
            history, 
            user_info=user_info,
            session_context=session_context
        )
        
        # 如果有工具调用，将工具调用和结果添加到历史中
        if response.get('tool_calls') and len(response['tool_calls']) > 0:
            tool_call = response['tool_calls'][0]
            tool_name = tool_call['name']
            
            # 添加工具执行完成的系统消息
            if tool_name == "refine_sequence_step" and "error" not in tool_call.get('result', {}):
                # 添加到响应
                chat_message = ChatMessage(
                    user_id=user_id,
                    role="system",
                    content="✅ Sequence updated successfully!"
                )
                db.session.add(chat_message)
                db.session.commit()
                
                # 添加到返回消息中
                history.append({
                    "role": "system",
                    "content": "✅ Sequence updated successfully!",
                    "id": chat_message.id
                })
            
            # 添加工具调用记录
            history.append({
                'role': 'assistant',
                'content': f"I've executed the tool to generate a sequence for {response['tool_calls'][0]['arguments'].get('position')}. The sequence has been created successfully and is now available for review."
            })
            
            # 将工具调用记录保存到数据库中的聊天历史
            new_message = ChatMessage(
                user_id=user_id,
                role='assistant',
                content=f"I've executed the tool to generate a sequence for {response['tool_calls'][0]['arguments'].get('position')}. The sequence has been created successfully and is now available for review."
            )
            db.session.add(new_message)
            db.session.commit()
        
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