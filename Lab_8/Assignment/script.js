// Global State & Data Variables
let rawData = [];
let selectedCountry = null; // Currently clicked country on bar chart / dropdown

// Global Color Scale for Event Outcomes
const colorScale = d3.scaleOrdinal()
  .domain(["Positive", "Negative", "Mixed", "Ongoing", "Unknown"])
  .range(["#22c55e", "#ef4444", "#eab308", "#3b82f6", "#94a3b8"]);

// Tooltip reference
const tooltip = d3.select("#tooltip");

// Initial Setup on Document Load
document.addEventListener("DOMContentLoaded", () => {
  createLegend();

  // Load CSV Data
  d3.csv("World Important Dates.csv").then(data => {
    rawData = data.map((d, i) => {
      // Parse Year (Handles '2600 BC', '1400 BC', '1206', etc.)
      let yearStr = (d.Year || "").toString().trim();
      let isBC = yearStr.toUpperCase().includes("BC");
      let yNum = parseInt(yearStr.replace(/[^0-9]/g, ''), 10);

      // Hash name for deterministic vertical Y offset jitter
      let hash = 0;
      const name = d["Name of Incident"] || "Unnamed Incident";
      for (let j = 0; j < name.length; j++) {
        hash += name.charCodeAt(j);
      }
      const yOffset = (hash % 160) - 80; // Jitter between -80 and 80

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
        place: (d["Place Name"] || "Unknown").trim(),
        impact: (d.Impact || "").trim(),
        yOffset: yOffset
      };
    }).filter(d => !isNaN(d.parsedYear)); // Filter invalid years

    // Populate Select Options
    populateDropdowns(rawData);

    // Initial Visualization Render
    updateVisualization();

    // Event Listeners for Controls
    d3.select("#search-incident").on("input", () => {
      updateVisualization();
    });

    d3.select("#filter-country").on("change", function() {
      const val = d3.select(this).property("value");
      selectedCountry = val === "All" ? null : val;
      updateVisualization();
    });

    d3.select("#filter-type").on("change", updateVisualization);
    d3.select("#filter-outcome").on("change", updateVisualization);

    d3.select("#reset-filters").on("click", () => {
      d3.select("#search-incident").property("value", "");
      d3.select("#filter-country").property("value", "All");
      d3.select("#filter-type").property("value", "All");
      d3.select("#filter-outcome").property("value", "All");
      selectedCountry = null;
      updateVisualization();
    });

    // Window Resize listener to update D3 responsive elements
    window.addEventListener("resize", () => {
      updateVisualization();
    });
  }).catch(err => {
    console.error("Error loading CSV file:", err);
  });
});

// Render Legend
function createLegend() {
  const legendContainer = d3.select("#legend-container");
  legendContainer.selectAll("*").remove();

  colorScale.domain().forEach(outcome => {
    const item = legendContainer.append("div").attr("class", "legend-item");
    item.append("div")
      .attr("class", "legend-color")
      .style("background-color", colorScale(outcome));
    item.append("span").text(outcome);
  });
}

// Populate Filter Dropdowns
function populateDropdowns(data) {
  const countries = ["All", ...new Set(data.map(d => d.country))].sort();
  const types = ["All", ...new Set(data.map(d => d.type))].sort();
  const outcomes = ["All", ...new Set(data.map(d => d.outcome))].sort();

  const populateSelect = (selectId, options) => {
    const select = d3.select(selectId);
    select.selectAll("option").remove();
    select.selectAll("option")
      .data(options)
      .enter()
      .append("option")
      .attr("value", d => d)
      .text(d => d);
  };

  populateSelect("#filter-country", countries);
  populateSelect("#filter-type", types);
  populateSelect("#filter-outcome", outcomes);
}

// Master Visualization Update Function
function updateVisualization() {
  const searchTxt = d3.select("#search-incident").property("value").toLowerCase();
  const typeFilter = d3.select("#filter-type").property("value");
  const outcomeFilter = d3.select("#filter-outcome").property("value");
  const dropdownCountry = d3.select("#filter-country").property("value");

  // Sync selectedCountry variable with dropdown if dropdown was directly changed
  if (dropdownCountry !== "All" && selectedCountry !== dropdownCountry) {
    selectedCountry = dropdownCountry;
  } else if (dropdownCountry === "All" && selectedCountry !== null) {
    // Keep selectedCountry as set by bar click or dropdown
    d3.select("#filter-country").property("value", selectedCountry);
  }

  // Filter dataset for current search, type, outcome (Country is handled for linked highlighting vs filtering)
  const baseFilteredData = rawData.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(searchTxt);
    const matchType = typeFilter === "All" || d.type === typeFilter;
    const matchOutcome = outcomeFilter === "All" || d.outcome === outcomeFilter;
    return matchSearch && matchType && matchOutcome;
  });

  // If a country is selected (via bar click or dropdown), data for timeline is filtered by country
  const timelineData = selectedCountry 
    ? baseFilteredData.filter(d => d.country === selectedCountry) 
    : baseFilteredData;

  // Update Stats Cards
  updateDashboard(timelineData, baseFilteredData);

  // Render Timeline
  drawTimeline(timelineData);

  // Render Linked Country Bar Chart
  drawCountryBarChart(baseFilteredData);

  // Render Linked Secondary Bar Chart (Event Types)
  drawSecondaryBarChart(baseFilteredData);
}

