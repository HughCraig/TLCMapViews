(async function () {
    var urlParams = new URLSearchParams(window.location.search);
    var urltoload = urlParams.get("load");
    var map, view, infoDivExpand, bgExpand, handler;

    if (urltoload !== null && urltoload !== "") {
        const geojsonData = await loadFromUrl(urltoload);
        loadGeoJson(geojsonData);
    } else {
        initializeMap("SceneView");
        window.addEventListener(
            "message",
            function (event) {
                const geojson = event.data;
                if (geojson && geojson.type === "FeatureCollection") {
                    loadGeoJson(geojson);
                }
            },
            false
        );
    }

    function loadGeoJson(geojsonData) {
        require([
            "esri/Map",
            "esri/layers/GeoJSONLayer",
            "esri/views/SceneView",
            "esri/widgets/Expand",
            "esri/widgets/BasemapGallery",
        ], function (
            Map,
            GeoJSONLayer,
            SceneView,
            Expand,
            BasemapGallery
        ) {
            const config = loadConfig(geojsonData);

            // Pass the updated data with id for each feature to layer
            const blob = new Blob([JSON.stringify(config.data)], {
                type: "application/json",
            });
            const newurl = URL.createObjectURL(blob);

            var geojsonLayer = new GeoJSONLayer({
                url: newurl,
                copyright:
                    "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
                popupTemplate: loadPopUpTemplate(config),
                renderer: loadRenderer(config), //optional
                popupEnabled: config.popupEnabled,
                outFields: ["*"],
            });

            if (!map || map.basemap != config.basemap) {
                map = new Map({
                    basemap: config.basemap,
                    ground: "world-elevation",
                    layers: [geojsonLayer],
                });
            }
           
            if (!view) {
                view = new SceneView({
                    container: "viewDiv",
                    center: [131.034742, -25.345113],
                    zoom: 3,
                    map: map,
                });
            }

            //Pop up on hover config
            if (config.popupOnHover) {
                if (handler) {
                    handler.remove();
                }
                handler = view.on("pointer-move", function (event) {
                    view.hitTest(event).then(function (response) {
                        if (response.results.length) {
                            var graphic = response.results.filter(function (
                                result
                            ) {
                                return result.graphic.layer === geojsonLayer;
                            })[0].graphic;
                            view.popup.open({
                                location: graphic.geometry.centroid,
                                features: [graphic],
                            });
                        } else if (!config.keepPopupOfHover) {
                            view.popup.close();
                        }
                    });
                });
            }

            // Click point to post back
            if (config.postBack) {
                view.on("click", function (event) {
                    view.hitTest(event).then(function (response) {
                        if (
                            response.results.length > 0 &&
                            response.results[0].graphic
                        ) {
                            var attributes =
                                response.results[0].graphic.attributes;
                            window.parent.postMessage(
                                {
                                    event: "popupClicked",
                                    details: attributes,
                                },
                                "*"
                            );                           
                        }
                    });
                });
            }

            //Not sure why but timeout is needed to avoid the 'AbortError' Promise error.
            //This problem could happens on the original code as well(30% change) which prevent the initial zoom/center setting
            geojsonLayer.queryExtent().then(function (results) {
                if (config.data.features.length == 1) {
                    var feature = config.data.features[0];
                    var centerPoint = {
                        type: "point",
                        longitude: feature.geometry.coordinates[0],
                        latitude: feature.geometry.coordinates[1]
                    };
            
                    setTimeout(function () {
                        view.center = config.data.features[0].geometry.coordinates;
                        view.goTo({
                            target: centerPoint,
                            zoom: 13
                        })
                    }, 800);
                }else{
                    setTimeout(function () {
                        view.goTo(results.extent);
                    }, 800);
                }
            });
            

            //Info block
            if (config.infoDisplay != "disabled") {
                infoDivExpand = new Expand();
                loadInfoBlock(config, infoDivExpand, view);
            }

            //Basemap gallery block
            if (config.basemapGallery) {
                var basemapGallery = new BasemapGallery();
                bgExpand = new Expand();
                loadBaseMapGallery(basemapGallery, bgExpand, view);
            }
        });
    }
})();
