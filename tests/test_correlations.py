"""Tests for correlation endpoints (M2/M3):
- GET /api/correlations/config
- POST /api/correlations/run
- POST /api/events/correlate

These features require logler >= 1.2.1 (HAS_CORRELATOR, HAS_EVENT_CORRELATOR).
Tests mock the unavailable functions with raising=False.
"""

import sys
from unittest.mock import MagicMock

_app = sys.modules["backend.app"]


def _enable_correlator(monkeypatch, **overrides):
    """Enable correlator feature and set up required mock functions."""
    monkeypatch.setattr(_app, "HAS_CORRELATOR", True)
    monkeypatch.setattr(
        _app, "find_correlations_config", lambda d: None, raising=False
    )
    monkeypatch.setattr(
        _app, "load_correlations_config", lambda p: None, raising=False
    )
    monkeypatch.setattr(
        _app,
        "correlate_by_rules",
        lambda entries, config, group_name=None: {"clusters": []},
        raising=False,
    )
    for key, value in overrides.items():
        monkeypatch.setattr(_app, key, value, raising=False)


def _enable_event_correlator(monkeypatch, **overrides):
    """Enable event correlator feature."""
    monkeypatch.setattr(_app, "HAS_EVENT_CORRELATOR", True)
    monkeypatch.setattr(
        _app, "event_correlate", lambda **kw: {"clusters": []}, raising=False
    )
    for key, value in overrides.items():
        monkeypatch.setattr(_app, key, value, raising=False)


class TestCorrelationsConfig:
    """GET /api/correlations/config — read correlation configuration."""

    def test_config_no_file(self, client, monkeypatch):
        _enable_correlator(monkeypatch, find_correlations_config=lambda d: None)

        response = client.get("/api/correlations/config")
        assert response.status_code == 200
        data = response.json()

        assert data["available"] is True
        assert data["config_path"] is None
        assert data["groups"] == {}

    def test_config_with_field_match_rule(self, client, log_root, monkeypatch):
        mock_source = MagicMock()
        mock_source.field = "request_id"
        mock_source.file_pattern = "*.log"
        mock_target = MagicMock()
        mock_target.field = "req_id"
        mock_target.file_pattern = "*.log"

        mock_rule = MagicMock()
        mock_rule.type = "field_match"
        mock_rule.source = mock_source
        mock_rule.target = mock_target

        mock_group = MagicMock()
        mock_group.description = "Match by request ID"
        mock_group.rules = [mock_rule]

        mock_config = MagicMock()
        mock_config.correlations = {"req_id_match": mock_group}

        config_path = log_root / ".logler" / "correlations.yaml"
        _enable_correlator(
            monkeypatch,
            find_correlations_config=lambda d: config_path,
            load_correlations_config=lambda p: mock_config,
        )

        response = client.get("/api/correlations/config")
        data = response.json()

        assert data["available"] is True
        assert "req_id_match" in data["groups"]
        group = data["groups"]["req_id_match"]
        assert group["description"] == "Match by request ID"
        assert group["rule_count"] == 1
        assert group["rules"][0]["type"] == "field_match"
        assert group["rules"][0]["source_field"] == "request_id"
        assert group["rules"][0]["target_field"] == "req_id"

    def test_config_not_available(self, client, monkeypatch):
        monkeypatch.setattr(_app, "HAS_CORRELATOR", False)

        response = client.get("/api/correlations/config")
        data = response.json()
        assert data["available"] is False

    def test_config_load_error(self, client, log_root, monkeypatch):
        config_path = log_root / ".logler" / "correlations.yaml"

        def bad_load(p):
            raise ValueError("parse error")

        _enable_correlator(
            monkeypatch,
            find_correlations_config=lambda d: config_path,
            load_correlations_config=bad_load,
        )

        response = client.get("/api/correlations/config")
        data = response.json()
        assert "error" in data
        assert "parse error" in data["error"]


