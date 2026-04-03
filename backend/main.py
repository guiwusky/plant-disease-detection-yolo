import io
import base64
import os
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image
import cv2
import numpy as np
from ultralytics import YOLO

app = FastAPI(title="YOLO Plant Disease Detection API")

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
async def detect_disease(file: UploadFile = File(...)):
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

        # Run inference
        results = model.predict(source=image_bgr, conf=0.25)
        
        # Parse results
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Get box coordinates, confidence, and class
                b = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                c = box.cls[0].item()
                conf = box.conf[0].item()
                class_name = model.names[int(c)]
                
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
        
        # Convert to Base64
        buffered = io.BytesIO()
        res_img_pil.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

        return JSONResponse(content={
            "success": True,
            "detections": detections,
            "image_base64": img_str
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
