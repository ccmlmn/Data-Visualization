const width = 900;
const height = 600;

const nodes = [
    { id: "Alice", group: "AI" },
    { id: "Bob", group: "AI" },
    { id: "Charlie", group: "AI" },
    { id: "David", group: "AI" },
    { id: "Farid", group: "AI" },
    { id: "Jino", group: "AI" },
    { id: "Eva", group: "Data Science" },
    { id: "Frank", group: "Data Science" },
    { id: "Grace", group: "Data Science" },
    { id: "Helen", group: "Data Science" },
    { id: "Ian", group: "Web" },
    { id: "Jack", group: "Web" },
    { id: "Kate", group: "Web" },
    { id: "Leo", group: "Web" },
    { id: "Ipan", group: "Web" },
    { id: "Mia", group: "Cybersecurity" },
    { id: "Noah", group: "Cybersecurity" },
    { id: "Olivia", group: "Cybersecurity" },
    { id: "Paul", group: "Cybersecurity" },
    { id: "Queen", group: "Research" },
    { id: "Ryan", group: "Research" },
    { id: "Sophia", group: "Research" },
    { id: "Tom", group: "Research" }
];

const links = [
    { source: "Alice", target: "Bob" },
    { source: "Alice", target: "Charlie" },
    { source: "Bob", target: "David" },
    { source: "Charlie", target: "Eva" },
    { source: "Eva", target: "Frank" },
    { source: "Frank", target: "Grace" },
    { source: "Grace", target: "Helen" },
    { source: "Helen", target: "Ian" },
    { source: "Ian", target: "Jack" },
    { source: "Jack", target: "Kate" },
    { source: "Kate", target: "Leo" },
    { source: "Leo", target: "Mia" },
    { source: "Mia", target: "Noah" },
    { source: "Noah", target: "Olivia" },
    { source: "Olivia", target: "Paul" },
    { source: "Paul", target: "Queen" },
    { source: "Queen", target: "Ryan" },
    { source: "Ryan", target: "Sophia" },
    { source: "Sophia", target: "Tom" },
    { source: "Tom", target: "Alice" },
    { source: "David", target: "Grace" },
    { source: "Bob", target: "Frank" },
    { source: "Kate", target: "Noah" },
    { source: "Eva", target: "Queen" },
    { source: "Charlie", target: "Ryan" }
];

const color = d3.scaleOrdinal()
    .domain(["AI", "Data Science", "Web", "Cybersecurity", "Research"])
    .range(["#ff6b6b", "#4dabf7", "#51cf66", "#ffd43b", "#9775fa"]);

const svg = d3.select("#network")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(120))
    .force("charge", d3.forceManyBody().strength(-500))
    .force("center", d3.forceCenter(width / 2, height / 2));

const link = svg.append("g")
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("stroke", "#999")
    .attr("stroke-width", 2)
    .attr("opacity", 0.7);

const node = svg.append("g")
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("r", 18)
    .attr("fill", d => color(d.group))
    .attr("stroke", "#333")
    .attr("stroke-width", 1.5)
    .call(drag(simulation))
    .on("mouseover", function(event, d) {
        tooltip
            .style("opacity", 1)
            .html(`<strong>${d.id}</strong><br>Group: ${d.group}`)
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 20 + "px");

        d3.select(this).attr("r", 25);
    })
    .on("mouseout", function() {
        tooltip.style("opacity", 0);
        d3.select(this).attr("r", 18);
    });

// clicking a node filters the bar chart and the network
node.on("click", function(event, d) {
    event.stopPropagation();
    updateFilter(d.group);
    bsvg.selectAll(".bar").classed("selected", dd => dd.group === d.group);
});

const label = svg.append("g")
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .text(d => d.id)
    .attr("font-size", 12)
    .attr("dx", 22)
    .attr("dy", 4);

simulation.on("tick", () => {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

    label
        .attr("x", d => d.x)
        .attr("y", d => d.y);
});

function drag(simulation) {
    return d3.drag()
        .on("start", function(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        })
        .on("drag", function(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        })
        .on("end", function(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        });
}

/* ===== barchart setup ===== */
const bWidth = width;
const bHeight = 300;
const bMargin = { top: 20, right: 20, bottom: 50, left: 60 };

const groupNames = Array.from(new Set(nodes.map(d => d.group)));
const counts = [{ group: "All", count: nodes.length }]
    .concat(groupNames.map(g => ({ group: g, count: nodes.filter(n => n.group === g).length })));

const x = d3.scaleBand()
    .domain(counts.map(d => d.group))
    .range([bMargin.left, bWidth - bMargin.right])
    .padding(0.2);

const y = d3.scaleLinear()
    .domain([0, d3.max(counts, d => d.count)]).nice()
    .range([bHeight - bMargin.bottom, bMargin.top]);

const bsvg = d3.select("#barchart")
    .append("svg")
    .attr("width", bWidth)
    .attr("height", bHeight);

const bars = bsvg.selectAll(".bar")
    .data(counts)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.group))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => y(0) - y(d.count))
    .attr("fill", d => d.group === "All" ? "#bbbbbb" : color(d.group))
    .on("click", (event, d) => {
        const group = d.group === "All" ? null : d.group;
        updateFilter(group);
        bsvg.selectAll(".bar").classed("selected", dd => dd.group === d.group);
    });

bsvg.append("g")
    .attr("transform", `translate(0,${bHeight - bMargin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-25)")
    .style("text-anchor", "end");

bsvg.append("g")
    .attr("transform", `translate(${bMargin.left},0)`)
    .call(d3.axisLeft(y));

/* ===== filter function ===== */
function updateFilter(selectedGroup) {
    if (selectedGroup == null) {
        node.transition().duration(300).style("opacity", 1);
        link.transition().duration(300).style("opacity", 0.7);
        label.transition().duration(300).style("opacity", 1);
    } else {
        node.transition().duration(300).style("opacity", d => d.group === selectedGroup ? 1 : 0.08);
        label.transition().duration(300).style("opacity", d => d.group === selectedGroup ? 1 : 0.08);
        link.transition().duration(300).style("opacity", l => {
            const sNode = (typeof l.source === 'object') ? l.source : nodes.find(n => n.id === l.source);
            const tNode = (typeof l.target === 'object') ? l.target : nodes.find(n => n.id === l.target);
            const sGroup = sNode ? sNode.group : null;
            const tGroup = tNode ? tNode.group : null;
            return (sGroup === selectedGroup && tGroup === selectedGroup) ? 0.9 : 0.02;
        });
    }
}

// clicking the SVG background resets the filter
svg.on("click", () => {
    updateFilter(null);
    bsvg.selectAll(".bar").classed("selected", dd => dd.group === "All");
});

