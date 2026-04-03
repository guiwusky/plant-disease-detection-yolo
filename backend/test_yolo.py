from ultralytics import YOLO
import traceback

try:
    print("Loading YOLO...")
    model = YOLO("yolov8n.pt")
    print("Loaded successfully")
except Exception as e:
    print("Error loading YOLO:")
    traceback.print_exc()
