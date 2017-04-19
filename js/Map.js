class Map {
    constructor(config) {
        mapboxgl.accessToken = 'no-token'
        this.config = config

        this.lastObjectId = -1

        let layers = this.buildLayers()
        this.originalLayers = _.cloneDeep(layers)

        this.map = new mapboxgl.Map({
            container: 'map',
            // minZoom: 2,
            // zoom: 3,
            style: {
                version: 8,
                glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf?key=lTLRtimQtgugsPltAQTT",
                sprite:
                    _.trimEnd(window.location.origin, '/') + '/' + 
                    _.trimEnd(window.location.pathname.replace('index.html', ''), '/') + '/' +
                    'images/sprite',
                zoom: 4,
                minZoom: 4,
                maxZoom: 10,
                sources: {
                    "base":      {"type": "image", "url": "images/cities-overlay.png",      "coordinates": [[-28.74608909182468, 23.21466942878296], [28.74608909182468, 23.21466942878296], [28.74608909182468, -23.21466942878296], [-28.74608909182468, -23.21466942878296]]},
                    "reference": {"type": "image", "url": "images/reference-locations.png", "coordinates": [[-28.74608909182468, 23.21466942878296], [28.74608909182468, 23.21466942878296], [28.74608909182468, -23.21466942878296], [-28.74608909182468, -23.21466942878296]]},
                    "world":     {"type": "geojson", "data": config.world    },
                    "location":  {"type": "geojson", "data": config.locations},
                    "line": {
                        "type": "geojson",
                        "data": {
                            "type": "FeatureCollection",
                            "features": []
                        }
                    }
                },
                layers: layers
            }
        })

        this.title = ''

        this.addControls()
        this.addLayerSwitcher()

        this.map.on('load', e => {
            this.registerEvents()

            if (this.config && this.config.gist) {
                this.load(this.config.gist)
            }
        })

        return this
    }

    addControls() {
        this.map.addControl(new mapboxgl.NavigationControl(), 'top-left')
    }

    addLayerSwitcher() {
        let options = [
            {title: 'Roads',     layer: 'road',     selected: true, icon: false},
            {title: 'Forests',   layer: 'forest',   selected: true, icon: false},
            {title: 'Swamps',    layer: 'swamp',    selected: true, icon: false},
            {title: 'Mountains', layer: 'mountain', selected: true, icon: false},
            {title: 'Regions', selected: true, icon: false, expanded: true, children: [
                {title: 'Continents', layer: 'continent',  selected: true, icon: false},
                {title: 'Major',      layer: 'region_1',   selected: true, icon: false},
                {title: 'Minor',      layer: 'region_2',   selected: true, icon: false},
                {title: 'Local',      layer: 'region_3',   selected: true, icon: false}
            ]},
            {title: 'Seas', selected: true, icon: false, expanded: true, children: [
                {title: 'Major',      layer: 'sea_1',      selected: true, icon: false},
                {title: 'Minor',      layer: 'sea_2',      selected: true, icon: false}
            ]},
            {title: 'Castles', selected: true, icon: false, expanded: true, children: [
                {title: 'Major',      layer: 'fort_1',     selected: true, icon: false},
                {title: 'Minor',      layer: 'fort_2',     selected: true, icon: false},
                {title: 'Holdfasts',  layer: 'fort_3',     selected: true, icon: false}
            ]},
            {title: 'Cities', selected: true, icon: false, expanded: true, children: [
                {title: 'Major',      layer: 'large_city', selected: true, icon: false},
                {title: 'Minor',      layer: 'small_city', selected: true, icon: false},
                {title: 'Villages',   layer: 'town',       selected: true, icon: false}
            ]},
            {title: 'Ruins',    layers: ['town_ruin', 'fort_ruin'], selected: true, icon: false},
            {title: 'The Wall', layer: 'wall-extrusion',            selected: true, icon: false}
        ]

        let $panel = $('#layer-switcher .panel-body').empty()
        let $tree  = $('<div>').addClass('layer-tree').appendTo($panel)
        let layers = []

        $tree.fancytree({
            checkbox: true,
            selectMode: 3,
            source: options,
            click: (e, data) => {
                data.node.toggleSelected()
            },
            select: $.proxy(function(event, data) {
                let layersOn  = _($tree.data().uiFancytree.tree.getSelectedNodes()).map(n => n.data.layer || n.data.layers).chain().compact().flatten().value()
                let layersOff = _.difference(layers, layersOn)

                for (var i = 0; i < layersOn.length; i++) {
                    this.setLayerVisibility(layersOn[i], true)
                }

                for (var j = 0; j < layersOff.length; j++) {
                    this.setLayerVisibility(layersOff[j], false)
                }

                this.map._rerender()
            }, this),
            beforeExpand: () => false
        })

        layers = _($tree.data().uiFancytree.tree.getSelectedNodes()).map(n => n.data.layer || n.data.layers).chain().compact().flatten().value()
    }

    registerEvents() {
        this.map.on('mousemove', e => {
            document.getElementById('info').innerHTML =
                // e.point is the x, y coordinates of the mousemove event relative
                // to the top-left corner of the map
                JSON.stringify(e.point) + '<br />' +
                    // e.lngLat is the longitude, latitude geographical position of the event
                JSON.stringify(e.lngLat);
        })

        this.map.on('zoom', e => {
            this.buildMetafeatures()
            let zoomFactor = Math.pow(2, this.map.getZoom())

            // map.getLayer('city_1').layout['icon-size'] = zoomFactor * 0.02
            this.map._rerender()
        })

        window.newLocations = []

        this.map.on('click', e => {
            // console.log(e.lngLat)
            // let name = prompt()
            // if (!name) {return}

            // let split = name.split(' ')
            // let typeCode = _.head(split)
            // name = _.tail(split).join(' ')

            // let types = {
            //     'co': "continent",
            //     'r1': "region_1",
            //     'r2': "region_2",
            //     'c1': "large_city",
            //     'c2': "small_city",
            //     'c3': "town",
            //     'f': "fort",
            //     's1': "sea_1",
            //     's2': "sea_2"
            // }

            // let ruin = false

            // if (typeCode[0] == 'x') {
            //     ruin = true
            //     typeCode = typeCode.substr(1)
            // }

            // let location = {
            //     "type": "Feature",
            //     "geometry": {"type": "Point", "coordinates": [e.lngLat.lng, e.lngLat.lat]},
            //     "properties": {"name": name, "type": types[typeCode], "ruin": ruin}
            // }

            // newLocations.push(location)

            // console.log(location)

            // var features = this.map.queryRenderedFeatures(e.point, {layers: ['raw-line']})

            // if (features.length) {
            //     let id = features[0].properties.id
            //     let source = this.map.getSource('line')
            //     let feature = _.find(source._data.features, f => {return f.properties.id == id})
            //     feature.properties.color = '#0000ff'
            //     source.setData(source._data)
            //     this.buildMetafeatures()
            // }
        })

        this.map.on('mousemove', e => {
            var features = this.map.queryRenderedFeatures(e.point, {layers: ['raw-line']})
            this.map.getCanvas().style.cursor = features.length ? 'pointer' : ''
        })

        // this.addLine('Winterfell', 'The Wall')

        // Create a popup, but don't add it to the map yet.
        var popup = new mapboxgl.Popup({closeButton: false, closeOnClick: false})
    
    
        this.map.on('click', e => {
            console.log({
                lngLat: e.lngLat,
                point: e.point
            })
            var features = this.map.queryRenderedFeatures(e.point)

            if (features.length && features[0].properties.wiki_html) {
                let imgHtml = features[0].properties.wiki_image && `<img class="wiki-image" src="${features[0].properties.wiki_image}" />`

                let html = features[0].properties.wiki_html

                // Strip out any detail list (<dl>) elements - they're used for disambiguation info at top of wiki articles
                let withoutDl = _($(html)).chain().filter(el => el.tagName != 'DL').value()
                html = $('<div>').append(withoutDl).html()

                html = `
                    ${imgHtml || ''}
                    <div class="wiki-desc">
                        ${html}
                    </div>`

                map.showPopup(html)
            }
        })

        this.map.on('mousemove', e => {
            var features = this.map.queryRenderedFeatures(e.point)

            if (features.length && features[0].properties.wiki_html) {
                this.map.getCanvas().style.cursor = features.length ? 'pointer' : ''
            }
            else {
                this.map.getCanvas().style.cursor = ''
            }
        })
    }

    showPopup(html) {
        // Calculate target size of popup
        const normalSize = 543
        let size = Math.min(normalSize, window.innerWidth - 60, window.innerHeight - 60)

        // Adjust content padding
        let paddingY = ((85/normalSize) * size) + 'px'
        let paddingX = ((25/normalSize) * size) + 'px'

        let $popupBackdrop = $('<div>').addClass('popup-backdrop').appendTo($('body'))

        let $popup = $('<div>')
            .addClass('popup')
            .appendTo($('body'))
            // Set the offsets manually to center it on the screen
            .css({
                top: (window.innerHeight - size) / 2,
                left: (window.innerWidth - size) / 2,
                padding: `${paddingY} ${paddingX}`
            })
            .append(
                $('<div>')
                    .addClass('popup-content-wrapper')
                    .css({
                        height: (469/normalSize) * size,
                        width:  size
                    })
                    .html(html),
                $('<div>').addClass('popup-overlay')
            )

        // Shrink down image, if applicable
        $popup.find('.wiki-image').css({maxWidth: (150/normalSize) * size, maxHeight: (150/normalSize) * size})

        $popupBackdrop.on('click', function(e) {
            $popup.remove()
            $popupBackdrop.remove()
            let lngLat = map.map.unproject([e.pageX, e.pageY])
            console.log({
                lngLat: lngLat,
                point: map.map.project(lngLat)
            })
            map.map.fire('click', {
                lngLat: lngLat,
                point: map.map.project(lngLat)
            })
        })

        return $popup
    }

    buildLayers() {
        let layers = [
            {id: 'bg',       type: 'background',            paint: {'background-color': '#eee', 'background-pattern': 'background'}},
            {id: 'water',    type: 'fill', source: 'world', paint: {'fill-color': '#ACC7F2', 'fill-pattern': 'water4'}, filter: ['==', 'type', 'water'   ]},
            {id: 'land',     type: 'fill', source: 'world', paint: {'fill-color': '#eeeeee', 'fill-pattern': 'grass' }, filter: ['==', 'type', 'land'    ]},
            {id: 'forest',   type: 'fill', source: 'world', paint: {'fill-color': '#a4c9a4', 'fill-pattern': 'forest'}, filter: ['==', 'type', 'forest'  ]},
            {id: 'mountain', type: 'fill', source: 'world', paint: {'fill-color': '#c3c3c3', 'fill-pattern': 'mountains'}, filter: ['==', 'type', 'mountain']},
            {id: 'swamp',    type: 'fill', source: 'world', paint: {'fill-color': '#d7e2b3', 'fill-pattern': 'swamp'}, filter: ['==', 'type', 'swamp'   ]},
            {id: 'road',     type: 'line', source: 'world',                                   filter: ['==', 'type', 'road'    ],
                layout: {'line-cap': 'round', 'line-join': 'round'},
                paint:  {'line-opacity': 0.9, 'line-color': '#151515', 'line-width': 6}},
            {
                id: 'wall-extrusion',
                type: 'fill-extrusion',
                source: 'location',
                "paint": {
                    'fill-extrusion-color': '#99DBDA',
                    'fill-extrusion-opacity': 0.9,
                    'fill-extrusion-height': 50000
                }
            },
            // {
            //     id: 'capital',
            //     type: 'circle',
            //     source: 'location',
            //     filter: ['==', 'is_capital', true],
            //     paint: {
            //         'circle-radius': 30,
            //         'circle-color': '#000',
            //         'circle-opacity': 0.15,
            //         // 'circle-translate': [0, -10],
            //         'circle-stroke-width': 2,
            //         'circle-stroke-color': '#999'
            //     }
            // }
        ]

        let locationLayerBase = {
            "type": "symbol",
            "source": "location",
            "layout": {
                "text-field": "{name}",
                "text-font": ["Open Sans Light"],
                "text-anchor": "center",
                "text-size": 16,
                // 'icon-allow-overlap': true,
                // 'text-allow-overlap': true,
                // 'icon-ignore-placement': true,
                // 'text-ignore-placement': true,
                // 'icon-optional': true,
                // 'text-optional': true,
                'icon-padding': 0.5,
                'text-padding': 0.5,
            },
            "paint": {
                "text-halo-color": "#202",
                // "text-opacity": 1,
                "text-color": '#fff',
                // "text-halo-color": {
                //     property: 'is_capital',
                //     type: 'categorical',
                //     default: '#fff',
                //     stops: [
                //         [true, '#00B7EB']
                //     ]
                // },
                "text-halo-width": 1,
                // "text-halo-width": {
                //     property: 'is_capital',
                //     type: 'categorical',
                //     default: 2,
                //     stops: [
                //         [true, 0.5]
                //     ]
                // },
                'icon-translate-anchor': 'viewport'
            }
        }

        let locationLayerConfigs = {
            town_ruin:  {size: 12, font: 'Light', icon: 'village', iconScale: 0.2,
                filter: ['all', ['==', 'type', 'town'], ['==', 'ruin', true]],
                layout: {textOffset: [0, -2], textAnchor: 'bottom'},
                paint:  {iconTranslate: [0, 0], 'text-opacity': 0.35, 'icon-opacity': 0.3}},
            fort_ruin:  {size: 16, font: 'Regular', icon: 'tower-color-bw', iconScale: 0.3,
                filter: ['all', ['==', 'type', 'fort_2'], ['==', 'ruin', true]],
                layout: {textOffset: [0, -2], textAnchor: 'bottom'},
                paint:  {iconTranslate: [0, 0], 'text-opacity': 0.35, 'icon-opacity': 0.3}},
            region_3:   {size: 12, font: 'Light Italic',    transform: 'uppercase'},
            town:       {size: 14, font: 'Light', icon: 'village', iconScale: 0.2,
                filter: ['all', ['==', 'type', 'town'], ['==', 'ruin', false]],
                layout: {textOffset: [0, -2], textAnchor: 'bottom'},
                paint:  {iconTranslate: [0, 0]}},
            fort_3:     {size: 16, font: 'Regular', icon: 'tower-color-bw', iconScale: 0.2,
                filter: ['all', ['==', 'type', 'fort_3'], ['==', 'ruin', false]],
                layout: {textOffset: [0, -2], textAnchor: 'bottom'},
                paint:  {iconTranslate: [0, 0]}},
            region_2:   {size: 16, font: 'Light Italic',    transform: 'uppercase'},
            fort_2:     {size: 16, font: 'Regular', icon: 'tower-color-bw', iconScale: 0.3,
                filter: ['all', ['==', 'type', 'fort_2'], ['==', 'ruin', false]],
                layout: {textOffset: [0, -2], textAnchor: 'bottom'},
                paint:  {iconTranslate: [0, 0], "text-color": '#ccc'}},
            small_city: {size: 16, font: 'Semibold', icon: 'city-color-bw', iconScale: 0.3,
                layout: {textOffset: [0, -2], textAnchor: 'bottom'},
                paint:  {iconTranslate: [0, 0], "text-color": '#aaa'}},
            fort_1:     {size: 16, font: 'Regular', icon: 'tower-color-bw', iconScale: 0.45,
                filter: ['all', ['==', 'type', 'fort_1'], ['==', 'ruin', false]],
                layout: {textOffset: [0, -2], textAnchor: 'bottom'},
                paint:  {iconTranslate: [0, 0]}},
            large_city: {size: 18, font: 'Bold', transform: 'uppercase', icon: 'city-color-bw', iconScale: 0.37,
                layout: {textOffset: [0, -2], textAnchor: 'bottom'},
                paint:  {iconTranslate: [0, 0], "text-color": '#aaa'}},
            region_1:   {size: 22, font: 'Light Italic',    transform: 'uppercase',
                layout: {'icon-allow-overlap': true, 'text-allow-overlap': true}},
            sea_2:      {size: 22, font: 'Italic', paint: {"text-color": '#bbb'}},
            sea_1:      {size: 24, font: 'Semibold Italic', transform: 'uppercase', paint: {"text-color": '#bbb'}},
            continent:  {size: 26, font: 'Extra Bold',      transform: 'uppercase', paint: {"text-color": '#bbb'}}
        }

        _.each(locationLayerConfigs, (locationLayerConfig, id) => {
            let layer = _.cloneDeep(locationLayerBase)

            layer.id = id
            layer.filter = locationLayerConfig.filter || ['==', 'type', id]

            if (locationLayerConfig.size !== undefined) {
                layer.layout['text-size'] = locationLayerConfig.size
                delete locationLayerConfig.size
            }

            if (locationLayerConfig.font !== undefined) {
                layer.layout['text-font'] = ['Open Sans ' + locationLayerConfig.font]
                delete locationLayerConfig.font
            }

            if (locationLayerConfig.transform !== undefined) {
                layer.layout['text-transform'] = locationLayerConfig.transform
                delete locationLayerConfig.transform
            }

            if (locationLayerConfig.icon !== undefined) {
                layer.layout['icon-image'] = locationLayerConfig.icon
                delete locationLayerConfig.icon
            }

            if (locationLayerConfig.iconScale !== undefined) {
                layer.layout['icon-size'] = locationLayerConfig.iconScale
                delete locationLayerConfig.iconScale
            }

            if (locationLayerConfig.opacity !== undefined) {
                layer.paint['text-opacity'] = locationLayerConfig.opacity
                delete locationLayerConfig.opacity
            }

            if (locationLayerConfig.paint !== undefined) {
                _.assign(layer.paint, _(locationLayerConfig.paint).chain().toPairs().map(p => {
                    return [_.kebabCase(p[0]), p[1]]
                }).fromPairs().value())
                delete locationLayerConfig.paint
            }

            if (locationLayerConfig.layout !== undefined) {
                _.assign(layer.layout, _(locationLayerConfig.layout).chain().toPairs().map(p => {
                    return [_.kebabCase(p[0]), p[1]]
                }).fromPairs().value())
                delete locationLayerConfig.layout
            }

            layers.push(layer)
        })

        let others = [
            {
                'id': 'raw-line',
                'type': 'line',
                source: "line",
                filter: ['==', 'type', 'raw-line'],
                'paint': {
                    'line-width': 6,
                    'line-color': '#ff0000',
                    'line-opacity': 0
                }
            },
            {
                'id': 'line-start',
                'type': 'line',
                source: "line",
                filter: ['==', 'type', 'start'],
                'paint': {
                    'line-width': 6,
                    'line-color': '#ff0000',
                    'line-opacity': 0
                }
            },
            {
                'id': 'line-middle',
                'type': 'line',
                source: "line",
                filter: ['==', 'type', 'middle'],
                'paint': {
                    'line-width': 6,
                    'line-color': {
                        property: 'color',
                        type: 'identity'
                    },
                    'line-opacity': 0.5
                }
            },
            {
                'id': 'line-end',
                'type': 'line',
                source: "line",
                filter: ['==', 'type', 'end'],
                'paint': {
                    'line-width': 6,
                    'line-color': '#ff0000',
                    'line-opacity': 0
                }
            },
            {
                'id': 'line-arrow-start',
                'type': 'fill',
                source: "line",
                filter: ['==', 'type', 'arrow-start'],
                'paint': {
                    // 'line-width': 6,
                    'fill-color': '#ff0000',
                    'fill-outline-color': 'transparent',
                    'fill-opacity': 0.5
                }
            },
            {
                'id': 'line-arrow-end',
                'type': 'fill',
                source: "line",
                filter: ['==', 'type', 'arrow-end'],
                'paint': {
                    // 'line-width': 6,
                    'fill-color': '#ff0000',
                    'fill-outline-color': 'transparent',
                    'fill-opacity': 0.5
                }
            },
            {
                'id': 'line-arrow-start-outline',
                'type': 'line',
                source: "line",
                filter: ['==', 'type', 'arrow-start-outline'],
                layout: {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                'paint': {
                    'line-width': 2,
                    'line-color': '#ff0000',
                    'line-opacity': 0.25
                }
            },
            {
                'id': 'line-arrow-end-outline',
                'type': 'line',
                source: "line",
                filter: ['==', 'type', 'arrow-end-outline'],
                layout: {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                'paint': {
                    'line-width': 2,
                    'line-color': '#ff0000',
                    'line-opacity': 0.25
                }
            }
        ]

        layers = layers.concat(others)

        return layers
    }

    buildMetafeatures() {
        let source = this.map.getSource('line')

        let features = _.filter(source._data.features, f => {
            return f.properties.type == 'raw-line'
        })

        let numLines = features.length

        for (var i = 0; i < numLines; i++) {
            let metafeatures = this.getLineMetafeatures(features[i])
            features = features.concat(metafeatures)
        }

        source.setData({
            type: 'FeatureCollection',
            features
        })
    }

    createLineFeature(start, end) {
        return {
            "type": "Feature",
            "geometry": {type: "LineString", coordinates: [start, end]},
            "properties": {
                type: "raw-line",
                weight: 12,
                color: '#ff0000',
                id: this.getObjectId()
            }
        }
    }

    getLineMetafeatures(rawLine) {
        let metafeatures = []

        // Calculate arrowhead length (based on zoom level)
        let arrowheadLength = 1500 * 1 / Math.pow(2, this.map.getZoom())

        // Measure length of line and calculate where section splits should be
        let length   = turf.lineDistance(rawLine)
        let start    = turf.point(_.head(rawLine.geometry.coordinates))
        let end      = turf.point(_.last(rawLine.geometry.coordinates))

        // Calculate metaline sections (start, middle, end)
        let metalines = {
            start:  turf.lineSliceAlong(rawLine, 0, arrowheadLength),
            middle: turf.lineSliceAlong(rawLine, arrowheadLength, length - arrowheadLength),
            end:    turf.lineSliceAlong(rawLine, length - arrowheadLength, length)
        }

        let startMid = turf.point(_.head(metalines.middle.geometry.coordinates))
        let midEnd   = turf.point(_.last(metalines.middle.geometry.coordinates))

        // Clone raw properties, specify section, and add as metafeatures
        _.each(metalines, (metaline, section) => {
            metaline.properties = _.clone(rawLine.properties)
            metaline.properties.type = section
            metaline.properties.parentId = metaline.properties.id
            metaline.properties.id = this.getObjectId()
            metafeatures.push(metaline)
        })

        addArrowheadFeatures(startMid, start, 'start')
        addArrowheadFeatures(midEnd,   end,   'end'  )

        return metafeatures

        function addArrowheadFeatures(arrowStart, arrowEnd, section) {
            let arrowheadPointArray = getArrowheadPointArray(arrowStart, arrowheadLength, turf.bearing(arrowStart, arrowEnd))

            metafeatures.push({
                type: "Feature",
                properties: _.assign(_.cloneDeep(rawLine.properties), {type: 'arrow-' + section}),
                geometry: {type: "Polygon", coordinates: [arrowheadPointArray]}
            })

            metafeatures.push({
                type: "Feature",
                properties: _.assign(_.cloneDeep(rawLine.properties), {type: 'arrow-' + section + '-outline'}),
                geometry: {type: "LineString", coordinates: arrowheadPointArray}
            })

            function getArrowheadPointArray(base, distance, bearing) {
                return [
                    base.geometry.coordinates,
                    turf.destination(base, distance / 1.618, bearing + 105).geometry.coordinates,
                    turf.destination(base, distance,         bearing      ).geometry.coordinates,
                    turf.destination(base, distance / 1.618, bearing - 105).geometry.coordinates,
                    base.geometry.coordinates,
                    // turf.destination(base, distance,     bearing     ).geometry.coordinates
                ]
            }
        }
    }

    getLocationByName(name) {
        let result = _.find(this.map.getSource('location')._data.features, f => {
            return f.properties.name == name
        })

        return result
    }

    addLine(start, end, arrows) {
        if (typeof start == 'string') {
            start = this.getLocationByName(start).geometry.coordinates
        }

        if (typeof end == 'string') {
            end = this.getLocationByName(end).geometry.coordinates
        }

        let line = this.createLineFeature(
            start,
            end
        )

        this.map.getSource('line')._data.features.push(line)
        
        this.map.getSource('line').setData(this.map.getSource('line')._data)
    }
 
    getObjectId() {
        this.lastObjectId++
        return window.lastObjectId
    }

    getLayerVisibility(id) {
        let filter = map.map.getLayer(id).filter

        if (filter && filter.length == 3 && filter[2] == 'true-hidden-layer-hack') {
            return false
        }

        return true
    }

    setLayerVisibility(id, visible) {
        if (visible) {
            let originalFilter = _.find(this.originalLayers, {id: id}).filter
            this.map.setFilter(id, originalFilter)
        }
        else {
            // Setting it to invisible doesn't show other layers' items that are hidden due to collision - need to set filter
            this.map.setFilter(id, ['==', 'type', 'true-hidden-layer-hack'])
        }
    }

    getVisibleLayers() {
        let layers = _(map.map.getStyle().layers).chain()
            .map('id')
            .filter(this.getLayerVisibility)
            .value()

        return layers
    }

    setVisibleLayers(layers) {
        _.each(this.originalLayers, layer => {
            this.setLayerVisibility(layer.id, layers.includes(layer.id))
        })
    }

    load(gist_id) {
        $.ajax({
            url: 'https://api.github.com/gists/' + gist_id,
            method: 'GET',
            success: function(result) {
                let data = JSON.parse(result.files['map.json'].content)

                map.map.setBearing(data.map_bearing)
                map.map.setPitch  (data.map_pitch  )
                map.map.setZoom   (data.map_zoom   )
                map.map.setCenter (data.map_center )

                map.setVisibleLayers(data.layers)

                map.title = data.title
                $('.map-title').text(map.title)
            }
        })
    }

    save(json) {
        return new Promise((resolve, reject) => {
            json = json || {}
            Object.assign(json, {
                planetos_version: window.planetos_version,
                map_bearing:      map.map.getBearing(),
                map_pitch:        map.map.getPitch(),
                map_zoom:         map.map.getZoom(),
                map_center:       map.map.getCenter(),
                layers:           map.getVisibleLayers()
            })

            $.ajax({
                url: 'https://api.github.com/gists',
                method: 'POST',
                headers: {
                    Accept: 'application/json'
                },
                data: JSON.stringify({
                    description: 'Custom Planetos map (aiwebb.github.io/planetos)',
                    public: true,
                    files: {
                        'map.json': {
                            content: JSON.stringify(json)
                        }
                    }
                }),
                failure: function(err) {
                    reject(err)
                },
                success: function(result) {
                    resolve(result.id)
                }
            })
        })
    }
}