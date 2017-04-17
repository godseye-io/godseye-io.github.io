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
            map.save().then(id => {
                let url = _.trimEnd(window.location.href.replace(window.location.search, ''), '/') + '?gist=' + id

                let $el = bootbox.prompt({
                    title: 'Sharing Link',
                    value: url,
                    callback: () => {}
                })

                $el.find('.btn[data-bb-handler=cancel]').remove()

                let input = $el.find('input[type=text]').get(0)
                input.setSelectionRange(0, input.value.length)
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