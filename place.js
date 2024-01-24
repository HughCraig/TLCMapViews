let urlParams = new URLSearchParams(window.location.search);

$(document).ready(function () {
    let userpars = ["name", "description", "id", "linkback"];
    for (i = 0; i < userpars.length; i++) {
        if (urlParams.get(userpars[i])) {
            if (userpars[i] === "linkback") {
                $("p#" + userpars[i]).html("<a href='" + urlParams.get(userpars[i]) + "'>Link Back</a>");
            } else {
                $("p#" + userpars[i]).html(" " + userpars[i] + ": " + urlParams.get(userpars[i]));
            }
        }

    }
    // set basic values in the info box from the GET


});

function getCenterCoords() {
    console.log(urlParams);
    let latlng = urlParams.get('latlng');
    console.log(llswitch(latlng));
    return llswitch(latlng)

}

// switch string lat long to long lat, or vice versa and return as an array.
function llswitch(ll) {
    lla = ll.split(",");
    return [lla[1], lla[0]];
}


require(["esri/Map", "esri/views/SceneView",
    "esri/Graphic",
    "esri/layers/GraphicsLayer"], function (Map, SceneView, Graphic, GraphicsLayer) {


    let map = new Map({
        basemap: "hybrid",
        ground: "world-elevation"
    });


    // we want a marker at the coords (note latlng is switched to lnglat which is arcgis convention) but we want the camera standing a bit off from it so you can see it, and at elevation. 2228 is height of Mt Kosciusko/Jagungal.
    placecoords = getCenterCoords();
    let campos = [placecoords[0], placecoords[1] - 0.1, 2228];


    // set the scene and camera angle.
    let view = new SceneView({
        container: "viewDiv", // Reference to the scene div created in step 5
        map: map, // Reference to the map object created before the scene
        scale: 50000000, // Sets the initial scale to 1:50,000,000
        center: getCenterCoords(), // Sets the center point of view with lon/lat
        camera: {
            position: campos,
            tilt: 80
        }
    });


    let graphicsLayer = new GraphicsLayer();
    map.add(graphicsLayer);
    let point = {
        type: "point",
        longitude: placecoords[0],
        latitude: placecoords[1]
    };

    let simpleMarkerSymbol = {
        type: "simple-marker",
        color: [226, 119, 40], // orange
        outline: {
            color: [255, 255, 255], // white
            width: 1
        }
    };

    let pointGraphic = new Graphic({
        geometry: point,
        symbol: simpleMarkerSymbol
    });

    graphicsLayer.add(pointGraphic);


});
