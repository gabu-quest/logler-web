"""Security tests: path traversal, invalid inputs, malformed requests."""

import re
import sys
from unittest.mock import MagicMock

import pytest

_app = sys.modules["backend.app"]


class TestPathTraversal:
    """Verify _ensure_within_root blocks directory traversal attacks."""

    def test_browse_traversal_dotdot(self, client):
        response = client.get(
            "/api/files/browse", params={"directory": "/tmp/../etc"}
        )
        assert response.status_code == 403

    def test_browse_traversal_absolute(self, client):
        response = client.get(
            "/api/files/browse", params={"directory": "/etc/passwd"}
        )
        assert response.status_code == 403

    def test_open_file_outside_root(self, client):
        response = client.post(
            "/api/files/open", json={"path": "/etc/passwd"}
        )
        assert response.status_code == 403

    def test_open_many_outside_root(self, client):
        response = client.post(
            "/api/files/open_many",
            json={"paths": ["/etc/passwd", "/etc/shadow"]},
        )
        # Should fail on the first invalid path
        assert response.status_code == 403

    def test_search_outside_root(self, client):
        response = client.post(
            "/api/search", json={"paths": ["/etc/passwd"], "query": "root"}
        )
        assert response.status_code == 403

    def test_context_outside_root(self, client):
        response = client.post(
            "/api/context",
            json={
                "paths": ["/etc/passwd"],
                "line_number": 1,
                "file_path": "/etc/passwd",
            },
        )
        assert response.status_code == 403

    def test_glob_traversal_stripped(self, client, log_root):
        """Glob patterns with .. are sanitized."""
        response = client.get(
            "/api/files/glob", params={"pattern": "../../../etc/*.conf"}
        )
        assert response.status_code == 200
        data = response.json()
        # Pattern sanitized — no files outside root should appear
        for f in data["files"]:
            assert str(log_root) in f["path"]

    def test_format_save_outside_root(self, client, log_root, monkeypatch):
        """Format save with directory outside root falls back to LOG_ROOT."""
        monkeypatch.setattr(_app, "HAS_FORMAT_CONFIG", True)
        mock_logler_config = MagicMock()
        mock_logler_config.model_validate = MagicMock(return_value=MagicMock())
        monkeypatch.setattr(_app, "LoglerConfig", mock_logler_config, raising=False)
        monkeypatch.setattr(_app, "safe_compile", re.compile, raising=False)

        response = client.post(
            "/api/formats/save",
            json={
                "formats": {
                    "test": {
                        "regex": r"(?P<message>.*)",
                        "timestamp_format": None,
                        "file_patterns": [],
                    }
                },
                "directory": "/tmp/evil",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["saved"] is True
        # Should have saved to LOG_ROOT, not /tmp/evil
        assert str(log_root) in data["config_path"]


class TestMalformedRequests:
    """Verify the API handles malformed input gracefully."""

    def test_open_missing_path(self, client):
        response = client.post("/api/files/open", json={})
        assert response.status_code == 422

    def test_open_many_empty_paths(self, client):
        response = client.post("/api/files/open_many", json={"paths": []})
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["entries"] == []

    def test_search_missing_paths(self, client):
        response = client.post("/api/search", json={})
        assert response.status_code == 422

    def test_hierarchy_missing_root_identifier(self, client, log_root):
        response = client.post(
            "/api/hierarchy",
            json={"paths": [str(log_root / "test.log")]},
        )
        assert response.status_code == 422

    def test_sql_missing_query(self, client):
        response = client.post("/api/sql", json={})
        assert response.status_code == 422

    def test_context_missing_fields(self, client):
        response = client.post("/api/context", json={"paths": []})
        assert response.status_code == 422

    def test_format_test_missing_regex(self, client):
        response = client.post(
            "/api/formats/test", json={"sample_lines": ["test"]}
        )
        assert response.status_code == 422

    def test_metrics_missing_paths(self, client):
        response = client.post("/api/metrics/extract", json={})
        assert response.status_code == 422

    def test_events_missing_paths(self, client):
        response = client.post("/api/events/correlate", json={})
        assert response.status_code == 422


class TestEdgeCases:
    """Edge cases and boundary conditions."""

    def test_open_empty_file(self, client, log_root):
        (log_root / "empty.log").write_text("")
        response = client.post(
            "/api/files/open", json={"path": str(log_root / "empty.log")}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["entries"] == []
        assert data["partial"] is False

    def test_open_single_line_file(self, client, log_root):
        (log_root / "single.log").write_text(
            "2024-01-15 10:00:00.000 [INFO] Only line\n"
        )
        response = client.post(
            "/api/files/open", json={"path": str(log_root / "single.log")}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["entries"]) == 1
        assert data["entries"][0]["raw"] == "2024-01-15 10:00:00.000 [INFO] Only line"

    def test_browse_empty_directory(self, client, log_root):
        (log_root / "empty_dir").mkdir()
        response = client.get(
            "/api/files/browse",
            params={"directory": str(log_root / "empty_dir")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["files"] == []
        assert data["directories"] == []

    def test_filter_combined_level_and_search(self, client, log_root):
        """Level filter + search filter applied together."""
        response = client.post(
            "/api/files/filter",
            json={
                "paths": [str(log_root / "test.log")],
                "filters": {"levels": ["INFO"], "search": "message one"},
            },
        )
        data = response.json()
        assert len(data["entries"]) == 1
        assert data["entries"][0]["level"] == "INFO"
