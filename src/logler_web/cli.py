"""
Command-line interface for logler-web.
"""

import argparse
import os
import sys
import webbrowser
from pathlib import Path


def get_demo_logs_dir() -> Path:
    """Get the path to bundled demo log files."""
    return Path(__file__).parent / "demo_logs"


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
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Start with bundled demo log files and open browser",
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Don't open browser automatically (used with --demo)",
    )

    args = parser.parse_args()

    # Handle demo mode
    if args.demo:
        demo_dir = get_demo_logs_dir()
        if not demo_dir.exists():
            print(f"Error: Demo logs directory not found at {demo_dir}", file=sys.stderr)
            sys.exit(1)
        os.environ["LOGLER_ROOT"] = str(demo_dir)
        print("Demo mode: Using bundled sample log files")
        print(f"  - hadoop.log (real Hadoop logs)")
        print(f"  - openstack.log (real OpenStack logs)")
        print(f"  - linux_syslog.log (real Linux syslog)")
        print(f"  - zookeeper.log (real Zookeeper logs)")
        print(f"  - production_incident.log (demo incident scenario)")
        print(f"  - microservices_trace.log (demo distributed trace)")
    else:
        os.environ["LOGLER_ROOT"] = str(Path(args.root).expanduser().resolve())

    try:
        import uvicorn
    except ImportError:
        print("Error: uvicorn not installed.", file=sys.stderr)
        sys.exit(1)

    url = f"http://{args.host}:{args.port}"
    print(f"Starting logler-web on {url}")
    print(f"Log root: {os.environ['LOGLER_ROOT']}")

    # Open browser in demo mode (unless --no-browser)
    if args.demo and not args.no_browser:
        import threading
        def open_browser():
            import time
            time.sleep(1.5)  # Wait for server to start
            webbrowser.open(url)
        threading.Thread(target=open_browser, daemon=True).start()

    uvicorn.run(
        "logler_web.app:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )


if __name__ == "__main__":
    main()
