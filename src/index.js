// declaration

// heplers

const isDev = (cb = false) => {
  const env = location.href.indexOf('localhost') !== -1;
  if (cb && env) cb();
  return env;
}

window.query = (url, data) => {
  return fetch(url, {
    method: 'post',
    body: data,
    credentials: isDev() ? 'omit' : 'include',
    headers: {'X-Requested-With': 'XMLHttpRequest'}
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'error') {
      throw data;
    }
    return data;
  });
};

window.params = (url, params = false) => {
  const prefix = (url) => url.indexOf('?') === -1 ? '?' : '&';
  if (isDev() && url.indexOf('isOpenSite=yes') === -1) {
    url += `${prefix(url)}isOpenSite=yes`;
  }
  for (let key in params) {
    if (url.indexOf(`${key}=`) !== -1) {
      if (params[key].length) {
        const pattern = RegExp(`${key}=[^&]+|${key}=`);
        url = url.replace(
          pattern,
          `${key}=${params[key]}`
        );
      }
      else {
        const pattern = RegExp(`.${key}=[^&]+|.${key}=`);
        url = url.replace(pattern, '');
      }
    }
    else {
      url += `${prefix(url)}${key}=${params[key]}`;
    }
  }
  return url;
}

window.dateFormat = (date, format = 'dmy', sep = '-') => {
  let result = '';
  const data = {
    y: date.getFullYear(),
    m: `${('0' + (date.getMonth() + 1)).slice(-2)}`,
    d: `${('0' + date.getDate()).slice(-2)}`
  };
  format.split('').forEach((item, index, list) => {
    if (index !== (list.length - 1)) {
      result += `${data[item]}${sep}`;
    }
    else {
      result += `${data[item]}`;
    }
  });
  return result;
};

window.windowState = () => {

  const windowStateEvent = document.createEvent('Event');
  windowStateEvent.initEvent('window-state');

  let prevState = undefined;
  let currState = { type: undefined, isActive: false, target: null };
  ['focus', 'blur', 'load'].forEach(event => {
    [window, document.body].forEach(frame => {
      frame.addEventListener(event, e => {
        if (!prevState || e.type !== prevState) {
          currState.type = event;
          currState.isActive = ['focus', 'load'].indexOf(e.type) !== -1;
          currState.target = document.activeElement;
          dispatchEvent(windowStateEvent);
        }
        prevState = e.type;
      });
    })
  });
  return {
    get() { return currState },
    has(state) { return state === currState },
    watch(callback) {
      addEventListener('window-state', () => callback(currState));
    }
  }
}

const activeTab = windowState();

activeTab.watch((state) => console.log(state));

// Theme function

const themeSet = (type = 'dark', host = '') => {
  if (location.host.indexOf('localhost') !== -1) host = './css';
  let themeLink = document.querySelector('[data-theme]');
  if (themeLink === null) {
    document.head.insertAdjacentHTML(
      'beforeend',
      `<link rel="stylesheet" href="${host}/theme-${type}.min.css" data-theme />`
    );
    themeLink = document.querySelector('[data-theme]');
  }
  themeLink.setAttribute('href', `${host}/theme-${type}.min.css`);
};

if (location.href.indexOf('localhost') !== -1) {
  themeSet('dark');
}

const themeToggle = (ref = '.theme-toggle') => {
  const element = document.querySelector(ref);
  if (element) {
    const input = element.querySelector('input');
    let counterType = 0;
    input.addEventListener('change', e => {
      if (counterType === 1) {
        themeSet('dark');
        counterType -= 1;
      }
      else if (counterType === 0) {
        themeSet('light');
        counterType += 1;
      }
    });
  }
};

themeToggle();

class Theme {
  constructor(prefix = '--') {
    this.prefix = prefix;
    this.document = document.documentElement;
    this.props = getComputedStyle(this.document);
  }
  get(prop) {
    return this.props.getPropertyValue(this.prefix + prop);
  }
  set(prop, value) {
    return this.document.style.setProperty(this.prefix + prop, value);
  }
};

window.theme = new Theme;

// Main functions

class Router {
  constructor(mode = 'location') {
    this.mode = mode;
  }
  has(route) {
    let path = this.mode === 'location'
      ? location.pathname : this.mode === 'data'
      ? document.querySelector('[data-route]') : null;
    if (path !== null) {
      path = this.mode === 'location'
        ? path.replace('/', '') : this.mode === 'data'
        ? path.getAttribute('data-route') : null;
    }
    return route === path;
  }
  get(route, callback, rel = false) {
    let path = this.mode === 'location'
      ? location.pathname : this.mode === 'data'
      ? document.querySelector('[data-route]') : null;
    if (path !== null) {
      path = this.mode === 'location'
        ? path.replace('/', '') : this.mode === 'data'
        ? path.getAttribute('data-route') : null;
      rel === 'like' ? (path.indexOf(route) !== -1 && callback(route, path))
      : (path === route && callback(route, path));
    }
  }
}

window.router = new Router('data');

class Toggle {
  static on(node) {
    node.classList.add('state-active');
    this.watchers?.()?.on(node);
  }
  static off(node) {
    node.classList.remove('state-active');
    this.watchers?.()?.off(node);
  }
  static switch(node) {
    node.classList.toggle('state-active');
    this.watchers?.()?.switch(node);
  }
  constructor(ref) {
    this.$ref = ref;
  }
  init() {
    this.$ref.addEventListener(
      'click',
      (event) => this.constructor.switch.call(this, event.currentTarget)
    );
  }
}

class ToggleList extends Toggle {
  static activeElement(node) {
    this.constructor.switch.call(this, node);
    this.watchers?.activeElement?.(node);
  }
  static prevActiveElement(node) {
    this.constructor.off.call(this, node);
    this.watchers?.prevActiveElement?.(node);
  }
  constructor(ref, activeIndex) {
    super(ref);
    this.activeIndex = activeIndex;
  }
  init() {
    this.$ref.forEach((node, index) => {
      node.addEventListener('click', (event) => {
        this.constructor.activeElement.call(this, event.target);
        if (this.activeIndex !== index) {
          if (this.activeIndex >= 0) {
            this.constructor.prevActiveElement.call(this, this.$ref[this.activeIndex]);
          }
          this.activeIndex = index;
        }
      });
    });
  }
}

class Dropdown extends ToggleList {
  constructor(ref, activeIndex = {}) {
    super(
      ref ?? document.querySelectorAll('[data-dropdown]'),
      activeIndex
    );
    this.init();
  }
  init() {
    this.$ref.forEach((node, index) => {
      const trigger = node.querySelector('[data-dropdown-trigger]');
      trigger.addEventListener('click', (event) => {
        const group = node.getAttribute('data-dropdown');
        !this.activeIndex[group] && this.activeIndex[group];
        this.constructor.activeElement.call(this, node);
        if (this.activeIndex[group] !== index) {
          if (this.activeIndex[group] >= 0) {
            this.constructor.prevActiveElement.call(
              this,
              this.$ref[this.activeIndex[group]]
            );
          }
          this.activeIndex[group] = index;
        }
      });
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-dropdown]')) {
        for (let group in this.activeIndex) {
          this.constructor.off.call(this, this.$ref[this.activeIndex[group]]);
        }
      }
    }, true);
  }
}

window.dropdown = new Dropdown;
/*
Модел это абстракция для создания новых элементов в темплейтах / в поведении - например notification  и др.
*/
class Model {
  constructor(node, ns = 'model') {
    this.ns = ns;
    this.$ref = node;
    this.$model = this.$ref.removeChild(this.$ref.firstElementChild);
  }
  render(data, mode, index, callback = false) {
    if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        this.render(data[i], mode, index + i, callback);
      }
      return;
    }
    if (
      !this.$ref.children[index]
      && (['update', 'replace'].indexOf(mode) !== -1 || this.$ref.children.length)
    ) {
      throw new Error(`Element by index (${index}) doesn't exists`);
    }
    if (mode !== 'update') {
      mode === 'append' && (index += 1);
      const node = this.template(data);
      this.$ref[mode === 'replace' ? 'replaceChild' : 'insertBefore'](
        node,
        this.$ref.children[index]
      );
    }
    if (callback || mode === 'update') {
      const $node = this.$ref.children[index];
      if (mode === 'update') {
        for (let prop in data) {
          const $key = $node.querySelector(`[data-${this.ns}-key="${prop}"]`);
          $key.innerHTML = data[prop];
        }
      }
      if (callback) {
        const $keys = $node.querySelectorAll(`[data-${this.ns}-key]`);
        const keysMap = {};
        for (let i = 0; i < $keys.length; i++) {
          const name = $keys[i].getAttribute(`data-${this.ns}-key`);
          keysMap[`$${name}`] = $keys[i];
        }
        callback({$node, keysMap, index});
      }
    }
  }
  prepend(data, index = 0, callback = false) {
    if (!this.$ref.children.length) {
      this.append.apply(this, arguments);
      return;
    }
    if (typeof index === 'function') {
      index = arguments[2];
      callback = arguments[1];
    }
    index = index === undefined ? 0 : index;
    this.render(data, 'prepend', index, callback);
  }
  append(data, index = (this.$ref.children.length - 1), callback = false) {
    if (typeof index === 'function') {
      index = arguments[2];
      callback = arguments[1];
    }
    index = index === undefined || !this.$ref.children.length
    ? (this.$ref.children.length - 1) : index;
    this.render(data, 'append', index, callback);
  }
  replace(data, index = 0, callback = false) {
    if (typeof index === 'function') {
      index = arguments[2];
      callback = arguments[1];
    }
    index = index === undefined ? 0 : index;
    this.render(data, 'replace', index, callback);
  }
  update(data, index = 0, callback = false) {
    if (typeof index === 'function') {
      index = arguments[2];
      callback = arguments[1];
    }
    index = index === undefined ? 0 : index;
    this.render(data, 'update', index, callback);
  }
  destroy(index = false) {
    if (index === false) {
      for (let i = (this.$ref.children.length - 1); i >= 0; i--) {
        this.destroy(i);
      }
      return;
    }
    this.$ref.removeChild(this.$ref.children[index]);
  }
  template(data) {
    const node = this.$model.cloneNode(true);
    node.removeAttribute(`data-${this.ns}`)
    for (let prop in data) {
      const element = node.querySelector(`[data-${this.ns}-key="${prop}"]`);
      element.innerHTML = data[prop];
    }
    return node;
  }
}

class Notification {

  constructor(ns = 'notification') {
    this.ns = ns;
    this.areas = {};
    this.init();
  }

  init() {
    const nodes = document.querySelectorAll(`[data-${this.ns}]`);
    [].slice.call(nodes).forEach(node => {
      const location = node.getAttribute(`data-${this.ns}`);
      this.areas[location] = { $node: node, model: new Model(node) };
    });
  }

  add(
    content,
    {
      area = 'alert',
      type = 'regular',
      status = 'default',
      id = false,
      send = false
    } = {}
  ) {
    const handler = (data) => {
      if (!send) {
        data.$node.setAttribute('data-id', id);
      }
      else if (area === 'list') {
        query(
          params('/users/notification-create'),
          JSON.stringify({ text: content, status, area, type, id })
        )
        .then((response) => {
          const count = this.areas.list.$node.getAttribute('data-count');
          this.areas.list.$node.setAttribute('data-count', Number(count) + 1);
          data.$node.setAttribute('data-id', response.id);
        });
      }

      data.$node.setAttribute('data-status', status);

      if (type === 'readonly' && area === 'list') {
        data.$node.removeChild(data.keysMap.$trigger);
        return;
      }

      data.keysMap.$trigger.addEventListener('click', (event) => {
        id = data.$node.getAttribute('data-id');
        this.remove(data.index, area, id);
      });
    } //индекс всегда 0. он идет из prepend в handler, а потом в remove. и поэтому удаляется криво
    //вешается callback при создании с фиксированным индексом, но он в реальности не фиксирован

    if (area === 'alert') {
      this.areas.alert.model.prepend({ content }, handler);
      if (type !== 'static') {
        this.add(content, { area: 'list', type, status, id, send });
      }
    }
    else if (area === 'list') {
      this.areas.list.model.prepend({ content }, handler);
      if (this.areas.list.$node.className.indexOf('state-empty') !== -1) {
        this.areas.list.$node.classList.remove('state-empty');
      }
    }
  }

  remove(index, area = 'alert', id = false) {
    if (!this.areas[area].model.$ref.children[index]) {
      throw new Error('Element doesn\'t exists');
    }
    if (area === 'alert') {
      this.areas.alert.model.destroy(index);
    }
    else {
      this.areas.list.model.destroy(index);
      if (id) {
        query(
          params('/users/notification-remove'),
          JSON.stringify({ id, area })
        )
        .then(() => {
          const count = this.areas.list.$node.getAttribute('data-count');
          this.areas.list.$node.setAttribute('data-count', Number(count) - 1);
        });
      }
      if (this.areas.alert.model.$ref.children[index]) {
        this.areas.alert.model.destroy(index);
      }
      if (!this.areas.list.$node.children.length) {
        this.areas.list.$node.classList.add('state-empty');
      }
    }
  }

}

window.notification = new Notification;

const notificationScroll = () => {
  const element = document.querySelector('[data-notification="alert"]');
  if (element) {
    const parent = element.parentElement;
    const parentOffset = parent.offsetTop;
    const parentHeight = parent.clientHeight;
    addEventListener('scroll', e => {
      if (pageYOffset >= (parentOffset + parentHeight)) {
        element.classList.add('state-sticky');
      }
      else {
        element.classList.remove('state-sticky');
      }
    });
  }
}

notificationScroll();

const expand = (ref = '[data-expand]', cb = false) => {

  const elements = document.querySelectorAll(ref);
  const toggleHandler = (item, list) => {
    const trigger = item.querySelector('[data-expand-trigger]');
    const target = item.querySelector('[data-expand-target]');

    const toggleState = (item, target) => {
      if (item.className.indexOf('state-expand') === -1) {
        target.style.height = 0;
        cb && cb(trigger).has();
      }
      else {
        target.style.height = `${target.scrollHeight}px`;
        cb && cb(trigger).not();
      }
    }
    toggleState(item, target);
    trigger.addEventListener('click', e => {
      e.preventDefault();
      list.forEach(itemCompare => {
        const target = itemCompare.querySelector('[data-expand-target]');
        if (item === itemCompare) {
          itemCompare.classList.toggle('state-expand');
        }
        else {
          itemCompare.classList.remove('state-expand');
        }
        toggleState(itemCompare, target);
      });

    });
  };

  addEventListener('load', (event) => {
    elements.forEach((item, index, list) => {
      toggleHandler(item, list);
    });
  });
};

const expandSpoiler = () => expand('[data-expand]', trigger => {
  return {
    has: () => (trigger.textContent = 'Читать полностью'),
    not: () => (trigger.textContent = 'Скрыть')
  }
});

const fancybox = options => $.extend($.fancybox.defaults, options);

const modals = element => {
  $(element).each((index, item) => {
    const attr = $(item).attr('data-fancybox');
    const uniq = Math.floor(Math.random() * new Date().getTime()).toString(12);
    $(item).attr('data-fancybox', `${attr}-${uniq}`);
  });
}

const photoModal = () => {
  const slider = popover.wrapper.querySelector('.popover-photo__list');
  const modalItems = popover.wrapper.querySelector('.popover__items');
  const modal = popover.wrapper.querySelector('[data-target="photo"]');
  const images = modal?.querySelectorAll('.popover-photo__image');

  popover.callbacks.onClose = (context) => {
    if (popover.current.getAttribute('data-target') === 'photo') {
      modalItems.classList.remove('popover__items_wide', 'popover__items_full');
      $(slider).slick('unslick');
    }
  }

  const imageHandler = (slide, index) => {
    const handler = (event) => {
      modalItems.classList.toggle('popover__items_full');
      $(slider).slick('unslick');
      $(slider).slick({
        initialSlide: index,
        adaptiveHeight: true
      });
      imageHandler(slide, index);
    };

    slide.onclick = handler;
  }

  const popoverHandler = (index) => {
    let $slide;

    popover.open('photo', (modal) => {
      modalItems.classList.add('popover__items_wide');
      $(slider)
        .on('init', (e, s) => {
          $slide = s.$slides[index];
        })
        .slick({
          initialSlide: index,
          adaptiveHeight: true
        })
        .on('beforeChange', (e, s, c, n) => {
          imageHandler(s.$slides[n], n);
        });
        imageHandler($slide, index);
    });
  }

  const handler = (event) => {
    if (event.target.closest('[data-trigger^="photo"]')) {
      const node = event.target.closest('[data-trigger^="photo"]');
      const index = Number(node.getAttribute('data-trigger').split(':')[1]);

      popoverHandler(index);
    }
  }

  document.addEventListener('click', handler);
}

