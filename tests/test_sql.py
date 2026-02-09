"""Tests for SQL endpoint: POST /api/sql."""

import json
import sys
from unittest.mock import MagicMock

_app = sys.modules["backend.app"]


class TestSql:
    """POST /api/sql — execute SQL queries on loaded log data."""

    def test_sql_no_data_loaded(self, client):
        """SQL with no files opened returns error message."""
        response = client.post("/api/sql", json={"query": "SELECT * FROM logs"})
        assert response.status_code == 200
        data = response.json()

        assert data["columns"] == []
        assert data["rows"] == []
        assert data["row_count"] == 0
        assert "error" in data

    def test_sql_engine_not_available(self, client, monkeypatch):
        monkeypatch.setattr(_app, "HAS_SQL_ENGINE", False)

        response = client.post("/api/sql", json={"query": "SELECT 1"})
        data = response.json()

        assert data["row_count"] == 0
        assert "error" in data
        assert "SQL engine not available" in data["error"]

    def test_sql_with_loaded_data(self, client, log_root, monkeypatch):
        """After opening a file, SQL queries work against the tracker data."""
        client.post(
            "/api/files/open", json={"path": str(log_root / "test.log")}
        )

        mock_engine = MagicMock()
        mock_engine.query.return_value = json.dumps(
            [{"level": "ERROR", "count": 2}, {"level": "INFO", "count": 4}]
        )

        monkeypatch.setattr(_app, "HAS_SQL_ENGINE", True)
        monkeypatch.setattr(_app, "SqlEngine", lambda: mock_engine)

        response = client.post(
            "/api/sql",
            json={"query": "SELECT level, COUNT(*) as count FROM logs GROUP BY level"},
        )
        assert response.status_code == 200
        data = response.json()

        assert data["row_count"] == 2
        assert data["columns"] == ["level", "count"]
        assert data["rows"][0]["level"] == "ERROR"
        assert data["rows"][0]["count"] == 2

    def test_sql_query_error(self, client, log_root, monkeypatch):
        """SQL syntax errors return error in response body, not 500."""
        client.post(
            "/api/files/open", json={"path": str(log_root / "test.log")}
        )

        mock_engine = MagicMock()
        mock_engine.query.side_effect = Exception("syntax error near 'SELEKT'")

        monkeypatch.setattr(_app, "HAS_SQL_ENGINE", True)
        monkeypatch.setattr(_app, "SqlEngine", lambda: mock_engine)

        response = client.post("/api/sql", json={"query": "SELEKT * FROM logs"})
        assert response.status_code == 200
        data = response.json()

        assert data["row_count"] == 0
        assert "error" in data
        assert "syntax error" in data["error"]
