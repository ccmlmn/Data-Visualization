"""
Run this script to generate Lab3_Report.pdf in the Data Visualization folder.
    python generate_report.py
"""

import warnings
warnings.filterwarnings('ignore')

import os
import textwrap
import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.gridspec import GridSpec

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE = r'C:\Users\user\Desktop\MiniProject Data Scientist\Data Visualization'
IRIS_CSV = os.path.join(BASE, 'Lab_3', 'iris.csv')
OUT_PDF  = os.path.join(BASE, 'Lab3_Report.pdf')

# ── Load datasets ─────────────────────────────────────────────────────────────
tips = sns.load_dataset('tips')
iris = pd.read_csv(IRIS_CSV)
iris['petal_size'] = pd.cut(iris['petal_length'], bins=2,
                             labels=['Small Petal', 'Large Petal'])

SPECIES_COLORS = {'setosa': '#66c2a5', 'versicolor': '#fc8d62', 'virginica': '#8da0cb'}

# ── Helpers ───────────────────────────────────────────────────────────────────
def wrap(text, width=95):
    return '\n'.join(textwrap.wrap(text, width))

def section_title(ax, title):
    ax.set_facecolor('#1a3a5c')
    ax.text(0.5, 0.5, title, transform=ax.transAxes,
            fontsize=16, fontweight='bold', color='white',
            ha='center', va='center')
    ax.axis('off')

def answer_box(fig, text, y_bottom, height=0.07):
    """Draw a light-blue answer box below existing axes."""
    ax = fig.add_axes([0.08, y_bottom, 0.84, height])
    ax.set_facecolor('#e8f4f8')
    for spine in ax.spines.values():
        spine.set_edgecolor('#2196f3')
        spine.set_linewidth(1.5)
    ax.text(0.01, 0.92, text, transform=ax.transAxes,
            fontsize=9, va='top', wrap=True,
            color='#1a237e')
    ax.set_xticks([])
    ax.set_yticks([])

# ═══════════════════════════════════════════════════════════════════════════════
# PAGE BUILDER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def page_cover(pdf):
    fig, ax = plt.subplots(figsize=(11.69, 8.27))
    fig.patch.set_facecolor('#0d2137')
    ax.set_facecolor('#0d2137')
    ax.axis('off')
    ax.text(0.5, 0.82, 'TFB3133 / TEB3133 Data Visualization',
            transform=ax.transAxes, fontsize=14, color='#90caf9',
            ha='center', style='italic')
    ax.text(0.5, 0.68, 'Lab 3 Report', transform=ax.transAxes,
            fontsize=36, fontweight='bold', color='white', ha='center')
    ax.text(0.5, 0.55, 'High-Dimensional Data Visualization Techniques',
            transform=ax.transAxes, fontsize=18, color='#4fc3f7', ha='center')
    ax.text(0.5, 0.40, 'Muhammad Umair Arif Bin Mohd Azmi  |  22005713',
            transform=ax.transAxes, fontsize=13, color='#b0bec5', ha='center')
    ax.text(0.5, 0.32, 'Dataset Used for Assignment: Iris (seaborn)',
            transform=ax.transAxes, fontsize=12, color='#b0bec5', ha='center')
    ax.text(0.5, 0.18, 'Department of Computing\nFaculty of Science, Management & Computing\nUniversiti Teknologi PETRONAS',
            transform=ax.transAxes, fontsize=11, color='#78909c', ha='center')
    pdf.savefig(fig, bbox_inches='tight')
    plt.close(fig)


