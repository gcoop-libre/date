date
====

The DrupalGap Date module.

## settings.js

You can load either the date.js file, or the date.min.js file using **one** of these snippets in your settings.js file:

```
// Load date.js
Drupal.modules.contrib['date'] = {};

// Load date.min.js
Drupal.modules.contrib['date'] = {
  minified: true
};
```

Dependencies
============

The Date Module needs:

* [cordova-plugin-datepicker](https://github.com/VitaliiBlagodir/cordova-plugin-datepicker)
