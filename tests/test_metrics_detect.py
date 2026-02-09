"""Tests for metrics and format detection endpoints (M5/M6):
- POST /api/metrics/extract
- POST /api/formats/detect

These features require logler >= 1.2.1 (HAS_METRICS, HAS_FORMAT_DETECTOR).
Tests mock the unavailable functions with raising=False.
"""

import sys

_app = sys.modules["backend.app"]


def _enable_metrics(monkeypatch, **overrides):
    """Enable metrics feature and set up required mock functions."""
    monkeypatch.setattr(_app, "HAS_METRICS", True)
    monkeypatch.setattr(
        _app,
        "logler_extract_metrics",
        lambda **kw: {"fields": {}, "entries_scanned": 0, "files_searched": 0},
        raising=False,
    )
    for key, value in overrides.items():
        monkeypatch.setattr(_app, key, value, raising=False)


def _enable_format_detector(monkeypatch, **overrides):
    """Enable format detector feature."""
    monkeypatch.setattr(_app, "HAS_FORMAT_DETECTOR", True)
    monkeypatch.setattr(
        _app,
        "logler_detect_formats",
        lambda **kw: {"files": {}},
        raising=False,
    )
    for key, value in overrides.items():
        monkeypatch.setattr(_app, key, value, raising=False)


class TestMetricsExtract:
    """POST /api/metrics/extract — numeric value extraction with stats."""

    def test_extract_proxies_to_logler(self, client, log_root, monkeypatch):
        mock_result = {
            "fields": {
                "response_time_ms": {
                    "count": 10,
                    "stats": {
                        "min": 5.0,
                        "max": 500.0,
                        "mean": 100.0,
                        "median": 80.0,
                        "stddev": 50.0,
                        "p95": 400.0,
                        "p99": 490.0,
                    },
                    "anomalies": [],
                    "buckets": [],
                }
            },
            "entries_scanned": 100,
            "files_searched": 1,
        }
        _enable_metrics(monkeypatch, logler_extract_metrics=lambda **kw: mock_result)

        path = str(log_root / "test.log")
        response = client.post(
            "/api/metrics/extract",
            json={
                "paths": [path],
                "fields": ["response_time_ms"],
                "bucket_size": "10s",
                "anomaly_threshold": 3.0,
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["entries_scanned"] == 100
        assert data["files_searched"] == 1
        assert "response_time_ms" in data["fields"]
        stats = data["fields"]["response_time_ms"]["stats"]
        assert stats["min"] == 5.0
        assert stats["max"] == 500.0
        assert stats["p95"] == 400.0

    def test_extract_minimal_request(self, client, log_root, monkeypatch):
        _enable_metrics(monkeypatch)

        path = str(log_root / "test.log")
        response = client.post(
            "/api/metrics/extract", json={"paths": [path]}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["fields"] == {}

    def test_extract_not_available(self, client, log_root, monkeypatch):
        monkeypatch.setattr(_app, "HAS_METRICS", False)

        path = str(log_root / "test.log")
        response = client.post(
            "/api/metrics/extract", json={"paths": [path]}
        )
        data = response.json()
        assert "error" in data

    def test_extract_failure_returns_error(self, client, log_root, monkeypatch):
        def explode(**kw):
            raise RuntimeError("metrics boom")

        _enable_metrics(monkeypatch, logler_extract_metrics=explode)

        path = str(log_root / "test.log")
        response = client.post(
            "/api/metrics/extract", json={"paths": [path]}
        )
        data = response.json()
        assert "error" in data
        assert "metrics boom" in data["error"]


class TestFormatDetect:
    """POST /api/formats/detect — auto-detect log format with confidence."""

    def test_detect_proxies_to_logler(self, client, log_root, monkeypatch):
        mock_result = {
            "files": {
                "test.log": {
                    "format": "standard",
                    "confidence": 0.95,
                    "sample_size": 10,
                    "match_rate": 1.0,
                    "alternatives": [],
                    "detected_fields": ["timestamp", "level", "message"],
                    "sample_lines": [],
                    "mixed": False,
                }
            }
        }
        _enable_format_detector(
            monkeypatch, logler_detect_formats=lambda **kw: mock_result
        )

        path = str(log_root / "test.log")
        response = client.post(
            "/api/formats/detect",
            json={"paths": [path], "sample_size": 20},
        )
        assert response.status_code == 200
        data = response.json()

        assert "test.log" in data["files"]
        detection = data["files"]["test.log"]
        assert detection["format"] == "standard"
        assert detection["confidence"] == 0.95
        assert detection["match_rate"] == 1.0

    def test_detect_not_available(self, client, log_root, monkeypatch):
        monkeypatch.setattr(_app, "HAS_FORMAT_DETECTOR", False)

        path = str(log_root / "test.log")
        response = client.post(
            "/api/formats/detect", json={"paths": [path]}
        )
        data = response.json()
        assert "error" in data

    def test_detect_failure_returns_error(self, client, log_root, monkeypatch):
        def explode(**kw):
            raise RuntimeError("detect crash")

        _enable_format_detector(monkeypatch, logler_detect_formats=explode)

        path = str(log_root / "test.log")
        response = client.post(
            "/api/formats/detect", json={"paths": [path]}
        )
        data = response.json()
        assert "error" in data
        assert "detect crash" in data["error"]
