#!/usr/bin/env python3
"""Cases the guard has to get right. Run: python3 .claude/hooks/guard-process.test.py"""

import json
import os
import subprocess
import sys

HOOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "guard-process.py")

BLOCKED = [
    "pkill -f next-server",
    "pkill -9 -f next-server",
    "pgrep -f vitest",
    "pgrep -af vitest",
    "pgrep --full vitest",
    "pgrep -f -- vitest",
    "/usr/bin/pkill -f vitest",
    "sudo pkill -f next",
    "sudo -u root pkill -f next",
    "bash -c 'pkill -f next'",
    'bash -lc "cd /tmp && pkill -f next"',
    "echo $(pgrep -f vitest)",
    "echo `pgrep -f vitest`",
    "pgrep -f 'next.*build'",
    "pgrep -f '[v]itest'; echo vitest",
    "pkill -f $TARGET",
    "while pgrep -f vitest; do wait; done",
    "until ! pgrep -f vitest; do wait; done",
    "for p in a b; do pkill -f vitest; done",
    "if pgrep -f vitest; then echo x; fi",
    "! pgrep -f vitest",
    "(pkill -f vitest)",
    "{ pkill -f vitest; }",
    "echo ok && pkill -f vitest",
    "exec pkill -f next",
    "setsid pkill -f next",
    "watch pgrep -f next",
    "eval 'pkill -f next'",
    "ssh host pkill -f next",
    "docker exec c pkill -f next",
    'echo "$(pgrep -f vitest)"',
    "cat <<EOF\n$(pkill -f next)\nEOF",
]

ALLOWED = [
    "pgrep -f '[v]itest'",
    "pkill -f '[n]ext-server'",
    "pgrep -af '[n]ext-build|[v]itest'",
    "while pgrep -f '[v]itest' >/dev/null; do wait; done",
    "pgrep node",
    "pkill -x node",
    "pkill -TERM node",
    "pgrep -u jj node",
    "kill 1234",
    'grep -rn "pkill -f next" docs/',
    'git commit -m "stop using pkill -f next"',
    "git commit -F - <<'EOF'\npkill -f next\nEOF",
    "pgrep -fu jj '[v]itest'",
    "git commit -m 'docs: block `pkill -f next` in agents'",
    "gh pr create --body 'Blocks `pkill -f next`'",
    "echo 'use $(pkill -f x) here'",
    "git commit -F - <<EOF\npkill -f next is blocked\nEOF",
    "docker ps",
    "ssh host uptime",
    "pnpm test",
]


def exit_code(command):
    payload = json.dumps({"tool_input": {"command": command}})
    return subprocess.run([sys.executable, HOOK], input=payload, capture_output=True, text=True).returncode


def main():
    cases = [(command, 2) for command in BLOCKED] + [(command, 0) for command in ALLOWED]
    wrong = [(command, want) for command, want in cases if exit_code(command) != want]
    for command, want in wrong:
        print(f"expected exit {want}: {command!r}")
    bad_input = subprocess.run([sys.executable, HOOK], input="not json", capture_output=True, text=True)
    if bad_input.returncode != 0:
        wrong.append(("not json", 0))
        print("unreadable input must not block")
    print(f"{len(cases) + 1 - len(wrong)} of {len(cases) + 1} cases pass")
    return 1 if wrong else 0


if __name__ == "__main__":
    sys.exit(main())
