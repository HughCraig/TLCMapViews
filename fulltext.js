(function () {
    const urlParams = new URLSearchParams(window.location.search);
    const urltoload = urlParams.get("load");

    let currentMapType = "cluster";
    let currentViewMode = "view";

    let geojsonLayer = null;
    let featureMap = new Map();

    //Change background of the span, scroll to it
    function highlightPlaceInText(id) {
        restoreAllSpanColors();
        const textContent = document.getElementById("textcontent");
        const spanToHighlight = textContent.querySelector(
            `span[data-uid="${id}"]`
        );

        if (spanToHighlight) {
            // Change the background color
            spanToHighlight.style.backgroundColor = "#286090";

            // Scroll into view if needed
            spanToHighlight.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }
    }

    function restoreAllSpanColors() {
        const textContent = document.getElementById("textcontent");
        const allSpans = textContent.querySelectorAll("span[data-uid]");

        allSpans.forEach((span) => {
            span.style.backgroundColor = "orange";
        });
    }

    function mapShowPopup(view, targetId) {
        geojsonLayer
            .queryFeatures({
                where: `id = '${targetId}'`,
                returnGeometry: true,
                outFields: ["*"],
            })
            .then(function (result) {
                if (result.features.length > 0) {
                    const feature = result.features[0];
                    view.goTo({
                        target: feature.geometry,
                        zoom: view.zoom,
                    }).then(() => {
                        if (currentViewMode === "view") {
                            view.popup.open({
                                location: feature.geometry,
                                features: [feature],
                                title: feature.attributes.name,
                            });
                        }
                    });
                }
            });
    }

    function attachSpanClickEvents(view, span) {
        span.addEventListener("click", function () {
            restoreAllSpanColors();
            const targetId = span.getAttribute("data-uid");
            currentSelectedPlaceUID = targetId;

            mapShowPopup(view, targetId);
        });
    }

    require([
        "esri/Map",
        "esri/layers/GeoJSONLayer",
        "esri/views/MapView",
        "esri/widgets/Expand",
        "esri/widgets/BasemapGallery",
    ], function (Map, GeoJSONLayer, MapView, Expand, BasemapGallery) {
        loadConfig(urltoload)
            .then((config) => {
                config.data.features.forEach((feature) => {
                    featureMap.set(feature.properties.id, feature.properties);
                });

                const clusterConfig = {
                    type: "cluster",
                    clusterRadius: "100px",
                    // {cluster_count} is an aggregate field containing
                    // the number of features comprised by the cluster
                    popupTemplate: {
                        title: config.clusterPopupTitle,
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
                                expression:
                                    "Text($feature.cluster_count, '#,###')",
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

                if (config.textContent && config.textcontexts) {
                    let textContent = config.textContent;
                    let textContexts = config.textcontexts;
                    let markedText = ""; // This will hold the final marked text
                    let lastIndex = 0; // To track the last position processed

                    textContexts.sort((a, b) => a.start_index - b.start_index);

                    textContexts.forEach((context) => {
                        let startIndex = context.start_index;
                        let endIndex = context.end_index;
                        let dataItemUid = context.dataitem_uid;

                        markedText += textContent.slice(lastIndex, startIndex);

                        markedText +=
                            '<span style="background-color: orange; padding:3px; cursor:pointer" data-uid="' +
                            dataItemUid +
                            '">' +
                            textContent.slice(startIndex, endIndex) +
                            "</span>";

                        lastIndex = endIndex;
                    });

                    markedText += textContent.slice(lastIndex);
                    document.getElementById("textcontent").innerHTML =
                        markedText;
                }else if(config.textContent){
                    document.getElementById("textcontent").innerHTML = config.textContent
                }

                // Pass the updated data with id for each feature to layer
                const blob = new Blob([JSON.stringify(config.data)], {
                    type: "application/json",
                });
                const newurl = URL.createObjectURL(blob);

                geojsonLayer = new GeoJSONLayer({
                    url: newurl,
                    spatialReference: { wkid: 4326 },
                    copyright:
                        "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
                    featureReduction: clusterConfig,
                    popupTemplate: loadPopUpTemplate(config),
                    renderer: loadRenderer(config),
                    popupEnabled: config.popupEnabled,
                    outFields: ["*"],
                });

                let map = new Map({
                    basemap: config.basemap,
                    ground: "world-elevation",
                    layers: [geojsonLayer],
                });

                let view = new MapView({
                    container: "viewDiv",
                    center: [131.034742, -25.345113],
                    zoom: 3,
                    map: map,
                });

                geojsonLayer.queryExtent().then(function (results) {
                    // go to the extent of the results satisfying the query
                    view.goTo(results.extent);
                });

                // open pin feature popup
                view.popup.watch("selectedFeature", (selectedFeature) => {
                    if (currentViewMode == "view") {
                        if (selectedFeature && selectedFeature.attributes) {
                            const attributes = selectedFeature.attributes;
                            if (attributes.id) {
                                highlightPlaceInText(attributes.id);
                            }
                        }
                    }
                });

                document
                    .querySelectorAll("span[data-uid]")
                    .forEach(function (span) {
                        attachSpanClickEvents(view, span);
                    });

                // Remove highlight when popup is closed
                document.addEventListener("click", function (event) {
                    // Check if the clicked element has the specified class
                    if (
                        event.target.classList.contains("esri-popup__icon") &&
                        event.target.classList.contains("esri-icon-close")
                    ) {
                        // Call the restoreAllSpanColors function
                        restoreAllSpanColors();
                    }
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

                // Add switch map style button
                var switchMapType = document.createElement("div");
                switchMapType.className =
                    "esri-icon-globe esri-widget--button esri-widget esri-interactive";
                switchMapType.setAttribute("tabindex", "0");
                switchMapType.setAttribute("data-html", "true");
                switchMapType.setAttribute("data-animation", "true");
                switchMapType.setAttribute("data-toggle", "tooltip");
                switchMapType.setAttribute("data-placement", "top");
                switchMapType.setAttribute("title", "Switch Map type");

                switchMapType.addEventListener("click", () => {
                    if (currentMapType === "cluster") {
                        currentMapType = "feature";
                        geojsonLayer.featureReduction = null;
                    } else {
                        currentMapType = "cluster";
                        geojsonLayer.featureReduction = clusterConfig;
                    }
                });
                view.ui.add(switchMapType, "top-right");

                //Event for "goto" parameter
                const urlParams = new URLSearchParams(window.location.search);
                const gotoId = urlParams.get("goto");

                if (gotoId) {
                    // Highlight the corresponding text span
                    highlightPlaceInText(gotoId);

                    // Show the popup on the map for the corresponding feature
                    mapShowPopup(view, gotoId);
                }
            })
            .catch((err) => console.error(err));
    });
})();