// const photoModal = element => {
//   const collapse = (inst, current) => {
//     const caption = current.querySelector('.caption');
//     const slider = inst.$slider[0];
//     caption !== null
//       ? slider.classList.add('state-collapse')
//     : slider.classList.remove('state-collapse');
//   };
//   const setArrows = (inst, current) => {
//     const image = inst.$slides[current].querySelector('img');
//     [inst.$prevArrow, inst.$nextArrow].forEach(arrow => {
//        arrow.css({
//         top: `${image.clientHeight / 2}px`,
//         height: `${image.clientHeight}px`
//        });
//     });
//   };
//   const zoomHandler = (inst, index, slickInstance) => {
//     const modal = inst.$slider[0].closest('[id]');
//     modal.classList.toggle('state-preview');
//     slickInstance.slick('unslick');
//     slickInstance.slick({
//       slidesToShow: 1,
//       slidesToScroll: 1,
//       adaptiveHeight: true,
//       initialSlide: index,
//     });
//   }
//   $(element).each((index, item) => {
//     index = [...item.parentElement.children].indexOf(item);
//     $(item).fancybox({
//       afterLoad: e => {
//         const slickInstance = e.current.$content.find('.modal-photo__items');
//         slickInstance
//         .on('init', (e, inst) => {
//           inst.$slides.each((index, $el) => {
//             $el.onclick = () => zoomHandler(inst, index, slickInstance);
//           });
//           setArrows(inst, index);
//         })
//         .slick({
//           slidesToShow: 1,
//           slidesToScroll: 1,
//           adaptiveHeight: true,
//           initialSlide: index,
//         });
//       },
//       afterClose: e => {
//         $('.modal-photo__items').slick('unslick');
//       }
//     });
//   });
// }

const videoModal = element => {
  $(element).each((index, item) => {
    $(item).fancybox({
      afterLoad: (e, inst) => {
        const getVideo = element => {
          const data = JSON.parse(element.attr('data-video'));
          $('.modal-video__player').html(`
            <video controls="controls" poster="${data.poster}" autoplay="false">
              <source type="video/mp4" src="${data.source}">
            </video>
          `);
          $('.modal__caption .caption__header').text(data.title);
          $('.modal__caption .caption__text').text(data.text);
        }
        const setItem = element => {
          element.addClass('list__item_active')
            .siblings().removeClass('list__item_active');
        }
        getVideo(e.group[0].opts.$orig);
        setItem(e.current.$content.find('.list__item').eq(index));
        e.current.$content.find('.list__item').each((index, item) => {
          $(item).on('click', e => {
            getVideo($(e.currentTarget));
            setItem($(e.currentTarget));
          });
        });
      }
    });
  });
}

const reInitModal = modalType => {
  if (modalType === 'photo') {
    photoModal('[data-fancybox*="photo"]');
  }
  else if (modalType === 'video') {
    videoModal('[data-fancybox*="video"]');
  }
}

window.reInitModal = reInitModal;

const reInitCourses = () => {
  courseState('data-course', true);
}

window.reInitCourses = reInitCourses;

const contentLoaded = (wrapper, delay) => {
  const wrappers = document.querySelectorAll(wrapper);
  wrappers.forEach(wrapper => {
    const items = [...wrapper.children];
    const data = JSON.parse(wrapper.getAttribute('data-load'));
    const trigger = document.querySelector(`[data-loaded="${data.trigger}"]`);
    const getCorner = (data, items) => {
      return data.start + data.count < items.length
        ? data.start + data.count : items.length;
    }
    data.start = items.filter(item => item.className.indexOf('state-load') !== -1).length;
    data.end = getCorner(data, items);
    items.forEach((item, index) => {
      if (index >= data.start) {
        const step = Math.floor(((index) - data.start) / data.count);
        const number = index - (data.start + (step * data.count));
        item.style.transitionDelay = `${number * (delay / 1000)}s`;
      }
    });
    trigger.addEventListener('click', e => {
      e.preventDefault();
      for (let index = data.start; index < data.end; index++) {
        items[index].classList.remove('state-wait');
        items[index].classList.add('state-loaded');
        setTimeout(() => {
          items[index].classList.remove('state-loaded');
          items[index].classList.add('state-load');
        }, delay);
      }
      data.start += data.count;
      data.end = getCorner(data, items);
      if (data.start >= items.length) {
        trigger.classList.add('state-hidden');
      }
    });
  });
};

window.contentLoaded = contentLoaded;

// User functions

const date = element => {
  $(element).length && $(element).datepicker({
    onSelect(formattedDate, date, inst) {
      inst.hide();
    }
  });
};

const dateMask = elements => {
  document.querySelectorAll(elements).forEach(element => {
    IMask(element, {
      mask: 'dd.mm.yy',
      blocks: {
        dd: {
          mask: IMask.MaskedRange,
          from: 0,
          to: 31,
          placeholderChar: 'д'
        },
        mm: {
          mask: IMask.MaskedRange,
          from: 0,
          to: 12,
          placeholderChar: 'м'
        },
        yy: {
          mask: IMask.MaskedRange,
          from: 1950,
          to: 2010,
          placeholderChar: 'г'
        }
      },
      lazy: false
    });
  });
}

const phoneMask = elements => {
  document.querySelectorAll(elements).forEach(element => {
    IMask(element, {
      mask: '+{7}(000)000-00-00',
      prepare: (appended, masked) => {
        if (['8', '7'].indexOf(appended) !== -1 && masked._value.length === 3) {
          return '';
        }
        return appended;
      },
      lazy: false
    });
  });
}

window.select = (elements, callback = false) => {
  const className = elements;

  elements = typeof elements === 'string' ? document.querySelectorAll(elements) : elements;

  elements.forEach((element, index) => {
    element.onclick = e => {
      elements.forEach((compareElement, compareIndex) => {
        const outputs = compareElement.querySelectorAll('[data-select-output]');
        const items = compareElement.querySelectorAll('.select__item');
        if (index === compareIndex) {
          compareElement.classList.toggle('state-expand');
          $(items[0].parentElement).slideToggle();
          items.forEach(item => {
            item.onclick = e => {
              const title = item.textContent;
              outputs.forEach(output => {
                if (output.hasAttribute('type')) {
                  if (item.hasAttribute('data-option')) {
                    output.value = item.getAttribute('data-option');
                  }
                  else {
                    output.value = title;
                  }
                }
                else {
                  output.textContent = title;
                }
                output.setAttribute('data-select-output', item.getAttribute('data-option'));
                callback && callback(output, item);
              });
              compareElement.classList.add('state-selected');
            };
          });
        }
        else {
          compareElement.classList.remove('state-expand');
          $(items[0].parentElement).fadeOut();
        }
      });
    };
  });
};

const focusField = (elements = '.field__input') => {
  elements = document.querySelectorAll(elements);
  elements.forEach(element => {
    ['focus', 'blur'].forEach(event => {
      element.addEventListener(event, e => {
        e.currentTarget.parentElement.classList[
          event === 'blur' ? 'remove' : 'add'
        ]('state-focus');
      });
    });
  });
}

const codeField = (ref, nodes) => {
  const parents = document.querySelectorAll(ref);
  parents.forEach(parent => {
    const items = parent.querySelectorAll(nodes);
    items.forEach(item => {
      const state = item.getAttribute('data-state');
      if (state === 'enter' || state === 'code') {
        const action = item.getAttribute('data-action');
        const submit = item.querySelector('.button');
        const fields = item.querySelectorAll('input');
        const errorField = item.querySelector('[data-error]');

        const nextItem = item.nextElementSibling;
        const nextField = nextItem.querySelector('input');

        const customChangeEvent = document.createEvent('Event');
        const customChangeCallback = e => (nextField.value = fields[0].value);
        customChangeEvent.initEvent('change');
        nextField.addEventListener('change', customChangeCallback);

        const next = item => {
          item.classList.remove('state-active');
          nextItem.classList.add('state-active');
          nextField.dispatchEvent(customChangeEvent);
          if (parent.className.indexOf('state-error') !== -1) {
            parent.classList.remove('state-error');
          }
          if (fields.length !== 2) {
            timerFunction(
              nextItem.querySelector('[data-resend]'),
              nextItem.querySelector('[data-timer]'),
              60
            );
            nextItem.querySelectorAll('input')[1].focus();
            nextItem.querySelector('[data-text]').textContent = `${fields[0].value} `;
          }
        };
        if (state === 'code') {
          const resend = item.querySelector('[data-resend]');
          const timer = item.querySelector('[data-timer]');
          resend.addEventListener('click', e => {
            e.preventDefault();
            if (timer.textContent.length === 0) {
              item.previousElementSibling.querySelector('input').value = fields[0].value;
              item.previousElementSibling.querySelector('.button').click();
            }
          });
        }
        const query = submit => {
          submit.classList.add('state-load');
          const data = new FormData;
          data.append('field', fields[0].value);
          data.append('type', fields[0].type);
          if (fields.length === 2) {
            data.append('code', fields[1].value);
          }
          fetch(`${action}?isOpenSite=1`, { method: 'post', body: data, credentials: 'include' })
            .then(response => response.json())
            .then(data => {
              if (data.status === 'error') throw data;
              return data;
            })
            .then(data => next(item))
            .catch(error => {
              const errorField = parent.querySelector('[data-state].state-active [data-error]');
              parent.classList.add('state-error');
              errorField.innerHTML = error.message;
            })
            .finally(() => submit.classList.remove('state-load'));
        };
        fields.forEach(field => {
          field.addEventListener('keydown', e => {
            if (e.keyCode === 13) {
              e.preventDefault();
              submit.click();
            }
          });
        });
        submit.addEventListener('click', () => query(submit));
      }
    });
  });
}

// Profile add card

const userCard = (...ids) => {
  let data = {};
  ids.forEach((item, index) => {
    data[item] = { el: document.querySelector(`#${item}`) }
  });
  data['card-number'].mask = '0000 0000 0000 0000';
  data['card-expire'].mask = '00/00';
  data['card-code'].mask = '000';
  for (let key in data) {
    if (key !== 'card-holder') {
      IMask(data[key].el, {
        mask: data[key].mask,
        lazy: true
      });
    }
    data[key].el.addEventListener('input', e => {
      const field = e.target;
      if (key !== ids[ids.length - 1] && key !== 'card-holder') {
        if (key === ids[0] && field.value.length === 1) {
          detectCard(field.value[0]);
        }
        if (field.value.length === data[key].mask.length) {
          data[ids[ids.indexOf(key) + 1]].el.focus();
        }
      }
    });
  }
};

const detectCard = num => {
  let selectPlatform;
  const platforms = document.querySelectorAll('[data-platform]');
  switch (num) {
    case '5' :
      selectPlatform = 'mc';
      break;
    case '4' :
      selectPlatform = 'visa';
      break;
    case '2' :
      selectPlatform = 'mir';
  }
  platforms.forEach(platform => {
    const attr = platform.getAttribute('data-platform');
    if (attr === selectPlatform) {
      platform.classList.add('state-active');
    }
    else {
      platform.classList.remove('state-active');
    }
  });
};

const userCardSelect = (output, item) => {
  if (output.tagName !== 'INPUT') {
    if (item.getAttribute('data-option') === 'add') {
      document.querySelector('[data-view="select"]').classList.add('state-hidden');
      document.querySelector('[data-view="card"]').classList.remove('state-hidden');
    }
    else {
      detectCard(output.textContent[0]);
    }
  }
};

const editCard = target => {
  const cards = document.querySelectorAll(target);
  cards.forEach((card, index) => {
    const action = card.closest('[data-action]').getAttribute('data-action');
    const id = card.getAttribute(target.slice(1, -1));
    const handlers = card.querySelectorAll('[data-handler]');
    const errorElement = card.closest('[data-action]').querySelector('[data-error]');
    handlers.forEach(handler => {
      const type = handler.getAttribute('data-handler');
      const queryHandler = () => {
        query(action, JSON.stringify({type, id}))
          .then(data => {
            if (type === 'remove') {
              card.remove();
            }
            else if (type === 'favorite') {
              cards.forEach((cardCompare, indexCompare) => {
                const span = cardCompare.querySelectorAll('span');
                if (index === indexCompare) {
                  span[0].classList.remove('state-hidden');
                  span[1].classList.add('state-hidden');
                  cardCompare.classList.add('state-selected');
                }
                else {
                  span[0].classList.add('state-hidden');
                  span[1].classList.remove('state-hidden');
                  cardCompare.classList.remove('state-selected');
                }
              });
            }
          })
          .catch(data => {
            errorElement.textContent = data.message;
            errorElement.classList.remove('state-hidden');
          });
      }
      handler.addEventListener('click', e => {
        e.preventDefault();

        if (type === 'remove') {
          popover.open(type, modal => {
            triggers.get(`${type}:cancel`).click((ev, el, target) => {
              popover.close();
            });
            triggers.get(`${type}:submit`).click((ev, el, target) => {
              popover.close();
              queryHandler();
            });
          });
        }
        else if (type === 'favorite') {
          queryHandler();
        }
      });
    });
  });
};

// Login functions

const phoneOrMail = field => {
  if (field.value.substring(0, 2) === '+7' || field.value[0] === '8') {
    return 'phone';
  }
  else if (field.value.indexOf('@') !== -1) {
    return 'mail';
  }
  return;
}

const template = (element, literal, replace) => {
  element.innerHTML = element.innerHTML.replace(literal, replace);
}

const validatePhoneMail = (field, message, {error, errorPhone, errorMail, errorEmpty} = {}) => {
  field.value = field.value.trim();
  let messageText = '';
  if (field.value.length > 0) {
    if (field.value.substring(0, 2) === '+7' || ['7', '8'].indexOf(field.value[0]) !== -1) {
      let telValue = field.value.replace(/[+, (, ), -]/g, '');
      if (telValue.length < 11 || telValue.length > 11) {
        messageText = errorPhone;
      }
      else if (telValue.length === 12) {
        field.value = field.value.slice(0, -1);
      }
    }
    else if (field.value.indexOf('@') !== -1) {
      if (!field.value.match(/\.\w{2,10}$|\.\w{2,10}\w+$/g) || field.value.match(/^@/g)) {
        messageText = errorMail;
      }
    }
    else {
      messageText = error;
    }
  }
  else {
    messageText = errorEmpty;
  }
  message.innerText = messageText;
};

