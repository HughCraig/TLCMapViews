(function () {
  var urlParams = new URLSearchParams(window.location.search);
  var urltoload = urlParams.get("load");

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

  /**
   * Update the renderer with the updated color visual variable object
   * from the ColorSlider widget.
   *
   * @param {object} layer - The ArcGIS layer object whose renderer will be updated.
   * @param {object} colorSlider - The ColorSlider widget containing updated color stops.
   * @return {void}
   */
  function changeEventHandler(layer, colorSlider) {
    const renderer = layer.renderer.clone();
    const colorVariable = renderer.visualVariables[0].clone();
    const outlineVariable = renderer.visualVariables[1];
    colorVariable.stops = colorSlider.stops;
    renderer.visualVariables = [colorVariable, outlineVariable];
    layer.renderer = renderer;
  }

  /**
   * Generates a quantity-based point renderer with a color slider for an ArcGIS layer.
   *
   * This function creates a continuous color renderer for a point layer based on a specified field,
   * and sets up a color slider to interactively adjust the renderer.
   *
   * @param {esri.layers.FeatureLayer} layer - The feature layer to apply the renderer to.
   * @param {esri.views.MapView|esri.views.SceneView} view - The current map or scene view.
   * @param {string} fieldKey - The field name to base the renderer on.
   * @param {number[]} fieldValue - Array of field values for quartile lines (25%, 50%, 75%).
   * @param {esri.widgets.ColorSlider} ColorSlider - The ColorSlider constructor from the ArcGIS API.
   * @param {esri.smartMapping.renderers} colorRendererCreator - The color renderer creator from smartMapping.
   * @param {Function} histogram - The histogram function from the ArcGIS API.
   * @param {esri.Color} Color - The Color constructor from the ArcGIS API.
   * @param {esri.smartMapping.symbology} colorSchemes - The color schemes module from smartMapping.
   * @returns {void}
   *
   */
  function generateQtyPointRenderer(
    layer,
    view,
    fieldKey,
    fieldValue,
    ColorSlider,
    colorRendererCreator,
    histogram,
    Color,
    colorSchemes
  ) {
    // Ivy's note: not sure why noDataColor can't be reset in rendererResult afterward
    let customColorScheme = colorSchemes.getSchemes({
      geometryType: "point",
      theme: "above-and-below",
    });
    // It doesn't work...
    const noDataColor = new Color("orange");
    customColorScheme.primaryScheme.noDataColor = noDataColor;

    let colorParams = {
      layer: layer,
      field: fieldKey,
      view: view,
      colorScheme: customColorScheme.primaryScheme,
      outlineOptimizationEnabled: true,
      defaultSymbolEnabled: false,
      sizeOptimizationEnabled: true,
    };
    let rendererResult;

    // Create the color slider promise
    colorRendererCreator
      .createContinuousRenderer(colorParams)
      .then((response) => {
        // Set the renderer to the layer and add it to the map
        rendererResult = response;
        // Reset the size of points
        let defaultSize = 12;
        rendererResult.renderer.visualVariables.forEach((vVariable) => {
          if (vVariable.type === "size" && vVariable.stops) {
            vVariable.stops.forEach((stop) => {
              stop.size = defaultSize;
            });
          }
        });
        layer.renderer.visualVariables =
          rendererResult.renderer.visualVariables;

        // Generate a histogram for use in the slider. Input the layer
        // and field or arcade expression to generate it.
        return histogram({
          layer: layer,
          field: colorParams.field,
          view: view,
          numBins: 80,
        });
      })
      .then((histogramResult) => {
        // Construct a color slider from the result of both
        // smart mapping renderer and histogram methods
        const colorSlider = ColorSlider.fromRendererResult(
          rendererResult,
          histogramResult
        );

        // format colorSlider
        colorSlider.set({
          container: "pointSlider",
          primaryHandleEnabled: true,
          handlesSyncedToPrimary: false,
          visibleElements: {
            interactiveTrack: true,
          },
          syncedSegmentsEnabled: true,
          // Round labels to 2 decimal place
          labelFormatFunction: (value) => {
            return value.toFixed(2);
          },
        });
        colorSlider.viewModel.precision = 2;

        // hide default statistic lines from slider histogram
        colorSlider.histogramConfig.standardDeviation = null;
        colorSlider.histogramConfig.average = null;

        // render quartile data lines on the slider
        if (fieldValue) {
          const percentages = ["25%", "50%", "75%"];
          colorSlider.histogramConfig.dataLines = fieldValue.map(
            (value, i) => ({
              value: value,
              label: `${percentages[i]}, (${value})`,
            })
          );
        }

        colorSlider.on(
          [
            "thumb-change",
            "thumb-drag",
            "min-change",
            "max-change",
            "segment-drag",
          ],
          () => changeEventHandler(layer, colorSlider)
        );
      });
  }

  /**
   * Creates a CIM (Cartographic Information Model) line symbol with an arrow marker.
   *
   * This function generates a complex line symbol configuration for use with ArcGIS API for JavaScript.
   * The symbol includes a solid line stroke and arrow markers placed along the line.
   *
   * @param {number[]} color - An array representing the RGB color values for the line and arrows (e.g., [255, 0, 0] for red).
   * @param {number} width - The width of the line in points.
   * @returns {Object} A CIM symbol object that can be used to style a line graphic or feature layer.
   *
   * @example
   * // Create a red arrow-line symbol with a width of 2
   * const redLineSymbol = createLineSymbol([255, 0, 0], 2);
   */
  function createLineSymbol(color, width) {
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
              width: width,
              color: color,
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
                        color: color,
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
   * Customize an expand/collapse button for the legend.
   *
   * @param {HTMLElement} legendDiv - The DOM element containing the legend.
   * @returns {HTMLButtonElement} The created button element.
   */
  function createExpandButton(legendDiv) {
    const button = document.createElement("button");
    button.className = "esri-widget--button";
    button.title = "Expand/Collapse Legends";

    const icon = document.createElement("span");
    icon.className = "esri-icon esri-icon-collapse";
    button.appendChild(icon);

    button.onclick = () => toggleLegend(legendDiv, button);

    return button;
  }

  /**
   * Toggles the visibility of the legend and updates the state of button created by createExpandButton .
   *
   * @param {HTMLElement} legendDiv - The DOM element containing the legend.
   * @param {HTMLButtonElement} button - The button used to toggle the legend.
   */
  function toggleLegend(legendDiv, button) {
    const isExpanded = legendDiv.style.display !== "none";
    legendDiv.style.display = isExpanded ? "none" : "block";
    button.setAttribute("aria-expanded", !isExpanded);

    const icon = button.querySelector(".esri-icon");
    icon.className = `esri-icon esri-icon-${
      isExpanded ? "legend" : "collapse"
    }`;
  }

  /**
   * Initializes the expand/collapse functionality for the legend of mobility layer.
   *
   * @param {Object} view - The MapView or SceneView instance.
   * @param {HTMLElement} legendDiv - The DOM element containing the legend.
   */
  function initializeMobilityLegendExpand(view, legendDiv) {
    const expandButton = createExpandButton(legendDiv);
    view.ui.add(expandButton, "bottom-left");

    legendDiv.style.display = "block";
    expandButton.setAttribute("aria-expanded", "true");
  }

  /**
   * Creates a Legend widget for the mobility map.
   *
   * @param {Object} Legend - The Legend class from the ArcGIS API for JavaScript.
   * @param {Object} view - The MapView or SceneView instance.
   * @param {Object} geojsonPointLayer - The GeoJSON point layer to be included in the legend.
   * @param {Object} [geojsonLineLayer=null] - The optional GeoJSON line layer to be included in the legend.
   * @returns {Object} The created Legend widget instance.
   */
  function createLegend(
    Legend,
    view,
    geojsonPointLayer,
    geojsonLineLayer = null
  ) {
    const layerInfos = [
      {
        layer: geojsonPointLayer,
        title: "Place",
        respectCurrentMapScale: false,
      },
    ];

    if (geojsonLineLayer) {
      layerInfos.push({
        layer: geojsonLineLayer,
        title: "Route",
      });
    }

    return new Legend({
      view: view,
      container: "legendDiv",
      layerInfos: layerInfos,
    });
  }

  /**
   * Modifies the quantity-related legend in the map.
   *
   * @param {Object} reactiveUtils - Utility for reactive programming in ArcGIS JS API.
   * @param {Function} SimpleMarkerSymbol - Constructor for creating simple marker symbols in ArcGIS JS API.
   * @param {Object} symbolUtils - Utilities for symbol manipulation in ArcGIS JS API.
   * @param {Object} legend - The legend widget to be modified.
   * @param {boolean} [hasRoute=true] - Indicates if the layer has route data.
   * @returns {Promise<Object>} A promise that resolves with the modified legend.
   */
  function modifyQuantityLegend(
    reactiveUtils,
    SimpleMarkerSymbol,
    symbolUtils,
    legend,
    hasRoute = true
  ) {
    // Set timeout for 10 seconds
    const timeout = 10000;
    // Create a promise that rejects after the timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Timeout waiting for Place layer")),
        timeout
      )
    );
    // Helper function to find the Place layer info
    const findPlaceLayerInfo = () =>
      legend.activeLayerInfos.find((item) => item.title === "Place");

    return Promise.race([
      reactiveUtils.when(
        () => {
          const placeLayerInfo = findPlaceLayerInfo();
          return placeLayerInfo?.legendElements?.length > 1;
        },
        () => {
          try {
            const placeLayerInfo = findPlaceLayerInfo();
            if (!placeLayerInfo) throw new Error("Place layer info not found");
            // Remove the default color-ramp from the point layer
            placeLayerInfo.legendElements =
              placeLayerInfo.legendElements.filter(
                (element) => element.type !== "color-ramp"
              );
            // Modify symbol-table
            placeLayerInfo.legendElements.forEach((element) => {
              if (element.type === "symbol-table") {
                if (hasRoute) {
                  // For route: Rename "others" to "Place without Quantity"
                  element.infos = element.infos.map((info) =>
                    info.label === "others"
                      ? { ...info, label: "Place without Quantity" }
                      : info
                  );
                } else {
                  // For non-route: Add a new symbol for "Place without Quantity"
                  const targetInfoIndex =
                    element.infos.findIndex(
                      (info) => info.label === "Place with Quantity"
                    ) + 1;
                  if (targetInfoIndex !== 0) {
                    const noQtySymbol = new SimpleMarkerSymbol({
                      style: "diamond",
                      color: "orange",
                      outline: { color: "white" },
                    });
                    return symbolUtils
                      .renderPreviewHTML(noQtySymbol, { node: null })
                      .then((previewImage) => {
                        element.infos[targetInfoIndex] = {
                          ...element.infos[targetInfoIndex],
                          symbol: noQtySymbol,
                          label: "Place without Quantity",
                          preview: previewImage,
                        };
                      });
                  }
                }
              }
            });

            return legend;
          } catch (error) {
            console.error("Error modifying quantity legend:", error);
            throw new Error("Failed to modify quantity legend");
          }
        }
      ),
      timeoutPromise,
    ]).catch((error) => {
      console.error("Error or timeout in modifyQuantityLegend:", error);
      return legend;
    });
  }

  /**
   * Displays a loading indicator with a custom message.
   *
   * This function creates a calcite-loader element and adds it to the document body.
   * The loader is positioned in the center of the screen and displays the provided message.
   *
   * @param {string} [message="Loading data, please wait..."] - The message to display in the loader.
   * @returns {void}
   */
  function showLoader(message = "Loading data, please wait...") {
    const loader = document.createElement("calcite-loader");
    loader.setAttribute("id", "dataLoader");
    loader.setAttribute("active", "");
    loader.setAttribute("text", message);
    loader.style.position = "fixed";
    loader.style.top = "50%";
    loader.style.left = "50%";
    loader.style.transform = "translate(-50%, -50%)";
    loader.style.zIndex = "1000";
    document.body.appendChild(loader);
  }

  /**
   * Removes the loading indicator from the document.
   *
   * This function finds the loader element by its ID and removes it from the DOM.
   * If the loader element is not found, the function does nothing.
   *
   * @returns {void}
   */
  function hideLoader() {
    const loader = document.getElementById("dataLoader");
    if (loader) {
      loader.remove();
    }
  }

  showLoader();

  require([
    "esri/Map",
    "esri/Color",
    "esri/layers/GeoJSONLayer",
    "esri/views/MapView", //CIMLineSymbol is currently not work in SceneView, source: https://developers.arcgis.com/javascript/latest/sample-code/cim-line-arrows/
    "esri/widgets/Expand",
    "esri/widgets/BasemapGallery",
    "esri/widgets/smartMapping/ColorSlider",
    "esri/smartMapping/renderers/color",
    "esri/smartMapping/statistics/histogram",
    "esri/core/reactiveUtils",
    "esri/smartMapping/symbology/color",
    "esri/widgets/Legend",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/support/symbolUtils",
  ], function (
    Map,
    Color,
    GeoJSONLayer,
    MapView,
    Expand,
    BasemapGallery,
    ColorSlider,
    colorRendererCreator,
    histogram,
    reactiveUtils,
    colorSchemes,
    Legend,
    SimpleMarkerSymbol,
    symbolUtils
  ) {
    loadConfig(urltoload)
      .then((config) => {
        var map = new Map({
          basemap: config.basemap,
          ground: "world-elevation",
          layers: [],
        });

        var pointData = filterDataByGeometryType(config.data, "Point");
        var lineData = filterDataByGeometryType(config.data, "LineString");
        const template = loadPopUpTemplate(config);
        const hasQuantity = config.data.metadata.has_quantity;
        const hasRoute = lineData.features.length > 0;

        // construct the line layer
        if (hasRoute) {
          const blob = new Blob([JSON.stringify(lineData)], {
            type: "application/json",
          });
          const lineDataUrl = URL.createObjectURL(blob);

          var geojsonLineLayer = new GeoJSONLayer({
            url: lineDataUrl,
            copyright:
              "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
            popupEnabled: config.popupEnabled,
            popupTemplate: template,
            renderer: {
              type: "unique-value",
              valueExpression:
                "IIF($feature.route_size > 1, 'multi-place-route', 'single-place-route')",
              uniqueValueInfos: [
                {
                  value: "multi-place-route",
                  symbol: createLineSymbol([210, 210, 210, 200], 2),
                  label: "Multi-place Route",
                },
                {
                  value: "single-place-route",
                  symbol: createLineSymbol([255, 165, 0, 255], 4),
                  label: "Single-place Route",
                },
              ],
            },
          });
          map.layers.add(geojsonLineLayer);
        }

        // construct the point layer
        const blob = new Blob([JSON.stringify(pointData)], {
          type: "application/json",
        });
        const pointDataUrl = URL.createObjectURL(blob);
        let initialPointRenderer = null;

        if (!hasQuantity && !hasRoute) {
          throw new Error(
            "Invalid mobility layer: Both quantity and route are missing."
          );
        }
        if (hasRoute && hasQuantity) {
          initialPointRenderer = {
            type: "unique-value",
            valueExpression:
              "IIF($feature.route_id == null, 'null', 'not-null')",
            uniqueValueInfos: [
              {
                value: "null",
                label: "Discrete Place",
                symbol: {
                  type: "simple-marker",
                  style: "circle",
                  color: "orange",
                  outline: {
                    color: "grey",
                  },
                },
              },
              {
                value: "not-null",
                label: "Place in Route",
                symbol: {
                  type: "simple-marker",
                  style: "diamond",
                  color: "orange",
                  outline: {
                    color: "grey",
                  },
                },
              },
            ],
            defaultSymbol: {
              type: "simple-fill",
              label: "Place without Quantity",
              color: "orange",
              outline: {
                color: "grey",
              },
              style: "solid",
            },
          };
        } else if (!hasRoute && hasQuantity) {
          initialPointRenderer = {
            type: "simple",
            label: "Place with Quantity",
            symbol: {
              type: "simple-marker",
              color: "orange",
              outline: {
                color: "white",
              },
            },
          };
        } else if (hasRoute && !hasQuantity) {
          initialPointRenderer = {
            type: "unique-value",
            valueExpression:
              "IIF($feature.route_id == null, 'null', 'not-null')",
            uniqueValueInfos: [
              {
                value: "null",
                label: "Discrete Place",
                symbol: {
                  type: "simple-marker",
                  style: "circle",
                  color: "orange",
                  outline: {
                    color: "grey",
                  },
                },
              },
              {
                value: "not-null",
                label: "Place in Route",
                symbol: {
                  type: "simple-marker",
                  style: "diamond",
                  color: "orange",
                  outline: {
                    color: "grey",
                  },
                },
              },
            ],
          };
        }
        const geojsonPointLayer = new GeoJSONLayer({
          title: "Points of Places ",
          url: pointDataUrl,
          copyright:
            "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
          popupTemplate: template,
          popupEnabled: config.popupEnabled,
          legendEnabled: true,
          renderer: initialPointRenderer,
        });
        map.layers.add(geojsonPointLayer);

        var view = new MapView({
          container: "viewDiv",
          center: [131.034742, -25.345113],
          zoom: 3,
          map: map,
          constraints: {
            minZoom: 3, // avoid white border in extrem zooming out
          },
        });

        view.when(() => {
          hideLoader();
        });

        const legendDiv = document.getElementById("legendDiv");
        // Fetch quantiles if quantity exists
        const log_quantiles = config.data.metadata.log_quantiles;
        const quantiles = config.data.metadata.quantiles;

        const processingChain = [];
        if (hasQuantity) {
          processingChain.push(() =>
            reactiveUtils
              .whenOnce(() => !view.updating)
              .then(() =>
                generateQtyPointRenderer(
                  geojsonPointLayer,
                  view,
                  "quantity",
                  quantiles,
                  ColorSlider,
                  colorRendererCreator,
                  histogram,
                  Color,
                  colorSchemes
                )
              )
          );
        }
        processingChain.push(() => {
          const legend = createLegend(
            Legend,
            view,
            geojsonPointLayer,
            hasRoute ? geojsonLineLayer : null
          );
          return hasQuantity
            ? modifyQuantityLegend(
                reactiveUtils,
                SimpleMarkerSymbol,
                symbolUtils,
                legend,
                hasRoute
              )
            : legend;
        });

        processingChain.push((legend) => {
          initializeMobilityLegendExpand(view, legendDiv);
          return legend;
        });

        processingChain
          .reduce(
            (chain, currentFunction) => chain.then(currentFunction),
            Promise.resolve()
          )
          .catch((error) => {
            console.error("Error in processing legend:", error);
          });

        // Not sure why but timeout is needed to avoid the 'AbortError' Promise error.
        // This problem could happens on the original code as well(30% change) which prevent the initial zoom/center setting
        geojsonPointLayer.queryExtent().then(function (results) {
          setTimeout(function () {
            view.goTo({
              target: results.extent,
              zoom: 3,
              duration: 800,
            });
          }, 2000);
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
      })
      .catch((err) => console.error(err));
  });
})();
