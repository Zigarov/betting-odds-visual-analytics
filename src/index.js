// index.js
import './index.scss'
// import * as druid from '@saehrimnir/druidjs'
// import * as d3 from 'd3'
import dataset from '../dataset/odds23.csv' // Import the dataset
import { drawParallelPlot } from './parallel-plot'  // Import the drawParallelPlot function
import { drawScatterPlot } from './scatter-plot' // Import the drawScatterPlot function
import { drawComparativeChart } from './comparative-chart' // Import the drawComparativeChart function
import { reduceData, csvDownload } from './preprocessing'

const oddLabels = ['AvgH', 'AvgD', 'AvgA', 'AvgO', 'AvgU']     // Define the odds labels

function init(preprocessed=true, download=false){
  if (dataset.length === 0 || dataset === undefined) {
    console.log('No data to draw the visualizations')
    return
  }
  let data = dataset
  if (!preprocessed) {
    console.log('Preprocessing the data...')

    //dataset = computeOverColumn(data)
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
    if(download) {
      // Create the csv string
      let csvString = Object.keys(data[0]).join(',') + '\n'
      data.forEach((row, i) => {
        csvString += Object.values(row).join(',') + '\n'
      })
      csvDownload('odds23.csv', csvString)
    }
  }

  // Draw the Parallel Plot
  drawParallelPlot(dataset, oddLabels)
  // Draw the Scatter Plot
  drawScatterPlot(dataset)
  // Draw the Comparative Chart
  drawComparativeChart(dataset, oddLabels)
}

init()