class VerifyCode {
  constructor(options = {}) {
    this.ns = options.ns || 'data-verifyCode';
    this.$instance = options.$instance || document.querySelector(`[${this.ns}]`);
    this.$fields = null;
    this.code = '';
    this.size = options.size || 5;
    this.callbacks = options.callbacks || {
      beforeRender: null,
      afterRender: null,
      afterType: null
    };
    this.classes = options.classes || {
      instance: 'code',
      fields: 'code__fields',
      field: 'code__field'
    };
    this.init();
  }
  init() {
    this.render();

    this.$fields.forEach((item, index, list) => {
      const onInput = (event) => {
        event.preventDefault();
        if (event.target.value.length >= this.size) {
          const data = event.target.value.trim().slice(0, this.size);
          this.set(data);
          this.$fields[
            data.length < this.size
              ? data.length
              : data.length - 1
          ].focus();
          this.callbacks.afterType && this.callbacks.afterType(this);
        }
      };

      const onKeyDown = (event) => {
        const node = event.target;
        const key = event.key;

        if (['c', 'v', 'x', 'Insert'].indexOf(key) !== -1 && (event.metaKey || event.ctrlKey || event.shiftKey)) {
          return;
        }

        event.preventDefault();

        if (parseInt(key) >= 0 && key !== ' ') {
          node.value = key;
          if (this.code.length <= this.size) {
            this.code = this.code.slice(0, index) + key + this.code.slice(index + 1, this.size);
          }
          if (index < list.length - 1) {
            list[index + 1].select();
          }
          this.callbacks.afterType && this.callbacks.afterType(this);
        }

        if (['ArrowLeft', 'ArrowDown'].indexOf(key) !== -1 || key === 'Tab' && event.shiftKey) {
          if (index > 0) {
            list[index - 1].select();
          }
          else {
            list[list.length - 1].select();
          }
        }

        if (['ArrowRight', 'ArrowUp'].indexOf(key) !== -1 || key === 'Tab' && !event.shiftKey) {
          if (index < list.length - 1) {
            list[index + 1].select();
          }
          else {
            list[0].select();
          }
        }

        if (key === 'Backspace') {
          if (!event.metaKey && !event.ctrlKey) {
            if (node.value.length !== 0) {
              node.value = '';
            }
            else if (index > 0) {
              list[index - 1].focus();
              list[index - 1].value = '';
            }
            this.code = this.code.slice(0, -1);
          }
          else {
            this.clear();
            list[0].focus();
          }
          this.callbacks.afterType && this.callbacks.afterType(this);
        }
      };

      const onPaste = (event) => {
        const data = event.clipboardData.getData('text');
        if (isNaN(data)) {
          event.preventDefault();
        }
      }

      item.addEventListener('input', onInput);
      item.addEventListener('keydown', onKeyDown);
      item.addEventListener('paste', onPaste);
    });
  }
  render() {
    this.callbacks.beforeRender && this.callbacks.beforeRender(this);
    if (this.$instance.className.length === 0) {
      this.$instance.className = this.classes.instance;
    }
    for (let i = 0; i < this.size; i++) {
      const item = document.createElement('input');
      i === 0 && item.setAttribute('autofocus', '');
      item.setAttribute('type', 'text');
      item.setAttribute('inputmode', 'numeric');
      item.setAttribute('autocomplete', 'one-time-code');
      item.classList.add(this.classes.field);
      this.$instance.appendChild(item);
    }
    this.$fields = [].slice.call(this.$instance.children);
    this.callbacks.afterRender && this.callbacks.afterRender(this);
  }
  set(code) {
    code.split('').forEach((char, index) => {
      if (index <= this.$fields.length - 1) {
        this.$fields[index].value = char;
      }
    });
    this.code = code;
  }
  get() {
    return this.$fields.reduce((a, c) => a + c.value, '');
  }
  clear() {
    this.$fields.forEach(field => (field.value = ''));
    this.code = '';
  }
  destroy() {
    while (this.$instance.firstElementChild) {
      this.$instance.firstElementChild.remove();
    }
  }
}

const timerFunction = (trigger, timer, time) => {
  timer.innerHTML = `( ${String('0' + time).slice(-2)}c )`;
  let seconds = time;
  trigger.parentElement.classList.add('state-resend');
  const interval = setInterval(() => {
    timer.innerHTML = `( ${String('0' + --seconds).slice(-2)}c )`
  }, 1000);
  setTimeout(() => {
    clearInterval(interval);
    trigger.parentElement.classList.remove('state-resend');
    timer.innerHTML = '';
  }, time * 1000);
  return interval;
};

const timerFn = (time, output, callback) => {
  const date = new Date(time);
  const offset = date.getTimezoneOffset() / 60;

  const toDig = (number, last = false) => {
    return `${('0'+number).slice(-2)}${last ? '' : ':'}`;
  };

  const data = {
    h: date.getHours(),
    m: date.getMinutes(),
    s: date.getSeconds(),
    r: `${toDig(this.h)}${toDig(this.m)}${toDig(this.s, !0)}`
  };

  offset ? (data.h += offset) : (data.h -= offset);

  const interval = setInterval(
    () => {

      data.s -= 1;
      if (data.s === -1) {
        data.s = 59;
        data.m -= 1;
      }
      if (data.m === -1) {
        data.m = 59;
        data.h -= 1;
      }

      data.r = `${toDig(data.h)}${toDig(data.m)}${toDig(data.s, !0)}`;

      output.textContent = data.r;

      if (data.r === '00:00:00') {
        callback(data);
        clearInterval(interval);
      }

    }, 1000
  );
}

window.rv3 = token => {
  const element = document.querySelector('[data-recap]');
  const handler = (event) => {
    event.target.value = token;
    event.target.removeEventListener('change', handler, false);
  };
  const event = document.createEvent('Event');

  event.initEvent('change', true, true);

  element.addEventListener('change', handler, false);

  element.dispatchEvent(event);
}

const login = (login, code, verify) => {
  const loginForm = document.querySelector(login);
  const recaptcha = loginForm.querySelector('[data-recap]');
  const codeForm = document.querySelector(code);
  const verifyForm = document.querySelector(verify);
  const loginContainer = loginForm.closest('.modal_fake');
  const verifyContainer = verifyForm.closest('.modal_fake');
  const _errorData = typeof errorData === 'undefined' ? {
    error: 'Некорректный формат',
    errorPhone: 'Некорректный формат телефона',
    errorMail: 'Некорректный формат почты',
    errorEmpty: 'Введите почту или телефон'
  } : errorData;

  loginForm.addEventListener('submit', e => {
    e.preventDefault();

    const field = loginForm.querySelector('[name="username"]');
    const error = loginForm.querySelector('.field__error');
    const submit = loginForm.querySelector('[type="submit"]');

    validatePhoneMail(field, error, _errorData);

    if (field.className.indexOf('state-error') !== -1) {
      grecaptcha.exectute();
    }
    else {
      grecaptcha.reset();
      recaptcha.value = '';
    }

    if (recaptcha.value.length === 0) {
      recaptcha.onchange = () => {
        const query = new XMLHttpRequest();
        const data = new FormData(loginForm);
        data.append('url', location.href);
        query.open(loginForm.method, loginForm.action);
        query.addEventListener('load', () => {
          const res = JSON.parse(query.response);
          if (res.is_success !== true) {
            field.parentElement.classList.add('state-error');
            error.innerHTML = res.error;

            if (res.type === 'isTime') {
              const timer = error.querySelector('.data-timer');

              timerFn(res.timeout, timer, (data) => {
                field.parentElement.classList.remove('state-error');
                error.textContent = '';
              });
            }
          }
          else {
            field.setAttribute('readonly', '');
            loginContainer.classList.remove('state-active');
            verifyContainer.classList.add('state-active');
            field.parentElement.classList.remove('state-error');
            const verifyText = verifyContainer.querySelector('[data-text]');
            verifyText.innerHTML = res.message;
            const back = verifyContainer.querySelector('[data-back]');
            const resend = verifyContainer.querySelector('[data-resend]');
            const timer = resend.querySelector('[data-timer]');
            const error = verifyContainer.querySelector('.code__error');
            const resendCode = form => {
              const query = new XMLHttpRequest();
              const data = new FormData;
              data.append('url', location.href);
              data.append('username', field.value);
              data.append('type', res.type);
              query.open(form.method, form.action);
              query.send(data);
            }
            const verifyCode = new VerifyCode({
              size: res.type === 'email' ? 5 : 4,
              classes: { field: 'code__item' },
              callbacks: {
                afterType: (context) => {
                  if (context.code.length === context.size) {
                    verifyQuery(context.code);
                  }
                }
              }
            });
            let interval;
            interval = timerFunction(resend, timer, 60);
            resend.addEventListener('click', e => {
              e.preventDefault();
              if (timer.innerHTML.length === 0) {
                clearInterval(interval);
                interval = timerFunction(resend, timer, 60);
                resendCode(codeForm);
              }
            });
            back.addEventListener('click', e => {
              e.preventDefault();
              grecaptcha.reset();
              clearInterval(interval);
              resend.classList.remove('state-resend');
              field.removeAttribute('readonly');
              verifyContainer.classList.remove('state-active');
              loginContainer.classList.add('state-active');
              verifyCode.destroy();
            });
            const verifyQuery = (code) => {
              resend.parentElement.classList.remove('state-resend');
              const query = new XMLHttpRequest();
              const data = new FormData;
              data.append('username', field.value);
              data.append('password', code);
              query.open(verifyForm.method, verifyForm.action);
              query.addEventListener('load', () => {
                const res = JSON.parse(query.response);
                if (res.success !== 1) {
                  error.innerHTML = res.error;
                  error.parentElement.classList.add('state-error');
                  setTimeout(() => {
                    error.parentElement.classList.remove('state-error');
                  }, 10000);
                }
                else {
                  error.parentElement.classList.remove('state-error');
                  location.reload();
                }
              });
              query.send(data);
            };
          }
        });
        query.send(data);
      }
    }
    if (error.textContent.length === 0) {
      recaptcha.click();
    }
  });
}

const search = (target, triggers) => {
  const search = document.querySelector(target);
  const action = search.getAttribute(target.slice(1, -1));
  const input = search.querySelector('input');
  const icons = search.querySelectorAll(triggers);
  const content = search.querySelector('[data-content]');
  let timeout;
  input.addEventListener('input', e => {
    if (e.target.value.length !== 0) {
      icons[0].classList.remove('state-active');
      icons[1].classList.add('state-active');
      if (e.target.value.length >= 3) {
        if (timeout !== undefined) {
          clearTimeout(timeout);
        }
        const value = e.target.value;
        timeout = setTimeout(() => {
          fetch(params(action, { query: value }))
            .then(response => response.json())
            .then(items => {
              while (content.firstElementChild) content.firstElementChild.remove();
              if (items.length !== 0) {
                items.forEach(item => {
                  const element = document.createElement('a');
                  element.classList.add('content__item');
                  element.textContent = item.title;
                  element.setAttribute('href', item.url)
                  content.appendChild(element);
                  content.classList.add('state-active');
                });
              }
              else {
                content.classList.remove('state-active');
              }
            });
        }, 1000);
      }
    }
    else {
      clearTimeout(timeout);
      icons[0].classList.add('state-active');
      icons[1].classList.remove('state-active');
      content.classList.remove('state-active');
    }
  });
  icons[1].addEventListener('click', e => {
    input.value = '';
    icons[0].classList.add('state-active');
    icons[1].classList.remove('state-active');
    while (content.firstElementChild) content.firstElementChild.remove();
    content.classList.remove('state-active');
  });
};

// libraries

class Popover {
  constructor(wrapper) {
    this.wrapper = document.querySelector(wrapper);
    this.data = {
      wrapper: 'data-popover',
      targets: 'data-target',
      triggers: 'data-trigger',
      close: 'data-close',
      query: 'popover',
      overflow: 'overflow-popover'
    };
    this.query = null;
    this.targets = null;
    this.triggers = null;
    this.overflow = null;
    this.current = null;
    this.callbacks = {};
    this.wrapper && this.init();
  }
  init() {
    this.query = new URLSearchParams(location.search).get(this.data.query);
    this.targets = this.wrapper.querySelectorAll(`[${this.data.targets}]`);
    this.triggers = document.querySelectorAll(`[${this.data.triggers}]`);

    this.triggers.forEach(trigger => {
      const target = trigger.getAttribute(this.data.triggers);
      if (target !== this.data.triggers) {
        trigger.onclick = () => this.open(target);
      }
    });

    this.overflow = document.querySelector(`.${this.data.overflow}`);

    this.query !== null && this.open(this.query);

    this.wrapper.addEventListener('click', e => {
      if (e.target.hasAttribute(this.data.wrapper) || e.target.closest(`[${this.data.close}]`)) {
        this.close();
        if (this.callbacks?.onClose) {
          this.callbacks.onClose(this);
        }
      }
    });

    // addEventListener('keyup', e => {
    //  if (this.wrapper.className.indexOf('state-open') !== -1) {
    //    e.code === 'Escape' && this.close();
    //  }
    // });
  }
  get(currentTarget, callback = false) {
    this.targets.forEach(target => {
      if (target.getAttribute(this.data.targets) === currentTarget) {
        this.current = target;
      }
    });
    return callback ? callback(this.current) : this.current;
  }
  open(currentTarget, callback = false) {
    if (this.overflow && innerWidth <= 768) this.overflow.classList.add('state-active');
    this.wrapper.classList.add('state-open');
    this.targets.forEach(target => {
      if (target.getAttribute(this.data.targets) === currentTarget) {
        this.current = target;
        if (this.current.className.indexOf('state-active') === -1) {
          this.current.classList.add('state-active');
          callback && callback(this.current);
        }
        else {
          this.close();
        }
      }
      else {
        target.classList.remove('state-active');
      }
    });
  }
  close() {
    if (this.overflow && innerWidth <= 768) {
      this.overflow.classList.remove('state-active');
      if (triggers.targets.length === 0) {
        const overflowCalendar = document.querySelector('.overflow-calendar');
        if (overflowCalendar !== null) {
          [overflowCalendar, document.body].forEach(el => {
            el.classList.remove('state-active');
          })
        }
      }
    };
    this.wrapper.classList.remove('state-open');
    this.current.classList.remove('state-active');
  }
}

class Triggers {
  constructor() {
    this.triggers = document.querySelectorAll('[data-trigger]');
    this.targets = null;
    this.prevTargets = null;
    this.current = null;
  }
  show(...targets) {
    this.clear();
    targets.forEach((target, index) => {
      const trigger = this.get(target).el;
      trigger.classList.add('state-active');
      trigger.style.order = (index + 1);
    });
    this.targets = targets;
  }
  clear() {
    const prevTargets = this.targets;
    if (prevTargets && prevTargets.length) {
      this.prevTargets = prevTargets[0].indexOf('mobile') === -1
        ? prevTargets
        : this.prevTargets;
    }
    this.targets = [];
    this.triggers.forEach(trigger => {
      trigger.style.order = 0;
      trigger.classList.remove('state-active');
    });
  }
  get(target) {
    this.triggers.forEach(trigger => {
      if (trigger.getAttribute('data-trigger') === target) {
        this.current = trigger;
      }
    });
    return {
      el: this.current,
      target: target,
      click: callback => {
        this.current.onclick = event => {
          if (!event.target.hasAttribute('disabled')) {
            if (router.has('calendar')) {
              if ((cData || calendarData).isAuth) {
                callback(event, event.target, target);
              }
              else {
                popover.open('unauth');
              }
            }
            else {
              callback(event, event.target, target);
            }
          }
        }
      }
    };
  }
}

window.popover = new Popover('.popover');
window.triggers = new Triggers;

class ManageList {
  constructor({ ns = '.manage', type = 'documents' } = {}) {
    this.ns = ns;
    this.type = type;
    this.items = [...document.querySelectorAll(this.ns)].filter(i=>i.className.indexOf(this.ns.slice(1)+'_static')===-1);
  }
  remove(url, target, cb = false) {
    popover.open(target, modal => {
      triggers.get(`${target}:cancel`).click((ev, el, target) => {
        popover.close();
      });
      triggers.get(`${target}:submit`).click((ev, el, target) => {
        popover.close();
        cb && cb(url);
      });
    });
  }
  setPositions(list) {
    const data = [];
    [...list.children].forEach((item) => {
      data.push({
        id: item.id,
        position: item.getAttribute('data-sort')
      })
    });
    return data;
  }
  setSort(list) {
    [...list.children].forEach((item, index) => {
      item.setAttribute('data-sort', index)
    });
  }
  setOrders(list, refOrder = '[data-order]') {
    [...list.children].forEach((child, index) => {
      const number = Number(child.getAttribute('data-sort'));
      const orders = child.querySelectorAll(refOrder);
      orders.forEach(order => {
        const type = order.getAttribute('data-order');
        if (number === 0 && type === 'up' || number === (list.children.length - 1) && type === 'down') {
          order.classList.remove('state-active');
        }
        else {
          order.classList.add('state-active');
        }

        if (order.className.indexOf('state-active') !== -1) {
          this.orderHandler(list, index, order, type);
        }

      });
    });
  }
  hide(actions, list) {
    if (list.children.length === 0) {
      [actions, list].forEach(item => item.classList.remove('state-active'));
    }
  }
  swap(a, b) {
    const temp = a.getAttribute('data-sort');
    a.setAttribute('data-sort', b.getAttribute('data-sort'));
    b.setAttribute('data-sort', temp);
  }
  orderHandler(list, index, order, type) {
    order.onclick = e => {
      const action = order.getAttribute('data-url');
      if (type === 'up') {
        this.swap(list.children[index], list.children[index - 1]);
      }
      else if (type === 'down') {
        this.swap(list.children[index], list.children[index + 1]);
      }
      [...list.children]
        .sort((a, b) => +a.getAttribute('data-sort') < b.getAttribute('data-sort') ? -1 : 1)
        .forEach(item => item.parentElement.appendChild(item));
      this.setSort(list);
      this.setOrders(list);
      query(action, JSON.stringify(this.setPositions(list)));
    };
  }
}