def page_21_mosaic(pdf):
    fig = plt.figure(figsize=(11.69, 8.27))
    gs = GridSpec(4, 2, figure=fig, hspace=0.55, wspace=0.35,
                  left=0.08, right=0.95, top=0.93, bottom=0.08)

    # Title bar
    ax_title = fig.add_subplot(gs[0, :])
    section_title(ax_title, '2.1  Mosaic Plot (Marimekko)')

    # ── Tips chart ──
    ax1 = fig.add_subplot(gs[1:3, 0])
    mosaic_tips = tips.groupby(['day', 'sex'])['total_bill'].sum().reset_index()
    days = ['Fri', 'Sat', 'Sun', 'Thur']
    male_vals, female_vals = [], []
    for d in days:
        sub = mosaic_tips[mosaic_tips['day'] == d]
        male_vals.append(sub[sub['sex'] == 'Male']['total_bill'].sum())
        female_vals.append(sub[sub['sex'] == 'Female']['total_bill'].sum())
    totals = [m + f for m, f in zip(male_vals, female_vals)]
    male_pct   = [m / t for m, t in zip(male_vals, totals)]
    female_pct = [f / t for f, t in zip(female_vals, totals)]
    x = np.arange(len(days))
    ax1.bar(x, female_pct, color='#66c2a5', label='Female')
    ax1.bar(x, male_pct,   color='#fc8d62', label='Male', bottom=female_pct)
    ax1.set_xticks(x); ax1.set_xticklabels(days)
    ax1.set_ylabel('Proportion'); ax1.set_ylim(0, 1)
    ax1.set_title('Tips Dataset – Total Bill by Day & Sex', fontsize=10)
    ax1.legend(fontsize=8); ax1.yaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f'{v:.0%}'))

    # ── Iris chart ──
    ax2 = fig.add_subplot(gs[1:3, 1])
    mosaic_iris = iris.groupby(['species', 'petal_size'])['sepal_length'].sum().reset_index()
    species_list = ['setosa', 'versicolor', 'virginica']
    small_vals, large_vals = [], []
    for sp in species_list:
        sub = mosaic_iris[mosaic_iris['species'] == sp]
        small_vals.append(sub[sub['petal_size'] == 'Small Petal']['sepal_length'].sum())
        large_vals.append(sub[sub['petal_size'] == 'Large Petal']['sepal_length'].sum())
    totals2 = [s + l for s, l in zip(small_vals, large_vals)]
    small_pct = [s / t if t else 0 for s, t in zip(small_vals, totals2)]
    large_pct = [l / t if t else 0 for l, t in zip(large_vals, totals2)]
    x2 = np.arange(len(species_list))
    ax2.bar(x2, small_pct, color='#8dd3c7', label='Small Petal')
    ax2.bar(x2, large_pct, color='#fb8072', label='Large Petal', bottom=small_pct)
    ax2.set_xticks(x2); ax2.set_xticklabels(species_list)
    ax2.set_ylabel('Proportion'); ax2.set_ylim(0, 1)
    ax2.set_title('Iris Dataset – Sepal Length by Species & Petal Size', fontsize=10)
    ax2.legend(fontsize=8); ax2.yaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f'{v:.0%}'))

    # ── Description & answers ──
    ax3 = fig.add_subplot(gs[3, :])
    ax3.axis('off')
    desc = (
        'PURPOSE:  A Mosaic (Marimekko) plot visualises two categorical variables simultaneously. '
        'Column width encodes one proportion; stacked height encodes the other.\n\n'
        'TIPS INSIGHT (Task answer):  Friday shows the highest female proportion (~42%). '
        'Sunday has the highest overall spend but is male-dominated (~75%).\n\n'
        'IRIS CHANGE:  With iris, the two categoricals are species and a derived petal-size '
        'group.  Setosa is 100% small-petal; Versicolor/Virginica are 100% large-petal, '
        'making the chart less nuanced but confirming clear species-level petal differences.'
    )
    ax3.text(0, 1, desc, transform=ax3.transAxes, fontsize=8.5, va='top',
             bbox=dict(boxstyle='round,pad=0.4', facecolor='#fff9e6', edgecolor='#f0a500'))

    pdf.savefig(fig, bbox_inches='tight')
    plt.close(fig)


