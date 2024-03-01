import * as d3 from 'd3'

let parallelCoords = []
const maxValues = {}
let filteredRanges = {}

export function drawParallelPlot (data, dimensions, containerId = '#parallel-plot', filteredDataIndex = {}) {
  const visualization = d3.select(containerId)
  // Remove the prevoius SVG
  visualization.selectAll('svg').remove()

  if (data.length === 0 || data === undefined) {
    console.log('No data to draw Parallel Coordinates Plot')
    return
  }
  // Transform the data in an Array of Arrays
  parallelCoords = data.map(d => dimensions.map(dim => d[dim]))

  const margin = { top: 10, right: 20, bottom: 40, left: 30 }
  // Get width and height of the visualization
  const width = visualization.node().clientWidth - margin.left - margin.right
  const height = visualization.node().clientHeight - margin.top - margin.bottom

  // Create SVG with margin
  const svg = visualization.append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
  // Scale for horizontal axis
  const xScale = d3.scaleLinear().domain([0, dimensions.length - 1]).range([0, width])
  // const xScale = d3.scaleBand().domain(dimensions).range([0, width]).align(0.5)
  // Scales for vertical axes
  const yScales = {}
  dimensions.forEach((dim, i) => {
    const maxVal = d3.max(data, d => +d[dim])
    yScales[dim] = d3.scaleLinear().range([height, 0]).domain([1, maxVal])
    filteredRanges[dim] = [1, maxVal]
  })
  // Creat the brush for the vertical axes
  const brushY = d3.brushY()
    .extent([[-25, 0], [25, height]])
    .on('brush', event => brushedY(event))
  // Create vertical axes
  svg.selectAll('.axis')
    .data(dimensions)
    .enter().append('g')
    .attr('class', 'axis')
    .attr('transform', (d, i) => `translate(${xScale(i)},0)`)
    .each(function (d) {
      d3.select(this).call(d3.axisLeft(yScales[d]))
      d3.select(this).append('g')
        .attr('class', 'brush')
        .call(brushY)
      d3.select(this).append('text')
        .attr('class', 'axis-label')
        .attr('y', height + margin.bottom / 2)
        .text(d)
    })
  // Create the lines
  svg.append('g')
    .attr('class', 'lines')
    .selectAll('path')
    .data(parallelCoords)
    .enter().append('path')
    .attr('d', line(xScale, yScales, dimensions))
    .attr('class', 'line')
    .attr('stroke', 'steelblue')
    .attr('stroke-opacity', 0.5)
    .attr('fill', 'none')
    .attr('stroke-width', 0.25)
}

function brushedY (event) {
  console.log(event)
}

function line (xScales, yScales, dimensions) {
  return d3.line()
    .x((d, i) => xScales(i))
    .y((d, i) => yScales[dimensions[i]](d))
}