class ManageItems extends ManageList {
  constructor({ ns = '.manage', type = 'documents' } = {}) {
    super({ ns, type });
    this.init();
  }
  template(ref, data) {
    for (let key in data) {
      const bindItems = ref.querySelectorAll(`[data-${key}]`);
      bindItems.forEach(bind => {
        const attr = bind.getAttribute(`data-${key}`);
        bind.setAttribute(key, attr.replace(`$${key}`, data[key]));
        bind.removeAttribute(`data-${key}`);
      });
    }
  }
  uploadState(items, list, element, remove, actions) {
    const add = element.querySelector('[data-add]');
    items.forEach(item => {
      const triggers = item.querySelectorAll('[data-action]');
      triggers.forEach(trigger => {
        const type = trigger.getAttribute('data-action');
        trigger.onclick = e => {
          e.preventDefault();
          if (type === 'change') {
            if (!item.id) {
              item.remove();
              add.click();
            }
            else {
              item.querySelector('[type="file"]').click();
            }
          }
          else if (type === 'remove') {
            const removeUrl = trigger.getAttribute('data-url');
            this.remove(removeUrl, 'remove-file', () => {
              item.remove();
              const checkboxes = [...element.querySelectorAll('[type="checkbox"]')];
              if (checkboxes[0].checked === true && checkboxes.filter(i=>i.checked).length === 1 || checkboxes.filter(i=>i.checked).length === 0) {
                checkboxes[0].checked = false;
                remove.classList.remove('state-active');
              }
              this.setSort(list);
              this.hide(actions, list);
              this.setOrders(list);
              query(removeUrl, JSON.stringify({removed: [item.id], positions: this.setPositions(list)}));
              if ([].slice.call(list.children).length < +element.getAttribute('data-limit')) {
                add.removeAttribute('disabled');
              }
            });
          }
        };
      });
    });
  }
  init() {
    this.items.forEach(element => {
      const actions = element.querySelector(`${this.ns}__actions`);
      const list = element.querySelector(`${this.ns}__list`);
      const items = [...list.children];
      const selectAll = element.querySelector('[data-select-all] input');
      const remove = element.querySelector('[data-remove]');
      const add = element.querySelector('[data-add]');
      const file = element.querySelector('[data-upload]');
      const modelContainer = element.querySelector('[data-model]');
      const model = modelContainer?.cloneNode(true);
      model && modelContainer.remove();

      document.addEventListener('change', e => {
        if (e.target.type === 'checkbox' && e.target.closest(this.ns) === element) {
          const parent = e.target.closest(this.ns);
          const checkboxes = [...parent.querySelectorAll('[type="checkbox"]')];
          const hasChecked = () => checkboxes.some(item => item.checked === true);
          if (e.target === checkboxes[0]) {
            checkboxes.forEach(checkbox => {
              if (checkbox !== e.target) {
                checkbox.checked = e.target.checked;
              }
            });
          }
          else {
            const checkedCount = checkboxes.filter(i=>i.checked).length;
            if (checkboxes[0].checked === true) {
              if (checkboxes.length !== checkedCount) {
                checkboxes[0].checked = false;
              }
            }
            else if (checkedCount === (checkboxes.length -1)) {
              checkboxes[0].checked = true;
            }
          }

          if (hasChecked() === true) {
            remove.classList.add('state-active');
          }
          else {
            remove.classList.remove('state-active');
          }
        }
      });

      this.setSort(list);

      this.setOrders(list);

      if (this.type === 'documents') {
        remove.addEventListener('click', e => {
          e.preventDefault();
          let removeUrl = remove.getAttribute('data-url');
          const removeItems = [];
          [...list.children].forEach((item, index) => {
            const checkbox = item.querySelector('[type="checkbox"]');
            if (checkbox.checked === true) {
              removeItems.push(item);
            }
          });
          this.remove(removeUrl, 'remove-lessons', () => {
            const removed = removeItems.map(i=>i.id);
            removeItems.forEach(item => item.remove());
            this.hide(actions, list);
            remove.classList.remove('state-active');
            this.setSort(list);
            this.setOrders(list);
            query(removeUrl, JSON.stringify({removed, positions: this.setPositions(list)}));
          });
        });

        items.forEach((item) => {
          const remove = item.querySelector('[data-action="remove"]');
          remove.addEventListener('click', (event) => {
            event.preventDefault();
            const removeUrl = remove.getAttribute('data-url');
            this.remove(removeUrl, 'remove-lesson', () => {
              item.remove();
              const checkboxes = [...element.querySelectorAll('[type="checkbox"]')];
              if (checkboxes[0].checked === true && checkboxes.filter(i=>i.checked).length === 1 || checkboxes.filter(i=>i.checked).length === 0) {
                checkboxes[0].checked = false;
                remove.classList.remove('state-active');
              }
              this.setSort(list);
              this.hide(actions, list);
              this.setOrders(list);
              query(removeUrl, {positions: this.setPositions(list)});
            });
          });
        });
      }
      else {
        if(remove) {
          remove.addEventListener('click', e => {
            e.preventDefault();
            let removeUrl = remove.getAttribute('data-url');
            const removeItems = [];
            [...list.children].forEach((item, index) => {
              const checkbox = item.querySelector('[type="checkbox"]');
              if (checkbox.checked === true) {
                removeItems.push(item);
              }
            });
            this.remove(removeUrl, 'remove-files', () => {
              const removed = removeItems.map(i => i.id);
              removeItems.forEach(item => item.remove());
              this.hide(actions, list);
              remove.classList.remove('state-active');
              this.setSort(list);
              this.setOrders(list);
              query(removeUrl, JSON.stringify({removed, positions: this.setPositions(list)}));
              if ([].slice.call(list.children).length < +element.getAttribute('data-limit')) {
                add.removeAttribute('disabled', '');
              }
            });
          });

          this.uploadState([...list.children], list, element, remove, actions);
        }
        if(add) {
          add.addEventListener('click', e => {
            if (!add.hasAttribute('disabled')) {
              file.value = null;
              file.click();
            }
          });

        file.addEventListener('change', e => {

          if ([].slice.call(list.children).length + 1 === +element.getAttribute('data-limit')) {
            add.setAttribute('disabled', '');
          }

          [...file.files].forEach((item, index) => {

            const fileInstance = model.cloneNode(true);

            fileInstance.removeAttribute('data-model');

            list.appendChild(fileInstance);

            const appendElement = list.lastElementChild;

            const image = appendElement.querySelector('.file__image');

            fileLoading(file, image, index).then(data => {
              if (data) {
                this.template(appendElement, { name: data.id, src: data.source });
                appendElement.setAttribute('id', data.id);
              }
              appendElement.setAttribute('data-sort', [...list.children].indexOf(appendElement));
              this.setOrders(list);
              this.uploadState([...list.children], list, element, remove, actions);
            });

            });
            list.classList.add('state-active');
            selectAll.checked = false;
            actions.classList.add('state-active');
          });
        }
      }

    });
  }
}

const fileQuery = (url, data = null) => {
  //return fetch(url, {method: 'post', body: data ? JSON.stringify(data) : data})
  return fetch(url, {method: 'post', body: data ? JSON.stringify(data) : data, credentials: 'include'})
    .then(response => response.json())
    .then(data => {
      if (data.status === 'error') throw data.message;
      return data;
    });
};

const fileRemove = (url, target, cb = false) => {
  popover.open(target, modal => {
    triggers.get(`${target}:cancel`).click((ev, el, target) => {
      popover.close();
    });
    triggers.get(`${target}:submit`).click((ev, el, target) => {
      popover.close();
      cb && cb(url);
    });
  });
};

const fileLoading = (file, container, index = 0) => {
  const data = new FormData;
  if (container.closest('.file') && container.closest('.file').id) {
    data.append('id', file.closest('.file').id);
  }
  if (container.closest('.files')) {
    const list = container.closest('.file').parentElement;
    data.append('position', list.children.length - 1);
  }
  data.append('file', file.files[index]);
  data.append('type', file.getAttribute('data-type'));

  const action = file.getAttribute('data-url');
  const parent = container.closest('.file');
  const errorElement = parent.querySelector('[data-error]');

  container.classList.add('state-load');
  parent.classList.remove('state-error');
  container.classList.remove('state-error');

  return query(action, data)
    .then(data => {
      container.closest('.file').id = data.id;
      const fieldId = container.closest('.file').querySelector('[type="hidden"]');
      if (fieldId) {
        fieldId.value = data.id;
      }
      parent.classList.remove('state-error');
      container.classList.remove('state-error');
      if (file.id === 'avatar') {
        avatarChange(file, '[data-avatar]');
      }
      return data;
    })
    .catch(error => {
      errorElement.children[0].textContent = error.message;
      parent.classList.add('state-error');
      container.classList.add('state-error');
    })
    .finally(() => container.classList.remove('state-load'));
};

const uploadFile = (ref = '.file', callback = false) => {
  const elements = document.querySelectorAll(ref);
  elements.forEach(element => {
    if (element.className.indexOf(`${ref.slice(1)}_static`) === -1) {
      const file = element.querySelector('[type="file"]');
      const fileName = file.parentElement.querySelector('[data-action]');
      const field = element.querySelector(`${ref}__field`);
      const image = element.querySelector(`${ref}__image`);
      const source = element.querySelector(`${ref}__source`);
      const cover = element.querySelector(`${ref}__cover`);
      const actions = element.querySelectorAll('[data-action]');
      const option = element.getAttribute('data-option');

      const customChangeEvent = document.createEvent('Event');
      const customChangeCallback = e => {
        e.target.value = file.files[0] ? file.files[0].name : null;
      };

      customChangeEvent.initEvent('change');

      fileName && fileName.addEventListener('change', customChangeCallback);

      const swap = (...items) => {
        items.forEach(item => {
          if (item.className.indexOf('state-active') !== -1) {
            item.classList.remove('state-active');
          }
          else {
            item.classList.add('state-active');
          }
        });
      };
      let uploadFire = false;
      actions.forEach(action => {
        const type = action.getAttribute('data-action');
        action.onclick = e => {
          e.preventDefault();
          if (!callback) {
            if (option !== 'static') {
              file.value = '';
            }
            if (type === 'upload' || type === 'change') {
              uploadFire = true;
              file.click();
            }
            else {
              // remove state
              let url = e.currentTarget.getAttribute('data-url');
              const id = e.currentTarget.closest('[id]').id;
              url += url.indexOf('?') === -1 ? '?' : '&';
              url += `id=${id}`;
              fileRemove(url, 'remove-file', action => {
                element.removeAttribute('id');
                element.classList.remove('state-error');
                image.classList.remove('state-error');
                swap(field, image);
                query(action);
                fileName && fileName.dispatchEvent(customChangeEvent);
              });
            }

            if (type === 'change' || type === 'remove') {
              uploadFire = false;
            }
          }
          else {
            callback(element, type, action);
          }
        }
      });
      file.addEventListener('change', e => {
        if (option !== 'static') {
          fileLoading(file, image).then(data => {
            console.log(data);
            if (data) {
              const img = document.createElement('img');
              img.setAttribute('src', data.source);
              source.lastElementChild.remove();
              source.appendChild(img.cloneNode());
              while (cover.firstElementChild) cover.firstElementChild.remove();
              cover.appendChild(img);
              if (uploadFire === true) {
                swap(field, image);
              }
            }
          });
        }

        /*fileName && fileName.dispatchEvent(customChangeEvent);

        const reader = new FileReader();
        reader.readAsDataURL(file.files[0]);
        reader.addEventListener('load', () => {
          const img = document.createElement('img');
          img.setAttribute('src', reader.result);
          source.lastElementChild.remove();
          source.appendChild(img.cloneNode());
          while (cover.firstElementChild) cover.firstElementChild.remove();
          cover.appendChild(img);
          if (uploadFire === true) {
            swap(field, image);
          }
        });*/
      });
    }
  });
};

const avatarChange = (file, images) => {
  images = document.querySelectorAll(images);
  const reader = new FileReader();
  reader.readAsDataURL(file.files[0]);
  reader.addEventListener('load', () => {
    const img = document.createElement('img');
    img.setAttribute('src', reader.result);
    images.forEach((image) => {
      if (!image.closest('.file')) {
        image.lastElementChild.remove();
        image.appendChild(img.cloneNode());
      }
    })
  });
}

// const manageFiles = (ref = '.files', refChild = '.file') => {
//   const elements = document.querySelectorAll(ref);

//   //const query = fileQuery;

//   const setPositions = list => {
//     const data = [];
//     [...list.children].forEach(item => data.push({id: item.id, position: item.getAttribute('data-sort')}));
//     return data;
//   };

//   const removeState = fileRemove;

//   const orderHandler = (list, index, order, type) => {
//     const swap = (a, b) => {
//       const temp = a.getAttribute('data-sort');
//       a.setAttribute('data-sort', b.getAttribute('data-sort'));
//       b.setAttribute('data-sort', temp);
//     };
//     order.onclick = e => {
//       const action = order.getAttribute('data-url');
//       if (type === 'up') {
//         swap(list.children[index], list.children[index - 1]);
//       }
//       else if (type === 'down') {
//         swap(list.children[index], list.children[index + 1]);
//       }
//       [...list.children]
//         .sort((a, b) => +a.getAttribute('data-sort') < b.getAttribute('data-sort') ? -1 : 1)
//         .forEach(item => item.parentElement.appendChild(item));
//       setSort(list);
//       setOrders(list);
//       query(action, JSON.stringify(setPositions(list)));
//     };
//   };

//   const setSort = list => [...list.children].forEach((item, index) => item.setAttribute('data-sort', index));

//   const setOrders = (list, refOrder = '[data-order]') => {
//     [...list.children].forEach((child, index) => {
//       const number = Number(child.getAttribute('data-sort'));
//       const orders = child.querySelectorAll(refOrder);
//       orders.forEach(order => {
//         const type = order.getAttribute('data-order');
//         if (number === 0 && type === 'up' || number === (list.children.length - 1) && type === 'down') {
//           order.classList.remove('state-active');
//         }
//         else {
//           order.classList.add('state-active');
//         }

//         if (order.className.indexOf('state-active') !== -1) {
//           orderHandler(list, index, order, type);
//         }

//       });
//     });
//   };

//   const hide = (actions, list) => {
//     if (list.children.length === 0) {
//       [actions, list].forEach(item => item.classList.remove('state-active'));
//     }
//   };

//   elements.forEach(element => {
//     const actions = element.querySelector(`${ref}__actions`);
//     const list = element.querySelector(`${ref}__list`);
//     const items = [...list.children];
//     const selectAll = element.querySelector('[data-select-all] input');
//     const remove = element.querySelector('[data-remove]');
//     const add = element.querySelector('[data-add]');
//     const file = element.querySelector('[data-upload]');
//     const modelContainer = element.querySelector('[data-model]');
//     const model = modelContainer.cloneNode(true);
//     modelContainer.remove();

