#!/usr/bin/env python3
"""
Error Highlighting User Study — Visualisation
==============================================
Generates publication-quality figures for the CW3 report.

Usage:
    python visualize.py --input results/ --output figures/
    
Reads CSV files and analysis_results.json from the results directory.
"""

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker

# ---- Style ----
plt.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": ["Helvetica", "Arial", "DejaVu Sans"],
    "font.size": 11,
    "axes.titlesize": 13,
    "axes.labelsize": 12,
    "figure.dpi": 200,
    "savefig.dpi": 200,
    "savefig.bbox": "tight",
    "axes.spines.top": False,
    "axes.spines.right": False,
})

CONTROL_COLOR = "#5a9bd5"
TREATMENT_COLOR = "#e06d50"
COLORS = [CONTROL_COLOR, TREATMENT_COLOR]


def load_results(results_dir: Path):
    with open(results_dir / "analysis_results.json") as f:
        analysis = json.load(f)
    dfs = {}
    for name in ["demographics", "tasks", "nasa_tlx", "post_task", "edits"]:
        path = results_dir / f"{name}.csv"
        if path.exists():
            dfs[name] = pd.read_csv(path)
    return analysis, dfs


# ---------------------------------------------------------------------------
# Figure 1: Calibrated Trust by Condition
# ---------------------------------------------------------------------------
def fig_calibrated_trust(analysis, dfs, outdir):
    ct = analysis.get("calibrated_trust", {})
    if "note" in ct:
        print("  Skipping calibrated trust figure (insufficient data)")
        return
    
    means = [ct["control_mean"], ct["treatment_mean"]]
    stds = [ct.get("control_std", 0), ct.get("treatment_std", 0)]
    labels = ["Control\n(No Highlighting)", "Treatment\n(Error Highlighting)"]
    
    fig, ax = plt.subplots(figsize=(5, 4))
    bars = ax.bar(labels, means, yerr=stds, capsize=6, color=COLORS, 
                  edgecolor="white", linewidth=1.5, width=0.5)
    
    ax.set_ylabel("Calibrated Trust (CTp)")
    ax.set_title("Calibrated Trust by Condition")
    ax.set_ylim(0, 1.05)
    ax.yaxis.set_major_formatter(mticker.PercentFormatter(1.0))
    
    p_val = ct.get("p_value", 1)
    sig = "***" if p_val < 0.001 else "**" if p_val < 0.01 else "*" if p_val < 0.05 else "n.s."
    ax.text(0.5, max(means) + max(stds) + 0.05, f"p = {p_val:.3f} ({sig})",
            ha="center", fontsize=10, color="#444")
    
    for bar, mean in zip(bars, means):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.02,
                f"{mean:.1%}", ha="center", va="bottom", fontsize=10, fontweight="bold")
    
    fig.savefig(outdir / "fig1_calibrated_trust.png")
    plt.close(fig)
    print("  Saved fig1_calibrated_trust.png")


# ---------------------------------------------------------------------------
# Figure 2: Number of Edits by Condition
# ---------------------------------------------------------------------------
def fig_editing_behavior(analysis, dfs, outdir):
    df = dfs.get("tasks")
    if df is None or df.empty:
        return
    
    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    
    # Edits
    for i, (metric, title, ylabel) in enumerate([
        ("num_edits", "Number of Edits", "Edits per participant"),
        ("duration_s", "Time Spent per Task", "Duration (seconds)"),
    ]):
        ax = axes[i]
        control = df[df["condition"] == "control"][metric].dropna()
        treatment = df[df["condition"] == "treatment"][metric].dropna()
        
        bp = ax.boxplot([control, treatment], tick_labels=["Control", "Treatment"],
                       patch_artist=True, widths=0.4,
                       medianprops=dict(color="black", linewidth=2))
        for patch, color in zip(bp["boxes"], COLORS):
            patch.set_facecolor(color)
            patch.set_alpha(0.7)
        
        ax.set_title(title)
        ax.set_ylabel(ylabel)
    
    fig.tight_layout()
    fig.savefig(outdir / "fig2_editing_behavior.png")
    plt.close(fig)
    print("  Saved fig2_editing_behavior.png")


# ---------------------------------------------------------------------------
# Figure 3: NASA-TLX Scores
# ---------------------------------------------------------------------------
def fig_nasa_tlx(analysis, dfs, outdir):
    df = dfs.get("nasa_tlx")
    if df is None or df.empty:
        return
    
    subscales = ["mental_demand", "physical_demand", "temporal_demand",
                 "performance", "effort", "frustration"]
    labels = ["Mental\nDemand", "Physical\nDemand", "Temporal\nDemand",
              "Performance", "Effort", "Frustration"]
    
    control_means = []
    treatment_means = []
    control_stds = []
    treatment_stds = []
    
    for s in subscales:
        if s not in df.columns:
            control_means.append(0)
            treatment_means.append(0)
            control_stds.append(0)
            treatment_stds.append(0)
            continue
        c = df[df["condition"] == "control"][s].dropna()
        t = df[df["condition"] == "treatment"][s].dropna()
        control_means.append(c.mean() if len(c) > 0 else 0)
        treatment_means.append(t.mean() if len(t) > 0 else 0)
        control_stds.append(c.std() if len(c) > 1 else 0)
        treatment_stds.append(t.std() if len(t) > 1 else 0)
    
    x = np.arange(len(subscales))
    width = 0.35
    
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.bar(x - width/2, control_means, width, yerr=control_stds, capsize=4,
           label="Control", color=CONTROL_COLOR, alpha=0.8)
    ax.bar(x + width/2, treatment_means, width, yerr=treatment_stds, capsize=4,
           label="Treatment", color=TREATMENT_COLOR, alpha=0.8)
    
    ax.set_ylabel("NASA-TLX Score (0–100)")
    ax.set_title("Cognitive Load by Condition (NASA-TLX)")
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=9)
    ax.set_ylim(0, 105)
    ax.legend()
    
    fig.tight_layout()
    fig.savefig(outdir / "fig3_nasa_tlx.png")
    plt.close(fig)
    print("  Saved fig3_nasa_tlx.png")


