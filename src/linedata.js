// Array di array di dati
const data = [
    [1, 0, 2, 3],
    [0, 1, 3, 2],
    [3, 2, 1, 0]
];

// Dimensioni del grafico e dei margini
const margin = { top: 20, right: 20, bottom: 30, left: 40 };
const width = 400 - margin.left - margin.right;
const height = 200 - margin.top - margin.bottom;

// Creazione della scala per l'asse x
const xScale = d3.scaleLinear()
    .domain([0, data[0].length - 1]) // Dominio: da 0 alla lunghezza di un sotto-array - 1
    .range([0, width]); // Intervallo: da 0 alla larghezza del grafico

// Creazione della scala per l'asse y
const yScale = d3.scaleLinear()
    .domain([0, d3.max(data.flat())]) // Dominio: da 0 al massimo valore nei dati
    .range([height, 0]); // Intervallo: dall'altezza del grafico a 0

// Creazione dell'asse x
const xAxis = d3.axisBottom(xScale);

// Creazione dell'asse y
const yAxis = d3.axisLeft(yScale);

// Creazione della linea
const line = d3.line()
    .x((d, i) => xScale(i)) // Coordinata x basata sull'indice dell'array
    .y(d => yScale(d)); // Coordinata y basata sui valori dell'array

// Creazione della SVG
const svg = d3.select("#root").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Disegno delle linee
data.forEach(lineData => {
    svg.append("path")
        .datum(lineData) // Utilizzo dei dati dell'array
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line); // Applicazione della funzione line per generare il percorso
});

// Creazione del gruppo per le linee
const linesGroup = svg.append("g")
    .attr("class", "lines"); // Aggiunta dell'attributo class al gruppo

// Disegno delle linee
data.forEach(d => {
    linesGroup.append("path") // Aggiunta delle linee al gruppo
        .datum(d) // Utilizzo dei dati dell'array
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line); // Applicazione della funzione line per generare il percorso
});

// Creazione del gruppo per gli assi
const axesGroup = svg.append("g")
    .attr("class", "axes"); // Aggiunta dell'attributo class al gruppo

axesGroup.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis);

// Aggiunta dell'asse y
axesGroup.append("g")
    .call(yAxis);

