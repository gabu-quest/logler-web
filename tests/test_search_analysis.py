"""Tests for analysis endpoints that delegate to logler.investigate.

Mocks the logler.investigate functions to verify the API layer:
- POST /api/search
- POST /api/patterns
- POST /api/metadata
- POST /api/hierarchy
- POST /api/context
- POST /api/thread/follow
- POST /api/ids/extract
- POST /api/threads/compare
- POST /api/timeline/cross-service
- POST /api/sample
"""

import sys
from unittest.mock import patch

# backend/__init__.py shadows the module with the FastAPI instance.
_app = sys.modules["backend.app"]


class TestSearch:
    """POST /api/search — Rust-powered log search."""

    def test_search_proxies_to_logler(self, client, log_root):
        mock_result = {
            "results": [
                {"line_number": 1, "level": "ERROR", "message": "fail"},
            ],
            "total": 1,
        }
        path = str(log_root / "test.log")

        with patch.object(_app, "logler_search", return_value=mock_result) as mock:
            response = client.post(
                "/api/search",
                json={"paths": [path], "query": "fail", "level": "ERROR", "limit": 10},
            )

        assert response.status_code == 200
        assert response.json() == mock_result

        call_kwargs = mock.call_args[1]
        assert call_kwargs["files"] == [path]
        assert call_kwargs["query"] == "fail"
        assert call_kwargs["level"] == "ERROR"
        assert call_kwargs["limit"] == 10

    def test_search_minimal_request(self, client, log_root):
        path = str(log_root / "test.log")
        with patch.object(_app, "logler_search", return_value={"results": []}) as mock:
            response = client.post("/api/search", json={"paths": [path]})

        assert response.status_code == 200
        call_kwargs = mock.call_args[1]
        assert call_kwargs["files"] == [path]
        assert "query" not in call_kwargs
        assert "level" not in call_kwargs

    def test_search_validates_paths_within_root(self, client, log_root):
        """Paths outside LOG_ROOT are rejected."""
        response = client.post(
            "/api/search", json={"paths": ["/etc/passwd"], "query": "root"}
        )
        assert response.status_code == 403


class TestPatterns:
    """POST /api/patterns — detect repeated log patterns."""

    def test_patterns_proxies_to_logler(self, client, log_root):
        mock_result = {
            "patterns": [
                {"pattern": "Request * completed", "count": 5},
            ]
        }
        path = str(log_root / "test.log")

        with patch.object(_app, "find_patterns", return_value=mock_result) as mock:
            response = client.post(
                "/api/patterns", json={"paths": [path], "min_occurrences": 3}
            )

        assert response.status_code == 200
        assert response.json() == mock_result
        mock.assert_called_once_with([path], min_occurrences=3)


class TestMetadata:
    """POST /api/metadata — file metadata and stats."""

    def test_metadata_proxies_to_logler(self, client, log_root):
        mock_result = {
            "files": [{"path": "test.log", "line_count": 10, "size_bytes": 500}]
        }
        path = str(log_root / "test.log")

        with patch.object(_app, "get_metadata", return_value=mock_result) as mock:
            response = client.post("/api/metadata", json={"paths": [path]})

        assert response.status_code == 200
        assert response.json() == mock_result
        mock.assert_called_once_with([path])


