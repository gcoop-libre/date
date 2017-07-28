/**
 * Implements hook_field_formatter_view().
 */
function date_field_formatter_view(entity_type, entity, field, instance, langcode, items, display) {
  try {

    //console.log(field);
    //console.log(instance);
    //console.log(display);
    //console.log(items);
    //console.log('date_formats', drupalgap.date_formats);
    //console.log('date_types', drupalgap.date_types);

    var element = {};

    // What type of display are we working with?
    // Manage Display - Format
    //   date_default = Date and time
    //   format_interval = Time ago
    var type = display.type;

    if (type == 'date_default') {

      var format = null;

      if (drupalgap.date_formats[display.settings.format_type]) {

        // Since we're unable to locate the format to use within the field or the
        // instance, we'll just use the first format type in the collection.
        var format_type = drupalgap.date_formats[display.settings.format_type];
        $.each(format_type, function(index, object) {
          format_type = object;
          return false;
        });
        format = format_type.format;
      }
      else {

        // This is (probably) a custom date format, grab the format that
        // the drupalgap.module has bundled within the date_types.
        format = drupalgap.date_types[display.settings.format_type].format;
      }

      // Strip out any characters from the format that are not included in the granularity.
      format = date_format_cleanse(format, instance.settings.granularity);

      // Now iterate over the items and render them using the format.
      // @TODO might need to do the "T" stuff for iOS and/or Safari
      $.each(items, function(delta, item) {
        // prepare date formats
        var format_full = 'D, j F Y - g:i a';
        var format_day = 'D, j F Y';
        var format_time = 'g:i a';

        // prepare 'From:' date value
        var d = date_prepare(item.value);

        // check to see if there is a 'To:' date
        var value2_present = (typeof(item.value2) !== 'undefined') ? (true) : (false);

        if (value2_present) {
          // prepare 'To:' date value
          var d2 = date_prepare(item.value2);
          var from_day = date(format_day, d.getTime());
          var to_day = date(format_day, d2.getTime());

          // get hour for 'To:' date
          var to_hour = date('g', d2.getTime());

          // correct the 0 hour to 12 for 12pm
          if (to_hour == '0') {
            var to_time = '12' + date(':i a', d2.getTime());;
          } else {
            var to_time = date(format_time, d2.getTime());
          }

          // get hour for 'From:' date
          var from_hour = date('g', d.getTime());
          if (from_hour == '0') {
            var from_hour = '12' + date(':i a', d.getTime());;
          } else {
            var from_hour = date(format_time, d.getTime());
          }

          if (from_day == to_day) {
            element[delta] = {
              markup: '<div class="value">' + from_day + ' - ' + from_hour + ' to ' + to_time + '</div>'
            };
          } else {
            var label = value2_present ? 'From: ' : '';
            element[delta] = {
              markup: '<div class="value">' + label + date(format_full, d.getTime()) + '</div>'
            };
            element[delta].markup += '<div class="value2">To: ' + date(format_full, d2.getTime()) + '</div>';
          }
        } else {
          element[delta] = {
            markup: '<div class="value">' + label + date(format_full, d.getTime()) + '</div>'
          };
        }
      });
    }
    else if (type == 'format_interval') {
      var interval = display.settings.interval;
      var interval_display = display.settings.interval_display;
      var now = new Date();
      $.each(items, function(delta, item) {
        var d = date_prepare(item.value);
        if (interval_display == 'time ago' || interval_display == 'raw time ago') {
          var markup = drupalgap_format_interval(
              (now.getTime() - d.getTime()) / 1000,
              interval
          );
          if (interval_display == 'time ago') { markup += ' ' + t('ago'); }
          element[delta] = { markup: markup };
        }
        else {
          console.log('WARNING: date_field_formatter_view - unsupported interval_display (' + interval_display + ')');
        }
      });
    }
    else {
      console.log('WARNING: date_field_formatter_view - unsupported type (' + type + ')');
    }
    return element;
  }
  catch (error) { console.log('date_field_formatter_view - ' + error); }
}

/**
 * Implements hook_field_widget_form().
 */
function date_field_widget_form(form, form_state, field, instance, langcode, items, delta, element) {
  try {
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
    var date_values_set = _date_widget_check_and_set_defaults(items, delta, instance, todate, d);
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
      var current_date = new Date();
      var current_date = current_date.getTime() + (current_date.getTimezoneOffset() * 60000);
      var current_date = new Date(current_date);
    } else {
      // console.log('--- NON APPLE DEVICE --- (Grab the current date)');
      var current_date = new Date();
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

			// Show the "from" or "to" label?
			if (!empty(todate)) {
				var text = _value != 'value2' ? t('From') : t('To');
				items[delta].children.push({ markup: theme('header', { text: text + ': ' }) });
			}

      // Are we doing a 12 or 24 hour format?
      var military = date_military(instance);

      switch (instance.widget.type) {
        case 'date_select':
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
          var _widget_date_order = null;
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
                  _widget_year = _date_grain_widget_year(current_date, instance, attributes, value_set, value2_set, item_date);
                  break;

                // MONTH
                case 'month':
                  _widget_month = _date_grain_widget_month(current_date, instance, attributes, value_set, value2_set, item_date);
                  break;

                // DAY
                case 'day':
                  _widget_day = _date_grain_widget_day(current_date, instance, attributes, value_set, value2_set, item_date);
                  break;

                // HOUR
                case 'hour':
                  _widget_hour = _date_grain_widget_hour(current_date, instance, attributes, value_set, value2_set, item_date, military);

                  // Add an am/pm selector if we're not in military time.
                  if (!military) {
                    _widget_ampm = _date_grain_widget_ampm(current_date, instance, attributes, value_set, value2_set, item_date, military);
                  }
                  break;

                // MINUTE
                case 'minute':
                  _widget_minute = _date_grain_widget_minute(current_date, instance, attributes, value_set, value2_set, item_date, _value, increment);
                  break;

                // SECOND
                case 'second':
                  _widget_second = _date_grain_widget_second(current_date, instance, attributes, value_set, value2_set, item_date, _value);
                  break;

                default:
                  console.log('WARNING: date_field_widget_form() - unsupported grain! (' + grain + ')');
                  break;
              }
            }
          });

          var _widget_date_format = date_format_widget(field, instance);
          _widget_date_order = date_format_order(_widget_date_format);

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
              _widget_ampm,
              _widget_date_order
          );
          break;
        case 'date_popup':
          var id = items[delta].id;
          if (_value == 'value2') {
            id += '2';
          }

          var _widget_date = null;
          var _widget_time = null;

          var _widget_date_format = date_format_widget(field, instance);
          if (date_has_date(field.settings.granularity)) {
            var _widget_date_granularity = JSON.parse(JSON.stringify(field.settings.granularity));
            _widget_date_granularity['hour'] = 0;
            _widget_date_granularity['minute'] = 0;
            _widget_date_granularity['second'] = 0;

            var _widget_date_date_format = date_limit_format(_widget_date_format, _widget_date_granularity);

            var suffix = '';
            var attributes = {
              id: id + '-date',
              readonly: 'readonly',
              onclick: "date_popup_open(this, 'date', '" + _widget_date_date_format + "', '" + items[delta].id + "', " + military + ", " + increment + ", " + offset + ");"
            };

            if (!empty(_widget_date_date_format)) {
              suffix = '<div class="description">' + format_string(t('Format: {1}'), date(_widget_date_date_format)) + '</div>';
              attributes['value'] = date(_widget_date_date_format, item_date.getTime());
            }
            _widget_date = {
              prefix: theme('date_label', { title: t('Date') }),
              suffix: suffix,
              type: 'textfield',
              attributes: attributes
            };
          }
          if (date_has_time(field.settings.granularity)) {
            var _widget_time_granularity = JSON.parse(JSON.stringify(field.settings.granularity));
            _widget_time_granularity['year'] = 0;
            _widget_time_granularity['month'] = 0;
            _widget_time_granularity['day'] = 0;

            var _widget_date_time_format = date_limit_format(_widget_date_format, _widget_time_granularity);

            var suffix = '';
            var attributes = {
              id: id + '-time',
              readonly: 'readonly',
              onclick: "date_popup_open(this, 'time', '" + _widget_date_time_format + "', '" + items[delta].id + "', " + military + ", " + increment + ", " + offset + ");"
            };

            if (!empty(_widget_date_time_format)) {
              suffix = '<div class="description">' + format_string(t('Format: {1}'), date(_widget_date_time_format)) + '</div>';
              attributes['value'] = date(_widget_date_time_format, item_date.getTime());
            }
            _widget_time = {
              prefix: theme('date_label', { title: t('Time') }),
              suffix: suffix,
              type: 'textfield',
              attributes: attributes
            };
          }

          if ((_widget_date) && (_widget_time)) {
            items[delta].children.push({ markup: '<div class="ui-grid-a">' });
            _widget_date.prefix = '<div class="ui-block-a">' + _widget_date.prefix;
            _widget_date.suffix += '</div>';
            _widget_time.prefix = '<div class="ui-block-b">' + _widget_time.prefix;
            _widget_time.suffix += '</div>';
          }
          if (_widget_date) {
            items[delta].children.push(_widget_date);
          }
          if (_widget_time) {
            items[delta].children.push(_widget_time);
          }
          if ((_widget_date) && (_widget_time)) {
            items[delta].children.push({ markup: '</div>' });
          }
          break;
        case 'date_text':
        default:
          var id = items[delta].id;
          if (_value == 'value2') {
            id += '2';
          }

          var suffix = '';
          var attributes = {
            id: id,
            onblur: "date_text_onchange(this, '" + items[delta].id + "', " + military + ", " + increment + ", " + offset + ")"
          };

          var _widget_date_format = date_format_widget(field, instance);
          if (!empty(_widget_date_format)) {
            suffix = '<div class="description">' + format_string(t('Format: {1}'), date(_widget_date_format)) + '</div>';
            attributes['value'] = date(_widget_date_format, item_date.getTime());

            var current_parts = items[delta].value.split('|');
            if (_value == 'value2') {
              current_parts[1] = attributes['value'];
            }
            else {
              current_parts[0] = attributes['value'];
            }
            items[delta].value = current_parts.join('|');
          }
          items[delta].children.push({
            suffix: suffix,
            type: 'textfield',
            attributes: attributes
          });
          break;
      }
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