//     document.addEventListener('change', e => {
//       if (e.target.type === 'checkbox' && e.target.closest(ref) === element) {
//         const parent = e.target.closest(ref);
//         const checkboxes = [...parent.querySelectorAll('[type="checkbox"]')];
//         const hasChecked = () => checkboxes.some(item => item.checked === true);
//         if (e.target === checkboxes[0]) {
//           checkboxes.forEach(checkbox => {
//             if (checkbox !== e.target) {
//               checkbox.checked = e.target.checked;
//             }
//           });
//         }
//         else {
//           const checkedCount = checkboxes.filter(i=>i.checked).length;
//           if (checkboxes[0].checked === true) {
//             if (checkboxes.length !== checkedCount) {
//               checkboxes[0].checked = false;
//             }
//           }
//           else if (checkedCount === (checkboxes.length -1)) {
//             checkboxes[0].checked = true;
//           }
//         }

//         if (hasChecked() === true) {
//           remove.classList.add('state-active');
//         }
//         else {
//           remove.classList.remove('state-active');
//         }
//       }
//     });

//     remove.addEventListener('click', e => {
//       e.preventDefault();
//       let removeUrl = remove.getAttribute('data-url');
//       const removeItems = [];
//       [...list.children].forEach((item, index) => {
//         const checkbox = item.querySelector('[type="checkbox"]');
//         if (checkbox.checked === true) {
//           removeItems.push(item);
//         }
//       });
//       removeState(removeUrl, 'remove-files', () => {
//         const removed = removeItems.map(i=>i.id);
//         removeItems.forEach(item => item.remove());
//         hide(actions, list);
//         remove.classList.remove('state-active');
//         setSort(list);
//         setOrders(list);
//         query(removeUrl, JSON.stringify({removed, positions: setPositions(list)}));
//       });
//     });

//     add.addEventListener('click', e => {
//       file.value = null;
//       file.click();
//     });

//     const template = (ref, data) => {
//       for (let key in data) {
//         const bindItems = ref.querySelectorAll(`[data-${key}]`);
//         bindItems.forEach(bind => {
//           const attr = bind.getAttribute(`data-${key}`);
//           bind.setAttribute(key, attr.replace(`$${key}`, data[key]));
//           bind.removeAttribute(`data-${key}`);
//         });
//       }
//     };

//     const uploadState = (items, list) => {
//       items.forEach(item => {
//         const triggers = item.querySelectorAll('[data-action]');
//         triggers.forEach(trigger => {
//           const type = trigger.getAttribute('data-action');
//           trigger.onclick = e => {
//             if (type === 'change') {
//               item.querySelector('[type="file"]').click();
//             }
//             else if (type === 'remove') {
//               const removeUrl = trigger.getAttribute('data-url');
//               removeState(removeUrl, 'remove-file', () => {
//                 item.remove();
//                 const checkboxes = [...element.querySelectorAll('[type="checkbox"]')];
//                 if (checkboxes[0].checked === true && checkboxes.filter(i=>i.checked).length === 1 || checkboxes.filter(i=>i.checked).length === 0) {
//                   checkboxes[0].checked = false;
//                   remove.classList.remove('state-active');
//                 }
//                 setSort(list);
//                 hide(actions, list);
//                 setOrders(list);
//                 query(removeUrl, JSON.stringify({removed: [item.id], positions: setPositions(list)}));
//               });
//             }
//           };
//         });
//       });
//     };

//     setSort(list);

//     setOrders(list);

//     uploadState(items, list);

//     file.addEventListener('change', e => {

//       [...file.files].forEach((item, index) => {

//         const fileInstance = model.cloneNode(true);

//         fileInstance.removeAttribute('data-model');

//         list.appendChild(fileInstance);

//         const appendElement = list.lastElementChild;

//         const image = appendElement.querySelector(`${refChild}__image`);

//         fileLoading(file, image, index).then(data => {
//           template(appendElement, { name: data.id, src: data.source });
//           appendElement.setAttribute('id', data.id);
//           appendElement.setAttribute('data-sort', [...list.children].indexOf(appendElement));
//           if (appendElement.querySelectorAll('[data-action="remove"]')) {
//             appendElement.querySelectorAll('[data-action="remove"]').forEach(action => {
//               const attr = action.getAttribute('data-url');
//               action.setAttribute('data-url', `${attr}${data.id}`);
//             });
//           }
//           setOrders(list);
//           uploadState([...list.children], list);
//         });

//       });
//       list.classList.add('state-active');
//       selectAll.checked = false;
//       actions.classList.add('state-active');
//     });
//   });
// };

const courseState = (ns = 'data-course', reInit = false) => {
  const courses = document.querySelectorAll(`[${ns}]`);
  courses.forEach((course) => {
    if(!reInit || (reInit && course.classList.contains('state-wait'))) {
      const courseTitle = course.querySelector(`[${ns}-title]`);
      const courseCost = course.querySelector(`[${ns}-cost]`);
      const trigger = course.querySelector('[data-target]');
      const target = trigger?.getAttribute('data-target');
      const handler = (event) => {
        event.preventDefault();
        popover.open(target, (modal) => {
          const title = modal.querySelector('[data-title]');
          const cost = modal.querySelector('[data-cost]');
          const cancel = modal.querySelector(`[data-trigger="${target}:cancel"]`);
          const submit = modal.querySelector('a');
          const cancelHandler = (event) => popover.close();

          cancel.addEventListener('click', cancelHandler);

          title.textContent = courseTitle.textContent;

          if (cost) {
            cost.innerHTML = `
            <div class="coin">
              <div class="coin__prepend">${courseCost.textContent}</div>
              <div class="coin__picture">
                <svg width="17" height="10" viewBox="0 0 17 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M5.67723 0.555664C6.29689 0.555664 6.88039 0.61611 7.42775 0.737003C6.88126 0.620131 6.29657 0.555664 5.67723 0.555664ZM7.18962 3.33722C6.77462 3.20359 6.31353 3.1303 5.85546 3.12928C6.30612 3.12738 6.76635 3.20093 7.18962 3.33722ZM7.15715 7.61143C5.39715 7.99129 3.03568 7.75417 3.03568 5.38241C3.03568 3.24405 5.248 2.50921 6.99999 3.0156C7.2133 2.33434 7.52516 1.70092 7.94862 1.13008C7.24366 0.91944 6.503 0.805664 5.67723 0.805664C4.68234 0.805664 3.80428 0.972956 3.03734 1.30149L3.03568 1.30221C2.29183 1.61532 1.70216 2.10484 1.26376 2.77824L1.26279 2.77973C0.830917 3.43274 0.603882 4.29991 0.603882 5.39917C0.603882 7.01527 1.05284 8.14004 1.8921 8.83403C2.74895 9.54257 3.9087 9.90889 5.40159 9.90889C6.07862 9.90889 6.6625 9.83852 7.15715 9.70246C7.24588 9.6761 7.4265 9.60847 7.59441 9.5456L7.59453 9.54556L7.59454 9.54555C7.71929 9.49884 7.83701 9.45477 7.9048 9.4322C7.55962 8.86874 7.31903 8.25582 7.15715 7.61143ZM14.6548 1.32942C15.3027 1.67429 15.81 2.18034 16.1786 2.85436L16.1809 2.85844C16.5565 3.51573 16.7513 4.33627 16.7513 5.33214C16.7513 6.8408 16.3507 7.96481 15.5837 8.74251C14.8142 9.51161 13.7499 9.90889 12.3589 9.90889C11.5009 9.90889 10.7494 9.73231 10.0979 9.38586C9.44901 9.02971 8.93551 8.51738 8.55563 7.84284C8.18916 7.1613 8.00002 6.32772 8.00002 5.33214C8.00002 3.84642 8.40026 2.73939 9.167 1.97265C9.93613 1.20352 11.006 0.805665 12.4092 0.805665C13.2679 0.805665 14.0136 0.982517 14.6533 1.32862L14.6548 1.32942ZM11.0962 7.27073C10.8586 6.79558 10.7514 6.14141 10.7514 5.33214C10.7514 4.52432 10.8581 3.87797 11.0987 3.42218C11.0987 3.42218 11.4484 2.98683 11.6515 2.8693C11.8546 2.75176 12.3757 2.68552 12.3757 2.68552C12.6602 2.68552 12.9189 2.74254 13.1407 2.8693C13.3634 2.99655 13.5338 3.18553 13.6539 3.42461C13.8935 3.88027 13.9999 4.52575 13.9999 5.33214C13.9999 6.14072 13.8929 6.79447 13.6557 7.26952C13.537 7.51312 13.3692 7.70725 13.149 7.83868C12.9294 7.96973 12.6735 8.02903 12.3924 8.02903C12.1066 8.02903 11.8463 7.9701 11.622 7.84044C11.3966 7.71013 11.2227 7.51702 11.0974 7.27313L11.0962 7.27073Z" fill="#EB922A"></path>
                </svg>
              </div>
            </div>,
          `;
          }
          submit.href = params(submit.href, {id: course.getAttribute('data-course')});
        });
      }
      trigger?.addEventListener('click', handler);
    }
  });
}


courseState();

const serviceState = (ns = 'data-service') => {
  const courses = document.querySelectorAll(`[${ns}]`);
  courses.forEach((course) => {
    const courseTitle = course.querySelector(`[${ns}-title]`);
    const courseCost = course.querySelector(`[${ns}-cost]`);
    const trigger = course.querySelector('[data-target]');
    const target = trigger?.getAttribute('data-target');
    const handler = (event) => {
      event.preventDefault();
      popover.open(target, (modal) => {
        const title = modal.querySelector('[data-title]');
        const cost = modal.querySelector('[data-cost]');
        const cancel = modal.querySelector(`[data-trigger="${target}:cancel"]`);
        const submit = modal.querySelector('a');
        const cancelHandler = (event) => popover.close();

        cancel.addEventListener('click', cancelHandler);

        title.textContent = courseTitle.textContent;

        if (cost) {
          cost.innerHTML = `
            <div class="coin">
              <div class="coin__prepend">${courseCost.textContent}</div>
              <div class="coin__picture">
                <svg width="17" height="10" viewBox="0 0 17 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M5.67723 0.555664C6.29689 0.555664 6.88039 0.61611 7.42775 0.737003C6.88126 0.620131 6.29657 0.555664 5.67723 0.555664ZM7.18962 3.33722C6.77462 3.20359 6.31353 3.1303 5.85546 3.12928C6.30612 3.12738 6.76635 3.20093 7.18962 3.33722ZM7.15715 7.61143C5.39715 7.99129 3.03568 7.75417 3.03568 5.38241C3.03568 3.24405 5.248 2.50921 6.99999 3.0156C7.2133 2.33434 7.52516 1.70092 7.94862 1.13008C7.24366 0.91944 6.503 0.805664 5.67723 0.805664C4.68234 0.805664 3.80428 0.972956 3.03734 1.30149L3.03568 1.30221C2.29183 1.61532 1.70216 2.10484 1.26376 2.77824L1.26279 2.77973C0.830917 3.43274 0.603882 4.29991 0.603882 5.39917C0.603882 7.01527 1.05284 8.14004 1.8921 8.83403C2.74895 9.54257 3.9087 9.90889 5.40159 9.90889C6.07862 9.90889 6.6625 9.83852 7.15715 9.70246C7.24588 9.6761 7.4265 9.60847 7.59441 9.5456L7.59453 9.54556L7.59454 9.54555C7.71929 9.49884 7.83701 9.45477 7.9048 9.4322C7.55962 8.86874 7.31903 8.25582 7.15715 7.61143ZM14.6548 1.32942C15.3027 1.67429 15.81 2.18034 16.1786 2.85436L16.1809 2.85844C16.5565 3.51573 16.7513 4.33627 16.7513 5.33214C16.7513 6.8408 16.3507 7.96481 15.5837 8.74251C14.8142 9.51161 13.7499 9.90889 12.3589 9.90889C11.5009 9.90889 10.7494 9.73231 10.0979 9.38586C9.44901 9.02971 8.93551 8.51738 8.55563 7.84284C8.18916 7.1613 8.00002 6.32772 8.00002 5.33214C8.00002 3.84642 8.40026 2.73939 9.167 1.97265C9.93613 1.20352 11.006 0.805665 12.4092 0.805665C13.2679 0.805665 14.0136 0.982517 14.6533 1.32862L14.6548 1.32942ZM11.0962 7.27073C10.8586 6.79558 10.7514 6.14141 10.7514 5.33214C10.7514 4.52432 10.8581 3.87797 11.0987 3.42218C11.0987 3.42218 11.4484 2.98683 11.6515 2.8693C11.8546 2.75176 12.3757 2.68552 12.3757 2.68552C12.6602 2.68552 12.9189 2.74254 13.1407 2.8693C13.3634 2.99655 13.5338 3.18553 13.6539 3.42461C13.8935 3.88027 13.9999 4.52575 13.9999 5.33214C13.9999 6.14072 13.8929 6.79447 13.6557 7.26952C13.537 7.51312 13.3692 7.70725 13.149 7.83868C12.9294 7.96973 12.6735 8.02903 12.3924 8.02903C12.1066 8.02903 11.8463 7.9701 11.622 7.84044C11.3966 7.71013 11.2227 7.51702 11.0974 7.27313L11.0962 7.27073Z" fill="#EB922A"></path>
                </svg>
              </div>
            </div>,
          `;
        }
        submit.href = params(submit.href, { id: course.getAttribute('data-service') });
      });
    }
    trigger?.addEventListener('click', handler);
  });
}

serviceState();

const servicePopup = (dataTitle, dataCost, dataId) => {
  const target = 'service-buy';
  popover.open(target, (modal) => {
    const title = modal.querySelector('[data-title]');
    const cost = modal.querySelector('[data-cost]');
    const cancel = modal.querySelector(`[data-trigger="${target}:cancel"]`);
    const submit = modal.querySelector('a');
    const cancelHandler = (event) => popover.close();

    cancel.addEventListener('click', cancelHandler);

    title.textContent = dataTitle;

    if (cost) {
      cost.innerHTML = `
            <div class="coin">
              <div class="coin__prepend">`+dataCost+`</div>
              <div class="coin__picture">
                <svg width="17" height="10" viewBox="0 0 17 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M5.67723 0.555664C6.29689 0.555664 6.88039 0.61611 7.42775 0.737003C6.88126 0.620131 6.29657 0.555664 5.67723 0.555664ZM7.18962 3.33722C6.77462 3.20359 6.31353 3.1303 5.85546 3.12928C6.30612 3.12738 6.76635 3.20093 7.18962 3.33722ZM7.15715 7.61143C5.39715 7.99129 3.03568 7.75417 3.03568 5.38241C3.03568 3.24405 5.248 2.50921 6.99999 3.0156C7.2133 2.33434 7.52516 1.70092 7.94862 1.13008C7.24366 0.91944 6.503 0.805664 5.67723 0.805664C4.68234 0.805664 3.80428 0.972956 3.03734 1.30149L3.03568 1.30221C2.29183 1.61532 1.70216 2.10484 1.26376 2.77824L1.26279 2.77973C0.830917 3.43274 0.603882 4.29991 0.603882 5.39917C0.603882 7.01527 1.05284 8.14004 1.8921 8.83403C2.74895 9.54257 3.9087 9.90889 5.40159 9.90889C6.07862 9.90889 6.6625 9.83852 7.15715 9.70246C7.24588 9.6761 7.4265 9.60847 7.59441 9.5456L7.59453 9.54556L7.59454 9.54555C7.71929 9.49884 7.83701 9.45477 7.9048 9.4322C7.55962 8.86874 7.31903 8.25582 7.15715 7.61143ZM14.6548 1.32942C15.3027 1.67429 15.81 2.18034 16.1786 2.85436L16.1809 2.85844C16.5565 3.51573 16.7513 4.33627 16.7513 5.33214C16.7513 6.8408 16.3507 7.96481 15.5837 8.74251C14.8142 9.51161 13.7499 9.90889 12.3589 9.90889C11.5009 9.90889 10.7494 9.73231 10.0979 9.38586C9.44901 9.02971 8.93551 8.51738 8.55563 7.84284C8.18916 7.1613 8.00002 6.32772 8.00002 5.33214C8.00002 3.84642 8.40026 2.73939 9.167 1.97265C9.93613 1.20352 11.006 0.805665 12.4092 0.805665C13.2679 0.805665 14.0136 0.982517 14.6533 1.32862L14.6548 1.32942ZM11.0962 7.27073C10.8586 6.79558 10.7514 6.14141 10.7514 5.33214C10.7514 4.52432 10.8581 3.87797 11.0987 3.42218C11.0987 3.42218 11.4484 2.98683 11.6515 2.8693C11.8546 2.75176 12.3757 2.68552 12.3757 2.68552C12.6602 2.68552 12.9189 2.74254 13.1407 2.8693C13.3634 2.99655 13.5338 3.18553 13.6539 3.42461C13.8935 3.88027 13.9999 4.52575 13.9999 5.33214C13.9999 6.14072 13.8929 6.79447 13.6557 7.26952C13.537 7.51312 13.3692 7.70725 13.149 7.83868C12.9294 7.96973 12.6735 8.02903 12.3924 8.02903C12.1066 8.02903 11.8463 7.9701 11.622 7.84044C11.3966 7.71013 11.2227 7.51702 11.0974 7.27313L11.0962 7.27073Z" fill="#EB922A"></path>
                </svg>
              </div>
            </div>,
          `;
    }
    submit.href = params(submit.href, { id: dataId });
  });
}