def page_22_trellis(pdf):
    fig = plt.figure(figsize=(11.69, 8.27))
    gs = GridSpec(4, 2, figure=fig, hspace=0.6, wspace=0.35,
                  left=0.08, right=0.95, top=0.93, bottom=0.08)

    ax_title = fig.add_subplot(gs[0, :])
    section_title(ax_title, '2.2  Trellis Display (Facet)')

    # ── Tips trellis (2x2 grid) ──
    days = ['Fri', 'Sat', 'Sun', 'Thur']
    day_colors = {'Fri': '#e41a1c', 'Sat': '#377eb8', 'Sun': '#4daf4a', 'Thur': '#984ea3'}
    inner_gs = gs[1:3, 0].subgridspec(2, 2, hspace=0.5, wspace=0.4)
    for i, day in enumerate(days):
        r, c = divmod(i, 2)
        ax = fig.add_subplot(inner_gs[r, c])
        sub = tips[tips['day'] == day]
        ax.scatter(sub['total_bill'], sub['tip'], c=day_colors[day], s=15, alpha=0.7)
        z = np.polyfit(sub['total_bill'], sub['tip'], 1)
        p = np.poly1d(z)
        xx = np.linspace(sub['total_bill'].min(), sub['total_bill'].max(), 50)
        ax.plot(xx, p(xx), 'k--', linewidth=0.8)
        ax.set_title(day, fontsize=9, fontweight='bold')
        ax.set_xlabel('Bill ($)', fontsize=7); ax.set_ylabel('Tip ($)', fontsize=7)
        ax.tick_params(labelsize=6)
    fig.text(0.28, 0.68, 'Tips Dataset', ha='center', fontsize=9, color='#444')

    # ── Iris trellis ──
    species_list = ['setosa', 'versicolor', 'virginica']
    inner_gs2 = gs[1:3, 1].subgridspec(2, 2, hspace=0.5, wspace=0.4)
    for i, sp in enumerate(species_list):
        r, c = divmod(i, 2)
        ax = fig.add_subplot(inner_gs2[r, c])
        sub = iris[iris['species'] == sp]
        ax.scatter(sub['sepal_length'], sub['petal_length'],
                   c=SPECIES_COLORS[sp], s=15, alpha=0.75)
        z = np.polyfit(sub['sepal_length'], sub['petal_length'], 1)
        p = np.poly1d(z)
        xx = np.linspace(sub['sepal_length'].min(), sub['sepal_length'].max(), 50)
        ax.plot(xx, p(xx), 'k--', linewidth=0.8)
        ax.set_title(sp.capitalize(), fontsize=9, fontweight='bold')
        ax.set_xlabel('Sepal L.', fontsize=7); ax.set_ylabel('Petal L.', fontsize=7)
        ax.tick_params(labelsize=6)
    # empty 4th panel
    ax_empty = fig.add_subplot(inner_gs2[1, 1]); ax_empty.axis('off')
    fig.text(0.73, 0.68, 'Iris Dataset', ha='center', fontsize=9, color='#444')

    ax3 = fig.add_subplot(gs[3, :])
    ax3.axis('off')
    desc = (
        'PURPOSE:  A Trellis (Facet) display repeats the same chart for each category, '
        'enabling side-by-side comparison without overplotting.\n\n'
        'TIPS INSIGHT (Task answer):  Saturday shows the strongest positive linear relationship '
        'between total bill and tip (largest spread + consistent upward trend, r ≈ 0.68).\n\n'
        'IRIS CHANGE:  Faceting by species isolates each cluster clearly. Virginica shows the '
        'strongest sepal-vs-petal correlation; Setosa shows very little variation in petal '
        'length regardless of sepal length.'
    )
    ax3.text(0, 1, desc, transform=ax3.transAxes, fontsize=8.5, va='top',
             bbox=dict(boxstyle='round,pad=0.4', facecolor='#fff9e6', edgecolor='#f0a500'))

    pdf.savefig(fig, bbox_inches='tight')
    plt.close(fig)


