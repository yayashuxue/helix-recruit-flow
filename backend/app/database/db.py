from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

def init_app(app):
    # SQLAlchemy configuration should already be set in app.config
    # Set track modifications if not already set
    if 'SQLALCHEMY_TRACK_MODIFICATIONS' not in app.config:
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app) 