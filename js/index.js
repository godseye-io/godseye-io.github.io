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

precache()
initSigils()

window.api_version = '0.0.5'
$('#version').text(window.api_version)

window.queryParams = getQueryParams()

$('body').on('keydown', e => {
    if (e.which == 27 && window.$wikiPopup) {
        $('.popup, .popup-backdrop').remove()
        window.$wikiPopup = null
    }
})

Promise.all([
    $.get('data/locations.min.json'),
    $.get('data/world.min.json')
]).then(results => {
    window.locations = results[0]
    window.world     = results[1]
    window.map       = new Map({locations: locations, world: world, map_id: queryParams.map_id || null, query: queryParams.q || null})

    $('[data-toggle=toggle]').bootstrapToggle()

    $('.share-map').on('click', () => {
        let $dialog = bootbox.dialog({
            title: 'Share Map',
            message: $('<div>').append(
                    $('<div>'     ).addClass('sharing-instructions')
                        .text('These are all optional - you can just skip to generating the link if you want.'),
                    $('<input>'   ).addClass('form-control sharing-title'      ).attr('placeholder', 'Title'      ),
                    $('<input>'   ).addClass('form-control sharing-author'     ).attr('placeholder', 'Author'     ),
                    $('<textarea>').addClass('form-control sharing-description').attr('placeholder', 'Description'),
                    
                    $('<div>'     ).addClass('sharing-image-instructions')
                        .text("Alternatively, here's an Imgur link if you just want a static image:"),
                    $('<input>'   ).addClass('form-control sharing-image-link' ).attr('placeholder', 'Generating...')
                )
                .wrap($('<div>')).parent().html(),
            buttons: {
                cancel: {
                    label: 'Cancel'
                },
                link: {
                    label: 'Generate Link',
                    className: 'btn-primary',
                    callback: e => {
                        let $modal = $(e.target).closest('.modal')

                        map.save({
                            title:       $modal.find('.sharing-title'      ).val(),
                            author:      $modal.find('.sharing-author'     ).val(),
                            description: $modal.find('.sharing-description').val(),
                            imgur_id:    $dialog.data('imgur_id'),
                            timestamp:   moment.now()
                        }).then(id => {
                            let url     = _.trimEnd(window.location.origin, '/')
                            let subpath = _.trim(window.location.pathname.replace('index.html', ''), '/')

                            if (subpath) {
                                url += '/' + subpath
                            }

                            url += '?map_id=' + id

                            let $el = bootbox.prompt({
                                title: 'Sharing Link',
                                value: url,
                                callback: () => {}
                            })

                            $el.find('.btn[data-bb-handler=cancel]').remove()

                            let input = $el.find('input[type=text]').focus().get(0)
                            input.setSelectionRange(0, input.value.length)
                        })
                    }
                }
            },
            onEscape: true
        })

        generateMapImage().then(imageId => {
            $dialog
                .data('imgur_id', imageId)
                .find('.sharing-image-link')
                    .removeAttr('placeholder')
                    .val('http://i.imgur.com/' + imageId + '.png')
        })
    })
})

if (!window.location.host.includes('localhost') && _.isEmpty(window.queryParams)) {
    showInfo()
}

$('.info-button').on('click', showInfo)

function showInfo() {
    let $dialog = bootbox.dialog({
        message: $('<div>').append(
            $('#app-info-template').clone().html()
        ).html(),
        onEscape: true,
        buttons: {
            ok: {
                label: 'Neat!',
                className: 'btn-primary'
            }
        },
        callback: result => {
            console.log(result)
        }
    })

    $dialog.find('.modal-body').css({
        'max-height': 500,
        'overflow-y': 'scroll'
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

function generateMapImage() {
    return new Promise((resolve, reject) => {
        // Force a rerender
        map.map._rerender()

        let canvas = map.map.getCanvas()
        let ctx    = canvas.getContext('webgl')

        let imgData = canvas.toDataURL({
            format: 'png',
            left:   0,
            top:    0,
            width:  canvas.width,
            height: canvas.height
        }).replace(/.*,/, '')

        $.ajax({
            url: 'https://api.imgur.com/3/image',
            method: 'POST',
            headers: {
                Authorization: 'Client-ID 79642fcadc44981',
                Accept: 'application/json'
            },
            data: {
                image: imgData,
                type: 'base64'
            },
            success: function(result) {
                if (result && result.data && result.data.link) {
                    resolve(result.data.id)
                }
                else {
                    reject(result)
                }
            }
        })
    })
}

function precache() {
    ;(new Image()).src = 'images/scroll.png'
    ;(new Image()).src = 'images/scroll-overlay.png'
    ;(new Image()).src = 'images/scroll-banner.png'
}

function initSigils() {
    $.get('data/sigils.json').then(sigils => {
        $.get('images/shield-sprite.json').then(spriteInfo => {
            let $options = $('#sigil-options')

            window.sigils = sigils

            // TODO: group by region, house vs personal, etc
            // let groups = _(sigils).chain().sortBy('name').groupBy('group').value()

            _(sigils).chain().sortBy('name', 'asc').each(sigil => {
                if (!spriteInfo[sigil.name]) {return}

                $('<div>').addClass('sigil-option').attr('value', sigil.name).append(
                    $('<div>').addClass('sigil-option-name').text(sigil.name),
                    $('<div>').addClass('sigil-option-img').css({
                        'background-position-x': -spriteInfo[sigil.name].x,
                        'background-position-y': -spriteInfo[sigil.name].y
                    })
                ).appendTo($options)
            }).value()

            $('#sigil-search').on('keyup', e => {
                let search = $('#sigil-search').val()

                if (search) {
                    $options.find('.sigil-option').addClass('sigil-hidden')

                    _.each(sigils, sigil => {
                        if (sigil.name.toLowerCase().includes(search.toLowerCase())) {
                            $options.find(`.sigil-option[value="${sigil.name}"]`).removeClass('sigil-hidden')
                        }
                    })
                }
                else {
                    $options.find('.sigil-option').removeClass('sigil-hidden')
                }
            })

            // Make sigils draggable
            $('.sigil-option-img').draggable({
                containment: $('body'),
                helper: 'clone',
                scroll: false
            })
        })
    })
}