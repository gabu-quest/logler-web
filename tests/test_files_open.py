"""Tests for file open endpoints: POST /api/files/open, open_many, filter."""

from collections import Counter

from .conftest import DETERMINISTIC_LOG_LINES, DETERMINISTIC_JSON_LINES


class TestOpenFile:
    """POST /api/files/open — open a single log file."""

    def test_open_returns_all_entries(self, client, log_root):
        response = client.post(
            "/api/files/open", json={"path": str(log_root / "test.log")}
        )
        assert response.status_code == 200
        data = response.json()

        assert data["file_path"] == str(log_root / "test.log")
        assert data["total"] == 10
        assert data["partial"] is False
        assert len(data["entries"]) == 10

    def test_open_entry_levels(self, client, log_root):
        """4 INFO, 2 DEBUG, 2 WARN, 2 ERROR."""
        response = client.post(
            "/api/files/open", json={"path": str(log_root / "test.log")}
        )
        data = response.json()
        levels = Counter(e["level"] for e in data["entries"])

        assert levels["INFO"] == 4
        assert levels["DEBUG"] == 2
        assert levels["WARN"] == 2
        assert levels["ERROR"] == 2

    def test_open_line_numbers_sequential(self, client, log_root):
        response = client.post(
            "/api/files/open", json={"path": str(log_root / "test.log")}
        )
        data = response.json()
        line_numbers = [e["line_number"] for e in data["entries"]]

        assert line_numbers == list(range(1, 11))

    def test_open_raw_matches_original_lines(self, client, log_root):
        response = client.post(
            "/api/files/open", json={"path": str(log_root / "test.log")}
        )
        data = response.json()

        for i, entry in enumerate(data["entries"]):
            assert entry["raw"] == DETERMINISTIC_LOG_LINES[i]

    def test_open_timestamps_parsed(self, client, log_root):
        """All entries in the deterministic log have parseable timestamps."""
        response = client.post(
            "/api/files/open", json={"path": str(log_root / "test.log")}
        )
        data = response.json()

        for entry in data["entries"]:
            assert entry["timestamp"] is not None
            assert "2024-01-15" in entry["timestamp"]

    def test_open_quick_mode_tails(self, client, log_root):
        """Quick mode with limit=5 returns last 5 entries from 10-line file."""
        response = client.post(
            "/api/files/open",
            json={"path": str(log_root / "test.log"), "quick": True, "limit": 5},
        )
        data = response.json()

        assert data["total"] == 10
        assert data["partial"] is True
        assert len(data["entries"]) == 5

        # Last 5 lines are lines 6-10
        assert data["entries"][0]["raw"] == DETERMINISTIC_LOG_LINES[5]
        assert data["entries"][4]["raw"] == DETERMINISTIC_LOG_LINES[9]

    def test_open_quick_false_returns_all(self, client, log_root):
        response = client.post(
            "/api/files/open",
            json={"path": str(log_root / "test.log"), "quick": False},
        )
        data = response.json()

        assert data["total"] == 10
        assert data["partial"] is False
        assert len(data["entries"]) == 10

    def test_open_with_level_filter(self, client, log_root):
        response = client.post(
            "/api/files/open",
            json={
                "path": str(log_root / "test.log"),
                "filters": {"levels": ["ERROR"]},
            },
        )
        data = response.json()

        assert len(data["entries"]) == 2
        assert all(e["level"] == "ERROR" for e in data["entries"])

    def test_open_with_search_filter(self, client, log_root):
        response = client.post(
            "/api/files/open",
            json={
                "path": str(log_root / "test.log"),
                "filters": {"search": "message one"},
            },
        )
        data = response.json()

        assert len(data["entries"]) == 1
        assert "Message one" in data["entries"][0]["raw"]

    def test_open_json_log(self, client, log_root):
        response = client.post(
            "/api/files/open", json={"path": str(log_root / "test-json.log")}
        )
        assert response.status_code == 200
        data = response.json()

        assert data["total"] == 3
        assert len(data["entries"]) == 3

        for i, entry in enumerate(data["entries"]):
            assert entry["raw"] == DETERMINISTIC_JSON_LINES[i]

    def test_open_nonexistent_file(self, client, log_root):
        response = client.post(
            "/api/files/open",
            json={"path": str(log_root / "nonexistent.log")},
        )
        assert response.status_code == 500


