"""
Command-line interface for logler-web.
"""

import argparse
import os
import sys
from pathlib import Path


def find_dist_dir() -> Path:
    """Find the frontend dist directory."""
    # Check common locations
    candidates = [
        # Development: dist in project root
        Path(__file__).parent.parent.parent / "dist",
        # Installed: in share directory
        Path(sys.prefix) / "share" / "logler-web" / "dist",
        # User install
        Path.home() / ".local" / "share" / "logler-web" / "dist",
    ]
    
    for candidate in candidates:
        if candidate.exists() and (candidate / "index.html").exists():
            return candidate
    
    return candidates[0]  # Default to development location


def main():
    """Run the logler-web server."""
    parser = argparse.ArgumentParser(
        description="Logler Web - Web interface for log viewing"
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Host to bind to (default: 127.0.0.1)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to bind to (default: 8000)",
    )
    parser.add_argument(
        "--root",
        type=str,
        default=".",
        help="Root directory for log files (default: current directory)",
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload for development",
    )
    
    args = parser.parse_args()
    
    # Set environment variables
    os.environ["LOGLER_ROOT"] = str(Path(args.root).expanduser().resolve())
    
    # Find dist directory
    dist_dir = find_dist_dir()
    os.environ["LOGLER_WEB_DIST"] = str(dist_dir)
    
    if not dist_dir.exists():
        print(f"Warning: Frontend dist not found at {dist_dir}", file=sys.stderr)
        print("Run 'pnpm build' to build the frontend first.", file=sys.stderr)
    
    # Import uvicorn here to avoid import errors if not installed
    try:
        import uvicorn
    except ImportError:
        print("Error: uvicorn not installed. Install with: pip install uvicorn[standard]", file=sys.stderr)
        sys.exit(1)
    
    print(f"Starting logler-web on http://{args.host}:{args.port}")
    print(f"Log root: {os.environ['LOGLER_ROOT']}")
    print(f"Frontend: {dist_dir}")
    
    uvicorn.run(
        "logler_web:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )


if __name__ == "__main__":
    main()
