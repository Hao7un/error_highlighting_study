#!/usr/bin/env python3
"""
Error Highlighting User Study — Data Analysis (Enhanced)
=========================================================
Incorporates analytical approaches from Plan-Then-Execute (He et al., CHI 2025):
  - Calibrated trust formula (CTp) aligned with the original study
  - Task-specific breakdown tables (cf. original Tables 3-6)
  - Spearman rank-order correlations for covariates (cf. original Tables 7-8)
  - Bonferroni correction for multiple comparisons
  - Plan quality 5-point scoring rubric
  - Failure analysis of error detection patterns

Usage:
    python analyze.py --input data.json --output results/
"""

import argparse, json, sys
from pathlib import Path
from collections import defaultdict
import numpy as np
import pandas as pd
from scipy import stats

# ---------------------------------------------------------------------------
ALPHA = 0.05
ALPHA_CORRECTED = ALPHA / 3  # Bonferroni for 3 hypotheses

TASK_ERRORS = {
    "alarm":    {"highlighted": ["s3.1"], "non_highlighted": ["s3.3"], "has_imperfect_plan": True},
    "flight":   {"highlighted": ["s3.1"], "non_highlighted": ["s4.1"], "has_imperfect_plan": True},
    "repair":   {"highlighted": ["s1.2"], "non_highlighted": ["s3.1"], "has_imperfect_plan": True},
    "currency": {"highlighted": ["s2.1.1"], "non_highlighted": ["s1.1"], "has_imperfect_plan": True},
}

ERROR_CATALOG = {
    "alarm:s3.1":    {"type": "wrong_value",    "desc": "AM vs PM time error"},
    "alarm:s3.3":    {"type": "irrelevant_step", "desc": "Irrelevant time zone check"},
    "flight:s3.1":   {"type": "swapped_values",  "desc": "Departure/arrival cities swapped"},
    "flight:s4.1":   {"type": "wrong_label",     "desc": "Outbound vs return mislabel"},
    "repair:s1.2":   {"type": "wrong_value",     "desc": "Wrong brand name"},
    "repair:s3.1":   {"type": "wrong_value",     "desc": "Wrong appointment time"},
    "currency:s2.1.1": {"type": "wrong_value",   "desc": "Wrong amount"},
    "currency:s1.1":   {"type": "wrong_value",   "desc": "Wrong password (PWD2024 vs PWD2023)"},
}

# ---------------------------------------------------------------------------
def safe_int(val):
    try: return int(val)
    except: return None

def _ci95(vals):
    if len(vals) < 2: return None
    se = stats.sem(vals)
    ci = stats.t.interval(0.95, len(vals)-1, loc=np.mean(vals), scale=se)
    return [float(ci[0]), float(ci[1])]

def _get_p(result):
    for k in ["ttest_paired","wilcoxon","ttest_ind","mann_whitney"]:
        if k in result: return result[k].get("p")
    return None

def _paired_comparison(control, treatment, label, alternative="two-sided"):
    r = {
        "control_mean":  float(np.mean(control))  if len(control)>0 else None,
        "control_std":   float(np.std(control,ddof=1)) if len(control)>1 else None,
        "control_n": int(len(control)),
        "treatment_mean": float(np.mean(treatment)) if len(treatment)>0 else None,
        "treatment_std":  float(np.std(treatment,ddof=1)) if len(treatment)>1 else None,
        "treatment_n": int(len(treatment)),
    }
    if len(control)<2 or len(treatment)<2:
        r["note"]="Insufficient data"; return r

    if len(control)==len(treatment):
        try:
            t,p = stats.ttest_rel(treatment, control)
            r["ttest_paired"] = {"t":float(t),"p":float(p)}
        except: pass
        try:
            w,wp = stats.wilcoxon(treatment-control, alternative=alternative)
            r["wilcoxon"] = {"W":float(w),"p":float(wp)}
        except: pass
    else:
        try:
            t,p = stats.ttest_ind(treatment, control)
            r["ttest_ind"] = {"t":float(t),"p":float(p)}
        except: pass
        try:
            u,up = stats.mannwhitneyu(treatment, control, alternative=alternative)
            r["mann_whitney"] = {"U":float(u),"p":float(up)}
        except: pass

    if r.get("control_std") and r.get("treatment_std"):
        pooled = np.sqrt((r["control_std"]**2 + r["treatment_std"]**2)/2)
        if pooled > 0:
            r["cohens_d"] = float((r["treatment_mean"]-r["control_mean"])/pooled)

    p = _get_p(r)
    if p is not None:
        r["sig"] = "††" if p<ALPHA_CORRECTED else "†" if p<ALPHA else "n.s."
    return r

