import streamlit as st
import pandas as pd
import altair as alt
import seaborn as sns
import matplotlib.pyplot as plt
import plotly.express as px

# ── 1.2 Download the Dataset ─────────────────────────────────────────────────
tips = sns.load_dataset('tips')
tips.to_csv('tips.csv', index=False)

# Load dataset
df = pd.read_csv('tips.csv')

st.title("High-Dimensional Data Visualization")
st.sidebar.title("Navigation")

section = st.sidebar.selectbox(
    "Choose a visualization",
    [
        "1.1 Mosaic Plot",
        "1.2 Trellis Display",
        "1.3 Heatmap",
        "1.4 Multivariate Scatter Plot",
        "1.5 Parallel Coordinate Plot",
        "1.6 Grand Tour (3D Scatter)",
    ],
)

# ── 1.1 Mosaic Plot (Marimekko) ───────────────────────────────────────────────
if section == "1.1 Mosaic Plot":
    st.header("1.1 Mosaic Plot (Marimekko)")
    st.write("Shows total bill distribution grouped by Day and Sex.")

    mosaic_data = df.groupby(['day', 'sex'])['total_bill'].sum().reset_index()

    mosaic_chart = (
        alt.Chart(mosaic_data)
        .mark_bar()
        .encode(
            x=alt.X('day:N', title='Day', axis=alt.Axis(labelAngle=0)),
            y=alt.Y('total_bill:Q', stack='normalize', title='Proportion of Total Bill'),
            color=alt.Color(
                'sex:N',
                scale=alt.Scale(scheme='set2'),
                legend=alt.Legend(title='Sex'),
            ),
            tooltip=['day', 'sex', 'total_bill'],
        )
        .properties(width=600, height=400, title='Mosaic Plot: Total Bill by Day and Sex')
    )

    st.altair_chart(mosaic_chart, use_container_width=True)
    st.write(
        "Each bar shows the proportion of total bill contributed by Male vs Female "
        "customers for each day. Wider bars indicate more data for that day."
    )

    st.info("Task: On which day do female customers contribute the highest proportion of the total bill?\n\nAnswer: Thursday")

# ── 1.2 Trellis Display ───────────────────────────────────────────────────────
if section == "1.2 Trellis Display":
    st.header("1.2 Trellis Display")
    st.write("Scatter plots of Total Bill vs Tip, one panel per day.")

    trellis_chart = (
        alt.Chart(df)
        .mark_circle(size=60, opacity=0.7)
        .encode(
            x=alt.X('total_bill:Q', title='Total Bill ($)'),
            y=alt.Y('tip:Q', title='Tip ($)'),
            color=alt.Color(
                'sex:N',
                scale=alt.Scale(scheme='set1'),
                legend=alt.Legend(title='Sex'),
            ),
            tooltip=['total_bill', 'tip', 'sex', 'size'],
        )
        .facet(facet=alt.Facet('day:N', title='Day'), columns=2)
        .properties(title='Trellis: Total Bill vs Tip by Day')
    )

    st.altair_chart(trellis_chart, use_container_width=True)
    st.write(
        "Each panel shows the relationship between total bill and tip for one day. "
        "Notice how the pattern changes across days."
    )

    st.info("Task: Which day shows the strongest positive relationship between total bill and tip? \n\n Answer: Thursday")

# ── 1.3 Heatmap ───────────────────────────────────────────────────────────────
if section == "1.3 Heatmap":
    st.header("1.3 Heatmap")
    st.write("Average total bill for each Day and Time combination.")

    heat_data = df.groupby(['day', 'time'])['total_bill'].mean().reset_index()
    heat_data.columns = ['day', 'time', 'avg_bill']

    heatmap = (
        alt.Chart(heat_data)
        .mark_rect()
        .encode(
            x=alt.X(
                'day:N',
                title='Day',
                sort=['Thur', 'Fri', 'Sat', 'Sun'],
                axis=alt.Axis(labelAngle=0),
            ),
            y=alt.Y('time:N', title='Time'),
            color=alt.Color(
                'avg_bill:Q',
                scale=alt.Scale(scheme='greens'),
                legend=alt.Legend(title='Avg Bill ($)'),
            ),
            tooltip=[
                alt.Tooltip('day:N', title='Day'),
                alt.Tooltip('time:N', title='Time'),
                alt.Tooltip('avg_bill:Q', title='Avg Bill ($)', format='.2f'),
            ],
        )
        .properties(width=500, height=200, title='Heatmap: Average Total Bill by Day and Time')
    )

    st.altair_chart(heatmap, use_container_width=True)
    st.write(
        "Darker green cells indicate higher average bills. "
        "Hover over any cell to see the exact average bill value."
    )

    st.info(
        "Task: Which Day and Time combination has the highest average total bill? "
        "Does Dinner always cost more than Lunch? \n\n Answer: Sunday & Dinner. Yes Average bill for dinner is higher than lunch."
    )

