import streamlit as st
import pandas as pd
import altair as alt
import seaborn as sns
import matplotlib.pyplot as plt
import plotly.express as px

# Load Iris dataset
df = pd.read_csv(r'C:\Users\user\Desktop\MiniProject Data Scientist\Data Visualization\Lab_3\iris.csv')

# Derived categorical column used across several charts
df['petal_size'] = pd.cut(
    df['petal_length'],
    bins=2,
    labels=['Small Petal', 'Large Petal'],
)

st.title('Lab 3 – Muhammad Umair Arif Bin Mohd Azmi – 22005713')
st.subheader('Data Visualization using Iris Dataset')

st.sidebar.title('Navigation')
section = st.sidebar.selectbox(
    'Choose a visualization',
    [
        '2.1 Mosaic Plot',
        '2.2 Trellis Display',
        '2.3 Heatmap',
        '2.4 Multivariate Scatter Plot',
        '2.5 Parallel Coordinate Plot',
        '2.6 Grand Tour (3D Scatter Plot)',
        'Assignment: Violin Plot',
    ],
)

# 2.1 Mosaic Plot (Marimekko) 
if section == '2.1 Mosaic Plot':
    st.header('2.1 Mosaic Plot (Marimekko)')
    st.write(
        'Shows sepal length distribution grouped by Species and Petal Size category. '
        'Width of each segment represents its proportion within the species.'
    )

    mosaic_data = (
        df.groupby(['species', 'petal_size'])['sepal_length']
        .sum()
        .reset_index()
    )

    mosaic_chart = (
        alt.Chart(mosaic_data)
        .mark_bar(cornerRadiusTopLeft=3, cornerRadiusTopRight=3)
        .encode(
            x=alt.X(
                'species:N',
                title='Species',
                axis=alt.Axis(labelAngle=0, labelFontSize=13),
            ),
            y=alt.Y(
                'sepal_length:Q',
                stack='normalize',
                title='Proportion of Sepal Length',
                axis=alt.Axis(format='%'),
            ),
            color=alt.Color(
                'petal_size:N',
                scale=alt.Scale(scheme='tableau10'),
                legend=alt.Legend(title='Petal Size'),
            ),
            tooltip=[
                alt.Tooltip('species:N', title='Species'),
                alt.Tooltip('petal_size:N', title='Petal Size'),
                alt.Tooltip('sepal_length:Q', title='Sum Sepal Length', format='.2f'),
            ],
        )
        .properties(
            width=600,
            height=400,
            title='Mosaic Plot: Sepal Length Proportion by Species and Petal Size',
        )
    )

    st.altair_chart(mosaic_chart, use_container_width=True)
    st.write(
        'Each bar shows the proportion of sepal length contributed by Small vs Large Petal '
        'observations within each species. Virginica and Versicolor are dominated by large-petal '
        'flowers, while Setosa is entirely small-petal.'
    )

# 2.2 Trellis Display
if section == '2.2 Trellis Display':
    st.header('2.2 Trellis Display')
    st.write(
        'Scatter plots of Sepal Length vs Petal Length, one panel per species. '
        'Color encodes Petal Size category.'
    )

    trellis_chart = (
        alt.Chart(df)
        .mark_circle(size=70, opacity=0.75)
        .encode(
            x=alt.X('sepal_length:Q', title='Sepal Length (cm)', scale=alt.Scale(zero=False)),
            y=alt.Y('petal_length:Q', title='Petal Length (cm)', scale=alt.Scale(zero=False)),
            color=alt.Color(
                'petal_size:N',
                scale=alt.Scale(scheme='set1'),
                legend=alt.Legend(title='Petal Size'),
            ),
            tooltip=[
                'species',
                alt.Tooltip('sepal_length:Q', format='.2f'),
                alt.Tooltip('petal_length:Q', format='.2f'),
                alt.Tooltip('sepal_width:Q', format='.2f'),
            ],
        )
        .facet(facet=alt.Facet('species:N', title='Species'), columns=2)
        .properties(title='Trellis: Sepal Length vs Petal Length by Species')
    )

    st.altair_chart(trellis_chart, use_container_width=True)
    st.write(
        'Each panel shows the relationship between sepal length and petal length for one species. '
        'Virginica shows the strongest positive relationship, while Setosa has the weakest '
        '(shortest petals regardless of sepal length).'
    )

