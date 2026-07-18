const formatCurrency = d3.format("$,.0f");
const formatNumber = d3.format(",");
const formatPercent = d3.format(".1%");

const state = {
    year: "All",
    category: "All",
    shipMode: "All",
    subCategory: "All"
};

const tooltip = d3.select("#tooltip");

const color = d3.scaleOrdinal(d3.schemeTableau10);

Promise.all([
    d3.csv("sales_data.csv", d3.autoType)
]).then(([rawData]) => {

    const data = rawData.map(d => ({
        ...d,
        orderDate: new Date(d["Order Date"]),
        shipDate: new Date(d["Ship Date"]),
        sales: +d.Sales,
        profit: +d.Profit,
        discount: +d.Discount,
        quantity: +d.Quantity
    }));

    buildFilters(data);
    updateDashboard(data);

    d3.select("#yearFilter").on("change", event => {
        state.year = event.target.value;
        updateDashboard(data);
    });

    d3.select("#categoryFilter").on("change", event => {
        state.category = event.target.value;
        state.subCategory = "All";
        updateDashboard(data);
    });

    d3.select("#shipFilter").on("change", event => {
        state.shipMode = event.target.value;
        updateDashboard(data);
    });

    d3.select("#resetBtn").on("click", () => {
        state.year = "All";
        state.category = "All";
        state.shipMode = "All";
        state.subCategory = "All";

        d3.select("#yearFilter").property("value", "All");
        d3.select("#categoryFilter").property("value", "All");
        d3.select("#shipFilter").property("value", "All");

        updateDashboard(data);
    });

});

function buildFilters(data) {

    const years = [
        "All",
        ...Array.from(
            new Set(data.map(d => d.orderDate.getFullYear()))
        ).sort()
    ];

    const categories = [
        "All",
        ...Array.from(
            new Set(data.map(d => d.Category))
        ).sort()
    ];

    const shipModes = [
        "All",
        ...Array.from(
            new Set(data.map(d => d["Ship Mode"]))
        ).sort()
    ];

    fillSelect("#yearFilter", years);
    fillSelect("#categoryFilter", categories);
    fillSelect("#shipFilter", shipModes);
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

        const yearOk =
            state.year === "All" ||
            d.orderDate.getFullYear().toString() === state.year;

        const categoryOk =
            state.category === "All" ||
            d.Category === state.category;

        const shipOk =
            state.shipMode === "All" ||
            d["Ship Mode"] === state.shipMode;

        const subOk =
            state.subCategory === "All" ||
            d["Sub-Category"] === state.subCategory;

        return yearOk && categoryOk && shipOk && subOk;

    });

}

function updateDashboard(data) {

    const filtered = getFilteredData(data);

    updateKPIs(filtered);
    drawLineChart(filtered);
    drawDonutChart(filtered);
    drawBarChart(filtered, data);
    drawScatterChart(filtered);

}

function updateKPIs(data) {

    const totalSales = d3.sum(data, d => d.sales);
    const totalProfit = d3.sum(data, d => d.profit);

    const orders =
        new Set(data.map(d => d["Order ID"])).size;

    const avgDiscount =
        d3.mean(data, d => d.discount) || 0;

    d3.select("#kpiSales")
        .text(formatCurrency(totalSales));

    d3.select("#kpiProfit")
        .text(formatCurrency(totalProfit));

    d3.select("#kpiOrders")
        .text(formatNumber(orders));

    d3.select("#kpiDiscount")
        .text(formatPercent(avgDiscount));

}

