let _  = require('lodash')
let fs = require('fs')
let resolution = 100000

fs.readFile('data/sigils.json', 'utf8', (err, res) => {
    if (err) {throw err}

    let data     = JSON.parse(res)
    let minified = JSON.stringify(data)

    fs.writeFile('data/sigils.min.json', minified, 'utf8', (err, res) => {
        if (err) {throw err}
        console.log('Done!')
    })
})