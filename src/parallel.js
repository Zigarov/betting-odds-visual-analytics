// Path to the CSV file
const csvFilePath = '../dataset/odds23.csv';

// Dimensions of the SVG and margins
const margin = { top: 30, right: 30, bottom: 30, left: 30 };
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Array of axis labels
const dimensions = ['AvgH', 'AvgD', 'AvgA', 'AvgO', 'AvgU'];

// Load CSV dataset and create the parallel coordinate plot
d3.csv(csvFilePath).then(data => {

  const dataset = data.map(d => dimensions.map(dim => d[dim]));
  // const filteredDataset = dataset.slice(0, 100);
  // console.log(filteredDataset); 

  // Array of scales for vertical axes
  const yScales = {
    AvgH: d3.scaleLinear().range([height, 0]).domain([1, 4]),
    AvgD: d3.scaleLinear().range([height, 0]).domain([1, 4]),
    AvgA: d3.scaleLinear().range([height, 0]).domain([1, 4]),
    AvgO: d3.scaleLinear().range([height, 0]).domain([1, 4]),
    AvgU: d3.scaleLinear().range([height, 0]).domain([1, 4])
  };

  // Scale for horizontal axes
  const xScale = d3.scaleLinear().domain([0, dimensions.length - 1]).range([0, width]);

  // Create SVG with margin
  const svg = d3.select("#root").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create vertical axes
  svg.selectAll(".axis")
    .data(dimensions)
    .enter().append("g")
    .attr("class", "axis")
    .attr("transform", (d, i) => `translate(${xScale(i)},0)`)
    .each(function (d) {
      d3.select(this).call(d3.axisLeft().scale(yScales[d]));
    });

//   // Create connections between axes
//   svg.append("g")
//     .attr("class", "lines")
//     .selectAll("path")
//     .data(dataset)
//     .enter().append("path")
//     .attr("d", d3.line()
//       .defined(d => !isNaN(d[0])) // Skip NaN values
//       .x((d, i) => xScale(i))
//       .y((d, i) => yScales[dimensions[i]](d))
//     )
//     .style("fill", "none")
//     .style("stroke", "steelblue")
//     .style("stroke-width", 2);
  // Creazione del gruppo per le linee
  const linesGroup = svg.append("g")
    .attr("class", "lines"); // Aggiunta dell'attributo class al gruppo

  const line = d3.line()
    .defined(d => !isNaN(d[0])) // Skip NaN values
    .x((d, i) => xScale(i))
    .y((d, i) => yScales[dimensions[i]](d))

  // Disegno delle linee
  dataset.forEach(d => {
    linesGroup.append("path") // Aggiunta delle linee al gruppo
      .datum(d) // Utilizzo dei dati dell'array
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 0.5)
      .attr("d", line); // Applicazione della funzione line per generare il percorso
  });
});

