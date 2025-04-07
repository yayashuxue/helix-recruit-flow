# Helix Recruiting Assistant

An agentic AI-powered recruiting assistant that helps create personalized outreach sequences.

## Features

- **Conversational UI**: Chat with Helix to get help with recruiting outreach
- **Agentic Architecture**: AI detects when to use tools and executes them automatically
- **Real-time Sequence Generation**: Create recruiting sequences for any position
- **Interactive Workspace**: Edit and refine sequences directly in the interface
- **Tool-based System**: Modular architecture with extensible tool registry

## Getting Started

### Prerequisites

- Node.js 18+ for the frontend
- Python 3.9-3.10 for the backend (recommended for WebSocket compatibility)
- Anthropic API key for Claude access
- PostgreSQL database (optional, SQLite works for development)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/helix-recruit-flow.git
cd helix-recruit-flow
```

2. Install frontend dependencies:

```bash
npm install
```

3. Setup backend:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

4. Check WebSocket dependencies:

```bash
# Run the dependency checker script
python setup_websocket.py
```

5. Create a `.env` file in the backend directory with your API keys:

```
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Running the Application

1. Start the backend (Option 1 - Using the run script):

```bash
cd backend
chmod +x run.sh  # Make the script executable (first time only)
./run.sh
```

2. Start the backend (Option 2 - Manual start):

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate

# For better WebSocket support, use gunicorn with eventlet worker:
gunicorn --worker-class eventlet -w 1 -b 0.0.0.0:5001 app:app

# Alternative: Simple Flask development server
python app.py
# or
flask run --port=5001
```

3. Start the frontend:

```bash
npm run dev
```

4. Open your browser and navigate to http://localhost:5173

## Troubleshooting

### WebSocket Connection Issues

If you experience WebSocket connection issues:

1. **Check console for errors**: Look for "WebSocket connection failed" messages
2. **Python 3.12 compatibility**: We've configured the application to use threading mode instead of eventlet for Python 3.12 compatibility. This should work automatically.
3. **Verify connection with browser tools**: Check the Network tab in your browser's developer tools to see if Socket.IO connections are established
4. **Use the run script**: The provided `run.sh` script configures the server optimally for your Python version
5. **Fallback mechanism**: The application will automatically fall back to polling if WebSocket connections fail
6. **Restart both frontend and backend**: Sometimes a clean restart resolves connection issues

If issues persist after using these solutions:

1. Try running with `python app.py` directly rather than Flask's development server
2. If using Python 3.12, consider adding `allow_unsafe_werkzeug=True` to socketio.run() in app.py
3. For production deployments, use gunicorn with a threading worker: `gunicorn --worker-class gthread -w 1 app:app`

## Architecture

### Frontend

- React with TypeScript
- Socket.IO for real-time updates
- Custom hooks for chat and sequence management

### Backend

- Flask for the API server
- Flask-SocketIO for real-time communication
- SQLAlchemy for database management

### Agentic AI System

The application uses a tool-based agentic approach:

1. **Tool Registry**: Central registry for all available AI tools
2. **Function Calling**: AI identifies when to use tools based on user intent
3. **Sequence Tools**: Tools for creating and refining recruiting sequences
4. **Real-time Feedback**: Socket.IO for immediate UI updates when tools are used

### Data Flow

1. User sends message through the chat interface
2. Message is processed by the backend AI service
3. AI generates response and identifies tool calls if needed
4. Tool calls are executed and results are sent back to the frontend
5. Real-time updates are sent via Socket.IO events
6. Frontend updates UI based on received events

### Tools

- `generate_sequence`: Creates a new recruiting sequence for a specific position
- `refine_sequence_step`: Updates individual sequence steps based on feedback
- `analyze_sequence`: Provides suggestions for improving a sequence

## Development Notes

- See `development-notes.md` for detailed information about the current architecture, issues, and planned improvements
- Current focus is on resolving WebSocket connectivity issues for seamless real-time updates
- The architecture follows a frontend-first approach with minimized backend complexity

## Best Practices

The AI assistant follows recruiting best practices:

- Value-focused outreach that emphasizes benefits to candidates
- Personalized messaging tailored to specific roles
- Concise and impactful communication (150-250 words per message)
- Clear calls-to-action that drive responses
- Professional and respectful tone throughout

## License

This project is licensed under the MIT License - see the LICENSE file for details.