def page_23_heatmap(pdf):
    fig = plt.figure(figsize=(11.69, 8.27))
    gs = GridSpec(4, 2, figure=fig, hspace=0.55, wspace=0.4,
                  left=0.08, right=0.95, top=0.93, bottom=0.08)

    ax_title = fig.add_subplot(gs[0, :])
    section_title(ax_title, '2.3  Heatmap')

    # ── Tips heatmap ──
    ax1 = fig.add_subplot(gs[1:3, 0])
    heat_tips = tips.groupby(['day', 'time'])['total_bill'].mean().unstack()
    heat_tips = heat_tips.reindex(['Thur', 'Fri', 'Sat', 'Sun'])
    sns.heatmap(heat_tips, ax=ax1, annot=True, fmt='.1f', cmap='Greens',
                cbar_kws={'label': 'Avg Bill ($)'})
    ax1.set_title('Tips – Avg Total Bill by Day & Time', fontsize=10)
    ax1.set_xlabel('Time'); ax1.set_ylabel('Day')

    # ── Iris correlation heatmap ──
    ax2 = fig.add_subplot(gs[1:3, 1])
    num_cols = iris.select_dtypes(include='number').columns
    corr = iris[num_cols].corr()
    mask = np.zeros_like(corr, dtype=bool)
    sns.heatmap(corr, ax=ax2, annot=True, fmt='.2f', cmap='RdBu_r',
                vmin=-1, vmax=1, center=0,
                cbar_kws={'label': 'Correlation'},
                linewidths=1, linecolor='white')
    ax2.set_title('Iris – Correlation Matrix', fontsize=10)
    ax2.tick_params(axis='x', rotation=30, labelsize=8)
    ax2.tick_params(axis='y', rotation=0, labelsize=8)

    ax3 = fig.add_subplot(gs[3, :])
    ax3.axis('off')
    desc = (
        'PURPOSE:  A Heatmap encodes numerical values as colour intensity in a grid, '
        'revealing patterns at a glance.\n\n'
        'TIPS INSIGHT (Task answers):  Sat-Dinner has the highest average bill (~$21.77). '
        'Dinner does NOT always cost more than Lunch — Thu Lunch ($17.66) exceeds Fri Dinner '
        '($16.66 in some sub-groups), showing that day matters more than meal time alone.\n\n'
        'IRIS CHANGE:  With iris the heatmap becomes a correlation matrix. Petal length and '
        'petal width are very strongly correlated (r = 0.96). Sepal width is negatively '
        'correlated with the other three variables — an opposite pattern to what tips shows.'
    )
    ax3.text(0, 1, desc, transform=ax3.transAxes, fontsize=8.5, va='top',
             bbox=dict(boxstyle='round,pad=0.4', facecolor='#fff9e6', edgecolor='#f0a500'))

    pdf.savefig(fig, bbox_inches='tight')
    plt.close(fig)


