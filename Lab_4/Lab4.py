import numpy as np
import pandas as pd
import geopandas as gpd
import streamlit as st
import folium
from streamlit_folium import folium_static

def generate_population_data():
    states = [ "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Penang", "Perak",
    "Perlis", "Sabah", "Sarawak", "Selangor", "Terengganu", "Kuala Lumpur", "Labuan", "Putrajaya" ]
    population = np.random.randint(500000, 5000000, size=len(states))
    data = pd.DataFrame({"State": states, "Population": population})

    return data

@st.cache_data
def load_map():
    malaysia_map = gpd.read_file("malaysia_states.geojson")
    return malaysia_map

def plot_map(malaysia_map, data):
    m = folium.Map(location=[4.2105, 101.9758], zoom_start=6)
    folium.Choropleth(
        geo_data=malaysia_map,
        name="Population Distribution",
        data=data, columns=["State", "Population"],
        key_on="feature.properties.name",
        fill_color="YlOrRd",
        fill_opacity=0.7,
        line_opacity=0.2,
        legend_name="Population Distribution",
    ).add_to(m)

    return m

def main():
    st.title("Malaysia Population Distribution Map")

    population_data = generate_population_data()
    st.write("Sample Population Data for States:")
    st.dataframe(population_data)
    st.divider()

    st.subheader("Population Distribution Map")
    malaysia_map = load_map()
    folium_map = plot_map(malaysia_map, population_data)
    folium_static(folium_map)


if __name__ == "__main__":
    main()