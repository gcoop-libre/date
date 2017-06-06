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
