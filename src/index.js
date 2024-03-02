import './index.scss'
import dataset from '../dataset/odds23.csv' // Import the dataset
import { drawParallelPlot, highlightParallelPlot } from './parallel-plot' // Import the drawParallelPlot function
import { drawScatterPlot, highlightScatterPlot } from './scatter-plot' // Import the drawScatterPlot function
import { drawComparativeChart } from './comparative-chart' // Import the drawComparativeChart function
import { reduceData, csvDownload } from './preprocessing'

const oddLabels = ['AvgH', 'AvgD', 'AvgA', 'AvgO', 'AvgU'] // Define the odds labels
const SVGs = {} // Object to store the SVGs of the visualizations
Init()

/**
 * Initializes the visualizations.
 *
 * @param {boolean} [preprocessed=true] - Indicates whether the data is preprocessed.
 * @param {boolean} [download=false] - Indicates whether to download the data as a CSV file.
 */
export function Init (preprocessed = true, download = false) {
  if (dataset.length === 0 || dataset === undefined) {
    console.log('No data to draw the visualizations')
    return
  }
  let data = dataset
  if (!preprocessed) {
    console.log('Preprocessing the data...')
    // Project the data into 2D space using MDS
    console.log(dataset)
    const projectedData = reduceData(dataset.map(d => oddLabels.map(dim => d[dim])))
    data = dataset.map((row, i) => {
      row.isOver = row.HG + row.AG > 2.5 ? 'Over' : 'Under'
      row.x = projectedData[i][0]
      row.y = projectedData[i][1]
      return row
    })
    console.log(data)
    if (download) {
      // Create the csv string
      let csvString = Object.keys(data[0]).join(',') + '\n'
      data.forEach((row, i) => {
        csvString += Object.values(row).join(',') + '\n'
      })
      csvDownload('odds23.csv', csvString)
    }
  }

  // Draw the Parallel Plot
  SVGs['#parallel-plot'] = drawParallelPlot(dataset, oddLabels)
  // Draw the Scatter Plot
  SVGs['#scatter-plot'] = drawScatterPlot(dataset)
  // Draw the Comparative Chart
  SVGs['#comparative-chart'] = drawComparativeChart(dataset, oddLabels)
}

/**
 * Updates the visualizations based on the selected data index and filtered data index.
 *
 * @param {number[]} selectedDataIndex - The array of selected data indices.
 * @param {number[]} filteredDataIndex - The array of filtered data indices.
 */
export function Update (selectedDataIndex = [], filteredDataIndex = []) {
  highlightParallelPlot(selectedDataIndex)
  highlightScatterPlot(selectedDataIndex)
  const selectedData = dataset.filter((_, index) => selectedDataIndex.includes(index))
  drawComparativeChart(selectedData, oddLabels)
}

export function Focus (selectedDataIndex = []) {
  const selectedData = dataset.filter((_, index) => selectedDataIndex.includes(index))
  drawParallelPlot(selectedData, oddLabels, selectedDataIndex)
}
