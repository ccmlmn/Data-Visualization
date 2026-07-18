import pandas as pd
import matplotlib.pyplot as plt
import streamlit as st

st.title("Week 2: Data Visualization Exercise with Streamlit")
st.write("This is a simple Streamlit app to visualize data using Matplotlib.")

st.sidebar.title("Navigation")
page = st.sidebar.selectbox('Choose a Page', ['Introduction', 'Showing DataFrame', 'Visualize Picture', 'Visualize Graphs'])

if page == 'Introduction':
    st.title("Introduction")
    st.write("Create a simple app that allows us to display images and graphs.")

if page == 'Visualize Picture':
    st.title('Visualize Picture')
    if st.button('show picture'):
        st.image('https://www.python.org/static/community_logos/python-logo.png', caption='Python Logo')

if page == 'Visualize Graphs':
    st.title('Graph Display')

    if st.button('Show Bar Chart'):
        data = {'Apples': 10, 'Oranges': 15, 'Bananas': 7}
        fig, ax = plt.subplots()
        ax.bar(data.keys(), data.values(), color='skyblue')
        st.pyplot(fig)

data = { 'Coffee Type': ['Espresso', 'Latte', 'Cappuccino', 'Americano', 'Mocha'], 'Sales': [250, 400, 300, 200,
100], }

if page == 'Showing DataFrame':
    st.title('DataFrame Display')
    df = pd.DataFrame(data)
    st.write("### Coffee Sales Data")
    st.dataframe(df)

    # Bar Chart]
    st.subheader("Bar Chart")
    fig, ax = plt.subplots()
    ax.bar(df["Coffee Type"], df["Sales"], color="skyblue")
    ax.set_xlabel("Coffee Type")
    ax.set_ylabel("Sales")
    ax.set_title("Coffee Sales Comparison")
    
    best_sale = df[df["Sales"] == df["Sales"].max()]
    worst_sale = df[df["Sales"] == df["Sales"].min()]
    ax.bar(best_sale["Coffee Type"], best_sale["Sales"], color="green", label="Best Sale")
    ax.bar(worst_sale["Coffee Type"], worst_sale["Sales"], color="red", label="Worst Sale")
    ax.legend() 
    st.pyplot(fig)

    # Pie chart
    st.subheader("Pie Chart of Coffee Sales")
    fig2, ax2 = plt.subplots()
    colors = ["#ff9999","#66b3ff","#99ff99","#ffcc99", "#ff6666"]
    ax2.pie(df["Sales"], labels=df["Coffee Type"],
    autopct="%1.1f%%", startangle=90, colors=colors)
    ax2.axis("equal")
    st.pyplot(fig2)  

    st.write("### Best Sale")
    st.write(best_sale)
    st.write("### Worst Sale")
    st.write(worst_sale)