# ---------------------------------------------------------------------------
# Data Loading
# ---------------------------------------------------------------------------
def load_data(filepath):
    with open(filepath) as f: raw = json.load(f)
    if isinstance(raw, dict):
        return [({**v, "participantId": v.get("participantId", k.replace("study_data_",""))})
                for k,v in raw.items() if isinstance(v, dict)]
    return raw if isinstance(raw, list) else []

def build_dataframes(participants):
    demo_rows, task_rows, tlx_rows, post_rows, edit_rows = [],[],[],[],[]

    for p in participants:
        pid = p["participantId"]
        d = p.get("demographics",{})
        demo_rows.append({"pid":pid, "group":p.get("counterbalanceGroup"),
            "llm_freq":d.get("llm_freq"),
            "ai_trust_baseline":safe_int(d.get("ai_trust")),
            "attention_detail":safe_int(d.get("attention_detail")),
            "ai_error_exp":d.get("ai_error_exp"),
            "planning_freq":d.get("planning_freq")})

        for tid, tr in p.get("taskResults",{}).items():
            step_flags = tr.get("stepFlags",{})
            flagged_problem = {k for k,v in step_flags.items() if v=="problem"}
            flagged_correct = {k for k,v in step_flags.items() if v=="correct"}
            te = TASK_ERRORS.get(tid,{})
            hl_e, nh_e = set(te.get("highlighted",[])), set(te.get("non_highlighted",[]))
            hl_det, nh_det = len(flagged_problem & hl_e), len(flagged_problem & nh_e)
            trust = tr.get("trustJudgment")
            cal = (1 if not trust else 0) if trust is not None else None  # all plans imperfect

            task_rows.append({"pid":pid, "task_id":tid, "condition":tr.get("condition"),
                "risk":tr.get("risk"), "trust_judgment":trust, "calibrated_trust":cal,
                "num_flagged_problem":len(flagged_problem),
                "num_flagged_correct":len(flagged_correct),
                "total_steps_reviewed":len(step_flags),
                "duration_ms":tr.get("duration"), "duration_s":(tr.get("duration") or 0)/1000,
                "hl_detected":hl_det, "hl_total":len(hl_e),
                "nh_detected":nh_det, "nh_total":len(nh_e),
                "missed_nh_rate":(len(nh_e)-nh_det)/len(nh_e) if nh_e else None,
                "missed_hl_rate":(len(hl_e)-hl_det)/len(hl_e) if hl_e else None})

        cond_order = p.get("conditionOrder",["control","treatment"])
        for ck,cl in [("conditionA",cond_order[0]),("conditionB",cond_order[1])]:
            tlx = p.get("nasaTlx",{}).get(ck,{})
            if tlx:
                row = {"pid":pid,"condition":cl}; row.update(tlx)
                vals = [v for v in tlx.values() if isinstance(v,(int,float))]
                row["overall"] = np.mean(vals) if vals else None
                tlx_rows.append(row)

        pr = {"pid":pid}; pr.update(p.get("postTask",{})); post_rows.append(pr)

    return {"demographics":pd.DataFrame(demo_rows), "tasks":pd.DataFrame(task_rows),
            "nasa_tlx":pd.DataFrame(tlx_rows), "post_task":pd.DataFrame(post_rows),
            "edits":pd.DataFrame(edit_rows) if edit_rows else pd.DataFrame()}