# 2.3 Heatmap
if section == '2.3 Heatmap':
    st.header('2.3 Heatmap')
    st.write('Correlation heatmap of all four numeric variables in the Iris dataset.')

    numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
    corr_matrix = df[numeric_cols].corr().reset_index().melt(id_vars='index')
    corr_matrix.columns = ['var1', 'var2', 'correlation']

    heatmap_chart = (
        alt.Chart(corr_matrix)
        .mark_rect(stroke='white', strokeWidth=2)
        .encode(
            x=alt.X('var1:N', title='Variable', axis=alt.Axis(labelAngle=-30, labelFontSize=12)),
            y=alt.Y('var2:N', title='Variable', axis=alt.Axis(labelFontSize=12)),
            color=alt.Color(
                'correlation:Q',
                scale=alt.Scale(scheme='redblue', domain=[-1, 1]),
                legend=alt.Legend(title='Correlation'),
            ),
            tooltip=[
                alt.Tooltip('var1:N', title='Variable 1'),
                alt.Tooltip('var2:N', title='Variable 2'),
                alt.Tooltip('correlation:Q', title='Correlation', format='.3f'),
            ],
        )
        .properties(
            width=420,
            height=380,
            title='Correlation Heatmap: Iris Numeric Variables',
        )
    )

    text_layer = (
        alt.Chart(corr_matrix)
        .mark_text(fontSize=12, fontWeight='bold')
        .encode(
            x=alt.X('var1:N'),
            y=alt.Y('var2:N'),
            text=alt.Text('correlation:Q', format='.2f'),
            color=alt.condition(
                'datum.correlation > 0.5 || datum.correlation < -0.5',
                alt.value('white'),
                alt.value('black'),
            ),
        )
    )

    st.altair_chart(heatmap_chart + text_layer, use_container_width=True)
    st.write(
        'Red = strong positive correlation, Blue = strong negative. '
        'Petal length and petal width are highly correlated (≈ 0.96). '
        'Sepal width shows weak or negative correlations with the other variables.'
    )

# 2.4 Multivariate Scatter Plot
if section == '2.4 Multivariate Scatter Plot':
    st.header('2.4 Multivariate Scatter Plot')
    st.write(
        'Five dimensions encoded simultaneously: Sepal Length (x), Petal Length (y), '
        'Species (color), Petal Size (shape), and Sepal Width (point size).'
    )

    multi_scatter = (
        alt.Chart(df)
        .mark_point(filled=True, opacity=0.85, strokeWidth=0.5)
        .encode(
            x=alt.X(
                'sepal_length:Q',
                title='Sepal Length (cm)',
                scale=alt.Scale(zero=False),
            ),
            y=alt.Y(
                'petal_length:Q',
                title='Petal Length (cm)',
                scale=alt.Scale(zero=False),
            ),
            color=alt.Color(
                'species:N',
                scale=alt.Scale(scheme='tableau10'),
                legend=alt.Legend(title='Species'),
            ),
            shape=alt.Shape(
                'petal_size:N',
                legend=alt.Legend(title='Petal Size'),
            ),
            size=alt.Size(
                'sepal_width:Q',
                scale=alt.Scale(range=[60, 450]),
                legend=alt.Legend(title='Sepal Width (cm)'),
            ),
            tooltip=[
                'species',
                alt.Tooltip('sepal_length:Q', format='.2f'),
                alt.Tooltip('petal_length:Q', format='.2f'),
                alt.Tooltip('sepal_width:Q', format='.2f'),
                alt.Tooltip('petal_width:Q', format='.2f'),
                'petal_size',
            ],
        )
        .properties(
            width=640,
            height=420,
            title='Multivariate Scatter: Sepal Length vs Petal Length '
                  '(color=Species, shape=Petal Size, size=Sepal Width)',
        )
        .interactive()
    )

    st.altair_chart(multi_scatter, use_container_width=True)
    st.write(
        'Each point encodes 5 variables simultaneously. Setosa forms a tight cluster '
        'at low petal length; Virginica occupies the high end. Larger points (wider sepals) '
        'are visible throughout Setosa. Hover over any point for full details.'
    )

