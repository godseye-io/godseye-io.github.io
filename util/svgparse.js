let fs      = require('fs')
let _       = require('lodash')
let xml2js  = require('/mnt/c/Users/awebb/git/foo/node_modules/xml2js')
let parser  = require('/mnt/c/Users/awebb/git/foo/node_modules/svg-path-parser')
let bezier  = require('/mnt/c/Users/awebb/git/foo/node_modules/@nathanfaucett/bezier')
let turf    = require('/mnt/c/Users/awebb/git/foo/node_modules/turf')
let ogr2ogr = require('/mnt/c/Users/awebb/git/foo/node_modules/ogr2ogr')

const bezier_res = 10
let scale = 400

fs.readFile('images/roads2.svg', 'utf8', (err, xml) => {
    if (err) {throw err}

    xml2js.parseString(xml, (err, result) => {
        if (err) {throw err}

        let [,, width, height] = result.svg['$'].viewBox.split(' ')

        scale = 6400000 / width
        console.log('scale: ', scale)

        let dx = width  * scale      / 2
        let dy = height * scale * -1 / 2

        let paths = []
console.log(result.svg)
        // _.each(result.svg.g, group => {
            // delete group.path
            // console.log(group)
            // process.exit()
            _.each(result.svg.path, p => {
                paths.push({
                    // fill: group['$'].fill,
                    data: parser(p['$'].d)
                })
            })
        // })

        let features = []

        _.each(paths, path => {
            let points = []
            let currentPos = []

            _.each(path.data, step => {
                if (step.relative) {
                    if (!currentPos.length) {
                        console.log('relative, no currentPos')
                        process.exit()
                    }

                    step.x  += currentPos[0]
                    step.y  += currentPos[1]
                    step.x1 += currentPos[0]
                    step.y1 += currentPos[1]
                    step.x2 += currentPos[0]
                    step.y2 += currentPos[1]
                }

                switch (step.command) {
                    case 'moveto':
                        if (points.length) {
                            closeFeature()
                        }

                        points.push([step.x, step.y])
                        currentPos = [step.x, step.y]
                        break

                    case 'lineto':
                        points.push([step.x, step.y])
                        currentPos = [step.x, step.y]
                        break

                    case 'curveto':
                        points = points.concat(getBezierPoints(
                            currentPos, 
                            [step.x1, step.y1], 
                            [step.x2, step.y2], 
                            [step.x,  step.y ]
                        ))

                        currentPos = [step.x, step.y]
                        break

                    case 'closepath':
                        points.push(points[0])
                        currentPos = points[0]
                        break

                    default:
                        console.log(step)
                        process.exit()
                        break
                }

                prevStep = step
            })

            closeFeature()

            function closeFeature() {
                points = _.map(points, p => {
                    return [
                        p[0] * scale      - dx,
                        p[1] * scale * -1 - dy
                    ]
                })

                features.push({
                    type: 'Feature',
                    properties: {
                        fill: path.fill,
                        land: path.fill == '#fdfdfe'
                    },
                    geometry: {
                        type: 'Linestring',
                        coordinates: points
                    }
                })

                console.log(features[features.length - 1])

                points = []
            }
        })

        let ogr = ogr2ogr({
            type: 'FeatureCollection',
            features: features
        }).project('EPSG:4326', 'EPSG:3857')

        ogr.exec(function(err, result) {
            if (err) {throw err}

            // First pass - identify area and sort by it
            features = _(result.features).chain()
                .each(f => {
                    f.properties.area = turf.area(f)
                })
                .orderBy(['properties.area'], ['desc'])
                .value()

            // Second pass - identify sister geometries
            for (var i = 0; i < features.length; i++) {
                features[i].properties.index = i

                for (var j = i + 1; j < features.length; j++) {
                    // Skip land-land or water-water comparisons
                    if (features[j].properties.land == features[i].properties.land) {continue}

                    let areaDiff = features[i].properties.area - features[j].properties.area

                    // Skip comparisons where A is more than 10% larger than B
                    if (areaDiff > (features[i].properties.area) * 0.1) {j = features.length; continue}

                    let diff = turf.difference(features[i], features[j])
                    
                    let diffArea = diff ? turf.area(diff) : 0

                    if (diffArea < features[i].properties.area * 0.01) {
                        features[i].properties.sister = j
                        features[j].properties.sister = i
                        j = features.length
                        continue
                    }
                }
            }

            for (var i = 0; i < features.length; i++) {
                console.log(i + ' / ' + features.length)

                // Skip features marked for deletion
                if (features[i].properties.deleteme) {continue}

                for (var j = i + 1; j < features.length; j++) {
                    console.log(j)
                    // if land intersects smaller water AND contains the water AND is more than 10% bigger than the water, cut the water from the land
                    // if water intersects smaller land AND contains the land AND is more than 10% bigger than the land, cut the land from the water
                    
                    // Skip land-land and water-water comparisons
                    if (features[j].properties.land == features[i].properties.land) {continue}

                    // Skip features without a sister feature
                    if (!features[j].properties.sister) {continue}

                    // Skip features marked for deletion
                    if (features[j].properties.deleteme) {continue}

                    // Skip if A is less than 10% bigger than B
                    if (features[i].properties.area < features[j].properties.area * 1.1) {continue} 

// console.log('intersect start')
                    let intersection = turf.intersect(features[i], features[j])
// console.log('intersect end')

                    // Skip if no intersection
                    if (!intersection) {continue}

                    // Skip if nominal intersection
                    if (intersection.geometry.type != 'Polygon' && intersection.geometry.type != 'MultiPolygon') {continue}

                    // Skip if B not contained entirely within A
// console.log('difference start')
                    let diff = turf.difference(features[j], features[i])
// console.log('difference end')
                    if (diff) {continue}

                    // Update geoemtry by cutting B from A and recalculating area of A
// console.log('difference 2 start')
                    features[i].geometry = turf.difference(features[i], features[j]).geometry
// console.log('difference 2 end')
                    features[i].properties.area = turf.area(features[i])

                    // Mark sister features for deletion
                    // features[features[i].properties.sister].properties.deleteme = true
                    features[features[j].properties.sister].properties.deleteme = true
                }
            }

            // Filter out features marked for deletion
            features = _.filter(features, f => {
                return !f.properties.deleteme
            })

            fs.writeFile('data/roads.json', JSON.stringify({type: 'FeatureCollection', features: features}, null, 4), (err, res) => {
                if (err) {throw err}

                console.log('Done')

                process.exit()
            })
        })

// 60 Land
// {"465":117496306.1883105}
// {"465":3161061106.4853177}
// 3278557412.6736307
// 3161061106.49


// if ()

// 59 water
// {"2":3280271586.9636793}
// {"2":3076923018409.298}
// 3280271586.9636793
// 3280271586.96


// 466 land
// 117496306.1883068
// 117496306.19

// 465 water
// {"60":117496306.1883105}
// {"60":3161061106.4853177}
// 117496306.18831037
// 117496306.19

// features[32].properties.area2 = turf.area(features[32])
// features[32].properties.debug = '32'
// features[72].properties.area2 = turf.area(features[72])
// features[72].properties.debug = '72'
// let intersect = turf.intersect(features[32], features[72])
// intersect.properties.area2 = turf.area(intersect)
// intersect.properties.debug = 'intersect'
// let difference = turf.difference(features[32], features[72])
// difference.properties.area2 = turf.area(difference)
// difference.properties.debug = 'difference'
//         features = [
//             features[32],
//             features[72],
//             intersect,
//             difference
//         ]

        // let featureCollection = {
        //     type: 'FeatureCollection',
        //     features: features
        // }


// intersect    8625677112678684   848488300.70
// 72          10259511723760932   853011463.90
// 32          14680566876440950   851689311.77
// difference   2586020868383119   
        // console.log(JSON.stringify(featureCollection, null, 4))

        // fs.writeFile('data/world-map-3857.json', JSON.stringify(featureCollection, null, 4), (err, res) => {
        //     if (err) {throw err}

        //     console.log('Done')
        //     process.exit()
        // })
    })
})


function getBezierPoints(start, p1, p2, end) {
    let points = []

    for (var i = 1; i < bezier_res; i++) {
        points.push(
            bezier.cubic([], start, p1, p2, end, i / bezier_res)
        )
    }

    points.push(end)

    return points
}




// let svgutils = require('svgutils')




// var Svg = require('svgutils').Svg
 
 
// Svg.fromSvgDocument('../base.svg', (err, svg) => {
//     if (err) {throw err}

//     console.log(svg)
// })