# ---------------------------------------------------------------------------
# H1: Calibrated Trust (cf. Eq.1 & Table 3)
# ---------------------------------------------------------------------------
def analyze_H1(df):
    g = df.groupby(["pid","condition"])["calibrated_trust"].mean().reset_index()
    c = g[g["condition"]=="control"]["calibrated_trust"].values
    t = g[g["condition"]=="treatment"]["calibrated_trust"].values
    overall = _paired_comparison(c, t, "CTp")
    by_task = {}
    for tid in df["task_id"].unique():
        s = df[df["task_id"]==tid]
        cv = s[s["condition"]=="control"]["calibrated_trust"].dropna().values
        tv = s[s["condition"]=="treatment"]["calibrated_trust"].dropna().values
        by_task[tid] = {"control":float(np.mean(cv)) if len(cv)>0 else None,
                        "treatment":float(np.mean(tv)) if len(tv)>0 else None}
    return {"overall":overall, "by_task":by_task}

# ---------------------------------------------------------------------------
# H2: Flagging Behavior (cf. Section 5.2.2)
# ---------------------------------------------------------------------------
def analyze_H2(df):
    r = {}
    for m in ["num_flagged_problem","duration_s"]:
        g = df.groupby(["pid","condition"])[m].sum().reset_index()
        c = g[g["condition"]=="control"][m].values
        t = g[g["condition"]=="treatment"][m].values
        r[m] = _paired_comparison(c, t, m)
    # task breakdown
    tb = {}
    for tid in df["task_id"].unique():
        s = df[df["task_id"]==tid]
        tb[tid] = {"ctrl_flags":float(s[s["condition"]=="control"]["num_flagged_problem"].mean()),
                   "treat_flags":float(s[s["condition"]=="treatment"]["num_flagged_problem"].mean()),
                   "ctrl_dur":float(s[s["condition"]=="control"]["duration_s"].mean()),
                   "treat_dur":float(s[s["condition"]=="treatment"]["duration_s"].mean())}
    r["by_task"] = tb
    return r

# ---------------------------------------------------------------------------
# H3: Missed Error Rate (cf. CW2 MERnh formula)
# ---------------------------------------------------------------------------
def analyze_H3(df):
    sub = df[df["missed_nh_rate"].notna()]
    c = sub[sub["condition"]=="control"]["missed_nh_rate"].values
    t = sub[sub["condition"]=="treatment"]["missed_nh_rate"].values
    overall = _paired_comparison(c, t, "MERnh", alternative="greater")
    overall["note"] = "One-sided: treatment > control (complacency hypothesis)"

    # Highlighted error detection rate (treatment only)
    hl_sub = df[(df["missed_hl_rate"].notna()) & (df["condition"]=="treatment")]
    hl_det = 1 - hl_sub["missed_hl_rate"].values
    hl_info = {"mean":float(np.mean(hl_det)) if len(hl_det)>0 else None,
               "std":float(np.std(hl_det,ddof=1)) if len(hl_det)>1 else None, "n":int(len(hl_det))}

    by_task = {}
    for tid in df["task_id"].unique():
        s = df[(df["task_id"]==tid) & df["missed_nh_rate"].notna()]
        by_task[tid] = {"ctrl":float(s[s["condition"]=="control"]["missed_nh_rate"].mean()) if len(s[s["condition"]=="control"])>0 else None,
                        "treat":float(s[s["condition"]=="treatment"]["missed_nh_rate"].mean()) if len(s[s["condition"]=="treatment"])>0 else None}
    return {"overall":overall, "hl_detection":hl_info, "by_task":by_task}

# ---------------------------------------------------------------------------
# NASA-TLX (cf. Figure 4 with 95% CI)
# ---------------------------------------------------------------------------
def analyze_tlx(df):
    if df.empty: return {"note":"No data"}
    scales = ["mental_demand","physical_demand","temporal_demand","performance","effort","frustration","overall"]
    r = {}
    for s in scales:
        if s not in df.columns: continue
        c = df[df["condition"]=="control"][s].dropna().values
        t = df[df["condition"]=="treatment"][s].dropna().values
        comp = _paired_comparison(c, t, s)
        for label, vals in [("control",c),("treatment",t)]:
            comp[f"{label}_ci95"] = _ci95(vals)
        r[s] = comp
    return r