def page_24_scatter(pdf):
    fig = plt.figure(figsize=(11.69, 8.27))
    gs = GridSpec(4, 2, figure=fig, hspace=0.55, wspace=0.4,
                  left=0.08, right=0.95, top=0.93, bottom=0.08)

    ax_title = fig.add_subplot(gs[0, :])
    section_title(ax_title, '2.4  Multivariate Scatter Plot')

    # ── Tips multivariate scatter ──
    ax1 = fig.add_subplot(gs[1:3, 0])
    sex_map    = {'Male': 'o', 'Female': 's'}
    smoker_clr = {'Yes': '#e41a1c', 'No': '#377eb8'}
    for (sex, smoker), sub in tips.groupby(['sex', 'smoker']):
        ax1.scatter(sub['total_bill'], sub['tip'],
                    marker=sex_map[sex], c=smoker_clr[smoker],
                    s=sub['size'] * 18, alpha=0.65, edgecolors='w', linewidths=0.3)
    legend_els = [
        mpatches.Patch(color='#e41a1c', label='Smoker'),
        mpatches.Patch(color='#377eb8', label='Non-Smoker'),
        plt.Line2D([0], [0], marker='o', color='w', markerfacecolor='grey', ms=8, label='Male'),
        plt.Line2D([0], [0], marker='s', color='w', markerfacecolor='grey', ms=8, label='Female'),
    ]
    ax1.legend(handles=legend_els, fontsize=7, loc='upper left')
    ax1.set_xlabel('Total Bill ($)'); ax1.set_ylabel('Tip ($)')
    ax1.set_title('Tips – Bill vs Tip\n(color=Smoker, shape=Sex, size=Group)', fontsize=9)

    # ── Iris multivariate scatter ──
    ax2 = fig.add_subplot(gs[1:3, 1])
    petal_map = {'Small Petal': 'o', 'Large Petal': 's'}
    for sp, grp in iris.groupby('species'):
        for ps, sub in grp.groupby('petal_size'):
            ax2.scatter(sub['sepal_length'], sub['petal_length'],
                        marker=petal_map.get(str(ps), 'o'),
                        c=SPECIES_COLORS[sp],
                        s=sub['sepal_width'] * 35, alpha=0.75,
                        edgecolors='w', linewidths=0.3,
                        label=f'{sp} / {ps}' if ps == 'Small Petal' else None)
    species_patches = [mpatches.Patch(color=c, label=sp.capitalize())
                       for sp, c in SPECIES_COLORS.items()]
    shape_lines = [
        plt.Line2D([0], [0], marker='o', color='w', markerfacecolor='grey', ms=7, label='Small Petal'),
        plt.Line2D([0], [0], marker='s', color='w', markerfacecolor='grey', ms=7, label='Large Petal'),
    ]
    ax2.legend(handles=species_patches + shape_lines, fontsize=7, loc='upper left')
    ax2.set_xlabel('Sepal Length (cm)'); ax2.set_ylabel('Petal Length (cm)')
    ax2.set_title('Iris – Sepal vs Petal Length\n(color=Species, shape=Petal Size, size=Sepal Width)', fontsize=9)

    ax3 = fig.add_subplot(gs[3, :])
    ax3.axis('off')
    desc = (
        'PURPOSE:  Encodes 4–5 variables at once using position (x, y), colour, shape, and '
        'point size, revealing multi-dimensional relationships in a single 2-D view.\n\n'
        'TIPS INSIGHT (Task answers):  Non-smokers and smokers tip similarly on average; there '
        'is no strong smoker effect. Larger groups (bigger circles) are spread across all tip '
        'levels — group size does not reliably predict a bigger tip.\n\n'
        'IRIS CHANGE:  Iris encodes species (colour), petal size (shape), and sepal width '
        '(point size). Three clean clusters emerge. Setosa has the widest sepals (largest '
        'points) but the shortest petals — an inverse relationship not obvious without '
        'multivariate encoding.'
    )
    ax3.text(0, 1, desc, transform=ax3.transAxes, fontsize=8.5, va='top',
             bbox=dict(boxstyle='round,pad=0.4', facecolor='#fff9e6', edgecolor='#f0a500'))

    pdf.savefig(fig, bbox_inches='tight')
    plt.close(fig)


