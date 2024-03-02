import * as d3 from 'd3'
import * as druid from '@saehrimnir/druidjs'

/**
 * Computes the 'isOver' property for each row in the given data array.
 * The 'isOver' property indicates whether the sum of 'HG' and 'AG' is greater than 2.5.
 *
 * @param {Array} data - The data array containing rows to compute 'isOver' property for.
 * @returns {Array} - The updated data array with 'isOver' property added to each row.
 */
export function computeOverColumn (data) {
  return data.map(row => {
    row.isOver = row.HG + row.AG > 2.5 ? 'Over' : 'Under'
    return row
  })
}

/**
 * Normalizes the given data using Z-score normalization.
 *
 * @param {Array<Array<number>>} data - The data to be normalized.
 * @returns {Array<Array<number>>} The normalized data.
 */
export function normalizeData (data) {
  // compute mean and standard deviation for each column
  const means = data[0].map((_, i) => d3.mean(data, row => row[i]))
  const stdDevs = data[0].map((_, i) => d3.deviation(data, row => row[i]))
  // Apply Z-score normalization
  return data.map(row => row.map((value, i) => (value - means[i]) / stdDevs[i]))
}

/**
 * Reduces the dimensionality of the given data using Multi-Dimensional Scaling (MDS).
 *
 * @param {Array<Array<number>>} data - The data to be reduced.
 * @returns {Array<Array<number>>} The reduced data.
 */
export function reduceData (data) {
  const normalizedData = normalizeData(data)
  const reducedData = new druid.MDS(druid.Matrix.from(normalizedData)).transform()
  return reducedData.to2dArray
}

/**
 * Downloads a CSV file with the given filename and content.
 *
 * @param {string} filename - The name of the CSV file.
 * @param {string} csvString - The content of the CSV file.
 */
export function csvDownload (filename, csvString) {
  // Create a Blob with the data in CSV format
  const { Blob } = require('buffer')
  const blob = new Blob([csvString], { type: 'text/csv' })
  // Create an URL for the Blob
  const url = window.URL.createObjectURL(blob)
  // Create a link element for the download
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  // Trigger the download
  a.click()
  // Revoke the URL to free memory
  window.URL.revokeObjectURL(url)
}
