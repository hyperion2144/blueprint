#!/usr/bin/env python3
"""OMP RPC loop runner - drives SUT through entire BP lifecycle in one session."""
import os, sys, json, time, argparse
from pathlib import Path

SCRIPTS = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPTS)

import importlib.util, importlib.machinery
loader = importlib.machinery.SourceFileLoader('rd', os.path.join(SCRIPTS, 'rpc-driver.py'))
spec = importlib.util.spec_from_loader('rd', loader)
rd = importlib.util.module_from_spec(spec)
loader.exec_module(rd)

def main():
    ap = argparse.ArgumentParser(description="OMP RPC loop runner")
    ap.add_argument("--fixture", default=None)
    # profile is internal, not passed to OMP
    ap.add_argument("--timeout", type=int, default=600)
    ap.add_argument("--max-steps", type=int, default=30)
    args = ap.parse_args()

    if args.fixture:
        rd.FIXTURE = os.path.expanduser(args.fixture)
    profile = 'bp-e2e-sut'
    timeout = args.timeout

    print(f"Fixture: {rd.FIXTURE}", flush=True)

    # Phase 2: Start + /bp-init
    pid = rd.start_omp(profile)
    if pid == 0:
        print("FATAL: OMP failed to start", file=sys.stderr)
        sys.exit(2)
    print(f"OMP started (pid={pid})", flush=True)
    time.sleep(2)

    init_msg = ("/bp-init Sokoban puzzle game using HTML5 Canvas and TypeScript. "
                "Keep roadmap simple: 1 milestone, 2-3 phases. "
                "Use sensible defaults for all questions - do not ask the user anything.")
    result = rd.run_step(profile, init_msg, "00-init", {}, timeout)
    if result.get("error"):
        print(f"FAIL init: {result['error']}", flush=True)
    else:
        print(f"OK init: {result['events_count']} events", flush=True)

    # Phase 3: Loop /bp-continue
    step_num = 0
    while step_num < args.max_steps:
        step_num += 1
        step_id = f"{step_num:02d}-continue"

        bp_dir = os.path.join(rd.FIXTURE, "bp")
        roadmap = os.path.join(bp_dir, "roadmap.md")
        remaining = 0; completed = 0; total = 0
        if os.path.exists(roadmap):
            with open(roadmap) as f:
                c = f.read()
            remaining = c.count('[ ]')
            total = c.count('[ ') + c.count('[x]')
            completed = c.count('[x]')
        if remaining == 0 and completed > 0:
            print(f"All {total} items complete!", flush=True)
            break

        print(f"Step {step_num}: /bp-continue ({completed}/{total} done, {remaining} left)", flush=True)
        result = rd.run_step(profile, "/bp-continue", step_id, {}, timeout)
        if result.get("error"):
            print(f"  FAIL: {result['error']}", flush=True)
            if "OMP" in result.get("error",""):
                break
        else:
            print(f"  OK: {result['events_count']} events", flush=True)
        time.sleep(1)

    # Cleanup
    proc = rd._omp_procs.get(profile)
    if proc:
        proc.kill()
    print("Done", flush=True)

if __name__ == "__main__":
    main()
