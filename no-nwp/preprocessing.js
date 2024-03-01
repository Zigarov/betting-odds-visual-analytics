// Path to the CSV file
const csvFilePath = '../dataset/odds23.csv'

// const dimensions = ['AvgH', 'AvgD', 'AvgA', 'AvgO', 'AvgU']
const dimensions = ['AvgH', 'AvgD', 'AvgA', 'AvgO', 'AvgU']
const oddsLabels = ['1', 'X', '2', 'Over', 'Under']

// Load the dataset
d3.csv(csvFilePath, d3.autotype).then(data => {
    // Project the data into 2D space using MDS
    const projectedData = reduceData(data.map(d => dimensions.map(dim => d[dim])))

    // data = data.map((d, i) => {
    //     d.Over = d.Over === 1 ? 'Over' : 'Under'
    //     d.FTR = d.FTR === 1 ? 'H' : d.FTR === 0 ? 'D' : 'A'
    //     d.x = reducedData[i][0]
    //     d.y = reducedData[i][1]
    //     return d
    // })

    // Creare l'intestazione del CSV dalle chiavi del primo oggetto (supponendo uniformità)
    let csvString = Object.keys(data[0]).join(',') + ',x,y\n';

    // Aggiungere ogni riga di dati
    data.forEach((row,i) => {
        // csvString += Object.values(row).join(',') + '\n';
        // const over = (Number(row.HG) + Number(row.AG)) > 2.5 ? 'Over' : 'Under'
        csvString += Object.values(row).join(',') + ',' +  projectedData[i][0] + ',' + projectedData[i][1] + '\n';
    });

    // download the csv file
    download('odds23.csv', csvString);


}).catch(error => {
    console.error("Errore nel caricamento del dataset:", error);
});


function reduceData(data) {
    const normalizedData = normalizeData(data)
    //let distanceMatrix = druid.distance_matrix(druid.Matrix.from(data))
    let reducedData = new druid.MDS(druid.Matrix.from(normalizedData)).transform()
    return reducedData.to2dArray
}

function normalizeData(data) {
    // Calcola la media e la deviazione standard per ogni colonna
    let means = data[0].map((_, i) => d3.mean(data, row => row[i]));
    let stdDevs = data[0].map((_, i) => d3.deviation(data, row => row[i]));

    // Applica la normalizzazione Z-score
    let normalizedData = data.map(row =>
        row.map((value, i) => (value - means[i]) / stdDevs[i])
    )
    return normalizedData
}

function download(filename, csvString) {
    // Crea un Blob con i dati in formato CSV
    let blob = new Blob([csvString], { type: 'text/csv' });

    // Crea un URL per il Blob
    let url = URL.createObjectURL(blob);

    // Crea un elemento link per il download
    let a = document.createElement('a');
    a.href = url;
    a.download = filename; // Nome del file da scaricare

    // Aggiungi il link al documento (non è necessario che sia visibile)
    document.body.appendChild(a);

    // Simula un click sull'elemento link per avviare il download
    a.click();

    // Rimuovi l'elemento link dopo l'avvio del download
    document.body.removeChild(a);

    // Rilascia l'URL del Blob per liberare risorse
    URL.revokeObjectURL(url);
}