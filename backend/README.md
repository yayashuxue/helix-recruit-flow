# Helix Recruiting Assistant - Backend

## Context Management System Implementation

Recently added a session context management system that solves the problem of AI not maintaining context during conversations. This system enables the AI to remember active sequences and correctly handle short commands, avoiding unnecessary sequence regeneration.

### Key Features

1. **SessionState Model**: Tracks user session state, including active sequences and context data
2. **SessionService**: Session state service that manages context operations
3. **Context-aware System Prompts**: Dynamically generates AI system prompts containing current context
4. **Short Message Handling**: Correctly handles brief commands without triggering sequence regeneration

## Setup and Running

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Variables

Create a `.env` file:

```
FLASK_APP=app
FLASK_ENV=development
SQLALCHEMY_DATABASE_URI=sqlite:///helix.db
ANTHROPIC_API_KEY=your_api_key_here
```

### 3. Database Reset (Development Environment)

Since we're currently in prototype development, you can use the reset script to clear and rebuild the database:

```bash
python reset_db.py
```

Note: This operation will **delete all existing data** and rebuild the database structure.

### 4. Run Server

```bash
python run.py
```

## API Endpoints

- `/api/chat/message` - Send chat messages
- `/api/sequences/generate` - Generate new recruiting sequences
- `/api/sequences/update` - Update existing sequences

## How Context Management Works

1. Each user session has a persistent session state
2. The session state tracks active sequence IDs and recent operations
3. Context information is injected into the system prompt for each AI request
4. For short messages, special instructions are added to avoid regenerating sequences

## Technical Implementation

- `SessionState` model - Stores session state
- `SessionService` - Manages session state operations
- Dynamic system prompt generation with session context
- Frontend-backend state synchronization
