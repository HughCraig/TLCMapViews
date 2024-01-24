/**
 * Determines whether two longitudes of two coordinated cross the International Date Line (IDL).
 *
 * @param {number} longitude1 - The longitude of the first point.
 * @param {number} longitude2 - The longitude of the second point.
 * @return {boolean} True if the longitudes cross the IDL, false otherwise.
 */
function isCrossingIDL(longitude1, longitude2) {
    return Math.abs(longitude1 - longitude2) > 180;
}

/**
 * Finds the crossing coordinate at the IDL for two coordinated.
 *
 * Used for splitting a path at IDL.
 *
 * @param {Array<Array<number>>} paths - Array of paths, length of path is supposed to be 2
 * @return {Array<Array<number>> | null} An array containing two coordinates representing the crossing
 *         points at the IDL.
 */
function findCrossingCoordinatesAtIDL(paths) {
    if (paths.length <= 1) {
        return null;
    }
    let res = null;
    let epsilon = 0.000001;

    paths.forEach((coordinates) => {
        coordinates.forEach((coordinate) => {
            let longitude = coordinate[0];

            if (
                Math.abs(longitude - 180) < epsilon ||
                Math.abs(longitude + 180) < epsilon
            ) {
                res = [
                    [180.000001, coordinate[1]],
                    [-179.99999, coordinate[1]],
                ];

                return;
            }
        });
        if (res !== null) {
            return;
        }
    });

    return res;
}

/**
 * Modifies journey lines to account for crossings over the International Date Line (IDL) issue.
 *
 * This function processes a set of coordinates representing a journey. If a segment of the journey
 * crosses the IDL, the function splits the journey at the crossing point, creating new segments
 * that correctly represent the path crossing the IDL.
 *
 * @param {Array<Array<number>>} coordinates - An array of coordinates representing the journey.
 * @param {Polyline} Polyline - The Polyline constructor from the mapping library.
 * @param {object} geodesicUtils - An object providing geodesic utilities for densification.
 * @param {object} normalizeUtils - An object providing normalization utilities over the central meridian.
 * @return {Promise<Array<Array<Array<number>>>>} A promise that resolves to an array of journey lines,
 *         each represented as an array of coordinates, modified to account for IDL crossings.
 */
async function modifyJourneyLines(
    coordinates,
    Polyline,
    geodesicUtils,
    normalizeUtils
) {
    if (coordinates.length <= 1) {
        return [coordinates];
    }

    var modifiedJourneyLines = [];
    var currentLine = [];

    for (let i = 0; i < coordinates.length; i++) {
        if (i > 0 && isCrossingIDL(coordinates[i - 1][0], coordinates[i][0])) {
            //Generate coordinated of intersection at IDL using normalizeCentralMeridian function by Arcgis
            var polyline = new Polyline({
                paths: [coordinates[i - 1], coordinates[i]],
            });

            let densifiedPolyline = geodesicUtils.geodesicDensify(
                polyline,
                10000000000
            );
            let normalizedGeometry =
                await normalizeUtils.normalizeCentralMeridian(
                    densifiedPolyline
                );

            var crossingCoordinates = findCrossingCoordinatesAtIDL(
                normalizedGeometry[0].paths
            );

            if (crossingCoordinates != null) {
                var otherEnd = null;

                // Push intersection point at IDL. Need to be on same side of IDL
                if (coordinates[i - 1][0] > 0) {
                    currentLine.push(crossingCoordinates[0]);
                    otherEnd = crossingCoordinates[1];
                } else {
                    currentLine.push(crossingCoordinates[1]);
                    otherEnd = crossingCoordinates[0];
                }

                modifiedJourneyLines.push(currentLine); //Push new line segment to journey lines

                currentLine = []; //Reset current line

                currentLine.push(otherEnd); //Push other end of intersection coordinated , build new line segment
            }
        }

        currentLine.push(coordinates[i]);
    }

    modifiedJourneyLines.push(currentLine);

    return modifiedJourneyLines;
}
