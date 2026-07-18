// Constants and Dimensions
const containerWidth = document.getElementById("timeline-container").clientWidth;
const margin = { top: 40, right: 60, bottom: 40, left: 60 };
const width = Math.max(containerWidth, 1000) - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Setup SVG
const svg = d3.select("#timeline-container")
  .append("svg")
  .attr("width", "100%")
  .attr("height", height + margin.top + margin.bottom)
  .call(d3.zoom().scaleExtent([1, 10]).on("zoom", zoomed))
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Zoom layer that will be transformed
const timelineGroup = svg.append("g");

// Axis group (fixed Y, horizontally scaled/translated)
const axisGroup = svg.append("g")
  .attr("class", "axis")
  .attr("transform", `translate(0, ${height / 2})`);

const tooltip = d3.select("#tooltip");

let rawData = [];
let xScale, xAxis;

// Color scale for outcomes
const colorScale = d3.scaleOrdinal()
  .domain(["Positive", "Negative", "Mixed", "Ongoing", "Unknown"])
  .range(["#22c55e", "#ef4444", "#eab308", "#3b82f6", "#94a3b8"]);

// Create Legend
function createLegend() {
  const legendContainer = d3.select("#legend-container");
  colorScale.domain().forEach(outcome => {
    const item = legendContainer.append("div").attr("class", "legend-item");
    item.append("div")
      .attr("class", "legend-color")
      .style("background-color", colorScale(outcome));
    item.append("span").text(outcome);
  });
}

createLegend();

// Load Data
d3.csv("World Important Dates.csv").then(data => {
  // Clean and parse data
  rawData = data.map((d, i) => {
    // Parse Year
    let yearStr = (d.Year || "").toString().trim();
    let isBC = yearStr.toUpperCase().includes("BC");
    let yNum = parseInt(yearStr.replace(/[^0-9]/g, ''), 10);
    
    // Deterministic Y jitter for spread
    let hash = 0;
    const name = d["Name of Incident"] || "";
    for (let j = 0; j < name.length; j++) {
      hash += name.charCodeAt(j);
    }
    const yOffset = (hash % 160) - 80; // Between -80 and 80

    // Outcome normalization
    let outcome = (d.Outcome || "Unknown").trim();
    if (!["Positive", "Negative", "Mixed", "Ongoing"].includes(outcome)) {
      outcome = "Unknown";
    }

    return {
      id: i,
      name: name,
      dateStr: `${d.Date || "Unknown"} ${d.Month || "Unknown"} ${d.Year}`,
      yearStr: yearStr,
      parsedYear: isBC ? -yNum : yNum,
      country: (d.Country || "Unknown").trim(),
      type: (d["Type of Event"] || "Unknown").trim(),
      outcome: outcome,
      yOffset: yOffset
    };
  }).filter(d => !isNaN(d.parsedYear)); // Remove unparseable years

  // Populate Dropdowns
  populateDropdowns(rawData);

  // Initialize Scales
  xScale = d3.scaleLinear()
    .domain(d3.extent(rawData, d => d.parsedYear))
    .range([0, width]);

  xAxis = d3.axisBottom(xScale)
    .tickFormat(d => d < 0 ? `${Math.abs(d)} BCE` : `${d} CE`)
    .ticks(10);

  axisGroup.call(xAxis);

  // Initial Render
  updateVisualization();

  // Setup Event Listeners for Filters
  d3.select("#search-incident").on("input", updateVisualization);
  d3.select("#filter-country").on("change", updateVisualization);
  d3.select("#filter-type").on("change", updateVisualization);
  d3.select("#filter-outcome").on("change", updateVisualization);
  
  d3.select("#reset-filters").on("click", () => {
    d3.select("#search-incident").property("value", "");
    d3.select("#filter-country").property("value", "All");
    d3.select("#filter-type").property("value", "All");
    d3.select("#filter-outcome").property("value", "All");
    updateVisualization();
  });
});

