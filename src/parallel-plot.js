import * as d3 from 'd3'
import { Init, Update, Focus } from './index.js'
// let parallelCoords = []
// const maxValues = {}
// const selectedRanges = {}
let filteredDataIndex = [] // Array to store the filtered data index
let selectedDataIndex = [] // Array to store the selected data index

/**
 * Draws a Parallel Coordinates Plot based on the provided data and dimensions.
 *
 * @param {Array} data - The data to be visualized.
 * @param {Array} dimensions - The dimensions to be used for plotting.
 * @param {Array} [filteredIndex=[]] - The indices of filtered data.
 * @param {string} [containerId='#parallel-plot'] - The ID of the container element for the plot.
 * @returns {object} - The SVG element containing the plot.
 */
export function drawParallelPlot (data, dimensions, filteredIndex = [], containerId = '#parallel-plot') {
  const visualization = d3.select(containerId)
  // Remove the prevoius SVG
  visualization.selectAll('svg').remove()

  if (data.length === 0 || data === undefined) {
    console.log('No data to draw Parallel Coordinates Plot')
    return
  }
  filteredDataIndex = filteredIndex
  // Transform the data in an Array of Arrays
  const parallelCoords = data.map(d => dimensions.map(dim => d[dim]))
  const selectedRanges = {}
  const brushSelections = {}

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
    // const maxVal = d3.max(data, d => +d[dim])
    selectedRanges[dim] = d3.extent(data, d => +d[dim])
    yScales[dim] = d3.scaleLinear().range([height, 0]).domain(selectedRanges[dim])
    brushSelections[dim] = [0, 0]
  })
  // Create vertical axes
  svg.selectAll('.axis')
    .data(dimensions)
    .enter().append('g')
    .attr('class', 'axis')
    .attr('transform', (d, i) => `translate(${xScale(i)},0)`)
    .each(function (d) {
      d3.select(this).call(d3.axisLeft(yScales[d])) // Draw the axis
      // Add the label
      d3.select(this).append('text')
        .attr('class', 'axis-label')
        .attr('y', height + margin.bottom / 2)
        .text(d)
      // Create the brush for each axis
      const brushY = d3.brushY()
        .extent([[-25, 0], [25, height]])
        .on('brush', event => brushedY(event.selection, d, parallelCoords, dimensions, yScales, brushSelections))
      d3.select(this).append('g')
        .attr('class', 'brush')
        .call(brushY)
      // Set the dblclick event for focus
      d3.select(this).on('dblclick', (event, d) => {
        const coords = d3.pointer(event)
        const y = yScales[d].invert(coords[1])
        console.log(y, brushSelections[d][0], brushSelections[d][1])
        if (brushSelections[d][0] <= y && brushSelections[d][1] >= y) {
          console.log('Focus on', d, y)
          Focus(selectedDataIndex)
        } else {
          // Reset the selection
          brushSelections[d] = [0, 0]
          // If no selection is available, reset the visualization
          if (Object.values(brushSelections).every(s => s[0] === 0 && s[1] === 0)) {
            console.log('No selections available')
            Init()
          } else {
            console.log('Reset the selection', d)
            brushedY([0, 0], d, parallelCoords, dimensions, yScales, brushSelections)
          }
        }
      })
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
/**
 * Handles the brushing event on the y-axis of a parallel plot.
 *
 * @param {Array} selection - The selected range on the y-axis.
 * @param {string} dim - The dimension being brushed.
 * @param {Array} data - The data used in the parallel plot.
 * @param {Array} dimensions - The dimensions of the parallel plot.
 * @param {Array} yScales - The y-axis scales for each dimension.
 * @param {Object} selections - The current selections for each dimension.
 */
function brushedY (selection, dim, data, dimensions, yScales, selections) {
  // Check if the selection is empty
  if (Math.abs(selection[0] - selection[1]) > 2) {
    selections[dim] = [yScales[dim].invert(selection[1]), yScales[dim].invert(selection[0])]
  }
  // Select the data based on the selection
  const selectedIndex = [] // Array to store the selected data index
  data.forEach((row, i) => {
    if (dimensions.every((d, j) => {
      // Check if every element is within the respective selection boundaries or if the selection is empty
      return (selections[d][0] === 0 && selections[d][1] === 0) || (row[j] >= selections[d][0] && row[j] <= selections[d][1])
    })) {
      // Add the index of the row to the selected index
      const idx = filteredDataIndex.length > 0 ? filteredDataIndex[i] : i
      // console.log('Selected', idx, i)
      selectedIndex.push(idx)
    }
  })
  // Update the selected data index
  selectedDataIndex = selectedIndex
  // Update the visualizations
  Update(selectedDataIndex)
}
/**
 * Creates a line generator function for a parallel plot.
 *
 * @param {Array} xScales - The array of x-axis scales.
 * @param {Array} yScales - The array of y-axis scales.
 * @param {Array} dimensions - The array of dimensions.
 * @returns {Function} - The line generator function.
 */
function line (xScales, yScales, dimensions) {
  return d3.line()
    .x((d, i) => xScales(i))
    .y((d, i) => yScales[dimensions[i]](d))
}

/**
 * Highlights the paths in a parallel plot based on the selected index.
 *
 * @param {number[]} [selectedIndex=[-1]] - The array of selected indices.
 */
export function highlightParallelPlot (selectedIndex = [-1]) {
  console.log(selectedIndex)
  console.log('filteredDataIndex', filteredDataIndex)
  console.log('length', filteredDataIndex.length)
  d3.selectAll('path.line').classed('line-highlighted', (_, i) => {
    const idx = filteredDataIndex.length > 0 ? filteredDataIndex[i] : i
    return selectedIndex.includes(idx)
  })
}
