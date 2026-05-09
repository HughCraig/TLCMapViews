# Dataset configurations

Dataset configurations can be set to the dataset objects in the collection data feed.

## Color

By default, the collection view assigns a random color to each dataset within the collection. To set a particular color
for a dataset, set `color` in dataset configurations with the HEX color code.

> [!NOTE]
> all color configurations set on features in the dataset GeoJSON feed will be ignored when displayed in a collection 
view. However, the line color set on a route for the collection journey view can still apply. If no line color is set on
the routes of a dataset, the default color of lines would be same color as the node color when a dataset is visualised
in the collection journey view.

Example:

```json
{
    "metadata": {
        // Collection metadata.
    },
    "datasets": [
        {
            "name": "WA Aboriginal Journey Ways",
            "jsonURL": "https://tlcmap.org/multilayers/38/json",
            "display": {
                "color": "#000000"
            }
        }
    ],
    "display": {
        // Collection configurations.
    }
}
```

## List pane

The `listPane` configurations on the dataset level control the detailed information of datasets displayed in the list
pane.

![List pane detail](./images/list-pane-detail.png)

By default, if no configuration is provided, the list pane will simply list the names of the datasets without any
detailed information. If a dataset has more detailed information provided, users can click on the "exclamation" icon to
expand the details about that dataset.

### Show color

A color dot representing the color of the dataset can be displayed in list pane. Set `showColor` to `true` to enable
this. By default, it's set to `false`.

Example:

```json
{
    "metadata": {
        // Collection metadata.
    },
    "datasets": [
        {
            "name": "WA Aboriginal Journey Ways",
            "jsonURL": "https://tlcmap.org/multilayers/38/json",
            "display": {
                "listPane": {
                    "showColor": true
                }
            }
        }
    ],
    "display": {
        // Collection configurations.
    }
}
```

### Content

The content of the dataset details in the list pane can be set via the `content` property. The value of the content can
be plain text or [restricted HTML](./global-configurations.md#restricted-html).

Example:

```json
{
    "metadata": {
        // Collection metadata.
    },
    "datasets": [
        {
            "name": "WA Aboriginal Journey Ways",
            "jsonURL": "https://tlcmap.org/multilayers/38/json",
            "display": {
                "listPane": {
                    "showColor": true,
                    "content": "<div class=\"warning-message\"><strong>Warning</strong><br>This layer contains historical information about Aboriginal people that may be distressing. It contains names of people who have passed away.</div><div>Before, and for some time after the 1967 referendum Aboriginal people were subjected to law and social policy that controlled every aspect of their lives. They were excluded from all the supports (hospitals and public housing) and payments (wages, pensions, dole, child benefit) given to non-Aboriginal people. They were subjected to curfews and condemned to absolute poverty. Many lived in ancient camping grounds or reserved lands until they were cleared out.</div><p><a target=\"_blank\" href=\"https://tlcmap.org/publicdatasets/258\">View layer details</a></p>"
                }
            }
        }
    ],
    "display": {
        // Collection configurations.
    }
}
```
