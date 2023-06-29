var urlParams = new URLSearchParams(window.location.search);
var urltoload = urlParams.get("load");

/**
 * filters features from a GeoJSON data object by their geometry type.
 *
 * The function returns a new GeoJSON data object that includes the same 'type' and 'metadata'
 * fields as the input data, and a 'features' array that includes only the filtered features.
 *
 * @param {object} data - The GeoJSON data to filter. Should include a 'features' array.
 * @param {string} geometryType - The geometry type to filter by (e.g., 'Point', 'LineString').
 * @return {object} A new GeoJSON data object including only features of the specified geometry type.
 */
function filterDataByGeometryType(data, geometryType) {
    var filteredFeatures = data.features.filter(
        (feature) => feature.geometry.type === geometryType
    );
    return {
        type: data.type,
        metadata: data.metadata,
        features: filteredFeatures,
    };
}

require([
    "esri/Map",
    "esri/layers/GeoJSONLayer",
    "esri/views/SceneView",
    "esri/geometry/Extent",
    "esri/widgets/Expand",
    "esri/widgets/BasemapGallery",
], function (Map, GeoJSONLayer, SceneView, Extent, Expand, BasemapGallery) {
    loadConfig(urltoload)
        .then((config) => {
            var map = new Map({
                basemap: config.basemap,
                ground: "world-elevation",
                layers: [],
            });

            var pointData = filterDataByGeometryType(config.data, "Point");
            var lineData = filterDataByGeometryType(config.data, "LineString");

            const template = loadPopUpTemplate(config);

            const blob = new Blob([JSON.stringify(pointData)], {
                type: "application/json",
            });
            const pointDataUrl = URL.createObjectURL(blob);

            const geojsonPointLayer = new GeoJSONLayer({
                title: "TLCMap Layer",
                url: pointDataUrl,
                copyright:
                    "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
                popupTemplate: template,
                renderer: loadRenderer(config),
                popupEnabled: config.popupEnabled,
            });
            map.layers.add(geojsonPointLayer);

            if (lineData.features.length > 0) {
                const blob = new Blob([JSON.stringify(lineData)], {
                    type: "application/json",
                });
                const lineDataUrl = URL.createObjectURL(blob);

                var geojsonLineLayer = new GeoJSONLayer({
                    url: lineDataUrl,
                    copyright:
                        "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
                    popupTemplate: template,
                    renderer: {
                        type: "unique-value",
                        field: "tlcMapUniqueId", // The name of the attribute field containing types or categorical values referenced in uniqueValueInfos or uniqueValueGroups
                        uniqueValueInfos: config.data.features.map(
                            (feature) => ({
                                value: feature.properties.tlcMapUniqueId,
                                symbol: {
                                    type: "simple-line",
                                    color:
                                        feature.display && feature.display.color
                                            ? feature.display.color
                                            : "white",
                                    width: "2",
                                },
                            })
                        ),
                    },
                });
                map.layers.add(geojsonLineLayer);
            }

            var view = new SceneView({
                container: "viewDiv",
                center: [131.034742, -25.345113],
                zoom: 3,
                map: map,
            });

            //Not sure why but timeout is needed to avoid the 'AbortError' Promise error.
            //This problem could happens on the original code as well(30% change) which prevent the initial zoom/center setting
            geojsonPointLayer.queryExtent().then(function (results) {
                setTimeout(function() {
                    view.goTo(results.extent);
                }, 800);  
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
