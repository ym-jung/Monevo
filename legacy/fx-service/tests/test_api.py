from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "UP"}


def test_unsupported_currency():
    res = client.get("/rates", params={"base": "JPY", "quote": "EUR"})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "UNSUPPORTED_CURRENCY"


def test_same_currency_is_rejected():
    res = client.get("/rates", params={"base": "JPY", "quote": "JPY"})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "UNSUPPORTED_CURRENCY"


def test_missing_query_param():
    res = client.get("/rates", params={"base": "JPY"})
    assert res.status_code == 422


def test_bad_date_format():
    res = client.get("/rates/historical", params={"base": "JPY", "quote": "USD", "date": "2026/08/15"})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INVALID_DATE"


def test_future_date():
    res = client.get("/rates/historical", params={"base": "JPY", "quote": "USD", "date": "2099-01-01"})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INVALID_DATE"
