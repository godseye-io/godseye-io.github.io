const _   = require('lodash')
const api = require('superagent')
const fs  = require('fs')

main()

async function main() {
    // await getInfo('Winterfell', true)
    // process.exit()

    let locations = await getLocations()
    let stats = {updated: 0, failed: 0, skipped: 0}

    let target_features = locations.features.slice(0, 500)

    let infoPromises = _.map(target_features, feature => {
        if (!feature.properties.wiki_name && !feature.properties.name) {throw 'No name for feature: ' + JSON.stringify(feature, null, 4)}

        if (feature.properties.wiki_html) {stats.skipped++; return Promise.resolve(null)}

        let target_name = feature.properties.name

        if (feature.properties.wiki_name) {
            target_name = feature.properties.wiki_name
        }
        else if (target_name.startsWith('The ')) {
            target_name = target_name.substr(4)
            feature.properties.wiki_name = target_name
        }

        return getInfo(target_name).then(result => {
            if (result) {
                Object.assign(feature.properties, result)
                stats.updated++
            }
            else {
                console.log('No results for: ' + (feature.properties.wiki_name || feature.properties.name))
                stats.failed++
            }

            return result
        })
    })

    let results = await Promise.all(infoPromises)

    await setLocations(locations)

    console.log()
    console.log(JSON.stringify(stats, null, 4))
    console.log()
    console.log('Ended on ' + target_features[target_features.length - 1].properties.name)
    console.log()
}

async function setLocations(locations) {
    return new Promise((resolve, reject) => {
        fs.writeFile('../data/locations.json', JSON.stringify(locations, null, 4), 'utf8', (err, res) => {
            if (err) {throw err}
            resolve()
        })
    })
}

async function getLocations() {
    return new Promise((resolve, reject) => {
        fs.readFile('../data/locations.json', 'utf8', (err, res) => {
            if (err) {throw err}

            resolve(JSON.parse(res))
        })
    })
}

async function getInfo(topic, debug) {
    return new Promise((resolve, reject) => {
        api.get('https://awoiaf.westeros.org/api.php').query({
            titles: topic,
            action: 'query',
            format: 'json',
            exintro: true,
            prop: ['extracts', 'pageimages'].join('|'),
            redirects: true,

            // Be nice and only request small thumbnails
            piprop: 'thumbnail',
            pithumbsize: 200
        })
        .end((err, res) => {
            // Handle explicit error
            if (err) {return reject(err)}

            // Handle unexpected return structure
            if (!res.body || !res.body.query || !res.body.query.pages) {return reject('Unexpected return from API')}

            if (debug) {
                console.log(JSON.stringify(res.body.query.pages, null, 4))
            }

            // Handle no results found
            if (res.body.query.pages[-1]) {return resolve(null)}

            // Handle result
            let info = _(res.body.query.pages).chain().map(page => {
                return {
                    wiki_name:  page.title,
                    wiki_html:  page.extract,
                    wiki_image: page.thumbnail && page.thumbnail.source
                }
            }).head().value()

            resolve(info)
        })
    })
}