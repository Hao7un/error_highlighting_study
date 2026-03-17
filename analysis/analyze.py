#!/usr/bin/env python3
"""
Error Highlighting User Study — Data Analysis
=============================================
Analyses the collected study data and produces statistical results
and visualisations for the CW3 report.

Usage:
    python analyze.py --input data.json --output results/

The input JSON should be exported from Firebase (Firestore export)
or assembled from the local JSON backups downloaded by participants.
"""

import argparse
import json
import sys
from pathlib import Path
from collections import defaultdict

import numpy as np
import pandas as pd
from scipy import stats

# ---------------------------------------------------------------------------
# Data Loading
# ---------------------------------------------------------------------------

def load_data(filepath: str) -> list[dict]:
    """Load participant data from JSON file."""
    with open(filepath, "r") as f:
        raw = json.load(f)

    # Handle different export formats
    if isinstance(raw, dict):
        # Firebase export: {"participant_id": {data}, ...}
        # OR local backup: {"study_data_Pxxx": {data}, ...}
        participants = []
        for key, val in raw.items():
            if isinstance(val, dict):
                if "participantId" not in val:
                    val["participantId"] = key.replace("study_data_", "")
                participants.append(val)
        return participants
    elif isinstance(raw, list):
        return raw
    else:
        raise ValueError("Unexpected data format")


def build_dataframes(participants: list[dict]) -> dict[str, pd.DataFrame]:
    """Convert raw participant data into structured DataFrames."""
    
    # --- Demographics ---
    demo_rows = []
    for p in participants:
        d = p.get("demographics", {})
        demo_rows.append({
            "pid": p["participantId"],
            "group": p.get("counterbalanceGroup"),
            "age": d.get("age"),
            "gender": d.get("gender"),
            "education": d.get("education"),
            "llm_freq": d.get("llm_freq"),
            "llm_familiarity": d.get("llm_familiarity"),
            "ai_trust": d.get("ai_trust"),
        })
    df_demo = pd.DataFrame(demo_rows)

    # --- Task Results ---
    task_rows = []
    for p in participants:
        pid = p["participantId"]
        tasks = p.get("taskResults", {})
        for tid, tr in tasks.items():
            task_rows.append({
                "pid": pid,
                "task_id": tid,
                "condition": tr.get("condition"),
                "risk": tr.get("risk"),
                "trust_judgment": tr.get("trustJudgment"),
                "num_edits": len(tr.get("edits", [])),
                "duration_ms": tr.get("duration"),
                "duration_s": (tr.get("duration") or 0) / 1000,
                "edited_plan_length": len(tr.get("editedPlan", [])),
            })
    df_tasks = pd.DataFrame(task_rows)

    # --- NASA-TLX ---
    tlx_rows = []
    for p in participants:
        pid = p["participantId"]
        cond_order = p.get("conditionOrder", ["control", "treatment"])
        for cond_key, cond_label in [("conditionA", cond_order[0]), ("conditionB", cond_order[1])]:
            tlx = p.get("nasaTlx", {}).get(cond_key, {})
            if tlx:
                row = {"pid": pid, "condition": cond_label}
                row.update(tlx)
                row["overall"] = np.mean(list(tlx.values()))
                tlx_rows.append(row)
    df_tlx = pd.DataFrame(tlx_rows)

    # --- Post-Task Likert ---
    post_rows = []
    for p in participants:
        row = {"pid": p["participantId"]}
        row.update(p.get("postTask", {}))
        post_rows.append(row)
    df_post = pd.DataFrame(post_rows)

    # --- Edits detail ---
    edit_rows = []
    for p in participants:
        pid = p["participantId"]
        tasks = p.get("taskResults", {})
        for tid, tr in tasks.items():
            for edit in tr.get("edits", []):
                edit_rows.append({
                    "pid": pid,
                    "task_id": tid,
                    "condition": tr.get("condition"),
                    "step_id": edit.get("stepId"),
                    "action": edit.get("action"),
                    "old_text": edit.get("oldText"),
                    "new_text": edit.get("newText"),
                })
    df_edits = pd.DataFrame(edit_rows) if edit_rows else pd.DataFrame()

    return {
        "demographics": df_demo,
        "tasks": df_tasks,
        "nasa_tlx": df_tlx,
        "post_task": df_post,
        "edits": df_edits,
    }


# ---------------------------------------------------------------------------
# Statistical Analysis
# ---------------------------------------------------------------------------

