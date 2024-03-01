import * as d3 from 'd3'

export function drawComparativeChart (data, dimensions, containerId = '#comparative-chart', filteredDataIndex = {}) {
  // Remove the prevoius SVG
  const visualization = d3.select(containerId)
  visualization.selectAll('svg').remove()
  // Compute the analytics for the boxplots
  const analytics = computeAnalytics(data, dimensions)
  // Check if the analytics is empty
  if (Object.keys(analytics).length === 0) {
    console.log('The dictionary is empty')
    return
  }

  // Set Margins for the visualization and get width and height of the visualization
  const margin = { top: 40, right: 0, bottom: 30, left: 30 }
  const height = visualization.node().clientHeight - margin.top - margin.bottom
  const width = visualization.node().clientWidth - margin.left - margin.right

  // Create the SVG element
  const svg = visualization.append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .append('g')

  // Scale for horizontal axis (categorical)
  // const xScale = d3.scaleLinear().domain([0, dimensions.length - 1]).range([0, width])
  const xScale = d3.scaleBand()
    .domain(dimensions) // Le tue categorie
    .range([0, width]) // L'intervallo effettivo di pixel dove saranno posizionati i boxplot
    .padding(0.1) // Imposta un piccolo padding tra ciascun boxplot

  // Scale for vertical axis (quantitative)
  const yScale = d3.scaleLinear()
    .domain([1, 0])
    .range([0, height]) // L'intervallo di altezza del grafico

  // Draw the Axes
  // Axis x
  svg.append('g')
    .attr('class', '.axis')
    .attr('transform', `translate(${margin.left}, ${height + margin.top})`)
    .call(d3.axisBottom(xScale))

  // Aggiungi l'asse Y al gruppo degli assi
  svg.append('g')
    .attr('class', '.axis')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
    .call(d3.axisLeft(yScale))

  // Draw the Boxplots
  drawBoxplots(svg, analytics, xScale, yScale, margin, dimensions)

  // Draw the Legend
  drawLegend(svg, margin)

  return svg
}

function computeAnalytics (data, dimensions) {
  const analytics = {} // Dictionary to store the analytics for each dimension
  const results = ['H', 'D', 'A', 'Over', 'Under'] // Possibile outcomes, used to compute the frequencies for each dimension
  const frequencies = computeFrequencies(data, results) // Frequencies for each dimension
  // Check if the data is empty
  if (Object.keys(data).length < 2) {
    console.log('Not enough data to compute the analytics')
    return analytics
  }
  dimensions.forEach((dim, i) => {
    // Compute the analytics for the boxplots
    const sortedColumn = data.map(d => 1 / Number(d[dim])).sort(d3.ascending)
    const q1 = d3.quantile(sortedColumn, 0.25)
    const q3 = d3.quantile(sortedColumn, 0.75)
    const iqr = q3 - q1 // Interquartile Range
    const lowerBound = Math.max(q1 - 1.5 * iqr, 0)
    const upperBound = Math.min(q3 + 1.5 * iqr, 1)
    const outliers = sortedColumn.filter(d => d < lowerBound || d > upperBound)

    analytics[dim] = {
      mean: d3.mean(sortedColumn),
      std: d3.deviation(sortedColumn),
      median: d3.median(sortedColumn),
      q1,
      q3,
      min: d3.min(sortedColumn.filter(d => d >= lowerBound)),
      max: d3.max(sortedColumn.filter(d => d <= upperBound)),
      outliers,
      frequency: frequencies[results[i]]
    }
  })
  return analytics
}

function computeFrequencies (data, results) {
  const step = 1 / data.length
  const frequencies = {}
  // Initialize the frequencies dictionary
  results.forEach(res => {
    frequencies[res] = 0
  })
  // Compute frequencies for each result
  data.forEach(row => {
    const result = row.FTR
    frequencies[result] += step
    row.isOver === 'Over' ? frequencies.Over += step : frequencies.Under += step
  })
  return frequencies
}

function drawLegend (svg, margin) {
  // Add legend group to the SVG
  const legend = svg.append('g')
    .attr('class', 'legend')
    // .attr('transform', `translate(${margin.left},${margin.top})`)

  // Draw Line for the main box-plots (median, q1, q3)
  legend.append('line')
    .attr('x1', margin.left / 3)
    .attr('x2', margin.left / 3 + 16)
    .attr('y1', margin.top / 4)
    .attr('y2', margin.top / 4)
    .style('stroke', 'white')
    .style('stroke-width', 2)
  legend.append('text')
    .attr('x', margin.left / 3 + 20)
    .attr('y', margin.top / 4 + 3)
    .style('fill', 'white')
    .text('median, q1, q3')
    .style('font-size', '11px')

  // Draw Dashed Line for the secondary box-plots (mean, std)
  legend.append('line')
    .attr('x1', margin.left / 3)
    .attr('x2', margin.left / 3 + 16)
    .attr('y1', margin.top / 3 + 12)
    .attr('y2', margin.top / 3 + 12)
    .style('stroke', 'white')
    .style('stroke-width', 2)
    .style('stroke-dasharray', '5,5')
  legend.append('text')
    .attr('x', margin.left / 3 + 20)
    .attr('y', margin.top / 3 + 15)
    .style('fill', 'white')
    .style('font-size', '11px')
    .text('mean, std')

  // Draw a circle for the outliers
  legend.append('circle')
    .attr('cx', 150)
    .attr('cy', margin.top / 4)
    .attr('r', 4)
    .style('fill', 'white')
  legend.append('text')
    .attr('x', 164)
    .attr('y', margin.top / 4 + 3)
    .style('fill', 'white')
    .text('outliers')
    .style('font-size', '11px')

  const crossSymbol = d3.symbol().type(d3.symbolCross).size(32) // Puoi adattare la dimensione con 'size'
  // Draw the cross for the frequency
  legend.append('path')
    .attr('d', crossSymbol())
    .attr('transform', `translate(${150}, ${margin.top / 3 + 12})`) // Posiziona la croce
    .style('fill', 'red') // Imposta il colore della croce
  legend.append('text')
    .attr('x', 164)
    .attr('y', margin.top / 3 + 15) // Puoi regolare la posizione y per allineare il testo con il simbolo
    .style('fill', 'white')
    .text('frequency')
    .style('font-size', '10px')
}

