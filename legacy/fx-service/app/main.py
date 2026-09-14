import asyncio
import httpx
import time
import yfinance as yf
from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="monevo fx-service", version="0.0.1")

rates_cache = {}

LATEST_TTL_SECONDS = 900
CACHE_MAX_ENTRIES = 4096


def cache_get(cache_key):
    entry = rates_cache.get(cache_key)
    if entry is None:
        return None

    expires_at = entry["expires_at"]
    if expires_at is not None and time.time() >= expires_at:
        del rates_cache[cache_key]
        return None

    return entry["data"]


def cache_put(cache_key, data, expires_at):
    if cache_key not in rates_cache and len(rates_cache) >= CACHE_MAX_ENTRIES:
        rates_cache.pop(next(iter(rates_cache)), None)

    rates_cache[cache_key] = {"data": data, "expires_at": expires_at}


def settled_expiry(as_of):
    try:
        market_date = datetime.strptime(as_of, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return time.time() + LATEST_TTL_SECONDS

    if market_date < datetime.now().date():
        return None

    return time.time() + LATEST_TTL_SECONDS

def validate_currencies(base: str, quote: str):
    supported = {"JPY", "KRW", "USD"}
    if base not in supported or quote not in supported or base == quote:
        return JSONResponse(
            status_code=400,
            content={"error": {"code": "UNSUPPORTED_CURRENCY",
                               "message": f"Unsupported or identical currencies: base={base}, quote={quote}"}}
        )
    return None

def fetch_from_yfinance(base: str, quote: str, target_date: str = None):
    ticker_symbol = f"{quote}{base}=X"
    ticker = yf.Ticker(ticker_symbol)

    if target_date:
        start_dt = datetime.strptime(target_date, "%Y-%m-%d")
        end_dt = start_dt + timedelta(days=5)

        hist = ticker.history(start=start_dt.strftime("%Y-%m-%d"), end=end_dt.strftime("%Y-%m-%d"))
        if hist.empty:
            raise ValueError(f"No yfinance data found for {ticker_symbol} from {target_date}")

        latest_price = hist['Close'].iloc[0]
        latest_date = hist.index[0]
    else:
        hist = ticker.history(period="5d")
        if hist.empty:
            raise ValueError(f"No yfinance data found for {ticker_symbol}")

        latest_price = hist['Close'].iloc[-1]
        latest_date = hist.index[-1]

    rate = f"{float(latest_price):.8f}"
    asOf = latest_date.strftime("%Y-%m-%d")

    return rate, asOf

async def fetch_from_frankfurter(base: str, quote: str, target_date: str = "latest"):
    url = f"https://api.frankfurter.dev/v1/{target_date}?base={quote}&symbols={base}"

    async with httpx.AsyncClient() as client:
        response = await client.get(url)

    if response.status_code != 200:
        raise ValueError(f"Frankfurter API returned {response.status_code}")

    data = response.json()
    latest_price = data.get("rates", {}).get(base)

    if latest_price is None:
        raise ValueError(f"Frankfurter did not return rates for {base}")

    rate = f"{float(latest_price):.8f}"
    asOf = data["date"]

    return rate, asOf

@app.get("/health")
def health():
    return {"status": "UP"}

@app.get("/rates")
async def get_rates(base: str, quote: str):
    validation_err = validate_currencies(base, quote)
    if validation_err:
        return validation_err

    cache_key = (base, quote, "latest")

    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        rate, asOf = await asyncio.to_thread(fetch_from_yfinance, base, quote)
        source = "YFINANCE"
    except Exception as e:
        print(f"[WARN] yfinance failed: {e}. Falling back to Frankfurter.")

        try:
            rate, asOf = await fetch_from_frankfurter(base, quote, "latest")
            source = "FRANKFURTER"
        except Exception as e_frank:
            print(f"[ERROR] Frankfurter also failed: {e_frank}.")
            return JSONResponse(
                status_code=503,
                content={
                    "error": {"code": "RATE_UNAVAILABLE", "message": "All upstream FX APIs are currently unavailable."}}
            )

    result = {
        "base": base,
        "quote": quote,
        "rate": rate,
        "asOf": asOf,
        "source": source
    }

    cache_put(cache_key, result, time.time() + LATEST_TTL_SECONDS)

    return result

@app.get("/rates/historical")
async def get_historical_rates(base: str, quote: str, date: str):
    validation_err = validate_currencies(base, quote)
    if validation_err:
        return validation_err

    try:
        req_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        return JSONResponse(
            status_code=400,
            content={"error": {"code": "INVALID_DATE", "message": "Date must be in YYYY-MM-DD format."}}
        )

    if req_date > datetime.now().date():
        return JSONResponse(
            status_code=400,
            content={"error": {"code": "INVALID_DATE", "message": "Future dates are not allowed."}}
        )

    cache_key = (base, quote, date)

    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        rate, asOf = await asyncio.to_thread(fetch_from_yfinance, base, quote, date)
        source = "YFINANCE"
    except Exception as e:
        print(f"[WARN] yfinance historical failed: {e}. Falling back to Frankfurter.")

        try:
            rate, asOf = await fetch_from_frankfurter(base, quote, date)
            source = "FRANKFURTER"
        except Exception as e_frank:
            print(f"[ERROR] Frankfurter historical also failed: {e_frank}.")
            return JSONResponse(
                status_code=503,
                content={
                    "error": {"code": "RATE_UNAVAILABLE", "message": "All upstream FX APIs are currently unavailable."}}
            )

    result = {
        "base": base,
        "quote": quote,
        "rate": rate,
        "asOf": asOf,
        "source": source
    }

    cache_put(cache_key, result, settled_expiry(asOf))

    return result
