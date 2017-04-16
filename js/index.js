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

$.get('data/locations.json').then(locations => {
    $.get('data/world-map-4326-20.json').then(world => {
        window.locations = locations
        window.map = new Map({locations: locations, world: world})

        $('[data-toggle=toggle]').bootstrapToggle()
    })
})

showInfo()

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