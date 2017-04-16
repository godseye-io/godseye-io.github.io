let spritesmith = require('../../foo/node_modules/spritesmith')
let _  = require('lodash')
let fs = require('fs')

let dir = 'images/sprite-src'

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
                    return [pair[0].replace('images/sprite-src/', '').replace('.png', ''), pair[1]]
                })
                .fromPairs()
                .value()

            await writeFile('./images/sprite.json', JSON.stringify(data, null, 4), 'utf8')
            await writeFile('./images/sprite.png',  result.image)

            await writeFile('./images/sprite@2x.json', JSON.stringify(data, null, 4), 'utf8')
            await writeFile('./images/sprite@2x.png',  result.image)

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