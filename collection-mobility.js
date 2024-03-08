(function () {
  // Get the base map from the query string.
  const urlParams = new URLSearchParams(window.location.search);
  const urltoload = urlParams.get("load");

  /**
   * Creates a CIM line symbol based on the provided feature, color, and width.
   *
   * @param {object} feature - The feature object containing display properties.
   * @param {number[]} color - The color array in the format [r, g, b, a].
   * @param {number} width - The width of the line symbol.
   * @return {object} - The CIM line symbol object.
   */
  function createLineSymbol(feature, color = [255, 255, 255, 255], width = 2) {
    if (JSON.stringify(color) !== JSON.stringify([255, 255, 255, 255])) {
      appliedColor = color;
    } else {
      appliedColor =
        feature.display && feature.display.color
          ? feature.display.color
          : color;
    }
    if (width !== 2) {
      appliedWidth = width;
    } else {
      appliedWidth =
        feature.display && feature.display.lineWidth
          ? feature.display.lineWidth.toString()
          : width.toString();
    }

    return {
      type: "cim",
      data: {
        type: "CIMSymbolReference",
        symbol: {
          type: "CIMLineSymbol",
          symbolLayers: [
            {
              type: "CIMSolidStroke",
              enable: true,
              width: appliedWidth,
              color: appliedColor,
            },
            {
              type: "CIMVectorMarker",
              enable: true,
              size: 5,
              markerPlacement: {
                type: "CIMMarkerPlacementAlongLineSameSize",
                endings: "WithMarkers",
                placementTemplate: [16],
                angleToLine: true,
              },
              frame: {
                xmin: -3,
                ymin: -3,
                xmax: 3,
                ymax: 3,
              },
              markerGraphics: [
                {
                  type: "CIMMarkerGraphic",
                  geometry: {
                    rings: [
                      [
                        [-8, -5.47],
                        [-8, 5.6],
                        [1.96, -0.03],
                        [-8, -5.47],
                      ],
                    ],
                  },
                  symbol: {
                    type: "CIMPolygonSymbol",
                    symbolLayers: [
                      {
                        type: "CIMSolidFill",
                        enable: true,
                        color: appliedColor,
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    };
  }

  /**
   * update the renderer with the updated color visual variable object
   * from the ColorSlider widget.
   *
   * @param {object} layer - The ArcGIS layer object whose renderer will be updated.
   * @param {object} colorSlider - The ColorSlider widget containing updated color stops.
   * @return {void}
   */
  function changeEventHandler(layers, colorSlider) {
    layers.forEach(function (layer) {
      const renderer = layer.renderer.clone();
      const colorVariable = renderer.visualVariables[0].clone();
      const outlineVariable = renderer.visualVariables[1];
      colorVariable.stops = colorSlider.stops;
      renderer.visualVariables = [colorVariable, outlineVariable];
      layer.renderer = renderer;
    });
  }

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

  // Import ArcGIS JS modules.
  require([
    "esri/Map",
    "esri/Color",
    "esri/layers/GeoJSONLayer",
    "esri/layers/GroupLayer",
    "esri/views/MapView", //CIMLineSymbol is currently not work in SceneView, source: https://developers.arcgis.com/javascript/latest/sample-code/cim-line-arrows/
    "esri/widgets/Expand",
    "esri/widgets/BasemapGallery",
    "esri/widgets/LayerList",
    "esri/geometry/Extent",
    "esri/widgets/smartMapping/ColorSlider",
    "esri/smartMapping/renderers/color",
    "esri/smartMapping/statistics/histogram",
    "esri/core/reactiveUtils",
    "esri/smartMapping/symbology/color",
  ], function (
    Map,
    Color,
    GeoJSONLayer,
    GroupLayer,
    MapView,
    Expand,
    BasemapGallery,
    LayerList,
    Extent,
    ColorSlider,
    colorRendererCreator,
    histogram,
    reactiveUtils,
    colorSchemes
  ) {
    loadCollectionConfig(urltoload)
      .then((config) => {
        // Initiate collection legend.
        const legend = new CollectionLegend();

        // Map of layer ID to layer data.
        const layerDataMap = {};

        // Create array of layer instances.
        const layers = [];

        // Create arry of point data
        const allPointsData = [];

        let hasQty = false;

        if (config.datasetsConfig) {
          for (let i = 0; i < config.datasetsConfig.length; i++) {
            const color = config.datasetsConfig[i].layerContent.color;
            legend.addItem(config.datasetsConfig[i].name, color);
            rgbaColor = Color.fromHex(color);
            rgbaColor = [
              rgbaColor.r,
              rgbaColor.g,
              rgbaColor.b,
              rgbaColor.a * 255,
            ];

            hasQty =
              hasQty ||
              config.datasetsConfig[i].config.data.metadata.has_quantity;

            var pointData = filterDataByGeometryType(
              config.datasetsConfig[i].config.data,
              "Point"
            );
            allPointsData.push(pointData);
            var lineData = filterDataByGeometryType(
              config.datasetsConfig[i].config.data,
              "LineString"
            );
            const template = loadPopUpTemplate(config.datasetsConfig[i].config); //Load individual dataset config

            const wholeLayer = new GroupLayer({
              title: config.datasetsConfig[i].name,
              id: i,
              visible: true,
              visibilityMode: "independent",
              layers: [],
            });

            const pointSymbol = {
              type: "simple-marker",
              color: color,
              outline: {
                color: "white",
              },
            };

            if (lineData.features.length > 0) {
              const blob = new Blob([JSON.stringify(lineData)], {
                type: "application/json",
              });
              const lineDataUrl = URL.createObjectURL(blob);

              var geojsonLineLayer = new GeoJSONLayer({
                url: lineDataUrl,
                id: i,
                title: config.datasetsConfig[i].name + " - Route",
                copyright:
                  "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
                popupTemplate: template,
                renderer: {
                  type: "unique-value",
                  field: "tlcMapUniqueId", // The name of the attribute field containing types or categorical values referenced in uniqueValueInfos or uniqueValueGroups
                  defaultSymbol: {
                    type: "simple-line", // default SimpleLineSymbol
                    color: "white",
                    width: 3,
                  },
                  uniqueValueInfos: lineData.features.map((feature) => ({
                    value: feature.properties.tlcMapUniqueId,
                    symbol: createLineSymbol(feature, rgbaColor),
                  })),
                },
              });
              wholeLayer.add(geojsonLineLayer);
            }

            const blob = new Blob([JSON.stringify(pointData)], {
              type: "application/json",
            });
            const pointDataUrl = URL.createObjectURL(blob);

            const geojsonPointLayer = new GeoJSONLayer({
              url: pointDataUrl,
              id: i,
              title: config.datasetsConfig[i].name + " - Place",
              popupTemplate: template,
              copyright:
                "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
              renderer: {
                type: "simple",
                symbol: pointSymbol,
              },
            });
            wholeLayer.add(geojsonPointLayer);
            layers.push(wholeLayer);

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
        const view = new MapView({
          container: "viewDiv",
          center: [131.034742, -25.345113],
          zoom: 5,
          map: map,
          constraints: {
            minZoom: 1, // avoid white border in extrem zooming out
          },
        });

        //List Pane
        if (config.listPane != "disabled") {
          // Create the layer list widget.
          var layerList = new LayerList({
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
          var basemapGallery = new BasemapGallery();
          var bgExpand = new Expand();
          loadBaseMapGallery(basemapGallery, bgExpand, view);
        }

        //Async function for merging all extents of layers and then going to the merged extent.
        async function goToAllExtent(layers) {
          const responses = await Promise.all(
            layers.map(async (layer) => {
              const sublayerExtents = await Promise.all(
                layer.allLayers
                  .toArray()
                  .map((sublayer) => sublayer.queryExtent())
              );
              return sublayerExtents;
            })
          );

          let allExtent;
          responses.forEach((sublayerExtents) => {
            sublayerExtents.forEach((response) => {
              if (!allExtent) {
                allExtent = response.extent;
              } else {
                allExtent = allExtent.union(response.extent);
              }
            });
          });
          setTimeout(function () {
            view.goTo({
              target: allExtent,
              duration: 800,
            });
          }, 800);
        }

        // Call the async function to go to the merged extent
        goToAllExtent(layers);

        let quantiles = [];

        if (hasQty) {
          legendDiv.style.display = "block"; // Show legendDiv
          var pointLayers = layers.map((gLayer) => {
            let allLayers = gLayer.allLayers.toArray();
            return allLayers[allLayers.length - 1];
          });

          // Ivy's note: not sure why noDataColor can't be reset in rendererResult afterward
          let customColorScheme = colorSchemes.getSchemes({
            geometryType: "point",
            theme: "above-and-below",
          });
          const noDataColor = new Color("orange");
          customColorScheme.primaryScheme.noDataColor = noDataColor;

          /**
           * Generates and updates a color slider for a given layer and view with a custom color scheme.
           *
           * @param {object} layer - The ArcGIS layer object whose renderer will be updated.
           * @param {Array} layers - An array of layers to update with the same renderer.
           * @param {object} view - The ArcGIS view object where the layer is displayed.
           * @param {object} customColorScheme - An object defining the custom color scheme.
           * @param {object} existingSlider - An optional existing ColorSlider object to update.
           * @param {object} colorRendererCreator - The function responsible for creating color renderers.
           * @param {object} histogram - The function responsible for generating histograms.
           * @returns {Promise} - A promise that resolves to a ColorSlider object.
           */
          function generateAndUpdateColorSlider(
            layer,
            layers,
            view,
            customColorScheme,
            existingSlider
          ) {
            let rendererResult;
            let colorParams = {
              layer: layer,
              field: "quantity",
              view: view,
              colorScheme: customColorScheme.primaryScheme,
              outlineOptimizationEnabled: true,
              defaultSymbolEnabled: true,
              sizeOptimizationEnabled: true,
            };
            // Create the color slider promise
            let sliderPromise = colorRendererCreator
              .createContinuousRenderer(colorParams)
              .then((response) => {
                rendererResult = response;
                let defaultSize = 10;
                // Set default size for visual variables
                rendererResult.renderer.visualVariables.forEach((vVariable) => {
                  if (vVariable.type === "size" && vVariable.stops) {
                    vVariable.stops.forEach((stop) => {
                      stop.size = defaultSize;
                    });
                  }
                });
                // Update layer and layers with new renderer
                layer.renderer = rendererResult.renderer;
                layers.forEach(function (updateLayer) {
                  updateLayer.renderer = rendererResult.renderer;
                });
                // Generate histogram for the field
                return histogram({
                  layer: layer,
                  field: colorParams.field,
                  view: view,
                  numBins: 80,
                });
              })
              .then((histogramResult) => {
                // Update existing slider if provided, else create a new one
                if (existingSlider) {
                  existingSlider.updateFromRendererResult(
                    rendererResult,
                    histogramResult
                  );
                  return existingSlider;
                } else {
                  return ColorSlider.fromRendererResult(
                    rendererResult,
                    histogramResult
                  );
                }
              });

            // Finalize and configure color slider
            return sliderPromise.then((colorSlider) => {
              colorSlider.set({
                container: "slider",
                primaryHandleEnabled: true,
                handlesSyncedToPrimary: false,
                visibleElements: { interactiveTrack: true },
                syncedSegmentsEnabled: true,
                labelFormatFunction: (value) => {
                  return value.toFixed(2);
                },
              });
              // Ivy's note: why it doesn't work now...
              colorSlider.viewModel.precision = 2;
              colorSlider.histogramConfig.standardDeviation = null;
              colorSlider.histogramConfig.average = null;
              colorSlider.on(
                [
                  "thumb-change",
                  "thumb-drag",
                  "min-change",
                  "max-change",
                  "segment-drag",
                ],
                () => changeEventHandler(layers, colorSlider)
              );
              return colorSlider;
            });
          }

          /**
           * Retrieves data for visible layers and points based on layer visibility and point layer data.
           *
           * @param {Array} allLayers - An array containing all layers.
           * @param {Array} pointLayers - An array containing point layers.
           * @param {object} allPointsData - An object containing data for all points.
           * @returns {object} - An object containing data for visible layers and points.
           */
          function getVisibleLayersData(allLayers, pointLayers, allPointsData) {
            // Filter layers to get visible array and reduce it to a single object
            const visibleArr = allLayers
              .filter(
                (layer) =>
                  layer.type === "group" ||
                  (layer.type === "geojson" && layer.title.endsWith("- Place"))
              )
              .reduce((acc, layer) => {
                acc[layer.id] = [...(acc[layer.id] || []), layer.visible];
                return acc;
              }, {});

            // Extract values from the visible array and check if any value is false
            const visibleArrValues = Object.values(visibleArr).map(
              (arr) => !arr.some((value) => value === false)
            );

            // Filter point layers based on visibility array values
            const visibleLayers = pointLayers.filter(
              (_, index) => visibleArrValues[index]
            );

            // Initialize empty FeatureCollection for visible points data
            const visiblePointsData = {
              type: "FeatureCollection",
              features: [],
            };

            // Iterate through all point data, add features to visible points data if corresponding layer is visible
            allPointsData.forEach((pointData, index) => {
              if (visibleArrValues[index]) {
                visiblePointsData.features.push(...pointData.features);
              }
            });

            // Create a new GeoJSON layer for visible points
            const visiblePointsLayer = new GeoJSONLayer({
              editingEnabled: true,
            });
            // Convert visible points data to a Blob and set it as the URL for the GeoJSON layer
            visiblePointsLayer.url = URL.createObjectURL(
              new Blob([JSON.stringify(visiblePointsData)], {
                type: "application/json",
              })
            );

            // Return object containing data for visible layers and points
            return {
              visibleLayers,
              visiblePointsLayer,
            };
          }

          reactiveUtils
            .whenOnce(() => !view.updating) // monitor layer's visibility
            .then(() => {
              const { visibleLayers, visiblePointsLayer } =
                getVisibleLayersData(
                  view.map.allLayers,
                  pointLayers,
                  allPointsData
                );
              // Generate color slider for visible point layer once all layers loaded
              generateAndUpdateColorSlider(
                visiblePointsLayer,
                visibleLayers,
                view,
                customColorScheme
              ).then((colorSlider) => {
                // Watch for changes in visibility and update color sliders accordingly
                if (config.listPane != "disabled") {
                  reactiveUtils.watch(() => {
                    const { visibleLayers, visiblePointsLayer } =
                      getVisibleLayersData(
                        view.map.allLayers,
                        pointLayers,
                        allPointsData
                      );
                    // Update color slider with updated visibility layers
                    generateAndUpdateColorSlider(
                      visiblePointsLayer,
                      visibleLayers,
                      view,
                      customColorScheme,
                      colorSlider
                    );
                  });
                }
              });
            });
        }
      })
      .catch((err) => console.error(err));
  });
})();
