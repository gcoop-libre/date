function _date_grain_widget_year(date, instance, attributes, value_set, value2_set, item_date) {
  try {
    // Determine the current year and the range of year(s) to provide
    // as options. The range can either be relative, absolute or both,
    // e.g. -3:+3, 2000:2010, 2000:+3
    var year = parseInt(date.getFullYear());
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
      low = parseInt(low) + year;
    }
    else { low = parseInt(low); }
    if (!low) { low = year; }
    // Determine the high end year integer value.
    var high = parts[1];
    var high_absolute = true;
    if (high.indexOf('-') != -1 || high.indexOf('+') != -1) { high_absolute = false; }
    if (!high_absolute) {
      if (high.indexOf('+') != -1) {
        high = high.replace('+', '');
      }
      high = parseInt(high) + year;
    }
    else { high = parseInt(high); }
    if (!high) { high = year; }
    // Build the options.
    var options = {};
    for (var i = low; i <= high; i++) {
      options[i] = i;
    }
    // Parse the year from the item's value, if it is set.
    if (value_set) { year = parseInt(item_date.getFullYear()); }
    // Build and theme the select list.
    return {
      prefix: theme('date_label', { title: t('Year') }),
      type: 'date_select',
      value: year,
      attributes: attributes,
      options: options
    };
  }
  catch (error) { console.log('_date_grain_widget_year', error); }
}

function _date_grain_widget_month(date, instance, attributes, value_set, value2_set, item_date) {
  try {
    // Determine the current month.
    var month = parseInt(date.getMonth()) + 1;
    // Build the options.
    var options = {};
    for (var i = 1; i <= 12; i++) {
      options[i] = '' + i;
    }
    // Parse the month from the item's value, if it is set.
    if (value_set) { month = parseInt(item_date.getMonth()) + 1; }
    // Build and theme the select list.
    return {
      prefix: theme('date_label', { title: t('Month') }),
      type: 'date_select',
      value: month,
      attributes: attributes,
      options: options
    };
  }
  catch (error) { console.log('_date_grain_widget_month', error); }
}

function _date_grain_widget_day(date, instance, attributes, value_set, value2_set, item_date) {
  try {
    // Determine the current day.
    var day = parseInt(date.getDate());
    // Build the options.
    var options = {};
    for (var i = 1; i <= 31; i++) {
      options[i] = '' + i;
    }
    // Parse the day from the item's value, if it is set.
    if (value_set) { day = parseInt(item_date.getDate()); }
    // Build and theme the select list.
    return {
      prefix: theme('date_label', { title: t('Day') }),
      type: 'date_select',
      value: day,
      attributes: attributes,
      options: options
    };
  }
  catch (error) { console.log('_date_grain_widget_day', error); }
}

function _date_grain_widget_hour(date, instance, attributes, value_set, value2_set, item_date, military) {
  try {
    // Determine the current hour.
    var hour = parseInt(date.getHours());

    // Build the options, paying attention to 12 vs 24 hour format.
    var options = {};
    var max = military ? 23 : 12;
    var min = military ? 0 : 1;
    for (var i = min; i <= max; i++) { options[i] = '' + i; }

    // Parse the hour from the item's value, if it is set.
    if (value_set) {
      hour = parseInt(item_date.getHours());
      if (!military) {
        if (hour > 12) { hour -= 12; }
        else if (hour === 0) { hour = 12; }
      }
    }

    // Build and theme the select list.
    return {
      prefix: theme('date_label', { title: t('Hour') }),
      type: 'date_select',
      value: hour,
      attributes: attributes,
      options: options
    };
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
    var minute = parseInt(date.getMinutes());

    // Build the options.
    var options = {};
    for (var i = 0; i <= 59; i += increment) {
      var text = '' + i;
      if (text.length == 1) { text = '0' + text; }
      options[i] = text;
    }

    // Parse the minute from the item's value, if it is set.
    if (value_set && _value == 'value') { minute = parseInt(item_date.getMinutes()); }
    else if (value2_set && _value == 'value2') { minute = parseInt(item_date.getMinutes()); }
    if (increment != 1) {
      minute = _date_minute_increment_adjust(increment, minute);
    }

    // Build and theme the select list.
    return {
      prefix: theme('date_label', { title: t('Minute') }),
      type: 'date_select',
      value: minute,
      attributes: attributes,
      options: options
    };
  }
  catch (error) { console.log('_date_grain_widget_minute', error); }
}

