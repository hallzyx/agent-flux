"""API smoke tests."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_contract():
    res = client.get("/api/contract")
    assert res.status_code == 200
    assert len(res.json()["clauses"]) >= 3


def test_ping_without_vultr():
    res = client.post("/api/ping", json={"prompt": "pong"})
    assert res.status_code == 200
    data = res.json()
    assert "executor_model" in data
    assert "critic_model" in data
