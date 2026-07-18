import streamlit as st
import pandas as pd
import numpy as np
import altair as alt

# Generate sample data
data = pd.DataFrame({
    'Product Category': np.random.choice(['Appliances', 'Furniture', 'Clothing', 'Games', 'Phones'], size=200),
    'Sales': np.random.randint(50, 500, size=200),
    'Price': np.random.randint(5, 100, size=200),
    'Quantity': np.random.randint(1, 20, size=200),
    'Country': np.random.choice(['Malaysia', 'Singapore', 'Indonesia', 'Thailand', 'Brunei'], size=200),
    'Latitude': np.random.uniform(35, 55, size=200),
    'Longitude': np.random.uniform(-120, 0, size=200)
})

data = data.reset_index().rename(columns={'index': 'Index'})
# App Title
st.title("Linked Views: Data Visualization Examples")
# Sidebar Navigation
example = st.sidebar.selectbox("Choose an Example", ["Bar + Scatter", "Line + Histogram", "Pie + Bar", "Map + Scatter"])
# Bar + Scatter Example
if example == "Bar + Scatter":
    st.subheader("Bar Chart + Scatter Plot")
    # Bar chart for total sales by product category
    bar_chart = alt.Chart(data).mark_bar().encode(x='Product Category', y='sum(Sales)', color='Product Category').interactive()
    # Dropdown to filter scatter plot by category
    selected_category = st.selectbox("Select Product Category", options=data['Product Category'].unique())
    filtered_data = data[data['Product Category'] == selected_category]
    # Scatter plot of price vs quantity
    scatter_plot = alt.Chart(filtered_data).mark_circle(size=60).encode(x='Price', y='Quantity', color='Product Category',
                                                                        tooltip=['Product Category', 'Price', 'Quantity']).interactive()
    
    st.altair_chart(bar_chart, use_container_width=True)
    st.altair_chart(scatter_plot, use_container_width=True)

# Line + Histogram Example
elif example == "Line + Histogram":
    st.subheader("Line Chart + Histogram")
    # Filter by product category
    selected_category_line = st.selectbox("Select Product Category for Line Chart", options=data['Product Category'].unique())
    filtered_data_line = data[data['Product Category'] == selected_category_line]
    # Line chart for price
    line_chart = alt.Chart(filtered_data_line).mark_line().encode(x='Index', y='Price', color='Product Category').interactive()
    # Histogram for quantity
    histogram = alt.Chart(filtered_data_line).mark_bar().encode(
        x=alt.X('Quantity', bin=True),
        y='count()',
        color='Product Category'
    ).interactive()
    st.altair_chart(line_chart, use_container_width=True)
    st.altair_chart(histogram, use_container_width=True)

# Pie + Bar Example
elif example == "Pie + Bar":
    st.subheader("Pie Chart + Bar Chart")
    # Pie chart showing sales by product category
    category_sales = data.groupby('Product Category')['Sales'].sum().reset_index()
    pie_chart = alt.Chart(category_sales).mark_arc().encode(theta='Sales', color='Product Category', tooltip=['Product Category',
    'Sales']).interactive()
    selected_category_pie = st.selectbox(
        "Select Product Category for Bar Chart",
        options=category_sales['Product Category'].unique()
    )
    filtered_data_pie = data[data['Product Category'] == selected_category_pie]
    # Bar chart for sales by country
    bar_chart_country = alt.Chart(filtered_data_pie).mark_bar().encode(x='Country', y='sum(Sales)', color='Country',
    tooltip=['Country', 'sum(Sales)']).interactive()
    st.altair_chart(pie_chart, use_container_width=True)
    st.altair_chart(bar_chart_country, use_container_width=True)

# Map + Scatter Example
elif example == "Map + Scatter":
    st.subheader("Map View + Scatter Plot")
    # Map view for sales by country
    map_view = alt.Chart(data).mark_circle(size=100).encode(
        latitude='Latitude',
        longitude='Longitude',
        color='Product Category',
        tooltip=['Product Category', 'Sales', 'Country']
    ).interactive()
    # Scatter plot for sales vs quantity by country
    selected_country = st.selectbox("Select Country", options=data['Country'].unique())
    filtered_data_map = data[data['Country'] == selected_country]
    scatter_plot_map = alt.Chart(filtered_data_map).mark_circle(size=60).encode(
        x='Sales',
        y='Quantity',
        color='Product Category',
        tooltip=['Product Category', 'Sales', 'Quantity']
    ).interactive()
    st.altair_chart(map_view, use_container_width=True)
    st.altair_chart(scatter_plot_map, use_container_width=True)