// Update Dashboard Summary Stats
function updateDashboard(timelineData, baseFilteredData) {
  d3.select("#stat-visible-events").text(timelineData.length.toLocaleString());

  if (timelineData.length > 0) {
    const minYear = d3.min(timelineData, d => d.parsedYear);
    const maxYear = d3.max(timelineData, d => d.parsedYear);
    d3.select("#stat-earliest-year").text(minYear < 0 ? `${Math.abs(minYear)} BCE` : `${minYear} CE`);
    d3.select("#stat-latest-year").text(maxYear < 0 ? `${Math.abs(maxYear)} BCE` : `${maxYear} CE`);
  } else {
    d3.select("#stat-earliest-year").text("-");
    d3.select("#stat-latest-year").text("-");
  }

  const countriesCount = selectedCountry ? 1 : new Set(baseFilteredData.map(d => d.country)).size;
  d3.select("#stat-countries").text(countriesCount);
}

// Draw Main Horizontal D3 Timeline
function drawTimeline(data) {
  const container = d3.select("#timeline-container");
  container.selectAll("*").remove();

  const containerElem = document.getElementById("timeline-container");
  const totalWidth = containerElem.clientWidth || 1000;
  const margin = { top: 40, right: 60, bottom: 50, left: 60 };
  const width = totalWidth - margin.left - margin.right;
  const height = 360 - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("width", totalWidth)
    .attr("height", height + margin.top + margin.bottom);

  // Background rect for zoom capture
  svg.append("rect")
    .attr("width", totalWidth)
    .attr("height", height + margin.top + margin.bottom)
    .attr("fill", "transparent");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // X Scale
  const minYear = data.length > 0 ? d3.min(data, d => d.parsedYear) : -3000;
  const maxYear = data.length > 0 ? d3.max(data, d => d.parsedYear) : 2025;

  const xScale = d3.scaleLinear()
    .domain([minYear, maxYear])
    .range([0, width]);

  const xAxis = d3.axisBottom(xScale)
    .tickFormat(d => d < 0 ? `${Math.abs(d)} BCE` : `${d} CE`)
    .ticks(Math.max(5, Math.floor(width / 100)));

  // Center timeline axis line
  const axisG = g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${height / 2})`)
    .call(xAxis);

  // Group for timeline points
  const pointsGroup = g.append("g");

  // Bind Circles
  const circles = pointsGroup.selectAll(".event-circle")
    .data(data, d => d.id)
    .enter()
    .append("circle")
    .attr("class", "event-circle")
    .attr("cx", d => xScale(d.parsedYear))
    .attr("cy", d => (height / 2) + d.yOffset)
    .attr("r", 5)
    .attr("fill", d => colorScale(d.outcome))
    .attr("opacity", 0.85)
    .on("mouseover", showTooltip)
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  // Zoom Handler
  const zoom = d3.zoom()
    .scaleExtent([0.5, 30])
    .translateExtent([[-margin.left, 0], [width + margin.right, height]])
    .on("zoom", (event) => {
      const newXScale = event.transform.rescaleX(xScale);
      axisG.call(xAxis.scale(newXScale));
      circles.attr("cx", d => newXScale(d.parsedYear));
    });

  svg.call(zoom);
}

// Draw Country Bar Chart with Click Linking & Fading
function drawCountryBarChart(data) {
  const container = d3.select("#country-bar-chart");
  container.selectAll("*").remove();

  const containerElem = document.getElementById("country-bar-chart");
  const totalWidth = containerElem.clientWidth || 500;
  const margin = { top: 20, right: 30, bottom: 90, left: 50 };
  const width = totalWidth - margin.left - margin.right;
  const height = 380 - margin.top - margin.bottom;

  // Aggregate counts per country
  const countsMap = d3.rollup(data, v => v.length, d => d.country);
  let countryCounts = Array.from(countsMap, ([country, count]) => ({ country, count }));
  
  // Sort descending and take top 12 for clean viewing if many countries exist
  countryCounts.sort((a, b) => b.count - a.count);
  const topCountries = countryCounts.slice(0, 15);

  const svg = container.append("svg")
    .attr("width", totalWidth)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleBand()
    .domain(topCountries.map(d => d.country))
    .range([0, width])
    .padding(0.2);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(topCountries, d => d.count) || 1])
    .nice()
    .range([height, 0]);

  // X Axis
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .attr("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .style("fill", "#cbd5e1");

  // Y Axis
  svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(yScale).ticks(5))
    .selectAll("text")
    .style("fill", "#cbd5e1");

  // Draw Bars
  svg.selectAll(".country-bar")
    .data(topCountries)
    .enter()
    .append("rect")
    .attr("class", "country-bar")
    .attr("x", d => xScale(d.country))
    .attr("y", d => yScale(d.count))
    .attr("width", xScale.bandwidth())
    .attr("height", d => height - yScale(d.count))
    .attr("fill", d => (selectedCountry && d.country === selectedCountry) ? "#38bdf8" : "#64748b")
    .attr("opacity", d => {
      if (!selectedCountry) return 1;
      return d.country === selectedCountry ? 1 : 0.25; // Faded if another country selected
    })
    .attr("rx", 4)
    .on("click", (event, d) => {
      // Toggle country selection on bar click
      if (selectedCountry === d.country) {
        selectedCountry = null;
        d3.select("#filter-country").property("value", "All");
      } else {
        selectedCountry = d.country;
        d3.select("#filter-country").property("value", d.country);
      }
      updateVisualization();
    })
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1)
        .html(`
          <div class="tooltip-title">${d.country}</div>
          <div class="tooltip-row"><span class="tooltip-label">Events:</span> ${d.count}</div>
          <div style="font-size:0.75rem; color:#38bdf8; margin-top:4px;">Click to filter timeline & details</div>
        `);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);
}

// Draw Linked Secondary Bar Chart (Place Name Breakdown for Selected Country)
function drawSecondaryBarChart(data) {
  const container = d3.select("#secondary-bar-chart");
  container.selectAll("*").remove();

  // Filter for selected country if one is selected
  const activeData = selectedCountry ? data.filter(d => d.country === selectedCountry) : data;

  // Update header text
  if (selectedCountry) {
    d3.select("#secondary-chart-title").text(`Place Names in ${selectedCountry}`);
    d3.select("#secondary-chart-desc").text(`Number of events across specific places/locations in ${selectedCountry}.`);
  } else {
    d3.select("#secondary-chart-title").text("Place Names Breakdown");
    d3.select("#secondary-chart-desc").text("Click any country bar on the left to view its specific place names & event counts.");
  }

  const containerElem = document.getElementById("secondary-bar-chart");
  const totalWidth = containerElem.clientWidth || 500;
  const margin = { top: 20, right: 30, bottom: 90, left: 50 };
  const width = totalWidth - margin.left - margin.right;
  const height = 380 - margin.top - margin.bottom;

  // Aggregate counts per Place Name
  const countsMap = d3.rollup(activeData, v => v.length, d => d.place || "Unknown");
  let placeCounts = Array.from(countsMap, ([place, count]) => ({ place, count }));
  placeCounts.sort((a, b) => b.count - a.count);
  const topPlaces = placeCounts.slice(0, 15);

  const svg = container.append("svg")
    .attr("width", totalWidth)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleBand()
    .domain(topPlaces.map(d => d.place))
    .range([0, width])
    .padding(0.2);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(topPlaces, d => d.count) || 1])
    .nice()
    .range([height, 0]);

  // X Axis
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .attr("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .style("fill", "#cbd5e1");

  // Y Axis
  svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(yScale).ticks(5))
    .selectAll("text")
    .style("fill", "#cbd5e1");

  // D3 Color Scale for Place Name Bars
  const placeColorScale = d3.scaleOrdinal(d3.schemeCategory10);

  // Draw Bars
  svg.selectAll(".type-bar")
    .data(topPlaces)
    .enter()
    .append("rect")
    .attr("class", "type-bar")
    .attr("x", d => xScale(d.place))
    .attr("y", d => yScale(d.count))
    .attr("width", xScale.bandwidth())
    .attr("height", d => height - yScale(d.count))
    .attr("fill", d => placeColorScale(d.place))
    .attr("rx", 4)
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1)
        .html(`
          <div class="tooltip-title">${d.place}</div>
          <div class="tooltip-row"><span class="tooltip-label">Events:</span> ${d.count}</div>
          ${selectedCountry ? `<div class="tooltip-row"><span class="tooltip-label">Country:</span> ${selectedCountry}</div>` : ''}
        `);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);
}

// Tooltip Event Handlers
function showTooltip(event, d) {
  tooltip.style("opacity", 1)
    .html(`
      <div class="tooltip-title">${d.name}</div>
      <div class="tooltip-row"><span class="tooltip-label">Date:</span> ${d.dateStr}</div>
      <div class="tooltip-row"><span class="tooltip-label">Country:</span> ${d.country}</div>
      <div class="tooltip-row"><span class="tooltip-label">Event Type:</span> ${d.type}</div>
      <div class="tooltip-row"><span class="tooltip-label">Outcome:</span> ${d.outcome}</div>
      ${d.place !== "Unknown" ? `<div class="tooltip-row"><span class="tooltip-label">Place:</span> ${d.place}</div>` : ''}
    `);
}

function moveTooltip(event) {
  const tooltipWidth = tooltip.node().offsetWidth;
  let left = event.pageX + 15;
  if (left + tooltipWidth > window.innerWidth - 20) {
    left = event.pageX - tooltipWidth - 15;
  }

  tooltip
    .style("left", `${left}px`)
    .style("top", `${event.pageY + 15}px`);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}
