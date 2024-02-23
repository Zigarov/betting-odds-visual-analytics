// Path to the CSV file
const csvFilePath = '../dataset/odds23.csv'
// const csvFilePath = '../dataset/oddsITA23.csv'
const dimensions = ['AvgH', 'AvgD', 'AvgA', 'AvgO', 'AvgU']
const oddsLabels = ['1', 'X', '2', 'Ov', 'Un']
const filteredRanges = {} // Object to store the min and max values for each dimension
let brushScatter; 
let brushParallel;

// Load CSV dataset and create the parallel coordinate plot
d3.csv(csvFilePath, d3.autoType).then(data => {  
  console.log(data)

  // Draw the parallel Coordinates Plot
  drawParallelCoordinates(data)

  // Draw the Comparative Chart
  drawComparativeChart(Stats(data))

  // Draw the Scatter Plot
  drawScatterPlot(data)
})

function drawParallelCoordinates(data) {
  // Remove the previous SVG
  d3.select("#parallel-chart").selectAll("svg").remove()
  // Check if the data is empty
  if (data.length === 0 || data === undefined) {
    console.log('No data to draw Parallel Coordinates Plot')
    return
  }
  // Margins for the visualizations
  const margin = { top: 10, right: 20, bottom: 30, left: 30 }
  // Get width and height of the visualization
  const visualization = d3.select("#parallel-chart")
  const width = visualization.node().clientWidth - margin.left - margin.right
  const height = visualization.node().clientHeight - margin.top - margin.bottom

  // Create SVG with margin
  const svg = visualization.append("svg")
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
      brushParallel = d3.brushY()
        .extent([[-25, 0], [25, height]]) // Definisce l'intorno dell'asse per il brushing
        .on("brush", (event) => brushedParallel(event, d, yScales)) // Imposta la funzione di callback per l'evento di brush

      d3.select(this).append("g")
        .attr("class", "brush")
        .call(brushParallel)
    })

  // Aggiunta delle etichette sopra gli assi
  svg.selectAll(".axis-label")
    .data(oddsLabels)
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

  function brushedParallel(event, dimension, yScales) {
    // d3.select('#scatter-plot').selectAll("brush").call(brushScatter.move, null)
    if (event.selection) {
      const [y0, y1] = event.selection  // Gain access to the selection range.
      
      // Convert into the original domain value
      filteredRanges[dimension] = [yScales[dimension].invert(y1), yScales[dimension].invert(y0)]
      const filteredData = {}
      // highlightParallelChart() // Highlight the selected lines
      svg.selectAll(".line")
        .classed("line-highlighted", (d, idx) => {
          if(d.every((p, i) => {
            const [min, max] = filteredRanges[dimensions[i]] 
            return p >= min && p <= max
          }))
          {
            filteredData[idx] = data[idx]
            return true
          }
        })
      drawComparativeChart(Stats(filteredData))
      hihglightScatterPlot(filteredData)
    }
  }

}

function highlightParallelChart(filteredData) {
    if (Object.keys(filteredRanges).length === 0) {
      console.log('No data to highlight')
    } else {
      d3.selectAll("path.line")
        .classed("line-highlighted", function (d, i) {
          return filteredData[i] !== undefined
        })
    }
}

function hihglightScatterPlot(filteredData) {
  if (Object.keys(filteredData).length === 0) {
    console.log('No data to highlight')
  }
  else {
    d3.select('#scatter-plot').selectAll(".point")
      .style('stroke', (d, i) => filteredData[i] !== undefined ? 'gold' : 'none')
  }
}

function Stats(data) {
  // Check if the data is empty
  const stats = {}

  if (Object.keys(data).length <2) {
    console.log('No data to compute stats')
    return stats
  }
  // Convert the data to an array if it is an object
  if (data.length === undefined) {
    data = Object.values(data)
  }

  // Compute Frequencies
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
      'min': d3.min(sortedColumn.filter(d => d >= lowerBound)),
      'max': d3.max(sortedColumn.filter(d => d <= upperBound)),
      'outliers': outliers,
      'frequence': frequencies[dim]
    }
  })
  return stats
}