window.servicePopup = servicePopup;

const universalCancelState = (ns = 'data-universal-cancel') => {
  const items = document.querySelectorAll(`[${ns}]`);
  items.forEach((item) => {
    const elementTitle = item.getAttribute(`data-title`);
    const elementDescription = item.getAttribute(`data-description`);
    const target = item.getAttribute('data-target');
    const handler = (event) => {
      event.preventDefault();
      popover.open(target, (modal) => {
        const title = modal.querySelector('[data-title]');
        const description = modal.querySelector('[data-description]');
        const cancel = modal.querySelector(`[data-trigger="${target}:cancel"]`);
        const submit = modal.querySelector('a');
        const cancelHandler = (event) => popover.close();

        cancel.addEventListener('click', cancelHandler);

        title.textContent = elementTitle;
        description.textContent = elementDescription;
        submit.href = params(submit.href, { id: item.getAttribute('data-id') });
        submit.href = item.getAttribute('data-url');
      });
    }
    item.addEventListener('click', handler);
  });
}

universalCancelState();

const choice = (ref = '[data-choice]') => {
  const elements = document.querySelectorAll(ref);
  const removes = document.querySelectorAll('[data-choice-accepted]');

  elements.forEach(element => {
    const options = element.getAttribute('data-choice');
    const triggers = element.querySelectorAll('[data-trigger]');
    const targets = element.querySelectorAll('[data-target]');
    const checkboxes = element.querySelectorAll('[type="checkbox"]');
    const removed = element.querySelector('[type="hidden"]');
    const removedData = [];

    const targetToggle = targets => {

      const toggle = ref => {
        const checkboxes = ref.querySelectorAll('[type="checkbox"]');
        if ([...checkboxes].filter(item => item.checked === true).length !== 0) {
          ref.classList.add('state-active');
          if (ref.className.indexOf('state-hidden') !== -1) {
            ref.classList.remove('state-hidden');
          }
        }
      };

      const walker = parent => toggle(parent);

      targets.forEach(target => walker(target));

      walker(element);

    };

    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', e => {
        const exists = checkbox.closest('.checkbox').className.indexOf('state-exists') !== -1;
        if (exists === true) {
          if (checkbox.checked === true) {
            if (removedData.some(item => item === checkbox.id) !== true) {
              removedData.push(checkbox.id);
            }
          }
          else {
            removedData.splice(removedData.indexOf(checkbox.id), 1);
          }
          removed.value = removedData.length !== 0 ? JSON.stringify(removedData) : null;
          targetToggle(targets);
        }
      });
    });

    triggers.forEach(trigger => {
      trigger.addEventListener('click', e => {
        const currentTarget = e.target.closest('[data-target]');
        if (currentTarget !== null) {
          const targetsGroup = [...targets].filter(item => item.getAttribute('data-target') === currentTarget.getAttribute('data-target'));
          targetsGroup.forEach(target => {
            if (target === currentTarget) {
              target.classList.toggle('state-expand');
            }
            else if (options === 'single') {
              target.classList.remove('state-expand');
            }
          });
        }
      });
    });
  });

  removes.forEach(remove => {
    const isAccepted = remove.getAttribute('data-choice-accepted');
    const items = remove.querySelectorAll('[data-remove]');
    items.forEach(item => {
      const id = item.getAttribute('data-remove');
      const checkbox = document.querySelector(`[id="${id}"]`);
      item.addEventListener('click', e => {
        const exists = checkbox.closest('.checkbox').className.indexOf('state-exists') !== -1;
        if (exists === true) {
          if (isAccepted === 'true') {
            popover.open('remove', modal => {
              triggers.get('remove:cancel').click((ev, el, target) => {
                popover.close();
              });
              triggers.get('remove:submit').click((ev, el, target) => {
                popover.close();
                checkbox.parentElement.click();
                checkbox.checked = false;
                checkbox.closest('.checkbox').classList.add('state-active');
                item.parentElement.parentElement.remove();
              });
            });
          }
          else {
            checkbox.parentElement.click();
            checkbox.checked = false;
            checkbox.closest('.checkbox').classList.add('state-active');
            item.parentElement.parentElement.remove();
          }
        }
      });
    });
  });
};

const fillTable = (rows, data) => {
  const rowsContainer = rows[0].parentElement;
  const rowClassName = rows[0].className;
  const cellClassName = rows[0].children[0].className;

  while (rowsContainer.firstElementChild) rowsContainer.firstElementChild.remove();

  data.data.forEach((item, index) => {
    const row = document.createElement('tr');
    row.classList.add(rowClassName);
    Object.keys(data.attributes).forEach(attr => {
      const cell = document.createElement('td');
      cell.classList.add(cellClassName);
      cell.innerHTML = data.data[index][attr];
      if (data.data[index][`${attr}_sort`]) {
        cell.setAttribute('data-value', data.data[index][`${attr}_sort`]);
      }
      else {
        cell.setAttribute('data-value', data.data[index][attr]);
      }
      row.appendChild(cell);
    });
    rowsContainer.appendChild(row);
  });
};

const tableSortable = (ref = '[data-table]') => {
  const elements = document.querySelectorAll(ref);
  elements.forEach(element => {
    const type = element.getAttribute(ref.slice(1, -1));
    const triggers = element.querySelectorAll('[data-direction]');
    const rowsContainer = element.querySelector('[data-rows]');
    const rows = [...rowsContainer.children];
    if (type === 'ajax') {
      let action = element.getAttribute('data-action');
      const query = action => fetch(action, { credentials: 'include' }).then(response => response.json());
      const pagination = element.querySelector('[data-pagination]');
      const controls = pagination.querySelectorAll('[data-control]');
      const pages = pagination.querySelectorAll('[data-nav]');
      const paginationData = pagination.getAttribute('data-pagination').split('/');
      const paginationPageCount = Number(paginationData[0]);
      const paginationPerPage = Number(paginationData[1]);
      const start = pagination.querySelector('[data-control="start"]');
      const prev = pagination.querySelector('[data-control="prev"]');
      const next = pagination.querySelector('[data-control="next"]');
      const end = pagination.querySelector('[data-control="end"]');

      action = action.indexOf('?') === -1 ? `${action}?` : action;

      const paginationWalker = (current, count, length) => {
        let result = [];
        for (let i = 0; i < (count >= length ? length : count); i++) {
          let item;
          if (current < Math.ceil((length / 2) + 1)) {
            item = i + 1;
          }
          else if (current >= Math.ceil((length / 2) + 1) && current < (count - (length - (Math.ceil(length / 2)) - 1))) {
            item = i + (current - Math.floor((length / 2)));
          }
          else if (current >= (count - (length - (Math.ceil(length / 2)) - 1))) {
            item = i + ((count - length) + 1);
          }
          result.push(item);
        }
        return result;
      }

      let direction = '';
      let name = '';
      let currentPage = 1;

      let paginationAction = action;

      const fill = (rows, data) => {

        const rowClassName = rows[0].className;
        const cellClassName = rows[0].children[0].className;

        while (rowsContainer.firstElementChild) rowsContainer.firstElementChild.remove();

        data.data.forEach((item, index) => {
          const row = document.createElement('tr');
          row.classList.add(rowClassName);
          Object.keys(data.attributes).forEach(attr => {
            const cell = document.createElement('td');
            cell.classList.add(cellClassName);
            cell.innerHTML = data.data[index][attr];
            if (data.data[index][`${attr}_sort`]) {
              cell.setAttribute('data-value', data.data[index][`${attr}_sort`]);
            }
            else {
              cell.setAttribute('data-value', data.data[index][attr]);
            }
            row.appendChild(cell);
          });
          rowsContainer.appendChild(row);
        });
      }

      triggers.forEach(trigger => {
        trigger.onclick = e => {

          name = trigger.getAttribute('data-name');

          direction = trigger.getAttribute('data-direction');

          if (direction !== 'desc') {
            direction = 'desc';
          }
          else {
            direction = 'asc';
          }

          paginationAction = action;

          if (name) {
            paginationAction += `&sort=${name}`;
          }
          if (direction) {
            paginationAction += `&sortType=${direction}`;
          }

          element.classList.add('state-load');

          query(`${action}&sort=${name}&sortType=${direction}&page=${currentPage}&perPage=${paginationPerPage}`)
            .then(data => {
              element.classList.remove('state-load');
              trigger.setAttribute('data-direction', direction);
              fill(rows, data);
            });
        };
      });

      const setPagination = (pages, current) => {
        const walker = paginationWalker(current, paginationPageCount, pages.length);
        pages.forEach((page, index) => {
          page.setAttribute('data-nav', walker[index]);
          if (index === walker.indexOf(current)) {
            page.classList.add('state-active');
          }
          else {
            page.classList.remove('state-active');
          }
        });
        if (current === 1) {
          [prev, start].filter(i=>i).forEach(item => item.classList.remove('state-active'));
          [next, end].filter(i=>i).forEach(item => item.classList.add('state-active'));
        }
        else if (current === paginationPageCount) {
          [prev, start].filter(i=>i).forEach(item => item.classList.add('state-active'));
          [next, end].filter(i=>i).forEach(item => item.classList.remove('state-active'));
        }
        else {
          [prev, start].filter(i=>i).forEach(item => item.classList.add('state-active'));
          [next, end].filter(i=>i).forEach(item => item.classList.add('state-active'));
        }

        element.classList.add('state-load')
        query(`${paginationAction}&page=${currentPage}&perPage=${paginationPerPage}`)
          .then(data => {
            element.classList.remove('state-load');
            fill(rows, data)
          });
      };

      pages.forEach((page, index) => {
        page.addEventListener('click', e => {
          const nav = Number(page.getAttribute('data-nav'));
          if (currentPage !== nav) {
            currentPage = nav;
            setPagination(pages, currentPage);
          }
        });
      });

      controls.forEach(control => {
        const type = control.getAttribute('data-control');
        control.onclick = e =>  {
          if (type === 'start' && currentPage !== 1) {
            currentPage = 1;
            setPagination(pages, currentPage);
          }
          else if (type === 'prev' && currentPage !== 1) {
            currentPage -= 1;
            setPagination(pages, currentPage);
          }
          else if (type === 'next' && currentPage !== paginationPageCount) {
            currentPage += 1;
            setPagination(pages, currentPage);
          }
          else if (type === 'end' && currentPage !== paginationPageCount) {
            currentPage = paginationPageCount;
            setPagination(pages, currentPage);
          }
        };
      });
    }
    else {
      const sortFunction = (index, mode = 'desc') => {
        if (mode === 'desc') {
          return (a, b) => {
            a = Number(a.children[index].getAttribute('data-value')) !== null ? Number(a.children[index].getAttribute('data-value')) : a.children[index].getAttribute('data-value');
            b = Number(b.children[index].getAttribute('data-value')) !== null ? Number(b.children[index].getAttribute('data-value')) : b.children[index].getAttribute('data-value');
            return a > b ? -1 : 1;
          }
        }
        else if (mode === 'asc') {
          return (a, b) => {
            a = Number(a.children[index].getAttribute('data-value')) !== null ? Number(a.children[index].getAttribute('data-value')) : a.children[index].getAttribute('data-value');
            b = Number(b.children[index].getAttribute('data-value')) !== null ? Number(b.children[index].getAttribute('data-value')) : b.children[index].getAttribute('data-value');
            return a < b ? -1 : 1;
          }
        }
      };
      triggers.forEach((trigger, index) => {
        if (trigger.getAttribute('data-direction') !== 'data-direction') {
          [...rows]
            .sort(sortFunction(index, trigger.getAttribute('data-direction')))
            .forEach(row => row.parentElement.appendChild(row));
        }
        trigger.onclick = e => {
          if (trigger.getAttribute('data-direction') !== 'desc') {
            trigger.setAttribute('data-direction', 'desc');
          }
          else {
            trigger.setAttribute('data-direction', 'asc');
          }
          [...rows]
            .sort(sortFunction(index, trigger.getAttribute('data-direction')))
            .forEach(row => row.parentElement.appendChild(row));
        };
      });
    }

  });
};

const fieldTax = (ref = '.table-tax') => {

  const toggle = item => {
    item.classList.toggle('state-active');
  };

  const inputState = (item, input) => {
    toggle(item);
    toggle(input);
  };

  const errorState = (item, error, message) => {
    toggle(item);
    toggle(error);
    error.querySelector('[data-message]').textContent = `${message} `;
  };

  const retryState = (item, input) => {
    toggle(item);
    toggle(input);
  };

  const successState = (item, success, cb) => {
    toggle(item);
    toggle(success);
    cb(success);
  };

  const sendState = (state, action, success, error) => {
    const url = action.getAttribute('data-url');
    const parent = action.closest('[id]');
    const id = parent.id;
    const input = parent.querySelector('input');
    const message = input.getAttribute('data-error');
    const order = input.value;
    if (order.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g)) {
      const data = new FormData;
      data.append('id', id);
      data.append('order', order);
      fetch(url, {method: 'post', body: data})
        .then(response => response.json())
        .then(data => {
          if (data.status === 'error') throw data.message;
          return data;
        })
        .then(data => {
          successState(state, success, field => {
            const link = field.querySelector('a');
            link.href = order;
          });
        })
        .catch(message => errorState(state, error, message));
    }
    else {
      errorState(state, error, message);
    }

  };

  const cancelState = (state, action, link, error) => {
    const url = action.getAttribute('data-url');
    const parent = action.closest('[id]');
    const id = parent.id;
    const data = new FormData;
    data.append('id', id);
    popover.open('cancel-tax', modal => {
      const target = 'cancel-tax';
      triggers.get(`${target}:cancel`).click((ev, el, target) => {
        popover.close();
      });
      triggers.get(`${target}:submit`).click((ev, el, target) => {
        popover.close();
        fetch(url, {method: 'post', body: data})
          .then(response => response.json())
          .then(data => {
            if (data.status === 'error') throw data.message;
            return data;
          })
          .then(data => {
            retryState(state, link);
          })
          .catch(message => errorState(state, error, message));
      });
    });
  };

  const elements = document.querySelectorAll(ref);
  elements.forEach(element => {
    const link = element.querySelector('[data-state="link"]');
    const input = element.querySelector('[data-state="input"]');
    const error = element.querySelector('[data-state="error"]');
    const success = element.querySelector('[data-state="success"]');

    const states = element.querySelectorAll('[data-state]');
    states.forEach((state, index) => {
      const actions = state.querySelectorAll('[data-action]');
      actions.forEach(action => {
        const value = action.getAttribute('data-action');
        action.addEventListener('click', e => {
          e.preventDefault();
          if (value.indexOf('input') !== -1) {
            inputState(state, input);
          }
          if (value.indexOf('send') !== -1) {
            sendState(state, action, success, error);
          }
          if (value.indexOf('retry') !== -1) {
            retryState(state, input);
          }
          if (value.indexOf('cancel') !== -1) {
            cancelState(state, action, input, error);
          }
        });
      });
    });
  });
};

