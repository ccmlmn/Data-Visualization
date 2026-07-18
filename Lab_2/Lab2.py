import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import altair as alt

DATA_PATH = "C:\\Users\\user\\Desktop\\MiniProject Data Scientist\\Data Visualization\\Lab_2\\"

sdg_data = pd.read_csv(DATA_PATH + "sustainable_development_report_2023.csv")
sdg_index = pd.read_csv(DATA_PATH + "sdg_index_2000-2022.csv")

# Merge region into the time-series dataset
sdg_index = sdg_index.merge(
    sdg_data[["country_code", "region"]], on="country_code", how="left"
)

st.title("Sustainable Development Goals (SDG) Data Visualization")
st.subheader("Muhammad Umair Arif Bin Mohd Azmi - 22005713 Lab 2")
st.divider()

page = st.sidebar.selectbox(
    "Select a Visualization",
    [
        "Question 1 - Scatter Plot",
        "Question 2 - Presentation Bar Chart",
        "Question 3 - Linked Highlighting",
        "Question 4 - SDG Reflection",
    ],
)

# Q1 – Interactive Scatter Plot (Altair with tooltips)
if page == "Question 1 - Scatter Plot":
    st.subheader("Economic Growth Score vs SDG Index Score by Country")
    st.write(
        "Each point represents a country. The X-axis shows the **SDG Goal 8 score** "
        "(Decent Work & Economic Growth) and the Y-axis shows the overall **SDG Index Score**. "
        "Countries are coloured by region. Hover over a point to see country details."
    )

    scatter = (
        alt.Chart(sdg_data)
        .mark_circle(size=80, opacity=0.8)
        .encode(
            x=alt.X("goal_8_score:Q", title="Goal 8 Score (Economic Growth)"),
            y=alt.Y("overall_score:Q", title="SDG Index Score"),
            color=alt.Color("region:N", legend=alt.Legend(title="Region")),
            tooltip=[
                alt.Tooltip("country:N", title="Country"),
                alt.Tooltip("region:N", title="Region"),
                alt.Tooltip("goal_8_score:Q", title="Goal 8 Score", format=".2f"),
                alt.Tooltip("overall_score:Q", title="SDG Index Score", format=".2f"),
            ],
        )
        .properties(
            title="SDG Goal 8 (Economic Growth) vs Overall SDG Index Score (2023)",
            width=700,
            height=450,
        )
        .interactive()
    )

    st.altair_chart(scatter, use_container_width=True)

    st.subheader("Explanation")
    st.write(
        "From the scatter plot, we can see that countries with a higher Goal 8 score also tend to "
        "have a higher overall SDG score. This makes sense because when people have jobs and a decent "
        "income, other areas of life like health and education tend to improve too. "
        "Wealthier countries like those in the OECD group are bunched up in the top-right, "
        "while many countries in Sub-Saharan Africa sit in the bottom-left, showing they still "
        "have a long way to go across most development goals."
    )

# Q2 – Static Bar Chart (Matplotlib)
elif page == "Question 2 - Presentation Bar Chart":
    st.subheader("Average SDG Index Score by Region (2023)")

    region_avg = (
        sdg_data.groupby("region")["overall_score"]
        .mean()
        .sort_values(ascending=False)
    )

    colors = plt.cm.Set2.colors[:len(region_avg)]

    fig, ax = plt.subplots(figsize=(10, 5))

    bars = ax.bar(region_avg.index, region_avg.values, color=colors, edgecolor="white", linewidth=0.8)

    # Add score labels on top of each bar
    for bar, val in zip(bars, region_avg.values):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 0.5,
            f"{val:.1f}",
            ha="center", va="bottom", fontsize=10, fontweight="bold"
        )

    ax.set_title("Average SDG Index Score by Region (2023)", fontsize=14, fontweight="bold", pad=12)
    ax.set_xlabel("Region", fontsize=11)
    ax.set_ylabel("Average SDG Score", fontsize=11)
    ax.set_ylim(0, 90)
    ax.tick_params(axis="x", labelrotation=15)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    plt.tight_layout()

    st.pyplot(fig)
    plt.close(fig)

    st.subheader("Findings")
    st.write(
        "Looking at the bar chart, OECD countries clearly have the highest average SDG score at "
        "around 79. This is not surprising since these are mostly rich, developed nations with "
        "good healthcare, education, and government systems. Sub-Saharan Africa is at the bottom "
        "with a score of about 55, which tells us that this region is still struggling with basic "
        "needs like clean water, food, and access to schools. The gap between the top and bottom "
        "regions is quite large, which shows that global development is still very unequal."
    )