class TestCorrelationsRun:
    """POST /api/correlations/run — execute correlation rules."""

    def test_run_returns_clusters(self, client, log_root, monkeypatch):
        mock_corr_result = {
            "clusters": [
                {
                    "virtual_trace_id": "vtrace-001",
                    "group": "test",
                    "entries": [
                        {
                            "file": str(log_root / "test.log"),
                            "line_number": 1,
                            "level": "INFO",
                            "timestamp": "2024-01-15T10:00:00",
                            "message": "hello",
                        }
                    ],
                }
            ],
            "total_clusters": 1,
            "total_entries_correlated": 1,
            "groups_applied": ["test"],
        }
        mock_config = MagicMock()
        mock_config.correlations = {"test": MagicMock()}

        config_path = log_root / ".logler" / "correlations.yaml"
        _enable_correlator(
            monkeypatch,
            find_correlations_config=lambda d: config_path,
            load_correlations_config=lambda p: mock_config,
            correlate_by_rules=lambda entries, config, group_name=None: mock_corr_result,
            logler_search=lambda **kw: {
                "results": [{"entry": {"line_number": 1, "message": "test"}}]
            },
        )

        path = str(log_root / "test.log")
        response = client.post("/api/correlations/run", json={"paths": [path]})
        assert response.status_code == 200
        data = response.json()

        assert data["total_clusters"] == 1
        assert data["files_searched"] == 1
        assert len(data["clusters"]) == 1
        assert len(data["clusters"][0]["entries"]) == 1

    def test_run_no_config_found(self, client, log_root, monkeypatch):
        _enable_correlator(monkeypatch, find_correlations_config=lambda d: None)

        path = str(log_root / "test.log")
        response = client.post("/api/correlations/run", json={"paths": [path]})
        data = response.json()
        assert "error" in data
        assert "No .logler/correlations.yaml found" in data["error"]

    def test_run_not_available(self, client, monkeypatch, log_root):
        monkeypatch.setattr(_app, "HAS_CORRELATOR", False)

        path = str(log_root / "test.log")
        response = client.post("/api/correlations/run", json={"paths": [path]})
        data = response.json()
        assert "error" in data


class TestEventCorrelate:
    """POST /api/events/correlate — ad-hoc cross-file event correlation."""

    def test_correlate_by_timestamp(self, client, log_root, monkeypatch):
        mock_result = {
            "clusters": [
                {
                    "virtual_trace_id": "evt-001",
                    "rule_type": "event_window",
                    "anchor_timestamp": "2024-01-15T10:00:03",
                    "window": "5s",
                    "entry_count": 2,
                    "entries": [
                        {
                            "file": "test.log",
                            "line_number": 3,
                            "level": "ERROR",
                            "timestamp": "2024-01-15T10:00:03",
                            "message": "Error occurred",
                        },
                        {
                            "file": "test.log",
                            "line_number": 4,
                            "level": "WARN",
                            "timestamp": "2024-01-15T10:00:04",
                            "message": "Warning",
                        },
                    ],
                }
            ],
            "total_clusters": 1,
            "total_entries_correlated": 2,
        }
        _enable_event_correlator(
            monkeypatch, event_correlate=lambda **kw: mock_result
        )

        path = str(log_root / "test.log")
        response = client.post(
            "/api/events/correlate",
            json={
                "paths": [path],
                "anchor_timestamp": "2024-01-15T10:00:03",
                "window": "5s",
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["total_clusters"] == 1
        cluster = data["clusters"][0]
        assert cluster["entry_count"] == 2
        assert len(cluster["entries"]) == 2

    def test_correlate_by_trigger(self, client, log_root, monkeypatch):
        mock_result = {
            "clusters": [],
            "total_clusters": 0,
            "total_entries_correlated": 0,
        }
        _enable_event_correlator(
            monkeypatch, event_correlate=lambda **kw: mock_result
        )

        path = str(log_root / "test.log")
        response = client.post(
            "/api/events/correlate",
            json={
                "paths": [path],
                "trigger_level": "ERROR",
                "trigger_pattern": "timeout",
            },
        )
        assert response.status_code == 200

    def test_correlate_not_available(self, client, log_root, monkeypatch):
        monkeypatch.setattr(_app, "HAS_EVENT_CORRELATOR", False)

        path = str(log_root / "test.log")
        response = client.post(
            "/api/events/correlate", json={"paths": [path]}
        )
        data = response.json()
        assert "error" in data

    def test_correlate_failure_returns_error(self, client, log_root, monkeypatch):
        def explode(**kw):
            raise RuntimeError("correlation engine crashed")

        _enable_event_correlator(monkeypatch, event_correlate=explode)

        path = str(log_root / "test.log")
        response = client.post(
            "/api/events/correlate",
            json={"paths": [path], "anchor_timestamp": "2024-01-15T10:00:00"},
        )
        data = response.json()
        assert "error" in data
        assert "correlation engine crashed" in data["error"]
