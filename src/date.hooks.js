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

    //console.log('assemble', arguments);

    field_key.use_delta = false;

    // Grab our "to date" setting for the field.
    var todate = field.settings.todate;

    // Do we have an item?
    var have_item = typeof form.elements[field.field_name][langcode][delta].item !== 'undefined';

    //console.log('BYE', form_state_value, field, instance);

    // On iOS we must place a 'T' on the date.
    if (date_apple_device()) { form_state_value = date_apple_cleanse(form_state_value); }
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

      //console.log('HELLO', form_state_value, parts, form_state_value);

      // Add timezone object to result, if necessary.
      if (date_tz_handling_is_date(field)) {
        var timezone = {
          timezone: $('#' + form.elements[field.field_name][langcode][delta].id + '-timezone').val()
        };
        if (field.settings.timezone_db) { timezone.timezone_db = field.settings.timezone_db; }
        result.timezone = timezone;
      }

      function _date_set_attribute_on_value(grain, value) {

        var d = null;
        if (_value == 'value') {
          if (have_item) {
            var offset = parseInt(form.elements[field.field_name][langcode][delta].item.offset);
            if (offset) { result.offset = offset; }
            if (date_apple_device() && offset) {
              d = new Date(d.toUTCString());
              d = d.getTime() / 1000;
              d -= parseInt(offset);
              d = new Date(d * 1000);
            } else if (date_apple_device()) {
              // console.log('--- date_apple_device 1 ---');
              date = new Date(date_apple_cleanse(parts[0]));
              date = date.getTime() + (date.getTimezoneOffset() * 60000);
              date = new Date(date);
            } else {// 
              date = new Date(parts[0]);
            }
          } else {
            // console.log('does not have_item', have_item);
            if (date_apple_device() && offset) {
              date = new Date(date.toUTCString());
              date = date.getTime() / 1000;
              date -= parseInt(offset);
              date = new Date(date * 1000);
            } else if (date_apple_device()) {
              // console.log('--- date_apple_device 2 ---');
              date = new Date(date_apple_cleanse(parts[0]));
              date = date.getTime() + (date.getTimezoneOffset() * 60000);
              date = new Date(date);
            } else {
              date = new Date(parts[0]);
            }
          }
        }
        else if (_value == 'value2') {
          if (have_item) {
            var offset2 = parseInt(form.elements[field.field_name][langcode][delta].item.offset2);
            if (offset2) { result.offset2 = offset2; }
            if (date_apple_device() && offset2) {
              d = new Date(d.toUTCString());
              d = d.getTime() / 1000;
              d -= parseInt(offset2);
              d = new Date(d * 1000);
            } else if (date_apple_device()) {
              date = new Date(date_apple_cleanse(parts[1]));
              date = date.getTime() + (date.getTimezoneOffset() * 60000);
              date = new Date(date);
            } else {
              date = new Date(parts[1]);
            }
          } else {
            if (date_apple_device() && offset2) {
              date = new Date(date.toUTCString());
              date = date.getTime() / 1000;
              date -= parseInt(offset2);
              date = new Date(date * 1000);
            } else if (date_apple_device()) {
              date = new Date(date_apple_cleanse(parts[1]));
              date = date.getTime() + (date.getTimezoneOffset() * 60000);
              date = new Date(date);
            } else {
              date = new Date(parts[1]);
            }
          }
        }

        if (instance.widget.type == 'date_text') {
          result[_value].date = date(instance.widget.settings.input_format, d);
          // Support seconds.
          result[_value].date = result[_value].date.replace("s", d.getSeconds());
        }
        else {
           // instance.widget.type == 'date_select'.
          if (value) {
            switch (grain) {
              case 'year':
                result[_value].year = date.getFullYear();
                break;
              case 'month':
                result[_value].month = parseInt(date.getMonth()) + 1;
                break;
              case 'day':
                result[_value].day = parseInt(date.getDate());
                break;
              case 'hour':
                result[_value].hour = parseInt(date.getHours());
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
                result[_value].minute = '' + parseInt(date.getMinutes());
                if (result[_value].minute.length == 1) { result[_value].minute = '0' + result[_value].minute; }
                break;
            }
          }
        }
      }

      if (instance.widget.type == 'date_text') {
        _date_set_attribute_on_value(null, null);
      }
      else {
         // instance.widget.type == 'date_select'.
        $.each(field.settings.granularity, _date_set_attribute_on_value);
      }

    });

    //console.log('RESULT', result);

    return result;
  }
  catch (error) {
    console.log('date_assemble_form_state_into_field - ' + error);
  }
}
