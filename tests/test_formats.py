"""Tests for format config endpoints (M1):
- GET /api/formats/config
- GET /api/formats/builtin
- POST /api/formats/test
- POST /api/formats/save

These features require logler >= 1.2.1 (HAS_FORMAT_CONFIG).
Tests mock the unavailable functions with raising=False.
"""

import re
import sys
from unittest.mock import MagicMock

_app = sys.modules["backend.app"]


def _enable_format_config(monkeypatch, **overrides):
    """Enable format config feature and set up required mock functions."""
    monkeypatch.setattr(_app, "HAS_FORMAT_CONFIG", True)
    # Create minimal mock functions that the endpoints reference
    monkeypatch.setattr(_app, "find_config", lambda d: None, raising=False)
    monkeypatch.setattr(_app, "load_config", lambda p: None, raising=False)
    monkeypatch.setattr(_app, "safe_compile", re.compile, raising=False)
    monkeypatch.setattr(
        _app, "get_builtin_formats", lambda: {}, raising=False
    )
    monkeypatch.setattr(_app, "LoglerConfig", MagicMock(), raising=False)
    for key, value in overrides.items():
        monkeypatch.setattr(_app, key, value, raising=False)


class TestFormatConfig:
    """GET /api/formats/config — read format configuration."""

    def test_config_no_file_found(self, client, monkeypatch):
        _enable_format_config(monkeypatch, find_config=lambda d: None)
        response = client.get("/api/formats/config")

        assert response.status_code == 200
        data = response.json()
        assert data["available"] is True
        assert data["config_path"] is None
        assert data["formats"] == {}

    def test_config_with_formats(self, client, log_root, monkeypatch):
        mock_fmt = MagicMock()
        mock_fmt.regex = r"(?P<timestamp>\d+) (?P<message>.*)"
        mock_fmt.timestamp_format = "%Y-%m-%d"
        mock_fmt.file_patterns = ["*.log"]

        mock_config = MagicMock()
        mock_config.formats = {"custom": mock_fmt}

        config_path = log_root / ".logler" / "formats.yaml"
        _enable_format_config(
            monkeypatch,
            find_config=lambda d: config_path,
            load_config=lambda p: mock_config,
        )

        response = client.get("/api/formats/config")
        data = response.json()

        assert data["available"] is True
        assert data["config_path"] == str(config_path)
        assert "custom" in data["formats"]
        assert data["formats"]["custom"]["regex"] == r"(?P<timestamp>\d+) (?P<message>.*)"
        assert data["formats"]["custom"]["timestamp_format"] == "%Y-%m-%d"
        assert data["formats"]["custom"]["file_patterns"] == ["*.log"]

    def test_config_load_error(self, client, log_root, monkeypatch):
        config_path = log_root / ".logler" / "formats.yaml"

        def bad_load(p):
            raise ValueError("bad yaml")

        _enable_format_config(
            monkeypatch,
            find_config=lambda d: config_path,
            load_config=bad_load,
        )

        response = client.get("/api/formats/config")
        data = response.json()

        assert data["available"] is True
        assert "error" in data
        assert "bad yaml" in data["error"]

    def test_config_not_available(self, client, monkeypatch):
        monkeypatch.setattr(_app, "HAS_FORMAT_CONFIG", False)
        response = client.get("/api/formats/config")
        data = response.json()

        assert data["available"] is False
        assert "error" in data


class TestBuiltinFormats:
    """GET /api/formats/builtin — list built-in format definitions."""

    def test_builtin_formats(self, client, monkeypatch):
        mock_fmt = MagicMock()
        mock_fmt.regex = r"(?P<message>.*)"
        mock_fmt.timestamp_format = None
        mock_fmt.file_patterns = []

        _enable_format_config(
            monkeypatch,
            get_builtin_formats=lambda: {"syslog": mock_fmt},
        )

        response = client.get("/api/formats/builtin")
        assert response.status_code == 200
        data = response.json()

        assert data["available"] is True
        assert "syslog" in data["formats"]
        assert data["formats"]["syslog"]["regex"] == r"(?P<message>.*)"

    def test_builtin_not_available(self, client, monkeypatch):
        monkeypatch.setattr(_app, "HAS_FORMAT_CONFIG", False)
        response = client.get("/api/formats/builtin")
        data = response.json()

        assert data["available"] is False
        assert data["formats"] == {}


