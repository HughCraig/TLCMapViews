(function () {
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

    /**
     * Determines whether two longitudes of two coordinated cross the International Date Line (IDL).
     *
     * @param {number} longitude1 - The longitude of the first point.
     * @param {number} longitude2 - The longitude of the second point.
     * @return {boolean} True if the longitudes cross the IDL, false otherwise.
     */
    function isCrossingIDL(longitude1, longitude2) {
        return Math.abs(longitude1 - longitude2) > 180;
    }

    /**
     * Finds the crossing coordinate at the IDL for two coordinated.
     *
     * Used for splitting a path at IDL.
     *
     * @param {Array<Array<number>>} paths - Array of paths, length of path is supposed to be 2
     * @return {Array<Array<number>> | null} An array containing two coordinates representing the crossing
     *         points at the IDL.
     */
    function findCrossingCoordinatesAtIDL(paths) {
        if (paths.length <= 1) {
            return null;
        }
        let res = null;
        let epsilon = 0.000001;

        paths.forEach((coordinates) => {
            coordinates.forEach((coordinate) => {
                let longitude = coordinate[0];

                if (
                    Math.abs(longitude - 180) < epsilon ||
                    Math.abs(longitude + 180) < epsilon
                ) {
                    res = [
                        [180.000001, coordinate[1]],
                        [-179.99999, coordinate[1]],
                    ];

                    return;
                }
            });
            if (res !== null) {
                return;
            }
        });

        return res;
    }

    /**
     * Modifies journey lines to account for crossings over the International Date Line (IDL) issue.
     *
     * This function processes a set of coordinates representing a journey. If a segment of the journey
     * crosses the IDL, the function splits the journey at the crossing point, creating new segments
     * that correctly represent the path crossing the IDL.
     *
     * @param {Array<Array<number>>} coordinates - An array of coordinates representing the journey.
     * @param {Polyline} Polyline - The Polyline constructor from the mapping library.
     * @param {object} geodesicUtils - An object providing geodesic utilities for densification.
     * @param {object} normalizeUtils - An object providing normalization utilities over the central meridian.
     * @return {Promise<Array<Array<Array<number>>>>} A promise that resolves to an array of journey lines,
     *         each represented as an array of coordinates, modified to account for IDL crossings.
     */
    async function modifyJourneyLines(
        coordinates,
        Polyline,
        geodesicUtils,
        normalizeUtils
    ) {
        if (coordinates.length <= 1) {
            return [coordinates];
        }

        var modifiedJourneyLines = [];
        var currentLine = [];

        for (let i = 0; i < coordinates.length; i++) {
            if (
                i > 0 &&
                isCrossingIDL(coordinates[i - 1][0], coordinates[i][0])
            ) {
                //Generate coordinated of intersection at IDL using normalizeCentralMeridian function by Arcgis
                var polyline = new Polyline({
                    paths: [coordinates[i - 1], coordinates[i]],
                });

                let densifiedPolyline = geodesicUtils.geodesicDensify(
                    polyline,
                    10000000000
                );
                let normalizedGeometry =
                    await normalizeUtils.normalizeCentralMeridian(
                        densifiedPolyline
                    );

                var crossingCoordinates = findCrossingCoordinatesAtIDL(
                    normalizedGeometry[0].paths
                );

                if (crossingCoordinates != null) {
                    var otherEnd = null;

                    // Push intersection point at IDL. Need to be on same side of IDL
                    if (coordinates[i - 1][0] > 0) {
                        currentLine.push(crossingCoordinates[0]);
                        otherEnd = crossingCoordinates[1];
                    } else {
                        currentLine.push(crossingCoordinates[1]);
                        otherEnd = crossingCoordinates[0];
                    }

                    modifiedJourneyLines.push(currentLine); //Push new line segment to journey lines

                    currentLine = []; //Reset current line

                    currentLine.push(otherEnd); //Push other end of intersection coordinated , build new line segment
                }
            }

            currentLine.push(coordinates[i]);
        }

        modifiedJourneyLines.push(currentLine);

        return modifiedJourneyLines;
    }

    require([
        "esri/Map",
        "esri/layers/GeoJSONLayer",
        "esri/views/SceneView",
        "esri/geometry/Extent",
        "esri/widgets/Expand",
        "esri/widgets/BasemapGallery",
        "esri/geometry/Polyline",
        "esri/geometry/support/geodesicUtils",
        "esri/geometry/support/normalizeUtils",
    ], function (
        Map,
        GeoJSONLayer,
        SceneView,
        Extent,
        Expand,
        BasemapGallery,
        Polyline,
        geodesicUtils,
        normalizeUtils
    ) {
        loadConfig(urltoload)
            .then((config) => {
                var map = new Map({
                    basemap: config.basemap,
                    ground: "world-elevation",
                    layers: [],
                });

                var pointData = filterDataByGeometryType(config.data, "Point");
                var lineData = filterDataByGeometryType(
                    config.data,
                    "LineString"
                );

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

                var geojsonLineLayer = null;
                var lineGeoJson = {
                    type: "FeatureCollection",
                    features: [],
                };
                if (lineData.features.length > 0) {
                    let promises = lineData.features.map(async (feature) => {
                        var modifiedJourneyLines = await modifyJourneyLines(
                            feature.geometry.coordinates,
                            Polyline,
                            geodesicUtils,
                            normalizeUtils
                        );

                        modifiedJourneyLines.forEach((coordinates) => {
                            let lineFeature = {
                                type: "Feature",
                                geometry: {
                                    type: "LineString",
                                    coordinates: coordinates,
                                },
                                display: feature.display,
                                properties: feature.properties,
                            };
                            lineGeoJson.features.push(lineFeature);
                        });

                        return Promise.resolve();
                    });

                    Promise.all(promises).then(() => {
                        const blob = new Blob([JSON.stringify(lineGeoJson)], {
                            type: "application/json",
                        });
                        const lineDataUrl = URL.createObjectURL(blob);

                        geojsonLineLayer = new GeoJSONLayer({
                            url: lineDataUrl,
                            copyright:
                                "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
                            popupTemplate: template,
                            renderer: {
                                type: "unique-value",
                                field: "tlcMapUniqueId", // The name of the attribute field containing types or categorical values referenced in uniqueValueInfos or uniqueValueGroups
                                uniqueValueInfos: config.data.features.map(
                                    (feature) => ({
                                        value: feature.properties
                                            .tlcMapUniqueId,
                                        symbol: {
                                            type: "simple-line",
                                            color:
                                                feature.display &&
                                                feature.display.color
                                                    ? feature.display.color
                                                    : "white",
                                            width:
                                                feature.display &&
                                                feature.display.lineWidth
                                                    ? feature.display.lineWidth.toString()
                                                    : "2",
                                        },
                                    })
                                ),
                            },
                        });
                        map.layers.add(geojsonLineLayer);
                    });
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
                    setTimeout(function () {
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
})();
