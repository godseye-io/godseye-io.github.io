// var map = L.map('map').setView([51.505, -0.09], 13);

// L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
//     attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
// }).addTo(map);

// L.marker([51.5, -0.09]).addTo(map)
//     .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
//     .openPopup();


// var map = L.map('map', {
//     crs: L.CRS.Simple
// });

// var bounds = [[0,0], [1000,1000]];
// var image = L.imageOverlay('uqm_map_full.png', bounds).addTo(map);

window.queryParams = getQueryParams()

$.get('data/locations.json').then(locations => {
    $.get('data/world-map-4326-20.json').then(world => {
        window.locations = locations
        window.map = new Map({locations: locations, world: world, gist: queryParams.gist || null})

        $('[data-toggle=toggle]').bootstrapToggle()

        $('.share-map').on('click', () => {
            bootbox.dialog({
                title: 'Share Map',
                message: $('<div>').append(
                        $('<div>'     ).addClass('sharing-instructions')
                            .text('These are all optional - you can just skip to generating the link if you want.'),
                        $('<input>'   ).addClass('form-control sharing-title'      ).attr('placeholder', 'Title'      ),
                        $('<input>'   ).addClass('form-control sharing-author'     ).attr('placeholder', 'Author'     ),
                        $('<textarea>').addClass('form-control sharing-description').attr('placeholder', 'Description')
                    )
                    .wrap($('<div>')).parent().html(),
                buttons: {
                    cancel: {
                        label: 'Cancel'
                    },
                    // // Image generation off for now - issues with preserveDrawingBuffer not being set
                    // image: {
                    //     label: 'Generate Image',
                    //     className: 'btn-default',
                    //     callback: () => {
                    //         map.map._rerender()
                    //         // let ctx    = map.map.getCanvas().getContext("webgl", {preserveDrawingBuffer: true})
                    //         let canvas = map.map.getCanvas()

                    //         let imgData = canvas.toDataURL({
                    //             format: 'png',
                    //             left:   0,
                    //             top:    0,
                    //             width:  canvas.width,
                    //             height: canvas.height
                    //         }).replace(/.*,/, '')

                    //         $.ajax({
                    //             url: 'https://api.imgur.com/3/image',
                    //             method: 'POST',
                    //             headers: {
                    //                 Authorization: 'Client-ID 79642fcadc44981',
                    //                 Accept: 'application/json'
                    //             },
                    //             data: {
                    //                 image: imgData,
                    //                 type: 'base64'
                    //             },
                    //             success: function(result) {
                    //                 let id = result.data.id
                    //                 window.open('https://imgur.com/gallery/' + id, '_imgur')
                    //             }
                    //         })
                    //     }
                    // },
                    link: {
                        label: 'Generate Link',
                        className: 'btn-primary',
                        callback: e => {
                            let $modal = $(e.target).closest('.modal')

                            map.save({
                                title:       $modal.find('.sharing-title'      ).val(),
                                author:      $modal.find('.sharing-author'     ).val(),
                                description: $modal.find('.sharing-description').val(),
                                timestamp:   moment.now()
                            }).then(id => {
                                let url     = _.trimEnd(window.location.origin, '/') + '/'
                                let subpath = _.trim(window.location.pathname.replace('index.html', ''), '/')

                                if (subpath) {
                                    url += subpath + '/'
                                }
 
                                url += 'index.html?gist=' + id

                                let $el = bootbox.prompt({
                                    title: 'Sharing Link',
                                    value: url,
                                    callback: () => {}
                                })

                                $el.find('.btn[data-bb-handler=cancel]').remove()

                                let input = $el.find('input[type=text]').get(0)
                                input.setSelectionRange(0, input.value.length)
                            })
                        }
                    }
                },
                onEscape: true
            })
        })
    })
})

if (!window.location.host.includes('localhost')) {
    showInfo()
}

$('.info-button').on('click', showInfo)

function showInfo() {
    bootbox.dialog({
        message: $('<div>').append(
            $('#app-info-template').clone().html()
        ).html(),
        onEscape: true,
        buttons: {
            ok: {
                label: 'Neat',
                className: 'btn-success'
            }
        },
        callback: result => {
            console.log(result)
        }
    })
}

function getQueryParams() {
    let query = window.location.search
    if (!query) {return {}}

    return (/^[?#]/.test(query) ? query.slice(1) : query)
        .split('&')
        .reduce((params, param) => {
            let [key, value] = param.split('=')
            params[key] = value ? decodeURIComponent(value.replace(/\+/g, ' ')) : ''
            return params;
        }, {})
}