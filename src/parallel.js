// Path to the CSV file
// const csvFilePath = '../dataset/odds23.csv'
const csvFilePath = '../dataset/oddsITA23.csv'

// Dimensions of the SVG and margins
const margin = { top: 20, right: 30, bottom: 30, left: 40 }
const width = 650 - margin.left - margin.right
const height = 400 - margin.top - margin.bottom

const dimensions = ['AvgH', 'AvgD', 'AvgA', 'AvgO', 'AvgU']
const oddsLabels = ['1', 'X', '2', 'Ov', 'Un']

// TABLE:
d3.select("#table-container")
  .style("width", "50%") // Imposta la larghezza al 50% dello schermo
  .style("height", "50%") // Imposta l'altezza
  .style("overflow-x", "auto") // Permette lo scroll orizzontale se necessario
  .style("position", "absolute") // Posizionamento assoluto
  .style("right", "0px") // Allinea a destra
  .style("top", "0px"); // Allinea in alto

// Load CSV dataset and create the parallel coordinate plot
d3.csv(csvFilePath).then(data => {
  // Convert the data in an array of arrays
  const dataset = data.map(d => dimensions.map(dim => d[dim]))
  let filteredDataset = []  // Array for filtered data.
  const filteredRanges = {} // Object to store the min and max values for each dimension

  //Scales for vertical axes
  const yScales = {}
  dimensions.forEach(dim => {
    const maxVal = d3.max(data, d => +d[dim])
    yScales[dim] = d3.scaleLinear().range([height, 0]).domain([1, maxVal])
    filteredRanges[dim] = [1, maxVal]
  })

  // Scale for horizontal axis
  const xScale = d3.scaleLinear().domain([0, dimensions.length - 1]).range([0, width])

  // Create SVG with margin
  const svg = d3.select("#parallel-coordinates").append("svg")
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
        .on("brush", (event) => brushed(event, d)) // Imposta la funzione di callback per l'evento di brush

      d3.select(this).append("g")
        .attr("class", "brush")
        .call(brush)
    })

    function brushed(event, dimension) {
      if (event.selection) {
        const [y0, y1] = event.selection
        const valueRange = [yScales[dimension].invert(y1), yScales[dimension].invert(y0)] // Converti in valori di domini
        filteredRanges[dimension] = valueRange // Aggiorna l'intervallo di valori per la dimensione corrente
        highlight() // Chiama la funzione per filtrare i dati

        const filteredData = data.filter(row => {
          return dimensions.every(dimension => {
            // Se la dimensione non è presente in filteredRanges, considera la riga valida
            if (!filteredRanges[dimension]) return true;

            // Altrimenti, controlla se il valore della dimensione è compreso nel range
            const [min, max] = filteredRanges[dimension];
            return row[dimension] >= min && row[dimension] <= max;
          });
        });
        console.log(filteredData)
        updateTable(filteredData)
      }
    }

  function highlight() {
    d3.selectAll("path.line")
      .classed("line-highlighted", function (d) {
        // Assicurati che ogni punto in d soddisfi la condizione per la sua dimensione
        return d.every( (p,idx) => {
          const [min, max] = filteredRanges[dimensions[idx]] // Gli intervalli [min, max] per quella dimensione
          return p >= min && p <= max // Controlla se il valore è all'interno dell'intervallo
        })
      })
  }
  
  // Aggiunta delle etichette sopra gli assi
  svg.selectAll(".axis-label")
    .data(oddsLabels)
    .enter().append("text")
    .attr("class", "axis-label")
    .attr("transform", (d, i) => `translate(${xScale(i)},${height+20})`) // Posizionamento sopra l'asse
    .text(d => d) // Imposta il testo dell'etichetta al valore corrispondente in `dimensions`
  
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
      .attr("stroke-opacity", 0.4)
      .attr("d", line) // Applicazione della funzione line per generare il percorso
  })

  function updateTable(filteredData) {
    d3.select("#table-container").selectAll("table").remove();

    // Seleziona il contenitore della tabella
    const table = d3.select("#table-container").append("table");
    const thead = table.append("thead");
    const tbody = table.append("tbody");

    // Aggiungi l'intestazione della tabella (modifica questo per riflettere le tue colonne)
    thead.append("tr")
      .selectAll("th")
      .data(Object.keys(filteredData[0])) // Assumi che tutti gli oggetti abbiano le stesse chiavi
      .enter()
      .append("th")
      .text(function (column) { return column; })
      .attr("style", "color: steel blue; font-size: 12px; text-align: center; padding: 5px; border: 1px solid #ccc;")


    // Aggiungi le righe della tabella
    const rows = tbody.selectAll("tr")
      .data(filteredData)
      .enter()
      .append("tr");

    // Crea le celle per ogni riga
    const cells = rows.selectAll("td")
      .data(function (row) {
        return Object.keys(row).map(function (column) {
          return { column: column, value: row[column] };
        });
      })
      .enter()
      .append("td")
      .text(function (d) { return d.value; })
      .attr("style", "color: #ccc; font-size: 12px; text-align: center; padding: 5px; border: 1px solid #ccc;");
  }
  // Assicurati di chiamare updateTable() ogni volta che i dati filtrati cambiano
})