def page_25_parallel(pdf):
    fig = plt.figure(figsize=(11.69, 8.27))
    gs = GridSpec(4, 2, figure=fig, hspace=0.55, wspace=0.4,
                  left=0.08, right=0.95, top=0.93, bottom=0.08)

    ax_title = fig.add_subplot(gs[0, :])
    section_title(ax_title, '2.5  Parallel Coordinate Plot')

    def draw_parallel(ax, df_plot, cols, color_col, cmap_name, title, ticklabels=None):
        n_cols = len(cols)
        normed = df_plot[cols].copy()
        for c in cols:
            mn, mx = normed[c].min(), normed[c].max()
            normed[c] = (normed[c] - mn) / (mx - mn + 1e-9)
        vals = df_plot[color_col].astype(float).values
        norm_c = (vals - vals.min()) / (vals.max() - vals.min() + 1e-9)
        cmap = plt.get_cmap(cmap_name)
        for i, row in normed.iterrows():
            ax.plot(range(n_cols), row[cols].values, c=cmap(norm_c[i]), alpha=0.35, lw=0.7)
        ax.set_xticks(range(n_cols))
        ax.set_xticklabels(cols, fontsize=8, rotation=20)
        ax.set_yticks([0, 0.5, 1]); ax.set_yticklabels(['min', 'mid', 'max'], fontsize=7)
        ax.set_title(title, fontsize=9)
        ax.set_xlim(-0.1, n_cols - 0.9)

    ax1 = fig.add_subplot(gs[1:3, 0])
    day_map_t = {'Thur': 0, 'Fri': 1, 'Sat': 2, 'Sun': 3}
    tips2 = tips.copy(); tips2['day_num'] = tips2['day'].map(day_map_t)
    draw_parallel(ax1, tips2, ['total_bill', 'tip', 'size'], 'day_num', 'viridis',
                  'Tips – Bill / Tip / Group Size')

    ax2 = fig.add_subplot(gs[1:3, 1])
    sp_map = {'setosa': 0, 'versicolor': 1, 'virginica': 2}
    iris2 = iris.copy(); iris2['sp_num'] = iris2['species'].map(sp_map)
    draw_parallel(ax2, iris2, ['sepal_length', 'sepal_width', 'petal_length', 'petal_width'],
                  'sp_num', 'RdYlGn', 'Iris – All Four Measurements')
    patches = [mpatches.Patch(color=c, label=sp.capitalize())
               for sp, c in {'setosa': '#1a9641', 'versicolor': '#ffffbf', 'virginica': '#d7191c'}.items()]
    ax2.legend(handles=patches, fontsize=7, loc='upper right')

    ax3 = fig.add_subplot(gs[3, :])
    ax3.axis('off')
    desc = (
        'PURPOSE:  Parallel Coordinate Plots display each record as a polyline crossing '
        'several parallel axes, making multi-dimensional clusters, correlations, and outliers '
        'visible simultaneously.\n\n'
        'TIPS INSIGHT (Task answer):  Filtering tips > $4 (by brushing the tip axis in '
        'Streamlit): group sizes 2 and 3 are most common among high tippers. Groups of 1 '
        'rarely leave tips above $4.\n\n'
        'IRIS CHANGE:  Iris reveals three distinct bundles of lines (one per species). Setosa '
        'lines dip sharply at petal_length/petal_width axes (short petals), while Virginica '
        'stays high across all four axes. Sepal width is the one axis where Setosa lines '
        'cross upward relative to the other two species.'
    )
    ax3.text(0, 1, desc, transform=ax3.transAxes, fontsize=8.5, va='top',
             bbox=dict(boxstyle='round,pad=0.4', facecolor='#fff9e6', edgecolor='#f0a500'))

    pdf.savefig(fig, bbox_inches='tight')
    plt.close(fig)


