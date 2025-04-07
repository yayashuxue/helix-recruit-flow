from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
import os
from dotenv import load_dotenv

# Load environment variables directly in the module
load_dotenv()

# Initialize Socket.IO with threading mode for Python 3.12 compatibility
# Note: eventlet has compatibility issues with Python 3.12
socketio = SocketIO(cors_allowed_origins="*", async_mode='threading', logger=True, engineio_logger=True)

def create_app(config=None):
    app = Flask(__name__)
    
    # Load configuration - include default database URI
    app.config.from_mapping(
        SECRET_KEY='dev',
        SQLALCHEMY_DATABASE_URI=os.environ.get('SQLALCHEMY_DATABASE_URI'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )
    
    # Update config from the provided config object (from environment variables)
    if config:
        app.config.update(config)
        
    # Enable CORS for all routes and origins
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Initialize extensions
    from .database import db
    db.init_app(app)
    
    # Register blueprints
    from .api import chat_bp, sequence_bp
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(sequence_bp, url_prefix='/api/sequences')
    
    # Initialize Socket.IO with the Flask app
    socketio.init_app(app, cors_allowed_origins="*", ping_timeout=60, ping_interval=25)
    
    # Create a route for testing
    @app.route('/api/health')
    def health_check():
        return {'status': 'ok', 'message': 'Helix Recruiting API is running'}
    
    return app 