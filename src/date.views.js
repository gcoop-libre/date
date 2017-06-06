/**
 * Implements hook_views_exposed_filter().
 */
function date_views_exposed_filter(form, form_state, element, filter, field) {
  try {

    // Partially implemented exposed operator.
    if (filter.options.expose.use_operator) {
      form.elements[filter.options.expose.operator] = {
        title: t("Operator"),
        type: "select",
        options: {
          "&lt;": t("Is less than"),
          "&lt;=": t("Is less than or equal to"),
          "=": t("Is equal to"),
          "!=": t("Is not equal to"),
          "&gt;=": t("Is greater than or equal to"),
          "&gt;": t("Is greater than"),
          "between": t("Is between"),
          "not between": t("Is not between"),
          "empty": t("Is empty (NULL)"),
          "not empty": t("Is not empty (NOT NULL)"),
          "regular_expression": t("Regular expression"),
          "contains": t("Contains")
        }
      }
    }

    // Convert the item into a hidden field that will have its value populated dynamically by the widget. We'll store
    // the value (and potential value2) within the element using this format: YYYY-MM-DD HH:MM:SS|YYYY-MM-DD HH:MM:SS
    element.type = 'hidden';

    element.attributes = {
      name: filter.definition.field
    };

    // Minute increment.
    var increment = 1;

    var value_set = false;
    var value2_set = false;

    // Grab the current date.
    var date = new Date();

    // Get the item date and offset, if any.
    var date_and_offset = _date_get_item_and_offset(items, delta, 'value', value_set, value2_set, field);
    var item_date = date_and_offset.item_date;
    var offset = date_and_offset.offset;

    var military = true;

    // For each grain of the granularity, add it as a child to the form element. As we
    // build the child widgets we'll set them aside one by one that way we can present
    // the inputs in a desirable order later at render time.
    var _widget_year = null;
    var _widget_month = null;
    var _widget_day = null;
    var _widget_hour = null;
    var _widget_minute = null;
    var _widget_second = null;
    var _widget_ampm = null;

    // Build a fake instance for widget building.
    var instance = {widget: {settings: {year_range: filter.options.year_range}}};

    // Supported grains.  Do not build widgets for grains lower than the filter
    // wants.
    var grains = ['second', 'minute', 'hour', 'day', 'month', 'year'];

    $.each(field.settings.granularity, function(grain, value) {
      if (value && grains.indexOf(grain) >= grains.indexOf(filter.options.granularity)) {

        // Build a unique html element id for this select list. Set up an
        // onclick handler and send it the id of the hidden input that will
        // hold the date value.
        var id = element.options.attributes.id
        id += '-' + grain;
        var attributes = {
          id: id,
          onchange: "date_select_onchange(this, '" + element.options.attributes.id + "', '" + grain + "', " + military + ", " + increment + ", " + offset + ")"
        };
        switch (grain) {

          // YEAR
          case 'year':
            _widget_year = _date_grain_widget_year(date, instance, attributes);
            break;

          // MONTH
          case 'month':
            _widget_month = _date_grain_widget_month(date, instance, attributes);
            break;

          // DAY
          case 'day':
            _widget_day = _date_grain_widget_day(date, instance, attributes);
            break;

          // HOUR
          case 'hour':
            _widget_hour = _date_grain_widget_hour(date, instance, attributes, false, false, null, military);

            // Add an am/pm selector if we're not in military time. Hang onto the old value so we
            // can prevent the +/- 12 adjustment from happening if the user selects the same
            // thing twice.
            if (!military) {
              var onclick = attributes.onchange.replace(grain, 'ampm') +
                  '; this.date_ampm_old_value = this.value;';
              var ampm_value =  parseInt(item_date.getHours()) < 12 ? 'am' : 'pm';
              _widget_ampm = {
                type: 'select',
                attributes: {
                  id: attributes.id.replace(grain, 'ampm'),
                  onclick: onclick,
                  date_ampm_original_value: ampm_value
                },
                value: ampm_value,
                options: {
                  am: 'am',
                  pm: 'pm'
                }
              };
            }
            break;

          // MINUTE
          case 'minute':
            _widget_minute = _date_grain_widget_minute(date, instance, attributes, false, false, null, false, 1);
            break;

          // SECOND
          case 'second':
            _widget_second = _date_grain_widget_second(date, instance, attributes);
            break;

          default:
            console.log('WARNING: date_field_widget_form() - unsupported grain! (' + grain + ')');
            break;
        }
      }
    });

    var items = {0: element};
    var delta = 0;
    //Wrap the widget with some better UX.
    _date_grain_widgets_ux_wrap(
        items,
        delta,
        _widget_year,
        _widget_month,
        _widget_day,
        _widget_hour,
        _widget_minute,
        _widget_second,
        _widget_ampm
    );

    element = items[0];
    element.default_value = date_yyyy_mm_dd_hh_mm_ss(date_yyyy_mm_dd_hh_mm_ss_parts(date));
    element.value_callback = 'date_views_exposed_filter_value';

    form.submit.unshift('date_views_exposed_filter_submit');
    // The filter is a nested array resulting in a parameter such as
    // field_date_value[value][date], but field_date_value is the name of this
    // element, so the submit handler will rename the field.
    if (typeof form['rename_elements'] == 'undefined') {
      form['rename_elements'] = {};
    }
    form['rename_elements'][element.attributes.name] = element.attributes.name + '[value][date]';
  }
  catch (error) { console.log('date_views_exposed_filter - ' + error); }
}

/**
 * Submit handler for views_exposed_filter forms containing date filters.
 *
 * Renames elements in form_state.values according to the mapping in
 * form['rename_elements'].
 */
function date_views_exposed_filter_submit(form, form_state) {
  try {
    if (typeof form['rename_elements'] != 'undefined') {
      $.each(form['rename_elements'], function (oldName, newName) {
        form_state.values[newName] = form_state.values[oldName];
        delete form_state.values[oldName];
      });
    }
  }
  catch (error) { console.log('date_views_exposed_filter_submit - ' + error); }
}

/**
 * Value callback for date views exposed filter.
 *
 * Strips out grains not supported by the filter.
 */
function date_views_exposed_filter_value(id, element) {
  try {
    switch (element.filter.options.granularity) {
      case 'year':
        var length = 4;
        break;
      case 'month':
        var length = 7;
        break;
      case 'day':
        var length = 10;
        break;
      case 'hour':
        var length = 13;
        break;
      case 'minute':
        var length = 16;
        break;
      case 'second':
      default:
        var length = 19;
        break;
    }
    return $('#' + id).val().substr(0, length)
  }
  catch (error) { console.log('date_views_exposed_filter_value - ' + error); }
}
