const isDev = (cb = false) => {
  const env = location.href.indexOf('localhost') !== -1;
  if (cb && env) cb();
  return env;
}

// Calendar functions

// clear helper

const clear = () => {
  return fetch('/users/get-calendar?clear=1', { credentials: 'include' });
}

// view

class DateManager extends Date {
  data(type) {
    return {
      ms: 1,
      sec: 1000,
      min: 1000 * 60,
      hour: (1000 * 60) * 60,
      day: ((1000 * 60) * 60) * 24,
      week: (((1000 * 60) * 60) * 24) * 7
    }[type];
  }
  subtract(object, duration = false) {
    const initDate = this.getTime();
    if (typeof object === 'object') {
      let updateDate = 0;
      for (let key in object) {
        updateDate += this.data(key) * object[key];
      }
      return new DateManager(initDate - updateDate);
    }
    return new DateManager(initDate - (this.data(object) * duration));
  }
  add(object, duration = false) {
    const initDate = this.getTime();
    if (typeof object === 'object') {
      let updateDate = 0;
      for (let key in object) {
        updateDate += this.data(key) * object[key];
      }
      return new DateManager(initDate + updateDate);
    }
    return new DateManager(initDate + (this.data(object) * duration));
  }
}

window.DateManager = DateManager;

const viewTitle = (element, calendar) => {
  const date = calendar.currentData.currentDate;
  element = document.querySelector(element);
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель',
    'Май', 'Июнь', 'Июль', 'Август',
    'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  const timeDay = (((1000 * 60) * 60) * 24);
  const dayData = {
    firstDay: new Date(date.getTime() - (timeDay * (date.getDay() - 1))),
    today: date,
    lastDay: new Date(date.getTime() + (timeDay * (7 - date.getDay())))
  }
  let result;
  if (dayData.firstDay.getMonth() !== dayData.lastDay.getMonth()) {
    let firstMonth = months[dayData.firstDay.getMonth()];
    let firstYear = dayData.firstDay.getFullYear();
    let lastMonth = months[dayData.lastDay.getMonth()];
    let lastYear = dayData.lastDay.getFullYear();
    firstYear = firstYear === lastYear ? ' ' : ` ${firstYear}`;
    result = `${firstMonth}${firstYear} — ${lastMonth} ${lastYear}`;
  }
  else {
    result = `${months[date.getMonth()]} ${date.getFullYear()}`;
  }
  element.textContent = result;
}

const viewTooltip = items => {
  addEventListener('load', (event) => {
    items = document.querySelectorAll(items);
    items.forEach(item => {
      const width = item.offsetWidth;
      if (innerWidth >= 768) {
        Object.assign(item.style, {
          left: '50%',
          marginLeft: `-${width / 2}px`
        });
      }
      else {
        Object.assign(item.style, {
          left: `-${width}px`
        });
      }
    });
  });
};