# ---------------------------------------------------------------------------
# Figure 4: Post-Task Perceptions
# ---------------------------------------------------------------------------
def fig_post_task(analysis, dfs, outdir):
    df = dfs.get("post_task")
    if df is None or df.empty:
        return
    
    questions = {
        "perceived_usefulness": "Helpfulness",
        "perceived_reliability": "Reliability",
        "confidence_with_highlighting": "Confidence",
        "attention_allocation": "Attention\nAllocation",
        "complacency_awareness": "Complacency\nAwareness",
        "overall_preference": "Overall\nPreference",
    }
    
    means = []
    stds = []
    labels = []
    
    for qid, label in questions.items():
        if qid in df.columns:
            vals = pd.to_numeric(df[qid], errors="coerce").dropna()
            means.append(vals.mean())
            stds.append(vals.std() if len(vals) > 1 else 0)
            labels.append(label)
    
    if not means:
        return
    
    fig, ax = plt.subplots(figsize=(8, 4.5))
    x = np.arange(len(labels))
    bars = ax.bar(x, means, yerr=stds, capsize=5, color="#7eb77f", 
                  edgecolor="white", linewidth=1.5, width=0.5)
    
    ax.set_ylabel("Likert Score (1–7)")
    ax.set_title("Post-Task Perceptions of Error Highlighting")
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=9)
    ax.set_ylim(0, 7.5)
    ax.axhline(y=4, color="#999", linestyle="--", linewidth=0.8, label="Neutral")
    ax.legend(fontsize=9)
    
    for bar, m in zip(bars, means):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.15,
                f"{m:.1f}", ha="center", va="bottom", fontsize=9, fontweight="bold")
    
    fig.tight_layout()
    fig.savefig(outdir / "fig4_post_task.png")
    plt.close(fig)
    print("  Saved fig4_post_task.png")


# ---------------------------------------------------------------------------
# Figure 5: Missed Error Rate
# ---------------------------------------------------------------------------
def fig_missed_errors(analysis, outdir):
    me = analysis.get("missed_errors", {})
    if not me or "note" in me and me.get("control_miss_rate_mean", 0) == 0:
        print("  Skipping missed errors figure (insufficient data)")
        return
    
    means = [me.get("control_miss_rate_mean", 0), me.get("treatment_miss_rate_mean", 0)]
    labels = ["Control", "Treatment"]
    
    fig, ax = plt.subplots(figsize=(5, 4))
    bars = ax.bar(labels, means, color=COLORS, edgecolor="white", 
                  linewidth=1.5, width=0.4)
    
    ax.set_ylabel("Missed Error Rate (MERnh)")
    ax.set_title("Missed Error Rate on Non-Highlighted Steps")
    ax.set_ylim(0, 1.05)
    ax.yaxis.set_major_formatter(mticker.PercentFormatter(1.0))
    
    p_val = me.get("p_value", 1)
    sig = "***" if p_val < 0.001 else "**" if p_val < 0.01 else "*" if p_val < 0.05 else "n.s."
    ax.text(0.5, max(means) + 0.05, f"p = {p_val:.3f} ({sig})",
            ha="center", fontsize=10, color="#444")
    
    for bar, m in zip(bars, means):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.02,
                f"{m:.1%}", ha="center", va="bottom", fontsize=10, fontweight="bold")
    
    fig.tight_layout()
    fig.savefig(outdir / "fig5_missed_errors.png")
    plt.close(fig)
    print("  Saved fig5_missed_errors.png")


# ---------------------------------------------------------------------------
# Figure 6: Demographics Overview
# ---------------------------------------------------------------------------
def fig_demographics(dfs, outdir):
    df = dfs.get("demographics")
    if df is None or df.empty:
        return
    
    fig, axes = plt.subplots(1, 3, figsize=(12, 4))
    
    for ax, col, title in zip(axes, 
                               ["age", "gender", "llm_freq"],
                               ["Age Distribution", "Gender", "LLM Usage Frequency"]):
        if col not in df.columns:
            continue
        counts = df[col].value_counts()
        ax.barh(counts.index, counts.values, color="#7eb77f", edgecolor="white")
        ax.set_title(title)
        ax.set_xlabel("Count")
    
    fig.tight_layout()
    fig.savefig(outdir / "fig6_demographics.png")
    plt.close(fig)
    print("  Saved fig6_demographics.png")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Generate study visualisations")
    parser.add_argument("--input", "-i", default="results", help="Results directory")
    parser.add_argument("--output", "-o", default="figures", help="Output directory for figures")
    args = parser.parse_args()

    results_dir = Path(args.input)
    outdir = Path(args.output)
    outdir.mkdir(parents=True, exist_ok=True)

    print(f"Loading results from {results_dir}/...")
    analysis, dfs = load_results(results_dir)

    print("Generating figures...")
    fig_calibrated_trust(analysis, dfs, outdir)
    fig_editing_behavior(analysis, dfs, outdir)
    fig_nasa_tlx(analysis, dfs, outdir)
    fig_post_task(analysis, dfs, outdir)
    fig_missed_errors(analysis, outdir)
    fig_demographics(dfs, outdir)

    print(f"\nAll figures saved to {outdir}/")


if __name__ == "__main__":
    main()
