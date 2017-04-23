let spritesmith = require('../../foo/node_modules/spritesmith')
let _  = require('lodash')
let fs = require('fs')

let dir = 'images/sprite-src/shield-thumbnails'

main()

async function main() {
    fs.readdir(dir, (err, results) => {
        if (err) {throw err}

        var sprites = _(results).chain()
            .filter(f => {
                return f.endsWith('.png')
            })
            .filter(f => {
                if (['water3.png', 'water2.png', 'water.jpg'].includes(f)) {
                    return false
                }

                return true
            })
            .map(f => {
                return dir + '/' + f
            })
            .value()

        spritesmith.run({src: sprites}, async function(err, result) {
            if (err) {throw err}

            let data = _(result.coordinates).chain()
                .each(c => {
                    c.pixelRatio = 1
                })
                .toPairs()
                .map(pair => {
                    return [pair[0].replace('images/sprite-src/shield-thumbnails/', '').replace('.png', ''), pair[1]]
                })
                .fromPairs()
                .value()

            await writeFile('./images/shield-sprite.json', JSON.stringify(data, null, 4), 'utf8')
            await writeFile('./images/shield-sprite.png',  result.image)

            console.log()
            console.log('Done!')
            console.log()
        })
    })
}

async function writeFile(filePath, data, encoding) {
    return new Promise((resolve, reject) => {
        if (encoding) {
            fs.writeFile(filePath, data, encoding, (err, res) => {
                if (err) {return reject(err)}
                console.log('wrote ' + filePath)
                resolve(res)
            })
        }
        else {
            fs.writeFile(filePath, data, (err, res) => {
                if (err) {return reject(err)}
                console.log('wrote ' + filePath)
                resolve(res)
            })
        }
    })
}