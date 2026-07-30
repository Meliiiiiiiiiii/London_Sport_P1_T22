"""
London Sport — Physical Activity Supply-Demand Priority Index
================================================================
An ML decision-support pipeline for LONDON SPORT (the strategic body), not
an end-user app. It answers: "which boroughs / demographic segments should
London Sport prioritise for investment, and why?"

Three data sources:
  - OPENACTIVE_MERGED.csv                      -> SUPPLY (bookable sessions)
  - activelives_population_profile_merged.csv  -> DEMAND (inactivity by demographic)
  - gapscore_merged_final.csv                  -> DEMAND (borough-level, unstratified, all years)

Pipeline stages:
  1. Feature engineering: borough-level supply features from OpenActive
  2. Population proxy from Active Lives (Gend3 weighted_base sums)
  3. Supervised model: predict pct_inactive from supply features
     (Leave-One-Out CV given small n; SHAP for explainability)
  4. Trend analysis: 7-year inactivity trajectory per borough (gapscore)
  5. Unsupervised segmentation: cluster boroughs by demographic inactivity profile
  6. Composite Priority Index: combines need + supply gap + trend + model residual
  7. Outputs: priority_table.csv + charts + this script
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import LeaveOneOut
from sklearn.metrics import r2_score, mean_absolute_error
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import shap

RNG = 42
OUT = "/Users/mohammedshameem/Documents/dessert/datas/pipeline_output"
import os
os.makedirs(OUT, exist_ok=True)

DATA = "/Users/mohammedshameem/Documents/dessert/datas"
oa = pd.read_csv(f"{DATA}/OPENACTIVE_MERGED.csv")
al = pd.read_csv(f"{DATA}/activelives_population_profile_merged.csv")
gs = pd.read_csv(f"{DATA}/gapscore_merged_final.csv")

LATEST_YEAR = "2022-23"

# ---------------------------------------------------------------------------
# 1. SUPPLY FEATURES (from OpenActive) — one row per borough
# ---------------------------------------------------------------------------
def shannon_entropy(counts):
    p = counts / counts.sum()
    p = p[p > 0]
    return float(-(p * np.log(p)).sum())

rows = []
for b, g in oa.groupby("borough"):
    is_free = g["is_free"].fillna(False).infer_objects(copy=False).astype(bool)
    n_sessions = len(g)
    n_free = int(is_free.sum())
    pct_free = 100 * n_free / n_sessions
    avg_price = g.loc[~is_free, "price_gbp"].mean()
    price_std = g.loc[~is_free, "price_gbp"].std()
    n_providers = g["provider_group"].nunique()
    n_activity_types = g["activity_type"].nunique()
    activity_diversity = shannon_entropy(g["activity_type"].value_counts().values)
    day_coverage = g["days_of_week"].nunique()  # crude proxy: distinct day patterns offered
    rows.append(dict(borough=b, n_sessions=n_sessions, pct_free=pct_free,
                      avg_price=avg_price if not np.isnan(avg_price) else 0,
                      price_std=price_std if not np.isnan(price_std) else 0,
                      n_providers=n_providers, n_activity_types=n_activity_types,
                      activity_diversity=activity_diversity, day_coverage=day_coverage))
supply = pd.DataFrame(rows)

# ---------------------------------------------------------------------------
# 2. REAL POPULATION (from ONS mid-year estimates) — NOT the survey weighted_base
# ---------------------------------------------------------------------------
# FIX: the original version summed Active Lives 'weighted_base' (the survey's
# weighted SAMPLE size, ~600-1200 per borough) and used it as if it were the
# real resident population (~150,000-400,000 per borough). This made
# sessions_per_10k meaningless (e.g. Barking and Dagenham showed 27,750
# sessions per 10k residents - an impossible number).
#
# Fix: load real ONS mid-year population estimates instead.
# Required file: borough_population.csv with columns: borough,population
# Download from: https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates
try:
    pop = pd.read_csv(f"{DATA}/borough_population.csv")
    assert {"borough", "population"}.issubset(pop.columns), \
        "borough_population.csv must have columns: borough,population"
    pop = pop.rename(columns={"population": "population_proxy"})
except FileNotFoundError:
    raise FileNotFoundError(
        "Missing borough_population.csv (columns: borough,population). "
        "Download real ONS mid-year population estimates for London boroughs "
        "and save as this file in the DATA folder - do not substitute survey "
        "weighted_base, which is sample size, not population."
    )

supply = supply.merge(pop, on="borough", how="left")
supply["sessions_per_10k"] = 10000 * supply["n_sessions"] / supply["population_proxy"]

# ---------------------------------------------------------------------------
# 2b. DEPRIVATION FEATURE (from Active Lives IMD10 breakdown) — NEW
# ---------------------------------------------------------------------------
# The original model only used supply-side features (session counts, price,
# diversity) and failed to predict inactivity (R2 < 0). Deprivation is a
# well-established driver of physical inactivity in the public health
# literature, and we already have it in our own data (IMD10 demographic
# breakdown) but were never using it as a model feature. Add it now.
#
# IMD10 = national deprivation decile (1 = most deprived 10% nationally,
# 10 = least deprived). We compute, per borough, the % of weighted survey
# respondents living in deciles 1-3 (the most deprived nationally) as a
# single deprivation summary feature.
import re

imd = al[(al.survey_year == LATEST_YEAR) & (al.geography_level == "borough")
         & (al.demographic_variable == "IMD10") & (~al.suppress)]

def extract_decile(category_text):
    m = re.search(r"(\d+)\s*$", str(category_text))
    return int(m.group(1)) if m else None

imd = imd.copy()
imd["decile"] = imd["demographic_category"].apply(extract_decile)
imd = imd.dropna(subset=["decile"])

deprivation_rows = []
for b, g in imd.groupby("borough"):
    total_w = g["weighted_base"].sum()
    deprived_w = g.loc[g["decile"] <= 3, "weighted_base"].sum()
    pct_deprived = 100 * deprived_w / total_w if total_w > 0 else np.nan
    deprivation_rows.append(dict(borough=b, pct_high_deprivation=pct_deprived))
deprivation = pd.DataFrame(deprivation_rows)

print(f"[Deprivation feature] computed for {len(deprivation)} boroughs "
      f"(missing: {sorted(set(al.borough.unique()) - set(deprivation.borough))})")

supply = supply.merge(deprivation, on="borough", how="left")

# ---------------------------------------------------------------------------
# 3. TARGET (from gapscore, latest year) + MODEL
# ---------------------------------------------------------------------------
target = gs[gs.survey_year == LATEST_YEAR][["borough", "pct_inactive", "pct_active"]]
df = supply.merge(target, on="borough", how="inner").dropna(subset=["pct_inactive"])

feature_cols = ["sessions_per_10k", "pct_free", "avg_price", "price_std",
                 "n_providers", "n_activity_types", "activity_diversity", "day_coverage",
                 "pct_high_deprivation"]
X = df[feature_cols].fillna(0).values
y = df["pct_inactive"].values

# FIX: original RF (300 trees, n=31 boroughs) scored LOO-CV R2=-0.385 - worse
# than just predicting the mean every time. With only ~31 rows and 8 features,
# a flexible 300-tree ensemble overfits badly. Compare against a much simpler,
# regularized linear model (Ridge) - more honest and appropriate for this n.
from sklearn.linear_model import Ridge

loo = LeaveOneOut()
preds_rf = np.zeros_like(y, dtype=float)
preds_ridge = np.zeros_like(y, dtype=float)
for train_idx, test_idx in loo.split(X):
    m = RandomForestRegressor(n_estimators=300, max_depth=4, random_state=RNG)
    m.fit(X[train_idx], y[train_idx])
    preds_rf[test_idx] = m.predict(X[test_idx])

    r = Ridge(alpha=1.0)
    r.fit(X[train_idx], y[train_idx])
    preds_ridge[test_idx] = r.predict(X[test_idx])

r2_rf = r2_score(y, preds_rf)
mae_rf = mean_absolute_error(y, preds_rf)
r2_ridge = r2_score(y, preds_ridge)
mae_ridge = mean_absolute_error(y, preds_ridge)
print(f"[Model: Random Forest] LOO-CV R2={r2_rf:.3f}  MAE={mae_rf:.2f} pct points  (n={len(y)})")
print(f"[Model: Ridge]         LOO-CV R2={r2_ridge:.3f}  MAE={mae_ridge:.2f} pct points  (n={len(y)})")

# Use whichever model actually performs better out-of-sample, rather than
# defaulting to the more complex one - report this choice explicitly.
if r2_ridge >= r2_rf:
    print("-> Ridge outperforms Random Forest on this sample size; using Ridge predictions.")
    preds = preds_ridge
    r2, mae = r2_ridge, mae_ridge
else:
    print("-> Random Forest outperforms Ridge; using Random Forest predictions.")
    preds = preds_rf
    r2, mae = r2_rf, mae_rf

df["predicted_inactive"] = preds
df["residual"] = df["pct_inactive"] - df["predicted_inactive"]  # + = worse than supply predicts

# Fit on full data for SHAP explainability (in-sample, for feature-importance narrative only)
full_model = RandomForestRegressor(n_estimators=300, max_depth=4, random_state=RNG)
full_model.fit(X, y)
explainer = shap.TreeExplainer(full_model)
shap_values = explainer.shap_values(X)

plt.figure(figsize=(7, 5))
shap.summary_plot(shap_values, pd.DataFrame(X, columns=feature_cols), show=False, plot_size=None)
plt.tight_layout()
plt.savefig(f"{OUT}/shap_summary.png", dpi=150)
plt.close()

mean_abs_shap = pd.Series(np.abs(shap_values).mean(axis=0), index=feature_cols).sort_values()
plt.figure(figsize=(7, 4.5))
mean_abs_shap.plot(kind="barh", color="#2b6cb0")
plt.xlabel("Mean |SHAP value| (impact on predicted % inactive)")
plt.title("What predicts borough inactivity from supply-side features")
plt.tight_layout()
plt.savefig(f"{OUT}/feature_importance.png", dpi=150)
plt.close()

# ---------------------------------------------------------------------------
# 4. TREND: 7-year trajectory per borough (gapscore panel)
# ---------------------------------------------------------------------------
years_order = ["2016-17", "2017-18", "2018-19", "2019-20", "2020-21", "2021-22", "2022-23"]
gs["year_num"] = gs["survey_year"].map({y: i for i, y in enumerate(years_order)})
trend_rows = []
for b, g in gs.groupby("borough"):
    g = g.dropna(subset=["pct_inactive", "year_num"]).sort_values("year_num")
    if len(g) >= 4:
        slope = np.polyfit(g["year_num"], g["pct_inactive"], 1)[0]
    else:
        slope = np.nan
    trend_rows.append(dict(borough=b, inactivity_trend_slope=slope))
trend = pd.DataFrame(trend_rows)
df = df.merge(trend, on="borough", how="left")

# ---------------------------------------------------------------------------
# 5. SEGMENTATION: cluster boroughs on demographic inactivity profile
# ---------------------------------------------------------------------------
seg = al[(al.survey_year == LATEST_YEAR) & (al.geography_level == "borough")
         & (~al.suppress) & (~al.demographic_category.str.contains("Not asked", na=False))]
seg = seg[seg.demographic_variable.isin(["Age9", "Disab3", "Eth7", "Gend3", "IMD10"])]
wide = seg.pivot_table(index="borough", columns=["demographic_variable", "demographic_category"],
                        values="pct_inactive")
wide.columns = [f"{v}:{c}" for v, c in wide.columns]
wide = wide.dropna(thresh=int(0.7 * wide.shape[1]))  # drop boroughs with too much missing
wide = wide.fillna(wide.mean())

scaler = StandardScaler()
Xw = scaler.fit_transform(wide.values)

best_k, best_score = 2, -1
for k in range(2, 6):
    km = KMeans(n_clusters=k, n_init=10, random_state=RNG).fit(Xw)
    s = silhouette_score(Xw, km.labels_)
    if s > best_score:
        best_k, best_score = k, s
km = KMeans(n_clusters=best_k, n_init=10, random_state=RNG).fit(Xw)
clusters = pd.DataFrame({"borough": wide.index, "cluster": km.labels_})
print(f"[Segmentation] chosen k={best_k}  silhouette={best_score:.3f}")

pca = PCA(n_components=2, random_state=RNG)
coords = pca.fit_transform(Xw)
plt.figure(figsize=(7, 5.5))
sc = plt.scatter(coords[:, 0], coords[:, 1], c=km.labels_, cmap="tab10", s=70)
for i, b in enumerate(wide.index):
    plt.annotate(b, (coords[i, 0], coords[i, 1]), fontsize=6, alpha=0.75)
plt.xlabel(f"PC1 ({pca.explained_variance_ratio_[0]*100:.0f}% var)")
plt.ylabel(f"PC2 ({pca.explained_variance_ratio_[1]*100:.0f}% var)")
plt.title(f"Borough segments by demographic inactivity profile (k={best_k})")
plt.tight_layout()
plt.savefig(f"{OUT}/cluster_map.png", dpi=150)
plt.close()

df = df.merge(clusters, on="borough", how="left")

# ---------------------------------------------------------------------------
# 6. COMPOSITE PRIORITY INDEX
# ---------------------------------------------------------------------------
def z(s):
    return (s - s.mean()) / s.std()

supply_cols_for_score = ["sessions_per_10k", "activity_diversity", "pct_free"]
df["supply_score"] = df[supply_cols_for_score].apply(z).mean(axis=1)

df["priority_score"] = (
    z(df["pct_inactive"]) * 0.4
    + (-z(df["supply_score"])) * 0.3
    + z(df["inactivity_trend_slope"].fillna(0)) * 0.15
    + z(df["residual"]) * 0.15
)
df = df.sort_values("priority_score", ascending=False).reset_index(drop=True)
df["priority_rank"] = np.arange(1, len(df) + 1)

keep_cols = ["priority_rank", "borough", "pct_inactive", "predicted_inactive", "residual",
             "sessions_per_10k", "pct_free", "n_providers", "n_activity_types",
             "inactivity_trend_slope", "cluster", "priority_score"]
priority_table = df[keep_cols].round(2)
priority_table.to_csv(f"{OUT}/priority_table.csv", index=False)
print("\nTop 10 priority boroughs for London Sport:")
print(priority_table.head(10).to_string(index=False))

# Priority ranking chart
plt.figure(figsize=(7, 8))
top = priority_table.head(15).iloc[::-1]
plt.barh(top["borough"], top["priority_score"], color="#c53030")
plt.xlabel("Composite Priority Score (higher = higher priority for investment)")
plt.title("Top 15 priority boroughs — London Sport Priority Index")
plt.tight_layout()
plt.savefig(f"{OUT}/priority_ranking.png", dpi=150)
plt.close()

print("\nDone. Outputs in", OUT)

# ---------------------------------------------------------------------------
# 7. BOROUGH PROFILES (grounding data for the recommendation agent)
# ---------------------------------------------------------------------------
import json

profiles = []
for _, r in df.iterrows():
    b = r["borough"]
    g = oa[oa.borough == b]
    top_activities = (g["activity_type"].value_counts().head(3))
    top_activities = [{"type": k, "sessions": int(v)} for k, v in top_activities.items()]

    demo = al[(al.survey_year == LATEST_YEAR) & (al.geography_level == "borough")
              & (al.borough == b) & (~al.suppress)
              & (~al.demographic_category.str.contains("Not asked", na=False))
              & (al.demographic_variable.isin(["Age9", "Disab3", "Eth7", "IMD10", "Orient4", "Educ6"]))]
    worst = demo.sort_values("pct_inactive", ascending=False).head(3)
    inequality_flags = [
        {"variable": row.demographic_variable, "group": row.demographic_category,
         "pct_inactive": round(row.pct_inactive, 1)}
        for row in worst.itertuples()
    ]

    profiles.append({
        "rank": int(r["priority_rank"]),
        "borough": b,
        "pct_inactive": round(float(r["pct_inactive"]), 1),
        "predicted_inactive": round(float(r["predicted_inactive"]), 1),
        "residual": round(float(r["residual"]), 1),
        "trend_slope": None if pd.isna(r["inactivity_trend_slope"]) else round(float(r["inactivity_trend_slope"]), 2),
        "cluster": None if pd.isna(r["cluster"]) else int(r["cluster"]),
        "priority_score": round(float(r["priority_score"]), 2),
        "supply": {
            "n_sessions": int(r["n_sessions"]) if "n_sessions" in r and not pd.isna(r.get("n_sessions", np.nan)) else int(len(g)),
            "sessions_per_10k": round(float(r["sessions_per_10k"]), 1),
            "pct_free": round(float(r["pct_free"]), 1),
            "n_providers": int(r["n_providers"]),
            "n_activity_types": int(r["n_activity_types"]),
            "top_activities": top_activities,
        },
        "inequality_flags": inequality_flags,
    })

with open(f"{OUT}/borough_profiles.json", "w") as f:
    json.dump(profiles, f, indent=2)
print(f"Wrote {len(profiles)} borough profiles to borough_profiles.json")

# --- Add boroughs with demand data but no OpenActive supply coverage (map completeness) ---
covered = {p["borough"] for p in profiles}
al_boroughs = set(al.borough.unique())
gs_boroughs = set(gs.borough.unique())
missing = (al_boroughs | gs_boroughs) - covered
for b in sorted(missing):
    row = gs[(gs.borough == b) & (gs.survey_year == LATEST_YEAR)]
    if row.empty:
        continue
    pct_inactive = float(row["pct_inactive"].iloc[0])

    demo = al[(al.survey_year == LATEST_YEAR) & (al.geography_level == "borough")
              & (al.borough == b) & (~al.suppress)
              & (~al.demographic_category.str.contains("Not asked", na=False))
              & (al.demographic_variable.isin(["Age9", "Disab3", "Eth7", "IMD10", "Orient4", "Educ6"]))]
    worst = demo.sort_values("pct_inactive", ascending=False).head(3)
    inequality_flags = [
        {"variable": r.demographic_variable, "group": r.demographic_category,
         "pct_inactive": round(r.pct_inactive, 1)}
        for r in worst.itertuples()
    ]
    profiles.append({
        "rank": None, "borough": b, "pct_inactive": round(pct_inactive, 1),
        "predicted_inactive": None, "residual": None, "trend_slope": None,
        "cluster": None, "priority_score": None,
        "supply": None,
        "inequality_flags": inequality_flags,
        "no_supply_data": True,
    })
    print(f"Added demand-only profile for {b} (no OpenActive supply coverage)")

with open(f"{OUT}/map_profiles.json", "w") as f:
    json.dump(profiles, f, indent=2)
print(f"Wrote {len(profiles)} total borough profiles (map-complete) to map_profiles.json")

# FIX: this used to recompute `covered` from `profiles` AFTER the demand-only
# entries (City of London, Redbridge) were already appended above - so it
# always found nothing missing, contradicting the printed messages just
# above it. Reuse the correctly-computed `missing` set from before instead.
no_supply = []
for b in sorted(missing):
    row = gs[(gs.borough == b) & (gs.survey_year == LATEST_YEAR)]
    if row.empty:
        continue
    no_supply.append({"borough": b, "pct_inactive": round(float(row["pct_inactive"].iloc[0]), 1)})
with open(f"{OUT}/boroughs_no_supply_data.json", "w") as f:
    json.dump(no_supply, f, indent=2)
print(f"Boroughs with demand data but no OpenActive supply coverage: {[x['borough'] for x in no_supply]}")
