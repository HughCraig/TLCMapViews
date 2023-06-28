/**
 * Class contains helper functions for collection visualization.
 */
class CollectionUtility {

    /**
     * Get the min and max time from an array of layers.
     *
     * @param {Array} layers
     *   Array contains the GeoJSONLayer instances.
     * @return {Array}
     *   The start date object and end date object.
     */
    static getLayersTimeExtent(layers) {
        let start = null;
        let end = null;
        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            if (typeof layer.timeInfo.fullTimeExtent.start !== 'undefined') {
                const layerStart = new Date(layer.timeInfo.fullTimeExtent.start);
                if (start === null || layerStart < start) {
                    start = layerStart;
                }
            }
            if (typeof layer.timeInfo.fullTimeExtent.end !== 'undefined') {
                const layerEnd = new Date(layer.timeInfo.fullTimeExtent.end);
                if (end === null || layerEnd > end) {
                    end = layerEnd;
                }
            }
        }
        return [start, end];
    }

    /**
     * Calculate the timeline interval unit based on the start and end time.
     *
     * @param {Date} start
     *   The start time.
     * @param {Date} end
     *   The end time.
     * @return {string}
     *   The interval unit.
     */
    static getTimelineIntervalUnit(start, end) {
        const fulltimespan = Math.abs(start.getTime() / 1000 - end.getTime() / 1000);
        let tunit = "minutes";
        tunit = (fulltimespan > 864000) ? "days" : tunit; //  than 10 days
        tunit = (fulltimespan > 31540000) ? "months" : tunit; //  than a year
        tunit = (fulltimespan > 1577000000) ? "years" : tunit; //  than 50 years
        tunit = (fulltimespan > 31540000000) ? "decades" : tunit; //  than 1000 years
        tunit = (fulltimespan > 315360000000) ? "centuries" : tunit; //  than 10000 years.
        return tunit;
    }

    /**
     * Sanitize the value for HTML output.
     *
     * @param {string} value
     *   The raw value.
     * @return {string}
     *   The sanitized value.
     */
    static sanitize(value) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            "/": '&#x2F;',
        };
        const reg = /[&<>"'/]/ig;
        return value.replace(reg, (match) => (map[match]));
    }
}