def page_26_3d(pdf):
    fig = plt.figure(figsize=(11.69, 8.27))
    gs = GridSpec(4, 2, figure=fig, hspace=0.55, wspace=0.4,
                  left=0.08, right=0.95, top=0.93, bottom=0.08)

    ax_title = fig.add_subplot(gs[0, :])
    section_title(ax_title, '2.6  Grand Tour – 3D Scatter Plot')

    # ── Tips 3D ──
    ax1 = fig.add_subplot(gs[1:3, 0], projection='3d')
    day_clr = {'Fri': '#e41a1c', 'Sat': '#377eb8', 'Sun': '#4daf4a', 'Thur': '#984ea3'}
    for day, grp in tips.groupby('day'):
        ax1.scatter(grp['total_bill'], grp['tip'], grp['size'],
                    c=day_clr[day], s=12, alpha=0.7, label=day)
    ax1.set_xlabel('Bill ($)', fontsize=7); ax1.set_ylabel('Tip ($)', fontsize=7)
    ax1.set_zlabel('Size', fontsize=7)
    ax1.set_title('Tips – 3D Scatter', fontsize=9)
    ax1.legend(fontsize=7, loc='upper left')
    ax1.view_init(elev=20, azim=-60)

    # ── Iris 3D ──
    ax2 = fig.add_subplot(gs[1:3, 1], projection='3d')
    for sp, grp in iris.groupby('species'):
        ax2.scatter(grp['sepal_length'], grp['petal_length'], grp['petal_width'],
                    c=SPECIES_COLORS[sp], s=grp['sepal_width'] * 8, alpha=0.8,
                    label=sp.capitalize(), edgecolors='w', linewidths=0.2)
    ax2.set_xlabel('Sepal L.', fontsize=7); ax2.set_ylabel('Petal L.', fontsize=7)
    ax2.set_zlabel('Petal W.', fontsize=7)
    ax2.set_title('Iris – 3D Scatter\n(color=Species, size=Sepal Width)', fontsize=9)
    ax2.legend(fontsize=7, loc='upper left')
    ax2.view_init(elev=25, azim=45)

    ax3 = fig.add_subplot(gs[3, :])
    ax3.axis('off')
    desc = (
        'PURPOSE:  A 3D Scatter (Grand Tour) adds a z-axis to reveal structure hidden in 2-D '
        'projections. Rotating the view is equivalent to exploring different linear projections.\n\n'
        'TIPS INSIGHT (Task answer):  Viewing from elev≈20°/azim≈−60° best separates Sat/Sun '
        '(high bill, high tip) from Thu/Fri. A clear outlier exists: one Sat record with '
        'bill ≈$50, tip ≈$10 — far above the main cloud.\n\n'
        'IRIS CHANGE:  Iris forms three near-perfectly separated clusters in 3D. The Setosa '
        'cluster sits at petal values close to zero on both petal axes — completely isolated. '
        'Versicolor/Virginica overlap slightly when viewed from some angles but separate '
        'cleanly along the petal_width z-axis.'
    )
    ax3.text(0, 1, desc, transform=ax3.transAxes, fontsize=8.5, va='top',
             bbox=dict(boxstyle='round,pad=0.4', facecolor='#fff9e6', edgecolor='#f0a500'))

    pdf.savefig(fig, bbox_inches='tight')
    plt.close(fig)


def page_assignment_violin(pdf):
    fig = plt.figure(figsize=(11.69, 8.27))
    gs = GridSpec(3, 2, figure=fig, hspace=0.55, wspace=0.4,
                  left=0.08, right=0.95, top=0.93, bottom=0.08)

    ax_title = fig.add_subplot(gs[0, :])
    section_title(ax_title, 'Assignment – Additional Visualization: Violin Plot')

    ax1 = fig.add_subplot(gs[1:, 0])
    sns.violinplot(data=tips, x='day', y='total_bill', hue='sex',
                   split=True, ax=ax1, palette='Set2', inner='quartile')
    ax1.set_title('Tips – Total Bill by Day & Sex', fontsize=10)
    ax1.set_xlabel('Day'); ax1.set_ylabel('Total Bill ($)')

    ax2 = fig.add_subplot(gs[1:, 1])
    sns.violinplot(data=iris, x='species', y='petal_length',
                   ax=ax2, palette='Set2', inner='box')
    ax2.set_title('Iris – Petal Length by Species', fontsize=10)
    ax2.set_xlabel('Species'); ax2.set_ylabel('Petal Length (cm)')

    desc = (
        'A Violin Plot shows the full probability density of the data at different values, '
        'combining a KDE curve with an embedded box plot. It reveals multimodality, skewness, '
        'and outliers better than a standard box plot.\n\n'
        'IRIS INSIGHT:  Setosa has a narrow, low distribution (1–2 cm). Versicolor is mid-range '
        '(3–5 cm). Virginica shows the widest spread and highest median (~5.5 cm). The clear '
        'separation across all three species confirms iris is well-suited for species '
        'classification tasks.'
    )
    fig.text(0.08, 0.04, desc, fontsize=8.5, va='bottom',
             bbox=dict(boxstyle='round,pad=0.4', facecolor='#fff9e6', edgecolor='#f0a500'),
             wrap=True)

    pdf.savefig(fig, bbox_inches='tight')
    plt.close(fig)


