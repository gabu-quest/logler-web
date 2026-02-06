"""
Logler Web - Web interface for log viewing with thread tracking and analysis.
"""

__version__ = "0.1.0"


def create_app():
    """Lazy import to avoid evaluating LOG_ROOT before env vars are set."""
    from .app import create_app as _create_app
    return _create_app()


def get_app():
    """Get the default app instance (lazy)."""
    from .app import app
    return app


__all__ = ["create_app", "get_app", "__version__"]
