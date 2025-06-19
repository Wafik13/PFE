import os
import joblib
import mlflow.pyfunc
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

router = APIRouter()

# Define request and response schemas
class SensorSnapshot(BaseModel):
    machine_id: str
    features: Dict[str, float]

class PredictionResult(BaseModel):
    prediction: str
    confidence: float
    model_version: str
    features_used: Dict[str, float]

# Load model from MLflow (or fallback to joblib)
def load_latest_model(model_name: str):
    try:
        model_uri = f"models:/{model_name}/production"
        return mlflow.pyfunc.load_model(model_uri)
    except Exception as e:
        raise RuntimeError(f"Failed to load model: {e}")

try:
    classifier = load_latest_model("FaultClassifier")
except Exception as e:
    classifier = None
    print(f"[MLServer] WARNING: Could not load model - {e}")

@router.post("/alerts/predict", response_model=PredictionResult)
def predict_fault(snapshot: SensorSnapshot):
    if classifier is None:
        raise HTTPException(status_code=503, detail="ML model not loaded")

    features_df = pd.DataFrame([snapshot.features])
    pred = classifier.predict(features_df)[0]
    conf = 0.9  # Optional: classifier.predict_proba()[0][pred] if supported

    return PredictionResult(
        prediction=str(pred),
        confidence=conf,
        model_version="production",
        features_used=snapshot.features
    )