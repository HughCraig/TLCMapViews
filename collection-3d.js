(function () {
    const urlParams = new URLSearchParams(window.location.search);
    const urltoload = urlParams.get("load");

    // Import ArcGIS JS modules.
    require([
        "esri/Map",
        "esri/layers/GeoJSONLayer",
        "esri/views/SceneView",
        "esri/geometry/Extent",
        "esri/widgets/Expand",
        "esri/widgets/BasemapGallery",
        "esri/core/promiseUtils",
        "esri/widgets/LayerList",
    ], function (
        Map,
        GeoJSONLayer,
        SceneView,
        Extent,
        Expand,
        BasemapGallery,
        promiseUtils,
        LayerList
    ) {
        loadCollectionConfig(urltoload)
            .then((config) => {
                // Initiate collection legend.
                const legend = new CollectionLegend();

                // Map of layer ID to layer data.
                const layerDataMap = {};

                // Create array of layer instances.
                const layers = [];

                if (config.datasetsConfig) {
                    for (let i = 0; i < config.datasetsConfig.length; i++) {
                        const color =
                            config.datasetsConfig[i].layerContent.color;

                        legend.addItem(config.datasetsConfig[i].name, color);

                        // Pass the updated data with id for each feature to layer
                        const blob = new Blob(
                            [
                                JSON.stringify(
                                    config.datasetsConfig[i].config.data
                                ),
                            ],
                            {
                                type: "application/json",
                            }
                        );
                        const newurl = URL.createObjectURL(blob);

                        const layer = new GeoJSONLayer({
                            id: config.datasetsConfig[i].id,
                            url: newurl,
                            title: config.datasetsConfig[i].name,
                            copyright:
                                "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
                            popupTemplate: loadPopUpTemplate(
                                config.datasetsConfig[i].config
                            ), //Load individual dataset config
                            renderer: {
                                type: "simple",
                                field: "mag",
                                symbol: {
                                    type: "simple-marker",
                                    color: color,
                                    outline: {
                                        color: "white",
                                    },
                                },
                            },
                            popupEnabled:
                                config.datasetsConfig[i].config.popupEnabled,
                        });

                        layers.push(layer);
                        layerDataMap[config.datasetsConfig[i].id] =
                            config.datasetsConfig[i].layerContent;
                    }
                }

                // Create the map instance.
                const map = new Map({
                    basemap: config.basemap,
                    ground: "world-elevation",
                    layers: layers,
                });

                // Create the map view instance.
                const view = new SceneView({
                    container: "viewDiv",
                    center: [131.034742, -25.345113],
                    zoom: 3,
                    map: map,
                });

                // Merge all extents of layers and go to the merged extent.
                const layerQueryPromises = [];
                for (let i = 0; i < layers.length; i++) {
                    layerQueryPromises.push(layers[i].queryExtent());
                }
                promiseUtils
                    .eachAlways(layerQueryPromises)
                    .then(function (results) {
                        let extent = null;
                        for (let i = 0; i < results.length; i++) {
                            if (typeof results[i].value !== "undefined") {
                                if (extent === null) {
                                    extent = results[i].value.extent;
                                } else {
                                    extent.union(results[i].value.extent);
                                }
                            }
                        }
                        
                        setTimeout(function () {
                            view.goTo(extent);
                        }, 800);
                    });

                //List Pane
                if (config.listPane != "disabled") {
                    // Create the layer list widget.
                    let layerList = new LayerList({
                        view: view,
                        listItemCreatedFunction: function (event) {
                            // The event object contains properties of the
                            // layer in the LayerList widget.

                            const item = event.item;

                            const layerID = item.layer.id;
                            const layerData = layerDataMap[layerID].content;

                            // Create the information panel.
                            if (layerData) {
                                item.panel = {
                                    className: "esri-icon-notice-round",
                                    title: "View layer properties",
                                    content: layerData,
                                };
                            }

                            // Add actions.
                            item.actionsSections = [
                                [
                                    {
                                        title: "Go to full extent",
                                        className: "esri-icon-zoom-out-fixed",
                                        id: "full-extent",
                                    },
                                ],
                            ];
                        },
                    });

                    // Action handler of going to full extent.
                    layerList.on("trigger-action", function (event) {
                        if (event.action.id === "full-extent") {
                            event.item.layer
                                .queryExtent()
                                .then(function (result) {
                                    view.goTo(result.extent);
                                });
                        }
                    });

                    const layerListExpand = new Expand();
                    loadListPane(config, layerListExpand, view, layerList);
                }

                //Info block
                if (config.infoDisplay != "disabled") {
                    const infoDivExpand = new Expand();
                    loadInfoBlock(config, infoDivExpand, view);

                    //Legend display
                    if (config.legend !== false) {
                        $(infoDiv).append(
                            '<div class="legend-container"></div>'
                        );
                        legend.render($(infoDiv).find(".legend-container"));
                    }
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
