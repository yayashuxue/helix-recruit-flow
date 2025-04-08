"""
Migration script to create session_states table for context tracking.
Run this script after adding the SessionState model to create the table in the database.
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Add the parent directory to the path so we can import the app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Load environment variables
load_dotenv()

# Get database URL from environment
db_url = os.environ.get('SQLALCHEMY_DATABASE_URI')
if not db_url:
    print("Error: SQLALCHEMY_DATABASE_URI environment variable not set")
    sys.exit(1)

# Create engine
engine = create_engine(db_url)

# SQL to create session_states table
create_table_sql = """
CREATE TABLE IF NOT EXISTS session_states (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    active_sequence_id VARCHAR(36) REFERENCES sequences(id) ON DELETE SET NULL,
    last_action VARCHAR(100),
    last_action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    context_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sequence FOREIGN KEY (active_sequence_id) REFERENCES sequences(id) ON DELETE SET NULL
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_session_states_user_id ON session_states(user_id);
CREATE INDEX IF NOT EXISTS idx_session_states_sequence_id ON session_states(active_sequence_id);
"""

def run_migration():
    print("Running migration to create session_states table...")
    
    try:
        # Connect to database and execute SQL
        with engine.connect() as conn:
            conn.execute(text(create_table_sql))
            conn.commit()
        
        print("Migration completed successfully!")
        return True
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1) 