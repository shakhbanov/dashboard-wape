import asyncpg
from app.config import settings
import logging
from asyncpg.exceptions import UndefinedTableError, UndefinedColumnError

logger = logging.getLogger(__name__)

async def get_db_pool():
    try:
        pool = await asyncpg.create_pool(
            host=settings.postgres_host,
            port=settings.postgres_port,
            user=settings.postgres_user,
            password=settings.postgres_password,
            database=settings.postgres_dbname,
        )
        logger.info("DB connection pool created successfully")
        return pool
    except UndefinedTableError as e:
        logger.error("Table not found error: %s", e)
        raise e
    except UndefinedColumnError as e:
        logger.error("Column not found error: %s", e)
        raise e
    except Exception as e:
        logger.error("Error creating DB pool: %s", e)
        raise e

async def fetch_timeseries_data():
    pool = await get_db_pool()
    async with pool.acquire() as connection:
        query = """
            SELECT rest_id,       -- номер ресторана
                   address,       -- адресс
                   day_id,        -- дата
                   check_qnty,    -- количество чеков
                   sales          -- выручка
            FROM fact
            WHERE day_id >= '2025-01-01'
            ORDER BY day_id;
        """
        try:
            logger.info("Executing query: %s", query)
            records = await connection.fetch(query)
            if not records:
                logger.warning("Query returned no data!")
            else:
                logger.info("Query successful, %d records fetched", len(records))
            return [dict(record) for record in records]
        except UndefinedTableError as e:
            logger.error("Table not found error: %s", e)
            raise e
        except UndefinedColumnError as e:
            logger.error("Column not found error: %s", e)
            raise e
        except Exception as e:
            logger.error("Error fetching timeseries data: %s", e)
            raise e

async def fetch_forecast_data():
    pool = await get_db_pool()
    async with pool.acquire() as connection:
        query = """
            SELECT rest_id,       -- номер ресторана
                   day_id,        -- дата
                   check_qnty,    -- количество чеков
                   sales          -- выручка
            FROM forecast
            WHERE day_id >= '2025-01-01' AND day_id < CURRENT_DATE
            ORDER BY day_id;
        """
        try:
            logger.info("Executing query: %s", query)
            records = await connection.fetch(query)
            if not records:
                logger.warning("Query returned no data!")
            else:
                logger.info("Query successful, %d records fetched", len(records))
            return [dict(record) for record in records]
        except UndefinedTableError as e:
            logger.error("Table not found error: %s", e)
            raise e
        except UndefinedColumnError as e:
            logger.error("Column not found error: %s", e)
            raise e
        except Exception as e:
            logger.error("Error fetching forecast data: %s", e)
            raise e