const fieldCancel = (ref = '[data-cancel]') => {
  const elements = document.querySelectorAll(ref);
  elements.forEach(element => {
    const action = element.getAttribute('data-url');
    const parent = element.closest('[id]');
    const status = parent.querySelector('[data-status]');
    const data = new FormData;
    data.append('id', parent.id);
    element.addEventListener('click', e => {
      e.preventDefault();
      popover.open('cancel-paid', modal => {
        const target = 'cancel-paid';
        const errorElement = modal.querySelector('[data-alert]');

        if (modal.className.indexOf('state-error') !== -1) {
          modal.classList.remove('state-error');
        }

        triggers.get(`${target}:cancel`).click((ev, el, target) => {
          popover.close();
        });
        triggers.get(`${target}:submit`).click((ev, el, target) => {
          el.classList.add('state-load');
          query(params(action), data)
            .then(data => {
              element.classList.remove('state-active');
              status.textContent = 'отменена';
              popover.close();
            })
            .catch(error => {
              modal.classList.add('state-error');
              errorElement.textContent = error.message;
            })
            .finally(() => el.classList.remove('state-load'))
        });
      });
    });
  });
};

const fieldMoney = (ref = '.request-money') => {
  const elements = document.querySelectorAll(ref);
  elements.forEach(element => {
    const amount = +element.getAttribute('data-amount');
    const valueField = element.querySelector('[data-value]');
    const valueBy = +element.querySelector('[data-by]').getAttribute('data-by');
    const input = element.querySelector('input[type="text"]');
    input.addEventListener('input', e => {
      if (isNaN(+input.value) === true) {
        input.value = input.value.slice(0, -1);
      }
      else if (+input.value > amount) {
        input.value = amount;
      }
      valueField.setAttribute('data-value', +input.value * valueBy);
    });
  });
};

const copyLink = (ref = '[data-copy]') => {
  const elements = document.querySelectorAll(ref);
  elements.forEach(element => {
    element.addEventListener('click', e => {
      getSelection().selectAllChildren(element);
      document.execCommand('copy');
    });
  });
};

const stats = (ref = '[data-stats]') => {

  const element = document.querySelector(ref);

  const dates = element.querySelector('[data-dates]');
  const group = element.querySelector('[data-group]');
  const times = element.querySelector('[data-times]');

  const message = element.querySelector('[data-message]');

  const submit = element.querySelector('[data-submit]');

  const selects = element.querySelectorAll('.select');

  const datesInput = dates.querySelector('input');

  const table = element.querySelector('[data-table]');
  const rows = table.querySelector('[data-rows]');
  const pagination = table.querySelector('[data-pagination]');

  const controls = pagination.querySelectorAll('[data-control]');

  const fillPagination = (pagination, data) => {
    const pages = pagination.querySelector('[data-pages]');
    const pageModel = pages.children[0].cloneNode(true);
    let count = 1;
    if (data.pagination.pages > data.pagination.count) {
      count = data.pagination.count;
    }
    else {
      count = data.pagination.pages;
    }

    while (pages.firstElementChild) pages.firstElementChild.remove();

    while (pages.children.length !== count) {
      const item = pageModel.cloneNode(true);
      item.setAttribute('data-nav', pages.children.length + 1);
      pages.appendChild(item);
      if (pages.children.length > 1) {
        pages.lastElementChild.classList.remove('state-active');
      }
    }

    if (pages.children.length === 1) {
      pages.firstElementChild.classList.add('state-active');
    }

    controls.forEach(control => {
      const type = control.getAttribute('data-control');
      if (pages.children.length > 1) {
        if (type.indexOf('next') !== -1 || type.indexOf('end') !== -1) {
          control.classList.add('state-active');
        }
      }
      else {
        control.onclick = e => e.preventDefault();
        if (type.indexOf('next') !== -1 || type.indexOf('end') !== -1) {
          control.classList.remove('state-active');
        }
      }
      if (type.indexOf('start') !== -1 || type.indexOf('prev') !== -1) {
        control.classList.remove('state-active');
      }
    });

  };

  const today = new Date();
  const tomorrow = new Date(today.getTime() + (1000 * 60 * 60 * 24));
  const range = `${dateFormat(today, 'dmy', '.')} — ${dateFormat(tomorrow, 'dmy', '.')}`;

  const data = {
    'date_start': dateFormat(today, 'ymd', '-'),
    'date_end': dateFormat(today, 'ymd', '-'),
    'group': 'days',
    'current_year': 0,
    'current_month': 0,
    'last_month': 0
  };

  const clearTimes = () => {
    const timesField = times.querySelector('[data-select-output]');
    const timesDefault = timesField.getAttribute('data-placeholder');
    timesField.closest('.select').classList.remove('state-selected');
    timesField.textContent = timesDefault;
  };

  const datesPicker = element => {
    $(element).val(range).datepicker({
      range: true,
      dateFormat: 'dd.mm.yyyy',
      multipleDatesSeparator: ' — ',
      onSelect(formattedDate, date, inst) {
        if (date.length === 2) {
          inst.hide();
          data['date_start'] = dateFormat(date[0], 'ymd', '-');
          data['date_end'] = dateFormat(date[1], 'ymd', '-');
          clearTimes();
        }
      }
    });
  };

  select('.select', output => {
    ['group', 'times'].forEach(item => {
      if (output.closest(`[data-${item}]`)) {
        if (item === 'group') {
          clearTimes();
        }
        else if (item === 'times') {
          const time = output.getAttribute('data-select-output');
          const groupField = group.querySelector('[data-select-output]');
          const groupOption = option => {
            const item = group.querySelector(`[data-option="${option}"]`);
            return {
              key: item.getAttribute('data-option'),
              value: item.textContent
            };
          };

          const date = new Date();

          const currentYearDate = {
            start: new Date(date.getFullYear(), 0, 1),
            end: new Date(date.getFullYear(), 12, 0, 23, 59, 59)
          };

          const currentMonthDate = {
            start: new Date(date.getFullYear(), date.getMonth(), 1),
            end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
          };

          const lastMonthDate = {
            start: new Date(date.getFullYear(), date.getMonth() - 1, 1),
            end: new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59)
          };

          const timeData = {
            'current_year': {time: 'months', date: currentYearDate},
            'current_month': {time: 'days', date: currentMonthDate},
            'last_month': {time: 'days', date: lastMonthDate}
          };
          Object.keys(timeData).forEach(key => {
            if (time === key) {
              const optionData = groupOption(timeData[key].time);
              groupField.textContent = optionData.value;
              groupField.setAttribute('data-select-output', optionData.key);
              datesInput.value = `${dateFormat(timeData[key].date.start, 'dmy', '.')} — ${dateFormat(timeData[key].date.end, 'dmy', '.')}`;
              data['date_start'] = dateFormat(timeData[key].date.start, 'ymd', '-');
              data['date_end'] = dateFormat(timeData[key].date.end, 'ymd', '-');
            }
          });
        }
      }
    });
  });

  const getSelects = output => {
    ['group', 'times'].forEach(item => {
      if (output.closest(`[data-${item}]`)) {
        if (item === 'group') {
          data[item] = output.getAttribute('data-select-output');
        }
        else if (item === 'times') {
          ['current_year', 'current_month', 'last_month'].forEach(time => {
            if (time === output.getAttribute('data-select-output')) {
              data[time] = 1;
            }
            else {
              data[time] = 0;
            }
          });
        }
      }
    });
  };

  datesPicker(datesInput);

  submit.addEventListener('click', e => {
    submit.classList.add('state-load');

    selects.forEach(select => {
      const output = select.querySelector('[data-select-output]');
      getSelects(output);
    });

    let url = submit.getAttribute('data-submit');
    url += url.indexOf('?') === -1 ? '?' : '&';
    Object.entries(data).forEach((item, index, list) => {
      if (index !== (list.length - 1)) {
        url += `${item[0]}=${item[1]}&`;
      }
      else {
        url += `${item[0]}=${item[1]}`;
      }
    });
    fetch(url, { method: 'post', credentials: 'include' })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'error') throw data.message;
        return data;
      })
      .then(data => {
        if (data.data.length !== 0) {
          const paginationData = pagination.getAttribute('data-pagination').split('/');
          message.classList.remove('state-active');
          table.classList.add('state-active');
          pagination.classList.add('state-active');
          if (data.pagination.pages > 1) {
            table.setAttribute('data-table', 'ajax');
            table.setAttribute('data-action', url);
            pagination.setAttribute('data-pagination', `${data.pagination.pages}/${paginationData[1]}`);
          }
          else {
            table.setAttribute('data-table', 'static');
            table.removeAttribute('data-action');
            pagination.setAttribute('data-pagination', paginationData.join('/'));
          }
          fillTable([...rows.children], data);
          fillPagination(pagination, data);
          tableSortable();
        }
        else {
          message.classList.add('state-active');
          table.classList.remove('state-active');
          pagination.classList.remove('state-active');
        }
      })
      .catch(error => console.log(error))
      .finally(() => submit.classList.remove('state-load'));
  });

};

const selectChoice = (ref = '[data-select-choice]') => {
  const elements = document.querySelectorAll(ref);
  select(elements, output => {
    if (output.tagName === 'DIV') {
      const form = output.closest('form');
      const items = form.querySelectorAll('[data-group]');
      const option = output.getAttribute('data-select-output');
      items.forEach(item => {
        const group = item.getAttribute('data-group');
        if (group.indexOf(option) !== -1) {
          item.classList.remove('state-hidden');
        }
        else {
          item.classList.add('state-hidden');
        }
      });
    }
  });
};

class Range {
  constructor(ns = false) {
    this.ns = ns || 'range';
    this.items = [];
  }
  set(instance, options, callback = false) {
    instance = typeof instance === 'string' ? document.querySelector(instance) : instance;
    this.items.push({
      el: instance,
      id: options.id,
      type: options.type,
      fill: options.fill
    });
    this.init(callback && callback);
  }
  get(id) {
    return this.items.filter(i=>i.id===id)[0];
  }
  init(callback) {
    this.items.forEach(item => {
      const instance = item.el;
      const fields = instance.querySelectorAll(`.${this.ns}__field`);
      const bg = instance.querySelector(`.${this.ns}__bg`);
      const info = instance.querySelector(`.${this.ns}__info`);
      item.field = item.type === 'between'
        ? { start: fields[0], end: fields[1] }
      : fields[0];
      item.bg = bg; item.info = info;
      const size = field => 100 / ((field.max - field.min) / (field.value - field.min));
      const fill = (element, data) => {
        if (item.type !== 'between') {
          element.style.backgroundImage = `linear-gradient(to right, ${data.fill.in} ${size(data.field)}%, ${data.fill.out} ${size(data.field)}%)`;
        }
        else {
          let start = size(data.field.start);
          let end = size(data.field.end);
          if (start > end) {
            const temp = start;
            start = end;
            end = temp;
          }
          element.style.backgroundImage = `linear-gradient(to right, ${data.fill.out} ${start}%, ${data.fill.in} ${start}%, ${data.fill.in} ${end}%, ${data.fill.out} ${end}%)`;
        }
      }
      const change = fields => {
        fields.forEach(field => {
          ['input', 'change'].forEach(event => {
            field.addEventListener(event, () => {
              callback && callback(item);
              fill(bg, {fill: item.fill, field: item.field});
            });
          });
        });
      }
      callback && callback(item);
      fill(bg, {fill: item.fill, field: item.field});
      change(item.type === 'basic' ? [item.field] : [item.field.start, item.field.end]);
    });
  }
};

const rangeField = (ref = '.range') => {
  const range = new Range;
  const elements = document.querySelectorAll(ref);
  elements.forEach(element => {
    const from = element.getAttribute('data-in');
    const to = element.getAttribute('data-out');
    range.set(element, {
      id: 'basic', type: 'basic',
      fill: {in: from, out: to},
    });
  });
};

const exchange = (sender = 'data-sender', receiver = 'data-receiver') => {
  const elements = document.querySelectorAll(`[${sender}]`);
  elements.forEach(element => {
    const senderId = element.getAttribute(sender);
    const senderInput = element.querySelector('input');
    const receivers = document.querySelectorAll(`[${receiver}]`);
    senderInput.addEventListener('input', e => {
      receivers.forEach(receiverElement => {
        const receiverInput = receiverElement.querySelector('input');
        if (receiverElement.getAttribute(receiver).indexOf(senderId) !== -1) {
          receiverInput.value = senderInput.value;
        }
      });
    });
  });
};

const profileTabs = (ref = '.profile-tabs') => {
  const tabs = document.querySelector(ref);
  if (tabs) {
    const header = tabs.querySelector(`${ref}__header`);
    const items = tabs.querySelectorAll(`${ref}__item`);
    items.forEach(item => {
      item.addEventListener('click', e => {
        localStorage.setItem('tabs-position', header.scrollLeft);
      });
    })
    if (localStorage.getItem('tabs-position')) {
      header.scroll(localStorage.getItem('tabs-position'), 0);
    }
  }
};

profileTabs();

const dataBaseExpand = (ref = '[data-nav]', refList = '[data-list]', refTriggers = ['[data-close]', '[data-search-trigger]']) => {
  const element = document.querySelector(ref);
  const list = document.querySelector(refList);
  const triggers = document.querySelectorAll(...refTriggers);
  [element, ...triggers].forEach(item => item.addEventListener('click', e => {
    list.classList.toggle('state-active');
  }));
};

class Masonry {
  constructor() {
    this.ns = 'masonry';
    this.$instances = document.querySelectorAll(`[data-${this.ns}]`);
    this.init();
  }
  build() {
    this.$instances.forEach(instance => {
      const items = [...instance.children];
      const instanceWidth = instance.clientWidth;
      const itemWidth = items[0].clientWidth;
      const columns = parseInt(instanceWidth / itemWidth);
      items.forEach((item, index) => {
        item.style.marginTop = null;
        if (index >= columns) {
          const prevElement = items[index - columns];
          const offsetElement = item.offsetTop;
          const offsetPrevElement = prevElement.offsetTop;
          const heightPrevElement = prevElement.clientHeight;
          const gutter = parseInt(getComputedStyle(prevElement).marginBottom);
          const size = `${
            -(offsetElement - offsetPrevElement) + (heightPrevElement + gutter)
          }px`;
          item.style.marginTop = size;
        }
      });
    });
  }
  init() {
    addEventListener("load", (e) => {
      this.build();
      addEventListener("resize", () => this.build());
    });
  }
}

