const formatCurrency = d3.format("$,.0f");
const formatNumber = d3.format(",");
const formatPercent = d3.format(".1%");

const state = {
    store: "All",
    holiday: "All",
    year: "All"
};

const tooltip = d3.select("#tooltip");
const color = d3.scaleOrdinal(d3.schemeTableau10);
const parseDate = d3.timeParse("%d-%m-%Y");

Promise.all([
    d3.csv("Walmart_Sales.csv", d => ({
        store: +d.Store,
        date: parseDate(d.Date),
        weeklySales: +d.Weekly_Sales,
        holidayFlag: +d.Holiday_Flag,
        temperature: +d.Temperature,
        fuelPrice: +d.Fuel_Price,
        cpi: +d.CPI,
        unemployment: +d.Unemployment
    }))
]).then(([rawData]) => {
    const data = rawData.filter(d => d.date && !Number.isNaN(d.date.getTime()));
    
    buildFilters(data);
    updateDashboard(data);

    d3.select("#storeFilter").on("change", event => {
        state.store = event.target.value;
        updateDashboard(data);
    });

    d3.select("#holidayFilter").on("change", event => {
        state.holiday = event.target.value;
        updateDashboard(data);
    });

    d3.select("#yearFilter").on("change", event => {
        state.year = event.target.value;
        updateDashboard(data);
    });

    d3.select("#resetBtn").on("click", () => {
        state.store = "All";
        state.holiday = "All";
        state.year = "All";
        d3.select("#storeFilter").property("value", "All");
        d3.select("#holidayFilter").property("value", "All");
        d3.select("#yearFilter").property("value", "All");
        updateDashboard(data);
    });
});

function buildFilters(data) {
    const stores = ["All", ...Array.from(new Set(data.map(d => d.store))).sort((a,b)=>a-b)];
    const holidays = ["All", "Holiday Week", "Non-Holiday Week"];
    const years = ["All", ...Array.from(new Set(data.map(d => d.date.getFullYear()))).sort()];

    fillSelect("#storeFilter", stores);
    fillSelect("#holidayFilter", holidays);
    fillSelect("#yearFilter", years);
}

function fillSelect(selector, values) {
    d3.select(selector)
        .selectAll("option")
        .data(values)
        .join("option")
        .attr("value", d => d)
        .text(d => d);
}

function getFilteredData(data) {
    return data.filter(d => {
        const storeOk = state.store === "All" || d.store.toString() === state.store;
        let holidayOk = true;
        if (state.holiday === "Holiday Week") {
            holidayOk = d.holidayFlag === 1;
        } else if (state.holiday === "Non-Holiday Week") {
            holidayOk = d.holidayFlag === 0;
        }
        const yearOk = state.year === "All" || d.date.getFullYear().toString() === state.year;
        
        return storeOk && holidayOk && yearOk;
    });
}

function updateDashboard(data) {
    const filtered = getFilteredData(data);
    drawLineChart(filtered);
    drawBarChart(filtered, data);
    drawDonutChart(filtered);
    drawScatterChart(filtered);
}

function getSvgSize(svg) {
    const node = svg.node();
    const width = node.clientWidth || 600;
    const height = node.clientHeight || 340;
    return { width, height };
}

function drawLineChart(data) {
    const svg = d3.select("#lineChart");
    svg.selectAll("*").remove();

    if(data.length === 0) return;

    const { width, height } = getSvgSize(svg);
    const margin = { top: 20, right: 80, bottom: 45, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const weeklyData = Array.from(
        d3.rollup(
            data,
            v => d3.sum(v, d => d.weeklySales),
            d => d3.timeWeek.floor(d.date)
        ),
        ([date, weeklySales]) => ({ date, weeklySales })
    ).sort((a, b) => a.date - b.date);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
        .domain(d3.extent(weeklyData, d => d.date))
        .range([0, innerWidth]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(weeklyData, d => d.weeklySales) || 1])
        .nice()
        .range([innerHeight, 0]);

    g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(""));

    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b %Y")));

    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).tickFormat(d3.format("$.2s")));

    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.weeklySales))
        .curve(d3.curveMonotoneX);

    g.append("path")
        .datum(weeklyData)
        .attr("fill", "none")
        .attr("stroke", "#2563eb")
        .attr("stroke-width", 3)
        .attr("d", line);

    g.selectAll("circle.point")
        .data(weeklyData)
        .join("circle")
        .attr("class", "point")
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(d.weeklySales))
        .attr("r", 4)
        .attr("fill", "#2563eb")
        .on("mousemove", (event, d) => showTooltip(
            event, 
            `<b>${d3.timeFormat("%b %d, %Y")(d.date)}</b><br>Sales: ${formatCurrency(d.weeklySales)}`
        ))
        .on("mouseleave", hideTooltip);
}

