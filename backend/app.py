import os
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

from app import create_app, socketio
from app.database.db import db

# Create the application instance with environment variables
app = create_app({
    'ANTHROPIC_API_KEY': os.environ.get('ANTHROPIC_API_KEY'),
    'SQLALCHEMY_DATABASE_URI': os.environ.get('SQLALCHEMY_DATABASE_URI'),
    'SECRET_KEY': os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
})

# Initialize database tables automatically
with app.app_context():
    try:
        # Import models to ensure they're registered with SQLAlchemy
        from app.models import User, Sequence, SequenceStep, ChatMessage
        db.create_all()
        logger.info('Database tables initialized successfully.')
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")

if __name__ == '__main__':
    # Run the application with Socket.IO support
    # Use port 5001 to avoid conflicts with AirPlay on macOS
    port = int(os.environ.get('PORT', 5001))
    logger.info(f"Starting server on port {port}")
    logger.info(f"Socket.IO async mode: {socketio.async_mode}")
    
    # Run with debug=False for production-like environment
    # With Python 3.12, use threading mode instead of eventlet
    try:
        socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
    except Exception as e:
        logger.error(f"Error starting server: {str(e)}")
        raise 