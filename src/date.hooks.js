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