function drawBarChart(data, allData) {
    const svg = d3.select("#barChart");
    svg.selectAll("*").remove();

    if(data.length === 0) return;

    const storeData = Array.from(
        d3.rollup(
            data,
            v => d3.sum(v, d => d.weeklySales),
            d => d.store
        ),
        ([store, weeklySales]) => ({ store, weeklySales })
    ).sort((a, b) => b.weeklySales - a.weeklySales);

    const { width, height } = getSvgSize(svg);

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const topStore = storeData.length > 0 ? storeData[0] : null;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max(storeData, d => d.weeklySales) || 1])
        .nice()
        .range([0, innerWidth]);

    const y = d3.scaleBand()
        .domain(storeData.map(d => d.store))
        .range([0, innerHeight])
        .padding(0.2);

    g.append("g")
        .attr("class", "grid")
        .call(d3.axisTop(x).tickSize(-innerHeight).tickFormat(""));

    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));

    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("$.2s")));

    g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 35)
        .attr("text-anchor", "middle")
        .attr("fill", "#6b7280")
        .text("Total Weekly Sales");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -38)
        .attr("text-anchor", "middle")
        .attr("fill", "#6b7280")
        .text("Store");

    g.selectAll("rect")
        .data(storeData)
        .join("rect")
        .attr("y", d => y(d.store))
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.weeklySales))
        .attr("rx", 6)
        .attr("fill", d => (topStore && d.store === topStore.store) ? "#f97316" : "#2563eb")
        .on("mousemove", (event, d) => showTooltip(
            event, 
            `<b>Store ${d.store}</b><br>Sales: ${formatCurrency(d.weeklySales)}${(topStore && d.store === topStore.store) ? "<br>Top-performing store" : ""}`
        ))
        .on("mouseleave", hideTooltip);
}

function drawDonutChart(data) {
    const svg = d3.select("#donutChart");
    svg.selectAll("*").remove();

    if(data.length === 0) return;

    const { width, height } = getSvgSize(svg);
    const radius = Math.min(width, height) / 2 - 35;

    const g = svg.append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    const holidayData = Array.from(
        d3.rollup(
            data,
            v => d3.sum(v, d => d.weeklySales),
            d => d.holidayFlag === 1 ? "Holiday Week" : "Non-Holiday Week"
        ),
        ([type, sales]) => ({ type, sales })
    );

    const total = d3.sum(holidayData, d => d.sales);

    const pie = d3.pie().value(d => d.sales).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.58).outerRadius(radius);

    const localColor = d3.scaleOrdinal().domain(["Holiday Week", "Non-Holiday Week"]).range(["#ef4444", "#10b981"]);

    g.selectAll("path")
        .data(pie(holidayData))
        .join("path")
        .attr("d", arc)
        .attr("fill", d => localColor(d.data.type))
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .on("mousemove", (event, d) => {
            const pct = (d.data.sales / total);
            showTooltip(event, `<b>${d.data.type}</b><br>Sales: ${formatCurrency(d.data.sales)}<br>Percent: ${formatPercent(pct)}`);
        })
        .on("mouseleave", hideTooltip);

    g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.2em")
        .attr("font-size", 22)
        .attr("font-weight", "bold")
        .text(formatCurrency(total));

    g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "1.8em")
        .attr("fill", "#6b7280")
        .text("Total sales");

    const legend = svg.append("g").attr("transform", `translate(20,20)`);
    
    holidayData.forEach((d, i) => {
        const item = legend.append("g").attr("transform", `translate(0,${i * 22})`);
        item.append("rect").attr("width", 12).attr("height", 12).attr("fill", localColor(d.type));
        item.append("text").attr("x", 18).attr("y", 10).attr("class", "legend").text(d.type);
    });
}

function drawScatterChart(data) {
    const svg = d3.select("#scatterChart");
    svg.selectAll("*").remove();

    if(data.length === 0) return;

    const { width, height } = getSvgSize(svg);
    const margin = { top: 15, right: 30, bottom: 55, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const sample = data.filter(d => Number.isFinite(d.fuelPrice) && Number.isFinite(d.weeklySales));

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(sample, d => d.fuelPrice))
        .nice()
        .range([0, innerWidth]);

    const y = d3.scaleLinear()
        .domain(d3.extent(sample, d => d.weeklySales))
        .nice()
        .range([innerHeight, 0]);

    g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(""));

    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).tickFormat(d3.format("$.2s")));

    g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 42)
        .attr("text-anchor", "middle")
        .attr("fill", "#6b7280")
        .text("Fuel Price");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .attr("fill", "#6b7280")
        .text("Weekly Sales");
        
    const localColor = d3.scaleOrdinal().domain([1, 0]).range(["#ef4444", "#10b981"]);

    g.selectAll("circle")
        .data(sample)
        .join("circle")
        .attr("cx", d => x(d.fuelPrice))
        .attr("cy", d => y(d.weeklySales))
        .attr("r", 4)
        .attr("fill", d => localColor(d.holidayFlag))
        .attr("opacity", 0.7)
        .on("mousemove", (event, d) => showTooltip(
            event, 
            `<b>Store ${d.store}</b><br>
            Fuel Price: $${d.fuelPrice.toFixed(3)}<br>
            Sales: ${formatCurrency(d.weeklySales)}<br>
            ${d.holidayFlag === 1 ? "Holiday Week" : "Non-Holiday Week"}`
        ))
        .on("mouseleave", hideTooltip);
        
    const legend = svg.append("g").attr("transform", `translate(${innerWidth - 120}, 10)`);
    [
        {label: "Holiday Week", color: "#ef4444"},
        {label: "Non-Holiday Week", color: "#10b981"}
    ].forEach((d, i) => {
        const item = legend.append("g").attr("transform", `translate(0,${i * 22})`);
        item.append("rect").attr("width", 12).attr("height", 12).attr("fill", d.color);
        item.append("text").attr("x", 18).attr("y", 10).attr("class", "legend").text(d.label);
    });
}

function showTooltip(event, html) {
    tooltip
        .style("opacity", 1)
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 20}px`)
        .html(html);
}

function hideTooltip() {
    tooltip.style("opacity", 0);
}
