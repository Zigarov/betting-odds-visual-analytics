import * as d3 from 'd3'
import { Update } from './index.js'
// let parallelCoords = []
// const maxValues = {}
// const selectedRanges = {}

export function drawParallelPlot (data, dimensions, containerId = '#parallel-plot', filteredDataIndex = {}) {
  const visualization = d3.select(containerId)
  // Remove the prevoius SVG
  visualization.selectAll('svg').remove()

  if (data.length === 0 || data === undefined) {
    console.log('No data to draw Parallel Coordinates Plot')
    return
  }
  // Transform the data in an Array of Arrays
  const parallelCoords = data.map(d => dimensions.map(dim => d[dim]))
  const selectedRanges = {}

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
    selectedRanges[dim] = [1, maxVal]
  })

  // Create vertical axes
  svg.selectAll('.axis')
    .data(dimensions)
    .enter().append('g')
    .attr('class', 'axis')
    .attr('transform', (d, i) => `translate(${xScale(i)},0)`)
    .each(function (d) {
      d3.select(this).call(d3.axisLeft(yScales[d]))
      const brushY = d3.brushY()
        .extent([[-25, 0], [25, height]])
        .on('brush', event => brushedY(event, d, parallelCoords, dimensions, yScales, selectedRanges))
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

  return svg
}

function brushedY (event, dim, data, dimensions, yScales, selections) {
  const [y0, y1] = event.selection // y0 is the top, y1 is the bottom
  if (Math.abs(y0 - y1) < 2) { return }
  selections[dim] = [yScales[dim].invert(y1), yScales[dim].invert(y0)]
  const selectedDataIndex = []
  data.forEach((row, i) => {
    if (dimensions.every((d, j) => {
      return row[j] >= selections[d][0] && row[j] <= selections[d][1]
    })) {
      selectedDataIndex.push(i)
    }
  })
  Update(selectedDataIndex)
}

function line (xScales, yScales, dimensions) {
  return d3.line()
    .x((d, i) => xScales(i))
    .y((d, i) => yScales[dimensions[i]](d))
}

export function highlightParallelPlot (selectedDataIndex = {}) {
  d3.selectAll('path.line').classed('line-highlighted', (_, i) => selectedDataIndex.includes(i))
}