function drawLineChart(data) {

    const svg = d3.select("#lineChart");
    svg.selectAll("*").remove();

    const { width, height } = getSvgSize(svg);

    const margin = {
        top: 20,
        right: 80,
        bottom: 45,
        left: 70
    };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const monthly = Array.from(
        d3.rollup(
            data,
            v => ({
                sales: d3.sum(v, d => d.sales),
                profit: d3.sum(v, d => d.profit)
            }),
            d => d3.timeMonth(d.orderDate)
        ),
        ([date, values]) => ({
            date,
            ...values
        })
    ).sort((a, b) => a.date - b.date);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
        .domain(d3.extent(monthly, d => d.date))
        .range([0, innerWidth]);

    const y = d3.scaleLinear()
        .domain([
            0,
            d3.max(monthly, d => Math.max(d.sales, d.profit)) || 1
        ])
        .nice()
        .range([innerHeight, 0]);

    g.append("g")
        .attr("class", "grid")
        .call(
            d3.axisLeft(y)
                .tickSize(-innerWidth)
                .tickFormat("")
        );

    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
            d3.axisBottom(x).ticks(6)
        );

    g.append("g")
        .attr("class", "axis")
        .call(
            d3.axisLeft(y)
                .tickFormat(d3.format("$.2s"))
        );

    const lineSales = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.sales))
        .curve(d3.curveMonotoneX);

    const lineProfit = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.profit))
        .curve(d3.curveMonotoneX);

    g.append("path")
        .datum(monthly)
        .attr("fill", "none")
        .attr("stroke", "#2563eb")
        .attr("stroke-width", 3)
        .attr("d", lineSales);

    g.append("path")
        .datum(monthly)
        .attr("fill", "none")
        .attr("stroke", "#16a34a")
        .attr("stroke-width", 3)
        .attr("d", lineProfit);

    const points = g.selectAll("circle.point")
        .data(monthly)
        .join("circle")
        .attr("class", "point")
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(d.sales))
        .attr("r", 4)
        .attr("fill", "#2563eb")
        .on("mousemove", (event, d) =>
            showTooltip(
                event,
                `<b>${d3.timeFormat("%b %Y")(d.date)}</b><br>
                Sales: ${formatCurrency(d.sales)}<br>
                Profit: ${formatCurrency(d.profit)}`
            )
        )
        .on("mouseleave", hideTooltip);

    addLegend(g, innerWidth + 15, 10, [
        {
            label: "Sales",
            color: "#2563eb"
        },
        {
            label: "Profit",
            color: "#16a34a"
        }
    ]);

}

function drawDonutChart(data) {

    const svg = d3.select("#donutChart");
    svg.selectAll("*").remove();

    const { width, height } = getSvgSize(svg);

    const radius = Math.min(width, height) / 2 - 35;

    const g = svg.append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    const categoryData = Array.from(
        d3.rollup(
            data,
            v => d3.sum(v, d => d.sales),
            d => d.Category
        ),
        ([category, sales]) => ({
            category,
            sales
        })
    ).sort((a, b) => b.sales - a.sales);

    const pie = d3.pie()
        .value(d => d.sales)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(radius * 0.58)
        .outerRadius(radius);

    color.domain(categoryData.map(d => d.category));

    g.selectAll("path")
        .data(pie(categoryData))
        .join("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.category))
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .on("click", (event, d) => {
            state.category = d.data.category;
            d3.select("#categoryFilter")
                .property("value", state.category);
            updateDashboard(window.__salesData || []);
        })
        .on("mousemove", (event, d) =>
            showTooltip(
                event,
                `<b>${d.data.category}</b><br>
                Sales: ${formatCurrency(d.data.sales)}`
            )
        )
        .on("mouseleave", hideTooltip);

    g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.2em")
        .attr("font-size", 22)
        .attr("font-weight", "bold")
        .text(formatCurrency(d3.sum(categoryData, d => d.sales)));

    g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "1.8em")
        .attr("fill", "#6b7280")
        .text("Total sales");

    const legend = svg.append("g")
        .attr("transform", `translate(20,20)`);

    categoryData.forEach((d, i) => {

        const item = legend.append("g")
            .attr("transform", `translate(0,${i * 22})`);

        item.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", color(d.category));

        item.append("text")
            .attr("x", 18)
            .attr("y", 10)
            .attr("class", "legend")
            .text(d.category);

    });

}

function drawBarChart(data, allData) {

    window.__salesData = allData;

    const svg = d3.select("#barChart");
    svg.selectAll("*").remove();

    const { width, height } = getSvgSize(svg);

    const margin = {
        top: 10,
        right: 25,
        bottom: 45,
        left: 120
    };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const topData = Array.from(
        d3.rollup(
            data,
            v => d3.sum(v, d => d.sales),
            d => d["Sub-Category"]
        ),
        ([subCategory, sales]) => ({
            subCategory,
            sales
        })
    )
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max(topData, d => d.sales) || 1])
        .nice()
        .range([0, innerWidth]);

    const y = d3.scaleBand()
        .domain(topData.map(d => d.subCategory))
        .range([0, innerHeight])
        .padding(0.25);

    g.append("g")
        .attr("class", "grid")
        .call(
            d3.axisTop(x)
                .tickSize(-innerHeight)
                .tickFormat("")
        );

    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));

    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
            d3.axisBottom(x)
                .tickFormat(d3.format("$.2s"))
        );

    g.selectAll("rect")
        .data(topData)
        .join("rect")
        .attr("y", d => y(d.subCategory))
        .attr("height", y.bandwidth())
        .attr("x", 0)
        .attr("width", d => x(d.sales))
        .attr("rx", 6)
        .attr("fill", d =>
            state.subCategory === d.subCategory
                ? "#f97316"
                : "#6366f1"
        )
        .on("click", (event, d) => {
            state.subCategory =
                state.subCategory === d.subCategory
                    ? "All"
                    : d.subCategory;

            updateDashboard(allData);
        })
        .on("mousemove", (event, d) =>
            showTooltip(
                event,
                `<b>${d.subCategory}</b><br>
                Sales: ${formatCurrency(d.sales)}<br>
                Click to filter`
            )
        )
        .on("mouseleave", hideTooltip);

}

