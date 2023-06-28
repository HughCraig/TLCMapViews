const defaultBlockedFields = new Set(["tlcMapUniqueId"]);

const mapStyles = new Set([
  "satellite",
  "hybrid",
  "oceans",
  "osm",
  "terrain",
  "dark-gray-vector",
  "gray-vector",
  "streets-vector",
  "streets-night-vector",
  "streets-navigation-vector",
  "topo-vector",
  "streets-relief-vector",
  "topo-vector",
  "streets-vector",
  "dark-gray-vector",
  "gray-vector",
]);

function loadConfig(urltoload) {
  let config = {
    infoDisplay: "default",
    logo: "./img/tlcmaplogofull_sm50.png",
    titleText: null,
    titleLink: null,
    content: null,
    basemapGallery: true,
    basemap: "hybrid",
    color: "orange", //Default color orange
    popupEnabled: true, //Enable pop up by default
    popupTitle: null,
    popupContent: null,
    popupAllowedFields: null,
    popupBlockedFields: defaultBlockedFields,
    popupFieldLabels: null,
    popupLinks: null,
  };

  if (urltoload == null) {
    return Promise.resolve(config);
  }

  return new Promise((resolve, reject) => {
    fetch(urltoload)
      .then((response) => response.json())
      .then((data) => {
        //global configurations
        if (data.hasOwnProperty("display")) {
          var display = data.display;

          //Info block
          if (display.hasOwnProperty("info")) {
            var info = display.info;

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

          //Color
          if (display.hasOwnProperty("color")) {
            config["color"] = display.color;
          }

          // Popup template
          if (display.hasOwnProperty("popup")) {
            //disable pop up
            if (display.popup === false) {
              config["popupEnabled"] = false;
            }

            // Custom title
            if (display.popup.title) {
              config["popupTitle"] = display.popup.title;
            }

            // Custom content
            if (display.popup.content) {
              config["popupContent"] = display.popup.content;
            }

            // popup allowed fields
            if (
              display.popup.allowedFields &&
              Array.isArray(display.popup.allowedFields)
            ) {
              if (
                display.popup.allowedFields !== 1 &&
                display.popup.allowedFields[0] !== "*"
              ) {
                // case for ["*"]
                config["popupAllowedFields"] = new Set(
                  display.popup.allowedFields
                );
              }
            }

            // popup blocked fields
            if (
              display.popup.blockedFields &&
              Array.isArray(display.popup.blockedFields)
            ) {
              display.popup.blockedFields.forEach((field) => {
                defaultBlockedFields.add(field);
              });
            }

            // popup field labels
            if (display.popup.fieldLabels) {
              config["popupFieldLabels"] = new Map(
                Object.entries(display.popup.fieldLabels)
              );
            }

            // popup links
            if (display.popup.links && Array.isArray(display.popup.links)) {
              config["popupLinks"] = display.popup.links;
            }
          }
        }

        //Pop up template for indivisual feature configurations
        let popupTemplateMap = new Map();
        if (data.features) {
          data.features.forEach((feature, index) => {
            if (feature.properties) {
              feature.properties.tlcMapUniqueId = index; //Add id to properties.
              const id = index; //Use id (order) as distinct key

              //Load global configurtation first
              let { title, content } = buildDefaultPopup(feature, config);

              //Individual feature configurations will override global configurations
              if (feature.display && feature.display.popup) {
                const popUp = feature.display.popup;

                // Custom title . default: name.
                if (popUp.title) {
                  const matches = popUp.title.match(/{(.*?)}/g);
                  const variablesExist = matches
                    ? matches.every((match) =>
                        feature.properties.hasOwnProperty(match.slice(1, -1))
                      )
                    : true;

                  // If all variables exist, use the custom title, otherwise use the name
                  if (variablesExist) {
                    title = popUp.title.replace(
                      /{(.*?)}/g,
                      (_, key) => feature.properties[key]
                    );
                  }
                }

                // Custom content. Could be interpolation or static. for interpolation , must match all variables in properties , otherwise use default null
                if (popUp.content) {
                  const matches = popUp.content.match(/{(.*?)}/g);
                  const variablesExist = matches
                    ? matches.every((match) =>
                        feature.properties.hasOwnProperty(match.slice(1, -1))
                      )
                    : true;

                  if (variablesExist) {
                    let res = purifyContent(
                      popUp.content.replace(
                        /{(.*?)}/g,
                        (_, key) => feature.properties[key]
                      )
                    );

                    if (res && res != "") {
                      content.customContent = res; // Purify the content to prevent XSS
                    }
                  }
                }

                //Default table content

                //Field labels
                let fieldLabels = popUp.hasOwnProperty("fieldLabels")
                  ? new Map(Object.entries(popUp.fieldLabels))
                  : config.popupFieldLabels;

                //Allowed fields
                let allowedFields = null;
                let allowAllFields = false;
                if (
                  popUp.hasOwnProperty("allowedFields") &&
                  Array.isArray(popUp.allowedFields)
                ) {
                  if (
                    popUp.allowedFields.length !== 1 &&
                    popUp.allowedFields[0] !== "*"
                  ) {
                    // case for ["*"]
                    allowedFields = new Set(popUp.allowedFields);
                  } else{
                    allowAllFields = true;
                  }
                }

                allowedFields = allowAllFields ? null : (allowedFields ?? config.popupAllowedFields)
                
                //Blocked fields
                let blockedFields =
                  popUp.hasOwnProperty("blockedFields") &&
                  Array.isArray(popUp.blockedFields)
                    ? new Set(popUp.blockedFields)
                    : config.popupBlockedFields;
                blockedFields.add("tlcMapUniqueId"); //Always block this field

                content.defaultTable = buildPopupContentTable(
                  feature,
                  fieldLabels,
                  allowedFields,
                  blockedFields
                );

                //Links
                if (
                  popUp.hasOwnProperty("links") &&
                  Array.isArray(popUp.links)
                ) {
                  let links = "";
                  popUp.links.forEach((link) => {
                    links += `<p><a href="${link.link}" target="${
                      link.target ? link.target : "_blank"
                    }">${link.text}</a></p>`;
                  });
                  content.customLink = links;
                }
              }

              let finalContent = "";
              if (content.customContent) {
                finalContent += content.customContent;
              }
              if (content.defaultTable) {
                finalContent += content.defaultTable;
              }
              if (content.customLink) {
                finalContent += content.customLink;
              }

              popupTemplateMap.set(id, { title, content: finalContent });
            }
          });
        }
        config["popupTemplateMap"] = popupTemplateMap;
        config["data"] = data;

        resolve(config);
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
 *  Build popup title and content from global configurations
 *  Content have three parts : customContent , defaultTable , customLink
 * @param {*} feature
 * @param {*} config
 * @returns
 */
function buildDefaultPopup(feature, config) {
  let title = feature.properties.name;
  let content = {};

  if (config.popupTitle) {
    const matches = config.popupTitle.match(/{(.*?)}/g);
    const variablesExist = matches
      ? matches.every((match) =>
          feature.properties.hasOwnProperty(match.slice(1, -1))
        )
      : true;

    // If all variables exist, use the custom title, otherwise use the name
    if (variablesExist) {
      title = config.popupTitle.replace(
        /{(.*?)}/g,
        (_, key) => feature.properties[key]
      );
    }
  }

  if (config.popupContent) {
    const matches = config.popupContent.match(/{(.*?)}/g);
    const variablesExist = matches
      ? matches.every((match) =>
          feature.properties.hasOwnProperty(match.slice(1, -1))
        )
      : true;

    if (variablesExist) {
      let res = purifyContent(
        config.popupContent.replace(
          /{(.*?)}/g,
          (_, key) => feature.properties[key]
        )
      );

      if (res && res != "") {
        content.customContent = res; // Purify the content to prevent XSS
      }
    }
  }

  //Default table content
  content.defaultTable = buildPopupContentTable(
    feature,
    config.popupFieldLabels,
    config.popupAllowedFields,
    config.popupBlockedFields
  );

  if (config.popupLinks) {
    let links = "";
    config.popupLinks.forEach((link) => {
      links += `<p><a href="${link.link}" target="${
        link.target ? link.target : "_blank"
      }">${link.text}</a></p>`;
    });
    content.customLink = links;
  }

  return { title, content };
}

/**
 * Build defaultTable for popup content
 * @param {*} feature  GeoJSON feature for each pin
 * @param {*} fieldLabels Custom field label display . HashMap
 * @param {*} allowedFields White list for fields to display . HashSet
 * @param {*} blockedFields Black list for fields to display . HashSet
 * @param {*} links Links to display . Array
 */
function buildPopupContentTable(
  feature,
  fieldLabels,
  allowedFields,
  blockedFields
) {

  if(allowedFields && allowedFields.size === 0){
    return null;
  }
  const properties = feature.properties;

  let res = "<div><table class='esri-widget__table'>";

  for (let key in properties) {
    if (allowedFields && !allowedFields.has(key)) {
      continue;
    }

    if (blockedFields && blockedFields.has(key)) {
      continue;
    }

    if (!properties[key] && properties[key] !== 0) {
      continue;
    }

    const value = properties[key].toString();
    const label =
      fieldLabels && fieldLabels.has(key) ? fieldLabels.get(key) : key;

    res += `<tr><th class="esri-feature-fields__field-header">${label}</th>
    <td class="esri-feature-fields__field-data">${value}</td></tr>`;
  }

  res += "</table></div>";
  return res;
}
