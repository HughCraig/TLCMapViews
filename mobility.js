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
   * balabala
   *
   *
   * @param {object} layer - The ArcGIS layer object whose renderer will be updated.
   * @param {view} view -
   * @param {object} ColorSlider -
   * @param {} colorRendererCreator
   * @param {} histogram
   * @return {void}
   */

  function generateRenderer(
    layer,
    view,
    fieldKey,
    fieldValue,
    ColorSlider,
    colorRendererCreator,
    histogram
  ) {
    const colorParams = {
      layer: layer,
      field: fieldKey,
      normalizationType: "log", // TODO: Not sure why it doesn't work yet
      view: view,
      theme: "above-and-below", // TODO: set the custom color ramp and default size, use ColorSchemeForPoint?
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
        const defaultSize = 10;
        rendererResult.renderer.visualVariables[1].stops.forEach((stop) => {
          stop.size = defaultSize;
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
          labelFormatFunction: (value, type) => {
            return value.toFixed(2);
          },
        });
        colorSlider.viewModel.precision = 2;

        // // hide default statistic lines from slider histogram
        colorSlider.histogramConfig.standardDeviation = null;
        colorSlider.histogramConfig.average = null;

        // // render quartile data lines on the slider
        // const percentages = ["25%", "50%", "75%"];
        // colorSlider.histogramConfig.dataLines = fieldValue.map((value, i) => ({
        //   value: value,
        //   label: `${percentages[i]}, (${value})`,
        // }));

        // add colorSlider into legendDiv
        view.ui.add("legendDiv", "bottom-left");

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

  require([
    "esri/Map",
    "esri/layers/GeoJSONLayer",
    "esri/views/MapView",
    "esri/widgets/Expand",
    "esri/widgets/BasemapGallery",
    "esri/widgets/smartMapping/ColorSlider",
    "esri/smartMapping/renderers/color",
    "esri/smartMapping/statistics/histogram",
    "esri/core/reactiveUtils",
  ], function (
    Map,
    GeoJSONLayer,
    SceneView,
    Expand,
    BasemapGallery,
    ColorSlider,
    colorRendererCreator,
    histogram,
    reactiveUtils
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
                symbol: {
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
                              : 0.8,
                          color:
                            feature.display && feature.display.color
                              ? feature.display.color
                              : [255, 255, 255, 255],
                        },
                        {
                          // arrow symbol
                          type: "CIMVectorMarker",
                          enable: true,
                          size: 3,
                          markerPlacement: {
                            type: "CIMMarkerPlacementAlongLineSameSize", // places same size markers along the line
                            endings: "WithMarkers",
                            placementTemplate: [16], // determines space between each arrow
                            angleToLine: true, // symbol will maintain its angle to the line when map is rotated
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
                                // black fill for the arrow symbol
                                type: "CIMPolygonSymbol",
                                symbolLayers: [
                                  {
                                    type: "CIMSolidFill",
                                    enable: true,
                                    color:
                                      feature.display && feature.display.color
                                        ? feature.display.color
                                        : [255, 255, 255, 255],
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
              })),
            },
          });
          console.log(lineData.features);
          console.log(geojsonLineLayer);
          console.log(template);
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
            type: "unique-value",
          },
        });
        map.layers.add(geojsonPointLayer);

        var view = new SceneView({
          container: "viewDiv",
          center: [131.034742, -25.345113],
          zoom: 3,
          map: map,
        });

        // Set color gradient for the quantity if quantity exists
        const log_quantiles = config.data.metadata.log_quantiles;
        if (log_quantiles !== null && log_quantiles !== undefined) {
          reactiveUtils
            .whenOnce(() => !view.updating)
            .then(() => {
              generateRenderer(
                geojsonPointLayer,
                view,
                "quantity",
                log_quantiles,
                ColorSlider,
                colorRendererCreator,
                histogram
              );
            });
        }

        //Not sure why but timeout is needed to avoid the 'AbortError' Promise error.
        //This problem could happens on the original code as well(30% change) which prevent the initial zoom/center setting
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