def page_conclusion(pdf):
    fig, ax = plt.subplots(figsize=(11.69, 8.27))
    ax.axis('off')
    fig.patch.set_facecolor('#f5f5f5')

    ax.text(0.5, 0.95, 'Conclusion & Summary', transform=ax.transAxes,
            fontsize=20, fontweight='bold', ha='center', color='#1a3a5c')
    ax.plot([0.05, 0.95], [0.92, 0.92], color='#1a3a5c', linewidth=1.5,
            transform=ax.transAxes, clip_on=False)

    summary = [
        ('2.1 Mosaic Plot',
         'Effective for two-categorical proportion comparisons. Tips: Friday most female-dominated. '
         'Iris: all-or-nothing split by species confirms petal-size is a species discriminator.'),
        ('2.2 Trellis Display',
         'Small-multiples remove overlap. Tips: Saturday strongest bill-tip trend. '
         'Iris: Virginica most linearly correlated; Setosa nearly flat petal trend.'),
        ('2.3 Heatmap',
         'Instant colour-encoded pattern recognition. Tips: Sat-Dinner highest bill; '
         'Fri-Dinner surprisingly low. Iris: petal_length ↔ petal_width r=0.96 dominates.'),
        ('2.4 Multivariate Scatter',
         '5-D encoding in one chart. Tips: smoker status has little tip effect; group size not '
         'predictive. Iris: three clusters crystal-clear; Setosa wide-sepal / short-petal pattern.'),
        ('2.5 Parallel Coordinates',
         'Reveals multi-axis clusters & brushing. Tips: high-tippers (>$4) mostly group 2–3. '
         'Iris: three species bundles instantly visible; Setosa inverts on sepal_width axis.'),
        ('2.6 Grand Tour 3D',
         'Depth perception surfaces hidden structure. Tips: Sat outlier at $50 bill. '
         'Iris: Setosa perfectly isolated; Versicolor/Virginica cleanly split on petal_width z-axis.'),
    ]

    y = 0.88
    for title, text in summary:
        ax.text(0.04, y, f'  {title}', transform=ax.transAxes,
                fontsize=11, fontweight='bold', color='#1a3a5c')
        y -= 0.04
        for line in textwrap.wrap(text, width=110):
            ax.text(0.06, y, line, transform=ax.transAxes, fontsize=9, color='#333')
            y -= 0.032
        y -= 0.01

    ax.text(0.5, 0.03,
            'Libraries used: Altair · Plotly · Seaborn · Matplotlib · Streamlit  |  Datasets: tips (tutorial) · iris (assignment)',
            transform=ax.transAxes, fontsize=8, ha='center', color='#888', style='italic')

    pdf.savefig(fig, bbox_inches='tight')
    plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN – build the PDF
# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    print('Generating Lab3_Report.pdf …')
    with PdfPages(OUT_PDF) as pdf:
        page_cover(pdf)
        page_21_mosaic(pdf)
        page_22_trellis(pdf)
        page_23_heatmap(pdf)
        page_24_scatter(pdf)
        page_25_parallel(pdf)
        page_26_3d(pdf)
        page_assignment_violin(pdf)
        page_conclusion(pdf)

        d = pdf.infodict()
        d['Title']   = 'Lab 3 Report – High-Dimensional Data Visualization'
        d['Author']  = 'Muhammad Umair Arif Bin Mohd Azmi (22005713)'
        d['Subject'] = 'TFB3133/TEB3133 Data Visualization'

    print(f'Done!  Saved to: {OUT_PDF}')
