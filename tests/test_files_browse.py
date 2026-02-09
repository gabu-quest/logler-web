"""Tests for file browsing endpoints: GET /api/files/browse, GET /api/files/glob."""


class TestBrowseFiles:
    """GET /api/files/browse — directory listing scoped to LOG_ROOT."""

    def test_browse_root_lists_files_and_directories(self, client, log_root):
        response = client.get("/api/files/browse")
        assert response.status_code == 200
        data = response.json()

        assert data["current_dir"] == str(log_root)
        assert data["parent_dir"] is None
        assert data["log_root"] == str(log_root)

        file_names = sorted(f["name"] for f in data["files"])
        assert file_names == ["not-a-log.txt", "test-json.log", "test-threaded.log", "test.log"]

        dir_names = [d["name"] for d in data["directories"]]
        assert dir_names == ["subdir"]

    def test_browse_root_file_metadata(self, client, log_root):
        response = client.get("/api/files/browse")
        data = response.json()

        log_file = next(f for f in data["files"] if f["name"] == "test.log")
        assert log_file["path"] == str(log_root / "test.log")
        assert log_file["size"] == len(
            (log_root / "test.log").read_text()
        )
        assert log_file["is_log"] is True

        txt_file = next(f for f in data["files"] if f["name"] == "not-a-log.txt")
        assert txt_file["is_log"] is True  # .txt is in the allowed list

    def test_browse_subdirectory(self, client, log_root):
        subdir = str(log_root / "subdir")
        response = client.get("/api/files/browse", params={"directory": subdir})
        assert response.status_code == 200
        data = response.json()

        assert data["current_dir"] == subdir
        assert data["parent_dir"] == str(log_root)

        file_names = [f["name"] for f in data["files"]]
        assert file_names == ["nested.log"]
        assert data["directories"] == []

    def test_browse_outside_root_returns_403(self, client):
        response = client.get("/api/files/browse", params={"directory": "/tmp"})
        assert response.status_code == 403

    def test_browse_hidden_dirs_excluded(self, client, log_root):
        """Directories starting with . are excluded from listing."""
        (log_root / ".hidden").mkdir()
        (log_root / ".hidden" / "secret.log").write_text("secret\n")

        response = client.get("/api/files/browse")
        data = response.json()

        dir_names = [d["name"] for d in data["directories"]]
        assert ".hidden" not in dir_names


class TestGlobFiles:
    """GET /api/files/glob — file search by glob pattern."""

    def test_glob_star_log(self, client, log_root):
        response = client.get("/api/files/glob", params={"pattern": "*.log"})
        assert response.status_code == 200
        data = response.json()

        assert data["pattern"] == "*.log"
        assert data["count"] == 3
        assert data["truncated"] is False

        file_names = sorted(f["name"] for f in data["files"])
        assert file_names == ["test-json.log", "test-threaded.log", "test.log"]

    def test_glob_recursive(self, client, log_root):
        response = client.get("/api/files/glob", params={"pattern": "**/*.log"})
        assert response.status_code == 200
        data = response.json()

        assert data["count"] == 4
        file_names = sorted(f["name"] for f in data["files"])
        assert file_names == ["nested.log", "test-json.log", "test-threaded.log", "test.log"]

    def test_glob_with_limit_truncates(self, client, log_root):
        response = client.get("/api/files/glob", params={"pattern": "**/*.log", "limit": 2})
        assert response.status_code == 200
        data = response.json()

        assert data["count"] == 2
        assert data["truncated"] is True

    def test_glob_no_matches(self, client):
        response = client.get("/api/files/glob", params={"pattern": "*.xyz"})
        assert response.status_code == 200
        data = response.json()

        assert data["count"] == 0
        assert data["files"] == []
        assert data["truncated"] is False

    def test_glob_empty_pattern(self, client):
        response = client.get("/api/files/glob", params={"pattern": ""})
        assert response.status_code == 200
        data = response.json()

        assert data["count"] == 0
        assert data["files"] == []

    def test_glob_file_metadata(self, client, log_root):
        response = client.get("/api/files/glob", params={"pattern": "test.log"})
        data = response.json()

        assert data["count"] == 1
        f = data["files"][0]
        assert f["name"] == "test.log"
        assert f["path"] == str(log_root / "test.log")
        assert f["is_log"] is True
        assert f["size"] > 0
        assert "modified" in f
