# Collection views

TLCMap views can also visualise collections of GeoJSON datasets. Each GeoJSON dataset within the collection is rendered
with a unique color. And a legend is generated which lists each dataset inside collection with its color.

All views documented above have the corresponding collection views, which are described in the following table.

| Collection View | URL                                                          |
| --------------- | -------------------------------------------------------------|
| 3D view         | `https://views.tlcmap.org/latest/collection-3d.html`         |
| Cluster view    | `https://views.tlcmap.org/latest/collection-cluster.html`    |
| Journey view    | `https://views.tlcmap.org/latest/collection-journey.html`    |
| Timeline view   | `https://views.tlcmap.org/latest/collection-timeline.html`   |
| Werekata view   | `https://views.tlcmap.org/latest/collection-werekata.html`   |

## Collection data feed

Similar to other views, collection views read the collection data through the parameter `load` from the URL query
string. For example:

```
https://views.tlcmap.org/latest/collection-3d.html?load=https%3A%2F%2Ftlcmap.org%2Fmultilayers%2F6%2Fjson

```

A collection data feed is the JSON data describing the collection. The minimum requirement of the collection data feed
is to have the `datasets` property defined. The value of the `datasets` property is an array which contains a list of
dataset objects. Each dataset object MUST contain the `name` of the dataset, which is used to generate the legend.

Each dataset object MUST also provide its GeoJSON data using one of the following:

- `jsonURL`: a URL pointing to the GeoJSON feed for the dataset, OR
- `features`: the GeoJSON `Feature` array embedded directly in the dataset object (along with any other GeoJSON
  members such as `type`, `metadata`, or `display`).

For example, a minimum collection data feed using `jsonURL`:

```json
{
    "datasets": [
        {
            "name": "WA Aboriginal Journey Ways",
            "jsonURL": "https://tlcmap.org/multilayers/38/json"
        },
        {
            "name": "Early Land Exploration",
            "jsonURL": "https://tlcmap.org/multilayers/37/json"
        },
        {
            "name": "Second Dispossession: NSW Rail and the Aboriginal Protection Board",
            "jsonURL": "https://tlcmap.org/multilayers/42/json"
        }
    ]
}
```

A collection data feed embedding GeoJSON directly in the dataset object:

```json
{
    "datasets": [
        {
            "name": "Places I visited",
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [151.2094444, -33.865]
                    },
                    "properties": {
                        "name": "Sydney"
                    }
                }
            ]
        }
    ]
}
```

The collection data feed can optionally have the `metadata` describing the collection.

For example:

```json
{
    "metadata": {
        "name": "Aboriginal and Torres Strait Islander History",
        "description": "Some important people and events in the history of Aboriginal and Torres Strait Islander people. This isn't a complete list but is a good place to start.",
        "warning": "These layers contains names of people who have passed."
    },
    "datasets": [
        {
            "name": "WA Aboriginal Journey Ways",
            "jsonURL": "https://tlcmap.org/multilayers/38/json"
        },
        {
            "name": "Early Land Exploration",
            "jsonURL": "https://tlcmap.org/multilayers/37/json"
        },
        {
            "name": "Second Dispossession: NSW Rail and the Aboriginal Protection Board",
            "jsonURL": "https://tlcmap.org/multilayers/42/json"
        }
    ]
}
```
