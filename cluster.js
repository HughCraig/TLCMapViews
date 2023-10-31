(async function () {
    var urlParams = new URLSearchParams(window.location.search);
    var urltoload = urlParams.get("load");

    if (urltoload !== null && urltoload !== "") {
        const geojsonData = await loadFromUrl(urltoload);
        loadGeoJson(geojsonData);
    } else {
        initializeMap("MapView");
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
            "esri/views/MapView",
            "esri/widgets/Expand",
            "esri/widgets/BasemapGallery",
        ], function (Map, GeoJSONLayer, MapView, Expand, BasemapGallery) {
            const config = loadConfig(geojsonData);

            const clusterConfig = {
                type: "cluster",
                clusterRadius: "100px",
                // {cluster_count} is an aggregate field containing
                // the number of features comprised by the cluster
                popupTemplate: {
                    title: "Cluster summary",
                    content:
                        "{cluster_count} places in this cluster. Zoom in or click Browse Features.",
                    fieldInfos: [
                        {
                            fieldName: "cluster_count",
                            format: {
                                places: 0,
                                digitSeparator: true,
                            },
                        },
                    ],
                },
                clusterMinSize: "24px",
                clusterMaxSize: "60px",
                labelingInfo: [
                    {
                        deconflictionStrategy: "none",
                        labelExpressionInfo: {
                            expression: "Text($feature.cluster_count, '#,###')",
                        },
                        symbol: {
                            type: "text",
                            color: config.clusterFontColor,
                            font: {
                                weight: "bold",
                                family: "Noto Sans",
                                size: "12px",
                            },
                        },
                        labelPlacement: "center-center",
                    },
                ],
            };

            if (config.clusterColor) {
                clusterConfig.symbol = {
                    type: "simple-marker",
                    style: "circle",
                    color: config.clusterColor,
                    outline: {
                        color: "white",
                    },
                };
            }

            // Pass the updated data with id for each feature to layer
            const blob = new Blob([JSON.stringify(config.data)], {
                type: "application/json",
            });
            const newurl = URL.createObjectURL(blob);

            var geojsonLayer = new GeoJSONLayer({
                url: newurl,
                copyright:
                    "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
                featureReduction: clusterConfig,
                popupTemplate: loadPopUpTemplate(config),
                renderer: loadRenderer(config),
                popupEnabled: config.popupEnabled,
                outFields: ["*"],
            });

            var map = new Map({
                basemap: config.basemap,
                ground: "world-elevation",
                layers: [geojsonLayer],
            });

            var view = new MapView({
                container: "viewDiv",
                center: [131.034742, -25.345113],
                zoom: 3,
                map: map,
            });

            // Function to handle click events on the map
            view.on("click", function (event) {
                // Perform a hitTest on the view
                view.hitTest(event).then(function (response) {
                    if (
                        response.results.length > 0 &&
                        response.results[0].graphic
                    ) {
                        var attributes = response.results[0].graphic.attributes;
                        window.parent.postMessage({
                            event: 'popupClicked',
                            details: attributes
                        }, '*');                      
                    }
                });
            });

            geojsonLayer.queryExtent().then(function (results) {
                // go to the extent of the results satisfying the query
                view.goTo(results.extent);
            });

            //Info block
            if (config.infoDisplay != "disabled") {
                const infoDivExpand = new Expand();
                loadInfoBlock(config, infoDivExpand, view);
            }

            //Basemap gallery block
            if (config.basemapGallery) {
                var basemapGallery = new BasemapGallery();
                var bgExpand = new Expand();
                loadBaseMapGallery(basemapGallery, bgExpand, view);
            }
        });
    }
})();