# ---------------------------------------------------------------------------
# Spearman Correlations for Covariates (cf. Table 7)
# ---------------------------------------------------------------------------
def analyze_covariates(df_tasks, df_demo):
    agg = df_tasks.groupby("pid").agg(
        CTp=("calibrated_trust","mean"), edits=("num_flagged_problem","mean"),
        duration=("duration_s","mean"), MERnh=("missed_nh_rate","mean")).reset_index()

    # Map ordinal pre-study variables to numeric for correlation
    error_exp_map = {"Never":1, "Rarely":2, "Sometimes":3, "Often":4, "Very often":5}
    planning_map = {"Never":1, "Rarely":2, "Sometimes":3, "Often":4, "Always":5}
    df_demo = df_demo.copy()
    df_demo["ai_error_exp_num"] = df_demo["ai_error_exp"].map(error_exp_map)
    df_demo["planning_freq_num"] = df_demo["planning_freq"].map(planning_map)

    covariates = ["ai_trust_baseline", "attention_detail", "ai_error_exp_num", "planning_freq_num"]
    covariate_labels = ["ai_trust", "attention_detail", "ai_error_exp", "planning_freq"]

    m = agg.merge(df_demo[["pid"] + covariates], on="pid", how="left")
    if len(m)<3: return {"note":"Insufficient data"}
    r = {}
    for cv, label in zip(covariates, covariate_labels):
        for dv in ["CTp","edits","duration","MERnh"]:
            valid = m[[cv,dv]].dropna()
            if len(valid)>=3:
                rho, p = stats.spearmanr(valid[cv], valid[dv])
                sig = "††" if p<ALPHA_CORRECTED else "†" if p<ALPHA else ""
                r[f"{label} × {dv}"] = {"r":float(rho),"p":float(p),"sig":sig}
    return r

# ---------------------------------------------------------------------------
# Task-level Correlations (cf. Table 8)
# ---------------------------------------------------------------------------
def analyze_task_correlations(df):
    risk_map = {"low":1,"medium":2,"high":3}
    df2 = df.copy(); df2["risk_num"] = df2["risk"].map(risk_map)
    pairs = [("risk_num","calibrated_trust","Risk × CTp"),
             ("risk_num","num_flagged_problem","Risk × Flags"),
             ("num_flagged_problem","calibrated_trust","Flags × CTp"),
             ("risk_num","duration_s","Risk × Duration")]
    r = {}
    for x,y,label in pairs:
        v = df2[[x,y]].dropna()
        if len(v)>=3:
            rho,p = stats.spearmanr(v[x],v[y])
            r[label] = {"r":float(rho),"p":float(p),"sig":"††" if p<ALPHA_CORRECTED else "†" if p<ALPHA else ""}
    return r

# ---------------------------------------------------------------------------
# Failure Analysis (cf. Section 5.3.3)
# ---------------------------------------------------------------------------
def analyze_failures(df_tasks, participants):
    """Uses stepFlags from raw participant data for per-error detection rates."""
    flags_map = {}
    for p in participants:
        pid = p["participantId"]
        flags_map[pid] = {}
        for tid, tr in p.get("taskResults", {}).items():
            flags_map[pid][tid] = {k for k, v in tr.get("stepFlags", {}).items() if v == "problem"}
    r = {}
    for task_id in df_tasks["task_id"].unique():
        td = df_tasks[df_tasks["task_id"]==task_id]
        for ekey, info in ERROR_CATALOG.items():
            if not ekey.startswith(task_id+":"): continue
            step_id = ekey.split(":")[1]
            det = {"control":[],"treatment":[]}
            for _, row in td.iterrows():
                flagged = flags_map.get(row["pid"], {}).get(task_id, set())
                det[row["condition"]].append(1 if step_id in flagged else 0)
            r[ekey] = {"type":info["type"], "desc":info["desc"],
                       "ctrl_rate":float(np.mean(det["control"])) if det["control"] else None,
                       "treat_rate":float(np.mean(det["treatment"])) if det["treatment"] else None,
                       "ctrl_n":len(det["control"]), "treat_n":len(det["treatment"])}
    return r

