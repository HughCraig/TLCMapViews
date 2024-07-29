(function () {
  // Get the base map from the query string.
  const urlParams = new URLSearchParams(window.location.search);
  const urltoload = urlParams.get("load");

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
   * Filters and processes quantity layers based on visibility.
   *
   * This function takes all quantity layers and their corresponding data,
   * filters out the visible layers, and creates a new GeoJSON layer
   * containing only the visible quantity points.
   *
   * @param {Function} GeoJSONLayer - The GeoJSONLayer constructor from the ArcGIS API.
   * @param {Array<esri.layers.Layer>} allQtyLayers - An array of all quantity layers.
   * @param {Object} allQtyPointsData - An object containing GeoJSON data for all quantity points, keyed by layer ID.
   * @returns {Object} An object containing:
   *   - hasVisibleQtyLayer {boolean}: Indicates if there are any visible quantity layers.
   *   - visibleQtyGeoJSONLayers {Array<esri.layers.GeoJSONLayer>}: An array of visible GeoJSON quantity layers.
   *   - visibleQtyPointsLayer {esri.layers.GeoJSONLayer}: A new GeoJSON layer containing all visible quantity points.
   *
   */
  function getVisibleQtyLayersData(
    GeoJSONLayer,
    allQtyLayers,
    allQtyPointsData
  ) {
    let hasVisibleQtyLayer = true;
    let visibleQtyGeoJSONLayers = [];
    let visibleQtyPointsLayer = new GeoJSONLayer({
      editingEnabled: true,
    });

    // 1. Group allQtyLayers by layer.id
    const groupedLayers = allQtyLayers.reduce((acc, layer) => {
      if (!acc[layer.id]) {
        acc[layer.id] = [];
      }
      acc[layer.id].push(layer);
      return acc;
    }, {});

    // 2. Filter out visible layer groups
    const visibleLayerGroups = Object.entries(groupedLayers).filter(
      ([id, layers]) => layers.every((layer) => layer.visible)
    );
    if (visibleLayerGroups.length === 0) {
      hasVisibleQtyLayer = false;
      return {
        hasVisibleQtyLayer,
        visibleQtyGeoJSONLayers,
        visibleQtyPointsLayer,
      };
    }

    // 3. Get IDs of visible layer groups
    const visibleLayerIds = visibleLayerGroups.map(([id]) => id);
    const visibleLayerIdSet = new Set(visibleLayerIds);

    visibleQtyGeoJSONLayers = allQtyLayers.filter(
      (layer) => visibleLayerIdSet.has(layer.id) && layer.type === "geojson"
    );

    // 4. Filter allQtyPointsData based on visibleLayerIds
    const visibleQtyData = {
      type: "FeatureCollection",
      features: [],
    };

    visibleLayerIds.forEach((id) => {
      const qtyPointData = allQtyPointsData[id];
      if (qtyPointData && Array.isArray(qtyPointData.features)) {
        visibleQtyData.features.push(...qtyPointData.features);
      }
    });
    visibleQtyPointsLayer.url = URL.createObjectURL(
      new Blob([JSON.stringify(visibleQtyData)], {
        type: "application/json",
      })
    );

    return {
      hasVisibleQtyLayer,
      visibleQtyGeoJSONLayers,
      visibleQtyPointsLayer,
    };
  }

  /**
   * Generates or updates a color slider for a point layer based on quantity values.
   *
   * This function creates a continuous color renderer for a point layer and sets up
   * or updates a color slider to interactively adjust the renderer. It can either
   * create a new color slider or update an existing one.
   *
   * @param {esri.Color} Color - The Color constructor from the ArcGIS API.
   * @param {esri.smartMapping.renderers} colorRendererCreator - The color renderer creator from smartMapping.
   * @param {esri.smartMapping.symbology} colorSchemes - The color schemes module from smartMapping.
   * @param {esri.widgets.ColorSlider} ColorSlider - The ColorSlider constructor from the ArcGIS API.
   * @param {Function} histogram - The histogram function from the ArcGIS API.
   * @param {esri.layers.FeatureLayer} layer - The primary feature layer to apply the renderer to.
   * @param {Array<esri.layers.FeatureLayer>} layers - An array of layers to update with the new renderer.
   * @param {esri.views.MapView|esri.views.SceneView} view - The current map or scene view.
   * @param {esri.widgets.ColorSlider} [existingSlider] - An existing ColorSlider to update (optional).
   * @returns {Promise<esri.widgets.ColorSlider>} A promise that resolves to the created or updated ColorSlider.
   *
   */
  function generateAndUpdateColorSlider(
    Color,
    colorRendererCreator,
    colorSchemes,
    ColorSlider,
    histogram,
    layer,
    layers,
    view,
    existingSlider
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
      field: "quantity",
      view: view,
      colorScheme: customColorScheme.primaryScheme,
      outlineOptimizationEnabled: true,
      defaultSymbolEnabled: false,
      sizeOptimizationEnabled: true,
    };
    let rendererResult;

    // Create the color slider promise
    let sliderPromise = colorRendererCreator
      .createContinuousRenderer(colorParams)
      .then((response) => {
        rendererResult = response;
        let defaultSize = 12;
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
        container: "pointSlider",
        primaryHandleEnabled: true,
        handlesSyncedToPrimary: false,
        visibleElements: { interactiveTrack: true },
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
   * Customize an expand/collapse button for the legend.
   *
   * @param {HTMLElement} legendDiv - The DOM element containing the legend.
   * @returns {HTMLButtonElement} The created button element.
   */
  function createExpandButton(legendDiv) {
    const button = document.createElement("button");
    button.id = "mobility-colorslider-button";
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
  function initializeQtyColorSliderExpand(view, legendDiv) {
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
                      style: "circle",
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

  async function getSharedSymbols(Color, layers) {
    let sharedSymbols = {
      Place: [],
      Route: [],
    };

    // 等待所有图层加载完成
    await Promise.all(layers.map((layer) => layer.when()));

    layers.forEach((layer) => {
      if (layer.renderer) {
        let symbols = layer.renderer.uniqueValueInfos || [
          layer.renderer.symbol,
        ];
        let category = layer.geometryType === "polyline" ? "Route" : "Place";

        symbols.forEach((symbolInfo) => {
          if (symbolInfo.label && symbolInfo.symbol) {
            let modifiedSymbol = symbolInfo.symbol.clone();

            if (category === "Place") {
              // Update symbol of Place
              if (modifiedSymbol.type === "simple-marker") {
                modifiedSymbol.color = new Color([0, 0, 0, 0]);
              }
            } else if (
              category === "Route" &&
              symbolInfo.label !== "Single-place Route"
            ) {
              // Update symbol of Route
              if (modifiedSymbol.type === "cim") {
                replaceColorInCIMSymbol(
                  modifiedSymbol.data.symbol,
                  [192, 192, 192, 255]
                );
              }
            }

            if (
              !sharedSymbols[category].some((s) => s.label === symbolInfo.label)
            ) {
              sharedSymbols[category].push({
                label: symbolInfo.label,
                symbol: modifiedSymbol,
              });
            }
          }
        });
      }
    });

    return sharedSymbols;
  }

  function replaceColorInCIMSymbol(symbol, newColor) {
    if (symbol.symbolLayers) {
      symbol.symbolLayers.forEach((layer) => {
        if (layer.type === "CIMSolidStroke" || layer.type === "CIMSolidFill") {
          if (Array.isArray(layer.color) && layer.color.length === 4) {
            layer.color = newColor;
          }
        }
        if (layer.type === "CIMVectorMarker" && layer.markerGraphics) {
          layer.markerGraphics.forEach((graphic) => {
            if (graphic.symbol) {
              replaceColorInCIMSymbol(graphic.symbol, newColor);
            }
          });
        }
      });
    }
  }

  async function renderShapeLegend(symbolUtils, sharedSymbols, legendDiv) {
    const legendTitle = document.createElement("h2");
    legendTitle.className = "esri-widget__heading esri-legend__layer-label";
    legendTitle.setAttribute("aria-level", "2");
    legendTitle.setAttribute("role", "heading");
    legendTitle.textContent = "Layer Symbols";
    legendDiv.appendChild(legendTitle);
    // Iterate through each category (Route and Place)
    for (const [category, symbols] of Object.entries(sharedSymbols)) {
      if (symbols.length === 0) continue;

      // Create service container
      const serviceContainer = document.createElement("div");
      serviceContainer.className = "esri-legend__service";

      // Create category title
      const categoryTitle = document.createElement("h3");
      categoryTitle.className = "esri-widget__heading esri-legend__layer-label";
      categoryTitle.setAttribute("aria-level", "3");
      categoryTitle.setAttribute("role", "heading");
      categoryTitle.textContent = category;
      serviceContainer.appendChild(categoryTitle);

      // Create category container
      const categoryContainer = document.createElement("div");
      categoryContainer.className = "esri-legend__layer";

      // Create legend item for each symbol
      for (const symbolItem of symbols) {
        const legendRow = document.createElement("div");
        legendRow.className = "esri-legend__layer-row";

        // Create symbol container
        const symbolCell = document.createElement("div");
        symbolCell.className =
          "esri-legend__layer-cell esri-legend__layer-cell--symbols";
        const symbolDiv = document.createElement("div");
        symbolDiv.className = "esri-legend__symbol";

        // Render symbol preview
        const symbolElement = await symbolUtils.renderPreviewHTML(
          symbolItem.symbol
        );
        symbolDiv.appendChild(symbolElement);
        symbolCell.appendChild(symbolDiv);

        // Create label container
        const labelCell = document.createElement("div");
        labelCell.className =
          "esri-legend__layer-cell esri-legend__layer-cell--info";
        labelCell.textContent = symbolItem.label;

        // Add symbol and label to row
        legendRow.appendChild(symbolCell);
        legendRow.appendChild(labelCell);

        // Add row to category container
        categoryContainer.appendChild(legendRow);
      }

      // Add category container to service container
      serviceContainer.appendChild(categoryContainer);

      // Add service container to main legend div
      legendDiv.appendChild(serviceContainer);
    }
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
    "esri/widgets/Legend",
    "esri/core/reactiveUtils",
    "esri/symbols/support/symbolUtils",
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
    Legend,
    reactiveUtils,
    symbolUtils,
    colorSchemes
  ) {
    loadCollectionConfig(urltoload)
      .then((config) => {
        // Initiate collection legend.
        let collLegend = new CollectionLegend();

        // Map of layer ID to layer data.
        const layerDataMap = {};

        // Create array of layer instances.
        const layers = [];

        // Create arry of point data
        const allQtyPointsData = {};

        // here should be collectionHasQty
        let collHasQuantity = false;

        if (config.datasetsConfig) {
          var allPointLayers = [];
          var allRouteLayers = [];
          for (let i = 0; i < config.datasetsConfig.length; i++) {
            // load setting for each dataset/searched results
            const template = loadPopUpTemplate(config.datasetsConfig[i].config); //Load individual dataset config
            const color = config.datasetsConfig[i].layerContent.color;
            collLegend.addItem(config.datasetsConfig[i].name, color);
            rgbaColor = Color.fromHex(color);
            rgbaColor = [
              rgbaColor.r,
              rgbaColor.g,
              rgbaColor.b,
              rgbaColor.a * 255,
            ];

            // collect feature data
            var lineData = filterDataByGeometryType(
              config.datasetsConfig[i].config.data,
              "LineString"
            );

            var pointData = filterDataByGeometryType(
              config.datasetsConfig[i].config.data,
              "Point"
            );
            const wholeLayer = new GroupLayer({
              title: config.datasetsConfig[i].name,
              id: i,
              visible: true,
              visibilityMode: "independent",
              layers: [],
            });

            const hasQuantity =
              config.datasetsConfig[i].config.data?.metadata?.has_quantity ||
              false;
            const hasRoute = lineData.features.length > 0;
            collHasQuantity = collHasQuantity || hasQuantity;

            /* 
            Initialize line (route) layer for dataset / searched results
            */
            if (hasRoute) {
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
                  valueExpression:
                    "IIF($feature.route_size > 1, 'multi-place-route', 'single-place-route')",
                  uniqueValueInfos: [
                    {
                      value: "multi-place-route",
                      symbol: createLineSymbol(rgbaColor, 2),
                      label: "Multi-place Route",
                    },
                    {
                      value: "single-place-route",
                      symbol: createLineSymbol([64, 64, 64, 255], 4),
                      label: "Single-place Route",
                    },
                  ],
                },
              });

              allRouteLayers.push(geojsonLineLayer);
              wholeLayer.add(geojsonLineLayer);
            }

            /* 
            Initialize point layer for dataset / searched results
            */
            // Initialize point renderer
            let initialPointRenderer = {
              type: "simple",
              symbol: {
                type: "simple-marker",
                color: color,
                outline: {
                  color: "white",
                },
              },
            };
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
                      color: rgbaColor,
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
                      color: rgbaColor,
                      outline: {
                        color: "grey",
                      },
                    },
                  },
                ],
                defaultSymbol: {
                  type: "simple-fill",
                  label: "Place without Quantity",
                  color: rgbaColor,
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
                  color: rgbaColor,
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
                      color: rgbaColor,
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
                      color: rgbaColor,
                      outline: {
                        color: "grey",
                      },
                    },
                  },
                ],
              };
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
              renderer: initialPointRenderer,
              customParameters: {
                hasQuantity: hasQuantity,
                hasRoute: hasRoute,
              },
            });
            // Collect point data having quantity for color slider update
            if (hasQuantity) {
              allQtyPointsData[geojsonPointLayer.id] = pointData;
            }
            allPointLayers.push(geojsonPointLayer);
            wholeLayer.add(geojsonPointLayer);

            // add (point + line) GroupLayer of dataset / searched results into layers fields of view
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

        view.when(() => {
          hideLoader();
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
              const layer = item.layer;
              const layerID = layer.id;
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
            $(infoDiv).append(
              '<div class="esri-legend"><h2 class="esri-widget__heading esri-legend__layer-label" aria-level="2" role="heading">Layer Colours</h2><div class="esri-legend__service"></div></div>'
            );
            collLegend.render(
              $(infoDiv).find(".esri-legend .esri-legend__service")
            );
            let collLegendDiv =
              document.getElementsByClassName("esri-legend")[0];
            let allLayers = view.map.allLayers.filter((layer) => {
              return layer.type === "geojson";
            });
            getSharedSymbols(Color, allLayers)
              .then((sharedSymbols) => {
                renderShapeLegend(symbolUtils, sharedSymbols, collLegendDiv);
              })
              .catch((error) => {
                console.error("Errors in getting shared symbols:", error);
              });
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

        if (collHasQuantity) {
          // Include GroupLayer and GeoJSONLayer
          let allQtyLayers = view.map.allLayers.filter((layer) => {
            if (layer.type === "group") {
              // Check whether current GroupLayer has quantity point GeoJSONLayer
              return layer.allLayers.some(
                (subLayer) =>
                  subLayer.type === "geojson" &&
                  subLayer.customParameters &&
                  subLayer.customParameters.hasQuantity
              );
            }
            return (
              layer.type === "geojson" &&
              layer.customParameters &&
              layer.customParameters.hasQuantity
            );
          });

          let globalColorSlider;

          reactiveUtils
            .whenOnce(() => !view.updating)
            .then(async () => {
              // Initialize quantity color slider legend container
              const qtyLegendDiv = document.getElementById("legendDiv");
              initializeQtyColorSliderExpand(view, qtyLegendDiv);
              const {
                hasVisibleQtyLayer,
                visibleQtyGeoJSONLayers,
                visibleQtyPointsLayer,
              } = getVisibleQtyLayersData(
                GeoJSONLayer,
                allQtyLayers,
                allQtyPointsData
              );

              globalColorSlider = await generateAndUpdateColorSlider(
                Color,
                colorRendererCreator,
                colorSchemes,
                ColorSlider,
                histogram,
                visibleQtyPointsLayer,
                visibleQtyGeoJSONLayers,
                view
              );

              if (config.listPane != "disabled") {
                let colorSliderExpandButton = document.getElementById(
                  "mobility-colorslider-button"
                );
                view.when(() => {
                  // Monitor the visibility change of layers having quantity
                  allQtyLayers.forEach((layer) => {
                    reactiveUtils.watch(
                      () => layer.visible,
                      async () => {
                        const {
                          hasVisibleQtyLayer,
                          visibleQtyGeoJSONLayers,
                          visibleQtyPointsLayer,
                        } = getVisibleQtyLayersData(
                          GeoJSONLayer,
                          allQtyLayers,
                          allQtyPointsData
                        );
                        if (hasVisibleQtyLayer) {
                          qtyLegendDiv.style.display = "block";
                          colorSliderExpandButton.classList.remove(
                            "esri-hidden"
                          );
                          globalColorSlider =
                            await generateAndUpdateColorSlider(
                              Color,
                              colorRendererCreator,
                              colorSchemes,
                              ColorSlider,
                              histogram,
                              visibleQtyPointsLayer,
                              visibleQtyGeoJSONLayers,
                              view,
                              globalColorSlider
                            );
                        } else {
                          // Hide the color slider legend and the expand button
                          qtyLegendDiv.style.display = "none";
                          colorSliderExpandButton.classList.add("esri-hidden");
                        }
                      }
                    );
                  });
                });
              }
            });
        }
      })
      .catch((err) => console.error(err));
  });
})();
