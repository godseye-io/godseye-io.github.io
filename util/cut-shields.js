let _       = require('lodash')
let easyimg = require('../../foo2/node_modules/easyimage')
let fs      = require('fs')
let groups  = []

fs.readFile('images/shields/shield-list.json', 'utf8', (err, res) => {
    if (err) {throw err}
    groups = JSON.parse(res)
    main()
})

async function main() {
    _.each(groups, async function(group, groupIndex) {
        let src  = `images/shields/src/${_.padStart(groupIndex + 1, 2, '0')}.png`
        let info = await getInfo(src)

        _.each(group, async function(record) {
            let y = (record.index * 230) + 62

            if (y > info.height) {
                console.log('i', i)
                console.log('numImages', info.height / 230)
                console.log('length', group.length)
                console.log(group)
                console.log(record)
                process.exit()
            }

            console.log(`${_.padStart(record.group + 1, 2, '0')} - ${record.name}`)

            let dest   = `images/sprite-src/shield-thumbnails/${record.name}.png`
            let result = await crop(src, y, dest)
            await resize(dest, dest)
        })
    })
}

async function getInfo(src) {
    return easyimg.info(src).then(
        info => info,
        err => {
            throw err
        }
    )
}

async function crop(src, y, dest) {
    return new Promise((resolve, reject) => {
        easyimg.crop({
            src: src, dst: dest, y: y,
            cropwidth: 150, cropheight: 150, x: 25, quality: 100, gravity: 'NorthWest'
        }).then(
            file => {
                resolve(file)
            },
            err => {
                console.log('Error during crop')
                reject(err)
            }
        )

    })
}

async function resize(src, dest) {
    return new Promise((resolve, reject) => {
        easyimg.resize({
            src: src, dst: dest,
            width: 30, height: 30
        }).then(
            file => {
                resolve(file)
            },
            err => {
                console.log('Error during crop')
                reject(err)
            }
        )

    })
}