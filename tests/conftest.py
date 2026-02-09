"""Shared fixtures for backend API tests."""

import shutil
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# backend/__init__.py re-exports `app` which shadows the module name.
# Use sys.modules to get the actual module for monkeypatching.
__import__("backend.app")
_app_module = sys.modules["backend.app"]

EXAMPLES_DIR = Path(__file__).parent.parent / "examples"

# ---- Deterministic log fixtures with known content ----

# 10 lines: 4 INFO, 2 DEBUG, 2 WARN, 2 ERROR
DETERMINISTIC_LOG = """\
2024-01-15 10:00:00.000 [INFO] Message one
2024-01-15 10:00:01.000 [DEBUG] Message two
2024-01-15 10:00:02.000 [WARN] Message three
2024-01-15 10:00:03.000 [ERROR] Message four
2024-01-15 10:00:04.000 [INFO] Message five
2024-01-15 10:00:05.000 [DEBUG] Message six
2024-01-15 10:00:06.000 [INFO] Message seven
2024-01-15 10:00:07.000 [WARN] Message eight
2024-01-15 10:00:08.000 [ERROR] Message nine
2024-01-15 10:00:09.000 [INFO] Message ten
"""

# 3-line JSON log
DETERMINISTIC_JSON_LOG = """\
{"timestamp":"2024-01-15T10:00:00.000Z","level":"INFO","message":"JSON message one","service_name":"svc-alpha","correlation_id":"corr-001"}
{"timestamp":"2024-01-15T10:00:01.000Z","level":"ERROR","message":"JSON message two","service_name":"svc-alpha","correlation_id":"corr-001"}
{"timestamp":"2024-01-15T10:00:02.000Z","level":"INFO","message":"JSON message three","service_name":"svc-beta","correlation_id":"corr-002"}
"""

# 5-line threaded log: 3 [main], 2 [worker-1]
DETERMINISTIC_THREADED_LOG = """\
2024-01-15 10:00:00.000 [INFO] [main] Application started
2024-01-15 10:00:01.000 [DEBUG] [worker-1] Task received
2024-01-15 10:00:02.000 [INFO] [worker-1] Task completed
2024-01-15 10:00:03.000 [ERROR] [main] Unexpected shutdown
2024-01-15 10:00:04.000 [INFO] [main] Restarting
"""

DETERMINISTIC_LOG_LINES = DETERMINISTIC_LOG.strip().splitlines()
DETERMINISTIC_JSON_LINES = DETERMINISTIC_JSON_LOG.strip().splitlines()
DETERMINISTIC_THREADED_LINES = DETERMINISTIC_THREADED_LOG.strip().splitlines()


@pytest.fixture
def log_root(tmp_path):
    """Temp log root with deterministic test files.

    Contents:
        test.log          - 10 lines, standard format
        test-json.log     - 3 lines, JSON format
        test-threaded.log - 5 lines, threaded format
        not-a-log.txt     - text file (not .log)
        subdir/nested.log - same as test.log
    """
    (tmp_path / "test.log").write_text(DETERMINISTIC_LOG)
    (tmp_path / "test-json.log").write_text(DETERMINISTIC_JSON_LOG)
    (tmp_path / "test-threaded.log").write_text(DETERMINISTIC_THREADED_LOG)
    (tmp_path / "not-a-log.txt").write_text("plain text\n")

    subdir = tmp_path / "subdir"
    subdir.mkdir()
    (subdir / "nested.log").write_text(DETERMINISTIC_LOG)

    return tmp_path


@pytest.fixture
def log_root_with_examples(tmp_path):
    """Temp log root with real example files from examples/ directory."""
    for f in EXAMPLES_DIR.iterdir():
        if f.is_file():
            shutil.copy(f, tmp_path / f.name)
    return tmp_path


@pytest.fixture
def client(log_root, monkeypatch):
    """TestClient with LOG_ROOT pointed at the temp directory.

    Uses raise_server_exceptions=False so unhandled exceptions
    become 500 responses (matching production behavior).
    """
    monkeypatch.setattr(_app_module, "LOG_ROOT", log_root)
    test_app = _app_module.create_app()
    return TestClient(test_app, raise_server_exceptions=False)


@pytest.fixture
def examples_client(log_root_with_examples, monkeypatch):
    """TestClient with real example files."""
    monkeypatch.setattr(_app_module, "LOG_ROOT", log_root_with_examples)
    test_app = _app_module.create_app()
    return TestClient(test_app, raise_server_exceptions=False)
