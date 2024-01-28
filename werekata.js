(function () {
    let flyfeatures; // once the view is loaded the array of coords is stored here, so flyto can go through it.
    let leg = 0; // just to keep track fo where we are in the journey
    let flyview;

    const urlParams = new URLSearchParams(window.location.search);
    const urltoload = urlParams.get("load");

    require([
        "esri/Map",
        "esri/layers/GeoJSONLayer",
        "esri/views/SceneView",
        "esri/geometry/Extent",
        "esri/widgets/Expand",
        "esri/widgets/BasemapGallery",
    ], function (Map, GeoJSONLayer, MapView, Extent, Expand, BasemapGallery) {
        loadConfig(urltoload)
            .then((config) => {
                // Paste the url into a browser's address bar to download and view the attributes
                // in the GeoJSON file. These attributes include:
                // * mag - magnitude
                // * type - earthquake or other event such as nuclear test
                // * place - location of the event
                // * time - the time of the event
                // Use the Arcade Date() function to format time field into a human-readable format


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
                    renderer: loadRenderer(config),
                    popupEnabled: config.popupEnabled,
                });

                let map = new Map({
                    basemap: config.basemap,
                    ground: "world-elevation",
                    layers: [geojsonLayer],
                });

                let view = new MapView({
                    container: "viewDiv",
                    center: [131.034742, -25.345113],
                    zoom: 4,
                    map: map,
                });

                geojsonLayer.queryExtent().then(function (results) {
                    // go to the extent of the results, id the midpoint of the whole map to start.
                    // and then go to the first one.

                    // ultimately the effect we have is:
                    // we load the map, and go quickly to a broad view of the whole dataset.
                    // then we zoom slowly to the start point and go through the journey.
                    // if it fails we laoded the map centred on Uluru, so at least we see Aus.

                    setTimeout(function () {
                        view.goTo(results.extent).then(function (results) {
                            let query = geojsonLayer.createQuery();

                            geojsonLayer
                                .queryFeatures(query)
                                .then(function (results) {
                                    flyview = view;
                                    flyfeatures = results.features;
                                    const fragment =
                                        document.createDocumentFragment();
                                    fly();
                                });
                        });
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

    function fly() {
        // don't keep flying if you're at the end... or maybe make it loop.. or go back
        if (leg > flyfeatures.length) {
            return;
        }
        let lat = parseFloat(flyfeatures[leg].attributes.latitude);
        let lng = parseFloat(flyfeatures[leg].attributes.longitude);

        flyview
            .goTo(
                {
                    center: [lng, lat], //[graphics[0].attributes.latitude, graphics[0].attributes.longitude],
                    zoom: 13,
                    tilt: 75,
                },
                {
                    speedFactor: 0.1,
                    easing: "ease-in-out",
                }
            )
            .then((resolvedVal) => {
                //only once we get there should we recursively call to go to the next one
                leg = leg + 1;
                fly();
            })
            .catch((error) => {
                console.error(error);
            })
            .catch(function (error) {
                if (error.name != "AbortError") {
                    console.error(error);
                }
            });
    }

    function testthis() {
        fly();
    }
})();
