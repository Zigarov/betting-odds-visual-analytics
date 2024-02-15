import * as d3 from 'd3'

// create the svg
const chartWidth = 900
const chartHeight = 450

d3.select('#root').select('*').remove()

const svg = d3.select('#root')
    .append('svg')
    .attr('id', 'chart_01')
    .attr('width', chartWidth)
    .attr('height', chartHeight)

// Dati di esempio
const dataset = [10, 20, 30, 40, 50];

// Aggiungi un rettangolo per ogni elemento nel dataset
svg.selectAll('rect')
    .data(dataset)
    .enter()
    .append('rect')
    .attr('x', (d, i) => i * 50) // Posizione sull'asse x
    .attr('y', (d) => 200 - d) // Posizione sull'asse y
    .attr('width', 40) // Larghezza del rettangolo
    .attr('height', (d) => d) // Altezza del rettangolo
    .attr('fill', 'steelblue'); // Colore di riempimento del rettangolo