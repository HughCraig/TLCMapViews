(function () {
    const urlParams = new URLSearchParams(window.location.search);
    const urltoload = urlParams.get("load");

    require([
        "esri/Map",
        "esri/views/MapView",
        "esri/layers/GeoJSONLayer",
        "esri/widgets/TimeSlider",
        "esri/geometry/Extent",
        "esri/widgets/Expand",
        "esri/widgets/Legend",
        "esri/widgets/BasemapGallery",
    ], (
        Map,
        MapView,
        GeoJSONLayer,
        TimeSlider,
        Extent,
        Expand,
        Legend,
        BasemapGallery
    ) => {
        loadConfig(urltoload)
            .then((config) => {
                // Pass the updated data with id for each feature to layer
                const blob = new Blob([JSON.stringify(config.data)], {
                    type: "application/json",
                });
                const newurl = URL.createObjectURL(blob);

                // set the timeInfo on GeoJSONLayer at the time initialization
                const layer = new GeoJSONLayer({
                    url: newurl, //"http://localhost:8090/ghap/publicdatasets/126/json",
                    title: "TLCMap Timeline {name}",
                    // set the CSVLayer's timeInfo based on the date field
                    timeInfo: {
                        //startField: "time", // name of the date field
                        startField: "udatestart", // name of the date field
                        endField: "udateend",
                        interval: {
                            // set time interval to one day
                            unit: "years",
                            value: 1,
                        },
                    },
                    renderer: loadRenderer(config),
                    popupTemplate: loadPopUpTemplate(config),
                });

                const map = new Map({
                    basemap: config.basemap,
                    layers: [layer],
                });

                const view = new MapView({
                    map: map,
                    container: "viewDiv",
                    zoom: 4,
                    center: [131.0352, -25.3443],
                });

                // time slider widget initialization
                const timeSlider = new TimeSlider({
                    container: "timeSlider",
                    view: view,
                    timeVisible: true, // show the time stamps on the timeslider
                    loop: true,
                    labelFormatFunction: (value, type, element, layout) => {
                        if (!timeSlider.fullTimeExtent) {
                            return;
                        }
                        const normal = new Intl.DateTimeFormat("en-gb");
                        switch (type) {
                            case "min":
                            case "max":
                                element.innerText = normal.format(value);
                                break;
                            case "extent":
                                const start = timeSlider.fullTimeExtent.start;
                                const end = timeSlider.fullTimeExtent.end;
                                element.innerText = `${normal.format(
                                    value[0].getTime()
                                )}
${normal.format(value[1].getTime())}`;
                                //  element.innerText = `${normal.format(start)} - ${normal.format(end)}`;
                                break;
                        }
                    },
                });

                view.whenLayerView(layer).then((lv) => {
                    // around up the full time extent to full hour

                    // NOW don't ask why but simply setting timeSlider.fullTimeExtent to be layer.timeInfo.fullTimeExtent
                    // runs into a bug where it can't handle anything before the epoch and sets anything earlier to 1969, and get's terribly confused.
                    // However, this hack works around it, which I figured out because on another map, I'd specifically set the start and end to a Javascript date value.
                    // So it seems getting the dates from the layer, converting to JS Dates, then using that works. FFS. What a long day.

                    const start = new Date(layer.timeInfo.fullTimeExtent.start);
                    const end = new Date(layer.timeInfo.fullTimeExtent.end);

                    // SET THE units for timeline pips to be appropriate to the scale of time.
                    // get the difference between two dates and convert to seconds.
                    let fulltimespan = Math.abs(
                        start.getTime() / 1000 - end.getTime() / 1000
                    );
                    let tunit = "minutes";
                    tunit = fulltimespan > 864000 ? "days" : tunit; //  than 10 days
                    tunit = fulltimespan > 31540000 ? "months" : tunit; //  than a year
                    tunit = fulltimespan > 1577000000 ? "years" : tunit; //  than 50 years
                    tunit = fulltimespan > 31540000000 ? "decades" : tunit; //  than 1000 years
                    tunit = fulltimespan > 315360000000 ? "centuries" : tunit; //  than 10000 years.

                    // THEN just need to figure out how to set the width of the timespan so it doesn't get stuck in that wierd timespan.

                    layer.timeInfo.interval.unit = tunit;

                    timeSlider.fullTimeExtent = {
                        start: start,
                        end: end,
                    };
                    timeSlider.values = [start, end];
                    timeSlider.stops = {
                        interval: {
                            value: 1,
                            unit: tunit,
                        },
                    };
                });

                layer.queryExtent().then(function (results) {
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
                    let basemapGallery = new BasemapGallery();
                    let bgExpand = new Expand();
                    loadBaseMapGallery(basemapGallery, bgExpand, view);
                }
            })
            .catch((err) => console.error(err));
    });
})();
