var urlParams = new URLSearchParams(window.location.search);
var urltoload = urlParams.get("load");

require([
    "esri/Map",
    "esri/layers/FeatureLayer",
    "esri/layers/GeoJSONLayer",
    "esri/views/MapView",
    "esri/geometry/Extent",
    "esri/widgets/Legend",
    "esri/widgets/Expand",
    "esri/widgets/Home",
    "esri/widgets/BasemapGallery",
    "esri/popup/content/TextContent",
], function (
    Map,
    FeatureLayer,
    GeoJSONLayer,
    MapView,
    Extent,
    Legend,
    Expand,
    Home,
    BasemapGallery,
    TextContent
) {
    loadConfig(urltoload)
        .then((config) => {
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
                            color: "#004a5d",
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
        })
        .catch((err) => console.error(err));
});
