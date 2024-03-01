import * as d3 from 'd3'

export function drawScatterPlot (data, containerId = '#scatter-plot', filteredDataIndex = {}) {
  const visualization = d3.select(containerId)
  // Remove the prevoius SVG
  visualization.selectAll('svg').remove()
  // Check if there is data to draw the visualization
  if (data.length === 0 || data === undefined) {
    console.log('No data to draw Scatter Coordinates Plot')
    return
  }
  const projectedData = data.map(row => [row.x, row.y])

  // Margins for the visualizations
  const margin = { top: 15, right: 15, bottom: 15, left: 15 }
  // Get width and height of the visualization
  const width = visualization.node().clientWidth - margin.left - margin.right
  const height = visualization.node().clientHeight - margin.top - margin.bottom

  const svg = visualization.append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .append('g')

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
  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(${margin.left} , ${xAxisY})`)
    .call(d3.axisBottom(xScale))
  // Draw the y-axis
  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(${yAxisX}, ${margin.top})`)
    .call(d3.axisLeft(yScale))

  // Draw the points
  const symbolGenerator = d3.symbol().size(24) // Symbol Generator for the points
  svg.selectAll('.point')
    .data(projectedData)
    .enter().append('path')
    .attr('class', 'point')
    .attr('d', (d, i) => symbolGenerator.type(data[i].isOver === 'Over' ? d3.symbolCircle : d3.symbolTriangle)()) // Imposta il percorso del simbolo
    .attr('transform', d => `translate(${xScale(d[0])},${yScale(d[1])})`) // Posiziona il simbolo
    .style('fill', (d, i) => data[i].FTR === 'H' ? 'red' : data[i].FTR === 'D' ? 'white' : 'green') // Border Color
  // Draw the Legend
  const legendSymbols = [
    { symbol: d3.symbolSquare, color: 'red', label: 'Home' },
    { symbol: d3.symbolSquare, color: 'white', label: 'Draw' },
    { symbol: d3.symbolSquare, color: 'green', label: 'Away' },
    { symbol: d3.symbolCircle, color: 'gray', label: 'Over' },
    { symbol: d3.symbolTriangle, color: 'gray', label: 'Under' }
  ]
  // Compute the position of the legend
  const legendX = width + margin.left - 80 // Adjust this value
  const legendY = height + margin.top - 80 // Adjust this value

  // Add the Legend group to the SVG
  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${legendX},${legendY})`)

  // Add the legend symbols
  legendSymbols.forEach((item, index) => {
    const symbolGenerator = d3.symbol().type(item.symbol).size(64) // Dimensione del simbolo
    legend.append('path')
      .attr('d', symbolGenerator())
      .attr('transform', `translate(0, ${index * 20})`) // Create space between the symbols
      .style('fill', item.color)

    // Add the legend text
    legend.append('text')
      .attr('x', 10) // distance from the symbol
      .attr('y', index * 20)
      .attr('dy', '0.32em') // center the text
      .style('text-anchor', 'start')
      .text(item.label)
      .style('fill', 'white')
      .style('font-size', '10px')
  })
  // Add the brush
  const brush = d3.brush()
    .extent([[0, 0], [width, height]])
    .on('brush', event => brushed(event, data, xScale, yScale, filteredDataIndex))
  svg.append('g')
    .attr('class', 'brush')
    .call(brush)
}

function brushed (event, data, xScale, yScale, filteredDataIndex) {
  console.log(event)
}
