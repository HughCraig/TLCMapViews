(function () {
  // Get the base map from the query string.
  const urlParams = new URLSearchParams(window.location.search);
  const urltoload = urlParams.get("load");

  // Import ArcGIS JS modules.
  require([
    "esri/Map",
    "esri/views/SceneView",
    "esri/widgets/Expand",
    "esri/widgets/BasemapGallery",
    "esri/widgets/LayerList",
    "esri/layers/GraphicsLayer",
    "esri/Graphic",
    "esri/core/promiseUtils",
    "esri/geometry/Extent",
    "esri/geometry/Polyline",
    "esri/geometry/support/geodesicUtils",
    "esri/geometry/support/normalizeUtils",
  ], function (
    Map,
    SceneView,
    Expand,
    BasemapGallery,
    LayerList,
    GraphicsLayer,
    Graphic,
    promiseUtils,
    Extent,
    Polyline,
    geodesicUtils,
    normalizeUtils
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
            const color = config.datasetsConfig[i].layerContent.color;

            legend.addItem(config.datasetsConfig[i].name, color);

            const template = loadPopUpTemplate(config.datasetsConfig[i].config); //Load individual dataset config

            const graphicsLayer = new GraphicsLayer({
              id: config.datasetsConfig[i].id,
              title: config.datasetsConfig[i].name,
              copyright:
                "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
              popupEnabled: config.datasetsConfig[i].config.popupEnabled,
            });

            const pointSymbol = {
              type: "simple-marker",
              color: color,
              outline: {
                color: "white",
              },
            };

            const data = config.datasetsConfig[i].config.data;

            data.features.forEach((feature) => {
              if (feature.geometry.type === "Point") {
                const point = new Graphic({
                  geometry: {
                    type: "point",
                    longitude: feature.geometry.coordinates[0],
                    latitude: feature.geometry.coordinates[1],
                  },
                  symbol: pointSymbol,
                  attributes: feature.properties,
                  popupTemplate: template,
                });
                graphicsLayer.add(point);
              } else if (feature.geometry.type === "LineString") {
                let lineStringPaths = [];

                const promise = (async (feature) => {
                  let modifiedJourneyLines = await modifyJourneyLines(
                    feature.geometry.coordinates,
                    Polyline,
                    geodesicUtils,
                    normalizeUtils
                  );

                  modifiedJourneyLines.forEach((coordinates) => {
                    lineStringPaths.push(coordinates);
                  });
                })(feature);

                promise.then(() => {
                  const line = new Graphic({
                    geometry: {
                      type: "polyline",
                      paths: lineStringPaths,
                    },
                    symbol: {
                      type: "simple-line",
                      color:
                        feature.display && feature.display.color
                          ? feature.display.color
                          : color,
                      width:
                        feature.display && feature.display.lineWidth
                          ? feature.display.lineWidth.toString()
                          : "2",
                    },
                    attributes: feature.properties,
                    popupTemplate: template,
                  });

                  graphicsLayer.add(line);
                });
              }
            });

            layers.push(graphicsLayer);
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

        //Merge all extents of layers and go to the merged extent.
        let allGraphics = [];
        for (let i = 0; i < layers.length; i++) {
          allGraphics = allGraphics.concat(layers[i].graphics.items);
        }

        let xmin = Infinity;
        let ymin = Infinity;
        let xmax = -Infinity;
        let ymax = -Infinity;

        allGraphics.forEach((graphic) => {
          let gExtent = graphic.geometry.extent;
          if (gExtent) {
            xmin = Math.min(xmin, gExtent.xmin);
            ymin = Math.min(ymin, gExtent.ymin);
            xmax = Math.max(xmax, gExtent.xmax);
            ymax = Math.max(ymax, gExtent.ymax);
          } else if (graphic.geometry.type === "point") {
            // For point type geometry, use the point's coordinates
            xmin = Math.min(xmin, graphic.geometry.x);
            ymin = Math.min(ymin, graphic.geometry.y);
            xmax = Math.max(xmax, graphic.geometry.x);
            ymax = Math.max(ymax, graphic.geometry.y);
          }
        });

        const allExtent = new Extent({
          xmin: xmin,
          ymin: ymin,
          xmax: xmax,
          ymax: ymax,
          spatialReference: view.spatialReference,
        });

        setTimeout(function () {
          view.goTo(allExtent);
        }, 800);

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
              event.item.layer.queryExtent().then(function (result) {
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
            $(infoDiv).append('<div class="legend-container"></div>');
            legend.render($(infoDiv).find(".legend-container"));
          }
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
