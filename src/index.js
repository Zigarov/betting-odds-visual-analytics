// index.js
import './index.scss'
// import * as druid from '@saehrimnir/druidjs'
// import * as d3 from 'd3'
import dataset from '../dataset/odds23.csv' // Import the dataset
import { drawParallelPlot } from './parallel-plot'  // Import the drawParallelPlot function
import { drawScatterPlot } from './scatter-plot' // Import the drawScatterPlot function
import { drawComparativeChart } from './comparative-chart' // Import the drawComparativeChart function

const oddLabels = ['AvgH', 'AvgD', 'AvgA', 'AvgO', 'AvgU']     // Define the odds labels
const coordinates = ['x', 'y'] // Define the coordinates

// Disegna le visualizzazioni
drawParallelPlot(dataset, oddLabels)
// drawScatterPlot(dataset)
// drawComparativeChart(dataset)