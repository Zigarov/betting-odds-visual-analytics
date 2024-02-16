// index.js

// Importa D3.js e la funzione per creare il Parallel Coordinates Chart
import './index.scss'
import { createParallelChart } from './parallel'

// Funzione per caricare i dati e inizializzare il grafico
function initializeParallelChart () {
  // Carica i dati dal file CSV
  // d3.csv(dataPath).then(data => {
  //   // Chiama la funzione per creare il Parallel Coordinates Chart con i dati caricati
  //   // createParallelChart(data)
  //   console.log(Object.keys(data))
  // }).catch(error => {
  //   console.error('Errore nel caricamento dei dati:', error)
  // })
  createParallelChart()
}

// Chiamata alla funzione per inizializzare il grafico
initializeParallelChart()
