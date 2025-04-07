# Helix Recruiting Agent Backend

This is the Flask backend for the Helix HR recruiting agent. It provides an API for chat functionality and sequence generation/management.

## Setup Instructions

### Prerequisites

- Python 3.8+
- PostgreSQL database (can be hosted on Railway, Render, or another provider)
- virtualenv or another virtual environment tool

### Environment Setup

1. Create and activate a virtual environment:

```fish
python -m venv venv
source venv/bin/activate.fish
```

2. Install dependencies:

```fish
pip install -r requirements.txt
```

3. Configure your `.env` file with your PostgreSQL connection string:

```
SQLALCHEMY_DATABASE_URI=postgresql://username:password@hostname:port/database
```

### Using Railway for PostgreSQL

1. Create a PostgreSQL instance on [Railway](https://railway.app)
2. Get the connection URL from the Railway dashboard
3. Update your `.env` file with the connection URL

### Initialize the Database

Initialize the database with:

```fish
flask --app app init-db
```

### Running the Application

Start the application with:

```fish
FLASK_APP=app python -m flask run --port=5001
```

The server will run on http://localhost:5000 by default.

## API Endpoints

### Chat API

- `POST /api/chat/message` - Send a message and get an AI response
- `GET /api/chat/history/<user_id>` - Get chat history for a user

### Sequence API

- `POST /api/sequences/generate` - Generate a new recruiting sequence
- `PUT /api/sequences/update` - Update an existing sequence
- `GET /api/sequences/<sequence_id>` - Get a specific sequence
- `GET /api/sequences/user/<user_id>` - Get all sequences for a user
- `POST /api/sequences/refine` - Refine a specific step in a sequence

## Socket.IO Events

- `new_message` - Emitted when a new chat message is created
- `sequence_updated` - Emitted when a sequence is created or updated