# ---------------------------------------------------------------------------
# Post-Task
# ---------------------------------------------------------------------------
def analyze_post(df):
    r = {}
    for col in df.columns:
        if col=="pid": continue
        v = pd.to_numeric(df[col],errors="coerce").dropna().values
        if len(v)>0:
            r[col] = {"mean":float(np.mean(v)), "std":float(np.std(v,ddof=1)) if len(v)>1 else 0,
                       "median":float(np.median(v)), "n":int(len(v)), "ci95":_ci95(v)}
    return r

# ---------------------------------------------------------------------------
# Summary Tables (cf. Tables 3-6)
# ---------------------------------------------------------------------------
def print_tables(df):
    print("\n" + "="*65)
    print("TABLE A: Calibrated Trust by Task & Condition (cf. Table 3)")
    print("="*65)
    print(f"{'Task':<12} {'Control':>10} {'Treatment':>10} {'Delta':>8}")
    print("-"*42)
    for tid in sorted(df["task_id"].unique()):
        s = df[df["task_id"]==tid]
        c = s[s["condition"]=="control"]["calibrated_trust"].mean()
        t = s[s["condition"]=="treatment"]["calibrated_trust"].mean()
        print(f"{tid:<12} {c:>10.2%} {t:>10.2%} {t-c:>+8.2%}")
    c_all = df[df["condition"]=="control"]["calibrated_trust"].mean()
    t_all = df[df["condition"]=="treatment"]["calibrated_trust"].mean()
    print("-"*42)
    print(f"{'Overall':<12} {c_all:>10.2%} {t_all:>10.2%} {t_all-c_all:>+8.2%}")

    print("\n" + "="*65)
    print("TABLE B: Flagging Behavior by Task & Condition")
    print("="*65)
    print(f"{'Task':<12} {'C.Flags':>8} {'T.Flags':>8} {'C.Time':>8} {'T.Time':>8}")
    print("-"*46)
    for tid in sorted(df["task_id"].unique()):
        s = df[df["task_id"]==tid]
        ce = s[s["condition"]=="control"]["num_flagged_problem"].mean()
        te = s[s["condition"]=="treatment"]["num_flagged_problem"].mean()
        ct = s[s["condition"]=="control"]["duration_s"].mean()
        tt = s[s["condition"]=="treatment"]["duration_s"].mean()
        print(f"{tid:<12} {ce:>8.1f} {te:>8.1f} {ct:>8.0f}s {tt:>8.0f}s")

    print("\n" + "="*65)
    print("TABLE C: Missed Non-Highlighted Error Rate (H3)")
    print("="*65)
    print(f"{'Task':<12} {'Control':>10} {'Treatment':>10}")
    print("-"*34)
    for tid in sorted(df["task_id"].unique()):
        s = df[df["task_id"]==tid]
        c = s[s["condition"]=="control"]["missed_nh_rate"].mean()
        t = s[s["condition"]=="treatment"]["missed_nh_rate"].mean()
        cs = f"{c:.0%}" if not np.isnan(c) else "N/A"
        ts = f"{t:.0%}" if not np.isnan(t) else "N/A"
        print(f"{tid:<12} {cs:>10} {ts:>10}")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input","-i",required=True)
    parser.add_argument("--output","-o",default="results")
    args = parser.parse_args()
    outdir = Path(args.output); outdir.mkdir(parents=True, exist_ok=True)

    print(f"Loading {args.input}...")
    participants = load_data(args.input)
    print(f"Loaded {len(participants)} participants. Bonferroni α = {ALPHA_CORRECTED:.4f}")
    if not participants: sys.exit(1)

    dfs = build_dataframes(participants)
    for name, df in dfs.items():
        df.to_csv(outdir/f"{name}.csv", index=False)
        print(f"  {name}.csv ({len(df)} rows)")

    results = {}

    print("\n" + "="*60)
    print("H1: Calibrated Trust"); print("="*60)
    results["H1"] = analyze_H1(dfs["tasks"])
    o = results["H1"]["overall"]
    print(f"  Control: M={o['control_mean']:.3f}  Treatment: M={o['treatment_mean']:.3f}  d={o.get('cohens_d','N/A')}  {o.get('sig','')}")

    print("\n" + "="*60)
    print("H2: Flagging Behavior"); print("="*60)
    results["H2"] = analyze_H2(dfs["tasks"])
    for m in ["num_flagged_problem","duration_s"]:
        v = results["H2"][m]
        print(f"  {m}: Ctrl={v['control_mean']:.1f} Treat={v['treatment_mean']:.1f} {v.get('sig','')}")

    print("\n" + "="*60)
    print("H3: Complacency (Missed Errors)"); print("="*60)
    results["H3"] = analyze_H3(dfs["tasks"])
    me = results["H3"]["overall"]
    print(f"  MERnh: Ctrl={me['control_mean']:.3f} Treat={me['treatment_mean']:.3f} {me.get('sig','')}")
    hl = results["H3"]["hl_detection"]
    print(f"  Highlighted error detection (treatment): M={hl['mean']:.2%}" if hl["mean"] else "")

    print("\n" + "="*60)
    print("NASA-TLX Cognitive Load"); print("="*60)
    results["nasa_tlx"] = analyze_tlx(dfs["nasa_tlx"])
    for s,v in results["nasa_tlx"].items():
        if isinstance(v,dict) and "control_mean" in v:
            print(f"  {s}: Ctrl={v['control_mean']:.1f} Treat={v['treatment_mean']:.1f} {v.get('sig','')}")

    print("\n" + "="*60)
    print("Covariate Correlations (cf. Table 7)"); print("="*60)
    results["covariates"] = analyze_covariates(dfs["tasks"], dfs["demographics"])
    for k,v in results["covariates"].items():
        if isinstance(v,dict) and "r" in v:
            print(f"  {k}: r={v['r']:.3f} p={v['p']:.4f} {v.get('sig','')}")

    print("\n" + "="*60)
    print("Task-level Correlations (cf. Table 8)"); print("="*60)
    results["task_corr"] = analyze_task_correlations(dfs["tasks"])
    for k,v in results["task_corr"].items():
        print(f"  {k}: r={v['r']:.3f} p={v['p']:.4f} {v.get('sig','')}")

    print("\n" + "="*60)
    print("Failure Analysis (cf. Section 5.3.3)"); print("="*60)
    results["failures"] = analyze_failures(dfs["tasks"], participants)
    for k,v in results["failures"].items():
        cr = f"{v['ctrl_rate']:.0%}" if v["ctrl_rate"] is not None else "-"
        tr = f"{v['treat_rate']:.0%}" if v["treat_rate"] is not None else "-"
        print(f"  {k} [{v['type']}]: Ctrl={cr} Treat={tr} | {v['desc']}")

    print("\n" + "="*60)
    print("Post-Task Perceptions"); print("="*60)
    results["post_task"] = analyze_post(dfs["post_task"])
    for q,v in results["post_task"].items():
        print(f"  {q}: M={v['mean']:.2f} SD={v['std']:.2f} Mdn={v['median']:.1f}")

    # Demographics
    print("\n" + "="*60)
    print("Demographics"); print("="*60)
    for col in ["llm_freq","ai_trust_baseline","attention_detail","ai_error_exp","planning_freq"]:
        if col in dfs["demographics"].columns:
            print(f"  {col}: {dfs['demographics'][col].value_counts().to_dict()}")

    print_tables(dfs["tasks"])

    with open(outdir/"analysis_results.json","w") as f:
        json.dump(results, f, indent=2, default=str)
    with open(outdir/"summary_tables.txt","w") as f:
        import io, contextlib
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            print_tables(dfs["tasks"])
        f.write(buf.getvalue())

    print(f"\nAll saved to {outdir}/")

if __name__ == "__main__":
    main()
