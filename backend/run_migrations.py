#!/usr/bin/env python3
"""
Script to run all migrations in sequence.
Run this script to ensure the database schema is up to date.
"""

import os
import importlib.util
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def import_migration(file_path):
    """Import a migration module from file path"""
    module_name = os.path.basename(file_path).replace('.py', '')
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def run_migrations():
    """Run all migrations in the migrations directory"""
    migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
    
    if not os.path.exists(migrations_dir):
        print(f"Error: Migrations directory not found: {migrations_dir}")
        return False
    
    # Get all Python files in the migrations directory
    migration_files = [
        os.path.join(migrations_dir, f) 
        for f in os.listdir(migrations_dir) 
        if f.endswith('.py') and not f.startswith('__')
    ]
    
    # Sort files to ensure consistent order
    migration_files.sort()
    
    if not migration_files:
        print("No migration files found.")
        return True
    
    # Run each migration
    success = True
    for file_path in migration_files:
        try:
            print(f"Running migration: {os.path.basename(file_path)}")
            module = import_migration(file_path)
            if hasattr(module, 'run_migration'):
                if not module.run_migration():
                    success = False
                    print(f"Migration failed: {os.path.basename(file_path)}")
                    break
            else:
                print(f"Warning: No run_migration function in {os.path.basename(file_path)}")
        except Exception as e:
            success = False
            print(f"Error running migration {os.path.basename(file_path)}: {str(e)}")
            break
    
    if success:
        print("All migrations completed successfully!")
    else:
        print("Migration process failed.")
    
    return success

if __name__ == "__main__":
    success = run_migrations()
    sys.exit(0 if success else 1) 