function _date_grain_widget_year(date, instance, attributes, value_set, value2_set, item_date) {
  try {
    // Determine the current year
    var current_year = parseInt(date.getFullYear());

    // Parse the year from the item's value, if it is set.
    var year = current_year;
    if (value_set) {
      year = parseInt(item_date.getFullYear());
    }

    if (
      (typeof(instance.widget.settings.text_parts) != 'undefined') &&
      ($.inArray('year', instance.widget.settings.text_parts) != -1)
    ) {
      attributes['value'] = year;
      attributes['maxlength'] = 4;
      attributes['onblur'] = attributes['onchange'];
      delete(attributes['onchange']);

      // Build and theme the input.
      field = {
        prefix: theme('date_label', { title: t('Year') }),
        type: 'textfield',
        attributes: attributes
      };
    } else {
      // Determine the current year and the range of year(s) to provide
      // as options. The range can either be relative, absolute or both,
      // e.g. -3:+3, 2000:2010, 2000:+3
      var year_range = instance.widget.settings.year_range;
      var parts = year_range.split(':');
      // Determine the low end year integer value.
      var low = parts[0];
      var low_absolute = true;
      if (low.indexOf('-') != -1 || low.indexOf('+') != -1) { low_absolute = false; }
      if (!low_absolute) {
        if (low.indexOf('+') != -1) {
          low = low.replace('+', '');
        }
        low = parseInt(low) + current_year;
      }
      else { low = parseInt(low); }
      if (!low) { low = current_year; }
      // Determine the high end year integer value.
      var high = parts[1];
      var high_absolute = true;
      if (high.indexOf('-') != -1 || high.indexOf('+') != -1) { high_absolute = false; }
      if (!high_absolute) {
        if (high.indexOf('+') != -1) {
          high = high.replace('+', '');
        }
        high = parseInt(high) + current_year;
      }
      else { high = parseInt(high); }
      if (!high) { high = current_year; }
      // Build the options.
      var options = {};
      for (var i = low; i <= high; i++) {
        options[i] = i;
      }

      // Build and theme the select list.
      field = {
        prefix: theme('date_label', { title: t('Year') }),
        type: 'date_select',
        value: year,
        attributes: attributes,
        options: options
      };
    }

    return field;
  }
  catch (error) { console.log('_date_grain_widget_year', error); }
}

function _date_grain_widget_month(date, instance, attributes, value_set, value2_set, item_date) {
  try {
    // Determine the current month.
    var current_month = parseInt(date.getMonth()) + 1;

    // Parse the month from the item's value, if it is set.
    var month = current_month;
    if (value_set) {
      month = parseInt(item_date.getMonth()) + 1;
    }

    if (
      (typeof(instance.widget.settings.text_parts) != 'undefined') &&
      ($.inArray('month', instance.widget.settings.text_parts) != -1)
    ) {
      attributes['value'] = month;
      attributes['maxlength'] = 2;
      attributes['onblur'] = attributes['onchange'];
      delete(attributes['onchange']);

      // Build and theme the input.
      field = {
        prefix: theme('date_label', { title: t('Month') }),
        type: 'textfield',
        attributes: attributes
      };
    } else {
      // Build the options.
      var options = {};
      for (var i = 1; i <= 12; i++) {
        options[i] = '' + i;
      }
      // Build and theme the select list.
      field = {
        prefix: theme('date_label', { title: t('Month') }),
        type: 'date_select',
        value: month,
        attributes: attributes,
        options: options
      };
    }

    return field;
  }
  catch (error) { console.log('_date_grain_widget_month', error); }
}

function _date_grain_widget_day(date, instance, attributes, value_set, value2_set, item_date) {
  try {
    // Determine the current day.
    var current_day = parseInt(date.getDate());

    // Parse the day from the item's value, if it is set.
    var day = current_day;
    if (value_set) {
      day = parseInt(item_date.getDate());
    }

    if (
      (typeof(instance.widget.settings.text_parts) != 'undefined') &&
      ($.inArray('day', instance.widget.settings.text_parts) != -1)
    ) {
      attributes['value'] = day;
      attributes['maxlength'] = 2;
      attributes['onblur'] = attributes['onchange'];
      delete(attributes['onchange']);

      // Build and theme the input.
      field = {
        prefix: theme('date_label', { title: t('Day') }),
        type: 'textfield',
        attributes: attributes
      };
    } else {
      // Build the options.
      var options = {};
      for (var i = 1; i <= 31; i++) {
        options[i] = '' + i;
      }
      // Build and theme the select list.
      field = {
        prefix: theme('date_label', { title: t('Day') }),
        type: 'date_select',
        value: day,
        attributes: attributes,
        options: options
      };
    }

    return field;
  }
  catch (error) { console.log('_date_grain_widget_day', error); }
}

