// Path to the CSV file
// const csvFilePath = '../dataset/odds23.csv'
const csvFilePath = '../dataset/oddsITA23.csv'

// Dimensions of the SVG and margins
const margin = { top: 20, right: 30, bottom: 30, left: 40 }
const width = 850 - margin.left - margin.right
const height = 500 - margin.top - margin.bottom

const dimensions = ['AvgH', 'AvgD', 'AvgA', 'AvgO', 'AvgU']

// Load CSV dataset and create the parallel coordinate plot
d3.csv(csvFilePath).then(data => {
  // Convert the data in an array of arrays
  const dataset = data.map(d => dimensions.map(dim => d[dim]))
  let filteredDataset = []  // Array for filtered data.

  //Scales for vertical axes
  const yScales = {}
  dimensions.forEach(dim => {
    const maxVal = d3.max(data, d => +d[dim])
    yScales[dim] = d3.scaleLinear().range([height, 0]).domain([1, maxVal])
  })

  // Scale for horizontal axis
  const xScale = d3.scaleLinear().domain([0, dimensions.length - 1]).range([0, width])

  // Create SVG with margin
  const svg = d3.select("#root").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)

  // Create vertical axes
  svg.selectAll(".axis")
    .data(dimensions)
    .enter().append("g")
    .attr("class", "axis")
    .attr("transform", (d, i) => `translate(${xScale(i)},0)`)
    .each(function (d, i) {
      d3.select(this).call(d3.axisLeft().scale(yScales[d]))

      // Crea e aggiunge il brush a ciascun asse
      const brush = d3.brushY()
        .extent([[-25, 0], [25, height]]) // Definisce l'intorno dell'asse per il brushing
        .on("brush", (event) => brushed(event, d)); // Imposta la funzione di callback per l'evento di brush

      d3.select(this).append("g")
        .attr("class", "brush")
        .call(brush);
    });

    function brushed(event, dimension) {
      if (event.selection) {
        const [y0, y1] = event.selection;
        const valueRange = [yScales[dimension].invert(y1), yScales[dimension].invert(y0)]; // Converti in valori di dominio
        // console.log(`Coordinate selezionate per ${dimension}:`, valueRange);

        // Filtra il dataset originale basandosi sul valore di 'dimension' e 'valueRange'
        // const filteredDataset = data.filter(d => {
        filteredDataset = dataset.filter(d => {

          // Converti il valore di 'd[dimension]' in un numero per il confronto
          const value = +d[dimensions.indexOf(dimension)];
          return value >= valueRange[0] && value <= valueRange[1];
        });
        console.log(filteredDataset);
        // Chiamata alla funzione colorFilter per modificare il colore delle linee
        colorFilter()
      }
    }

    function colorFilter() {
      // Estrai gli ID univoci dai dati filtrati
      // const filteredIds = filteredDataset.map(d => d.id);
      // console.log(filteredIds)
      // filteredDataset.forEach(d => {
      //   if(dataset.includes(d)){
      //     console.log('amala')
      //   }
      // })
      // Seleziona tutte le linee e aggiorna il colore solo per quelle che corrispondono agli ID in filteredIds
      svg.selectAll("path.line")
        .attr("stroke", function (d) {
          // console.log(d.id)
          // Assumi che l'oggetto dati di ciascuna linea includa un campo `id`
          return filteredDataset.includes(d) ? "orange" : "steelblue";
        });
    }
  

  // Aggiunta delle etichette sopra gli assi
  svg.selectAll(".axis-label")
    .data(dimensions)
    .enter().append("text")
    .attr("class", "axis-label")
    .attr("transform", (d, i) => `translate(${xScale(i)},${-10})`) // Posizionamento sopra l'asse
    .attr("text-anchor", "middle") // Allinea il testo al centro dell'asse
    .text(d => d); // Imposta il testo dell'etichetta al valore corrispondente in `dimensions`
  
  // Create connections between axes
  const linesGroup = svg.append("g")
    .attr("class", "lines") // Aggiunta dell'attributo class al gruppo

  const line = d3.line()
    .defined(d => !isNaN(d[0])) // Skip NaN values
    .x((d, i) => xScale(i))
    .y((d, i) => yScales[dimensions[i]](d))

  // const line = d3.line()
  //   .defined(d => !isNaN(d[0])) // Skip NaN values
  //   .x((d) => xScale(d.id))
  //   .y((d) => yScales[dimensions[d.id]](d))

  // Disegno delle linee
  dataset.forEach(d => {
    linesGroup.append("path") // Aggiunta delle linee al gruppo
      .datum(d) // Utilizzo dei dati dell'array
      .attr("class", "line") // Assegna la classe a ciascuna linea individualmente
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 0.5)
      .attr("d", line) // Applicazione della funzione line per generare il percorso
  })
})

