import * as d3 from 'd3'
import * as druid from '@saehrimnir/druidjs'

export function computeOverColumn (data) {
  return data.map(row => {
    row.isOver = row.HG + row.AG > 2.5 ? 'Over' : 'Under'
    return row
  })
}

export function normalizeData (data) {
  // compute mean and standard deviation for each column
  const means = data[0].map((_, i) => d3.mean(data, row => row[i]))
  const stdDevs = data[0].map((_, i) => d3.deviation(data, row => row[i]))
  // Applica la normalizzazione Z-score
  return data.map(row => row.map((value, i) => (value - means[i]) / stdDevs[i]))
}

export function reduceData (data) {
  const normalizedData = normalizeData(data)
  const reducedData = new druid.MDS(druid.Matrix.from(normalizedData)).transform()
  return reducedData.to2dArray
}

export function csvDownload (filename, csvString) {
  // Create a Blob with the data in CSV format
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
