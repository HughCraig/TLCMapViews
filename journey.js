var urlParams = new URLSearchParams(window.location.search);
var urltoload = urlParams.get("load");

var baselayer = "hybrid";
if (urlParams.has("base")) {
  baselayer = urlParams.get("base");
}

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

require([
  "esri/Map",
  "esri/layers/GeoJSONLayer",
  "esri/views/MapView",
  "esri/geometry/Extent",
  "esri/widgets/Expand",
  "esri/widgets/BasemapGallery",
], function (Map, GeoJSONLayer, MapView, Extent, Expand, BasemapGallery) {
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

      const blob = new Blob([JSON.stringify(pointData)], {
        type: "application/json",
      });
      const pointDataUrl = URL.createObjectURL(blob);

      const geojsonPointLayer = new GeoJSONLayer({
        title: "TLCMap Layer",
        url: pointDataUrl,
        copyright:
          "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
        popupTemplate: template,
        renderer: loadRenderer(config),
        popupEnabled: config.popupEnabled,
      });
      map.layers.add(geojsonPointLayer);

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
            type: "simple",
            symbol: {
              type: "simple-line",
              color: "white",
              width: "2",
            },
          },
        });
        map.layers.add(geojsonLineLayer);
      }

      var view = new MapView({
        container: "viewDiv",
        center: [131.034742, -25.345113],
        zoom: 3,
        map: map,
      });

      geojsonPointLayer.queryExtent().then(function (results) {
        // go to the extent of the results satisfying the query
        view.goTo(results.extent);
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