function populateDropdowns(data) {
  const countries = ["All", ...new Set(data.map(d => d.country))].sort();
  const types = ["All", ...new Set(data.map(d => d.type))].sort();
  const outcomes = ["All", ...new Set(data.map(d => d.outcome))].sort();

  const addOptions = (selectId, options) => {
    d3.select(selectId)
      .selectAll("option")
      .data(options)
      .enter()
      .append("option")
      .attr("value", d => d)
      .text(d => d);
  };

  // Remove existing "All" to prevent duplication before adding
  d3.select("#filter-country").selectAll("option").remove();
  d3.select("#filter-type").selectAll("option").remove();
  d3.select("#filter-outcome").selectAll("option").remove();

  addOptions("#filter-country", countries);
  addOptions("#filter-type", types);
  addOptions("#filter-outcome", outcomes);
}

function updateVisualization() {
  const searchTxt = d3.select("#search-incident").property("value").toLowerCase();
  const country = d3.select("#filter-country").property("value");
  const type = d3.select("#filter-type").property("value");
  const outcome = d3.select("#filter-outcome").property("value");

  const filteredData = rawData.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(searchTxt);
    const matchCountry = country === "All" || d.country === country;
    const matchType = type === "All" || d.type === type;
    const matchOutcome = outcome === "All" || d.outcome === outcome;
    return matchSearch && matchCountry && matchType && matchOutcome;
  });

  updateDashboard(filteredData);
  drawTimeline(filteredData);
}

function updateDashboard(data) {
  d3.select("#stat-visible-events").text(data.length);
  
  if (data.length > 0) {
    const minYear = d3.min(data, d => d.parsedYear);
    const maxYear = d3.max(data, d => d.parsedYear);
    d3.select("#stat-earliest-year").text(minYear < 0 ? `${Math.abs(minYear)} BCE` : `${minYear} CE`);
    d3.select("#stat-latest-year").text(maxYear < 0 ? `${Math.abs(maxYear)} BCE` : `${maxYear} CE`);
  } else {
    d3.select("#stat-earliest-year").text("-");
    d3.select("#stat-latest-year").text("-");
  }

  const uniqueCountries = new Set(data.map(d => d.country)).size;
  d3.select("#stat-countries").text(uniqueCountries);
}

function drawTimeline(data) {
  // Bind data to circles
  const circles = timelineGroup.selectAll(".event-circle")
    .data(data, d => d.id);

  // Remove exiting circles
  circles.exit()
    .transition().duration(300)
    .attr("r", 0)
    .remove();

  // Add new circles
  const enterCircles = circles.enter()
    .append("circle")
    .attr("class", "event-circle")
    .attr("cx", d => xScale(d.parsedYear))
    .attr("cy", d => (height / 2) + d.yOffset)
    .attr("r", 0)
    .attr("fill", d => colorScale(d.outcome))
    .on("mouseover", showTooltip)
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  // Update existing and new circles
  enterCircles.merge(circles)
    .transition().duration(500)
    .attr("cx", d => xScale(d.parsedYear))
    .attr("cy", d => (height / 2) + d.yOffset)
    .attr("r", 5)
    .attr("fill", d => colorScale(d.outcome));
}

// Zoom function
function zoomed(event) {
  const newXScale = event.transform.rescaleX(xScale);
  axisGroup.call(xAxis.scale(newXScale));
  
  timelineGroup.selectAll(".event-circle")
    .attr("cx", d => newXScale(d.parsedYear));
}

// Tooltip Interactions
function showTooltip(event, d) {
  d3.select(this)
    .attr("r", 8);

  tooltip.style("opacity", 1)
    .html(`
      <div class="tooltip-title">${d.name}</div>
      <div class="tooltip-row"><span class="tooltip-label">Date:</span> ${d.dateStr}</div>
      <div class="tooltip-row"><span class="tooltip-label">Country:</span> ${d.country}</div>
      <div class="tooltip-row"><span class="tooltip-label">Type:</span> ${d.type}</div>
      <div class="tooltip-row"><span class="tooltip-label">Outcome:</span> ${d.outcome}</div>
    `);
}

function moveTooltip(event) {
  const tooltipWidth = tooltip.node().offsetWidth;
  let left = event.pageX + 15;
  if (left + tooltipWidth > window.innerWidth) {
    left = event.pageX - tooltipWidth - 15;
  }
  
  tooltip
    .style("left", `${left}px`)
    .style("top", `${event.pageY + 15}px`);
}

function hideTooltip() {
  d3.select(this)
    .transition().duration(150)
    .attr("r", 5);

  tooltip.style("opacity", 0);
}