function _date_grain_widget_hour(date, instance, attributes, value_set, value2_set, item_date, military) {
  try {
    // Determine the current hour.
    var current_hour = parseInt(date.getHours());

    // Parse the hour from the item's value, if it is set.
    var hour = current_hour;
    if (value_set) {
      hour = parseInt(item_date.getHours());
    }
    if (!military) {
      if (hour > 12) {
        hour -= 12;
      }
      else if (hour === 0) {
        hour = 12;
      }
    }

    if (
      (typeof(instance.widget.settings.text_parts) != 'undefined') &&
      ($.inArray('hour', instance.widget.settings.text_parts) != -1)
    ) {
      attributes['value'] = '' + hour;
      attributes['maxlength'] = 2;
      attributes['onblur'] = attributes['onchange'];
      delete(attributes['onchange']);

      // Build and theme the input.
      field = {
        prefix: theme('date_label', { title: t('Hour') }),
        type: 'textfield',
        attributes: attributes
      };
    } else {
      // Build the options, paying attention to 12 vs 24 hour format.
      var options = {};
      var max = military ? 23 : 12;
      var min = military ? 0 : 1;
      for (var i = min; i <= max; i++) { options[i] = '' + i; }

      // Build and theme the select list.
      field = {
        prefix: theme('date_label', { title: t('Hour') }),
        type: 'date_select',
        value: hour,
        attributes: attributes,
        options: options
      };
    }

    return field;
  }
  catch (error) { console.log('_date_grain_widget_hour', error); }
}

function _date_grain_widget_ampm(date, instance, attributes, value_set, value2_set, item_date, military) {
  try {
    var ampm = parseInt(date.getHours()) < 12 ? 'am' : 'pm';
    if (value_set) {
      ampm = parseInt(item_date.getHours()) < 12 ? 'am' : 'pm';
    }
    
    return {
      type: 'date_select',
      value: ampm,
      attributes: attributes,
      options: {
        am: 'am',
        pm: 'pm'
      } 
    };
  }
  catch (error) { console.log('_date_grain_widget_day', error); }
}

function _date_grain_widget_minute(date, instance, attributes, value_set, value2_set, item_date, _value, increment) {
  try {
    // Determine the current minute.
    var current_minute = parseInt(date.getMinutes());

    // Parse the minute from the item's value, if it is set.
    var minute = current_minute;
    if (value_set && _value == 'value') {
      minute = parseInt(item_date.getMinutes());
    }
    else if (value2_set && _value == 'value2') {
      minute = parseInt(item_date.getMinutes());
    }

    if (
      (typeof(instance.widget.settings.text_parts) != 'undefined') &&
      ($.inArray('minute', instance.widget.settings.text_parts) != -1)
    ) {
      attributes['value'] = '' + minute;
      attributes['maxlength'] = 2;
      attributes['onblur'] = attributes['onchange'];
      delete(attributes['onchange']);

      // Build and theme the input.
      field = {
        prefix: theme('date_label', { title: t('Minute') }),
        type: 'textfield',
        attributes: attributes
      };
    } else {
      // Build the options.
      var options = {};
      for (var i = 0; i <= 59; i += increment) {
        var text = '' + i;
        if (text.length == 1) { text = '0' + text; }
        options[i] = text;
      }

      if (increment != 1) {
        minute = _date_minute_increment_adjust(increment, minute);
      }

      // Build and theme the select list.
      field = {
        prefix: theme('date_label', { title: t('Minute') }),
        type: 'date_select',
        value: minute,
        attributes: attributes,
        options: options
      };
    }

    return field;
  }
  catch (error) { console.log('_date_grain_widget_minute', error); }
}

function _date_grain_widget_second(date, instance, attributes, value_set, value2_set, item_date, _value) {
  try {
    // Determine the current second.
    var current_second = parseInt(date.getSeconds());

    // Parse the second from the item's value, if it is set.
    var second = current_second;
    if (value_set && _value == 'value') {
      second = parseInt(item_date.getSeconds());
    }
    else if (value2_set && _value == 'value2') {
      second = parseInt(item_date.getSeconds());
    }

    if (
      (typeof(instance.widget.settings.text_parts) != 'undefined') &&
      ($.inArray('second', instance.widget.settings.text_parts) != -1)
    ) {
      attributes['value'] = '' + second;
      attributes['maxlength'] = 2;
      attributes['onblur'] = attributes['onchange'];
      delete(attributes['onchange']);

      // Build and theme the input.
      field = {
        prefix: theme('date_label', { title: t('Second') }),
        type: 'textfield',
        attributes: attributes
      };
    } else {
      // Build the options.
      var options = {};
      for (var i = 0; i <= 59; i ++) {
        var text = '' + i;
        if (text.length == 1) { text = '0' + text; }
        options[i] = text;
      }

      // Build and theme the select list.
      field = {
        prefix: theme('date_label', { title: t('Second') }),
        type: 'date_select',
        value: second,
        attributes: attributes,
        options: options
      };
    }

    return field;
  }
  catch (error) { console.log('_date_grain_widget_second', error); }
}

