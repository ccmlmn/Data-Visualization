// --------------------------------------------------
// 1. Timeline Dataset
// --------------------------------------------------

const timelineData = [
    {
        date: "2026-01-10",
        event: "Project Started",
        category: "Planning",
        description: "The project topic and objectives were finalized."
    },
    {
        date: "2026-02-05",
        event: "Dataset Collected",
        category: "Data",
        description: "The required dataset was collected and inspected."
    },
    {
        date: "2026-02-25",
        event: "Data Cleaned",
        category: "Data",
        description: "Missing and incorrect values were handled."
    },
    {
        date: "2026-03-20",
        event: "Model Developed",
        category: "Development",
        description: "The first version of the model was completed."
    },
    {
        date: "2026-04-10",
        event: "Model Evaluated",
        category: "Evaluation",
        description: "The model was tested using several evaluation metrics."
    },
    {
        date: "2026-05-01",
        event: "Report Submitted",
        category: "Submission",
        description: "The final project report was submitted."
    }
];

// --------------------------------------------------
// 2. Convert Date Strings into JavaScript Date Objects
// --------------------------------------------------

const parseDate = d3.timeParse("%Y-%m-%d");

timelineData.forEach(item => {
    item.date = parseDate(item.date);
});

// --------------------------------------------------
// 3. Set Chart Dimensions
// --------------------------------------------------

const width = 1000;
const height = 430;

const margin = {
    top: 80,
    right: 70,
    bottom: 80,
    left: 70
};

const timelineY = 220;

// --------------------------------------------------
// 4. Create the SVG
// --------------------------------------------------

const svg = d3
    .select("#timeline")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .attr("height", height);

// --------------------------------------------------
// 5. Shared Color Scale
// --------------------------------------------------

const globalColorScale = d3
    .scaleOrdinal()
    .domain(["Planning", "Data", "Development", "Evaluation", "Submission", "Remaining"])
    .range(["#2563eb", "#059669", "#7c3aed", "#ea580c", "#dc2626", "#e5e7eb"]);

// --------------------------------------------------
// 6. Draw Timeline Function
// --------------------------------------------------

function drawTimeline() {
    // Clear previous timeline
    svg.selectAll("*").remove();

    // Create the Time Scale
    const xScale = d3
        .scaleTime()
        .domain(d3.extent(timelineData, d => d.date))
        .range([margin.left, width - margin.right]);

    // Create and Display the Time Axis
    const xAxis = d3
        .axisBottom(xScale)
        .ticks(d3.timeMonth.every(1))
        .tickFormat(d3.timeFormat("%b %Y"));

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${timelineY + 80})`)
        .call(xAxis);

    // Draw the Main Timeline Line
    svg.append("line")
        .attr("class", "timeline-line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", timelineY)
        .attr("y2", timelineY);

    // Create a Group for Each Timeline Event
    const events = svg
        .selectAll(".event")
        .data(timelineData)
        .enter()
        .append("g")
        .attr("class", "event")
        .attr(
            "transform",
            d => `translate(${xScale(d.date)}, ${timelineY})`
        );

    // Draw Vertical Connector Lines
    events.append("line")
        .attr("class", "event-line")
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", 0)
        .attr(
            "y2",
            (d, index) => index % 2 === 0 ? -75 : 75
        );

    // Draw Event Circles
    events.append("circle")
        .attr("class", "event-circle")
        .attr("r", 0)
        .attr("fill", d => globalColorScale(getNormalizedPhase(d.category) || d.category))
        .on("mouseover", function (event, d) {
            d3.select(this)
                .transition()
                .duration(150)
                .attr("r", 12);

            tooltip
                .style("display", "block")
                .html(`
