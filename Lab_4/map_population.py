import re
import os
import numpy as np
import pandas as pd
import geopandas as gpd
import streamlit as st
import folium
from streamlit_folium import folium_static
import plotly.express as px


def parse_us_states_from_mapdata():
    js_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "us-map", "mapdata.js")
    with open(js_path, "r") as f:
        content = f.read()

    state_block_match = re.search(r'state_specific:\s*\{(.*?)\},\s*locations:', content, re.DOTALL)
    state_block = state_block_match.group(1)

    states = []
    for match in re.finditer(r'(\w{2}):\s*\{([^}]+)\}', state_block, re.DOTALL):
        abbr = match.group(1)
        body = match.group(2)
        name_match = re.search(r'name:\s*"([^"]+)"', body)
        if name_match and 'hide: "yes"' not in body:
            states.append({"abbr": abbr, "name": name_match.group(1)})

    return states


def generate_population_data_malaysia():
    states = ["Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Penang", "Perak",
              "Perlis", "Sabah", "Sarawak", "Selangor", "Terengganu", "Kuala Lumpur", "Labuan", "Putrajaya", "Wilayah Persekutuan"]
    gdp = np.random.randint(650000, 4320000, size=len(states), dtype=np.int64)
    return pd.DataFrame({"State": states, "gdp": gdp})


def generate_population_data_germany():
    states = ["Bayern", "Nordrhein-Westfalen", "Baden-Württemberg", "Hessen", "Sachsen", "Niedersachsen",
              "Rheinland-Pfalz", "Berlin", "Brandenburg", "Sachsen-Anhalt", "Thüringen", "Hamburg",
              "Schleswig-Holstein", "Mecklenburg-Vorpommern", "Saarland", "Bremen"]
    gdp = np.random.randint(500000, 4000000, size=len(states), dtype=np.int64)
    return pd.DataFrame({"State": states, "gdp": gdp})


def generate_population_data_us(us_states):
    abbrs = [s["abbr"] for s in us_states]
    names = [s["name"] for s in us_states]
    gdp = np.random.randint(1000000, 40000000, size=len(us_states), dtype=np.int64)
    return pd.DataFrame({"abbr": abbrs, "State": names, "gdp": gdp})


@st.cache_data
def load_map_malaysia():
    return gpd.read_file("malaysia_states.geojson")


@st.cache_data
def load_map_germany():
    return gpd.read_file("germany_states.geojson")


def plot_map(malaysia_map, data):
    m = folium.Map(location=[4.2105, 101.9758], zoom_start=6)
    folium.Choropleth(
        geo_data=malaysia_map,
        name="GDP Distribution",
        data=data, columns=["State", "gdp"],
        key_on="feature.properties.name",
        fill_color="Greens",
        fill_opacity=0.7,
        line_opacity=0.2,
        legend_name="GDP Distribution",
    ).add_to(m)
    return m


def plot_map_germany(germany_map, data):
    m = folium.Map(location=[51.1657, 10.4515], zoom_start=6)
    folium.Choropleth(
        geo_data=germany_map,
        name="GDP Distribution",
        data=data, columns=["State", "gdp"],
        key_on="feature.properties.name",
        fill_color="Blues",
        fill_opacity=0.7,
        line_opacity=0.2,
        legend_name="GDP Distribution",
    ).add_to(m)
    return m


def plot_map_us(data):
    fig = px.choropleth(
        data,
        locations="abbr",
        locationmode="USA-states",
        color="gdp",
        color_continuous_scale="YlOrRd",
        scope="usa",
        hover_name="State",
        labels={"gdp": "GDP"},
        title="US GDP Distribution by State",
    )
    fig.update_layout(margin={"r": 0, "t": 40, "l": 0, "b": 0})
    return fig


def main():
    st.title("GDP Distribution Map")

    country = st.selectbox("Select a country", ["Malaysia", "Germany", "United States"])

    if country == "Malaysia":
        gdp_data = generate_population_data_malaysia()
    elif country == "Germany":
        gdp_data = generate_population_data_germany()
    else:
        us_states = parse_us_states_from_mapdata()
        gdp_data = generate_population_data_us(us_states)

    st.write("Sample GDP Data for States:")
    st.dataframe(gdp_data)
    st.divider()

    st.subheader("GDP Distribution Map")
    if country == "Malaysia":
        malaysia_map = load_map_malaysia()
        folium_map = plot_map(malaysia_map, gdp_data)
        folium_static(folium_map)
    elif country == "Germany":
        germany_map = load_map_germany()
        folium_map = plot_map_germany(germany_map, gdp_data)
        folium_static(folium_map)
    else:
        fig = plot_map_us(gdp_data)
        st.plotly_chart(fig, use_container_width=True)


if __name__ == "__main__":
    main()