class TestHierarchy:
    """POST /api/hierarchy — build thread/span hierarchy."""

    def test_hierarchy_proxies_to_logler(self, client, log_root):
        mock_hierarchy = {
            "id": "main",
            "label": "main",
            "children": [],
            "entry_count": 5,
            "error_count": 1,
        }
        mock_error_analysis = {
            "root_cause": "timeout",
            "error_chain": ["timeout"],
            "recommendations": ["increase timeout"],
            "impact_summary": "1 error",
        }
        path = str(log_root / "test.log")

        with (
            patch.object(
                _app, "follow_thread_hierarchy", return_value=mock_hierarchy
            ) as mock_h,
            patch.object(
                _app, "analyze_error_flow", return_value=mock_error_analysis
            ),
        ):
            response = client.post(
                "/api/hierarchy",
                json={
                    "paths": [path],
                    "root_identifier": "main",
                    "max_depth": 5,
                    "min_confidence": 0.5,
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["hierarchy"] == mock_hierarchy
        assert data["error_analysis"] == mock_error_analysis

        mock_h.assert_called_once_with(
            [path],
            "main",
            max_depth=5,
            min_confidence=0.5,
            use_naming_patterns=True,
            use_temporal_inference=True,
        )

    def test_hierarchy_null_when_empty(self, client, log_root):
        path = str(log_root / "test.log")

        with patch.object(_app, "follow_thread_hierarchy", return_value=None):
            response = client.post(
                "/api/hierarchy",
                json={"paths": [path], "root_identifier": "nonexistent"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["hierarchy"] is None
        assert data["error_analysis"] is None


class TestContext:
    """POST /api/context — surrounding context for a log entry."""

    def test_context_proxies_to_logler(self, client, log_root):
        mock_result = {
            "entries": [
                {"line_number": 4, "level": "DEBUG", "message": "before"},
                {"line_number": 5, "level": "ERROR", "message": "target", "is_target": True},
                {"line_number": 6, "level": "INFO", "message": "after"},
            ],
            "target_line": 5,
            "file_path": "test.log",
        }
        path = str(log_root / "test.log")

        with patch.object(_app, "get_context", return_value=mock_result) as mock:
            response = client.post(
                "/api/context",
                json={
                    "paths": [path],
                    "line_number": 5,
                    "file_path": path,
                    "before": 3,
                    "after": 3,
                },
            )

        assert response.status_code == 200
        assert response.json() == mock_result
        mock.assert_called_once_with(
            files=[path],
            line_number=5,
            file_path=path,
            before=3,
            after=3,
        )


class TestFollowThread:
    """POST /api/thread/follow — get all entries for a thread."""

    def test_follow_thread_proxies_to_logler(self, client, log_root):
        mock_result = {
            "identifier": "worker-1",
            "identifier_type": "thread_id",
            "entries": [],
            "duration_ms": 100,
        }
        path = str(log_root / "test.log")

        with patch.object(_app, "follow_thread", return_value=mock_result) as mock:
            response = client.post(
                "/api/thread/follow",
                json={
                    "paths": [path],
                    "identifier": "worker-1",
                    "identifier_type": "thread_id",
                },
            )

        assert response.status_code == 200
        assert response.json() == mock_result
        call_kwargs = mock.call_args[1]
        assert call_kwargs["files"] == [path]
        assert call_kwargs["identifier"] == "worker-1"
        assert call_kwargs["identifier_type"] == "thread_id"

    def test_follow_thread_without_type(self, client, log_root):
        path = str(log_root / "test.log")

        with patch.object(_app, "follow_thread", return_value={}) as mock:
            client.post(
                "/api/thread/follow",
                json={"paths": [path], "identifier": "abc"},
            )

        call_kwargs = mock.call_args[1]
        assert "identifier_type" not in call_kwargs


class TestExtractIds:
    """POST /api/ids/extract — extract unique IDs from log files."""

    def test_extract_ids_proxies_to_logler(self, client, log_root):
        mock_result = {
            "thread_ids": [{"id": "main", "count": 5}],
            "correlation_ids": [],
            "trace_ids": [],
        }
        path = str(log_root / "test.log")

        with patch.object(_app, "extract_ids", return_value=mock_result) as mock:
            response = client.post("/api/ids/extract", json={"paths": [path]})

        assert response.status_code == 200
        assert response.json() == mock_result
        mock.assert_called_once_with(files=[path])


class TestCompareThreads:
    """POST /api/threads/compare — compare two request flows."""

    def test_compare_threads_proxies_to_logler(self, client, log_root):
        mock_result = {
            "id1": "thread-a",
            "id2": "thread-b",
            "duration_diff_ms": 50,
            "entry_count_diff": 3,
        }
        path = str(log_root / "test.log")

        with patch.object(_app, "compare_threads", return_value=mock_result) as mock:
            response = client.post(
                "/api/threads/compare",
                json={"paths": [path], "id1": "thread-a", "id2": "thread-b"},
            )

        assert response.status_code == 200
        assert response.json() == mock_result
        mock.assert_called_once_with(files=[path], id1="thread-a", id2="thread-b")


class TestCrossServiceTimeline:
    """POST /api/timeline/cross-service — cross-service timeline view."""

    def test_timeline_proxies_to_logler(self, client, log_root):
        mock_result = {
            "identifier": "trace-001",
            "lanes": [],
            "total_duration_ms": 500,
        }
        path = str(log_root / "test.log")

        with patch.object(
            _app, "cross_service_timeline", return_value=mock_result
        ) as mock:
            response = client.post(
                "/api/timeline/cross-service",
                json={"paths": [path], "identifier": "trace-001"},
            )

        assert response.status_code == 200
        assert response.json() == mock_result
        call_kwargs = mock.call_args[1]
        assert call_kwargs["files"] == [path]
        assert call_kwargs["identifier"] == "trace-001"

    def test_timeline_without_identifier(self, client, log_root):
        path = str(log_root / "test.log")

        with patch.object(
            _app, "cross_service_timeline", return_value={"lanes": []}
        ) as mock:
            client.post(
                "/api/timeline/cross-service", json={"paths": [path]}
            )

        call_kwargs = mock.call_args[1]
        assert "identifier" not in call_kwargs


class TestSmartSample:
    """POST /api/sample — smart sampling of log entries."""

    def test_sample_proxies_to_logler(self, client, log_root):
        mock_result = {
            "entries": [{"line_number": 1, "message": "sampled"}],
            "strategy": "diverse",
            "original_count": 100,
            "sample_count": 10,
        }
        path = str(log_root / "test.log")

        with patch.object(_app, "smart_sample", return_value=mock_result) as mock:
            response = client.post(
                "/api/sample",
                json={"paths": [path], "strategy": "errors_focused", "sample_size": 50},
            )

        assert response.status_code == 200
        assert response.json() == mock_result
        mock.assert_called_once_with(
            files=[path], strategy="errors_focused", sample_size=50
        )