class TestOpenManyFiles:
    """POST /api/files/open_many — open multiple files interleaved."""

    def test_open_many_merges_entries(self, client, log_root):
        paths = [
            str(log_root / "test.log"),
            str(log_root / "test-json.log"),
        ]
        response = client.post("/api/files/open_many", json={"paths": paths})
        assert response.status_code == 200
        data = response.json()

        assert data["files"] == paths
        assert data["total"] == 13  # 10 + 3
        assert len(data["entries"]) == 13

    def test_open_many_file_counts(self, client, log_root):
        paths = [
            str(log_root / "test.log"),
            str(log_root / "test-json.log"),
        ]
        response = client.post("/api/files/open_many", json={"paths": paths})
        data = response.json()

        assert data["file_counts"][str(log_root / "test.log")] == 10
        assert data["file_counts"][str(log_root / "test-json.log")] == 3

    def test_open_many_file_meta(self, client, log_root):
        paths = [
            str(log_root / "test.log"),
            str(log_root / "test-json.log"),
        ]
        response = client.post("/api/files/open_many", json={"paths": paths})
        data = response.json()

        assert len(data["file_meta"]) == 2
        meta_by_path = {m["path"]: m for m in data["file_meta"]}

        assert meta_by_path[str(log_root / "test.log")]["count"] == 10
        assert meta_by_path[str(log_root / "test-json.log")]["count"] == 3

    def test_open_many_sorted_by_timestamp(self, client, log_root):
        """Entries from multiple files are sorted by timestamp."""
        paths = [
            str(log_root / "test.log"),
            str(log_root / "test-json.log"),
        ]
        response = client.post("/api/files/open_many", json={"paths": paths})
        data = response.json()

        timestamps = [e["timestamp"] for e in data["entries"] if e["timestamp"]]
        assert timestamps == sorted(timestamps)

    def test_open_many_with_filter(self, client, log_root):
        paths = [
            str(log_root / "test.log"),
            str(log_root / "test-json.log"),
        ]
        response = client.post(
            "/api/files/open_many",
            json={"paths": paths, "filters": {"levels": ["ERROR"]}},
        )
        data = response.json()

        # 2 ERROR in test.log + 1 ERROR in test-json.log = 3
        assert len(data["entries"]) == 3
        assert all(e["level"] == "ERROR" for e in data["entries"])

    def test_open_many_with_limit(self, client, log_root):
        paths = [
            str(log_root / "test.log"),
            str(log_root / "test-json.log"),
        ]
        response = client.post(
            "/api/files/open_many", json={"paths": paths, "limit": 5}
        )
        data = response.json()

        assert len(data["entries"]) == 5
        assert data["total"] == 13


class TestFilterEntries:
    """POST /api/files/filter — filter pre-loaded entries."""

    def test_filter_by_level(self, client, log_root):
        response = client.post(
            "/api/files/filter",
            json={
                "paths": [str(log_root / "test.log")],
                "filters": {"levels": ["INFO", "ERROR"]},
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert len(data["entries"]) == 6  # 4 INFO + 2 ERROR
        levels = {e["level"] for e in data["entries"]}
        assert levels == {"INFO", "ERROR"}

    def test_filter_by_search(self, client, log_root):
        response = client.post(
            "/api/files/filter",
            json={
                "paths": [str(log_root / "test.log")],
                "filters": {"search": "message ten"},
            },
        )
        data = response.json()

        assert len(data["entries"]) == 1

    def test_filter_no_matches(self, client, log_root):
        response = client.post(
            "/api/files/filter",
            json={
                "paths": [str(log_root / "test.log")],
                "filters": {"search": "zzz_nonexistent_zzz"},
            },
        )
        data = response.json()

        assert len(data["entries"]) == 0
        assert data["total"] == 0

    def test_filter_with_limit(self, client, log_root):
        response = client.post(
            "/api/files/filter",
            json={"paths": [str(log_root / "test.log")], "limit": 3},
        )
        data = response.json()

        assert len(data["entries"]) == 3
        assert data["total"] == 10

    def test_filter_multiple_files(self, client, log_root):
        response = client.post(
            "/api/files/filter",
            json={
                "paths": [
                    str(log_root / "test.log"),
                    str(log_root / "test-threaded.log"),
                ],
            },
        )
        data = response.json()

        assert data["total"] == 15  # 10 + 5
