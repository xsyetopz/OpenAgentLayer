#!/usr/bin/env python3
import json
import os
import sys
import urllib.request
import urllib.error

sys.path.insert(0, os.path.dirname(__file__))
from _lib import read_stdin, deny, passthrough

TIMEOUT = 5


def main() -> None:
    url = os.environ.get("CCA_HTTP_HOOK_URL", "").strip()
    if not url:
        passthrough()

    data = read_stdin()
    if not data:
        passthrough()

    token = os.environ.get("CCA_HTTP_HOOK_TOKEN", "").strip()
    fail_closed = os.environ.get("CCA_HTTP_HOOK_FAIL_CLOSED", "").strip() == "1"

    body = json.dumps(data).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=body, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            if resp.status == 204:
                passthrough()
            resp_body = resp.read().decode("utf-8", errors="replace").strip()
            if not resp_body:
                passthrough()
            try:
                result = json.loads(resp_body)
                print(json.dumps(result))
                sys.exit(0)
            except json.JSONDecodeError:
                passthrough()
    except (urllib.error.URLError, urllib.error.HTTPError, OSError, TimeoutError):
        if fail_closed:
            deny("[http-hook] Enterprise DLP server unreachable and CCA_HTTP_HOOK_FAIL_CLOSED=1. Blocking action.")
        passthrough()


if __name__ == "__main__":
    main()