function _date_grain_widgets_ux_wrap(items, delta, _widget_year, _widget_month, _widget_day, _widget_hour, _widget_minute, _widget_second, _widget_ampm, _widget_date_order) {
  try {
    if (typeof(_widget_date_order) == 'undefined') {
      var _widget_date_order = ['year', 'month', 'day', 'hour', 'minute', 'second'];
    }

    var _block_classes = ['ui-block-a', 'ui-block-b', 'ui-block-c'];

    // YMD
    var ymd_grid = null;
    if ((_widget_month) && (!_widget_day)) {
      ymd_grid = 'ui-grid-a';
    }
    else if ((_widget_month) && (_widget_day)) {
      ymd_grid = 'ui-grid-b';
    }

    if (ymd_grid) {
      items[delta].children.push({ markup: '<div class="' + ymd_grid + '">' });
    }

    var _block_number = 0;
    for (i = 0; i < _widget_date_order.length; i++) {
      switch (_widget_date_order[i]) {
        case 'year':
          if (_widget_year) {
            if (ymd_grid) {
              _widget_year.prefix = '<div class="' + _block_classes[_block_number] + '">' + _widget_year.prefix;
              _widget_year.suffix = '</div>';
            }
            items[delta].children.push(_widget_year);

            _block_number++;
          }
          break;
        case 'month':
          if (_widget_month) {
            _widget_month.prefix = '<div class="' + _block_classes[_block_number] + '">' + _widget_month.prefix;
            _widget_month.suffix = '</div>';
            items[delta].children.push(_widget_month);

            _block_number++;
          }
          break;
        case 'day':
          if (_widget_day) {
            _widget_day.prefix = '<div class="' + _block_classes[_block_number] + '">' + _widget_day.prefix;
            _widget_day.suffix = '</div>';
            items[delta].children.push(_widget_day);

            _block_number++;
          }
          break;
      }
    }
    if (ymd_grid) {
      items[delta].children.push({ markup: '</div>' });
    }

    // HIS
    var his_grid = null;
    if (_widget_hour) {
      if ((_widget_minute) && (!_widget_second)) {
        his_grid = 'ui-grid-a';
      }
      else if ((_widget_minute) && (_widget_second)) {
        his_grid = 'ui-grid-b';
      }
    }
    else {
      if ((_widget_minute) && (_widget_second)) {
        his_grid = 'ui-grid-b';
      }
    }

    if (his_grid) {
      items[delta].children.push({ markup: '<div class="' + his_grid + '">' });
    }

    var _block_number = 0;
    for (i = 0; i < _widget_date_order.length; i++) {
      switch (_widget_date_order[i]) {
        case 'hour':
          if (_widget_hour) {
            if (his_grid) {
              _widget_hour.prefix = '<div class="' + _block_classes[_block_number] + '">' + _widget_hour.prefix;
              _widget_hour.suffix = '</div>';
            }
            items[delta].children.push(_widget_hour);

            _block_number++;
          }
          break;
        case 'minute':
          if (_widget_minute) {
            if (his_grid) {
              _widget_minute.prefix = '<div class="' + _block_classes[_block_number] + '">' + _widget_minute.prefix;
              _widget_minute.suffix = '</div>';
            }
            items[delta].children.push(_widget_minute);

            _block_number++;
          }
          break;
        case 'second':
          if (_widget_second) {
            if (his_grid) {
              _widget_second.prefix = '<div class="' + _block_classes[_block_number] + '">' + _widget_second.prefix;
              _widget_second.suffix = '</div>';
            }
            items[delta].children.push(_widget_second);

            _block_number++;
          }
          break;
      }
    }
    if (his_grid) {
      items[delta].children.push({ markup: '</div>' });
    }
    if (_widget_ampm) {
      items[delta].children.push(_widget_ampm);
    }
  }
  catch (error) { console.log('_date_grain_widgets_ux_wrap', error); }
}

/**
 *
 * @param value
 * @returns {Date}
 */
function date_prepare(value, offset) {
  try {
    // @see http://stackoverflow.com/a/16664730/763010
    if (date_apple_device()) { value = date_apple_cleanse(value); }
    var replaced = value.replace(/-/g,'/');
    // Parse the date from the string. Note that iOS doesn't like date parse,
    // we break it into parts instead.
    if (!date_apple_device()) {
      return new Date(Date.parse(replaced));
    }
    else {
      var a = replaced.split(/[^0-9]/);
      var d = new Date(a[0], a[1]-1, a[2], a[3], a[4], a[5]);
      return d;
    }
  }
  catch (error) { console.log('date_prepare() - ' + error); }
}

/**
 *  Get the date format to be used on a widget
 *
 *  @param  {Object} field
 *  @param  {Object} instance
 *  @return {String}
 */
function date_format_widget(field, instance) {
  try {
    var format = '';

    if (typeof(instance.widget.settings.input_format) != 'undefined') {
      format = instance.widget.settings.input_format;

      if (format == 'site-wide') {
        format = drupalgap.date_types.short.format;
      }

      // Limit format according to the field's granularity
      format = date_limit_format(format, field.settings.granularity);
    }

    return format;
  }
  catch (error) { console.log('date_format_widget() - ' + error); }
}

/**
 * Limits a date format to include only elements from a given granularity array.
 *
 * Example:
 *   date_limit_format('F j, Y - H:i', { 'year':'year', 'month':'month', 'day':'day', 'hour':0, 'minute':0, 'second':0 });
 *   returns 'F j, Y'
 *
 * @param {String} format
 *   A date format string.
 * @param {array} granularity
 *   An array of allowed date parts, all others will be removed.
 *
 * @return {String}
 *   The format string with all other elements removed.
 */