function drawBoxplots (svg, analytics, xScale, yScale, margin, dimensions) {
  // Create a group for the boxplots
  const boxplotGroup = svg.selectAll('.boxplots')
    .data([null])
    .join('g')
    .attr('class', 'boxplots')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)

  // Draw Boxplots for each dimension
  dimensions.forEach(dim => {
    // Gain access to the stats for this dimension
    const stat = analytics[dim]

    // Compute the x position of the boxplot and its width
    const dx = xScale.bandwidth() / 2
    const x = xScale(dim) + dx

    // Draw the box based on quartiles
    boxplotGroup.append('rect')
      .attr('x', x - dx) // Align the boxplot to the center of the category
      .attr('y', yScale(stat.q3))
      .attr('height', yScale(stat.q1) - yScale(stat.q3))
      .attr('width', dx * 2)
      .attr('fill', 'none')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('fill', 'none')
      .on('mouseover', function (event) {
        // Show the tooltip on mouseover
        d3.select('.tooltip')
          .style('opacity', 1)
          .html(() => {
            // Get the string with all the metrics
            let content = ''
            Object.keys(stat).forEach(key => {
              if (key === 'outliers') {
                content += 'outliers: ' + stat[key].length + '<br/>'
              } else {
                const value = typeof stat[key] === 'number' ? stat[key].toFixed(2) : stat[key]
                content += key + ': ' + value + '<br/>'
              }
            })
            return content
          })
          .style('left', (event.pageX + 10) + 'px') // Place the tooltip to the right of the cursor
          .style('top', (event.pageY + 10) + 'px') // Place the tooltip below the cursor
      })
      .on('mouseout', function (event, d) {
        d3.select('.tooltip').style('opacity', 0) // hide the tooltip
      })

    // Draw the median line
    boxplotGroup.append('line')
      .attr('x1', x - dx)
      .attr('x2', x + dx)
      .attr('y1', yScale(stat.median))
      .attr('y2', yScale(stat.median))
      .attr('stroke', 'white')
      .attr('stroke-width', 4)

    // Draw the mean line
    boxplotGroup.append('line')
      .attr('x1', x - dx / 2)
      .attr('x2', x + dx / 2)
      .attr('y1', yScale(stat.mean))
      .attr('y2', yScale(stat.mean))
      .attr('stroke', 'white')
      .attr('stroke-dasharray', '2,2')
      .attr('stroke-width', 4)

    // Draw the box for the standard deviation
    const stdRangeMin = stat.mean - stat.std
    const stdRangeMax = stat.mean + stat.std
    boxplotGroup.append('rect')
      .attr('x', x - dx / 2)
      .attr('y', yScale(stdRangeMax))
      .attr('height', yScale(stdRangeMin) - yScale(stdRangeMax))
      .attr('width', dx)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('fill', 'none')
      .attr('stroke-dasharray', '2,2') // use dashed line for the standard deviation

    // Draw the lower whiskers
    boxplotGroup.append('line')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', yScale(stat.min))
      .attr('y2', yScale(stat.q1))
      .attr('stroke', 'white')
    boxplotGroup.append('line')
      .attr('x1', x - dx / 4)
      .attr('x2', x + dx / 4)
      .attr('y1', yScale(stat.min))
      .attr('y2', yScale(stat.min))
      .attr('stroke', 'white')
    // Draw the upper whisker
    boxplotGroup.append('line')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', yScale(stat.q3))
      .attr('y2', yScale(stat.max))
      .attr('stroke', 'white')
    boxplotGroup.append('line')
      .attr('x1', x - dx / 4)
      .attr('x2', x + dx / 4)
      .attr('y1', yScale(stat.max))
      .attr('y2', yScale(stat.max))
      .attr('stroke', 'white')

    // Draw outliners as circles
    stat.outliers.forEach(outlier => {
      boxplotGroup.append('circle')
        .attr('cy', yScale(outlier))
        .attr('cx', x)
        .attr('r', 1.3)
        .attr('fill', 'white')
    })

    // Define the cross symbol for the frequency
    const symbolGenerator = d3.symbol().type(d3.symbolCross).size(64) // Scegli il tipo e la dimensione

    // Draw the frequency symbol
    boxplotGroup.append('path')
      .attr('d', symbolGenerator())
      .attr('transform', `translate(${x}, ${yScale(stat.frequency)})`)
      .attr('fill', 'red')
  })
}
