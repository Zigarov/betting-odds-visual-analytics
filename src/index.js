// Path to the CSV file
// const csvFilePath = '../dataset/odds23.csv'
const csvFilePath = '../dataset/oddsITA23.csv'
const dimensions = ['AvgH', 'AvgD', 'AvgA', 'AvgO', 'AvgU']
const oddsLabels = ['1', 'X', '2', 'Ov', 'Un']
const filteredRanges = {} // Object to store the min and max values for each dimension


// Margins for the visualizations
const margin = { top: 10, right: 20, bottom: 30, left: 30}
// Get width and height of the visualization
const visualization = d3.select("#parallel-coordinates")
const width = visualization.node().clientWidth - margin.left - margin.right
const height = visualization.node().clientHeight - margin.top - margin.bottom

// Load CSV dataset and create the parallel coordinate plot
d3.csv(csvFilePath, d3.autoType).then(data => {  
  // Draw the parallel Coordinates Plot
  drawParallelCoordinates(data)

  // Draw the Comparative Chart
  drawComparativeChart(Stats(data))

  // Draw the Scatter Plot
  const dataOdds = data.map(d => dimensions.map(dim => d[dim]))
  drawScatterPlot(reduceData(dataOdds))

  
  function drawParallelCoordinates(data) {
    if (data.length === 0 || data === undefined) {
      console.log('No data to draw Parallel Coordinates Plot')
      return
    }

    // Remove the previous SVG
    d3.select("#parallel-coordinates").selectAll("svg").remove()

    // Create SVG with margin
    const svg = d3.select("#parallel-coordinates").append("svg")
      .attr("width", '100%')
      .attr("height", '100%')
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Scale for horizontal axis
    const xScale = d3.scaleLinear().domain([0, dimensions.length - 1]).range([0, width])
    // const xScale = d3.scaleBand().domain(dimensions).range([0, width]).padding(0.1)

    //Scales for vertical axes
    const yScales = {}
    dimensions.forEach((dim, i) => {
      const maxVal = d3.max(data, d => +d[dim])
      yScales[dim] = d3.scaleLinear().range([height, 0]).domain([1, maxVal])
      filteredRanges[dim] = [1, maxVal]
    })

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
          .on("brush", (event) => brushed(event, d, yScales)) // Imposta la funzione di callback per l'evento di brush

        d3.select(this).append("g")
          .attr("class", "brush")
          .call(brush)
      })

    // Aggiunta delle etichette sopra gli assi
    svg.selectAll(".axis-label")
      .data(dimensions)
      .enter().append("text")
      .attr("class", "axis-label")
      .attr("transform", (d, i) => `translate(${xScale(i)},${height + 20})`) // Posizionamento sopra l'asse
      .text(d => d) // Imposta il testo dell'etichetta al valore corrispondente in `dimensions`

    // Create connections between axes
    const linesGroup = svg.append("g")
      .attr("class", "lines") // Aggiunta dell'attributo class al gruppo

    const line = d3.line()
      .x((d, i) => xScale(i))
      .y((d, i) => yScales[dimensions[i]](d))
      
    // Map the data to an array of odds
    const dataset = data.map(d => dimensions.map(dim => d[dim]))

    // Disegno delle linee
    dataset.forEach(d => {
      linesGroup.append("path") // Aggiunta delle linee al gruppo
        .datum(d) // Utilizzo dei dati dell'array
        .attr("class", "line") // Assegna la classe a ciascuna linea individualmente
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 0.5)
        .attr("stroke-opacity", 0.25)
        .attr("d", line) // Applicazione della funzione line per generare il percorso
    })

    function brushed(event, dimension, yScales) {
      if (event.selection) {
        const [y0, y1] = event.selection  // Gain access to the selection range.
        // Convert into the original domain value
        filteredRanges[dimension] = [yScales[dimension].invert(y1), yScales[dimension].invert(y0)]
        
        highlightParallelChart() // Highlight the selected lines

        const filteredData = data.filter(row => {
          return dimensions.every(dimension => {
            // Se la dimensione non è presente in filteredRanges, considera la riga valida
            if (!filteredRanges[dimension]) return true

            // Altrimenti, controlla se il valore della dimensione è compreso nel range
            const [min, max] = filteredRanges[dimension]
            return row[dimension] >= min && row[dimension] <= max
          })
        })
        updateTable(filteredData)
        drawComparativeChart(Stats(filteredData))
      }
    }

    function highlightParallelChart() {
      d3.selectAll("path.line")
        .classed("line-highlighted", function (d) {
          // Assicurati che ogni punto in d soddisfi la condizione per la sua dimensione
          return d.every((p, idx) => {
            const [min, max] = filteredRanges[dimensions[idx]] // Gli intervalli [min, max] per quella dimensione
            return p >= min && p <= max // Controlla se il valore è all'interno dell'intervallo
          })
        })
    }
  }

  function updateTable(filteredData) {
    if (filteredData.length === 0 || filteredData === undefined) {
      console.log('No data to compute Table')
      return
    }
    d3.select("#table-container").selectAll("table").remove()

    // Seleziona il contenitore della tabella
    const table = d3.select("#table-container").append("table")
    const thead = table.append("thead")
    const tbody = table.append("tbody")

    // Aggiungi l'intestazione della tabella (modifica questo per riflettere le tue colonne)
    thead.append("tr")
      .selectAll("th")
      .data(Object.keys(filteredData[0])) // Assumi che tutti gli oggetti abbiano le stesse chiavi
      .enter()
      .append("th")
      .text(function (column) { return column })
      .attr("style", "color: steelblue font-size: 11px text-align: center padding: 5px border: 1px solid #ccc")


    // Aggiungi le righe della tabella
    const rows = tbody.selectAll("tr")
      .data(filteredData)
      .enter()
      .append("tr")

    // Crea le celle per ogni riga
    const cells = rows.selectAll("td")
      .data(function (row) {
        return Object.keys(row).map(function (column) {
          return { column: column, value: row[column] }
        })
      })
      .enter()
      .append("td")
      .text(function (d) { return d.value })
      .attr("style", "color: #ccc font-size: 11px text-align: center padding: 2px border: 1px solid #ccc")
  }

  function Stats(data) {
    const stats = {}
    if (data.length === 0 || data === undefined) {
      console.log('No data to compute stats')
      return stats
    }
    const frequencies = Frequencies(data)

    dimensions.forEach(dim => {
      sortedColumn = data.map(d => 1 / Number(d[dim])).sort(d3.ascending)

      const q1 = d3.quantile(sortedColumn, 0.25)
      const q3 = d3.quantile(sortedColumn, 0.75)
      const iqr = q3 - q1 // Intervallo interquartile
      const lowerBound = Math.max(q1 - 1.5 * iqr, 0)
      const upperBound = Math.min(q3 + 1.5 * iqr, 1)
      const outliers = sortedColumn.filter(d => d < lowerBound || d > upperBound)

      stats[dim] = {
        'mean': d3.mean(sortedColumn),
        'std': d3.deviation(sortedColumn),
        'median': d3.median(sortedColumn),
        'q1': q1,
        'q3': q3,
        'lowerWhisker': d3.min(sortedColumn.filter(d => d >= lowerBound)),
        'upperWhisker': d3.max(sortedColumn.filter(d => d <= upperBound)),
        'outliers': outliers,
        'frequence': frequencies[dim]
      }
    })
    return stats
  }
    
  function Frequencies(data) {
    if (data.length != 0 || data != undefined) {
      const step = 1/data.length  // counting step for frequencies
      const results = ['H', 'D', 'A', 'Ov', 'Un'] // possible results

      // Initialize frequencies object
      const frequencies = dimensions.reduce((acc, result) => {
        acc[result] = 0
        return acc
      }, {})

      // Itera su ogni elemento di 'data' per popolare 'frequencies'
      data.forEach(row => {
        const result = row.FTR // Ottiene il valore della colonna 'FTR'
        frequencies[dimensions[results.indexOf(result)]] += step // Incrementa il conteggio per il risultato corrente
        const goalScored = Number(row.HG) + Number(row.AG)
        if (goalScored > 2) {
          frequencies['AvgO'] += step
        } else {
          frequencies['AvgU'] += step
        } 
      })
      return frequencies
    }
  }

  function drawComparativeChart(metrics) { 
  // Seleziona il contenitore
    const container = d3.select('#comparative-chart')
    container.selectAll("svg").remove()

    if (Object.keys(metrics).length === 0) {
      console.log("The dictionary is empty")
      return
    } 

    // Calcola le dimensioni effettive del grafico, sottraendo i margini
    const chartWidth = container.node().getBoundingClientRect().width - margin.left - margin.right
    const chartHeight = container.node().getBoundingClientRect().height - margin.top - margin.bottom

    const svg = container.append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)
    
    // Scala per l'asse X
    const xScale = d3.scaleLinear()
      .domain([0, 1]) // Inverti il dominio per avere 1 in basso e 0 in alto
      .range([0, width]) // L'intervallo di altezza del grafico

    // Scala per l'asse Y
    const yScale = d3.scaleBand()
      .domain(dimensions) // Le tue categorie
      .range([0, height]) // L'intervallo effettivo di pixel dove saranno posizionati i boxplot
      .padding(0.1) // Imposta un piccolo padding tra ciascun boxplot

    // Crea un gruppo per gli assi se non esiste, altrimenti lo seleziona
    const axisGroup = svg.selectAll('.axis')
      .data([null]) // Usa .data([null]) per assicurare che il gruppo venga creato una sola volta
      .join('g')
      .attr('class', 'axis')

    // Aggiungi l'asse X al gruppo degli assi
    axisGroup.append("g")
      .attr("transform", `translate(${margin.left}, ${height + margin.top})`)
      .call(d3.axisBottom(xScale))

    // Aggiungi l'asse Y al gruppo degli assi
    axisGroup.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`)
      .call(d3.axisLeft(yScale))
    // Assicurati di selezionare o creare un gruppo per i boxplot all'interno della SVG
    const boxplotGroup = svg.selectAll('.boxplots')
      .data([null]) // Assicura la creazione di un solo gruppo
      .join('g')
      .attr('class', 'boxplots')
      .attr("transform", `translate(${margin.left}, ${margin.top})`)

    // Per ciascuna dimensione, disegna il boxplot
    dimensions.forEach(dim => {
      // Gain access to the stats for this dimension
      const stat = metrics[dim] 

      // Calcola la posizione Y del centro del boxplot per questa dimensione
      const dy = yScale.bandwidth() / 2
      const y = yScale(dim) + dy

      // Disegna il rettangolo (quartili)
      boxplotGroup.append('rect')
        .attr('x', xScale(stat.q1))
        .attr('y', y - dy) // Centra il boxplot e regola l'altezza
        .attr('width', xScale(stat.q3) - xScale(stat.q1))
        .attr('height', dy * 2) // Altezza del boxplot (la metà della larghezza del padding tra i boxplot)
        .attr('fill', 'steelblue')
        .attr('opacity', 0.8) // Rendi l'area leggermente trasparente


      // Disegna la linea mediana
      boxplotGroup.append('line')
        .attr('x1', xScale(stat.median))
        .attr('x2', xScale(stat.median))
        .attr('y1', y - dy)
        .attr('y2', y + dy)
        .attr('stroke', 'red')
        .attr('stroke-width', 2) // Rende la linea più spessa


      // Disegna la linea della media
      boxplotGroup.append('line')
        .attr('x1', xScale(stat.mean))
        .attr('x2', xScale(stat.mean))
        .attr('y1', y - dy)
        .attr('y2', y + dy)
        .attr('stroke', 'red') // Usa un colore diverso per distinguere la media
        .attr('stroke-dasharray', '2,2') // Rende la linea tratteggiata
        .attr('stroke-width', 2) // Rende la linea più spessa

      // Disegna l'area della deviazione standard come rettangolo ombreggiato
      const stdRangeMin = stat.mean - stat.std
      const stdRangeMax = stat.mean + stat.std
      boxplotGroup.append('rect')
        .attr('x', xScale(stdRangeMin))
        .attr('y', y - dy/2)
        .attr('width', xScale(stdRangeMax) - xScale(stdRangeMin))
        .attr('height', dy)
        .attr('fill', 'sky') // Usa un colore leggero per l'area della deviazione standard
        .attr('opacity', 0.5) // Rendi l'area leggermente trasparente

      // Disegna i baffi (whiskers)

      // Linea del baffo inferiore
      boxplotGroup.append('line')
        .attr('x1', xScale(stat.lowerWhisker))
        .attr('x2', xScale(stat.q1))
        .attr('y1', y)
        .attr('y2', y)
        .attr('stroke', 'white')
      // Linea del baffo superiore
      boxplotGroup.append('line')
        .attr('x1', xScale(stat.q3))
        .attr('x2', xScale(stat.upperWhisker))
        .attr('y1', y)
        .attr('y2', y)
        .attr('stroke', 'white')

      // Disegna gli outliers come punti
      stat.outliers.forEach(outlier => {
        boxplotGroup.append('circle')
          .attr('cx', xScale(outlier))
          .attr('cy', y)
          .attr('r', 1)
          .attr('fill', 'white')
      })

      // Definisce un generatore di simboli
      const symbolGenerator = d3.symbol().type(d3.symbolCross).size(32) // Scegli il tipo e la dimensione

      // Appende un simbolo a un punto specifico del grafico
      boxplotGroup.append('path')
        .attr('d', symbolGenerator()) // Imposta il percorso del simbolo
        .attr('transform', `translate(${xScale(stat.frequence)}, ${y})`) // Posiziona il simbolo
        .attr('fill', 'gold') // Colore del simbolo
    })
  }

  function drawScatterPlot(data) {
    // console.log(data)

    // Remove the previous SVG
    d3.select("#scatter-plot").selectAll("svg").remove()

    // Create SVG with margin
    const svg = d3.select("#parallel-coordinates").append("svg")
      .attr("width", '100%')
      .attr("height", '100%')
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Scale for axes
    const xScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d[0])).nice() // d[0] è il valore x di ciascun punto
      .range([0, width])

    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d[1])).nice() // d[1] è il valore y di ciascun punto
      .range([height, 0])

      const yAxisX = Math.min(width, Math.max(0, xScale(0)))  
      const xAxisY = Math.min(height, Math.max(0, yScale(0)))

    svg.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(0," + xAxisY + ")")
      .call(d3.axisBottom(xScale))

    svg.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(" + yAxisX + ",0)")
      .call(d3.axisLeft(yScale))

    // Disegna i punti
    svg.selectAll(".point")
      .data(data)
      .enter().append("circle")
      .attr("class", "point")
      .attr("cx", d => xScale(d[0]))
      .attr("cy", d => yScale(d[1]))
      .attr("r", 3)
      .style("fill", "steelblue");
    
  }

  function reduceData(data) {
    const normalizedData = normalizeData(data)
    //let distanceMatrix = druid.distance_matrix(druid.Matrix.from(data))
    let reducedData = new druid.MDS(druid.Matrix.from(normalizedData)).transform()
    return reducedData.to2dArray
  }

  function normalizeData(data) {
    // Calcola la media e la deviazione standard per ogni colonna
    let means = data[0].map((_, i) => d3.mean(data, row => row[i]));
    let stdDevs = data[0].map((_, i) => d3.deviation(data, row => row[i]));

    // Applica la normalizzazione Z-score
    let normalizedData = data.map(row =>
      row.map((value, i) => (value - means[i]) / stdDevs[i])
    )
    return normalizedData
  }
})