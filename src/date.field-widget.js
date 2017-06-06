/**
 * Implements hook_field_widget_form().
 */
function date_field_widget_form(form, form_state, field, instance, langcode, items, delta, element) {
  try {

    //console.log(form);
    //console.log(form_state);
    //console.log(field);
    //console.log(instance);
    //console.log(langcode);
    //console.log(items);
    //console.log(delta);
    //console.log(element);

    // Convert the item into a hidden field that will have its value populated dynamically by the widget. We'll store
    // the value (and potential value2) within the element using this format: YYYY-MM-DD HH:MM:SS|YYYY-MM-DD HH:MM:SS
    items[delta].type = 'hidden';

    // Determine if the "to date" is disabled, optional or required.
    var todate = field.settings.todate; // '', 'optional', 'required'

    // Grab the minute increment.
    var increment = parseInt(instance.widget.settings.increment);
    var d = new Date();
    d.setMinutes(_date_minute_increment_adjust(increment, d.getMinutes()));

    // Check and set default values, and items[delta] values.
    var date_values_set = _date_widget_check_and_set_defaults(items, delta, instance, d);
    var value_set =  date_values_set.value_set;
    var value2_set =  date_values_set.value2_set;

    // If we have a value2, append it to our hidden input's value and default value. We need to set the value attribute
    // on this item, otherwise the DG FAPI will default it to the item's value, which is only the first part of the
    // date.
    if (value2_set && items[delta].value.indexOf('|') == -1) {
      items[delta].value += '|' + items[delta].item.value2;
      if (!items[delta].attributes) { items[delta].attributes = {}; }
      items[delta].attributes.value = items[delta].value;
    }

    // Grab the current date.
    if (date_apple_device()) {
      // console.log('--- APPLE DEVICE --- (Grab the current date)');
      var date = new Date();
      var date = date.getTime() + (date.getTimezoneOffset() * 60000);
      var date = new Date(date);
    } else {
      // console.log('--- NON APPLE DEVICE --- (Grab the current date)');
      var date = new Date();
    }

    // Depending if we are collecting an end date or not, build a widget for each date value.
    var values = ['value'];
    if (!empty(todate)) { values.push('value2'); }
    $.each(values, function(_index, _value) {

      // Get the item date and offset, if any.
      var date_and_offset = _date_get_item_and_offset(items, delta, _value, value_set, value2_set, field);
      var item_date = date_and_offset.item_date;
      var offset = date_and_offset.offset;
      //var timezone = date_and_offset.timezone ? date_and_offset.timezone : null;
      //var timezone_db = date_and_offset.timezone_db ? date_and_offset.timezone_db : null;

      //if (timezone && offset) {
      //  var difference = drupalgap.time_zones[timezone] - offset;
      //}

      // Are we doing a 12 or 24 hour format?
      var military = date_military(instance);

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
      $.each(field.settings.granularity, function(grain, value) {
        if (value) {

          // Build a unique html element id for this select list. Set up an
          // onclick handler and send it the id of the hidden input that will
          // hold the date value.
          var id = items[delta].id;
          if (_value == 'value2') { id += '2'; } // "To date"
          id += '-' + grain;
          var attributes = {
            id: id,
            onchange: "date_select_onchange(this, '" + items[delta].id + "', '" + grain + "', " + military + ", " + increment + ", " + offset + ")"
          };
          switch (grain) {

            // YEAR
            case 'year':
              _widget_year = _date_grain_widget_year(date, instance, attributes, value_set, value2_set, item_date);
              break;

            // MONTH
            case 'month':
              _widget_month = _date_grain_widget_month(date, instance, attributes, value_set, value2_set, item_date);
              break;

            // DAY
            case 'day':
              _widget_day = _date_grain_widget_day(date, instance, attributes, value_set, value2_set, item_date);
              break;

            // HOUR
            case 'hour':
              _widget_hour = _date_grain_widget_hour(date, instance, attributes, value_set, value2_set, item_date, military);

              // Add an am/pm selector if we're not in military time.
              if (!military) {
                _widget_ampm = _date_grain_widget_ampm(date, instance, attributes, value_set, value2_set, item_date, military);
              }
              break;

            // MINUTE
            case 'minute':
              _widget_minute = _date_grain_widget_minute(date, instance, attributes, value_set, value2_set, item_date, _value, increment);
              break;

            // SECOND
            case 'second':
              _widget_second = _date_grain_widget_second(date, instance, attributes, value_set, value2_set, item_date, _value);
              break;

            default:
              console.log('WARNING: date_field_widget_form() - unsupported grain! (' + grain + ')');
              break;
          }
        }
      });

      // Show the "from" or "to" label?
      if (!empty(todate)) {
        var text = _value != 'value2' ? t('From') : t('To');
        items[delta].children.push({ markup: theme('header', { text: text + ': ' }) });
      }

      // Wrap the widget with some better UX.
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

    });

    // If the field base is configured for the "date's timezone handling", add a timezone picker to the widget.
    if (date_tz_handling_is_date(field)) {

      var tz_options = {};
      $.each(drupalgap.time_zones, function(tz, _offset) { tz_options[tz] = tz; });
      var _widget_tz_handling = {
        type: 'select',
        options: tz_options,
        title: t('Timezone'),
        attributes: {
          id: items[delta].id + '-timezone'
        }
      };
      if (value_set && items[delta].item.timezone) { // Set timezone for existing value.
        _widget_tz_handling.value = items[delta].item.timezone;
      }
      else if (!value_set && field.settings.timezone_db) { // Set timezone for new value.
        _widget_tz_handling.value = field.settings.timezone_db;
      }
      items[delta].children.push(_widget_tz_handling);
    }

  }
  catch (error) {
    console.log('date_field_widget_form - ' + error);
  }
}
