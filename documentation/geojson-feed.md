# GeoJSON Feed

TLCMap views use standard [GeoJSON](https://datatracker.ietf.org/doc/html/rfc7946) with some extended
[foreign members](https://datatracker.ietf.org/doc/html/rfc7946#autoid-28) as the input data. The GeoJSON feed should
contain a single `FeatureCollection` object as the whole dataset. Places within the dataset should be created as
`Feature` objects inside the `FeatureCollection` object.

## FeatureCollection

The top-level FeatureCollection describes the whole dataset and groups places from the dataset together. It MAY have the
foreign member `metadata` to store the information about the dataset. The value of the metadata property is an object
which stores metadata as property/value pairs.

For example:

```json
{
  "type": "FeatureCollection",
  "metadata": {
    "id": "7923",
    "name": "Art and Artists - Aboriginal and Torres Strait Islander History",
    "description": "Some important people and events in the history of Aboriginal and Torres Strait Islander art. This isn't a complete list but is a good place to start."
  },
  "features": []
}
```

## Feature

The `Feature` object represents a place from the dataset. Each Feature object has a `Geometry` object of `Point` type
as its `geometry` member. The `Feature` object MAY have the `properties` member to store metadata about the place.

For example:

```json
{
    "type": "Feature",
    "geometry": {
        "type": "Point",
        "coordinates": [
            122.271124,
            -21.66354
        ]
    },
    "properties": {
        "name": "Rover Thomas",
        "description": "Rover Thomas was an artist of the East Kimberley School and inspired fellow East Kimberley artists, such as Queenie McKenzie. His works were the subject of the solo exhbition \"Roads Cross: The Paintings of Rover Thomas\" at the National Gallery of Australia, Canberra in 1994.",
        "id": "tb326",
        "datestart": "1926-01-01",
        "dateend": "1998-04-11"
    }
}
```
