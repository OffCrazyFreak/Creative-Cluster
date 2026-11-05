#!/usr/bin/env python3
"""PreToolUse guard: blocks `pkill -f` and `pgrep -f` patterns that match their own shell.

The shell running a command carries the whole command in its arguments, so a plain
pattern finds that shell: pkill kills the agent's own command, and a pgrep wait loop
never ends. Exit 0 allows, exit 2 blocks and shows the message to the agent.
"""

import json
import re
import shlex
import sys

PROCESS_TOOLS = {"pkill", "pgrep"}
# ssh and docker count because the remote shell also carries the pattern in its arguments.
WRAPPERS = {
    "sudo", "timeout", "env", "nice", "nohup", "command", "time", "xargs",
    "exec", "setsid", "watch", "ssh", "docker",
}
SHELLS = {"sh", "bash", "zsh", "dash", "ksh", "fish"}
SHELL_KEYWORDS = {"if", "then", "elif", "else", "while", "until", "do", "!", "{"}

# Options whose value is the next token, so that value is not taken for the pattern.
WITH_VALUE = {
    "-d", "-g", "-G", "-P", "-s", "-t", "-u", "-U", "-F", "-T", "-A",
    "--delimiter", "--pgroup", "--group", "--parent", "--session", "--terminal",
    "--euid", "--uid", "--pidfile", "--signal", "--runstates", "--ns", "--nslist",
}

SHORT_FULL = re.compile(r"^-[a-zA-Z]*f[a-zA-Z]*$")
BUNDLED_VALUE_LETTERS = "dgGPstuUFTA"
ENV_ASSIGN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
SUBSTITUTION = re.compile(r"\$\(([^()]*)\)|`([^`]*)`")
HEREDOC = re.compile(r"<<-?\s*(['\"]?)(\w+)\1")
MAX_DEPTH = 5


def basename(token):
    return token.rsplit("/", 1)[-1]


def strip_heredocs(command):
    # A heredoc body is data, except that an unquoted one still runs its substitutions.
    lines, kept, index = command.split("\n"), [], 0
    while index < len(lines):
        line = lines[index]
        kept.append(line)
        index += 1
        match = HEREDOC.search(line)
        if match:
            while index < len(lines) and lines[index].strip() != match.group(2):
                if not match.group(1):
                    kept.extend(sub.group(0) for sub in SUBSTITUTION.finditer(lines[index]))
                index += 1
            index += 1
    return "\n".join(kept)


def without_single_quoted(command):
    # Single quotes keep backticks and $() literal; double quotes do not.
    kept, quote = [], None
    for char in command:
        if quote == "'":
            quote = None if char == "'" else quote
        elif char == "'" and quote is None:
            quote = "'"
        else:
            if char == '"':
                quote = None if quote == '"' else '"'
            kept.append(char)
    return "".join(kept)


def segments(command):
    # Tracks quotes, because a plain regex would tear `sh -c "a && b"` in half.
    text = SUBSTITUTION.sub(" ", command)
    parts, current, quote, index = [], [], None, 0
    while index < len(text):
        char = text[index]
        if quote:
            quote = None if char == quote else quote
        elif char in "'\"":
            quote = char
        elif char == "\\":
            current.append(text[index : index + 2])
            index += 2
            continue
        elif char in "|;\n&":
            parts.append("".join(current))
            current = []
            index += 1
            continue
        current.append(char)
        index += 1
    parts.append("".join(current))
    return [part.strip() for part in parts if part.strip()]


def tokens_of(segment):
    try:
        return shlex.split(segment)
    except ValueError:
        return segment.split()


def strip_prefixes(tokens):
    tokens = [token.lstrip("(").rstrip(")") for token in tokens]
    index, wrapped = 0, False
    while index < len(tokens):
        token = tokens[index]
        if token in SHELL_KEYWORDS or not token or ENV_ASSIGN.match(token):
            index += 1
        elif basename(token) in WRAPPERS:
            wrapped = True
            index += 1
            while index < len(tokens) and (
                tokens[index].startswith("-")
                or re.fullmatch(r"[\d.]+[smhd]?", tokens[index])
                or ENV_ASSIGN.match(tokens[index])
            ):
                index += 1
        else:
            break
    return tokens[index:], wrapped


def shell_payloads(args):
    payloads = []
    for index, token in enumerate(args):
        if token.startswith("--command="):
            payloads.append(token.split("=", 1)[1])
        elif re.match(r"^-[a-zA-Z]*c[a-zA-Z]*$", token) and index + 1 < len(args):
            payloads.append(args[index + 1])
    return payloads


def full_pattern(args):
    full, pattern, skip_next = False, None, False
    for index, token in enumerate(args):
        if skip_next:
            skip_next = False
        elif token == "--":
            pattern = pattern or next(iter(args[index + 1 :]), None)
            break
        elif token in WITH_VALUE:
            skip_next = True
        elif token == "--full" or SHORT_FULL.match(token):
            full = True
            skip_next = token != "--full" and token[-1] in BUNDLED_VALUE_LETTERS
        elif not token.startswith("-") and pattern is None:
            pattern = token
    return pattern if full else None


def matches_itself(pattern, command_line):
    if re.search(r"\$\{?\w", pattern):
        return True
    try:
        return re.search(pattern, command_line) is not None
    except re.error:
        return pattern in command_line


def refusal(tokens, wrapped, command_line):
    names = [basename(token) for token in tokens]
    # A wrapper's options may have hidden the real command, so search the whole segment.
    candidates = range(len(names)) if wrapped else [0]
    index = next((i for i in candidates if names[i] in PROCESS_TOOLS), None)
    if index is None:
        return None
    pattern = full_pattern(tokens[index + 1 :])
    if pattern is None or not matches_itself(pattern, command_line):
        return None
    return (
        f"Blocked: the -f pattern `{pattern}` matches this command's own shell, so "
        "pkill would kill it and a pgrep loop would never end. Find the PID "
        "(ss -ltnp for a port) and run kill <PID>, or use the bracket trick "
        "(pgrep -f '[v]itest')."
    )


def check(command, depth=0, root=None):
    # `root` is what the running shell shows to pgrep, however deep the nesting got.
    root = root if root is not None else command
    if depth > MAX_DEPTH:
        return "Blocked: command nests shells too deeply to check. Rewrite it as a plain command."
    command = strip_heredocs(command)
    for match in SUBSTITUTION.finditer(without_single_quoted(command)):
        message = check(match.group(1) or match.group(2) or "", depth + 1, root)
        if message:
            return message
    for segment in segments(command):
        tokens, wrapped = strip_prefixes(tokens_of(segment))
        if not tokens:
            continue
        if tokens[0] == "eval":
            message = check(" ".join(tokens[1:]), depth + 1, root)
            if message:
                return message
        if basename(tokens[0]) in SHELLS:
            for payload in shell_payloads(tokens[1:]):
                message = check(payload, depth + 1, root)
                if message:
                    return message
        message = refusal(tokens, wrapped, root)
        if message:
            return message
    return None


def main():
    try:
        command = json.load(sys.stdin).get("tool_input", {}).get("command", "")
    except (ValueError, AttributeError):
        return 0
    message = check(command) if isinstance(command, str) else None
    if message:
        print(message, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
