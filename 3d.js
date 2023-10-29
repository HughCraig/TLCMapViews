(async function () {
    var urlParams = new URLSearchParams(window.location.search);
    var urltoload = urlParams.get("load");

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
            });

            var map = new Map({
                basemap: config.basemap,
                ground: "world-elevation",
                layers: [geojsonLayer],
            });

            var view = new SceneView({
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
                var basemapGallery = new BasemapGallery();
                var bgExpand = new Expand();
                loadBaseMapGallery(basemapGallery, bgExpand, view);
            }
        });
    }
})();
