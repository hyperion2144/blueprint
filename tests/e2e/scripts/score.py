#!/usr/bin/env python3
"""Automated quality scoring for BP E2E test runs.

Usage:
  python3 tests/e2e/scripts/score.py --fixture <path> [--output <file>]

Reads BP artifacts from the fixture project, runs mechanical checks across
7 quality dimensions (100 pts total), and outputs a JSON score report.
The Test Driver agent then applies qualitative adjustments based on the
"Agent Judgment" notes in SKILL.md.
"""

import json
import os
import re
import subprocess
import sys
import argparse
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone


# ── Helpers ───────────────────────────────────────────────────────

def read_file(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except (FileNotFoundError, UnicodeDecodeError):
        return ""


def count_lines(path: str) -> int:
    content = read_file(path)
    return len([l for l in content.splitlines() if l.strip()])


def find_files(directory: str, pattern: str = "**/*") -> list[str]:
    base = Path(directory)
    if not base.exists():
        return []
    return sorted(str(p) for p in base.glob(pattern) if p.is_file())


def run_cmd(cmd: str, cwd: str, timeout: int = 30) -> tuple[int, str, str]:
    try:
        r = subprocess.run(
            cmd, shell=True, cwd=cwd, capture_output=True, text=True, timeout=timeout
        )
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "TIMEOUT"
    except Exception as e:
        return -2, "", str(e)


# ── Scoring Dimensions ────────────────────────────────────────────

def score_artifact_completeness(fixture: str) -> dict:
    """Dimension 1: Artifact Completeness (15 pts)"""
    score = 15
    checks = []
    changes_dir = os.path.join(fixture, "bp", "changes")
    archive_dir = os.path.join(changes_dir, "archive")

    # Find all changes (active + archived)
    changes = []
    if os.path.isdir(changes_dir):
        for entry in os.listdir(changes_dir):
            if entry == "archive":
                continue
            change_path = os.path.join(changes_dir, entry)
            if os.path.isdir(change_path):
                changes.append(("active", entry, change_path))

    if os.path.isdir(archive_dir):
        for entry in os.listdir(archive_dir):
            change_path = os.path.join(archive_dir, entry)
            if os.path.isdir(change_path):
                changes.append(("archived", entry, change_path))

    if not changes:
        checks.append({"check": "changes_exist", "pass": False, "detail": "No changes found"})
        return {"score": 0, "max": 15, "checks": checks}

    required_files = ["proposal.md", "design.md", "tasks.md", "review.md"]

    for status, name, path in changes:
        # Check required files exist
        for rf in required_files:
            rf_path = os.path.join(path, rf)
            if not os.path.exists(rf_path):
                score -= 1
                checks.append({
                    "check": f"{name}/{rf}_exists",
                    "pass": False,
                    "detail": f"Missing {rf} in {status} change {name}"
                })

        # Check specs/ directory exists (skip for archived - BP merges delta specs into global specs)
        if status != "archived":
            specs_dir = os.path.join(path, "specs")
            if not os.path.isdir(specs_dir) or not find_files(specs_dir, "*.md"):
                score -= 1
                checks.append({
                    "check": f"{name}/specs_exist",
                    "pass": False,
                    "detail": f"Missing specs/ in {status} change {name}"
                })

        # Check for template placeholders
        for rf in required_files + ["design.md"]:
            rf_path = os.path.join(path, rf)
            content = read_file(rf_path)
            placeholders = re.findall(r'\{\{[^}]+\}\}', content)
            if placeholders:
                ded = min(len(placeholders), 5)
                score -= ded
                checks.append({
                    "check": f"{name}/{rf}_no_placeholders",
                    "pass": False,
                    "detail": f"{len(placeholders)} template placeholders in {rf}: {placeholders[:3]}"
                })

        # Check artifacts have real content (>10 non-empty lines)
        for rf in required_files:
            rf_path = os.path.join(path, rf)
            lines = count_lines(rf_path)
            if lines < 10:
                score -= 1
                checks.append({
                    "check": f"{name}/{rf}_has_content",
                    "pass": False,
                    "detail": f"{rf} has only {lines} non-empty lines"
                })

    score = max(score, 0)
    return {"score": score, "max": 15, "checks": checks}


def score_traceability(fixture: str) -> dict:
    """Dimension 2: Traceability (15 pts)"""
    score = 15
    checks = []
    changes_dir = os.path.join(fixture, "bp", "changes")
    archive_dir = os.path.join(changes_dir, "archive")

    all_changes = []
    if os.path.isdir(changes_dir):
        for entry in os.listdir(changes_dir):
            if entry != "archive":
                p = os.path.join(changes_dir, entry)
                if os.path.isdir(p):
                    all_changes.append(p)
    if os.path.isdir(archive_dir):
        for entry in os.listdir(archive_dir):
            p = os.path.join(archive_dir, entry)
            if os.path.isdir(p):
                all_changes.append(p)

    for change_path in all_changes:
        name = os.path.basename(change_path)
        proposal = read_file(os.path.join(change_path, "proposal.md"))
        design = read_file(os.path.join(change_path, "design.md"))
        tasks = read_file(os.path.join(change_path, "tasks.md"))

        # Extract PR-N from proposal
        pr_ids = set(re.findall(r'PR-(\d+)', proposal))
        # Extract DS-N from design
        ds_ids = set(re.findall(r'DS-(\d+)', design))
        # Extract T-N from tasks
        t_ids = set(re.findall(r'T-(\d+)', tasks))

        # Check PR -> DS references
        for pr_id in pr_ids:
            if f"PR-{pr_id}" not in design:
                score -= 1
                checks.append({
                    "check": f"{name}/PR-{pr_id}_to_DS",
                    "pass": False,
                    "detail": f"PR-{pr_id} not referenced in design.md"
                })

        # Check DS -> T references
        for ds_id in ds_ids:
            if f"DS-{ds_id}" not in tasks:
                score -= 1
                checks.append({
                    "check": f"{name}/DS-{ds_id}_to_T",
                    "pass": False,
                    "detail": f"DS-{ds_id} not referenced in tasks.md"
                })

        # Check behavior tasks have spec_ref
        behavior_tasks = re.findall(
            r'T-(\d+).*?\[type:behavior\].*?(?=\nT-|\Z)',
            tasks, re.DOTALL
        )
        for bt_match in re.finditer(r'(- \[.\] T-(\d+):.*?\[type:behavior\].*?)(?=\n- \[.\] T-|\n##|\Z)', tasks, re.DOTALL):
            task_text = bt_match.group(1)
            task_id = bt_match.group(2)
            if 'spec_ref' not in task_text:
                score -= 1
                checks.append({
                    "check": f"{name}/T-{task_id}_spec_ref",
                    "pass": False,
                    "detail": f"T-{task_id} (behavior) missing spec_ref"
                })

    score = max(score, 0)
    return {"score": score, "max": 15, "checks": checks}


def score_spec_quality(fixture: str) -> dict:
    """Dimension 3: Spec Quality (15 pts)"""
    score = 15
    checks = []
    changes_dir = os.path.join(fixture, "bp", "changes")
    archive_dir = os.path.join(changes_dir, "archive")

    all_changes = []
    if os.path.isdir(changes_dir):
        for entry in os.listdir(changes_dir):
            if entry != "archive":
                p = os.path.join(changes_dir, entry)
                if os.path.isdir(p):
                    all_changes.append(p)
    if os.path.isdir(archive_dir):
        for entry in os.listdir(archive_dir):
            p = os.path.join(archive_dir, entry)
            if os.path.isdir(p):
                all_changes.append(p)

    for change_path in all_changes:
        name = os.path.basename(change_path)
        specs_dir = os.path.join(change_path, "specs")
        if not os.path.isdir(specs_dir):
            continue

        for spec_file in find_files(specs_dir, "*.md"):
            spec_content = read_file(spec_file)
            spec_name = os.path.relpath(spec_file, change_path)

            # Check for correct delta sections
            has_added = "## ADDED Requirements" in spec_content or "## ADDED" in spec_content
            has_modified = "## MODIFIED Requirements" in spec_content or "## MODIFIED" in spec_content
            has_removed = "## REMOVED Requirements" in spec_content or "## REMOVED" in spec_content

            if not (has_added or has_modified or has_removed):
                # Might be a non-delta spec, skip
                if "## Requirements" not in spec_content:
                    score -= 2
                    checks.append({
                        "check": f"{name}/{spec_name}_delta_sections",
                        "pass": False,
                        "detail": "No ADDED/MODIFIED/REMOVED sections found"
                    })

            # Check for RFC 2119 keywords
            has_shall = bool(re.search(r'\bSHALL\b', spec_content))
            has_must = bool(re.search(r'\bMUST\b', spec_content))
            if not (has_shall or has_must):
                score -= 2
                checks.append({
                    "check": f"{name}/{spec_name}_rfc2119",
                    "pass": False,
                    "detail": "No SHALL/MUST keywords found"
                })

            # Check for scenarios (GIVEN/WHEN/THEN)
            requirements = re.findall(r'### Requirement:.*?(?=### Requirement:|\Z)', spec_content, re.DOTALL)
            for i, req in enumerate(requirements):
                has_scenario = bool(re.search(r'(GIVEN|WHEN|THEN|Scenario)', req))
                if not has_scenario:
                    score -= 1
                    checks.append({
                        "check": f"{name}/{spec_name}_req{i}_scenario",
                        "pass": False,
                        "detail": f"Requirement {i+1} missing scenario (GIVEN/WHEN/THEN)"
                    })

            # Check for implementation details in specs (heuristic)
            impl_patterns = [
                r'\bclass\s+\w+', r'\binterface\s+\w+',
                r'\bfunction\s+\w+\s*\(', r'\bconst\s+\w+\s*[:=]',
                r'import\s+.*from', r'require\s*\(',
            ]
            impl_hits = 0
            for pat in impl_patterns:
                impl_hits += len(re.findall(pat, spec_content))
            if impl_hits > 3:
                score -= 2
                checks.append({
                    "check": f"{name}/{spec_name}_behavior_not_impl",
                    "pass": False,
                    "detail": f"Spec contains {impl_hits} implementation-like patterns (class/interface/function/import)"
                })

            # Check for empty/template specs
            non_template_lines = len([
                l for l in spec_content.splitlines()
                if l.strip() and not l.strip().startswith('#')
                and '<' not in l and '{{' not in l
            ])
            if non_template_lines < 3:
                score -= 3
                checks.append({
                    "check": f"{name}/{spec_name}_non_empty",
                    "pass": False,
                    "detail": f"Only {non_template_lines} non-template, non-header lines"
                })

    score = max(score, 0)
    return {"score": score, "max": 15, "checks": checks}


def score_tdd_compliance(fixture: str) -> dict:
    """Dimension 4: TDD Compliance (15 pts)"""
    score = 15
    checks = []

    # Get git log
    rc, git_log, _ = run_cmd("git log --oneline --all", fixture)
    if rc != 0:
        checks.append({"check": "git_log", "pass": False, "detail": "Failed to read git log"})
        return {"score": 10, "max": 15, "checks": checks}

    # Count commit types
    test_commits = len(re.findall(r'^[a-f0-9]+ test\(', git_log, re.MULTILINE))
    feat_commits = len(re.findall(r'^[a-f0-9]+ feat\(', git_log, re.MULTILINE))
    refactor_commits = len(re.findall(r'^[a-f0-9]+ refactor\(', git_log, re.MULTILINE))

    # Check for RED commits (test) for behavior tasks
    changes_dir = os.path.join(fixture, "bp", "changes")
    archive_dir = os.path.join(changes_dir, "archive")

    all_changes = []
    if os.path.isdir(changes_dir):
        for entry in os.listdir(changes_dir):
            if entry != "archive":
                p = os.path.join(changes_dir, entry)
                if os.path.isdir(p):
                    all_changes.append(p)
    if os.path.isdir(archive_dir):
        for entry in os.listdir(archive_dir):
            p = os.path.join(archive_dir, entry)
            if os.path.isdir(p):
                all_changes.append(p)

    for change_path in all_changes:
        name = os.path.basename(change_path)
        tasks = read_file(os.path.join(change_path, "tasks.md"))

        # Count behavior tasks
        behavior_count = len(re.findall(r'\[type:behavior\]', tasks))
        if behavior_count == 0:
            continue

        # Check tasks marked [x] with commit hashes
        unchecked = len(re.findall(r'- \[ \] T-\d+', tasks))
        checked_no_hash = len(re.findall(r'- \[x\] T-\d+(?!.*<!-- commit:)', tasks))

        if unchecked > 0:
            ded = min(unchecked, 5)
            score -= ded
            checks.append({
                "check": f"{name}/tasks_completed",
                "pass": False,
                "detail": f"{unchecked} unchecked tasks"
            })

        if checked_no_hash > 0:
            ded = min(checked_no_hash, 5)
            score -= ded
            checks.append({
                "check": f"{name}/commit_hashes",
                "pass": False,
                "detail": f"{checked_no_hash} checked tasks missing commit hash"
            })

    # Check for TDD pattern: test commits should exist if there are feat commits
    if feat_commits > 0 and test_commits == 0:
        score -= 5
        checks.append({
            "check": "tdd_red_commits",
            "pass": False,
            "detail": f"Found {feat_commits} feat commits but 0 test commits (no RED phase)"
        })
    elif feat_commits > 0 and test_commits < feat_commits // 2:
        score -= 2
        checks.append({
            "check": "tdd_red_green_ratio",
            "pass": False,
            "detail": f"test:feat ratio = {test_commits}:{feat_commits} (expected ~1:1)"
        })

    score = max(score, 0)
    return {"score": score, "max": 15, "checks": checks}


def score_code_quality(fixture: str) -> dict:
    """Dimension 5: Code Quality (15 pts)"""
    score = 15
    checks = []

    # tsc --noEmit
    rc, stdout, stderr = run_cmd("npx tsc --noEmit 2>&1", fixture, timeout=60)
    if rc != 0:
        score -= 5
        checks.append({
            "check": "tsc_pass",
            "pass": False,
            "detail": f"tsc failed: {stderr[:200] or stdout[:200]}"
        })
    else:
        checks.append({"check": "tsc_pass", "pass": True, "detail": "tsc --noEmit passed"})

    # vitest run
    rc, stdout, stderr = run_cmd("npx vitest run 2>&1", fixture, timeout=120)
    if rc != 0:
        score -= 5
        checks.append({
            "check": "vitest_pass",
            "pass": False,
            "detail": f"vitest failed: {(stderr or stdout)[:200]}"
        })
    else:
        # Check test count
        test_match = re.search(r'Tests?\s+(\d+)\s+passed', stdout or stderr)
        test_count = int(test_match.group(1)) if test_match else 0
        checks.append({
            "check": "vitest_pass",
            "pass": True,
            "detail": f"vitest passed ({test_count} tests)"
        })

    # Check for `any` type abuse in src/
    src_dir = os.path.join(fixture, "src")
    if os.path.isdir(src_dir):
        any_files = []
        for py_file in find_files(src_dir, "*.ts"):
            content = read_file(py_file)
            # Count `: any` occurrences (not in comments)
            lines = content.splitlines()
            any_count = 0
            for line in lines:
                stripped = line.strip()
                if stripped.startswith('//') or stripped.startswith('*'):
                    continue
                any_count += len(re.findall(r':\s*any\b', line))
            if any_count > 0:
                any_files.append((os.path.relpath(py_file, fixture), any_count))

        if any_files:
            ded = min(len(any_files), 3)
            score -= ded
            checks.append({
                "check": "no_any_abuse",
                "pass": False,
                "detail": f"Found `: any` in {len(any_files)} files: {[f[0] for f in any_files[:5]]}"
            })

    score = max(score, 0)
    return {"score": score, "max": 15, "checks": checks}


def score_review_quality(fixture: str) -> dict:
    """Dimension 6: Review Quality (15 pts)"""
    score = 15
    checks = []
    changes_dir = os.path.join(fixture, "bp", "changes")
    archive_dir = os.path.join(changes_dir, "archive")

    all_changes = []
    if os.path.isdir(changes_dir):
        for entry in os.listdir(changes_dir):
            if entry != "archive":
                p = os.path.join(changes_dir, entry)
                if os.path.isdir(p):
                    all_changes.append(p)
    if os.path.isdir(archive_dir):
        for entry in os.listdir(archive_dir):
            p = os.path.join(archive_dir, entry)
            if os.path.isdir(p):
                all_changes.append(p)

    all_pass_no_issues = True
    total_findings = 0

    for change_path in all_changes:
        name = os.path.basename(change_path)
        review = read_file(os.path.join(change_path, "review.md"))
        if not review:
            continue

        # Check three dimensions present
        has_spec_review = "Spec Review" in review or "spec" in review.lower()
        has_quality_review = "Quality Review" in review or "quality" in review.lower()
        has_goal_review = "Goal Review" in review or "goal" in review.lower()

        if not has_spec_review:
            score -= 1
            checks.append({"check": f"{name}/spec_review", "pass": False, "detail": "Missing Spec Review section"})
        if not has_quality_review:
            score -= 1
            checks.append({"check": f"{name}/quality_review", "pass": False, "detail": "Missing Quality Review section"})
        if not has_goal_review:
            score -= 1
            checks.append({"check": f"{name}/goal_review", "pass": False, "detail": "Missing Goal Review section"})

        # Check for evidence (file:line references)
        has_evidence = bool(re.search(r'(?:bp/|src/|tests/)[\w./-]+(?::\d+)?', review))
        if not has_evidence:
            score -= 2
            checks.append({"check": f"{name}/evidence_refs", "pass": False, "detail": "No file:line evidence references found"})

        # Check for issues
        issues = re.findall(r'[-RQGD]-\d+', review)
        issue_count = len(issues)
        total_findings += issue_count
        if issue_count > 0:
            all_pass_no_issues = False

        # Check verdict
        verdict_match = re.search(r'(?:Verdict:|\*\*)(PASS|FAIL|NEEDS_REVISION)', review)
        if verdict_match:
            verdict = verdict_match.group(1).upper()
            if verdict == "PASS" and issue_count == 0:
                # All pass, no issues - suspicious
                pass  # tracked below
            elif verdict == "PASS" and issue_count > 0:
                score -= 1
                checks.append({"check": f"{name}/verdict_consistency", "pass": False, "detail": f"Verdict PASS but {issue_count} issues listed"})

    # Rubber-stamping check
    if all_pass_no_issues and total_findings == 0 and len(all_changes) > 0:
        score -= 3
        checks.append({
            "check": "no_rubber_stamping",
            "pass": False,
            "detail": f"All {len(all_changes)} changes PASS with zero findings total (rubber-stamping)"
        })

    score = max(score, 0)
    return {"score": score, "max": 15, "checks": checks}


def score_workflow_efficiency(fixture: str, run_dir: str) -> dict:
    """Dimension 7: Workflow Efficiency (10 pts)"""
    score = 10
    checks = []

    # Check for unrecoverable errors in run logs
    if run_dir and os.path.isdir(run_dir):
        error_count = 0
        for reply_file in Path(run_dir).rglob("reply.json"):
            content = read_file(str(reply_file))
            if '"error"' in content:
                error_count += 1

        if error_count > 0:
            ded = min(error_count * 2, 4)
            score -= ded
            checks.append({
                "check": "no_unrecoverable_errors",
                "pass": False,
                "detail": f"{error_count} step(s) had errors"
            })

    # Check roadmap completion
    roadmap = read_file(os.path.join(fixture, "bp", "roadmap.md"))
    total_items = len(re.findall(r'- \[.\]', roadmap))
    completed_items = len(re.findall(r'- \[x\]', roadmap))
    pending_items = len(re.findall(r'- \[ \]', roadmap))

    if total_items > 0:
        completion_rate = completed_items / total_items
        checks.append({
            "check": "roadmap_completion",
            "pass": True,
            "detail": f"{completed_items}/{total_items} items completed ({completion_rate:.0%})"
        })

    # Token usage (from reply files)
    total_input = 0
    if run_dir and os.path.isdir(run_dir):
        for reply_file in Path(run_dir).rglob("reply.json"):
            try:
                data = json.loads(read_file(str(reply_file)))
                tokens = data.get("tokens", {})
                total_input += tokens.get("input", 0)
            except (json.JSONDecodeError, KeyError):
                pass

    if total_input > 200000:
        overage = (total_input - 200000) // 50000
        score -= min(overage, 3)
        checks.append({
            "check": "token_budget",
            "pass": False,
            "detail": f"Total input tokens: {total_input:,} (budget: 200k)"
        })
    elif total_input > 0:
        checks.append({
            "check": "token_budget",
            "pass": True,
            "detail": f"Total input tokens: {total_input:,}"
        })

    score = max(score, 0)
    return {"score": score, "max": 10, "checks": checks}


# ── Main ──────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="BP E2E quality scoring")
    ap.add_argument("--fixture", required=True, help="Path to fixture project")
    ap.add_argument("--output", default=None, help="Output JSON file path")
    ap.add_argument("--run-dir", default=None, help="Path to .omp.run evidence dir")
    args = ap.parse_args()

    fixture = os.path.expanduser(args.fixture)
    if not os.path.isdir(fixture):
        print(f"ERROR: fixture not found: {fixture}", file=sys.stderr)
        sys.exit(1)

    print(f"Scoring fixture: {fixture}", flush=True)

    # Run all dimensions
    dimensions = {}
    all_checks = []

    for name, func, max_pts in [
        ("artifact_completeness", score_artifact_completeness, 15),
        ("traceability", score_traceability, 15),
        ("spec_quality", score_spec_quality, 15),
        ("tdd_compliance", score_tdd_compliance, 15),
        ("code_quality", score_code_quality, 15),
        ("review_quality", score_review_quality, 15),
        ("workflow_efficiency", lambda f: score_workflow_efficiency(f, args.run_dir), 10),
    ]:
        print(f"  Scoring {name}...", flush=True)
        result = func(fixture)
        dimensions[name] = result["score"]
        all_checks.extend(result["checks"])
        passed = sum(1 for c in result["checks"] if c.get("pass"))
        failed = sum(1 for c in result["checks"] if not c.get("pass"))
        print(f"    {result['score']}/{result['max']} ({passed} passed, {failed} failed)", flush=True)

    total = sum(dimensions.values())

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "fixture": os.path.basename(fixture),
        "score": {
            "total": total,
            "max": 100,
            "dimensions": dimensions,
        },
        "checks": all_checks,
        "note": "This is the automated mechanical score. The Test Driver agent should review and apply qualitative adjustments per SKILL.md Agent Judgment notes.",
    }

    output_path = args.output or os.path.join(fixture, "score-raw.json")
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\nTotal score: {total}/100", flush=True)
    print(f"Report saved to: {output_path}", flush=True)

    # Print breakdown
    print("\nBreakdown:", flush=True)
    for name, score in dimensions.items():
        bar = "█" * (score // 2) + "░" * (15 - score // 2) if score > 0 else "░" * 15
        print(f"  {name:25s} {score:3d}/15  {bar}", flush=True)


if __name__ == "__main__":
    main()
