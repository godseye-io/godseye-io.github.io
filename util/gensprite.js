let spritesmith = require('../../foo/node_modules/spritesmith')
let _  = require('lodash')
let fs = require('fs')

let dir = 'images/sprite-src'

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

    spritesmith.run({src: sprites}, (err, result) => {
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

        fs.writeFile('./images/sprite.json', JSON.stringify(data, null, 4), 'utf8', err => {
           if (err) {throw err}
            console.log('wrote sprite.json')

            fs.writeFile('./images/sprite.png', result.image, err => {
                if (err) {throw err}
                console.log('wrote sprite.png')
                process.exit()
            })
        })
    })
})