def analyze_calibrated_trust(df_tasks: pd.DataFrame) -> dict:
    """
    H1: Error highlighting improves calibrated trust.
    CTp = proportion of correct trust judgments per condition.
    
    For tasks with seeded errors: correct = distrust (trust=False)
    For tasks without seeded errors: correct = trust (trust=True)
    (All our tasks have seeded errors, so correct = False for imperfect plans)
    """
    # All tasks have errors, so the "correct" trust judgment is False
    df = df_tasks.copy()
    df["correct_trust"] = ~df["trust_judgment"]  # Distrust is correct
    
    grouped = df.groupby(["pid", "condition"])["correct_trust"].mean().reset_index()
    control = grouped[grouped["condition"] == "control"]["correct_trust"].values
    treatment = grouped[grouped["condition"] == "treatment"]["correct_trust"].values

    if len(control) < 2 or len(treatment) < 2:
        return {"note": "Insufficient data for statistical test"}

    # Paired test (within-subjects)
    if len(control) == len(treatment):
        t_stat, p_val = stats.ttest_rel(treatment, control)
        w_stat, w_p = stats.wilcoxon(treatment, control, alternative="two-sided")
    else:
        t_stat, p_val = stats.ttest_ind(treatment, control)
        w_stat, w_p = stats.mannwhitneyu(treatment, control, alternative="two-sided")

    return {
        "control_mean": float(np.mean(control)),
        "control_std": float(np.std(control, ddof=1)) if len(control) > 1 else 0,
        "treatment_mean": float(np.mean(treatment)),
        "treatment_std": float(np.std(treatment, ddof=1)) if len(treatment) > 1 else 0,
        "t_stat": float(t_stat),
        "p_value": float(p_val),
        "wilcoxon_stat": float(w_stat),
        "wilcoxon_p": float(w_p),
        "cohens_d": float((np.mean(treatment) - np.mean(control)) / 
                         np.sqrt((np.std(control, ddof=1)**2 + np.std(treatment, ddof=1)**2) / 2))
                   if np.std(control, ddof=1) + np.std(treatment, ddof=1) > 0 else 0,
    }


def analyze_editing_behavior(df_tasks: pd.DataFrame) -> dict:
    """
    H2: Error highlighting leads to higher plan quality (more edits, better corrections).
    """
    grouped = df_tasks.groupby(["pid", "condition"]).agg(
        num_edits=("num_edits", "sum"),
        mean_duration=("duration_s", "mean"),
    ).reset_index()

    control = grouped[grouped["condition"] == "control"]
    treatment = grouped[grouped["condition"] == "treatment"]

    results = {}
    for metric in ["num_edits", "mean_duration"]:
        c = control[metric].values
        t = treatment[metric].values
        if len(c) >= 2 and len(t) >= 2 and len(c) == len(t):
            stat, p = stats.ttest_rel(t, c)
        elif len(c) >= 2 and len(t) >= 2:
            stat, p = stats.ttest_ind(t, c)
        else:
            stat, p = float("nan"), float("nan")
        results[metric] = {
            "control_mean": float(np.mean(c)) if len(c) > 0 else 0,
            "treatment_mean": float(np.mean(t)) if len(t) > 0 else 0,
            "t_stat": float(stat),
            "p_value": float(p),
        }
    return results


def analyze_nasa_tlx(df_tlx: pd.DataFrame) -> dict:
    """
    Compare cognitive load between conditions.
    """
    if df_tlx.empty:
        return {"note": "No NASA-TLX data"}
    
    control = df_tlx[df_tlx["condition"] == "control"]
    treatment = df_tlx[df_tlx["condition"] == "treatment"]
    
    results = {}
    subscales = ["mental_demand", "physical_demand", "temporal_demand",
                 "performance", "effort", "frustration", "overall"]
    
    for scale in subscales:
        if scale not in df_tlx.columns:
            continue
        c = control[scale].dropna().values
        t = treatment[scale].dropna().values
        if len(c) >= 2 and len(t) >= 2 and len(c) == len(t):
            stat, p = stats.ttest_rel(t, c)
        elif len(c) >= 2 and len(t) >= 2:
            stat, p = stats.ttest_ind(t, c)
        else:
            stat, p = float("nan"), float("nan")
        results[scale] = {
            "control_mean": float(np.mean(c)) if len(c) > 0 else 0,
            "control_std": float(np.std(c, ddof=1)) if len(c) > 1 else 0,
            "treatment_mean": float(np.mean(t)) if len(t) > 0 else 0,
            "treatment_std": float(np.std(t, ddof=1)) if len(t) > 1 else 0,
            "t_stat": float(stat),
            "p_value": float(p),
        }
    return results


