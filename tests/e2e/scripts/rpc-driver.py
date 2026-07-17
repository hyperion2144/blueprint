#!/usr/bin/env python3
"""RPC step driver for omp --mode rpc via subprocess.PIPE.

Usage (first call starts OMP, later calls reuse it):
  python3 tests/e2e/scripts/rpc-driver.py --profile <name> --step <step-id> \
    --message "<prompt>" [--answers <file>] [--start]

Starts OMP via subprocess.PIPE, sends a single prompt, auto-answers extension UI,
collects events until agent_end, saves evidence.
"""

import json, os, sys, time, argparse, subprocess, signal, re, select
from typing import Optional

# ── OMP process registry ──────────────────────────────────────────
_omp_procs: dict[str, subprocess.Popen] = {}

# ── Setup ─────────────────────────────────────────────────────────
MAIN = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RUN_DIR = os.path.join(MAIN, ".omp.run", "fixture-1")
FIXTURE = os.path.expanduser("~/vault/projects/specworkflow-fixture/sokoban")
OMP_BIN = os.path.expanduser("~/.bun/bin/omp")
ANSI_RE = re.compile(r'\x1b\[[0-9;]*[a-zA-Z]')

os.makedirs(RUN_DIR, exist_ok=True)

# ── Helpers ───────────────────────────────────────────────────────
def clean(s: str) -> str:
    return ANSI_RE.sub('', s).strip()

def load_json(path: str):
    if os.path.exists(path):
        return json.load(open(path))
    return {}

