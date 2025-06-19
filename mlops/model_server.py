#!/usr/bin/env python3
"""
ML Model Inference Server for Industrial IoT Platform
Exposes /api/alerts endpoint for serving predictions from MLflow models
"""

import os
import logging
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime

import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import mlflow
import mlflow.sklearn
import mlflow.tensorflow
import numpy as np
import pandas as pd
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from fastapi.responses import Response

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
PREDICTION_COUNTER = Counter('ml_predictions_total', 'Total ML predictions', ['model_type', 'status'])
PREDICTION_LATENCY = Histogram('ml_prediction_duration_seconds', 'ML prediction latency')
MODEL_LOAD_COUNTER = Counter('ml_model_loads_total', 'Total model loads', ['model_type'])
ACTIVE_MODELS = Gauge('ml_active_models', 'Number of active models loaded')

# Pydantic models
class SensorData(BaseModel):
    machine_id: str
    timestamp: datetime
    temperature: float = Field(..., ge=-50, le=200)
    pressure: float = Field(..., ge=0, le=1000)
    vibration: float = Field(..., ge=0, le=100)
    rotation_speed: float = Field(..., ge=0, le=10000)
    power_consumption: float = Field(..., ge=0, le=50000)

class PredictionRequest(BaseModel):
    sensor_data: List[SensorData]
    model_types: Optional[List[str]] = ["fault_classifier", "anomaly_detector", "value_forecaster"]

class FaultPrediction(BaseModel):
    fault_type: str
    probability: float
    confidence: float

