function loadCollectionConfig(urltoload) {
  let config = {
    infoDisplay: "default",
    logo: "./img/tlcmaplogofull_sm50.png",
    titleText: null,
    titleLink: null,
    content: null,
    legend: true,
    basemapGallery: true,
    basemap: "hybrid",
    listPane: "default",
    datasetsConfig: [],
  };

  if (urltoload == null) {
    return Promise.resolve(config);
  }

  return new Promise((resolve, reject) => {
    fetch(urltoload)
      .then((response) => response.json())
      .then((data) => {
        //global configurations
        if (data.display) {
          var display = data.display;

          //Info block
          if (display.hasOwnProperty("info")) {
            var info = display.info;

            // Hide/show
            if (info.hasOwnProperty("display")) {
              // Info block configurations
              switch (info.display) {
                case "enabled":
                  config["infoDisplay"] = "default";
                  break;
                case "disabled":
                  config["infoDisplay"] = "disabled";
                  break;
                case "hidden":
                  config["infoDisplay"] = "hidden";
                  break;
              }
            }

            //logo
            if (info.hasOwnProperty("logo")) {
              config["logo"] = !info.logo ? null : info.logo;
            }

            //title
            if (info.hasOwnProperty("title")) {
              if (typeof info.title === "string") {
                config["titleText"] = info.title;
              } else if (typeof info.title === "object") {
                config["titleText"] = info.title.hasOwnProperty("text")
                  ? info.title.text
                  : null;
                config["titleLink"] = info.title.hasOwnProperty("link")
                  ? info.title.link
                  : null;
              }
            }

            //content
            if (info.hasOwnProperty("content")) {
              config["content"] = purifyContent(info.content);
            }

            //legend
            if (info.hasOwnProperty("legend")) {
              config["legend"] =
                typeof info.legend === "boolean" ? info.legend : true;
            }
          }

          //base map gallery
          if (display.hasOwnProperty("basemapGallery")) {
            config["basemapGallery"] =
              typeof display.basemapGallery === "boolean"
                ? display.basemapGallery
                : true;
          }

          //base map
          if (display.hasOwnProperty("basemap")) {
            config["basemap"] = mapStyles.has(display.basemap)
              ? display.basemap
              : "hybrid";
          }

          //list pane
          if (display.hasOwnProperty("listPane")) {
            // Info block configurations
            switch (display.listPane) {
              case "enabled":
                config["listPane"] = "default";
                break;
              case "disabled":
                config["listPane"] = "disabled";
                break;
              case "hidden":
                config["listPane"] = "hidden";
                break;
            }
          }
        }

        var loadPromises;
        //Load individual dataset
        if (data.datasets !== undefined && Array.isArray(data.datasets)) {
          // Initiate the color generator.
          const colorGen = new LegendColorGenerator();

          loadPromises = data.datasets.map((dataset, index) => {
            if (dataset.jsonURL) {
              return loadConfig(dataset.jsonURL)
                .then((datasetConfig) => {
                  config.datasetsConfig.push({
                    id: index,
                    name: dataset.name,
                    layerContent: createLayerInfoPanelElement(
                      dataset,
                      colorGen
                    ),
                    config: datasetConfig,
                  });
                })
                .catch((err) => console.error(err));
            } else {
              return Promise.resolve();
            }
          });
        }
        // Wait for all datasets to load before resolving config.
        Promise.all(loadPromises)
          .then(() => {
            resolve(config);
          })
          .catch((err) => {
            console.error(err);
            reject(err);
          });
      })
      .catch((err) => console.error(err));
  });
}

/*
 * Purify html content
 * Only p a[href|target] strong em ul ol li div[class] are allowed
 */
function purifyContent(content) {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ["p", "a", "strong", "em", "ul", "ol", "li", "div"],
    ALLOWED_ATTR: ["href", "target", "class"],
  });
}

/**
 * Create the info panel element for a layer.
 *
 * @param {Object} layerData
 *   The layer data.
 * @return {HTMLElement}
 *   The HTML element of the info panel.
 */
function createLayerInfoPanelElement(layerData, colorGen) {
  var color = colorGen.generate();

  const propElement = $("<div></div>").css({
    "padding-left": "13px",
  });

  //Custom color
  if (layerData.hasOwnProperty("display")) {
    const display = layerData.display;
    if (display.color) {
      color = display.color;
    }
  }

  if (
    layerData.hasOwnProperty("display") &&
    layerData.display.hasOwnProperty("listPane")
  ) {
    const listPane = layerData.display.listPane;

    //Show color in layer info panel
    if (listPane.showColor && listPane.showColor === true) {
      const legend = $('<div class="layer-prop-color"></div>').css({
        width: "15px",
        height: "15px",
        "border-radius": "50%",
        "background-color": color,
      });
      propElement.append(legend);
    }

    //Custom content
    if (listPane.content) {
      propElement.append(purifyContent(listPane.content));
    } else {
      return {
        content: null,
        color: color,
      };
    }
  } else {
    return {
      content: null,
      color: color,
    };
  }

  return {
    content: propElement[0],
    color: color,
  };
}
