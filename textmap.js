(function () {
    const urlParams = new URLSearchParams(window.location.search);
    const urltoload = urlParams.get("load");

    let currentMapType = "cluster";
    let currentViewMode = "view";
    let currentSelectedPlaceUID = null;
    let currentSelectedPlaceLatitude = null;
    let currentSelectedPlaceLongitude = null;

    let geojsonLayer = null;
    let graphicsLayer = null;
    let featureMap = new Map();

    let isAddNewPlace = false;
    let newPlace = {};

    //todo make sure to clear graphics layer when needed

    document
        .getElementById("closePopupButton")
        .addEventListener("click", function () {
            closeEditPopup();
            currentSelectedPlaceUID = null;
        });

    document
        .getElementById("cancelButton")
        .addEventListener("click", function () {
            closeEditPopup();
            currentSelectedPlaceUID = null;
        });

    function refreshGeoJSONLayer(GeoJSONLayer, view, clusterConfig) {
        loadConfig(urltoload).then((config) => {
            const blob = new Blob([JSON.stringify(config.data)], {
                type: "application/json",
            });
            const newurl = URL.createObjectURL(blob);
            // Remove the existing layer from the map
            view.map.remove(geojsonLayer);

            geojsonLayer = new GeoJSONLayer({
                url: newurl,
                copyright:
                    "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
                featureReduction: clusterConfig,
                popupTemplate: loadPopUpTemplate(config),
                renderer: loadRenderer(config),
                popupEnabled: config.popupEnabled,
            });

            // Add the refreshed layer back to the map
            view.map.add(geojsonLayer);
        });
    }

    function removePopupElements() {
        // Remove pop up elements
        document
            .querySelectorAll(".esri-popup__main-container.esri-widget")
            .forEach(function (element) {
                element.remove();
            });
        document
            .querySelectorAll(".esri-popup__pointer")
            .forEach(function (element) {
                element.remove();
            });
    }

    function closeEditPopup() {
        document.getElementById("editPopup").style.display = "none";
        geojsonLayer.definitionExpression = null;
        currentSelectedPlaceUID = null;
        graphicsLayer.removeAll();
    }

    function refreshGeoJSONLayer(GeoJSONLayer, view, clusterConfig) {
        loadConfig(urltoload).then((config) => {
            const blob = new Blob([JSON.stringify(config.data)], {
                type: "application/json",
            });
            const newurl = URL.createObjectURL(blob);

            // Remove the existing layer from the map
            view.map.remove(geojsonLayer);

            geojsonLayer = new GeoJSONLayer({
                url: newurl,
                spatialReference: { wkid: 4326 },
                copyright:
                    "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
                featureReduction: clusterConfig,
                popupTemplate: loadPopUpTemplate(config),
                renderer: loadRenderer(config),
                popupEnabled: config.popupEnabled,
            });

            // Add the refreshed layer back to the map
            view.map.add(geojsonLayer);
        });
    }

    function attachSpanClickEvents(view, span) {
        span.addEventListener("click", function () {
            const targetId = span.getAttribute("data-uid");
            currentSelectedPlaceUID = targetId;

            if (currentViewMode === "edit") {
                removePopupElements();
                // Show the editPopup div
                const editPopup = document.getElementById("editPopup");
                editPopup.style.display = "block";
                document.getElementById("changeAllPlace").style.display =
                    "block";

                const spanRect = span.getBoundingClientRect();
                const popupY = spanRect.bottom + window.scrollY + 10;
                const popupRect = editPopup.getBoundingClientRect();

                editPopup.style.top = `${popupY}px`;

                const arrowOffset =
                    spanRect.left + spanRect.width / 2 - popupRect.left;

                // Set the arrow's left position dynamically
                editPopup.style.setProperty("--arrow-left", `${arrowOffset}px`);

                // Clear or prefill inputs if needed
                let currentFeature = featureMap.get(targetId);
                document.getElementById("latitudeInput").value =
                    currentFeature.latitude;
                currentSelectedPlaceLatitude = currentFeature.latitude;
                document.getElementById("longitudeInput").value =
                    currentFeature.longitude;
                currentSelectedPlaceLongitude = currentFeature.longitude;

                document.getElementById("applyAllCheckboxText").innerText =
                    "Apply to all linked '" +
                    currentFeature.name +
                    "' places in this Text";
                document.getElementById("applyAllCheckbox").checked = false;

                isAddNewPlace = false;
                newPlace = {};

                //Hide all other points , only show the selected poin
                geojsonLayer.definitionExpression = `id = '${targetId}'`;
            }

            //Mufeng not showing popup after change
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
                            zoom: 3,
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
        });
    }

    require([
        "esri/Map",
        "esri/layers/GeoJSONLayer",
        "esri/layers/GraphicsLayer",
        "esri/Graphic",
        "esri/views/MapView",
        "esri/widgets/Expand",
        "esri/widgets/BasemapGallery",
    ], function (
        Map,
        GeoJSONLayer,
        GraphicsLayer,
        Graphic,
        MapView,
        Expand,
        BasemapGallery
    ) {
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

                console.log(config);

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
                });

                graphicsLayer = new GraphicsLayer({
                    title: "graphicsLayer",
                });

                let map = new Map({
                    basemap: config.basemap,
                    ground: "world-elevation",
                    layers: [geojsonLayer, graphicsLayer],
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

                //Switch view mode button behavior
                document
                    .getElementById("switchviewmode")
                    .addEventListener("click", () => {
                        const switchButton =
                            document.getElementById("switchviewmode");
                        removePopupElements();
                        if (currentViewMode === "view") {
                            currentViewMode = "edit";
                            document.getElementById(
                                "text"
                            ).style.backgroundColor = "#d7e6fc";
                            switchButton.innerText = "Switch to view mode";
                            currentSelectedPlaceUID = null;
                        } else {
                            currentViewMode = "view";
                            document.getElementById(
                                "text"
                            ).style.backgroundColor = "white";
                            switchButton.innerText = "Switch to edit mode";
                            document.getElementById("editPopup").style.display =
                                "none";

                            geojsonLayer.definitionExpression = null;
                            graphicsLayer.removeAll();
                        }
                    });

                document
                    .querySelectorAll("span[data-uid]")
                    .forEach(function (span) {
                        attachSpanClickEvents(view, span);
                    });

                // Delete button behavior
                document
                    .getElementById("deleteButton")
                    .addEventListener("click", function () {
                        if (
                            currentViewMode == "edit" &&
                            currentSelectedPlaceUID != null
                        ) {
                            let selectedFeatureName = featureMap.get(
                                currentSelectedPlaceUID
                            ).name;
                            let deleteFeatureUIDs = [];

                            if (
                                document.getElementById("applyAllCheckbox")
                                    .checked
                            ) {
                                featureMap.forEach((value, key) => {
                                    if (value.name === selectedFeatureName) {
                                        deleteFeatureUIDs.push(key);
                                    }
                                });
                            } else {
                                deleteFeatureUIDs.push(currentSelectedPlaceUID);
                            }

                            deleteFeatureUIDs.forEach((uid) => {
                                $.ajax({
                                    type: "GET",
                                    url: "https://test-ghap.tlcmap.org//ajaxdeletedataitem2",
                                    data: {
                                        uid: uid,
                                    },
                                    success: function () {
                                        // Refresh map
                                        refreshGeoJSONLayer(
                                            GeoJSONLayer,
                                            view,
                                            clusterConfig
                                        );

                                        removePopupElements();

                                        //Hide the edit popup
                                        closeEditPopup();

                                        // Remove the span of the selected place
                                        const spanToDelete =
                                            document.querySelector(
                                                `span[data-uid="${uid}"]`
                                            );
                                        if (spanToDelete) {
                                            const parent =
                                                spanToDelete.parentNode;
                                            parent.replaceChild(
                                                document.createTextNode(
                                                    spanToDelete.textContent
                                                ),
                                                spanToDelete
                                            );
                                        }

                                        // Remove the feature from the featureMap
                                        featureMap.delete(uid);
                                    },
                                    error: function (response) {
                                        alert("Error deleting data:", response);
                                    },
                                });
                            });
                        }
                    });

                // Save change button hebavior
                document
                    .getElementById("saveButton")
                    .addEventListener("click", function () {
                        if (
                            currentViewMode == "edit" &&
                            (currentSelectedPlaceUID != null || isAddNewPlace)
                        ) {
                            const latitude =
                                document.getElementById("latitudeInput").value;
                            const longitude =
                                document.getElementById("longitudeInput").value;

                            // Verify that latitude and longitude are valid
                            if (
                                isNaN(latitude) ||
                                isNaN(longitude) ||
                                latitude < -90 ||
                                latitude > 90 ||
                                longitude < -180 ||
                                longitude > 180
                            ) {
                                alert(
                                    "Invalid latitude or longitude values. Please check your input."
                                );
                                return;
                            }

                            if (
                                isAddNewPlace &&
                                newPlace.title &&
                                newPlace.start_index &&
                                newPlace.end_index
                            ) {
                                //Add new place
                                //Add place first
                                $.ajax({
                                    type: "GET",
                                    url: "https://test-ghap.tlcmap.org//ajaxadddataitem2",
                                    data: {
                                        ds_id: newPlace.dataset_id,
                                        title: newPlace.title,
                                        recordtype: "Text",
                                        latitude: latitude,
                                        longitude: longitude,
                                    },

                                    success: function (result) {
                                        $.ajax({
                                            type: "GET",
                                            url: "https://test-ghap.tlcmap.org//ajaxaddtextcontent2",
                                            data: {
                                                dataitem_uid:
                                                    result.dataitem.uid,
                                                text_id: config.textID,
                                                start_index:
                                                    newPlace.start_index,
                                                end_index: newPlace.end_index,
                                            },

                                            success: function () {
                                                closeEditPopup();

                                                refreshGeoJSONLayer(
                                                    GeoJSONLayer,
                                                    view,
                                                    clusterConfig
                                                );
                                                removePopupElements();

                                                // Wrap selected text with <span> in the DOM
                                                const range = window
                                                    .getSelection()
                                                    .getRangeAt(0);
                                                const span =
                                                    document.createElement(
                                                        "span"
                                                    );
                                                span.style.backgroundColor =
                                                    "orange";
                                                span.style.padding = "3px";
                                                span.style.cursor = "pointer";
                                                span.setAttribute(
                                                    "data-uid",
                                                    result.dataitem.uid
                                                );
                                                span.textContent =
                                                    newPlace.title;

                                                range.deleteContents();
                                                range.insertNode(span);
                                                window
                                                    .getSelection()
                                                    .removeAllRanges();

                                                attachSpanClickEvents(
                                                    view,
                                                    span
                                                );

                                                //Push to featureMap
                                                featureMap.set(
                                                    result.dataitem.uid,
                                                    {
                                                        id: result.dataitem.uid,
                                                        name: newPlace.title,
                                                        latitude: latitude,
                                                        longitude: longitude,
                                                    }
                                                );
                                            },
                                            error: function (response) {
                                                alert(
                                                    "Error adding text context:",
                                                    response
                                                );
                                            },
                                        });
                                    },
                                    error: function (response) {
                                        alert("Error adding place:", response);
                                    },
                                });
                            } else if (currentSelectedPlaceUID != null) {
                                //Modify existing place
                                //Get selected features
                                let selectedFeatureName = featureMap.get(
                                    currentSelectedPlaceUID
                                ).name;
                                let editedFeatureUIDs = [];
                                if (
                                    document.getElementById("applyAllCheckbox")
                                        .checked
                                ) {
                                    featureMap.forEach((value, key) => {
                                        if (
                                            value.name === selectedFeatureName
                                        ) {
                                            editedFeatureUIDs.push(key);
                                        }
                                    });
                                } else {
                                    editedFeatureUIDs.push(
                                        currentSelectedPlaceUID
                                    );
                                }

                                editedFeatureUIDs.forEach((uid) => {
                                    $.ajax({
                                        type: "GET",
                                        url: "https://test-ghap.tlcmap.org//ajaxedittextplacecoordinates",
                                        data: {
                                            uid: uid,
                                            latitude: latitude,
                                            longitude: longitude,
                                        },
                                        success: function () {
                                            closeEditPopup();

                                            refreshGeoJSONLayer(
                                                GeoJSONLayer,
                                                view,
                                                clusterConfig
                                            );

                                            removePopupElements();

                                            //Update new coordinates in the featureMap
                                            featureMap.get(uid).latitude =
                                                latitude;
                                            featureMap.get(uid).longitude =
                                                longitude;
                                        },
                                        error: function (response) {
                                            alert(
                                                "Error editing place:",
                                                response
                                            );
                                        },
                                    });
                                });
                            }
                        }
                    });

                document
                    .getElementById("unsetButton")
                    .addEventListener("click", function () {
                        if (
                            currentViewMode == "edit" &&
                            currentSelectedPlaceUID != null
                        ) {
                            document.getElementById("latitudeInput").value = currentSelectedPlaceLatitude;
                            document.getElementById("longitudeInput").value = currentSelectedPlaceLongitude;
                            graphicsLayer.removeAll();
                        }
                    });
                // Click on map behavior
                view.on("click", (event) => {
                    if (
                        currentViewMode == "edit" &&
                        (currentSelectedPlaceUID != null || isAddNewPlace) &&
                        document.getElementById("editPopup").style.display ==
                            "block"
                    ) {
                        event.stopPropagation();

                        graphicsLayer.removeAll();

                        document.getElementById("latitudeInput").value =
                            event.mapPoint.latitude.toFixed(6);
                        document.getElementById("longitudeInput").value =
                            event.mapPoint.longitude.toFixed(6);

                        // Function to add the blink class and remove it after animation completes
                        function addBlinkEffect(element) {
                            element.classList.add("blink");
                            setTimeout(() => {
                                element.classList.remove("blink");
                            }, 1500); // Duration should match the CSS animation duration
                        }

                        // Apply the blink effect to both latitude and longitude inputs
                        addBlinkEffect(
                            document.getElementById("latitudeInput")
                        );
                        addBlinkEffect(
                            document.getElementById("longitudeInput")
                        );

                        // Remove the previous div if it exists
                        const pointGraphic = new Graphic({
                            geometry: {
                                type: "point",
                                longitude: event.mapPoint.longitude,
                                latitude: event.mapPoint.latitude,
                            },
                            symbol: {
                                type: "simple-marker",
                                color: "white",
                                outline: { color: "blue", width: 1 },
                            },
                        });

                        // Add the point graphic to the graphics layer
                        graphicsLayer.add(pointGraphic);
                    }
                });

                //Add place behaviour// Mufeng, after something need to rebind again.
                //Adding place not getting right if multiple same name
                document
                    .getElementById("textcontent")
                    .addEventListener("mouseup", () => {
                        if (
                            currentViewMode == "edit" &&
                            currentSelectedPlaceUID == null &&
                            (document.getElementById("editPopup").style
                                .display == "" ||
                                document.getElementById("editPopup").style
                                    .display == null ||
                                document.getElementById("editPopup").style
                                    .display == "none")
                        ) {
                            const selection = window.getSelection();
                            const selectedText = selection.toString();

                            // Check if text is selected
                            if (selectedText.length > 0) {
                                // Check if selection includes an existing span (place)
                                const range = selection.getRangeAt(0);
                                const rangeRect = range.getBoundingClientRect();

                                //Check if the selection include existing place
                                const spansInRange = Array.from(
                                    range
                                        .cloneContents()
                                        .querySelectorAll("span[data-uid]")
                                );
                                if (spansInRange.length > 0) {
                                    alert(
                                        "Selection includes an existing place. Please select a different area."
                                    );
                                    return;
                                }

                                // Ensure selection includes only whole words
                                const wholeWordRegex = /^\b[\w\s]+\b$/;
                                if (!wholeWordRegex.test(selectedText)) {
                                    alert(
                                        "Your select should not include partial words."
                                    );
                                    return;
                                }

                                const originalHTML =
                                    document.getElementById(
                                        "textcontent"
                                    ).innerHTML;
                                const originalText = config.textContent;

                                const countOccurrences = (text, searchText) => {
                                    const regex = new RegExp(
                                        `\\b${searchText}\\b`,
                                        "g"
                                    );
                                    const matches = text.match(regex);
                                    return matches ? matches.length : 0;
                                };

                                // Get occurrence count in innerHTML
                                const occurrenceNumber = countOccurrences(
                                    originalHTML,
                                    selectedText
                                );

                                function findNthOccurrence(
                                    text,
                                    searchText,
                                    n
                                ) {
                                    const regex = new RegExp(
                                        `\\b${searchText}\\b`,
                                        "g"
                                    );
                                    let match;
                                    let occurrenceCount = 0;

                                    // Iterate over regex matches to find the nth occurrence
                                    while (
                                        (match = regex.exec(text)) !== null
                                    ) {
                                        occurrenceCount++;
                                        if (occurrenceCount === n) {
                                            return match.index;
                                        }
                                    }

                                    // Return -1 if the nth occurrence is not found
                                    return -1;
                                }

                                // Find the start index of the nth occurrence in config.textContent
                                const start_index = findNthOccurrence(
                                    originalText,
                                    selectedText,
                                    occurrenceNumber
                                );

                                if (start_index === -1) {
                                    alert(
                                        "Your select should not include partial words."
                                    );
                                    return;
                                }

                                const end_index =
                                    start_index + selectedText.length; // End index is exclusive

                                //Show edit popuip
                                const editPopup =
                                    document.getElementById("editPopup");
                                editPopup.style.display = "block";
                                document.getElementById(
                                    "changeAllPlace"
                                ).style.display = "none";

                                const popupY =
                                    rangeRect.bottom + window.scrollY + 10;
                                const popupRect =
                                    editPopup.getBoundingClientRect();

                                editPopup.style.top = `${popupY}px`;

                                const arrowOffset =
                                    rangeRect.left +
                                    rangeRect.width / 2 -
                                    popupRect.left;

                                // Set the arrow's left position dynamically
                                editPopup.style.setProperty(
                                    "--arrow-left",
                                    `${arrowOffset}px`
                                );

                                // Clear or prefill inputs if needed
                                document.getElementById("latitudeInput").value =
                                    null;
                                document.getElementById(
                                    "longitudeInput"
                                ).value = null;
                                document.getElementById(
                                    "applyAllCheckboxText"
                                ).innerText =
                                    "Apply to all linked '" +
                                    selectedText +
                                    "' places in this Text";
                                document.getElementById(
                                    "applyAllCheckbox"
                                ).checked = false;

                                isAddNewPlace = true;
                                newPlace = {
                                    title: selectedText,
                                    start_index: start_index,
                                    end_index: end_index,
                                    dataset_id: config.datasetID,
                                };
                            }
                        }
                    });

                //Refresh map behavior
                document
                    .getElementById("refreshMapButton")
                    .addEventListener("click", function () {
                        if (
                            currentViewMode == "edit" &&
                            currentSelectedPlaceUID != null &&
                            document.getElementById("editPopup").style
                                .display == "block"
                        ) {
                            const latitude = parseFloat(
                                document.getElementById("latitudeInput").value
                            );
                            const longitude = parseFloat(
                                document.getElementById("longitudeInput").value
                            );

                            // Verify that latitude and longitude are valid
                            if (
                                isNaN(latitude) ||
                                isNaN(longitude) ||
                                latitude < -90 ||
                                latitude > 90 ||
                                longitude < -180 ||
                                longitude > 180
                            ) {
                                alert(
                                    "Invalid latitude or longitude values. Please check your input."
                                );
                                return;
                            }

                            graphicsLayer.removeAll();

                            const pointGraphic = new Graphic({
                                geometry: {
                                    type: "point",
                                    longitude: longitude,
                                    latitude: latitude,
                                },
                                symbol: {
                                    type: "simple-marker",
                                    color: "white",
                                    outline: { color: "blue", width: 1 },
                                },
                            });

                            // Add the point graphic to the graphics layer
                            graphicsLayer.add(pointGraphic);

                            view.goTo({
                                center: [longitude, latitude],
                                zoom: 11,
                            });
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
            })
            .catch((err) => console.error(err));
    });
})();
