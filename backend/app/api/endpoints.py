from fastapi import APIRouter, HTTPException
from app.services import database
from app.models import TimeSeriesData, ForecastData
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/fact", response_model=list[TimeSeriesData])
async def get_fact():
    try:
        data = await database.fetch_timeseries_data()
        return data
    except Exception as e:
        logger.error("Error in /fact endpoint: %s", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/forecast", response_model=list[ForecastData])
async def get_forecast():
    try:
        data = await database.fetch_forecast_data()
        return data
    except Exception as e:
        logger.error("Error in /forecast endpoint: %s", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")
