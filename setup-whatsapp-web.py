#!/usr/bin/env python3
"""Helper script to bootstrap WhatsApp Web authentication inside the service container."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys


def run_setup(compose_file: str, service_name: str) -> int:
    command = [
        "docker",
        "compose",
        "-f",
        compose_file,
        "run",
        "--rm",
        service_name,
        "npm",
        "run",
        "setup",
    ]

    print("\n>> Running:", " ".join(command))
    print(">> Press Ctrl+C when the WhatsApp client reports it is ready.\n")

    try:
        completed = subprocess.run(command, check=False)
    except FileNotFoundError as exc:
        print("docker executable not found. Please install Docker and try again.")
        return getattr(exc, "errno", 1)
    return completed.returncode


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Launches the WhatsApp Web setup flow and persists the session volume.",
    )
    parser.add_argument(
        "--compose-file",
        default="docker-compose.whatsapp.yml",
        help="Path to the docker compose file (default: %(default)s)",
    )
    parser.add_argument(
        "--service-name",
        default="whatsapp-service",
        help="Compose service name to run for setup (default: %(default)s)",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    compose_file = os.path.abspath(args.compose_file)
    if not os.path.exists(compose_file):
        print(f"Compose file not found: {compose_file}")
        return 1

    return run_setup(compose_file, args.service_name)


if __name__ == "__main__":
    sys.exit(main())
