from pydantic import BaseModel
from datetime import date

class TimeSeriesData(BaseModel):
    rest_id: int
    address: str
    day_id: date
    check_qnty: float
    sales: float

class ForecastData(BaseModel):
    rest_id: int
    day_id: date
    check_qnty: float
    sales: float
