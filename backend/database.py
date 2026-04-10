import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

# Determine if we are in local development or production
# Use SQLite for local testing if DB_USER is not set
DB_USER = os.getenv("DB_USER")

if DB_USER:
    # Production: Use MySQL
    DB_PASSWORD = os.getenv("DB_PASSWORD", "your_password")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "plant_disease_db")
    SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    connect_args = {}
else:
    # Local Development: Use SQLite file database
    SQLALCHEMY_DATABASE_URL = "sqlite:///./local_history.db"
    connect_args = {"check_same_thread": False}

# Create engine
try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    db_type = "MySQL" if DB_USER else "SQLite"
    print(f"Successfully connected to {db_type} database.")
except Exception as e:
    print(f"Warning: Could not connect to database. Error: {e}")
    print("Database features will be disabled.")
    engine = None
    SessionLocal = None

def get_db():
    if SessionLocal is None:
        yield None
        return
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