function drawScatterChart(data) {

    const svg = d3.select("#scatterChart");
    svg.selectAll("*").remove();

    const { width, height } = getSvgSize(svg);

    const margin = {
        top: 15,
        right: 30,
        bottom: 55,
        left: 70
    };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const sample = data.filter(d =>
        Number.isFinite(d.discount) &&
        Number.isFinite(d.profit)
    );

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max(sample, d => d.discount) || 1])
        .nice()
        .range([0, innerWidth]);

    const y = d3.scaleLinear()
        .domain(d3.extent(sample, d => d.profit))
        .nice()
        .range([innerHeight, 0]);

    g.append("g")
        .attr("class", "grid")
        .call(
            d3.axisLeft(y)
                .tickSize(-innerWidth)
                .tickFormat("")
        );

    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
            d3.axisBottom(x)
                .tickFormat(formatPercent)
        );

    g.append("g")
        .attr("class", "axis")
        .call(
            d3.axisLeft(y)
                .tickFormat(d3.format("$.2s"))
        );

    g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 42)
        .attr("text-anchor", "middle")
        .attr("fill", "#6b7280")
        .text("Discount");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("fill", "#6b7280")
        .text("Profit");

    const circles = g.selectAll("circle")
        .data(sample)
        .join("circle")
        .attr("cx", d => x(d.discount))
        .attr("cy", d => y(d.profit))
        .attr("r", 4)
        .attr("fill", d => color(d.Category))
        .attr("opacity", 0.58)
        .on("mousemove", (event, d) =>
            showTooltip(
                event,
                `<b>${d["Product Name"]}</b><br>
                Category: ${d.Category}<br>
                Sales: ${formatCurrency(d.sales)}<br>
                Profit: ${formatCurrency(d.profit)}<br>
                Discount: ${formatPercent(d.discount)}`
            )
        )
        .on("mouseleave", hideTooltip);

    const brush = d3.brush()
        .extent([[0, 0], [innerWidth, innerHeight]])
        .on("brush end", ({ selection }) => {

            if (!selection) {
                circles
                    .attr("stroke", null)
                    .attr("stroke-width", null);

                d3.select("#brushInfo")
                    .text("Brush points to see selected count.");

                return;
            }

            const [[x0, y0], [x1, y1]] = selection;

            let selectedCount = 0;

            circles
                .attr("stroke", d => {

                    const selected =
                        x0 <= x(d.discount) &&
                        x(d.discount) <= x1 &&
                        y0 <= y(d.profit) &&
                        y(d.profit) <= y1;

                    if (selected) selectedCount++;

                    return selected ? "#111827" : null;
                })
                .attr("stroke-width", d => {

                    const selected =
                        x0 <= x(d.discount) &&
                        x(d.discount) <= x1 &&
                        y0 <= y(d.profit) &&
                        y(d.profit) <= y1;

                    return selected ? 1.5 : null;
                });

            d3.select("#brushInfo")
                .text(`${selectedCount} transaction rows selected.`);

        });

    g.append("g")
        .call(brush);

}

function getSvgSize(svg) {

    const node = svg.node();

    const width = node.clientWidth || 600;
    const height = node.clientHeight || 340;

    return { width, height };

}

function addLegend(g, x, y, items) {

    const legend = g.append("g")
        .attr("transform", `translate(${x},${y})`);

    items.forEach((item, i) => {

        const row = legend.append("g")
            .attr("transform", `translate(0,${i * 24})`);

        row.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", item.color);

        row.append("text")
            .attr("x", 18)
            .attr("y", 10)
            .attr("class", "legend")
            .text(item.label);

    });

}

function showTooltip(event, html) {

    tooltip
        .style("opacity", 1)
        .style("left", `${event.clientX}px`)
        .style("top", `${event.clientY}px`)
        .html(html);

}

function hideTooltip() {

    tooltip.style("opacity", 0);

}
