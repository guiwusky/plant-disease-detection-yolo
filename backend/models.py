from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class DetectionRecord(Base):
    __tablename__ = "detection_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=True, index=True) # UUID for device-based isolation
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    original_image_path = Column(String(255), nullable=False)
    result_image_path = Column(String(255), nullable=False)
    detections_json = Column(Text, nullable=True)  # Store JSON string of detections
    highest_confidence = Column(String(50), nullable=True)
    primary_disease = Column(String(100), nullable=True)