class AnomalyPrediction(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    threshold: float

class ValueForecast(BaseModel):
    parameter: str
    forecasted_values: List[float]
    forecast_horizon: int
    confidence_intervals: List[Dict[str, float]]

class PredictionResponse(BaseModel):
    machine_id: str
    timestamp: datetime
    fault_predictions: Optional[List[FaultPrediction]] = None
    anomaly_prediction: Optional[AnomalyPrediction] = None
    value_forecasts: Optional[List[ValueForecast]] = None
    model_versions: Dict[str, str]

class ModelManager:
    """Manages loading and caching of MLflow models"""
    
    def __init__(self):
        self.models = {}
        self.model_versions = {}
        self.mlflow_uri = os.getenv('MLFLOW_TRACKING_URI', 'http://mlflow-server:5000')
        mlflow.set_tracking_uri(self.mlflow_uri)
        
    async def load_model(self, model_name: str, stage: str = "Production") -> Any:
        """Load model from MLflow registry"""
        try:
            if model_name in self.models:
                return self.models[model_name]
                
            logger.info(f"Loading model {model_name} from stage {stage}")
            
            # Get latest model version from registry
            client = mlflow.tracking.MlflowClient()
            model_version = client.get_latest_versions(
                model_name, stages=[stage]
            )[0]
            
            model_uri = f"models:/{model_name}/{stage}"
            
            # Load model based on type
            if "tensorflow" in model_name.lower() or "lstm" in model_name.lower():
                model = mlflow.tensorflow.load_model(model_uri)
            else:
                model = mlflow.sklearn.load_model(model_uri)
                
            self.models[model_name] = model
            self.model_versions[model_name] = model_version.version
            
            MODEL_LOAD_COUNTER.labels(model_type=model_name).inc()
            ACTIVE_MODELS.set(len(self.models))
            
            logger.info(f"Successfully loaded {model_name} version {model_version.version}")
            return model
            
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Model loading failed: {str(e)}")
    
    def get_model_version(self, model_name: str) -> str:
        return self.model_versions.get(model_name, "unknown")

# Initialize FastAPI app and model manager
app = FastAPI(
    title="IIP ML Inference Service",
    description="Machine Learning inference service for Industrial IoT Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_manager = ModelManager()

@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    logger.info("Starting ML Inference Service")
    try:
        # Pre-load production models
        await model_manager.load_model("RandomForestFaultClassifier")
        await model_manager.load_model("IsolationForestAnomalyDetector")
        await model_manager.load_model("LSTMValueForecaster")
        logger.info("All models loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load models on startup: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "active_models": len(model_manager.models),
        "mlflow_uri": model_manager.mlflow_uri
    }

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type="text/plain")

@app.post("/api/alerts", response_model=List[PredictionResponse])
async def predict_alerts(
    request: PredictionRequest,
    background_tasks: BackgroundTasks
) -> List[PredictionResponse]:
    """Main prediction endpoint for generating alerts"""
    
    with PREDICTION_LATENCY.time():
        try:
            responses = []
            
            for sensor_data in request.sensor_data:
                response = PredictionResponse(
                    machine_id=sensor_data.machine_id,
                    timestamp=sensor_data.timestamp,
                    model_versions={}
                )
                
                # Prepare feature vector
                features = np.array([[
                    sensor_data.temperature,
                    sensor_data.pressure,
                    sensor_data.vibration,
                    sensor_data.rotation_speed,
                    sensor_data.power_consumption
                ]])
                
                # Fault Classification
                if "fault_classifier" in request.model_types:
                    try:
                        fault_model = await model_manager.load_model("RandomForestFaultClassifier")
                        fault_probs = fault_model.predict_proba(features)[0]
                        fault_classes = fault_model.classes_
                        
                        fault_predictions = []
                        for i, prob in enumerate(fault_probs):
                            if prob > 0.1:  # Only include significant probabilities
                                fault_predictions.append(FaultPrediction(
                                    fault_type=fault_classes[i],
                                    probability=float(prob),
                                    confidence=float(np.max(fault_probs))
                                ))
                        
                        response.fault_predictions = fault_predictions
                        response.model_versions["fault_classifier"] = model_manager.get_model_version("RandomForestFaultClassifier")
                        
                        PREDICTION_COUNTER.labels(model_type="fault_classifier", status="success").inc()
                        
                    except Exception as e:
                        logger.error(f"Fault classification failed: {str(e)}")
                        PREDICTION_COUNTER.labels(model_type="fault_classifier", status="error").inc()
                
                # Anomaly Detection
                if "anomaly_detector" in request.model_types:
                    try:
                        anomaly_model = await model_manager.load_model("IsolationForestAnomalyDetector")
                        anomaly_score = anomaly_model.decision_function(features)[0]
                        is_anomaly = anomaly_model.predict(features)[0] == -1
                        
                        response.anomaly_prediction = AnomalyPrediction(
                            is_anomaly=bool(is_anomaly),
                            anomaly_score=float(anomaly_score),
                            threshold=-0.1  # Configurable threshold
                        )
                        response.model_versions["anomaly_detector"] = model_manager.get_model_version("IsolationForestAnomalyDetector")
                        
                        PREDICTION_COUNTER.labels(model_type="anomaly_detector", status="success").inc()
                        
                    except Exception as e:
                        logger.error(f"Anomaly detection failed: {str(e)}")
                        PREDICTION_COUNTER.labels(model_type="anomaly_detector", status="error").inc()
                
                # Value Forecasting
                if "value_forecaster" in request.model_types:
                    try:
                        forecast_model = await model_manager.load_model("LSTMValueForecaster")
                        
                        # Reshape for LSTM (assuming sequence length of 1 for simplicity)
                        lstm_features = features.reshape((1, 1, features.shape[1]))
                        forecasts = forecast_model.predict(lstm_features)[0]
                        
                        value_forecasts = []
                        parameters = ["temperature", "pressure", "vibration", "rotation_speed", "power_consumption"]
                        
                        for i, param in enumerate(parameters):
                            if i < len(forecasts):
                                value_forecasts.append(ValueForecast(
                                    parameter=param,
                                    forecasted_values=[float(forecasts[i])],
                                    forecast_horizon=1,
                                    confidence_intervals=[{"lower": float(forecasts[i] * 0.95), "upper": float(forecasts[i] * 1.05)}]
                                ))
                        
                        response.value_forecasts = value_forecasts
                        response.model_versions["value_forecaster"] = model_manager.get_model_version("LSTMValueForecaster")
                        
                        PREDICTION_COUNTER.labels(model_type="value_forecaster", status="success").inc()
                        
                    except Exception as e:
                        logger.error(f"Value forecasting failed: {str(e)}")
                        PREDICTION_COUNTER.labels(model_type="value_forecaster", status="error").inc()
                
                responses.append(response)
            
            return responses
            
        except Exception as e:
            logger.error(f"Prediction request failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/api/models/reload")
async def reload_models():
    """Reload all models from MLflow"""
    try:
        model_manager.models.clear()
        model_manager.model_versions.clear()
        
        await model_manager.load_model("RandomForestFaultClassifier")
        await model_manager.load_model("IsolationForestAnomalyDetector")
        await model_manager.load_model("LSTMValueForecaster")
        
        return {"status": "success", "message": "All models reloaded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model reload failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "model_server:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8080)),
        reload=False,
        log_level="info"
    )