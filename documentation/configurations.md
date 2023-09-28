# Configurations

GeoJSON data passed into TLCMap views can be extended with certain properties to control the look and feel of the map
views.

To customise the map views, GeoJSON objects such as `Feature` and `FeatureCollection` from the data feed can have a
property called `display` specified. The value of the display property is a JSON object containing configurations
which affect the UI.

> [!NOTE]
> The `display` object is an extended GeoJSON object, which only makes sense in the TLCMap views context. Other
GeoJSON consumers such other map viewers may not understand the `display` property.

- [Global configurations](./global-configurations.md)
- [Feature configurations](./feature-configurations.md)
- [Collection configurations](./collection-configurations.md)
- [Dataset configurations](./dataset-configurations.md)
