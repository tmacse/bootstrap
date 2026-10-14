function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, e) { if ("object" != typeof t || !t) return t; var r; if ("undefined" != typeof Symbol && void 0 !== (r = t[Symbol.toPrimitive])) { var i = r.call(t, e || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === e ? String : Number)(t); }
/**
 * --------------------------------------------------------------------------
 * Bootstrap (v4.0.0): tooltip.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * --------------------------------------------------------------------------
 */

var Tooltip = function ($) {
  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.3.1): tools/sanitizer.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */
  var uriAttrs = ['background', 'cite', 'href', 'itemtype', 'longdesc', 'poster', 'src', 'xlink:href'];
  var ARIA_ATTRIBUTE_PATTERN = /^aria-[\w-]*$/i;
  var DefaultWhitelist = {
    '*': ['class', 'dir', 'id', 'lang', 'role', ARIA_ATTRIBUTE_PATTERN],
    a: ['target', 'href', 'title', 'rel'],
    area: [],
    b: [],
    br: [],
    col: [],
    code: [],
    div: [],
    em: [],
    hr: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    i: [],
    img: ['src', 'alt', 'title', 'width', 'height'],
    li: [],
    ol: [],
    p: [],
    pre: [],
    s: [],
    small: [],
    span: [],
    sub: [],
    sup: [],
    strong: [],
    u: [],
    ul: []
  };
  var SAFE_URL_PATTERN = /^(?:(?:https?|mailto|ftp|tel|file):|[^&:/?#]*(?:[/?#]|$))/gi;
  var DATA_URL_PATTERN = /^data:(?:image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp)|video\/(?:mpeg|mp4|ogg|webm)|audio\/(?:mp3|oga|ogg|opus));base64,[a-z0-9+/]+=*$/i;
  function allowedAttribute(attr, allowedAttributeList) {
    var attrName = attr.nodeName.toLowerCase();
    if (allowedAttributeList.indexOf(attrName) !== -1) {
      if (uriAttrs.indexOf(attrName) !== -1) {
        return Boolean(attr.nodeValue.match(SAFE_URL_PATTERN) || attr.nodeValue.match(DATA_URL_PATTERN));
      }
      return true;
    }
    var regExp = allowedAttributeList.filter(function (attrRegex) {
      return attrRegex instanceof RegExp;
    });
    for (var i = 0, l = regExp.length; i < l; i++) {
      if (attrName.match(regExp[i])) {
        return true;
      }
    }
    return false;
  }
  function sanitizeHtml(unsafeHtml, whiteList, sanitizeFn) {
    if (unsafeHtml.length === 0) {
      return unsafeHtml;
    }
    if (sanitizeFn && typeof sanitizeFn === 'function') {
      return sanitizeFn(unsafeHtml);
    }
    var domParser = new window.DOMParser();
    var createdDocument = domParser.parseFromString(unsafeHtml, 'text/html');
    var whitelistKeys = Object.keys(whiteList);
    var elements = [].slice.call(createdDocument.body.querySelectorAll('*'));
    var _loop = function _loop() {
      var el = elements[i];
      var elName = el.nodeName.toLowerCase();
      if (whitelistKeys.indexOf(el.nodeName.toLowerCase()) === -1) {
        el.parentNode.removeChild(el);
        return 1;
      }
      var attributeList = [].slice.call(el.attributes);
      var whitelistedAttributes = [].concat(whiteList['*'] || [], whiteList[elName] || []);
      attributeList.forEach(function (attr) {
        if (!allowedAttribute(attr, whitelistedAttributes)) {
          el.removeAttribute(attr.nodeName);
        }
      });
    };
    for (var i = 0, len = elements.length; i < len; i++) {
      if (_loop()) continue;
    }
    return createdDocument.body.innerHTML;
  }
  var DISALLOWED_ATTRIBUTES = ['sanitize', 'whiteList', 'sanitizeFn'];
  var NAME = 'tooltip';
  var VERSION = '4.0.0';
  var DATA_KEY = 'bs.tooltip';
  var EVENT_KEY = "." + DATA_KEY;
  var JQUERY_NO_CONFLICT = $.fn[NAME];
  var CLASS_PREFIX = 'bs-tooltip';
  var BSCLS_PREFIX_REGEX = new RegExp("(^|\\s)" + CLASS_PREFIX + "\\S+", 'g');
  var DefaultType = {
    animation: 'boolean',
    template: 'string',
    title: '(string|element|function)',
    trigger: 'string',
    delay: '(number|object)',
    html: 'boolean',
    selector: '(string|boolean)',
    placement: '(string|function)',
    offset: '(number|string)',
    container: '(string|element|boolean)',
    fallbackPlacement: '(string|array)',
    boundary: '(string|element)',
    sanitize: 'boolean',
    sanitizeFn: '(null|function)',
    whiteList: 'object'
  };
  var AttachmentMap = {
    AUTO: 'auto',
    TOP: 'top',
    RIGHT: 'right',
    BOTTOM: 'bottom',
    LEFT: 'left'
  };
  var Default = {
    animation: true,
    template: '<div class="tooltip" role="tooltip">' + '<div class="arrow"></div>' + '<div class="tooltip-inner"></div></div>',
    trigger: 'hover focus',
    title: '',
    delay: 0,
    html: false,
    selector: false,
    placement: 'top',
    offset: 0,
    container: false,
    fallbackPlacement: 'flip',
    boundary: 'scrollParent',
    sanitize: true,
    sanitizeFn: null,
    whiteList: DefaultWhitelist
  };
  var HoverState = {
    SHOW: 'show',
    OUT: 'out'
  };
  var Event = {
    HIDE: "hide" + EVENT_KEY,
    HIDDEN: "hidden" + EVENT_KEY,
    SHOW: "show" + EVENT_KEY,
    SHOWN: "shown" + EVENT_KEY,
    INSERTED: "inserted" + EVENT_KEY,
    CLICK: "click" + EVENT_KEY,
    FOCUSIN: "focusin" + EVENT_KEY,
    FOCUSOUT: "focusout" + EVENT_KEY,
    MOUSEENTER: "mouseenter" + EVENT_KEY,
    MOUSELEAVE: "mouseleave" + EVENT_KEY
  };
  var ClassName = {
    FADE: 'fade',
    SHOW: 'show'
  };
  var Selector = {
    TOOLTIP: '.tooltip',
    TOOLTIP_INNER: '.tooltip-inner',
    ARROW: '.arrow'
  };
  var Trigger = {
    HOVER: 'hover',
    FOCUS: 'focus',
    CLICK: 'click',
    MANUAL: 'manual'
  };
  var Tooltip = function () {
    function Tooltip(element, config) {
      if (typeof Popper === 'undefined') {
        throw new TypeError('Bootstrap tooltips require Popper.js (https://popper.js.org)');
      }
      this._isEnabled = true;
      this._timeout = 0;
      this._hoverState = '';
      this._activeTrigger = {};
      this._popper = null;
      this.element = element;
      this.config = this._getConfig(config);
      this.tip = null;
      this._setListeners();
    }
    var _proto = Tooltip.prototype;
    _proto.enable = function enable() {
      this._isEnabled = true;
    };
    _proto.disable = function disable() {
      this._isEnabled = false;
    };
    _proto.toggleEnabled = function toggleEnabled() {
      this._isEnabled = !this._isEnabled;
    };
    _proto.toggle = function toggle(event) {
      if (!this._isEnabled) {
        return;
      }
      if (event) {
        var dataKey = this.constructor.DATA_KEY;
        var context = $(event.currentTarget).data(dataKey);
        if (!context) {
          context = new this.constructor(event.currentTarget, this._getDelegateConfig());
          $(event.currentTarget).data(dataKey, context);
        }
        context._activeTrigger.click = !context._activeTrigger.click;
        if (context._isWithActiveTrigger()) {
          context._enter(null, context);
        } else {
          context._leave(null, context);
        }
      } else {
        if ($(this.getTipElement()).hasClass(ClassName.SHOW)) {
          this._leave(null, this);
          return;
        }
        this._enter(null, this);
      }
    };
    _proto.dispose = function dispose() {
      clearTimeout(this._timeout);
      $.removeData(this.element, this.constructor.DATA_KEY);
      $(this.element).off(this.constructor.EVENT_KEY);
      $(this.element).closest('.modal').off('hide.bs.modal');
      if (this.tip) {
        $(this.tip).remove();
      }
      this._isEnabled = null;
      this._timeout = null;
      this._hoverState = null;
      this._activeTrigger = null;
      if (this._popper !== null) {
        this._popper.destroy();
      }
      this._popper = null;
      this.element = null;
      this.config = null;
      this.tip = null;
    };
    _proto.show = function show() {
      var _this = this;
      if ($(this.element).css('display') === 'none') {
        throw new Error('Please use show on visible elements');
      }
      var showEvent = $.Event(this.constructor.Event.SHOW);
      if (this.isWithContent() && this._isEnabled) {
        $(this.element).trigger(showEvent);
        var isInTheDom = $.contains(this.element.ownerDocument.documentElement, this.element);
        if (showEvent.isDefaultPrevented() || !isInTheDom) {
          return;
        }
        var tip = this.getTipElement();
        var tipId = Util.getUID(this.constructor.NAME);
        tip.setAttribute('id', tipId);
        this.element.setAttribute('aria-describedby', tipId);
        this.setContent();
        if (this.config.animation) {
          $(tip).addClass(ClassName.FADE);
        }
        var placement = typeof this.config.placement === 'function' ? this.config.placement.call(this, tip, this.element) : this.config.placement;
        var attachment = this._getAttachment(placement);
        this.addAttachmentClass(attachment);
        var container = document.body;
        if (this.config.container !== false) {
          container = Util.isElement(this.config.container) ? $(this.config.container) : $(document).find(this.config.container);
        }
        $(tip).data(this.constructor.DATA_KEY, this);
        if (!$.contains(this.element.ownerDocument.documentElement, this.tip)) {
          $(tip).appendTo(container);
        }
        $(this.element).trigger(this.constructor.Event.INSERTED);
        this._popper = new Popper(this.element, tip, {
          placement: attachment,
          modifiers: {
            offset: {
              offset: this.config.offset
            },
            flip: {
              behavior: this.config.fallbackPlacement
            },
            arrow: {
              element: Selector.ARROW
            },
            preventOverflow: {
              boundariesElement: this.config.boundary
            }
          },
          onCreate: function onCreate(data) {
            if (data.originalPlacement !== data.placement) {
              _this._handlePopperPlacementChange(data);
            }
          },
          onUpdate: function onUpdate(data) {
            _this._handlePopperPlacementChange(data);
          }
        });
        $(tip).addClass(ClassName.SHOW);
        if ('ontouchstart' in document.documentElement) {
          $(document.body).children().on('mouseover', null, $.noop);
        }
        var complete = function complete() {
          if (_this.config.animation) {
            _this._fixTransition();
          }
          var prevHoverState = _this._hoverState;
          _this._hoverState = null;
          $(_this.element).trigger(_this.constructor.Event.SHOWN);
          if (prevHoverState === HoverState.OUT) {
            _this._leave(null, _this);
          }
        };
        if ($(this.tip).hasClass(ClassName.FADE)) {
          var transitionDuration = Util.getTransitionDurationFromElement(this.tip);
          $(this.tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
        } else {
          complete();
        }
      }
    };
    _proto.hide = function hide(callback) {
      var _this2 = this;
      var tip = this.getTipElement();
      var hideEvent = $.Event(this.constructor.Event.HIDE);
      var complete = function complete() {
        if (_this2._hoverState !== HoverState.SHOW && tip.parentNode) {
          tip.parentNode.removeChild(tip);
        }
        _this2._cleanTipClass();
        _this2.element.removeAttribute('aria-describedby');
        $(_this2.element).trigger(_this2.constructor.Event.HIDDEN);
        if (_this2._popper !== null) {
          _this2._popper.destroy();
        }
        if (callback) {
          callback();
        }
      };
      $(this.element).trigger(hideEvent);
      if (hideEvent.isDefaultPrevented()) {
        return;
      }
      $(tip).removeClass(ClassName.SHOW);
      if ('ontouchstart' in document.documentElement) {
        $(document.body).children().off('mouseover', null, $.noop);
      }
      this._activeTrigger[Trigger.CLICK] = false;
      this._activeTrigger[Trigger.FOCUS] = false;
      this._activeTrigger[Trigger.HOVER] = false;
      if ($(this.tip).hasClass(ClassName.FADE)) {
        var transitionDuration = Util.getTransitionDurationFromElement(tip);
        $(tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
      } else {
        complete();
      }
      this._hoverState = '';
    };
    _proto.update = function update() {
      if (this._popper !== null) {
        this._popper.scheduleUpdate();
      }
    };
    _proto.isWithContent = function isWithContent() {
      return Boolean(this.getTitle());
    };
    _proto.addAttachmentClass = function addAttachmentClass(attachment) {
      $(this.getTipElement()).addClass(CLASS_PREFIX + "-" + attachment);
    };
    _proto.getTipElement = function getTipElement() {
      this.tip = this.tip || $(this.config.template)[0];
      return this.tip;
    };
    _proto.setContent = function setContent() {
      var $tip = $(this.getTipElement());
      this.setElementContent($tip.find(Selector.TOOLTIP_INNER), this.getTitle());
      $tip.removeClass(ClassName.FADE + " " + ClassName.SHOW);
    };
    _proto.setElementContent = function setElementContent($element, content) {
      var html = this.config.html;
      if (typeof content === 'object' && (content.nodeType || content.jquery)) {
        if (html) {
          if (!$(content).parent().is($element)) {
            $element.empty().append(content);
          }
        } else {
          $element.text($(content).text());
        }
      } else {
        if (html && this.config.sanitize) {
          content = sanitizeHtml(content, this.config.whiteList, this.config.sanitizeFn);
        }
        $element[html ? 'html' : 'text'](content);
      }
    };
    _proto.getTitle = function getTitle() {
      var title = this.element.getAttribute('data-original-title');
      if (!title) {
        title = typeof this.config.title === 'function' ? this.config.title.call(this.element) : this.config.title;
      }
      return title;
    };
    _proto._getAttachment = function _getAttachment(placement) {
      return AttachmentMap[placement.toUpperCase()];
    };
    _proto._setListeners = function _setListeners() {
      var _this3 = this;
      var triggers = this.config.trigger.split(' ');
      triggers.forEach(function (trigger) {
        if (trigger === 'click') {
          $(_this3.element).on(_this3.constructor.Event.CLICK, _this3.config.selector, function (event) {
            return _this3.toggle(event);
          });
        } else if (trigger !== Trigger.MANUAL) {
          var eventIn = trigger === Trigger.HOVER ? _this3.constructor.Event.MOUSEENTER : _this3.constructor.Event.FOCUSIN;
          var eventOut = trigger === Trigger.HOVER ? _this3.constructor.Event.MOUSELEAVE : _this3.constructor.Event.FOCUSOUT;
          $(_this3.element).on(eventIn, _this3.config.selector, function (event) {
            return _this3._enter(event);
          }).on(eventOut, _this3.config.selector, function (event) {
            return _this3._leave(event);
          });
        }
        $(_this3.element).closest('.modal').on('hide.bs.modal', function () {
          return _this3.hide();
        });
      });
      if (this.config.selector) {
        this.config = _extends({}, this.config, {
          trigger: 'manual',
          selector: ''
        });
      } else {
        this._fixTitle();
      }
    };
    _proto._fixTitle = function _fixTitle() {
      var titleType = typeof this.element.getAttribute('data-original-title');
      if (this.element.getAttribute('title') || titleType !== 'string') {
        this.element.setAttribute('data-original-title', this.element.getAttribute('title') || '');
        this.element.setAttribute('title', '');
      }
    };
    _proto._enter = function _enter(event, context) {
      var dataKey = this.constructor.DATA_KEY;
      context = context || $(event.currentTarget).data(dataKey);
      if (!context) {
        context = new this.constructor(event.currentTarget, this._getDelegateConfig());
        $(event.currentTarget).data(dataKey, context);
      }
      if (event) {
        context._activeTrigger[event.type === 'focusin' ? Trigger.FOCUS : Trigger.HOVER] = true;
      }
      if ($(context.getTipElement()).hasClass(ClassName.SHOW) || context._hoverState === HoverState.SHOW) {
        context._hoverState = HoverState.SHOW;
        return;
      }
      clearTimeout(context._timeout);
      context._hoverState = HoverState.SHOW;
      if (!context.config.delay || !context.config.delay.show) {
        context.show();
        return;
      }
      context._timeout = setTimeout(function () {
        if (context._hoverState === HoverState.SHOW) {
          context.show();
        }
      }, context.config.delay.show);
    };
    _proto._leave = function _leave(event, context) {
      var dataKey = this.constructor.DATA_KEY;
      context = context || $(event.currentTarget).data(dataKey);
      if (!context) {
        context = new this.constructor(event.currentTarget, this._getDelegateConfig());
        $(event.currentTarget).data(dataKey, context);
      }
      if (event) {
        context._activeTrigger[event.type === 'focusout' ? Trigger.FOCUS : Trigger.HOVER] = false;
      }
      if (context._isWithActiveTrigger()) {
        return;
      }
      clearTimeout(context._timeout);
      context._hoverState = HoverState.OUT;
      if (!context.config.delay || !context.config.delay.hide) {
        context.hide();
        return;
      }
      context._timeout = setTimeout(function () {
        if (context._hoverState === HoverState.OUT) {
          context.hide();
        }
      }, context.config.delay.hide);
    };
    _proto._isWithActiveTrigger = function _isWithActiveTrigger() {
      for (var trigger in this._activeTrigger) {
        if (this._activeTrigger[trigger]) {
          return true;
        }
      }
      return false;
    };
    _proto._getConfig = function _getConfig(config) {
      var dataAttributes = _extends({}, $(this.element).data());
      DISALLOWED_ATTRIBUTES.forEach(function (attribute) {
        delete dataAttributes[attribute];
      });
      config = _extends({}, this.constructor.Default, dataAttributes, config);
      if (typeof config.delay === 'number') {
        config.delay = {
          show: config.delay,
          hide: config.delay
        };
      }
      if (typeof config.title === 'number') {
        config.title = config.title.toString();
      }
      if (typeof config.content === 'number') {
        config.content = config.content.toString();
      }
      Util.typeCheckConfig(NAME, config, this.constructor.DefaultType);
      if (config.sanitize) {
        config.template = sanitizeHtml(config.template, config.whiteList, config.sanitizeFn);
      }
      return config;
    };
    _proto._getDelegateConfig = function _getDelegateConfig() {
      var config = {};
      if (this.config) {
        for (var key in this.config) {
          if (this.constructor.Default[key] !== this.config[key]) {
            config[key] = this.config[key];
          }
        }
      }
      return config;
    };
    _proto._cleanTipClass = function _cleanTipClass() {
      var $tip = $(this.getTipElement());
      var tabClass = $tip.attr('class').match(BSCLS_PREFIX_REGEX);
      if (tabClass !== null && tabClass.length > 0) {
        $tip.removeClass(tabClass.join(''));
      }
    };
    _proto._handlePopperPlacementChange = function _handlePopperPlacementChange(data) {
      this._cleanTipClass();
      this.addAttachmentClass(this._getAttachment(data.placement));
    };
    _proto._fixTransition = function _fixTransition() {
      var tip = this.getTipElement();
      var initConfigAnimation = this.config.animation;
      if (tip.getAttribute('x-placement') !== null) {
        return;
      }
      $(tip).removeClass(ClassName.FADE);
      this.config.animation = false;
      this.hide();
      this.show();
      this.config.animation = initConfigAnimation;
    };
    Tooltip._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY);
        var _config = typeof config === 'object' && config;
        if (!data && /dispose|hide/.test(config)) {
          return;
        }
        if (!data) {
          data = new Tooltip(this, _config);
          $(this).data(DATA_KEY, data);
        }
        if (typeof config === 'string') {
          if (typeof data[config] === 'undefined') {
            throw new TypeError("No method named \"" + config + "\"");
          }
          data[config]();
        }
      });
    };
    return _createClass(Tooltip, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION;
      }
    }, {
      key: "Default",
      get: function get() {
        return Default;
      }
    }, {
      key: "NAME",
      get: function get() {
        return NAME;
      }
    }, {
      key: "DATA_KEY",
      get: function get() {
        return DATA_KEY;
      }
    }, {
      key: "Event",
      get: function get() {
        return Event;
      }
    }, {
      key: "EVENT_KEY",
      get: function get() {
        return EVENT_KEY;
      }
    }, {
      key: "DefaultType",
      get: function get() {
        return DefaultType;
      }
    }]);
  }();
  $.fn[NAME] = Tooltip._jQueryInterface;
  $.fn[NAME].Constructor = Tooltip;
  $.fn[NAME].noConflict = function () {
    $.fn[NAME] = JQUERY_NO_CONFLICT;
    return Tooltip._jQueryInterface;
  };
  return Tooltip;
}($, Popper);
//# sourceMappingURL=tooltip.js.map