const viewDate = (element, calendar) => {
  element = document.querySelector(element);
  const timeGridView = document.querySelectorAll('[data-size]');
  const prev = element.querySelector('[data-prev]');
  const next = element.querySelector('[data-next]');
  const picker = element.querySelector('[data-picker]');
  const pickerField = picker.querySelector('[type="button"]');
  const date = calendar.currentData.currentDate;
  const mdy = date => {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${('0'+d).slice(-2)}.${('0'+m).slice(-2)}.${y}`;
  }
  picker.setAttribute('data-picker', mdy(date));
  let selectDate = 0;
  let eventsHasOrder = {};
  $(pickerField).datepicker({
    position: 'bottom center',
    maxDate: (new DateManager).subtract({day: (new Date).getDay()}).add({week: 5}),
    onShow() {
      if (!Object.keys(eventsHasOrder).length) {
        rawEvents.forEach((event) => {
          const date = new Date(event.start).setHours(0, 0, 0, 0);
          if (!eventsHasOrder[date]) {
            eventsHasOrder[date] = event.classNames;
          }
          else {
            eventsHasOrder[date] = eventsHasOrder[date].concat(event.classNames);
          }
        });
      }
    },
    onRenderCell: function(date, cellType) {
      if (rawEvents.length) {
        if (cellType == 'day' && eventsHasOrder[date.getTime()]) {
          const events = eventsHasOrder[date.getTime()];
          const hasOpen = events.indexOf('state-open') !== -1;
          const hasWebinar = events.indexOf('state-webinar') !== -1;
          const hasBoth = hasOpen && hasWebinar;
          const openElement = '<div class="datepicker-notify__item" data-type="open"></div>';
          const webinarElement = '<div class="datepicker-notify__item" data-type="webinar"></div>';
          const notify = document.createElement('div');
          notify.className = 'datepicker-notify';
          if (hasBoth) {
            notify.insertAdjacentHTML('beforeend', openElement);
            notify.insertAdjacentHTML('beforeend', webinarElement);
          }
          else if (hasOpen) {
            notify.insertAdjacentHTML('beforeend', openElement);
          }
          else if (hasWebinar) {
            notify.insertAdjacentHTML('beforeend', webinarElement);
          }
          return {
            html: date.getDate() + notify.outerHTML
          }
        }
      }
    },
    onSelect(formattedDate, date, inst) {
      selectDate = date ? date : selectDate;
      inst.hide();
      picker.setAttribute('data-picker', mdy(selectDate));
      calendar.gotoDate(selectDate);
      viewTitle('.toolbar__title', calendar);
      role.has('expert', role => {
        weekDayClick('.fc th.fc-day');
        weekViewUpdate('.fc .fc-week', date);
        weekViewClick('.fc .fc-week');
        weekDaysClear('.fc .fc-day');
        weekViewClear('.fc .fc-week');
      });
    }
  });
  picker.addEventListener('click', () => pickerField.focus());
  prev.addEventListener('click', () => {
    calendar.prev();
    //setSnapshot(calendar.getEvents());
    picker.setAttribute('data-picker', mdy(calendar.currentData.currentDate));
    role.has('expert', role => {
      weekDayClick('.fc th.fc-day');
      weekViewUpdate('.fc .fc-week', 'prev');
      weekViewClick('.fc .fc-week');
      weekDaysClear('.fc .fc-day');
      weekViewClear('.fc .fc-week');
      clearWeek(calendar, 'prev');
    });
    viewTitle('.toolbar__title', calendar);
    next.className.indexOf('state-disable') !== -1 && next.classList.remove('state-disable');
  });
  // const nextEdge = new DateManager(date.setHours(0, 0, 0, 0))
  //  .subtract({ day: date.getDay() })
  //  .add({ week: 5 });
  next.addEventListener('click', e => {
    // const date = calendar.getDate();
    // const currentDate = new DateManager(date.setHours(0, 0, 0, 0)).add({
    //  day: calendar.view.type === 'timeGridDay' ? innerWidth >= 768 ? 1 : 0 : 6,
    //  week: calendar.view.type === 'timeGridDay' ? 0 : 1
    // });
    // if (currentDate.getTime() === nextEdge.getTime()) {
    //  next.classList.add('state-disable');
    // }
    // else if (currentDate > nextEdge) {
    //  return e.preventDefault();
    // }
    calendar.next();
    //setSnapshot(calendar.getEvents());
    picker.setAttribute('data-picker', mdy(calendar.currentData.currentDate));
    role.has('expert', role => {
      weekDayClick('.fc th.fc-day');
      weekViewUpdate('.fc .fc-week', 'next');
      weekViewClick('.fc .fc-week');
      weekDaysClear('.fc .fc-day');
      weekViewClear('.fc .fc-week');
      clearWeek(calendar, 'next');
    });
    viewTitle('.toolbar__title', calendar);
  });

  timeGridView.forEach((view) => {
    const viewType = view.getAttribute('data-size');
    view.addEventListener('click', (event) => {
      const dm = new DateManager(calendar.getDate()).add({ hour: 3 });
      picker.setAttribute(
        'data-picker',
        mdy(
          viewType === 'timeGridWeek'
          ? dm.subtract({ day: (dm.getDay() === 0 ? 7 : dm.getDay()) - 1 })
          : dm
        )
      );
    });
  });

}

const clearWeek = (calendar, direction) => {
  const date = calendar.currentData.currentDate.getTime();
  calendar.getEvents().forEach(event => {
    if (direction === 'prev') {
      if (event.start > date) {
        event.remove();
      }
    }
    else if (direction === 'next') {
      if (event.start < date) {
        event.remove();
      }
    }
  });
}

const viewTimezone = (element, calendar) => {
  const $el = document.querySelector(element);
  const $field = $el.querySelector(`${element}__field`);
  const $input = $field.children[0];
  const $list = $el.querySelector(`${element}__list`);
  const action = $el.getAttribute('data-tz');
  const debounce = (el, { delay, beforeFire, fired }) => {
    const handler = ((t) => (e) => {
      beforeFire(e);
      if (t) clearTimeout(t);
      if (e.target.value.length) {
        t = setTimeout(() => fired(e), delay);
      }
    })();
    el.addEventListener('input', handler);
  };
  const clear = (e) => {
    $field.classList.remove('state-load');
    $list.classList.remove('state-active');

    while($list.firstElementChild) {
      $list.removeChild($list.firstElementChild);
    }
  };
  debounce($el, {
    delay: 3000,
    beforeFire(event) {
      $field.classList.add('state-load');
    },
    fired(event) {
      const value = event.target.value;
      const handler = (e) => {
        const target = e.target;
        const tz = target.getAttribute('data-tz-name');

        calendar.setOption('timeZone', tz);
        $input.value = target.textContent;
        $input.setAttribute(
          'data-tz-search',
          tz
        );

        clear(event);
      };
      query(params(action, { query: value }))
        .then((data) => {
          $field.classList.remove('state-load');
          $list.classList.add('state-active');
          Object.entries(data.result).forEach((item) => {
            const [cityTitle, cityTimezone] = item;
            const listItem = document.createElement('div');
            listItem.className = `${element.slice(1)}__item`;
            listItem.textContent = cityTitle;
            listItem.setAttribute('data-tz-name', cityTimezone);
            listItem.addEventListener('click', handler);
            $list.appendChild(listItem);
          });
        });
    }
  });
}

const viewSize = (element, calendar) => {
  element = document.querySelector(element);
  for (let item of element.children) {
    const type = item.getAttribute('data-size');
    item.addEventListener('click', () => {
      for (let itemCompare of element.children) {
        calendar.el.classList.remove('state-size_full', 'state-size_short');
        if (item === itemCompare) {
          calendar.el.classList.add(`state-size_${type}`);
          itemCompare.classList.add('state-active');
        }
        else {
          calendar.el.classList.add(`state-size_${type}`);
          itemCompare.classList.remove('state-active');
        }
      }
      calendar.changeView(type);
      calendar.refetchEvents();
      role.has('expert', role => {
        weekDayClick('.fc th.fc-day');
        weekViewClick('.fc .fc-week');
        weekDaysClear('.fc .fc-day');
        weekViewClear('.fc .fc-week');
      });
    });
  }
}

const weekRenderData = (calendar, week) => {
  const weekView = calendar.el.querySelector('.fc-timegrid-axis');
  const weekElement = week.el.querySelector('a');
  weekView.setAttribute('data-time', week.date.getTime());
  weekView.classList.add('fc-week');
  weekElement.insertAdjacentHTML('afterbegin', `
    <div class="fc-week__icon">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21.0781 24.7305H25.0781V20.7305H27.0781V24.7305H31.0781V26.7305H27.0781V30.7305H25.0781V26.7305H21.0781V24.7305ZM19.0781 24.7305V26.7305H17.0781V24.7305H19.0781ZM15.0781 24.7305V26.7305H13.0781V24.7305H15.0781ZM27.0781 16.7305V18.7305H25.0781V16.7305H27.0781ZM27.0781 12.7305V14.7305H25.0781V12.7305H27.0781ZM23.0781 12.7305V14.7305H21.0781V12.7305H23.0781ZM19.0781 12.7305V14.7305H17.0781V12.7305H19.0781ZM15.0781 12.7305V14.7305H13.0781V12.7305H15.0781ZM15.0781 20.7305V22.7305H13.0781V20.7305H15.0781ZM15.0781 16.7305V18.7305H13.0781V16.7305H15.0781Z" fill="white"/>
      </svg>
    </div>
  `);
};

const weekRender = (week) => {
  week.text += ' нед.';
}

const dayRender = day => {
  const dayData = day.text.split(' ').reverse();
  dayData[0] = ('0' + dayData[0]).slice(-2);
  day.text = dayData.join(' ');
};

const dayRenderData = day => {
  day.el.setAttribute('data-time', day.date.getTime());
}

const weekViewClick = element => {
  const weekView = element = typeof element !== 'string' ? element : document.querySelector(element);
  const weekTime = new Date(Number(element.getAttribute('data-time')));
  const dm = new DateManager(new DateManager(weekTime).subtract('hour', weekTime.getHours()));
  const event = () => {

    weekDaysClear('.fc .fc-day');

    weekView.classList.toggle('state-select');
    if (weekView.className.indexOf('state-select') !== -1) {
      calendar.select({ start: dm, end: dm.add('day', 7) });
    }
    else {
      calendar.unselect();
    }
  };
  weekView.onclick = e => event();
};

const weekViewClear = element => {
  const week = element = typeof element !== 'string' ? element : document.querySelector(element);
  week.className.indexOf('state-select') !== -1 && week.classList.remove('state-select');
}

const weekDaysClear = elements => {
  const days = elements = typeof elements !== 'string' ? elements : document.querySelectorAll(elements);
  days.forEach(day => {
    if (day.className.indexOf('state-select') !== -1) {
      day.classList.remove('state-select');
    }
  });
}

const weekDayClick = elements => {
  const dayCells = elements = typeof elements !== 'string' ? elements : document.querySelectorAll(elements);
  dayCells.forEach((day, index) => {
    const event = () => {

      weekViewClear('.fc .fc-week');

      const dayTime = Number(day.getAttribute('data-time'));
      const dm = new DateManager(dayTime);
      dayCells.forEach((dayCompare, indexCompare) => {
        if (index === indexCompare) {
          dayCompare.classList.toggle('state-select');
          if (dayCompare.className.indexOf('state-select') !== -1) {
            calendar.select({ start: dm });
          }
          else {
            dayCompare.classList.remove('state-select');
            calendar.unselect();
          }
        }
        else {
          if (dayCompare.className.indexOf('state-select') !== -1) {
            dayCompare.classList.remove('state-select');
          }
        }
      });
    };
    day.onclick = e => event();
  });
};

const weekViewUpdate = (element, direction) => {
  const weekView = element = typeof element !== 'string' ? element : document.querySelector(element);
  const weekTime = Number(element.getAttribute('data-time'));
  let updateTime = 0;
  if (typeof direction === 'object') {
    const today = direction.getDay();
    updateTime = new DateManager(direction).subtract('day', today - 1).getTime();
  }
  else {
    if (calendar.view.type === 'timeGridWeek') {
      updateTime = direction === 'prev'
        ? new DateManager(Number(weekTime)).subtract('day', 7).getTime()
      : new DateManager(Number(weekTime)).add('day', 7).getTime();
    }
    else {
      const date = calendar.getDate();
      if (direction === 'prev' && date.getDay() === 0) {
        updateTime = new DateManager(Number(weekTime)).subtract('day', 7).getTime();
      }
      if (direction === 'next' && date.getDay() === 1) {
        updateTime = new DateManager(Number(weekTime)).add('day', 7).getTime();
      }
    }

  }
  updateTime > 0 && element.setAttribute('data-time', updateTime);
}

// core

const role = {
  instance: document.querySelector('[data-role]').getAttribute('data-role'),
  get() {
    return this.instance;
  },
  has(role, callback = false) {
    if (role === this.instance) {
      return callback !== false ? callback(role) : true;
    }
    return false;
  }
};

const getRole = (role, callback = false) => {
  if (role === document.querySelector('[data-role]').getAttribute('data-role')) {
    return callback !== false ? callback() : true;
  }
  return false;
};

class State {
  constructor() {
    this.ns = 'state';
    this.event = null;
  }
  has(state, callback = false) {
    if (state.indexOf(':') !== -1) {
      state = state.split(':').map(st=>`${this.ns}-${st}`).join(' ');
      if (this.event.classNames.join(' ') === state) {
        if (callback !== false) {
          callback(this.event, state);
        }
        else {
          return true;
        }
      }
      else {
        return false;
      }
    }
    else {
      if (this.event.classNames.some(i=>i===`${this.ns}-${state}`)) {
        if (callback !== false) {
          callback(this.event, state);
        }
        else {
          return true;
        }
      }
      else {
        return false;
      }
    }
  }
  not(state, callback = false) {
    if (state.indexOf(':') !== -1) {
      state = state.split(':').map(st=>`${this.ns}-${st}`).join(' ');
      if (this.event.classNames.join(' ') !== state) {
        if (callback !== false) {
          callback(this.event, state);
        }
        else {
          return true;
        }
      }
      else {
        return false;
      }
    }
    else {
      if (this.event.classNames.every(i=>i!==`${this.ns}-${state}`)) {
        if (callback !== false) {
          callback(this.event, state);
        }
        else {
          return true;
        }
      }
      else {
        return false;
      }
    }
  }
  set(state) {
    this.event.setProp('classNames', this.event.classNames.concat(`${this.ns}-${state}`));
  }
  remove(state) {
    this.event.setProp('classNames', this.event.classNames.filter(i=>i!==`${this.ns}-${state}`));
  }
}

window.state = new State;

// Data Object

window.cData = typeof calendarData === 'undefined' ? {
  isAuth: true,
  expert: {
    name: 'Софья Геннадьевна',
    id: 1,
    url: 'https://44a.ru',
    cost: 51,
    sale: 10
  },
  user: {
    name: 'drewsher',
    id: 107
  },
  states: {
    order: {
      next: "консультация запланирована",
      expire: "консультация закончилась",
      live: "консультация идет"
    },
    webinar: {
      next: "вебинар запланирован",
      expire: "вебинар закончился",
      live: "вебинар идет"
    }
  },
  config: { updateTime: 3000, updateForceTime: 5000 }
} : calendarData;

// helpers

const GMTDate = (date, hours) => new Date(date.getTime() - (1000 * 60 ** 2 * hours));

const mergeEvent = (calendar, currentEvent, background = false) => {
  const data = {corners:[], currentEvent:{}};
  const events = calendar.getEvents();
  const rangeEvents = events.filter(event => {
    if (event.display !== 'background') {
      const eventStart = event.start.toString();
      const eventEnd = event.end.toString();
      const currentEventStart = currentEvent.start.toString();
      const currentEventEnd = currentEvent.end.toString();
      const siblings = eventStart === currentEventEnd || eventEnd === currentEventStart;
      const sameState = event.classNames[0] === currentEvent.classNames[0];
      return siblings && sameState;
    }
  });
  if (rangeEvents.length > 0) {
    rangeEvents.forEach(event => data.corners.push(event.id));
    if (rangeEvents.length === 2) {
      rangeEvents.sort((a, b) => a.start.getTime() < b.start.getTime() ? -1 : 1);
      const start = rangeEvents[0].start;
      const end = rangeEvents[1].end;
      currentEvent.setDates(start, end);
      rangeEvents.forEach(event => event.remove());
    }
    else {
      const eventStart = rangeEvents[0].start.toString();
      const eventEnd = rangeEvents[0].end.toString();
      const currentEventStart = currentEvent.start.toString();
      const currentEventEnd = currentEvent.end.toString();
      if (currentEventStart === eventEnd) {
        currentEvent.setDates(rangeEvents[0].start, currentEvent.end);
      }
      else if (currentEventEnd === eventStart) {
        currentEvent.setDates(currentEvent.start, rangeEvents[0].end);
      }
      rangeEvents[0].remove();
    }
  }
  data.corners.push(currentEvent.id)
  data.currentEvent = currentEvent;
  return data;
};

const toggleEvents = (calendar, currentEvent, currentState) => {
  calendar.getEvents().forEach(event => {
    state.event = event;
    state.has(currentState, () => {
      if (event.id !== currentEvent.id) {
        event.remove();
      }
    });
  });
};

const timeString = (start, end) => {
  const offset = new Date((new Date().getDate() - 1)).getHours();
  start = start.getTime();
  end = end.getTime();
  const time = (new DateManager(end - start)).subtract({ hour: offset });
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const correctHour = time => {
    if (time === 1) {
      return 'час';
    }
    else if (time > 1 && time < 5) {
      return 'часа';
    }
    return 'часов';
  };
  const result = {date: {start, end}, number: (hours * 60) + minutes, string: ''};
  if (minutes === 0) {
    result.string = `${hours} ${correctHour(hours)}`;
  }
  else if (hours === 0) {
    result.string = `${minutes} минут`;
  }
  else {
    result.string = `${hours} ${correctHour(hours)} ${minutes} минут`;
  }
  return result;
}

// dates

const dayList = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const monthList = [
  'Января', 'Февраля', 'Марта', 'Апреля',
  'Мая', 'Июня', 'Июля', 'Августа',
  'Сентября', 'Октября', 'Ноября', 'Декабря'
];
const monthListShort = [
  'янв', 'фев', 'мар', 'апр',
  'май', 'июн', 'июл', 'авг',
  'сен', 'окт', 'ноя', 'дек'
];
window.dayWeek = date => dayList[date.getDay()];
window.day = date => date.getDate();
window.month = date => monthList[date.getMonth()];
window.monthShort = date => monthListShort[date.getMonth()];
window.hours = date => ('0' + date.getHours()).slice(-2);
window.minutes = date => ('0' + date.getMinutes()).slice(-2);
const dateString = (date, format = false) => {
  //const offset = new Date((new Date().getDate() - 1)).getHours();
  //date = (new DateManager(date)).subtract({ hour: offset });
  if (format !== false) {
    const data = {
      WD: 'dayWeek', D: 'day', M: 'month',
      MS: 'monthShort', h: 'hours', m: 'minutes'
    };
    for (let key in data) {
      if (format.search(key) !== -1) {
        const pattern = RegExp(`\\b${key}\\b`, 'g');
        format = format.replace(pattern, window[data[key]](date));
      }
    }
    return format;
  }
  return `${dayWeek(date)}, ${day(date)} ${month(date)}, ${hours(date)}:${minutes(date)}`;
};
const setRange = (time, target = false, get = false) => {
  return get === true ? time.string : (target.textContent = time.string);
}
const setTime = (start, end) => timeString(start, end);
const setCost = (data, time, target = false, get = false) => {
  const cost = time.number * data.cost;
  const result = parseInt(cost - (cost * (data.sale / 100)));
  return get === true ? result : (target.textContent = result);
}

const parseDate = (start, end, delay = 15) => {
  const data = [];
  for (let step = start.getTime(); step < end.getTime(); step += ((1000 * 60) * delay)) {
    data.push((new Date(step)).getTime());
  }
  return data;
};

// range

const rangeTime = (event, delay) => {
  const rangeItems = [];
  const start = event.start.getTime();
  const end = event.end.getTime();
  const iter = ((1000 * 60) * delay);
  for (let step = start; step <= end; step += iter) {
    rangeItems.push({
      date: step,
      string: dateString(new Date(step))
    });
  }
  return rangeItems;
};

const rangeTimeOrder = (events, currentEvent, delay) => {
  const rangeItems = [];
  events.forEach(event => {
    state.event = event;
    state.has('range', ev => {
      if (currentEvent.start >= ev.start && currentEvent.end <= ev.end) {
        const iter = ((1000 * 60) * delay);
        const start = ev.start.getTime();
        const end = ev.end.getTime();
        const subtract = [];
        events.forEach(evCompare => {
          state.event = evCompare;
          if (state.has('visible') || state.has('order')) {
            if (evCompare.start >= ev.start && evCompare.end <= ev.end) {
              if (evCompare.id !== currentEvent.id) {
                subtract.push({
                  start: evCompare.start.getTime(),
                  end: evCompare.end.getTime()
                });
              }
            }
          }
        });
        for (let step = start; step <= end; step += iter) {
          if (subtract.length > 0) {
            subtract.forEach(subStep => {
              if (step < subStep.start || step >= subStep.end) {
                rangeItems.push({
                  date: step,
                  string: dateString(new Date(step))
                });
              }
            });
          }
          else {
            rangeItems.push({
              date: step,
              string: dateString(new Date(step))
            });
          }
        }
      }
    });
  });
  return rangeItems;
}

const cancel = trigger => {
  triggers.get(trigger).click((ev, el, target) => {
    popover.close();
  });
}

const rangeInit = (startSelect, endSelect) => {
  const ranges = [startSelect, endSelect];
  ranges.forEach(range => {
    if (range.childElementCount !== 0) {
      while (range.firstChild) {
        range.removeChild(range.firstChild);
      }
    }
  });
}

const rangeSet = (items, startSelect, endSelect) => {
  items.forEach((item, index, items) => {
    item = `<div class="select__item" data-select="${item.date}">${item.string}</div>`;
    if (index !== items.length - 1) {
      startSelect.insertAdjacentHTML('beforeend', item);
    }
    if (index !== 0) {
      endSelect.insertAdjacentHTML('beforeend', item);
    }
  });
}

// actions

const selected = (calendar, currentEvent) => {
  calendar.unselect();
  calendar.getEvents().forEach(event => {
    state.event = event;
    if (event.id !== currentEvent.id) {
      state.has('select', () => state.remove('select'));
      state.has('visible', () => event.remove());
    }
    else {
      state.not('select', () => state.set('select'));
      currentEvent = event;
    }
  });
  state.event = currentEvent;
}

const unselect = (calendar, event) => {
  triggers.get('unselect').click(() => {
    state.has('visible', ev => ev.remove());
    state.event = event;
    state.remove('select');
    state.event = null;
    triggers.clear();
    popover.current && popover.close();
  });
}

const action = {
  expert: {
    save: "/myexpert/save-booking/",
    update: "/myexpert/update-booking/",
    remove: "/myexpert/remove-booking/",
    merge: "/myexpert/merge-booking/"
  },
  users: {
    save: "/users/save-booking/",
    orderCancel: "/users/cancel-booking/",
    webinar: "/users/join-webinar/",
    webinarCancel: "/users/cancel-webinar/"
  },
  calendar: {
    getData: `/users/get-calendar/?role=${role.get()}`
  }
};

let exception = false;

let showError = false;

for (let key in action) {
  const host = role.has('expert') ? 'https://dev.22e.ru' : 'https://dev.44a.ru';
  for (let url in action[key]) {
    if (isDev()) {
      const searchChar = action[key][url].indexOf('?') === -1 ? '?' : '&';
      const login = `${searchChar}isOpenSite=yes`;
      action[key][url] = host + action[key][url] + login;
      action[key][url] += '&dev_calendar=1'
      if (role.has('expert')) {
        action[key][url] += '&user_id=1';
      }
      else {
        action[key][url] += '&user_id=107';
      }

      if (exception === true) {
        if (url.search(/remove|cancel/gi) !== -1) {
          const search = action[key][url].indexOf('?') === -1 ? '?' : '&';
          action[key][url] += `${search}is_exception=1`;
        }
      }

      if (showError === true) {
        const search = action[key][url].indexOf('?') === -1 ? '?' : '&';
        action[key][url] += `${search}show_error=1`;
      }
    }
  }
}

if (role.has('user-expert')) {
  action.calendar.getData += `&expert_id=${cData.expert.id}`;
}

// States

// Open

const openInit = (calendar, event) => {
  return calendar.addEvent({
    start: event.start,
    end: event.end,
    classNames: 'state-open state-visible',
    id: Math.floor(Math.random() * new Date().getTime()),
    parent: event.id
  });
}

const orderInit = (calendar, eventData) => {
  const data = JSON.stringify(eventData);
  return query(`${action.users.save}`, data);
};

const orderCreate = (modal, calendar, event) => {
  const startHolder = modal.querySelector('[data-start]');
  const endHolder = modal.querySelector('[data-end]');
  const total = modal.querySelector('[data-total]');
  const range = modal.querySelector('[data-time]');
  const expert = modal.querySelector('[data-expert]');
  const date = { start: event.start, end: event.end };
  const errorElement = modal.querySelector('[data-alert]');
  const buttons = modal.querySelectorAll('[data-trigger]');

  expert.textContent = cData.expert.name;

  buttons.forEach(button => {
    if (button.hasAttribute('disabled')) {
      button.removeAttribute('disabled');
    }
    if (button.className.indexOf('state-load') !== -1) {
      button.classList.remove('state-load');
    }
  });

  if (modal.className.indexOf('state-error') !== -1) {
    modal.classList.remove('state-error');
  }

  let time = setTime(date.start, date.end);

  const startSelect = startHolder.parentElement.querySelector('.select__items');
  const endSelect = endHolder.parentElement.querySelector('.select__items');

  startHolder.textContent = dateString(date.start);
  startHolder.setAttribute('data-select-output', time.date.start);
  endHolder.textContent = dateString(date.end);
  endHolder.setAttribute('data-select-output', time.date.end);

  setRange(time, range);

  setCost(cData.expert, time, total);

  const rangeItems = rangeTimeOrder(calendar.getEvents(), event, 15);

  rangeInit(startSelect, endSelect);

  rangeSet(rangeItems, startSelect, endSelect);

  select('.select', (instance, trigger) => {
    const outputAttr = 'data-select-output';
    const selectData = Number(trigger.getAttribute('data-select'));
    instance.setAttribute(outputAttr, selectData);
    let start = new Date(Number(startHolder.getAttribute(outputAttr)));
    let end = new Date(Number(endHolder.getAttribute(outputAttr)));
    if (end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + ((1000 * 60) * 15));
      const updateDate = end.getTime();
      endHolder.setAttribute(outputAttr, updateDate);
      endHolder.textContent = dateString(new Date(updateDate));
    }
    time = setTime(start, end);
    setRange(time, range);
    setCost(cData.expert, time, total);
  });

  triggers.get('order-open:success').click((ev, el, target) => {

    el.classList.add('state-load');

    el.setAttribute('disabled', '');

    const eventData = {
      start: new Date(Number(startHolder.getAttribute('data-select-output'))),
      end: new Date(Number(endHolder.getAttribute('data-select-output'))),
      classNames: ['state-order'],
      id: Math.floor(Math.random() * (new Date()).getTime()),
      total: setCost(cData.expert, time, null, true),
      tz: getTimeZone()
    };

    const orderData = {
      open: [],
      oldOpen: null,
      order: eventData
    };

    calendar.getEvents().forEach(eachEvent => {
      state.event = eachEvent;
      state.has('range', event => {
        if (eventData.start.getTime() >= event.start.getTime() && eventData.end.getTime() <= event.end.getTime()) {

          orderData.oldOpen = event.id;

          if (!(eventData.start.getTime() === event.start.getTime() && eventData.end.getTime() === event.end.getTime())) {

            if (eventData.start.getTime() === event.start.getTime()) {
              orderData.open.push({
                start: eventData.end,
                end: event.end,
                classNames: ['state-open', 'state-range'],
                display: 'background',
                groupId: 0,
                id: Math.floor(Math.random() * (new Date).getTime())
              });
            }
            else if (eventData.end.getTime() === event.end.getTime()) {
              orderData.open.push({
                start: event.start,
                end: eventData.start,
                classNames: ['state-open', 'state-range'],
                display: 'background',
                groupId: 0,
                id: Math.floor(Math.random() * (new Date).getTime())
              });
            }
            else {
              orderData.open.push({
                start: event.start,
                end: eventData.start,
                classNames: ['state-open', 'state-range'],
                display: 'background',
                groupId: 0,
                id: Math.floor(Math.random() * (new Date).getTime())
              });
              orderData.open.push({
                start: eventData.end,
                end: event.end,
                classNames: ['state-open', 'state-range'],
                display: 'background',
                groupId: 0,
                id: Math.floor(Math.random() * (new Date).getTime())
              });
            }

          }

        }
      });
    });

    orderData.open.user = cData.user.name;

    orderInit(calendar, orderData)
      .then(data => {
        calendar.getEvents().forEach(eachEvent => {
          state.event = eachEvent;
          state.has('range', event => {
            if (eventData.start.getTime() >= event.start.getTime() && eventData.end.getTime() <= event.end.getTime()) {
              if (orderData.open.length !== 0) {
                orderData.open.forEach(event => calendar.addEvent(event));
              }
              event.remove();
            }
          });
          state.has('hidden', event => {
            if (eventData.start.getTime() >= event.start.getTime() && eventData.end.getTime() <= event.end.getTime()) {
              event.remove();
            }
          })
        });

        event.remove();
        calendar.addEvent(eventData);

        popover.open('order-open:success', modal => {
          const start = modal.querySelector('[data-start]');
          const end = modal.querySelector('[data-end]');
          const total = modal.querySelector('[data-total]');
          const range = modal.querySelector('[data-time]');
          const expert = modal.querySelector('[data-expert]');
          start.textContent = dateString(eventData.start);
          end.textContent = dateString(eventData.end);
          total.textContent = eventData.total;
          range.textContent = time.string;
          expert.textContent = cData.expert.name;
          expert.setAttribute('href', cData.expert.url);
        });

        triggers.clear();
      })
      .catch(err => {
        el.removeAttribute('disabled');
        el.classList.remove('state-load');
        modal.classList.add('state-error');
        errorElement.innerHTML = err.message;
        if (err.need_pay) {
          const linkPay = errorElement.querySelector('a');
          linkPay.href = params(linkPay.href, snapshot().params);
        }
        if (err.closed) {
          const linkPay = errorElement.querySelector('a');
          linkPay.href = params(location.href, snapshot().params);
        }
      });

  });
}

const openState = (calendar, event) => {
  triggers.show('unselect', 'order-open');
  triggers.get('order-open').click((ev, el, target) => {
    popover.open(target, modal => {
      orderCreate(modal, calendar, event);
    });
  });
}

// Order

const eventState = (ref, event, data) => {
  const now = (new Date()).getTime();
  const states = {
    next: event.start.getTime() > now,
    live: event.start.getTime() < now && event.end.getTime() > now,
    expire: event.end.getTime() < now
  };
  for (let key in states) {
    if (states[key]) {
      return { prop: key, value: data.states[ref][key] };
    }
  }
}

const refundCheck = event => {
  const date = new DateManager;
  if (date.add('day', 1) < event.start) {
    return 'full';
  }
  return 'half';
}

const refundToggle = (modal, event) => {
  const refundItems = modal.querySelectorAll('[data-refund]');
  refundItems.forEach(refund => {
    const type = refund.getAttribute('data-refund');
    if (type === refundCheck(event)) {
      refund.classList.remove('state-hidden');
    }
    else {
      refund.classList.add('state-hidden');
    }
  });
}

const orderInfo = (target, event, callback = false) => {
  popover.get(target, modal => {
    visibillityModule(eventState('order', event, cData).prop, modal);
    expireModule(event.start, modal);
    refundToggle(modal, event);
    const start = modal.querySelector('[data-start]');
    const range = modal.querySelector('[data-time]');
    const total = modal.querySelector('[data-total]');
    const status = modal.querySelector('[data-status]');
    const username = modal.querySelector('[data-username]');
    const time = setTime(event.start, event.end);
    const expert = modal.querySelector('[data-expert]');
    start.textContent = dateString(event.start);
    range.textContent = time.string;
    total.textContent = event.extendedProps.total;
    status.textContent = eventState('order', event, cData).value;
    if (expert) {
      expert.textContent = event.extendedProps.expert ? event.extendedProps.expert.name : cData.expert.name;
      if (role.has('user')) {
        expert.parentElement.setAttribute(
          'href',
          event.extendedProps.expert.url
        );
      }
    }
    else {
      username.textContent = event.extendedProps.user.name;
    }
    callback && callback(modal);
  });
}

const expireTime = (date) => {
  const eventDate = new DateManager(date);
  const now = new Date();
  return now >= eventDate;
};

const expireModule = (date, modal) => {
  const hasExpire = expireTime(date);
  const items = modal.querySelectorAll('[data-expire]');
  items.forEach(item => {
    const attr = item.getAttribute('data-expire');
    if (hasExpire.toString() === attr) {
      item.classList.add('state-active');
    }
    else {
      item.classList.remove('state-active');
    }
  });
}

const visibillityTime = (eventState) => {
  return eventState === 'next';
};

const visibillityModule = (eventState, modal) => {
  const hasVisibillity = visibillityTime(eventState);
  const items = modal.querySelectorAll('[data-visibillity]');
  items.forEach(item => {
    const attr = item.getAttribute('data-visibillity');
    if (hasVisibillity.toString() === attr) {
      item.classList.add('state-active');
    }
    else {
      item.classList.remove('state-active');
    }
  });
}

const cancelledState = (ref, event) => {

  const additionalStates = ['late', 'pass'];

  additionalStates.forEach(additionalState => {
    state.has(additionalState, (event, state) => {
      const currentState = `${ref}-${state}`;
      triggers.show('unselect', currentState);
      popover.get(currentState, modal => {
        const total = modal.querySelector('[data-total]');
        total.textContent = event.extendedProps.total;
      });
    });
  });
}

const orderCancel = (target, event) => {
  triggers.get(target).click((ev, el, target) => {
    popover.open(target, modal => {

      expireModule(event.start, modal, event);
      refundToggle(modal, event);

      const errorElement = modal.querySelector('[data-alert]');
      const buttons = modal.querySelectorAll('[data-trigger]');

      buttons.forEach(button => {
        if (button.hasAttribute('disabled')) {
          button.removeAttribute('disabled');
        }
        if (button.className.indexOf('state-load') !== -1) {
          button.classList.remove('state-load');
        }
      });

      if (modal.className.indexOf('state-error') !== -1) {
        modal.classList.remove('state-error');
      }

      triggers.get(`${target}:cancel`).click((ev, el, target) => {
        popover.close();
      });

      triggers.get(`${target}:submit`).click((ev, el, target) => {
        el.classList.add('state-load');
        const data = JSON.stringify({
          order: event.id,
          open: Math.floor(Math.random() * (new Date()).getTime())
        });
        query(action.users.orderCancel, data)
          .then(data => {
            el.setAttribute('disabled', '');
            calendar.removeAllEvents();
            calendar.refetchEvents();
            popover.open('order-cancel');
            triggers.clear();
          })
          .catch(err => {
            el.removeAttribute('disabled');
            el.classList.remove('state-load');
            modal.classList.add('state-error');
            errorElement.innerHTML = err.message;
          })
      });

    });
  })
};

const orderState = (calendar, event) => {
  if (!state.has('late') && !state.has('pass')) {
    triggers.show(
      'unselect',
      !role.has('expert') && !expireTime(event.end) ? 'order-delete' : '',
      'order-info'
    );
    !role.has('expert') && orderCancel('order-delete', event);
    orderInfo('order-info', event, modal => {
      !role.has('expert') && orderCancel('order-info', event);
    });
  }
  else {
    cancelledState('order', event);
  }
}

// Webinar

const webinarOrderCheck = event => {
  return role.has('expert')
  ? !!event.extendedProps.users.length
  : event.extendedProps.users.some(item => item.id === cData.user.id);
};

const webinarOpen = (target, event) => {

  popover.open(target, modal => {
    const start = modal.querySelector('[data-start]');
    const end = modal.querySelector('[data-end]');
    const range = modal.querySelector('[data-time]');
    const total = modal.querySelector('[data-total]');
    const expert = modal.querySelector('[data-expert]');
    const webinar = modal.querySelector('[data-webinar]');
    const status = modal.querySelector('[data-status]');
    const time = setTime(event.start, event.end);

    start.textContent = dateString(event.start);
    end.textContent = dateString(event.end);
    range.textContent = time.string;
    total.textContent = event.extendedProps.total;
    webinar.textContent = event.title;
    expert.textContent = cData.expert.name;
    status.textContent = eventState('webinar', event, cData).value;

    const errorElement = modal.querySelector('[data-alert]');
    const buttons = modal.querySelectorAll('[data-trigger]');

    buttons.forEach(button => {
      if (button.hasAttribute('disabled')) {
        button.removeAttribute('disabled');
      }
      if (button.className.indexOf('state-load') !== -1) {
        button.classList.remove('state-load');
      }
    });

    if (modal.className.indexOf('state-error') !== -1) {
      modal.classList.remove('state-error');
    }

    visibillityModule(eventState('webinar', event, cData).prop, modal);

    if (orderToggle(modal, event) === true) {
      webinarCancel(target, event);
    }
    else {
      webinarOrder(target, event);
    }

    webinarOrder(target, event);

  });
};

const webinarOrder = (target, event) => {

  triggers.get(`${target}:submit`).click((ev, el, target) => {

    el.classList.add('state-load');

    popover.get(target, modal => {
      const errorElement = modal.querySelector('[data-alert]');

      const users = event.extendedProps.users;
      const user = cData.user;
      users.push(user);
      event.setExtendedProp('users', users);

      const data = JSON.stringify({ id: event.id });

      query(action.users.webinar, data)
        .then(data => {
          el.setAttribute('disabled', '');
          state.event = event;
          state.remove('select');
          popover.close();
          triggers.clear();
          popover.open('webinar-success', modal => {
            const start = modal.querySelector('[data-start]');
            const end = modal.querySelector('[data-end]');
            const range = modal.querySelector('[data-time]');
            const total = modal.querySelector('[data-total]');
            const expert = modal.querySelector('[data-expert]');
            const time = setTime(event.start, event.end);
            start.textContent = dateString(event.start);
            end.textContent = dateString(event.end);
            range.textContent = time.string;
            total.textContent = event.extendedProps.total;
            expert.textContent = cData.expert.name;
            expert.parentElement.href = cData.expert.url;
          });
        })
        .catch(err => {
          el.removeAttribute('disabled');
          el.classList.remove('state-load');
          modal.classList.add('state-error');
          errorElement.innerHTML = err.message;
          if (err.need_pay) {
            const snapshotParams = new URLSearchParams(snapshot().search);
            const objectParams = {};
            const linkPay = errorElement.querySelector('a');
            snapshotParams.forEach((param, key) => {
              objectParams[key] = param;
            });
            linkPay.href = params(linkPay.href, objectParams);
          }
        })
        .finally(() => el.classList.remove('state-load'));
    });
  });
};

const webinarCancel = (target, event) => {
  popover[target.indexOf('info') !== -1 ? 'get' : 'open'](target, modal => {

    const errorElement = modal.querySelector('[data-alert]');
    const buttons = modal.querySelectorAll('[data-trigger]');

    buttons.forEach(button => {
      if (button.className.indexOf('state-load') !== -1) {
        button.classList.remove('state-load');
      }
    });

    if (modal.className.indexOf('state-error') !== -1) {
      modal.classList.remove('state-error');
    }

    refundToggle(modal, event);

    triggers.get(`${target}:cancel`).click((ev, el, target) => {
      popover.close();
    });

    triggers.get(`${target}:delete`).click((ev, el, target) => {

      el.classList.add('state-load');

      const data = JSON.stringify({id: event.id});

      query(action.users.webinarCancel, data)
        .then(data => {
          el.setAttribute('disabled', '');
          const userId = cData.user.id;
          const users = event.extendedProps.users;
          users.splice(users.findIndex(user => user.id === userId), 1);
          event.setExtendedProp('users', users);
          state.remove('select');
          triggers.clear();
          popover.open('webinar-cancel');
        })
        .catch(err => {
          el.removeAttribute('disabled');
          el.classList.remove('state-load');
          modal.classList.add('state-error');
          errorElement.innerHTML = err.message;
        })
    });
  });
};

const orderToggle = (modal, event) => {
  const orderItems = modal.querySelectorAll('[data-order]');
  const orderCheck = webinarOrderCheck(event);
  orderItems.forEach(order => {
    const type = order.getAttribute('data-order');
    if (type === orderCheck.toString()) {
      order.classList.add('state-active');
    }
    else {
      order.classList.remove('state-active');
    }
  });
  return orderCheck;
};

const webinarInfo = (target, event) => {
  popover.open(target, modal => {

    const start = modal.querySelector('[data-start]');
    const end = modal.querySelector('[data-end]');
    const range = modal.querySelector('[data-time]');
    const total = modal.querySelector('[data-total]');
    const expert = modal.querySelector('[data-expert]');
    const webinar = modal.querySelector('[data-webinar]');
    const status = modal.querySelector('[data-status]');
    const time = setTime(event.start, event.end);

    start.textContent = dateString(event.start);
    end.textContent = dateString(event.end);
    range.textContent = time.string;
    total.textContent = event.extendedProps.total;
    webinar.textContent = event.title;
    expert.textContent = (cData.expert || event.extendedProps.expert).name;
    if (role.has('user')) {
      expert.parentElement.href = event.extendedProps.expert.url;
    }
    status.textContent = eventState('webinar', event, cData).value;

    const errorElement = modal.querySelector('[data-alert]');
    const buttons = modal.querySelectorAll('[data-trigger]');

    buttons.forEach(button => {
      if (button.hasAttribute('disabled')) {
        button.removeAttribute('disabled');
      }
      if (button.className.indexOf('state-load') !== -1) {
        button.classList.remove('state-load');
      }
    });

    if (modal.className.indexOf('state-error') !== -1) {
      modal.classList.remove('state-error');
    }

    visibillityModule(eventState('webinar', event, cData).prop, modal);

    if (orderToggle(modal, event) === true) {
      webinarCancel(target, event);
    }
    else {
      webinarOrder(target, event);
    }
  });
};

const webinarState = (calendar, event) => {

  if (webinarOrderCheck(event) === false) {
    triggers.show('unselect', expireTime(event.start) ? '' : 'webinar-open', 'webinar-info');
  }
  else {
    triggers.show('unselect', expireTime(event.start) ? '' : 'webinar-delete', 'webinar-info');
  }

  triggers.get('webinar-open').click((ev, el, target) => {
    webinarOpen(target, event);
  });

  triggers.get('webinar-delete').click((ev, el, target) => {
    webinarCancel(target, event);
  });

  triggers.get('webinar-info').click((ev, el, target) => {
    webinarInfo(target, event);
  });
}

// Select

const hasSelectableEvents = (range, event) => {
  if (event.start.getTime() >= range.start.getTime() && event.start.getTime() < range.end.getTime()) {
    return true;
  }
  return false;
}

const selectable = (calendar, range) => {
  let rangeData = {state: false, open: false, copy: null};
  const events = calendar.getEvents();
  const isDay = range.start.getDay() === (range.end.getDay() === 0 ? 6 : range.end.getDay() - 1);
  events.forEach(event => {
    state.event = event;
    state.has('select', (ev, st) => state.remove(st));
    state.has('open', () => {
      if (hasSelectableEvents(range, event)) {
        rangeData.state = true;
        state.set('select');
        rangeData.open = true;
        rangeData.copy = isDay ? 'copy-day' : 'copy-week';
      }
    });
  });
  triggers.clear();
  if (rangeData.state === true) {
    triggers.show('unselect', rangeData.copy);
  }
  else if (range.start.getDate() === range.end.getDate()) {
    triggers.show('unselect', 'open-create', 'webinar-create')
  }
  state.event = null;
}

const unselectable = calendar => {
  const events = calendar.getEvents();
  const week = calendar.el.querySelector('.fc-week');
  const days = calendar.el.querySelectorAll('.fc-day');

  if (week.className.indexOf('state-select') !== -1) {
    week.classList.remove('state-select');
  }

  days.forEach(day => {
    if (day.className.indexOf('state-select') !== -1) {
      day.classList.remove('state-select');
    }
  });

  events.forEach(event => {
    state.event = event;
    state.has('select') && state.remove('select');
  });
  triggers.clear();
  popover.current && popover.close();
};

const unselectableHandler = (trigger, calendar) => {
  triggers.get(trigger).click((ev, el, target) => {
    calendar.unselect();
  });
};

// Open Expert

const expertOpenCreate = (trigger, event) => {
  triggers.get(trigger).click((ev, el, target) => {
    popover.open(target, modal => {
      const startHolder = modal.querySelector('[data-start]');
      const endHolder = modal.querySelector('[data-end]');
      const startSelect = startHolder.parentElement.querySelector('.select__items');
      const endSelect = endHolder.parentElement.querySelector('.select__items');
      const selectItems = modal.querySelectorAll('.select');
      const range = modal.querySelector('[data-time]');
      const rangeItems = rangeTime(event, 15);
      const errorElement = modal.querySelector('[data-alert]');
      const buttons = modal.querySelectorAll('[data-trigger]');

      buttons.forEach(button => {
        if (button.hasAttribute('disabled')) {
          button.removeAttribute('disabled');
        }
        if (button.className.indexOf('state-load') !== -1) {
          button.classList.remove('state-load');
        }
      });

      if (modal.className.indexOf('state-error') !== -1) {
        modal.classList.remove('state-error');
      }

      let time = setTime(event.start, event.end);

      startHolder.textContent = dateString(event.start);
      startHolder.setAttribute('data-select-output', time.date.start);
      endHolder.textContent = dateString(event.end);
      endHolder.setAttribute('data-select-output', time.date.end);

      range.textContent = time.string;

      rangeInit(startSelect, endSelect);
      rangeSet(rangeItems, startSelect, endSelect);

      select(selectItems, (instance, trigger) => {
        const outputAttr = 'data-select-output';
        const selectData = Number(trigger.getAttribute('data-select'));
        instance.setAttribute(outputAttr, selectData);
        let start = new Date(Number(startHolder.getAttribute(outputAttr)));
        let end = new Date(Number(endHolder.getAttribute(outputAttr)));
        if (end.getTime() <= start.getTime()) {
          end = new Date(start.getTime() + ((1000 * 60) * 15));
          const updateDate = end.getTime();
          endHolder.setAttribute(outputAttr, updateDate);
          endHolder.textContent = dateString(new Date(updateDate));
        }
        time = setTime(start, end);
        setRange(time, range);
      });

      triggers.get('open-success').click((ev, el, target) => {

        el.classList.add('state-load');

        const eventData = {
          start: new Date(Number(startHolder.getAttribute('data-select-output'))),
          end: new Date(Number(endHolder.getAttribute('data-select-output'))),
          classNames: ['state-open', 'state-range'],
          id: Math.floor(Math.random() * (new Date()).getTime()),
          tz: getTimeZone()
        }

        expertOpenInit(calendar, eventData)
          .then(data => {
            el.setAttribute('disabled', '');
            triggers.clear();
            calendar.unselect();
            calendar.addEvent(eventData);
            event = calendar.getEventById(eventData.id);
            const mergeData = mergeEvent(calendar, event);
            if (mergeData.corners.length > 1) {
              expertOpenMerge(mergeData)
                .then(data => {
                  expertOpenInfo('open-success', event, () => {
                    popover.open('open-success');
                  });
                });
            }
            else {
              expertOpenInfo('open-success', event, () => {
                popover.open('open-success');
              });
            }
          })
          .catch(err => {
            el.removeAttribute('disabled');
            el.classList.remove('state-load');
            modal.classList.add('state-error');
            errorElement.innerHTML = err.message;
            if (err.closed) {
              const linkPay = errorElement.querySelector('a');
              linkPay.href = params(location.href, snapshot().params);
            }
          });
      });
    });
  });
};

const expertOpenInit = (calendar, eventData) => {
  const data = JSON.stringify(eventData);
  return query(action.expert.save, data);
};

const expertOpenInfo = (target, event, callback = false) => {
  popover.get(target, modal => {
    const start = modal.querySelector('[data-start]');
    const end = modal.querySelector('[data-end]');
    const range = modal.querySelector('[data-time]');
    start.textContent = dateString(event.start);
    end.textContent = dateString(event.end);
    range.textContent = setTime(event.start, event.end).string;
    callback && callback(modal);
  });
}

const expertOpenCancel = (target, event) => {
  popover.get(target, modal => {

    const errorElement = modal.querySelector('[data-alert]');
    const buttons = modal.querySelectorAll('[data-trigger]');

    buttons.forEach(button => {
      if (button.hasAttribute('disabled')) {
        button.removeAttribute('disabled');
      }
      if (button.className.indexOf('state-load') !== -1) {
        button.classList.remove('state-load');
      }
    });

    if (modal.className.indexOf('state-error') !== -1) {
      modal.classList.remove('state-error');
    }

    triggers.get(`${target}:cancel`).click((ev, el, target) => {
      popover.close();
    });
    triggers.get(`${target}:submit`).click((ev, el, target) => {
      el.classList.add('state-load');
      const data = JSON.stringify({ id: event.id });
      query(action.expert.remove, data)
        .then(data => {
          el.setAttribute('disabled', '');
          event.remove();
          popover.open('open-cancel');
          triggers.clear();
        })
        .catch(err => {
          el.removeAttribute('disabled');
          el.classList.remove('state-load');
          modal.classList.add('state-error');
          errorElement.innerHTML = err.message;
          if (err.closed) {
            const linkPay = errorElement.querySelector('a');
            linkPay.href = params(location.href, snapshot().params);
          }
        })
    });
  });
}

const expertOpenState = (calendar, event) => {
  triggers.show('unselect', 'open-delete', 'open-info');
  expertOpenCancel('open-delete', event);
  expertOpenInfo('open-info', event, modal => {
    expertOpenCancel('open-info', event);
    // const errorElement = modal.querySelector('[data-alert]');
    // const buttons = modal.querySelectorAll('[data-trigger]');

    // buttons.forEach(button => {
    //  if (button.className.indexOf('state-load') !== -1) {
    //    button.classList.remove('state-load');
    //  }
    // });

    // if (modal.className.indexOf('state-error') !== -1) {
    //  modal.classList.remove('state-error');
    // }
    // triggers.get('open-info:submit').click((ev, el, target) => {
    //  el.classList.add('state-load');
    //  const data = JSON.stringify({ id: event.id });
    //  query(action.expert.remove, data)
    //    .then(data => {
    //      event.remove();
    //      popover.open('open-cancel');
    //      triggers.clear();
    //    })
    //    .catch(err => {
    //      el.classList.remove('state-load');
    //      modal.classList.add('state-error');
    //      errorElement.textContent = err.message;
    //    })
    // });
  });
}

const expertOpenUpdate = (calendar, oldEvent, updateEvent) => {
  const data = JSON.stringify({
    oldEvent: {
      start: oldEvent.start,
      end: oldEvent.end,
      id: oldEvent.id
    },
    updateEvent: {
      start: updateEvent.start,
      end: updateEvent.end,
      id: updateEvent.id
    }
  });
  query(action.expert.update, data)
    .then(data => {
      const mergeData = mergeEvent(calendar, state.event);
      if (mergeData.corners.length > 1) {
        return expertOpenMerge(mergeData);
      }
    })
    .catch(err => console.log(err.message));
}

const expertOpenMerge = mergeData => {
  const data = JSON.stringify(mergeData);
  return query(action.expert.merge, data);
}

// Webinar Expert

const expertWebinarCreate = (trigger, event) => {
  triggers.get(trigger).click((ev, el, target) => {
    popover.open(target, modal => {
      const startHolder = modal.querySelector('[data-start]');
      const endHolder = modal.querySelector('[data-end]');
      const startSelect = startHolder.parentElement.querySelector('.select__items');
      const endSelect = endHolder.parentElement.querySelector('.select__items');
      const selectItems = modal.querySelectorAll('.select');
      const range = modal.querySelector('[data-time]');
      const rangeItems = rangeTime(event, 15);
      const field = modal.querySelector('[data-field]');
      const errorElement = modal.querySelector('[data-alert]');
      const buttons = modal.querySelectorAll('[data-trigger]');
      const total = modal.querySelector('[data-total]');

      field.value = '';
      total.value = '';

      total.addEventListener('input', e => {
        const input = e.target;
        if (isNaN(+input.value) === true) {
          input.value = input.value.slice(0, -1);
        }
      });

      buttons.forEach(button => {
        if (button.hasAttribute('disabled')) {
          button.removeAttribute('disabled');
        }
        if (button.className.indexOf('state-load') !== -1) {
          button.classList.remove('state-load');
        }
      });

      if (modal.className.indexOf('state-error') !== -1) {
        modal.classList.remove('state-error');
      }

      let time = setTime(event.start, event.end);

      startHolder.textContent = dateString(event.start);
      startHolder.setAttribute('data-select-output', time.date.start);
      endHolder.textContent = dateString(event.end);
      endHolder.setAttribute('data-select-output', time.date.end);

      range.textContent = time.string;

      rangeInit(startSelect, endSelect);
      rangeSet(rangeItems, startSelect, endSelect);

      select(selectItems, (instance, trigger) => {
        const outputAttr = 'data-select-output';
        const selectData = Number(trigger.getAttribute('data-select'));
        instance.setAttribute(outputAttr, selectData);
        let start = new Date(Number(startHolder.getAttribute(outputAttr)));
        let end = new Date(Number(endHolder.getAttribute(outputAttr)));
        if (end.getTime() <= start.getTime()) {
          end = new Date(start.getTime() + ((1000 * 60) * 15));
          const updateDate = end.getTime();
          endHolder.setAttribute(outputAttr, updateDate);
          endHolder.textContent = dateString(new Date(updateDate));
        }
        time = setTime(start, end);
        setRange(time, range);
      });

      triggers.get('webinar-success').click((ev, el, target) => {
        el.classList.add('state-load');
        const eventData = {
          start: new Date(Number(startHolder.getAttribute('data-select-output'))),
          end: new Date(Number(endHolder.getAttribute('data-select-output'))),
          title: field.value,
          classNames: ['state-webinar'],
          users: [],
          total: total.value.length === 0 ? 0 : total.value,
          id: Math.floor(Math.random() * (new Date()).getTime()),
          tz: getTimeZone()
        }
        setTime(eventData.start, eventData.end).number === 15
          && eventData.classNames.push('state-short');
        expertWebinarInit(calendar, eventData)
          .then(data => {
            expertWebinarInfo('webinar-success', eventData, () => {
              el.setAttribute('disabled', '');
              triggers.clear();
              calendar.unselect();
              calendar.addEvent(eventData);
              event = calendar.getEventById(eventData.id);
              popover.open('webinar-success');
            });
          })
          .catch(err => {
            el.removeAttribute('disabled');
            el.classList.remove('state-load');
            modal.classList.add('state-error');
            errorElement.innerHTML = err.message;
            if (err.closed) {
              const linkPay = errorElement.querySelector('a');
              linkPay.href = params(location.href, snapshot().params);
            }
          });
      });
    });
  });
};

const expertWebinarInit = (calendar, eventData) => {
  const data = JSON.stringify(eventData);
  return query(action.expert.save, data);
};

const expertWebinarInfo = (target, eventData, callback = false) => {
  popover.get(target, modal => {
    const start = modal.querySelector('[data-start]');
    const end = modal.querySelector('[data-end]');
    const range = modal.querySelector('[data-time]');
    const title = modal.querySelector('[data-title]');
    const total = modal.querySelector('[data-total]');
    start.textContent = dateString(eventData.start);
    end.textContent = dateString(eventData.end);
    range.textContent = setTime(eventData.start, eventData.end).string;
    title.textContent = eventData.title;
    total.textContent = eventData.extendedProps ? eventData.extendedProps.total : eventData.total;
    callback && callback(modal);
  });
};

//

const expertWebinarCancel = (target, event) => {
  triggers.get(target).click((ev, el, target) => {
    popover.open(target, modal => {

      const errorElement = modal.querySelector('[data-alert]');
      const buttons = modal.querySelectorAll('[data-trigger]');

      buttons.forEach(button => {
        if (button.hasAttribute('disabled')) {
          button.removeAttribute('disabled');
        }
        if (button.className.indexOf('state-load') !== -1) {
          button.classList.remove('state-load');
        }
      });

      if (modal.className.indexOf('state-error') !== -1) {
        modal.classList.remove('state-error');
      }

      triggers.get(`${target}:cancel`).click((ev, el, target) => {
        popover.close();
      });

      triggers.get(`${target}:submit`).click((ev, el, target) => {
        el.classList.add('state-load');
        const data = JSON.stringify({ id: event.id });
        query(action.expert.remove, data)
          .then(data => {
            el.setAttribute('disabled', '');
            event.remove();
            popover.open('webinar-cancel');
            triggers.clear();
          })
          .catch(err => {
            el.removeAttribute('disabled');
            el.classList.remove('state-load');
            modal.classList.add('state-error');
            errorElement.innerHTML = err.message;
          })
      });
    });
  })
};

const expertWebinarUpdate = (calendar, oldEvent, updateEvent) => {
  const data = JSON.stringify({
    oldEvent: {
      start: oldEvent.start,
      end: oldEvent.end,
      id: oldEvent.id
    },
    updateEvent: {
      start: updateEvent.start,
      end: updateEvent.end,
      id: updateEvent.id
    }
  });
  query(action.expert.update, data);
};

const expertWebinarState = (calendar, event) => {
  triggers.show(
    'unselect',
    webinarOrderCheck(event) ? '' : 'webinar-delete',
    'webinar-info'
  );

  expertWebinarCancel('webinar-delete', event);

  expertWebinarInfo('webinar-info', event, (modal) => {

    const errorElement = modal.querySelector('[data-alert]');
    const buttons = modal.querySelectorAll('[data-trigger]');

    const modules = modal.querySelectorAll('[data-order]');

    modules.forEach(moduleItem => {
      const attr = moduleItem.getAttribute('data-order');
      if (attr === webinarOrderCheck(event).toString()) {
        moduleItem.classList.add('state-active');
      }
      else {
        moduleItem.classList.remove('state-active');
      }
    });

    buttons.forEach(button => {
      if (button.hasAttribute('disabled')) {
        button.removeAttribute('disabled');
      }
      if (button.className.indexOf('state-load') !== -1) {
        button.classList.remove('state-load');
      }
    });

    if (modal.className.indexOf('state-error') !== -1) {
      modal.classList.remove('state-error');
    }

    triggers.get('webinar-info:submit').click((ev, el, target) => {
      el.classList.add('state-load');
      const data = JSON.stringify({ id: event.id });
      query(action.expert.remove, data)
        .then(data => {
          el.setAttribute('disabled', '');
          event.remove();
          popover.open('webinar-cancel');
          triggers.clear();
        })
        .catch(err => {
          el.removeAttribute('disabled');
          el.classList.remove('state-load');
          modal.classList.add('state-error');
          errorElement.innerHTML = err.message;
        })
    });
  });
};

// Copy day state

const copyStates = (target, data, events) => {
  events.forEach((event) => event.remove());
  popover.open(target, modal => {
    const state = data.errorEvents ? 'warning' : 'success';
    const modules = modal.querySelectorAll('[data-state]');
    modules.forEach(module => {
      const token = module.getAttribute('data-state');
      module.classList[token === state ? 'add' : 'remove']('state-active');
      if (state === 'warning') {
        const table = modal.querySelector('.table');
        const model = modal.querySelector('[data-model]');
        while (table.lastElementChild !== model) table.lastElementChild.remove();
        data.errorEvents.forEach(event => {
          for (let prop in event) {
            event[prop] = new Date(event[prop]);
          }
          const row = model.cloneNode(true);
          const rowDate = row.querySelector('[data-date]');
          row.removeAttribute('data-model');
          rowDate.textContent = `${dateString(event.start)} — ${dateString(event.start, 'h:m')}`;
          table.appendChild(row);
        });
      }
    });
  });
};

const copyDayState = (calendar, range) => {
  triggers.get('copy-day').click((ev, el, target) => {
    popover.open(target, modal => {
      const events = calendar.getEvents();
      const start = modal.querySelector('[data-start]');
      const end = modal.querySelector('[data-end]');
      const selectTrigger = modal.querySelectorAll('.select');
      const selectItems = modal.querySelector('.select__items');
      const errorElement = modal.querySelector('[data-alert]');
      const buttons = modal.querySelectorAll('[data-trigger]');

      buttons.forEach(button => {
        if (button.hasAttribute('disabled')) {
          button.removeAttribute('disabled');
        }
        if (button.className.indexOf('state-load') !== -1) {
          button.classList.remove('state-load');
        }
      });

      if (modal.className.indexOf('state-error') !== -1) {
        modal.classList.remove('state-error');
      }

      while (selectItems.firstChild) {
        selectItems.removeChild(selectItems.firstChild);
      }

      start.textContent = dateString(range.start, 'WD, D M');
      for (let nextDay = 1; nextDay <= 28; nextDay++) {
        const nextDayDate = new DateManager(range.start).add({day: nextDay});
        const nextDayString = dateString(nextDayDate, 'WD, D M');
        if (nextDay === 1) {
          end.textContent = nextDayString;
          end.setAttribute('data-select-output', nextDay);
        }
        const nextDayElement = `
          <div class="select__item" data-select="${nextDay}">${nextDayString}</div>
        `;
        selectItems.insertAdjacentHTML('beforeend', nextDayElement);
      }
      select(selectTrigger, (instance, trigger) => {
        instance.setAttribute('data-select-output', trigger.getAttribute('data-select'));
      });
      triggers.get(`${target}:cancel`).click((ev, el, target) => {
        triggers.clear();
        calendar.unselect();
        popover.close();
      });
      triggers.get(`${target}:success`).click((ev, el, target) => {
        const eventsList = [];
        events.forEach(event => {
          state.event = event;
          if (hasSelectableEvents(range, event) === true && state.has('open')) {
            const eventData = {
              start: (new DateManager(event.start)).add({day: end.getAttribute('data-select-output')}),
              end: (new DateManager(event.end)).add({day: end.getAttribute('data-select-output')}),
              oldDate: { start: event.start, end: event.end },
              classNames: ['state-open', 'state-range'],
              id: Math.floor(Math.random() * (new Date()).getTime()),
              tz: getTimeZone()
            }
            eventsList.push(eventData);
          }
        });
        const data = JSON.stringify({type: 'copy', events: eventsList});
        query(action.expert.save, data)
          .then(data => {
            el.setAttribute('disabled', '');
            triggers.clear();
            state.remove('select');
            calendar.unselect();
            copyStates(target, data, events);
            calendar.refetchEvents();
          })
          .catch(err => {
            el.removeAttribute('disabled');
            modal.classList.add('state-error');
            errorElement.innerHTML = err.message;
          });
      });
    });
  });
};

// Copy week state

const copyWeekState = (calendar, range) => {
  triggers.get('copy-week').click((ev, el, target) => {
    popover.open(target, modal => {
      const events = calendar.getEvents();
      const start = modal.querySelector('[data-start]');
      const end = modal.querySelector('[data-end]');
      const selectTrigger = modal.querySelectorAll('.select');
      const selectItems = modal.querySelector('.select__items');
      const errorElement = modal.querySelector('[data-alert]');
      const buttons = modal.querySelectorAll('[data-trigger]');

      buttons.forEach(button => {
        if (button.hasAttribute('disabled')) {
          button.removeAttribute('disabled');
        }
        if (button.className.indexOf('state-load') !== -1) {
          button.classList.remove('state-load');
        }
      });

      if (modal.className.indexOf('state-error') !== -1) {
        modal.classList.remove('state-error');
      }

      while (selectItems.firstChild) {
        selectItems.removeChild(selectItems.firstChild);
      }

      start.textContent = `${dateString(range.start, 'D MS.')} — ${dateString(new DateManager(range.end).subtract({day: '1'}), 'D MS.')}`;
      for (let nextWeek = 1; nextWeek <= 4; nextWeek++) {
        const nextWeekDate = {
          start: new DateManager(range.start).add({day: nextWeek * 7}),
          end: new DateManager(range.end).add({day: (nextWeek * 7) - 1})
        };
        const nextWeekString = `${dateString(nextWeekDate.start, 'D MS.')} — ${dateString(nextWeekDate.end, 'D MS.')}`;
        if (nextWeek === 1) {
          end.textContent = nextWeekString;
          end.setAttribute('data-select-output', nextWeek * 7);
        }
        const nextWeekElement = `
          <div class="select__item" data-select="${nextWeek * 7}">${nextWeekString}</div>
        `;
        selectItems.insertAdjacentHTML('beforeend', nextWeekElement);
      }
      select(selectTrigger, (instance, trigger) => {
        instance.setAttribute('data-select-output', trigger.getAttribute('data-select'));
      });
      triggers.get(`${target}:cancel`).click((ev, el, target) => {
        triggers.clear();
        calendar.unselect();
        popover.close();
      });
      triggers.get(`${target}:success`).click((ev, el, target) => {
        const eventsList = [];
        events.forEach(event => {
          state.event = event;
          if (hasSelectableEvents(range, event) === true && state.has('open')) {
            const eventData = {
              start: (new DateManager(event.start)).add({day: end.getAttribute('data-select-output')}),
              end: (new DateManager(event.end)).add({day: end.getAttribute('data-select-output')}),
              oldDate: { start: event.start, end: event.end },
              classNames: ['state-open', 'state-range'],
              id: Math.floor(Math.random() * (new Date()).getTime()),
              tz: getTimeZone()
            }
            eventsList.push(eventData);
          }
        });
        const data = JSON.stringify({type: 'copy', events: eventsList});
        query(action.expert.save, data)
          .then(data => {
            el.setAttribute('disabled', '');
            triggers.clear();
            state.remove('select');
            calendar.unselect();
            copyStates(target, data, events);
          })
          .catch(err => {
            el.removeAttribute('disabled');
            modal.classList.add('state-error');
            errorElement.innerHTML = err.message;
          });
      });
    });
  });
};

const isMobile = (cb = false, width = 768) => {
  cb !== false && innerWidth <= width && cb();
  return innerWidth <= width;
};

const expandSticky = (refElement = '[data-trigger]', refEdge = 'footer') => {
  const elements = document.querySelectorAll(refElement);
  const edge = document.querySelector(refEdge);
  addEventListener('scroll', e => {
    const offset = pageYOffset + innerHeight;
    const edgeOffset = edge.offsetTop;
    elements.forEach(element => {
      if (element.parentElement.className.indexOf('toolbar') !== -1) {
        const computed = offset >= edgeOffset ? offset - edgeOffset : 0;
        element.style.transform = `translateY(-${computed}px)`;
      }
    });
  });
};

const stateMobile = (target = 'mobile:menu') => {

  const getEl = el => typeof el === 'string' ? document.querySelector(el) : el;

  const closeState = el => {
    getEl(el)
      .addEventListener('click', e => {
        triggers.clear();
        calendar.unselect();
        document.body.classList.remove('overflow-hidden');
        getEl('.overflow-calendar').classList.remove('state-active');
        getEl('.calendar').style.zIndex = 0;
      });
  }

  triggers.get(target).click((ev, el, curr) => {
    const overflow = getEl('.overflow-calendar');
    const prevTargets = triggers.prevTargets.filter(target => ['unselect', ''].indexOf(target) === -1);
    document.body.classList.add('overflow-hidden', 'state-active');
    overflow.classList.add('state-active');
    triggers.show(...prevTargets, `${target}-close`);
    getEl('.calendar').style.zIndex = 'unset';

    closeState(overflow);

    viewTooltip('.action__tooltip');

  });

  closeState(triggers.get(`${target}-close`).el);

  triggers.get(`${target}-close`).click((ev, el, curr) => {
    triggers.show(target);
  });

};

const updateCalendar = (calendar) => {

  let event = null;

  const update = async () => calendar.refetchEvents();

  const forceUpdate = async (prepare) => {
    const prepareBody = await prepare();
    await update();
    return prepareBody;
  }

  const delay = (ms, cb) => {
    return new Promise(response => {
      setTimeout(() => response(cb()), ms);
    });
  }

  const interval = setInterval(() => {
    if (!state.event || !state.has('select')) {
      calendarSuccessCallback = (content) => {
        update();
        calendar.getEvents().forEach(ev => ev.remove());
      }
    }
    else {
      (async () => {
        event = await forceUpdate(() => delay(cData.config.updateForceTime, () => state.event));
        calendarSuccessCallback = (content) => {

          state.event = event;

          calendar.getEvents().forEach((event, index, list) => {
            if (event.classNames.indexOf('state-visible') === -1) {
              event.remove();
            }
          });

          content.forEach(ev => {
            if (ev.id == event.id) {
              ev.classNames.push('state-select');
            }
          });
        };
      })();
    }
  }, cData.config.updateTime);

}

const calendarSuccessEvent = (fn) => {
  const event = document.createEvent('Event');
  event.initEvent('calendar:success');
  addEventListener('calendar:success', fn);
  dispatchEvent(event);
  removeEventListener('calendar:success', fn);
}

let calendarSuccessCallback = () => null;

const snapshot = () => {

  const calendarArea = document.querySelector('.fc-scroller.fc-scroller-liquid-absolute');

  const objectParams = {
    date: (calendar.getDate()).getTime(),
    pageY: pageYOffset,
    areaY: calendarArea.scrollTop
  };

  const snapshot = params(location.href, objectParams);

  return {
    href: location.href,
    path: location.pathname,
    params: objectParams
  };

}

const loadSnapshot = (state) => {
  if (state.search.indexOf('date') !== -1) {
    const calendar = document.querySelector('[data-route="calendar"]');
    const snapshotParams = new URLSearchParams(state.search);
    const date = new Date(Number(snapshotParams.get('date')));
    const cellHeight = !isMobile() ? 55 : 100;
    const dateOffset = date.getHours() === 0
      ? date.getHours()
      : ((date.getHours() - 1) + date.getMinutes() / 60);

    if (!isMobile()) {
      const calendarScrolledArea = calendar.querySelector('.fc-scroller-liquid-absolute');
      scroll(
        0,
        snapshotParams.get('pageY') ||
        calendar.offsetTop - 15
      );
      calendarScrolledArea.scrollTo(
        0,
        snapshotParams.get('areaY') || (cellHeight * dateOffset)
      );
    }
    else {
      const calendarArea = calendar.querySelector('.fc-scrollgrid-section-body');

      scroll(
        0,
        snapshotParams.get('pageY') ||
        (calendarArea.getBoundingClientRect().top + 1) + (cellHeight * dateOffset)
      )
    }
  }
}

const setSnapshot = (events) => {
  if (events.length) {
    const index = events.findIndex((event) => {
      return event.classNames.indexOf('state-webinar') !== -1
        || event.classNames.indexOf('state-range') !== -1;
    });
    if (index >= 0) {
      const date = new Date(events[index].start).getTime();

      loadSnapshot({ search: `date=${date}` });
    }
  }
}

const getTrigger = (target) => triggers.get(target).el.click();

const computedState = (targets) => {
  popover.open('computed', (modal) => {
    const computed = modal.querySelector('[data-computed]');

    while (computed.firstElementChild) {
      computed.firstElementChild.remove();
    }

    targets.forEach((target) => {
      const triggerNode = document.querySelector(`[data-trigger="${target}"]`);
      const triggerTitle = triggerNode.innerText;
      const triggerWrapper = document.createElement('div');
      const triggerButton = document.createElement('button');

      triggerWrapper.className = 'popover__action action';
      triggerButton.className = 'action__button button button_large';
      triggerButton.textContent = triggerTitle;
      triggerButton.addEventListener('click', getTrigger.bind(null, target));
      triggerWrapper.appendChild(triggerButton);
      computed.appendChild(triggerWrapper);
    });
  });
};

const getTriggers = (event = state.event) => {
  const node = document.querySelector(`[data-id="${event.id}"]`);
  const handler = (event) => {
    if (node.className.indexOf('state-select') !== -1) {
      const targets = triggers[!isMobile() ? 'targets' : 'prevTargets'].filter((item) => {
        return ['', 'unselect'].indexOf(item) === -1;
      });
      if (targets.length > 1) {
        setTimeout(computedState.bind(null, targets), 0);
      }
      else {
        getTrigger(targets[0]);
      }
    }
    node.removeEventListener('click', handler);
  };
  node.addEventListener('click', handler);
}

let updateEvent = null;

let rawEvents = [];

const getTimeZone = () => {
  const el = document.querySelector('[data-tz] input');
  const tz = el.getAttribute('data-tz-search');
  return tz !== 'data-tz-search' ? tz : 'local';
}

const calendarInit = element => {
  element = document.querySelector(element);
  const calendar = new FullCalendar.Calendar(element, {
    locale: 'ru',
    timeZone: getTimeZone(),
    firstDay: 1,
    height: !isMobile() ? 550 : 'auto',
    headerToolbar: false,
    dayHeaderFormat: {
      weekday: 'short',
      day: 'numeric',
      omitCommas: true
    },
    dayHeaderContent: day => dayRender(day),
    dayHeaderDidMount: day => dayRenderData(day),
    weekNumbers: role.has('expert'),
    weekText: '',
    weekNumberDidMount: data => {
      weekRenderData(calendar, data);
    },
    weekNumberContent: week => {
      weekRender(week);
    },
    slotDuration: '00:60:00',
    slotMinTime: '00:00',
    //slotMaxTime: '00:15',
    snapDuration: '00:15:00',
    scrollTime: '05:30',
    slotLabelFormat: {
      hour: 'numeric',
      minute: '2-digit'
    },
    slotLabelContent: hour => {
      return hour.text = (`0${hour.text}`).slice(-5);
    },
    //editable: role.has('expert') || role.has('user-expert'),
    editable: false,
    initialView: !isMobile() ? 'timeGridWeek' : 'timeGridDay',
    initialDate: location.search.indexOf('date') !== -1
      ? +(new URLSearchParams(location.search)).get('date')
      : new Date(),
    longPressDelay: 350,
    // events: [
    //  {
    //    start: '2021-01-29 11:00',
    //    end: '2021-01-29 11:15',
    //    classNames: ['state-open', 'state-range']
    //  }
    // ],
    events: action.calendar.getData,
    eventSourceSuccess(events) {
      setSnapshot(events);

      rawEvents = events.filter((event) => {
        return event.classNames.indexOf('state-range') !== -1
          || event.classNames.indexOf('state-webinar') !== -1;
      });
    },
    allDaySlot: false,
    eventResizableFromStart: true,
    eventConstraint: role.has('expert') ? {
      start: (new DateManager).add({day: '1'})
    } : 0,
    eventOverlap: (stillEvent, movingEvent) => {
      return stillEvent.display === 'background';
    },
    eventAllow: (dropInfo, draggedEvent) => {
      state.event = draggedEvent;
      if (role.has('expert')) {
        if (state.has('range') || (state.has('webinar') && state.event.extendedProps.users.length === 0)) {
          return true;
        }
      }
      else if (role.has('user-expert')) {
        if (state.has('visible')) {
          return true;
        }
      }
      return false
    },
    eventDidMount: info => {
      info.el.setAttribute('data-id', info.event.id);
    },
    eventClick: info => {
      state.event = info.event;

      // user-expert

      role.has('user-expert', role => {
        state.has('hidden', event => {
          event = state.event = openInit(calendar, event);
          mergeEvent(calendar, event);
          openState(calendar, event);
          selected(calendar, event);
          toggleEvents(calendar, event, 'visible');
        });
        state.has('order', event => {
          selected(calendar, event);
          orderState(calendar, event);
        });
        state.has('webinar', event => {
          selected(calendar, event);
          webinarState(calendar, event);
        });
      });

      // expert

      role.has('expert', role => {
        state.has('range', event => {
          selected(calendar, event);
          expertOpenState(calendar, event);
        });
        state.has('order', event => {
          selected(calendar, event);
          orderState(calendar, event);
        });
        state.has('webinar', event => {
          selected(calendar, event);
          expertWebinarState(calendar, event);
        });
      });

      // user

      role.has('user', role => {
        state.has('order', event => {
          selected(calendar, event);
          orderState(calendar, event);
        });
        state.has('webinar', event => {
          selected(calendar, event);
          webinarState(calendar, event);
        });
      });

      getTriggers();

      // unselect

      unselect(calendar, state.event);

      // mobile

      isMobile(() => triggers.show('mobile:menu'));
    },
    eventResize: info => {
      state.event = info.event;
      role.has('user-expert', role => {
        state.has('open', event => {
          mergeEvent(calendar, event);
          openState(calendar, event);
          selected(calendar, event);
        });
        state.has('order', event => {
          event = orderInit(calendar, event, setTime(
            event.start, event.end
          ));
          orderState(calendar, event);
          selected(calendar, event);
        });
      });
      role.has('expert', role => {
        state.has('range', event => {
          expertOpenUpdate(calendar, info.oldEvent, info.event)
          expertOpenState(calendar, state.event);
        });
        state.has('order', event => {
          selected(calendar, event);
          orderState(calendar, event);
        });
        state.has('webinar', event => {
          expertWebinarUpdate(calendar, info.oldEvent, info.event);
          expertWebinarState(calendar, state.event);
        });
      });

      // mobile

      isMobile(() => triggers.show('mobile:menu'));
    },
    eventDrop: info => {

      state.event = info.event;
      role.has('user-expert', role => {
        state.has('open', event => {
          mergeEvent(calendar, event);
          openState(calendar, event);
          selected(calendar, event);
        });
        state.has('order', event => {
          event = orderInit(calendar, event, setTime(
            event.start, event.end
          ));
          orderState(calendar, event);
          selected(calendar, event);
        });
      });
      role.has('expert', role => {
        state.has('range', event => {
          expertOpenUpdate(calendar, info.oldEvent, info.event);
          expertOpenState(calendar, state.event);
        });
        state.has('order', event => {
          selected(calendar, event);
          orderState(calendar, event);
        });
        state.has('webinar', event => {
          expertWebinarUpdate(calendar, info.oldEvent, info.event);
          expertWebinarState(calendar, state.event);
        });
      });

      //calendarSuccessCallback = null;

      // mobile

      isMobile(() => triggers.show('mobile:menu'));
    },
    selectable: role.has('expert'),
    selectOverlap: false,
    selectAllow: info => {
      if (info.start.getDay() === info.end.getDay()) {
        return true;
      }
    },
    unselectAuto: false,
    select: info => {
      selectable(calendar, info);
      unselectableHandler('unselect', calendar);
      expertOpenCreate('open-create', info);
      expertWebinarCreate('webinar-create', info);
      copyDayState(calendar, info);
      copyWeekState(calendar, info);

      // mobile

      isMobile(() => triggers.show('mobile:menu'));
    },
    unselect: info => unselectable(calendar)
  });

  calendar.currentData.currentDate = new DateManager(calendar.currentData.currentDate).subtract('hour', 3);

  viewTitle('.toolbar__title', calendar);

  viewDate('.view__date', calendar);

  viewTimezone('.tz', calendar);

  viewSize('.view__size', calendar);

  viewTooltip('.action__tooltip');

  calendar.render();

  role.has('expert', () => {
    weekDayClick('.fc th.fc-day');
    weekViewClick('.fc .fc-week');
  });

  //updateCalendar(calendar);

  // addEventListener('DOMContentLoaded', (event) => {
  //   loadSnapshot(location);
  // });

  return calendar;
}

window.calendar = calendarInit('#calendar');

isMobile(() => {
  expandSticky();
  stateMobile();
});
