import io
import base64
import os
import json
import uuid
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from PIL import Image
import cv2
import numpy as np
import torch
import torch.nn as nn
from ultralytics import YOLO
from ultralytics.nn.modules import Conv

# TimmBackbone class - matches training code
class TimmBackbone(nn.Module):
    def __init__(self, model_name, pretrained=True, out_indices=(2, 3, 4)):
        super().__init__()
        import timm
        self.model = timm.create_model(model_name, features_only=True,
                                      pretrained=pretrained, out_indices=out_indices)
        self.out_channels = self.model.feature_info.channels()

    def forward(self, x):
        return self.model(x)

# TimmExtract class - matches training code
class TimmExtract(nn.Module):
    def __init__(self, index):
        super().__init__()
        self.index = index

    def forward(self, x):
        return x[self.index]

# Register custom classes to ultralytics.nn.tasks module BEFORE loading model
import ultralytics.nn.tasks
ultralytics.nn.tasks.TimmBackbone = TimmBackbone
ultralytics.nn.tasks.TimmExtract = TimmExtract

# Import database configuration and models
try:
    from database import get_db, SessionLocal
    from models import DetectionRecord
    DB_AVAILABLE = SessionLocal is not None
except ImportError:
    DB_AVAILABLE = False
    print("Warning: Database modules not found.")

app = FastAPI(title="YOLO Plant Disease Detection API")

# Ensure upload directories exist
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
RESULT_DIR = os.path.join(os.path.dirname(__file__), "results")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)

# Mount static files to serve images via HTTP
app.mount("/static/uploads", StaticFiles(directory=UPLOAD_DIR), name="static_uploads")
app.mount("/static/results", StaticFiles(directory=RESULT_DIR), name="static_results")

# Allow CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the YOLO model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "best.pt")

try:
    if os.path.exists(MODEL_PATH):
        model = YOLO(MODEL_PATH)
        print(f"Loaded custom model from {MODEL_PATH}")
    else:
        # Fallback to a default model if best.pt is not found yet
        print(f"Warning: {MODEL_PATH} not found. Loading default yolov8n.pt for testing.")
        model = YOLO("yolov8n.pt")
except Exception as e:
    print(f"Error loading model: {e}")
    import traceback
    traceback.print_exc()
    model = None

@app.get("/")
def read_root():
    return {"message": "Plant Disease Detection API is running. Use /detect endpoint for inference."}

@app.post("/detect")
async def detect_disease(
    file: UploadFile = File(...),
    user_id: str = Form("anonymous"),
    db: Session = Depends(get_db) if DB_AVAILABLE else None
):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded on server.")
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")

    try:
        # Read the image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        image_np = np.array(image)
        # Convert RGB to BGR for OpenCV / YOLO processing if needed
        # YOLOv8 handles RGB/BGR internally, but OpenCV uses BGR
        image_bgr = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)

        # Generate unique filenames based on timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        original_filename = f"{timestamp}_{unique_id}_original.jpg"
        result_filename = f"{timestamp}_{unique_id}_result.jpg"
        
        # Save original image
        original_path = os.path.join(UPLOAD_DIR, original_filename)
        image.save(original_path, format="JPEG")

        # Run inference
        results = model.predict(source=image_bgr, conf=0.25)
        
        # Parse results
        detections = []
        highest_conf = 0.0
        primary_disease = "None"
        
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Get box coordinates, confidence, and class
                b = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                c = box.cls[0].item()
                conf = box.conf[0].item()
                class_name = model.names[int(c)]
                
                # Keep track of the most confident detection
                if conf > highest_conf:
                    highest_conf = conf
                    primary_disease = class_name
                
                detections.append({
                    "box": [round(x, 2) for x in b],
                    "class_id": int(c),
                    "class_name": class_name,
                    "confidence": round(conf, 4)
                })

        # Render the image with bounding boxes
        res_plotted = results[0].plot()  # BGR array
        
        # Convert back to RGB for PIL
        res_rgb = cv2.cvtColor(res_plotted, cv2.COLOR_BGR2RGB)
        res_img_pil = Image.fromarray(res_rgb)
        
        # Save result image
        result_path = os.path.join(RESULT_DIR, result_filename)
        res_img_pil.save(result_path, format="JPEG")
        
        # Convert to Base64 for immediate frontend display
        buffered = io.BytesIO()
        res_img_pil.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

        # Save to database if available
        record_id = None
        if db is not None:
            try:
                db_record = DetectionRecord(
                    user_id=user_id,
                    original_image_path=f"/static/uploads/{original_filename}",
                    result_image_path=f"/static/results/{result_filename}",
                    detections_json=json.dumps(detections),
                    highest_confidence=f"{highest_conf:.4f}" if detections else None,
                    primary_disease=primary_disease
                )
                db.add(db_record)
                db.commit()
                db.refresh(db_record)
                record_id = db_record.id
                print(f"Saved record {record_id} to database")
            except Exception as db_err:
                print(f"Database error: {db_err}")
                db.rollback()

        return JSONResponse(content={
            "success": True,
            "record_id": record_id,
            "primary_disease": primary_disease,
            "detections": detections,
            "image_base64": img_str,
            "original_url": f"/static/uploads/{original_filename}",
            "result_url": f"/static/results/{result_filename}"
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.get("/history")
def get_history(
    user_id: str = "anonymous",
    limit: int = 20, 
    offset: int = 0,
    db: Session = Depends(get_db) if DB_AVAILABLE else None
):
    """Retrieve history of past detections for a specific user"""
    if db is None:
        return JSONResponse(content={"success": False, "message": "Database not configured"})
        
    try:
        # Get total count
        total = db.query(DetectionRecord).filter(DetectionRecord.user_id == user_id).count()
        
        # Filter by user_id and order by newest first
        records = db.query(DetectionRecord)\
                    .filter(DetectionRecord.user_id == user_id)\
                    .order_by(DetectionRecord.created_at.desc())\
                    .limit(limit)\
                    .offset(offset).all()
        
        history_list = []
        for r in records:
            history_list.append({
                "id": r.id,
                "date": r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "primary_disease": r.primary_disease,
                "confidence": r.highest_confidence,
                "original_url": r.original_image_path,
                "result_url": r.result_image_path,
                "detections": json.loads(r.detections_json) if r.detections_json else []
            })
            
        return JSONResponse(content={"success": True, "total": total, "history": history_list})
    except Exception as e:
        print(f"Error fetching history: {e}")
        return JSONResponse(content={"success": False, "message": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
