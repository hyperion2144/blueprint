#!/usr/bin/env python3
"""RPC step driver for omp --mode rpc via named pipes (FIFOs).

Usage (first call starts OMP, later calls reuse it):
  python3 tests/e2e/scripts/rpc-driver.py --profile <name> --step <step-id> \
    --message "<prompt>" [--answers <file>] [--start]

Starts OMP via FIFOs, sends a single prompt, auto-answers extension UI,
collects events until agent_end, saves evidence.
"""

import json, os, sys, time, argparse, subprocess, threading, signal, re, select
from pathlib import Path
from typing import Optional

# ── Setup ─────────────────────────────────────────────────────────
MAIN = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RUN_DIR = os.path.join(MAIN, ".omp.run", "fixture-1")
FIXTURE = os.path.expanduser("~/vault/projects/specworkflow-fixture/sokoban")
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


# ── OMP lifecycle via FIFOs ───────────────────────────────────────
def start_omp(profile: str) -> int:
    """Start OMP in background with FIFOs. Returns PID."""
    fifo_in = f"/tmp/omp_{profile}_in"
    fifo_out = f"/tmp/omp_{profile}_out"
    
    # Create FIFOs
    for p in [fifo_in, fifo_out]:
        if os.path.exists(p):
            os.unlink(p)
        os.mkfifo(p)
    
    # Start OMP — redirect stdin from fifo_in, stdout to fifo_out
    # Must open fifo_out for reading FIRST to avoid deadlock
    # We open fifo_in for writing in a subprocess that holds it open
    env = os.environ.copy()
    env["PI_RPC_EMIT_TITLE"] = "0"
    
    # Strategy: Start OMP with stdin from a persistent writer that keeps the FIFO open
    # Use a wrapper script that opens fifo_out for reading and fifo_in for writing
    wrapper = f"""
import os, sys, time
# Open fifo_out for reading first (so OMP can write to it)
out_fd = os.open('{fifo_out}', os.O_RDONLY | os.O_NONBLOCK)
# Then open fifo_in for writing (so OMP can read from it)
in_fd = os.open('{fifo_in}', os.O_WRONLY)
# Now exec omp
os.dup2(in_fd, 0)   # stdin  = fifo_in
os.dup2(out_fd, 1)  # stdout = fifo_out 
# stderr goes to a file
err_fd = os.open('/tmp/omp_{profile}_stderr.log', os.O_WRONLY | os.O_CREAT | os.O_TRUNC)
os.dup2(err_fd, 2)
os.execv('{OMP_BIN}', ['omp', '--mode', 'rpc', '--cwd', '{FIXTURE}', 
    '--profile', '{profile}', '--auto-approve', '--no-title', '--allow-home'])
"""
    
    wrapper_path = f"/tmp/omp_{profile}_wrapper.py"
    with open(wrapper_path, "w") as f:
        f.write(wrapper)
    
    proc = subprocess.Popen(
        [sys.executable, wrapper_path],
        stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env=env,
        start_new_session=True,  # Detach from parent
    )
    
    # Wait for ready (OMP writes to fifo_out)
    deadline = time.time() + 30
    with open(fifo_out, "r") as f:
        while time.time() < deadline:
            line = f.readline()
            if not line:
                time.sleep(0.1)
                continue
            try:
                ev = json.loads(line)
                if ev.get("type") == "ready":
                    return proc.pid
            except json.JSONDecodeError:
                continue
    
    # Timeout
    try:
        os.kill(proc.pid, signal.SIGTERM)
    except:
        pass
    return 0


def is_omp_alive(profile: str) -> bool:
    """Check if OMP process is still running."""
    pid_file = f"/tmp/omp_{profile}.pid"
    if not os.path.exists(pid_file):
        return False
    try:
        pid = int(open(pid_file).read().strip())
        os.kill(pid, 0)
        return True
    except (OSError, ValueError):
        return False