def analyze_missed_errors(participants: list[dict]) -> dict:
    """
    H3: Error highlighting increases missed error rate on non-highlighted steps.
    
    Check whether participants fixed non-highlighted errors across conditions.
    """
    # Map of task -> non-highlighted error step IDs
    nh_errors = {}
    for task in TASK_ERROR_MAP:
        nh_errors[task["id"]] = task["non_highlighted_error_steps"]
    
    results_by_condition = defaultdict(list)
    
    for p in participants:
        task_results = p.get("taskResults", {})
        for tid, tr in task_results.items():
            if tid not in nh_errors or not nh_errors[tid]:
                continue
            condition = tr.get("condition")
            edits = tr.get("edits", [])
            edited_step_ids = {e["stepId"] for e in edits if e.get("action") in ("edit", "delete")}
            
            total_nh = len(nh_errors[tid])
            detected = len(edited_step_ids & set(nh_errors[tid]))
            missed = total_nh - detected
            miss_rate = missed / total_nh if total_nh > 0 else 0
            
            results_by_condition[condition].append(miss_rate)
    
    control_rates = results_by_condition.get("control", [])
    treatment_rates = results_by_condition.get("treatment", [])
    
    if len(control_rates) >= 2 and len(treatment_rates) >= 2:
        stat, p = stats.mannwhitneyu(treatment_rates, control_rates, alternative="greater")
    else:
        stat, p = float("nan"), float("nan")
    
    return {
        "control_miss_rate_mean": float(np.mean(control_rates)) if control_rates else 0,
        "treatment_miss_rate_mean": float(np.mean(treatment_rates)) if treatment_rates else 0,
        "mann_whitney_u": float(stat),
        "p_value": float(p),
        "note": "One-sided test: treatment > control (complacency hypothesis)",
    }


# Task error mapping for missed error analysis
TASK_ERROR_MAP = [
    {"id": "alarm", "non_highlighted_error_steps": ["s3.3"]},
    {"id": "flight", "non_highlighted_error_steps": ["s4.1"]},
    {"id": "repair", "non_highlighted_error_steps": ["s3.1"]},
    {"id": "currency", "non_highlighted_error_steps": ["s2"]},  # structural error
]


# ---------------------------------------------------------------------------
# Post-Task Analysis
# ---------------------------------------------------------------------------

def analyze_post_task(df_post: pd.DataFrame) -> dict:
    """Descriptive statistics for post-task Likert scales."""
    results = {}
    for col in df_post.columns:
        if col == "pid":
            continue
        vals = df_post[col].dropna().values
        if len(vals) > 0:
            results[col] = {
                "mean": float(np.mean(vals)),
                "std": float(np.std(vals, ddof=1)) if len(vals) > 1 else 0,
                "median": float(np.median(vals)),
                "n": int(len(vals)),
            }
    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Analyse user study data")
    parser.add_argument("--input", "-i", required=True, help="Path to JSON data file")
    parser.add_argument("--output", "-o", default="results", help="Output directory")
    args = parser.parse_args()

    outdir = Path(args.output)
    outdir.mkdir(parents=True, exist_ok=True)

    print(f"Loading data from {args.input}...")
    participants = load_data(args.input)
    print(f"Loaded {len(participants)} participants.")

    if not participants:
        print("No data to analyse. Exiting.")
        sys.exit(1)

    dfs = build_dataframes(participants)

    # Save cleaned CSVs
    for name, df in dfs.items():
        df.to_csv(outdir / f"{name}.csv", index=False)
        print(f"  Saved {name}.csv ({len(df)} rows)")

    # Run analyses
    results = {}

    print("\n--- H1: Calibrated Trust ---")
    results["calibrated_trust"] = analyze_calibrated_trust(dfs["tasks"])
    for k, v in results["calibrated_trust"].items():
        print(f"  {k}: {v}")

    print("\n--- H2: Editing Behavior / Plan Quality ---")
    results["editing_behavior"] = analyze_editing_behavior(dfs["tasks"])
    for metric, vals in results["editing_behavior"].items():
        print(f"  {metric}:")
        for k, v in vals.items():
            print(f"    {k}: {v}")

    print("\n--- NASA-TLX Cognitive Load ---")
    results["nasa_tlx"] = analyze_nasa_tlx(dfs["nasa_tlx"])
    for scale, vals in results["nasa_tlx"].items():
        print(f"  {scale}: control={vals.get('control_mean', 0):.1f}, treatment={vals.get('treatment_mean', 0):.1f}, p={vals.get('p_value', 'nan')}")

    print("\n--- H3: Missed Error Rate (Complacency) ---")
    results["missed_errors"] = analyze_missed_errors(participants)
    for k, v in results["missed_errors"].items():
        print(f"  {k}: {v}")

    print("\n--- Post-Task Perceptions ---")
    results["post_task"] = analyze_post_task(dfs["post_task"])
    for q, vals in results["post_task"].items():
        print(f"  {q}: M={vals['mean']:.2f}, SD={vals['std']:.2f}, n={vals['n']}")

    # Demographics summary
    print("\n--- Demographics Summary ---")
    df_d = dfs["demographics"]
    for col in ["age", "gender", "education", "llm_freq"]:
        if col in df_d.columns:
            print(f"  {col}:")
            print(f"    {df_d[col].value_counts().to_dict()}")

    # Save all results
    with open(outdir / "analysis_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\nAll results saved to {outdir}/")


if __name__ == "__main__":
    main()
