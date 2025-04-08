from flask import Blueprint, request, jsonify, current_app
from .. import socketio
from ..database.db import db
from ..models import User, Sequence, SequenceStep
from ..services.sequence_service import SequenceService

bp = Blueprint('sequence', __name__)

# Don't initialize SequenceService at module level
# We'll get an instance when needed within route functions

@bp.route('/generate', methods=['POST'])
def generate_sequence():
    """
    Generate a new recruiting outreach sequence.
    """
    data = request.json
    
    if not data or 'title' not in data or 'position' not in data or 'userId' not in data:
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
    
    user_id = data['userId']
    title = data['title']
    position = data['position']
    additional_info = data.get('additionalInfo')
    
    try:
        # Check if user exists, create if not (for demo purposes)
        user = User.query.get(user_id)
        if not user:
            user = User(
                id=user_id,
                email=f"user_{user_id}@example.com",  # Placeholder
                name="Demo User"
            )
            db.session.add(user)
            db.session.commit()
        
        # Get SequenceService instance and create sequence
        sequence_service = SequenceService.get_instance()
        
        # Handle async function with asyncio.run()
        import asyncio
        sequence = asyncio.run(sequence_service.create_sequence(
            user_id=user_id,
            title=title,
            position=position,
            additional_info=additional_info
        ))
        
        # Emit event that a new sequence has been created
        socketio.emit('sequence_updated', sequence.to_dict())
        
        return jsonify({
            'success': True,
            'data': sequence.to_dict()
        })
        
    except Exception as e:
        current_app.logger.error(f"Error generating sequence: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/update', methods=['PUT'])
def update_sequence():
    """
    Update an existing sequence with new steps.
    """
    data = request.json
    
    if not data or 'sequenceId' not in data or 'steps' not in data or 'userId' not in data:
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
    
    sequence_id = data['sequenceId']
    steps = data['steps']
    user_id = data['userId']
    
    try:
        # Get SequenceService instance and update sequence
        sequence_service = SequenceService.get_instance()
        
        # Create a synchronous wrapper to handle the async function
        import asyncio
        updated_sequence = asyncio.run(sequence_service.update_sequence(
            sequence_id=sequence_id,
            updated_steps=steps
        ))
        
        if not updated_sequence:
            return jsonify({'success': False, 'error': 'Sequence not found'}), 404
        
        # Emit event that sequence has been updated
        socketio.emit('sequence_updated', updated_sequence)
        
        return jsonify({
            'success': True,
            'data': updated_sequence
        })
        
    except Exception as e:
        current_app.logger.error(f"Error updating sequence: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<sequence_id>', methods=['GET'])
def get_sequence(sequence_id):
    """
    Get a sequence by ID.
    """
    try:
        # Get SequenceService instance and retrieve sequence
        sequence_service = SequenceService.get_instance()
        
        # Handle async function with asyncio.run()
        import asyncio
        sequence = asyncio.run(sequence_service.get_sequence(sequence_id))
        
        if not sequence:
            return jsonify({'success': False, 'error': 'Sequence not found'}), 404
        
        return jsonify({
            'success': True,
            'data': sequence.to_dict() if sequence else None
        })
        
    except Exception as e:
        current_app.logger.error(f"Error retrieving sequence: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/user/<user_id>', methods=['GET'])
def get_user_sequences(user_id):
    """
    Get all sequences for a specific user.
    """
    try:
        # Get SequenceService instance and retrieve user sequences
        sequence_service = SequenceService.get_instance()
        sequences = sequence_service.get_user_sequences(user_id)
        
        return jsonify({
            'success': True,
            'data': sequences
        })
        
    except Exception as e:
        current_app.logger.error(f"Error retrieving user sequences: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/refine', methods=['POST'])
def refine_step():
    """
    Refine a specific step based on user feedback.
    """
    data = request.json
    
    if not data or 'sequenceId' not in data or 'stepId' not in data or 'feedback' not in data:
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
    
    sequence_id = data['sequenceId']
    step_id = data['stepId']
    feedback = data['feedback']
    
    try:
        # Get SequenceService instance and refine step
        sequence_service = SequenceService.get_instance()
        
        # Handle async function with asyncio.run()
        import asyncio
        updated_step = asyncio.run(sequence_service.refine_step(
            sequence_id=sequence_id,
            step_id=step_id,
            feedback=feedback
        ))
        
        if not updated_step:
            return jsonify({'success': False, 'error': 'Step not found'}), 404
        
        # Get the full sequence to emit an update
        sequence = asyncio.run(sequence_service.get_sequence(sequence_id))
        socketio.emit('sequence_updated', sequence.to_dict() if sequence else {})
        
        return jsonify({
            'success': True,
            'data': updated_step
        })
        
    except Exception as e:
        current_app.logger.error(f"Error refining step: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500 