# ── Extension UI auto-answer ─────────────────────────────────────
def auto_answer_ui(ev: dict, answers: dict, step: str, in_f) -> bool:
    """Try to auto-answer. Returns True if handled."""
    method = ev.get("method", "")
    ev_id = ev.get("id", "")
    
    if method == "confirm":
        in_f.write(json.dumps({"type": "extension_ui_response", "id": ev_id, "confirmed": True}) + "\n")
        in_f.flush()
        return True
    
    if method == "select":
        options = ev.get("options", [])
        for i, opt in enumerate(options):
            if isinstance(opt, dict) and opt.get("recommended"):
                in_f.write(json.dumps({"type": "extension_ui_response", "id": ev_id, "value": str(i)}) + "\n")
                in_f.flush()
                return True
        if options:
            in_f.write(json.dumps({"type": "extension_ui_response", "id": ev_id, "value": "0"}) + "\n")
            in_f.flush()
            return True
        return False
    
    if method == "input":
        title = ev.get("title", "")
        sa = answers.get(step, {})
        val = sa.get(title, "ok")
        in_f.write(json.dumps({"type": "extension_ui_response", "id": ev_id, "value": val}) + "\n")
        in_f.flush()
        return True
    
    return False


# ── Step execution ────────────────────────────────────────────────
def run_step(profile: str, message: str, step: str, answers: dict, timeout: int = 900):
    """Send a prompt and collect events until agent_end."""
    fifo_in = f"/tmp/omp_{profile}_in"
    fifo_out = f"/tmp/omp_{profile}_out"
    
    step_dir = os.path.join(RUN_DIR, step)
    os.makedirs(step_dir, exist_ok=True)
    events_path = os.path.join(step_dir, "events.jsonl")
    reply_path = os.path.join(step_dir, "reply.json")
    
    # Open FIFOs
    # IMPORTANT: open out_f first, then in_f
    out_f = open(fifo_out, "r")
    in_f = open(fifo_in, "w", buffering=1)
    
    tokens = {"input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0}
    text = ""
    ev_count = 0
    ui_answered = 0
    
    try:
        # Send prompt
        req_id = f"req_{int(time.time()*1e6)}"
        prompt_frame = json.dumps({
            "id": req_id, "type": "prompt",
            "message": message, "streamingBehavior": "followUp"
        })
        in_f.write(prompt_frame + "\n")
        in_f.flush()
        
        # Collect events
        deadline = time.time() + timeout
        ev_f = open(events_path, "w")
        ev_f.write(f"# prompt: {prompt_frame}\n")
        
        while time.time() < deadline:
            # Use select with timeout for non-blocking read
            ready, _, _ = select.select([out_f], [], [], 0.5)
            if not ready:
                # Check if FIFO is still open (OMP died)
                if not is_omp_alive(profile):
                    result = {"error": "OMP process died", "events_count": ev_count}
                    save_json(reply_path, result)
                    return result
                continue
            
            line = out_f.readline()
            if not line:
                # EOF — OMP closed its stdout
                result = {"error": "OMP stdout closed (EOF)", "events_count": ev_count}
                save_json(reply_path, result)
                return result
            
            cleaned = clean(line)
            if not cleaned:
                continue
            
            try:
                ev = json.loads(cleaned)
            except json.JSONDecodeError:
                ev_f.write(f"# PARSE_ERROR: {line.strip()[:200]}\n")
                continue
            
            # Log event
            ev_f.write(json.dumps(ev, ensure_ascii=False) + "\n")
            ev_f.flush()
            ev_count += 1
            
            ev_type = ev.get("type", "")
            
            # Handle extension UI
            if ev_type == "extension_ui_request":
                if auto_answer_ui(ev, answers, step, in_f):
                    ui_answered += 1
                continue
            
            # Collect text
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
                save_json(reply_path, result)
                return result
        
        # Timeout
        result = {"error": "timeout", "events_count": ev_count, "text": text}
        save_json(reply_path, result)
        return result
    
    finally:
        ev_f.close()
        out_f.close()
        in_f.close()


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