function date_limit_format(format, granularity) {
  try {
    // If punctuation has been escaped, remove the escaping.
    format = format.replace(/\\-/g, '-');
    format = format.replace(/\\:/g, ':');
    format = format.replace(/\\'/g, "'");
    format = format.replace(/\\. /g, ' . ');
    format = format.replace(/\\,/g, ',');

    // Get the 'T' out of ISO date formats that don't have both date and time.
    if ((!date_has_time(granularity)) || (!date_has_date(granularity))) {
      format = format.replace(/\\T/g, ' ');
      format = format.replace(/T/g, ' ');
    }

    reversed_format = format.split('').reverse().join('');
    if (!date_has_time(granularity)) {
      reversed_format = reversed_format.replace(/([a|A](?!\\\\))/g, '');
    }
    if ((typeof(granularity['year']) == 'undefined') || (empty(granularity['year']))) {
      reversed_format = reversed_format.replace(/([Yy](?!\\\\)\s?[\-/\.,:]?)/g, '');
    }
    if ((typeof(granularity['month']) == 'undefined') || (empty(granularity['month']))) {
      reversed_format = reversed_format.replace(/([FMmn](?!\\\\)\s?[\-/\.,:]?)/g, '');
    }
    if ((typeof(granularity['day']) == 'undefined') || (empty(granularity['day']))) {
      reversed_format = reversed_format.replace(/([l|D|d|dS|j|jS|N|w|W|z]{1,2}(?!\\\\)\s?[\-/\.,:]?)/g, '');
    }
    if ((typeof(granularity['hour']) == 'undefined') || (empty(granularity['hour']))) {
      reversed_format = reversed_format.replace(/([HhGg](?!\\\\)\s?[\-/\.,:]?)/g, '');
    }
    if ((typeof(granularity['minute']) == 'undefined') || (empty(granularity['minute']))) {
      reversed_format = reversed_format.replace(/([i](?!\\\\)\s?[\-/\.,:]?)/g, '');
    }
    if ((typeof(granularity['second']) == 'undefined') || (empty(granularity['second']))) {
      reversed_format = reversed_format.replace(/([s](?!\\\\)\s?[\-/\.,:]?)/g, '');
    }
    if ((typeof(granularity['timezone']) == 'undefined') || (empty(granularity['timezone']))) {
      reversed_format = reversed_format.replace(/([TOZPe](?!\\\\)\s?[\-/\.,:]?)/g, '');
    }
    format = reversed_format.split('').reverse().join('');

    // Remove empty parentheses, brackets, pipes.
    format = format.replace(/(\(\))/g, '');
    format = format.replace(/(\[\])/g, '');
    format = format.replace(/(\|\|)/g, '');

    // Remove selected values from string.
    format = $.trim(format);
    // Remove orphaned punctuation at the beginning of the string.
    format = format.replace(/^([\-/\.,:\'])/, '');
    // Remove orphaned punctuation at the end of the string.
    format = format.replace(/([\-/,:\']$)/, '');
    format = format.replace(/(\\$)/, '');

    // Trim any whitespace from the result.
    format = $.trim(format);

    // After removing the non-desired parts of the format, test if the only things
    // left are escaped, non-date, characters. If so, return nothing.
    // Using S instead of w to pick up non-ASCII characters.
    test = format;
    test = $.trim(test.replace('(\\\\\S{1,3})u', ''));
    if (empty(test)) {
      format = '';
    }

    return format;
  }
  catch (error) { console.log('date_limit_format() - ' + error); }
}

/**
 * Determines if the granularity contains a time portion.
 *
 * @param {array} granularity
 *   An array of allowed date parts, all others will be removed.
 *
 * @return {bool}
 *   TRUE if the granularity contains a time portion, FALSE otherwise.
 */
function date_has_time(granularity) {
  try {
    var has_time = false;

    if (
      ((typeof(granularity['hour']) != 'undefined') && (!empty(granularity['hour']))) ||
      ((typeof(granularity['minute']) != 'undefined') && (!empty(granularity['minute']))) ||
      ((typeof(granularity['second']) != 'undefined') && (!empty(granularity['second'])))
    ) {
      has_time = true;
    }

    return has_time;
  }
  catch (error) { console.log('date_has_time() - ' + error); }
}

/**
 * Determines if the granularity contains a date portion.
 *
 * @param {array} granularity
 *   An array of allowed date parts, all others will be removed.
 *
 * @return {bool}
 *   TRUE if the granularity contains a date portion, FALSE otherwise.
 */
function date_has_date(granularity) {
  try {
    var has_date = false;

    if (
      ((typeof(granularity['year']) != 'undefined') && (!empty(granularity['year']))) ||
      ((typeof(granularity['month']) != 'undefined') && (!empty(granularity['month']))) ||
      ((typeof(granularity['day']) != 'undefined') && (!empty(granularity['day'])))
    ) {
      has_date = true;
    }

    return has_date;
  }
  catch (error) { console.log('date_has_date() - ' + error); }
}

/**
 *  Get the date for the current value of a field, or just default to now.
 *
 *  @param  {String}  id
 *  @param  {Boolean}  todate
 *  @return {Date}  Date JS Object with the field's value
 */
function date_field_date(id, todate) {
  var field_date = null;

  // Grab the current value (which may include both the "from" and "to" dates
  // separated by a pipe '|')
  var current_val = $('#' + id).val();

  // Is there a "to date" already set on the current value?
  var todate_already_set = current_val.indexOf('|') != -1 ? true : false;

  // Prepare the value part(s).
  var parts = [];
  if (todate_already_set) {
    parts = current_val.split('|');
  }
  else {
    parts.push(current_val);
  }

  if (!current_val) {
    if (date_apple_device()) {
      item_date = new Date();
      item_date = item_date.getTime() + (item_date.getTimezoneOffset() * 60000);
      field_date = new Date(item_date);
    } else {
      field_date = new Date();
    }
  } else {
    // In case they set the "to date" before the "from date", give the "from date" a default value.
    if (!todate && empty(parts[0])) { parts[0] = date_yyyy_mm_dd_hh_mm_ss(); }

    // Fixes iOS bug spaces must be replaced with T's
    if (date_apple_device() && offset) {
      // TODO  -- update to reflect code below
      field_date = date_item_adjust_offset(field_date, offset);
    } else if (date_apple_device()) {
      if (!todate) {
        item_date = new Date(date_apple_cleanse(parts[0]));
        item_date = item_date.getTime() + (item_date.getTimezoneOffset() * 60000);
        field_date = new Date(item_date);
      }
      else {
        if (todate_already_set) {
          item_date = new Date(date_apple_cleanse(parts[1]));
          item_date = item_date.getTime() + (item_date.getTimezoneOffset() * 60000);
          field_date = new Date(item_date);
        }
      }
    } else {
      if (!todate) {
        field_date = new Date(parts[0]);
      } else {
        if (todate_already_set) {
          field_date = new Date(parts[1]);
        } else {
          field_date = new Date();
        }
      }
    }
  }

  return field_date;
}

/**
 *  Open the Date PopUp widget
 *
 *  @param  {Object}  input
 *  @param  {String}  type
 *  @param  {String}  format
 *  @param  {String}  id
 *  @param  {Boolean}  military
 *  @param  {Int}  increment
 *  @param  {Int}  offset
 */
function date_popup_open(input, type, format, id, military, increment, offset) {
  // Are we setting a "to date"?
  var todate = $(input).attr('id').indexOf('value2') != -1 ? true : false;

  var field_date = date_field_date(id, todate);

	datePicker.show({
    date: field_date,
    mode: type,
    minuteInterval: increment
  }, function(selected_date) {
    if (type == 'date') {
      field_date.setFullYear(selected_date.getFullYear(), selected_date.getMonth(), selected_date.getDate());
    }
    else if (type == 'time') {
      field_date.setHours(selected_date.getHours());
      field_date.setMinutes(selected_date.getMinutes());
      field_date.setSeconds(selected_date.getSeconds());
    }

    // Grab the current value (which may include both the "from" and "to" dates
    // separated by a pipe '|')
    var current_val = $('#' + id).val();

    // Is there a "to date" already set on the current value?
    var todate_already_set = current_val.indexOf('|') != -1 ? true : false;

    // Prepare the value part(s).
    var parts = [];
    if (todate_already_set) {
      parts = current_val.split('|');
    }
    else {
      parts.push(current_val);
    }

    // Finally set the value.
    var _value = date_yyyy_mm_dd_hh_mm_ss(date_yyyy_mm_dd_hh_mm_ss_parts(field_date));
    if (!todate) {
      parts[0] = _value;
    }
    else {
      parts[1] = _value;
    }

    $('#' + id).val(parts.join('|'));
    $(input).val(date(format, field_date.getTime()));
  });
}

/**
 * Returns true if the device is an Apple device
 */
function date_apple_device() {
  return (typeof device !== 'undefined' && device.platform == 'iOS') ||
  (navigator.vendor && navigator.vendor.indexOf('Apple') > -1)
}

/**
 * Given a date string, this will cleanse it for use with JavaScript Date on an Apple device.
 */
function date_apple_cleanse(input) {
  return input.replace(/ /g, 'T');
}

/**
 * Given a field instance this will return true if it is configured for a 24 hour format, false otherwise.  We'll assume
 * military 24 hour by default, unless we prove otherwise.
 * @param instance
 * @returns {boolean}
 */
function date_military(instance) {
  // We know we have a 12 hour format if the date input format string contains a 'g' or an 'h'.
  // @see http://php.net/manual/en/function.date.php
  var military = true;
  if (instance.widget.settings.input_format && (
          instance.widget.settings.input_format.indexOf('g') != -1 ||
          instance.widget.settings.input_format.indexOf('h') != -1
      )) { military = false; }
  return military;
}

/**
 * Handles the onchange event for date select lists. It is given a reference
 * to the select list, the id of the hidden date field, and the grain of the
 * input.
 */
function date_select_onchange(input, id, grain, military, increment, offset) {
  try {

    // @TODO - we may need the time zone offset placed here as well!

    // Are we setting a "to date"?
    var todate = $(input).attr('id').indexOf('value2') != -1 ? true : false;

    var field_date = date_field_date(id, todate);

    var input_val = $(input).val();
    switch (grain) {
      case 'year':
        field_date.setYear(input_val);
        break;
      case 'month':
        field_date.setMonth(input_val - 1);
        break;
      case 'day':
        field_date.setDate(input_val);
        break;
      case 'hour':
        if (!military) {
          var currenthour = field_date.getHours();
          if (input_val == 'pm') {
            if (field_date.getHours() < 12) { field_date.setHours(field_date.getHours() + 12); }
            else { field_date.setHours(field_date.getHours()); }
          }
          else if (input_val == 'am') { field_date.setHours(field_date.getHours() - 12); }

          input_val = parseInt(input_val);
          if (input_val >= 0 && currenthour > 12) {
            field_date.setHours(input_val + 12);
          } else if (input_val >= 0 && currenthour < 12) {
            field_date.setHours(input_val);
          } else if (input_val >= 0 && currenthour == 12) {
            field_date.setHours(0);
          }
        }
        else { field_date.setHours(input_val); }
        break;
      case 'minute':
        field_date.setMinutes(input_val);
        break;
      case 'second':
        field_date.setSeconds(input_val);
        break;
    }

    // Adjust the minutes.
    //console.log('before', date);
    field_date.setMinutes(_date_minute_increment_adjust(increment, field_date.getMinutes()));
    //console.log('after', date);

    // Finally set the value.
    var _value = date_yyyy_mm_dd_hh_mm_ss(date_yyyy_mm_dd_hh_mm_ss_parts(field_date));
    if (!todate) { parts[0] = _value; }
    else { parts[1] = _value;  }
    //console.log('value', _value, date, parts);
    $('#' + id).val(parts.join('|'));
  }
  catch (error) { drupalgap_error(error); }
}

/**
 * Handles the onblur event for date text fields. It is given a reference
 * to the input field and the id of the hidden date field
 */
function date_text_onchange(input, id, military, increment, offset) {
  try {

    // @TODO - we may need the time zone offset placed here as well!

    // Are we setting a "to date"?
    var todate = $(input).attr('id').indexOf('value2') != -1 ? true : false;

    // Grab the current value (which may include both the "from" and "to" dates
    // separated by a pipe '|')
    var current_val = $('#' + id).val();

    // Is there a "to date" already set on the current value?
    var todate_already_set = current_val.indexOf('|') != -1 ? true : false;

    // Prepare the value part(s).
    var parts = [];
    if (todate_already_set) {
      parts = current_val.split('|');
    }
    else {
      parts.push(current_val);
    }

    var input_val = $(input).val();

    // Finally set the value.
    if (!todate) {
      parts[0] = input_val;
    }
    else {
      parts[1] = input_val;
    }

    $('#' + id).val(parts.join('|'));
  }
  catch (error) { drupalgap_error(error); }
}

/**
 *
 */
function _date_minute_increment_adjust(increment, minute) {
  try {
    switch (increment) {
      case 5:
        if (minute < 5) { minute = 0; }
        else if (minute < 10) { minute = 5; }
        else if (minute < 15) { minute = 10; }
        else if (minute < 20) { minute = 15; }
        else if (minute < 25) { minute = 20; }
        else if (minute < 30) { minute = 25; }
        else if (minute < 35) { minute = 30; }
        else if (minute < 40) { minute = 35; }
        else if (minute < 45) { minute = 40; }
        else if (minute < 50) { minute = 45; }
        else if (minute < 55) { minute = 50; }
        else if (minute < 60) { minute = 55; }
        break;
      case 10:
        if (minute < 10) { minute = 0; }
        else if (minute < 20) { minute = 10; }
        else if (minute < 30) { minute = 20; }
        else if (minute < 40) { minute = 30; }
        else if (minute < 50) { minute = 40; }
        else if (minute < 60) { minute = 50; }
        break;
      case 15:
        if (minute < 15) { minute = 0; }
        else if (minute < 30) { minute = 15; }
        else if (minute < 45) { minute = 30; }
        else if (minute < 60) { minute = 45; }
        break;
      case 30:
        if (minute < 30) { minute = 0; }
        else if (minute < 60) { minute = 30; }
        break;
    }
    return minute;
  }
  catch (error) { console.log('_date_minute_increment_adjust - ' + error); }
}

/**
 * Given a date format string and the granularity settings from the date's field info field, this will remove any
 * characters from the format that are not allowed in the granularity of the date.
 * @param format
 * @param granularity
 */
function date_format_cleanse(format, granularity) {
  for (grain in granularity) {
    if (!granularity.hasOwnProperty(grain)) { continue; }
    var item = granularity[grain];
    if (item) { continue; } // Skip any collected grains.
    var characters = []; // @see http://php.net/manual/en/function.date.php
    switch (grain) {
      case 'year':
        characters = ['L', 'o', 'Y', 'y'];
        break;
      case 'month':
        characters = ['F', 'm', 'M', 'n', 't'];
        break;
      case 'day':
        characters = ['d', 'D', 'j', 'l', 'L', 'N', 'S', 'w', 'z'];
        break;
      case 'hour':
        characters = [' - ', 'g:', 'G:', 'h:', 'H:', 'g', 'G', 'h', 'H'];
        break;
      case 'minute':
        characters = ['i:', 'i'];
        break;
      case 'second':
        characters = ['s'];
        break;
    }
    if (characters.length) {
      for (var i = 0; i < characters.length; i++) {
        var character = characters[i];
        format = format.replace(character, '');
      }
    }
  }
  return format;
}

/**
 * Converts a format to an ordered array of granularity parts.
 *
 * Example:
 *   date_format_order('m/d/Y H:i')
 *   returns
 *     [
 *       'month',
 *       'day',
 *       'year',
 *       'hour',
 *       'minute',
 *     ];
 *
 * @param {string} format
 *   A date format string.
 *
 * @return {Array}
 *   An array of ordered granularity elements from the given format string.
 */
function date_format_order(format) {
  order = []
  if (empty(format)) {
    return order;
  }

  for (i = 0; i <= format.length; i++) {
    switch (format.charAt(i)) {
      case 'd':
      case 'j':
        order.push('day');
        break;

      case 'F':
      case 'M':
      case 'm':
      case 'n':
        order.push('month');
        break;

      case 'Y':
      case 'y':
        order.push('year');
        break;

      case 'g':
      case 'G':
      case 'h':
      case 'H':
        order.push('hour');
        break;

      case 'i':
        order.push('minute');
        break;

      case 's':
        order.push('second');
        break;
    }
  }
  return(order);
}

function date_item_adjust_offset(d, offset) {
  d = new Date(d.toUTCString());
  d = d.getTime() / 1000;
  d -= parseInt(offset);
  return new Date(d * 1000);
}

/**
 * Returns all the date time zone objects from system connect.
 * @returns {Object}
 */
function date_time_zones() {
  return drupalgap.time_zones;
}

/**
 * Returns a specific date time zone object from system connect, or the site's default if none is provided.
 * @param {String} timezone
 * @returns {Object}
 */
function date_get_time_zone(timezone) {
  if (timezone) { return date_time_zones()[timezone]; }
  else { return date_time_zones()[date_site_time_zone_name()]; }
}

function date_site_time_zone_name() {
  return drupalgap.site_settings.date_default_timezone;
}

/**
 * Given a date field base, this will return true if its time zone handling is set to date.
 * @param field
 * @returns {*|boolean}
 */
function date_tz_handling_is_date(field) {
  return field.settings.tz_handling && field.settings.tz_handling == 'date' && drupalgap.time_zones;
}

function _date_get_item_and_offset(items, delta, _value, value_set, value2_set, field) {
  try {

    // Grab the item date and offset, if they are set, otherwise grab the current date/time.
    var item_date = null;
    var offset = null;
    if (value_set && _value == 'value') {
      if (items[delta].value.indexOf('|') != -1) {
        var parts = items[delta].value.split('|');
        if(!date_apple_device()){
          item_date = new Date(parts[0]);
        } else {
          item_date = new Date(date_apple_cleanse(parts[0]));
          item_date = item_date.getTime() + (item_date.getTimezoneOffset() * 60000);
          item_date = new Date(item_date);
        }
      }
      else {
        if(!date_apple_device()){
          item_date = new Date(items[delta].value);
        } else {
          item_date = new Date(date_apple_cleanse(items[delta].value));
          item_date = item_date.getTime() + (item_date.getTimezoneOffset() * 60000);
          item_date = new Date(item_date);
        }
      }
      if (items[delta].item && items[delta].item.offset) {
        offset = items[delta].item.offset;
      }
    }
    if (value2_set && _value == 'value2') {
      if(!date_apple_device()){
        item_date = new Date(items[delta].item.value2);
      } else {
        item_date = new Date(date_apple_cleanse(items[delta].item.value2));
        item_date = item_date.getTime() + (item_date.getTimezoneOffset() * 60000);
        item_date = new Date(item_date);
      }
      if (items[delta].item && items[delta].item.offset2) {
        offset = items[delta].item.offset2;
      }
    }
    if (!value_set && !value2_set && !item_date) { item_date = new Date(); }

    // If we're on an Apple device, convert the date using the offset values from Drupal if there are any.
    if (date_apple_device() && offset) {
      item_date = date_item_adjust_offset(item_date, offset);
    }

    // Build the result object.
    var result = {
      item_date: item_date,
      offset: offset,
      timezone: null,
      timezone_db: null
    };

    // If time zone handling is enabled on the date level and we have a value and an item date...
    if (date_tz_handling_is_date(field) && (value_set || value2_set) && item_date) {

      // Set aside the date and site timezones.
      result.timezone = items[delta].item.timezone;
      result.timezone_db = items[delta].item.timezone_db;

      // Drupal delivers to us the value and value2 pre-rendered and adjusted for the site's time zone. Drupal also
      // provides us with with the date item's time zone name and the date's time zone offset, we need to convert the
      // item_date to the date's time zone, because at this point item_date has already been converted to the device's
      // time zone. We do this by first subtracting off the site's timezone offset in milliseconds from the item date's
      // milliseconds, then add the original item date's offset to this. Essentially convert to UTC, then convert to the
      // time zone mentioned on the item's value.
      var adjust = item_date.valueOf() - date_get_time_zone()*1000 + offset*1000;
      item_date = new Date(adjust);
      result.item_date = item_date;

    }

    return result;
  }
  catch (error) { console.log('_date_get_item_and_offset', error); }
}

function _date_widget_check_and_set_defaults(items, delta, instance, todate, d) {
  try {

    // Determine if value and value_2 have been set for this item.
    var value_set = true;
    var value2_set = true;
    if (typeof items[delta].value === 'undefined' || items[delta].value == '') {
      value_set = false;
    }
    if (
        typeof items[delta].item === 'undefined' ||
        typeof items[delta].item.value2 === 'undefined' ||
        items[delta].item.value2 == ''
    ) { value2_set = false; }

    // If the value isn't set, check if a default value is available.
    if (!value_set && (items[delta].default_value == '' || !items[delta].default_value) && instance.settings.default_value != '') {
      items[delta].default_value = instance.settings.default_value;
    }
    if (!value2_set && (!empty(todate)) && (items[delta].default_value2 == '' || !items[delta].default_value2) && instance.settings.default_value2 != '') {
      items[delta].default_value2 = instance.settings.default_value2;
    }

    // If the value isn't set and we have a default value, let's set it.
    if (!value_set && items[delta].default_value != '') {
      switch (items[delta].default_value) {
        case 'now':
          var now = date_yyyy_mm_dd_hh_mm_ss(date_yyyy_mm_dd_hh_mm_ss_parts(d));
          items[delta].value = now;
          items[delta].default_value = now;
          value_set = true;
          break;
        case 'blank':
          items[delta].value = '';
          items[delta].default_value = '';
          break;
        default:
          console.log('WARNING: date_field_widget_form() - unsupported default value: ' + items[delta].default_value);
          break;
      }
      if (value_set) { // Spoof the item.
        if (!items[delta].item) { items[delta].item = {}; }
        items[delta].item.value = items[delta].value;
      }
    }
    if (!value2_set && typeof(items[delta].default_value2) != 'undefined' && items[delta].default_value2 != '') {
      switch (items[delta].default_value2) {
        case 'now':
          var now = date_yyyy_mm_dd_hh_mm_ss(date_yyyy_mm_dd_hh_mm_ss_parts(d));
          items[delta].value2 = now;
          items[delta].default_value2 = now;
          value2_set = true;
          break;
        case 'same':
          var now = date_yyyy_mm_dd_hh_mm_ss(date_yyyy_mm_dd_hh_mm_ss_parts(d));
          items[delta].value2 = now;
          items[delta].default_value2 = now;
          if (!empty(items[delta].value)) { items[delta].value += '|'; }
          items[delta].value += items[delta].value2;
          if (!empty(items[delta].default_value)) { items[delta].default_value += '|'; }
          items[delta].default_value += items[delta].default_value2;
          value2_set = true;
          break;
        case 'blank':
          items[delta].value2 = '';
          items[delta].default_value2 = '';
          break;
        default:
          console.log('WARNING: date_field_widget_form() - unsupported default value 2: ' + items[delta].default_value2);
          break;
      }
      if (value2_set) { // Spoof the item.
        if (!items[delta].item) { items[delta].item = {}; }
        items[delta].item.value2 = items[delta].value2;
      }
    }
    return {
      value_set: value_set,
      value2_set: value2_set
    };
  }
  catch (error) { console.log('_date_widget_check_and_set_defaults', error); }
}

/**
 * Implements hook_services_request_pre_postprocess_alter().
 */
function date_services_request_pre_postprocess_alter(options, result) {
  // After the system connect, add the time zones to the drupalgap object if they are present.
  if (options.service == 'system' && options.resource == 'connect' && result.time_zones) {
    drupalgap.time_zones = result.time_zones;
  }
}

/**
 * Implements hook_assemble_form_state_into_field().
 */
function date_assemble_form_state_into_field(entity_type, bundle, form_state_value, field, instance, langcode, delta, field_key, form) {
  try {
    // Grab our "to date" setting for the field.
    var todate = field.settings.todate;

    // Do we have an item?
    var have_item = typeof form.elements[field.field_name][langcode][delta].item !== 'undefined';

    // On iOS we must place a 'T' on the date.
    if (instance.widget.type == 'date_select') {
      if (date_apple_device()) { form_state_value = date_apple_cleanse(form_state_value); }
    }
    var result = {};

    var values = ['value'];
    if (!empty(todate)) { values.push('value2'); }
    $.each(values, function(_index, _value) {

      result[_value] = {};

      // Is there a "to date" already set on the current value?
      var todate_already_set = form_state_value.indexOf('|') != -1 ? true : false;

      // Perpare the value part(s).
      var parts = [];
      if (todate_already_set) { parts = form_state_value.split('|'); }
      else { parts.push(form_state_value); }

      // Add timezone object to result, if necessary.
      if (date_tz_handling_is_date(field)) {
        var timezone = {
          timezone: $('#' + form.elements[field.field_name][langcode][delta].id + '-timezone').val()
        };
        if (field.settings.timezone_db) { timezone.timezone_db = field.settings.timezone_db; }
        result.timezone = timezone;
      }

      function _date_set_attribute_on_value(grain, value) {
        var field_date = null;
        if (_value == 'value') {
          field_date = new Date(parts[0]);
          if (have_item) {
            var offset = parseInt(form.elements[field.field_name][langcode][delta].item.offset);
            if (offset) { result.offset = offset; }
            if (date_apple_device() && offset) {
              field_date = new Date(field_date.toUTCString());
              field_date = field_date.getTime() / 1000;
              field_date -= parseInt(offset);
              field_date = new Date(field_date * 1000);
            } else if (date_apple_device()) {
              // console.log('--- date_apple_device 1 ---');
              field_date = new Date(date_apple_cleanse(parts[0]));
              field_date = field_date.getTime() + (field_date.getTimezoneOffset() * 60000);
              field_date = new Date(field_date);
            }
          } else {
            // console.log('does not have_item', have_item);
            if (date_apple_device() && offset) {
              field_date = new Date(field_date.toUTCString());
              field_date = field_date.getTime() / 1000;
              field_date -= parseInt(offset);
              field_date = new Date(field_date * 1000);
            } else if (date_apple_device()) {
              // console.log('--- date_apple_device 2 ---');
              field_date = new Date(date_apple_cleanse(parts[0]));
              field_date = field_date.getTime() + (field_date.getTimezoneOffset() * 60000);
              field_date = new Date(field_date);
            }
          }
        }
        else if (_value == 'value2') {
          field_date = new Date(parts[1]);
          if (have_item) {
            var offset2 = parseInt(form.elements[field.field_name][langcode][delta].item.offset2);
            if (offset2) { result.offset2 = offset2; }
            if (date_apple_device() && offset2) {
              field_date = new Date(field_date.toUTCString());
              field_date = field_date.getTime() / 1000;
              field_date -= parseInt(offset2);
              field_date = new Date(field_date * 1000);
            } else if (date_apple_device()) {
              field_date = new Date(date_apple_cleanse(parts[1]));
              field_date = field_date.getTime() + (field_date.getTimezoneOffset() * 60000);
              field_date = new Date(field_date);
            }
          } else {
            if (date_apple_device() && offset2) {
              field_date = new Date(field_date.toUTCString());
              field_date = field_date.getTime() / 1000;
              field_date -= parseInt(offset2);
              field_date = new Date(field_date * 1000);
            } else if (date_apple_device()) {
              field_date = new Date(date_apple_cleanse(parts[1]));
              field_date = field_date.getTime() + (field_date.getTimezoneOffset() * 60000);
              field_date = new Date(field_date);
            }
          }
        }

        if (instance.widget.type == 'date_select') {
          if (value) {
            switch (grain) {
              case 'year':
                result[_value].year = field_date.getFullYear();
                break;
              case 'month':
                result[_value].month = parseInt(field_date.getMonth()) + 1;
                break;
              case 'day':
                result[_value].day = parseInt(field_date.getDate());
                break;
              case 'hour':
                result[_value].hour = parseInt(field_date.getHours());
                if (!date_military(instance)) {
                  if (result[_value].hour >= 12) {
                    result[_value].hour = result[_value].hour % 12;
                    result[_value].ampm = 'pm';
                  } else {
                    result[_value].ampm = 'am';
                  }
                  if (result[_value].hour == 0) { result[_value].hour = 12; }
                }
                break;
              case 'minute':
                result[_value].minute = '' + parseInt(field_date.getMinutes());
                if (result[_value].minute.length == 1) { result[_value].minute = '0' + result[_value].minute; }
                break;
              case 'second':
                result[_value].second = '' + parseInt(field_date.getSeconds());
                if (result[_value].second.length == 1) { result[_value].second = '0' + result[_value].second; }
                break;
            }
          }
        }
      }

      field_key.use_key = false;
      field_key.use_delta = true;
      if (instance.widget.type == 'date_select') {
        $.each(field.settings.granularity, _date_set_attribute_on_value);
      } else if (instance.widget.type == 'date_popup') {
        result[_value] = {};

        var field_value = '';
        if (_value == 'value') {
          if (date_apple_device()) {
            field_value = new Date(date_apple_cleanse(parts[0]));
          }
          else {
            field_value = new Date(parts[0]);
          }
        }
        else if (_value == 'value2') {
          if (date_apple_device()) {
            field_value = new Date(date_apple_cleanse(parts[1]));
          }
          else {
            field_value = new Date(parts[1]);
          }

          // The show_todate field must be sended when the todate is required
          // or when the value2 is set, so it will be saved
          if (
            (todate == 'required') ||
            ((todate == 'optional') && (typeof(field_value) == 'object'))
          ) {
            result['show_todate'] = true;
          }
        }

        var _widget_date_format = date_format_widget(field, instance);
        if (date_has_date(field.settings.granularity)) {
          var _widget_date_granularity = JSON.parse(JSON.stringify(field.settings.granularity));
          _widget_date_granularity['hour'] = 0;
          _widget_date_granularity['minute'] = 0;
          _widget_date_granularity['second'] = 0;

          var _widget_date_date_format = date_limit_format(_widget_date_format, _widget_date_granularity);
          result[_value]['date'] = date(_widget_date_date_format, field_value.getTime());
        }
        if (date_has_time(field.settings.granularity)) {
          var _widget_time_granularity = JSON.parse(JSON.stringify(field.settings.granularity));
          _widget_time_granularity['year'] = 0;
          _widget_time_granularity['month'] = 0;
          _widget_time_granularity['day'] = 0;

          var _widget_date_time_format = date_limit_format(_widget_date_format, _widget_time_granularity);
          result[_value]['time'] = date(_widget_date_time_format, field_value.getTime());
        }
      } else {
        var field_value = '';
        if (_value == 'value') {
          field_value = parts[0];
        }
        else if (_value == 'value2') {
          field_value = parts[1];

          // The show_todate field must be sended when the todate is required
          // or when the value2 is set, so it will be saved
          if (
            (todate == 'required') ||
            ((todate == 'optional') && (!empty(field_value)))
          ) {
            result['show_todate'] = true;
          }
        }
        result[_value] = { 'date': field_value };
      }
    });

    return result;
  }
  catch (error) {
    console.log('date_assemble_form_state_into_field - ' + error);
  }
}

/**
 *
 */
function theme_datetime(variables) {
  try {
    //dpm(variables);
    var html = '';

    // Make this a hidden field since the widget will just populate a value.
    variables.attributes.type = 'hidden';
    html += '<input ' + drupalgap_attributes(variables.attributes) + '/>';

    // Render the widget based on its type.
    var widget_type = variables.field_info_instance.widget.type;
    var widget_function = 'theme_' + widget_type;
    if (function_exists(widget_function)) {
      var fn = window[widget_function];
      html += fn.call(null, variables);
    }
    else {
      var msg = 'WARNING: theme_datetime() - unsupported widget type! (' + widget_type + ')';
      console.log(msg);
    }

    return html;
  }
  catch (error) { console.log('theme_datetime - ' + error); }
}

/**
 *
 */
function theme_date_select(variables) {
  try { return theme('select', variables); }
  catch (error) { console.log('theme_date_select - ' + error); }
}

/**
 *
 */
function theme_date_label(variables) {
  try {
    return '<div ' + drupalgap_attributes(variables.attributes) + '><strong>' +
        variables.title +
        '</strong></div>';
  }
  catch (error) { console.log('theme_date_label - ' + error); }
}

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
