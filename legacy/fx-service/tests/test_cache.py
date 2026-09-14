import time
from datetime import datetime, timedelta

import pytest

from app.main import (
    LATEST_TTL_SECONDS,
    CACHE_MAX_ENTRIES,
    cache_get,
    cache_put,
    rates_cache,
    settled_expiry,
)


@pytest.fixture(autouse=True)
def clear_cache():
    rates_cache.clear()
    yield
    rates_cache.clear()


def test_returns_a_stored_entry():
    cache_put(("USD", "JPY", "latest"), {"rate": "150"}, time.time() + 60)

    assert cache_get(("USD", "JPY", "latest")) == {"rate": "150"}


def test_returns_none_for_a_missing_entry():
    assert cache_get(("USD", "JPY", "latest")) is None


def test_drops_an_expired_entry():
    key = ("USD", "JPY", "latest")
    cache_put(key, {"rate": "150"}, time.time() - 1)

    assert cache_get(key) is None
    assert key not in rates_cache


def test_keeps_an_entry_that_never_expires():
    key = ("USD", "JPY", "2020-01-02")
    cache_put(key, {"rate": "150"}, None)

    assert cache_get(key) == {"rate": "150"}


def test_evicts_when_the_cache_is_full():
    for index in range(CACHE_MAX_ENTRIES):
        cache_put(("USD", "JPY", str(index)), {"rate": str(index)}, None)

    cache_put(("USD", "JPY", "overflow"), {"rate": "new"}, None)

    assert len(rates_cache) == CACHE_MAX_ENTRIES
    assert cache_get(("USD", "JPY", "overflow")) == {"rate": "new"}


def test_overwriting_an_existing_key_does_not_evict():
    for index in range(CACHE_MAX_ENTRIES):
        cache_put(("USD", "JPY", str(index)), {"rate": str(index)}, None)

    cache_put(("USD", "JPY", "0"), {"rate": "updated"}, None)

    assert len(rates_cache) == CACHE_MAX_ENTRIES
    assert cache_get(("USD", "JPY", "0")) == {"rate": "updated"}


def test_a_settled_market_date_never_expires():
    yesterday = (datetime.now().date() - timedelta(days=1)).strftime("%Y-%m-%d")

    assert settled_expiry(yesterday) is None


def test_todays_market_date_gets_the_short_ttl():
    today = datetime.now().date().strftime("%Y-%m-%d")

    expiry = settled_expiry(today)

    assert expiry is not None
    assert expiry <= time.time() + LATEST_TTL_SECONDS


def test_an_unparseable_market_date_gets_the_short_ttl():
    for value in ["", "not-a-date", None]:
        expiry = settled_expiry(value)

        assert expiry is not None
        assert expiry <= time.time() + LATEST_TTL_SECONDS
