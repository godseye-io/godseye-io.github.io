let _  = require('lodash')
let fs = require('fs')
let resolution = 1000

fs.readFile('data/world.json', 'utf8', (err, res) => {
    if (err) {throw err}

    let data = JSON.parse(res)

    _.each(data.features, f => {
        if (f.geometry.type == 'LineString') {
            // console.log(f.geometry.coordinates)
            f.geometry.coordinates = _.map(f.geometry.coordinates, snapPoint)
            // console.log(f.geometry.coordinates)
            // process.exit()
        }
        else if (f.geometry.type == 'Polygon') {
            _.each(f.geometry.coordinates, (ring, coordIndex) => {
                f.geometry.coordinates[coordIndex] = _.map(ring, snapPoint)
            })
        }
    })

    let minified = JSON.stringify(data)

    fs.writeFile('data/world.min.json', minified, 'utf8', (err, res) => {
        if (err) {throw err}

        console.log('Done!')
    })
})

function snapPoint(p) {
    return [
        Math.floor(p[0] * resolution) / resolution,
        Math.floor(p[1] * resolution) / resolution
    ]
}