function _date_grain_widget_second(date, instance, attributes, value_set, value2_set, item_date, _value) {
  try {
    // Determine the current second.
    var second = parseInt(date.getSeconds());

    // Build the options.
    var options = {};
    for (var i = 0; i <= 59; i ++) {
      var text = '' + i;
      if (text.length == 1) { text = '0' + text; }
      options[i] = text;
    }

    // Parse the second from the item's value, if it is set.
    if (value_set && _value == 'value') { second = parseInt(item_date.getSeconds()); }
    else if (value2_set && _value == 'value2') { second = parseInt(item_date.getSeconds()); }

    // Build and theme the select list.
    return {
      prefix: theme('date_label', { title: t('Second') }),
      type: 'date_select',
      value: second,
      attributes: attributes,
      options: options
    };
  }
  catch (error) { console.log('_date_grain_widget_second', error); }
}

function _date_grain_widgets_ux_wrap(items, delta, _widget_year, _widget_month, _widget_day, _widget_hour, _widget_minute, _widget_second, _widget_ampm) {
  try {

    // Add the children widgets in the order of "y-m-d h-i-s", and wrap them in
    // jQM grids as necessary to help with UX...

    // YMD
    var ymd_grid = null;
    if (_widget_month && !_widget_day) { ymd_grid = 'ui-grid-a'; }
    else if (_widget_month && _widget_day) { ymd_grid = 'ui-grid-b'; }
    if (ymd_grid) {
      items[delta].children.push({ markup: '<div class="' + ymd_grid + '">' });
    }
    if (_widget_year) {
      if (ymd_grid) {
        _widget_year.prefix = '<div class="ui-block-a">' + _widget_year.prefix;
        _widget_year.suffix = '</div>';
      }
      items[delta].children.push(_widget_year);
    }
    if (_widget_month) {
      if (ymd_grid) {
        _widget_month.prefix = '<div class="ui-block-b">' + _widget_month.prefix;
        _widget_month.suffix = '</div>';
      }
      items[delta].children.push(_widget_month);
    }
    if (_widget_day) {
      if (ymd_grid) {
        var _block_class = _widget_month ? 'ui-block-c' : 'ui-block-b';
        _widget_day.prefix = '<div class="' + _block_class + '">' + _widget_day.prefix;
        _widget_day.suffix = '</div>';
      }
      items[delta].children.push(_widget_day);
    }
    if (ymd_grid) { items[delta].children.push({ markup: '</div>' }); }

    // HIS
    var his_grid = null;
    if (_widget_hour) {
      if (_widget_minute && !_widget_second) { his_grid = 'ui-grid-a'; }
      else if (_widget_minute && _widget_second) { his_grid = 'ui-grid-b'; }
    }
    else {
      if (_widget_minute && _widget_second) { his_grid = 'ui-grid-b'; }
    }
    if (his_grid) {
      items[delta].children.push({ markup: '<div class="' + his_grid + '">' });
    }
    if (_widget_hour) {
      if (his_grid) {
        _widget_hour.prefix = '<div class="ui-block-a">' + _widget_hour.prefix;
        _widget_hour.suffix = '</div>';
      }
      items[delta].children.push(_widget_hour);
    }
    if (_widget_minute) {
      if (his_grid) {
        var _block_class = 'ui-block-a';
        if (_widget_hour) { _block_class = 'ui-block-b'; }
        _widget_minute.prefix = '<div class="' + _block_class + '">' + _widget_minute.prefix;
        _widget_minute.suffix = '</div>';
      }
      items[delta].children.push(_widget_minute);
    }
    if (_widget_second) { items[delta].children.push(_widget_second); }
    if (_widget_ampm) { items[delta].children.push(_widget_ampm); }
    if (ymd_grid) { items[delta].children.push({ markup: '</div>' }); }
  }
  catch (error) { console.log('_date_grain_widgets_ux_wrap', error); }
}
