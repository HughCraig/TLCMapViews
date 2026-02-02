/**
 * Loading and configuring the information block.
 * @param {Object} config   User Configurations from JSON url input
 * @param {Object} infoDivExpand  ArcGIS Expand widget
 * @param {Object} view ArcGIS MapView
 */
function loadInfoBlock(config, infoDivExpand, view) {
    const infoDiv = document.getElementById("infoDiv");

    infoDivExpand.collapsedIconClass = "esri-icon-collapse";
    infoDivExpand.expandedIconClass = "esri-icon-expand";
    infoDivExpand.expandTooltip = "Show";
    infoDivExpand.view = view;
    infoDivExpand.content = infoDiv;
    infoDivExpand.expanded = config.infoDisplay === "hidden" ? false : true;

    view.ui.add(infoDivExpand, "top-right");

    //Info logo
    if (config.logo) {
        let iconElement = document.querySelector(".mdicon");
        iconElement.src = config.logo;

        if (config.logoLink != null) {
            let linkElement = document.createElement("a");
            linkElement.href = config.logoLink;
            
            iconElement.parentNode.replaceChild(linkElement, iconElement);
            linkElement.appendChild(iconElement);
        }
    }

    //Info title
    if (config.titleText != null) {
        const titleElement = document.createElement("h3");
        titleElement.innerText = config.titleText;

        if (config.titleLink != null) {
            const anchorElement = document.createElement("a");
            anchorElement.href = config.titleLink;
            anchorElement.appendChild(titleElement);
            anchorElement.target = config.titleLinkTarget;
            infoDiv.appendChild(anchorElement);
        } else {
            infoDiv.appendChild(titleElement);
        }
    }

    //Info content
    if (config.content != null && config.content != "") {
        document.querySelector("#infoDiv").innerHTML += config.content;
    }

    if(config.enableShareWidget && config.enableShareWidget === true){   
        infoDiv.insertAdjacentHTML(
        "beforeend",
        `
        <div id="share-this">
            <h4>Share:</h4>
            <div class="share-row">
            <a id="share-facebook" class="facebook" target="_blank" title="Share on Facebook"><i class="fab fa-facebook-f"></i></a>
            <a id="share-linkedin" class="linkedin" target="_blank" title="Share on LinkedIn"><i class="fab fa-linkedin-in"></i></a>
            <a id="share-whatsapp" class="whatsapp" target="_blank" title="Share on WhatsApp"><i class="fab fa-whatsapp"></i></a>
            <a id="share-email" class="email" target="_blank" title="Send via Email"><i class="fas fa-envelope"></i></a>
            <a id="share-download" class="download" title="Download"><i class="fas fa-download"></i></a>
            <a id="share-code" class="code" href="#" title="Get Embed Code"><i class="fas fa-code"></i></a>
            <a id="share-copy" class="copy" href="#" title="Copy Link"><i class="fas fa-link"></i></a>
            </div>
        </div>

        <div id="codeModal" class="modal" aria-hidden="true" role="dialog" style="display:none">
            <div class="modal-content">
            <span class="close" aria-label="Close">&times;</span>
            <h4>Embed this map:</h4>
            <textarea readonly id="embed-snippet"></textarea>
            <button id="copyCodeButton">Copy</button>
            </div>
        </div>
        `
        );
        initShareWidget(config);
    }
}


/**
 * Initialise share widget links and behaviour.
 *
 * @param {Object} config User Configurations from JSON url input
 */
function initShareWidget(config) {
    const elFacebook = document.getElementById("share-facebook");
    const elLinkedIn = document.getElementById("share-linkedin");
    const elWhatsApp = document.getElementById("share-whatsapp");
    const elEmail = document.getElementById("share-email");
    const elDownload = document.getElementById("share-download");
    const elCode = document.getElementById("share-code");
    const elCopy = document.getElementById("share-copy");

    const modal = document.getElementById("codeModal");
    const closeBtn = modal ? modal.querySelector(".close") : null;

    const embedBox = document.getElementById("embed-snippet");
    const copyCodeBtn = document.getElementById("copyCodeButton");

    if (
        !elFacebook ||
        !elLinkedIn ||
        !elWhatsApp ||
        !elEmail ||
        !elCode ||
        !elCopy ||
        !modal ||
        !closeBtn ||
        !embedBox ||
        !copyCodeBtn
    ) {
        return;
    }

    // Copy helper with fallback
    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand("copy");
        } finally {
            document.body.removeChild(ta);
        }
        return Promise.resolve();
    }

    const pageUrlRaw = window.location.href;
    const pageUrl = encodeURIComponent(pageUrlRaw);
    const pageTitle = encodeURIComponent(document.title || "Shared page");

    // Share buttons
    elFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
    elLinkedIn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${pageUrl}`;
    elWhatsApp.href = `https://api.whatsapp.com/send?text=${pageTitle}%20${pageUrl}`;
    elEmail.href = `mailto:?subject=${pageTitle}&body=${pageTitle}%0A${pageUrl}`;
    elDownload.href = config.titleLink;
    embedBox.value = `<iframe src="${pageUrlRaw}" width="90%" height="400"></iframe>`;

    // Modal open/close
    elCode.addEventListener("click", (e) => {
        e.preventDefault();
        embedBox.value = `<iframe src="${window.location.href}" width="90%" height="400"></iframe>`;
        modal.style.display = "block";
    });
    closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });
    window.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
    });

    // Copy embed snippet
    copyCodeBtn.addEventListener("click", async function () {
        await copyText(embedBox.value);
        this.textContent = "Copied!";
        setTimeout(() => {
            this.textContent = "Copy";
        }, 2000);
    });

    // Copy page link
    elCopy.addEventListener("click", async function (e) {
        e.preventDefault();
        await copyText(window.location.href);
        const icon = this.querySelector("i");
        if (icon && icon.classList.contains("fa-link")) {
            icon.classList.replace("fa-link", "fa-check");
            setTimeout(() => {
                icon.classList.replace("fa-check", "fa-link");
            }, 2000);
        }
    });
}