def save_json(path: str, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ── OMP lifecycle via subprocess.PIPE ─────────────────────────────
def start_omp(profile: str) -> int:
    """Start OMP in background with subprocess.PIPE (no FIFOs). Returns PID."""
    env = os.environ.copy()
    env["PI_RPC_EMIT_TITLE"] = "0"

    proc = subprocess.Popen(
        [OMP_BIN, '--mode', 'rpc', '--cwd', FIXTURE,
         '--auto-approve', '--no-title', '--allow-home'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=open(f'/tmp/omp_{profile}_stderr.log', 'w'),
        env=env,
        start_new_session=True,
    )
    _omp_procs[profile] = proc

    # Wait for ready event - use select with timeout to avoid blocking readline
    out_fd = proc.stdout.fileno()
    deadline = time.time() + 30
    while time.time() < deadline:
        ready, _, _ = select.select([out_fd], [], [], 0.5)
        if not ready:
            if proc.poll() is not None:
                break
            continue
        line_b = proc.stdout.readline()
        if not line_b:
            time.sleep(0.1)
            continue
        line = line_b.decode('utf-8', errors='replace').strip()
        try:
            ev = json.loads(line)
            if ev.get("type") == "ready":
                return proc.pid
        except json.JSONDecodeError:
            continue

    # Timeout or process died
    proc.kill()
    return 0


def is_omp_alive(profile: str) -> bool:
    """Check if OMP process is still running."""
    # Check in-memory registry first (same process invocation)
    proc = _omp_procs.get(profile)
    if proc:
        try:
            os.kill(proc.pid, 0)
            return True
        except OSError:
            return False
    # Fallback to PID file (cross-invocation)
    pid_file = f"/tmp/omp_{profile}.pid"
    if os.path.exists(pid_file):
        try:
            pid = int(open(pid_file).read().strip())
            os.kill(pid, 0)
            return True
        except (OSError, ValueError):
            pass
    return False


# ── Step execution ────────────────────────────────────────────────
def run_step(profile: str, message: str, step: str, answers: dict, timeout: int = 900):
    """Send a prompt and collect events via PIPE until agent_end."""
    proc = _omp_procs.get(profile)
    if not proc:
        return {"error": f"No OMP process for profile '{profile}'"}

    step_dir = os.path.join(RUN_DIR, step)
    os.makedirs(step_dir, exist_ok=True)
    events_path = os.path.join(step_dir, "events.jsonl")
    reply_path = os.path.join(step_dir, "reply.json")

    out_fd = proc.stdout.fileno()
    in_writer = proc.stdin

    tokens = {"input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0}
    text = ""
    ev_count = 0
    ui_answered = 0

    req_id = f"req_{int(time.time()*1e6)}"
    prompt_frame = json.dumps({
        "id": req_id, "type": "prompt",
        "message": message, "streamingBehavior": "followUp"
    })
    in_writer.write((prompt_frame + "\n").encode('utf-8'))
    in_writer.flush()

    deadline = time.time() + timeout
    ev_f = open(events_path, "w")
    ev_f.write(f"# prompt: {prompt_frame}\n")

    while time.time() < deadline:
        ready, _, _ = select.select([out_fd], [], [], 0.5)
        if not ready:
            if not is_omp_alive(profile):
                result = {"error": "OMP process died", "events_count": ev_count}
                ev_f.close()
                save_json(reply_path, result)
                return result
            continue

        line_b = proc.stdout.readline()
        if not line_b:
            result = {"error": "OMP stdout closed (EOF)", "events_count": ev_count}
            ev_f.close()
            save_json(reply_path, result)
            return result

        line = line_b.decode('utf-8', errors='replace').strip()
        if not line:
            continue

        try:
            ev = json.loads(line)
        except json.JSONDecodeError:
            ev_f.write(f"# PARSE_ERROR: {line[:200]}\n")
            continue

        ev_f.write(json.dumps(ev, ensure_ascii=False) + "\n")
        ev_f.flush()
        ev_count += 1

        ev_type = ev.get("type", "")

        # Auto-answer extension UI
        if ev_type == "extension_ui_request":
            ev_id = ev.get("id", "")
            method = ev.get("method", "")
            handled = False
            resp_base = {"type": "extension_ui_response", "id": ev_id}

            if method == "confirm":
                resp_base["confirmed"] = True
                handled = True
            elif method == "select":
                opts = ev.get("options", [])
                for i, opt in enumerate(opts):
                    if isinstance(opt, dict) and opt.get("recommended"):
                        resp_base["value"] = str(i)
                        handled = True
                        break
                if not handled and opts:
                    resp_base["value"] = "0"
                    handled = True
            elif method == "input":
                title = ev.get("title", "")
                sa = answers.get(step, {})
                val = sa.get(title, "ok")
                resp_base["value"] = val
                handled = True

            if handled:
                in_writer.write((json.dumps(resp_base) + "\n").encode('utf-8'))
                in_writer.flush()
                ui_answered += 1
            continue

        ame = ev.get("assistantMessageEvent") or {}
        if ev_type == "message_update" and ame.get("type") == "text_delta":
            text += ame.get("delta", "")

        if ev_type == "message_end":
            usage = (ev.get("message") or {}).get("usage") or {}
            for k in tokens:
                tokens[k] += usage.get(k, 0)

        if ev_type == "agent_end":
            result = {
                "req_id": req_id,
                "text": text,
                "text_preview": text[:500],
                "tokens": tokens,
                "events_count": ev_count,
                "ui_answered": ui_answered,
            }
            ev_f.close()
            save_json(reply_path, result)
            return result

    # Timeout
    result = {"error": "timeout", "events_count": ev_count, "text": text}
    ev_f.close()
    save_json(reply_path, result)
    return result


# ── Evidence collection ───────────────────────────────────────────
def collect_evidence(step_name: str):
    """Collect fixture state after a step."""
    import shutil, subprocess as sp
    step_dir = os.path.join(RUN_DIR, step_name)
    os.makedirs(step_dir, exist_ok=True)

    # Git diff
    try:
        r = sp.run("git add -A && git diff --cached --stat", shell=True, cwd=FIXTURE,
                   capture_output=True, text=True, timeout=10)
        with open(os.path.join(step_dir, "diffstat.txt"), "w") as f:
            f.write(r.stdout + r.stderr)

        r2 = sp.run("git diff --cached", shell=True, cwd=FIXTURE,
                    capture_output=True, text=True, timeout=10)
        with open(os.path.join(step_dir, "diff.patch"), "w") as f:
            f.write(r2.stdout)
    except:
        pass

    # State file
    state_path = os.path.join(FIXTURE, "bp", "state.md")
    if os.path.exists(state_path):
        shutil.copy(state_path, os.path.join(step_dir, "state.md"))

    # bp file listing
    try:
        r = sp.run("find bp -type f | sort", shell=True, cwd=FIXTURE,
                   capture_output=True, text=True, timeout=5)
        with open(os.path.join(step_dir, "bp-files.txt"), "w") as f:
            f.write(r.stdout)
    except:
        pass

    # bp state output
    try:
        r = sp.run(f"node {MAIN}/bin/cli.js state", shell=True, cwd=FIXTURE,
                   capture_output=True, text=True, timeout=10)
        with open(os.path.join(step_dir, "bp-state.json"), "w") as f:
            f.write(r.stdout)
    except:
        pass

    return step_dir


# ── Main ──────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="OMP RPC step driver")
    ap.add_argument("--profile", required=True)
    ap.add_argument("--step", required=True)
    ap.add_argument("--message", required=True)
    ap.add_argument("--answers", default=None)
    ap.add_argument("--start", action="store_true")
    ap.add_argument("--timeout", type=int, default=900)
    ap.add_argument("--fixture", default=None, help="Path to fixture project (overrides default)")
    ap.add_argument("--run-dir", default=None, help="Path to evidence output dir (overrides default)")
    args = ap.parse_args()

    # Override globals if provided
    global RUN_DIR, FIXTURE
    if args.fixture:
        FIXTURE = os.path.expanduser(args.fixture)
    if args.run_dir:
        RUN_DIR = os.path.expanduser(args.run_dir)
    os.makedirs(RUN_DIR, exist_ok=True)

    answers = load_json(args.answers) if args.answers else {}
    # Start OMP if requested
    if args.start:
        print(f"Starting OMP (profile={args.profile})...", flush=True)
        pid = start_omp(args.profile)
        if pid == 0:
            print("FATAL: OMP failed to start", file=sys.stderr)
            sys.exit(2)
        with open(f"/tmp/omp_{args.profile}.pid", "w") as f:
            f.write(str(pid))
        print(f"OMP started (pid={pid})", flush=True)
        # Short wait for full initialization
        time.sleep(2)

    # Check OMP is alive
    if not is_omp_alive(args.profile):
        print("FATAL: OMP not running. Use --start first.", file=sys.stderr)
        sys.exit(1)

    # Run step
    print(f"Running step: {args.step}", flush=True)
    result = run_step(args.profile, args.message, args.step, answers, args.timeout)

    if result.get("error"):
        print(f"FAIL: {result['error']}", flush=True)
        collect_evidence(args.step)
        sys.exit(3)

    # Collect evidence
    collect_evidence(args.step)

    # Print summary
    print(f"OK: {result['events_count']} events, "
          f"tokens in={result['tokens'].get('input',0)} out={result['tokens'].get('output',0)}, "
          f"ui_answered={result.get('ui_answered',0)}", flush=True)
    print(f"TEXT: {result.get('text_preview', result.get('text','')[:500])}", flush=True)


if __name__ == "__main__":
    main()