# 2.5 Parallel Coordinate Plot 
if section == '2.5 Parallel Coordinate Plot':
    st.header('2.5 Parallel Coordinate Plot')
    st.write(
        'Each line represents one iris flower traced across all four measurement axes. '
        'Color encodes species.'
    )

    species_map = {'setosa': 0, 'versicolor': 1, 'virginica': 2}
    df['species_num'] = df['species'].map(species_map)

    fig = px.parallel_coordinates(
        df,
        dimensions=['sepal_length', 'sepal_width', 'petal_length', 'petal_width'],
        color='species_num',
        color_continuous_scale=px.colors.diverging.Tealrose,
        labels={
            'sepal_length': 'Sepal Length',
            'sepal_width': 'Sepal Width',
            'petal_length': 'Petal Length',
            'petal_width': 'Petal Width',
            'species_num': 'Species',
        },
        title='Parallel Coordinate Plot: All Iris Measurements by Species',
    )

    fig.update_layout(
        coloraxis_colorbar=dict(
            title='Species',
            tickvals=[0, 1, 2],
            ticktext=['Setosa', 'Versicolor', 'Virginica'],
        ),
        font=dict(size=13),
    )

    st.plotly_chart(fig, use_container_width=True)
    st.write(
        'Lines cluster by species across all axes. Setosa (teal) is clearly separated by '
        'petal length and petal width. Versicolor and Virginica overlap slightly on sepal '
        'dimensions but diverge on petal dimensions. Drag axis ranges to highlight subsets.'
    )

# 2.6 Grand Tour (3D Scatter Plot)
if section == '2.6 Grand Tour (3D Scatter Plot)':
    st.header('2.6 Grand Tour: 3D Scatter Plot')
    st.write(
        'Explore Sepal Length, Petal Length, and Petal Width in a rotatable 3D space. '
        'Click and drag to rotate the view.'
    )

    fig_3d = px.scatter_3d(
        df,
        x='sepal_length',
        y='petal_length',
        z='petal_width',
        color='species',
        symbol='petal_size',
        size='sepal_width',
        size_max=12,
        opacity=0.82,
        hover_data=['sepal_width'],
        color_discrete_sequence=px.colors.qualitative.Set2,
        title='3D Scatter: Sepal Length vs Petal Length vs Petal Width',
    )

    fig_3d.update_layout(
        scene=dict(
            xaxis=dict(title=dict(text='Sepal Length (cm)', font=dict(color='#333333', size=12))),
            yaxis=dict(title=dict(text='Petal Length (cm)', font=dict(color='#333333', size=12))),
            zaxis=dict(title=dict(text='Petal Width (cm)', font=dict(color='#333333', size=12))),
            bgcolor='rgba(240,240,248,1)',
        ),
        legend_title='Species',
        font=dict(size=12),
    )

    st.plotly_chart(fig_3d, use_container_width=True)
    st.write(
        'Rotate the chart by clicking and dragging. Zoom with the scroll wheel. '
        'Color represents species, shape represents petal size, and point size represents '
        'sepal width. The three species form well-separated clusters in 3D space, with '
        'Setosa completely isolated at low petal values.'
    )

# Assignment: Violin Plot
if section == 'Assignment: Violin Plot':
    st.header('2.7 Assignment: Violin Plot')
    st.write(
        'Distribution of Petal Length for each species, shown as a violin with embedded box plot.'
    )

    violin_chart = px.violin(
        df,
        x='species',
        y='petal_length',
        color='species',
        box=True,
        points='all',
        color_discrete_sequence=px.colors.qualitative.Set2,
        title='Violin Plot: Petal Length Distribution by Species',
        labels={'species': 'Species', 'petal_length': 'Petal Length (cm)'},
    )

    violin_chart.update_layout(
        showlegend=False,
        font=dict(size=13),
        plot_bgcolor='rgba(245,245,250,1)',
    )

    st.plotly_chart(violin_chart, use_container_width=True)
