/**
 * Loading and re-configure the information block.
 * @param {Object} config   User Configurations from JSON url input
 * @param {Object} infoDivExpand  ArcGIS Expand widget
 * @param {Object} view ArcGIS MapView
 */
function loadInfoBlock(config, infoDivExpand, view) {
    const infoDiv = document.createElement("div");
    infoDiv.id = "infoDiv";

    //Info logo
    if (config.logo) {
        const iconElement = document.createElement("img");
        iconElement.className = "mdicon";
        iconElement.src = config.logo;

        if (config.logoLink != null) {
            let linkElement = document.createElement("a");
            linkElement.href = config.logoLink;
            linkElement.appendChild(iconElement);
            infoDiv.appendChild(linkElement);
        } else {
            infoDiv.appendChild(iconElement);
        }
    }

    //Info title
    if (config.titleText != null) {
        const titleElement = document.createElement("h3");
        titleElement.innerText = config.titleText;

        if (config.titleLink != null) {
            const anchorElement = document.createElement("a");
            anchorElement.href = config.titleLink;
            anchorElement.appendChild(titleElement);
            anchorElement.target = config.titleLinkTarget;
            infoDiv.appendChild(anchorElement);
        } else {
            infoDiv.appendChild(titleElement);
        }
    }

    //Info content
    if (config.content != null && config.content !== "") {
        infoDiv.innerHTML += config.content;
    }

    infoDivExpand.collapsedIconClass = "esri-icon-collapse";
    infoDivExpand.expandedIconClass = "esri-icon-expand";
    infoDivExpand.expandTooltip = "Show";
    infoDivExpand.view = view;
    infoDivExpand.content = infoDiv;
    infoDivExpand.expanded = config.infoDisplay === "hidden" ? false : true;

    view.ui.add(infoDivExpand, "top-right");
}

/**
 * Loading and configuring the baseMap gallery block.
 * @param {Object} basemapGallery ArcGIS BasemapGallery widget
 * @param {Object} bgExpand ArcGIS Expand widget
 * @param {Object} view ArcGIS MapView
 */
function loadBaseMapGallery(basemapGallery, bgExpand, view) {
    basemapGallery.view = view;
    basemapGallery.container = document.createElement("div");

    bgExpand.view = view;
    bgExpand.content = basemapGallery.container;
    bgExpand.expandIconClass = "esri-icon-basemap";

    view.ui.add(bgExpand, "top-right");
}

/**
 * Pop up template format
 * @param {Object} config User Configurations from JSON url input
 * @returns ArcGIS PopupTemplate object
 */
function loadPopUpTemplate(config) {
    //Title
    let formatTitle = function (feature) {
        const id = feature.graphic.attributes.tlcMapUniqueId;
        if (config.popupTemplateMap.has(id)) {
            const title = config.popupTemplateMap.get(id).title;

            let dummyElement = document.createElement("div");
            dummyElement.innerText = title; // Set the title as text of dummyElement
            let safeTitle = dummyElement.innerHTML; // Only return plain text instead of html element

            return safeTitle;
        }
        return "{name}";
    };

    //Content
    let formatContent = function (feature) {
        if (
            config.popupTemplateMap.has(
                feature.graphic.attributes.tlcMapUniqueId
            ) &&
            config.popupTemplateMap.get(
                feature.graphic.attributes.tlcMapUniqueId
            ).content != null &&
            config.popupTemplateMap.get(
                feature.graphic.attributes.tlcMapUniqueId
            ).content != ""
        ) {
            const div = document.createElement("div");
            div.innerHTML = config.popupTemplateMap.get(
                feature.graphic.attributes.tlcMapUniqueId
            ).content;
            return div;
        } else {
            return "<div></div>";
        }
    };

    var template = {
        title: formatTitle,
        content: formatContent,
        outFields: ["*"],
    };

    return template;
}

/**
 * Loading and configuring the renderer.
 * @param {Object} config User Configurations from JSON url input
 * @returns ArcGIS Renderer object
 */
function loadRenderer(config) {
    var renderer = {
        type: "unique-value",
        defaultSymbol: { type: "simple-fill" },
        field: "tlcMapUniqueId", // The name of the attribute field containing types or categorical values referenced in uniqueValueInfos or uniqueValueGroups
        uniqueValueInfos: config.data.features.map((feature) => ({
            value: feature.properties.tlcMapUniqueId,
            symbol: {
                type: "simple-marker",
                color:
                    feature.display && feature.display.color
                        ? feature.display.color
                        : config.color,
                outline: {
                    color: "white",
                },
            },
        })),
    };

    return renderer;
}

/**
 * Loading and configuring the layer.
 * @param {Object} config User Configurations from JSON url input
 * @param {Object} layerLlistExpand ArcGIS Expand widget
 * @param {Object} view ArcGIS MapView
 * @param {Object} layerList ArcGIS LayerList
 */
function loadListPane(config, layerListExpand, view, layerList) {
    (layerListExpand.collapsedIconClass = "esri-icon-collapse"),
        (layerListExpand.expandIconClass = "esri-icon-expand"),
        (layerListExpand.expandTooltip = "Show"),
        (layerListExpand.view = view),
        (layerListExpand.content = layerList),
        (layerListExpand.expanded =
            config.listPane === "hidden" ? false : true),
        view.ui.add(layerListExpand, {
            position: "top-left",
            index: 0,
        });
}

/**
 * Initialize and render the map when no url is given an no data
 * is sent.
 */
function initializeMap(mapType = "MapView") {
    require([
        "esri/Map",
        "esri/views/MapView",
        "esri/widgets/Expand",
        "esri/views/SceneView",
    ], function (Map, MapView, Expand, SceneView) {
        var map = new Map({
            basemap: "hybrid",
            ground: "world-elevation",
        });

        var view;
        if (mapType === "SceneView") {
            view = new SceneView({
                container: "viewDiv",
                center: [131.034742, -25.345113],
                zoom: 3,
                map: map,
            });
        } else {
            view = new MapView({
                container: "viewDiv",
                center: [131.034742, -25.345113],
                zoom: 3,
                map: map,
            });
        }

        const infoDiv = document.createElement("div");
        infoDiv.id = "infoDiv";
        var infoDivExpand = new Expand({
            collapsedIconClass: "esri-icon-collapse",
            expandIconClass: "esri-icon-expand",
            expandTooltip: "Show",
            view: view,
            content: infoDiv,
            expanded: true,
        });

        //Info div logo
        const iconElement = document.createElement("img");
        iconElement.className = "mdicon";
        iconElement.src = "./img/tlcmaplogofull_sm50.png";
        let linkElement = document.createElement("a");
        linkElement.href = "https://www.tlcmap.org";
        linkElement.appendChild(iconElement);
        infoDiv.appendChild(linkElement);

        view.ui.add(infoDivExpand, "top-right");

        return { map: map, view: view };
    });
}