/**
 * Loading and configuring the baseMap gallery block.
 * @param {Object} basemapGallery ArcGIS BasemapGallery widget
 * @param {Object} bgExpand ArcGIS Expand widget
 * @param {Object} view ArcGIS MapView
 */
function loadBaseMapGallery(basemapGallery, bgExpand, view) {
    basemapGallery.view = view;
    basemapGallery.container = document.createElement("div");

    bgExpand.view = view;
    bgExpand.content = basemapGallery.container;
    bgExpand.expandIconClass = "esri-icon-basemap";

    view.ui.add(bgExpand, "top-right");
}

/**
 * Pop up template format
 * @param {Object} config User Configurations from JSON url input
 * @returns ArcGIS PopupTemplate object
 */
function loadPopUpTemplate(config) {
    //Title
    let formatTitle = function (feature) {
        const id = feature.graphic.attributes.tlcMapUniqueId;
        if (config.popupTemplateMap.has(id)) {
            const title = config.popupTemplateMap.get(id).title;

            let dummyElement = document.createElement("div");
            dummyElement.innerText = title; // Set the title as text of dummyElement
            let safeTitle = dummyElement.innerHTML; // Only return plain text instead of html element

            return safeTitle;
        }
        return "{name}";
    };

    //Content
    let formatContent = function (feature) {
        if (
            config.popupTemplateMap.has(
                feature.graphic.attributes.tlcMapUniqueId
            ) &&
            config.popupTemplateMap.get(
                feature.graphic.attributes.tlcMapUniqueId
            ).content != null &&
            config.popupTemplateMap.get(
                feature.graphic.attributes.tlcMapUniqueId
            ).content != ""
        ) {
            const div = document.createElement("div");
            div.innerHTML = config.popupTemplateMap.get(
                feature.graphic.attributes.tlcMapUniqueId
            ).content;
            return div;
        } else {
            return "<div></div>";
        }
    };

    let template = {
        title: formatTitle,
        content: formatContent,
        outFields: ["*"],
    };

    return template;
}

/**
 * Loading and configuring the renderer.
 * @param {Object} config User Configurations from JSON url input
 * @returns ArcGIS Renderer object
 */
function loadRenderer(config) {
    let renderer = {
        type: "unique-value",
        defaultSymbol: { type: "simple-fill" },
        field: "tlcMapUniqueId", // The name of the attribute field containing types or categorical values referenced in uniqueValueInfos or uniqueValueGroups
        uniqueValueInfos: config.data.features.map((feature) => ({
            value: feature.properties.tlcMapUniqueId,
            symbol: {
                type: "simple-marker",
                color:
                    feature.display && feature.display.color
                        ? feature.display.color
                        : config.color,
                outline: {
                    color: "white",
                },
            },
        })),
    };

    return renderer;
}

/**
 * Loading and configuring the layer.
 * @param {Object} config User Configurations from JSON url input
 * @param {Object} layerLlistExpand ArcGIS Expand widget
 * @param {Object} view ArcGIS MapView
 * @param {Object} layerList ArcGIS LayerList
 */
function loadListPane(config, layerListExpand, view, layerList) {
    (layerListExpand.collapsedIconClass = "esri-icon-collapse"),
        (layerListExpand.expandIconClass = "esri-icon-expand"),
        (layerListExpand.expandTooltip = "Show"),
        (layerListExpand.view = view),
        (layerListExpand.content = layerList),
        (layerListExpand.expanded =
            config.listPane === "hidden" ? false : true),
        view.ui.add(layerListExpand, {
            position: "top-left",
            index: 0,
        });
}
