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
   *
   *
   *
   * @param {object} layer - The ArcGIS layer object whose renderer will be updated.
   * @param {view} view -
   * @param {object} ColorSlider -
   * @param {} colorRendererCreator
   * @param {} histogram
   * @param {} Color
   * @param {} colorSchemes
   * @return {void}
   */

  function generateRenderer(
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
    const noDataColor = new Color("orange");
    customColorScheme.primaryScheme.noDataColor = noDataColor;

    let colorParams = {
      layer: layer,
      field: fieldKey,
      view: view,
      colorScheme: customColorScheme.primaryScheme,
      outlineOptimizationEnabled: true,
      defaultSymbolEnabled: true,
      sizeOptimizationEnabled: true,
    };

    let rendererResult;
    colorRendererCreator
      .createContinuousRenderer(colorParams)
      .then((response) => {
        // Set the renderer to the layer and add it to the map
        rendererResult = response;

        // Reset the size of points
        let defaultSize = 10;
        rendererResult.renderer.visualVariables.forEach((vVariable) => {
          if (vVariable.type === "size" && vVariable.stops) {
            vVariable.stops.forEach((stop) => {
              stop.size = defaultSize;
            });
          }
        });

        layer.renderer = rendererResult.renderer;

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
          container: "slider",
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
   * update the renderer with the updated color visual variable object
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
   * Creates a CIM line symbol based on the provided feature, color, and width.
   *
   * @param {object} feature - The feature object containing display properties.
   * @param {number[]} color - The color array in the format [r, g, b, a].
   * @param {number} width - The width of the line symbol.
   * @return {object} - The CIM line symbol object.
   */
  function createLineSymbol(feature, color = [255, 255, 255, 255], width = 2) {
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
              width:
                feature.display && feature.display.lineWidth
                  ? feature.display.lineWidth.toString()
                  : width.toString(),
              color:
                feature.display && feature.display.color
                  ? feature.display.color
                  : color,
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
                        color:
                          feature.display && feature.display.color
                            ? feature.display.color
                            : color,
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
    colorSchemes
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

        // construct the line layer
        if (lineData.features.length > 0) {
          const blob = new Blob([JSON.stringify(lineData)], {
            type: "application/json",
          });
          const lineDataUrl = URL.createObjectURL(blob);

          var geojsonLineLayer = new GeoJSONLayer({
            url: lineDataUrl,
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
                symbol: createLineSymbol(feature),
              })),
            },
          });
          map.layers.add(geojsonLineLayer);
        }

        // construct the point layer
        const blob = new Blob([JSON.stringify(pointData)], {
          type: "application/json",
        });
        const pointDataUrl = URL.createObjectURL(blob);

        const geojsonPointLayer = new GeoJSONLayer({
          title: "Points of Places ",
          url: pointDataUrl,
          copyright:
            "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
          popupTemplate: template,
          popupEnabled: config.popupEnabled,
          renderer: {
            type: "simple",
            symbol: {
              type: "simple-marker",
              color: "orange",
              outline: {
                color: "white",
              },
            },
          },
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

        // Fetch quantiles if quantity exists
        const log_quantiles = config.data.metadata.log_quantiles;
        const quantiles = config.data.metadata.quantiles;
        const hasQuantity = config.data.metadata.has_quantity;

        if (hasQuantity) {
          legendDiv.style.display = "block"; // Show legendDiv
          reactiveUtils
            .whenOnce(() => !view.updating)
            .then(() => {
              generateRenderer(
                geojsonPointLayer,
                view,
                "quantity",
                quantiles,
                ColorSlider,
                colorRendererCreator,
                histogram,
                Color,
                colorSchemes
              );
            });
        }

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