class Rating {
  constructor(instance) {
    this.$instance = typeof instance === 'string' ? document.querySelector(instance) : instance;
    this.$items = [...this.$instance.children];
    this.init();
  }
  init() {
    this.$items.forEach((item, index) => {
      item.addEventListener('click', e => {
        this.set(index + 1);
      });
    });
    return this;
  }
  get() {
    return this.$items.reduce((a, c) => {
      const fill = c.querySelector('use');
      const fillAttr = fill.getAttribute('xlink:href');
      const hasFill = fillAttr.indexOf('#full') !== -1;
      return a += hasFill ? 1 : 0;
    }, 0);
    return this;
  }
  set(current) {
    this.$items.forEach((item, index) => {
      const fill = item.querySelector('use');
      let fillSize = current > index ? '#full' : '#empty';
      fill.setAttribute(
        'xlink:href',
        fill.getAttribute('xlink:href').replace(/#\w+/, '') + fillSize
      );
    });
    return this;
  }
}

class Pagination {
  constructor() {
    this.current = 1;
    this.data = [];
    this.count = null;
    this.elements = null;
    this.controls = {map: {}, items: []};
    this.pages = null;
    this.callback = false;
    this.init();
  }
  init() {
    this.elements = document.querySelectorAll('[data-pagination]');
    this.elements.forEach(element => {
      this.count = Number(element.getAttribute('data-pagination'));
      this.pages = element.querySelectorAll('[data-nav]');
      element.querySelectorAll('[data-control]').forEach(control => {
        this.controls.map[control.getAttribute('data-control')] = control;
        this.controls.items.push(control);
      });

      this.controls.map.start && this.controls.map.start.addEventListener('click', e => {
        if (this.current !== 1) {
          this.to(1);
          this.callback && this.callback(this.current, e.currentTarget);
        }
      });

      this.controls.map.prev && this.controls.map.prev.addEventListener('click', e => {
        if (this.current > 1) {
          this.to(--this.current);
          this.callback && this.callback(this.current, e.currentTarget);
        }
      });

      this.controls.map.next && this.controls.map.next.addEventListener('click', e => {
        if (this.current < this.count) {
          this.to(++this.current);
          this.callback && this.callback(this.current, e.currentTarget);
        }
      });

      this.controls.map.end && this.controls.map.end.addEventListener('click', e => {
        if (this.current !== this.count) {
          this.to(this.count);
          this.callback && this.callback(this.current, e.currentTarget);
        }
      });

      this.pages.forEach((page, index) => {
        page.addEventListener('click', e => {
          const num = +page.getAttribute('data-nav');
          if (this.current !== num) {
            this.to(num);
            this.callback && this.callback(this.current, this.pages[this.data.indexOf(this.current)]);
          }
        });
      });

    });
  }
  to(current) {
    const map = (current, count, length) => {
      let result = [];
      for (let i = 0; i < (count >= length ? length : count); i++) {
        let item;
        if (current < Math.ceil((length / 2) + 1)) {
          item = i + 1;
        }
        else if (current >= Math.ceil((length / 2) + 1) && current < (count - (length - (Math.ceil(length / 2)) - 1))) {
          item = i + (current - Math.floor((length / 2)));
        }
        else if (current >= (count - (length - (Math.ceil(length / 2)) - 1))) {
          item = i + ((count - length) + 1);
        }
        result.push(item);
      }
      return result;
    }
    this.current = +current;
    this.data = map(this.current, this.count, this.pages.length);

    this.pages.forEach((page, index) => {
      page.setAttribute('data-nav', this.data[index]);
      if (page.getAttribute('data-nav') == this.current) {
        page.classList.add('state-active');
      }
      else {
        page.classList.remove('state-active');
      }
    });

    if (this.current === 1) {
      [this.controls.map.start, this.controls.map.prev]
        .filter(control => control)
        .forEach(control => control.classList.remove('state-active'));
      [this.controls.map.next, this.controls.map.end]
        .filter(control => control)
        .forEach(control => control.classList.add('state-active'));
    }
    else if (this.current === this.count) {
      [this.controls.map.start, this.controls.map.prev]
        .filter(control => control)
        .forEach(control => control.classList.add('state-active'));
      [this.controls.map.next, this.controls.map.end]
        .filter(control => control)
        .forEach(control => control.classList.remove('state-active'));
    }
    else {
      [this.controls.map.start, this.controls.map.prev, this.controls.map.next, this.controls.map.end]
        .filter(control => control)
        .forEach(control => control.classList.add('state-active'));
    }
  }
  on(type) {
    this.controls.map[type].click();
  }
  cb(fn) {
    this.callback = fn;
  }
}

const review = (ref = '[data-review]') => {

  const instance = document.querySelector(ref);

  if (instance) {
    const expertId = instance.getAttribute(ref.slice(1, -1));
    const actionLoad = instance.getAttribute('data-url');
    const masonry = new Masonry();
    const pagination = new Pagination();

    const createState = () => {
      triggers.get('review-create').click((ev, el, target) => {
        ev.preventDefault();
        popover.open(target, modal => {
          const errorElement = modal.querySelector('[data-alert]');
          const buttons = modal.querySelectorAll('[data-trigger]');
          const expert = expertId;
          const action = modal.getAttribute('data-url');
          const rating = new Rating(modal.querySelector('[data-rating]'));
          const anon = modal.querySelector('[data-private]');
          const field = modal.querySelector('[data-field]');
          field.value = '';
          anon.checked = false;
          rating.set(0);
          buttons.forEach(button => {
            if (button.className.indexOf('state-load') !== -1) {
              button.classList.remove('state-load');
            }
          });
          if (modal.className.indexOf('state-error') !== -1) {
            modal.classList.remove('state-error');
          }
          triggers.get(`${target}:success`).click((ev, el, target) => {
            const data = new FormData;
            el.classList.add('state-load');
            data.append('expert_id', expert);
            data.append('text', field.value);
            data.append('rate', rating.get());
            data.append('is_anonym', anon.checked ? 1 : 0);
            query(`${action}?isOpenSite=1`, data)
              .then(data => {
                popover.open('review-success');
              })
              .catch(err => {
                el.classList.remove('state-load');
                modal.classList.add('state-error');
                errorElement.innerHTML = err.message;
              });
          });
        });
      });
    }

    const loadState = (page) => {
      const modelRef = instance.querySelector('[data-model]');
      const modelClone = modelRef.cloneNode(true);
      const items = instance.querySelector('[data-items]');
      instance.classList.add('state-load');
      query(params(actionLoad, { 'expert_id': expertId, 'page': page }))
        .then(data => {
          instance.classList.remove('state-load');
          while (items.children.length) items.children[0].remove();
          data.reviews.forEach((review, index) => {
            const modelInstance = modelClone.cloneNode(true);
            const name = modelInstance.querySelector('[data-name]');
            const date = modelInstance.querySelector('[data-date]');
            const text = modelInstance.querySelector('[data-text]');
            name.textContent = review.nickname;
            date.textContent = dateFormat(new Date(review.dt), 'dmy', '.');
            text.textContent = review.text;
            if (index !== 0) {
              modelInstance.removeAttribute('data-model');
            }
            items.appendChild(modelInstance);
          });
          masonry.build();
        })
    }

    createState();

    pagination.cb(loadState);
  }

}

const updateExperts = (ref = '.cards') => {

  const instance = document.querySelector(ref);
  const instanceList = instance.querySelector('[data-list]');

  const instanceId = instance.getAttribute('data-id');
  const instanceUrl = instance.getAttribute('data-url');

  const cardModel = instance.querySelector('[data-model]');
  const cardModelUrl = cardModel.getAttribute('data-url');

  const cardModelInstance = cardModel.cloneNode(true);
  cardModelInstance.removeAttribute('data-url');
  cardModelInstance.removeAttribute('data-model');

  const dataUpdate = { ids: null };

  // update meta

  const updateMeta = (data) => {
    if (data.length) {
      data.forEach(item => {
        const card = document.querySelector(`[data-card="${item.id}"]`);
        const cardImage = card.querySelector('img');
        const id = Number(card.getAttribute('data-card'));
        const status = card.querySelector('[data-status]');
        const visitors = card.querySelector('[data-visitors]');
        cardImage.src = item.avatarUrl;
        if (status) {
          status.setAttribute('data-status', item.status.type);
          status.textContent = item.status.message
        }
        if (visitors) {
          visitors.textContent = item.clients
        }
      });
    }
  }

  const updateMetaHandler = () => {
    const cards = instanceList.querySelectorAll('[data-card]');
    const cardsIds = [].slice.call(cards).map((item) => Number(item.getAttribute('data-card')));
    dataUpdate.ids = cardsIds;
    return query(
      params(instanceUrl, { isAjax: true }),
      JSON.stringify(dataUpdate)
    ).then(updateMeta);
  };

  const updateMetaInterval = setInterval(updateMetaHandler, 10000);

  // update list

  const fillCard = (card, data) => {
    const cardImage = card.querySelector('img');
    const cardStatus = card.querySelector('[data-status]');
    const cardCost = card.querySelector('[data-cost]');
    const cardVisitors = card.querySelector('[data-visitors]');
    const cardUsername = card.querySelector('[data-username]');
    const cardText = card.querySelector('[data-text]');
    card.setAttribute('data-card', data.user_id);
    card.href = data.url;
    cardImage.src = data.avatarUrl;
    if (cardStatus) {
      cardStatus.setAttribute('data-status', data.status.type);
      cardStatus.textContent = data.status.message;
      cardCost.textContent = data.cost;
      cardVisitors.textContent = data.clients;
    }
    cardUsername.textContent = data.user.nickname;
    cardText.textContent = data.short_about;
    return card;
  };

  const updateCards = (data, type = 'refresh') => {
    data.experts.forEach((item, index) => {
      if (type === 'refresh') {
        const card = instanceList.children[index];
        fillCard(card, item);
      }
      else {
        const card = cardModelInstance.cloneNode(true);
        instanceList.appendChild(fillCard(card, item));
      }
    });
    return data;
  }

  const updateCardsQuery = () => {
    return query(
      params(cardModelUrl, { isAjax: true }),
      JSON.stringify(dataUpdate)
    );
  }

  const updateCardsHandler = (type) => {

    const cards = instanceList.querySelectorAll('[data-card]');
    const cardsIds = [].slice.call(cards).map((item) => Number(item.getAttribute('data-card')));

    dataUpdate.ids = cardsIds;

    if (instanceId) {
      dataUpdate.subject_id = instanceId;
    }

    return updateCardsQuery().then(data => updateCards(data, type));

  }

  const loadElement = document.querySelector('[data-load]');

  let page = 1;

  loadElement && loadElement.addEventListener('click', (e) => {
    e.preventDefault();
    page += 1;
    dataUpdate.page = page;
    updateCardsHandler('load').then(data => !data.is_more && loadElement.remove());
  });

  const updateCardsInterval = setInterval(() => {
    dataUpdate.page = null;
    updateCardsHandler('refresh');
  }, 60000);

}

const moderationButton = () => {
  const form = document.querySelector('form');
  const button = form?.querySelector('[disabled]');
  if (button) {
    const fields = form.querySelectorAll('[required]');
    const requiredData = [].slice.call(fields).map((item) => item.value.length !== 0);
    const requiredCheck = () => {
      return requiredData.every(item => item) ?
        button.removeAttribute('disabled')
      : button.setAttribute('disabled', '');
    };
    requiredCheck();
    fields.forEach((field, index) => {
      field.removeAttribute('required');
      ['change', 'input'].forEach(event => {
        field.addEventListener(event, e => {
          requiredData[index] = field.value.length !== 0;
          requiredCheck();
        });
      });
    });
  }
}

const updateExpertStatus = (ref = '[data-status][data-url]') => {
  const node = document.querySelector(ref);
  if (node) {
    const url = node.getAttribute('data-url');
    const updateStatus = () => {
      query(params(url))
        .then(data => {
          node.setAttribute(
            'data-status',
            data.status.type !== 'offline' ? 'online' : 'offline'
          );
        });
    };
    setInterval(updateStatus, 60000);
  }
}

const notificationsManage = (ref = '[data-notifications-manage]') => {
  const element = document.querySelector(ref);
  const checkboxes = element.querySelectorAll('[type="checkbox"]');
  const handler = (event) => {
    const node = event.target;
    const type = node.id;

    if (type === 'off' && node.checked) {
      checkboxes.forEach((checkbox) => {
        if (checkbox !== node) {
          checkbox.checked = false;
        }
      });
      return;
    }

    checkboxes[checkboxes.length - 1].checked = false;
  };

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', handler);
  });
}

const adWidget = () => {
  const element = document.querySelector('[data-ad-widget]');
  if (element) {
    const link = element.querySelector('[data-link]');
    const linkUrl = link.querySelector('[data-link-url]');
    const linkUrlBefore = linkUrl.getAttribute('data-before');
    const linkUrlAfter = linkUrl.getAttribute('data-after');
    const linkInput = link.querySelector('[type="hidden"]');

    let linkUrlContent = linkUrl.textContent;

    const setLink = (type, value) => {
      linkUrlContent = linkUrlContent.replace(linkUrlBefore, '').replace(linkUrlAfter, '');
      linkUrl.textContent = linkUrlBefore + params(linkUrlContent, { [type]: value }) + linkUrlAfter;
      linkInput.value = linkUrl.textContent;
      linkUrlContent = linkUrl.textContent;
    }

    const setTitle = () => {
      const inputTitle = element.querySelector('[id="title"]');
      const previewTitle = element.querySelector('[data-title]');
      const handler = (() => (e) => {
        const value = e.target.value.replace(/\n/g, '<br>');

        if (value.length) {
          previewTitle.classList.add('state-active');
          previewTitle.innerHTML = value;

          setLink('title', encodeURIComponent(e.target.value));
        }
        else {
          const placeholder = previewTitle.getAttribute('data-title');

          previewTitle.innerHTML = placeholder;

          if (!placeholder.length) {
            previewTitle.classList.remove('state-active');
          }

          setLink('title', encodeURIComponent(placeholder));
        }
      })();

      inputTitle.addEventListener('input', handler);
    };

    const setWidth = () => {
      const inputWidth = element.querySelector('[id="width"]');
      const handler = (() => (e) => {
        if (!!!Number(e.target.value)) {
          e.target.value = e.target.value.replace(/[^\d+]/, '');
        }

        const value = e.target.value;

        if (value.length) {
          setLink('width', value);
        }
        else {
          setLink('width', inputWidth.placeholder);
        }
      })();

      inputWidth.addEventListener('input', handler);
    };

    const setSelects = () => {
      select('.select', (output, input) => {
        if (output.tagName !== 'INPUT') {
          const attr = input.getAttribute('data-option');
          const selectElement = input.closest('[data-select-choice]');
          const type = selectElement.getAttribute('data-select-choice');

          setLink(type, attr);
        }
      });
    };

    setTitle();
    setWidth();
    setSelects();
  }
}

// routes

router.get('cards', () => {
  updateExperts();
});

router.get('content', () => {
  fancybox({ touch: false });
  modals('[data-fancybox]');
  expandSpoiler();
  photoModal();
  //photoModal('[data-fancybox*="photo"]');
  videoModal('[data-fancybox*="video"]');
  review();
  updateExpertStatus();
});

router.get('calendar', () => {
  updateExpertStatus();
});

router.get('database', () => {
  focusField();
  expand();
  search('[data-search]', '[data-search-trigger]');
  dataBaseExpand();
});

router.get('user', () => {
  focusField();
  date('#date');
  dateMask('#date');
  phoneMask('[type="tel"]');
  select('.select');
  codeField('[data-approve]', '[data-state]');
  uploadFile();
});

router.get('user:profile', () => {
  focusField();
  codeField('[data-approve]', '[data-state]');
  phoneMask('[type="tel"]');
  uploadFile();
  new ManageItems({ ns: '.files', type: 'files' });
  moderationButton();
});

router.get('user:notifications', () => {
  notificationsManage();
});

router.get('user:payout', () => {
  fieldMoney();
  fieldTax();
  fieldCancel();
  tableSortable();
});

router.get('user:ads', () => {
  copyLink();
  adWidget();
});

router.get('user:subjects', () => {
  selectChoice();
  choice();
  selectChoice();
});

router.get('user:stat', () => {
  copyLink();
  tableSortable();
  stats();
});

router.get('user:docs', () => {
  selectChoice();
  exchange();
  uploadFile();
});

router.get('user:history', () => {
  rangeField();
});

router.get('user:courses', () => {
  select('.select');
  uploadFile();
  tableSortable();
  new ManageItems({ ns: '.manage', type: 'documents' });
  new ManageItems({ ns: '.files', type: 'files' });
  moderationButton();
});

router.get('service', () => {
  new ManageItems({ ns: '.files', type: 'files' });
});


router.get('user-card', () => {
  userCard('card-number', 'card-expire', 'card-holder', 'card-code');
  select('.select', userCardSelect);
});

router.get('user-cards', () => {
  editCard('[data-card]');
});

router.get('login', () => {
  login('#login-form', '#code-form', '#verify-form');
});
