# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "httpx",
#   "psutil",
#   "apscheduler",
#   "python-dotenv",
# ]
# ///
"""
Smart Monitor Client - Collects system metrics and sends to backend.

Usage:
    uv run sm_client/__main__.py

Or from any directory:
    uv run -m sm_client
"""
import asyncio

from sm_client.app import main

if __name__ == "__main__":
    asyncio.run(main())