class TestFormatTest:
    """POST /api/formats/test — test a regex against sample lines."""

    def test_regex_matches(self, client, monkeypatch):
        _enable_format_config(monkeypatch)
        response = client.post(
            "/api/formats/test",
            json={
                "regex": r"(?P<level>\w+): (?P<message>.*)",
                "sample_lines": [
                    "INFO: hello world",
                    "ERROR: something broke",
                    "plain text no match",
                ],
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["match_count"] == 2
        assert data["total_lines"] == 3
        assert data["named_groups"] == ["level", "message"]

        assert len(data["results"]) == 3
        assert data["results"][0]["matched"] is True
        assert data["results"][0]["groups"]["level"] == "INFO"
        assert data["results"][0]["groups"]["message"] == "hello world"
        assert data["results"][1]["matched"] is True
        assert data["results"][1]["groups"]["level"] == "ERROR"
        assert data["results"][2]["matched"] is False
        assert data["results"][2]["groups"] == {}

    def test_invalid_regex(self, client, monkeypatch):
        _enable_format_config(monkeypatch)
        response = client.post(
            "/api/formats/test",
            json={"regex": "[invalid", "sample_lines": ["test"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert "error" in data

    def test_regex_no_named_groups(self, client, monkeypatch):
        _enable_format_config(monkeypatch)
        response = client.post(
            "/api/formats/test",
            json={"regex": r"\d+", "sample_lines": ["123"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert "error" in data
        assert "named group" in data["error"].lower()

    def test_regex_caps_at_50_lines(self, client, monkeypatch):
        _enable_format_config(monkeypatch)
        lines = [f"INFO: line {i}" for i in range(100)]
        response = client.post(
            "/api/formats/test",
            json={"regex": r"(?P<level>\w+): (?P<msg>.*)", "sample_lines": lines},
        )
        data = response.json()
        assert data["total_lines"] == 50

    def test_format_test_not_available(self, client, monkeypatch):
        monkeypatch.setattr(_app, "HAS_FORMAT_CONFIG", False)
        response = client.post(
            "/api/formats/test",
            json={"regex": "(?P<m>.*)", "sample_lines": ["x"]},
        )
        data = response.json()
        assert "error" in data


class TestFormatSave:
    """POST /api/formats/save — write format config to .logler/formats.yaml."""

    def test_save_creates_config_file(self, client, log_root, monkeypatch):
        mock_logler_config = MagicMock()
        mock_logler_config.model_validate = MagicMock(return_value=MagicMock())
        _enable_format_config(monkeypatch, LoglerConfig=mock_logler_config)

        response = client.post(
            "/api/formats/save",
            json={
                "formats": {
                    "myformat": {
                        "regex": r"(?P<timestamp>\d{4}-\d{2}-\d{2}) (?P<message>.*)",
                        "timestamp_format": "%Y-%m-%d",
                        "file_patterns": ["*.log"],
                    }
                }
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["saved"] is True
        assert data["format_count"] == 1

        config_path = log_root / ".logler" / "formats.yaml"
        assert config_path.exists()
        content = config_path.read_text()
        assert "myformat" in content
        assert "regex" in content

    def test_save_invalid_format_returns_422(self, client, monkeypatch):
        mock_logler_config = MagicMock()
        mock_logler_config.model_validate.side_effect = ValueError("invalid")
        _enable_format_config(monkeypatch, LoglerConfig=mock_logler_config)

        response = client.post(
            "/api/formats/save",
            json={"formats": {"bad": {"regex": "[invalid"}}},
        )
        assert response.status_code == 422

    def test_save_not_available(self, client, monkeypatch):
        monkeypatch.setattr(_app, "HAS_FORMAT_CONFIG", False)
        response = client.post(
            "/api/formats/save",
            json={"formats": {}},
        )
        assert response.status_code == 501
