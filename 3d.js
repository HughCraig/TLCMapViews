var urlParams = new URLSearchParams(window.location.search);
var urltoload = urlParams.get("load");
var baselayer = "hybrid";
if (urlParams.has("base")) {
  baselayer = urlParams.get("base"); //maybe sanitise this?? Or allow only a reliable subset.
  //I think there are too many options in the ESRI base layers and some 3rd party ones don't work.
  // eg: just hybrid (default), satellite, street, terrain, dark.
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

      // Pass the updated data with id for each feature to layer
      const blob = new Blob([JSON.stringify(config.data)], {
        type: "application/json",
      });
      const newurl = URL.createObjectURL(blob);

      var geojsonLayer = new GeoJSONLayer({
        url: newurl,
        copyright:
          "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
        popupTemplate: loadPopUpTemplate(config),
        renderer: loadRenderer(config), //optional
        popupEnabled: config.popupEnabled,
      });

      var map = new Map({
        basemap: config.basemap,
        ground: "world-elevation",
        layers: [geojsonLayer],
      });

      var view = new MapView({
        container: "viewDiv",
        center: [131.034742, -25.345113],
        zoom: 3,
        map: map,
      });

      geojsonLayer.queryExtent().then(function (results) {
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