# ── 1.4 Multivariate Scatter Plot ────────────────────────────────────────────
if section == "1.4 Multivariate Scatter Plot":
    st.header("1.4 Multivariate Scatter Plot")
    st.write(
        "Relationships between total_bill, tip, size, and sex "
        "visualized using position, color, shape, and size."
    )

    multi_scatter = (
        alt.Chart(df)
        .mark_point(filled=True, opacity=0.8)
        .encode(
            x=alt.X('total_bill:Q', title='Total Bill ($)'),
            y=alt.Y('tip:Q', title='Tip ($)'),
            color=alt.Color(
                'sex:N',
                scale=alt.Scale(scheme='set1'),
                legend=alt.Legend(title='Sex'),
            ),
            shape=alt.Shape('smoker:N', legend=alt.Legend(title='Smoker')),
            size=alt.Size(
                'size:Q',
                scale=alt.Scale(range=[50, 400]),
                legend=alt.Legend(title='Group Size'),
            ),
            tooltip=['total_bill', 'tip', 'sex', 'smoker', 'size', 'day'],
        )
        .properties(
            width=600,
            height=400,
            title='Multivariate Scatter: Bill vs Tip (color=Sex, shape=Smoker, size=Group)',
        )
        .interactive()
    )

    st.altair_chart(multi_scatter, use_container_width=True)
    st.write(
        "Each point encodes 5 variables: x position (bill), y position (tip), "
        "color (sex), shape (smoker), and size (group size). "
        "Hover over points for full details."
    )

    st.info("Task: Do smokers or non-smokers tend to tip more? Do larger groups leave bigger tips?\n\n Answer: Non-smokers tend to tip more than smokers. Larger groups do leave bigger tips in absolute dollar amounts, likely because their total bills are higher.")

# ── 1.5 Parallel Coordinate Plot ─────────────────────────────────────────────
if section == "1.5 Parallel Coordinate Plot":
    st.header("1.5 Parallel Coordinate Plot")
    st.write(
        "Each line represents one customer record traced across "
        "total_bill, tip, and size axes."
    )

    day_map = {'Thur': 0, 'Fri': 1, 'Sat': 2, 'Sun': 3}
    df['day_num'] = df['day'].map(day_map)

    fig = px.parallel_coordinates(
        df,
        dimensions=['total_bill', 'tip', 'size'],
        color='day_num',
        color_continuous_scale=px.colors.sequential.Viridis,
        labels={
            'total_bill': 'Total Bill ($)',
            'tip': 'Tip ($)',
            'size': 'Group Size',
            'day_num': 'Day (0=Thu, 3=Sun)',
        },
        title='Parallel Coordinate Plot: Bill, Tip, and Group Size',
    )

    fig.update_layout(
        coloraxis_colorbar=dict(
            title='Day',
            tickvals=[0, 1, 2, 3],
            ticktext=['Thu', 'Fri', 'Sat', 'Sun'],
        )
    )

    st.plotly_chart(fig, use_container_width=True)
    st.write(
        "Lines cluster together when records share similar patterns. "
        "Drag the axis ranges to filter and highlight subsets of data."
    )

    st.info(
        "Task: Drag on the tip axis to select only tips above $4. "
        "Which group sizes are most common for high tippers?\n\n Answer: 4 has the most common group size for tips above $4, followed by 2 and 3."
    )

# ── 1.6 Grand Tour (3D Scatter Plot) ─────────────────────────────────────────
if section == "1.6 Grand Tour (3D Scatter)":
    st.header("1.6 Grand Tour: 3D Scatter Plot")
    st.write(
        "Explore total_bill, tip, and size in a rotatable 3D space. "
        "Click and drag to rotate the view."
    )

    fig_3d = px.scatter_3d(
        df,
        x='total_bill',
        y='tip',
        z='size',
        color='day',
        symbol='sex',
        size='tip',
        size_max=15,
        opacity=0.8,
        hover_data=['smoker', 'time'],
        color_discrete_sequence=px.colors.qualitative.Set2,
        title='3D Scatter: Total Bill vs Tip vs Group Size',
    )

    fig_3d.update_layout(
        scene=dict(
            xaxis_title='Total Bill ($)',
            yaxis_title='Tip ($)',
            zaxis_title='Group Size',
        ),
        legend_title='Day',
    )

    st.plotly_chart(fig_3d, use_container_width=True)
    st.write(
        "Rotate the chart by clicking and dragging. Zoom with the scroll wheel. "
        "Color represents the day, shape represents sex, and point size represents tip amount."
    )

    st.info(
        "Task: Rotate the 3D chart to find the angle that best separates the four days. "
        "Can you identify any outliers?\n\n Answer: Yes, (Sat,Male), (Thur, Male), and (Sun, Male)"
    )
