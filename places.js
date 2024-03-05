const urlParams = new URLSearchParams(window.location.search);
const urltoload = urlParams.get("load");
console.log(urltoload);

require([
    "esri/Map",
    "esri/layers/GeoJSONLayer",
    "esri/views/SceneView",
    "esri/geometry/Extent"
], function (Map, GeoJSONLayer, MapView) {

    let url = urltoload;
    //urltoload;

    let template = {
        title: "{name}",
        content: getInfo,
        outFields: ["*"]
    };

    let renderer = {
        type: "simple",
        field: "mag",
        symbol: {
            type: "simple-marker",
            color: "orange",
            outline: {
                color: "white"
            }
        }
    };


    // The function used for the PopupTemplate
    function getInfo(feature) {
        try {
            let graphic, attributes, content;
            graphic = feature.graphic;
            attributes = graphic.attributes;


            title = attributes["name"];//(attributes["name"])? attributes["name"] : "TLCMap Place";
            content = "<table id='tlcmproperties'>";


            if (attributes["description"]) {
                content = content + "<tr><td>Description</td><td>" + attributes["description"] + "</td></tr>";
            }

            let specialatts = ["OBJECTID", "id", "title", "name", "description", "layer", "TLCMapLinkBack", "TLCMapDataset"]; // for ignoring in loop that displays all the data incl. extended data
            let specialdisplay = {
                "placename": "Place Name",
                "StartDate": "Date Start",
                "EndDate": "Date End",
                "datestart": "Date Start",
                "dateend": "Date End",
                "latitude": "Latitude",
                "longitude": "Longitude",
                "state": "State",
                "lga": "LGA",
                "feature_term": "Feature Term",
                "original_data_source": "Source",
                "linkback": "Link Back",
                "type": "Type"

            }; // match keys to more human friendly display labels


            //console.log(attributes);

            // Add all the cannonical attributes with nice labels, if they exist
            for (display in specialdisplay) {
                if (!attributes[display] && attributes[display] !== 0) {
                    continue;
                }
                disval = attributes[display];
                if (disval.startsWith("http")) {
                    disval = "<a href='" + disval + "'>" + disval + "</a>";
                }
                content = content + "<tr><td>" + specialdisplay[display] + "</td><td>" + disval + "</td></tr>";

            }


            for (const key in attributes) {

                // skip display of special core atts
                if (specialdisplay[key]) {
                    continue;
                }


                if (!attributes[key] && attributes[key] !== 0) {
                    continue;
                } // ignore null or empty, but allow value of 0.


                // skip things that are to be ignored
                if (specialatts.includes(key)) {
                    continue;
                } // don't display things to ignore or handled sepera

                let val = attributes[key].toString();

                if (val.startsWith("http")) {
                    val = "<a href='" + val + "'>" + val + "</a>";
                }


                content = content + "<tr><td>" + key + "</td><td>" + val + "</td></tr>";

            }


            content = content + "</table>";

            content = content + "<p><a href='" + attributes["TLCMapLinkBack"] + "'>TLCMap Record: " + attributes["id"] + "</a> | ";
            content = content + "<a href='" + attributes["TLCMapDataset"] + "'>TLCMap Layer</a></p>";


            return content;
        } catch (err) {
            return console.log("Error: " + key + " could getinfo " + err + " " + content);
        }
    }

    let geojsonLayer = new GeoJSONLayer({
        url: url,
        copyright: "Check copyright and permissions of this dataset at http://tlcmap.org/ghap.",
        popupTemplate: template,
        renderer: renderer //optional
    });


    let map = new Map({
        basemap: "hybrid",
        ground: "world-elevation",
        layers: [geojsonLayer]
    });

    let view = new MapView({
        container: "viewDiv",
        center: [131.034742, -25.345113],
        zoom: 3,
        map: map
    });


    geojsonLayer.queryExtent().then(function (results) {
        // go to the extent of the results satisfying the query
        view.goTo(results.extent);
    });


});
