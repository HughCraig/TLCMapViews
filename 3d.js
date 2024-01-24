(function () {
    let urlParams = new URLSearchParams(window.location.search);
    let urltoload = urlParams.get("load");

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
                // Pass the updated data with id for each feature to layer
                const blob = new Blob([JSON.stringify(config.data)], {
                    type: "application/json",
                });
                const newurl = URL.createObjectURL(blob);

                let geojsonLayer = new GeoJSONLayer({
                    url: newurl,
                    copyright:
                        "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
                    popupTemplate: loadPopUpTemplate(config),
                    renderer: loadRenderer(config), //optional
                    popupEnabled: config.popupEnabled,
                });

                let map = new Map({
                    basemap: config.basemap,
                    ground: "world-elevation",
                    layers: [geojsonLayer],
                });

                let view = new SceneView({
                    container: "viewDiv",
                    center: [131.034742, -25.345113],
                    zoom: 3,
                    map: map,
                });

                //Not sure why but timeout is needed to avoid the 'AbortError' Promise error.
                //This problem could happens on the original code as well(30% change) which prevent the initial zoom/center setting
                geojsonLayer.queryExtent().then(function (results) {
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
                    let basemapGallery = new BasemapGallery();
                    let bgExpand = new Expand();
                    loadBaseMapGallery(basemapGallery, bgExpand, view);
                }
            })
            .catch((err) => console.error(err));
    });
})();