function Frequencies(data) {
  if (Object.keys(data).length > 0) {
    const step = 1 / data.length  // counting step for frequencies
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

  // Clean the previous visualization 
  const visualization = d3.select('#comparative-chart')
  visualization.selectAll("svg").remove()

  // Check if the metrics is empty
  if (Object.keys(metrics).length === 0) {
    console.log("The dictionary is empty")
    return
  }

  // Set Margins for the visualization and get width and height of the visualization
  const margin = { top: 10, right: 10, bottom: 30, left: 30 }
  const height = visualization.node().clientHeight - margin.top - margin.bottom
  const width = visualization.node().clientWidth - margin.left - margin.right

  const svg = visualization.append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .append('g')
    // .attr('transform', `translate(${margin.left}, ${margin.top})`)

  // Scale for horizontal axis (categorical)
  const xScale = d3.scaleBand()
    .domain(dimensions) // Le tue categorie
    .range([0, width]) // L'intervallo effettivo di pixel dove saranno posizionati i boxplot
    .padding(0.1) // Imposta un piccolo padding tra ciascun boxplot

  // Scale for vertical axis (quantitative)
  const yScale = d3.scaleLinear()
    .domain([1, 0])
    .range([0, height]) // L'intervallo di altezza del grafico

  // Crea un gruppo per gli assi se non esiste, altrimenti lo seleziona
  const axisGroup = svg.selectAll('.axis')
    .data([null]) // Usa .data([null]) per assicurare che il gruppo venga creato una sola volta
    .join('g')
    .attr('class', 'axis')

  // Aggiungi l'asse X al gruppo degli assi
  axisGroup.append("g")
    .attr("transform", `translate(${margin.left}, ${height})`)
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
    const dx = xScale.bandwidth() / 2
    const x = xScale(dim) + dx

    // Disegna il rettangolo (quartili)
    boxplotGroup.append('rect')
      .attr('x', x - dx) // Centra il boxplot e regola l'altezza
      .attr('y', yScale(stat.q3))
      .attr('height', yScale(stat.q1) - yScale(stat.q3))
      .attr('width', dx * 2) // Altezza del boxplot (la metà della larghezza del padding tra i boxplot)
      .attr('fill', 'steelblue')
      .attr('opacity', 0.8) // Rendi l'area leggermente trasparente
      .on('mouseover', function (event) { 
        d3.select('.tooltip')
          .style('opacity', 1)
          .html(() => {
            // Costruisci una stringa con tutte le chiavi-valori di `stat`
            let content = ``;
            Object.keys(stat).forEach(key => {
              if (key === 'outliers') {
                content += `outliers: ${stat[key].length}<br/>`;
              }
              else {
                const value = typeof stat[key] === 'number' ? stat[key].toFixed(2) : stat[key];
                content += `${key}: ${value}<br/>`;
              }
            });
            return content;
          })
          .style('left', (event.pageX + 10) + 'px') // Posiziona il tooltip a destra del cursore
          .style('top', (event.pageY + 10) + 'px'); // Posiziona il tooltip sotto il cursore
      })
      .on('mouseout', function (event, d) {
        d3.select('.tooltip').style('opacity', 0); // Nascondi il tooltip
      })

    // Disegna la linea mediana
    boxplotGroup.append('line')
      .attr('x1', x - dx)
      .attr('x2', x + dx)
      .attr('y1', yScale(stat.median))
      .attr('y2', yScale(stat.median))
      .attr('stroke', 'gold')
      .attr('stroke-width', 2) // Rende la linea più spessa


    // Disegna la linea della media
    boxplotGroup.append('line')
      .attr('x1', x - dx)
      .attr('x2', x + dx)
      .attr('y1', yScale(stat.mean))
      .attr('y2', yScale(stat.mean))
      .attr('stroke', 'orange') // Usa un colore diverso per distinguere la media
      .attr('stroke-dasharray', '2,2') // Rende la linea tratteggiata
      .attr('stroke-width', 2) // Rende la linea più spessa

    // Disegna l'area della deviazione standard come rettangolo ombreggiato
    const stdRangeMin = stat.mean - stat.std
    const stdRangeMax = stat.mean + stat.std
    boxplotGroup.append('rect')
      .attr('x', x - dx / 2)
      .attr('y', yScale(stdRangeMax))
      .attr('height', yScale(stdRangeMin) - yScale(stdRangeMax))
      .attr('width', dx)
      .attr('fill', 'green') // Usa un colore leggero per l'area della deviazione standard
      .attr('opacity', 0.5) // Rendi l'area leggermente trasparente

    // Disegna i baffi (whiskers)

    // Linea del baffo inferiore
    boxplotGroup.append('line')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', yScale(stat.min))
      .attr('y2', yScale(stat.q1))
      .attr('stroke', 'white')
    // Linea del baffo superiore
    boxplotGroup.append('line')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', yScale(stat.q3))
      .attr('y2', yScale(stat.max))
      .attr('stroke', 'white')

    // Disegna gli outliers come punti
    stat.outliers.forEach(outlier => {
      boxplotGroup.append('circle')
        .attr('cy', yScale(outlier))
        .attr('cx', x)
        .attr('r', 1)
        .attr('fill', 'white')
    })

    // Definisce un generatore di simboli
    const symbolGenerator = d3.symbol().type(d3.symbolCross).size(32) // Scegli il tipo e la dimensione

    // Appende un simbolo a un punto specifico del grafico
    boxplotGroup.append('path')
      .attr('d', symbolGenerator()) // Imposta il percorso del simbolo
      .attr('transform', `translate(${x}, ${yScale(stat.frequence)})`) // Posiziona il simbolo
      .attr('fill', 'red') // Colore del simbolo
  })
}