<strong>${d.event}</strong><br>
Date: ${d3.timeFormat("%d %B %Y")(d.date)}<br>
Category: ${d.category}<br>
${d.description}
`);
        })
        .on("mousemove", function (event) {
            tooltip
                .style("left", `${event.pageX + 15}px`)
                .style("top", `${event.pageY + 15}px`);
        })
        .on("click", function (event, d) {
            const index = timelineData.findIndex(item => item === d);
            let startDateStr = "";
            let endDateStr = d3.timeFormat("%Y-%m-%d")(d.date);

            if (index > 0) {
                startDateStr = d3.timeFormat("%Y-%m-%d")(timelineData[index - 1].date);
            } else {
                startDateStr = endDateStr;
            }

            document.getElementById("project-start").value = startDateStr;
            document.getElementById("project-end").value = endDateStr;
            document.getElementById("project-phase").value = d.category;
            
            const err = document.getElementById("error-message");
            err.textContent = "";
            err.style.display = "none";
        })
        .on("mouseout", function () {
            d3.select(this)
                .transition()
                .duration(150)
                .attr("r", 9);

            tooltip.style("display", "none");
        })
        .transition()
        .duration(700)
        .attr("r", 9);

    // Add Event Names
    events.append("text")
        .attr("class", "event-label")
        .attr("x", 0)
        .attr(
            "y",
            (d, index) => index % 2 === 0 ? -92 : 105
        )
        .text(d => d.event);

    // Add Date Labels
    events.append("text")
        .attr("class", "date-label")
        .attr("x", 0)
        .attr(
            "y",
            (d, index) => index % 2 === 0 ? -72 : 125
        )
        .text(d => d3.timeFormat("%d %b")(d.date));
}

// Initial draw
drawTimeline();

// --------------------------------------------------
// 15. Donut Chart and Interactive Calculations
// --------------------------------------------------

// Initial phase durations (days out of 100 days budget)
const phaseDurations = {
    "Planning": 15,
    "Data": 15,
    "Development": 25,
    "Evaluation": 15,
    "Submission": 15
};

// Calculate dataset for D3 Donut Chart
function getDonutData() {
    let sum = 0;
    const data = [];
    for (let phase in phaseDurations) {
        data.push({ phase: phase, value: phaseDurations[phase] });
        sum += phaseDurations[phase];
    }
    const remaining = Math.max(0, 100 - sum);
    data.push({ phase: "Remaining", value: remaining });
    return data;
}

// Chart dimensions
const donutWidth = 360;
const donutHeight = 360;
const donutMargin = 20;
const radius = Math.min(donutWidth, donutHeight) / 2 - donutMargin;

// Create SVG for Donut Chart
const donutSvg = d3
    .select("#donut-chart")
    .append("svg")
    .attr("width", donutWidth)
    .attr("height", donutHeight)
    .append("g")
    .attr("transform", `translate(${donutWidth / 2}, ${donutHeight / 2})`);

// Color mappings matching timeline event colors
const phaseColors = d3
    .scaleOrdinal()
    .domain(["Planning", "Data", "Development", "Evaluation", "Submission", "Remaining"])
    .range(["#2563eb", "#059669", "#7c3aed", "#ea580c", "#dc2626", "#e5e7eb"]);

// Pie and Arc generators
const pie = d3
    .pie()
    .value(d => d.value)
    .sort(null);

const arc = d3
    .arc()
    .innerRadius(radius * 0.55)
    .outerRadius(radius);

// Center Text Group (Donut Hole)
const centerTextGroup = donutSvg.append("g").attr("class", "center-text");

centerTextGroup.append("text")
    .attr("class", "center-value")
    .attr("text-anchor", "middle")
    .attr("dy", "-0.1em")
    .style("font-size", "26px")
    .style("font-weight", "bold")
    .style("fill", "#1f2937");

centerTextGroup.append("text")
    .attr("class", "center-label")
    .attr("text-anchor", "middle")
    .attr("dy", "1.3em")
    .style("font-size", "13px")
    .style("font-weight", "600")
    .style("fill", "#6b7280");

// Legend Container
const legendContainer = d3.select("#donut-chart")
    .append("div")
    .attr("class", "legend");

// Dynamic Update Function
function updateDonutChart() {
    const data = getDonutData();
    const totalAllocated = d3.sum(data.filter(d => d.phase !== "Remaining"), d => d.value);

    // Update center label and value
    donutSvg.select(".center-value").text("100d");
    donutSvg.select(".center-label").text(`Allocated: ${totalAllocated}d`);

    // Map data to arcs
    const arcs = pie(data);

    // Bind data
    const path = donutSvg.selectAll("path")
        .data(arcs, d => d.data.phase);

    // ENTER selection
    path.enter()
        .append("path")
        .attr("fill", d => phaseColors(d.data.phase))
        .attr("d", arc)
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .style("opacity", 0.9)
        .each(function(d) { this._current = d; }) // Store initial angles for transitions
        .on("mouseover", function(event, d) {
            d3.select(this).style("opacity", 1).style("stroke-width", "3px");
            tooltip
                .style("display", "block")
                .html(`<strong>${d.data.phase}</strong><br>Duration: ${d.data.value} days<br>(${Math.round(d.data.value)}% of project)`);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", `${event.pageX + 15}px`)
                .style("top", `${event.pageY + 15}px`);
        })
        .on("mouseout", function() {
            d3.select(this).style("opacity", 0.9).style("stroke-width", "2px");
            tooltip.style("display", "none");
        });

    // UPDATE selection with interpolation animation
    path.transition()
        .duration(750)
        .attrTween("d", function(d) {
            const interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) {
                return arc(interpolate(t));
            };
        });

    // EXIT selection
    path.exit().remove();

    // Re-draw legends
    updateLegend(data);
}

// Legend Render Helper
function updateLegend(data) {
    legendContainer.html(""); // Reset legend HTML

    data.forEach(d => {
        if (d.value === 0 && d.phase !== "Remaining") return;
        
        const item = legendContainer.append("div").attr("class", "legend-item");
        
        item.append("div")
            .attr("class", "legend-color")
            .style("background-color", phaseColors(d.phase));
            
        item.append("span")
            .text(`${d.phase}: ${d.value} days`);
    });
}

// Robust Date Parser
function parseInputDate(str) {
    if (!str) return null;
    let s = str.trim();
    
    // 1. Check if format is YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const parts = s.split('-');
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    
    // 2. Check if year is absent and append 2026 (project timeline year)
    if (!/\d{4}$/.test(s)) {
        s = s + " 2026";
    }
    
    const parsed = Date.parse(s);
    if (!isNaN(parsed)) {
        return new Date(parsed);
    }
    return null;
}

// Normalize Phase Names to Domain Category Names
function getNormalizedPhase(inputPhase) {
    const p = inputPhase.trim().toLowerCase();
    if (p.includes("plan")) return "Planning";
    if (p.includes("data")) return "Data";
    if (p.includes("develop") || p.includes("model")) return "Development";
    if (p.includes("eval") || p.includes("test")) return "Evaluation";
    if (p.includes("subm") || p.includes("report")) return "Submission";
    return null;
}

// Validation Error display helper
function showError(msg) {
    const err = document.getElementById("error-message");
    err.textContent = msg;
    err.style.display = "block";
}

// Form Submit Handler
document.querySelector(".btn-submit").addEventListener("click", function() {
    const startVal = document.getElementById("project-start").value;
    const endVal = document.getElementById("project-end").value;
    const phaseVal = document.getElementById("project-phase").value.trim();
    
    const err = document.getElementById("error-message");
    err.style.display = "none";
    err.textContent = "";
    
    if (!startVal || !endVal || !phaseVal) {
        showError("Please fill out all fields.");
        return;
    }
    
    const start = parseInputDate(startVal);
    const end = parseInputDate(endVal);
    
    if (!start || !end) {
        showError("Invalid date format. Use YYYY-MM-DD or 'Day Month' (e.g. '20 March').");
        return;
    }
    
    if (end < start) {
        showError("Project End date cannot be earlier than Project Start date.");
        return;
    }
    
    // We allow any phase name. Just format it well.
    const targetPhase = phaseVal;
    
    // Calculate difference in days
    const timeDiff = end.getTime() - start.getTime();
    const duration = Math.round(timeDiff / (1000 * 60 * 60 * 24));
    
    // Check total budget constraints
    let newSum = 0;
    for (let phase in phaseDurations) {
        if (phase === targetPhase) {
            newSum += duration; // Replace existing duration if same name
        } else {
            newSum += phaseDurations[phase];
        }
    }
    // If it's a completely new phase
    if (!(targetPhase in phaseDurations)) {
        newSum += duration;
    }
    
    if (newSum > 100) {
        showError(`Adding ${duration} days to '${targetPhase}' would make the total duration ${newSum} days (maximum is 100 days).`);
        return;
    }
    
    // Update timeline data
    // We'll add a new event at the "end" date
    timelineData.push({
        date: end,
        event: targetPhase + " Completed",
        category: targetPhase,
        description: "Phase added via details panel."
    });
    
    // Sort timelineData by date so the timeline draws correctly
    timelineData.sort((a, b) => a.date - b.date);
    
    // Redraw Timeline
    drawTimeline();
    
    // Update and redraw Donut
    phaseDurations[targetPhase] = duration;
    updateDonutChart();
});

// Render initial Donut Chart
updateDonutChart();