# Q3 – Linked Highlighting (Altair)
elif page == "Question 3 - Linked Highlighting":
    st.subheader("Linked Highlighting: Bar Chart ↔ Scatter Plot")
    st.write("Hover over a bar in the **bar chart** to highlight that region's countries in the **scatter plot**.")

    region_avg = (
        sdg_data.groupby("region", as_index=False)["overall_score"]
        .mean()
        .rename(columns={"overall_score": "avg_score"})
    )

    region_selection = alt.selection_point(fields=["region"], on="mouseover", empty="all")

    bar = (
        alt.Chart(region_avg)
        .mark_bar()
        .encode(
            x=alt.X("avg_score:Q", title="Average SDG Score", scale=alt.Scale(domain=[0, 90])),
            y=alt.Y("region:N", sort="-x", title="Region"),
            color=alt.condition(
                region_selection,
                alt.Color("region:N", legend=None),
                alt.value("lightgray"),
            ),
            tooltip=["region:N", alt.Tooltip("avg_score:Q", format=".1f", title="Avg Score")],
        )
        .add_params(region_selection)
        .properties(title="Average SDG Score by Region", width=350, height=250)
    )

    scatter = (
        alt.Chart(sdg_data)
        .mark_circle(size=70, opacity=0.75)
        .encode(
            x=alt.X("goal_8_score:Q", title="Goal 8 Score (Economic Growth)"),
            y=alt.Y("overall_score:Q", title="SDG Index Score"),
            color=alt.condition(
                region_selection,
                alt.Color("region:N", legend=alt.Legend(title="Region")),
                alt.value("lightgray"),
            ),
            tooltip=["country:N", "region:N", "goal_8_score:Q", "overall_score:Q"],
        )
        .properties(title="Goal 8 vs Overall SDG Score by Country", width=400, height=350)
    )

    linked_chart = alt.hconcat(bar, scatter).resolve_legend(color="independent")
    st.altair_chart(linked_chart, use_container_width=True)

    st.subheader("How Linking Helps")
    st.write(
        "When you hover over a region in the bar chart, the scatter plot only highlights the "
        "countries from that region. This is really useful because when all countries are shown "
        "at once, it can get messy and hard to read. For example, hovering over Sub-Saharan Africa "
        "shows that its countries are all grouped together in the low-score area, while OECD "
        "countries are spread across the higher end. Without this linking feature, those patterns "
        "would be much harder to spot."
    )

# Q4 – SDG Reflection: SDG 4 (Quality Education) over time (Matplotlib)
elif page == "Question 4 - SDG Reflection":
    st.subheader("SDG 4 (Quality Education) Progress by Region (2000–2022)")

    missing_region = sdg_index["region"].isna().sum()
    if missing_region > 0:
        st.caption(f"Note: {missing_region} rows were excluded because their country could not be matched to a region.")

    edu_df = (
        sdg_index.dropna(subset=["region", "goal_4_score"])
        .groupby(["year", "region"])["goal_4_score"]
        .mean()
        .reset_index()
    )

    regions = edu_df["region"].unique()
    colors = plt.cm.tab10.colors

    fig, ax = plt.subplots(figsize=(11, 6))

    for i, region in enumerate(regions):
        region_data = edu_df[edu_df["region"] == region]
        ax.plot(
            region_data["year"],
            region_data["goal_4_score"],
            marker="o", markersize=4,
            color=colors[i % len(colors)],
            label=region,
            linewidth=1.8,
        )

    ax.set_title("Average SDG Goal 4 (Quality Education) Score by Region (2000-2022)",
                 fontsize=13, fontweight="bold", pad=12)
    ax.set_xlabel("Year", fontsize=11)
    ax.set_ylabel("Goal 4 Score (Quality Education)", fontsize=11)
    ax.legend(title="Region", bbox_to_anchor=(1.01, 1), loc="upper left", fontsize=9)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="y", linestyle="--", alpha=0.4)
    plt.tight_layout()

    st.pyplot(fig)
    plt.close(fig)

    st.subheader("Reflection")
    st.write(
        """
        **SDG 4 - Quality Education** is all about making sure every child and adult has access
        to good quality education, no matter where they are from. Looking at the line chart, it is
        clear that OECD countries have been doing well for a long time and their scores have stayed
        high throughout the years from 2000 to 2022. On the other hand, Sub-Saharan Africa has the
        lowest scores overall, though we can see some slow improvement over time which is at least
        a positive sign. Regions like East & South Asia and Eastern Europe have also improved quite
        a bit, which shows that with the right support and investment in schools and teachers, change
        is possible. Education is really important because it affects almost everything else in life.
        When kids get a good education, they are more likely to get better jobs, stay healthy, and
        make better decisions for their communities. It also helps with other SDG goals like reducing
        poverty and achieving gender equality. So closing the education gap, especially in Sub-Saharan
        Africa, is one of the most important things the world needs to work on right now.
        """
    )
