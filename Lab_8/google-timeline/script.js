// --------------------------------------------------
// 1. Load the Google Charts Timeline Package
// --------------------------------------------------

google.charts.load("current", {
    packages: ["timeline"]
});

// --------------------------------------------------
// 2. Run drawChart() After the Library Loads
// --------------------------------------------------

google.charts.setOnLoadCallback(drawChart);

// --------------------------------------------------
// 3. Create the Timeline Chart
// --------------------------------------------------

function drawChart() {

    // Find the HTML container
    const container = document.getElementById("timeline-chart");

    // Create the Google Timeline chart
    const chart = new google.visualization.Timeline(container);

    // Create an empty data table
    const dataTable = new google.visualization.DataTable();

    // --------------------------------------------------
    // Define Table Columns
    // --------------------------------------------------

    dataTable.addColumn({ type: "string", id: "Phase" });
    dataTable.addColumn({ type: "string", id: "Activity" });
    dataTable.addColumn({ type: "date", id: "Start" });
    dataTable.addColumn({ type: "date", id: "End" });

    // --------------------------------------------------
    // Add Research Project Activities
    // --------------------------------------------------

    dataTable.addRows([
        [
            "Planning",
            "Topic Selection",
            new Date(2026, 0, 1),
            new Date(2026, 0, 15)
        ],
        [
            "Planning",
            "Proposal Development",
            new Date(2026, 0, 16),
            new Date(2026, 0, 31)
        ],
        [
            "Literature",
            "Literature Review",
            new Date(2026, 0, 10),
            new Date(2026, 1, 28)
        ],
        [
            "Data",
            "Dataset Collection",
            new Date(2026, 1, 1),
            new Date(2026, 1, 20)
        ],
        [
            "Data",
            "Data Preprocessing",
            new Date(2026, 1, 21),
            new Date(2026, 2, 15)
        ],
        [
            "Development",
            "Model Development",
            new Date(2026, 2, 10),
            new Date(2026, 3, 15)
        ],
        [
            "Evaluation",
            "Model Evaluation",
            new Date(2026, 3, 16),
            new Date(2026, 4, 5)
        ],
        [
            "Writing",
            "Report Writing",
            new Date(2026, 3, 20),
            new Date(2026, 4, 20)
        ],
        [
            "Submission",
            "Final Submission",
            new Date(2026, 4, 21),
            new Date(2026, 4, 28)
        ]
    ]);

    // --------------------------------------------------
    // Timeline Chart Configuration
    // --------------------------------------------------

    const options = {
        timeline: {
            groupByRowLabel: true,
            showRowLabels: true,
            showBarLabels: true,

            rowLabelStyle: {
                fontName: "Arial",
                fontSize: 14
            },

            barLabelStyle: {
                fontName: "Arial",
                fontSize: 12
            }
        },

        avoidOverlappingGridLines: false
    };

    // --------------------------------------------------
    // Draw the Timeline Chart
    // --------------------------------------------------

    chart.draw(dataTable, options);
}

// --------------------------------------------------
// 4. Redraw the Chart When the Window is Resized
// --------------------------------------------------

window.addEventListener("resize", drawChart);