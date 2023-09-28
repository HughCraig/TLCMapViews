(function () {
    const urlParams = new URLSearchParams(window.location.search);
    const urltoload = urlParams.get("load");

    // Import ArcGIS JS modules.
    require([
        "esri/Map",
        "esri/layers/GeoJSONLayer",
        "esri/views/MapView",
        "esri/widgets/TimeSlider",
        "esri/geometry/Extent",
        "esri/widgets/Expand",
        "esri/widgets/BasemapGallery",
        "esri/core/promiseUtils",
        "esri/widgets/LayerList",
    ], function (
        Map,
        GeoJSONLayer,
        MapView,
        TimeSlider,
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
                            url: newurl + "?sort=start",
                            title: config.datasetsConfig[i].name,
                            copyright:
                                "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
                            timeInfo: {
                                startField: "udatestart",
                                endField: "udateend",
                                interval: {
                                    unit: "years",
                                    value: 1,
                                },
                            },
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
                    layers: layers,
                });

                // Create the map view instance.
                const view = new MapView({
                    container: "viewDiv",
                    center: [131.034742, -25.345113],
                    zoom: 4,
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
                        view.goTo(extent);
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

                // time slider widget initialization
                const timeSlider = new TimeSlider({
                    container: "timeSlider",
                    view: view,
                    timeVisible: true, // show the time stamps on the timeslider
                    loop: true,
                    labelFormatFunction: (value, type, element) => {
                        if (!timeSlider.fullTimeExtent) {
                            return;
                        }
                        const normal = new Intl.DateTimeFormat("en-gb");
                        switch (type) {
                            case "min":
                            case "max":
                                element.innerText = normal.format(value);
                                break;
                            case "extent":
                                const start = timeSlider.fullTimeExtent.start;
                                const end = timeSlider.fullTimeExtent.end;
                                element.innerText = `${normal.format(
                                    value[0].getTime()
                                )} ${normal.format(value[1].getTime())}`;
                                break;
                        }
                    },
                });

                // Create the promises of layers view.
                const layerViewPromises = [];
                for (let i = 0; i < layers.length; i++) {
                    layerViewPromises.push(view.whenLayerView(layers[i]));
                }
                // Calculate the time line properties once the views of layers are created.
                promiseUtils
                    .eachAlways(layerViewPromises)
                    .then(function (results) {
                        const timeRange =
                            CollectionUtility.getLayersTimeExtent(layers);
                        const start = timeRange[0];
                        const end = timeRange[1];
                        if (start && end) {
                            const tunit =
                                CollectionUtility.getTimelineIntervalUnit(
                                    start,
                                    end
                                );
                            for (let i = 0; i < layers.length; i++) {
                                layers[i].timeInfo.interval.unit = tunit;
                            }

                            timeSlider.fullTimeExtent = {
                                start: start,
                                end: end,
                            };
                            timeSlider.values = [start, end];
                            timeSlider.stops = {
                                interval: {
                                    value: 1,
                                    unit: tunit,
                                },
                            };
                        }
                    });

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