function drawScatterPlot(data) {
  // Check if the data is empty
  if (data.length === 0 || data === undefined) {
    console.log('No data to draw Parallel Coordinates Plot')
    return
  }

  // Project the data in two dimensions
  const projectedData = reduceData(data.map(d => dimensions.map(dim => d[dim])))

  // Remove the previous SVG
  d3.select("#scatter-plot").selectAll("svg").remove()


  // Margins for the visualizations
  const margin = { top: 15, right: 15, bottom: 15, left: 15 }
  // Get width and height of the visualization
  const visualization = d3.select("#scatter-plot")
  const width = visualization.node().clientWidth - margin.left - margin.right
  const height = visualization.node().clientHeight - margin.top - margin.bottom

  // Create SVG with margin
  const svg = d3.select("#scatter-plot").append("svg")
    .attr("width", '100%')
    .attr("height", '100%')
    .append("g")
    // .attr("transform", `translate(${margin.left},${margin.top})`)

  // Scale for x-axis 
  const xScale = d3.scaleLinear()
    .domain(d3.extent(projectedData, d => d[0])).nice() // d[0] è il valore x di ciascun punto
    .range([0, width])
  // Scale for y-axis
  const yScale = d3.scaleLinear()
    .domain(d3.extent(projectedData, d => d[1])).nice() // d[1] è il valore y di ciascun punto
    .range([height, 0])

  // Axis Coordinates for x and y (0,0)
  const yAxisX = Math.min(width, Math.max(0, xScale(0)))
  const xAxisY = Math.min(height, Math.max(0, yScale(0)))

  // Draw the x-axis
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left} , ${xAxisY})`)
    .call(d3.axisBottom(xScale))
  // Draw the y-axis
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${yAxisX}, ${margin.top})`)
    .call(d3.axisLeft(yScale))

  // Draw the points

  const symbolGenerator = d3.symbol().size(32); // Dimensione del simbolo in pixel quadrati

  svg.selectAll(".point")
    .data(projectedData)
    .enter().append("path")
    .attr("class", "point")
    // .attr("d", (d, i) => symbolGenerator.type(isOver2(data[i]) ? d3.symbolCircle : d3.symbolTriangle)()) // Imposta il percorso del simbolo
    .attr("d", d3.symbol().type(d3.symbolTriangle).size(32)) // Imposta il percorso del simbolo
    // .attr("transform", d => `translate(${xScale(d[0])},${yScale(d[1])}) rotate(180)`) // Posiziona il simbolo
    .attr("transform", (d, i) => isOver2(data[i]) ? `translate(${xScale(d[0])},${yScale(d[1])}) rotate(180)` : `translate(${xScale(d[0])},${yScale(d[1])})`) // Posiziona il simbolo
    .style("fill", (d, i) => data[i].FTR === 'H' ? 'red' : data[i].FTR === 'D' ? 'white' : 'green') // Border Color
    // .style("fill", "none") // Fill Color
    // .style("stroke-width", 1.5) // Border Width

  brushScatter = d3.brush()
    .extent([[0, 0], [width, height]]) // Definisce l'area su cui il brush può essere applicato
    .on("brush", event => brushedScatter(event, data)) // Eventi da gestire durante e dopo il brushing

  // Aggiungi l'elemento brush al tuo SVG
  svg.append("g")
    .attr("class", "brush")
    .call(brushScatter);

  function brushedScatter(event, data) {
    const filteredData = {}
    if (!event.selection) {
      console.log('No points selected')
    } else {
      const [[x0, y0], [x1, y1]] = event.selection
      svg.selectAll(".point")
        .style("stroke", (d,i) => {
          // Usa le scale per controllare se il punto è dentro la selezione
          const x = xScale(d[0]), y = yScale(d[1]);
          if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
            filteredData[i] = data[i]
            return "gold";
          }
          // return x >= x0 && x <= x1 && y >= y0 && y <= y1 ? "orange" : "none";
        });
      // Draw the Comparative Chart
      drawComparativeChart(Stats(filteredData))
      // Highlight the selected lines in the Parallel Coordinates Plot
      highlightParallelChart(filteredData)
    }
  }
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

function isOver2(row) {
  const goalScored = Number(row.HG) + Number(row.AG)
  if (goalScored > 2) {
    return true
  } else {
    return false
  }
}

function Update(filteredData) {
}