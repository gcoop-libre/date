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

    // Grab the current value (which may include both the "from" and "to" dates
    // separated by a pipe '|')
    var current_val = $('#' + id).val();

    // Is there a "to date" already set on the current value?
    var todate_already_set = current_val.indexOf('|') != -1 ? true : false;

    // Prepare the value part(s).
    var parts = [];
    if (todate_already_set) { parts = current_val.split('|'); }
    else { parts.push(current_val); }

    // Get the date for the current value, or just default to now.
    //console.log('parts before', parts);
    var date = null;
    if (!current_val) {
      if (date_apple_device()) {
        item_date = new Date();
        item_date = item_date.getTime() + (item_date.getTimezoneOffset() * 60000);
        date = new Date(item_date);
      } else {
        date = new Date();
      }
    } else {

      // In case they set the "to date" before the "from date", give the "from date" a default value.
      if (!todate && empty(parts[0])) { parts[0] = date_yyyy_mm_dd_hh_mm_ss(); }

      //Fixes iOS bug spaces must be replaced with T's
      if (date_apple_device() && offset) {
        // TODO  -- update to reflect code below
        date = date_item_adjust_offset(date, offset);
      } else if (date_apple_device()) {
        if (!todate) {
          item_date = new Date(date_apple_cleanse(parts[0]));
          item_date = item_date.getTime() + (item_date.getTimezoneOffset() * 60000);
          date = new Date(item_date);
        }
        else {
          if (todate_already_set) {
            item_date = new Date(date_apple_cleanse(parts[1]));
            item_date = item_date.getTime() + (item_date.getTimezoneOffset() * 60000);
            date = new Date(item_date);
          }
        }
      } else {
        if (!todate) {
          date = new Date(parts[0]);
        } else {
          if (todate_already_set) {
            date = new Date(parts[1]);
          } else {
            date = new Date();
          }
        }
      }
    }
    //console.log('parts after', parts);

    var input_val = $(input).val();
    switch (grain) {
      case 'year':
        date.setYear(input_val);
        break;
      case 'month':
        date.setMonth(input_val - 1);
        break;
      case 'day':
        date.setDate(input_val);
        break;
      case 'hour':
        if (!military) {
          var currenthour = date.getHours();
          if (input_val == 'pm') {
            if (date.getHours() < 12) { date.setHours(date.getHours() + 12); }
            else { date.setHours(date.getHours()); }
          }
          else if (input_val == 'am') { date.setHours(date.getHours() - 12); }

          input_val = parseInt(input_val);
          if (input_val >= 0 && currenthour > 12) {
            date.setHours(input_val + 12);
          } else if (input_val >= 0 && currenthour < 12) {
            date.setHours(input_val);
          } else if (input_val >= 0 && currenthour == 12) {
            date.setHours(0);
          }
        }
        else { date.setHours(input_val); }
        break;
      case 'minute':
        date.setMinutes(input_val);
        break;
    }

    // Adjust the minutes.
    //console.log('before', date);
    date.setMinutes(_date_minute_increment_adjust(increment, date.getMinutes()));
    //console.log('after', date);

    // Finally set the value.
    var _value = date_yyyy_mm_dd_hh_mm_ss(date_yyyy_mm_dd_hh_mm_ss_parts(date));
    if (!todate) { parts[0] = _value; }
    else { parts[1] = _value;  }
    //console.log('value', _value, date, parts);
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

function _date_widget_check_and_set_defaults(items, delta, instance, d) {
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
    if (!value2_set && (items[delta].default_value2 == '' || !items[delta].default_value2) && instance.settings.default_value2 != '') {
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
    if (!value2_set && items[delta].default_value2 != '') {
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
