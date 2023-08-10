# Collection views

TLCMap views can also visualise collections of GeoJSON datasets. Each GeoJSON dataset within the collection is rendered
with a unique color. And a legend is generated which lists each dataset inside collection with its color.

All views documented above have the corresponding collection views, which are described in the following table.

| Collection View | URL                                                      |
| --------------- | -------------------------------------------------------- |
| 3D view         | `https://views.tlcmap.org/v2/collection-3d.html`         |
| Cluster view    | `https://views.tlcmap.org/v2/collection-cluster.html`    |
| Journey view    | `https://views.tlcmap.org/v2/collection-journey.html`    |
| Timeline view   | `https://views.tlcmap.org/v2/collection-timeline.html`   |
| Werekata view   | `https://views.tlcmap.org/v2/collection-werekata.html`   |

## Collection data feed

Similar to other views, collection views read the collection data through the parameter `load` from the URL query
string. For example:

```
https://views.tlcmap.org/v2/collection-3d.html?load=https%3A%2F%2Fghap.tlcmap.org%2Fpubliccollections%2F6%2Fjson
```

A collection data feed is the JSON data describing the collection. The minimum requirement of the collection data feed
is to have the `datasets` property defined. The value of the `datasets` property is an array which contains a list of
dataset objects. Each dataset object MUST contain the `name` of the dataset, which is used to generate the legend.
It also MUST have the `jsonURL` of the GeoJSON feed for that dataset.

For example, a minimum collection data feed:

```json
{
    "datasets": [
        {
            "name": "Deep time - Aboriginal and Torres Strait Islander History",
            "jsonURL": "https://ghap.tlcmap.org/publicdatasets/239/json"
        },
        {
            "name": "Politics and Law - Aboriginal and Torres Strait Islander History",
            "jsonURL": "https://ghap.tlcmap.org/publicdatasets/238/json"
        },
        {
            "name": "Film - Aboriginal and Torres Strait Islander History",
            "jsonURL": "https://ghap.tlcmap.org/publicdatasets/236/json"
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
            "name": "Deep time - Aboriginal and Torres Strait Islander History",
            "jsonURL": "https://ghap.tlcmap.org/publicdatasets/239/json"
        },
        {
            "name": "Politics and Law - Aboriginal and Torres Strait Islander History",
            "jsonURL": "https://ghap.tlcmap.org/publicdatasets/238/json"
        },
        {
            "name": "Film - Aboriginal and Torres Strait Islander History",
            "jsonURL": "https://ghap.tlcmap.org/publicdatasets/236/json"
        }
    ]
}
```
