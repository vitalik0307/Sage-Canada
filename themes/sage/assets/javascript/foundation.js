'use strict';

!function ($) {

  "use strict";

  var FOUNDATION_VERSION = '6.3.1';

  // Global Foundation object
  // This is attached to the window, or used as a module for AMD/Browserify
  var Foundation = {
    version: FOUNDATION_VERSION,

    /**
     * Stores initialized plugins.
     */
    _plugins: {},

    /**
     * Stores generated unique ids for plugin instances
     */
    _uuids: [],

    /**
     * Returns a boolean for RTL support
     */
    rtl: function () {
      return $('html').attr('dir') === 'rtl';
    },
    /**
     * Defines a Foundation plugin, adding it to the `Foundation` namespace and the list of plugins to initialize when reflowing.
     * @param {Object} plugin - The constructor of the plugin.
     */
    plugin: function (plugin, name) {
      // Object key to use when adding to global Foundation object
      // Examples: Foundation.Reveal, Foundation.OffCanvas
      var className = name || functionName(plugin);
      // Object key to use when storing the plugin, also used to create the identifying data attribute for the plugin
      // Examples: data-reveal, data-off-canvas
      var attrName = hyphenate(className);

      // Add to the Foundation object and the plugins list (for reflowing)
      this._plugins[attrName] = this[className] = plugin;
    },
    /**
     * @function
     * Populates the _uuids array with pointers to each individual plugin instance.
     * Adds the `zfPlugin` data-attribute to programmatically created plugins to allow use of $(selector).foundation(method) calls.
     * Also fires the initialization event for each plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @param {String} name - the name of the plugin, passed as a camelCased string.
     * @fires Plugin#init
     */
    registerPlugin: function (plugin, name) {
      var pluginName = name ? hyphenate(name) : functionName(plugin.constructor).toLowerCase();
      plugin.uuid = this.GetYoDigits(6, pluginName);

      if (!plugin.$element.attr('data-' + pluginName)) {
        plugin.$element.attr('data-' + pluginName, plugin.uuid);
      }
      if (!plugin.$element.data('zfPlugin')) {
        plugin.$element.data('zfPlugin', plugin);
      }
      /**
       * Fires when the plugin has initialized.
       * @event Plugin#init
       */
      plugin.$element.trigger('init.zf.' + pluginName);

      this._uuids.push(plugin.uuid);

      return;
    },
    /**
     * @function
     * Removes the plugins uuid from the _uuids array.
     * Removes the zfPlugin data attribute, as well as the data-plugin-name attribute.
     * Also fires the destroyed event for the plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @fires Plugin#destroyed
     */
    unregisterPlugin: function (plugin) {
      var pluginName = hyphenate(functionName(plugin.$element.data('zfPlugin').constructor));

      this._uuids.splice(this._uuids.indexOf(plugin.uuid), 1);
      plugin.$element.removeAttr('data-' + pluginName).removeData('zfPlugin')
      /**
       * Fires when the plugin has been destroyed.
       * @event Plugin#destroyed
       */
      .trigger('destroyed.zf.' + pluginName);
      for (var prop in plugin) {
        plugin[prop] = null; //clean up script to prep for garbage collection.
      }
      return;
    },

    /**
     * @function
     * Causes one or more active plugins to re-initialize, resetting event listeners, recalculating positions, etc.
     * @param {String} plugins - optional string of an individual plugin key, attained by calling `$(element).data('pluginName')`, or string of a plugin class i.e. `'dropdown'`
     * @default If no argument is passed, reflow all currently active plugins.
     */
    reInit: function (plugins) {
      var isJQ = plugins instanceof $;
      try {
        if (isJQ) {
          plugins.each(function () {
            $(this).data('zfPlugin')._init();
          });
        } else {
          var type = typeof plugins,
              _this = this,
              fns = {
            'object': function (plgs) {
              plgs.forEach(function (p) {
                p = hyphenate(p);
                $('[data-' + p + ']').foundation('_init');
              });
            },
            'string': function () {
              plugins = hyphenate(plugins);
              $('[data-' + plugins + ']').foundation('_init');
            },
            'undefined': function () {
              this['object'](Object.keys(_this._plugins));
            }
          };
          fns[type](plugins);
        }
      } catch (err) {
        console.error(err);
      } finally {
        return plugins;
      }
    },

    /**
     * returns a random base-36 uid with namespacing
     * @function
     * @param {Number} length - number of random base-36 digits desired. Increase for more random strings.
     * @param {String} namespace - name of plugin to be incorporated in uid, optional.
     * @default {String} '' - if no plugin name is provided, nothing is appended to the uid.
     * @returns {String} - unique id
     */
    GetYoDigits: function (length, namespace) {
      length = length || 6;
      return Math.round(Math.pow(36, length + 1) - Math.random() * Math.pow(36, length)).toString(36).slice(1) + (namespace ? '-' + namespace : '');
    },
    /**
     * Initialize plugins on any elements within `elem` (and `elem` itself) that aren't already initialized.
     * @param {Object} elem - jQuery object containing the element to check inside. Also checks the element itself, unless it's the `document` object.
     * @param {String|Array} plugins - A list of plugins to initialize. Leave this out to initialize everything.
     */
    reflow: function (elem, plugins) {

      // If plugins is undefined, just grab everything
      if (typeof plugins === 'undefined') {
        plugins = Object.keys(this._plugins);
      }
      // If plugins is a string, convert it to an array with one item
      else if (typeof plugins === 'string') {
          plugins = [plugins];
        }

      var _this = this;

      // Iterate through each plugin
      $.each(plugins, function (i, name) {
        // Get the current plugin
        var plugin = _this._plugins[name];

        // Localize the search to all elements inside elem, as well as elem itself, unless elem === document
        var $elem = $(elem).find('[data-' + name + ']').addBack('[data-' + name + ']');

        // For each plugin found, initialize it
        $elem.each(function () {
          var $el = $(this),
              opts = {};
          // Don't double-dip on plugins
          if ($el.data('zfPlugin')) {
            console.warn("Tried to initialize " + name + " on an element that already has a Foundation plugin.");
            return;
          }

          if ($el.attr('data-options')) {
            var thing = $el.attr('data-options').split(';').forEach(function (e, i) {
              var opt = e.split(':').map(function (el) {
                return el.trim();
              });
              if (opt[0]) opts[opt[0]] = parseValue(opt[1]);
            });
          }
          try {
            $el.data('zfPlugin', new plugin($(this), opts));
          } catch (er) {
            console.error(er);
          } finally {
            return;
          }
        });
      });
    },
    getFnName: functionName,
    transitionend: function ($elem) {
      var transitions = {
        'transition': 'transitionend',
        'WebkitTransition': 'webkitTransitionEnd',
        'MozTransition': 'transitionend',
        'OTransition': 'otransitionend'
      };
      var elem = document.createElement('div'),
          end;

      for (var t in transitions) {
        if (typeof elem.style[t] !== 'undefined') {
          end = transitions[t];
        }
      }
      if (end) {
        return end;
      } else {
        end = setTimeout(function () {
          $elem.triggerHandler('transitionend', [$elem]);
        }, 1);
        return 'transitionend';
      }
    }
  };

  Foundation.util = {
    /**
     * Function for applying a debounce effect to a function call.
     * @function
     * @param {Function} func - Function to be called at end of timeout.
     * @param {Number} delay - Time in ms to delay the call of `func`.
     * @returns function
     */
    throttle: function (func, delay) {
      var timer = null;

      return function () {
        var context = this,
            args = arguments;

        if (timer === null) {
          timer = setTimeout(function () {
            func.apply(context, args);
            timer = null;
          }, delay);
        }
      };
    }
  };

  // TODO: consider not making this a jQuery function
  // TODO: need way to reflow vs. re-initialize
  /**
   * The Foundation jQuery method.
   * @param {String|Array} method - An action to perform on the current jQuery object.
   */
  var foundation = function (method) {
    var type = typeof method,
        $meta = $('meta.foundation-mq'),
        $noJS = $('.no-js');

    if (!$meta.length) {
      $('<meta class="foundation-mq">').appendTo(document.head);
    }
    if ($noJS.length) {
      $noJS.removeClass('no-js');
    }

    if (type === 'undefined') {
      //needs to initialize the Foundation object, or an individual plugin.
      Foundation.MediaQuery._init();
      Foundation.reflow(this);
    } else if (type === 'string') {
      //an individual method to invoke on a plugin or group of plugins
      var args = Array.prototype.slice.call(arguments, 1); //collect all the arguments, if necessary
      var plugClass = this.data('zfPlugin'); //determine the class of plugin

      if (plugClass !== undefined && plugClass[method] !== undefined) {
        //make sure both the class and method exist
        if (this.length === 1) {
          //if there's only one, call it directly.
          plugClass[method].apply(plugClass, args);
        } else {
          this.each(function (i, el) {
            //otherwise loop through the jQuery collection and invoke the method on each
            plugClass[method].apply($(el).data('zfPlugin'), args);
          });
        }
      } else {
        //error for no class or no method
        throw new ReferenceError("We're sorry, '" + method + "' is not an available method for " + (plugClass ? functionName(plugClass) : 'this element') + '.');
      }
    } else {
      //error for invalid argument type
      throw new TypeError('We\'re sorry, ' + type + ' is not a valid parameter. You must use a string representing the method you wish to invoke.');
    }
    return this;
  };

  window.Foundation = Foundation;
  $.fn.foundation = foundation;

  // Polyfill for requestAnimationFrame
  (function () {
    if (!Date.now || !window.Date.now) window.Date.now = Date.now = function () {
      return new Date().getTime();
    };

    var vendors = ['webkit', 'moz'];
    for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
      var vp = vendors[i];
      window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
    }
    if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
      var lastTime = 0;
      window.requestAnimationFrame = function (callback) {
        var now = Date.now();
        var nextTime = Math.max(lastTime + 16, now);
        return setTimeout(function () {
          callback(lastTime = nextTime);
        }, nextTime - now);
      };
      window.cancelAnimationFrame = clearTimeout;
    }
    /**
     * Polyfill for performance.now, required by rAF
     */
    if (!window.performance || !window.performance.now) {
      window.performance = {
        start: Date.now(),
        now: function () {
          return Date.now() - this.start;
        }
      };
    }
  })();
  if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
      if (typeof this !== 'function') {
        // closest thing possible to the ECMAScript 5
        // internal IsCallable function
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
      }

      var aArgs = Array.prototype.slice.call(arguments, 1),
          fToBind = this,
          fNOP = function () {},
          fBound = function () {
        return fToBind.apply(this instanceof fNOP ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
      };

      if (this.prototype) {
        // native functions don't have a prototype
        fNOP.prototype = this.prototype;
      }
      fBound.prototype = new fNOP();

      return fBound;
    };
  }
  // Polyfill to get the name of a function in IE9
  function functionName(fn) {
    if (Function.prototype.name === undefined) {
      var funcNameRegex = /function\s([^(]{1,})\(/;
      var results = funcNameRegex.exec(fn.toString());
      return results && results.length > 1 ? results[1].trim() : "";
    } else if (fn.prototype === undefined) {
      return fn.constructor.name;
    } else {
      return fn.prototype.constructor.name;
    }
  }
  function parseValue(str) {
    if ('true' === str) return true;else if ('false' === str) return false;else if (!isNaN(str * 1)) return parseFloat(str);
    return str;
  }
  // Convert PascalCase to kebab-case
  // Thank you: http://stackoverflow.com/a/8955580
  function hyphenate(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}(jQuery);
;'use strict';

!function ($) {

  Foundation.Box = {
    ImNotTouchingYou: ImNotTouchingYou,
    GetDimensions: GetDimensions,
    GetOffsets: GetOffsets
  };

  /**
   * Compares the dimensions of an element to a container and determines collision events with container.
   * @function
   * @param {jQuery} element - jQuery object to test for collisions.
   * @param {jQuery} parent - jQuery object to use as bounding container.
   * @param {Boolean} lrOnly - set to true to check left and right values only.
   * @param {Boolean} tbOnly - set to true to check top and bottom values only.
   * @default if no parent object passed, detects collisions with `window`.
   * @returns {Boolean} - true if collision free, false if a collision in any direction.
   */
  function ImNotTouchingYou(element, parent, lrOnly, tbOnly) {
    var eleDims = GetDimensions(element),
        top,
        bottom,
        left,
        right;

    if (parent) {
      var parDims = GetDimensions(parent);

      bottom = eleDims.offset.top + eleDims.height <= parDims.height + parDims.offset.top;
      top = eleDims.offset.top >= parDims.offset.top;
      left = eleDims.offset.left >= parDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= parDims.width + parDims.offset.left;
    } else {
      bottom = eleDims.offset.top + eleDims.height <= eleDims.windowDims.height + eleDims.windowDims.offset.top;
      top = eleDims.offset.top >= eleDims.windowDims.offset.top;
      left = eleDims.offset.left >= eleDims.windowDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= eleDims.windowDims.width;
    }

    var allDirs = [bottom, top, left, right];

    if (lrOnly) {
      return left === right === true;
    }

    if (tbOnly) {
      return top === bottom === true;
    }

    return allDirs.indexOf(false) === -1;
  };

  /**
   * Uses native methods to return an object of dimension values.
   * @function
   * @param {jQuery || HTML} element - jQuery object or DOM element for which to get the dimensions. Can be any element other that document or window.
   * @returns {Object} - nested object of integer pixel values
   * TODO - if element is window, return only those values.
   */
  function GetDimensions(elem, test) {
    elem = elem.length ? elem[0] : elem;

    if (elem === window || elem === document) {
      throw new Error("I'm sorry, Dave. I'm afraid I can't do that.");
    }

    var rect = elem.getBoundingClientRect(),
        parRect = elem.parentNode.getBoundingClientRect(),
        winRect = document.body.getBoundingClientRect(),
        winY = window.pageYOffset,
        winX = window.pageXOffset;

    return {
      width: rect.width,
      height: rect.height,
      offset: {
        top: rect.top + winY,
        left: rect.left + winX
      },
      parentDims: {
        width: parRect.width,
        height: parRect.height,
        offset: {
          top: parRect.top + winY,
          left: parRect.left + winX
        }
      },
      windowDims: {
        width: winRect.width,
        height: winRect.height,
        offset: {
          top: winY,
          left: winX
        }
      }
    };
  }

  /**
   * Returns an object of top and left integer pixel values for dynamically rendered elements,
   * such as: Tooltip, Reveal, and Dropdown
   * @function
   * @param {jQuery} element - jQuery object for the element being positioned.
   * @param {jQuery} anchor - jQuery object for the element's anchor point.
   * @param {String} position - a string relating to the desired position of the element, relative to it's anchor
   * @param {Number} vOffset - integer pixel value of desired vertical separation between anchor and element.
   * @param {Number} hOffset - integer pixel value of desired horizontal separation between anchor and element.
   * @param {Boolean} isOverflow - if a collision event is detected, sets to true to default the element to full width - any desired offset.
   * TODO alter/rewrite to work with `em` values as well/instead of pixels
   */
  function GetOffsets(element, anchor, position, vOffset, hOffset, isOverflow) {
    var $eleDims = GetDimensions(element),
        $anchorDims = anchor ? GetDimensions(anchor) : null;

    switch (position) {
      case 'top':
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top
        };
        break;
      case 'right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset,
          top: $anchorDims.offset.top
        };
        break;
      case 'center top':
        return {
          left: $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'center bottom':
        return {
          left: isOverflow ? hOffset : $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      case 'center left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset + 1,
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center':
        return {
          left: $eleDims.windowDims.offset.left + $eleDims.windowDims.width / 2 - $eleDims.width / 2,
          top: $eleDims.windowDims.offset.top + $eleDims.windowDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'reveal':
        return {
          left: ($eleDims.windowDims.width - $eleDims.width) / 2,
          top: $eleDims.windowDims.offset.top + vOffset
        };
      case 'reveal full':
        return {
          left: $eleDims.windowDims.offset.left,
          top: $eleDims.windowDims.offset.top
        };
        break;
      case 'left bottom':
        return {
          left: $anchorDims.offset.left,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      case 'right bottom':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset - $eleDims.width,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      default:
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left + hOffset,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
    }
  }
}(jQuery);
;/*******************************************
 *                                         *
 * This util was created by Marius Olbertz *
 * Please thank Marius on GitHub /owlbertz *
 * or the web http://www.mariusolbertz.de/ *
 *                                         *
 ******************************************/

'use strict';

!function ($) {

  var keyCodes = {
    9: 'TAB',
    13: 'ENTER',
    27: 'ESCAPE',
    32: 'SPACE',
    37: 'ARROW_LEFT',
    38: 'ARROW_UP',
    39: 'ARROW_RIGHT',
    40: 'ARROW_DOWN'
  };

  var commands = {};

  var Keyboard = {
    keys: getKeyCodes(keyCodes),

    /**
     * Parses the (keyboard) event and returns a String that represents its key
     * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
     * @param {Event} event - the event generated by the event handler
     * @return String key - String that represents the key pressed
     */
    parseKey: function (event) {
      var key = keyCodes[event.which || event.keyCode] || String.fromCharCode(event.which).toUpperCase();

      // Remove un-printable characters, e.g. for `fromCharCode` calls for CTRL only events
      key = key.replace(/\W+/, '');

      if (event.shiftKey) key = 'SHIFT_' + key;
      if (event.ctrlKey) key = 'CTRL_' + key;
      if (event.altKey) key = 'ALT_' + key;

      // Remove trailing underscore, in case only modifiers were used (e.g. only `CTRL_ALT`)
      key = key.replace(/_$/, '');

      return key;
    },


    /**
     * Handles the given (keyboard) event
     * @param {Event} event - the event generated by the event handler
     * @param {String} component - Foundation component's name, e.g. Slider or Reveal
     * @param {Objects} functions - collection of functions that are to be executed
     */
    handleKey: function (event, component, functions) {
      var commandList = commands[component],
          keyCode = this.parseKey(event),
          cmds,
          command,
          fn;

      if (!commandList) return console.warn('Component not defined!');

      if (typeof commandList.ltr === 'undefined') {
        // this component does not differentiate between ltr and rtl
        cmds = commandList; // use plain list
      } else {
        // merge ltr and rtl: if document is rtl, rtl overwrites ltr and vice versa
        if (Foundation.rtl()) cmds = $.extend({}, commandList.ltr, commandList.rtl);else cmds = $.extend({}, commandList.rtl, commandList.ltr);
      }
      command = cmds[keyCode];

      fn = functions[command];
      if (fn && typeof fn === 'function') {
        // execute function  if exists
        var returnValue = fn.apply();
        if (functions.handled || typeof functions.handled === 'function') {
          // execute function when event was handled
          functions.handled(returnValue);
        }
      } else {
        if (functions.unhandled || typeof functions.unhandled === 'function') {
          // execute function when event was not handled
          functions.unhandled();
        }
      }
    },


    /**
     * Finds all focusable elements within the given `$element`
     * @param {jQuery} $element - jQuery object to search within
     * @return {jQuery} $focusable - all focusable elements within `$element`
     */
    findFocusable: function ($element) {
      if (!$element) {
        return false;
      }
      return $element.find('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]').filter(function () {
        if (!$(this).is(':visible') || $(this).attr('tabindex') < 0) {
          return false;
        } //only have visible elements and those that have a tabindex greater or equal 0
        return true;
      });
    },


    /**
     * Returns the component name name
     * @param {Object} component - Foundation component, e.g. Slider or Reveal
     * @return String componentName
     */

    register: function (componentName, cmds) {
      commands[componentName] = cmds;
    },


    /**
     * Traps the focus in the given element.
     * @param  {jQuery} $element  jQuery object to trap the foucs into.
     */
    trapFocus: function ($element) {
      var $focusable = Foundation.Keyboard.findFocusable($element),
          $firstFocusable = $focusable.eq(0),
          $lastFocusable = $focusable.eq(-1);

      $element.on('keydown.zf.trapfocus', function (event) {
        if (event.target === $lastFocusable[0] && Foundation.Keyboard.parseKey(event) === 'TAB') {
          event.preventDefault();
          $firstFocusable.focus();
        } else if (event.target === $firstFocusable[0] && Foundation.Keyboard.parseKey(event) === 'SHIFT_TAB') {
          event.preventDefault();
          $lastFocusable.focus();
        }
      });
    },

    /**
     * Releases the trapped focus from the given element.
     * @param  {jQuery} $element  jQuery object to release the focus for.
     */
    releaseFocus: function ($element) {
      $element.off('keydown.zf.trapfocus');
    }
  };

  /*
   * Constants for easier comparing.
   * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
   */
  function getKeyCodes(kcs) {
    var k = {};
    for (var kc in kcs) {
      k[kcs[kc]] = kcs[kc];
    }return k;
  }

  Foundation.Keyboard = Keyboard;
}(jQuery);
;'use strict';

!function ($) {

  // Default set of media queries
  var defaultQueries = {
    'default': 'only screen',
    landscape: 'only screen and (orientation: landscape)',
    portrait: 'only screen and (orientation: portrait)',
    retina: 'only screen and (-webkit-min-device-pixel-ratio: 2),' + 'only screen and (min--moz-device-pixel-ratio: 2),' + 'only screen and (-o-min-device-pixel-ratio: 2/1),' + 'only screen and (min-device-pixel-ratio: 2),' + 'only screen and (min-resolution: 192dpi),' + 'only screen and (min-resolution: 2dppx)'
  };

  var MediaQuery = {
    queries: [],

    current: '',

    /**
     * Initializes the media query helper, by extracting the breakpoint list from the CSS and activating the breakpoint watcher.
     * @function
     * @private
     */
    _init: function () {
      var self = this;
      var extractedStyles = $('.foundation-mq').css('font-family');
      var namedQueries;

      namedQueries = parseStyleToObject(extractedStyles);

      for (var key in namedQueries) {
        if (namedQueries.hasOwnProperty(key)) {
          self.queries.push({
            name: key,
            value: 'only screen and (min-width: ' + namedQueries[key] + ')'
          });
        }
      }

      this.current = this._getCurrentSize();

      this._watcher();
    },


    /**
     * Checks if the screen is at least as wide as a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to check.
     * @returns {Boolean} `true` if the breakpoint matches, `false` if it's smaller.
     */
    atLeast: function (size) {
      var query = this.get(size);

      if (query) {
        return window.matchMedia(query).matches;
      }

      return false;
    },


    /**
     * Checks if the screen matches to a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to check, either 'small only' or 'small'. Omitting 'only' falls back to using atLeast() method.
     * @returns {Boolean} `true` if the breakpoint matches, `false` if it does not.
     */
    is: function (size) {
      size = size.trim().split(' ');
      if (size.length > 1 && size[1] === 'only') {
        if (size[0] === this._getCurrentSize()) return true;
      } else {
        return this.atLeast(size[0]);
      }
      return false;
    },


    /**
     * Gets the media query of a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to get.
     * @returns {String|null} - The media query of the breakpoint, or `null` if the breakpoint doesn't exist.
     */
    get: function (size) {
      for (var i in this.queries) {
        if (this.queries.hasOwnProperty(i)) {
          var query = this.queries[i];
          if (size === query.name) return query.value;
        }
      }

      return null;
    },


    /**
     * Gets the current breakpoint name by testing every breakpoint and returning the last one to match (the biggest one).
     * @function
     * @private
     * @returns {String} Name of the current breakpoint.
     */
    _getCurrentSize: function () {
      var matched;

      for (var i = 0; i < this.queries.length; i++) {
        var query = this.queries[i];

        if (window.matchMedia(query.value).matches) {
          matched = query;
        }
      }

      if (typeof matched === 'object') {
        return matched.name;
      } else {
        return matched;
      }
    },


    /**
     * Activates the breakpoint watcher, which fires an event on the window whenever the breakpoint changes.
     * @function
     * @private
     */
    _watcher: function () {
      var _this = this;

      $(window).on('resize.zf.mediaquery', function () {
        var newSize = _this._getCurrentSize(),
            currentSize = _this.current;

        if (newSize !== currentSize) {
          // Change the current media query
          _this.current = newSize;

          // Broadcast the media query change on the window
          $(window).trigger('changed.zf.mediaquery', [newSize, currentSize]);
        }
      });
    }
  };

  Foundation.MediaQuery = MediaQuery;

  // matchMedia() polyfill - Test a CSS media type/query in JS.
  // Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas, David Knight. Dual MIT/BSD license
  window.matchMedia || (window.matchMedia = function () {
    'use strict';

    // For browsers that support matchMedium api such as IE 9 and webkit

    var styleMedia = window.styleMedia || window.media;

    // For those that don't support matchMedium
    if (!styleMedia) {
      var style = document.createElement('style'),
          script = document.getElementsByTagName('script')[0],
          info = null;

      style.type = 'text/css';
      style.id = 'matchmediajs-test';

      script && script.parentNode && script.parentNode.insertBefore(style, script);

      // 'style.currentStyle' is used by IE <= 8 and 'window.getComputedStyle' for all other browsers
      info = 'getComputedStyle' in window && window.getComputedStyle(style, null) || style.currentStyle;

      styleMedia = {
        matchMedium: function (media) {
          var text = '@media ' + media + '{ #matchmediajs-test { width: 1px; } }';

          // 'style.styleSheet' is used by IE <= 8 and 'style.textContent' for all other browsers
          if (style.styleSheet) {
            style.styleSheet.cssText = text;
          } else {
            style.textContent = text;
          }

          // Test if media query is true or false
          return info.width === '1px';
        }
      };
    }

    return function (media) {
      return {
        matches: styleMedia.matchMedium(media || 'all'),
        media: media || 'all'
      };
    };
  }());

  // Thank you: https://github.com/sindresorhus/query-string
  function parseStyleToObject(str) {
    var styleObject = {};

    if (typeof str !== 'string') {
      return styleObject;
    }

    str = str.trim().slice(1, -1); // browsers re-quote string style values

    if (!str) {
      return styleObject;
    }

    styleObject = str.split('&').reduce(function (ret, param) {
      var parts = param.replace(/\+/g, ' ').split('=');
      var key = parts[0];
      var val = parts[1];
      key = decodeURIComponent(key);

      // missing `=` should be `null`:
      // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
      val = val === undefined ? null : decodeURIComponent(val);

      if (!ret.hasOwnProperty(key)) {
        ret[key] = val;
      } else if (Array.isArray(ret[key])) {
        ret[key].push(val);
      } else {
        ret[key] = [ret[key], val];
      }
      return ret;
    }, {});

    return styleObject;
  }

  Foundation.MediaQuery = MediaQuery;
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Motion module.
   * @module foundation.motion
   */

  var initClasses = ['mui-enter', 'mui-leave'];
  var activeClasses = ['mui-enter-active', 'mui-leave-active'];

  var Motion = {
    animateIn: function (element, animation, cb) {
      animate(true, element, animation, cb);
    },

    animateOut: function (element, animation, cb) {
      animate(false, element, animation, cb);
    }
  };

  function Move(duration, elem, fn) {
    var anim,
        prog,
        start = null;
    // console.log('called');

    if (duration === 0) {
      fn.apply(elem);
      elem.trigger('finished.zf.animate', [elem]).triggerHandler('finished.zf.animate', [elem]);
      return;
    }

    function move(ts) {
      if (!start) start = ts;
      // console.log(start, ts);
      prog = ts - start;
      fn.apply(elem);

      if (prog < duration) {
        anim = window.requestAnimationFrame(move, elem);
      } else {
        window.cancelAnimationFrame(anim);
        elem.trigger('finished.zf.animate', [elem]).triggerHandler('finished.zf.animate', [elem]);
      }
    }
    anim = window.requestAnimationFrame(move);
  }

  /**
   * Animates an element in or out using a CSS transition class.
   * @function
   * @private
   * @param {Boolean} isIn - Defines if the animation is in or out.
   * @param {Object} element - jQuery or HTML object to animate.
   * @param {String} animation - CSS class to use.
   * @param {Function} cb - Callback to run when animation is finished.
   */
  function animate(isIn, element, animation, cb) {
    element = $(element).eq(0);

    if (!element.length) return;

    var initClass = isIn ? initClasses[0] : initClasses[1];
    var activeClass = isIn ? activeClasses[0] : activeClasses[1];

    // Set up the animation
    reset();

    element.addClass(animation).css('transition', 'none');

    requestAnimationFrame(function () {
      element.addClass(initClass);
      if (isIn) element.show();
    });

    // Start the animation
    requestAnimationFrame(function () {
      element[0].offsetWidth;
      element.css('transition', '').addClass(activeClass);
    });

    // Clean up the animation when it finishes
    element.one(Foundation.transitionend(element), finish);

    // Hides the element (for out animations), resets the element, and runs a callback
    function finish() {
      if (!isIn) element.hide();
      reset();
      if (cb) cb.apply(element);
    }

    // Resets transitions and removes motion-specific classes
    function reset() {
      element[0].style.transitionDuration = 0;
      element.removeClass(initClass + ' ' + activeClass + ' ' + animation);
    }
  }

  Foundation.Move = Move;
  Foundation.Motion = Motion;
}(jQuery);
;'use strict';

!function ($) {

  var Nest = {
    Feather: function (menu) {
      var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'zf';

      menu.attr('role', 'menubar');

      var items = menu.find('li').attr({ 'role': 'menuitem' }),
          subMenuClass = 'is-' + type + '-submenu',
          subItemClass = subMenuClass + '-item',
          hasSubClass = 'is-' + type + '-submenu-parent';

      items.each(function () {
        var $item = $(this),
            $sub = $item.children('ul');

        if ($sub.length) {
          $item.addClass(hasSubClass).attr({
            'aria-haspopup': true,
            'aria-label': $item.children('a:first').text()
          });
          // Note:  Drilldowns behave differently in how they hide, and so need
          // additional attributes.  We should look if this possibly over-generalized
          // utility (Nest) is appropriate when we rework menus in 6.4
          if (type === 'drilldown') {
            $item.attr({ 'aria-expanded': false });
          }

          $sub.addClass('submenu ' + subMenuClass).attr({
            'data-submenu': '',
            'role': 'menu'
          });
          if (type === 'drilldown') {
            $sub.attr({ 'aria-hidden': true });
          }
        }

        if ($item.parent('[data-submenu]').length) {
          $item.addClass('is-submenu-item ' + subItemClass);
        }
      });

      return;
    },
    Burn: function (menu, type) {
      var //items = menu.find('li'),
      subMenuClass = 'is-' + type + '-submenu',
          subItemClass = subMenuClass + '-item',
          hasSubClass = 'is-' + type + '-submenu-parent';

      menu.find('>li, .menu, .menu > li').removeClass(subMenuClass + ' ' + subItemClass + ' ' + hasSubClass + ' is-submenu-item submenu is-active').removeAttr('data-submenu').css('display', '');

      // console.log(      menu.find('.' + subMenuClass + ', .' + subItemClass + ', .has-submenu, .is-submenu-item, .submenu, [data-submenu]')
      //           .removeClass(subMenuClass + ' ' + subItemClass + ' has-submenu is-submenu-item submenu')
      //           .removeAttr('data-submenu'));
      // items.each(function(){
      //   var $item = $(this),
      //       $sub = $item.children('ul');
      //   if($item.parent('[data-submenu]').length){
      //     $item.removeClass('is-submenu-item ' + subItemClass);
      //   }
      //   if($sub.length){
      //     $item.removeClass('has-submenu');
      //     $sub.removeClass('submenu ' + subMenuClass).removeAttr('data-submenu');
      //   }
      // });
    }
  };

  Foundation.Nest = Nest;
}(jQuery);
;'use strict';

!function ($) {

  function Timer(elem, options, cb) {
    var _this = this,
        duration = options.duration,
        //options is an object for easily adding features later.
    nameSpace = Object.keys(elem.data())[0] || 'timer',
        remain = -1,
        start,
        timer;

    this.isPaused = false;

    this.restart = function () {
      remain = -1;
      clearTimeout(timer);
      this.start();
    };

    this.start = function () {
      this.isPaused = false;
      // if(!elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      remain = remain <= 0 ? duration : remain;
      elem.data('paused', false);
      start = Date.now();
      timer = setTimeout(function () {
        if (options.infinite) {
          _this.restart(); //rerun the timer.
        }
        if (cb && typeof cb === 'function') {
          cb();
        }
      }, remain);
      elem.trigger('timerstart.zf.' + nameSpace);
    };

    this.pause = function () {
      this.isPaused = true;
      //if(elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      elem.data('paused', true);
      var end = Date.now();
      remain = remain - (end - start);
      elem.trigger('timerpaused.zf.' + nameSpace);
    };
  }

  /**
   * Runs a callback function when images are fully loaded.
   * @param {Object} images - Image(s) to check if loaded.
   * @param {Func} callback - Function to execute when image is fully loaded.
   */
  function onImagesLoaded(images, callback) {
    var self = this,
        unloaded = images.length;

    if (unloaded === 0) {
      callback();
    }

    images.each(function () {
      // Check if image is loaded
      if (this.complete || this.readyState === 4 || this.readyState === 'complete') {
        singleImageLoaded();
      }
      // Force load the image
      else {
          // fix for IE. See https://css-tricks.com/snippets/jquery/fixing-load-in-ie-for-cached-images/
          var src = $(this).attr('src');
          $(this).attr('src', src + (src.indexOf('?') >= 0 ? '&' : '?') + new Date().getTime());
          $(this).one('load', function () {
            singleImageLoaded();
          });
        }
    });

    function singleImageLoaded() {
      unloaded--;
      if (unloaded === 0) {
        callback();
      }
    }
  }

  Foundation.Timer = Timer;
  Foundation.onImagesLoaded = onImagesLoaded;
}(jQuery);
;'use strict';

//**************************************************
//**Work inspired by multiple jquery swipe plugins**
//**Done by Yohai Ararat ***************************
//**************************************************
(function ($) {

	$.spotSwipe = {
		version: '1.0.0',
		enabled: 'ontouchstart' in document.documentElement,
		preventDefault: false,
		moveThreshold: 75,
		timeThreshold: 200
	};

	var startPosX,
	    startPosY,
	    startTime,
	    elapsedTime,
	    isMoving = false;

	function onTouchEnd() {
		//  alert(this);
		this.removeEventListener('touchmove', onTouchMove);
		this.removeEventListener('touchend', onTouchEnd);
		isMoving = false;
	}

	function onTouchMove(e) {
		if ($.spotSwipe.preventDefault) {
			e.preventDefault();
		}
		if (isMoving) {
			var x = e.touches[0].pageX;
			var y = e.touches[0].pageY;
			var dx = startPosX - x;
			var dy = startPosY - y;
			var dir;
			elapsedTime = new Date().getTime() - startTime;
			if (Math.abs(dx) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
				dir = dx > 0 ? 'left' : 'right';
			}
			// else if(Math.abs(dy) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
			//   dir = dy > 0 ? 'down' : 'up';
			// }
			if (dir) {
				e.preventDefault();
				onTouchEnd.call(this);
				$(this).trigger('swipe', dir).trigger('swipe' + dir);
			}
		}
	}

	function onTouchStart(e) {
		if (e.touches.length == 1) {
			startPosX = e.touches[0].pageX;
			startPosY = e.touches[0].pageY;
			isMoving = true;
			startTime = new Date().getTime();
			this.addEventListener('touchmove', onTouchMove, false);
			this.addEventListener('touchend', onTouchEnd, false);
		}
	}

	function init() {
		this.addEventListener && this.addEventListener('touchstart', onTouchStart, false);
	}

	function teardown() {
		this.removeEventListener('touchstart', onTouchStart);
	}

	$.event.special.swipe = { setup: init };

	$.each(['left', 'up', 'down', 'right'], function () {
		$.event.special['swipe' + this] = { setup: function () {
				$(this).on('swipe', $.noop);
			} };
	});
})(jQuery);
/****************************************************
 * Method for adding psuedo drag events to elements *
 ***************************************************/
!function ($) {
	$.fn.addTouch = function () {
		this.each(function (i, el) {
			$(el).bind('touchstart touchmove touchend touchcancel', function () {
				//we pass the original event object because the jQuery event
				//object is normalized to w3c specs and does not provide the TouchList
				handleTouch(event);
			});
		});

		var handleTouch = function (event) {
			var touches = event.changedTouches,
			    first = touches[0],
			    eventTypes = {
				touchstart: 'mousedown',
				touchmove: 'mousemove',
				touchend: 'mouseup'
			},
			    type = eventTypes[event.type],
			    simulatedEvent;

			if ('MouseEvent' in window && typeof window.MouseEvent === 'function') {
				simulatedEvent = new window.MouseEvent(type, {
					'bubbles': true,
					'cancelable': true,
					'screenX': first.screenX,
					'screenY': first.screenY,
					'clientX': first.clientX,
					'clientY': first.clientY
				});
			} else {
				simulatedEvent = document.createEvent('MouseEvent');
				simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY, false, false, false, false, 0 /*left*/, null);
			}
			first.target.dispatchEvent(simulatedEvent);
		};
	};
}(jQuery);

//**********************************
//**From the jQuery Mobile Library**
//**need to recreate functionality**
//**and try to improve if possible**
//**********************************

/* Removing the jQuery function ****
************************************

(function( $, window, undefined ) {

	var $document = $( document ),
		// supportTouch = $.mobile.support.touch,
		touchStartEvent = 'touchstart'//supportTouch ? "touchstart" : "mousedown",
		touchStopEvent = 'touchend'//supportTouch ? "touchend" : "mouseup",
		touchMoveEvent = 'touchmove'//supportTouch ? "touchmove" : "mousemove";

	// setup new event shortcuts
	$.each( ( "touchstart touchmove touchend " +
		"swipe swipeleft swiperight" ).split( " " ), function( i, name ) {

		$.fn[ name ] = function( fn ) {
			return fn ? this.bind( name, fn ) : this.trigger( name );
		};

		// jQuery < 1.8
		if ( $.attrFn ) {
			$.attrFn[ name ] = true;
		}
	});

	function triggerCustomEvent( obj, eventType, event, bubble ) {
		var originalType = event.type;
		event.type = eventType;
		if ( bubble ) {
			$.event.trigger( event, undefined, obj );
		} else {
			$.event.dispatch.call( obj, event );
		}
		event.type = originalType;
	}

	// also handles taphold

	// Also handles swipeleft, swiperight
	$.event.special.swipe = {

		// More than this horizontal displacement, and we will suppress scrolling.
		scrollSupressionThreshold: 30,

		// More time than this, and it isn't a swipe.
		durationThreshold: 1000,

		// Swipe horizontal displacement must be more than this.
		horizontalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		// Swipe vertical displacement must be less than this.
		verticalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		getLocation: function ( event ) {
			var winPageX = window.pageXOffset,
				winPageY = window.pageYOffset,
				x = event.clientX,
				y = event.clientY;

			if ( event.pageY === 0 && Math.floor( y ) > Math.floor( event.pageY ) ||
				event.pageX === 0 && Math.floor( x ) > Math.floor( event.pageX ) ) {

				// iOS4 clientX/clientY have the value that should have been
				// in pageX/pageY. While pageX/page/ have the value 0
				x = x - winPageX;
				y = y - winPageY;
			} else if ( y < ( event.pageY - winPageY) || x < ( event.pageX - winPageX ) ) {

				// Some Android browsers have totally bogus values for clientX/Y
				// when scrolling/zooming a page. Detectable since clientX/clientY
				// should never be smaller than pageX/pageY minus page scroll
				x = event.pageX - winPageX;
				y = event.pageY - winPageY;
			}

			return {
				x: x,
				y: y
			};
		},

		start: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ],
						origin: $( event.target )
					};
		},

		stop: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ]
					};
		},

		handleSwipe: function( start, stop, thisObject, origTarget ) {
			if ( stop.time - start.time < $.event.special.swipe.durationThreshold &&
				Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.horizontalDistanceThreshold &&
				Math.abs( start.coords[ 1 ] - stop.coords[ 1 ] ) < $.event.special.swipe.verticalDistanceThreshold ) {
				var direction = start.coords[0] > stop.coords[ 0 ] ? "swipeleft" : "swiperight";

				triggerCustomEvent( thisObject, "swipe", $.Event( "swipe", { target: origTarget, swipestart: start, swipestop: stop }), true );
				triggerCustomEvent( thisObject, direction,$.Event( direction, { target: origTarget, swipestart: start, swipestop: stop } ), true );
				return true;
			}
			return false;

		},

		// This serves as a flag to ensure that at most one swipe event event is
		// in work at any given time
		eventInProgress: false,

		setup: function() {
			var events,
				thisObject = this,
				$this = $( thisObject ),
				context = {};

			// Retrieve the events data for this element and add the swipe context
			events = $.data( this, "mobile-events" );
			if ( !events ) {
				events = { length: 0 };
				$.data( this, "mobile-events", events );
			}
			events.length++;
			events.swipe = context;

			context.start = function( event ) {

				// Bail if we're already working on a swipe event
				if ( $.event.special.swipe.eventInProgress ) {
					return;
				}
				$.event.special.swipe.eventInProgress = true;

				var stop,
					start = $.event.special.swipe.start( event ),
					origTarget = event.target,
					emitted = false;

				context.move = function( event ) {
					if ( !start || event.isDefaultPrevented() ) {
						return;
					}

					stop = $.event.special.swipe.stop( event );
					if ( !emitted ) {
						emitted = $.event.special.swipe.handleSwipe( start, stop, thisObject, origTarget );
						if ( emitted ) {

							// Reset the context to make way for the next swipe event
							$.event.special.swipe.eventInProgress = false;
						}
					}
					// prevent scrolling
					if ( Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.scrollSupressionThreshold ) {
						event.preventDefault();
					}
				};

				context.stop = function() {
						emitted = true;

						// Reset the context to make way for the next swipe event
						$.event.special.swipe.eventInProgress = false;
						$document.off( touchMoveEvent, context.move );
						context.move = null;
				};

				$document.on( touchMoveEvent, context.move )
					.one( touchStopEvent, context.stop );
			};
			$this.on( touchStartEvent, context.start );
		},

		teardown: function() {
			var events, context;

			events = $.data( this, "mobile-events" );
			if ( events ) {
				context = events.swipe;
				delete events.swipe;
				events.length--;
				if ( events.length === 0 ) {
					$.removeData( this, "mobile-events" );
				}
			}

			if ( context ) {
				if ( context.start ) {
					$( this ).off( touchStartEvent, context.start );
				}
				if ( context.move ) {
					$document.off( touchMoveEvent, context.move );
				}
				if ( context.stop ) {
					$document.off( touchStopEvent, context.stop );
				}
			}
		}
	};
	$.each({
		swipeleft: "swipe.left",
		swiperight: "swipe.right"
	}, function( event, sourceEvent ) {

		$.event.special[ event ] = {
			setup: function() {
				$( this ).bind( sourceEvent, $.noop );
			},
			teardown: function() {
				$( this ).unbind( sourceEvent );
			}
		};
	});
})( jQuery, this );
*/
;'use strict';

!function ($) {

  var MutationObserver = function () {
    var prefixes = ['WebKit', 'Moz', 'O', 'Ms', ''];
    for (var i = 0; i < prefixes.length; i++) {
      if (prefixes[i] + 'MutationObserver' in window) {
        return window[prefixes[i] + 'MutationObserver'];
      }
    }
    return false;
  }();

  var triggers = function (el, type) {
    el.data(type).split(' ').forEach(function (id) {
      $('#' + id)[type === 'close' ? 'trigger' : 'triggerHandler'](type + '.zf.trigger', [el]);
    });
  };
  // Elements with [data-open] will reveal a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-open]', function () {
    triggers($(this), 'open');
  });

  // Elements with [data-close] will close a plugin that supports it when clicked.
  // If used without a value on [data-close], the event will bubble, allowing it to close a parent component.
  $(document).on('click.zf.trigger', '[data-close]', function () {
    var id = $(this).data('close');
    if (id) {
      triggers($(this), 'close');
    } else {
      $(this).trigger('close.zf.trigger');
    }
  });

  // Elements with [data-toggle] will toggle a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-toggle]', function () {
    var id = $(this).data('toggle');
    if (id) {
      triggers($(this), 'toggle');
    } else {
      $(this).trigger('toggle.zf.trigger');
    }
  });

  // Elements with [data-closable] will respond to close.zf.trigger events.
  $(document).on('close.zf.trigger', '[data-closable]', function (e) {
    e.stopPropagation();
    var animation = $(this).data('closable');

    if (animation !== '') {
      Foundation.Motion.animateOut($(this), animation, function () {
        $(this).trigger('closed.zf');
      });
    } else {
      $(this).fadeOut().trigger('closed.zf');
    }
  });

  $(document).on('focus.zf.trigger blur.zf.trigger', '[data-toggle-focus]', function () {
    var id = $(this).data('toggle-focus');
    $('#' + id).triggerHandler('toggle.zf.trigger', [$(this)]);
  });

  /**
  * Fires once after all other scripts have loaded
  * @function
  * @private
  */
  $(window).on('load', function () {
    checkListeners();
  });

  function checkListeners() {
    eventsListener();
    resizeListener();
    scrollListener();
    closemeListener();
  }

  //******** only fires this function once on load, if there's something to watch ********
  function closemeListener(pluginName) {
    var yetiBoxes = $('[data-yeti-box]'),
        plugNames = ['dropdown', 'tooltip', 'reveal'];

    if (pluginName) {
      if (typeof pluginName === 'string') {
        plugNames.push(pluginName);
      } else if (typeof pluginName === 'object' && typeof pluginName[0] === 'string') {
        plugNames.concat(pluginName);
      } else {
        console.error('Plugin names must be strings');
      }
    }
    if (yetiBoxes.length) {
      var listeners = plugNames.map(function (name) {
        return 'closeme.zf.' + name;
      }).join(' ');

      $(window).off(listeners).on(listeners, function (e, pluginId) {
        var plugin = e.namespace.split('.')[0];
        var plugins = $('[data-' + plugin + ']').not('[data-yeti-box="' + pluginId + '"]');

        plugins.each(function () {
          var _this = $(this);

          _this.triggerHandler('close.zf.trigger', [_this]);
        });
      });
    }
  }

  function resizeListener(debounce) {
    var timer = void 0,
        $nodes = $('[data-resize]');
    if ($nodes.length) {
      $(window).off('resize.zf.trigger').on('resize.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('resizeme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a resize event
          $nodes.attr('data-events', "resize");
        }, debounce || 10); //default time to emit resize event
      });
    }
  }

  function scrollListener(debounce) {
    var timer = void 0,
        $nodes = $('[data-scroll]');
    if ($nodes.length) {
      $(window).off('scroll.zf.trigger').on('scroll.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('scrollme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a scroll event
          $nodes.attr('data-events', "scroll");
        }, debounce || 10); //default time to emit scroll event
      });
    }
  }

  function eventsListener() {
    if (!MutationObserver) {
      return false;
    }
    var nodes = document.querySelectorAll('[data-resize], [data-scroll], [data-mutate]');

    //element callback
    var listeningElementsMutation = function (mutationRecordsList) {
      var $target = $(mutationRecordsList[0].target);

      //trigger the event handler for the element depending on type
      switch (mutationRecordsList[0].type) {

        case "attributes":
          if ($target.attr("data-events") === "scroll" && mutationRecordsList[0].attributeName === "data-events") {
            $target.triggerHandler('scrollme.zf.trigger', [$target, window.pageYOffset]);
          }
          if ($target.attr("data-events") === "resize" && mutationRecordsList[0].attributeName === "data-events") {
            $target.triggerHandler('resizeme.zf.trigger', [$target]);
          }
          if (mutationRecordsList[0].attributeName === "style") {
            $target.closest("[data-mutate]").attr("data-events", "mutate");
            $target.closest("[data-mutate]").triggerHandler('mutateme.zf.trigger', [$target.closest("[data-mutate]")]);
          }
          break;

        case "childList":
          $target.closest("[data-mutate]").attr("data-events", "mutate");
          $target.closest("[data-mutate]").triggerHandler('mutateme.zf.trigger', [$target.closest("[data-mutate]")]);
          break;

        default:
          return false;
        //nothing
      }
    };

    if (nodes.length) {
      //for each element that needs to listen for resizing, scrolling, or mutation add a single observer
      for (var i = 0; i <= nodes.length - 1; i++) {
        var elementObserver = new MutationObserver(listeningElementsMutation);
        elementObserver.observe(nodes[i], { attributes: true, childList: true, characterData: false, subtree: true, attributeFilter: ["data-events", "style"] });
      }
    }
  }

  // ------------------------------------

  // [PH]
  // Foundation.CheckWatchers = checkWatchers;
  Foundation.IHearYou = checkListeners;
  // Foundation.ISeeYou = scrollListener;
  // Foundation.IFeelYou = closemeListener;
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Abide module.
   * @module foundation.abide
   */

  var Abide = function () {
    /**
     * Creates a new instance of Abide.
     * @class
     * @fires Abide#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Abide(element) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      _classCallCheck(this, Abide);

      this.$element = element;
      this.options = $.extend({}, Abide.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Abide');
    }

    /**
     * Initializes the Abide plugin and calls functions to get Abide functioning on load.
     * @private
     */


    _createClass(Abide, [{
      key: '_init',
      value: function _init() {
        this.$inputs = this.$element.find('input, textarea, select');

        this._events();
      }

      /**
       * Initializes events for Abide.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this2 = this;

        this.$element.off('.abide').on('reset.zf.abide', function () {
          _this2.resetForm();
        }).on('submit.zf.abide', function () {
          return _this2.validateForm();
        });

        if (this.options.validateOn === 'fieldChange') {
          this.$inputs.off('change.zf.abide').on('change.zf.abide', function (e) {
            _this2.validateInput($(e.target));
          });
        }

        if (this.options.liveValidate) {
          this.$inputs.off('input.zf.abide').on('input.zf.abide', function (e) {
            _this2.validateInput($(e.target));
          });
        }

        if (this.options.validateOnBlur) {
          this.$inputs.off('blur.zf.abide').on('blur.zf.abide', function (e) {
            _this2.validateInput($(e.target));
          });
        }
      }

      /**
       * Calls necessary functions to update Abide upon DOM change
       * @private
       */

    }, {
      key: '_reflow',
      value: function _reflow() {
        this._init();
      }

      /**
       * Checks whether or not a form element has the required attribute and if it's checked or not
       * @param {Object} element - jQuery object to check for required attribute
       * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
       */

    }, {
      key: 'requiredCheck',
      value: function requiredCheck($el) {
        if (!$el.attr('required')) return true;

        var isGood = true;

        switch ($el[0].type) {
          case 'checkbox':
            isGood = $el[0].checked;
            break;

          case 'select':
          case 'select-one':
          case 'select-multiple':
            var opt = $el.find('option:selected');
            if (!opt.length || !opt.val()) isGood = false;
            break;

          default:
            if (!$el.val() || !$el.val().length) isGood = false;
        }

        return isGood;
      }

      /**
       * Get:
       * - Based on $el, the first element(s) corresponding to `formErrorSelector` in this order:
       *   1. The element's direct sibling('s).
       *   2. The element's parent's children.
       * - Element(s) with the attribute `[data-form-error-for]` set with the element's id.
       *
       * This allows for multiple form errors per input, though if none are found, no form errors will be shown.
       *
       * @param {Object} $el - jQuery object to use as reference to find the form error selector.
       * @returns {Object} jQuery object with the selector.
       */

    }, {
      key: 'findFormError',
      value: function findFormError($el) {
        var id = $el[0].id;
        var $error = $el.siblings(this.options.formErrorSelector);

        if (!$error.length) {
          $error = $el.parent().find(this.options.formErrorSelector);
        }

        $error = $error.add(this.$element.find('[data-form-error-for="' + id + '"]'));

        return $error;
      }

      /**
       * Get the first element in this order:
       * 2. The <label> with the attribute `[for="someInputId"]`
       * 3. The `.closest()` <label>
       *
       * @param {Object} $el - jQuery object to check for required attribute
       * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
       */

    }, {
      key: 'findLabel',
      value: function findLabel($el) {
        var id = $el[0].id;
        var $label = this.$element.find('label[for="' + id + '"]');

        if (!$label.length) {
          return $el.closest('label');
        }

        return $label;
      }

      /**
       * Get the set of labels associated with a set of radio els in this order
       * 2. The <label> with the attribute `[for="someInputId"]`
       * 3. The `.closest()` <label>
       *
       * @param {Object} $el - jQuery object to check for required attribute
       * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
       */

    }, {
      key: 'findRadioLabels',
      value: function findRadioLabels($els) {
        var _this3 = this;

        var labels = $els.map(function (i, el) {
          var id = el.id;
          var $label = _this3.$element.find('label[for="' + id + '"]');

          if (!$label.length) {
            $label = $(el).closest('label');
          }
          return $label[0];
        });

        return $(labels);
      }

      /**
       * Adds the CSS error class as specified by the Abide settings to the label, input, and the form
       * @param {Object} $el - jQuery object to add the class to
       */

    }, {
      key: 'addErrorClasses',
      value: function addErrorClasses($el) {
        var $label = this.findLabel($el);
        var $formError = this.findFormError($el);

        if ($label.length) {
          $label.addClass(this.options.labelErrorClass);
        }

        if ($formError.length) {
          $formError.addClass(this.options.formErrorClass);
        }

        $el.addClass(this.options.inputErrorClass).attr('data-invalid', '');
      }

      /**
       * Remove CSS error classes etc from an entire radio button group
       * @param {String} groupName - A string that specifies the name of a radio button group
       *
       */

    }, {
      key: 'removeRadioErrorClasses',
      value: function removeRadioErrorClasses(groupName) {
        var $els = this.$element.find(':radio[name="' + groupName + '"]');
        var $labels = this.findRadioLabels($els);
        var $formErrors = this.findFormError($els);

        if ($labels.length) {
          $labels.removeClass(this.options.labelErrorClass);
        }

        if ($formErrors.length) {
          $formErrors.removeClass(this.options.formErrorClass);
        }

        $els.removeClass(this.options.inputErrorClass).removeAttr('data-invalid');
      }

      /**
       * Removes CSS error class as specified by the Abide settings from the label, input, and the form
       * @param {Object} $el - jQuery object to remove the class from
       */

    }, {
      key: 'removeErrorClasses',
      value: function removeErrorClasses($el) {
        // radios need to clear all of the els
        if ($el[0].type == 'radio') {
          return this.removeRadioErrorClasses($el.attr('name'));
        }

        var $label = this.findLabel($el);
        var $formError = this.findFormError($el);

        if ($label.length) {
          $label.removeClass(this.options.labelErrorClass);
        }

        if ($formError.length) {
          $formError.removeClass(this.options.formErrorClass);
        }

        $el.removeClass(this.options.inputErrorClass).removeAttr('data-invalid');
      }

      /**
       * Goes through a form to find inputs and proceeds to validate them in ways specific to their type. 
       * Ignores inputs with data-abide-ignore, type="hidden" or disabled attributes set
       * @fires Abide#invalid
       * @fires Abide#valid
       * @param {Object} element - jQuery object to validate, should be an HTML input
       * @returns {Boolean} goodToGo - If the input is valid or not.
       */

    }, {
      key: 'validateInput',
      value: function validateInput($el) {
        var clearRequire = this.requiredCheck($el),
            validated = false,
            customValidator = true,
            validator = $el.attr('data-validator'),
            equalTo = true;

        // don't validate ignored inputs or hidden inputs or disabled inputs
        if ($el.is('[data-abide-ignore]') || $el.is('[type="hidden"]') || $el.is('[disabled]')) {
          return true;
        }

        switch ($el[0].type) {
          case 'radio':
            validated = this.validateRadio($el.attr('name'));
            break;

          case 'checkbox':
            validated = clearRequire;
            break;

          case 'select':
          case 'select-one':
          case 'select-multiple':
            validated = clearRequire;
            break;

          default:
            validated = this.validateText($el);
        }

        if (validator) {
          customValidator = this.matchValidation($el, validator, $el.attr('required'));
        }

        if ($el.attr('data-equalto')) {
          equalTo = this.options.validators.equalTo($el);
        }

        var goodToGo = [clearRequire, validated, customValidator, equalTo].indexOf(false) === -1;
        var message = (goodToGo ? 'valid' : 'invalid') + '.zf.abide';

        if (goodToGo) {
          // Re-validate inputs that depend on this one with equalto
          var dependentElements = this.$element.find('[data-equalto="' + $el.attr('id') + '"]');
          if (dependentElements.length) {
            var _this = this;
            dependentElements.each(function () {
              if ($(this).val()) {
                _this.validateInput($(this));
              }
            });
          }
        }

        this[goodToGo ? 'removeErrorClasses' : 'addErrorClasses']($el);

        /**
         * Fires when the input is done checking for validation. Event trigger is either `valid.zf.abide` or `invalid.zf.abide`
         * Trigger includes the DOM element of the input.
         * @event Abide#valid
         * @event Abide#invalid
         */
        $el.trigger(message, [$el]);

        return goodToGo;
      }

      /**
       * Goes through a form and if there are any invalid inputs, it will display the form error element
       * @returns {Boolean} noError - true if no errors were detected...
       * @fires Abide#formvalid
       * @fires Abide#forminvalid
       */

    }, {
      key: 'validateForm',
      value: function validateForm() {
        var acc = [];
        var _this = this;

        this.$inputs.each(function () {
          acc.push(_this.validateInput($(this)));
        });

        var noError = acc.indexOf(false) === -1;

        this.$element.find('[data-abide-error]').css('display', noError ? 'none' : 'block');

        /**
         * Fires when the form is finished validating. Event trigger is either `formvalid.zf.abide` or `forminvalid.zf.abide`.
         * Trigger includes the element of the form.
         * @event Abide#formvalid
         * @event Abide#forminvalid
         */
        this.$element.trigger((noError ? 'formvalid' : 'forminvalid') + '.zf.abide', [this.$element]);

        return noError;
      }

      /**
       * Determines whether or a not a text input is valid based on the pattern specified in the attribute. If no matching pattern is found, returns true.
       * @param {Object} $el - jQuery object to validate, should be a text input HTML element
       * @param {String} pattern - string value of one of the RegEx patterns in Abide.options.patterns
       * @returns {Boolean} Boolean value depends on whether or not the input value matches the pattern specified
       */

    }, {
      key: 'validateText',
      value: function validateText($el, pattern) {
        // A pattern can be passed to this function, or it will be infered from the input's "pattern" attribute, or it's "type" attribute
        pattern = pattern || $el.attr('pattern') || $el.attr('type');
        var inputText = $el.val();
        var valid = false;

        if (inputText.length) {
          // If the pattern attribute on the element is in Abide's list of patterns, then test that regexp
          if (this.options.patterns.hasOwnProperty(pattern)) {
            valid = this.options.patterns[pattern].test(inputText);
          }
          // If the pattern name isn't also the type attribute of the field, then test it as a regexp
          else if (pattern !== $el.attr('type')) {
              valid = new RegExp(pattern).test(inputText);
            } else {
              valid = true;
            }
        }
        // An empty field is valid if it's not required
        else if (!$el.prop('required')) {
            valid = true;
          }

        return valid;
      }

      /**
       * Determines whether or a not a radio input is valid based on whether or not it is required and selected. Although the function targets a single `<input>`, it validates by checking the `required` and `checked` properties of all radio buttons in its group.
       * @param {String} groupName - A string that specifies the name of a radio button group
       * @returns {Boolean} Boolean value depends on whether or not at least one radio input has been selected (if it's required)
       */

    }, {
      key: 'validateRadio',
      value: function validateRadio(groupName) {
        // If at least one radio in the group has the `required` attribute, the group is considered required
        // Per W3C spec, all radio buttons in a group should have `required`, but we're being nice
        var $group = this.$element.find(':radio[name="' + groupName + '"]');
        var valid = false,
            required = false;

        // For the group to be required, at least one radio needs to be required
        $group.each(function (i, e) {
          if ($(e).attr('required')) {
            required = true;
          }
        });
        if (!required) valid = true;

        if (!valid) {
          // For the group to be valid, at least one radio needs to be checked
          $group.each(function (i, e) {
            if ($(e).prop('checked')) {
              valid = true;
            }
          });
        };

        return valid;
      }

      /**
       * Determines if a selected input passes a custom validation function. Multiple validations can be used, if passed to the element with `data-validator="foo bar baz"` in a space separated listed.
       * @param {Object} $el - jQuery input element.
       * @param {String} validators - a string of function names matching functions in the Abide.options.validators object.
       * @param {Boolean} required - self explanatory?
       * @returns {Boolean} - true if validations passed.
       */

    }, {
      key: 'matchValidation',
      value: function matchValidation($el, validators, required) {
        var _this4 = this;

        required = required ? true : false;

        var clear = validators.split(' ').map(function (v) {
          return _this4.options.validators[v]($el, required, $el.parent());
        });
        return clear.indexOf(false) === -1;
      }

      /**
       * Resets form inputs and styles
       * @fires Abide#formreset
       */

    }, {
      key: 'resetForm',
      value: function resetForm() {
        var $form = this.$element,
            opts = this.options;

        $('.' + opts.labelErrorClass, $form).not('small').removeClass(opts.labelErrorClass);
        $('.' + opts.inputErrorClass, $form).not('small').removeClass(opts.inputErrorClass);
        $(opts.formErrorSelector + '.' + opts.formErrorClass).removeClass(opts.formErrorClass);
        $form.find('[data-abide-error]').css('display', 'none');
        $(':input', $form).not(':button, :submit, :reset, :hidden, :radio, :checkbox, [data-abide-ignore]').val('').removeAttr('data-invalid');
        $(':input:radio', $form).not('[data-abide-ignore]').prop('checked', false).removeAttr('data-invalid');
        $(':input:checkbox', $form).not('[data-abide-ignore]').prop('checked', false).removeAttr('data-invalid');
        /**
         * Fires when the form has been reset.
         * @event Abide#formreset
         */
        $form.trigger('formreset.zf.abide', [$form]);
      }

      /**
       * Destroys an instance of Abide.
       * Removes error styles and classes from elements, without resetting their values.
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        var _this = this;
        this.$element.off('.abide').find('[data-abide-error]').css('display', 'none');

        this.$inputs.off('.abide').each(function () {
          _this.removeErrorClasses($(this));
        });

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Abide;
  }();

  /**
   * Default settings for plugin
   */


  Abide.defaults = {
    /**
     * The default event to validate inputs. Checkboxes and radios validate immediately.
     * Remove or change this value for manual validation.
     * @option
     * @type {?string}
     * @default 'fieldChange'
     */
    validateOn: 'fieldChange',

    /**
     * Class to be applied to input labels on failed validation.
     * @option
     * @type {string}
     * @default 'is-invalid-label'
     */
    labelErrorClass: 'is-invalid-label',

    /**
     * Class to be applied to inputs on failed validation.
     * @option
     * @type {string}
     * @default 'is-invalid-input'
     */
    inputErrorClass: 'is-invalid-input',

    /**
     * Class selector to use to target Form Errors for show/hide.
     * @option
     * @type {string}
     * @default '.form-error'
     */
    formErrorSelector: '.form-error',

    /**
     * Class added to Form Errors on failed validation.
     * @option
     * @type {string}
     * @default 'is-visible'
     */
    formErrorClass: 'is-visible',

    /**
     * Set to true to validate text inputs on any value change.
     * @option
     * @type {boolean}
     * @default false
     */
    liveValidate: false,

    /**
     * Set to true to validate inputs on blur.
     * @option
     * @type {boolean}
     * @default false
     */
    validateOnBlur: false,

    patterns: {
      alpha: /^[a-zA-Z]+$/,
      alpha_numeric: /^[a-zA-Z0-9]+$/,
      integer: /^[-+]?\d+$/,
      number: /^[-+]?\d*(?:[\.\,]\d+)?$/,

      // amex, visa, diners
      card: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/,
      cvv: /^([0-9]){3,4}$/,

      // http://www.whatwg.org/specs/web-apps/current-work/multipage/states-of-the-type-attribute.html#valid-e-mail-address
      email: /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,

      url: /^(https?|ftp|file|ssh):\/\/(((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/,
      // abc.de
      domain: /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,8}$/,

      datetime: /^([0-2][0-9]{3})\-([0-1][0-9])\-([0-3][0-9])T([0-5][0-9])\:([0-5][0-9])\:([0-5][0-9])(Z|([\-\+]([0-1][0-9])\:00))$/,
      // YYYY-MM-DD
      date: /(?:19|20)[0-9]{2}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1[0-9]|2[0-9])|(?:(?!02)(?:0[1-9]|1[0-2])-(?:30))|(?:(?:0[13578]|1[02])-31))$/,
      // HH:MM:SS
      time: /^(0[0-9]|1[0-9]|2[0-3])(:[0-5][0-9]){2}$/,
      dateISO: /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/,
      // MM/DD/YYYY
      month_day_year: /^(0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])[- \/.]\d{4}$/,
      // DD/MM/YYYY
      day_month_year: /^(0[1-9]|[12][0-9]|3[01])[- \/.](0[1-9]|1[012])[- \/.]\d{4}$/,

      // #FFF or #FFFFFF
      color: /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/
    },

    /**
     * Optional validation functions to be used. `equalTo` being the only default included function.
     * Functions should return only a boolean if the input is valid or not. Functions are given the following arguments:
     * el : The jQuery element to validate.
     * required : Boolean value of the required attribute be present or not.
     * parent : The direct parent of the input.
     * @option
     */
    validators: {
      equalTo: function (el, required, parent) {
        return $('#' + el.attr('data-equalto')).val() === el.val();
      }
    }
  };

  // Window exports
  Foundation.plugin(Abide, 'Abide');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Accordion module.
   * @module foundation.accordion
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   */

  var Accordion = function () {
    /**
     * Creates a new instance of an accordion.
     * @class
     * @fires Accordion#init
     * @param {jQuery} element - jQuery object to make into an accordion.
     * @param {Object} options - a plain object with settings to override the default options.
     */
    function Accordion(element, options) {
      _classCallCheck(this, Accordion);

      this.$element = element;
      this.options = $.extend({}, Accordion.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Accordion');
      Foundation.Keyboard.register('Accordion', {
        'ENTER': 'toggle',
        'SPACE': 'toggle',
        'ARROW_DOWN': 'next',
        'ARROW_UP': 'previous'
      });
    }

    /**
     * Initializes the accordion by animating the preset active pane(s).
     * @private
     */


    _createClass(Accordion, [{
      key: '_init',
      value: function _init() {
        var _this2 = this;

        this.$element.attr('role', 'tablist');
        this.$tabs = this.$element.children('[data-accordion-item]');

        this.$tabs.each(function (idx, el) {
          var $el = $(el),
              $content = $el.children('[data-tab-content]'),
              id = $content[0].id || Foundation.GetYoDigits(6, 'accordion'),
              linkId = el.id || id + '-label';

          $el.find('a:first').attr({
            'aria-controls': id,
            'role': 'tab',
            'id': linkId,
            'aria-expanded': false,
            'aria-selected': false
          });

          $content.attr({ 'role': 'tabpanel', 'aria-labelledby': linkId, 'aria-hidden': true, 'id': id });
        });
        var $initActive = this.$element.find('.is-active').children('[data-tab-content]');
        this.firstTimeInit = true;
        if ($initActive.length) {
          this.down($initActive, this.firstTimeInit);
          this.firstTimeInit = false;
        }

        this._checkDeepLink = function () {
          var anchor = window.location.hash;
          //need a hash and a relevant anchor in this tabset
          if (anchor.length) {
            var $link = _this2.$element.find('[href$="' + anchor + '"]'),
                $anchor = $(anchor);

            if ($link.length && $anchor) {
              if (!$link.parent('[data-accordion-item]').hasClass('is-active')) {
                _this2.down($anchor, _this2.firstTimeInit);
                _this2.firstTimeInit = false;
              };

              //roll up a little to show the titles
              if (_this2.options.deepLinkSmudge) {
                var _this = _this2;
                $(window).load(function () {
                  var offset = _this.$element.offset();
                  $('html, body').animate({ scrollTop: offset.top }, _this.options.deepLinkSmudgeDelay);
                });
              }

              /**
                * Fires when the zplugin has deeplinked at pageload
                * @event Accordion#deeplink
                */
              _this2.$element.trigger('deeplink.zf.accordion', [$link, $anchor]);
            }
          }
        };

        //use browser to open a tab, if it exists in this tabset
        if (this.options.deepLink) {
          this._checkDeepLink();
        }

        this._events();
      }

      /**
       * Adds event handlers for items within the accordion.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        this.$tabs.each(function () {
          var $elem = $(this);
          var $tabContent = $elem.children('[data-tab-content]');
          if ($tabContent.length) {
            $elem.children('a').off('click.zf.accordion keydown.zf.accordion').on('click.zf.accordion', function (e) {
              e.preventDefault();
              _this.toggle($tabContent);
            }).on('keydown.zf.accordion', function (e) {
              Foundation.Keyboard.handleKey(e, 'Accordion', {
                toggle: function () {
                  _this.toggle($tabContent);
                },
                next: function () {
                  var $a = $elem.next().find('a').focus();
                  if (!_this.options.multiExpand) {
                    $a.trigger('click.zf.accordion');
                  }
                },
                previous: function () {
                  var $a = $elem.prev().find('a').focus();
                  if (!_this.options.multiExpand) {
                    $a.trigger('click.zf.accordion');
                  }
                },
                handled: function () {
                  e.preventDefault();
                  e.stopPropagation();
                }
              });
            });
          }
        });
        if (this.options.deepLink) {
          $(window).on('popstate', this._checkDeepLink);
        }
      }

      /**
       * Toggles the selected content pane's open/close state.
       * @param {jQuery} $target - jQuery object of the pane to toggle (`.accordion-content`).
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle($target) {
        if ($target.parent().hasClass('is-active')) {
          this.up($target);
        } else {
          this.down($target);
        }
        //either replace or update browser history
        if (this.options.deepLink) {
          var anchor = $target.prev('a').attr('href');

          if (this.options.updateHistory) {
            history.pushState({}, '', anchor);
          } else {
            history.replaceState({}, '', anchor);
          }
        }
      }

      /**
       * Opens the accordion tab defined by `$target`.
       * @param {jQuery} $target - Accordion pane to open (`.accordion-content`).
       * @param {Boolean} firstTime - flag to determine if reflow should happen.
       * @fires Accordion#down
       * @function
       */

    }, {
      key: 'down',
      value: function down($target, firstTime) {
        var _this3 = this;

        $target.attr('aria-hidden', false).parent('[data-tab-content]').addBack().parent().addClass('is-active');

        if (!this.options.multiExpand && !firstTime) {
          var $currentActive = this.$element.children('.is-active').children('[data-tab-content]');
          if ($currentActive.length) {
            this.up($currentActive.not($target));
          }
        }

        $target.slideDown(this.options.slideSpeed, function () {
          /**
           * Fires when the tab is done opening.
           * @event Accordion#down
           */
          _this3.$element.trigger('down.zf.accordion', [$target]);
        });

        $('#' + $target.attr('aria-labelledby')).attr({
          'aria-expanded': true,
          'aria-selected': true
        });
      }

      /**
       * Closes the tab defined by `$target`.
       * @param {jQuery} $target - Accordion tab to close (`.accordion-content`).
       * @fires Accordion#up
       * @function
       */

    }, {
      key: 'up',
      value: function up($target) {
        var $aunts = $target.parent().siblings(),
            _this = this;

        if (!this.options.allowAllClosed && !$aunts.hasClass('is-active') || !$target.parent().hasClass('is-active')) {
          return;
        }

        // Foundation.Move(this.options.slideSpeed, $target, function(){
        $target.slideUp(_this.options.slideSpeed, function () {
          /**
           * Fires when the tab is done collapsing up.
           * @event Accordion#up
           */
          _this.$element.trigger('up.zf.accordion', [$target]);
        });
        // });

        $target.attr('aria-hidden', true).parent().removeClass('is-active');

        $('#' + $target.attr('aria-labelledby')).attr({
          'aria-expanded': false,
          'aria-selected': false
        });
      }

      /**
       * Destroys an instance of an accordion.
       * @fires Accordion#destroyed
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.find('[data-tab-content]').stop(true).slideUp(0).css('display', '');
        this.$element.find('a').off('.zf.accordion');
        if (this.options.deepLink) {
          $(window).off('popstate', this._checkDeepLink);
        }

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Accordion;
  }();

  Accordion.defaults = {
    /**
     * Amount of time to animate the opening of an accordion pane.
     * @option
     * @type {number}
     * @default 250
     */
    slideSpeed: 250,
    /**
     * Allow the accordion to have multiple open panes.
     * @option
     * @type {boolean}
     * @default false
     */
    multiExpand: false,
    /**
     * Allow the accordion to close all panes.
     * @option
     * @type {boolean}
     * @default false
     */
    allowAllClosed: false,
    /**
     * Allows the window to scroll to content of pane specified by hash anchor
     * @option
     * @type {boolean}
     * @default false
     */
    deepLink: false,

    /**
     * Adjust the deep link scroll to make sure the top of the accordion panel is visible
     * @option
     * @type {boolean}
     * @default false
     */
    deepLinkSmudge: false,

    /**
     * Animation time (ms) for the deep link adjustment
     * @option
     * @type {number}
     * @default 300
     */
    deepLinkSmudgeDelay: 300,

    /**
     * Update the browser history with the open accordion
     * @option
     * @type {boolean}
     * @default false
     */
    updateHistory: false
  };

  // Window exports
  Foundation.plugin(Accordion, 'Accordion');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * AccordionMenu module.
   * @module foundation.accordionMenu
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.nest
   */

  var AccordionMenu = function () {
    /**
     * Creates a new instance of an accordion menu.
     * @class
     * @fires AccordionMenu#init
     * @param {jQuery} element - jQuery object to make into an accordion menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function AccordionMenu(element, options) {
      _classCallCheck(this, AccordionMenu);

      this.$element = element;
      this.options = $.extend({}, AccordionMenu.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'accordion');

      this._init();

      Foundation.registerPlugin(this, 'AccordionMenu');
      Foundation.Keyboard.register('AccordionMenu', {
        'ENTER': 'toggle',
        'SPACE': 'toggle',
        'ARROW_RIGHT': 'open',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'close',
        'ESCAPE': 'closeAll'
      });
    }

    /**
     * Initializes the accordion menu by hiding all nested menus.
     * @private
     */


    _createClass(AccordionMenu, [{
      key: '_init',
      value: function _init() {
        this.$element.find('[data-submenu]').not('.is-active').slideUp(0); //.find('a').css('padding-left', '1rem');
        this.$element.attr({
          'role': 'menu',
          'aria-multiselectable': this.options.multiOpen
        });

        this.$menuLinks = this.$element.find('.is-accordion-submenu-parent');
        this.$menuLinks.each(function () {
          var linkId = this.id || Foundation.GetYoDigits(6, 'acc-menu-link'),
              $elem = $(this),
              $sub = $elem.children('[data-submenu]'),
              subId = $sub[0].id || Foundation.GetYoDigits(6, 'acc-menu'),
              isActive = $sub.hasClass('is-active');
          $elem.attr({
            'aria-controls': subId,
            'aria-expanded': isActive,
            'role': 'menuitem',
            'id': linkId
          });
          $sub.attr({
            'aria-labelledby': linkId,
            'aria-hidden': !isActive,
            'role': 'menu',
            'id': subId
          });
        });
        var initPanes = this.$element.find('.is-active');
        if (initPanes.length) {
          var _this = this;
          initPanes.each(function () {
            _this.down($(this));
          });
        }
        this._events();
      }

      /**
       * Adds event handlers for items within the menu.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        this.$element.find('li').each(function () {
          var $submenu = $(this).children('[data-submenu]');

          if ($submenu.length) {
            $(this).children('a').off('click.zf.accordionMenu').on('click.zf.accordionMenu', function (e) {
              e.preventDefault();

              _this.toggle($submenu);
            });
          }
        }).on('keydown.zf.accordionmenu', function (e) {
          var $element = $(this),
              $elements = $element.parent('ul').children('li'),
              $prevElement,
              $nextElement,
              $target = $element.children('[data-submenu]');

          $elements.each(function (i) {
            if ($(this).is($element)) {
              $prevElement = $elements.eq(Math.max(0, i - 1)).find('a').first();
              $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1)).find('a').first();

              if ($(this).children('[data-submenu]:visible').length) {
                // has open sub menu
                $nextElement = $element.find('li:first-child').find('a').first();
              }
              if ($(this).is(':first-child')) {
                // is first element of sub menu
                $prevElement = $element.parents('li').first().find('a').first();
              } else if ($prevElement.parents('li').first().children('[data-submenu]:visible').length) {
                // if previous element has open sub menu
                $prevElement = $prevElement.parents('li').find('li:last-child').find('a').first();
              }
              if ($(this).is(':last-child')) {
                // is last element of sub menu
                $nextElement = $element.parents('li').first().next('li').find('a').first();
              }

              return;
            }
          });

          Foundation.Keyboard.handleKey(e, 'AccordionMenu', {
            open: function () {
              if ($target.is(':hidden')) {
                _this.down($target);
                $target.find('li').first().find('a').first().focus();
              }
            },
            close: function () {
              if ($target.length && !$target.is(':hidden')) {
                // close active sub of this item
                _this.up($target);
              } else if ($element.parent('[data-submenu]').length) {
                // close currently open sub
                _this.up($element.parent('[data-submenu]'));
                $element.parents('li').first().find('a').first().focus();
              }
            },
            up: function () {
              $prevElement.focus();
              return true;
            },
            down: function () {
              $nextElement.focus();
              return true;
            },
            toggle: function () {
              if ($element.children('[data-submenu]').length) {
                _this.toggle($element.children('[data-submenu]'));
              }
            },
            closeAll: function () {
              _this.hideAll();
            },
            handled: function (preventDefault) {
              if (preventDefault) {
                e.preventDefault();
              }
              e.stopImmediatePropagation();
            }
          });
        }); //.attr('tabindex', 0);
      }

      /**
       * Closes all panes of the menu.
       * @function
       */

    }, {
      key: 'hideAll',
      value: function hideAll() {
        this.up(this.$element.find('[data-submenu]'));
      }

      /**
       * Opens all panes of the menu.
       * @function
       */

    }, {
      key: 'showAll',
      value: function showAll() {
        this.down(this.$element.find('[data-submenu]'));
      }

      /**
       * Toggles the open/close state of a submenu.
       * @function
       * @param {jQuery} $target - the submenu to toggle
       */

    }, {
      key: 'toggle',
      value: function toggle($target) {
        if (!$target.is(':animated')) {
          if (!$target.is(':hidden')) {
            this.up($target);
          } else {
            this.down($target);
          }
        }
      }

      /**
       * Opens the sub-menu defined by `$target`.
       * @param {jQuery} $target - Sub-menu to open.
       * @fires AccordionMenu#down
       */

    }, {
      key: 'down',
      value: function down($target) {
        var _this = this;

        if (!this.options.multiOpen) {
          this.up(this.$element.find('.is-active').not($target.parentsUntil(this.$element).add($target)));
        }

        $target.addClass('is-active').attr({ 'aria-hidden': false }).parent('.is-accordion-submenu-parent').attr({ 'aria-expanded': true });

        //Foundation.Move(this.options.slideSpeed, $target, function() {
        $target.slideDown(_this.options.slideSpeed, function () {
          /**
           * Fires when the menu is done opening.
           * @event AccordionMenu#down
           */
          _this.$element.trigger('down.zf.accordionMenu', [$target]);
        });
        //});
      }

      /**
       * Closes the sub-menu defined by `$target`. All sub-menus inside the target will be closed as well.
       * @param {jQuery} $target - Sub-menu to close.
       * @fires AccordionMenu#up
       */

    }, {
      key: 'up',
      value: function up($target) {
        var _this = this;
        //Foundation.Move(this.options.slideSpeed, $target, function(){
        $target.slideUp(_this.options.slideSpeed, function () {
          /**
           * Fires when the menu is done collapsing up.
           * @event AccordionMenu#up
           */
          _this.$element.trigger('up.zf.accordionMenu', [$target]);
        });
        //});

        var $menus = $target.find('[data-submenu]').slideUp(0).addBack().attr('aria-hidden', true);

        $menus.parent('.is-accordion-submenu-parent').attr('aria-expanded', false);
      }

      /**
       * Destroys an instance of accordion menu.
       * @fires AccordionMenu#destroyed
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.find('[data-submenu]').slideDown(0).css('display', '');
        this.$element.find('a').off('click.zf.accordionMenu');

        Foundation.Nest.Burn(this.$element, 'accordion');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return AccordionMenu;
  }();

  AccordionMenu.defaults = {
    /**
     * Amount of time to animate the opening of a submenu in ms.
     * @option
     * @type {number}
     * @default 250
     */
    slideSpeed: 250,
    /**
     * Allow the menu to have multiple open panes.
     * @option
     * @type {boolean}
     * @default true
     */
    multiOpen: true
  };

  // Window exports
  Foundation.plugin(AccordionMenu, 'AccordionMenu');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Drilldown module.
   * @module foundation.drilldown
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.nest
   */

  var Drilldown = function () {
    /**
     * Creates a new instance of a drilldown menu.
     * @class
     * @param {jQuery} element - jQuery object to make into an accordion menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Drilldown(element, options) {
      _classCallCheck(this, Drilldown);

      this.$element = element;
      this.options = $.extend({}, Drilldown.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'drilldown');

      this._init();

      Foundation.registerPlugin(this, 'Drilldown');
      Foundation.Keyboard.register('Drilldown', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'previous',
        'ESCAPE': 'close',
        'TAB': 'down',
        'SHIFT_TAB': 'up'
      });
    }

    /**
     * Initializes the drilldown by creating jQuery collections of elements
     * @private
     */


    _createClass(Drilldown, [{
      key: '_init',
      value: function _init() {
        this.$submenuAnchors = this.$element.find('li.is-drilldown-submenu-parent').children('a');
        this.$submenus = this.$submenuAnchors.parent('li').children('[data-submenu]');
        this.$menuItems = this.$element.find('li').not('.js-drilldown-back').attr('role', 'menuitem').find('a');
        this.$element.attr('data-mutate', this.$element.attr('data-drilldown') || Foundation.GetYoDigits(6, 'drilldown'));

        this._prepareMenu();
        this._registerEvents();

        this._keyboardEvents();
      }

      /**
       * prepares drilldown menu by setting attributes to links and elements
       * sets a min height to prevent content jumping
       * wraps the element if not already wrapped
       * @private
       * @function
       */

    }, {
      key: '_prepareMenu',
      value: function _prepareMenu() {
        var _this = this;
        // if(!this.options.holdOpen){
        //   this._menuLinkEvents();
        // }
        this.$submenuAnchors.each(function () {
          var $link = $(this);
          var $sub = $link.parent();
          if (_this.options.parentLink) {
            $link.clone().prependTo($sub.children('[data-submenu]')).wrap('<li class="is-submenu-parent-item is-submenu-item is-drilldown-submenu-item" role="menu-item"></li>');
          }
          $link.data('savedHref', $link.attr('href')).removeAttr('href').attr('tabindex', 0);
          $link.children('[data-submenu]').attr({
            'aria-hidden': true,
            'tabindex': 0,
            'role': 'menu'
          });
          _this._events($link);
        });
        this.$submenus.each(function () {
          var $menu = $(this),
              $back = $menu.find('.js-drilldown-back');
          if (!$back.length) {
            switch (_this.options.backButtonPosition) {
              case "bottom":
                $menu.append(_this.options.backButton);
                break;
              case "top":
                $menu.prepend(_this.options.backButton);
                break;
              default:
                console.error("Unsupported backButtonPosition value '" + _this.options.backButtonPosition + "'");
            }
          }
          _this._back($menu);
        });

        this.$submenus.addClass('invisible');
        if (!this.options.autoHeight) {
          this.$submenus.addClass('drilldown-submenu-cover-previous');
        }

        // create a wrapper on element if it doesn't exist.
        if (!this.$element.parent().hasClass('is-drilldown')) {
          this.$wrapper = $(this.options.wrapper).addClass('is-drilldown');
          if (this.options.animateHeight) this.$wrapper.addClass('animate-height');
          this.$element.wrap(this.$wrapper);
        }
        // set wrapper
        this.$wrapper = this.$element.parent();
        this.$wrapper.css(this._getMaxDims());
      }
    }, {
      key: '_resize',
      value: function _resize() {
        this.$wrapper.css({ 'max-width': 'none', 'min-height': 'none' });
        // _getMaxDims has side effects (boo) but calling it should update all other necessary heights & widths
        this.$wrapper.css(this._getMaxDims());
      }

      /**
       * Adds event handlers to elements in the menu.
       * @function
       * @private
       * @param {jQuery} $elem - the current menu item to add handlers to.
       */

    }, {
      key: '_events',
      value: function _events($elem) {
        var _this = this;

        $elem.off('click.zf.drilldown').on('click.zf.drilldown', function (e) {
          if ($(e.target).parentsUntil('ul', 'li').hasClass('is-drilldown-submenu-parent')) {
            e.stopImmediatePropagation();
            e.preventDefault();
          }

          // if(e.target !== e.currentTarget.firstElementChild){
          //   return false;
          // }
          _this._show($elem.parent('li'));

          if (_this.options.closeOnClick) {
            var $body = $('body');
            $body.off('.zf.drilldown').on('click.zf.drilldown', function (e) {
              if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target)) {
                return;
              }
              e.preventDefault();
              _this._hideAll();
              $body.off('.zf.drilldown');
            });
          }
        });
        this.$element.on('mutateme.zf.trigger', this._resize.bind(this));
      }

      /**
       * Adds event handlers to the menu element.
       * @function
       * @private
       */

    }, {
      key: '_registerEvents',
      value: function _registerEvents() {
        if (this.options.scrollTop) {
          this._bindHandler = this._scrollTop.bind(this);
          this.$element.on('open.zf.drilldown hide.zf.drilldown closed.zf.drilldown', this._bindHandler);
        }
      }

      /**
       * Scroll to Top of Element or data-scroll-top-element
       * @function
       * @fires Drilldown#scrollme
       */

    }, {
      key: '_scrollTop',
      value: function _scrollTop() {
        var _this = this;
        var $scrollTopElement = _this.options.scrollTopElement != '' ? $(_this.options.scrollTopElement) : _this.$element,
            scrollPos = parseInt($scrollTopElement.offset().top + _this.options.scrollTopOffset);
        $('html, body').stop(true).animate({ scrollTop: scrollPos }, _this.options.animationDuration, _this.options.animationEasing, function () {
          /**
            * Fires after the menu has scrolled
            * @event Drilldown#scrollme
            */
          if (this === $('html')[0]) _this.$element.trigger('scrollme.zf.drilldown');
        });
      }

      /**
       * Adds keydown event listener to `li`'s in the menu.
       * @private
       */

    }, {
      key: '_keyboardEvents',
      value: function _keyboardEvents() {
        var _this = this;

        this.$menuItems.add(this.$element.find('.js-drilldown-back > a, .is-submenu-parent-item > a')).on('keydown.zf.drilldown', function (e) {
          var $element = $(this),
              $elements = $element.parent('li').parent('ul').children('li').children('a'),
              $prevElement,
              $nextElement;

          $elements.each(function (i) {
            if ($(this).is($element)) {
              $prevElement = $elements.eq(Math.max(0, i - 1));
              $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1));
              return;
            }
          });

          Foundation.Keyboard.handleKey(e, 'Drilldown', {
            next: function () {
              if ($element.is(_this.$submenuAnchors)) {
                _this._show($element.parent('li'));
                $element.parent('li').one(Foundation.transitionend($element), function () {
                  $element.parent('li').find('ul li a').filter(_this.$menuItems).first().focus();
                });
                return true;
              }
            },
            previous: function () {
              _this._hide($element.parent('li').parent('ul'));
              $element.parent('li').parent('ul').one(Foundation.transitionend($element), function () {
                setTimeout(function () {
                  $element.parent('li').parent('ul').parent('li').children('a').first().focus();
                }, 1);
              });
              return true;
            },
            up: function () {
              $prevElement.focus();
              // Don't tap focus on first element in root ul
              return !$element.is(_this.$element.find('> li:first-child > a'));
            },
            down: function () {
              $nextElement.focus();
              // Don't tap focus on last element in root ul
              return !$element.is(_this.$element.find('> li:last-child > a'));
            },
            close: function () {
              // Don't close on element in root ul
              if (!$element.is(_this.$element.find('> li > a'))) {
                _this._hide($element.parent().parent());
                $element.parent().parent().siblings('a').focus();
              }
            },
            open: function () {
              if (!$element.is(_this.$menuItems)) {
                // not menu item means back button
                _this._hide($element.parent('li').parent('ul'));
                $element.parent('li').parent('ul').one(Foundation.transitionend($element), function () {
                  setTimeout(function () {
                    $element.parent('li').parent('ul').parent('li').children('a').first().focus();
                  }, 1);
                });
                return true;
              } else if ($element.is(_this.$submenuAnchors)) {
                _this._show($element.parent('li'));
                $element.parent('li').one(Foundation.transitionend($element), function () {
                  $element.parent('li').find('ul li a').filter(_this.$menuItems).first().focus();
                });
                return true;
              }
            },
            handled: function (preventDefault) {
              if (preventDefault) {
                e.preventDefault();
              }
              e.stopImmediatePropagation();
            }
          });
        }); // end keyboardAccess
      }

      /**
       * Closes all open elements, and returns to root menu.
       * @function
       * @fires Drilldown#closed
       */

    }, {
      key: '_hideAll',
      value: function _hideAll() {
        var $elem = this.$element.find('.is-drilldown-submenu.is-active').addClass('is-closing');
        if (this.options.autoHeight) this.$wrapper.css({ height: $elem.parent().closest('ul').data('calcHeight') });
        $elem.one(Foundation.transitionend($elem), function (e) {
          $elem.removeClass('is-active is-closing');
        });
        /**
         * Fires when the menu is fully closed.
         * @event Drilldown#closed
         */
        this.$element.trigger('closed.zf.drilldown');
      }

      /**
       * Adds event listener for each `back` button, and closes open menus.
       * @function
       * @fires Drilldown#back
       * @param {jQuery} $elem - the current sub-menu to add `back` event.
       */

    }, {
      key: '_back',
      value: function _back($elem) {
        var _this = this;
        $elem.off('click.zf.drilldown');
        $elem.children('.js-drilldown-back').on('click.zf.drilldown', function (e) {
          e.stopImmediatePropagation();
          // console.log('mouseup on back');
          _this._hide($elem);

          // If there is a parent submenu, call show
          var parentSubMenu = $elem.parent('li').parent('ul').parent('li');
          if (parentSubMenu.length) {
            _this._show(parentSubMenu);
          }
        });
      }

      /**
       * Adds event listener to menu items w/o submenus to close open menus on click.
       * @function
       * @private
       */

    }, {
      key: '_menuLinkEvents',
      value: function _menuLinkEvents() {
        var _this = this;
        this.$menuItems.not('.is-drilldown-submenu-parent').off('click.zf.drilldown').on('click.zf.drilldown', function (e) {
          // e.stopImmediatePropagation();
          setTimeout(function () {
            _this._hideAll();
          }, 0);
        });
      }

      /**
       * Opens a submenu.
       * @function
       * @fires Drilldown#open
       * @param {jQuery} $elem - the current element with a submenu to open, i.e. the `li` tag.
       */

    }, {
      key: '_show',
      value: function _show($elem) {
        if (this.options.autoHeight) this.$wrapper.css({ height: $elem.children('[data-submenu]').data('calcHeight') });
        $elem.attr('aria-expanded', true);
        $elem.children('[data-submenu]').addClass('is-active').removeClass('invisible').attr('aria-hidden', false);
        /**
         * Fires when the submenu has opened.
         * @event Drilldown#open
         */
        this.$element.trigger('open.zf.drilldown', [$elem]);
      }
    }, {
      key: '_hide',


      /**
       * Hides a submenu
       * @function
       * @fires Drilldown#hide
       * @param {jQuery} $elem - the current sub-menu to hide, i.e. the `ul` tag.
       */
      value: function _hide($elem) {
        if (this.options.autoHeight) this.$wrapper.css({ height: $elem.parent().closest('ul').data('calcHeight') });
        var _this = this;
        $elem.parent('li').attr('aria-expanded', false);
        $elem.attr('aria-hidden', true).addClass('is-closing');
        $elem.addClass('is-closing').one(Foundation.transitionend($elem), function () {
          $elem.removeClass('is-active is-closing');
          $elem.blur().addClass('invisible');
        });
        /**
         * Fires when the submenu has closed.
         * @event Drilldown#hide
         */
        $elem.trigger('hide.zf.drilldown', [$elem]);
      }

      /**
       * Iterates through the nested menus to calculate the min-height, and max-width for the menu.
       * Prevents content jumping.
       * @function
       * @private
       */

    }, {
      key: '_getMaxDims',
      value: function _getMaxDims() {
        var maxHeight = 0,
            result = {},
            _this = this;
        this.$submenus.add(this.$element).each(function () {
          var numOfElems = $(this).children('li').length;
          var height = Foundation.Box.GetDimensions(this).height;
          maxHeight = height > maxHeight ? height : maxHeight;
          if (_this.options.autoHeight) {
            $(this).data('calcHeight', height);
            if (!$(this).hasClass('is-drilldown-submenu')) result['height'] = height;
          }
        });

        if (!this.options.autoHeight) result['min-height'] = maxHeight + 'px';

        result['max-width'] = this.$element[0].getBoundingClientRect().width + 'px';

        return result;
      }

      /**
       * Destroys the Drilldown Menu
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        if (this.options.scrollTop) this.$element.off('.zf.drilldown', this._bindHandler);
        this._hideAll();
        this.$element.off('mutateme.zf.trigger');
        Foundation.Nest.Burn(this.$element, 'drilldown');
        this.$element.unwrap().find('.js-drilldown-back, .is-submenu-parent-item').remove().end().find('.is-active, .is-closing, .is-drilldown-submenu').removeClass('is-active is-closing is-drilldown-submenu').end().find('[data-submenu]').removeAttr('aria-hidden tabindex role');
        this.$submenuAnchors.each(function () {
          $(this).off('.zf.drilldown');
        });

        this.$submenus.removeClass('drilldown-submenu-cover-previous');

        this.$element.find('a').each(function () {
          var $link = $(this);
          $link.removeAttr('tabindex');
          if ($link.data('savedHref')) {
            $link.attr('href', $link.data('savedHref')).removeData('savedHref');
          } else {
            return;
          }
        });
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Drilldown;
  }();

  Drilldown.defaults = {
    /**
     * Markup used for JS generated back button. Prepended  or appended (see backButtonPosition) to submenu lists and deleted on `destroy` method, 'js-drilldown-back' class required. Remove the backslash (`\`) if copy and pasting.
     * @option
     * @type {string}
     * @default '<li class="js-drilldown-back"><a tabindex="0">Back</a></li>'
     */
    backButton: '<li class="js-drilldown-back"><a tabindex="0">Back</a></li>',
    /**
     * Position the back button either at the top or bottom of drilldown submenus. Can be `'left'` or `'bottom'`.
     * @option
     * @type {string}
     * @default top
     */
    backButtonPosition: 'top',
    /**
     * Markup used to wrap drilldown menu. Use a class name for independent styling; the JS applied class: `is-drilldown` is required. Remove the backslash (`\`) if copy and pasting.
     * @option
     * @type {string}
     * @default '<div></div>'
     */
    wrapper: '<div></div>',
    /**
     * Adds the parent link to the submenu.
     * @option
     * @type {boolean}
     * @default false
     */
    parentLink: false,
    /**
     * Allow the menu to return to root list on body click.
     * @option
     * @type {boolean}
     * @default false
     */
    closeOnClick: false,
    /**
     * Allow the menu to auto adjust height.
     * @option
     * @type {boolean}
     * @default false
     */
    autoHeight: false,
    /**
     * Animate the auto adjust height.
     * @option
     * @type {boolean}
     * @default false
     */
    animateHeight: false,
    /**
     * Scroll to the top of the menu after opening a submenu or navigating back using the menu back button
     * @option
     * @type {boolean}
     * @default false
     */
    scrollTop: false,
    /**
     * String jquery selector (for example 'body') of element to take offset().top from, if empty string the drilldown menu offset().top is taken
     * @option
     * @type {string}
     * @default ''
     */
    scrollTopElement: '',
    /**
     * ScrollTop offset
     * @option
     * @type {number}
     * @default 0
     */
    scrollTopOffset: 0,
    /**
     * Scroll animation duration
     * @option
     * @type {number}
     * @default 500
     */
    animationDuration: 500,
    /**
     * Scroll animation easing. Can be `'swing'` or `'linear'`.
     * @option
     * @type {string}
     * @see {@link https://api.jquery.com/animate|JQuery animate}
     * @default 'swing'
     */
    animationEasing: 'swing'
    // holdOpen: false
  };

  // Window exports
  Foundation.plugin(Drilldown, 'Drilldown');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Dropdown module.
   * @module foundation.dropdown
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.triggers
   */

  var Dropdown = function () {
    /**
     * Creates a new instance of a dropdown.
     * @class
     * @param {jQuery} element - jQuery object to make into a dropdown.
     *        Object should be of the dropdown panel, rather than its anchor.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Dropdown(element, options) {
      _classCallCheck(this, Dropdown);

      this.$element = element;
      this.options = $.extend({}, Dropdown.defaults, this.$element.data(), options);
      this._init();

      Foundation.registerPlugin(this, 'Dropdown');
      Foundation.Keyboard.register('Dropdown', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the plugin by setting/checking options and attributes, adding helper variables, and saving the anchor.
     * @function
     * @private
     */


    _createClass(Dropdown, [{
      key: '_init',
      value: function _init() {
        var $id = this.$element.attr('id');

        this.$anchor = $('[data-toggle="' + $id + '"]').length ? $('[data-toggle="' + $id + '"]') : $('[data-open="' + $id + '"]');
        this.$anchor.attr({
          'aria-controls': $id,
          'data-is-focus': false,
          'data-yeti-box': $id,
          'aria-haspopup': true,
          'aria-expanded': false

        });

        if (this.options.parentClass) {
          this.$parent = this.$element.parents('.' + this.options.parentClass);
        } else {
          this.$parent = null;
        }
        this.options.positionClass = this.getPositionClass();
        this.counter = 4;
        this.usedPositions = [];
        this.$element.attr({
          'aria-hidden': 'true',
          'data-yeti-box': $id,
          'data-resize': $id,
          'aria-labelledby': this.$anchor[0].id || Foundation.GetYoDigits(6, 'dd-anchor')
        });
        this._events();
      }

      /**
       * Helper function to determine current orientation of dropdown pane.
       * @function
       * @returns {String} position - string value of a position class.
       */

    }, {
      key: 'getPositionClass',
      value: function getPositionClass() {
        var verticalPosition = this.$element[0].className.match(/(top|left|right|bottom)/g);
        verticalPosition = verticalPosition ? verticalPosition[0] : '';
        var horizontalPosition = /float-(\S+)/.exec(this.$anchor[0].className);
        horizontalPosition = horizontalPosition ? horizontalPosition[1] : '';
        var position = horizontalPosition ? horizontalPosition + ' ' + verticalPosition : verticalPosition;

        return position;
      }

      /**
       * Adjusts the dropdown panes orientation by adding/removing positioning classes.
       * @function
       * @private
       * @param {String} position - position class to remove.
       */

    }, {
      key: '_reposition',
      value: function _reposition(position) {
        this.usedPositions.push(position ? position : 'bottom');
        //default, try switching to opposite side
        if (!position && this.usedPositions.indexOf('top') < 0) {
          this.$element.addClass('top');
        } else if (position === 'top' && this.usedPositions.indexOf('bottom') < 0) {
          this.$element.removeClass(position);
        } else if (position === 'left' && this.usedPositions.indexOf('right') < 0) {
          this.$element.removeClass(position).addClass('right');
        } else if (position === 'right' && this.usedPositions.indexOf('left') < 0) {
          this.$element.removeClass(position).addClass('left');
        }

        //if default change didn't work, try bottom or left first
        else if (!position && this.usedPositions.indexOf('top') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.$element.addClass('left');
          } else if (position === 'top' && this.usedPositions.indexOf('bottom') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.$element.removeClass(position).addClass('left');
          } else if (position === 'left' && this.usedPositions.indexOf('right') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.$element.removeClass(position);
          } else if (position === 'right' && this.usedPositions.indexOf('left') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.$element.removeClass(position);
          }
          //if nothing cleared, set to bottom
          else {
              this.$element.removeClass(position);
            }
        this.classChanged = true;
        this.counter--;
      }

      /**
       * Sets the position and orientation of the dropdown pane, checks for collisions.
       * Recursively calls itself if a collision is detected, with a new position class.
       * @function
       * @private
       */

    }, {
      key: '_setPosition',
      value: function _setPosition() {
        if (this.$anchor.attr('aria-expanded') === 'false') {
          return false;
        }
        var position = this.getPositionClass(),
            $eleDims = Foundation.Box.GetDimensions(this.$element),
            $anchorDims = Foundation.Box.GetDimensions(this.$anchor),
            _this = this,
            direction = position === 'left' ? 'left' : position === 'right' ? 'left' : 'top',
            param = direction === 'top' ? 'height' : 'width',
            offset = param === 'height' ? this.options.vOffset : this.options.hOffset;

        if ($eleDims.width >= $eleDims.windowDims.width || !this.counter && !Foundation.Box.ImNotTouchingYou(this.$element, this.$parent)) {
          var newWidth = $eleDims.windowDims.width,
              parentHOffset = 0;
          if (this.$parent) {
            var $parentDims = Foundation.Box.GetDimensions(this.$parent),
                parentHOffset = $parentDims.offset.left;
            if ($parentDims.width < newWidth) {
              newWidth = $parentDims.width;
            }
          }

          this.$element.offset(Foundation.Box.GetOffsets(this.$element, this.$anchor, 'center bottom', this.options.vOffset, this.options.hOffset + parentHOffset, true)).css({
            'width': newWidth - this.options.hOffset * 2,
            'height': 'auto'
          });
          this.classChanged = true;
          return false;
        }

        this.$element.offset(Foundation.Box.GetOffsets(this.$element, this.$anchor, position, this.options.vOffset, this.options.hOffset));

        while (!Foundation.Box.ImNotTouchingYou(this.$element, this.$parent, true) && this.counter) {
          this._reposition(position);
          this._setPosition();
        }
      }

      /**
       * Adds event listeners to the element utilizing the triggers utility library.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;
        this.$element.on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': this.close.bind(this),
          'toggle.zf.trigger': this.toggle.bind(this),
          'resizeme.zf.trigger': this._setPosition.bind(this)
        });

        if (this.options.hover) {
          this.$anchor.off('mouseenter.zf.dropdown mouseleave.zf.dropdown').on('mouseenter.zf.dropdown', function () {
            var bodyData = $('body').data();
            if (typeof bodyData.whatinput === 'undefined' || bodyData.whatinput === 'mouse') {
              clearTimeout(_this.timeout);
              _this.timeout = setTimeout(function () {
                _this.open();
                _this.$anchor.data('hover', true);
              }, _this.options.hoverDelay);
            }
          }).on('mouseleave.zf.dropdown', function () {
            clearTimeout(_this.timeout);
            _this.timeout = setTimeout(function () {
              _this.close();
              _this.$anchor.data('hover', false);
            }, _this.options.hoverDelay);
          });
          if (this.options.hoverPane) {
            this.$element.off('mouseenter.zf.dropdown mouseleave.zf.dropdown').on('mouseenter.zf.dropdown', function () {
              clearTimeout(_this.timeout);
            }).on('mouseleave.zf.dropdown', function () {
              clearTimeout(_this.timeout);
              _this.timeout = setTimeout(function () {
                _this.close();
                _this.$anchor.data('hover', false);
              }, _this.options.hoverDelay);
            });
          }
        }
        this.$anchor.add(this.$element).on('keydown.zf.dropdown', function (e) {

          var $target = $(this),
              visibleFocusableElements = Foundation.Keyboard.findFocusable(_this.$element);

          Foundation.Keyboard.handleKey(e, 'Dropdown', {
            open: function () {
              if ($target.is(_this.$anchor)) {
                _this.open();
                _this.$element.attr('tabindex', -1).focus();
                e.preventDefault();
              }
            },
            close: function () {
              _this.close();
              _this.$anchor.focus();
            }
          });
        });
      }

      /**
       * Adds an event handler to the body to close any dropdowns on a click.
       * @function
       * @private
       */

    }, {
      key: '_addBodyHandler',
      value: function _addBodyHandler() {
        var $body = $(document.body).not(this.$element),
            _this = this;
        $body.off('click.zf.dropdown').on('click.zf.dropdown', function (e) {
          if (_this.$anchor.is(e.target) || _this.$anchor.find(e.target).length) {
            return;
          }
          if (_this.$element.find(e.target).length) {
            return;
          }
          _this.close();
          $body.off('click.zf.dropdown');
        });
      }

      /**
       * Opens the dropdown pane, and fires a bubbling event to close other dropdowns.
       * @function
       * @fires Dropdown#closeme
       * @fires Dropdown#show
       */

    }, {
      key: 'open',
      value: function open() {
        // var _this = this;
        /**
         * Fires to close other open dropdowns, typically when dropdown is opening
         * @event Dropdown#closeme
         */
        this.$element.trigger('closeme.zf.dropdown', this.$element.attr('id'));
        this.$anchor.addClass('hover').attr({ 'aria-expanded': true });
        // this.$element/*.show()*/;
        this._setPosition();
        this.$element.addClass('is-open').attr({ 'aria-hidden': false });

        if (this.options.autoFocus) {
          var $focusable = Foundation.Keyboard.findFocusable(this.$element);
          if ($focusable.length) {
            $focusable.eq(0).focus();
          }
        }

        if (this.options.closeOnClick) {
          this._addBodyHandler();
        }

        if (this.options.trapFocus) {
          Foundation.Keyboard.trapFocus(this.$element);
        }

        /**
         * Fires once the dropdown is visible.
         * @event Dropdown#show
         */
        this.$element.trigger('show.zf.dropdown', [this.$element]);
      }

      /**
       * Closes the open dropdown pane.
       * @function
       * @fires Dropdown#hide
       */

    }, {
      key: 'close',
      value: function close() {
        if (!this.$element.hasClass('is-open')) {
          return false;
        }
        this.$element.removeClass('is-open').attr({ 'aria-hidden': true });

        this.$anchor.removeClass('hover').attr('aria-expanded', false);

        if (this.classChanged) {
          var curPositionClass = this.getPositionClass();
          if (curPositionClass) {
            this.$element.removeClass(curPositionClass);
          }
          this.$element.addClass(this.options.positionClass)
          /*.hide()*/.css({ height: '', width: '' });
          this.classChanged = false;
          this.counter = 4;
          this.usedPositions.length = 0;
        }
        /**
         * Fires once the dropdown is no longer visible.
         * @event Dropdown#hide
         */
        this.$element.trigger('hide.zf.dropdown', [this.$element]);

        if (this.options.trapFocus) {
          Foundation.Keyboard.releaseFocus(this.$element);
        }
      }

      /**
       * Toggles the dropdown pane's visibility.
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        if (this.$element.hasClass('is-open')) {
          if (this.$anchor.data('hover')) return;
          this.close();
        } else {
          this.open();
        }
      }

      /**
       * Destroys the dropdown.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.trigger').hide();
        this.$anchor.off('.zf.dropdown');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Dropdown;
  }();

  Dropdown.defaults = {
    /**
     * Class that designates bounding container of Dropdown (default: window)
     * @option
     * @type {?string}
     * @default null
     */
    parentClass: null,
    /**
     * Amount of time to delay opening a submenu on hover event.
     * @option
     * @type {number}
     * @default 250
     */
    hoverDelay: 250,
    /**
     * Allow submenus to open on hover events
     * @option
     * @type {boolean}
     * @default false
     */
    hover: false,
    /**
     * Don't close dropdown when hovering over dropdown pane
     * @option
     * @type {boolean}
     * @default false
     */
    hoverPane: false,
    /**
     * Number of pixels between the dropdown pane and the triggering element on open.
     * @option
     * @type {number}
     * @default 1
     */
    vOffset: 1,
    /**
     * Number of pixels between the dropdown pane and the triggering element on open.
     * @option
     * @type {number}
     * @default 1
     */
    hOffset: 1,
    /**
     * Class applied to adjust open position. JS will test and fill this in.
     * @option
     * @type {string}
     * @default ''
     */
    positionClass: '',
    /**
     * Allow the plugin to trap focus to the dropdown pane if opened with keyboard commands.
     * @option
     * @type {boolean}
     * @default false
     */
    trapFocus: false,
    /**
     * Allow the plugin to set focus to the first focusable element within the pane, regardless of method of opening.
     * @option
     * @type {boolean}
     * @default false
     */
    autoFocus: false,
    /**
     * Allows a click on the body to close the dropdown.
     * @option
     * @type {boolean}
     * @default false
     */
    closeOnClick: false
  };

  // Window exports
  Foundation.plugin(Dropdown, 'Dropdown');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * DropdownMenu module.
   * @module foundation.dropdown-menu
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.nest
   */

  var DropdownMenu = function () {
    /**
     * Creates a new instance of DropdownMenu.
     * @class
     * @fires DropdownMenu#init
     * @param {jQuery} element - jQuery object to make into a dropdown menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function DropdownMenu(element, options) {
      _classCallCheck(this, DropdownMenu);

      this.$element = element;
      this.options = $.extend({}, DropdownMenu.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'dropdown');
      this._init();

      Foundation.registerPlugin(this, 'DropdownMenu');
      Foundation.Keyboard.register('DropdownMenu', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'previous',
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the plugin, and calls _prepareMenu
     * @private
     * @function
     */


    _createClass(DropdownMenu, [{
      key: '_init',
      value: function _init() {
        var subs = this.$element.find('li.is-dropdown-submenu-parent');
        this.$element.children('.is-dropdown-submenu-parent').children('.is-dropdown-submenu').addClass('first-sub');

        this.$menuItems = this.$element.find('[role="menuitem"]');
        this.$tabs = this.$element.children('[role="menuitem"]');
        this.$tabs.find('ul.is-dropdown-submenu').addClass(this.options.verticalClass);

        if (this.$element.hasClass(this.options.rightClass) || this.options.alignment === 'right' || Foundation.rtl() || this.$element.parents('.top-bar-right').is('*')) {
          this.options.alignment = 'right';
          subs.addClass('opens-left');
        } else {
          subs.addClass('opens-right');
        }
        this.changed = false;
        this._events();
      }
    }, {
      key: '_isVertical',
      value: function _isVertical() {
        return this.$tabs.css('display') === 'block';
      }

      /**
       * Adds event listeners to elements within the menu
       * @private
       * @function
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this,
            hasTouch = 'ontouchstart' in window || typeof window.ontouchstart !== 'undefined',
            parClass = 'is-dropdown-submenu-parent';

        // used for onClick and in the keyboard handlers
        var handleClickFn = function (e) {
          var $elem = $(e.target).parentsUntil('ul', '.' + parClass),
              hasSub = $elem.hasClass(parClass),
              hasClicked = $elem.attr('data-is-click') === 'true',
              $sub = $elem.children('.is-dropdown-submenu');

          if (hasSub) {
            if (hasClicked) {
              if (!_this.options.closeOnClick || !_this.options.clickOpen && !hasTouch || _this.options.forceFollow && hasTouch) {
                return;
              } else {
                e.stopImmediatePropagation();
                e.preventDefault();
                _this._hide($elem);
              }
            } else {
              e.preventDefault();
              e.stopImmediatePropagation();
              _this._show($sub);
              $elem.add($elem.parentsUntil(_this.$element, '.' + parClass)).attr('data-is-click', true);
            }
          }
        };

        if (this.options.clickOpen || hasTouch) {
          this.$menuItems.on('click.zf.dropdownmenu touchstart.zf.dropdownmenu', handleClickFn);
        }

        // Handle Leaf element Clicks
        if (_this.options.closeOnClickInside) {
          this.$menuItems.on('click.zf.dropdownmenu', function (e) {
            var $elem = $(this),
                hasSub = $elem.hasClass(parClass);
            if (!hasSub) {
              _this._hide();
            }
          });
        }

        if (!this.options.disableHover) {
          this.$menuItems.on('mouseenter.zf.dropdownmenu', function (e) {
            var $elem = $(this),
                hasSub = $elem.hasClass(parClass);

            if (hasSub) {
              clearTimeout($elem.data('_delay'));
              $elem.data('_delay', setTimeout(function () {
                _this._show($elem.children('.is-dropdown-submenu'));
              }, _this.options.hoverDelay));
            }
          }).on('mouseleave.zf.dropdownmenu', function (e) {
            var $elem = $(this),
                hasSub = $elem.hasClass(parClass);
            if (hasSub && _this.options.autoclose) {
              if ($elem.attr('data-is-click') === 'true' && _this.options.clickOpen) {
                return false;
              }

              clearTimeout($elem.data('_delay'));
              $elem.data('_delay', setTimeout(function () {
                _this._hide($elem);
              }, _this.options.closingTime));
            }
          });
        }
        this.$menuItems.on('keydown.zf.dropdownmenu', function (e) {
          var $element = $(e.target).parentsUntil('ul', '[role="menuitem"]'),
              isTab = _this.$tabs.index($element) > -1,
              $elements = isTab ? _this.$tabs : $element.siblings('li').add($element),
              $prevElement,
              $nextElement;

          $elements.each(function (i) {
            if ($(this).is($element)) {
              $prevElement = $elements.eq(i - 1);
              $nextElement = $elements.eq(i + 1);
              return;
            }
          });

          var nextSibling = function () {
            if (!$element.is(':last-child')) {
              $nextElement.children('a:first').focus();
              e.preventDefault();
            }
          },
              prevSibling = function () {
            $prevElement.children('a:first').focus();
            e.preventDefault();
          },
              openSub = function () {
            var $sub = $element.children('ul.is-dropdown-submenu');
            if ($sub.length) {
              _this._show($sub);
              $element.find('li > a:first').focus();
              e.preventDefault();
            } else {
              return;
            }
          },
              closeSub = function () {
            //if ($element.is(':first-child')) {
            var close = $element.parent('ul').parent('li');
            close.children('a:first').focus();
            _this._hide(close);
            e.preventDefault();
            //}
          };
          var functions = {
            open: openSub,
            close: function () {
              _this._hide(_this.$element);
              _this.$menuItems.find('a:first').focus(); // focus to first element
              e.preventDefault();
            },
            handled: function () {
              e.stopImmediatePropagation();
            }
          };

          if (isTab) {
            if (_this._isVertical()) {
              // vertical menu
              if (Foundation.rtl()) {
                // right aligned
                $.extend(functions, {
                  down: nextSibling,
                  up: prevSibling,
                  next: closeSub,
                  previous: openSub
                });
              } else {
                // left aligned
                $.extend(functions, {
                  down: nextSibling,
                  up: prevSibling,
                  next: openSub,
                  previous: closeSub
                });
              }
            } else {
              // horizontal menu
              if (Foundation.rtl()) {
                // right aligned
                $.extend(functions, {
                  next: prevSibling,
                  previous: nextSibling,
                  down: openSub,
                  up: closeSub
                });
              } else {
                // left aligned
                $.extend(functions, {
                  next: nextSibling,
                  previous: prevSibling,
                  down: openSub,
                  up: closeSub
                });
              }
            }
          } else {
            // not tabs -> one sub
            if (Foundation.rtl()) {
              // right aligned
              $.extend(functions, {
                next: closeSub,
                previous: openSub,
                down: nextSibling,
                up: prevSibling
              });
            } else {
              // left aligned
              $.extend(functions, {
                next: openSub,
                previous: closeSub,
                down: nextSibling,
                up: prevSibling
              });
            }
          }
          Foundation.Keyboard.handleKey(e, 'DropdownMenu', functions);
        });
      }

      /**
       * Adds an event handler to the body to close any dropdowns on a click.
       * @function
       * @private
       */

    }, {
      key: '_addBodyHandler',
      value: function _addBodyHandler() {
        var $body = $(document.body),
            _this = this;
        $body.off('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu').on('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu', function (e) {
          var $link = _this.$element.find(e.target);
          if ($link.length) {
            return;
          }

          _this._hide();
          $body.off('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu');
        });
      }

      /**
       * Opens a dropdown pane, and checks for collisions first.
       * @param {jQuery} $sub - ul element that is a submenu to show
       * @function
       * @private
       * @fires DropdownMenu#show
       */

    }, {
      key: '_show',
      value: function _show($sub) {
        var idx = this.$tabs.index(this.$tabs.filter(function (i, el) {
          return $(el).find($sub).length > 0;
        }));
        var $sibs = $sub.parent('li.is-dropdown-submenu-parent').siblings('li.is-dropdown-submenu-parent');
        this._hide($sibs, idx);
        $sub.css('visibility', 'hidden').addClass('js-dropdown-active').parent('li.is-dropdown-submenu-parent').addClass('is-active');
        var clear = Foundation.Box.ImNotTouchingYou($sub, null, true);
        if (!clear) {
          var oldClass = this.options.alignment === 'left' ? '-right' : '-left',
              $parentLi = $sub.parent('.is-dropdown-submenu-parent');
          $parentLi.removeClass('opens' + oldClass).addClass('opens-' + this.options.alignment);
          clear = Foundation.Box.ImNotTouchingYou($sub, null, true);
          if (!clear) {
            $parentLi.removeClass('opens-' + this.options.alignment).addClass('opens-inner');
          }
          this.changed = true;
        }
        $sub.css('visibility', '');
        if (this.options.closeOnClick) {
          this._addBodyHandler();
        }
        /**
         * Fires when the new dropdown pane is visible.
         * @event DropdownMenu#show
         */
        this.$element.trigger('show.zf.dropdownmenu', [$sub]);
      }

      /**
       * Hides a single, currently open dropdown pane, if passed a parameter, otherwise, hides everything.
       * @function
       * @param {jQuery} $elem - element with a submenu to hide
       * @param {Number} idx - index of the $tabs collection to hide
       * @private
       */

    }, {
      key: '_hide',
      value: function _hide($elem, idx) {
        var $toClose;
        if ($elem && $elem.length) {
          $toClose = $elem;
        } else if (idx !== undefined) {
          $toClose = this.$tabs.not(function (i, el) {
            return i === idx;
          });
        } else {
          $toClose = this.$element;
        }
        var somethingToClose = $toClose.hasClass('is-active') || $toClose.find('.is-active').length > 0;

        if (somethingToClose) {
          $toClose.find('li.is-active').add($toClose).attr({
            'data-is-click': false
          }).removeClass('is-active');

          $toClose.find('ul.js-dropdown-active').removeClass('js-dropdown-active');

          if (this.changed || $toClose.find('opens-inner').length) {
            var oldClass = this.options.alignment === 'left' ? 'right' : 'left';
            $toClose.find('li.is-dropdown-submenu-parent').add($toClose).removeClass('opens-inner opens-' + this.options.alignment).addClass('opens-' + oldClass);
            this.changed = false;
          }
          /**
           * Fires when the open menus are closed.
           * @event DropdownMenu#hide
           */
          this.$element.trigger('hide.zf.dropdownmenu', [$toClose]);
        }
      }

      /**
       * Destroys the plugin.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$menuItems.off('.zf.dropdownmenu').removeAttr('data-is-click').removeClass('is-right-arrow is-left-arrow is-down-arrow opens-right opens-left opens-inner');
        $(document.body).off('.zf.dropdownmenu');
        Foundation.Nest.Burn(this.$element, 'dropdown');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return DropdownMenu;
  }();

  /**
   * Default settings for plugin
   */


  DropdownMenu.defaults = {
    /**
     * Disallows hover events from opening submenus
     * @option
     * @type {boolean}
     * @default false
     */
    disableHover: false,
    /**
     * Allow a submenu to automatically close on a mouseleave event, if not clicked open.
     * @option
     * @type {boolean}
     * @default true
     */
    autoclose: true,
    /**
     * Amount of time to delay opening a submenu on hover event.
     * @option
     * @type {number}
     * @default 50
     */
    hoverDelay: 50,
    /**
     * Allow a submenu to open/remain open on parent click event. Allows cursor to move away from menu.
     * @option
     * @type {boolean}
     * @default false
     */
    clickOpen: false,
    /**
     * Amount of time to delay closing a submenu on a mouseleave event.
     * @option
     * @type {number}
     * @default 500
     */

    closingTime: 500,
    /**
     * Position of the menu relative to what direction the submenus should open. Handled by JS. Can be `'left'` or `'right'`.
     * @option
     * @type {string}
     * @default 'left'
     */
    alignment: 'left',
    /**
     * Allow clicks on the body to close any open submenus.
     * @option
     * @type {boolean}
     * @default true
     */
    closeOnClick: true,
    /**
     * Allow clicks on leaf anchor links to close any open submenus.
     * @option
     * @type {boolean}
     * @default true
     */
    closeOnClickInside: true,
    /**
     * Class applied to vertical oriented menus, Foundation default is `vertical`. Update this if using your own class.
     * @option
     * @type {string}
     * @default 'vertical'
     */
    verticalClass: 'vertical',
    /**
     * Class applied to right-side oriented menus, Foundation default is `align-right`. Update this if using your own class.
     * @option
     * @type {string}
     * @default 'align-right'
     */
    rightClass: 'align-right',
    /**
     * Boolean to force overide the clicking of links to perform default action, on second touch event for mobile.
     * @option
     * @type {boolean}
     * @default true
     */
    forceFollow: true
  };

  // Window exports
  Foundation.plugin(DropdownMenu, 'DropdownMenu');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Equalizer module.
   * @module foundation.equalizer
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.timerAndImageLoader if equalizer contains images
   */

  var Equalizer = function () {
    /**
     * Creates a new instance of Equalizer.
     * @class
     * @fires Equalizer#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Equalizer(element, options) {
      _classCallCheck(this, Equalizer);

      this.$element = element;
      this.options = $.extend({}, Equalizer.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Equalizer');
    }

    /**
     * Initializes the Equalizer plugin and calls functions to get equalizer functioning on load.
     * @private
     */


    _createClass(Equalizer, [{
      key: '_init',
      value: function _init() {
        var eqId = this.$element.attr('data-equalizer') || '';
        var $watched = this.$element.find('[data-equalizer-watch="' + eqId + '"]');

        this.$watched = $watched.length ? $watched : this.$element.find('[data-equalizer-watch]');
        this.$element.attr('data-resize', eqId || Foundation.GetYoDigits(6, 'eq'));
        this.$element.attr('data-mutate', eqId || Foundation.GetYoDigits(6, 'eq'));

        this.hasNested = this.$element.find('[data-equalizer]').length > 0;
        this.isNested = this.$element.parentsUntil(document.body, '[data-equalizer]').length > 0;
        this.isOn = false;
        this._bindHandler = {
          onResizeMeBound: this._onResizeMe.bind(this),
          onPostEqualizedBound: this._onPostEqualized.bind(this)
        };

        var imgs = this.$element.find('img');
        var tooSmall;
        if (this.options.equalizeOn) {
          tooSmall = this._checkMQ();
          $(window).on('changed.zf.mediaquery', this._checkMQ.bind(this));
        } else {
          this._events();
        }
        if (tooSmall !== undefined && tooSmall === false || tooSmall === undefined) {
          if (imgs.length) {
            Foundation.onImagesLoaded(imgs, this._reflow.bind(this));
          } else {
            this._reflow();
          }
        }
      }

      /**
       * Removes event listeners if the breakpoint is too small.
       * @private
       */

    }, {
      key: '_pauseEvents',
      value: function _pauseEvents() {
        this.isOn = false;
        this.$element.off({
          '.zf.equalizer': this._bindHandler.onPostEqualizedBound,
          'resizeme.zf.trigger': this._bindHandler.onResizeMeBound,
          'mutateme.zf.trigger': this._bindHandler.onResizeMeBound
        });
      }

      /**
       * function to handle $elements resizeme.zf.trigger, with bound this on _bindHandler.onResizeMeBound
       * @private
       */

    }, {
      key: '_onResizeMe',
      value: function _onResizeMe(e) {
        this._reflow();
      }

      /**
       * function to handle $elements postequalized.zf.equalizer, with bound this on _bindHandler.onPostEqualizedBound
       * @private
       */

    }, {
      key: '_onPostEqualized',
      value: function _onPostEqualized(e) {
        if (e.target !== this.$element[0]) {
          this._reflow();
        }
      }

      /**
       * Initializes events for Equalizer.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;
        this._pauseEvents();
        if (this.hasNested) {
          this.$element.on('postequalized.zf.equalizer', this._bindHandler.onPostEqualizedBound);
        } else {
          this.$element.on('resizeme.zf.trigger', this._bindHandler.onResizeMeBound);
          this.$element.on('mutateme.zf.trigger', this._bindHandler.onResizeMeBound);
        }
        this.isOn = true;
      }

      /**
       * Checks the current breakpoint to the minimum required size.
       * @private
       */

    }, {
      key: '_checkMQ',
      value: function _checkMQ() {
        var tooSmall = !Foundation.MediaQuery.is(this.options.equalizeOn);
        if (tooSmall) {
          if (this.isOn) {
            this._pauseEvents();
            this.$watched.css('height', 'auto');
          }
        } else {
          if (!this.isOn) {
            this._events();
          }
        }
        return tooSmall;
      }

      /**
       * A noop version for the plugin
       * @private
       */

    }, {
      key: '_killswitch',
      value: function _killswitch() {
        return;
      }

      /**
       * Calls necessary functions to update Equalizer upon DOM change
       * @private
       */

    }, {
      key: '_reflow',
      value: function _reflow() {
        if (!this.options.equalizeOnStack) {
          if (this._isStacked()) {
            this.$watched.css('height', 'auto');
            return false;
          }
        }
        if (this.options.equalizeByRow) {
          this.getHeightsByRow(this.applyHeightByRow.bind(this));
        } else {
          this.getHeights(this.applyHeight.bind(this));
        }
      }

      /**
       * Manually determines if the first 2 elements are *NOT* stacked.
       * @private
       */

    }, {
      key: '_isStacked',
      value: function _isStacked() {
        if (!this.$watched[0] || !this.$watched[1]) {
          return true;
        }
        return this.$watched[0].getBoundingClientRect().top !== this.$watched[1].getBoundingClientRect().top;
      }

      /**
       * Finds the outer heights of children contained within an Equalizer parent and returns them in an array
       * @param {Function} cb - A non-optional callback to return the heights array to.
       * @returns {Array} heights - An array of heights of children within Equalizer container
       */

    }, {
      key: 'getHeights',
      value: function getHeights(cb) {
        var heights = [];
        for (var i = 0, len = this.$watched.length; i < len; i++) {
          this.$watched[i].style.height = 'auto';
          heights.push(this.$watched[i].offsetHeight);
        }
        cb(heights);
      }

      /**
       * Finds the outer heights of children contained within an Equalizer parent and returns them in an array
       * @param {Function} cb - A non-optional callback to return the heights array to.
       * @returns {Array} groups - An array of heights of children within Equalizer container grouped by row with element,height and max as last child
       */

    }, {
      key: 'getHeightsByRow',
      value: function getHeightsByRow(cb) {
        var lastElTopOffset = this.$watched.length ? this.$watched.first().offset().top : 0,
            groups = [],
            group = 0;
        //group by Row
        groups[group] = [];
        for (var i = 0, len = this.$watched.length; i < len; i++) {
          this.$watched[i].style.height = 'auto';
          //maybe could use this.$watched[i].offsetTop
          var elOffsetTop = $(this.$watched[i]).offset().top;
          if (elOffsetTop != lastElTopOffset) {
            group++;
            groups[group] = [];
            lastElTopOffset = elOffsetTop;
          }
          groups[group].push([this.$watched[i], this.$watched[i].offsetHeight]);
        }

        for (var j = 0, ln = groups.length; j < ln; j++) {
          var heights = $(groups[j]).map(function () {
            return this[1];
          }).get();
          var max = Math.max.apply(null, heights);
          groups[j].push(max);
        }
        cb(groups);
      }

      /**
       * Changes the CSS height property of each child in an Equalizer parent to match the tallest
       * @param {array} heights - An array of heights of children within Equalizer container
       * @fires Equalizer#preequalized
       * @fires Equalizer#postequalized
       */

    }, {
      key: 'applyHeight',
      value: function applyHeight(heights) {
        var max = Math.max.apply(null, heights);
        /**
         * Fires before the heights are applied
         * @event Equalizer#preequalized
         */
        this.$element.trigger('preequalized.zf.equalizer');

        this.$watched.css('height', max);

        /**
         * Fires when the heights have been applied
         * @event Equalizer#postequalized
         */
        this.$element.trigger('postequalized.zf.equalizer');
      }

      /**
       * Changes the CSS height property of each child in an Equalizer parent to match the tallest by row
       * @param {array} groups - An array of heights of children within Equalizer container grouped by row with element,height and max as last child
       * @fires Equalizer#preequalized
       * @fires Equalizer#preequalizedrow
       * @fires Equalizer#postequalizedrow
       * @fires Equalizer#postequalized
       */

    }, {
      key: 'applyHeightByRow',
      value: function applyHeightByRow(groups) {
        /**
         * Fires before the heights are applied
         */
        this.$element.trigger('preequalized.zf.equalizer');
        for (var i = 0, len = groups.length; i < len; i++) {
          var groupsILength = groups[i].length,
              max = groups[i][groupsILength - 1];
          if (groupsILength <= 2) {
            $(groups[i][0][0]).css({ 'height': 'auto' });
            continue;
          }
          /**
            * Fires before the heights per row are applied
            * @event Equalizer#preequalizedrow
            */
          this.$element.trigger('preequalizedrow.zf.equalizer');
          for (var j = 0, lenJ = groupsILength - 1; j < lenJ; j++) {
            $(groups[i][j][0]).css({ 'height': max });
          }
          /**
            * Fires when the heights per row have been applied
            * @event Equalizer#postequalizedrow
            */
          this.$element.trigger('postequalizedrow.zf.equalizer');
        }
        /**
         * Fires when the heights have been applied
         */
        this.$element.trigger('postequalized.zf.equalizer');
      }

      /**
       * Destroys an instance of Equalizer.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this._pauseEvents();
        this.$watched.css('height', 'auto');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Equalizer;
  }();

  /**
   * Default settings for plugin
   */


  Equalizer.defaults = {
    /**
     * Enable height equalization when stacked on smaller screens.
     * @option
     * @type {boolean}
     * @default false
     */
    equalizeOnStack: false,
    /**
     * Enable height equalization row by row.
     * @option
     * @type {boolean}
     * @default false
     */
    equalizeByRow: false,
    /**
     * String representing the minimum breakpoint size the plugin should equalize heights on.
     * @option
     * @type {string}
     * @default ''
     */
    equalizeOn: ''
  };

  // Window exports
  Foundation.plugin(Equalizer, 'Equalizer');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Interchange module.
   * @module foundation.interchange
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.timerAndImageLoader
   */

  var Interchange = function () {
    /**
     * Creates a new instance of Interchange.
     * @class
     * @fires Interchange#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Interchange(element, options) {
      _classCallCheck(this, Interchange);

      this.$element = element;
      this.options = $.extend({}, Interchange.defaults, options);
      this.rules = [];
      this.currentPath = '';

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'Interchange');
    }

    /**
     * Initializes the Interchange plugin and calls functions to get interchange functioning on load.
     * @function
     * @private
     */


    _createClass(Interchange, [{
      key: '_init',
      value: function _init() {
        this._addBreakpoints();
        this._generateRules();
        this._reflow();
      }

      /**
       * Initializes events for Interchange.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this2 = this;

        $(window).on('resize.zf.interchange', Foundation.util.throttle(function () {
          _this2._reflow();
        }, 50));
      }

      /**
       * Calls necessary functions to update Interchange upon DOM change
       * @function
       * @private
       */

    }, {
      key: '_reflow',
      value: function _reflow() {
        var match;

        // Iterate through each rule, but only save the last match
        for (var i in this.rules) {
          if (this.rules.hasOwnProperty(i)) {
            var rule = this.rules[i];
            if (window.matchMedia(rule.query).matches) {
              match = rule;
            }
          }
        }

        if (match) {
          this.replace(match.path);
        }
      }

      /**
       * Gets the Foundation breakpoints and adds them to the Interchange.SPECIAL_QUERIES object.
       * @function
       * @private
       */

    }, {
      key: '_addBreakpoints',
      value: function _addBreakpoints() {
        for (var i in Foundation.MediaQuery.queries) {
          if (Foundation.MediaQuery.queries.hasOwnProperty(i)) {
            var query = Foundation.MediaQuery.queries[i];
            Interchange.SPECIAL_QUERIES[query.name] = query.value;
          }
        }
      }

      /**
       * Checks the Interchange element for the provided media query + content pairings
       * @function
       * @private
       * @param {Object} element - jQuery object that is an Interchange instance
       * @returns {Array} scenarios - Array of objects that have 'mq' and 'path' keys with corresponding keys
       */

    }, {
      key: '_generateRules',
      value: function _generateRules(element) {
        var rulesList = [];
        var rules;

        if (this.options.rules) {
          rules = this.options.rules;
        } else {
          rules = this.$element.data('interchange');
        }

        rules = typeof rules === 'string' ? rules.match(/\[.*?\]/g) : rules;

        for (var i in rules) {
          if (rules.hasOwnProperty(i)) {
            var rule = rules[i].slice(1, -1).split(', ');
            var path = rule.slice(0, -1).join('');
            var query = rule[rule.length - 1];

            if (Interchange.SPECIAL_QUERIES[query]) {
              query = Interchange.SPECIAL_QUERIES[query];
            }

            rulesList.push({
              path: path,
              query: query
            });
          }
        }

        this.rules = rulesList;
      }

      /**
       * Update the `src` property of an image, or change the HTML of a container, to the specified path.
       * @function
       * @param {String} path - Path to the image or HTML partial.
       * @fires Interchange#replaced
       */

    }, {
      key: 'replace',
      value: function replace(path) {
        if (this.currentPath === path) return;

        var _this = this,
            trigger = 'replaced.zf.interchange';

        // Replacing images
        if (this.$element[0].nodeName === 'IMG') {
          this.$element.attr('src', path).on('load', function () {
            _this.currentPath = path;
          }).trigger(trigger);
        }
        // Replacing background images
        else if (path.match(/\.(gif|jpg|jpeg|png|svg|tiff)([?#].*)?/i)) {
            this.$element.css({ 'background-image': 'url(' + path + ')' }).trigger(trigger);
          }
          // Replacing HTML
          else {
              $.get(path, function (response) {
                _this.$element.html(response).trigger(trigger);
                $(response).foundation();
                _this.currentPath = path;
              });
            }

        /**
         * Fires when content in an Interchange element is done being loaded.
         * @event Interchange#replaced
         */
        // this.$element.trigger('replaced.zf.interchange');
      }

      /**
       * Destroys an instance of interchange.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        //TODO this.
      }
    }]);

    return Interchange;
  }();

  /**
   * Default settings for plugin
   */


  Interchange.defaults = {
    /**
     * Rules to be applied to Interchange elements. Set with the `data-interchange` array notation.
     * @option
     * @type {?array}
     * @default null
     */
    rules: null
  };

  Interchange.SPECIAL_QUERIES = {
    'landscape': 'screen and (orientation: landscape)',
    'portrait': 'screen and (orientation: portrait)',
    'retina': 'only screen and (-webkit-min-device-pixel-ratio: 2), only screen and (min--moz-device-pixel-ratio: 2), only screen and (-o-min-device-pixel-ratio: 2/1), only screen and (min-device-pixel-ratio: 2), only screen and (min-resolution: 192dpi), only screen and (min-resolution: 2dppx)'
  };

  // Window exports
  Foundation.plugin(Interchange, 'Interchange');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Magellan module.
   * @module foundation.magellan
   */

  var Magellan = function () {
    /**
     * Creates a new instance of Magellan.
     * @class
     * @fires Magellan#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Magellan(element, options) {
      _classCallCheck(this, Magellan);

      this.$element = element;
      this.options = $.extend({}, Magellan.defaults, this.$element.data(), options);

      this._init();
      this.calcPoints();

      Foundation.registerPlugin(this, 'Magellan');
    }

    /**
     * Initializes the Magellan plugin and calls functions to get equalizer functioning on load.
     * @private
     */


    _createClass(Magellan, [{
      key: '_init',
      value: function _init() {
        var id = this.$element[0].id || Foundation.GetYoDigits(6, 'magellan');
        var _this = this;
        this.$targets = $('[data-magellan-target]');
        this.$links = this.$element.find('a');
        this.$element.attr({
          'data-resize': id,
          'data-scroll': id,
          'id': id
        });
        this.$active = $();
        this.scrollPos = parseInt(window.pageYOffset, 10);

        this._events();
      }

      /**
       * Calculates an array of pixel values that are the demarcation lines between locations on the page.
       * Can be invoked if new elements are added or the size of a location changes.
       * @function
       */

    }, {
      key: 'calcPoints',
      value: function calcPoints() {
        var _this = this,
            body = document.body,
            html = document.documentElement;

        this.points = [];
        this.winHeight = Math.round(Math.max(window.innerHeight, html.clientHeight));
        this.docHeight = Math.round(Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight));

        this.$targets.each(function () {
          var $tar = $(this),
              pt = Math.round($tar.offset().top - _this.options.threshold);
          $tar.targetPoint = pt;
          _this.points.push(pt);
        });
      }

      /**
       * Initializes events for Magellan.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this,
            $body = $('html, body'),
            opts = {
          duration: _this.options.animationDuration,
          easing: _this.options.animationEasing
        };
        $(window).one('load', function () {
          if (_this.options.deepLinking) {
            if (location.hash) {
              _this.scrollToLoc(location.hash);
            }
          }
          _this.calcPoints();
          _this._updateActive();
        });

        this.$element.on({
          'resizeme.zf.trigger': this.reflow.bind(this),
          'scrollme.zf.trigger': this._updateActive.bind(this)
        }).on('click.zf.magellan', 'a[href^="#"]', function (e) {
          e.preventDefault();
          var arrival = this.getAttribute('href');
          _this.scrollToLoc(arrival);
        });
        $(window).on('popstate', function (e) {
          if (_this.options.deepLinking) {
            _this.scrollToLoc(window.location.hash);
          }
        });
      }

      /**
       * Function to scroll to a given location on the page.
       * @param {String} loc - a properly formatted jQuery id selector. Example: '#foo'
       * @function
       */

    }, {
      key: 'scrollToLoc',
      value: function scrollToLoc(loc) {
        // Do nothing if target does not exist to prevent errors
        if (!$(loc).length) {
          return false;
        }
        this._inTransition = true;
        var _this = this,
            scrollPos = Math.round($(loc).offset().top - this.options.threshold / 2 - this.options.barOffset);

        $('html, body').stop(true).animate({ scrollTop: scrollPos }, this.options.animationDuration, this.options.animationEasing, function () {
          _this._inTransition = false;_this._updateActive();
        });
      }

      /**
       * Calls necessary functions to update Magellan upon DOM change
       * @function
       */

    }, {
      key: 'reflow',
      value: function reflow() {
        this.calcPoints();
        this._updateActive();
      }

      /**
       * Updates the visibility of an active location link, and updates the url hash for the page, if deepLinking enabled.
       * @private
       * @function
       * @fires Magellan#update
       */

    }, {
      key: '_updateActive',
      value: function _updateActive() /*evt, elem, scrollPos*/{
        if (this._inTransition) {
          return;
        }
        var winPos = /*scrollPos ||*/parseInt(window.pageYOffset, 10),
            curIdx;

        if (winPos + this.winHeight === this.docHeight) {
          curIdx = this.points.length - 1;
        } else if (winPos < this.points[0]) {
          curIdx = undefined;
        } else {
          var isDown = this.scrollPos < winPos,
              _this = this,
              curVisible = this.points.filter(function (p, i) {
            return isDown ? p - _this.options.barOffset <= winPos : p - _this.options.barOffset - _this.options.threshold <= winPos;
          });
          curIdx = curVisible.length ? curVisible.length - 1 : 0;
        }

        this.$active.removeClass(this.options.activeClass);
        this.$active = this.$links.filter('[href="#' + this.$targets.eq(curIdx).data('magellan-target') + '"]').addClass(this.options.activeClass);

        if (this.options.deepLinking) {
          var hash = "";
          if (curIdx != undefined) {
            hash = this.$active[0].getAttribute('href');
          }
          if (hash !== window.location.hash) {
            if (window.history.pushState) {
              window.history.pushState(null, null, hash);
            } else {
              window.location.hash = hash;
            }
          }
        }

        this.scrollPos = winPos;
        /**
         * Fires when magellan is finished updating to the new active element.
         * @event Magellan#update
         */
        this.$element.trigger('update.zf.magellan', [this.$active]);
      }

      /**
       * Destroys an instance of Magellan and resets the url of the window.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.trigger .zf.magellan').find('.' + this.options.activeClass).removeClass(this.options.activeClass);

        if (this.options.deepLinking) {
          var hash = this.$active[0].getAttribute('href');
          window.location.hash.replace(hash, '');
        }

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Magellan;
  }();

  /**
   * Default settings for plugin
   */


  Magellan.defaults = {
    /**
     * Amount of time, in ms, the animated scrolling should take between locations.
     * @option
     * @type {number}
     * @default 500
     */
    animationDuration: 500,
    /**
     * Animation style to use when scrolling between locations. Can be `'swing'` or `'linear'`.
     * @option
     * @type {string}
     * @default 'linear'
     * @see {@link https://api.jquery.com/animate|Jquery animate}
     */
    animationEasing: 'linear',
    /**
     * Number of pixels to use as a marker for location changes.
     * @option
     * @type {number}
     * @default 50
     */
    threshold: 50,
    /**
     * Class applied to the active locations link on the magellan container.
     * @option
     * @type {string}
     * @default 'active'
     */
    activeClass: 'active',
    /**
     * Allows the script to manipulate the url of the current page, and if supported, alter the history.
     * @option
     * @type {boolean}
     * @default false
     */
    deepLinking: false,
    /**
     * Number of pixels to offset the scroll of the page on item click if using a sticky nav bar.
     * @option
     * @type {number}
     * @default 0
     */
    barOffset: 0
  };

  // Window exports
  Foundation.plugin(Magellan, 'Magellan');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * OffCanvas module.
   * @module foundation.offcanvas
   * @requires foundation.util.keyboard
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.triggers
   * @requires foundation.util.motion
   */

  var OffCanvas = function () {
    /**
     * Creates a new instance of an off-canvas wrapper.
     * @class
     * @fires OffCanvas#init
     * @param {Object} element - jQuery object to initialize.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function OffCanvas(element, options) {
      _classCallCheck(this, OffCanvas);

      this.$element = element;
      this.options = $.extend({}, OffCanvas.defaults, this.$element.data(), options);
      this.$lastTrigger = $();
      this.$triggers = $();

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'OffCanvas');
      Foundation.Keyboard.register('OffCanvas', {
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the off-canvas wrapper by adding the exit overlay (if needed).
     * @function
     * @private
     */


    _createClass(OffCanvas, [{
      key: '_init',
      value: function _init() {
        var id = this.$element.attr('id');

        this.$element.attr('aria-hidden', 'true');

        this.$element.addClass('is-transition-' + this.options.transition);

        // Find triggers that affect this element and add aria-expanded to them
        this.$triggers = $(document).find('[data-open="' + id + '"], [data-close="' + id + '"], [data-toggle="' + id + '"]').attr('aria-expanded', 'false').attr('aria-controls', id);

        // Add an overlay over the content if necessary
        if (this.options.contentOverlay === true) {
          var overlay = document.createElement('div');
          var overlayPosition = $(this.$element).css("position") === 'fixed' ? 'is-overlay-fixed' : 'is-overlay-absolute';
          overlay.setAttribute('class', 'js-off-canvas-overlay ' + overlayPosition);
          this.$overlay = $(overlay);
          if (overlayPosition === 'is-overlay-fixed') {
            $('body').append(this.$overlay);
          } else {
            this.$element.siblings('[data-off-canvas-content]').append(this.$overlay);
          }
        }

        this.options.isRevealed = this.options.isRevealed || new RegExp(this.options.revealClass, 'g').test(this.$element[0].className);

        if (this.options.isRevealed === true) {
          this.options.revealOn = this.options.revealOn || this.$element[0].className.match(/(reveal-for-medium|reveal-for-large)/g)[0].split('-')[2];
          this._setMQChecker();
        }
        if (!this.options.transitionTime === true) {
          this.options.transitionTime = parseFloat(window.getComputedStyle($('[data-off-canvas]')[0]).transitionDuration) * 1000;
        }
      }

      /**
       * Adds event handlers to the off-canvas wrapper and the exit overlay.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this.$element.off('.zf.trigger .zf.offcanvas').on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': this.close.bind(this),
          'toggle.zf.trigger': this.toggle.bind(this),
          'keydown.zf.offcanvas': this._handleKeyboard.bind(this)
        });

        if (this.options.closeOnClick === true) {
          var $target = this.options.contentOverlay ? this.$overlay : $('[data-off-canvas-content]');
          $target.on({ 'click.zf.offcanvas': this.close.bind(this) });
        }
      }

      /**
       * Applies event listener for elements that will reveal at certain breakpoints.
       * @private
       */

    }, {
      key: '_setMQChecker',
      value: function _setMQChecker() {
        var _this = this;

        $(window).on('changed.zf.mediaquery', function () {
          if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
            _this.reveal(true);
          } else {
            _this.reveal(false);
          }
        }).one('load.zf.offcanvas', function () {
          if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
            _this.reveal(true);
          }
        });
      }

      /**
       * Handles the revealing/hiding the off-canvas at breakpoints, not the same as open.
       * @param {Boolean} isRevealed - true if element should be revealed.
       * @function
       */

    }, {
      key: 'reveal',
      value: function reveal(isRevealed) {
        var $closer = this.$element.find('[data-close]');
        if (isRevealed) {
          this.close();
          this.isRevealed = true;
          this.$element.attr('aria-hidden', 'false');
          this.$element.off('open.zf.trigger toggle.zf.trigger');
          if ($closer.length) {
            $closer.hide();
          }
        } else {
          this.isRevealed = false;
          this.$element.attr('aria-hidden', 'true');
          this.$element.off('open.zf.trigger toggle.zf.trigger').on({
            'open.zf.trigger': this.open.bind(this),
            'toggle.zf.trigger': this.toggle.bind(this)
          });
          if ($closer.length) {
            $closer.show();
          }
        }
      }

      /**
       * Stops scrolling of the body when offcanvas is open on mobile Safari and other troublesome browsers.
       * @private
       */

    }, {
      key: '_stopScrolling',
      value: function _stopScrolling(event) {
        return false;
      }

      // Taken and adapted from http://stackoverflow.com/questions/16889447/prevent-full-page-scrolling-ios
      // Only really works for y, not sure how to extend to x or if we need to.

    }, {
      key: '_recordScrollable',
      value: function _recordScrollable(event) {
        var elem = this; // called from event handler context with this as elem

        // If the element is scrollable (content overflows), then...
        if (elem.scrollHeight !== elem.clientHeight) {
          // If we're at the top, scroll down one pixel to allow scrolling up
          if (elem.scrollTop === 0) {
            elem.scrollTop = 1;
          }
          // If we're at the bottom, scroll up one pixel to allow scrolling down
          if (elem.scrollTop === elem.scrollHeight - elem.clientHeight) {
            elem.scrollTop = elem.scrollHeight - elem.clientHeight - 1;
          }
        }
        elem.allowUp = elem.scrollTop > 0;
        elem.allowDown = elem.scrollTop < elem.scrollHeight - elem.clientHeight;
        elem.lastY = event.originalEvent.pageY;
      }
    }, {
      key: '_stopScrollPropagation',
      value: function _stopScrollPropagation(event) {
        var elem = this; // called from event handler context with this as elem
        var up = event.pageY < elem.lastY;
        var down = !up;
        elem.lastY = event.pageY;

        if (up && elem.allowUp || down && elem.allowDown) {
          event.stopPropagation();
        } else {
          event.preventDefault();
        }
      }

      /**
       * Opens the off-canvas menu.
       * @function
       * @param {Object} event - Event object passed from listener.
       * @param {jQuery} trigger - element that triggered the off-canvas to open.
       * @fires OffCanvas#opened
       */

    }, {
      key: 'open',
      value: function open(event, trigger) {
        if (this.$element.hasClass('is-open') || this.isRevealed) {
          return;
        }
        var _this = this;

        if (trigger) {
          this.$lastTrigger = trigger;
        }

        if (this.options.forceTo === 'top') {
          window.scrollTo(0, 0);
        } else if (this.options.forceTo === 'bottom') {
          window.scrollTo(0, document.body.scrollHeight);
        }

        /**
         * Fires when the off-canvas menu opens.
         * @event OffCanvas#opened
         */
        _this.$element.addClass('is-open');

        this.$triggers.attr('aria-expanded', 'true');
        this.$element.attr('aria-hidden', 'false').trigger('opened.zf.offcanvas');

        // If `contentScroll` is set to false, add class and disable scrolling on touch devices.
        if (this.options.contentScroll === false) {
          $('body').addClass('is-off-canvas-open').on('touchmove', this._stopScrolling);
          this.$element.on('touchstart', this._recordScrollable);
          this.$element.on('touchmove', this._stopScrollPropagation);
        }

        if (this.options.contentOverlay === true) {
          this.$overlay.addClass('is-visible');
        }

        if (this.options.closeOnClick === true && this.options.contentOverlay === true) {
          this.$overlay.addClass('is-closable');
        }

        if (this.options.autoFocus === true) {
          this.$element.one(Foundation.transitionend(this.$element), function () {
            var canvasFocus = _this.$element.find('[data-autofocus]');
            if (canvasFocus.length) {
              canvasFocus.eq(0).focus();
            } else {
              _this.$element.find('a, button').eq(0).focus();
            }
          });
        }

        if (this.options.trapFocus === true) {
          this.$element.siblings('[data-off-canvas-content]').attr('tabindex', '-1');
          Foundation.Keyboard.trapFocus(this.$element);
        }
      }

      /**
       * Closes the off-canvas menu.
       * @function
       * @param {Function} cb - optional cb to fire after closure.
       * @fires OffCanvas#closed
       */

    }, {
      key: 'close',
      value: function close(cb) {
        if (!this.$element.hasClass('is-open') || this.isRevealed) {
          return;
        }

        var _this = this;

        _this.$element.removeClass('is-open');

        this.$element.attr('aria-hidden', 'true')
        /**
         * Fires when the off-canvas menu opens.
         * @event OffCanvas#closed
         */
        .trigger('closed.zf.offcanvas');

        // If `contentScroll` is set to false, remove class and re-enable scrolling on touch devices.
        if (this.options.contentScroll === false) {
          $('body').removeClass('is-off-canvas-open').off('touchmove', this._stopScrolling);
          this.$element.off('touchstart', this._recordScrollable);
          this.$element.off('touchmove', this._stopScrollPropagation);
        }

        if (this.options.contentOverlay === true) {
          this.$overlay.removeClass('is-visible');
        }

        if (this.options.closeOnClick === true && this.options.contentOverlay === true) {
          this.$overlay.removeClass('is-closable');
        }

        this.$triggers.attr('aria-expanded', 'false');

        if (this.options.trapFocus === true) {
          this.$element.siblings('[data-off-canvas-content]').removeAttr('tabindex');
          Foundation.Keyboard.releaseFocus(this.$element);
        }
      }

      /**
       * Toggles the off-canvas menu open or closed.
       * @function
       * @param {Object} event - Event object passed from listener.
       * @param {jQuery} trigger - element that triggered the off-canvas to open.
       */

    }, {
      key: 'toggle',
      value: function toggle(event, trigger) {
        if (this.$element.hasClass('is-open')) {
          this.close(event, trigger);
        } else {
          this.open(event, trigger);
        }
      }

      /**
       * Handles keyboard input when detected. When the escape key is pressed, the off-canvas menu closes, and focus is restored to the element that opened the menu.
       * @function
       * @private
       */

    }, {
      key: '_handleKeyboard',
      value: function _handleKeyboard(e) {
        var _this2 = this;

        Foundation.Keyboard.handleKey(e, 'OffCanvas', {
          close: function () {
            _this2.close();
            _this2.$lastTrigger.focus();
            return true;
          },
          handled: function () {
            e.stopPropagation();
            e.preventDefault();
          }
        });
      }

      /**
       * Destroys the offcanvas plugin.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.close();
        this.$element.off('.zf.trigger .zf.offcanvas');
        this.$overlay.off('.zf.offcanvas');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return OffCanvas;
  }();

  OffCanvas.defaults = {
    /**
     * Allow the user to click outside of the menu to close it.
     * @option
     * @type {boolean}
     * @default true
     */
    closeOnClick: true,

    /**
     * Adds an overlay on top of `[data-off-canvas-content]`.
     * @option
     * @type {boolean}
     * @default true
     */
    contentOverlay: true,

    /**
     * Enable/disable scrolling of the main content when an off canvas panel is open.
     * @option
     * @type {boolean}
     * @default true
     */
    contentScroll: true,

    /**
     * Amount of time in ms the open and close transition requires. If none selected, pulls from body style.
     * @option
     * @type {number}
     * @default 0
     */
    transitionTime: 0,

    /**
     * Type of transition for the offcanvas menu. Options are 'push', 'detached' or 'slide'.
     * @option
     * @type {string}
     * @default push
     */
    transition: 'push',

    /**
     * Force the page to scroll to top or bottom on open.
     * @option
     * @type {?string}
     * @default null
     */
    forceTo: null,

    /**
     * Allow the offcanvas to remain open for certain breakpoints.
     * @option
     * @type {boolean}
     * @default false
     */
    isRevealed: false,

    /**
     * Breakpoint at which to reveal. JS will use a RegExp to target standard classes, if changing classnames, pass your class with the `revealClass` option.
     * @option
     * @type {?string}
     * @default null
     */
    revealOn: null,

    /**
     * Force focus to the offcanvas on open. If true, will focus the opening trigger on close.
     * @option
     * @type {boolean}
     * @default true
     */
    autoFocus: true,

    /**
     * Class used to force an offcanvas to remain open. Foundation defaults for this are `reveal-for-large` & `reveal-for-medium`.
     * @option
     * @type {string}
     * @default reveal-for-
     * @todo improve the regex testing for this.
     */
    revealClass: 'reveal-for-',

    /**
     * Triggers optional focus trapping when opening an offcanvas. Sets tabindex of [data-off-canvas-content] to -1 for accessibility purposes.
     * @option
     * @type {boolean}
     * @default false
     */
    trapFocus: false
  };

  // Window exports
  Foundation.plugin(OffCanvas, 'OffCanvas');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Orbit module.
   * @module foundation.orbit
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.timerAndImageLoader
   * @requires foundation.util.touch
   */

  var Orbit = function () {
    /**
    * Creates a new instance of an orbit carousel.
    * @class
    * @param {jQuery} element - jQuery object to make into an Orbit Carousel.
    * @param {Object} options - Overrides to the default plugin settings.
    */
    function Orbit(element, options) {
      _classCallCheck(this, Orbit);

      this.$element = element;
      this.options = $.extend({}, Orbit.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Orbit');
      Foundation.Keyboard.register('Orbit', {
        'ltr': {
          'ARROW_RIGHT': 'next',
          'ARROW_LEFT': 'previous'
        },
        'rtl': {
          'ARROW_LEFT': 'next',
          'ARROW_RIGHT': 'previous'
        }
      });
    }

    /**
    * Initializes the plugin by creating jQuery collections, setting attributes, and starting the animation.
    * @function
    * @private
    */


    _createClass(Orbit, [{
      key: '_init',
      value: function _init() {
        // @TODO: consider discussion on PR #9278 about DOM pollution by changeSlide
        this._reset();

        this.$wrapper = this.$element.find('.' + this.options.containerClass);
        this.$slides = this.$element.find('.' + this.options.slideClass);

        var $images = this.$element.find('img'),
            initActive = this.$slides.filter('.is-active'),
            id = this.$element[0].id || Foundation.GetYoDigits(6, 'orbit');

        this.$element.attr({
          'data-resize': id,
          'id': id
        });

        if (!initActive.length) {
          this.$slides.eq(0).addClass('is-active');
        }

        if (!this.options.useMUI) {
          this.$slides.addClass('no-motionui');
        }

        if ($images.length) {
          Foundation.onImagesLoaded($images, this._prepareForOrbit.bind(this));
        } else {
          this._prepareForOrbit(); //hehe
        }

        if (this.options.bullets) {
          this._loadBullets();
        }

        this._events();

        if (this.options.autoPlay && this.$slides.length > 1) {
          this.geoSync();
        }

        if (this.options.accessible) {
          // allow wrapper to be focusable to enable arrow navigation
          this.$wrapper.attr('tabindex', 0);
        }
      }

      /**
      * Creates a jQuery collection of bullets, if they are being used.
      * @function
      * @private
      */

    }, {
      key: '_loadBullets',
      value: function _loadBullets() {
        this.$bullets = this.$element.find('.' + this.options.boxOfBullets).find('button');
      }

      /**
      * Sets a `timer` object on the orbit, and starts the counter for the next slide.
      * @function
      */

    }, {
      key: 'geoSync',
      value: function geoSync() {
        var _this = this;
        this.timer = new Foundation.Timer(this.$element, {
          duration: this.options.timerDelay,
          infinite: false
        }, function () {
          _this.changeSlide(true);
        });
        this.timer.start();
      }

      /**
      * Sets wrapper and slide heights for the orbit.
      * @function
      * @private
      */

    }, {
      key: '_prepareForOrbit',
      value: function _prepareForOrbit() {
        var _this = this;
        this._setWrapperHeight();
      }

      /**
      * Calulates the height of each slide in the collection, and uses the tallest one for the wrapper height.
      * @function
      * @private
      * @param {Function} cb - a callback function to fire when complete.
      */

    }, {
      key: '_setWrapperHeight',
      value: function _setWrapperHeight(cb) {
        //rewrite this to `for` loop
        var max = 0,
            temp,
            counter = 0,
            _this = this;

        this.$slides.each(function () {
          temp = this.getBoundingClientRect().height;
          $(this).attr('data-slide', counter);

          if (_this.$slides.filter('.is-active')[0] !== _this.$slides.eq(counter)[0]) {
            //if not the active slide, set css position and display property
            $(this).css({ 'position': 'relative', 'display': 'none' });
          }
          max = temp > max ? temp : max;
          counter++;
        });

        if (counter === this.$slides.length) {
          this.$wrapper.css({ 'height': max }); //only change the wrapper height property once.
          if (cb) {
            cb(max);
          } //fire callback with max height dimension.
        }
      }

      /**
      * Sets the max-height of each slide.
      * @function
      * @private
      */

    }, {
      key: '_setSlideHeight',
      value: function _setSlideHeight(height) {
        this.$slides.each(function () {
          $(this).css('max-height', height);
        });
      }

      /**
      * Adds event listeners to basically everything within the element.
      * @function
      * @private
      */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        //***************************************
        //**Now using custom event - thanks to:**
        //**      Yohai Ararat of Toronto      **
        //***************************************
        //
        this.$element.off('.resizeme.zf.trigger').on({
          'resizeme.zf.trigger': this._prepareForOrbit.bind(this)
        });
        if (this.$slides.length > 1) {

          if (this.options.swipe) {
            this.$slides.off('swipeleft.zf.orbit swiperight.zf.orbit').on('swipeleft.zf.orbit', function (e) {
              e.preventDefault();
              _this.changeSlide(true);
            }).on('swiperight.zf.orbit', function (e) {
              e.preventDefault();
              _this.changeSlide(false);
            });
          }
          //***************************************

          if (this.options.autoPlay) {
            this.$slides.on('click.zf.orbit', function () {
              _this.$element.data('clickedOn', _this.$element.data('clickedOn') ? false : true);
              _this.timer[_this.$element.data('clickedOn') ? 'pause' : 'start']();
            });

            if (this.options.pauseOnHover) {
              this.$element.on('mouseenter.zf.orbit', function () {
                _this.timer.pause();
              }).on('mouseleave.zf.orbit', function () {
                if (!_this.$element.data('clickedOn')) {
                  _this.timer.start();
                }
              });
            }
          }

          if (this.options.navButtons) {
            var $controls = this.$element.find('.' + this.options.nextClass + ', .' + this.options.prevClass);
            $controls.attr('tabindex', 0)
            //also need to handle enter/return and spacebar key presses
            .on('click.zf.orbit touchend.zf.orbit', function (e) {
              e.preventDefault();
              _this.changeSlide($(this).hasClass(_this.options.nextClass));
            });
          }

          if (this.options.bullets) {
            this.$bullets.on('click.zf.orbit touchend.zf.orbit', function () {
              if (/is-active/g.test(this.className)) {
                return false;
              } //if this is active, kick out of function.
              var idx = $(this).data('slide'),
                  ltr = idx > _this.$slides.filter('.is-active').data('slide'),
                  $slide = _this.$slides.eq(idx);

              _this.changeSlide(ltr, $slide, idx);
            });
          }

          if (this.options.accessible) {
            this.$wrapper.add(this.$bullets).on('keydown.zf.orbit', function (e) {
              // handle keyboard event with keyboard util
              Foundation.Keyboard.handleKey(e, 'Orbit', {
                next: function () {
                  _this.changeSlide(true);
                },
                previous: function () {
                  _this.changeSlide(false);
                },
                handled: function () {
                  // if bullet is focused, make sure focus moves
                  if ($(e.target).is(_this.$bullets)) {
                    _this.$bullets.filter('.is-active').focus();
                  }
                }
              });
            });
          }
        }
      }

      /**
       * Resets Orbit so it can be reinitialized
       */

    }, {
      key: '_reset',
      value: function _reset() {
        // Don't do anything if there are no slides (first run)
        if (typeof this.$slides == 'undefined') {
          return;
        }

        if (this.$slides.length > 1) {
          // Remove old events
          this.$element.off('.zf.orbit').find('*').off('.zf.orbit');

          // Restart timer if autoPlay is enabled
          if (this.options.autoPlay) {
            this.timer.restart();
          }

          // Reset all sliddes
          this.$slides.each(function (el) {
            $(el).removeClass('is-active is-active is-in').removeAttr('aria-live').hide();
          });

          // Show the first slide
          this.$slides.first().addClass('is-active').show();

          // Triggers when the slide has finished animating
          this.$element.trigger('slidechange.zf.orbit', [this.$slides.first()]);

          // Select first bullet if bullets are present
          if (this.options.bullets) {
            this._updateBullets(0);
          }
        }
      }

      /**
      * Changes the current slide to a new one.
      * @function
      * @param {Boolean} isLTR - flag if the slide should move left to right.
      * @param {jQuery} chosenSlide - the jQuery element of the slide to show next, if one is selected.
      * @param {Number} idx - the index of the new slide in its collection, if one chosen.
      * @fires Orbit#slidechange
      */

    }, {
      key: 'changeSlide',
      value: function changeSlide(isLTR, chosenSlide, idx) {
        if (!this.$slides) {
          return;
        } // Don't freak out if we're in the middle of cleanup
        var $curSlide = this.$slides.filter('.is-active').eq(0);

        if (/mui/g.test($curSlide[0].className)) {
          return false;
        } //if the slide is currently animating, kick out of the function

        var $firstSlide = this.$slides.first(),
            $lastSlide = this.$slides.last(),
            dirIn = isLTR ? 'Right' : 'Left',
            dirOut = isLTR ? 'Left' : 'Right',
            _this = this,
            $newSlide;

        if (!chosenSlide) {
          //most of the time, this will be auto played or clicked from the navButtons.
          $newSlide = isLTR ? //if wrapping enabled, check to see if there is a `next` or `prev` sibling, if not, select the first or last slide to fill in. if wrapping not enabled, attempt to select `next` or `prev`, if there's nothing there, the function will kick out on next step. CRAZY NESTED TERNARIES!!!!!
          this.options.infiniteWrap ? $curSlide.next('.' + this.options.slideClass).length ? $curSlide.next('.' + this.options.slideClass) : $firstSlide : $curSlide.next('.' + this.options.slideClass) : //pick next slide if moving left to right
          this.options.infiniteWrap ? $curSlide.prev('.' + this.options.slideClass).length ? $curSlide.prev('.' + this.options.slideClass) : $lastSlide : $curSlide.prev('.' + this.options.slideClass); //pick prev slide if moving right to left
        } else {
          $newSlide = chosenSlide;
        }

        if ($newSlide.length) {
          /**
          * Triggers before the next slide starts animating in and only if a next slide has been found.
          * @event Orbit#beforeslidechange
          */
          this.$element.trigger('beforeslidechange.zf.orbit', [$curSlide, $newSlide]);

          if (this.options.bullets) {
            idx = idx || this.$slides.index($newSlide); //grab index to update bullets
            this._updateBullets(idx);
          }

          if (this.options.useMUI && !this.$element.is(':hidden')) {
            Foundation.Motion.animateIn($newSlide.addClass('is-active').css({ 'position': 'absolute', 'top': 0 }), this.options['animInFrom' + dirIn], function () {
              $newSlide.css({ 'position': 'relative', 'display': 'block' }).attr('aria-live', 'polite');
            });

            Foundation.Motion.animateOut($curSlide.removeClass('is-active'), this.options['animOutTo' + dirOut], function () {
              $curSlide.removeAttr('aria-live');
              if (_this.options.autoPlay && !_this.timer.isPaused) {
                _this.timer.restart();
              }
              //do stuff?
            });
          } else {
            $curSlide.removeClass('is-active is-in').removeAttr('aria-live').hide();
            $newSlide.addClass('is-active is-in').attr('aria-live', 'polite').show();
            if (this.options.autoPlay && !this.timer.isPaused) {
              this.timer.restart();
            }
          }
          /**
          * Triggers when the slide has finished animating in.
          * @event Orbit#slidechange
          */
          this.$element.trigger('slidechange.zf.orbit', [$newSlide]);
        }
      }

      /**
      * Updates the active state of the bullets, if displayed.
      * @function
      * @private
      * @param {Number} idx - the index of the current slide.
      */

    }, {
      key: '_updateBullets',
      value: function _updateBullets(idx) {
        var $oldBullet = this.$element.find('.' + this.options.boxOfBullets).find('.is-active').removeClass('is-active').blur(),
            span = $oldBullet.find('span:last').detach(),
            $newBullet = this.$bullets.eq(idx).addClass('is-active').append(span);
      }

      /**
      * Destroys the carousel and hides the element.
      * @function
      */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.orbit').find('*').off('.zf.orbit').end().hide();
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Orbit;
  }();

  Orbit.defaults = {
    /**
    * Tells the JS to look for and loadBullets.
    * @option
     * @type {boolean}
    * @default true
    */
    bullets: true,
    /**
    * Tells the JS to apply event listeners to nav buttons
    * @option
     * @type {boolean}
    * @default true
    */
    navButtons: true,
    /**
    * motion-ui animation class to apply
    * @option
     * @type {string}
    * @default 'slide-in-right'
    */
    animInFromRight: 'slide-in-right',
    /**
    * motion-ui animation class to apply
    * @option
     * @type {string}
    * @default 'slide-out-right'
    */
    animOutToRight: 'slide-out-right',
    /**
    * motion-ui animation class to apply
    * @option
     * @type {string}
    * @default 'slide-in-left'
    *
    */
    animInFromLeft: 'slide-in-left',
    /**
    * motion-ui animation class to apply
    * @option
     * @type {string}
    * @default 'slide-out-left'
    */
    animOutToLeft: 'slide-out-left',
    /**
    * Allows Orbit to automatically animate on page load.
    * @option
     * @type {boolean}
    * @default true
    */
    autoPlay: true,
    /**
    * Amount of time, in ms, between slide transitions
    * @option
     * @type {number}
    * @default 5000
    */
    timerDelay: 5000,
    /**
    * Allows Orbit to infinitely loop through the slides
    * @option
     * @type {boolean}
    * @default true
    */
    infiniteWrap: true,
    /**
    * Allows the Orbit slides to bind to swipe events for mobile, requires an additional util library
    * @option
     * @type {boolean}
    * @default true
    */
    swipe: true,
    /**
    * Allows the timing function to pause animation on hover.
    * @option
     * @type {boolean}
    * @default true
    */
    pauseOnHover: true,
    /**
    * Allows Orbit to bind keyboard events to the slider, to animate frames with arrow keys
    * @option
     * @type {boolean}
    * @default true
    */
    accessible: true,
    /**
    * Class applied to the container of Orbit
    * @option
     * @type {string}
    * @default 'orbit-container'
    */
    containerClass: 'orbit-container',
    /**
    * Class applied to individual slides.
    * @option
     * @type {string}
    * @default 'orbit-slide'
    */
    slideClass: 'orbit-slide',
    /**
    * Class applied to the bullet container. You're welcome.
    * @option
     * @type {string}
    * @default 'orbit-bullets'
    */
    boxOfBullets: 'orbit-bullets',
    /**
    * Class applied to the `next` navigation button.
    * @option
     * @type {string}
    * @default 'orbit-next'
    */
    nextClass: 'orbit-next',
    /**
    * Class applied to the `previous` navigation button.
    * @option
     * @type {string}
    * @default 'orbit-previous'
    */
    prevClass: 'orbit-previous',
    /**
    * Boolean to flag the js to use motion ui classes or not. Default to true for backwards compatability.
    * @option
     * @type {boolean}
    * @default true
    */
    useMUI: true
  };

  // Window exports
  Foundation.plugin(Orbit, 'Orbit');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * ResponsiveMenu module.
   * @module foundation.responsiveMenu
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   */

  var ResponsiveMenu = function () {
    /**
     * Creates a new instance of a responsive menu.
     * @class
     * @fires ResponsiveMenu#init
     * @param {jQuery} element - jQuery object to make into a dropdown menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function ResponsiveMenu(element, options) {
      _classCallCheck(this, ResponsiveMenu);

      this.$element = $(element);
      this.rules = this.$element.data('responsive-menu');
      this.currentMq = null;
      this.currentPlugin = null;

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'ResponsiveMenu');
    }

    /**
     * Initializes the Menu by parsing the classes from the 'data-ResponsiveMenu' attribute on the element.
     * @function
     * @private
     */


    _createClass(ResponsiveMenu, [{
      key: '_init',
      value: function _init() {
        // The first time an Interchange plugin is initialized, this.rules is converted from a string of "classes" to an object of rules
        if (typeof this.rules === 'string') {
          var rulesTree = {};

          // Parse rules from "classes" pulled from data attribute
          var rules = this.rules.split(' ');

          // Iterate through every rule found
          for (var i = 0; i < rules.length; i++) {
            var rule = rules[i].split('-');
            var ruleSize = rule.length > 1 ? rule[0] : 'small';
            var rulePlugin = rule.length > 1 ? rule[1] : rule[0];

            if (MenuPlugins[rulePlugin] !== null) {
              rulesTree[ruleSize] = MenuPlugins[rulePlugin];
            }
          }

          this.rules = rulesTree;
        }

        if (!$.isEmptyObject(this.rules)) {
          this._checkMediaQueries();
        }
        // Add data-mutate since children may need it.
        this.$element.attr('data-mutate', this.$element.attr('data-mutate') || Foundation.GetYoDigits(6, 'responsive-menu'));
      }

      /**
       * Initializes events for the Menu.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        $(window).on('changed.zf.mediaquery', function () {
          _this._checkMediaQueries();
        });
        // $(window).on('resize.zf.ResponsiveMenu', function() {
        //   _this._checkMediaQueries();
        // });
      }

      /**
       * Checks the current screen width against available media queries. If the media query has changed, and the plugin needed has changed, the plugins will swap out.
       * @function
       * @private
       */

    }, {
      key: '_checkMediaQueries',
      value: function _checkMediaQueries() {
        var matchedMq,
            _this = this;
        // Iterate through each rule and find the last matching rule
        $.each(this.rules, function (key) {
          if (Foundation.MediaQuery.atLeast(key)) {
            matchedMq = key;
          }
        });

        // No match? No dice
        if (!matchedMq) return;

        // Plugin already initialized? We good
        if (this.currentPlugin instanceof this.rules[matchedMq].plugin) return;

        // Remove existing plugin-specific CSS classes
        $.each(MenuPlugins, function (key, value) {
          _this.$element.removeClass(value.cssClass);
        });

        // Add the CSS class for the new plugin
        this.$element.addClass(this.rules[matchedMq].cssClass);

        // Create an instance of the new plugin
        if (this.currentPlugin) this.currentPlugin.destroy();
        this.currentPlugin = new this.rules[matchedMq].plugin(this.$element, {});
      }

      /**
       * Destroys the instance of the current plugin on this element, as well as the window resize handler that switches the plugins out.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.currentPlugin.destroy();
        $(window).off('.zf.ResponsiveMenu');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return ResponsiveMenu;
  }();

  ResponsiveMenu.defaults = {};

  // The plugin matches the plugin classes with these plugin instances.
  var MenuPlugins = {
    dropdown: {
      cssClass: 'dropdown',
      plugin: Foundation._plugins['dropdown-menu'] || null
    },
    drilldown: {
      cssClass: 'drilldown',
      plugin: Foundation._plugins['drilldown'] || null
    },
    accordion: {
      cssClass: 'accordion-menu',
      plugin: Foundation._plugins['accordion-menu'] || null
    }
  };

  // Window exports
  Foundation.plugin(ResponsiveMenu, 'ResponsiveMenu');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * ResponsiveToggle module.
   * @module foundation.responsiveToggle
   * @requires foundation.util.mediaQuery
   */

  var ResponsiveToggle = function () {
    /**
     * Creates a new instance of Tab Bar.
     * @class
     * @fires ResponsiveToggle#init
     * @param {jQuery} element - jQuery object to attach tab bar functionality to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function ResponsiveToggle(element, options) {
      _classCallCheck(this, ResponsiveToggle);

      this.$element = $(element);
      this.options = $.extend({}, ResponsiveToggle.defaults, this.$element.data(), options);

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'ResponsiveToggle');
    }

    /**
     * Initializes the tab bar by finding the target element, toggling element, and running update().
     * @function
     * @private
     */


    _createClass(ResponsiveToggle, [{
      key: '_init',
      value: function _init() {
        var targetID = this.$element.data('responsive-toggle');
        if (!targetID) {
          console.error('Your tab bar needs an ID of a Menu as the value of data-tab-bar.');
        }

        this.$targetMenu = $('#' + targetID);
        this.$toggler = this.$element.find('[data-toggle]').filter(function () {
          var target = $(this).data('toggle');
          return target === targetID || target === "";
        });
        this.options = $.extend({}, this.options, this.$targetMenu.data());

        // If they were set, parse the animation classes
        if (this.options.animate) {
          var input = this.options.animate.split(' ');

          this.animationIn = input[0];
          this.animationOut = input[1] || null;
        }

        this._update();
      }

      /**
       * Adds necessary event handlers for the tab bar to work.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        this._updateMqHandler = this._update.bind(this);

        $(window).on('changed.zf.mediaquery', this._updateMqHandler);

        this.$toggler.on('click.zf.responsiveToggle', this.toggleMenu.bind(this));
      }

      /**
       * Checks the current media query to determine if the tab bar should be visible or hidden.
       * @function
       * @private
       */

    }, {
      key: '_update',
      value: function _update() {
        // Mobile
        if (!Foundation.MediaQuery.atLeast(this.options.hideFor)) {
          this.$element.show();
          this.$targetMenu.hide();
        }

        // Desktop
        else {
            this.$element.hide();
            this.$targetMenu.show();
          }
      }

      /**
       * Toggles the element attached to the tab bar. The toggle only happens if the screen is small enough to allow it.
       * @function
       * @fires ResponsiveToggle#toggled
       */

    }, {
      key: 'toggleMenu',
      value: function toggleMenu() {
        var _this2 = this;

        if (!Foundation.MediaQuery.atLeast(this.options.hideFor)) {
          /**
           * Fires when the element attached to the tab bar toggles.
           * @event ResponsiveToggle#toggled
           */
          if (this.options.animate) {
            if (this.$targetMenu.is(':hidden')) {
              Foundation.Motion.animateIn(this.$targetMenu, this.animationIn, function () {
                _this2.$element.trigger('toggled.zf.responsiveToggle');
                _this2.$targetMenu.find('[data-mutate]').triggerHandler('mutateme.zf.trigger');
              });
            } else {
              Foundation.Motion.animateOut(this.$targetMenu, this.animationOut, function () {
                _this2.$element.trigger('toggled.zf.responsiveToggle');
              });
            }
          } else {
            this.$targetMenu.toggle(0);
            this.$targetMenu.find('[data-mutate]').trigger('mutateme.zf.trigger');
            this.$element.trigger('toggled.zf.responsiveToggle');
          }
        }
      }
    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.responsiveToggle');
        this.$toggler.off('.zf.responsiveToggle');

        $(window).off('changed.zf.mediaquery', this._updateMqHandler);

        Foundation.unregisterPlugin(this);
      }
    }]);

    return ResponsiveToggle;
  }();

  ResponsiveToggle.defaults = {
    /**
     * The breakpoint after which the menu is always shown, and the tab bar is hidden.
     * @option
     * @type {string}
     * @default 'medium'
     */
    hideFor: 'medium',

    /**
     * To decide if the toggle should be animated or not.
     * @option
     * @type {boolean}
     * @default false
     */
    animate: false
  };

  // Window exports
  Foundation.plugin(ResponsiveToggle, 'ResponsiveToggle');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Reveal module.
   * @module foundation.reveal
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.motion if using animations
   */

  var Reveal = function () {
    /**
     * Creates a new instance of Reveal.
     * @class
     * @param {jQuery} element - jQuery object to use for the modal.
     * @param {Object} options - optional parameters.
     */
    function Reveal(element, options) {
      _classCallCheck(this, Reveal);

      this.$element = element;
      this.options = $.extend({}, Reveal.defaults, this.$element.data(), options);
      this._init();

      Foundation.registerPlugin(this, 'Reveal');
      Foundation.Keyboard.register('Reveal', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the modal by adding the overlay and close buttons, (if selected).
     * @private
     */


    _createClass(Reveal, [{
      key: '_init',
      value: function _init() {
        this.id = this.$element.attr('id');
        this.isActive = false;
        this.cached = { mq: Foundation.MediaQuery.current };
        this.isMobile = mobileSniff();

        this.$anchor = $('[data-open="' + this.id + '"]').length ? $('[data-open="' + this.id + '"]') : $('[data-toggle="' + this.id + '"]');
        this.$anchor.attr({
          'aria-controls': this.id,
          'aria-haspopup': true,
          'tabindex': 0
        });

        if (this.options.fullScreen || this.$element.hasClass('full')) {
          this.options.fullScreen = true;
          this.options.overlay = false;
        }
        if (this.options.overlay && !this.$overlay) {
          this.$overlay = this._makeOverlay(this.id);
        }

        this.$element.attr({
          'role': 'dialog',
          'aria-hidden': true,
          'data-yeti-box': this.id,
          'data-resize': this.id
        });

        if (this.$overlay) {
          this.$element.detach().appendTo(this.$overlay);
        } else {
          this.$element.detach().appendTo($(this.options.appendTo));
          this.$element.addClass('without-overlay');
        }
        this._events();
        if (this.options.deepLink && window.location.hash === '#' + this.id) {
          $(window).one('load.zf.reveal', this.open.bind(this));
        }
      }

      /**
       * Creates an overlay div to display behind the modal.
       * @private
       */

    }, {
      key: '_makeOverlay',
      value: function _makeOverlay() {
        return $('<div></div>').addClass('reveal-overlay').appendTo(this.options.appendTo);
      }

      /**
       * Updates position of modal
       * TODO:  Figure out if we actually need to cache these values or if it doesn't matter
       * @private
       */

    }, {
      key: '_updatePosition',
      value: function _updatePosition() {
        var width = this.$element.outerWidth();
        var outerWidth = $(window).width();
        var height = this.$element.outerHeight();
        var outerHeight = $(window).height();
        var left, top;
        if (this.options.hOffset === 'auto') {
          left = parseInt((outerWidth - width) / 2, 10);
        } else {
          left = parseInt(this.options.hOffset, 10);
        }
        if (this.options.vOffset === 'auto') {
          if (height > outerHeight) {
            top = parseInt(Math.min(100, outerHeight / 10), 10);
          } else {
            top = parseInt((outerHeight - height) / 4, 10);
          }
        } else {
          top = parseInt(this.options.vOffset, 10);
        }
        this.$element.css({ top: top + 'px' });
        // only worry about left if we don't have an overlay or we havea  horizontal offset,
        // otherwise we're perfectly in the middle
        if (!this.$overlay || this.options.hOffset !== 'auto') {
          this.$element.css({ left: left + 'px' });
          this.$element.css({ margin: '0px' });
        }
      }

      /**
       * Adds event handlers for the modal.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this2 = this;

        var _this = this;

        this.$element.on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': function (event, $element) {
            if (event.target === _this.$element[0] || $(event.target).parents('[data-closable]')[0] === $element) {
              // only close reveal when it's explicitly called
              return _this2.close.apply(_this2);
            }
          },
          'toggle.zf.trigger': this.toggle.bind(this),
          'resizeme.zf.trigger': function () {
            _this._updatePosition();
          }
        });

        if (this.$anchor.length) {
          this.$anchor.on('keydown.zf.reveal', function (e) {
            if (e.which === 13 || e.which === 32) {
              e.stopPropagation();
              e.preventDefault();
              _this.open();
            }
          });
        }

        if (this.options.closeOnClick && this.options.overlay) {
          this.$overlay.off('.zf.reveal').on('click.zf.reveal', function (e) {
            if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target) || !$.contains(document, e.target)) {
              return;
            }
            _this.close();
          });
        }
        if (this.options.deepLink) {
          $(window).on('popstate.zf.reveal:' + this.id, this._handleState.bind(this));
        }
      }

      /**
       * Handles modal methods on back/forward button clicks or any other event that triggers popstate.
       * @private
       */

    }, {
      key: '_handleState',
      value: function _handleState(e) {
        if (window.location.hash === '#' + this.id && !this.isActive) {
          this.open();
        } else {
          this.close();
        }
      }

      /**
       * Opens the modal controlled by `this.$anchor`, and closes all others by default.
       * @function
       * @fires Reveal#closeme
       * @fires Reveal#open
       */

    }, {
      key: 'open',
      value: function open() {
        var _this3 = this;

        if (this.options.deepLink) {
          var hash = '#' + this.id;

          if (window.history.pushState) {
            window.history.pushState(null, null, hash);
          } else {
            window.location.hash = hash;
          }
        }

        this.isActive = true;

        // Make elements invisible, but remove display: none so we can get size and positioning
        this.$element.css({ 'visibility': 'hidden' }).show().scrollTop(0);
        if (this.options.overlay) {
          this.$overlay.css({ 'visibility': 'hidden' }).show();
        }

        this._updatePosition();

        this.$element.hide().css({ 'visibility': '' });

        if (this.$overlay) {
          this.$overlay.css({ 'visibility': '' }).hide();
          if (this.$element.hasClass('fast')) {
            this.$overlay.addClass('fast');
          } else if (this.$element.hasClass('slow')) {
            this.$overlay.addClass('slow');
          }
        }

        if (!this.options.multipleOpened) {
          /**
           * Fires immediately before the modal opens.
           * Closes any other modals that are currently open
           * @event Reveal#closeme
           */
          this.$element.trigger('closeme.zf.reveal', this.id);
        }

        var _this = this;

        function addRevealOpenClasses() {
          if (_this.isMobile) {
            if (!_this.originalScrollPos) {
              _this.originalScrollPos = window.pageYOffset;
            }
            $('html, body').addClass('is-reveal-open');
          } else {
            $('body').addClass('is-reveal-open');
          }
        }
        // Motion UI method of reveal
        if (this.options.animationIn) {
          var afterAnimation = function () {
            _this.$element.attr({
              'aria-hidden': false,
              'tabindex': -1
            }).focus();
            addRevealOpenClasses();
            Foundation.Keyboard.trapFocus(_this.$element);
          };

          if (this.options.overlay) {
            Foundation.Motion.animateIn(this.$overlay, 'fade-in');
          }
          Foundation.Motion.animateIn(this.$element, this.options.animationIn, function () {
            if (_this3.$element) {
              // protect against object having been removed
              _this3.focusableElements = Foundation.Keyboard.findFocusable(_this3.$element);
              afterAnimation();
            }
          });
        }
        // jQuery method of reveal
        else {
            if (this.options.overlay) {
              this.$overlay.show(0);
            }
            this.$element.show(this.options.showDelay);
          }

        // handle accessibility
        this.$element.attr({
          'aria-hidden': false,
          'tabindex': -1
        }).focus();
        Foundation.Keyboard.trapFocus(this.$element);

        /**
         * Fires when the modal has successfully opened.
         * @event Reveal#open
         */
        this.$element.trigger('open.zf.reveal');

        addRevealOpenClasses();

        setTimeout(function () {
          _this3._extraHandlers();
        }, 0);
      }

      /**
       * Adds extra event handlers for the body and window if necessary.
       * @private
       */

    }, {
      key: '_extraHandlers',
      value: function _extraHandlers() {
        var _this = this;
        if (!this.$element) {
          return;
        } // If we're in the middle of cleanup, don't freak out
        this.focusableElements = Foundation.Keyboard.findFocusable(this.$element);

        if (!this.options.overlay && this.options.closeOnClick && !this.options.fullScreen) {
          $('body').on('click.zf.reveal', function (e) {
            if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target) || !$.contains(document, e.target)) {
              return;
            }
            _this.close();
          });
        }

        if (this.options.closeOnEsc) {
          $(window).on('keydown.zf.reveal', function (e) {
            Foundation.Keyboard.handleKey(e, 'Reveal', {
              close: function () {
                if (_this.options.closeOnEsc) {
                  _this.close();
                  _this.$anchor.focus();
                }
              }
            });
          });
        }

        // lock focus within modal while tabbing
        this.$element.on('keydown.zf.reveal', function (e) {
          var $target = $(this);
          // handle keyboard event with keyboard util
          Foundation.Keyboard.handleKey(e, 'Reveal', {
            open: function () {
              if (_this.$element.find(':focus').is(_this.$element.find('[data-close]'))) {
                setTimeout(function () {
                  // set focus back to anchor if close button has been activated
                  _this.$anchor.focus();
                }, 1);
              } else if ($target.is(_this.focusableElements)) {
                // dont't trigger if acual element has focus (i.e. inputs, links, ...)
                _this.open();
              }
            },
            close: function () {
              if (_this.options.closeOnEsc) {
                _this.close();
                _this.$anchor.focus();
              }
            },
            handled: function (preventDefault) {
              if (preventDefault) {
                e.preventDefault();
              }
            }
          });
        });
      }

      /**
       * Closes the modal.
       * @function
       * @fires Reveal#closed
       */

    }, {
      key: 'close',
      value: function close() {
        if (!this.isActive || !this.$element.is(':visible')) {
          return false;
        }
        var _this = this;

        // Motion UI method of hiding
        if (this.options.animationOut) {
          if (this.options.overlay) {
            Foundation.Motion.animateOut(this.$overlay, 'fade-out', finishUp);
          } else {
            finishUp();
          }

          Foundation.Motion.animateOut(this.$element, this.options.animationOut);
        }
        // jQuery method of hiding
        else {

            this.$element.hide(this.options.hideDelay);

            if (this.options.overlay) {
              this.$overlay.hide(0, finishUp);
            } else {
              finishUp();
            }
          }

        // Conditionals to remove extra event listeners added on open
        if (this.options.closeOnEsc) {
          $(window).off('keydown.zf.reveal');
        }

        if (!this.options.overlay && this.options.closeOnClick) {
          $('body').off('click.zf.reveal');
        }

        this.$element.off('keydown.zf.reveal');

        function finishUp() {
          if (_this.isMobile) {
            if ($('.reveal:visible').length === 0) {
              $('html, body').removeClass('is-reveal-open');
            }
            if (_this.originalScrollPos) {
              $('body').scrollTop(_this.originalScrollPos);
              _this.originalScrollPos = null;
            }
          } else {
            if ($('.reveal:visible').length === 0) {
              $('body').removeClass('is-reveal-open');
            }
          }

          Foundation.Keyboard.releaseFocus(_this.$element);

          _this.$element.attr('aria-hidden', true);

          /**
          * Fires when the modal is done closing.
          * @event Reveal#closed
          */
          _this.$element.trigger('closed.zf.reveal');
        }

        /**
        * Resets the modal content
        * This prevents a running video to keep going in the background
        */
        if (this.options.resetOnClose) {
          this.$element.html(this.$element.html());
        }

        this.isActive = false;
        if (_this.options.deepLink) {
          if (window.history.replaceState) {
            window.history.replaceState('', document.title, window.location.href.replace('#' + this.id, ''));
          } else {
            window.location.hash = '';
          }
        }
      }

      /**
       * Toggles the open/closed state of a modal.
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        if (this.isActive) {
          this.close();
        } else {
          this.open();
        }
      }
    }, {
      key: 'destroy',


      /**
       * Destroys an instance of a modal.
       * @function
       */
      value: function destroy() {
        if (this.options.overlay) {
          this.$element.appendTo($(this.options.appendTo)); // move $element outside of $overlay to prevent error unregisterPlugin()
          this.$overlay.hide().off().remove();
        }
        this.$element.hide().off();
        this.$anchor.off('.zf');
        $(window).off('.zf.reveal:' + this.id);

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Reveal;
  }();

  Reveal.defaults = {
    /**
     * Motion-UI class to use for animated elements. If none used, defaults to simple show/hide.
     * @option
     * @type {string}
     * @default ''
     */
    animationIn: '',
    /**
     * Motion-UI class to use for animated elements. If none used, defaults to simple show/hide.
     * @option
     * @type {string}
     * @default ''
     */
    animationOut: '',
    /**
     * Time, in ms, to delay the opening of a modal after a click if no animation used.
     * @option
     * @type {number}
     * @default 0
     */
    showDelay: 0,
    /**
     * Time, in ms, to delay the closing of a modal after a click if no animation used.
     * @option
     * @type {number}
     * @default 0
     */
    hideDelay: 0,
    /**
     * Allows a click on the body/overlay to close the modal.
     * @option
     * @type {boolean}
     * @default true
     */
    closeOnClick: true,
    /**
     * Allows the modal to close if the user presses the `ESCAPE` key.
     * @option
     * @type {boolean}
     * @default true
     */
    closeOnEsc: true,
    /**
     * If true, allows multiple modals to be displayed at once.
     * @option
     * @type {boolean}
     * @default false
     */
    multipleOpened: false,
    /**
     * Distance, in pixels, the modal should push down from the top of the screen.
     * @option
     * @type {number|string}
     * @default auto
     */
    vOffset: 'auto',
    /**
     * Distance, in pixels, the modal should push in from the side of the screen.
     * @option
     * @type {number|string}
     * @default auto
     */
    hOffset: 'auto',
    /**
     * Allows the modal to be fullscreen, completely blocking out the rest of the view. JS checks for this as well.
     * @option
     * @type {boolean}
     * @default false
     */
    fullScreen: false,
    /**
     * Percentage of screen height the modal should push up from the bottom of the view.
     * @option
     * @type {number}
     * @default 10
     */
    btmOffsetPct: 10,
    /**
     * Allows the modal to generate an overlay div, which will cover the view when modal opens.
     * @option
     * @type {boolean}
     * @default true
     */
    overlay: true,
    /**
     * Allows the modal to remove and reinject markup on close. Should be true if using video elements w/o using provider's api, otherwise, videos will continue to play in the background.
     * @option
     * @type {boolean}
     * @default false
     */
    resetOnClose: false,
    /**
     * Allows the modal to alter the url on open/close, and allows the use of the `back` button to close modals. ALSO, allows a modal to auto-maniacally open on page load IF the hash === the modal's user-set id.
     * @option
     * @type {boolean}
     * @default false
     */
    deepLink: false,
    /**
    * Allows the modal to append to custom div.
    * @option
    * @type {string}
    * @default "body"
    */
    appendTo: "body"

  };

  // Window exports
  Foundation.plugin(Reveal, 'Reveal');

  function iPhoneSniff() {
    return (/iP(ad|hone|od).*OS/.test(window.navigator.userAgent)
    );
  }

  function androidSniff() {
    return (/Android/.test(window.navigator.userAgent)
    );
  }

  function mobileSniff() {
    return iPhoneSniff() || androidSniff();
  }
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Slider module.
   * @module foundation.slider
   * @requires foundation.util.motion
   * @requires foundation.util.triggers
   * @requires foundation.util.keyboard
   * @requires foundation.util.touch
   */

  var Slider = function () {
    /**
     * Creates a new instance of a slider control.
     * @class
     * @param {jQuery} element - jQuery object to make into a slider control.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Slider(element, options) {
      _classCallCheck(this, Slider);

      this.$element = element;
      this.options = $.extend({}, Slider.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Slider');
      Foundation.Keyboard.register('Slider', {
        'ltr': {
          'ARROW_RIGHT': 'increase',
          'ARROW_UP': 'increase',
          'ARROW_DOWN': 'decrease',
          'ARROW_LEFT': 'decrease',
          'SHIFT_ARROW_RIGHT': 'increase_fast',
          'SHIFT_ARROW_UP': 'increase_fast',
          'SHIFT_ARROW_DOWN': 'decrease_fast',
          'SHIFT_ARROW_LEFT': 'decrease_fast'
        },
        'rtl': {
          'ARROW_LEFT': 'increase',
          'ARROW_RIGHT': 'decrease',
          'SHIFT_ARROW_LEFT': 'increase_fast',
          'SHIFT_ARROW_RIGHT': 'decrease_fast'
        }
      });
    }

    /**
     * Initilizes the plugin by reading/setting attributes, creating collections and setting the initial position of the handle(s).
     * @function
     * @private
     */


    _createClass(Slider, [{
      key: '_init',
      value: function _init() {
        this.inputs = this.$element.find('input');
        this.handles = this.$element.find('[data-slider-handle]');

        this.$handle = this.handles.eq(0);
        this.$input = this.inputs.length ? this.inputs.eq(0) : $('#' + this.$handle.attr('aria-controls'));
        this.$fill = this.$element.find('[data-slider-fill]').css(this.options.vertical ? 'height' : 'width', 0);

        var isDbl = false,
            _this = this;
        if (this.options.disabled || this.$element.hasClass(this.options.disabledClass)) {
          this.options.disabled = true;
          this.$element.addClass(this.options.disabledClass);
        }
        if (!this.inputs.length) {
          this.inputs = $().add(this.$input);
          this.options.binding = true;
        }

        this._setInitAttr(0);

        if (this.handles[1]) {
          this.options.doubleSided = true;
          this.$handle2 = this.handles.eq(1);
          this.$input2 = this.inputs.length > 1 ? this.inputs.eq(1) : $('#' + this.$handle2.attr('aria-controls'));

          if (!this.inputs[1]) {
            this.inputs = this.inputs.add(this.$input2);
          }
          isDbl = true;

          // this.$handle.triggerHandler('click.zf.slider');
          this._setInitAttr(1);
        }

        // Set handle positions
        this.setHandles();

        this._events();
      }
    }, {
      key: 'setHandles',
      value: function setHandles() {
        var _this2 = this;

        if (this.handles[1]) {
          this._setHandlePos(this.$handle, this.inputs.eq(0).val(), true, function () {
            _this2._setHandlePos(_this2.$handle2, _this2.inputs.eq(1).val(), true);
          });
        } else {
          this._setHandlePos(this.$handle, this.inputs.eq(0).val(), true);
        }
      }
    }, {
      key: '_reflow',
      value: function _reflow() {
        this.setHandles();
      }
      /**
      * @function
      * @private
      * @param {Number} value - floating point (the value) to be transformed using to a relative position on the slider (the inverse of _value)
      */

    }, {
      key: '_pctOfBar',
      value: function _pctOfBar(value) {
        var pctOfBar = percent(value - this.options.start, this.options.end - this.options.start);

        switch (this.options.positionValueFunction) {
          case "pow":
            pctOfBar = this._logTransform(pctOfBar);
            break;
          case "log":
            pctOfBar = this._powTransform(pctOfBar);
            break;
        }

        return pctOfBar.toFixed(2);
      }

      /**
      * @function
      * @private
      * @param {Number} pctOfBar - floating point, the relative position of the slider (typically between 0-1) to be transformed to a value
      */

    }, {
      key: '_value',
      value: function _value(pctOfBar) {
        switch (this.options.positionValueFunction) {
          case "pow":
            pctOfBar = this._powTransform(pctOfBar);
            break;
          case "log":
            pctOfBar = this._logTransform(pctOfBar);
            break;
        }
        var value = (this.options.end - this.options.start) * pctOfBar + this.options.start;

        return value;
      }

      /**
      * @function
      * @private
      * @param {Number} value - floating point (typically between 0-1) to be transformed using the log function
      */

    }, {
      key: '_logTransform',
      value: function _logTransform(value) {
        return baseLog(this.options.nonLinearBase, value * (this.options.nonLinearBase - 1) + 1);
      }

      /**
      * @function
      * @private
      * @param {Number} value - floating point (typically between 0-1) to be transformed using the power function
      */

    }, {
      key: '_powTransform',
      value: function _powTransform(value) {
        return (Math.pow(this.options.nonLinearBase, value) - 1) / (this.options.nonLinearBase - 1);
      }

      /**
       * Sets the position of the selected handle and fill bar.
       * @function
       * @private
       * @param {jQuery} $hndl - the selected handle to move.
       * @param {Number} location - floating point between the start and end values of the slider bar.
       * @param {Function} cb - callback function to fire on completion.
       * @fires Slider#moved
       * @fires Slider#changed
       */

    }, {
      key: '_setHandlePos',
      value: function _setHandlePos($hndl, location, noInvert, cb) {
        // don't move if the slider has been disabled since its initialization
        if (this.$element.hasClass(this.options.disabledClass)) {
          return;
        }
        //might need to alter that slightly for bars that will have odd number selections.
        location = parseFloat(location); //on input change events, convert string to number...grumble.

        // prevent slider from running out of bounds, if value exceeds the limits set through options, override the value to min/max
        if (location < this.options.start) {
          location = this.options.start;
        } else if (location > this.options.end) {
          location = this.options.end;
        }

        var isDbl = this.options.doubleSided;

        if (isDbl) {
          //this block is to prevent 2 handles from crossing eachother. Could/should be improved.
          if (this.handles.index($hndl) === 0) {
            var h2Val = parseFloat(this.$handle2.attr('aria-valuenow'));
            location = location >= h2Val ? h2Val - this.options.step : location;
          } else {
            var h1Val = parseFloat(this.$handle.attr('aria-valuenow'));
            location = location <= h1Val ? h1Val + this.options.step : location;
          }
        }

        //this is for single-handled vertical sliders, it adjusts the value to account for the slider being "upside-down"
        //for click and drag events, it's weird due to the scale(-1, 1) css property
        if (this.options.vertical && !noInvert) {
          location = this.options.end - location;
        }

        var _this = this,
            vert = this.options.vertical,
            hOrW = vert ? 'height' : 'width',
            lOrT = vert ? 'top' : 'left',
            handleDim = $hndl[0].getBoundingClientRect()[hOrW],
            elemDim = this.$element[0].getBoundingClientRect()[hOrW],

        //percentage of bar min/max value based on click or drag point
        pctOfBar = this._pctOfBar(location),

        //number of actual pixels to shift the handle, based on the percentage obtained above
        pxToMove = (elemDim - handleDim) * pctOfBar,

        //percentage of bar to shift the handle
        movement = (percent(pxToMove, elemDim) * 100).toFixed(this.options.decimal);
        //fixing the decimal value for the location number, is passed to other methods as a fixed floating-point value
        location = parseFloat(location.toFixed(this.options.decimal));
        // declare empty object for css adjustments, only used with 2 handled-sliders
        var css = {};

        this._setValues($hndl, location);

        // TODO update to calculate based on values set to respective inputs??
        if (isDbl) {
          var isLeftHndl = this.handles.index($hndl) === 0,

          //empty variable, will be used for min-height/width for fill bar
          dim,

          //percentage w/h of the handle compared to the slider bar
          handlePct = ~~(percent(handleDim, elemDim) * 100);
          //if left handle, the math is slightly different than if it's the right handle, and the left/top property needs to be changed for the fill bar
          if (isLeftHndl) {
            //left or top percentage value to apply to the fill bar.
            css[lOrT] = movement + '%';
            //calculate the new min-height/width for the fill bar.
            dim = parseFloat(this.$handle2[0].style[lOrT]) - movement + handlePct;
            //this callback is necessary to prevent errors and allow the proper placement and initialization of a 2-handled slider
            //plus, it means we don't care if 'dim' isNaN on init, it won't be in the future.
            if (cb && typeof cb === 'function') {
              cb();
            } //this is only needed for the initialization of 2 handled sliders
          } else {
            //just caching the value of the left/bottom handle's left/top property
            var handlePos = parseFloat(this.$handle[0].style[lOrT]);
            //calculate the new min-height/width for the fill bar. Use isNaN to prevent false positives for numbers <= 0
            //based on the percentage of movement of the handle being manipulated, less the opposing handle's left/top position, plus the percentage w/h of the handle itself
            dim = movement - (isNaN(handlePos) ? (this.options.initialStart - this.options.start) / ((this.options.end - this.options.start) / 100) : handlePos) + handlePct;
          }
          // assign the min-height/width to our css object
          css['min-' + hOrW] = dim + '%';
        }

        this.$element.one('finished.zf.animate', function () {
          /**
           * Fires when the handle is done moving.
           * @event Slider#moved
           */
          _this.$element.trigger('moved.zf.slider', [$hndl]);
        });

        //because we don't know exactly how the handle will be moved, check the amount of time it should take to move.
        var moveTime = this.$element.data('dragging') ? 1000 / 60 : this.options.moveTime;

        Foundation.Move(moveTime, $hndl, function () {
          // adjusting the left/top property of the handle, based on the percentage calculated above
          // if movement isNaN, that is because the slider is hidden and we cannot determine handle width,
          // fall back to next best guess.
          if (isNaN(movement)) {
            $hndl.css(lOrT, pctOfBar * 100 + '%');
          } else {
            $hndl.css(lOrT, movement + '%');
          }

          if (!_this.options.doubleSided) {
            //if single-handled, a simple method to expand the fill bar
            _this.$fill.css(hOrW, pctOfBar * 100 + '%');
          } else {
            //otherwise, use the css object we created above
            _this.$fill.css(css);
          }
        });

        /**
         * Fires when the value has not been change for a given time.
         * @event Slider#changed
         */
        clearTimeout(_this.timeout);
        _this.timeout = setTimeout(function () {
          _this.$element.trigger('changed.zf.slider', [$hndl]);
        }, _this.options.changedDelay);
      }

      /**
       * Sets the initial attribute for the slider element.
       * @function
       * @private
       * @param {Number} idx - index of the current handle/input to use.
       */

    }, {
      key: '_setInitAttr',
      value: function _setInitAttr(idx) {
        var initVal = idx === 0 ? this.options.initialStart : this.options.initialEnd;
        var id = this.inputs.eq(idx).attr('id') || Foundation.GetYoDigits(6, 'slider');
        this.inputs.eq(idx).attr({
          'id': id,
          'max': this.options.end,
          'min': this.options.start,
          'step': this.options.step
        });
        this.inputs.eq(idx).val(initVal);
        this.handles.eq(idx).attr({
          'role': 'slider',
          'aria-controls': id,
          'aria-valuemax': this.options.end,
          'aria-valuemin': this.options.start,
          'aria-valuenow': initVal,
          'aria-orientation': this.options.vertical ? 'vertical' : 'horizontal',
          'tabindex': 0
        });
      }

      /**
       * Sets the input and `aria-valuenow` values for the slider element.
       * @function
       * @private
       * @param {jQuery} $handle - the currently selected handle.
       * @param {Number} val - floating point of the new value.
       */

    }, {
      key: '_setValues',
      value: function _setValues($handle, val) {
        var idx = this.options.doubleSided ? this.handles.index($handle) : 0;
        this.inputs.eq(idx).val(val);
        $handle.attr('aria-valuenow', val);
      }

      /**
       * Handles events on the slider element.
       * Calculates the new location of the current handle.
       * If there are two handles and the bar was clicked, it determines which handle to move.
       * @function
       * @private
       * @param {Object} e - the `event` object passed from the listener.
       * @param {jQuery} $handle - the current handle to calculate for, if selected.
       * @param {Number} val - floating point number for the new value of the slider.
       * TODO clean this up, there's a lot of repeated code between this and the _setHandlePos fn.
       */

    }, {
      key: '_handleEvent',
      value: function _handleEvent(e, $handle, val) {
        var value, hasVal;
        if (!val) {
          //click or drag events
          e.preventDefault();
          var _this = this,
              vertical = this.options.vertical,
              param = vertical ? 'height' : 'width',
              direction = vertical ? 'top' : 'left',
              eventOffset = vertical ? e.pageY : e.pageX,
              halfOfHandle = this.$handle[0].getBoundingClientRect()[param] / 2,
              barDim = this.$element[0].getBoundingClientRect()[param],
              windowScroll = vertical ? $(window).scrollTop() : $(window).scrollLeft();

          var elemOffset = this.$element.offset()[direction];

          // touch events emulated by the touch util give position relative to screen, add window.scroll to event coordinates...
          // best way to guess this is simulated is if clientY == pageY
          if (e.clientY === e.pageY) {
            eventOffset = eventOffset + windowScroll;
          }
          var eventFromBar = eventOffset - elemOffset;
          var barXY;
          if (eventFromBar < 0) {
            barXY = 0;
          } else if (eventFromBar > barDim) {
            barXY = barDim;
          } else {
            barXY = eventFromBar;
          }
          var offsetPct = percent(barXY, barDim);

          value = this._value(offsetPct);

          // turn everything around for RTL, yay math!
          if (Foundation.rtl() && !this.options.vertical) {
            value = this.options.end - value;
          }

          value = _this._adjustValue(null, value);
          //boolean flag for the setHandlePos fn, specifically for vertical sliders
          hasVal = false;

          if (!$handle) {
            //figure out which handle it is, pass it to the next function.
            var firstHndlPos = absPosition(this.$handle, direction, barXY, param),
                secndHndlPos = absPosition(this.$handle2, direction, barXY, param);
            $handle = firstHndlPos <= secndHndlPos ? this.$handle : this.$handle2;
          }
        } else {
          //change event on input
          value = this._adjustValue(null, val);
          hasVal = true;
        }

        this._setHandlePos($handle, value, hasVal);
      }

      /**
       * Adjustes value for handle in regard to step value. returns adjusted value
       * @function
       * @private
       * @param {jQuery} $handle - the selected handle.
       * @param {Number} value - value to adjust. used if $handle is falsy
       */

    }, {
      key: '_adjustValue',
      value: function _adjustValue($handle, value) {
        var val,
            step = this.options.step,
            div = parseFloat(step / 2),
            left,
            prev_val,
            next_val;
        if (!!$handle) {
          val = parseFloat($handle.attr('aria-valuenow'));
        } else {
          val = value;
        }
        left = val % step;
        prev_val = val - left;
        next_val = prev_val + step;
        if (left === 0) {
          return val;
        }
        val = val >= prev_val + div ? next_val : prev_val;
        return val;
      }

      /**
       * Adds event listeners to the slider elements.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this._eventsForHandle(this.$handle);
        if (this.handles[1]) {
          this._eventsForHandle(this.$handle2);
        }
      }

      /**
       * Adds event listeners a particular handle
       * @function
       * @private
       * @param {jQuery} $handle - the current handle to apply listeners to.
       */

    }, {
      key: '_eventsForHandle',
      value: function _eventsForHandle($handle) {
        var _this = this,
            curHandle,
            timer;

        this.inputs.off('change.zf.slider').on('change.zf.slider', function (e) {
          var idx = _this.inputs.index($(this));
          _this._handleEvent(e, _this.handles.eq(idx), $(this).val());
        });

        if (this.options.clickSelect) {
          this.$element.off('click.zf.slider').on('click.zf.slider', function (e) {
            if (_this.$element.data('dragging')) {
              return false;
            }

            if (!$(e.target).is('[data-slider-handle]')) {
              if (_this.options.doubleSided) {
                _this._handleEvent(e);
              } else {
                _this._handleEvent(e, _this.$handle);
              }
            }
          });
        }

        if (this.options.draggable) {
          this.handles.addTouch();

          var $body = $('body');
          $handle.off('mousedown.zf.slider').on('mousedown.zf.slider', function (e) {
            $handle.addClass('is-dragging');
            _this.$fill.addClass('is-dragging'); //
            _this.$element.data('dragging', true);

            curHandle = $(e.currentTarget);

            $body.on('mousemove.zf.slider', function (e) {
              e.preventDefault();
              _this._handleEvent(e, curHandle);
            }).on('mouseup.zf.slider', function (e) {
              _this._handleEvent(e, curHandle);

              $handle.removeClass('is-dragging');
              _this.$fill.removeClass('is-dragging');
              _this.$element.data('dragging', false);

              $body.off('mousemove.zf.slider mouseup.zf.slider');
            });
          })
          // prevent events triggered by touch
          .on('selectstart.zf.slider touchmove.zf.slider', function (e) {
            e.preventDefault();
          });
        }

        $handle.off('keydown.zf.slider').on('keydown.zf.slider', function (e) {
          var _$handle = $(this),
              idx = _this.options.doubleSided ? _this.handles.index(_$handle) : 0,
              oldValue = parseFloat(_this.inputs.eq(idx).val()),
              newValue;

          // handle keyboard event with keyboard util
          Foundation.Keyboard.handleKey(e, 'Slider', {
            decrease: function () {
              newValue = oldValue - _this.options.step;
            },
            increase: function () {
              newValue = oldValue + _this.options.step;
            },
            decrease_fast: function () {
              newValue = oldValue - _this.options.step * 10;
            },
            increase_fast: function () {
              newValue = oldValue + _this.options.step * 10;
            },
            handled: function () {
              // only set handle pos when event was handled specially
              e.preventDefault();
              _this._setHandlePos(_$handle, newValue, true);
            }
          });
          /*if (newValue) { // if pressed key has special function, update value
            e.preventDefault();
            _this._setHandlePos(_$handle, newValue);
          }*/
        });
      }

      /**
       * Destroys the slider plugin.
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.handles.off('.zf.slider');
        this.inputs.off('.zf.slider');
        this.$element.off('.zf.slider');

        clearTimeout(this.timeout);

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Slider;
  }();

  Slider.defaults = {
    /**
     * Minimum value for the slider scale.
     * @option
     * @type {number}
     * @default 0
     */
    start: 0,
    /**
     * Maximum value for the slider scale.
     * @option
     * @type {number}
     * @default 100
     */
    end: 100,
    /**
     * Minimum value change per change event.
     * @option
     * @type {number}
     * @default 1
     */
    step: 1,
    /**
     * Value at which the handle/input *(left handle/first input)* should be set to on initialization.
     * @option
     * @type {number}
     * @default 0
     */
    initialStart: 0,
    /**
     * Value at which the right handle/second input should be set to on initialization.
     * @option
     * @type {number}
     * @default 100
     */
    initialEnd: 100,
    /**
     * Allows the input to be located outside the container and visible. Set to by the JS
     * @option
     * @type {boolean}
     * @default false
     */
    binding: false,
    /**
     * Allows the user to click/tap on the slider bar to select a value.
     * @option
     * @type {boolean}
     * @default true
     */
    clickSelect: true,
    /**
     * Set to true and use the `vertical` class to change alignment to vertical.
     * @option
     * @type {boolean}
     * @default false
     */
    vertical: false,
    /**
     * Allows the user to drag the slider handle(s) to select a value.
     * @option
     * @type {boolean}
     * @default true
     */
    draggable: true,
    /**
     * Disables the slider and prevents event listeners from being applied. Double checked by JS with `disabledClass`.
     * @option
     * @type {boolean}
     * @default false
     */
    disabled: false,
    /**
     * Allows the use of two handles. Double checked by the JS. Changes some logic handling.
     * @option
     * @type {boolean}
     * @default false
     */
    doubleSided: false,
    /**
     * Potential future feature.
     */
    // steps: 100,
    /**
     * Number of decimal places the plugin should go to for floating point precision.
     * @option
     * @type {number}
     * @default 2
     */
    decimal: 2,
    /**
     * Time delay for dragged elements.
     */
    // dragDelay: 0,
    /**
     * Time, in ms, to animate the movement of a slider handle if user clicks/taps on the bar. Needs to be manually set if updating the transition time in the Sass settings.
     * @option
     * @type {number}
     * @default 200
     */
    moveTime: 200, //update this if changing the transition time in the sass
    /**
     * Class applied to disabled sliders.
     * @option
     * @type {string}
     * @default 'disabled'
     */
    disabledClass: 'disabled',
    /**
     * Will invert the default layout for a vertical<span data-tooltip title="who would do this???"> </span>slider.
     * @option
     * @type {boolean}
     * @default false
     */
    invertVertical: false,
    /**
     * Milliseconds before the `changed.zf-slider` event is triggered after value change.
     * @option
     * @type {number}
     * @default 500
     */
    changedDelay: 500,
    /**
    * Basevalue for non-linear sliders
    * @option
    * @type {number}
    * @default 5
    */
    nonLinearBase: 5,
    /**
    * Basevalue for non-linear sliders, possible values are: `'linear'`, `'pow'` & `'log'`. Pow and Log use the nonLinearBase setting.
    * @option
    * @type {string}
    * @default 'linear'
    */
    positionValueFunction: 'linear'
  };

  function percent(frac, num) {
    return frac / num;
  }
  function absPosition($handle, dir, clickPos, param) {
    return Math.abs($handle.position()[dir] + $handle[param]() / 2 - clickPos);
  }
  function baseLog(base, value) {
    return Math.log(value) / Math.log(base);
  }

  // Window exports
  Foundation.plugin(Slider, 'Slider');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Sticky module.
   * @module foundation.sticky
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   */

  var Sticky = function () {
    /**
     * Creates a new instance of a sticky thing.
     * @class
     * @param {jQuery} element - jQuery object to make sticky.
     * @param {Object} options - options object passed when creating the element programmatically.
     */
    function Sticky(element, options) {
      _classCallCheck(this, Sticky);

      this.$element = element;
      this.options = $.extend({}, Sticky.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Sticky');
    }

    /**
     * Initializes the sticky element by adding classes, getting/setting dimensions, breakpoints and attributes
     * @function
     * @private
     */


    _createClass(Sticky, [{
      key: '_init',
      value: function _init() {
        var $parent = this.$element.parent('[data-sticky-container]'),
            id = this.$element[0].id || Foundation.GetYoDigits(6, 'sticky'),
            _this = this;

        if (!$parent.length) {
          this.wasWrapped = true;
        }
        this.$container = $parent.length ? $parent : $(this.options.container).wrapInner(this.$element);
        this.$container.addClass(this.options.containerClass);

        this.$element.addClass(this.options.stickyClass).attr({ 'data-resize': id, 'data-mutate': id });
        if (this.options.anchor !== '') {
          $('#' + _this.options.anchor).attr({ 'data-mutate': id });
        }

        this.scrollCount = this.options.checkEvery;
        this.isStuck = false;
        $(window).one('load.zf.sticky', function () {
          //We calculate the container height to have correct values for anchor points offset calculation.
          _this.containerHeight = _this.$element.css("display") == "none" ? 0 : _this.$element[0].getBoundingClientRect().height;
          _this.$container.css('height', _this.containerHeight);
          _this.elemHeight = _this.containerHeight;
          if (_this.options.anchor !== '') {
            _this.$anchor = $('#' + _this.options.anchor);
          } else {
            _this._parsePoints();
          }

          _this._setSizes(function () {
            var scroll = window.pageYOffset;
            _this._calc(false, scroll);
            //Unstick the element will ensure that proper classes are set.
            if (!_this.isStuck) {
              _this._removeSticky(scroll >= _this.topPoint ? false : true);
            }
          });
          _this._events(id.split('-').reverse().join('-'));
        });
      }

      /**
       * If using multiple elements as anchors, calculates the top and bottom pixel values the sticky thing should stick and unstick on.
       * @function
       * @private
       */

    }, {
      key: '_parsePoints',
      value: function _parsePoints() {
        var top = this.options.topAnchor == "" ? 1 : this.options.topAnchor,
            btm = this.options.btmAnchor == "" ? document.documentElement.scrollHeight : this.options.btmAnchor,
            pts = [top, btm],
            breaks = {};
        for (var i = 0, len = pts.length; i < len && pts[i]; i++) {
          var pt;
          if (typeof pts[i] === 'number') {
            pt = pts[i];
          } else {
            var place = pts[i].split(':'),
                anchor = $('#' + place[0]);

            pt = anchor.offset().top;
            if (place[1] && place[1].toLowerCase() === 'bottom') {
              pt += anchor[0].getBoundingClientRect().height;
            }
          }
          breaks[i] = pt;
        }

        this.points = breaks;
        return;
      }

      /**
       * Adds event handlers for the scrolling element.
       * @private
       * @param {String} id - psuedo-random id for unique scroll event listener.
       */

    }, {
      key: '_events',
      value: function _events(id) {
        var _this = this,
            scrollListener = this.scrollListener = 'scroll.zf.' + id;
        if (this.isOn) {
          return;
        }
        if (this.canStick) {
          this.isOn = true;
          $(window).off(scrollListener).on(scrollListener, function (e) {
            if (_this.scrollCount === 0) {
              _this.scrollCount = _this.options.checkEvery;
              _this._setSizes(function () {
                _this._calc(false, window.pageYOffset);
              });
            } else {
              _this.scrollCount--;
              _this._calc(false, window.pageYOffset);
            }
          });
        }

        this.$element.off('resizeme.zf.trigger').on('resizeme.zf.trigger', function (e, el) {
          _this._eventsHandler(id);
        });

        this.$element.on('mutateme.zf.trigger', function (e, el) {
          _this._eventsHandler(id);
        });

        if (this.$anchor) {
          this.$anchor.on('mutateme.zf.trigger', function (e, el) {
            _this._eventsHandler(id);
          });
        }
      }

      /**
       * Handler for events.
       * @private
       * @param {String} id - psuedo-random id for unique scroll event listener.
       */

    }, {
      key: '_eventsHandler',
      value: function _eventsHandler(id) {
        var _this = this,
            scrollListener = this.scrollListener = 'scroll.zf.' + id;

        _this._setSizes(function () {
          _this._calc(false);
          if (_this.canStick) {
            if (!_this.isOn) {
              _this._events(id);
            }
          } else if (_this.isOn) {
            _this._pauseListeners(scrollListener);
          }
        });
      }

      /**
       * Removes event handlers for scroll and change events on anchor.
       * @fires Sticky#pause
       * @param {String} scrollListener - unique, namespaced scroll listener attached to `window`
       */

    }, {
      key: '_pauseListeners',
      value: function _pauseListeners(scrollListener) {
        this.isOn = false;
        $(window).off(scrollListener);

        /**
         * Fires when the plugin is paused due to resize event shrinking the view.
         * @event Sticky#pause
         * @private
         */
        this.$element.trigger('pause.zf.sticky');
      }

      /**
       * Called on every `scroll` event and on `_init`
       * fires functions based on booleans and cached values
       * @param {Boolean} checkSizes - true if plugin should recalculate sizes and breakpoints.
       * @param {Number} scroll - current scroll position passed from scroll event cb function. If not passed, defaults to `window.pageYOffset`.
       */

    }, {
      key: '_calc',
      value: function _calc(checkSizes, scroll) {
        if (checkSizes) {
          this._setSizes();
        }

        if (!this.canStick) {
          if (this.isStuck) {
            this._removeSticky(true);
          }
          return false;
        }

        if (!scroll) {
          scroll = window.pageYOffset;
        }

        if (scroll >= this.topPoint) {
          if (scroll <= this.bottomPoint) {
            if (!this.isStuck) {
              this._setSticky();
            }
          } else {
            if (this.isStuck) {
              this._removeSticky(false);
            }
          }
        } else {
          if (this.isStuck) {
            this._removeSticky(true);
          }
        }
      }

      /**
       * Causes the $element to become stuck.
       * Adds `position: fixed;`, and helper classes.
       * @fires Sticky#stuckto
       * @function
       * @private
       */

    }, {
      key: '_setSticky',
      value: function _setSticky() {
        var _this = this,
            stickTo = this.options.stickTo,
            mrgn = stickTo === 'top' ? 'marginTop' : 'marginBottom',
            notStuckTo = stickTo === 'top' ? 'bottom' : 'top',
            css = {};

        css[mrgn] = this.options[mrgn] + 'em';
        css[stickTo] = 0;
        css[notStuckTo] = 'auto';
        this.isStuck = true;
        this.$element.removeClass('is-anchored is-at-' + notStuckTo).addClass('is-stuck is-at-' + stickTo).css(css)
        /**
         * Fires when the $element has become `position: fixed;`
         * Namespaced to `top` or `bottom`, e.g. `sticky.zf.stuckto:top`
         * @event Sticky#stuckto
         */
        .trigger('sticky.zf.stuckto:' + stickTo);
        this.$element.on("transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd", function () {
          _this._setSizes();
        });
      }

      /**
       * Causes the $element to become unstuck.
       * Removes `position: fixed;`, and helper classes.
       * Adds other helper classes.
       * @param {Boolean} isTop - tells the function if the $element should anchor to the top or bottom of its $anchor element.
       * @fires Sticky#unstuckfrom
       * @private
       */

    }, {
      key: '_removeSticky',
      value: function _removeSticky(isTop) {
        var stickTo = this.options.stickTo,
            stickToTop = stickTo === 'top',
            css = {},
            anchorPt = (this.points ? this.points[1] - this.points[0] : this.anchorHeight) - this.elemHeight,
            mrgn = stickToTop ? 'marginTop' : 'marginBottom',
            notStuckTo = stickToTop ? 'bottom' : 'top',
            topOrBottom = isTop ? 'top' : 'bottom';

        css[mrgn] = 0;

        css['bottom'] = 'auto';
        if (isTop) {
          css['top'] = 0;
        } else {
          css['top'] = anchorPt;
        }

        this.isStuck = false;
        this.$element.removeClass('is-stuck is-at-' + stickTo).addClass('is-anchored is-at-' + topOrBottom).css(css)
        /**
         * Fires when the $element has become anchored.
         * Namespaced to `top` or `bottom`, e.g. `sticky.zf.unstuckfrom:bottom`
         * @event Sticky#unstuckfrom
         */
        .trigger('sticky.zf.unstuckfrom:' + topOrBottom);
      }

      /**
       * Sets the $element and $container sizes for plugin.
       * Calls `_setBreakPoints`.
       * @param {Function} cb - optional callback function to fire on completion of `_setBreakPoints`.
       * @private
       */

    }, {
      key: '_setSizes',
      value: function _setSizes(cb) {
        this.canStick = Foundation.MediaQuery.is(this.options.stickyOn);
        if (!this.canStick) {
          if (cb && typeof cb === 'function') {
            cb();
          }
        }
        var _this = this,
            newElemWidth = this.$container[0].getBoundingClientRect().width,
            comp = window.getComputedStyle(this.$container[0]),
            pdngl = parseInt(comp['padding-left'], 10),
            pdngr = parseInt(comp['padding-right'], 10);

        if (this.$anchor && this.$anchor.length) {
          this.anchorHeight = this.$anchor[0].getBoundingClientRect().height;
        } else {
          this._parsePoints();
        }

        this.$element.css({
          'max-width': newElemWidth - pdngl - pdngr + 'px'
        });

        var newContainerHeight = this.$element[0].getBoundingClientRect().height || this.containerHeight;
        if (this.$element.css("display") == "none") {
          newContainerHeight = 0;
        }
        this.containerHeight = newContainerHeight;
        this.$container.css({
          height: newContainerHeight
        });
        this.elemHeight = newContainerHeight;

        if (!this.isStuck) {
          if (this.$element.hasClass('is-at-bottom')) {
            var anchorPt = (this.points ? this.points[1] - this.$container.offset().top : this.anchorHeight) - this.elemHeight;
            this.$element.css('top', anchorPt);
          }
        }

        this._setBreakPoints(newContainerHeight, function () {
          if (cb && typeof cb === 'function') {
            cb();
          }
        });
      }

      /**
       * Sets the upper and lower breakpoints for the element to become sticky/unsticky.
       * @param {Number} elemHeight - px value for sticky.$element height, calculated by `_setSizes`.
       * @param {Function} cb - optional callback function to be called on completion.
       * @private
       */

    }, {
      key: '_setBreakPoints',
      value: function _setBreakPoints(elemHeight, cb) {
        if (!this.canStick) {
          if (cb && typeof cb === 'function') {
            cb();
          } else {
            return false;
          }
        }
        var mTop = emCalc(this.options.marginTop),
            mBtm = emCalc(this.options.marginBottom),
            topPoint = this.points ? this.points[0] : this.$anchor.offset().top,
            bottomPoint = this.points ? this.points[1] : topPoint + this.anchorHeight,

        // topPoint = this.$anchor.offset().top || this.points[0],
        // bottomPoint = topPoint + this.anchorHeight || this.points[1],
        winHeight = window.innerHeight;

        if (this.options.stickTo === 'top') {
          topPoint -= mTop;
          bottomPoint -= elemHeight + mTop;
        } else if (this.options.stickTo === 'bottom') {
          topPoint -= winHeight - (elemHeight + mBtm);
          bottomPoint -= winHeight - mBtm;
        } else {
          //this would be the stickTo: both option... tricky
        }

        this.topPoint = topPoint;
        this.bottomPoint = bottomPoint;

        if (cb && typeof cb === 'function') {
          cb();
        }
      }

      /**
       * Destroys the current sticky element.
       * Resets the element to the top position first.
       * Removes event listeners, JS-added css properties and classes, and unwraps the $element if the JS added the $container.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this._removeSticky(true);

        this.$element.removeClass(this.options.stickyClass + ' is-anchored is-at-top').css({
          height: '',
          top: '',
          bottom: '',
          'max-width': ''
        }).off('resizeme.zf.trigger').off('mutateme.zf.trigger');
        if (this.$anchor && this.$anchor.length) {
          this.$anchor.off('change.zf.sticky');
        }
        $(window).off(this.scrollListener);

        if (this.wasWrapped) {
          this.$element.unwrap();
        } else {
          this.$container.removeClass(this.options.containerClass).css({
            height: ''
          });
        }
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Sticky;
  }();

  Sticky.defaults = {
    /**
     * Customizable container template. Add your own classes for styling and sizing.
     * @option
     * @type {string}
     * @default '&lt;div data-sticky-container&gt;&lt;/div&gt;'
     */
    container: '<div data-sticky-container></div>',
    /**
     * Location in the view the element sticks to. Can be `'top'` or `'bottom'`.
     * @option
     * @type {string}
     * @default 'top'
     */
    stickTo: 'top',
    /**
     * If anchored to a single element, the id of that element.
     * @option
     * @type {string}
     * @default ''
     */
    anchor: '',
    /**
     * If using more than one element as anchor points, the id of the top anchor.
     * @option
     * @type {string}
     * @default ''
     */
    topAnchor: '',
    /**
     * If using more than one element as anchor points, the id of the bottom anchor.
     * @option
     * @type {string}
     * @default ''
     */
    btmAnchor: '',
    /**
     * Margin, in `em`'s to apply to the top of the element when it becomes sticky.
     * @option
     * @type {number}
     * @default 1
     */
    marginTop: 1,
    /**
     * Margin, in `em`'s to apply to the bottom of the element when it becomes sticky.
     * @option
     * @type {number}
     * @default 1
     */
    marginBottom: 1,
    /**
     * Breakpoint string that is the minimum screen size an element should become sticky.
     * @option
     * @type {string}
     * @default 'medium'
     */
    stickyOn: 'medium',
    /**
     * Class applied to sticky element, and removed on destruction. Foundation defaults to `sticky`.
     * @option
     * @type {string}
     * @default 'sticky'
     */
    stickyClass: 'sticky',
    /**
     * Class applied to sticky container. Foundation defaults to `sticky-container`.
     * @option
     * @type {string}
     * @default 'sticky-container'
     */
    containerClass: 'sticky-container',
    /**
     * Number of scroll events between the plugin's recalculating sticky points. Setting it to `0` will cause it to recalc every scroll event, setting it to `-1` will prevent recalc on scroll.
     * @option
     * @type {number}
     * @default -1
     */
    checkEvery: -1
  };

  /**
   * Helper function to calculate em values
   * @param Number {em} - number of em's to calculate into pixels
   */
  function emCalc(em) {
    return parseInt(window.getComputedStyle(document.body, null).fontSize, 10) * em;
  }

  // Window exports
  Foundation.plugin(Sticky, 'Sticky');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Tabs module.
   * @module foundation.tabs
   * @requires foundation.util.keyboard
   * @requires foundation.util.timerAndImageLoader if tabs contain images
   */

  var Tabs = function () {
    /**
     * Creates a new instance of tabs.
     * @class
     * @fires Tabs#init
     * @param {jQuery} element - jQuery object to make into tabs.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Tabs(element, options) {
      _classCallCheck(this, Tabs);

      this.$element = element;
      this.options = $.extend({}, Tabs.defaults, this.$element.data(), options);

      this._init();
      Foundation.registerPlugin(this, 'Tabs');
      Foundation.Keyboard.register('Tabs', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'previous',
        'ARROW_DOWN': 'next',
        'ARROW_LEFT': 'previous'
        // 'TAB': 'next',
        // 'SHIFT_TAB': 'previous'
      });
    }

    /**
     * Initializes the tabs by showing and focusing (if autoFocus=true) the preset active tab.
     * @private
     */


    _createClass(Tabs, [{
      key: '_init',
      value: function _init() {
        var _this2 = this;

        var _this = this;

        this.$element.attr({ 'role': 'tablist' });
        this.$tabTitles = this.$element.find('.' + this.options.linkClass);
        this.$tabContent = $('[data-tabs-content="' + this.$element[0].id + '"]');

        this.$tabTitles.each(function () {
          var $elem = $(this),
              $link = $elem.find('a'),
              isActive = $elem.hasClass('' + _this.options.linkActiveClass),
              hash = $link[0].hash.slice(1),
              linkId = $link[0].id ? $link[0].id : hash + '-label',
              $tabContent = $('#' + hash);

          $elem.attr({ 'role': 'presentation' });

          $link.attr({
            'role': 'tab',
            'aria-controls': hash,
            'aria-selected': isActive,
            'id': linkId
          });

          $tabContent.attr({
            'role': 'tabpanel',
            'aria-hidden': !isActive,
            'aria-labelledby': linkId
          });

          if (isActive && _this.options.autoFocus) {
            $(window).load(function () {
              $('html, body').animate({ scrollTop: $elem.offset().top }, _this.options.deepLinkSmudgeDelay, function () {
                $link.focus();
              });
            });
          }
        });
        if (this.options.matchHeight) {
          var $images = this.$tabContent.find('img');

          if ($images.length) {
            Foundation.onImagesLoaded($images, this._setHeight.bind(this));
          } else {
            this._setHeight();
          }
        }

        //current context-bound function to open tabs on page load or history popstate
        this._checkDeepLink = function () {
          var anchor = window.location.hash;
          //need a hash and a relevant anchor in this tabset
          if (anchor.length) {
            var $link = _this2.$element.find('[href$="' + anchor + '"]');
            if ($link.length) {
              _this2.selectTab($(anchor), true);

              //roll up a little to show the titles
              if (_this2.options.deepLinkSmudge) {
                var offset = _this2.$element.offset();
                $('html, body').animate({ scrollTop: offset.top }, _this2.options.deepLinkSmudgeDelay);
              }

              /**
                * Fires when the zplugin has deeplinked at pageload
                * @event Tabs#deeplink
                */
              _this2.$element.trigger('deeplink.zf.tabs', [$link, $(anchor)]);
            }
          }
        };

        //use browser to open a tab, if it exists in this tabset
        if (this.options.deepLink) {
          this._checkDeepLink();
        }

        this._events();
      }

      /**
       * Adds event handlers for items within the tabs.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this._addKeyHandler();
        this._addClickHandler();
        this._setHeightMqHandler = null;

        if (this.options.matchHeight) {
          this._setHeightMqHandler = this._setHeight.bind(this);

          $(window).on('changed.zf.mediaquery', this._setHeightMqHandler);
        }

        if (this.options.deepLink) {
          $(window).on('popstate', this._checkDeepLink);
        }
      }

      /**
       * Adds click handlers for items within the tabs.
       * @private
       */

    }, {
      key: '_addClickHandler',
      value: function _addClickHandler() {
        var _this = this;

        this.$element.off('click.zf.tabs').on('click.zf.tabs', '.' + this.options.linkClass, function (e) {
          e.preventDefault();
          e.stopPropagation();
          _this._handleTabChange($(this));
        });
      }

      /**
       * Adds keyboard event handlers for items within the tabs.
       * @private
       */

    }, {
      key: '_addKeyHandler',
      value: function _addKeyHandler() {
        var _this = this;

        this.$tabTitles.off('keydown.zf.tabs').on('keydown.zf.tabs', function (e) {
          if (e.which === 9) return;

          var $element = $(this),
              $elements = $element.parent('ul').children('li'),
              $prevElement,
              $nextElement;

          $elements.each(function (i) {
            if ($(this).is($element)) {
              if (_this.options.wrapOnKeys) {
                $prevElement = i === 0 ? $elements.last() : $elements.eq(i - 1);
                $nextElement = i === $elements.length - 1 ? $elements.first() : $elements.eq(i + 1);
              } else {
                $prevElement = $elements.eq(Math.max(0, i - 1));
                $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1));
              }
              return;
            }
          });

          // handle keyboard event with keyboard util
          Foundation.Keyboard.handleKey(e, 'Tabs', {
            open: function () {
              $element.find('[role="tab"]').focus();
              _this._handleTabChange($element);
            },
            previous: function () {
              $prevElement.find('[role="tab"]').focus();
              _this._handleTabChange($prevElement);
            },
            next: function () {
              $nextElement.find('[role="tab"]').focus();
              _this._handleTabChange($nextElement);
            },
            handled: function () {
              e.stopPropagation();
              e.preventDefault();
            }
          });
        });
      }

      /**
       * Opens the tab `$targetContent` defined by `$target`. Collapses active tab.
       * @param {jQuery} $target - Tab to open.
       * @param {boolean} historyHandled - browser has already handled a history update
       * @fires Tabs#change
       * @function
       */

    }, {
      key: '_handleTabChange',
      value: function _handleTabChange($target, historyHandled) {

        /**
         * Check for active class on target. Collapse if exists.
         */
        if ($target.hasClass('' + this.options.linkActiveClass)) {
          if (this.options.activeCollapse) {
            this._collapseTab($target);

            /**
             * Fires when the zplugin has successfully collapsed tabs.
             * @event Tabs#collapse
             */
            this.$element.trigger('collapse.zf.tabs', [$target]);
          }
          return;
        }

        var $oldTab = this.$element.find('.' + this.options.linkClass + '.' + this.options.linkActiveClass),
            $tabLink = $target.find('[role="tab"]'),
            hash = $tabLink[0].hash,
            $targetContent = this.$tabContent.find(hash);

        //close old tab
        this._collapseTab($oldTab);

        //open new tab
        this._openTab($target);

        //either replace or update browser history
        if (this.options.deepLink && !historyHandled) {
          var anchor = $target.find('a').attr('href');

          if (this.options.updateHistory) {
            history.pushState({}, '', anchor);
          } else {
            history.replaceState({}, '', anchor);
          }
        }

        /**
         * Fires when the plugin has successfully changed tabs.
         * @event Tabs#change
         */
        this.$element.trigger('change.zf.tabs', [$target, $targetContent]);

        //fire to children a mutation event
        $targetContent.find("[data-mutate]").trigger("mutateme.zf.trigger");
      }

      /**
       * Opens the tab `$targetContent` defined by `$target`.
       * @param {jQuery} $target - Tab to Open.
       * @function
       */

    }, {
      key: '_openTab',
      value: function _openTab($target) {
        var $tabLink = $target.find('[role="tab"]'),
            hash = $tabLink[0].hash,
            $targetContent = this.$tabContent.find(hash);

        $target.addClass('' + this.options.linkActiveClass);

        $tabLink.attr({ 'aria-selected': 'true' });

        $targetContent.addClass('' + this.options.panelActiveClass).attr({ 'aria-hidden': 'false' });
      }

      /**
       * Collapses `$targetContent` defined by `$target`.
       * @param {jQuery} $target - Tab to Open.
       * @function
       */

    }, {
      key: '_collapseTab',
      value: function _collapseTab($target) {
        var $target_anchor = $target.removeClass('' + this.options.linkActiveClass).find('[role="tab"]').attr({ 'aria-selected': 'false' });

        $('#' + $target_anchor.attr('aria-controls')).removeClass('' + this.options.panelActiveClass).attr({ 'aria-hidden': 'true' });
      }

      /**
       * Public method for selecting a content pane to display.
       * @param {jQuery | String} elem - jQuery object or string of the id of the pane to display.
       * @param {boolean} historyHandled - browser has already handled a history update
       * @function
       */

    }, {
      key: 'selectTab',
      value: function selectTab(elem, historyHandled) {
        var idStr;

        if (typeof elem === 'object') {
          idStr = elem[0].id;
        } else {
          idStr = elem;
        }

        if (idStr.indexOf('#') < 0) {
          idStr = '#' + idStr;
        }

        var $target = this.$tabTitles.find('[href$="' + idStr + '"]').parent('.' + this.options.linkClass);

        this._handleTabChange($target, historyHandled);
      }
    }, {
      key: '_setHeight',

      /**
       * Sets the height of each panel to the height of the tallest panel.
       * If enabled in options, gets called on media query change.
       * If loading content via external source, can be called directly or with _reflow.
       * If enabled with `data-match-height="true"`, tabs sets to equal height
       * @function
       * @private
       */
      value: function _setHeight() {
        var max = 0,
            _this = this; // Lock down the `this` value for the root tabs object

        this.$tabContent.find('.' + this.options.panelClass).css('height', '').each(function () {

          var panel = $(this),
              isActive = panel.hasClass('' + _this.options.panelActiveClass); // get the options from the parent instead of trying to get them from the child

          if (!isActive) {
            panel.css({ 'visibility': 'hidden', 'display': 'block' });
          }

          var temp = this.getBoundingClientRect().height;

          if (!isActive) {
            panel.css({
              'visibility': '',
              'display': ''
            });
          }

          max = temp > max ? temp : max;
        }).css('height', max + 'px');
      }

      /**
       * Destroys an instance of an tabs.
       * @fires Tabs#destroyed
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.find('.' + this.options.linkClass).off('.zf.tabs').hide().end().find('.' + this.options.panelClass).hide();

        if (this.options.matchHeight) {
          if (this._setHeightMqHandler != null) {
            $(window).off('changed.zf.mediaquery', this._setHeightMqHandler);
          }
        }

        if (this.options.deepLink) {
          $(window).off('popstate', this._checkDeepLink);
        }

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Tabs;
  }();

  Tabs.defaults = {
    /**
     * Allows the window to scroll to content of pane specified by hash anchor
     * @option
     * @type {boolean}
     * @default false
     */
    deepLink: false,

    /**
     * Adjust the deep link scroll to make sure the top of the tab panel is visible
     * @option
     * @type {boolean}
     * @default false
     */
    deepLinkSmudge: false,

    /**
     * Animation time (ms) for the deep link adjustment
     * @option
     * @type {number}
     * @default 300
     */
    deepLinkSmudgeDelay: 300,

    /**
     * Update the browser history with the open tab
     * @option
     * @type {boolean}
     * @default false
     */
    updateHistory: false,

    /**
     * Allows the window to scroll to content of active pane on load if set to true.
     * Not recommended if more than one tab panel per page.
     * @option
     * @type {boolean}
     * @default false
     */
    autoFocus: false,

    /**
     * Allows keyboard input to 'wrap' around the tab links.
     * @option
     * @type {boolean}
     * @default true
     */
    wrapOnKeys: true,

    /**
     * Allows the tab content panes to match heights if set to true.
     * @option
     * @type {boolean}
     * @default false
     */
    matchHeight: false,

    /**
     * Allows active tabs to collapse when clicked.
     * @option
     * @type {boolean}
     * @default false
     */
    activeCollapse: false,

    /**
     * Class applied to `li`'s in tab link list.
     * @option
     * @type {string}
     * @default 'tabs-title'
     */
    linkClass: 'tabs-title',

    /**
     * Class applied to the active `li` in tab link list.
     * @option
     * @type {string}
     * @default 'is-active'
     */
    linkActiveClass: 'is-active',

    /**
     * Class applied to the content containers.
     * @option
     * @type {string}
     * @default 'tabs-panel'
     */
    panelClass: 'tabs-panel',

    /**
     * Class applied to the active content container.
     * @option
     * @type {string}
     * @default 'is-active'
     */
    panelActiveClass: 'is-active'
  };

  // Window exports
  Foundation.plugin(Tabs, 'Tabs');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Toggler module.
   * @module foundation.toggler
   * @requires foundation.util.motion
   * @requires foundation.util.triggers
   */

  var Toggler = function () {
    /**
     * Creates a new instance of Toggler.
     * @class
     * @fires Toggler#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Toggler(element, options) {
      _classCallCheck(this, Toggler);

      this.$element = element;
      this.options = $.extend({}, Toggler.defaults, element.data(), options);
      this.className = '';

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'Toggler');
    }

    /**
     * Initializes the Toggler plugin by parsing the toggle class from data-toggler, or animation classes from data-animate.
     * @function
     * @private
     */


    _createClass(Toggler, [{
      key: '_init',
      value: function _init() {
        var input;
        // Parse animation classes if they were set
        if (this.options.animate) {
          input = this.options.animate.split(' ');

          this.animationIn = input[0];
          this.animationOut = input[1] || null;
        }
        // Otherwise, parse toggle class
        else {
            input = this.$element.data('toggler');
            // Allow for a . at the beginning of the string
            this.className = input[0] === '.' ? input.slice(1) : input;
          }

        // Add ARIA attributes to triggers
        var id = this.$element[0].id;
        $('[data-open="' + id + '"], [data-close="' + id + '"], [data-toggle="' + id + '"]').attr('aria-controls', id);
        // If the target is hidden, add aria-hidden
        this.$element.attr('aria-expanded', this.$element.is(':hidden') ? false : true);
      }

      /**
       * Initializes events for the toggle trigger.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this.$element.off('toggle.zf.trigger').on('toggle.zf.trigger', this.toggle.bind(this));
      }

      /**
       * Toggles the target class on the target element. An event is fired from the original trigger depending on if the resultant state was "on" or "off".
       * @function
       * @fires Toggler#on
       * @fires Toggler#off
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        this[this.options.animate ? '_toggleAnimate' : '_toggleClass']();
      }
    }, {
      key: '_toggleClass',
      value: function _toggleClass() {
        this.$element.toggleClass(this.className);

        var isOn = this.$element.hasClass(this.className);
        if (isOn) {
          /**
           * Fires if the target element has the class after a toggle.
           * @event Toggler#on
           */
          this.$element.trigger('on.zf.toggler');
        } else {
          /**
           * Fires if the target element does not have the class after a toggle.
           * @event Toggler#off
           */
          this.$element.trigger('off.zf.toggler');
        }

        this._updateARIA(isOn);
        this.$element.find('[data-mutate]').trigger('mutateme.zf.trigger');
      }
    }, {
      key: '_toggleAnimate',
      value: function _toggleAnimate() {
        var _this = this;

        if (this.$element.is(':hidden')) {
          Foundation.Motion.animateIn(this.$element, this.animationIn, function () {
            _this._updateARIA(true);
            this.trigger('on.zf.toggler');
            this.find('[data-mutate]').trigger('mutateme.zf.trigger');
          });
        } else {
          Foundation.Motion.animateOut(this.$element, this.animationOut, function () {
            _this._updateARIA(false);
            this.trigger('off.zf.toggler');
            this.find('[data-mutate]').trigger('mutateme.zf.trigger');
          });
        }
      }
    }, {
      key: '_updateARIA',
      value: function _updateARIA(isOn) {
        this.$element.attr('aria-expanded', isOn ? true : false);
      }

      /**
       * Destroys the instance of Toggler on the element.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.toggler');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Toggler;
  }();

  Toggler.defaults = {
    /**
     * Tells the plugin if the element should animated when toggled.
     * @option
     * @type {boolean}
     * @default false
     */
    animate: false
  };

  // Window exports
  Foundation.plugin(Toggler, 'Toggler');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Tooltip module.
   * @module foundation.tooltip
   * @requires foundation.util.box
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.triggers
   */

  var Tooltip = function () {
    /**
     * Creates a new instance of a Tooltip.
     * @class
     * @fires Tooltip#init
     * @param {jQuery} element - jQuery object to attach a tooltip to.
     * @param {Object} options - object to extend the default configuration.
     */
    function Tooltip(element, options) {
      _classCallCheck(this, Tooltip);

      this.$element = element;
      this.options = $.extend({}, Tooltip.defaults, this.$element.data(), options);

      this.isActive = false;
      this.isClick = false;
      this._init();

      Foundation.registerPlugin(this, 'Tooltip');
    }

    /**
     * Initializes the tooltip by setting the creating the tip element, adding it's text, setting private variables and setting attributes on the anchor.
     * @private
     */


    _createClass(Tooltip, [{
      key: '_init',
      value: function _init() {
        var elemId = this.$element.attr('aria-describedby') || Foundation.GetYoDigits(6, 'tooltip');

        this.options.positionClass = this.options.positionClass || this._getPositionClass(this.$element);
        this.options.tipText = this.options.tipText || this.$element.attr('title');
        this.template = this.options.template ? $(this.options.template) : this._buildTemplate(elemId);

        if (this.options.allowHtml) {
          this.template.appendTo(document.body).html(this.options.tipText).hide();
        } else {
          this.template.appendTo(document.body).text(this.options.tipText).hide();
        }

        this.$element.attr({
          'title': '',
          'aria-describedby': elemId,
          'data-yeti-box': elemId,
          'data-toggle': elemId,
          'data-resize': elemId
        }).addClass(this.options.triggerClass);

        //helper variables to track movement on collisions
        this.usedPositions = [];
        this.counter = 4;
        this.classChanged = false;

        this._events();
      }

      /**
       * Grabs the current positioning class, if present, and returns the value or an empty string.
       * @private
       */

    }, {
      key: '_getPositionClass',
      value: function _getPositionClass(element) {
        if (!element) {
          return '';
        }
        // var position = element.attr('class').match(/top|left|right/g);
        var position = element[0].className.match(/\b(top|left|right)\b/g);
        position = position ? position[0] : '';
        return position;
      }
    }, {
      key: '_buildTemplate',

      /**
       * builds the tooltip element, adds attributes, and returns the template.
       * @private
       */
      value: function _buildTemplate(id) {
        var templateClasses = (this.options.tooltipClass + ' ' + this.options.positionClass + ' ' + this.options.templateClasses).trim();
        var $template = $('<div></div>').addClass(templateClasses).attr({
          'role': 'tooltip',
          'aria-hidden': true,
          'data-is-active': false,
          'data-is-focus': false,
          'id': id
        });
        return $template;
      }

      /**
       * Function that gets called if a collision event is detected.
       * @param {String} position - positioning class to try
       * @private
       */

    }, {
      key: '_reposition',
      value: function _reposition(position) {
        this.usedPositions.push(position ? position : 'bottom');

        //default, try switching to opposite side
        if (!position && this.usedPositions.indexOf('top') < 0) {
          this.template.addClass('top');
        } else if (position === 'top' && this.usedPositions.indexOf('bottom') < 0) {
          this.template.removeClass(position);
        } else if (position === 'left' && this.usedPositions.indexOf('right') < 0) {
          this.template.removeClass(position).addClass('right');
        } else if (position === 'right' && this.usedPositions.indexOf('left') < 0) {
          this.template.removeClass(position).addClass('left');
        }

        //if default change didn't work, try bottom or left first
        else if (!position && this.usedPositions.indexOf('top') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.template.addClass('left');
          } else if (position === 'top' && this.usedPositions.indexOf('bottom') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.template.removeClass(position).addClass('left');
          } else if (position === 'left' && this.usedPositions.indexOf('right') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.template.removeClass(position);
          } else if (position === 'right' && this.usedPositions.indexOf('left') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.template.removeClass(position);
          }
          //if nothing cleared, set to bottom
          else {
              this.template.removeClass(position);
            }
        this.classChanged = true;
        this.counter--;
      }

      /**
       * sets the position class of an element and recursively calls itself until there are no more possible positions to attempt, or the tooltip element is no longer colliding.
       * if the tooltip is larger than the screen width, default to full width - any user selected margin
       * @private
       */

    }, {
      key: '_setPosition',
      value: function _setPosition() {
        var position = this._getPositionClass(this.template),
            $tipDims = Foundation.Box.GetDimensions(this.template),
            $anchorDims = Foundation.Box.GetDimensions(this.$element),
            direction = position === 'left' ? 'left' : position === 'right' ? 'left' : 'top',
            param = direction === 'top' ? 'height' : 'width',
            offset = param === 'height' ? this.options.vOffset : this.options.hOffset,
            _this = this;

        if ($tipDims.width >= $tipDims.windowDims.width || !this.counter && !Foundation.Box.ImNotTouchingYou(this.template)) {
          this.template.offset(Foundation.Box.GetOffsets(this.template, this.$element, 'center bottom', this.options.vOffset, this.options.hOffset, true)).css({
            // this.$element.offset(Foundation.GetOffsets(this.template, this.$element, 'center bottom', this.options.vOffset, this.options.hOffset, true)).css({
            'width': $anchorDims.windowDims.width - this.options.hOffset * 2,
            'height': 'auto'
          });
          return false;
        }

        this.template.offset(Foundation.Box.GetOffsets(this.template, this.$element, 'center ' + (position || 'bottom'), this.options.vOffset, this.options.hOffset));

        while (!Foundation.Box.ImNotTouchingYou(this.template) && this.counter) {
          this._reposition(position);
          this._setPosition();
        }
      }

      /**
       * reveals the tooltip, and fires an event to close any other open tooltips on the page
       * @fires Tooltip#closeme
       * @fires Tooltip#show
       * @function
       */

    }, {
      key: 'show',
      value: function show() {
        if (this.options.showOn !== 'all' && !Foundation.MediaQuery.is(this.options.showOn)) {
          // console.error('The screen is too small to display this tooltip');
          return false;
        }

        var _this = this;
        this.template.css('visibility', 'hidden').show();
        this._setPosition();

        /**
         * Fires to close all other open tooltips on the page
         * @event Closeme#tooltip
         */
        this.$element.trigger('closeme.zf.tooltip', this.template.attr('id'));

        this.template.attr({
          'data-is-active': true,
          'aria-hidden': false
        });
        _this.isActive = true;
        // console.log(this.template);
        this.template.stop().hide().css('visibility', '').fadeIn(this.options.fadeInDuration, function () {
          //maybe do stuff?
        });
        /**
         * Fires when the tooltip is shown
         * @event Tooltip#show
         */
        this.$element.trigger('show.zf.tooltip');
      }

      /**
       * Hides the current tooltip, and resets the positioning class if it was changed due to collision
       * @fires Tooltip#hide
       * @function
       */

    }, {
      key: 'hide',
      value: function hide() {
        // console.log('hiding', this.$element.data('yeti-box'));
        var _this = this;
        this.template.stop().attr({
          'aria-hidden': true,
          'data-is-active': false
        }).fadeOut(this.options.fadeOutDuration, function () {
          _this.isActive = false;
          _this.isClick = false;
          if (_this.classChanged) {
            _this.template.removeClass(_this._getPositionClass(_this.template)).addClass(_this.options.positionClass);

            _this.usedPositions = [];
            _this.counter = 4;
            _this.classChanged = false;
          }
        });
        /**
         * fires when the tooltip is hidden
         * @event Tooltip#hide
         */
        this.$element.trigger('hide.zf.tooltip');
      }

      /**
       * adds event listeners for the tooltip and its anchor
       * TODO combine some of the listeners like focus and mouseenter, etc.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;
        var $template = this.template;
        var isFocus = false;

        if (!this.options.disableHover) {

          this.$element.on('mouseenter.zf.tooltip', function (e) {
            if (!_this.isActive) {
              _this.timeout = setTimeout(function () {
                _this.show();
              }, _this.options.hoverDelay);
            }
          }).on('mouseleave.zf.tooltip', function (e) {
            clearTimeout(_this.timeout);
            if (!isFocus || _this.isClick && !_this.options.clickOpen) {
              _this.hide();
            }
          });
        }

        if (this.options.clickOpen) {
          this.$element.on('mousedown.zf.tooltip', function (e) {
            e.stopImmediatePropagation();
            if (_this.isClick) {
              //_this.hide();
              // _this.isClick = false;
            } else {
              _this.isClick = true;
              if ((_this.options.disableHover || !_this.$element.attr('tabindex')) && !_this.isActive) {
                _this.show();
              }
            }
          });
        } else {
          this.$element.on('mousedown.zf.tooltip', function (e) {
            e.stopImmediatePropagation();
            _this.isClick = true;
          });
        }

        if (!this.options.disableForTouch) {
          this.$element.on('tap.zf.tooltip touchend.zf.tooltip', function (e) {
            _this.isActive ? _this.hide() : _this.show();
          });
        }

        this.$element.on({
          // 'toggle.zf.trigger': this.toggle.bind(this),
          // 'close.zf.trigger': this.hide.bind(this)
          'close.zf.trigger': this.hide.bind(this)
        });

        this.$element.on('focus.zf.tooltip', function (e) {
          isFocus = true;
          if (_this.isClick) {
            // If we're not showing open on clicks, we need to pretend a click-launched focus isn't
            // a real focus, otherwise on hover and come back we get bad behavior
            if (!_this.options.clickOpen) {
              isFocus = false;
            }
            return false;
          } else {
            _this.show();
          }
        }).on('focusout.zf.tooltip', function (e) {
          isFocus = false;
          _this.isClick = false;
          _this.hide();
        }).on('resizeme.zf.trigger', function () {
          if (_this.isActive) {
            _this._setPosition();
          }
        });
      }

      /**
       * adds a toggle method, in addition to the static show() & hide() functions
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        if (this.isActive) {
          this.hide();
        } else {
          this.show();
        }
      }

      /**
       * Destroys an instance of tooltip, removes template element from the view.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.attr('title', this.template.text()).off('.zf.trigger .zf.tooltip').removeClass('has-tip top right left').removeAttr('aria-describedby aria-haspopup data-disable-hover data-resize data-toggle data-tooltip data-yeti-box');

        this.template.remove();

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Tooltip;
  }();

  Tooltip.defaults = {
    disableForTouch: false,
    /**
     * Time, in ms, before a tooltip should open on hover.
     * @option
     * @type {number}
     * @default 200
     */
    hoverDelay: 200,
    /**
     * Time, in ms, a tooltip should take to fade into view.
     * @option
     * @type {number}
     * @default 150
     */
    fadeInDuration: 150,
    /**
     * Time, in ms, a tooltip should take to fade out of view.
     * @option
     * @type {number}
     * @default 150
     */
    fadeOutDuration: 150,
    /**
     * Disables hover events from opening the tooltip if set to true
     * @option
     * @type {boolean}
     * @default false
     */
    disableHover: false,
    /**
     * Optional addtional classes to apply to the tooltip template on init.
     * @option
     * @type {string}
     * @default ''
     */
    templateClasses: '',
    /**
     * Non-optional class added to tooltip templates. Foundation default is 'tooltip'.
     * @option
     * @type {string}
     * @default 'tooltip'
     */
    tooltipClass: 'tooltip',
    /**
     * Class applied to the tooltip anchor element.
     * @option
     * @type {string}
     * @default 'has-tip'
     */
    triggerClass: 'has-tip',
    /**
     * Minimum breakpoint size at which to open the tooltip.
     * @option
     * @type {string}
     * @default 'small'
     */
    showOn: 'small',
    /**
     * Custom template to be used to generate markup for tooltip.
     * @option
     * @type {string}
     * @default ''
     */
    template: '',
    /**
     * Text displayed in the tooltip template on open.
     * @option
     * @type {string}
     * @default ''
     */
    tipText: '',
    touchCloseText: 'Tap to close.',
    /**
     * Allows the tooltip to remain open if triggered with a click or touch event.
     * @option
     * @type {boolean}
     * @default true
     */
    clickOpen: true,
    /**
     * Additional positioning classes, set by the JS
     * @option
     * @type {string}
     * @default ''
     */
    positionClass: '',
    /**
     * Distance, in pixels, the template should push away from the anchor on the Y axis.
     * @option
     * @type {number}
     * @default 10
     */
    vOffset: 10,
    /**
     * Distance, in pixels, the template should push away from the anchor on the X axis, if aligned to a side.
     * @option
     * @type {number}
     * @default 12
     */
    hOffset: 12,
    /**
    * Allow HTML in tooltip. Warning: If you are loading user-generated content into tooltips,
    * allowing HTML may open yourself up to XSS attacks.
    * @option
    * @type {boolean}
    * @default false
    */
    allowHtml: false
  };

  /**
   * TODO utilize resize event trigger
   */

  // Window exports
  Foundation.plugin(Tooltip, 'Tooltip');
}(jQuery);
;'use strict';

// Polyfill for requestAnimationFrame

(function () {
  if (!Date.now) Date.now = function () {
    return new Date().getTime();
  };

  var vendors = ['webkit', 'moz'];
  for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
    var vp = vendors[i];
    window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
  }
  if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
    var lastTime = 0;
    window.requestAnimationFrame = function (callback) {
      var now = Date.now();
      var nextTime = Math.max(lastTime + 16, now);
      return setTimeout(function () {
        callback(lastTime = nextTime);
      }, nextTime - now);
    };
    window.cancelAnimationFrame = clearTimeout;
  }
})();

var initClasses = ['mui-enter', 'mui-leave'];
var activeClasses = ['mui-enter-active', 'mui-leave-active'];

// Find the right "transitionend" event for this browser
var endEvent = function () {
  var transitions = {
    'transition': 'transitionend',
    'WebkitTransition': 'webkitTransitionEnd',
    'MozTransition': 'transitionend',
    'OTransition': 'otransitionend'
  };
  var elem = window.document.createElement('div');

  for (var t in transitions) {
    if (typeof elem.style[t] !== 'undefined') {
      return transitions[t];
    }
  }

  return null;
}();

function animate(isIn, element, animation, cb) {
  element = $(element).eq(0);

  if (!element.length) return;

  if (endEvent === null) {
    isIn ? element.show() : element.hide();
    cb();
    return;
  }

  var initClass = isIn ? initClasses[0] : initClasses[1];
  var activeClass = isIn ? activeClasses[0] : activeClasses[1];

  // Set up the animation
  reset();
  element.addClass(animation);
  element.css('transition', 'none');
  requestAnimationFrame(function () {
    element.addClass(initClass);
    if (isIn) element.show();
  });

  // Start the animation
  requestAnimationFrame(function () {
    element[0].offsetWidth;
    element.css('transition', '');
    element.addClass(activeClass);
  });

  // Clean up the animation when it finishes
  element.one('transitionend', finish);

  // Hides the element (for out animations), resets the element, and runs a callback
  function finish() {
    if (!isIn) element.hide();
    reset();
    if (cb) cb.apply(element);
  }

  // Resets transitions and removes motion-specific classes
  function reset() {
    element[0].style.transitionDuration = 0;
    element.removeClass(initClass + ' ' + activeClass + ' ' + animation);
  }
}

var MotionUI = {
  animateIn: function (element, animation, cb) {
    animate(true, element, animation, cb);
  },

  animateOut: function (element, animation, cb) {
    animate(false, element, animation, cb);
  }
};
;"use strict";

jQuery(document).foundation();
;'use strict';

// Joyride demo
$('#start-jr').on('click', function () {
  $(document).foundation('joyride', 'start');
});
;"use strict";
;'use strict';

$(document).ready(function () {
    var videos = $('iframe[src*="vimeo.com"], iframe[src*="youtube.com"]');

    videos.each(function () {
        var el = $(this);
        el.wrap('<div class="responsive-embed widescreen"/>');
    });
});
;'use strict';

$(window).bind(' load resize orientationChange ', function () {
  var footer = $("#footer-container");
  var pos = footer.position();
  var height = $(window).height();
  height = height - pos.top;
  height = height - footer.height() - 1;

  function stickyFooter() {
    footer.css({
      'margin-top': height + 'px'
    });
  }

  if (height > 0) {
    stickyFooter();
  }
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvdW5kYXRpb24uY29yZS5qcyIsImZvdW5kYXRpb24udXRpbC5ib3guanMiLCJmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmQuanMiLCJmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeS5qcyIsImZvdW5kYXRpb24udXRpbC5tb3Rpb24uanMiLCJmb3VuZGF0aW9uLnV0aWwubmVzdC5qcyIsImZvdW5kYXRpb24udXRpbC50aW1lckFuZEltYWdlTG9hZGVyLmpzIiwiZm91bmRhdGlvbi51dGlsLnRvdWNoLmpzIiwiZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzLmpzIiwiZm91bmRhdGlvbi5hYmlkZS5qcyIsImZvdW5kYXRpb24uYWNjb3JkaW9uLmpzIiwiZm91bmRhdGlvbi5hY2NvcmRpb25NZW51LmpzIiwiZm91bmRhdGlvbi5kcmlsbGRvd24uanMiLCJmb3VuZGF0aW9uLmRyb3Bkb3duLmpzIiwiZm91bmRhdGlvbi5kcm9wZG93bk1lbnUuanMiLCJmb3VuZGF0aW9uLmVxdWFsaXplci5qcyIsImZvdW5kYXRpb24uaW50ZXJjaGFuZ2UuanMiLCJmb3VuZGF0aW9uLm1hZ2VsbGFuLmpzIiwiZm91bmRhdGlvbi5vZmZjYW52YXMuanMiLCJmb3VuZGF0aW9uLm9yYml0LmpzIiwiZm91bmRhdGlvbi5yZXNwb25zaXZlTWVudS5qcyIsImZvdW5kYXRpb24ucmVzcG9uc2l2ZVRvZ2dsZS5qcyIsImZvdW5kYXRpb24ucmV2ZWFsLmpzIiwiZm91bmRhdGlvbi5zbGlkZXIuanMiLCJmb3VuZGF0aW9uLnN0aWNreS5qcyIsImZvdW5kYXRpb24udGFicy5qcyIsImZvdW5kYXRpb24udG9nZ2xlci5qcyIsImZvdW5kYXRpb24udG9vbHRpcC5qcyIsIm1vdGlvbi11aS5qcyIsImluaXQtZm91bmRhdGlvbi5qcyIsImpveXJpZGUtZGVtby5qcyIsIm9mZkNhbnZhcy5qcyIsInJlc3BvbnNpdmUtdmlkZW8uanMiLCJzdGlja3lmb290ZXIuanMiXSwibmFtZXMiOlsiJCIsIkZPVU5EQVRJT05fVkVSU0lPTiIsIkZvdW5kYXRpb24iLCJ2ZXJzaW9uIiwiX3BsdWdpbnMiLCJfdXVpZHMiLCJydGwiLCJhdHRyIiwicGx1Z2luIiwibmFtZSIsImNsYXNzTmFtZSIsImZ1bmN0aW9uTmFtZSIsImF0dHJOYW1lIiwiaHlwaGVuYXRlIiwicmVnaXN0ZXJQbHVnaW4iLCJwbHVnaW5OYW1lIiwiY29uc3RydWN0b3IiLCJ0b0xvd2VyQ2FzZSIsInV1aWQiLCJHZXRZb0RpZ2l0cyIsIiRlbGVtZW50IiwiZGF0YSIsInRyaWdnZXIiLCJwdXNoIiwidW5yZWdpc3RlclBsdWdpbiIsInNwbGljZSIsImluZGV4T2YiLCJyZW1vdmVBdHRyIiwicmVtb3ZlRGF0YSIsInByb3AiLCJyZUluaXQiLCJwbHVnaW5zIiwiaXNKUSIsImVhY2giLCJfaW5pdCIsInR5cGUiLCJfdGhpcyIsImZucyIsInBsZ3MiLCJmb3JFYWNoIiwicCIsImZvdW5kYXRpb24iLCJPYmplY3QiLCJrZXlzIiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwibGVuZ3RoIiwibmFtZXNwYWNlIiwiTWF0aCIsInJvdW5kIiwicG93IiwicmFuZG9tIiwidG9TdHJpbmciLCJzbGljZSIsInJlZmxvdyIsImVsZW0iLCJpIiwiJGVsZW0iLCJmaW5kIiwiYWRkQmFjayIsIiRlbCIsIm9wdHMiLCJ3YXJuIiwidGhpbmciLCJzcGxpdCIsImUiLCJvcHQiLCJtYXAiLCJlbCIsInRyaW0iLCJwYXJzZVZhbHVlIiwiZXIiLCJnZXRGbk5hbWUiLCJ0cmFuc2l0aW9uZW5kIiwidHJhbnNpdGlvbnMiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJlbmQiLCJ0Iiwic3R5bGUiLCJzZXRUaW1lb3V0IiwidHJpZ2dlckhhbmRsZXIiLCJ1dGlsIiwidGhyb3R0bGUiLCJmdW5jIiwiZGVsYXkiLCJ0aW1lciIsImNvbnRleHQiLCJhcmdzIiwiYXJndW1lbnRzIiwiYXBwbHkiLCJtZXRob2QiLCIkbWV0YSIsIiRub0pTIiwiYXBwZW5kVG8iLCJoZWFkIiwicmVtb3ZlQ2xhc3MiLCJNZWRpYVF1ZXJ5IiwiQXJyYXkiLCJwcm90b3R5cGUiLCJjYWxsIiwicGx1Z0NsYXNzIiwidW5kZWZpbmVkIiwiUmVmZXJlbmNlRXJyb3IiLCJUeXBlRXJyb3IiLCJ3aW5kb3ciLCJmbiIsIkRhdGUiLCJub3ciLCJnZXRUaW1lIiwidmVuZG9ycyIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsInZwIiwiY2FuY2VsQW5pbWF0aW9uRnJhbWUiLCJ0ZXN0IiwibmF2aWdhdG9yIiwidXNlckFnZW50IiwibGFzdFRpbWUiLCJjYWxsYmFjayIsIm5leHRUaW1lIiwibWF4IiwiY2xlYXJUaW1lb3V0IiwicGVyZm9ybWFuY2UiLCJzdGFydCIsIkZ1bmN0aW9uIiwiYmluZCIsIm9UaGlzIiwiYUFyZ3MiLCJmVG9CaW5kIiwiZk5PUCIsImZCb3VuZCIsImNvbmNhdCIsImZ1bmNOYW1lUmVnZXgiLCJyZXN1bHRzIiwiZXhlYyIsInN0ciIsImlzTmFOIiwicGFyc2VGbG9hdCIsInJlcGxhY2UiLCJqUXVlcnkiLCJCb3giLCJJbU5vdFRvdWNoaW5nWW91IiwiR2V0RGltZW5zaW9ucyIsIkdldE9mZnNldHMiLCJlbGVtZW50IiwicGFyZW50IiwibHJPbmx5IiwidGJPbmx5IiwiZWxlRGltcyIsInRvcCIsImJvdHRvbSIsImxlZnQiLCJyaWdodCIsInBhckRpbXMiLCJvZmZzZXQiLCJoZWlnaHQiLCJ3aWR0aCIsIndpbmRvd0RpbXMiLCJhbGxEaXJzIiwiRXJyb3IiLCJyZWN0IiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0IiwicGFyUmVjdCIsInBhcmVudE5vZGUiLCJ3aW5SZWN0IiwiYm9keSIsIndpblkiLCJwYWdlWU9mZnNldCIsIndpblgiLCJwYWdlWE9mZnNldCIsInBhcmVudERpbXMiLCJhbmNob3IiLCJwb3NpdGlvbiIsInZPZmZzZXQiLCJoT2Zmc2V0IiwiaXNPdmVyZmxvdyIsIiRlbGVEaW1zIiwiJGFuY2hvckRpbXMiLCJrZXlDb2RlcyIsImNvbW1hbmRzIiwiS2V5Ym9hcmQiLCJnZXRLZXlDb2RlcyIsInBhcnNlS2V5IiwiZXZlbnQiLCJrZXkiLCJ3aGljaCIsImtleUNvZGUiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJ0b1VwcGVyQ2FzZSIsInNoaWZ0S2V5IiwiY3RybEtleSIsImFsdEtleSIsImhhbmRsZUtleSIsImNvbXBvbmVudCIsImZ1bmN0aW9ucyIsImNvbW1hbmRMaXN0IiwiY21kcyIsImNvbW1hbmQiLCJsdHIiLCJleHRlbmQiLCJyZXR1cm5WYWx1ZSIsImhhbmRsZWQiLCJ1bmhhbmRsZWQiLCJmaW5kRm9jdXNhYmxlIiwiZmlsdGVyIiwiaXMiLCJyZWdpc3RlciIsImNvbXBvbmVudE5hbWUiLCJ0cmFwRm9jdXMiLCIkZm9jdXNhYmxlIiwiJGZpcnN0Rm9jdXNhYmxlIiwiZXEiLCIkbGFzdEZvY3VzYWJsZSIsIm9uIiwidGFyZ2V0IiwicHJldmVudERlZmF1bHQiLCJmb2N1cyIsInJlbGVhc2VGb2N1cyIsIm9mZiIsImtjcyIsImsiLCJrYyIsImRlZmF1bHRRdWVyaWVzIiwibGFuZHNjYXBlIiwicG9ydHJhaXQiLCJyZXRpbmEiLCJxdWVyaWVzIiwiY3VycmVudCIsInNlbGYiLCJleHRyYWN0ZWRTdHlsZXMiLCJjc3MiLCJuYW1lZFF1ZXJpZXMiLCJwYXJzZVN0eWxlVG9PYmplY3QiLCJoYXNPd25Qcm9wZXJ0eSIsInZhbHVlIiwiX2dldEN1cnJlbnRTaXplIiwiX3dhdGNoZXIiLCJhdExlYXN0Iiwic2l6ZSIsInF1ZXJ5IiwiZ2V0IiwibWF0Y2hNZWRpYSIsIm1hdGNoZXMiLCJtYXRjaGVkIiwibmV3U2l6ZSIsImN1cnJlbnRTaXplIiwic3R5bGVNZWRpYSIsIm1lZGlhIiwic2NyaXB0IiwiZ2V0RWxlbWVudHNCeVRhZ05hbWUiLCJpbmZvIiwiaWQiLCJpbnNlcnRCZWZvcmUiLCJnZXRDb21wdXRlZFN0eWxlIiwiY3VycmVudFN0eWxlIiwibWF0Y2hNZWRpdW0iLCJ0ZXh0Iiwic3R5bGVTaGVldCIsImNzc1RleHQiLCJ0ZXh0Q29udGVudCIsInN0eWxlT2JqZWN0IiwicmVkdWNlIiwicmV0IiwicGFyYW0iLCJwYXJ0cyIsInZhbCIsImRlY29kZVVSSUNvbXBvbmVudCIsImlzQXJyYXkiLCJpbml0Q2xhc3NlcyIsImFjdGl2ZUNsYXNzZXMiLCJNb3Rpb24iLCJhbmltYXRlSW4iLCJhbmltYXRpb24iLCJjYiIsImFuaW1hdGUiLCJhbmltYXRlT3V0IiwiTW92ZSIsImR1cmF0aW9uIiwiYW5pbSIsInByb2ciLCJtb3ZlIiwidHMiLCJpc0luIiwiaW5pdENsYXNzIiwiYWN0aXZlQ2xhc3MiLCJyZXNldCIsImFkZENsYXNzIiwic2hvdyIsIm9mZnNldFdpZHRoIiwib25lIiwiZmluaXNoIiwiaGlkZSIsInRyYW5zaXRpb25EdXJhdGlvbiIsIk5lc3QiLCJGZWF0aGVyIiwibWVudSIsIml0ZW1zIiwic3ViTWVudUNsYXNzIiwic3ViSXRlbUNsYXNzIiwiaGFzU3ViQ2xhc3MiLCIkaXRlbSIsIiRzdWIiLCJjaGlsZHJlbiIsIkJ1cm4iLCJUaW1lciIsIm9wdGlvbnMiLCJuYW1lU3BhY2UiLCJyZW1haW4iLCJpc1BhdXNlZCIsInJlc3RhcnQiLCJpbmZpbml0ZSIsInBhdXNlIiwib25JbWFnZXNMb2FkZWQiLCJpbWFnZXMiLCJ1bmxvYWRlZCIsImNvbXBsZXRlIiwicmVhZHlTdGF0ZSIsInNpbmdsZUltYWdlTG9hZGVkIiwic3JjIiwic3BvdFN3aXBlIiwiZW5hYmxlZCIsImRvY3VtZW50RWxlbWVudCIsIm1vdmVUaHJlc2hvbGQiLCJ0aW1lVGhyZXNob2xkIiwic3RhcnRQb3NYIiwic3RhcnRQb3NZIiwic3RhcnRUaW1lIiwiZWxhcHNlZFRpbWUiLCJpc01vdmluZyIsIm9uVG91Y2hFbmQiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwib25Ub3VjaE1vdmUiLCJ4IiwidG91Y2hlcyIsInBhZ2VYIiwieSIsInBhZ2VZIiwiZHgiLCJkeSIsImRpciIsImFicyIsIm9uVG91Y2hTdGFydCIsImFkZEV2ZW50TGlzdGVuZXIiLCJpbml0IiwidGVhcmRvd24iLCJzcGVjaWFsIiwic3dpcGUiLCJzZXR1cCIsIm5vb3AiLCJhZGRUb3VjaCIsImhhbmRsZVRvdWNoIiwiY2hhbmdlZFRvdWNoZXMiLCJmaXJzdCIsImV2ZW50VHlwZXMiLCJ0b3VjaHN0YXJ0IiwidG91Y2htb3ZlIiwidG91Y2hlbmQiLCJzaW11bGF0ZWRFdmVudCIsIk1vdXNlRXZlbnQiLCJzY3JlZW5YIiwic2NyZWVuWSIsImNsaWVudFgiLCJjbGllbnRZIiwiY3JlYXRlRXZlbnQiLCJpbml0TW91c2VFdmVudCIsImRpc3BhdGNoRXZlbnQiLCJNdXRhdGlvbk9ic2VydmVyIiwicHJlZml4ZXMiLCJ0cmlnZ2VycyIsInN0b3BQcm9wYWdhdGlvbiIsImZhZGVPdXQiLCJjaGVja0xpc3RlbmVycyIsImV2ZW50c0xpc3RlbmVyIiwicmVzaXplTGlzdGVuZXIiLCJzY3JvbGxMaXN0ZW5lciIsImNsb3NlbWVMaXN0ZW5lciIsInlldGlCb3hlcyIsInBsdWdOYW1lcyIsImxpc3RlbmVycyIsImpvaW4iLCJwbHVnaW5JZCIsIm5vdCIsImRlYm91bmNlIiwiJG5vZGVzIiwibm9kZXMiLCJxdWVyeVNlbGVjdG9yQWxsIiwibGlzdGVuaW5nRWxlbWVudHNNdXRhdGlvbiIsIm11dGF0aW9uUmVjb3Jkc0xpc3QiLCIkdGFyZ2V0IiwiYXR0cmlidXRlTmFtZSIsImNsb3Nlc3QiLCJlbGVtZW50T2JzZXJ2ZXIiLCJvYnNlcnZlIiwiYXR0cmlidXRlcyIsImNoaWxkTGlzdCIsImNoYXJhY3RlckRhdGEiLCJzdWJ0cmVlIiwiYXR0cmlidXRlRmlsdGVyIiwiSUhlYXJZb3UiLCJBYmlkZSIsImRlZmF1bHRzIiwiJGlucHV0cyIsIl9ldmVudHMiLCJyZXNldEZvcm0iLCJ2YWxpZGF0ZUZvcm0iLCJ2YWxpZGF0ZU9uIiwidmFsaWRhdGVJbnB1dCIsImxpdmVWYWxpZGF0ZSIsInZhbGlkYXRlT25CbHVyIiwiaXNHb29kIiwiY2hlY2tlZCIsIiRlcnJvciIsInNpYmxpbmdzIiwiZm9ybUVycm9yU2VsZWN0b3IiLCJhZGQiLCIkbGFiZWwiLCIkZWxzIiwibGFiZWxzIiwiZmluZExhYmVsIiwiJGZvcm1FcnJvciIsImZpbmRGb3JtRXJyb3IiLCJsYWJlbEVycm9yQ2xhc3MiLCJmb3JtRXJyb3JDbGFzcyIsImlucHV0RXJyb3JDbGFzcyIsImdyb3VwTmFtZSIsIiRsYWJlbHMiLCJmaW5kUmFkaW9MYWJlbHMiLCIkZm9ybUVycm9ycyIsInJlbW92ZVJhZGlvRXJyb3JDbGFzc2VzIiwiY2xlYXJSZXF1aXJlIiwicmVxdWlyZWRDaGVjayIsInZhbGlkYXRlZCIsImN1c3RvbVZhbGlkYXRvciIsInZhbGlkYXRvciIsImVxdWFsVG8iLCJ2YWxpZGF0ZVJhZGlvIiwidmFsaWRhdGVUZXh0IiwibWF0Y2hWYWxpZGF0aW9uIiwidmFsaWRhdG9ycyIsImdvb2RUb0dvIiwibWVzc2FnZSIsImRlcGVuZGVudEVsZW1lbnRzIiwiYWNjIiwibm9FcnJvciIsInBhdHRlcm4iLCJpbnB1dFRleHQiLCJ2YWxpZCIsInBhdHRlcm5zIiwiUmVnRXhwIiwiJGdyb3VwIiwicmVxdWlyZWQiLCJjbGVhciIsInYiLCIkZm9ybSIsInJlbW92ZUVycm9yQ2xhc3NlcyIsImFscGhhIiwiYWxwaGFfbnVtZXJpYyIsImludGVnZXIiLCJudW1iZXIiLCJjYXJkIiwiY3Z2IiwiZW1haWwiLCJ1cmwiLCJkb21haW4iLCJkYXRldGltZSIsImRhdGUiLCJ0aW1lIiwiZGF0ZUlTTyIsIm1vbnRoX2RheV95ZWFyIiwiZGF5X21vbnRoX3llYXIiLCJjb2xvciIsIkFjY29yZGlvbiIsIiR0YWJzIiwiaWR4IiwiJGNvbnRlbnQiLCJsaW5rSWQiLCIkaW5pdEFjdGl2ZSIsImZpcnN0VGltZUluaXQiLCJkb3duIiwiX2NoZWNrRGVlcExpbmsiLCJsb2NhdGlvbiIsImhhc2giLCIkbGluayIsIiRhbmNob3IiLCJoYXNDbGFzcyIsImRlZXBMaW5rU211ZGdlIiwibG9hZCIsInNjcm9sbFRvcCIsImRlZXBMaW5rU211ZGdlRGVsYXkiLCJkZWVwTGluayIsIiR0YWJDb250ZW50IiwidG9nZ2xlIiwibmV4dCIsIiRhIiwibXVsdGlFeHBhbmQiLCJwcmV2aW91cyIsInByZXYiLCJ1cCIsInVwZGF0ZUhpc3RvcnkiLCJoaXN0b3J5IiwicHVzaFN0YXRlIiwicmVwbGFjZVN0YXRlIiwiZmlyc3RUaW1lIiwiJGN1cnJlbnRBY3RpdmUiLCJzbGlkZURvd24iLCJzbGlkZVNwZWVkIiwiJGF1bnRzIiwiYWxsb3dBbGxDbG9zZWQiLCJzbGlkZVVwIiwic3RvcCIsIkFjY29yZGlvbk1lbnUiLCJtdWx0aU9wZW4iLCIkbWVudUxpbmtzIiwic3ViSWQiLCJpc0FjdGl2ZSIsImluaXRQYW5lcyIsIiRzdWJtZW51IiwiJGVsZW1lbnRzIiwiJHByZXZFbGVtZW50IiwiJG5leHRFbGVtZW50IiwibWluIiwicGFyZW50cyIsIm9wZW4iLCJjbG9zZSIsImNsb3NlQWxsIiwiaGlkZUFsbCIsInN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiIsInBhcmVudHNVbnRpbCIsIiRtZW51cyIsIkRyaWxsZG93biIsIiRzdWJtZW51QW5jaG9ycyIsIiRzdWJtZW51cyIsIiRtZW51SXRlbXMiLCJfcHJlcGFyZU1lbnUiLCJfcmVnaXN0ZXJFdmVudHMiLCJfa2V5Ym9hcmRFdmVudHMiLCJwYXJlbnRMaW5rIiwiY2xvbmUiLCJwcmVwZW5kVG8iLCJ3cmFwIiwiJG1lbnUiLCIkYmFjayIsImJhY2tCdXR0b25Qb3NpdGlvbiIsImFwcGVuZCIsImJhY2tCdXR0b24iLCJwcmVwZW5kIiwiX2JhY2siLCJhdXRvSGVpZ2h0IiwiJHdyYXBwZXIiLCJ3cmFwcGVyIiwiYW5pbWF0ZUhlaWdodCIsIl9nZXRNYXhEaW1zIiwiX3Nob3ciLCJjbG9zZU9uQ2xpY2siLCIkYm9keSIsImNvbnRhaW5zIiwiX2hpZGVBbGwiLCJfcmVzaXplIiwiX2JpbmRIYW5kbGVyIiwiX3Njcm9sbFRvcCIsIiRzY3JvbGxUb3BFbGVtZW50Iiwic2Nyb2xsVG9wRWxlbWVudCIsInNjcm9sbFBvcyIsInBhcnNlSW50Iiwic2Nyb2xsVG9wT2Zmc2V0IiwiYW5pbWF0aW9uRHVyYXRpb24iLCJhbmltYXRpb25FYXNpbmciLCJfaGlkZSIsInBhcmVudFN1Yk1lbnUiLCJibHVyIiwibWF4SGVpZ2h0IiwicmVzdWx0IiwibnVtT2ZFbGVtcyIsInVud3JhcCIsInJlbW92ZSIsIkRyb3Bkb3duIiwiJGlkIiwicGFyZW50Q2xhc3MiLCIkcGFyZW50IiwicG9zaXRpb25DbGFzcyIsImdldFBvc2l0aW9uQ2xhc3MiLCJjb3VudGVyIiwidXNlZFBvc2l0aW9ucyIsInZlcnRpY2FsUG9zaXRpb24iLCJtYXRjaCIsImhvcml6b250YWxQb3NpdGlvbiIsImNsYXNzQ2hhbmdlZCIsImRpcmVjdGlvbiIsIm5ld1dpZHRoIiwicGFyZW50SE9mZnNldCIsIiRwYXJlbnREaW1zIiwiX3JlcG9zaXRpb24iLCJfc2V0UG9zaXRpb24iLCJob3ZlciIsImJvZHlEYXRhIiwid2hhdGlucHV0IiwidGltZW91dCIsImhvdmVyRGVsYXkiLCJob3ZlclBhbmUiLCJ2aXNpYmxlRm9jdXNhYmxlRWxlbWVudHMiLCJhdXRvRm9jdXMiLCJfYWRkQm9keUhhbmRsZXIiLCJjdXJQb3NpdGlvbkNsYXNzIiwiRHJvcGRvd25NZW51Iiwic3VicyIsInZlcnRpY2FsQ2xhc3MiLCJyaWdodENsYXNzIiwiYWxpZ25tZW50IiwiY2hhbmdlZCIsImhhc1RvdWNoIiwib250b3VjaHN0YXJ0IiwicGFyQ2xhc3MiLCJoYW5kbGVDbGlja0ZuIiwiaGFzU3ViIiwiaGFzQ2xpY2tlZCIsImNsaWNrT3BlbiIsImZvcmNlRm9sbG93IiwiY2xvc2VPbkNsaWNrSW5zaWRlIiwiZGlzYWJsZUhvdmVyIiwiYXV0b2Nsb3NlIiwiY2xvc2luZ1RpbWUiLCJpc1RhYiIsImluZGV4IiwibmV4dFNpYmxpbmciLCJwcmV2U2libGluZyIsIm9wZW5TdWIiLCJjbG9zZVN1YiIsIl9pc1ZlcnRpY2FsIiwiJHNpYnMiLCJvbGRDbGFzcyIsIiRwYXJlbnRMaSIsIiR0b0Nsb3NlIiwic29tZXRoaW5nVG9DbG9zZSIsIkVxdWFsaXplciIsImVxSWQiLCIkd2F0Y2hlZCIsImhhc05lc3RlZCIsImlzTmVzdGVkIiwiaXNPbiIsIm9uUmVzaXplTWVCb3VuZCIsIl9vblJlc2l6ZU1lIiwib25Qb3N0RXF1YWxpemVkQm91bmQiLCJfb25Qb3N0RXF1YWxpemVkIiwiaW1ncyIsInRvb1NtYWxsIiwiZXF1YWxpemVPbiIsIl9jaGVja01RIiwiX3JlZmxvdyIsIl9wYXVzZUV2ZW50cyIsImVxdWFsaXplT25TdGFjayIsIl9pc1N0YWNrZWQiLCJlcXVhbGl6ZUJ5Um93IiwiZ2V0SGVpZ2h0c0J5Um93IiwiYXBwbHlIZWlnaHRCeVJvdyIsImdldEhlaWdodHMiLCJhcHBseUhlaWdodCIsImhlaWdodHMiLCJsZW4iLCJvZmZzZXRIZWlnaHQiLCJsYXN0RWxUb3BPZmZzZXQiLCJncm91cHMiLCJncm91cCIsImVsT2Zmc2V0VG9wIiwiaiIsImxuIiwiZ3JvdXBzSUxlbmd0aCIsImxlbkoiLCJJbnRlcmNoYW5nZSIsInJ1bGVzIiwiY3VycmVudFBhdGgiLCJfYWRkQnJlYWtwb2ludHMiLCJfZ2VuZXJhdGVSdWxlcyIsInJ1bGUiLCJwYXRoIiwiU1BFQ0lBTF9RVUVSSUVTIiwicnVsZXNMaXN0Iiwibm9kZU5hbWUiLCJyZXNwb25zZSIsImh0bWwiLCJNYWdlbGxhbiIsImNhbGNQb2ludHMiLCIkdGFyZ2V0cyIsIiRsaW5rcyIsIiRhY3RpdmUiLCJwb2ludHMiLCJ3aW5IZWlnaHQiLCJpbm5lckhlaWdodCIsImNsaWVudEhlaWdodCIsImRvY0hlaWdodCIsInNjcm9sbEhlaWdodCIsIiR0YXIiLCJwdCIsInRocmVzaG9sZCIsInRhcmdldFBvaW50IiwiZWFzaW5nIiwiZGVlcExpbmtpbmciLCJzY3JvbGxUb0xvYyIsIl91cGRhdGVBY3RpdmUiLCJhcnJpdmFsIiwiZ2V0QXR0cmlidXRlIiwibG9jIiwiX2luVHJhbnNpdGlvbiIsImJhck9mZnNldCIsIndpblBvcyIsImN1cklkeCIsImlzRG93biIsImN1clZpc2libGUiLCJPZmZDYW52YXMiLCIkbGFzdFRyaWdnZXIiLCIkdHJpZ2dlcnMiLCJ0cmFuc2l0aW9uIiwiY29udGVudE92ZXJsYXkiLCJvdmVybGF5Iiwib3ZlcmxheVBvc2l0aW9uIiwic2V0QXR0cmlidXRlIiwiJG92ZXJsYXkiLCJpc1JldmVhbGVkIiwicmV2ZWFsQ2xhc3MiLCJyZXZlYWxPbiIsIl9zZXRNUUNoZWNrZXIiLCJ0cmFuc2l0aW9uVGltZSIsIl9oYW5kbGVLZXlib2FyZCIsInJldmVhbCIsIiRjbG9zZXIiLCJhbGxvd1VwIiwiYWxsb3dEb3duIiwibGFzdFkiLCJvcmlnaW5hbEV2ZW50IiwiZm9yY2VUbyIsInNjcm9sbFRvIiwiY29udGVudFNjcm9sbCIsIl9zdG9wU2Nyb2xsaW5nIiwiX3JlY29yZFNjcm9sbGFibGUiLCJfc3RvcFNjcm9sbFByb3BhZ2F0aW9uIiwiY2FudmFzRm9jdXMiLCJPcmJpdCIsIl9yZXNldCIsImNvbnRhaW5lckNsYXNzIiwiJHNsaWRlcyIsInNsaWRlQ2xhc3MiLCIkaW1hZ2VzIiwiaW5pdEFjdGl2ZSIsInVzZU1VSSIsIl9wcmVwYXJlRm9yT3JiaXQiLCJidWxsZXRzIiwiX2xvYWRCdWxsZXRzIiwiYXV0b1BsYXkiLCJnZW9TeW5jIiwiYWNjZXNzaWJsZSIsIiRidWxsZXRzIiwiYm94T2ZCdWxsZXRzIiwidGltZXJEZWxheSIsImNoYW5nZVNsaWRlIiwiX3NldFdyYXBwZXJIZWlnaHQiLCJ0ZW1wIiwicGF1c2VPbkhvdmVyIiwibmF2QnV0dG9ucyIsIiRjb250cm9scyIsIm5leHRDbGFzcyIsInByZXZDbGFzcyIsIiRzbGlkZSIsIl91cGRhdGVCdWxsZXRzIiwiaXNMVFIiLCJjaG9zZW5TbGlkZSIsIiRjdXJTbGlkZSIsIiRmaXJzdFNsaWRlIiwiJGxhc3RTbGlkZSIsImxhc3QiLCJkaXJJbiIsImRpck91dCIsIiRuZXdTbGlkZSIsImluZmluaXRlV3JhcCIsIiRvbGRCdWxsZXQiLCJzcGFuIiwiZGV0YWNoIiwiJG5ld0J1bGxldCIsImFuaW1JbkZyb21SaWdodCIsImFuaW1PdXRUb1JpZ2h0IiwiYW5pbUluRnJvbUxlZnQiLCJhbmltT3V0VG9MZWZ0IiwiUmVzcG9uc2l2ZU1lbnUiLCJjdXJyZW50TXEiLCJjdXJyZW50UGx1Z2luIiwicnVsZXNUcmVlIiwicnVsZVNpemUiLCJydWxlUGx1Z2luIiwiTWVudVBsdWdpbnMiLCJpc0VtcHR5T2JqZWN0IiwiX2NoZWNrTWVkaWFRdWVyaWVzIiwibWF0Y2hlZE1xIiwiY3NzQ2xhc3MiLCJkZXN0cm95IiwiZHJvcGRvd24iLCJkcmlsbGRvd24iLCJhY2NvcmRpb24iLCJSZXNwb25zaXZlVG9nZ2xlIiwidGFyZ2V0SUQiLCIkdGFyZ2V0TWVudSIsIiR0b2dnbGVyIiwiaW5wdXQiLCJhbmltYXRpb25JbiIsImFuaW1hdGlvbk91dCIsIl91cGRhdGUiLCJfdXBkYXRlTXFIYW5kbGVyIiwidG9nZ2xlTWVudSIsImhpZGVGb3IiLCJSZXZlYWwiLCJjYWNoZWQiLCJtcSIsImlzTW9iaWxlIiwibW9iaWxlU25pZmYiLCJmdWxsU2NyZWVuIiwiX21ha2VPdmVybGF5Iiwib3V0ZXJXaWR0aCIsIm91dGVySGVpZ2h0IiwibWFyZ2luIiwiX3VwZGF0ZVBvc2l0aW9uIiwiX2hhbmRsZVN0YXRlIiwibXVsdGlwbGVPcGVuZWQiLCJhZGRSZXZlYWxPcGVuQ2xhc3NlcyIsIm9yaWdpbmFsU2Nyb2xsUG9zIiwiYWZ0ZXJBbmltYXRpb24iLCJmb2N1c2FibGVFbGVtZW50cyIsInNob3dEZWxheSIsIl9leHRyYUhhbmRsZXJzIiwiY2xvc2VPbkVzYyIsImZpbmlzaFVwIiwiaGlkZURlbGF5IiwicmVzZXRPbkNsb3NlIiwidGl0bGUiLCJocmVmIiwiYnRtT2Zmc2V0UGN0IiwiaVBob25lU25pZmYiLCJhbmRyb2lkU25pZmYiLCJTbGlkZXIiLCJpbnB1dHMiLCJoYW5kbGVzIiwiJGhhbmRsZSIsIiRpbnB1dCIsIiRmaWxsIiwidmVydGljYWwiLCJpc0RibCIsImRpc2FibGVkIiwiZGlzYWJsZWRDbGFzcyIsImJpbmRpbmciLCJfc2V0SW5pdEF0dHIiLCJkb3VibGVTaWRlZCIsIiRoYW5kbGUyIiwiJGlucHV0MiIsInNldEhhbmRsZXMiLCJfc2V0SGFuZGxlUG9zIiwicGN0T2ZCYXIiLCJwZXJjZW50IiwicG9zaXRpb25WYWx1ZUZ1bmN0aW9uIiwiX2xvZ1RyYW5zZm9ybSIsIl9wb3dUcmFuc2Zvcm0iLCJ0b0ZpeGVkIiwiYmFzZUxvZyIsIm5vbkxpbmVhckJhc2UiLCIkaG5kbCIsIm5vSW52ZXJ0IiwiaDJWYWwiLCJzdGVwIiwiaDFWYWwiLCJ2ZXJ0IiwiaE9yVyIsImxPclQiLCJoYW5kbGVEaW0iLCJlbGVtRGltIiwiX3BjdE9mQmFyIiwicHhUb01vdmUiLCJtb3ZlbWVudCIsImRlY2ltYWwiLCJfc2V0VmFsdWVzIiwiaXNMZWZ0SG5kbCIsImRpbSIsImhhbmRsZVBjdCIsImhhbmRsZVBvcyIsImluaXRpYWxTdGFydCIsIm1vdmVUaW1lIiwiY2hhbmdlZERlbGF5IiwiaW5pdFZhbCIsImluaXRpYWxFbmQiLCJoYXNWYWwiLCJldmVudE9mZnNldCIsImhhbGZPZkhhbmRsZSIsImJhckRpbSIsIndpbmRvd1Njcm9sbCIsInNjcm9sbExlZnQiLCJlbGVtT2Zmc2V0IiwiZXZlbnRGcm9tQmFyIiwiYmFyWFkiLCJvZmZzZXRQY3QiLCJfdmFsdWUiLCJfYWRqdXN0VmFsdWUiLCJmaXJzdEhuZGxQb3MiLCJhYnNQb3NpdGlvbiIsInNlY25kSG5kbFBvcyIsImRpdiIsInByZXZfdmFsIiwibmV4dF92YWwiLCJfZXZlbnRzRm9ySGFuZGxlIiwiY3VySGFuZGxlIiwiX2hhbmRsZUV2ZW50IiwiY2xpY2tTZWxlY3QiLCJkcmFnZ2FibGUiLCJjdXJyZW50VGFyZ2V0IiwiXyRoYW5kbGUiLCJvbGRWYWx1ZSIsIm5ld1ZhbHVlIiwiZGVjcmVhc2UiLCJpbmNyZWFzZSIsImRlY3JlYXNlX2Zhc3QiLCJpbmNyZWFzZV9mYXN0IiwiaW52ZXJ0VmVydGljYWwiLCJmcmFjIiwibnVtIiwiY2xpY2tQb3MiLCJiYXNlIiwibG9nIiwiU3RpY2t5Iiwid2FzV3JhcHBlZCIsIiRjb250YWluZXIiLCJjb250YWluZXIiLCJ3cmFwSW5uZXIiLCJzdGlja3lDbGFzcyIsInNjcm9sbENvdW50IiwiY2hlY2tFdmVyeSIsImlzU3R1Y2siLCJjb250YWluZXJIZWlnaHQiLCJlbGVtSGVpZ2h0IiwiX3BhcnNlUG9pbnRzIiwiX3NldFNpemVzIiwic2Nyb2xsIiwiX2NhbGMiLCJfcmVtb3ZlU3RpY2t5IiwidG9wUG9pbnQiLCJyZXZlcnNlIiwidG9wQW5jaG9yIiwiYnRtIiwiYnRtQW5jaG9yIiwicHRzIiwiYnJlYWtzIiwicGxhY2UiLCJjYW5TdGljayIsIl9ldmVudHNIYW5kbGVyIiwiX3BhdXNlTGlzdGVuZXJzIiwiY2hlY2tTaXplcyIsImJvdHRvbVBvaW50IiwiX3NldFN0aWNreSIsInN0aWNrVG8iLCJtcmduIiwibm90U3R1Y2tUbyIsImlzVG9wIiwic3RpY2tUb1RvcCIsImFuY2hvclB0IiwiYW5jaG9ySGVpZ2h0IiwidG9wT3JCb3R0b20iLCJzdGlja3lPbiIsIm5ld0VsZW1XaWR0aCIsImNvbXAiLCJwZG5nbCIsInBkbmdyIiwibmV3Q29udGFpbmVySGVpZ2h0IiwiX3NldEJyZWFrUG9pbnRzIiwibVRvcCIsImVtQ2FsYyIsIm1hcmdpblRvcCIsIm1CdG0iLCJtYXJnaW5Cb3R0b20iLCJlbSIsImZvbnRTaXplIiwiVGFicyIsIiR0YWJUaXRsZXMiLCJsaW5rQ2xhc3MiLCJsaW5rQWN0aXZlQ2xhc3MiLCJtYXRjaEhlaWdodCIsIl9zZXRIZWlnaHQiLCJzZWxlY3RUYWIiLCJfYWRkS2V5SGFuZGxlciIsIl9hZGRDbGlja0hhbmRsZXIiLCJfc2V0SGVpZ2h0TXFIYW5kbGVyIiwiX2hhbmRsZVRhYkNoYW5nZSIsIndyYXBPbktleXMiLCJoaXN0b3J5SGFuZGxlZCIsImFjdGl2ZUNvbGxhcHNlIiwiX2NvbGxhcHNlVGFiIiwiJG9sZFRhYiIsIiR0YWJMaW5rIiwiJHRhcmdldENvbnRlbnQiLCJfb3BlblRhYiIsInBhbmVsQWN0aXZlQ2xhc3MiLCIkdGFyZ2V0X2FuY2hvciIsImlkU3RyIiwicGFuZWxDbGFzcyIsInBhbmVsIiwiVG9nZ2xlciIsInRvZ2dsZUNsYXNzIiwiX3VwZGF0ZUFSSUEiLCJUb29sdGlwIiwiaXNDbGljayIsImVsZW1JZCIsIl9nZXRQb3NpdGlvbkNsYXNzIiwidGlwVGV4dCIsInRlbXBsYXRlIiwiX2J1aWxkVGVtcGxhdGUiLCJhbGxvd0h0bWwiLCJ0cmlnZ2VyQ2xhc3MiLCJ0ZW1wbGF0ZUNsYXNzZXMiLCJ0b29sdGlwQ2xhc3MiLCIkdGVtcGxhdGUiLCIkdGlwRGltcyIsInNob3dPbiIsImZhZGVJbiIsImZhZGVJbkR1cmF0aW9uIiwiZmFkZU91dER1cmF0aW9uIiwiaXNGb2N1cyIsImRpc2FibGVGb3JUb3VjaCIsInRvdWNoQ2xvc2VUZXh0IiwiZW5kRXZlbnQiLCJNb3Rpb25VSSIsInJlYWR5IiwidmlkZW9zIiwiZm9vdGVyIiwicG9zIiwic3RpY2t5Rm9vdGVyIl0sIm1hcHBpbmdzIjoiOztBQUFBLENBQUMsVUFBU0EsQ0FBVCxFQUFZOztBQUViOztBQUVBLE1BQUlDLHFCQUFxQixPQUF6Qjs7QUFFQTtBQUNBO0FBQ0EsTUFBSUMsYUFBYTtBQUNmQyxhQUFTRixrQkFETTs7QUFHZjs7O0FBR0FHLGNBQVUsRUFOSzs7QUFRZjs7O0FBR0FDLFlBQVEsRUFYTzs7QUFhZjs7O0FBR0FDLFNBQUssWUFBVTtBQUNiLGFBQU9OLEVBQUUsTUFBRixFQUFVTyxJQUFWLENBQWUsS0FBZixNQUEwQixLQUFqQztBQUNELEtBbEJjO0FBbUJmOzs7O0FBSUFDLFlBQVEsVUFBU0EsTUFBVCxFQUFpQkMsSUFBakIsRUFBdUI7QUFDN0I7QUFDQTtBQUNBLFVBQUlDLFlBQWFELFFBQVFFLGFBQWFILE1BQWIsQ0FBekI7QUFDQTtBQUNBO0FBQ0EsVUFBSUksV0FBWUMsVUFBVUgsU0FBVixDQUFoQjs7QUFFQTtBQUNBLFdBQUtOLFFBQUwsQ0FBY1EsUUFBZCxJQUEwQixLQUFLRixTQUFMLElBQWtCRixNQUE1QztBQUNELEtBakNjO0FBa0NmOzs7Ozs7Ozs7QUFTQU0sb0JBQWdCLFVBQVNOLE1BQVQsRUFBaUJDLElBQWpCLEVBQXNCO0FBQ3BDLFVBQUlNLGFBQWFOLE9BQU9JLFVBQVVKLElB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cyIsInNvdXJjZXNDb250ZW50IjpbIiFmdW5jdGlvbigkKSB7XG5cblwidXNlIHN0cmljdFwiO1xuXG52YXIgRk9VTkRBVElPTl9WRVJTSU9OID0gJzYuMy4xJztcblxuLy8gR2xvYmFsIEZvdW5kYXRpb24gb2JqZWN0XG4vLyBUaGlzIGlzIGF0dGFjaGVkIHRvIHRoZSB3aW5kb3csIG9yIHVzZWQgYXMgYSBtb2R1bGUgZm9yIEFNRC9Ccm93c2VyaWZ5XG52YXIgRm91bmRhdGlvbiA9IHtcbiAgdmVyc2lvbjogRk9VTkRBVElPTl9WRVJTSU9OLFxuXG4gIC8qKlxuICAgKiBTdG9yZXMgaW5pdGlhbGl6ZWQgcGx1Z2lucy5cbiAgICovXG4gIF9wbHVnaW5zOiB7fSxcblxuICAvKipcbiAgICogU3RvcmVzIGdlbmVyYXRlZCB1bmlxdWUgaWRzIGZvciBwbHVnaW4gaW5zdGFuY2VzXG4gICAqL1xuICBfdXVpZHM6IFtdLFxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgYm9vbGVhbiBmb3IgUlRMIHN1cHBvcnRcbiAgICovXG4gIHJ0bDogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gJCgnaHRtbCcpLmF0dHIoJ2RpcicpID09PSAncnRsJztcbiAgfSxcbiAgLyoqXG4gICAqIERlZmluZXMgYSBGb3VuZGF0aW9uIHBsdWdpbiwgYWRkaW5nIGl0IHRvIHRoZSBgRm91bmRhdGlvbmAgbmFtZXNwYWNlIGFuZCB0aGUgbGlzdCBvZiBwbHVnaW5zIHRvIGluaXRpYWxpemUgd2hlbiByZWZsb3dpbmcuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwbHVnaW4gLSBUaGUgY29uc3RydWN0b3Igb2YgdGhlIHBsdWdpbi5cbiAgICovXG4gIHBsdWdpbjogZnVuY3Rpb24ocGx1Z2luLCBuYW1lKSB7XG4gICAgLy8gT2JqZWN0IGtleSB0byB1c2Ugd2hlbiBhZGRpbmcgdG8gZ2xvYmFsIEZvdW5kYXRpb24gb2JqZWN0XG4gICAgLy8gRXhhbXBsZXM6IEZvdW5kYXRpb24uUmV2ZWFsLCBGb3VuZGF0aW9uLk9mZkNhbnZhc1xuICAgIHZhciBjbGFzc05hbWUgPSAobmFtZSB8fCBmdW5jdGlvbk5hbWUocGx1Z2luKSk7XG4gICAgLy8gT2JqZWN0IGtleSB0byB1c2Ugd2hlbiBzdG9yaW5nIHRoZSBwbHVnaW4sIGFsc28gdXNlZCB0byBjcmVhdGUgdGhlIGlkZW50aWZ5aW5nIGRhdGEgYXR0cmlidXRlIGZvciB0aGUgcGx1Z2luXG4gICAgLy8gRXhhbXBsZXM6IGRhdGEtcmV2ZWFsLCBkYXRhLW9mZi1jYW52YXNcbiAgICB2YXIgYXR0ck5hbWUgID0gaHlwaGVuYXRlKGNsYXNzTmFtZSk7XG5cbiAgICAvLyBBZGQgdG8gdGhlIEZvdW5kYXRpb24gb2JqZWN0IGFuZCB0aGUgcGx1Z2lucyBsaXN0IChmb3IgcmVmbG93aW5nKVxuICAgIHRoaXMuX3BsdWdpbnNbYXR0ck5hbWVdID0gdGhpc1tjbGFzc05hbWVdID0gcGx1Z2luO1xuICB9LFxuICAvKipcbiAgICogQGZ1bmN0aW9uXG4gICAqIFBvcHVsYXRlcyB0aGUgX3V1aWRzIGFycmF5IHdpdGggcG9pbnRlcnMgdG8gZWFjaCBpbmRpdmlkdWFsIHBsdWdpbiBpbnN0YW5jZS5cbiAgICogQWRkcyB0aGUgYHpmUGx1Z2luYCBkYXRhLWF0dHJpYnV0ZSB0byBwcm9ncmFtbWF0aWNhbGx5IGNyZWF0ZWQgcGx1Z2lucyB0byBhbGxvdyB1c2Ugb2YgJChzZWxlY3RvcikuZm91bmRhdGlvbihtZXRob2QpIGNhbGxzLlxuICAgKiBBbHNvIGZpcmVzIHRoZSBpbml0aWFsaXphdGlvbiBldmVudCBmb3IgZWFjaCBwbHVnaW4sIGNvbnNvbGlkYXRpbmcgcmVwZXRpdGl2ZSBjb2RlLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcGx1Z2luIC0gYW4gaW5zdGFuY2Ugb2YgYSBwbHVnaW4sIHVzdWFsbHkgYHRoaXNgIGluIGNvbnRleHQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIC0gdGhlIG5hbWUgb2YgdGhlIHBsdWdpbiwgcGFzc2VkIGFzIGEgY2FtZWxDYXNlZCBzdHJpbmcuXG4gICAqIEBmaXJlcyBQbHVnaW4jaW5pdFxuICAgKi9cbiAgcmVnaXN0ZXJQbHVnaW46IGZ1bmN0aW9uKHBsdWdpbiwgbmFtZSl7XG4gICAgdmFyIHBsdWdpbk5hbWUgPSBuYW1lID8gaHlwaGVuYXRlKG5hbWUpIDogZnVuY3Rpb25OYW1lKHBsdWdpbi5jb25zdHJ1Y3RvcikudG9Mb3dlckNhc2UoKTtcbiAgICBwbHVnaW4udXVpZCA9IHRoaXMuR2V0WW9EaWdpdHMoNiwgcGx1Z2luTmFtZSk7XG5cbiAgICBpZighcGx1Z2luLiRlbGVtZW50LmF0dHIoYGRhdGEtJHtwbHVnaW5OYW1lfWApKXsgcGx1Z2luLiRlbGVtZW50LmF0dHIoYGRhdGEtJHtwbHVnaW5OYW1lfWAsIHBsdWdpbi51dWlkKTsgfVxuICAgIGlmKCFwbHVnaW4uJGVsZW1lbnQuZGF0YSgnemZQbHVnaW4nKSl7IHBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicsIHBsdWdpbik7IH1cbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBwbHVnaW4gaGFzIGluaXRpYWxpemVkLlxuICAgICAgICAgICAqIEBldmVudCBQbHVnaW4jaW5pdFxuICAgICAgICAgICAqL1xuICAgIHBsdWdpbi4kZWxlbWVudC50cmlnZ2VyKGBpbml0LnpmLiR7cGx1Z2luTmFtZX1gKTtcblxuICAgIHRoaXMuX3V1aWRzLnB1c2gocGx1Z2luLnV1aWQpO1xuXG4gICAgcmV0dXJuO1xuICB9LFxuICAvKipcbiAgICogQGZ1bmN0aW9uXG4gICAqIFJlbW92ZXMgdGhlIHBsdWdpbnMgdXVpZCBmcm9tIHRoZSBfdXVpZHMgYXJyYXkuXG4gICAqIFJlbW92ZXMgdGhlIHpmUGx1Z2luIGRhdGEgYXR0cmlidXRlLCBhcyB3ZWxsIGFzIHRoZSBkYXRhLXBsdWdpbi1uYW1lIGF0dHJpYnV0ZS5cbiAgICogQWxzbyBmaXJlcyB0aGUgZGVzdHJveWVkIGV2ZW50IGZvciB0aGUgcGx1Z2luLCBjb25zb2xpZGF0aW5nIHJlcGV0aXRpdmUgY29kZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IHBsdWdpbiAtIGFuIGluc3RhbmNlIG9mIGEgcGx1Z2luLCB1c3VhbGx5IGB0aGlzYCBpbiBjb250ZXh0LlxuICAgKiBAZmlyZXMgUGx1Z2luI2Rlc3Ryb3llZFxuICAgKi9cbiAgdW5yZWdpc3RlclBsdWdpbjogZnVuY3Rpb24ocGx1Z2luKXtcbiAgICB2YXIgcGx1Z2luTmFtZSA9IGh5cGhlbmF0ZShmdW5jdGlvbk5hbWUocGx1Z2luLiRlbGVtZW50LmRhdGEoJ3pmUGx1Z2luJykuY29uc3RydWN0b3IpKTtcblxuICAgIHRoaXMuX3V1aWRzLnNwbGljZSh0aGlzLl91dWlkcy5pbmRleE9mKHBsdWdpbi51dWlkKSwgMSk7XG4gICAgcGx1Z2luLiRlbGVtZW50LnJlbW92ZUF0dHIoYGRhdGEtJHtwbHVnaW5OYW1lfWApLnJlbW92ZURhdGEoJ3pmUGx1Z2luJylcbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBwbHVnaW4gaGFzIGJlZW4gZGVzdHJveWVkLlxuICAgICAgICAgICAqIEBldmVudCBQbHVnaW4jZGVzdHJveWVkXG4gICAgICAgICAgICovXG4gICAgICAgICAgLnRyaWdnZXIoYGRlc3Ryb3llZC56Zi4ke3BsdWdpbk5hbWV9YCk7XG4gICAgZm9yKHZhciBwcm9wIGluIHBsdWdpbil7XG4gICAgICBwbHVnaW5bcHJvcF0gPSBudWxsOy8vY2xlYW4gdXAgc2NyaXB0IHRvIHByZXAgZm9yIGdhcmJhZ2UgY29sbGVjdGlvbi5cbiAgICB9XG4gICAgcmV0dXJuO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAZnVuY3Rpb25cbiAgICogQ2F1c2VzIG9uZSBvciBtb3JlIGFjdGl2ZSBwbHVnaW5zIHRvIHJlLWluaXRpYWxpemUsIHJlc2V0dGluZyBldmVudCBsaXN0ZW5lcnMsIHJlY2FsY3VsYXRpbmcgcG9zaXRpb25zLCBldGMuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwbHVnaW5zIC0gb3B0aW9uYWwgc3RyaW5nIG9mIGFuIGluZGl2aWR1YWwgcGx1Z2luIGtleSwgYXR0YWluZWQgYnkgY2FsbGluZyBgJChlbGVtZW50KS5kYXRhKCdwbHVnaW5OYW1lJylgLCBvciBzdHJpbmcgb2YgYSBwbHVnaW4gY2xhc3MgaS5lLiBgJ2Ryb3Bkb3duJ2BcbiAgICogQGRlZmF1bHQgSWYgbm8gYXJndW1lbnQgaXMgcGFzc2VkLCByZWZsb3cgYWxsIGN1cnJlbnRseSBhY3RpdmUgcGx1Z2lucy5cbiAgICovXG4gICByZUluaXQ6IGZ1bmN0aW9uKHBsdWdpbnMpe1xuICAgICB2YXIgaXNKUSA9IHBsdWdpbnMgaW5zdGFuY2VvZiAkO1xuICAgICB0cnl7XG4gICAgICAgaWYoaXNKUSl7XG4gICAgICAgICBwbHVnaW5zLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgJCh0aGlzKS5kYXRhKCd6ZlBsdWdpbicpLl9pbml0KCk7XG4gICAgICAgICB9KTtcbiAgICAgICB9ZWxzZXtcbiAgICAgICAgIHZhciB0eXBlID0gdHlwZW9mIHBsdWdpbnMsXG4gICAgICAgICBfdGhpcyA9IHRoaXMsXG4gICAgICAgICBmbnMgPSB7XG4gICAgICAgICAgICdvYmplY3QnOiBmdW5jdGlvbihwbGdzKXtcbiAgICAgICAgICAgICBwbGdzLmZvckVhY2goZnVuY3Rpb24ocCl7XG4gICAgICAgICAgICAgICBwID0gaHlwaGVuYXRlKHApO1xuICAgICAgICAgICAgICAgJCgnW2RhdGEtJysgcCArJ10nKS5mb3VuZGF0aW9uKCdfaW5pdCcpO1xuICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICB9LFxuICAgICAgICAgICAnc3RyaW5nJzogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICBwbHVnaW5zID0gaHlwaGVuYXRlKHBsdWdpbnMpO1xuICAgICAgICAgICAgICQoJ1tkYXRhLScrIHBsdWdpbnMgKyddJykuZm91bmRhdGlvbignX2luaXQnKTtcbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgJ3VuZGVmaW5lZCc6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgdGhpc1snb2JqZWN0J10oT2JqZWN0LmtleXMoX3RoaXMuX3BsdWdpbnMpKTtcbiAgICAgICAgICAgfVxuICAgICAgICAgfTtcbiAgICAgICAgIGZuc1t0eXBlXShwbHVnaW5zKTtcbiAgICAgICB9XG4gICAgIH1jYXRjaChlcnIpe1xuICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgfWZpbmFsbHl7XG4gICAgICAgcmV0dXJuIHBsdWdpbnM7XG4gICAgIH1cbiAgIH0sXG5cbiAgLyoqXG4gICAqIHJldHVybnMgYSByYW5kb20gYmFzZS0zNiB1aWQgd2l0aCBuYW1lc3BhY2luZ1xuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGxlbmd0aCAtIG51bWJlciBvZiByYW5kb20gYmFzZS0zNiBkaWdpdHMgZGVzaXJlZC4gSW5jcmVhc2UgZm9yIG1vcmUgcmFuZG9tIHN0cmluZ3MuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2UgLSBuYW1lIG9mIHBsdWdpbiB0byBiZSBpbmNvcnBvcmF0ZWQgaW4gdWlkLCBvcHRpb25hbC5cbiAgICogQGRlZmF1bHQge1N0cmluZ30gJycgLSBpZiBubyBwbHVnaW4gbmFtZSBpcyBwcm92aWRlZCwgbm90aGluZyBpcyBhcHBlbmRlZCB0byB0aGUgdWlkLlxuICAgKiBAcmV0dXJucyB7U3RyaW5nfSAtIHVuaXF1ZSBpZFxuICAgKi9cbiAgR2V0WW9EaWdpdHM6IGZ1bmN0aW9uKGxlbmd0aCwgbmFtZXNwYWNlKXtcbiAgICBsZW5ndGggPSBsZW5ndGggfHwgNjtcbiAgICByZXR1cm4gTWF0aC5yb3VuZCgoTWF0aC5wb3coMzYsIGxlbmd0aCArIDEpIC0gTWF0aC5yYW5kb20oKSAqIE1hdGgucG93KDM2LCBsZW5ndGgpKSkudG9TdHJpbmcoMzYpLnNsaWNlKDEpICsgKG5hbWVzcGFjZSA/IGAtJHtuYW1lc3BhY2V9YCA6ICcnKTtcbiAgfSxcbiAgLyoqXG4gICAqIEluaXRpYWxpemUgcGx1Z2lucyBvbiBhbnkgZWxlbWVudHMgd2l0aGluIGBlbGVtYCAoYW5kIGBlbGVtYCBpdHNlbGYpIHRoYXQgYXJlbid0IGFscmVhZHkgaW5pdGlhbGl6ZWQuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtIC0galF1ZXJ5IG9iamVjdCBjb250YWluaW5nIHRoZSBlbGVtZW50IHRvIGNoZWNrIGluc2lkZS4gQWxzbyBjaGVja3MgdGhlIGVsZW1lbnQgaXRzZWxmLCB1bmxlc3MgaXQncyB0aGUgYGRvY3VtZW50YCBvYmplY3QuXG4gICAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBwbHVnaW5zIC0gQSBsaXN0IG9mIHBsdWdpbnMgdG8gaW5pdGlhbGl6ZS4gTGVhdmUgdGhpcyBvdXQgdG8gaW5pdGlhbGl6ZSBldmVyeXRoaW5nLlxuICAgKi9cbiAgcmVmbG93OiBmdW5jdGlvbihlbGVtLCBwbHVnaW5zKSB7XG5cbiAgICAvLyBJZiBwbHVnaW5zIGlzIHVuZGVmaW5lZCwganVzdCBncmFiIGV2ZXJ5dGhpbmdcbiAgICBpZiAodHlwZW9mIHBsdWdpbnMgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBwbHVnaW5zID0gT2JqZWN0LmtleXModGhpcy5fcGx1Z2lucyk7XG4gICAgfVxuICAgIC8vIElmIHBsdWdpbnMgaXMgYSBzdHJpbmcsIGNvbnZlcnQgaXQgdG8gYW4gYXJyYXkgd2l0aCBvbmUgaXRlbVxuICAgIGVsc2UgaWYgKHR5cGVvZiBwbHVnaW5zID09PSAnc3RyaW5nJykge1xuICAgICAgcGx1Z2lucyA9IFtwbHVnaW5zXTtcbiAgICB9XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGVhY2ggcGx1Z2luXG4gICAgJC5lYWNoKHBsdWdpbnMsIGZ1bmN0aW9uKGksIG5hbWUpIHtcbiAgICAgIC8vIEdldCB0aGUgY3VycmVudCBwbHVnaW5cbiAgICAgIHZhciBwbHVnaW4gPSBfdGhpcy5fcGx1Z2luc1tuYW1lXTtcblxuICAgICAgLy8gTG9jYWxpemUgdGhlIHNlYXJjaCB0byBhbGwgZWxlbWVudHMgaW5zaWRlIGVsZW0sIGFzIHdlbGwgYXMgZWxlbSBpdHNlbGYsIHVubGVzcyBlbGVtID09PSBkb2N1bWVudFxuICAgICAgdmFyICRlbGVtID0gJChlbGVtKS5maW5kKCdbZGF0YS0nK25hbWUrJ10nKS5hZGRCYWNrKCdbZGF0YS0nK25hbWUrJ10nKTtcblxuICAgICAgLy8gRm9yIGVhY2ggcGx1Z2luIGZvdW5kLCBpbml0aWFsaXplIGl0XG4gICAgICAkZWxlbS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgJGVsID0gJCh0aGlzKSxcbiAgICAgICAgICAgIG9wdHMgPSB7fTtcbiAgICAgICAgLy8gRG9uJ3QgZG91YmxlLWRpcCBvbiBwbHVnaW5zXG4gICAgICAgIGlmICgkZWwuZGF0YSgnemZQbHVnaW4nKSkge1xuICAgICAgICAgIGNvbnNvbGUud2FybihcIlRyaWVkIHRvIGluaXRpYWxpemUgXCIrbmFtZStcIiBvbiBhbiBlbGVtZW50IHRoYXQgYWxyZWFkeSBoYXMgYSBGb3VuZGF0aW9uIHBsdWdpbi5cIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoJGVsLmF0dHIoJ2RhdGEtb3B0aW9ucycpKXtcbiAgICAgICAgICB2YXIgdGhpbmcgPSAkZWwuYXR0cignZGF0YS1vcHRpb25zJykuc3BsaXQoJzsnKS5mb3JFYWNoKGZ1bmN0aW9uKGUsIGkpe1xuICAgICAgICAgICAgdmFyIG9wdCA9IGUuc3BsaXQoJzonKS5tYXAoZnVuY3Rpb24oZWwpeyByZXR1cm4gZWwudHJpbSgpOyB9KTtcbiAgICAgICAgICAgIGlmKG9wdFswXSkgb3B0c1tvcHRbMF1dID0gcGFyc2VWYWx1ZShvcHRbMV0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAkZWwuZGF0YSgnemZQbHVnaW4nLCBuZXcgcGx1Z2luKCQodGhpcyksIG9wdHMpKTtcbiAgICAgICAgfWNhdGNoKGVyKXtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVyKTtcbiAgICAgICAgfWZpbmFsbHl7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcbiAgZ2V0Rm5OYW1lOiBmdW5jdGlvbk5hbWUsXG4gIHRyYW5zaXRpb25lbmQ6IGZ1bmN0aW9uKCRlbGVtKXtcbiAgICB2YXIgdHJhbnNpdGlvbnMgPSB7XG4gICAgICAndHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAgICdXZWJraXRUcmFuc2l0aW9uJzogJ3dlYmtpdFRyYW5zaXRpb25FbmQnLFxuICAgICAgJ01velRyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgICAnT1RyYW5zaXRpb24nOiAnb3RyYW5zaXRpb25lbmQnXG4gICAgfTtcbiAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxuICAgICAgICBlbmQ7XG5cbiAgICBmb3IgKHZhciB0IGluIHRyYW5zaXRpb25zKXtcbiAgICAgIGlmICh0eXBlb2YgZWxlbS5zdHlsZVt0XSAhPT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICBlbmQgPSB0cmFuc2l0aW9uc1t0XTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYoZW5kKXtcbiAgICAgIHJldHVybiBlbmQ7XG4gICAgfWVsc2V7XG4gICAgICBlbmQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICRlbGVtLnRyaWdnZXJIYW5kbGVyKCd0cmFuc2l0aW9uZW5kJywgWyRlbGVtXSk7XG4gICAgICB9LCAxKTtcbiAgICAgIHJldHVybiAndHJhbnNpdGlvbmVuZCc7XG4gICAgfVxuICB9XG59O1xuXG5Gb3VuZGF0aW9uLnV0aWwgPSB7XG4gIC8qKlxuICAgKiBGdW5jdGlvbiBmb3IgYXBwbHlpbmcgYSBkZWJvdW5jZSBlZmZlY3QgdG8gYSBmdW5jdGlvbiBjYWxsLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyAtIEZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCBlbmQgb2YgdGltZW91dC5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGRlbGF5IC0gVGltZSBpbiBtcyB0byBkZWxheSB0aGUgY2FsbCBvZiBgZnVuY2AuXG4gICAqIEByZXR1cm5zIGZ1bmN0aW9uXG4gICAqL1xuICB0aHJvdHRsZTogZnVuY3Rpb24gKGZ1bmMsIGRlbGF5KSB7XG4gICAgdmFyIHRpbWVyID0gbnVsbDtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgY29udGV4dCA9IHRoaXMsIGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgICAgIGlmICh0aW1lciA9PT0gbnVsbCkge1xuICAgICAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgICAgdGltZXIgPSBudWxsO1xuICAgICAgICB9LCBkZWxheSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxufTtcblxuLy8gVE9ETzogY29uc2lkZXIgbm90IG1ha2luZyB0aGlzIGEgalF1ZXJ5IGZ1bmN0aW9uXG4vLyBUT0RPOiBuZWVkIHdheSB0byByZWZsb3cgdnMuIHJlLWluaXRpYWxpemVcbi8qKlxuICogVGhlIEZvdW5kYXRpb24galF1ZXJ5IG1ldGhvZC5cbiAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBtZXRob2QgLSBBbiBhY3Rpb24gdG8gcGVyZm9ybSBvbiB0aGUgY3VycmVudCBqUXVlcnkgb2JqZWN0LlxuICovXG52YXIgZm91bmRhdGlvbiA9IGZ1bmN0aW9uKG1ldGhvZCkge1xuICB2YXIgdHlwZSA9IHR5cGVvZiBtZXRob2QsXG4gICAgICAkbWV0YSA9ICQoJ21ldGEuZm91bmRhdGlvbi1tcScpLFxuICAgICAgJG5vSlMgPSAkKCcubm8tanMnKTtcblxuICBpZighJG1ldGEubGVuZ3RoKXtcbiAgICAkKCc8bWV0YSBjbGFzcz1cImZvdW5kYXRpb24tbXFcIj4nKS5hcHBlbmRUbyhkb2N1bWVudC5oZWFkKTtcbiAgfVxuICBpZigkbm9KUy5sZW5ndGgpe1xuICAgICRub0pTLnJlbW92ZUNsYXNzKCduby1qcycpO1xuICB9XG5cbiAgaWYodHlwZSA9PT0gJ3VuZGVmaW5lZCcpey8vbmVlZHMgdG8gaW5pdGlhbGl6ZSB0aGUgRm91bmRhdGlvbiBvYmplY3QsIG9yIGFuIGluZGl2aWR1YWwgcGx1Z2luLlxuICAgIEZvdW5kYXRpb24uTWVkaWFRdWVyeS5faW5pdCgpO1xuICAgIEZvdW5kYXRpb24ucmVmbG93KHRoaXMpO1xuICB9ZWxzZSBpZih0eXBlID09PSAnc3RyaW5nJyl7Ly9hbiBpbmRpdmlkdWFsIG1ldGhvZCB0byBpbnZva2Ugb24gYSBwbHVnaW4gb3IgZ3JvdXAgb2YgcGx1Z2luc1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTsvL2NvbGxlY3QgYWxsIHRoZSBhcmd1bWVudHMsIGlmIG5lY2Vzc2FyeVxuICAgIHZhciBwbHVnQ2xhc3MgPSB0aGlzLmRhdGEoJ3pmUGx1Z2luJyk7Ly9kZXRlcm1pbmUgdGhlIGNsYXNzIG9mIHBsdWdpblxuXG4gICAgaWYocGx1Z0NsYXNzICE9PSB1bmRlZmluZWQgJiYgcGx1Z0NsYXNzW21ldGhvZF0gIT09IHVuZGVmaW5lZCl7Ly9tYWtlIHN1cmUgYm90aCB0aGUgY2xhc3MgYW5kIG1ldGhvZCBleGlzdFxuICAgICAgaWYodGhpcy5sZW5ndGggPT09IDEpey8vaWYgdGhlcmUncyBvbmx5IG9uZSwgY2FsbCBpdCBkaXJlY3RseS5cbiAgICAgICAgICBwbHVnQ2xhc3NbbWV0aG9kXS5hcHBseShwbHVnQ2xhc3MsIGFyZ3MpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHRoaXMuZWFjaChmdW5jdGlvbihpLCBlbCl7Ly9vdGhlcndpc2UgbG9vcCB0aHJvdWdoIHRoZSBqUXVlcnkgY29sbGVjdGlvbiBhbmQgaW52b2tlIHRoZSBtZXRob2Qgb24gZWFjaFxuICAgICAgICAgIHBsdWdDbGFzc1ttZXRob2RdLmFwcGx5KCQoZWwpLmRhdGEoJ3pmUGx1Z2luJyksIGFyZ3MpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9ZWxzZXsvL2Vycm9yIGZvciBubyBjbGFzcyBvciBubyBtZXRob2RcbiAgICAgIHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcIldlJ3JlIHNvcnJ5LCAnXCIgKyBtZXRob2QgKyBcIicgaXMgbm90IGFuIGF2YWlsYWJsZSBtZXRob2QgZm9yIFwiICsgKHBsdWdDbGFzcyA/IGZ1bmN0aW9uTmFtZShwbHVnQ2xhc3MpIDogJ3RoaXMgZWxlbWVudCcpICsgJy4nKTtcbiAgICB9XG4gIH1lbHNley8vZXJyb3IgZm9yIGludmFsaWQgYXJndW1lbnQgdHlwZVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFdlJ3JlIHNvcnJ5LCAke3R5cGV9IGlzIG5vdCBhIHZhbGlkIHBhcmFtZXRlci4gWW91IG11c3QgdXNlIGEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgbWV0aG9kIHlvdSB3aXNoIHRvIGludm9rZS5gKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbndpbmRvdy5Gb3VuZGF0aW9uID0gRm91bmRhdGlvbjtcbiQuZm4uZm91bmRhdGlvbiA9IGZvdW5kYXRpb247XG5cbi8vIFBvbHlmaWxsIGZvciByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbihmdW5jdGlvbigpIHtcbiAgaWYgKCFEYXRlLm5vdyB8fCAhd2luZG93LkRhdGUubm93KVxuICAgIHdpbmRvdy5EYXRlLm5vdyA9IERhdGUubm93ID0gZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcblxuICB2YXIgdmVuZG9ycyA9IFsnd2Via2l0JywgJ21veiddO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHZlbmRvcnMubGVuZ3RoICYmICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK2kpIHtcbiAgICAgIHZhciB2cCA9IHZlbmRvcnNbaV07XG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZwKydSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9ICh3aW5kb3dbdnArJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHdpbmRvd1t2cCsnQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ10pO1xuICB9XG4gIGlmICgvaVAoYWR8aG9uZXxvZCkuKk9TIDYvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpXG4gICAgfHwgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgIXdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSkge1xuICAgIHZhciBsYXN0VGltZSA9IDA7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICB2YXIgbmV4dFRpbWUgPSBNYXRoLm1heChsYXN0VGltZSArIDE2LCBub3cpO1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2sobGFzdFRpbWUgPSBuZXh0VGltZSk7IH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5leHRUaW1lIC0gbm93KTtcbiAgICB9O1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGNsZWFyVGltZW91dDtcbiAgfVxuICAvKipcbiAgICogUG9seWZpbGwgZm9yIHBlcmZvcm1hbmNlLm5vdywgcmVxdWlyZWQgYnkgckFGXG4gICAqL1xuICBpZighd2luZG93LnBlcmZvcm1hbmNlIHx8ICF3aW5kb3cucGVyZm9ybWFuY2Uubm93KXtcbiAgICB3aW5kb3cucGVyZm9ybWFuY2UgPSB7XG4gICAgICBzdGFydDogRGF0ZS5ub3coKSxcbiAgICAgIG5vdzogZnVuY3Rpb24oKXsgcmV0dXJuIERhdGUubm93KCkgLSB0aGlzLnN0YXJ0OyB9XG4gICAgfTtcbiAgfVxufSkoKTtcbmlmICghRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQpIHtcbiAgRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbihvVGhpcykge1xuICAgIGlmICh0eXBlb2YgdGhpcyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgLy8gY2xvc2VzdCB0aGluZyBwb3NzaWJsZSB0byB0aGUgRUNNQVNjcmlwdCA1XG4gICAgICAvLyBpbnRlcm5hbCBJc0NhbGxhYmxlIGZ1bmN0aW9uXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdGdW5jdGlvbi5wcm90b3R5cGUuYmluZCAtIHdoYXQgaXMgdHJ5aW5nIHRvIGJlIGJvdW5kIGlzIG5vdCBjYWxsYWJsZScpO1xuICAgIH1cblxuICAgIHZhciBhQXJncyAgID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSxcbiAgICAgICAgZlRvQmluZCA9IHRoaXMsXG4gICAgICAgIGZOT1AgICAgPSBmdW5jdGlvbigpIHt9LFxuICAgICAgICBmQm91bmQgID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIGZUb0JpbmQuYXBwbHkodGhpcyBpbnN0YW5jZW9mIGZOT1BcbiAgICAgICAgICAgICAgICAgPyB0aGlzXG4gICAgICAgICAgICAgICAgIDogb1RoaXMsXG4gICAgICAgICAgICAgICAgIGFBcmdzLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgICAgIH07XG5cbiAgICBpZiAodGhpcy5wcm90b3R5cGUpIHtcbiAgICAgIC8vIG5hdGl2ZSBmdW5jdGlvbnMgZG9uJ3QgaGF2ZSBhIHByb3RvdHlwZVxuICAgICAgZk5PUC5wcm90b3R5cGUgPSB0aGlzLnByb3RvdHlwZTtcbiAgICB9XG4gICAgZkJvdW5kLnByb3RvdHlwZSA9IG5ldyBmTk9QKCk7XG5cbiAgICByZXR1cm4gZkJvdW5kO1xuICB9O1xufVxuLy8gUG9seWZpbGwgdG8gZ2V0IHRoZSBuYW1lIG9mIGEgZnVuY3Rpb24gaW4gSUU5XG5mdW5jdGlvbiBmdW5jdGlvbk5hbWUoZm4pIHtcbiAgaWYgKEZ1bmN0aW9uLnByb3RvdHlwZS5uYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgZnVuY05hbWVSZWdleCA9IC9mdW5jdGlvblxccyhbXihdezEsfSlcXCgvO1xuICAgIHZhciByZXN1bHRzID0gKGZ1bmNOYW1lUmVnZXgpLmV4ZWMoKGZuKS50b1N0cmluZygpKTtcbiAgICByZXR1cm4gKHJlc3VsdHMgJiYgcmVzdWx0cy5sZW5ndGggPiAxKSA/IHJlc3VsdHNbMV0udHJpbSgpIDogXCJcIjtcbiAgfVxuICBlbHNlIGlmIChmbi5wcm90b3R5cGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBmbi5jb25zdHJ1Y3Rvci5uYW1lO1xuICB9XG4gIGVsc2Uge1xuICAgIHJldHVybiBmbi5wcm90b3R5cGUuY29uc3RydWN0b3IubmFtZTtcbiAgfVxufVxuZnVuY3Rpb24gcGFyc2VWYWx1ZShzdHIpe1xuICBpZiAoJ3RydWUnID09PSBzdHIpIHJldHVybiB0cnVlO1xuICBlbHNlIGlmICgnZmFsc2UnID09PSBzdHIpIHJldHVybiBmYWxzZTtcbiAgZWxzZSBpZiAoIWlzTmFOKHN0ciAqIDEpKSByZXR1cm4gcGFyc2VGbG9hdChzdHIpO1xuICByZXR1cm4gc3RyO1xufVxuLy8gQ29udmVydCBQYXNjYWxDYXNlIHRvIGtlYmFiLWNhc2Vcbi8vIFRoYW5rIHlvdTogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvODk1NTU4MFxuZnVuY3Rpb24gaHlwaGVuYXRlKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoLyhbYS16XSkoW0EtWl0pL2csICckMS0kMicpLnRvTG93ZXJDYXNlKCk7XG59XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuRm91bmRhdGlvbi5Cb3ggPSB7XG4gIEltTm90VG91Y2hpbmdZb3U6IEltTm90VG91Y2hpbmdZb3UsXG4gIEdldERpbWVuc2lvbnM6IEdldERpbWVuc2lvbnMsXG4gIEdldE9mZnNldHM6IEdldE9mZnNldHNcbn1cblxuLyoqXG4gKiBDb21wYXJlcyB0aGUgZGltZW5zaW9ucyBvZiBhbiBlbGVtZW50IHRvIGEgY29udGFpbmVyIGFuZCBkZXRlcm1pbmVzIGNvbGxpc2lvbiBldmVudHMgd2l0aCBjb250YWluZXIuXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byB0ZXN0IGZvciBjb2xsaXNpb25zLlxuICogQHBhcmFtIHtqUXVlcnl9IHBhcmVudCAtIGpRdWVyeSBvYmplY3QgdG8gdXNlIGFzIGJvdW5kaW5nIGNvbnRhaW5lci5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gbHJPbmx5IC0gc2V0IHRvIHRydWUgdG8gY2hlY2sgbGVmdCBhbmQgcmlnaHQgdmFsdWVzIG9ubHkuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHRiT25seSAtIHNldCB0byB0cnVlIHRvIGNoZWNrIHRvcCBhbmQgYm90dG9tIHZhbHVlcyBvbmx5LlxuICogQGRlZmF1bHQgaWYgbm8gcGFyZW50IG9iamVjdCBwYXNzZWQsIGRldGVjdHMgY29sbGlzaW9ucyB3aXRoIGB3aW5kb3dgLlxuICogQHJldHVybnMge0Jvb2xlYW59IC0gdHJ1ZSBpZiBjb2xsaXNpb24gZnJlZSwgZmFsc2UgaWYgYSBjb2xsaXNpb24gaW4gYW55IGRpcmVjdGlvbi5cbiAqL1xuZnVuY3Rpb24gSW1Ob3RUb3VjaGluZ1lvdShlbGVtZW50LCBwYXJlbnQsIGxyT25seSwgdGJPbmx5KSB7XG4gIHZhciBlbGVEaW1zID0gR2V0RGltZW5zaW9ucyhlbGVtZW50KSxcbiAgICAgIHRvcCwgYm90dG9tLCBsZWZ0LCByaWdodDtcblxuICBpZiAocGFyZW50KSB7XG4gICAgdmFyIHBhckRpbXMgPSBHZXREaW1lbnNpb25zKHBhcmVudCk7XG5cbiAgICBib3R0b20gPSAoZWxlRGltcy5vZmZzZXQudG9wICsgZWxlRGltcy5oZWlnaHQgPD0gcGFyRGltcy5oZWlnaHQgKyBwYXJEaW1zLm9mZnNldC50b3ApO1xuICAgIHRvcCAgICA9IChlbGVEaW1zLm9mZnNldC50b3AgPj0gcGFyRGltcy5vZmZzZXQudG9wKTtcbiAgICBsZWZ0ICAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCA+PSBwYXJEaW1zLm9mZnNldC5sZWZ0KTtcbiAgICByaWdodCAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCArIGVsZURpbXMud2lkdGggPD0gcGFyRGltcy53aWR0aCArIHBhckRpbXMub2Zmc2V0LmxlZnQpO1xuICB9XG4gIGVsc2Uge1xuICAgIGJvdHRvbSA9IChlbGVEaW1zLm9mZnNldC50b3AgKyBlbGVEaW1zLmhlaWdodCA8PSBlbGVEaW1zLndpbmRvd0RpbXMuaGVpZ2h0ICsgZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3ApO1xuICAgIHRvcCAgICA9IChlbGVEaW1zLm9mZnNldC50b3AgPj0gZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3ApO1xuICAgIGxlZnQgICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ID49IGVsZURpbXMud2luZG93RGltcy5vZmZzZXQubGVmdCk7XG4gICAgcmlnaHQgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgKyBlbGVEaW1zLndpZHRoIDw9IGVsZURpbXMud2luZG93RGltcy53aWR0aCk7XG4gIH1cblxuICB2YXIgYWxsRGlycyA9IFtib3R0b20sIHRvcCwgbGVmdCwgcmlnaHRdO1xuXG4gIGlmIChsck9ubHkpIHtcbiAgICByZXR1cm4gbGVmdCA9PT0gcmlnaHQgPT09IHRydWU7XG4gIH1cblxuICBpZiAodGJPbmx5KSB7XG4gICAgcmV0dXJuIHRvcCA9PT0gYm90dG9tID09PSB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGFsbERpcnMuaW5kZXhPZihmYWxzZSkgPT09IC0xO1xufTtcblxuLyoqXG4gKiBVc2VzIG5hdGl2ZSBtZXRob2RzIHRvIHJldHVybiBhbiBvYmplY3Qgb2YgZGltZW5zaW9uIHZhbHVlcy5cbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtqUXVlcnkgfHwgSFRNTH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3Qgb3IgRE9NIGVsZW1lbnQgZm9yIHdoaWNoIHRvIGdldCB0aGUgZGltZW5zaW9ucy4gQ2FuIGJlIGFueSBlbGVtZW50IG90aGVyIHRoYXQgZG9jdW1lbnQgb3Igd2luZG93LlxuICogQHJldHVybnMge09iamVjdH0gLSBuZXN0ZWQgb2JqZWN0IG9mIGludGVnZXIgcGl4ZWwgdmFsdWVzXG4gKiBUT0RPIC0gaWYgZWxlbWVudCBpcyB3aW5kb3csIHJldHVybiBvbmx5IHRob3NlIHZhbHVlcy5cbiAqL1xuZnVuY3Rpb24gR2V0RGltZW5zaW9ucyhlbGVtLCB0ZXN0KXtcbiAgZWxlbSA9IGVsZW0ubGVuZ3RoID8gZWxlbVswXSA6IGVsZW07XG5cbiAgaWYgKGVsZW0gPT09IHdpbmRvdyB8fCBlbGVtID09PSBkb2N1bWVudCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkknbSBzb3JyeSwgRGF2ZS4gSSdtIGFmcmFpZCBJIGNhbid0IGRvIHRoYXQuXCIpO1xuICB9XG5cbiAgdmFyIHJlY3QgPSBlbGVtLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgcGFyUmVjdCA9IGVsZW0ucGFyZW50Tm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgIHdpblJlY3QgPSBkb2N1bWVudC5ib2R5LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgd2luWSA9IHdpbmRvdy5wYWdlWU9mZnNldCxcbiAgICAgIHdpblggPSB3aW5kb3cucGFnZVhPZmZzZXQ7XG5cbiAgcmV0dXJuIHtcbiAgICB3aWR0aDogcmVjdC53aWR0aCxcbiAgICBoZWlnaHQ6IHJlY3QuaGVpZ2h0LFxuICAgIG9mZnNldDoge1xuICAgICAgdG9wOiByZWN0LnRvcCArIHdpblksXG4gICAgICBsZWZ0OiByZWN0LmxlZnQgKyB3aW5YXG4gICAgfSxcbiAgICBwYXJlbnREaW1zOiB7XG4gICAgICB3aWR0aDogcGFyUmVjdC53aWR0aCxcbiAgICAgIGhlaWdodDogcGFyUmVjdC5oZWlnaHQsXG4gICAgICBvZmZzZXQ6IHtcbiAgICAgICAgdG9wOiBwYXJSZWN0LnRvcCArIHdpblksXG4gICAgICAgIGxlZnQ6IHBhclJlY3QubGVmdCArIHdpblhcbiAgICAgIH1cbiAgICB9LFxuICAgIHdpbmRvd0RpbXM6IHtcbiAgICAgIHdpZHRoOiB3aW5SZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0OiB3aW5SZWN0LmhlaWdodCxcbiAgICAgIG9mZnNldDoge1xuICAgICAgICB0b3A6IHdpblksXG4gICAgICAgIGxlZnQ6IHdpblhcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIG9iamVjdCBvZiB0b3AgYW5kIGxlZnQgaW50ZWdlciBwaXhlbCB2YWx1ZXMgZm9yIGR5bmFtaWNhbGx5IHJlbmRlcmVkIGVsZW1lbnRzLFxuICogc3VjaCBhczogVG9vbHRpcCwgUmV2ZWFsLCBhbmQgRHJvcGRvd25cbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZWxlbWVudCBiZWluZyBwb3NpdGlvbmVkLlxuICogQHBhcmFtIHtqUXVlcnl9IGFuY2hvciAtIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50J3MgYW5jaG9yIHBvaW50LlxuICogQHBhcmFtIHtTdHJpbmd9IHBvc2l0aW9uIC0gYSBzdHJpbmcgcmVsYXRpbmcgdG8gdGhlIGRlc2lyZWQgcG9zaXRpb24gb2YgdGhlIGVsZW1lbnQsIHJlbGF0aXZlIHRvIGl0J3MgYW5jaG9yXG4gKiBAcGFyYW0ge051bWJlcn0gdk9mZnNldCAtIGludGVnZXIgcGl4ZWwgdmFsdWUgb2YgZGVzaXJlZCB2ZXJ0aWNhbCBzZXBhcmF0aW9uIGJldHdlZW4gYW5jaG9yIGFuZCBlbGVtZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9IGhPZmZzZXQgLSBpbnRlZ2VyIHBpeGVsIHZhbHVlIG9mIGRlc2lyZWQgaG9yaXpvbnRhbCBzZXBhcmF0aW9uIGJldHdlZW4gYW5jaG9yIGFuZCBlbGVtZW50LlxuICogQHBhcmFtIHtCb29sZWFufSBpc092ZXJmbG93IC0gaWYgYSBjb2xsaXNpb24gZXZlbnQgaXMgZGV0ZWN0ZWQsIHNldHMgdG8gdHJ1ZSB0byBkZWZhdWx0IHRoZSBlbGVtZW50IHRvIGZ1bGwgd2lkdGggLSBhbnkgZGVzaXJlZCBvZmZzZXQuXG4gKiBUT0RPIGFsdGVyL3Jld3JpdGUgdG8gd29yayB3aXRoIGBlbWAgdmFsdWVzIGFzIHdlbGwvaW5zdGVhZCBvZiBwaXhlbHNcbiAqL1xuZnVuY3Rpb24gR2V0T2Zmc2V0cyhlbGVtZW50LCBhbmNob3IsIHBvc2l0aW9uLCB2T2Zmc2V0LCBoT2Zmc2V0LCBpc092ZXJmbG93KSB7XG4gIHZhciAkZWxlRGltcyA9IEdldERpbWVuc2lvbnMoZWxlbWVudCksXG4gICAgICAkYW5jaG9yRGltcyA9IGFuY2hvciA/IEdldERpbWVuc2lvbnMoYW5jaG9yKSA6IG51bGw7XG5cbiAgc3dpdGNoIChwb3NpdGlvbikge1xuICAgIGNhc2UgJ3RvcCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoRm91bmRhdGlvbi5ydGwoKSA/ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gJGVsZURpbXMud2lkdGggKyAkYW5jaG9yRGltcy53aWR0aCA6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0KSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wIC0gKCRlbGVEaW1zLmhlaWdodCArIHZPZmZzZXQpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdsZWZ0JzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gKCRlbGVEaW1zLndpZHRoICsgaE9mZnNldCksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmlnaHQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAkYW5jaG9yRGltcy53aWR0aCArIGhPZmZzZXQsXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIHRvcCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAoJGFuY2hvckRpbXMud2lkdGggLyAyKSkgLSAoJGVsZURpbXMud2lkdGggLyAyKSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wIC0gKCRlbGVEaW1zLmhlaWdodCArIHZPZmZzZXQpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXIgYm90dG9tJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6IGlzT3ZlcmZsb3cgPyBoT2Zmc2V0IDogKCgkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICgkYW5jaG9yRGltcy53aWR0aCAvIDIpKSAtICgkZWxlRGltcy53aWR0aCAvIDIpKSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIGxlZnQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAoJGVsZURpbXMud2lkdGggKyBoT2Zmc2V0KSxcbiAgICAgICAgdG9wOiAoJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICgkYW5jaG9yRGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlciByaWdodCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICRhbmNob3JEaW1zLndpZHRoICsgaE9mZnNldCArIDEsXG4gICAgICAgIHRvcDogKCRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAoJGFuY2hvckRpbXMuaGVpZ2h0IC8gMikpIC0gKCRlbGVEaW1zLmhlaWdodCAvIDIpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXInOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKCRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LmxlZnQgKyAoJGVsZURpbXMud2luZG93RGltcy53aWR0aCAvIDIpKSAtICgkZWxlRGltcy53aWR0aCAvIDIpLFxuICAgICAgICB0b3A6ICgkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3AgKyAoJGVsZURpbXMud2luZG93RGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JldmVhbCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoJGVsZURpbXMud2luZG93RGltcy53aWR0aCAtICRlbGVEaW1zLndpZHRoKSAvIDIsXG4gICAgICAgIHRvcDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wICsgdk9mZnNldFxuICAgICAgfVxuICAgIGNhc2UgJ3JldmVhbCBmdWxsJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LmxlZnQsXG4gICAgICAgIHRvcDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdsZWZ0IGJvdHRvbSc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JpZ2h0IGJvdHRvbSc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICRhbmNob3JEaW1zLndpZHRoICsgaE9mZnNldCAtICRlbGVEaW1zLndpZHRoLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAkYW5jaG9yRGltcy5oZWlnaHQgKyB2T2Zmc2V0XG4gICAgICB9O1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6IChGb3VuZGF0aW9uLnJ0bCgpID8gJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAkZWxlRGltcy53aWR0aCArICRhbmNob3JEaW1zLndpZHRoIDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyBoT2Zmc2V0KSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxuICAgICAgfVxuICB9XG59XG5cbn0oalF1ZXJ5KTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogVGhpcyB1dGlsIHdhcyBjcmVhdGVkIGJ5IE1hcml1cyBPbGJlcnR6ICpcbiAqIFBsZWFzZSB0aGFuayBNYXJpdXMgb24gR2l0SHViIC9vd2xiZXJ0eiAqXG4gKiBvciB0aGUgd2ViIGh0dHA6Ly93d3cubWFyaXVzb2xiZXJ0ei5kZS8gKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuY29uc3Qga2V5Q29kZXMgPSB7XG4gIDk6ICdUQUInLFxuICAxMzogJ0VOVEVSJyxcbiAgMjc6ICdFU0NBUEUnLFxuICAzMjogJ1NQQUNFJyxcbiAgMzc6ICdBUlJPV19MRUZUJyxcbiAgMzg6ICdBUlJPV19VUCcsXG4gIDM5OiAnQVJST1dfUklHSFQnLFxuICA0MDogJ0FSUk9XX0RPV04nXG59XG5cbnZhciBjb21tYW5kcyA9IHt9XG5cbnZhciBLZXlib2FyZCA9IHtcbiAga2V5czogZ2V0S2V5Q29kZXMoa2V5Q29kZXMpLFxuXG4gIC8qKlxuICAgKiBQYXJzZXMgdGhlIChrZXlib2FyZCkgZXZlbnQgYW5kIHJldHVybnMgYSBTdHJpbmcgdGhhdCByZXByZXNlbnRzIGl0cyBrZXlcbiAgICogQ2FuIGJlIHVzZWQgbGlrZSBGb3VuZGF0aW9uLnBhcnNlS2V5KGV2ZW50KSA9PT0gRm91bmRhdGlvbi5rZXlzLlNQQUNFXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gdGhlIGV2ZW50IGdlbmVyYXRlZCBieSB0aGUgZXZlbnQgaGFuZGxlclxuICAgKiBAcmV0dXJuIFN0cmluZyBrZXkgLSBTdHJpbmcgdGhhdCByZXByZXNlbnRzIHRoZSBrZXkgcHJlc3NlZFxuICAgKi9cbiAgcGFyc2VLZXkoZXZlbnQpIHtcbiAgICB2YXIga2V5ID0ga2V5Q29kZXNbZXZlbnQud2hpY2ggfHwgZXZlbnQua2V5Q29kZV0gfHwgU3RyaW5nLmZyb21DaGFyQ29kZShldmVudC53aGljaCkudG9VcHBlckNhc2UoKTtcblxuICAgIC8vIFJlbW92ZSB1bi1wcmludGFibGUgY2hhcmFjdGVycywgZS5nLiBmb3IgYGZyb21DaGFyQ29kZWAgY2FsbHMgZm9yIENUUkwgb25seSBldmVudHNcbiAgICBrZXkgPSBrZXkucmVwbGFjZSgvXFxXKy8sICcnKTtcblxuICAgIGlmIChldmVudC5zaGlmdEtleSkga2V5ID0gYFNISUZUXyR7a2V5fWA7XG4gICAgaWYgKGV2ZW50LmN0cmxLZXkpIGtleSA9IGBDVFJMXyR7a2V5fWA7XG4gICAgaWYgKGV2ZW50LmFsdEtleSkga2V5ID0gYEFMVF8ke2tleX1gO1xuXG4gICAgLy8gUmVtb3ZlIHRyYWlsaW5nIHVuZGVyc2NvcmUsIGluIGNhc2Ugb25seSBtb2RpZmllcnMgd2VyZSB1c2VkIChlLmcuIG9ubHkgYENUUkxfQUxUYClcbiAgICBrZXkgPSBrZXkucmVwbGFjZSgvXyQvLCAnJyk7XG5cbiAgICByZXR1cm4ga2V5O1xuICB9LFxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIHRoZSBnaXZlbiAoa2V5Ym9hcmQpIGV2ZW50XG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gdGhlIGV2ZW50IGdlbmVyYXRlZCBieSB0aGUgZXZlbnQgaGFuZGxlclxuICAgKiBAcGFyYW0ge1N0cmluZ30gY29tcG9uZW50IC0gRm91bmRhdGlvbiBjb21wb25lbnQncyBuYW1lLCBlLmcuIFNsaWRlciBvciBSZXZlYWxcbiAgICogQHBhcmFtIHtPYmplY3RzfSBmdW5jdGlvbnMgLSBjb2xsZWN0aW9uIG9mIGZ1bmN0aW9ucyB0aGF0IGFyZSB0byBiZSBleGVjdXRlZFxuICAgKi9cbiAgaGFuZGxlS2V5KGV2ZW50LCBjb21wb25lbnQsIGZ1bmN0aW9ucykge1xuICAgIHZhciBjb21tYW5kTGlzdCA9IGNvbW1hbmRzW2NvbXBvbmVudF0sXG4gICAgICBrZXlDb2RlID0gdGhpcy5wYXJzZUtleShldmVudCksXG4gICAgICBjbWRzLFxuICAgICAgY29tbWFuZCxcbiAgICAgIGZuO1xuXG4gICAgaWYgKCFjb21tYW5kTGlzdCkgcmV0dXJuIGNvbnNvbGUud2FybignQ29tcG9uZW50IG5vdCBkZWZpbmVkIScpO1xuXG4gICAgaWYgKHR5cGVvZiBjb21tYW5kTGlzdC5sdHIgPT09ICd1bmRlZmluZWQnKSB7IC8vIHRoaXMgY29tcG9uZW50IGRvZXMgbm90IGRpZmZlcmVudGlhdGUgYmV0d2VlbiBsdHIgYW5kIHJ0bFxuICAgICAgICBjbWRzID0gY29tbWFuZExpc3Q7IC8vIHVzZSBwbGFpbiBsaXN0XG4gICAgfSBlbHNlIHsgLy8gbWVyZ2UgbHRyIGFuZCBydGw6IGlmIGRvY3VtZW50IGlzIHJ0bCwgcnRsIG92ZXJ3cml0ZXMgbHRyIGFuZCB2aWNlIHZlcnNhXG4gICAgICAgIGlmIChGb3VuZGF0aW9uLnJ0bCgpKSBjbWRzID0gJC5leHRlbmQoe30sIGNvbW1hbmRMaXN0Lmx0ciwgY29tbWFuZExpc3QucnRsKTtcblxuICAgICAgICBlbHNlIGNtZHMgPSAkLmV4dGVuZCh7fSwgY29tbWFuZExpc3QucnRsLCBjb21tYW5kTGlzdC5sdHIpO1xuICAgIH1cbiAgICBjb21tYW5kID0gY21kc1trZXlDb2RlXTtcblxuICAgIGZuID0gZnVuY3Rpb25zW2NvbW1hbmRdO1xuICAgIGlmIChmbiAmJiB0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpIHsgLy8gZXhlY3V0ZSBmdW5jdGlvbiAgaWYgZXhpc3RzXG4gICAgICB2YXIgcmV0dXJuVmFsdWUgPSBmbi5hcHBseSgpO1xuICAgICAgaWYgKGZ1bmN0aW9ucy5oYW5kbGVkIHx8IHR5cGVvZiBmdW5jdGlvbnMuaGFuZGxlZCA9PT0gJ2Z1bmN0aW9uJykgeyAvLyBleGVjdXRlIGZ1bmN0aW9uIHdoZW4gZXZlbnQgd2FzIGhhbmRsZWRcbiAgICAgICAgICBmdW5jdGlvbnMuaGFuZGxlZChyZXR1cm5WYWx1ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChmdW5jdGlvbnMudW5oYW5kbGVkIHx8IHR5cGVvZiBmdW5jdGlvbnMudW5oYW5kbGVkID09PSAnZnVuY3Rpb24nKSB7IC8vIGV4ZWN1dGUgZnVuY3Rpb24gd2hlbiBldmVudCB3YXMgbm90IGhhbmRsZWRcbiAgICAgICAgICBmdW5jdGlvbnMudW5oYW5kbGVkKCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBGaW5kcyBhbGwgZm9jdXNhYmxlIGVsZW1lbnRzIHdpdGhpbiB0aGUgZ2l2ZW4gYCRlbGVtZW50YFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHNlYXJjaCB3aXRoaW5cbiAgICogQHJldHVybiB7alF1ZXJ5fSAkZm9jdXNhYmxlIC0gYWxsIGZvY3VzYWJsZSBlbGVtZW50cyB3aXRoaW4gYCRlbGVtZW50YFxuICAgKi9cbiAgZmluZEZvY3VzYWJsZSgkZWxlbWVudCkge1xuICAgIGlmKCEkZWxlbWVudCkge3JldHVybiBmYWxzZTsgfVxuICAgIHJldHVybiAkZWxlbWVudC5maW5kKCdhW2hyZWZdLCBhcmVhW2hyZWZdLCBpbnB1dDpub3QoW2Rpc2FibGVkXSksIHNlbGVjdDpub3QoW2Rpc2FibGVkXSksIHRleHRhcmVhOm5vdChbZGlzYWJsZWRdKSwgYnV0dG9uOm5vdChbZGlzYWJsZWRdKSwgaWZyYW1lLCBvYmplY3QsIGVtYmVkLCAqW3RhYmluZGV4XSwgKltjb250ZW50ZWRpdGFibGVdJykuZmlsdGVyKGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCEkKHRoaXMpLmlzKCc6dmlzaWJsZScpIHx8ICQodGhpcykuYXR0cigndGFiaW5kZXgnKSA8IDApIHsgcmV0dXJuIGZhbHNlOyB9IC8vb25seSBoYXZlIHZpc2libGUgZWxlbWVudHMgYW5kIHRob3NlIHRoYXQgaGF2ZSBhIHRhYmluZGV4IGdyZWF0ZXIgb3IgZXF1YWwgMFxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGNvbXBvbmVudCBuYW1lIG5hbWVcbiAgICogQHBhcmFtIHtPYmplY3R9IGNvbXBvbmVudCAtIEZvdW5kYXRpb24gY29tcG9uZW50LCBlLmcuIFNsaWRlciBvciBSZXZlYWxcbiAgICogQHJldHVybiBTdHJpbmcgY29tcG9uZW50TmFtZVxuICAgKi9cblxuICByZWdpc3Rlcihjb21wb25lbnROYW1lLCBjbWRzKSB7XG4gICAgY29tbWFuZHNbY29tcG9uZW50TmFtZV0gPSBjbWRzO1xuICB9LCAgXG5cbiAgLyoqXG4gICAqIFRyYXBzIHRoZSBmb2N1cyBpbiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICogQHBhcmFtICB7alF1ZXJ5fSAkZWxlbWVudCAgalF1ZXJ5IG9iamVjdCB0byB0cmFwIHRoZSBmb3VjcyBpbnRvLlxuICAgKi9cbiAgdHJhcEZvY3VzKCRlbGVtZW50KSB7XG4gICAgdmFyICRmb2N1c2FibGUgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUoJGVsZW1lbnQpLFxuICAgICAgICAkZmlyc3RGb2N1c2FibGUgPSAkZm9jdXNhYmxlLmVxKDApLFxuICAgICAgICAkbGFzdEZvY3VzYWJsZSA9ICRmb2N1c2FibGUuZXEoLTEpO1xuXG4gICAgJGVsZW1lbnQub24oJ2tleWRvd24uemYudHJhcGZvY3VzJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIGlmIChldmVudC50YXJnZXQgPT09ICRsYXN0Rm9jdXNhYmxlWzBdICYmIEZvdW5kYXRpb24uS2V5Ym9hcmQucGFyc2VLZXkoZXZlbnQpID09PSAnVEFCJykge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAkZmlyc3RGb2N1c2FibGUuZm9jdXMoKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGV2ZW50LnRhcmdldCA9PT0gJGZpcnN0Rm9jdXNhYmxlWzBdICYmIEZvdW5kYXRpb24uS2V5Ym9hcmQucGFyc2VLZXkoZXZlbnQpID09PSAnU0hJRlRfVEFCJykge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAkbGFzdEZvY3VzYWJsZS5mb2N1cygpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICAvKipcbiAgICogUmVsZWFzZXMgdGhlIHRyYXBwZWQgZm9jdXMgZnJvbSB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICogQHBhcmFtICB7alF1ZXJ5fSAkZWxlbWVudCAgalF1ZXJ5IG9iamVjdCB0byByZWxlYXNlIHRoZSBmb2N1cyBmb3IuXG4gICAqL1xuICByZWxlYXNlRm9jdXMoJGVsZW1lbnQpIHtcbiAgICAkZWxlbWVudC5vZmYoJ2tleWRvd24uemYudHJhcGZvY3VzJyk7XG4gIH1cbn1cblxuLypcbiAqIENvbnN0YW50cyBmb3IgZWFzaWVyIGNvbXBhcmluZy5cbiAqIENhbiBiZSB1c2VkIGxpa2UgRm91bmRhdGlvbi5wYXJzZUtleShldmVudCkgPT09IEZvdW5kYXRpb24ua2V5cy5TUEFDRVxuICovXG5mdW5jdGlvbiBnZXRLZXlDb2RlcyhrY3MpIHtcbiAgdmFyIGsgPSB7fTtcbiAgZm9yICh2YXIga2MgaW4ga2NzKSBrW2tjc1trY11dID0ga2NzW2tjXTtcbiAgcmV0dXJuIGs7XG59XG5cbkZvdW5kYXRpb24uS2V5Ym9hcmQgPSBLZXlib2FyZDtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vLyBEZWZhdWx0IHNldCBvZiBtZWRpYSBxdWVyaWVzXG5jb25zdCBkZWZhdWx0UXVlcmllcyA9IHtcbiAgJ2RlZmF1bHQnIDogJ29ubHkgc2NyZWVuJyxcbiAgbGFuZHNjYXBlIDogJ29ubHkgc2NyZWVuIGFuZCAob3JpZW50YXRpb246IGxhbmRzY2FwZSknLFxuICBwb3J0cmFpdCA6ICdvbmx5IHNjcmVlbiBhbmQgKG9yaWVudGF0aW9uOiBwb3J0cmFpdCknLFxuICByZXRpbmEgOiAnb25seSBzY3JlZW4gYW5kICgtd2Via2l0LW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi0tbW96LWRldmljZS1waXhlbC1yYXRpbzogMiksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAoLW8tbWluLWRldmljZS1waXhlbC1yYXRpbzogMi8xKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMTkyZHBpKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMmRwcHgpJ1xufTtcblxudmFyIE1lZGlhUXVlcnkgPSB7XG4gIHF1ZXJpZXM6IFtdLFxuXG4gIGN1cnJlbnQ6ICcnLFxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgbWVkaWEgcXVlcnkgaGVscGVyLCBieSBleHRyYWN0aW5nIHRoZSBicmVha3BvaW50IGxpc3QgZnJvbSB0aGUgQ1NTIGFuZCBhY3RpdmF0aW5nIHRoZSBicmVha3BvaW50IHdhdGNoZXIuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBleHRyYWN0ZWRTdHlsZXMgPSAkKCcuZm91bmRhdGlvbi1tcScpLmNzcygnZm9udC1mYW1pbHknKTtcbiAgICB2YXIgbmFtZWRRdWVyaWVzO1xuXG4gICAgbmFtZWRRdWVyaWVzID0gcGFyc2VTdHlsZVRvT2JqZWN0KGV4dHJhY3RlZFN0eWxlcyk7XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gbmFtZWRRdWVyaWVzKSB7XG4gICAgICBpZihuYW1lZFF1ZXJpZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBzZWxmLnF1ZXJpZXMucHVzaCh7XG4gICAgICAgICAgbmFtZToga2V5LFxuICAgICAgICAgIHZhbHVlOiBgb25seSBzY3JlZW4gYW5kIChtaW4td2lkdGg6ICR7bmFtZWRRdWVyaWVzW2tleV19KWBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jdXJyZW50ID0gdGhpcy5fZ2V0Q3VycmVudFNpemUoKTtcblxuICAgIHRoaXMuX3dhdGNoZXIoKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSBzY3JlZW4gaXMgYXQgbGVhc3QgYXMgd2lkZSBhcyBhIGJyZWFrcG9pbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2l6ZSAtIE5hbWUgb2YgdGhlIGJyZWFrcG9pbnQgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBgdHJ1ZWAgaWYgdGhlIGJyZWFrcG9pbnQgbWF0Y2hlcywgYGZhbHNlYCBpZiBpdCdzIHNtYWxsZXIuXG4gICAqL1xuICBhdExlYXN0KHNpemUpIHtcbiAgICB2YXIgcXVlcnkgPSB0aGlzLmdldChzaXplKTtcblxuICAgIGlmIChxdWVyeSkge1xuICAgICAgcmV0dXJuIHdpbmRvdy5tYXRjaE1lZGlhKHF1ZXJ5KS5tYXRjaGVzO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSBzY3JlZW4gbWF0Y2hlcyB0byBhIGJyZWFrcG9pbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2l6ZSAtIE5hbWUgb2YgdGhlIGJyZWFrcG9pbnQgdG8gY2hlY2ssIGVpdGhlciAnc21hbGwgb25seScgb3IgJ3NtYWxsJy4gT21pdHRpbmcgJ29ubHknIGZhbGxzIGJhY2sgdG8gdXNpbmcgYXRMZWFzdCgpIG1ldGhvZC5cbiAgICogQHJldHVybnMge0Jvb2xlYW59IGB0cnVlYCBpZiB0aGUgYnJlYWtwb2ludCBtYXRjaGVzLCBgZmFsc2VgIGlmIGl0IGRvZXMgbm90LlxuICAgKi9cbiAgaXMoc2l6ZSkge1xuICAgIHNpemUgPSBzaXplLnRyaW0oKS5zcGxpdCgnICcpO1xuICAgIGlmKHNpemUubGVuZ3RoID4gMSAmJiBzaXplWzFdID09PSAnb25seScpIHtcbiAgICAgIGlmKHNpemVbMF0gPT09IHRoaXMuX2dldEN1cnJlbnRTaXplKCkpIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5hdExlYXN0KHNpemVbMF0pO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIG1lZGlhIHF1ZXJ5IG9mIGEgYnJlYWtwb2ludC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzaXplIC0gTmFtZSBvZiB0aGUgYnJlYWtwb2ludCB0byBnZXQuXG4gICAqIEByZXR1cm5zIHtTdHJpbmd8bnVsbH0gLSBUaGUgbWVkaWEgcXVlcnkgb2YgdGhlIGJyZWFrcG9pbnQsIG9yIGBudWxsYCBpZiB0aGUgYnJlYWtwb2ludCBkb2Vzbid0IGV4aXN0LlxuICAgKi9cbiAgZ2V0KHNpemUpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMucXVlcmllcykge1xuICAgICAgaWYodGhpcy5xdWVyaWVzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgIHZhciBxdWVyeSA9IHRoaXMucXVlcmllc1tpXTtcbiAgICAgICAgaWYgKHNpemUgPT09IHF1ZXJ5Lm5hbWUpIHJldHVybiBxdWVyeS52YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgY3VycmVudCBicmVha3BvaW50IG5hbWUgYnkgdGVzdGluZyBldmVyeSBicmVha3BvaW50IGFuZCByZXR1cm5pbmcgdGhlIGxhc3Qgb25lIHRvIG1hdGNoICh0aGUgYmlnZ2VzdCBvbmUpLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHJldHVybnMge1N0cmluZ30gTmFtZSBvZiB0aGUgY3VycmVudCBicmVha3BvaW50LlxuICAgKi9cbiAgX2dldEN1cnJlbnRTaXplKCkge1xuICAgIHZhciBtYXRjaGVkO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnF1ZXJpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBxdWVyeSA9IHRoaXMucXVlcmllc1tpXTtcblxuICAgICAgaWYgKHdpbmRvdy5tYXRjaE1lZGlhKHF1ZXJ5LnZhbHVlKS5tYXRjaGVzKSB7XG4gICAgICAgIG1hdGNoZWQgPSBxdWVyeTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG1hdGNoZWQgPT09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gbWF0Y2hlZC5uYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbWF0Y2hlZDtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFjdGl2YXRlcyB0aGUgYnJlYWtwb2ludCB3YXRjaGVyLCB3aGljaCBmaXJlcyBhbiBldmVudCBvbiB0aGUgd2luZG93IHdoZW5ldmVyIHRoZSBicmVha3BvaW50IGNoYW5nZXMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3dhdGNoZXIoKSB7XG4gICAgJCh3aW5kb3cpLm9uKCdyZXNpemUuemYubWVkaWFxdWVyeScsICgpID0+IHtcbiAgICAgIHZhciBuZXdTaXplID0gdGhpcy5fZ2V0Q3VycmVudFNpemUoKSwgY3VycmVudFNpemUgPSB0aGlzLmN1cnJlbnQ7XG5cbiAgICAgIGlmIChuZXdTaXplICE9PSBjdXJyZW50U2l6ZSkge1xuICAgICAgICAvLyBDaGFuZ2UgdGhlIGN1cnJlbnQgbWVkaWEgcXVlcnlcbiAgICAgICAgdGhpcy5jdXJyZW50ID0gbmV3U2l6ZTtcblxuICAgICAgICAvLyBCcm9hZGNhc3QgdGhlIG1lZGlhIHF1ZXJ5IGNoYW5nZSBvbiB0aGUgd2luZG93XG4gICAgICAgICQod2luZG93KS50cmlnZ2VyKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCBbbmV3U2l6ZSwgY3VycmVudFNpemVdKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufTtcblxuRm91bmRhdGlvbi5NZWRpYVF1ZXJ5ID0gTWVkaWFRdWVyeTtcblxuLy8gbWF0Y2hNZWRpYSgpIHBvbHlmaWxsIC0gVGVzdCBhIENTUyBtZWRpYSB0eXBlL3F1ZXJ5IGluIEpTLlxuLy8gQXV0aG9ycyAmIGNvcHlyaWdodCAoYykgMjAxMjogU2NvdHQgSmVobCwgUGF1bCBJcmlzaCwgTmljaG9sYXMgWmFrYXMsIERhdmlkIEtuaWdodC4gRHVhbCBNSVQvQlNEIGxpY2Vuc2VcbndpbmRvdy5tYXRjaE1lZGlhIHx8ICh3aW5kb3cubWF0Y2hNZWRpYSA9IGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gRm9yIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBtYXRjaE1lZGl1bSBhcGkgc3VjaCBhcyBJRSA5IGFuZCB3ZWJraXRcbiAgdmFyIHN0eWxlTWVkaWEgPSAod2luZG93LnN0eWxlTWVkaWEgfHwgd2luZG93Lm1lZGlhKTtcblxuICAvLyBGb3IgdGhvc2UgdGhhdCBkb24ndCBzdXBwb3J0IG1hdGNoTWVkaXVtXG4gIGlmICghc3R5bGVNZWRpYSkge1xuICAgIHZhciBzdHlsZSAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKSxcbiAgICBzY3JpcHQgICAgICA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKVswXSxcbiAgICBpbmZvICAgICAgICA9IG51bGw7XG5cbiAgICBzdHlsZS50eXBlICA9ICd0ZXh0L2Nzcyc7XG4gICAgc3R5bGUuaWQgICAgPSAnbWF0Y2htZWRpYWpzLXRlc3QnO1xuXG4gICAgc2NyaXB0ICYmIHNjcmlwdC5wYXJlbnROb2RlICYmIHNjcmlwdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShzdHlsZSwgc2NyaXB0KTtcblxuICAgIC8vICdzdHlsZS5jdXJyZW50U3R5bGUnIGlzIHVzZWQgYnkgSUUgPD0gOCBhbmQgJ3dpbmRvdy5nZXRDb21wdXRlZFN0eWxlJyBmb3IgYWxsIG90aGVyIGJyb3dzZXJzXG4gICAgaW5mbyA9ICgnZ2V0Q29tcHV0ZWRTdHlsZScgaW4gd2luZG93KSAmJiB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShzdHlsZSwgbnVsbCkgfHwgc3R5bGUuY3VycmVudFN0eWxlO1xuXG4gICAgc3R5bGVNZWRpYSA9IHtcbiAgICAgIG1hdGNoTWVkaXVtKG1lZGlhKSB7XG4gICAgICAgIHZhciB0ZXh0ID0gYEBtZWRpYSAke21lZGlhfXsgI21hdGNobWVkaWFqcy10ZXN0IHsgd2lkdGg6IDFweDsgfSB9YDtcblxuICAgICAgICAvLyAnc3R5bGUuc3R5bGVTaGVldCcgaXMgdXNlZCBieSBJRSA8PSA4IGFuZCAnc3R5bGUudGV4dENvbnRlbnQnIGZvciBhbGwgb3RoZXIgYnJvd3NlcnNcbiAgICAgICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSB0ZXh0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0eWxlLnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlc3QgaWYgbWVkaWEgcXVlcnkgaXMgdHJ1ZSBvciBmYWxzZVxuICAgICAgICByZXR1cm4gaW5mby53aWR0aCA9PT0gJzFweCc7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKG1lZGlhKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG1hdGNoZXM6IHN0eWxlTWVkaWEubWF0Y2hNZWRpdW0obWVkaWEgfHwgJ2FsbCcpLFxuICAgICAgbWVkaWE6IG1lZGlhIHx8ICdhbGwnXG4gICAgfTtcbiAgfVxufSgpKTtcblxuLy8gVGhhbmsgeW91OiBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL3F1ZXJ5LXN0cmluZ1xuZnVuY3Rpb24gcGFyc2VTdHlsZVRvT2JqZWN0KHN0cikge1xuICB2YXIgc3R5bGVPYmplY3QgPSB7fTtcblxuICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gc3R5bGVPYmplY3Q7XG4gIH1cblxuICBzdHIgPSBzdHIudHJpbSgpLnNsaWNlKDEsIC0xKTsgLy8gYnJvd3NlcnMgcmUtcXVvdGUgc3RyaW5nIHN0eWxlIHZhbHVlc1xuXG4gIGlmICghc3RyKSB7XG4gICAgcmV0dXJuIHN0eWxlT2JqZWN0O1xuICB9XG5cbiAgc3R5bGVPYmplY3QgPSBzdHIuc3BsaXQoJyYnKS5yZWR1Y2UoZnVuY3Rpb24ocmV0LCBwYXJhbSkge1xuICAgIHZhciBwYXJ0cyA9IHBhcmFtLnJlcGxhY2UoL1xcKy9nLCAnICcpLnNwbGl0KCc9Jyk7XG4gICAgdmFyIGtleSA9IHBhcnRzWzBdO1xuICAgIHZhciB2YWwgPSBwYXJ0c1sxXTtcbiAgICBrZXkgPSBkZWNvZGVVUklDb21wb25lbnQoa2V5KTtcblxuICAgIC8vIG1pc3NpbmcgYD1gIHNob3VsZCBiZSBgbnVsbGA6XG4gICAgLy8gaHR0cDovL3czLm9yZy9UUi8yMDEyL1dELXVybC0yMDEyMDUyNC8jY29sbGVjdC11cmwtcGFyYW1ldGVyc1xuICAgIHZhbCA9IHZhbCA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGRlY29kZVVSSUNvbXBvbmVudCh2YWwpO1xuXG4gICAgaWYgKCFyZXQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgcmV0W2tleV0gPSB2YWw7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJldFtrZXldKSkge1xuICAgICAgcmV0W2tleV0ucHVzaCh2YWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXRba2V5XSA9IFtyZXRba2V5XSwgdmFsXTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfSwge30pO1xuXG4gIHJldHVybiBzdHlsZU9iamVjdDtcbn1cblxuRm91bmRhdGlvbi5NZWRpYVF1ZXJ5ID0gTWVkaWFRdWVyeTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIE1vdGlvbiBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ubW90aW9uXG4gKi9cblxuY29uc3QgaW5pdENsYXNzZXMgICA9IFsnbXVpLWVudGVyJywgJ211aS1sZWF2ZSddO1xuY29uc3QgYWN0aXZlQ2xhc3NlcyA9IFsnbXVpLWVudGVyLWFjdGl2ZScsICdtdWktbGVhdmUtYWN0aXZlJ107XG5cbmNvbnN0IE1vdGlvbiA9IHtcbiAgYW5pbWF0ZUluOiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZSh0cnVlLCBlbGVtZW50LCBhbmltYXRpb24sIGNiKTtcbiAgfSxcblxuICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZShmYWxzZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH1cbn1cblxuZnVuY3Rpb24gTW92ZShkdXJhdGlvbiwgZWxlbSwgZm4pe1xuICB2YXIgYW5pbSwgcHJvZywgc3RhcnQgPSBudWxsO1xuICAvLyBjb25zb2xlLmxvZygnY2FsbGVkJyk7XG5cbiAgaWYgKGR1cmF0aW9uID09PSAwKSB7XG4gICAgZm4uYXBwbHkoZWxlbSk7XG4gICAgZWxlbS50cmlnZ2VyKCdmaW5pc2hlZC56Zi5hbmltYXRlJywgW2VsZW1dKS50cmlnZ2VySGFuZGxlcignZmluaXNoZWQuemYuYW5pbWF0ZScsIFtlbGVtXSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZnVuY3Rpb24gbW92ZSh0cyl7XG4gICAgaWYoIXN0YXJ0KSBzdGFydCA9IHRzO1xuICAgIC8vIGNvbnNvbGUubG9nKHN0YXJ0LCB0cyk7XG4gICAgcHJvZyA9IHRzIC0gc3RhcnQ7XG4gICAgZm4uYXBwbHkoZWxlbSk7XG5cbiAgICBpZihwcm9nIDwgZHVyYXRpb24peyBhbmltID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShtb3ZlLCBlbGVtKTsgfVxuICAgIGVsc2V7XG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoYW5pbSk7XG4gICAgICBlbGVtLnRyaWdnZXIoJ2ZpbmlzaGVkLnpmLmFuaW1hdGUnLCBbZWxlbV0pLnRyaWdnZXJIYW5kbGVyKCdmaW5pc2hlZC56Zi5hbmltYXRlJywgW2VsZW1dKTtcbiAgICB9XG4gIH1cbiAgYW5pbSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUobW92ZSk7XG59XG5cbi8qKlxuICogQW5pbWF0ZXMgYW4gZWxlbWVudCBpbiBvciBvdXQgdXNpbmcgYSBDU1MgdHJhbnNpdGlvbiBjbGFzcy5cbiAqIEBmdW5jdGlvblxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNJbiAtIERlZmluZXMgaWYgdGhlIGFuaW1hdGlvbiBpcyBpbiBvciBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvciBIVE1MIG9iamVjdCB0byBhbmltYXRlLlxuICogQHBhcmFtIHtTdHJpbmd9IGFuaW1hdGlvbiAtIENTUyBjbGFzcyB0byB1c2UuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIENhbGxiYWNrIHRvIHJ1biB3aGVuIGFuaW1hdGlvbiBpcyBmaW5pc2hlZC5cbiAqL1xuZnVuY3Rpb24gYW5pbWF0ZShpc0luLCBlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gIGVsZW1lbnQgPSAkKGVsZW1lbnQpLmVxKDApO1xuXG4gIGlmICghZWxlbWVudC5sZW5ndGgpIHJldHVybjtcblxuICB2YXIgaW5pdENsYXNzID0gaXNJbiA/IGluaXRDbGFzc2VzWzBdIDogaW5pdENsYXNzZXNbMV07XG4gIHZhciBhY3RpdmVDbGFzcyA9IGlzSW4gPyBhY3RpdmVDbGFzc2VzWzBdIDogYWN0aXZlQ2xhc3Nlc1sxXTtcblxuICAvLyBTZXQgdXAgdGhlIGFuaW1hdGlvblxuICByZXNldCgpO1xuXG4gIGVsZW1lbnRcbiAgICAuYWRkQ2xhc3MoYW5pbWF0aW9uKVxuICAgIC5jc3MoJ3RyYW5zaXRpb24nLCAnbm9uZScpO1xuXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgZWxlbWVudC5hZGRDbGFzcyhpbml0Q2xhc3MpO1xuICAgIGlmIChpc0luKSBlbGVtZW50LnNob3coKTtcbiAgfSk7XG5cbiAgLy8gU3RhcnQgdGhlIGFuaW1hdGlvblxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgIGVsZW1lbnRbMF0ub2Zmc2V0V2lkdGg7XG4gICAgZWxlbWVudFxuICAgICAgLmNzcygndHJhbnNpdGlvbicsICcnKVxuICAgICAgLmFkZENsYXNzKGFjdGl2ZUNsYXNzKTtcbiAgfSk7XG5cbiAgLy8gQ2xlYW4gdXAgdGhlIGFuaW1hdGlvbiB3aGVuIGl0IGZpbmlzaGVzXG4gIGVsZW1lbnQub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZChlbGVtZW50KSwgZmluaXNoKTtcblxuICAvLyBIaWRlcyB0aGUgZWxlbWVudCAoZm9yIG91dCBhbmltYXRpb25zKSwgcmVzZXRzIHRoZSBlbGVtZW50LCBhbmQgcnVucyBhIGNhbGxiYWNrXG4gIGZ1bmN0aW9uIGZpbmlzaCgpIHtcbiAgICBpZiAoIWlzSW4pIGVsZW1lbnQuaGlkZSgpO1xuICAgIHJlc2V0KCk7XG4gICAgaWYgKGNiKSBjYi5hcHBseShlbGVtZW50KTtcbiAgfVxuXG4gIC8vIFJlc2V0cyB0cmFuc2l0aW9ucyBhbmQgcmVtb3ZlcyBtb3Rpb24tc3BlY2lmaWMgY2xhc3Nlc1xuICBmdW5jdGlvbiByZXNldCgpIHtcbiAgICBlbGVtZW50WzBdLnN0eWxlLnRyYW5zaXRpb25EdXJhdGlvbiA9IDA7XG4gICAgZWxlbWVudC5yZW1vdmVDbGFzcyhgJHtpbml0Q2xhc3N9ICR7YWN0aXZlQ2xhc3N9ICR7YW5pbWF0aW9ufWApO1xuICB9XG59XG5cbkZvdW5kYXRpb24uTW92ZSA9IE1vdmU7XG5Gb3VuZGF0aW9uLk1vdGlvbiA9IE1vdGlvbjtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5jb25zdCBOZXN0ID0ge1xuICBGZWF0aGVyKG1lbnUsIHR5cGUgPSAnemYnKSB7XG4gICAgbWVudS5hdHRyKCdyb2xlJywgJ21lbnViYXInKTtcblxuICAgIHZhciBpdGVtcyA9IG1lbnUuZmluZCgnbGknKS5hdHRyKHsncm9sZSc6ICdtZW51aXRlbSd9KSxcbiAgICAgICAgc3ViTWVudUNsYXNzID0gYGlzLSR7dHlwZX0tc3VibWVudWAsXG4gICAgICAgIHN1Ykl0ZW1DbGFzcyA9IGAke3N1Yk1lbnVDbGFzc30taXRlbWAsXG4gICAgICAgIGhhc1N1YkNsYXNzID0gYGlzLSR7dHlwZX0tc3VibWVudS1wYXJlbnRgO1xuXG4gICAgaXRlbXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIHZhciAkaXRlbSA9ICQodGhpcyksXG4gICAgICAgICAgJHN1YiA9ICRpdGVtLmNoaWxkcmVuKCd1bCcpO1xuXG4gICAgICBpZiAoJHN1Yi5sZW5ndGgpIHtcbiAgICAgICAgJGl0ZW1cbiAgICAgICAgICAuYWRkQ2xhc3MoaGFzU3ViQ2xhc3MpXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2FyaWEtaGFzcG9wdXAnOiB0cnVlLFxuICAgICAgICAgICAgJ2FyaWEtbGFiZWwnOiAkaXRlbS5jaGlsZHJlbignYTpmaXJzdCcpLnRleHQoKVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIC8vIE5vdGU6ICBEcmlsbGRvd25zIGJlaGF2ZSBkaWZmZXJlbnRseSBpbiBob3cgdGhleSBoaWRlLCBhbmQgc28gbmVlZFxuICAgICAgICAgIC8vIGFkZGl0aW9uYWwgYXR0cmlidXRlcy4gIFdlIHNob3VsZCBsb29rIGlmIHRoaXMgcG9zc2libHkgb3Zlci1nZW5lcmFsaXplZFxuICAgICAgICAgIC8vIHV0aWxpdHkgKE5lc3QpIGlzIGFwcHJvcHJpYXRlIHdoZW4gd2UgcmV3b3JrIG1lbnVzIGluIDYuNFxuICAgICAgICAgIGlmKHR5cGUgPT09ICdkcmlsbGRvd24nKSB7XG4gICAgICAgICAgICAkaXRlbS5hdHRyKHsnYXJpYS1leHBhbmRlZCc6IGZhbHNlfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICRzdWJcbiAgICAgICAgICAuYWRkQ2xhc3MoYHN1Ym1lbnUgJHtzdWJNZW51Q2xhc3N9YClcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnZGF0YS1zdWJtZW51JzogJycsXG4gICAgICAgICAgICAncm9sZSc6ICdtZW51J1xuICAgICAgICAgIH0pO1xuICAgICAgICBpZih0eXBlID09PSAnZHJpbGxkb3duJykge1xuICAgICAgICAgICRzdWIuYXR0cih7J2FyaWEtaGlkZGVuJzogdHJ1ZX0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICgkaXRlbS5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKSB7XG4gICAgICAgICRpdGVtLmFkZENsYXNzKGBpcy1zdWJtZW51LWl0ZW0gJHtzdWJJdGVtQ2xhc3N9YCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm47XG4gIH0sXG5cbiAgQnVybihtZW51LCB0eXBlKSB7XG4gICAgdmFyIC8vaXRlbXMgPSBtZW51LmZpbmQoJ2xpJyksXG4gICAgICAgIHN1Yk1lbnVDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnVgLFxuICAgICAgICBzdWJJdGVtQ2xhc3MgPSBgJHtzdWJNZW51Q2xhc3N9LWl0ZW1gLFxuICAgICAgICBoYXNTdWJDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnUtcGFyZW50YDtcblxuICAgIG1lbnVcbiAgICAgIC5maW5kKCc+bGksIC5tZW51LCAubWVudSA+IGxpJylcbiAgICAgIC5yZW1vdmVDbGFzcyhgJHtzdWJNZW51Q2xhc3N9ICR7c3ViSXRlbUNsYXNzfSAke2hhc1N1YkNsYXNzfSBpcy1zdWJtZW51LWl0ZW0gc3VibWVudSBpcy1hY3RpdmVgKVxuICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtc3VibWVudScpLmNzcygnZGlzcGxheScsICcnKTtcblxuICAgIC8vIGNvbnNvbGUubG9nKCAgICAgIG1lbnUuZmluZCgnLicgKyBzdWJNZW51Q2xhc3MgKyAnLCAuJyArIHN1Ykl0ZW1DbGFzcyArICcsIC5oYXMtc3VibWVudSwgLmlzLXN1Ym1lbnUtaXRlbSwgLnN1Ym1lbnUsIFtkYXRhLXN1Ym1lbnVdJylcbiAgICAvLyAgICAgICAgICAgLnJlbW92ZUNsYXNzKHN1Yk1lbnVDbGFzcyArICcgJyArIHN1Ykl0ZW1DbGFzcyArICcgaGFzLXN1Ym1lbnUgaXMtc3VibWVudS1pdGVtIHN1Ym1lbnUnKVxuICAgIC8vICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1zdWJtZW51JykpO1xuICAgIC8vIGl0ZW1zLmVhY2goZnVuY3Rpb24oKXtcbiAgICAvLyAgIHZhciAkaXRlbSA9ICQodGhpcyksXG4gICAgLy8gICAgICAgJHN1YiA9ICRpdGVtLmNoaWxkcmVuKCd1bCcpO1xuICAgIC8vICAgaWYoJGl0ZW0ucGFyZW50KCdbZGF0YS1zdWJtZW51XScpLmxlbmd0aCl7XG4gICAgLy8gICAgICRpdGVtLnJlbW92ZUNsYXNzKCdpcy1zdWJtZW51LWl0ZW0gJyArIHN1Ykl0ZW1DbGFzcyk7XG4gICAgLy8gICB9XG4gICAgLy8gICBpZigkc3ViLmxlbmd0aCl7XG4gICAgLy8gICAgICRpdGVtLnJlbW92ZUNsYXNzKCdoYXMtc3VibWVudScpO1xuICAgIC8vICAgICAkc3ViLnJlbW92ZUNsYXNzKCdzdWJtZW51ICcgKyBzdWJNZW51Q2xhc3MpLnJlbW92ZUF0dHIoJ2RhdGEtc3VibWVudScpO1xuICAgIC8vICAgfVxuICAgIC8vIH0pO1xuICB9XG59XG5cbkZvdW5kYXRpb24uTmVzdCA9IE5lc3Q7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuZnVuY3Rpb24gVGltZXIoZWxlbSwgb3B0aW9ucywgY2IpIHtcbiAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgIGR1cmF0aW9uID0gb3B0aW9ucy5kdXJhdGlvbiwvL29wdGlvbnMgaXMgYW4gb2JqZWN0IGZvciBlYXNpbHkgYWRkaW5nIGZlYXR1cmVzIGxhdGVyLlxuICAgICAgbmFtZVNwYWNlID0gT2JqZWN0LmtleXMoZWxlbS5kYXRhKCkpWzBdIHx8ICd0aW1lcicsXG4gICAgICByZW1haW4gPSAtMSxcbiAgICAgIHN0YXJ0LFxuICAgICAgdGltZXI7XG5cbiAgdGhpcy5pc1BhdXNlZCA9IGZhbHNlO1xuXG4gIHRoaXMucmVzdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIHJlbWFpbiA9IC0xO1xuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgdGhpcy5zdGFydCgpO1xuICB9XG5cbiAgdGhpcy5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaXNQYXVzZWQgPSBmYWxzZTtcbiAgICAvLyBpZighZWxlbS5kYXRhKCdwYXVzZWQnKSl7IHJldHVybiBmYWxzZTsgfS8vbWF5YmUgaW1wbGVtZW50IHRoaXMgc2FuaXR5IGNoZWNrIGlmIHVzZWQgZm9yIG90aGVyIHRoaW5ncy5cbiAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgIHJlbWFpbiA9IHJlbWFpbiA8PSAwID8gZHVyYXRpb24gOiByZW1haW47XG4gICAgZWxlbS5kYXRhKCdwYXVzZWQnLCBmYWxzZSk7XG4gICAgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgaWYob3B0aW9ucy5pbmZpbml0ZSl7XG4gICAgICAgIF90aGlzLnJlc3RhcnQoKTsvL3JlcnVuIHRoZSB0aW1lci5cbiAgICAgIH1cbiAgICAgIGlmIChjYiAmJiB0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpIHsgY2IoKTsgfVxuICAgIH0sIHJlbWFpbik7XG4gICAgZWxlbS50cmlnZ2VyKGB0aW1lcnN0YXJ0LnpmLiR7bmFtZVNwYWNlfWApO1xuICB9XG5cbiAgdGhpcy5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaXNQYXVzZWQgPSB0cnVlO1xuICAgIC8vaWYoZWxlbS5kYXRhKCdwYXVzZWQnKSl7IHJldHVybiBmYWxzZTsgfS8vbWF5YmUgaW1wbGVtZW50IHRoaXMgc2FuaXR5IGNoZWNrIGlmIHVzZWQgZm9yIG90aGVyIHRoaW5ncy5cbiAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgIGVsZW0uZGF0YSgncGF1c2VkJywgdHJ1ZSk7XG4gICAgdmFyIGVuZCA9IERhdGUubm93KCk7XG4gICAgcmVtYWluID0gcmVtYWluIC0gKGVuZCAtIHN0YXJ0KTtcbiAgICBlbGVtLnRyaWdnZXIoYHRpbWVycGF1c2VkLnpmLiR7bmFtZVNwYWNlfWApO1xuICB9XG59XG5cbi8qKlxuICogUnVucyBhIGNhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gaW1hZ2VzIGFyZSBmdWxseSBsb2FkZWQuXG4gKiBAcGFyYW0ge09iamVjdH0gaW1hZ2VzIC0gSW1hZ2UocykgdG8gY2hlY2sgaWYgbG9hZGVkLlxuICogQHBhcmFtIHtGdW5jfSBjYWxsYmFjayAtIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiBpbWFnZSBpcyBmdWxseSBsb2FkZWQuXG4gKi9cbmZ1bmN0aW9uIG9uSW1hZ2VzTG9hZGVkKGltYWdlcywgY2FsbGJhY2spe1xuICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICB1bmxvYWRlZCA9IGltYWdlcy5sZW5ndGg7XG5cbiAgaWYgKHVubG9hZGVkID09PSAwKSB7XG4gICAgY2FsbGJhY2soKTtcbiAgfVxuXG4gIGltYWdlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgIC8vIENoZWNrIGlmIGltYWdlIGlzIGxvYWRlZFxuICAgIGlmICh0aGlzLmNvbXBsZXRlIHx8ICh0aGlzLnJlYWR5U3RhdGUgPT09IDQpIHx8ICh0aGlzLnJlYWR5U3RhdGUgPT09ICdjb21wbGV0ZScpKSB7XG4gICAgICBzaW5nbGVJbWFnZUxvYWRlZCgpO1xuICAgIH1cbiAgICAvLyBGb3JjZSBsb2FkIHRoZSBpbWFnZVxuICAgIGVsc2Uge1xuICAgICAgLy8gZml4IGZvciBJRS4gU2VlIGh0dHBzOi8vY3NzLXRyaWNrcy5jb20vc25pcHBldHMvanF1ZXJ5L2ZpeGluZy1sb2FkLWluLWllLWZvci1jYWNoZWQtaW1hZ2VzL1xuICAgICAgdmFyIHNyYyA9ICQodGhpcykuYXR0cignc3JjJyk7XG4gICAgICAkKHRoaXMpLmF0dHIoJ3NyYycsIHNyYyArIChzcmMuaW5kZXhPZignPycpID49IDAgPyAnJicgOiAnPycpICsgKG5ldyBEYXRlKCkuZ2V0VGltZSgpKSk7XG4gICAgICAkKHRoaXMpLm9uZSgnbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzaW5nbGVJbWFnZUxvYWRlZCgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICBmdW5jdGlvbiBzaW5nbGVJbWFnZUxvYWRlZCgpIHtcbiAgICB1bmxvYWRlZC0tO1xuICAgIGlmICh1bmxvYWRlZCA9PT0gMCkge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG4gIH1cbn1cblxuRm91bmRhdGlvbi5UaW1lciA9IFRpbWVyO1xuRm91bmRhdGlvbi5vbkltYWdlc0xvYWRlZCA9IG9uSW1hZ2VzTG9hZGVkO1xuXG59KGpRdWVyeSk7XG4iLCIvLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyoqV29yayBpbnNwaXJlZCBieSBtdWx0aXBsZSBqcXVlcnkgc3dpcGUgcGx1Z2lucyoqXG4vLyoqRG9uZSBieSBZb2hhaSBBcmFyYXQgKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4oZnVuY3Rpb24oJCkge1xuXG4gICQuc3BvdFN3aXBlID0ge1xuICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgZW5hYmxlZDogJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICAgIHByZXZlbnREZWZhdWx0OiBmYWxzZSxcbiAgICBtb3ZlVGhyZXNob2xkOiA3NSxcbiAgICB0aW1lVGhyZXNob2xkOiAyMDBcbiAgfTtcblxuICB2YXIgICBzdGFydFBvc1gsXG4gICAgICAgIHN0YXJ0UG9zWSxcbiAgICAgICAgc3RhcnRUaW1lLFxuICAgICAgICBlbGFwc2VkVGltZSxcbiAgICAgICAgaXNNb3ZpbmcgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBvblRvdWNoRW5kKCkge1xuICAgIC8vICBhbGVydCh0aGlzKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIG9uVG91Y2hNb3ZlKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgb25Ub3VjaEVuZCk7XG4gICAgaXNNb3ZpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uVG91Y2hNb3ZlKGUpIHtcbiAgICBpZiAoJC5zcG90U3dpcGUucHJldmVudERlZmF1bHQpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9XG4gICAgaWYoaXNNb3ZpbmcpIHtcbiAgICAgIHZhciB4ID0gZS50b3VjaGVzWzBdLnBhZ2VYO1xuICAgICAgdmFyIHkgPSBlLnRvdWNoZXNbMF0ucGFnZVk7XG4gICAgICB2YXIgZHggPSBzdGFydFBvc1ggLSB4O1xuICAgICAgdmFyIGR5ID0gc3RhcnRQb3NZIC0geTtcbiAgICAgIHZhciBkaXI7XG4gICAgICBlbGFwc2VkVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRUaW1lO1xuICAgICAgaWYoTWF0aC5hYnMoZHgpID49ICQuc3BvdFN3aXBlLm1vdmVUaHJlc2hvbGQgJiYgZWxhcHNlZFRpbWUgPD0gJC5zcG90U3dpcGUudGltZVRocmVzaG9sZCkge1xuICAgICAgICBkaXIgPSBkeCA+IDAgPyAnbGVmdCcgOiAncmlnaHQnO1xuICAgICAgfVxuICAgICAgLy8gZWxzZSBpZihNYXRoLmFicyhkeSkgPj0gJC5zcG90U3dpcGUubW92ZVRocmVzaG9sZCAmJiBlbGFwc2VkVGltZSA8PSAkLnNwb3RTd2lwZS50aW1lVGhyZXNob2xkKSB7XG4gICAgICAvLyAgIGRpciA9IGR5ID4gMCA/ICdkb3duJyA6ICd1cCc7XG4gICAgICAvLyB9XG4gICAgICBpZihkaXIpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBvblRvdWNoRW5kLmNhbGwodGhpcyk7XG4gICAgICAgICQodGhpcykudHJpZ2dlcignc3dpcGUnLCBkaXIpLnRyaWdnZXIoYHN3aXBlJHtkaXJ9YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gb25Ub3VjaFN0YXJ0KGUpIHtcbiAgICBpZiAoZS50b3VjaGVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICBzdGFydFBvc1ggPSBlLnRvdWNoZXNbMF0ucGFnZVg7XG4gICAgICBzdGFydFBvc1kgPSBlLnRvdWNoZXNbMF0ucGFnZVk7XG4gICAgICBpc01vdmluZyA9IHRydWU7XG4gICAgICBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgb25Ub3VjaE1vdmUsIGZhbHNlKTtcbiAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBvblRvdWNoRW5kLCBmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIgJiYgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0Jywgb25Ub3VjaFN0YXJ0LCBmYWxzZSk7XG4gIH1cblxuICBmdW5jdGlvbiB0ZWFyZG93bigpIHtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBvblRvdWNoU3RhcnQpO1xuICB9XG5cbiAgJC5ldmVudC5zcGVjaWFsLnN3aXBlID0geyBzZXR1cDogaW5pdCB9O1xuXG4gICQuZWFjaChbJ2xlZnQnLCAndXAnLCAnZG93bicsICdyaWdodCddLCBmdW5jdGlvbiAoKSB7XG4gICAgJC5ldmVudC5zcGVjaWFsW2Bzd2lwZSR7dGhpc31gXSA9IHsgc2V0dXA6IGZ1bmN0aW9uKCl7XG4gICAgICAkKHRoaXMpLm9uKCdzd2lwZScsICQubm9vcCk7XG4gICAgfSB9O1xuICB9KTtcbn0pKGpRdWVyeSk7XG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTWV0aG9kIGZvciBhZGRpbmcgcHN1ZWRvIGRyYWcgZXZlbnRzIHRvIGVsZW1lbnRzICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4hZnVuY3Rpb24oJCl7XG4gICQuZm4uYWRkVG91Y2ggPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuZWFjaChmdW5jdGlvbihpLGVsKXtcbiAgICAgICQoZWwpLmJpbmQoJ3RvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJyxmdW5jdGlvbigpe1xuICAgICAgICAvL3dlIHBhc3MgdGhlIG9yaWdpbmFsIGV2ZW50IG9iamVjdCBiZWNhdXNlIHRoZSBqUXVlcnkgZXZlbnRcbiAgICAgICAgLy9vYmplY3QgaXMgbm9ybWFsaXplZCB0byB3M2Mgc3BlY3MgYW5kIGRvZXMgbm90IHByb3ZpZGUgdGhlIFRvdWNoTGlzdFxuICAgICAgICBoYW5kbGVUb3VjaChldmVudCk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHZhciBoYW5kbGVUb3VjaCA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgIHZhciB0b3VjaGVzID0gZXZlbnQuY2hhbmdlZFRvdWNoZXMsXG4gICAgICAgICAgZmlyc3QgPSB0b3VjaGVzWzBdLFxuICAgICAgICAgIGV2ZW50VHlwZXMgPSB7XG4gICAgICAgICAgICB0b3VjaHN0YXJ0OiAnbW91c2Vkb3duJyxcbiAgICAgICAgICAgIHRvdWNobW92ZTogJ21vdXNlbW92ZScsXG4gICAgICAgICAgICB0b3VjaGVuZDogJ21vdXNldXAnXG4gICAgICAgICAgfSxcbiAgICAgICAgICB0eXBlID0gZXZlbnRUeXBlc1tldmVudC50eXBlXSxcbiAgICAgICAgICBzaW11bGF0ZWRFdmVudFxuICAgICAgICA7XG5cbiAgICAgIGlmKCdNb3VzZUV2ZW50JyBpbiB3aW5kb3cgJiYgdHlwZW9mIHdpbmRvdy5Nb3VzZUV2ZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHNpbXVsYXRlZEV2ZW50ID0gbmV3IHdpbmRvdy5Nb3VzZUV2ZW50KHR5cGUsIHtcbiAgICAgICAgICAnYnViYmxlcyc6IHRydWUsXG4gICAgICAgICAgJ2NhbmNlbGFibGUnOiB0cnVlLFxuICAgICAgICAgICdzY3JlZW5YJzogZmlyc3Quc2NyZWVuWCxcbiAgICAgICAgICAnc2NyZWVuWSc6IGZpcnN0LnNjcmVlblksXG4gICAgICAgICAgJ2NsaWVudFgnOiBmaXJzdC5jbGllbnRYLFxuICAgICAgICAgICdjbGllbnRZJzogZmlyc3QuY2xpZW50WVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNpbXVsYXRlZEV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ01vdXNlRXZlbnQnKTtcbiAgICAgICAgc2ltdWxhdGVkRXZlbnQuaW5pdE1vdXNlRXZlbnQodHlwZSwgdHJ1ZSwgdHJ1ZSwgd2luZG93LCAxLCBmaXJzdC5zY3JlZW5YLCBmaXJzdC5zY3JlZW5ZLCBmaXJzdC5jbGllbnRYLCBmaXJzdC5jbGllbnRZLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgMC8qbGVmdCovLCBudWxsKTtcbiAgICAgIH1cbiAgICAgIGZpcnN0LnRhcmdldC5kaXNwYXRjaEV2ZW50KHNpbXVsYXRlZEV2ZW50KTtcbiAgICB9O1xuICB9O1xufShqUXVlcnkpO1xuXG5cbi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy8qKkZyb20gdGhlIGpRdWVyeSBNb2JpbGUgTGlicmFyeSoqXG4vLyoqbmVlZCB0byByZWNyZWF0ZSBmdW5jdGlvbmFsaXR5Kipcbi8vKiphbmQgdHJ5IHRvIGltcHJvdmUgaWYgcG9zc2libGUqKlxuLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbi8qIFJlbW92aW5nIHRoZSBqUXVlcnkgZnVuY3Rpb24gKioqKlxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbihmdW5jdGlvbiggJCwgd2luZG93LCB1bmRlZmluZWQgKSB7XG5cblx0dmFyICRkb2N1bWVudCA9ICQoIGRvY3VtZW50ICksXG5cdFx0Ly8gc3VwcG9ydFRvdWNoID0gJC5tb2JpbGUuc3VwcG9ydC50b3VjaCxcblx0XHR0b3VjaFN0YXJ0RXZlbnQgPSAndG91Y2hzdGFydCcvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2hzdGFydFwiIDogXCJtb3VzZWRvd25cIixcblx0XHR0b3VjaFN0b3BFdmVudCA9ICd0b3VjaGVuZCcvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2hlbmRcIiA6IFwibW91c2V1cFwiLFxuXHRcdHRvdWNoTW92ZUV2ZW50ID0gJ3RvdWNobW92ZScvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2htb3ZlXCIgOiBcIm1vdXNlbW92ZVwiO1xuXG5cdC8vIHNldHVwIG5ldyBldmVudCBzaG9ydGN1dHNcblx0JC5lYWNoKCAoIFwidG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgXCIgK1xuXHRcdFwic3dpcGUgc3dpcGVsZWZ0IHN3aXBlcmlnaHRcIiApLnNwbGl0KCBcIiBcIiApLCBmdW5jdGlvbiggaSwgbmFtZSApIHtcblxuXHRcdCQuZm5bIG5hbWUgXSA9IGZ1bmN0aW9uKCBmbiApIHtcblx0XHRcdHJldHVybiBmbiA/IHRoaXMuYmluZCggbmFtZSwgZm4gKSA6IHRoaXMudHJpZ2dlciggbmFtZSApO1xuXHRcdH07XG5cblx0XHQvLyBqUXVlcnkgPCAxLjhcblx0XHRpZiAoICQuYXR0ckZuICkge1xuXHRcdFx0JC5hdHRyRm5bIG5hbWUgXSA9IHRydWU7XG5cdFx0fVxuXHR9KTtcblxuXHRmdW5jdGlvbiB0cmlnZ2VyQ3VzdG9tRXZlbnQoIG9iaiwgZXZlbnRUeXBlLCBldmVudCwgYnViYmxlICkge1xuXHRcdHZhciBvcmlnaW5hbFR5cGUgPSBldmVudC50eXBlO1xuXHRcdGV2ZW50LnR5cGUgPSBldmVudFR5cGU7XG5cdFx0aWYgKCBidWJibGUgKSB7XG5cdFx0XHQkLmV2ZW50LnRyaWdnZXIoIGV2ZW50LCB1bmRlZmluZWQsIG9iaiApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkLmV2ZW50LmRpc3BhdGNoLmNhbGwoIG9iaiwgZXZlbnQgKTtcblx0XHR9XG5cdFx0ZXZlbnQudHlwZSA9IG9yaWdpbmFsVHlwZTtcblx0fVxuXG5cdC8vIGFsc28gaGFuZGxlcyB0YXBob2xkXG5cblx0Ly8gQWxzbyBoYW5kbGVzIHN3aXBlbGVmdCwgc3dpcGVyaWdodFxuXHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUgPSB7XG5cblx0XHQvLyBNb3JlIHRoYW4gdGhpcyBob3Jpem9udGFsIGRpc3BsYWNlbWVudCwgYW5kIHdlIHdpbGwgc3VwcHJlc3Mgc2Nyb2xsaW5nLlxuXHRcdHNjcm9sbFN1cHJlc3Npb25UaHJlc2hvbGQ6IDMwLFxuXG5cdFx0Ly8gTW9yZSB0aW1lIHRoYW4gdGhpcywgYW5kIGl0IGlzbid0IGEgc3dpcGUuXG5cdFx0ZHVyYXRpb25UaHJlc2hvbGQ6IDEwMDAsXG5cblx0XHQvLyBTd2lwZSBob3Jpem9udGFsIGRpc3BsYWNlbWVudCBtdXN0IGJlIG1vcmUgdGhhbiB0aGlzLlxuXHRcdGhvcml6b250YWxEaXN0YW5jZVRocmVzaG9sZDogd2luZG93LmRldmljZVBpeGVsUmF0aW8gPj0gMiA/IDE1IDogMzAsXG5cblx0XHQvLyBTd2lwZSB2ZXJ0aWNhbCBkaXNwbGFjZW1lbnQgbXVzdCBiZSBsZXNzIHRoYW4gdGhpcy5cblx0XHR2ZXJ0aWNhbERpc3RhbmNlVGhyZXNob2xkOiB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA+PSAyID8gMTUgOiAzMCxcblxuXHRcdGdldExvY2F0aW9uOiBmdW5jdGlvbiAoIGV2ZW50ICkge1xuXHRcdFx0dmFyIHdpblBhZ2VYID0gd2luZG93LnBhZ2VYT2Zmc2V0LFxuXHRcdFx0XHR3aW5QYWdlWSA9IHdpbmRvdy5wYWdlWU9mZnNldCxcblx0XHRcdFx0eCA9IGV2ZW50LmNsaWVudFgsXG5cdFx0XHRcdHkgPSBldmVudC5jbGllbnRZO1xuXG5cdFx0XHRpZiAoIGV2ZW50LnBhZ2VZID09PSAwICYmIE1hdGguZmxvb3IoIHkgKSA+IE1hdGguZmxvb3IoIGV2ZW50LnBhZ2VZICkgfHxcblx0XHRcdFx0ZXZlbnQucGFnZVggPT09IDAgJiYgTWF0aC5mbG9vciggeCApID4gTWF0aC5mbG9vciggZXZlbnQucGFnZVggKSApIHtcblxuXHRcdFx0XHQvLyBpT1M0IGNsaWVudFgvY2xpZW50WSBoYXZlIHRoZSB2YWx1ZSB0aGF0IHNob3VsZCBoYXZlIGJlZW5cblx0XHRcdFx0Ly8gaW4gcGFnZVgvcGFnZVkuIFdoaWxlIHBhZ2VYL3BhZ2UvIGhhdmUgdGhlIHZhbHVlIDBcblx0XHRcdFx0eCA9IHggLSB3aW5QYWdlWDtcblx0XHRcdFx0eSA9IHkgLSB3aW5QYWdlWTtcblx0XHRcdH0gZWxzZSBpZiAoIHkgPCAoIGV2ZW50LnBhZ2VZIC0gd2luUGFnZVkpIHx8IHggPCAoIGV2ZW50LnBhZ2VYIC0gd2luUGFnZVggKSApIHtcblxuXHRcdFx0XHQvLyBTb21lIEFuZHJvaWQgYnJvd3NlcnMgaGF2ZSB0b3RhbGx5IGJvZ3VzIHZhbHVlcyBmb3IgY2xpZW50WC9ZXG5cdFx0XHRcdC8vIHdoZW4gc2Nyb2xsaW5nL3pvb21pbmcgYSBwYWdlLiBEZXRlY3RhYmxlIHNpbmNlIGNsaWVudFgvY2xpZW50WVxuXHRcdFx0XHQvLyBzaG91bGQgbmV2ZXIgYmUgc21hbGxlciB0aGFuIHBhZ2VYL3BhZ2VZIG1pbnVzIHBhZ2Ugc2Nyb2xsXG5cdFx0XHRcdHggPSBldmVudC5wYWdlWCAtIHdpblBhZ2VYO1xuXHRcdFx0XHR5ID0gZXZlbnQucGFnZVkgLSB3aW5QYWdlWTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0eDogeCxcblx0XHRcdFx0eTogeVxuXHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0c3RhcnQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciBkYXRhID0gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzID9cblx0XHRcdFx0XHRldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbIDAgXSA6IGV2ZW50LFxuXHRcdFx0XHRsb2NhdGlvbiA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5nZXRMb2NhdGlvbiggZGF0YSApO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHRpbWU6ICggbmV3IERhdGUoKSApLmdldFRpbWUoKSxcblx0XHRcdFx0XHRcdGNvb3JkczogWyBsb2NhdGlvbi54LCBsb2NhdGlvbi55IF0sXG5cdFx0XHRcdFx0XHRvcmlnaW46ICQoIGV2ZW50LnRhcmdldCApXG5cdFx0XHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0c3RvcDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGRhdGEgPSBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMgP1xuXHRcdFx0XHRcdGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlc1sgMCBdIDogZXZlbnQsXG5cdFx0XHRcdGxvY2F0aW9uID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmdldExvY2F0aW9uKCBkYXRhICk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0dGltZTogKCBuZXcgRGF0ZSgpICkuZ2V0VGltZSgpLFxuXHRcdFx0XHRcdFx0Y29vcmRzOiBbIGxvY2F0aW9uLngsIGxvY2F0aW9uLnkgXVxuXHRcdFx0XHRcdH07XG5cdFx0fSxcblxuXHRcdGhhbmRsZVN3aXBlOiBmdW5jdGlvbiggc3RhcnQsIHN0b3AsIHRoaXNPYmplY3QsIG9yaWdUYXJnZXQgKSB7XG5cdFx0XHRpZiAoIHN0b3AudGltZSAtIHN0YXJ0LnRpbWUgPCAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZHVyYXRpb25UaHJlc2hvbGQgJiZcblx0XHRcdFx0TWF0aC5hYnMoIHN0YXJ0LmNvb3Jkc1sgMCBdIC0gc3RvcC5jb29yZHNbIDAgXSApID4gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmhvcml6b250YWxEaXN0YW5jZVRocmVzaG9sZCAmJlxuXHRcdFx0XHRNYXRoLmFicyggc3RhcnQuY29vcmRzWyAxIF0gLSBzdG9wLmNvb3Jkc1sgMSBdICkgPCAkLmV2ZW50LnNwZWNpYWwuc3dpcGUudmVydGljYWxEaXN0YW5jZVRocmVzaG9sZCApIHtcblx0XHRcdFx0dmFyIGRpcmVjdGlvbiA9IHN0YXJ0LmNvb3Jkc1swXSA+IHN0b3AuY29vcmRzWyAwIF0gPyBcInN3aXBlbGVmdFwiIDogXCJzd2lwZXJpZ2h0XCI7XG5cblx0XHRcdFx0dHJpZ2dlckN1c3RvbUV2ZW50KCB0aGlzT2JqZWN0LCBcInN3aXBlXCIsICQuRXZlbnQoIFwic3dpcGVcIiwgeyB0YXJnZXQ6IG9yaWdUYXJnZXQsIHN3aXBlc3RhcnQ6IHN0YXJ0LCBzd2lwZXN0b3A6IHN0b3AgfSksIHRydWUgKTtcblx0XHRcdFx0dHJpZ2dlckN1c3RvbUV2ZW50KCB0aGlzT2JqZWN0LCBkaXJlY3Rpb24sJC5FdmVudCggZGlyZWN0aW9uLCB7IHRhcmdldDogb3JpZ1RhcmdldCwgc3dpcGVzdGFydDogc3RhcnQsIHN3aXBlc3RvcDogc3RvcCB9ICksIHRydWUgKTtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cblx0XHR9LFxuXG5cdFx0Ly8gVGhpcyBzZXJ2ZXMgYXMgYSBmbGFnIHRvIGVuc3VyZSB0aGF0IGF0IG1vc3Qgb25lIHN3aXBlIGV2ZW50IGV2ZW50IGlzXG5cdFx0Ly8gaW4gd29yayBhdCBhbnkgZ2l2ZW4gdGltZVxuXHRcdGV2ZW50SW5Qcm9ncmVzczogZmFsc2UsXG5cblx0XHRzZXR1cDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZXZlbnRzLFxuXHRcdFx0XHR0aGlzT2JqZWN0ID0gdGhpcyxcblx0XHRcdFx0JHRoaXMgPSAkKCB0aGlzT2JqZWN0ICksXG5cdFx0XHRcdGNvbnRleHQgPSB7fTtcblxuXHRcdFx0Ly8gUmV0cmlldmUgdGhlIGV2ZW50cyBkYXRhIGZvciB0aGlzIGVsZW1lbnQgYW5kIGFkZCB0aGUgc3dpcGUgY29udGV4dFxuXHRcdFx0ZXZlbnRzID0gJC5kYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiApO1xuXHRcdFx0aWYgKCAhZXZlbnRzICkge1xuXHRcdFx0XHRldmVudHMgPSB7IGxlbmd0aDogMCB9O1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiLCBldmVudHMgKTtcblx0XHRcdH1cblx0XHRcdGV2ZW50cy5sZW5ndGgrKztcblx0XHRcdGV2ZW50cy5zd2lwZSA9IGNvbnRleHQ7XG5cblx0XHRcdGNvbnRleHQuc3RhcnQgPSBmdW5jdGlvbiggZXZlbnQgKSB7XG5cblx0XHRcdFx0Ly8gQmFpbCBpZiB3ZSdyZSBhbHJlYWR5IHdvcmtpbmcgb24gYSBzd2lwZSBldmVudFxuXHRcdFx0XHRpZiAoICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSB0cnVlO1xuXG5cdFx0XHRcdHZhciBzdG9wLFxuXHRcdFx0XHRcdHN0YXJ0ID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnN0YXJ0KCBldmVudCApLFxuXHRcdFx0XHRcdG9yaWdUYXJnZXQgPSBldmVudC50YXJnZXQsXG5cdFx0XHRcdFx0ZW1pdHRlZCA9IGZhbHNlO1xuXG5cdFx0XHRcdGNvbnRleHQubW92ZSA9IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRpZiAoICFzdGFydCB8fCBldmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzdG9wID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnN0b3AoIGV2ZW50ICk7XG5cdFx0XHRcdFx0aWYgKCAhZW1pdHRlZCApIHtcblx0XHRcdFx0XHRcdGVtaXR0ZWQgPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuaGFuZGxlU3dpcGUoIHN0YXJ0LCBzdG9wLCB0aGlzT2JqZWN0LCBvcmlnVGFyZ2V0ICk7XG5cdFx0XHRcdFx0XHRpZiAoIGVtaXR0ZWQgKSB7XG5cblx0XHRcdFx0XHRcdFx0Ly8gUmVzZXQgdGhlIGNvbnRleHQgdG8gbWFrZSB3YXkgZm9yIHRoZSBuZXh0IHN3aXBlIGV2ZW50XG5cdFx0XHRcdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gcHJldmVudCBzY3JvbGxpbmdcblx0XHRcdFx0XHRpZiAoIE1hdGguYWJzKCBzdGFydC5jb29yZHNbIDAgXSAtIHN0b3AuY29vcmRzWyAwIF0gKSA+ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5zY3JvbGxTdXByZXNzaW9uVGhyZXNob2xkICkge1xuXHRcdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0Y29udGV4dC5zdG9wID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRlbWl0dGVkID0gdHJ1ZTtcblxuXHRcdFx0XHRcdFx0Ly8gUmVzZXQgdGhlIGNvbnRleHQgdG8gbWFrZSB3YXkgZm9yIHRoZSBuZXh0IHN3aXBlIGV2ZW50XG5cdFx0XHRcdFx0XHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZXZlbnRJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRcdFx0XHQkZG9jdW1lbnQub2ZmKCB0b3VjaE1vdmVFdmVudCwgY29udGV4dC5tb3ZlICk7XG5cdFx0XHRcdFx0XHRjb250ZXh0Lm1vdmUgPSBudWxsO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRkb2N1bWVudC5vbiggdG91Y2hNb3ZlRXZlbnQsIGNvbnRleHQubW92ZSApXG5cdFx0XHRcdFx0Lm9uZSggdG91Y2hTdG9wRXZlbnQsIGNvbnRleHQuc3RvcCApO1xuXHRcdFx0fTtcblx0XHRcdCR0aGlzLm9uKCB0b3VjaFN0YXJ0RXZlbnQsIGNvbnRleHQuc3RhcnQgKTtcblx0XHR9LFxuXG5cdFx0dGVhcmRvd246IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGV2ZW50cywgY29udGV4dDtcblxuXHRcdFx0ZXZlbnRzID0gJC5kYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiApO1xuXHRcdFx0aWYgKCBldmVudHMgKSB7XG5cdFx0XHRcdGNvbnRleHQgPSBldmVudHMuc3dpcGU7XG5cdFx0XHRcdGRlbGV0ZSBldmVudHMuc3dpcGU7XG5cdFx0XHRcdGV2ZW50cy5sZW5ndGgtLTtcblx0XHRcdFx0aWYgKCBldmVudHMubGVuZ3RoID09PSAwICkge1xuXHRcdFx0XHRcdCQucmVtb3ZlRGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIGNvbnRleHQgKSB7XG5cdFx0XHRcdGlmICggY29udGV4dC5zdGFydCApIHtcblx0XHRcdFx0XHQkKCB0aGlzICkub2ZmKCB0b3VjaFN0YXJ0RXZlbnQsIGNvbnRleHQuc3RhcnQgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIGNvbnRleHQubW92ZSApIHtcblx0XHRcdFx0XHQkZG9jdW1lbnQub2ZmKCB0b3VjaE1vdmVFdmVudCwgY29udGV4dC5tb3ZlICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBjb250ZXh0LnN0b3AgKSB7XG5cdFx0XHRcdFx0JGRvY3VtZW50Lm9mZiggdG91Y2hTdG9wRXZlbnQsIGNvbnRleHQuc3RvcCApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXHQkLmVhY2goe1xuXHRcdHN3aXBlbGVmdDogXCJzd2lwZS5sZWZ0XCIsXG5cdFx0c3dpcGVyaWdodDogXCJzd2lwZS5yaWdodFwiXG5cdH0sIGZ1bmN0aW9uKCBldmVudCwgc291cmNlRXZlbnQgKSB7XG5cblx0XHQkLmV2ZW50LnNwZWNpYWxbIGV2ZW50IF0gPSB7XG5cdFx0XHRzZXR1cDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5iaW5kKCBzb3VyY2VFdmVudCwgJC5ub29wICk7XG5cdFx0XHR9LFxuXHRcdFx0dGVhcmRvd246IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCB0aGlzICkudW5iaW5kKCBzb3VyY2VFdmVudCApO1xuXHRcdFx0fVxuXHRcdH07XG5cdH0pO1xufSkoIGpRdWVyeSwgdGhpcyApO1xuKi9cbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuY29uc3QgTXV0YXRpb25PYnNlcnZlciA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciBwcmVmaXhlcyA9IFsnV2ViS2l0JywgJ01veicsICdPJywgJ01zJywgJyddO1xuICBmb3IgKHZhciBpPTA7IGkgPCBwcmVmaXhlcy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChgJHtwcmVmaXhlc1tpXX1NdXRhdGlvbk9ic2VydmVyYCBpbiB3aW5kb3cpIHtcbiAgICAgIHJldHVybiB3aW5kb3dbYCR7cHJlZml4ZXNbaV19TXV0YXRpb25PYnNlcnZlcmBdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59KCkpO1xuXG5jb25zdCB0cmlnZ2VycyA9IChlbCwgdHlwZSkgPT4ge1xuICBlbC5kYXRhKHR5cGUpLnNwbGl0KCcgJykuZm9yRWFjaChpZCA9PiB7XG4gICAgJChgIyR7aWR9YClbIHR5cGUgPT09ICdjbG9zZScgPyAndHJpZ2dlcicgOiAndHJpZ2dlckhhbmRsZXInXShgJHt0eXBlfS56Zi50cmlnZ2VyYCwgW2VsXSk7XG4gIH0pO1xufTtcbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtb3Blbl0gd2lsbCByZXZlYWwgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4kKGRvY3VtZW50KS5vbignY2xpY2suemYudHJpZ2dlcicsICdbZGF0YS1vcGVuXScsIGZ1bmN0aW9uKCkge1xuICB0cmlnZ2VycygkKHRoaXMpLCAnb3BlbicpO1xufSk7XG5cbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtY2xvc2VdIHdpbGwgY2xvc2UgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4vLyBJZiB1c2VkIHdpdGhvdXQgYSB2YWx1ZSBvbiBbZGF0YS1jbG9zZV0sIHRoZSBldmVudCB3aWxsIGJ1YmJsZSwgYWxsb3dpbmcgaXQgdG8gY2xvc2UgYSBwYXJlbnQgY29tcG9uZW50LlxuJChkb2N1bWVudCkub24oJ2NsaWNrLnpmLnRyaWdnZXInLCAnW2RhdGEtY2xvc2VdJywgZnVuY3Rpb24oKSB7XG4gIGxldCBpZCA9ICQodGhpcykuZGF0YSgnY2xvc2UnKTtcbiAgaWYgKGlkKSB7XG4gICAgdHJpZ2dlcnMoJCh0aGlzKSwgJ2Nsb3NlJyk7XG4gIH1cbiAgZWxzZSB7XG4gICAgJCh0aGlzKS50cmlnZ2VyKCdjbG9zZS56Zi50cmlnZ2VyJyk7XG4gIH1cbn0pO1xuXG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLXRvZ2dsZV0gd2lsbCB0b2dnbGUgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4kKGRvY3VtZW50KS5vbignY2xpY2suemYudHJpZ2dlcicsICdbZGF0YS10b2dnbGVdJywgZnVuY3Rpb24oKSB7XG4gIGxldCBpZCA9ICQodGhpcykuZGF0YSgndG9nZ2xlJyk7XG4gIGlmIChpZCkge1xuICAgIHRyaWdnZXJzKCQodGhpcyksICd0b2dnbGUnKTtcbiAgfSBlbHNlIHtcbiAgICAkKHRoaXMpLnRyaWdnZXIoJ3RvZ2dsZS56Zi50cmlnZ2VyJyk7XG4gIH1cbn0pO1xuXG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLWNsb3NhYmxlXSB3aWxsIHJlc3BvbmQgdG8gY2xvc2UuemYudHJpZ2dlciBldmVudHMuXG4kKGRvY3VtZW50KS5vbignY2xvc2UuemYudHJpZ2dlcicsICdbZGF0YS1jbG9zYWJsZV0nLCBmdW5jdGlvbihlKXtcbiAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgbGV0IGFuaW1hdGlvbiA9ICQodGhpcykuZGF0YSgnY2xvc2FibGUnKTtcblxuICBpZihhbmltYXRpb24gIT09ICcnKXtcbiAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KCQodGhpcyksIGFuaW1hdGlvbiwgZnVuY3Rpb24oKSB7XG4gICAgICAkKHRoaXMpLnRyaWdnZXIoJ2Nsb3NlZC56ZicpO1xuICAgIH0pO1xuICB9ZWxzZXtcbiAgICAkKHRoaXMpLmZhZGVPdXQoKS50cmlnZ2VyKCdjbG9zZWQuemYnKTtcbiAgfVxufSk7XG5cbiQoZG9jdW1lbnQpLm9uKCdmb2N1cy56Zi50cmlnZ2VyIGJsdXIuemYudHJpZ2dlcicsICdbZGF0YS10b2dnbGUtZm9jdXNdJywgZnVuY3Rpb24oKSB7XG4gIGxldCBpZCA9ICQodGhpcykuZGF0YSgndG9nZ2xlLWZvY3VzJyk7XG4gICQoYCMke2lkfWApLnRyaWdnZXJIYW5kbGVyKCd0b2dnbGUuemYudHJpZ2dlcicsIFskKHRoaXMpXSk7XG59KTtcblxuLyoqXG4qIEZpcmVzIG9uY2UgYWZ0ZXIgYWxsIG90aGVyIHNjcmlwdHMgaGF2ZSBsb2FkZWRcbiogQGZ1bmN0aW9uXG4qIEBwcml2YXRlXG4qL1xuJCh3aW5kb3cpLm9uKCdsb2FkJywgKCkgPT4ge1xuICBjaGVja0xpc3RlbmVycygpO1xufSk7XG5cbmZ1bmN0aW9uIGNoZWNrTGlzdGVuZXJzKCkge1xuICBldmVudHNMaXN0ZW5lcigpO1xuICByZXNpemVMaXN0ZW5lcigpO1xuICBzY3JvbGxMaXN0ZW5lcigpO1xuICBjbG9zZW1lTGlzdGVuZXIoKTtcbn1cblxuLy8qKioqKioqKiBvbmx5IGZpcmVzIHRoaXMgZnVuY3Rpb24gb25jZSBvbiBsb2FkLCBpZiB0aGVyZSdzIHNvbWV0aGluZyB0byB3YXRjaCAqKioqKioqKlxuZnVuY3Rpb24gY2xvc2VtZUxpc3RlbmVyKHBsdWdpbk5hbWUpIHtcbiAgdmFyIHlldGlCb3hlcyA9ICQoJ1tkYXRhLXlldGktYm94XScpLFxuICAgICAgcGx1Z05hbWVzID0gWydkcm9wZG93bicsICd0b29sdGlwJywgJ3JldmVhbCddO1xuXG4gIGlmKHBsdWdpbk5hbWUpe1xuICAgIGlmKHR5cGVvZiBwbHVnaW5OYW1lID09PSAnc3RyaW5nJyl7XG4gICAgICBwbHVnTmFtZXMucHVzaChwbHVnaW5OYW1lKTtcbiAgICB9ZWxzZSBpZih0eXBlb2YgcGx1Z2luTmFtZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHBsdWdpbk5hbWVbMF0gPT09ICdzdHJpbmcnKXtcbiAgICAgIHBsdWdOYW1lcy5jb25jYXQocGx1Z2luTmFtZSk7XG4gICAgfWVsc2V7XG4gICAgICBjb25zb2xlLmVycm9yKCdQbHVnaW4gbmFtZXMgbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfVxuICB9XG4gIGlmKHlldGlCb3hlcy5sZW5ndGgpe1xuICAgIGxldCBsaXN0ZW5lcnMgPSBwbHVnTmFtZXMubWFwKChuYW1lKSA9PiB7XG4gICAgICByZXR1cm4gYGNsb3NlbWUuemYuJHtuYW1lfWA7XG4gICAgfSkuam9pbignICcpO1xuXG4gICAgJCh3aW5kb3cpLm9mZihsaXN0ZW5lcnMpLm9uKGxpc3RlbmVycywgZnVuY3Rpb24oZSwgcGx1Z2luSWQpe1xuICAgICAgbGV0IHBsdWdpbiA9IGUubmFtZXNwYWNlLnNwbGl0KCcuJylbMF07XG4gICAgICBsZXQgcGx1Z2lucyA9ICQoYFtkYXRhLSR7cGx1Z2lufV1gKS5ub3QoYFtkYXRhLXlldGktYm94PVwiJHtwbHVnaW5JZH1cIl1gKTtcblxuICAgICAgcGx1Z2lucy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgIGxldCBfdGhpcyA9ICQodGhpcyk7XG5cbiAgICAgICAgX3RoaXMudHJpZ2dlckhhbmRsZXIoJ2Nsb3NlLnpmLnRyaWdnZXInLCBbX3RoaXNdKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlc2l6ZUxpc3RlbmVyKGRlYm91bmNlKXtcbiAgbGV0IHRpbWVyLFxuICAgICAgJG5vZGVzID0gJCgnW2RhdGEtcmVzaXplXScpO1xuICBpZigkbm9kZXMubGVuZ3RoKXtcbiAgICAkKHdpbmRvdykub2ZmKCdyZXNpemUuemYudHJpZ2dlcicpXG4gICAgLm9uKCdyZXNpemUuemYudHJpZ2dlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmICh0aW1lcikgeyBjbGVhclRpbWVvdXQodGltZXIpOyB9XG5cbiAgICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuXG4gICAgICAgIGlmKCFNdXRhdGlvbk9ic2VydmVyKXsvL2ZhbGxiYWNrIGZvciBJRSA5XG4gICAgICAgICAgJG5vZGVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQodGhpcykudHJpZ2dlckhhbmRsZXIoJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgcmVzaXplIGV2ZW50XG4gICAgICAgICRub2Rlcy5hdHRyKCdkYXRhLWV2ZW50cycsIFwicmVzaXplXCIpO1xuICAgICAgfSwgZGVib3VuY2UgfHwgMTApOy8vZGVmYXVsdCB0aW1lIHRvIGVtaXQgcmVzaXplIGV2ZW50XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2Nyb2xsTGlzdGVuZXIoZGVib3VuY2Upe1xuICBsZXQgdGltZXIsXG4gICAgICAkbm9kZXMgPSAkKCdbZGF0YS1zY3JvbGxdJyk7XG4gIGlmKCRub2Rlcy5sZW5ndGgpe1xuICAgICQod2luZG93KS5vZmYoJ3Njcm9sbC56Zi50cmlnZ2VyJylcbiAgICAub24oJ3Njcm9sbC56Zi50cmlnZ2VyJywgZnVuY3Rpb24oZSl7XG4gICAgICBpZih0aW1lcil7IGNsZWFyVGltZW91dCh0aW1lcik7IH1cblxuICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgaWYoIU11dGF0aW9uT2JzZXJ2ZXIpey8vZmFsbGJhY2sgZm9yIElFIDlcbiAgICAgICAgICAkbm9kZXMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VySGFuZGxlcignc2Nyb2xsbWUuemYudHJpZ2dlcicpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vdHJpZ2dlciBhbGwgbGlzdGVuaW5nIGVsZW1lbnRzIGFuZCBzaWduYWwgYSBzY3JvbGwgZXZlbnRcbiAgICAgICAgJG5vZGVzLmF0dHIoJ2RhdGEtZXZlbnRzJywgXCJzY3JvbGxcIik7XG4gICAgICB9LCBkZWJvdW5jZSB8fCAxMCk7Ly9kZWZhdWx0IHRpbWUgdG8gZW1pdCBzY3JvbGwgZXZlbnRcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBldmVudHNMaXN0ZW5lcigpIHtcbiAgaWYoIU11dGF0aW9uT2JzZXJ2ZXIpeyByZXR1cm4gZmFsc2U7IH1cbiAgbGV0IG5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtcmVzaXplXSwgW2RhdGEtc2Nyb2xsXSwgW2RhdGEtbXV0YXRlXScpO1xuXG4gIC8vZWxlbWVudCBjYWxsYmFja1xuICB2YXIgbGlzdGVuaW5nRWxlbWVudHNNdXRhdGlvbiA9IGZ1bmN0aW9uIChtdXRhdGlvblJlY29yZHNMaXN0KSB7XG4gICAgICB2YXIgJHRhcmdldCA9ICQobXV0YXRpb25SZWNvcmRzTGlzdFswXS50YXJnZXQpO1xuXG5cdCAgLy90cmlnZ2VyIHRoZSBldmVudCBoYW5kbGVyIGZvciB0aGUgZWxlbWVudCBkZXBlbmRpbmcgb24gdHlwZVxuICAgICAgc3dpdGNoIChtdXRhdGlvblJlY29yZHNMaXN0WzBdLnR5cGUpIHtcblxuICAgICAgICBjYXNlIFwiYXR0cmlidXRlc1wiOlxuICAgICAgICAgIGlmICgkdGFyZ2V0LmF0dHIoXCJkYXRhLWV2ZW50c1wiKSA9PT0gXCJzY3JvbGxcIiAmJiBtdXRhdGlvblJlY29yZHNMaXN0WzBdLmF0dHJpYnV0ZU5hbWUgPT09IFwiZGF0YS1ldmVudHNcIikge1xuXHRcdCAgXHQkdGFyZ2V0LnRyaWdnZXJIYW5kbGVyKCdzY3JvbGxtZS56Zi50cmlnZ2VyJywgWyR0YXJnZXQsIHdpbmRvdy5wYWdlWU9mZnNldF0pO1xuXHRcdCAgfVxuXHRcdCAgaWYgKCR0YXJnZXQuYXR0cihcImRhdGEtZXZlbnRzXCIpID09PSBcInJlc2l6ZVwiICYmIG11dGF0aW9uUmVjb3Jkc0xpc3RbMF0uYXR0cmlidXRlTmFtZSA9PT0gXCJkYXRhLWV2ZW50c1wiKSB7XG5cdFx0ICBcdCR0YXJnZXQudHJpZ2dlckhhbmRsZXIoJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCBbJHRhcmdldF0pO1xuXHRcdCAgIH1cblx0XHQgIGlmIChtdXRhdGlvblJlY29yZHNMaXN0WzBdLmF0dHJpYnV0ZU5hbWUgPT09IFwic3R5bGVcIikge1xuXHRcdFx0ICAkdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpLmF0dHIoXCJkYXRhLWV2ZW50c1wiLFwibXV0YXRlXCIpO1xuXHRcdFx0ICAkdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpLnRyaWdnZXJIYW5kbGVyKCdtdXRhdGVtZS56Zi50cmlnZ2VyJywgWyR0YXJnZXQuY2xvc2VzdChcIltkYXRhLW11dGF0ZV1cIildKTtcblx0XHQgIH1cblx0XHQgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgXCJjaGlsZExpc3RcIjpcblx0XHQgICR0YXJnZXQuY2xvc2VzdChcIltkYXRhLW11dGF0ZV1cIikuYXR0cihcImRhdGEtZXZlbnRzXCIsXCJtdXRhdGVcIik7XG5cdFx0ICAkdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpLnRyaWdnZXJIYW5kbGVyKCdtdXRhdGVtZS56Zi50cmlnZ2VyJywgWyR0YXJnZXQuY2xvc2VzdChcIltkYXRhLW11dGF0ZV1cIildKTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgLy9ub3RoaW5nXG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChub2Rlcy5sZW5ndGgpIHtcbiAgICAgIC8vZm9yIGVhY2ggZWxlbWVudCB0aGF0IG5lZWRzIHRvIGxpc3RlbiBmb3IgcmVzaXppbmcsIHNjcm9sbGluZywgb3IgbXV0YXRpb24gYWRkIGEgc2luZ2xlIG9ic2VydmVyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8PSBub2Rlcy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgdmFyIGVsZW1lbnRPYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGxpc3RlbmluZ0VsZW1lbnRzTXV0YXRpb24pO1xuICAgICAgICBlbGVtZW50T2JzZXJ2ZXIub2JzZXJ2ZShub2Rlc1tpXSwgeyBhdHRyaWJ1dGVzOiB0cnVlLCBjaGlsZExpc3Q6IHRydWUsIGNoYXJhY3RlckRhdGE6IGZhbHNlLCBzdWJ0cmVlOiB0cnVlLCBhdHRyaWJ1dGVGaWx0ZXI6IFtcImRhdGEtZXZlbnRzXCIsIFwic3R5bGVcIl0gfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBbUEhdXG4vLyBGb3VuZGF0aW9uLkNoZWNrV2F0Y2hlcnMgPSBjaGVja1dhdGNoZXJzO1xuRm91bmRhdGlvbi5JSGVhcllvdSA9IGNoZWNrTGlzdGVuZXJzO1xuLy8gRm91bmRhdGlvbi5JU2VlWW91ID0gc2Nyb2xsTGlzdGVuZXI7XG4vLyBGb3VuZGF0aW9uLklGZWVsWW91ID0gY2xvc2VtZUxpc3RlbmVyO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogQWJpZGUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmFiaWRlXG4gKi9cblxuY2xhc3MgQWJpZGUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBBYmlkZS5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBBYmlkZSNpbml0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIHRyaWdnZXIgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyAgPSAkLmV4dGVuZCh7fSwgQWJpZGUuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0FiaWRlJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIEFiaWRlIHBsdWdpbiBhbmQgY2FsbHMgZnVuY3Rpb25zIHRvIGdldCBBYmlkZSBmdW5jdGlvbmluZyBvbiBsb2FkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy4kaW5wdXRzID0gdGhpcy4kZWxlbWVudC5maW5kKCdpbnB1dCwgdGV4dGFyZWEsIHNlbGVjdCcpO1xuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciBBYmlkZS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy5hYmlkZScpXG4gICAgICAub24oJ3Jlc2V0LnpmLmFiaWRlJywgKCkgPT4ge1xuICAgICAgICB0aGlzLnJlc2V0Rm9ybSgpO1xuICAgICAgfSlcbiAgICAgIC5vbignc3VibWl0LnpmLmFiaWRlJywgKCkgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy52YWxpZGF0ZUZvcm0oKTtcbiAgICAgIH0pO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy52YWxpZGF0ZU9uID09PSAnZmllbGRDaGFuZ2UnKSB7XG4gICAgICB0aGlzLiRpbnB1dHNcbiAgICAgICAgLm9mZignY2hhbmdlLnpmLmFiaWRlJylcbiAgICAgICAgLm9uKCdjaGFuZ2UuemYuYWJpZGUnLCAoZSkgPT4ge1xuICAgICAgICAgIHRoaXMudmFsaWRhdGVJbnB1dCgkKGUudGFyZ2V0KSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMubGl2ZVZhbGlkYXRlKSB7XG4gICAgICB0aGlzLiRpbnB1dHNcbiAgICAgICAgLm9mZignaW5wdXQuemYuYWJpZGUnKVxuICAgICAgICAub24oJ2lucHV0LnpmLmFiaWRlJywgKGUpID0+IHtcbiAgICAgICAgICB0aGlzLnZhbGlkYXRlSW5wdXQoJChlLnRhcmdldCkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnZhbGlkYXRlT25CbHVyKSB7XG4gICAgICB0aGlzLiRpbnB1dHNcbiAgICAgICAgLm9mZignYmx1ci56Zi5hYmlkZScpXG4gICAgICAgIC5vbignYmx1ci56Zi5hYmlkZScsIChlKSA9PiB7XG4gICAgICAgICAgdGhpcy52YWxpZGF0ZUlucHV0KCQoZS50YXJnZXQpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGxzIG5lY2Vzc2FyeSBmdW5jdGlvbnMgdG8gdXBkYXRlIEFiaWRlIHVwb24gRE9NIGNoYW5nZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlZmxvdygpIHtcbiAgICB0aGlzLl9pbml0KCk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHdoZXRoZXIgb3Igbm90IGEgZm9ybSBlbGVtZW50IGhhcyB0aGUgcmVxdWlyZWQgYXR0cmlidXRlIGFuZCBpZiBpdCdzIGNoZWNrZWQgb3Igbm90XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBjaGVjayBmb3IgcmVxdWlyZWQgYXR0cmlidXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBCb29sZWFuIHZhbHVlIGRlcGVuZHMgb24gd2hldGhlciBvciBub3QgYXR0cmlidXRlIGlzIGNoZWNrZWQgb3IgZW1wdHlcbiAgICovXG4gIHJlcXVpcmVkQ2hlY2soJGVsKSB7XG4gICAgaWYgKCEkZWwuYXR0cigncmVxdWlyZWQnKSkgcmV0dXJuIHRydWU7XG5cbiAgICB2YXIgaXNHb29kID0gdHJ1ZTtcblxuICAgIHN3aXRjaCAoJGVsWzBdLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2NoZWNrYm94JzpcbiAgICAgICAgaXNHb29kID0gJGVsWzBdLmNoZWNrZWQ7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdzZWxlY3QnOlxuICAgICAgY2FzZSAnc2VsZWN0LW9uZSc6XG4gICAgICBjYXNlICdzZWxlY3QtbXVsdGlwbGUnOlxuICAgICAgICB2YXIgb3B0ID0gJGVsLmZpbmQoJ29wdGlvbjpzZWxlY3RlZCcpO1xuICAgICAgICBpZiAoIW9wdC5sZW5ndGggfHwgIW9wdC52YWwoKSkgaXNHb29kID0gZmFsc2U7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZighJGVsLnZhbCgpIHx8ICEkZWwudmFsKCkubGVuZ3RoKSBpc0dvb2QgPSBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gaXNHb29kO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldDpcbiAgICogLSBCYXNlZCBvbiAkZWwsIHRoZSBmaXJzdCBlbGVtZW50KHMpIGNvcnJlc3BvbmRpbmcgdG8gYGZvcm1FcnJvclNlbGVjdG9yYCBpbiB0aGlzIG9yZGVyOlxuICAgKiAgIDEuIFRoZSBlbGVtZW50J3MgZGlyZWN0IHNpYmxpbmcoJ3MpLlxuICAgKiAgIDIuIFRoZSBlbGVtZW50J3MgcGFyZW50J3MgY2hpbGRyZW4uXG4gICAqIC0gRWxlbWVudChzKSB3aXRoIHRoZSBhdHRyaWJ1dGUgYFtkYXRhLWZvcm0tZXJyb3ItZm9yXWAgc2V0IHdpdGggdGhlIGVsZW1lbnQncyBpZC5cbiAgICpcbiAgICogVGhpcyBhbGxvd3MgZm9yIG11bHRpcGxlIGZvcm0gZXJyb3JzIHBlciBpbnB1dCwgdGhvdWdoIGlmIG5vbmUgYXJlIGZvdW5kLCBubyBmb3JtIGVycm9ycyB3aWxsIGJlIHNob3duLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byB1c2UgYXMgcmVmZXJlbmNlIHRvIGZpbmQgdGhlIGZvcm0gZXJyb3Igc2VsZWN0b3IuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IGpRdWVyeSBvYmplY3Qgd2l0aCB0aGUgc2VsZWN0b3IuXG4gICAqL1xuICBmaW5kRm9ybUVycm9yKCRlbCkge1xuICAgIHZhciBpZCA9ICRlbFswXS5pZDtcbiAgICB2YXIgJGVycm9yID0gJGVsLnNpYmxpbmdzKHRoaXMub3B0aW9ucy5mb3JtRXJyb3JTZWxlY3Rvcik7XG5cbiAgICBpZiAoISRlcnJvci5sZW5ndGgpIHtcbiAgICAgICRlcnJvciA9ICRlbC5wYXJlbnQoKS5maW5kKHRoaXMub3B0aW9ucy5mb3JtRXJyb3JTZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgJGVycm9yID0gJGVycm9yLmFkZCh0aGlzLiRlbGVtZW50LmZpbmQoYFtkYXRhLWZvcm0tZXJyb3ItZm9yPVwiJHtpZH1cIl1gKSk7XG5cbiAgICByZXR1cm4gJGVycm9yO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGlzIG9yZGVyOlxuICAgKiAyLiBUaGUgPGxhYmVsPiB3aXRoIHRoZSBhdHRyaWJ1dGUgYFtmb3I9XCJzb21lSW5wdXRJZFwiXWBcbiAgICogMy4gVGhlIGAuY2xvc2VzdCgpYCA8bGFiZWw+XG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgb2JqZWN0IHRvIGNoZWNrIGZvciByZXF1aXJlZCBhdHRyaWJ1dGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgZGVwZW5kcyBvbiB3aGV0aGVyIG9yIG5vdCBhdHRyaWJ1dGUgaXMgY2hlY2tlZCBvciBlbXB0eVxuICAgKi9cbiAgZmluZExhYmVsKCRlbCkge1xuICAgIHZhciBpZCA9ICRlbFswXS5pZDtcbiAgICB2YXIgJGxhYmVsID0gdGhpcy4kZWxlbWVudC5maW5kKGBsYWJlbFtmb3I9XCIke2lkfVwiXWApO1xuXG4gICAgaWYgKCEkbGFiZWwubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gJGVsLmNsb3Nlc3QoJ2xhYmVsJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuICRsYWJlbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHNldCBvZiBsYWJlbHMgYXNzb2NpYXRlZCB3aXRoIGEgc2V0IG9mIHJhZGlvIGVscyBpbiB0aGlzIG9yZGVyXG4gICAqIDIuIFRoZSA8bGFiZWw+IHdpdGggdGhlIGF0dHJpYnV0ZSBgW2Zvcj1cInNvbWVJbnB1dElkXCJdYFxuICAgKiAzLiBUaGUgYC5jbG9zZXN0KClgIDxsYWJlbD5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gY2hlY2sgZm9yIHJlcXVpcmVkIGF0dHJpYnV0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IGF0dHJpYnV0ZSBpcyBjaGVja2VkIG9yIGVtcHR5XG4gICAqL1xuICBmaW5kUmFkaW9MYWJlbHMoJGVscykge1xuICAgIHZhciBsYWJlbHMgPSAkZWxzLm1hcCgoaSwgZWwpID0+IHtcbiAgICAgIHZhciBpZCA9IGVsLmlkO1xuICAgICAgdmFyICRsYWJlbCA9IHRoaXMuJGVsZW1lbnQuZmluZChgbGFiZWxbZm9yPVwiJHtpZH1cIl1gKTtcblxuICAgICAgaWYgKCEkbGFiZWwubGVuZ3RoKSB7XG4gICAgICAgICRsYWJlbCA9ICQoZWwpLmNsb3Nlc3QoJ2xhYmVsJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gJGxhYmVsWzBdO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuICQobGFiZWxzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIHRoZSBDU1MgZXJyb3IgY2xhc3MgYXMgc3BlY2lmaWVkIGJ5IHRoZSBBYmlkZSBzZXR0aW5ncyB0byB0aGUgbGFiZWwsIGlucHV0LCBhbmQgdGhlIGZvcm1cbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSBjbGFzcyB0b1xuICAgKi9cbiAgYWRkRXJyb3JDbGFzc2VzKCRlbCkge1xuICAgIHZhciAkbGFiZWwgPSB0aGlzLmZpbmRMYWJlbCgkZWwpO1xuICAgIHZhciAkZm9ybUVycm9yID0gdGhpcy5maW5kRm9ybUVycm9yKCRlbCk7XG5cbiAgICBpZiAoJGxhYmVsLmxlbmd0aCkge1xuICAgICAgJGxhYmVsLmFkZENsYXNzKHRoaXMub3B0aW9ucy5sYWJlbEVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgIGlmICgkZm9ybUVycm9yLmxlbmd0aCkge1xuICAgICAgJGZvcm1FcnJvci5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuZm9ybUVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgICRlbC5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuaW5wdXRFcnJvckNsYXNzKS5hdHRyKCdkYXRhLWludmFsaWQnLCAnJyk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIENTUyBlcnJvciBjbGFzc2VzIGV0YyBmcm9tIGFuIGVudGlyZSByYWRpbyBidXR0b24gZ3JvdXBcbiAgICogQHBhcmFtIHtTdHJpbmd9IGdyb3VwTmFtZSAtIEEgc3RyaW5nIHRoYXQgc3BlY2lmaWVzIHRoZSBuYW1lIG9mIGEgcmFkaW8gYnV0dG9uIGdyb3VwXG4gICAqXG4gICAqL1xuXG4gIHJlbW92ZVJhZGlvRXJyb3JDbGFzc2VzKGdyb3VwTmFtZSkge1xuICAgIHZhciAkZWxzID0gdGhpcy4kZWxlbWVudC5maW5kKGA6cmFkaW9bbmFtZT1cIiR7Z3JvdXBOYW1lfVwiXWApO1xuICAgIHZhciAkbGFiZWxzID0gdGhpcy5maW5kUmFkaW9MYWJlbHMoJGVscyk7XG4gICAgdmFyICRmb3JtRXJyb3JzID0gdGhpcy5maW5kRm9ybUVycm9yKCRlbHMpO1xuXG4gICAgaWYgKCRsYWJlbHMubGVuZ3RoKSB7XG4gICAgICAkbGFiZWxzLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5sYWJlbEVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgIGlmICgkZm9ybUVycm9ycy5sZW5ndGgpIHtcbiAgICAgICRmb3JtRXJyb3JzLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5mb3JtRXJyb3JDbGFzcyk7XG4gICAgfVxuXG4gICAgJGVscy5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuaW5wdXRFcnJvckNsYXNzKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcblxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgQ1NTIGVycm9yIGNsYXNzIGFzIHNwZWNpZmllZCBieSB0aGUgQWJpZGUgc2V0dGluZ3MgZnJvbSB0aGUgbGFiZWwsIGlucHV0LCBhbmQgdGhlIGZvcm1cbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gcmVtb3ZlIHRoZSBjbGFzcyBmcm9tXG4gICAqL1xuICByZW1vdmVFcnJvckNsYXNzZXMoJGVsKSB7XG4gICAgLy8gcmFkaW9zIG5lZWQgdG8gY2xlYXIgYWxsIG9mIHRoZSBlbHNcbiAgICBpZigkZWxbMF0udHlwZSA9PSAncmFkaW8nKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZW1vdmVSYWRpb0Vycm9yQ2xhc3NlcygkZWwuYXR0cignbmFtZScpKTtcbiAgICB9XG5cbiAgICB2YXIgJGxhYmVsID0gdGhpcy5maW5kTGFiZWwoJGVsKTtcbiAgICB2YXIgJGZvcm1FcnJvciA9IHRoaXMuZmluZEZvcm1FcnJvcigkZWwpO1xuXG4gICAgaWYgKCRsYWJlbC5sZW5ndGgpIHtcbiAgICAgICRsYWJlbC5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMubGFiZWxFcnJvckNsYXNzKTtcbiAgICB9XG5cbiAgICBpZiAoJGZvcm1FcnJvci5sZW5ndGgpIHtcbiAgICAgICRmb3JtRXJyb3IucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmZvcm1FcnJvckNsYXNzKTtcbiAgICB9XG5cbiAgICAkZWwucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmlucHV0RXJyb3JDbGFzcykucmVtb3ZlQXR0cignZGF0YS1pbnZhbGlkJyk7XG4gIH1cblxuICAvKipcbiAgICogR29lcyB0aHJvdWdoIGEgZm9ybSB0byBmaW5kIGlucHV0cyBhbmQgcHJvY2VlZHMgdG8gdmFsaWRhdGUgdGhlbSBpbiB3YXlzIHNwZWNpZmljIHRvIHRoZWlyIHR5cGUuIFxuICAgKiBJZ25vcmVzIGlucHV0cyB3aXRoIGRhdGEtYWJpZGUtaWdub3JlLCB0eXBlPVwiaGlkZGVuXCIgb3IgZGlzYWJsZWQgYXR0cmlidXRlcyBzZXRcbiAgICogQGZpcmVzIEFiaWRlI2ludmFsaWRcbiAgICogQGZpcmVzIEFiaWRlI3ZhbGlkXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byB2YWxpZGF0ZSwgc2hvdWxkIGJlIGFuIEhUTUwgaW5wdXRcbiAgICogQHJldHVybnMge0Jvb2xlYW59IGdvb2RUb0dvIC0gSWYgdGhlIGlucHV0IGlzIHZhbGlkIG9yIG5vdC5cbiAgICovXG4gIHZhbGlkYXRlSW5wdXQoJGVsKSB7XG4gICAgdmFyIGNsZWFyUmVxdWlyZSA9IHRoaXMucmVxdWlyZWRDaGVjaygkZWwpLFxuICAgICAgICB2YWxpZGF0ZWQgPSBmYWxzZSxcbiAgICAgICAgY3VzdG9tVmFsaWRhdG9yID0gdHJ1ZSxcbiAgICAgICAgdmFsaWRhdG9yID0gJGVsLmF0dHIoJ2RhdGEtdmFsaWRhdG9yJyksXG4gICAgICAgIGVxdWFsVG8gPSB0cnVlO1xuXG4gICAgLy8gZG9uJ3QgdmFsaWRhdGUgaWdub3JlZCBpbnB1dHMgb3IgaGlkZGVuIGlucHV0cyBvciBkaXNhYmxlZCBpbnB1dHNcbiAgICBpZiAoJGVsLmlzKCdbZGF0YS1hYmlkZS1pZ25vcmVdJykgfHwgJGVsLmlzKCdbdHlwZT1cImhpZGRlblwiXScpIHx8ICRlbC5pcygnW2Rpc2FibGVkXScpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKCRlbFswXS50eXBlKSB7XG4gICAgICBjYXNlICdyYWRpbyc6XG4gICAgICAgIHZhbGlkYXRlZCA9IHRoaXMudmFsaWRhdGVSYWRpbygkZWwuYXR0cignbmFtZScpKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2NoZWNrYm94JzpcbiAgICAgICAgdmFsaWRhdGVkID0gY2xlYXJSZXF1aXJlO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnc2VsZWN0JzpcbiAgICAgIGNhc2UgJ3NlbGVjdC1vbmUnOlxuICAgICAgY2FzZSAnc2VsZWN0LW11bHRpcGxlJzpcbiAgICAgICAgdmFsaWRhdGVkID0gY2xlYXJSZXF1aXJlO1xuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdmFsaWRhdGVkID0gdGhpcy52YWxpZGF0ZVRleHQoJGVsKTtcbiAgICB9XG5cbiAgICBpZiAodmFsaWRhdG9yKSB7XG4gICAgICBjdXN0b21WYWxpZGF0b3IgPSB0aGlzLm1hdGNoVmFsaWRhdGlvbigkZWwsIHZhbGlkYXRvciwgJGVsLmF0dHIoJ3JlcXVpcmVkJykpO1xuICAgIH1cblxuICAgIGlmICgkZWwuYXR0cignZGF0YS1lcXVhbHRvJykpIHtcbiAgICAgIGVxdWFsVG8gPSB0aGlzLm9wdGlvbnMudmFsaWRhdG9ycy5lcXVhbFRvKCRlbCk7XG4gICAgfVxuXG5cbiAgICB2YXIgZ29vZFRvR28gPSBbY2xlYXJSZXF1aXJlLCB2YWxpZGF0ZWQsIGN1c3RvbVZhbGlkYXRvciwgZXF1YWxUb10uaW5kZXhPZihmYWxzZSkgPT09IC0xO1xuICAgIHZhciBtZXNzYWdlID0gKGdvb2RUb0dvID8gJ3ZhbGlkJyA6ICdpbnZhbGlkJykgKyAnLnpmLmFiaWRlJztcblxuICAgIGlmIChnb29kVG9Hbykge1xuICAgICAgLy8gUmUtdmFsaWRhdGUgaW5wdXRzIHRoYXQgZGVwZW5kIG9uIHRoaXMgb25lIHdpdGggZXF1YWx0b1xuICAgICAgY29uc3QgZGVwZW5kZW50RWxlbWVudHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYFtkYXRhLWVxdWFsdG89XCIkeyRlbC5hdHRyKCdpZCcpfVwiXWApO1xuICAgICAgaWYgKGRlcGVuZGVudEVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBsZXQgX3RoaXMgPSB0aGlzO1xuICAgICAgICBkZXBlbmRlbnRFbGVtZW50cy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkKHRoaXMpLnZhbCgpKSB7XG4gICAgICAgICAgICBfdGhpcy52YWxpZGF0ZUlucHV0KCQodGhpcykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpc1tnb29kVG9HbyA/ICdyZW1vdmVFcnJvckNsYXNzZXMnIDogJ2FkZEVycm9yQ2xhc3NlcyddKCRlbCk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBpbnB1dCBpcyBkb25lIGNoZWNraW5nIGZvciB2YWxpZGF0aW9uLiBFdmVudCB0cmlnZ2VyIGlzIGVpdGhlciBgdmFsaWQuemYuYWJpZGVgIG9yIGBpbnZhbGlkLnpmLmFiaWRlYFxuICAgICAqIFRyaWdnZXIgaW5jbHVkZXMgdGhlIERPTSBlbGVtZW50IG9mIHRoZSBpbnB1dC5cbiAgICAgKiBAZXZlbnQgQWJpZGUjdmFsaWRcbiAgICAgKiBAZXZlbnQgQWJpZGUjaW52YWxpZFxuICAgICAqL1xuICAgICRlbC50cmlnZ2VyKG1lc3NhZ2UsIFskZWxdKTtcblxuICAgIHJldHVybiBnb29kVG9HbztcbiAgfVxuXG4gIC8qKlxuICAgKiBHb2VzIHRocm91Z2ggYSBmb3JtIGFuZCBpZiB0aGVyZSBhcmUgYW55IGludmFsaWQgaW5wdXRzLCBpdCB3aWxsIGRpc3BsYXkgdGhlIGZvcm0gZXJyb3IgZWxlbWVudFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gbm9FcnJvciAtIHRydWUgaWYgbm8gZXJyb3JzIHdlcmUgZGV0ZWN0ZWQuLi5cbiAgICogQGZpcmVzIEFiaWRlI2Zvcm12YWxpZFxuICAgKiBAZmlyZXMgQWJpZGUjZm9ybWludmFsaWRcbiAgICovXG4gIHZhbGlkYXRlRm9ybSgpIHtcbiAgICB2YXIgYWNjID0gW107XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJGlucHV0cy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgYWNjLnB1c2goX3RoaXMudmFsaWRhdGVJbnB1dCgkKHRoaXMpKSk7XG4gICAgfSk7XG5cbiAgICB2YXIgbm9FcnJvciA9IGFjYy5pbmRleE9mKGZhbHNlKSA9PT0gLTE7XG5cbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLWFiaWRlLWVycm9yXScpLmNzcygnZGlzcGxheScsIChub0Vycm9yID8gJ25vbmUnIDogJ2Jsb2NrJykpO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgZm9ybSBpcyBmaW5pc2hlZCB2YWxpZGF0aW5nLiBFdmVudCB0cmlnZ2VyIGlzIGVpdGhlciBgZm9ybXZhbGlkLnpmLmFiaWRlYCBvciBgZm9ybWludmFsaWQuemYuYWJpZGVgLlxuICAgICAqIFRyaWdnZXIgaW5jbHVkZXMgdGhlIGVsZW1lbnQgb2YgdGhlIGZvcm0uXG4gICAgICogQGV2ZW50IEFiaWRlI2Zvcm12YWxpZFxuICAgICAqIEBldmVudCBBYmlkZSNmb3JtaW52YWxpZFxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigobm9FcnJvciA/ICdmb3JtdmFsaWQnIDogJ2Zvcm1pbnZhbGlkJykgKyAnLnpmLmFiaWRlJywgW3RoaXMuJGVsZW1lbnRdKTtcblxuICAgIHJldHVybiBub0Vycm9yO1xuICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hldGhlciBvciBhIG5vdCBhIHRleHQgaW5wdXQgaXMgdmFsaWQgYmFzZWQgb24gdGhlIHBhdHRlcm4gc3BlY2lmaWVkIGluIHRoZSBhdHRyaWJ1dGUuIElmIG5vIG1hdGNoaW5nIHBhdHRlcm4gaXMgZm91bmQsIHJldHVybnMgdHJ1ZS5cbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gdmFsaWRhdGUsIHNob3VsZCBiZSBhIHRleHQgaW5wdXQgSFRNTCBlbGVtZW50XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXR0ZXJuIC0gc3RyaW5nIHZhbHVlIG9mIG9uZSBvZiB0aGUgUmVnRXggcGF0dGVybnMgaW4gQWJpZGUub3B0aW9ucy5wYXR0ZXJuc1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IHRoZSBpbnB1dCB2YWx1ZSBtYXRjaGVzIHRoZSBwYXR0ZXJuIHNwZWNpZmllZFxuICAgKi9cbiAgdmFsaWRhdGVUZXh0KCRlbCwgcGF0dGVybikge1xuICAgIC8vIEEgcGF0dGVybiBjYW4gYmUgcGFzc2VkIHRvIHRoaXMgZnVuY3Rpb24sIG9yIGl0IHdpbGwgYmUgaW5mZXJlZCBmcm9tIHRoZSBpbnB1dCdzIFwicGF0dGVyblwiIGF0dHJpYnV0ZSwgb3IgaXQncyBcInR5cGVcIiBhdHRyaWJ1dGVcbiAgICBwYXR0ZXJuID0gKHBhdHRlcm4gfHwgJGVsLmF0dHIoJ3BhdHRlcm4nKSB8fCAkZWwuYXR0cigndHlwZScpKTtcbiAgICB2YXIgaW5wdXRUZXh0ID0gJGVsLnZhbCgpO1xuICAgIHZhciB2YWxpZCA9IGZhbHNlO1xuXG4gICAgaWYgKGlucHV0VGV4dC5sZW5ndGgpIHtcbiAgICAgIC8vIElmIHRoZSBwYXR0ZXJuIGF0dHJpYnV0ZSBvbiB0aGUgZWxlbWVudCBpcyBpbiBBYmlkZSdzIGxpc3Qgb2YgcGF0dGVybnMsIHRoZW4gdGVzdCB0aGF0IHJlZ2V4cFxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5wYXR0ZXJucy5oYXNPd25Qcm9wZXJ0eShwYXR0ZXJuKSkge1xuICAgICAgICB2YWxpZCA9IHRoaXMub3B0aW9ucy5wYXR0ZXJuc1twYXR0ZXJuXS50ZXN0KGlucHV0VGV4dCk7XG4gICAgICB9XG4gICAgICAvLyBJZiB0aGUgcGF0dGVybiBuYW1lIGlzbid0IGFsc28gdGhlIHR5cGUgYXR0cmlidXRlIG9mIHRoZSBmaWVsZCwgdGhlbiB0ZXN0IGl0IGFzIGEgcmVnZXhwXG4gICAgICBlbHNlIGlmIChwYXR0ZXJuICE9PSAkZWwuYXR0cigndHlwZScpKSB7XG4gICAgICAgIHZhbGlkID0gbmV3IFJlZ0V4cChwYXR0ZXJuKS50ZXN0KGlucHV0VGV4dCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFsaWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBBbiBlbXB0eSBmaWVsZCBpcyB2YWxpZCBpZiBpdCdzIG5vdCByZXF1aXJlZFxuICAgIGVsc2UgaWYgKCEkZWwucHJvcCgncmVxdWlyZWQnKSkge1xuICAgICAgdmFsaWQgPSB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiB2YWxpZDtcbiAgIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIG9yIGEgbm90IGEgcmFkaW8gaW5wdXQgaXMgdmFsaWQgYmFzZWQgb24gd2hldGhlciBvciBub3QgaXQgaXMgcmVxdWlyZWQgYW5kIHNlbGVjdGVkLiBBbHRob3VnaCB0aGUgZnVuY3Rpb24gdGFyZ2V0cyBhIHNpbmdsZSBgPGlucHV0PmAsIGl0IHZhbGlkYXRlcyBieSBjaGVja2luZyB0aGUgYHJlcXVpcmVkYCBhbmQgYGNoZWNrZWRgIHByb3BlcnRpZXMgb2YgYWxsIHJhZGlvIGJ1dHRvbnMgaW4gaXRzIGdyb3VwLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gZ3JvdXBOYW1lIC0gQSBzdHJpbmcgdGhhdCBzcGVjaWZpZXMgdGhlIG5hbWUgb2YgYSByYWRpbyBidXR0b24gZ3JvdXBcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgZGVwZW5kcyBvbiB3aGV0aGVyIG9yIG5vdCBhdCBsZWFzdCBvbmUgcmFkaW8gaW5wdXQgaGFzIGJlZW4gc2VsZWN0ZWQgKGlmIGl0J3MgcmVxdWlyZWQpXG4gICAqL1xuICB2YWxpZGF0ZVJhZGlvKGdyb3VwTmFtZSkge1xuICAgIC8vIElmIGF0IGxlYXN0IG9uZSByYWRpbyBpbiB0aGUgZ3JvdXAgaGFzIHRoZSBgcmVxdWlyZWRgIGF0dHJpYnV0ZSwgdGhlIGdyb3VwIGlzIGNvbnNpZGVyZWQgcmVxdWlyZWRcbiAgICAvLyBQZXIgVzNDIHNwZWMsIGFsbCByYWRpbyBidXR0b25zIGluIGEgZ3JvdXAgc2hvdWxkIGhhdmUgYHJlcXVpcmVkYCwgYnV0IHdlJ3JlIGJlaW5nIG5pY2VcbiAgICB2YXIgJGdyb3VwID0gdGhpcy4kZWxlbWVudC5maW5kKGA6cmFkaW9bbmFtZT1cIiR7Z3JvdXBOYW1lfVwiXWApO1xuICAgIHZhciB2YWxpZCA9IGZhbHNlLCByZXF1aXJlZCA9IGZhbHNlO1xuXG4gICAgLy8gRm9yIHRoZSBncm91cCB0byBiZSByZXF1aXJlZCwgYXQgbGVhc3Qgb25lIHJhZGlvIG5lZWRzIHRvIGJlIHJlcXVpcmVkXG4gICAgJGdyb3VwLmVhY2goKGksIGUpID0+IHtcbiAgICAgIGlmICgkKGUpLmF0dHIoJ3JlcXVpcmVkJykpIHtcbiAgICAgICAgcmVxdWlyZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmKCFyZXF1aXJlZCkgdmFsaWQ9dHJ1ZTtcblxuICAgIGlmICghdmFsaWQpIHtcbiAgICAgIC8vIEZvciB0aGUgZ3JvdXAgdG8gYmUgdmFsaWQsIGF0IGxlYXN0IG9uZSByYWRpbyBuZWVkcyB0byBiZSBjaGVja2VkXG4gICAgICAkZ3JvdXAuZWFjaCgoaSwgZSkgPT4ge1xuICAgICAgICBpZiAoJChlKS5wcm9wKCdjaGVja2VkJykpIHtcbiAgICAgICAgICB2YWxpZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gdmFsaWQ7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyBpZiBhIHNlbGVjdGVkIGlucHV0IHBhc3NlcyBhIGN1c3RvbSB2YWxpZGF0aW9uIGZ1bmN0aW9uLiBNdWx0aXBsZSB2YWxpZGF0aW9ucyBjYW4gYmUgdXNlZCwgaWYgcGFzc2VkIHRvIHRoZSBlbGVtZW50IHdpdGggYGRhdGEtdmFsaWRhdG9yPVwiZm9vIGJhciBiYXpcImAgaW4gYSBzcGFjZSBzZXBhcmF0ZWQgbGlzdGVkLlxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IGlucHV0IGVsZW1lbnQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB2YWxpZGF0b3JzIC0gYSBzdHJpbmcgb2YgZnVuY3Rpb24gbmFtZXMgbWF0Y2hpbmcgZnVuY3Rpb25zIGluIHRoZSBBYmlkZS5vcHRpb25zLnZhbGlkYXRvcnMgb2JqZWN0LlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IHJlcXVpcmVkIC0gc2VsZiBleHBsYW5hdG9yeT9cbiAgICogQHJldHVybnMge0Jvb2xlYW59IC0gdHJ1ZSBpZiB2YWxpZGF0aW9ucyBwYXNzZWQuXG4gICAqL1xuICBtYXRjaFZhbGlkYXRpb24oJGVsLCB2YWxpZGF0b3JzLCByZXF1aXJlZCkge1xuICAgIHJlcXVpcmVkID0gcmVxdWlyZWQgPyB0cnVlIDogZmFsc2U7XG5cbiAgICB2YXIgY2xlYXIgPSB2YWxpZGF0b3JzLnNwbGl0KCcgJykubWFwKCh2KSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5vcHRpb25zLnZhbGlkYXRvcnNbdl0oJGVsLCByZXF1aXJlZCwgJGVsLnBhcmVudCgpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gY2xlYXIuaW5kZXhPZihmYWxzZSkgPT09IC0xO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0cyBmb3JtIGlucHV0cyBhbmQgc3R5bGVzXG4gICAqIEBmaXJlcyBBYmlkZSNmb3JtcmVzZXRcbiAgICovXG4gIHJlc2V0Rm9ybSgpIHtcbiAgICB2YXIgJGZvcm0gPSB0aGlzLiRlbGVtZW50LFxuICAgICAgICBvcHRzID0gdGhpcy5vcHRpb25zO1xuXG4gICAgJChgLiR7b3B0cy5sYWJlbEVycm9yQ2xhc3N9YCwgJGZvcm0pLm5vdCgnc21hbGwnKS5yZW1vdmVDbGFzcyhvcHRzLmxhYmVsRXJyb3JDbGFzcyk7XG4gICAgJChgLiR7b3B0cy5pbnB1dEVycm9yQ2xhc3N9YCwgJGZvcm0pLm5vdCgnc21hbGwnKS5yZW1vdmVDbGFzcyhvcHRzLmlucHV0RXJyb3JDbGFzcyk7XG4gICAgJChgJHtvcHRzLmZvcm1FcnJvclNlbGVjdG9yfS4ke29wdHMuZm9ybUVycm9yQ2xhc3N9YCkucmVtb3ZlQ2xhc3Mob3B0cy5mb3JtRXJyb3JDbGFzcyk7XG4gICAgJGZvcm0uZmluZCgnW2RhdGEtYWJpZGUtZXJyb3JdJykuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAkKCc6aW5wdXQnLCAkZm9ybSkubm90KCc6YnV0dG9uLCA6c3VibWl0LCA6cmVzZXQsIDpoaWRkZW4sIDpyYWRpbywgOmNoZWNrYm94LCBbZGF0YS1hYmlkZS1pZ25vcmVdJykudmFsKCcnKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcbiAgICAkKCc6aW5wdXQ6cmFkaW8nLCAkZm9ybSkubm90KCdbZGF0YS1hYmlkZS1pZ25vcmVdJykucHJvcCgnY2hlY2tlZCcsZmFsc2UpLnJlbW92ZUF0dHIoJ2RhdGEtaW52YWxpZCcpO1xuICAgICQoJzppbnB1dDpjaGVja2JveCcsICRmb3JtKS5ub3QoJ1tkYXRhLWFiaWRlLWlnbm9yZV0nKS5wcm9wKCdjaGVja2VkJyxmYWxzZSkucmVtb3ZlQXR0cignZGF0YS1pbnZhbGlkJyk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgZm9ybSBoYXMgYmVlbiByZXNldC5cbiAgICAgKiBAZXZlbnQgQWJpZGUjZm9ybXJlc2V0XG4gICAgICovXG4gICAgJGZvcm0udHJpZ2dlcignZm9ybXJlc2V0LnpmLmFiaWRlJywgWyRmb3JtXSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgQWJpZGUuXG4gICAqIFJlbW92ZXMgZXJyb3Igc3R5bGVzIGFuZCBjbGFzc2VzIGZyb20gZWxlbWVudHMsIHdpdGhvdXQgcmVzZXR0aW5nIHRoZWlyIHZhbHVlcy5cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub2ZmKCcuYWJpZGUnKVxuICAgICAgLmZpbmQoJ1tkYXRhLWFiaWRlLWVycm9yXScpXG4gICAgICAgIC5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuXG4gICAgdGhpcy4kaW5wdXRzXG4gICAgICAub2ZmKCcuYWJpZGUnKVxuICAgICAgLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLnJlbW92ZUVycm9yQ2xhc3NlcygkKHRoaXMpKTtcbiAgICAgIH0pO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbkFiaWRlLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogVGhlIGRlZmF1bHQgZXZlbnQgdG8gdmFsaWRhdGUgaW5wdXRzLiBDaGVja2JveGVzIGFuZCByYWRpb3MgdmFsaWRhdGUgaW1tZWRpYXRlbHkuXG4gICAqIFJlbW92ZSBvciBjaGFuZ2UgdGhpcyB2YWx1ZSBmb3IgbWFudWFsIHZhbGlkYXRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUgez9zdHJpbmd9XG4gICAqIEBkZWZhdWx0ICdmaWVsZENoYW5nZSdcbiAgICovXG4gIHZhbGlkYXRlT246ICdmaWVsZENoYW5nZScsXG5cbiAgLyoqXG4gICAqIENsYXNzIHRvIGJlIGFwcGxpZWQgdG8gaW5wdXQgbGFiZWxzIG9uIGZhaWxlZCB2YWxpZGF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICdpcy1pbnZhbGlkLWxhYmVsJ1xuICAgKi9cbiAgbGFiZWxFcnJvckNsYXNzOiAnaXMtaW52YWxpZC1sYWJlbCcsXG5cbiAgLyoqXG4gICAqIENsYXNzIHRvIGJlIGFwcGxpZWQgdG8gaW5wdXRzIG9uIGZhaWxlZCB2YWxpZGF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICdpcy1pbnZhbGlkLWlucHV0J1xuICAgKi9cbiAgaW5wdXRFcnJvckNsYXNzOiAnaXMtaW52YWxpZC1pbnB1dCcsXG5cbiAgLyoqXG4gICAqIENsYXNzIHNlbGVjdG9yIHRvIHVzZSB0byB0YXJnZXQgRm9ybSBFcnJvcnMgZm9yIHNob3cvaGlkZS5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnLmZvcm0tZXJyb3InXG4gICAqL1xuICBmb3JtRXJyb3JTZWxlY3RvcjogJy5mb3JtLWVycm9yJyxcblxuICAvKipcbiAgICogQ2xhc3MgYWRkZWQgdG8gRm9ybSBFcnJvcnMgb24gZmFpbGVkIHZhbGlkYXRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ2lzLXZpc2libGUnXG4gICAqL1xuICBmb3JtRXJyb3JDbGFzczogJ2lzLXZpc2libGUnLFxuXG4gIC8qKlxuICAgKiBTZXQgdG8gdHJ1ZSB0byB2YWxpZGF0ZSB0ZXh0IGlucHV0cyBvbiBhbnkgdmFsdWUgY2hhbmdlLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgbGl2ZVZhbGlkYXRlOiBmYWxzZSxcblxuICAvKipcbiAgICogU2V0IHRvIHRydWUgdG8gdmFsaWRhdGUgaW5wdXRzIG9uIGJsdXIuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICB2YWxpZGF0ZU9uQmx1cjogZmFsc2UsXG5cbiAgcGF0dGVybnM6IHtcbiAgICBhbHBoYSA6IC9eW2EtekEtWl0rJC8sXG4gICAgYWxwaGFfbnVtZXJpYyA6IC9eW2EtekEtWjAtOV0rJC8sXG4gICAgaW50ZWdlciA6IC9eWy0rXT9cXGQrJC8sXG4gICAgbnVtYmVyIDogL15bLStdP1xcZCooPzpbXFwuXFwsXVxcZCspPyQvLFxuXG4gICAgLy8gYW1leCwgdmlzYSwgZGluZXJzXG4gICAgY2FyZCA6IC9eKD86NFswLTldezEyfSg/OlswLTldezN9KT98NVsxLTVdWzAtOV17MTR9fDYoPzowMTF8NVswLTldWzAtOV0pWzAtOV17MTJ9fDNbNDddWzAtOV17MTN9fDMoPzowWzAtNV18WzY4XVswLTldKVswLTldezExfXwoPzoyMTMxfDE4MDB8MzVcXGR7M30pXFxkezExfSkkLyxcbiAgICBjdnYgOiAvXihbMC05XSl7Myw0fSQvLFxuXG4gICAgLy8gaHR0cDovL3d3dy53aGF0d2cub3JnL3NwZWNzL3dlYi1hcHBzL2N1cnJlbnQtd29yay9tdWx0aXBhZ2Uvc3RhdGVzLW9mLXRoZS10eXBlLWF0dHJpYnV0ZS5odG1sI3ZhbGlkLWUtbWFpbC1hZGRyZXNzXG4gICAgZW1haWwgOiAvXlthLXpBLVowLTkuISMkJSYnKitcXC89P15fYHt8fX4tXStAW2EtekEtWjAtOV0oPzpbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSk/KD86XFwuW2EtekEtWjAtOV0oPzpbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSk/KSskLyxcblxuICAgIHVybCA6IC9eKGh0dHBzP3xmdHB8ZmlsZXxzc2gpOlxcL1xcLygoKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6KSpAKT8oKChcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSlcXC4oXFxkfFsxLTldXFxkfDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNV0pXFwuKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKVxcLihcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSkpfCgoKFthLXpBLVpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KChbYS16QS1aXXxcXGR8W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKihbYS16QS1aXXxcXGR8W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKSlcXC4pKygoW2EtekEtWl18W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCgoW2EtekEtWl18W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKihbYS16QS1aXXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkpKVxcLj8pKDpcXGQqKT8pKFxcLygoKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCkrKFxcLygoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKSopKik/KT8oXFw/KCgoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKXxbXFx1RTAwMC1cXHVGOEZGXXxcXC98XFw/KSopPyhcXCMoKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApfFxcL3xcXD8pKik/JC8sXG4gICAgLy8gYWJjLmRlXG4gICAgZG9tYWluIDogL14oW2EtekEtWjAtOV0oW2EtekEtWjAtOVxcLV17MCw2MX1bYS16QS1aMC05XSk/XFwuKStbYS16QS1aXXsyLDh9JC8sXG5cbiAgICBkYXRldGltZSA6IC9eKFswLTJdWzAtOV17M30pXFwtKFswLTFdWzAtOV0pXFwtKFswLTNdWzAtOV0pVChbMC01XVswLTldKVxcOihbMC01XVswLTldKVxcOihbMC01XVswLTldKShafChbXFwtXFwrXShbMC0xXVswLTldKVxcOjAwKSkkLyxcbiAgICAvLyBZWVlZLU1NLUREXG4gICAgZGF0ZSA6IC8oPzoxOXwyMClbMC05XXsyfS0oPzooPzowWzEtOV18MVswLTJdKS0oPzowWzEtOV18MVswLTldfDJbMC05XSl8KD86KD8hMDIpKD86MFsxLTldfDFbMC0yXSktKD86MzApKXwoPzooPzowWzEzNTc4XXwxWzAyXSktMzEpKSQvLFxuICAgIC8vIEhIOk1NOlNTXG4gICAgdGltZSA6IC9eKDBbMC05XXwxWzAtOV18MlswLTNdKSg6WzAtNV1bMC05XSl7Mn0kLyxcbiAgICBkYXRlSVNPIDogL15cXGR7NH1bXFwvXFwtXVxcZHsxLDJ9W1xcL1xcLV1cXGR7MSwyfSQvLFxuICAgIC8vIE1NL0REL1lZWVlcbiAgICBtb250aF9kYXlfeWVhciA6IC9eKDBbMS05XXwxWzAxMl0pWy0gXFwvLl0oMFsxLTldfFsxMl1bMC05XXwzWzAxXSlbLSBcXC8uXVxcZHs0fSQvLFxuICAgIC8vIEREL01NL1lZWVlcbiAgICBkYXlfbW9udGhfeWVhciA6IC9eKDBbMS05XXxbMTJdWzAtOV18M1swMV0pWy0gXFwvLl0oMFsxLTldfDFbMDEyXSlbLSBcXC8uXVxcZHs0fSQvLFxuXG4gICAgLy8gI0ZGRiBvciAjRkZGRkZGXG4gICAgY29sb3IgOiAvXiM/KFthLWZBLUYwLTldezZ9fFthLWZBLUYwLTldezN9KSQvXG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wdGlvbmFsIHZhbGlkYXRpb24gZnVuY3Rpb25zIHRvIGJlIHVzZWQuIGBlcXVhbFRvYCBiZWluZyB0aGUgb25seSBkZWZhdWx0IGluY2x1ZGVkIGZ1bmN0aW9uLlxuICAgKiBGdW5jdGlvbnMgc2hvdWxkIHJldHVybiBvbmx5IGEgYm9vbGVhbiBpZiB0aGUgaW5wdXQgaXMgdmFsaWQgb3Igbm90LiBGdW5jdGlvbnMgYXJlIGdpdmVuIHRoZSBmb2xsb3dpbmcgYXJndW1lbnRzOlxuICAgKiBlbCA6IFRoZSBqUXVlcnkgZWxlbWVudCB0byB2YWxpZGF0ZS5cbiAgICogcmVxdWlyZWQgOiBCb29sZWFuIHZhbHVlIG9mIHRoZSByZXF1aXJlZCBhdHRyaWJ1dGUgYmUgcHJlc2VudCBvciBub3QuXG4gICAqIHBhcmVudCA6IFRoZSBkaXJlY3QgcGFyZW50IG9mIHRoZSBpbnB1dC5cbiAgICogQG9wdGlvblxuICAgKi9cbiAgdmFsaWRhdG9yczoge1xuICAgIGVxdWFsVG86IGZ1bmN0aW9uIChlbCwgcmVxdWlyZWQsIHBhcmVudCkge1xuICAgICAgcmV0dXJuICQoYCMke2VsLmF0dHIoJ2RhdGEtZXF1YWx0bycpfWApLnZhbCgpID09PSBlbC52YWwoKTtcbiAgICB9XG4gIH1cbn1cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEFiaWRlLCAnQWJpZGUnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEFjY29yZGlvbiBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uYWNjb3JkaW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICovXG5cbmNsYXNzIEFjY29yZGlvbiB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGFuIGFjY29yZGlvbi5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBBY2NvcmRpb24jaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGFuIGFjY29yZGlvbi5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBhIHBsYWluIG9iamVjdCB3aXRoIHNldHRpbmdzIHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0IG9wdGlvbnMuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIEFjY29yZGlvbi5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnQWNjb3JkaW9uJyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignQWNjb3JkaW9uJywge1xuICAgICAgJ0VOVEVSJzogJ3RvZ2dsZScsXG4gICAgICAnU1BBQ0UnOiAndG9nZ2xlJyxcbiAgICAgICdBUlJPV19ET1dOJzogJ25leHQnLFxuICAgICAgJ0FSUk9XX1VQJzogJ3ByZXZpb3VzJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBhY2NvcmRpb24gYnkgYW5pbWF0aW5nIHRoZSBwcmVzZXQgYWN0aXZlIHBhbmUocykuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3JvbGUnLCAndGFibGlzdCcpO1xuICAgIHRoaXMuJHRhYnMgPSB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCdbZGF0YS1hY2NvcmRpb24taXRlbV0nKTtcblxuICAgIHRoaXMuJHRhYnMuZWFjaChmdW5jdGlvbihpZHgsIGVsKSB7XG4gICAgICB2YXIgJGVsID0gJChlbCksXG4gICAgICAgICAgJGNvbnRlbnQgPSAkZWwuY2hpbGRyZW4oJ1tkYXRhLXRhYi1jb250ZW50XScpLFxuICAgICAgICAgIGlkID0gJGNvbnRlbnRbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnYWNjb3JkaW9uJyksXG4gICAgICAgICAgbGlua0lkID0gZWwuaWQgfHwgYCR7aWR9LWxhYmVsYDtcblxuICAgICAgJGVsLmZpbmQoJ2E6Zmlyc3QnKS5hdHRyKHtcbiAgICAgICAgJ2FyaWEtY29udHJvbHMnOiBpZCxcbiAgICAgICAgJ3JvbGUnOiAndGFiJyxcbiAgICAgICAgJ2lkJzogbGlua0lkLFxuICAgICAgICAnYXJpYS1leHBhbmRlZCc6IGZhbHNlLFxuICAgICAgICAnYXJpYS1zZWxlY3RlZCc6IGZhbHNlXG4gICAgICB9KTtcblxuICAgICAgJGNvbnRlbnQuYXR0cih7J3JvbGUnOiAndGFicGFuZWwnLCAnYXJpYS1sYWJlbGxlZGJ5JzogbGlua0lkLCAnYXJpYS1oaWRkZW4nOiB0cnVlLCAnaWQnOiBpZH0pO1xuICAgIH0pO1xuICAgIHZhciAkaW5pdEFjdGl2ZSA9IHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWFjdGl2ZScpLmNoaWxkcmVuKCdbZGF0YS10YWItY29udGVudF0nKTtcbiAgICB0aGlzLmZpcnN0VGltZUluaXQgPSB0cnVlO1xuICAgIGlmKCRpbml0QWN0aXZlLmxlbmd0aCl7XG4gICAgICB0aGlzLmRvd24oJGluaXRBY3RpdmUsIHRoaXMuZmlyc3RUaW1lSW5pdCk7XG4gICAgICB0aGlzLmZpcnN0VGltZUluaXQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICB0aGlzLl9jaGVja0RlZXBMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIGFuY2hvciA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoO1xuICAgICAgLy9uZWVkIGEgaGFzaCBhbmQgYSByZWxldmFudCBhbmNob3IgaW4gdGhpcyB0YWJzZXRcbiAgICAgIGlmKGFuY2hvci5sZW5ndGgpIHtcbiAgICAgICAgdmFyICRsaW5rID0gdGhpcy4kZWxlbWVudC5maW5kKCdbaHJlZiQ9XCInK2FuY2hvcisnXCJdJyksXG4gICAgICAgICRhbmNob3IgPSAkKGFuY2hvcik7XG5cbiAgICAgICAgaWYgKCRsaW5rLmxlbmd0aCAmJiAkYW5jaG9yKSB7XG4gICAgICAgICAgaWYgKCEkbGluay5wYXJlbnQoJ1tkYXRhLWFjY29yZGlvbi1pdGVtXScpLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSkge1xuICAgICAgICAgICAgdGhpcy5kb3duKCRhbmNob3IsIHRoaXMuZmlyc3RUaW1lSW5pdCk7XG4gICAgICAgICAgICB0aGlzLmZpcnN0VGltZUluaXQgPSBmYWxzZTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgLy9yb2xsIHVwIGEgbGl0dGxlIHRvIHNob3cgdGhlIHRpdGxlc1xuICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGVlcExpbmtTbXVkZ2UpIHtcbiAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgICAgICAkKHdpbmRvdykubG9hZChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgdmFyIG9mZnNldCA9IF90aGlzLiRlbGVtZW50Lm9mZnNldCgpO1xuICAgICAgICAgICAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7IHNjcm9sbFRvcDogb2Zmc2V0LnRvcCB9LCBfdGhpcy5vcHRpb25zLmRlZXBMaW5rU211ZGdlRGVsYXkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHpwbHVnaW4gaGFzIGRlZXBsaW5rZWQgYXQgcGFnZWxvYWRcbiAgICAgICAgICAgICogQGV2ZW50IEFjY29yZGlvbiNkZWVwbGlua1xuICAgICAgICAgICAgKi9cbiAgICAgICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2RlZXBsaW5rLnpmLmFjY29yZGlvbicsIFskbGluaywgJGFuY2hvcl0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy91c2UgYnJvd3NlciB0byBvcGVuIGEgdGFiLCBpZiBpdCBleGlzdHMgaW4gdGhpcyB0YWJzZXRcbiAgICBpZiAodGhpcy5vcHRpb25zLmRlZXBMaW5rKSB7XG4gICAgICB0aGlzLl9jaGVja0RlZXBMaW5rKCk7XG4gICAgfVxuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyBmb3IgaXRlbXMgd2l0aGluIHRoZSBhY2NvcmRpb24uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiR0YWJzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpO1xuICAgICAgdmFyICR0YWJDb250ZW50ID0gJGVsZW0uY2hpbGRyZW4oJ1tkYXRhLXRhYi1jb250ZW50XScpO1xuICAgICAgaWYgKCR0YWJDb250ZW50Lmxlbmd0aCkge1xuICAgICAgICAkZWxlbS5jaGlsZHJlbignYScpLm9mZignY2xpY2suemYuYWNjb3JkaW9uIGtleWRvd24uemYuYWNjb3JkaW9uJylcbiAgICAgICAgICAgICAgIC5vbignY2xpY2suemYuYWNjb3JkaW9uJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy50b2dnbGUoJHRhYkNvbnRlbnQpO1xuICAgICAgICB9KS5vbigna2V5ZG93bi56Zi5hY2NvcmRpb24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnQWNjb3JkaW9uJywge1xuICAgICAgICAgICAgdG9nZ2xlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgX3RoaXMudG9nZ2xlKCR0YWJDb250ZW50KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgdmFyICRhID0gJGVsZW0ubmV4dCgpLmZpbmQoJ2EnKS5mb2N1cygpO1xuICAgICAgICAgICAgICBpZiAoIV90aGlzLm9wdGlvbnMubXVsdGlFeHBhbmQpIHtcbiAgICAgICAgICAgICAgICAkYS50cmlnZ2VyKCdjbGljay56Zi5hY2NvcmRpb24nKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHJldmlvdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICB2YXIgJGEgPSAkZWxlbS5wcmV2KCkuZmluZCgnYScpLmZvY3VzKCk7XG4gICAgICAgICAgICAgIGlmICghX3RoaXMub3B0aW9ucy5tdWx0aUV4cGFuZCkge1xuICAgICAgICAgICAgICAgICRhLnRyaWdnZXIoJ2NsaWNrLnpmLmFjY29yZGlvbicpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZih0aGlzLm9wdGlvbnMuZGVlcExpbmspIHtcbiAgICAgICQod2luZG93KS5vbigncG9wc3RhdGUnLCB0aGlzLl9jaGVja0RlZXBMaW5rKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgc2VsZWN0ZWQgY29udGVudCBwYW5lJ3Mgb3Blbi9jbG9zZSBzdGF0ZS5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBqUXVlcnkgb2JqZWN0IG9mIHRoZSBwYW5lIHRvIHRvZ2dsZSAoYC5hY2NvcmRpb24tY29udGVudGApLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHRvZ2dsZSgkdGFyZ2V0KSB7XG4gICAgaWYoJHRhcmdldC5wYXJlbnQoKS5oYXNDbGFzcygnaXMtYWN0aXZlJykpIHtcbiAgICAgIHRoaXMudXAoJHRhcmdldCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZG93bigkdGFyZ2V0KTtcbiAgICB9XG4gICAgLy9laXRoZXIgcmVwbGFjZSBvciB1cGRhdGUgYnJvd3NlciBoaXN0b3J5XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWVwTGluaykge1xuICAgICAgdmFyIGFuY2hvciA9ICR0YXJnZXQucHJldignYScpLmF0dHIoJ2hyZWYnKTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy51cGRhdGVIaXN0b3J5KSB7XG4gICAgICAgIGhpc3RvcnkucHVzaFN0YXRlKHt9LCAnJywgYW5jaG9yKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHt9LCAnJywgYW5jaG9yKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgdGhlIGFjY29yZGlvbiB0YWIgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gQWNjb3JkaW9uIHBhbmUgdG8gb3BlbiAoYC5hY2NvcmRpb24tY29udGVudGApLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGZpcnN0VGltZSAtIGZsYWcgdG8gZGV0ZXJtaW5lIGlmIHJlZmxvdyBzaG91bGQgaGFwcGVuLlxuICAgKiBAZmlyZXMgQWNjb3JkaW9uI2Rvd25cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkb3duKCR0YXJnZXQsIGZpcnN0VGltZSkge1xuICAgICR0YXJnZXRcbiAgICAgIC5hdHRyKCdhcmlhLWhpZGRlbicsIGZhbHNlKVxuICAgICAgLnBhcmVudCgnW2RhdGEtdGFiLWNvbnRlbnRdJylcbiAgICAgIC5hZGRCYWNrKClcbiAgICAgIC5wYXJlbnQoKS5hZGRDbGFzcygnaXMtYWN0aXZlJyk7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5tdWx0aUV4cGFuZCAmJiAhZmlyc3RUaW1lKSB7XG4gICAgICB2YXIgJGN1cnJlbnRBY3RpdmUgPSB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCcuaXMtYWN0aXZlJykuY2hpbGRyZW4oJ1tkYXRhLXRhYi1jb250ZW50XScpO1xuICAgICAgaWYgKCRjdXJyZW50QWN0aXZlLmxlbmd0aCkge1xuICAgICAgICB0aGlzLnVwKCRjdXJyZW50QWN0aXZlLm5vdCgkdGFyZ2V0KSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgJHRhcmdldC5zbGlkZURvd24odGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsICgpID0+IHtcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgd2hlbiB0aGUgdGFiIGlzIGRvbmUgb3BlbmluZy5cbiAgICAgICAqIEBldmVudCBBY2NvcmRpb24jZG93blxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Rvd24uemYuYWNjb3JkaW9uJywgWyR0YXJnZXRdKTtcbiAgICB9KTtcblxuICAgICQoYCMkeyR0YXJnZXQuYXR0cignYXJpYS1sYWJlbGxlZGJ5Jyl9YCkuYXR0cih7XG4gICAgICAnYXJpYS1leHBhbmRlZCc6IHRydWUsXG4gICAgICAnYXJpYS1zZWxlY3RlZCc6IHRydWVcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIHRhYiBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBBY2NvcmRpb24gdGFiIHRvIGNsb3NlIChgLmFjY29yZGlvbi1jb250ZW50YCkuXG4gICAqIEBmaXJlcyBBY2NvcmRpb24jdXBcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB1cCgkdGFyZ2V0KSB7XG4gICAgdmFyICRhdW50cyA9ICR0YXJnZXQucGFyZW50KCkuc2libGluZ3MoKSxcbiAgICAgICAgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYoKCF0aGlzLm9wdGlvbnMuYWxsb3dBbGxDbG9zZWQgJiYgISRhdW50cy5oYXNDbGFzcygnaXMtYWN0aXZlJykpIHx8ICEkdGFyZ2V0LnBhcmVudCgpLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEZvdW5kYXRpb24uTW92ZSh0aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgJHRhcmdldCwgZnVuY3Rpb24oKXtcbiAgICAgICR0YXJnZXQuc2xpZGVVcChfdGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHRhYiBpcyBkb25lIGNvbGxhcHNpbmcgdXAuXG4gICAgICAgICAqIEBldmVudCBBY2NvcmRpb24jdXBcbiAgICAgICAgICovXG4gICAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3VwLnpmLmFjY29yZGlvbicsIFskdGFyZ2V0XSk7XG4gICAgICB9KTtcbiAgICAvLyB9KTtcblxuICAgICR0YXJnZXQuYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKVxuICAgICAgICAgICAucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXG4gICAgJChgIyR7JHRhcmdldC5hdHRyKCdhcmlhLWxhYmVsbGVkYnknKX1gKS5hdHRyKHtcbiAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZSxcbiAgICAgJ2FyaWEtc2VsZWN0ZWQnOiBmYWxzZVxuICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgYW4gYWNjb3JkaW9uLlxuICAgKiBAZmlyZXMgQWNjb3JkaW9uI2Rlc3Ryb3llZFxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS10YWItY29udGVudF0nKS5zdG9wKHRydWUpLnNsaWRlVXAoMCkuY3NzKCdkaXNwbGF5JywgJycpO1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnYScpLm9mZignLnpmLmFjY29yZGlvbicpO1xuICAgIGlmKHRoaXMub3B0aW9ucy5kZWVwTGluaykge1xuICAgICAgJCh3aW5kb3cpLm9mZigncG9wc3RhdGUnLCB0aGlzLl9jaGVja0RlZXBMaW5rKTtcbiAgICB9XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuQWNjb3JkaW9uLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQW1vdW50IG9mIHRpbWUgdG8gYW5pbWF0ZSB0aGUgb3BlbmluZyBvZiBhbiBhY2NvcmRpb24gcGFuZS5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAyNTBcbiAgICovXG4gIHNsaWRlU3BlZWQ6IDI1MCxcbiAgLyoqXG4gICAqIEFsbG93IHRoZSBhY2NvcmRpb24gdG8gaGF2ZSBtdWx0aXBsZSBvcGVuIHBhbmVzLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgbXVsdGlFeHBhbmQ6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgdGhlIGFjY29yZGlvbiB0byBjbG9zZSBhbGwgcGFuZXMuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBhbGxvd0FsbENsb3NlZDogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHdpbmRvdyB0byBzY3JvbGwgdG8gY29udGVudCBvZiBwYW5lIHNwZWNpZmllZCBieSBoYXNoIGFuY2hvclxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgZGVlcExpbms6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBBZGp1c3QgdGhlIGRlZXAgbGluayBzY3JvbGwgdG8gbWFrZSBzdXJlIHRoZSB0b3Agb2YgdGhlIGFjY29yZGlvbiBwYW5lbCBpcyB2aXNpYmxlXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBkZWVwTGlua1NtdWRnZTogZmFsc2UsXG5cbiAgLyoqXG4gICAqIEFuaW1hdGlvbiB0aW1lIChtcykgZm9yIHRoZSBkZWVwIGxpbmsgYWRqdXN0bWVudFxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDMwMFxuICAgKi9cbiAgZGVlcExpbmtTbXVkZ2VEZWxheTogMzAwLFxuXG4gIC8qKlxuICAgKiBVcGRhdGUgdGhlIGJyb3dzZXIgaGlzdG9yeSB3aXRoIHRoZSBvcGVuIGFjY29yZGlvblxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgdXBkYXRlSGlzdG9yeTogZmFsc2Vcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihBY2NvcmRpb24sICdBY2NvcmRpb24nKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEFjY29yZGlvbk1lbnUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmFjY29yZGlvbk1lbnVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm5lc3RcbiAqL1xuXG5jbGFzcyBBY2NvcmRpb25NZW51IHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYW4gYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgQWNjb3JkaW9uTWVudSNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYW4gYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgQWNjb3JkaW9uTWVudS5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgRm91bmRhdGlvbi5OZXN0LkZlYXRoZXIodGhpcy4kZWxlbWVudCwgJ2FjY29yZGlvbicpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnQWNjb3JkaW9uTWVudScpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ0FjY29yZGlvbk1lbnUnLCB7XG4gICAgICAnRU5URVInOiAndG9nZ2xlJyxcbiAgICAgICdTUEFDRSc6ICd0b2dnbGUnLFxuICAgICAgJ0FSUk9XX1JJR0hUJzogJ29wZW4nLFxuICAgICAgJ0FSUk9XX1VQJzogJ3VwJyxcbiAgICAgICdBUlJPV19ET1dOJzogJ2Rvd24nLFxuICAgICAgJ0FSUk9XX0xFRlQnOiAnY2xvc2UnLFxuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZUFsbCdcbiAgICB9KTtcbiAgfVxuXG5cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGFjY29yZGlvbiBtZW51IGJ5IGhpZGluZyBhbGwgbmVzdGVkIG1lbnVzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1zdWJtZW51XScpLm5vdCgnLmlzLWFjdGl2ZScpLnNsaWRlVXAoMCk7Ly8uZmluZCgnYScpLmNzcygncGFkZGluZy1sZWZ0JywgJzFyZW0nKTtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xuICAgICAgJ3JvbGUnOiAnbWVudScsXG4gICAgICAnYXJpYS1tdWx0aXNlbGVjdGFibGUnOiB0aGlzLm9wdGlvbnMubXVsdGlPcGVuXG4gICAgfSk7XG5cbiAgICB0aGlzLiRtZW51TGlua3MgPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1hY2NvcmRpb24tc3VibWVudS1wYXJlbnQnKTtcbiAgICB0aGlzLiRtZW51TGlua3MuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyIGxpbmtJZCA9IHRoaXMuaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnYWNjLW1lbnUtbGluaycpLFxuICAgICAgICAgICRlbGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAkc3ViID0gJGVsZW0uY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJyksXG4gICAgICAgICAgc3ViSWQgPSAkc3ViWzBdLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ2FjYy1tZW51JyksXG4gICAgICAgICAgaXNBY3RpdmUgPSAkc3ViLmhhc0NsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgICRlbGVtLmF0dHIoe1xuICAgICAgICAnYXJpYS1jb250cm9scyc6IHN1YklkLFxuICAgICAgICAnYXJpYS1leHBhbmRlZCc6IGlzQWN0aXZlLFxuICAgICAgICAncm9sZSc6ICdtZW51aXRlbScsXG4gICAgICAgICdpZCc6IGxpbmtJZFxuICAgICAgfSk7XG4gICAgICAkc3ViLmF0dHIoe1xuICAgICAgICAnYXJpYS1sYWJlbGxlZGJ5JzogbGlua0lkLFxuICAgICAgICAnYXJpYS1oaWRkZW4nOiAhaXNBY3RpdmUsXG4gICAgICAgICdyb2xlJzogJ21lbnUnLFxuICAgICAgICAnaWQnOiBzdWJJZFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgdmFyIGluaXRQYW5lcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWFjdGl2ZScpO1xuICAgIGlmKGluaXRQYW5lcy5sZW5ndGgpe1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgIGluaXRQYW5lcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgIF90aGlzLmRvd24oJCh0aGlzKSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyBmb3IgaXRlbXMgd2l0aGluIHRoZSBtZW51LlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdsaScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgJHN1Ym1lbnUgPSAkKHRoaXMpLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpO1xuXG4gICAgICBpZiAoJHN1Ym1lbnUubGVuZ3RoKSB7XG4gICAgICAgICQodGhpcykuY2hpbGRyZW4oJ2EnKS5vZmYoJ2NsaWNrLnpmLmFjY29yZGlvbk1lbnUnKS5vbignY2xpY2suemYuYWNjb3JkaW9uTWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICBfdGhpcy50b2dnbGUoJHN1Ym1lbnUpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KS5vbigna2V5ZG93bi56Zi5hY2NvcmRpb25tZW51JywgZnVuY3Rpb24oZSl7XG4gICAgICB2YXIgJGVsZW1lbnQgPSAkKHRoaXMpLFxuICAgICAgICAgICRlbGVtZW50cyA9ICRlbGVtZW50LnBhcmVudCgndWwnKS5jaGlsZHJlbignbGknKSxcbiAgICAgICAgICAkcHJldkVsZW1lbnQsXG4gICAgICAgICAgJG5leHRFbGVtZW50LFxuICAgICAgICAgICR0YXJnZXQgPSAkZWxlbWVudC5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKTtcblxuICAgICAgJGVsZW1lbnRzLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICBpZiAoJCh0aGlzKS5pcygkZWxlbWVudCkpIHtcbiAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5tYXgoMCwgaS0xKSkuZmluZCgnYScpLmZpcnN0KCk7XG4gICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWluKGkrMSwgJGVsZW1lbnRzLmxlbmd0aC0xKSkuZmluZCgnYScpLmZpcnN0KCk7XG5cbiAgICAgICAgICBpZiAoJCh0aGlzKS5jaGlsZHJlbignW2RhdGEtc3VibWVudV06dmlzaWJsZScpLmxlbmd0aCkgeyAvLyBoYXMgb3BlbiBzdWIgbWVudVxuICAgICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnQuZmluZCgnbGk6Zmlyc3QtY2hpbGQnKS5maW5kKCdhJykuZmlyc3QoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCQodGhpcykuaXMoJzpmaXJzdC1jaGlsZCcpKSB7IC8vIGlzIGZpcnN0IGVsZW1lbnQgb2Ygc3ViIG1lbnVcbiAgICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50LnBhcmVudHMoJ2xpJykuZmlyc3QoKS5maW5kKCdhJykuZmlyc3QoKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCRwcmV2RWxlbWVudC5wYXJlbnRzKCdsaScpLmZpcnN0KCkuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdOnZpc2libGUnKS5sZW5ndGgpIHsgLy8gaWYgcHJldmlvdXMgZWxlbWVudCBoYXMgb3BlbiBzdWIgbWVudVxuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gJHByZXZFbGVtZW50LnBhcmVudHMoJ2xpJykuZmluZCgnbGk6bGFzdC1jaGlsZCcpLmZpbmQoJ2EnKS5maXJzdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoJCh0aGlzKS5pcygnOmxhc3QtY2hpbGQnKSkgeyAvLyBpcyBsYXN0IGVsZW1lbnQgb2Ygc3ViIG1lbnVcbiAgICAgICAgICAgICRuZXh0RWxlbWVudCA9ICRlbGVtZW50LnBhcmVudHMoJ2xpJykuZmlyc3QoKS5uZXh0KCdsaScpLmZpbmQoJ2EnKS5maXJzdCgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdBY2NvcmRpb25NZW51Jywge1xuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJHRhcmdldC5pcygnOmhpZGRlbicpKSB7XG4gICAgICAgICAgICBfdGhpcy5kb3duKCR0YXJnZXQpO1xuICAgICAgICAgICAgJHRhcmdldC5maW5kKCdsaScpLmZpcnN0KCkuZmluZCgnYScpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJHRhcmdldC5sZW5ndGggJiYgISR0YXJnZXQuaXMoJzpoaWRkZW4nKSkgeyAvLyBjbG9zZSBhY3RpdmUgc3ViIG9mIHRoaXMgaXRlbVxuICAgICAgICAgICAgX3RoaXMudXAoJHRhcmdldCk7XG4gICAgICAgICAgfSBlbHNlIGlmICgkZWxlbWVudC5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKSB7IC8vIGNsb3NlIGN1cnJlbnRseSBvcGVuIHN1YlxuICAgICAgICAgICAgX3RoaXMudXAoJGVsZW1lbnQucGFyZW50KCdbZGF0YS1zdWJtZW51XScpKTtcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudHMoJ2xpJykuZmlyc3QoKS5maW5kKCdhJykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRwcmV2RWxlbWVudC5mb2N1cygpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBkb3duOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgdG9nZ2xlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJGVsZW1lbnQuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBfdGhpcy50b2dnbGUoJGVsZW1lbnQuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2VBbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLmhpZGVBbGwoKTtcbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24ocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICBpZiAocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7Ly8uYXR0cigndGFiaW5kZXgnLCAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgYWxsIHBhbmVzIG9mIHRoZSBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGhpZGVBbGwoKSB7XG4gICAgdGhpcy51cCh0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykpO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGFsbCBwYW5lcyBvZiB0aGUgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBzaG93QWxsKCkge1xuICAgIHRoaXMuZG93bih0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIG9wZW4vY2xvc2Ugc3RhdGUgb2YgYSBzdWJtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSB0aGUgc3VibWVudSB0byB0b2dnbGVcbiAgICovXG4gIHRvZ2dsZSgkdGFyZ2V0KXtcbiAgICBpZighJHRhcmdldC5pcygnOmFuaW1hdGVkJykpIHtcbiAgICAgIGlmICghJHRhcmdldC5pcygnOmhpZGRlbicpKSB7XG4gICAgICAgIHRoaXMudXAoJHRhcmdldCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5kb3duKCR0YXJnZXQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgc3ViLW1lbnUgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gU3ViLW1lbnUgdG8gb3Blbi5cbiAgICogQGZpcmVzIEFjY29yZGlvbk1lbnUjZG93blxuICAgKi9cbiAgZG93bigkdGFyZ2V0KSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIGlmKCF0aGlzLm9wdGlvbnMubXVsdGlPcGVuKSB7XG4gICAgICB0aGlzLnVwKHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWFjdGl2ZScpLm5vdCgkdGFyZ2V0LnBhcmVudHNVbnRpbCh0aGlzLiRlbGVtZW50KS5hZGQoJHRhcmdldCkpKTtcbiAgICB9XG5cbiAgICAkdGFyZ2V0LmFkZENsYXNzKCdpcy1hY3RpdmUnKS5hdHRyKHsnYXJpYS1oaWRkZW4nOiBmYWxzZX0pXG4gICAgICAucGFyZW50KCcuaXMtYWNjb3JkaW9uLXN1Ym1lbnUtcGFyZW50JykuYXR0cih7J2FyaWEtZXhwYW5kZWQnOiB0cnVlfSk7XG5cbiAgICAgIC8vRm91bmRhdGlvbi5Nb3ZlKHRoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCAkdGFyZ2V0LCBmdW5jdGlvbigpIHtcbiAgICAgICAgJHRhcmdldC5zbGlkZURvd24oX3RoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgbWVudSBpcyBkb25lIG9wZW5pbmcuXG4gICAgICAgICAgICogQGV2ZW50IEFjY29yZGlvbk1lbnUjZG93blxuICAgICAgICAgICAqL1xuICAgICAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Rvd24uemYuYWNjb3JkaW9uTWVudScsIFskdGFyZ2V0XSk7XG4gICAgICAgIH0pO1xuICAgICAgLy99KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIHN1Yi1tZW51IGRlZmluZWQgYnkgYCR0YXJnZXRgLiBBbGwgc3ViLW1lbnVzIGluc2lkZSB0aGUgdGFyZ2V0IHdpbGwgYmUgY2xvc2VkIGFzIHdlbGwuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gU3ViLW1lbnUgdG8gY2xvc2UuXG4gICAqIEBmaXJlcyBBY2NvcmRpb25NZW51I3VwXG4gICAqL1xuICB1cCgkdGFyZ2V0KSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAvL0ZvdW5kYXRpb24uTW92ZSh0aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgJHRhcmdldCwgZnVuY3Rpb24oKXtcbiAgICAgICR0YXJnZXQuc2xpZGVVcChfdGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIG1lbnUgaXMgZG9uZSBjb2xsYXBzaW5nIHVwLlxuICAgICAgICAgKiBAZXZlbnQgQWNjb3JkaW9uTWVudSN1cFxuICAgICAgICAgKi9cbiAgICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcigndXAuemYuYWNjb3JkaW9uTWVudScsIFskdGFyZ2V0XSk7XG4gICAgICB9KTtcbiAgICAvL30pO1xuXG4gICAgdmFyICRtZW51cyA9ICR0YXJnZXQuZmluZCgnW2RhdGEtc3VibWVudV0nKS5zbGlkZVVwKDApLmFkZEJhY2soKS5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpO1xuXG4gICAgJG1lbnVzLnBhcmVudCgnLmlzLWFjY29yZGlvbi1zdWJtZW51LXBhcmVudCcpLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBmYWxzZSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBmaXJlcyBBY2NvcmRpb25NZW51I2Rlc3Ryb3llZFxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykuc2xpZGVEb3duKDApLmNzcygnZGlzcGxheScsICcnKTtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKS5vZmYoJ2NsaWNrLnpmLmFjY29yZGlvbk1lbnUnKTtcblxuICAgIEZvdW5kYXRpb24uTmVzdC5CdXJuKHRoaXMuJGVsZW1lbnQsICdhY2NvcmRpb24nKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuQWNjb3JkaW9uTWVudS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGFuaW1hdGUgdGhlIG9wZW5pbmcgb2YgYSBzdWJtZW51IGluIG1zLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDI1MFxuICAgKi9cbiAgc2xpZGVTcGVlZDogMjUwLFxuICAvKipcbiAgICogQWxsb3cgdGhlIG1lbnUgdG8gaGF2ZSBtdWx0aXBsZSBvcGVuIHBhbmVzLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICBtdWx0aU9wZW46IHRydWVcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihBY2NvcmRpb25NZW51LCAnQWNjb3JkaW9uTWVudScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogRHJpbGxkb3duIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5kcmlsbGRvd25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm5lc3RcbiAqL1xuXG5jbGFzcyBEcmlsbGRvd24ge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIGRyaWxsZG93biBtZW51LlxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhbiBhY2NvcmRpb24gbWVudS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBEcmlsbGRvd24uZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIEZvdW5kYXRpb24uTmVzdC5GZWF0aGVyKHRoaXMuJGVsZW1lbnQsICdkcmlsbGRvd24nKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0RyaWxsZG93bicpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ0RyaWxsZG93bicsIHtcbiAgICAgICdFTlRFUic6ICdvcGVuJyxcbiAgICAgICdTUEFDRSc6ICdvcGVuJyxcbiAgICAgICdBUlJPV19SSUdIVCc6ICduZXh0JyxcbiAgICAgICdBUlJPV19VUCc6ICd1cCcsXG4gICAgICAnQVJST1dfRE9XTic6ICdkb3duJyxcbiAgICAgICdBUlJPV19MRUZUJzogJ3ByZXZpb3VzJyxcbiAgICAgICdFU0NBUEUnOiAnY2xvc2UnLFxuICAgICAgJ1RBQic6ICdkb3duJyxcbiAgICAgICdTSElGVF9UQUInOiAndXAnXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGRyaWxsZG93biBieSBjcmVhdGluZyBqUXVlcnkgY29sbGVjdGlvbnMgb2YgZWxlbWVudHNcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuJHN1Ym1lbnVBbmNob3JzID0gdGhpcy4kZWxlbWVudC5maW5kKCdsaS5pcy1kcmlsbGRvd24tc3VibWVudS1wYXJlbnQnKS5jaGlsZHJlbignYScpO1xuICAgIHRoaXMuJHN1Ym1lbnVzID0gdGhpcy4kc3VibWVudUFuY2hvcnMucGFyZW50KCdsaScpLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpO1xuICAgIHRoaXMuJG1lbnVJdGVtcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnbGknKS5ub3QoJy5qcy1kcmlsbGRvd24tYmFjaycpLmF0dHIoJ3JvbGUnLCAnbWVudWl0ZW0nKS5maW5kKCdhJyk7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdkYXRhLW11dGF0ZScsICh0aGlzLiRlbGVtZW50LmF0dHIoJ2RhdGEtZHJpbGxkb3duJykgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnZHJpbGxkb3duJykpKTtcblxuICAgIHRoaXMuX3ByZXBhcmVNZW51KCk7XG4gICAgdGhpcy5fcmVnaXN0ZXJFdmVudHMoKTtcblxuICAgIHRoaXMuX2tleWJvYXJkRXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogcHJlcGFyZXMgZHJpbGxkb3duIG1lbnUgYnkgc2V0dGluZyBhdHRyaWJ1dGVzIHRvIGxpbmtzIGFuZCBlbGVtZW50c1xuICAgKiBzZXRzIGEgbWluIGhlaWdodCB0byBwcmV2ZW50IGNvbnRlbnQganVtcGluZ1xuICAgKiB3cmFwcyB0aGUgZWxlbWVudCBpZiBub3QgYWxyZWFkeSB3cmFwcGVkXG4gICAqIEBwcml2YXRlXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgX3ByZXBhcmVNZW51KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgLy8gaWYoIXRoaXMub3B0aW9ucy5ob2xkT3Blbil7XG4gICAgLy8gICB0aGlzLl9tZW51TGlua0V2ZW50cygpO1xuICAgIC8vIH1cbiAgICB0aGlzLiRzdWJtZW51QW5jaG9ycy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJGxpbmsgPSAkKHRoaXMpO1xuICAgICAgdmFyICRzdWIgPSAkbGluay5wYXJlbnQoKTtcbiAgICAgIGlmKF90aGlzLm9wdGlvbnMucGFyZW50TGluayl7XG4gICAgICAgICRsaW5rLmNsb25lKCkucHJlcGVuZFRvKCRzdWIuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykpLndyYXAoJzxsaSBjbGFzcz1cImlzLXN1Ym1lbnUtcGFyZW50LWl0ZW0gaXMtc3VibWVudS1pdGVtIGlzLWRyaWxsZG93bi1zdWJtZW51LWl0ZW1cIiByb2xlPVwibWVudS1pdGVtXCI+PC9saT4nKTtcbiAgICAgIH1cbiAgICAgICRsaW5rLmRhdGEoJ3NhdmVkSHJlZicsICRsaW5rLmF0dHIoJ2hyZWYnKSkucmVtb3ZlQXR0cignaHJlZicpLmF0dHIoJ3RhYmluZGV4JywgMCk7XG4gICAgICAkbGluay5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKVxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdhcmlhLWhpZGRlbic6IHRydWUsXG4gICAgICAgICAgICAndGFiaW5kZXgnOiAwLFxuICAgICAgICAgICAgJ3JvbGUnOiAnbWVudSdcbiAgICAgICAgICB9KTtcbiAgICAgIF90aGlzLl9ldmVudHMoJGxpbmspO1xuICAgIH0pO1xuICAgIHRoaXMuJHN1Ym1lbnVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciAkbWVudSA9ICQodGhpcyksXG4gICAgICAgICAgJGJhY2sgPSAkbWVudS5maW5kKCcuanMtZHJpbGxkb3duLWJhY2snKTtcbiAgICAgIGlmKCEkYmFjay5sZW5ndGgpe1xuICAgICAgICBzd2l0Y2ggKF90aGlzLm9wdGlvbnMuYmFja0J1dHRvblBvc2l0aW9uKSB7XG4gICAgICAgICAgY2FzZSBcImJvdHRvbVwiOlxuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKF90aGlzLm9wdGlvbnMuYmFja0J1dHRvbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFwidG9wXCI6XG4gICAgICAgICAgICAkbWVudS5wcmVwZW5kKF90aGlzLm9wdGlvbnMuYmFja0J1dHRvbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlVuc3VwcG9ydGVkIGJhY2tCdXR0b25Qb3NpdGlvbiB2YWx1ZSAnXCIgKyBfdGhpcy5vcHRpb25zLmJhY2tCdXR0b25Qb3NpdGlvbiArIFwiJ1wiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgX3RoaXMuX2JhY2soJG1lbnUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy4kc3VibWVudXMuYWRkQ2xhc3MoJ2ludmlzaWJsZScpO1xuICAgIGlmKCF0aGlzLm9wdGlvbnMuYXV0b0hlaWdodCkge1xuICAgICAgdGhpcy4kc3VibWVudXMuYWRkQ2xhc3MoJ2RyaWxsZG93bi1zdWJtZW51LWNvdmVyLXByZXZpb3VzJyk7XG4gICAgfVxuXG4gICAgLy8gY3JlYXRlIGEgd3JhcHBlciBvbiBlbGVtZW50IGlmIGl0IGRvZXNuJ3QgZXhpc3QuXG4gICAgaWYoIXRoaXMuJGVsZW1lbnQucGFyZW50KCkuaGFzQ2xhc3MoJ2lzLWRyaWxsZG93bicpKXtcbiAgICAgIHRoaXMuJHdyYXBwZXIgPSAkKHRoaXMub3B0aW9ucy53cmFwcGVyKS5hZGRDbGFzcygnaXMtZHJpbGxkb3duJyk7XG4gICAgICBpZih0aGlzLm9wdGlvbnMuYW5pbWF0ZUhlaWdodCkgdGhpcy4kd3JhcHBlci5hZGRDbGFzcygnYW5pbWF0ZS1oZWlnaHQnKTtcbiAgICAgIHRoaXMuJGVsZW1lbnQud3JhcCh0aGlzLiR3cmFwcGVyKTtcbiAgICB9XG4gICAgLy8gc2V0IHdyYXBwZXJcbiAgICB0aGlzLiR3cmFwcGVyID0gdGhpcy4kZWxlbWVudC5wYXJlbnQoKTtcbiAgICB0aGlzLiR3cmFwcGVyLmNzcyh0aGlzLl9nZXRNYXhEaW1zKCkpO1xuICB9XG5cbiAgX3Jlc2l6ZSgpIHtcbiAgICB0aGlzLiR3cmFwcGVyLmNzcyh7J21heC13aWR0aCc6ICdub25lJywgJ21pbi1oZWlnaHQnOiAnbm9uZSd9KTtcbiAgICAvLyBfZ2V0TWF4RGltcyBoYXMgc2lkZSBlZmZlY3RzIChib28pIGJ1dCBjYWxsaW5nIGl0IHNob3VsZCB1cGRhdGUgYWxsIG90aGVyIG5lY2Vzc2FyeSBoZWlnaHRzICYgd2lkdGhzXG4gICAgdGhpcy4kd3JhcHBlci5jc3ModGhpcy5fZ2V0TWF4RGltcygpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIHRvIGVsZW1lbnRzIGluIHRoZSBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtIC0gdGhlIGN1cnJlbnQgbWVudSBpdGVtIHRvIGFkZCBoYW5kbGVycyB0by5cbiAgICovXG4gIF9ldmVudHMoJGVsZW0pIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgJGVsZW0ub2ZmKCdjbGljay56Zi5kcmlsbGRvd24nKVxuICAgIC5vbignY2xpY2suemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICBpZigkKGUudGFyZ2V0KS5wYXJlbnRzVW50aWwoJ3VsJywgJ2xpJykuaGFzQ2xhc3MoJ2lzLWRyaWxsZG93bi1zdWJtZW51LXBhcmVudCcpKXtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfVxuXG4gICAgICAvLyBpZihlLnRhcmdldCAhPT0gZS5jdXJyZW50VGFyZ2V0LmZpcnN0RWxlbWVudENoaWxkKXtcbiAgICAgIC8vICAgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gfVxuICAgICAgX3RoaXMuX3Nob3coJGVsZW0ucGFyZW50KCdsaScpKTtcblxuICAgICAgaWYoX3RoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2spe1xuICAgICAgICB2YXIgJGJvZHkgPSAkKCdib2R5Jyk7XG4gICAgICAgICRib2R5Lm9mZignLnpmLmRyaWxsZG93bicpLm9uKCdjbGljay56Zi5kcmlsbGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICBpZiAoZS50YXJnZXQgPT09IF90aGlzLiRlbGVtZW50WzBdIHx8ICQuY29udGFpbnMoX3RoaXMuJGVsZW1lbnRbMF0sIGUudGFyZ2V0KSkgeyByZXR1cm47IH1cbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMuX2hpZGVBbGwoKTtcbiAgICAgICAgICAkYm9keS5vZmYoJy56Zi5kcmlsbGRvd24nKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG5cdCAgdGhpcy4kZWxlbWVudC5vbignbXV0YXRlbWUuemYudHJpZ2dlcicsIHRoaXMuX3Jlc2l6ZS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIHRvIHRoZSBtZW51IGVsZW1lbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlZ2lzdGVyRXZlbnRzKCkge1xuICAgIGlmKHRoaXMub3B0aW9ucy5zY3JvbGxUb3Ape1xuICAgICAgdGhpcy5fYmluZEhhbmRsZXIgPSB0aGlzLl9zY3JvbGxUb3AuYmluZCh0aGlzKTtcbiAgICAgIHRoaXMuJGVsZW1lbnQub24oJ29wZW4uemYuZHJpbGxkb3duIGhpZGUuemYuZHJpbGxkb3duIGNsb3NlZC56Zi5kcmlsbGRvd24nLHRoaXMuX2JpbmRIYW5kbGVyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2Nyb2xsIHRvIFRvcCBvZiBFbGVtZW50IG9yIGRhdGEtc2Nyb2xsLXRvcC1lbGVtZW50XG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJpbGxkb3duI3Njcm9sbG1lXG4gICAqL1xuICBfc2Nyb2xsVG9wKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdmFyICRzY3JvbGxUb3BFbGVtZW50ID0gX3RoaXMub3B0aW9ucy5zY3JvbGxUb3BFbGVtZW50IT0nJz8kKF90aGlzLm9wdGlvbnMuc2Nyb2xsVG9wRWxlbWVudCk6X3RoaXMuJGVsZW1lbnQsXG4gICAgICAgIHNjcm9sbFBvcyA9IHBhcnNlSW50KCRzY3JvbGxUb3BFbGVtZW50Lm9mZnNldCgpLnRvcCtfdGhpcy5vcHRpb25zLnNjcm9sbFRvcE9mZnNldCk7XG4gICAgJCgnaHRtbCwgYm9keScpLnN0b3AodHJ1ZSkuYW5pbWF0ZSh7IHNjcm9sbFRvcDogc2Nyb2xsUG9zIH0sIF90aGlzLm9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb24sIF90aGlzLm9wdGlvbnMuYW5pbWF0aW9uRWFzaW5nLGZ1bmN0aW9uKCl7XG4gICAgICAvKipcbiAgICAgICAgKiBGaXJlcyBhZnRlciB0aGUgbWVudSBoYXMgc2Nyb2xsZWRcbiAgICAgICAgKiBAZXZlbnQgRHJpbGxkb3duI3Njcm9sbG1lXG4gICAgICAgICovXG4gICAgICBpZih0aGlzPT09JCgnaHRtbCcpWzBdKV90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Njcm9sbG1lLnpmLmRyaWxsZG93bicpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMga2V5ZG93biBldmVudCBsaXN0ZW5lciB0byBgbGlgJ3MgaW4gdGhlIG1lbnUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfa2V5Ym9hcmRFdmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJG1lbnVJdGVtcy5hZGQodGhpcy4kZWxlbWVudC5maW5kKCcuanMtZHJpbGxkb3duLWJhY2sgPiBhLCAuaXMtc3VibWVudS1wYXJlbnQtaXRlbSA+IGEnKSkub24oJ2tleWRvd24uemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICB2YXIgJGVsZW1lbnQgPSAkKHRoaXMpLFxuICAgICAgICAgICRlbGVtZW50cyA9ICRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykuY2hpbGRyZW4oJ2xpJykuY2hpbGRyZW4oJ2EnKSxcbiAgICAgICAgICAkcHJldkVsZW1lbnQsXG4gICAgICAgICAgJG5leHRFbGVtZW50O1xuXG4gICAgICAkZWxlbWVudHMuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKCRlbGVtZW50KSkge1xuICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50cy5lcShNYXRoLm1heCgwLCBpLTEpKTtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5taW4oaSsxLCAkZWxlbWVudHMubGVuZ3RoLTEpKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnRHJpbGxkb3duJywge1xuICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJGVsZW1lbnQuaXMoX3RoaXMuJHN1Ym1lbnVBbmNob3JzKSkge1xuICAgICAgICAgICAgX3RoaXMuX3Nob3coJGVsZW1lbnQucGFyZW50KCdsaScpKTtcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLmZpbmQoJ3VsIGxpIGEnKS5maWx0ZXIoX3RoaXMuJG1lbnVJdGVtcykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHByZXZpb3VzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpKTtcbiAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW1lbnQpLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5wYXJlbnQoJ2xpJykuY2hpbGRyZW4oJ2EnKS5maXJzdCgpLmZvY3VzKCk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgdXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRwcmV2RWxlbWVudC5mb2N1cygpO1xuICAgICAgICAgIC8vIERvbid0IHRhcCBmb2N1cyBvbiBmaXJzdCBlbGVtZW50IGluIHJvb3QgdWxcbiAgICAgICAgICByZXR1cm4gISRlbGVtZW50LmlzKF90aGlzLiRlbGVtZW50LmZpbmQoJz4gbGk6Zmlyc3QtY2hpbGQgPiBhJykpO1xuICAgICAgICB9LFxuICAgICAgICBkb3duOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgICAvLyBEb24ndCB0YXAgZm9jdXMgb24gbGFzdCBlbGVtZW50IGluIHJvb3QgdWxcbiAgICAgICAgICByZXR1cm4gISRlbGVtZW50LmlzKF90aGlzLiRlbGVtZW50LmZpbmQoJz4gbGk6bGFzdC1jaGlsZCA+IGEnKSk7XG4gICAgICAgIH0sXG4gICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBEb24ndCBjbG9zZSBvbiBlbGVtZW50IGluIHJvb3QgdWxcbiAgICAgICAgICBpZiAoISRlbGVtZW50LmlzKF90aGlzLiRlbGVtZW50LmZpbmQoJz4gbGkgPiBhJykpKSB7XG4gICAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbWVudC5wYXJlbnQoKS5wYXJlbnQoKSk7XG4gICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoKS5wYXJlbnQoKS5zaWJsaW5ncygnYScpLmZvY3VzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoISRlbGVtZW50LmlzKF90aGlzLiRtZW51SXRlbXMpKSB7IC8vIG5vdCBtZW51IGl0ZW0gbWVhbnMgYmFjayBidXR0b25cbiAgICAgICAgICAgIF90aGlzLl9oaWRlKCRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykpO1xuICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpLnBhcmVudCgnbGknKS5jaGlsZHJlbignYScpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoJGVsZW1lbnQuaXMoX3RoaXMuJHN1Ym1lbnVBbmNob3JzKSkge1xuICAgICAgICAgICAgX3RoaXMuX3Nob3coJGVsZW1lbnQucGFyZW50KCdsaScpKTtcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLmZpbmQoJ3VsIGxpIGEnKS5maWx0ZXIoX3RoaXMuJG1lbnVJdGVtcykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgaWYgKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pOyAvLyBlbmQga2V5Ym9hcmRBY2Nlc3NcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgYWxsIG9wZW4gZWxlbWVudHMsIGFuZCByZXR1cm5zIHRvIHJvb3QgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBEcmlsbGRvd24jY2xvc2VkXG4gICAqL1xuICBfaGlkZUFsbCgpIHtcbiAgICB2YXIgJGVsZW0gPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1kcmlsbGRvd24tc3VibWVudS5pcy1hY3RpdmUnKS5hZGRDbGFzcygnaXMtY2xvc2luZycpO1xuICAgIGlmKHRoaXMub3B0aW9ucy5hdXRvSGVpZ2h0KSB0aGlzLiR3cmFwcGVyLmNzcyh7aGVpZ2h0OiRlbGVtLnBhcmVudCgpLmNsb3Nlc3QoJ3VsJykuZGF0YSgnY2FsY0hlaWdodCcpfSk7XG4gICAgJGVsZW0ub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbSksIGZ1bmN0aW9uKGUpe1xuICAgICAgJGVsZW0ucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1jbG9zaW5nJyk7XG4gICAgfSk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBtZW51IGlzIGZ1bGx5IGNsb3NlZC5cbiAgICAgICAgICogQGV2ZW50IERyaWxsZG93biNjbG9zZWRcbiAgICAgICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZWQuemYuZHJpbGxkb3duJyk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lciBmb3IgZWFjaCBgYmFja2AgYnV0dG9uLCBhbmQgY2xvc2VzIG9wZW4gbWVudXMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJpbGxkb3duI2JhY2tcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtIC0gdGhlIGN1cnJlbnQgc3ViLW1lbnUgdG8gYWRkIGBiYWNrYCBldmVudC5cbiAgICovXG4gIF9iYWNrKCRlbGVtKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAkZWxlbS5vZmYoJ2NsaWNrLnpmLmRyaWxsZG93bicpO1xuICAgICRlbGVtLmNoaWxkcmVuKCcuanMtZHJpbGxkb3duLWJhY2snKVxuICAgICAgLm9uKCdjbGljay56Zi5kcmlsbGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ21vdXNldXAgb24gYmFjaycpO1xuICAgICAgICBfdGhpcy5faGlkZSgkZWxlbSk7XG5cbiAgICAgICAgLy8gSWYgdGhlcmUgaXMgYSBwYXJlbnQgc3VibWVudSwgY2FsbCBzaG93XG4gICAgICAgIGxldCBwYXJlbnRTdWJNZW51ID0gJGVsZW0ucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5wYXJlbnQoJ2xpJyk7XG4gICAgICAgIGlmIChwYXJlbnRTdWJNZW51Lmxlbmd0aCkge1xuICAgICAgICAgIF90aGlzLl9zaG93KHBhcmVudFN1Yk1lbnUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGxpc3RlbmVyIHRvIG1lbnUgaXRlbXMgdy9vIHN1Ym1lbnVzIHRvIGNsb3NlIG9wZW4gbWVudXMgb24gY2xpY2suXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX21lbnVMaW5rRXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy4kbWVudUl0ZW1zLm5vdCgnLmlzLWRyaWxsZG93bi1zdWJtZW51LXBhcmVudCcpXG4gICAgICAgIC5vZmYoJ2NsaWNrLnpmLmRyaWxsZG93bicpXG4gICAgICAgIC5vbignY2xpY2suemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgLy8gZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBfdGhpcy5faGlkZUFsbCgpO1xuICAgICAgICAgIH0sIDApO1xuICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgYSBzdWJtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIERyaWxsZG93biNvcGVuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIHRoZSBjdXJyZW50IGVsZW1lbnQgd2l0aCBhIHN1Ym1lbnUgdG8gb3BlbiwgaS5lLiB0aGUgYGxpYCB0YWcuXG4gICAqL1xuICBfc2hvdygkZWxlbSkge1xuICAgIGlmKHRoaXMub3B0aW9ucy5hdXRvSGVpZ2h0KSB0aGlzLiR3cmFwcGVyLmNzcyh7aGVpZ2h0OiRlbGVtLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpLmRhdGEoJ2NhbGNIZWlnaHQnKX0pO1xuICAgICRlbGVtLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCB0cnVlKTtcbiAgICAkZWxlbS5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKS5hZGRDbGFzcygnaXMtYWN0aXZlJykucmVtb3ZlQ2xhc3MoJ2ludmlzaWJsZScpLmF0dHIoJ2FyaWEtaGlkZGVuJywgZmFsc2UpO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHN1Ym1lbnUgaGFzIG9wZW5lZC5cbiAgICAgKiBAZXZlbnQgRHJpbGxkb3duI29wZW5cbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29wZW4uemYuZHJpbGxkb3duJywgWyRlbGVtXSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEhpZGVzIGEgc3VibWVudVxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIERyaWxsZG93biNoaWRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIHRoZSBjdXJyZW50IHN1Yi1tZW51IHRvIGhpZGUsIGkuZS4gdGhlIGB1bGAgdGFnLlxuICAgKi9cbiAgX2hpZGUoJGVsZW0pIHtcbiAgICBpZih0aGlzLm9wdGlvbnMuYXV0b0hlaWdodCkgdGhpcy4kd3JhcHBlci5jc3Moe2hlaWdodDokZWxlbS5wYXJlbnQoKS5jbG9zZXN0KCd1bCcpLmRhdGEoJ2NhbGNIZWlnaHQnKX0pO1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgJGVsZW0ucGFyZW50KCdsaScpLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBmYWxzZSk7XG4gICAgJGVsZW0uYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKS5hZGRDbGFzcygnaXMtY2xvc2luZycpXG4gICAgJGVsZW0uYWRkQ2xhc3MoJ2lzLWNsb3NpbmcnKVxuICAgICAgICAgLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW0pLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAkZWxlbS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlIGlzLWNsb3NpbmcnKTtcbiAgICAgICAgICAgJGVsZW0uYmx1cigpLmFkZENsYXNzKCdpbnZpc2libGUnKTtcbiAgICAgICAgIH0pO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHN1Ym1lbnUgaGFzIGNsb3NlZC5cbiAgICAgKiBAZXZlbnQgRHJpbGxkb3duI2hpZGVcbiAgICAgKi9cbiAgICAkZWxlbS50cmlnZ2VyKCdoaWRlLnpmLmRyaWxsZG93bicsIFskZWxlbV0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGVzIHRocm91Z2ggdGhlIG5lc3RlZCBtZW51cyB0byBjYWxjdWxhdGUgdGhlIG1pbi1oZWlnaHQsIGFuZCBtYXgtd2lkdGggZm9yIHRoZSBtZW51LlxuICAgKiBQcmV2ZW50cyBjb250ZW50IGp1bXBpbmcuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2dldE1heERpbXMoKSB7XG4gICAgdmFyICBtYXhIZWlnaHQgPSAwLCByZXN1bHQgPSB7fSwgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuJHN1Ym1lbnVzLmFkZCh0aGlzLiRlbGVtZW50KS5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgbnVtT2ZFbGVtcyA9ICQodGhpcykuY2hpbGRyZW4oJ2xpJykubGVuZ3RoO1xuICAgICAgdmFyIGhlaWdodCA9IEZvdW5kYXRpb24uQm94LkdldERpbWVuc2lvbnModGhpcykuaGVpZ2h0O1xuICAgICAgbWF4SGVpZ2h0ID0gaGVpZ2h0ID4gbWF4SGVpZ2h0ID8gaGVpZ2h0IDogbWF4SGVpZ2h0O1xuICAgICAgaWYoX3RoaXMub3B0aW9ucy5hdXRvSGVpZ2h0KSB7XG4gICAgICAgICQodGhpcykuZGF0YSgnY2FsY0hlaWdodCcsaGVpZ2h0KTtcbiAgICAgICAgaWYgKCEkKHRoaXMpLmhhc0NsYXNzKCdpcy1kcmlsbGRvd24tc3VibWVudScpKSByZXN1bHRbJ2hlaWdodCddID0gaGVpZ2h0O1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYoIXRoaXMub3B0aW9ucy5hdXRvSGVpZ2h0KSByZXN1bHRbJ21pbi1oZWlnaHQnXSA9IGAke21heEhlaWdodH1weGA7XG5cbiAgICByZXN1bHRbJ21heC13aWR0aCddID0gYCR7dGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aH1weGA7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBEcmlsbGRvd24gTWVudVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgaWYodGhpcy5vcHRpb25zLnNjcm9sbFRvcCkgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi5kcmlsbGRvd24nLHRoaXMuX2JpbmRIYW5kbGVyKTtcbiAgICB0aGlzLl9oaWRlQWxsKCk7XG5cdCAgdGhpcy4kZWxlbWVudC5vZmYoJ211dGF0ZW1lLnpmLnRyaWdnZXInKTtcbiAgICBGb3VuZGF0aW9uLk5lc3QuQnVybih0aGlzLiRlbGVtZW50LCAnZHJpbGxkb3duJyk7XG4gICAgdGhpcy4kZWxlbWVudC51bndyYXAoKVxuICAgICAgICAgICAgICAgICAuZmluZCgnLmpzLWRyaWxsZG93bi1iYWNrLCAuaXMtc3VibWVudS1wYXJlbnQtaXRlbScpLnJlbW92ZSgpXG4gICAgICAgICAgICAgICAgIC5lbmQoKS5maW5kKCcuaXMtYWN0aXZlLCAuaXMtY2xvc2luZywgLmlzLWRyaWxsZG93bi1zdWJtZW51JykucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1jbG9zaW5nIGlzLWRyaWxsZG93bi1zdWJtZW51JylcbiAgICAgICAgICAgICAgICAgLmVuZCgpLmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykucmVtb3ZlQXR0cignYXJpYS1oaWRkZW4gdGFiaW5kZXggcm9sZScpO1xuICAgIHRoaXMuJHN1Ym1lbnVBbmNob3JzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAkKHRoaXMpLm9mZignLnpmLmRyaWxsZG93bicpO1xuICAgIH0pO1xuXG4gICAgdGhpcy4kc3VibWVudXMucmVtb3ZlQ2xhc3MoJ2RyaWxsZG93bi1zdWJtZW51LWNvdmVyLXByZXZpb3VzJyk7XG5cbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKS5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJGxpbmsgPSAkKHRoaXMpO1xuICAgICAgJGxpbmsucmVtb3ZlQXR0cigndGFiaW5kZXgnKTtcbiAgICAgIGlmKCRsaW5rLmRhdGEoJ3NhdmVkSHJlZicpKXtcbiAgICAgICAgJGxpbmsuYXR0cignaHJlZicsICRsaW5rLmRhdGEoJ3NhdmVkSHJlZicpKS5yZW1vdmVEYXRhKCdzYXZlZEhyZWYnKTtcbiAgICAgIH1lbHNleyByZXR1cm47IH1cbiAgICB9KTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH07XG59XG5cbkRyaWxsZG93bi5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIE1hcmt1cCB1c2VkIGZvciBKUyBnZW5lcmF0ZWQgYmFjayBidXR0b24uIFByZXBlbmRlZCAgb3IgYXBwZW5kZWQgKHNlZSBiYWNrQnV0dG9uUG9zaXRpb24pIHRvIHN1Ym1lbnUgbGlzdHMgYW5kIGRlbGV0ZWQgb24gYGRlc3Ryb3lgIG1ldGhvZCwgJ2pzLWRyaWxsZG93bi1iYWNrJyBjbGFzcyByZXF1aXJlZC4gUmVtb3ZlIHRoZSBiYWNrc2xhc2ggKGBcXGApIGlmIGNvcHkgYW5kIHBhc3RpbmcuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJzxsaSBjbGFzcz1cImpzLWRyaWxsZG93bi1iYWNrXCI+PGEgdGFiaW5kZXg9XCIwXCI+QmFjazwvYT48L2xpPidcbiAgICovXG4gIGJhY2tCdXR0b246ICc8bGkgY2xhc3M9XCJqcy1kcmlsbGRvd24tYmFja1wiPjxhIHRhYmluZGV4PVwiMFwiPkJhY2s8L2E+PC9saT4nLFxuICAvKipcbiAgICogUG9zaXRpb24gdGhlIGJhY2sgYnV0dG9uIGVpdGhlciBhdCB0aGUgdG9wIG9yIGJvdHRvbSBvZiBkcmlsbGRvd24gc3VibWVudXMuIENhbiBiZSBgJ2xlZnQnYCBvciBgJ2JvdHRvbSdgLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0IHRvcFxuICAgKi9cbiAgYmFja0J1dHRvblBvc2l0aW9uOiAndG9wJyxcbiAgLyoqXG4gICAqIE1hcmt1cCB1c2VkIHRvIHdyYXAgZHJpbGxkb3duIG1lbnUuIFVzZSBhIGNsYXNzIG5hbWUgZm9yIGluZGVwZW5kZW50IHN0eWxpbmc7IHRoZSBKUyBhcHBsaWVkIGNsYXNzOiBgaXMtZHJpbGxkb3duYCBpcyByZXF1aXJlZC4gUmVtb3ZlIHRoZSBiYWNrc2xhc2ggKGBcXGApIGlmIGNvcHkgYW5kIHBhc3RpbmcuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJzxkaXY+PC9kaXY+J1xuICAgKi9cbiAgd3JhcHBlcjogJzxkaXY+PC9kaXY+JyxcbiAgLyoqXG4gICAqIEFkZHMgdGhlIHBhcmVudCBsaW5rIHRvIHRoZSBzdWJtZW51LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgcGFyZW50TGluazogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgbWVudSB0byByZXR1cm4gdG8gcm9vdCBsaXN0IG9uIGJvZHkgY2xpY2suXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgdGhlIG1lbnUgdG8gYXV0byBhZGp1c3QgaGVpZ2h0LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgYXV0b0hlaWdodDogZmFsc2UsXG4gIC8qKlxuICAgKiBBbmltYXRlIHRoZSBhdXRvIGFkanVzdCBoZWlnaHQuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBhbmltYXRlSGVpZ2h0OiBmYWxzZSxcbiAgLyoqXG4gICAqIFNjcm9sbCB0byB0aGUgdG9wIG9mIHRoZSBtZW51IGFmdGVyIG9wZW5pbmcgYSBzdWJtZW51IG9yIG5hdmlnYXRpbmcgYmFjayB1c2luZyB0aGUgbWVudSBiYWNrIGJ1dHRvblxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgc2Nyb2xsVG9wOiBmYWxzZSxcbiAgLyoqXG4gICAqIFN0cmluZyBqcXVlcnkgc2VsZWN0b3IgKGZvciBleGFtcGxlICdib2R5Jykgb2YgZWxlbWVudCB0byB0YWtlIG9mZnNldCgpLnRvcCBmcm9tLCBpZiBlbXB0eSBzdHJpbmcgdGhlIGRyaWxsZG93biBtZW51IG9mZnNldCgpLnRvcCBpcyB0YWtlblxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICcnXG4gICAqL1xuICBzY3JvbGxUb3BFbGVtZW50OiAnJyxcbiAgLyoqXG4gICAqIFNjcm9sbFRvcCBvZmZzZXRcbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAwXG4gICAqL1xuICBzY3JvbGxUb3BPZmZzZXQ6IDAsXG4gIC8qKlxuICAgKiBTY3JvbGwgYW5pbWF0aW9uIGR1cmF0aW9uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcn1cbiAgICogQGRlZmF1bHQgNTAwXG4gICAqL1xuICBhbmltYXRpb25EdXJhdGlvbjogNTAwLFxuICAvKipcbiAgICogU2Nyb2xsIGFuaW1hdGlvbiBlYXNpbmcuIENhbiBiZSBgJ3N3aW5nJ2Agb3IgYCdsaW5lYXInYC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAc2VlIHtAbGluayBodHRwczovL2FwaS5qcXVlcnkuY29tL2FuaW1hdGV8SlF1ZXJ5IGFuaW1hdGV9XG4gICAqIEBkZWZhdWx0ICdzd2luZydcbiAgICovXG4gIGFuaW1hdGlvbkVhc2luZzogJ3N3aW5nJ1xuICAvLyBob2xkT3BlbjogZmFsc2Vcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihEcmlsbGRvd24sICdEcmlsbGRvd24nKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIERyb3Bkb3duIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5kcm9wZG93blxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5ib3hcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqL1xuXG5jbGFzcyBEcm9wZG93biB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgZHJvcGRvd24uXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGEgZHJvcGRvd24uXG4gICAqICAgICAgICBPYmplY3Qgc2hvdWxkIGJlIG9mIHRoZSBkcm9wZG93biBwYW5lbCwgcmF0aGVyIHRoYW4gaXRzIGFuY2hvci5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBEcm9wZG93bi5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0Ryb3Bkb3duJyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignRHJvcGRvd24nLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBwbHVnaW4gYnkgc2V0dGluZy9jaGVja2luZyBvcHRpb25zIGFuZCBhdHRyaWJ1dGVzLCBhZGRpbmcgaGVscGVyIHZhcmlhYmxlcywgYW5kIHNhdmluZyB0aGUgYW5jaG9yLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciAkaWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJyk7XG5cbiAgICB0aGlzLiRhbmNob3IgPSAkKGBbZGF0YS10b2dnbGU9XCIkeyRpZH1cIl1gKS5sZW5ndGggPyAkKGBbZGF0YS10b2dnbGU9XCIkeyRpZH1cIl1gKSA6ICQoYFtkYXRhLW9wZW49XCIkeyRpZH1cIl1gKTtcbiAgICB0aGlzLiRhbmNob3IuYXR0cih7XG4gICAgICAnYXJpYS1jb250cm9scyc6ICRpZCxcbiAgICAgICdkYXRhLWlzLWZvY3VzJzogZmFsc2UsXG4gICAgICAnZGF0YS15ZXRpLWJveCc6ICRpZCxcbiAgICAgICdhcmlhLWhhc3BvcHVwJzogdHJ1ZSxcbiAgICAgICdhcmlhLWV4cGFuZGVkJzogZmFsc2VcblxuICAgIH0pO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLnBhcmVudENsYXNzKXtcbiAgICAgIHRoaXMuJHBhcmVudCA9IHRoaXMuJGVsZW1lbnQucGFyZW50cygnLicgKyB0aGlzLm9wdGlvbnMucGFyZW50Q2xhc3MpO1xuICAgIH1lbHNle1xuICAgICAgdGhpcy4kcGFyZW50ID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3MgPSB0aGlzLmdldFBvc2l0aW9uQ2xhc3MoKTtcbiAgICB0aGlzLmNvdW50ZXIgPSA0O1xuICAgIHRoaXMudXNlZFBvc2l0aW9ucyA9IFtdO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAnYXJpYS1oaWRkZW4nOiAndHJ1ZScsXG4gICAgICAnZGF0YS15ZXRpLWJveCc6ICRpZCxcbiAgICAgICdkYXRhLXJlc2l6ZSc6ICRpZCxcbiAgICAgICdhcmlhLWxhYmVsbGVkYnknOiB0aGlzLiRhbmNob3JbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnZGQtYW5jaG9yJylcbiAgICB9KTtcbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIZWxwZXIgZnVuY3Rpb24gdG8gZGV0ZXJtaW5lIGN1cnJlbnQgb3JpZW50YXRpb24gb2YgZHJvcGRvd24gcGFuZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IHBvc2l0aW9uIC0gc3RyaW5nIHZhbHVlIG9mIGEgcG9zaXRpb24gY2xhc3MuXG4gICAqL1xuICBnZXRQb3NpdGlvbkNsYXNzKCkge1xuICAgIHZhciB2ZXJ0aWNhbFBvc2l0aW9uID0gdGhpcy4kZWxlbWVudFswXS5jbGFzc05hbWUubWF0Y2goLyh0b3B8bGVmdHxyaWdodHxib3R0b20pL2cpO1xuICAgICAgICB2ZXJ0aWNhbFBvc2l0aW9uID0gdmVydGljYWxQb3NpdGlvbiA/IHZlcnRpY2FsUG9zaXRpb25bMF0gOiAnJztcbiAgICB2YXIgaG9yaXpvbnRhbFBvc2l0aW9uID0gL2Zsb2F0LShcXFMrKS8uZXhlYyh0aGlzLiRhbmNob3JbMF0uY2xhc3NOYW1lKTtcbiAgICAgICAgaG9yaXpvbnRhbFBvc2l0aW9uID0gaG9yaXpvbnRhbFBvc2l0aW9uID8gaG9yaXpvbnRhbFBvc2l0aW9uWzFdIDogJyc7XG4gICAgdmFyIHBvc2l0aW9uID0gaG9yaXpvbnRhbFBvc2l0aW9uID8gaG9yaXpvbnRhbFBvc2l0aW9uICsgJyAnICsgdmVydGljYWxQb3NpdGlvbiA6IHZlcnRpY2FsUG9zaXRpb247XG5cbiAgICByZXR1cm4gcG9zaXRpb247XG4gIH1cblxuICAvKipcbiAgICogQWRqdXN0cyB0aGUgZHJvcGRvd24gcGFuZXMgb3JpZW50YXRpb24gYnkgYWRkaW5nL3JlbW92aW5nIHBvc2l0aW9uaW5nIGNsYXNzZXMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gcG9zaXRpb24gLSBwb3NpdGlvbiBjbGFzcyB0byByZW1vdmUuXG4gICAqL1xuICBfcmVwb3NpdGlvbihwb3NpdGlvbikge1xuICAgIHRoaXMudXNlZFBvc2l0aW9ucy5wdXNoKHBvc2l0aW9uID8gcG9zaXRpb24gOiAnYm90dG9tJyk7XG4gICAgLy9kZWZhdWx0LCB0cnkgc3dpdGNoaW5nIHRvIG9wcG9zaXRlIHNpZGVcbiAgICBpZighcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ3RvcCcpO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAndG9wJyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxuICAgICAgICAgIC5hZGRDbGFzcygncmlnaHQnKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ3JpZ2h0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfVxuXG4gICAgLy9pZiBkZWZhdWx0IGNoYW5nZSBkaWRuJ3Qgd29yaywgdHJ5IGJvdHRvbSBvciBsZWZ0IGZpcnN0XG4gICAgZWxzZSBpZighcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAncmlnaHQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9XG4gICAgLy9pZiBub3RoaW5nIGNsZWFyZWQsIHNldCB0byBib3R0b21cbiAgICBlbHNle1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfVxuICAgIHRoaXMuY2xhc3NDaGFuZ2VkID0gdHJ1ZTtcbiAgICB0aGlzLmNvdW50ZXItLTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBwb3NpdGlvbiBhbmQgb3JpZW50YXRpb24gb2YgdGhlIGRyb3Bkb3duIHBhbmUsIGNoZWNrcyBmb3IgY29sbGlzaW9ucy5cbiAgICogUmVjdXJzaXZlbHkgY2FsbHMgaXRzZWxmIGlmIGEgY29sbGlzaW9uIGlzIGRldGVjdGVkLCB3aXRoIGEgbmV3IHBvc2l0aW9uIGNsYXNzLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRQb3NpdGlvbigpIHtcbiAgICBpZih0aGlzLiRhbmNob3IuYXR0cignYXJpYS1leHBhbmRlZCcpID09PSAnZmFsc2UnKXsgcmV0dXJuIGZhbHNlOyB9XG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5nZXRQb3NpdGlvbkNsYXNzKCksXG4gICAgICAgICRlbGVEaW1zID0gRm91bmRhdGlvbi5Cb3guR2V0RGltZW5zaW9ucyh0aGlzLiRlbGVtZW50KSxcbiAgICAgICAgJGFuY2hvckRpbXMgPSBGb3VuZGF0aW9uLkJveC5HZXREaW1lbnNpb25zKHRoaXMuJGFuY2hvciksXG4gICAgICAgIF90aGlzID0gdGhpcyxcbiAgICAgICAgZGlyZWN0aW9uID0gKHBvc2l0aW9uID09PSAnbGVmdCcgPyAnbGVmdCcgOiAoKHBvc2l0aW9uID09PSAncmlnaHQnKSA/ICdsZWZ0JyA6ICd0b3AnKSksXG4gICAgICAgIHBhcmFtID0gKGRpcmVjdGlvbiA9PT0gJ3RvcCcpID8gJ2hlaWdodCcgOiAnd2lkdGgnLFxuICAgICAgICBvZmZzZXQgPSAocGFyYW0gPT09ICdoZWlnaHQnKSA/IHRoaXMub3B0aW9ucy52T2Zmc2V0IDogdGhpcy5vcHRpb25zLmhPZmZzZXQ7XG5cbiAgICBpZigoJGVsZURpbXMud2lkdGggPj0gJGVsZURpbXMud2luZG93RGltcy53aWR0aCkgfHwgKCF0aGlzLmNvdW50ZXIgJiYgIUZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UodGhpcy4kZWxlbWVudCwgdGhpcy4kcGFyZW50KSkpe1xuICAgICAgdmFyIG5ld1dpZHRoID0gJGVsZURpbXMud2luZG93RGltcy53aWR0aCxcbiAgICAgICAgICBwYXJlbnRIT2Zmc2V0ID0gMDtcbiAgICAgIGlmKHRoaXMuJHBhcmVudCl7XG4gICAgICAgIHZhciAkcGFyZW50RGltcyA9IEZvdW5kYXRpb24uQm94LkdldERpbWVuc2lvbnModGhpcy4kcGFyZW50KSxcbiAgICAgICAgICAgIHBhcmVudEhPZmZzZXQgPSAkcGFyZW50RGltcy5vZmZzZXQubGVmdDtcbiAgICAgICAgaWYgKCRwYXJlbnREaW1zLndpZHRoIDwgbmV3V2lkdGgpe1xuICAgICAgICAgIG5ld1dpZHRoID0gJHBhcmVudERpbXMud2lkdGg7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy4kZWxlbWVudC5vZmZzZXQoRm91bmRhdGlvbi5Cb3guR2V0T2Zmc2V0cyh0aGlzLiRlbGVtZW50LCB0aGlzLiRhbmNob3IsICdjZW50ZXIgYm90dG9tJywgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0ICsgcGFyZW50SE9mZnNldCwgdHJ1ZSkpLmNzcyh7XG4gICAgICAgICd3aWR0aCc6IG5ld1dpZHRoIC0gKHRoaXMub3B0aW9ucy5oT2Zmc2V0ICogMiksXG4gICAgICAgICdoZWlnaHQnOiAnYXV0bydcbiAgICAgIH0pO1xuICAgICAgdGhpcy5jbGFzc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQub2Zmc2V0KEZvdW5kYXRpb24uQm94LkdldE9mZnNldHModGhpcy4kZWxlbWVudCwgdGhpcy4kYW5jaG9yLCBwb3NpdGlvbiwgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0KSk7XG5cbiAgICB3aGlsZSghRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSh0aGlzLiRlbGVtZW50LCB0aGlzLiRwYXJlbnQsIHRydWUpICYmIHRoaXMuY291bnRlcil7XG4gICAgICB0aGlzLl9yZXBvc2l0aW9uKHBvc2l0aW9uKTtcbiAgICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgbGlzdGVuZXJzIHRvIHRoZSBlbGVtZW50IHV0aWxpemluZyB0aGUgdHJpZ2dlcnMgdXRpbGl0eSBsaWJyYXJ5LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLiRlbGVtZW50Lm9uKHtcbiAgICAgICdvcGVuLnpmLnRyaWdnZXInOiB0aGlzLm9wZW4uYmluZCh0aGlzKSxcbiAgICAgICdjbG9zZS56Zi50cmlnZ2VyJzogdGhpcy5jbG9zZS5iaW5kKHRoaXMpLFxuICAgICAgJ3RvZ2dsZS56Zi50cmlnZ2VyJzogdGhpcy50b2dnbGUuYmluZCh0aGlzKSxcbiAgICAgICdyZXNpemVtZS56Zi50cmlnZ2VyJzogdGhpcy5fc2V0UG9zaXRpb24uYmluZCh0aGlzKVxuICAgIH0pO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLmhvdmVyKXtcbiAgICAgIHRoaXMuJGFuY2hvci5vZmYoJ21vdXNlZW50ZXIuemYuZHJvcGRvd24gbW91c2VsZWF2ZS56Zi5kcm9wZG93bicpXG4gICAgICAub24oJ21vdXNlZW50ZXIuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgYm9keURhdGEgPSAkKCdib2R5JykuZGF0YSgpO1xuICAgICAgICBpZih0eXBlb2YoYm9keURhdGEud2hhdGlucHV0KSA9PT0gJ3VuZGVmaW5lZCcgfHwgYm9keURhdGEud2hhdGlucHV0ID09PSAnbW91c2UnKSB7XG4gICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmRhdGEoJ2hvdmVyJywgdHJ1ZSk7XG4gICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5ob3ZlckRlbGF5KTtcbiAgICAgICAgfVxuICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xuICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XG4gICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICBfdGhpcy4kYW5jaG9yLmRhdGEoJ2hvdmVyJywgZmFsc2UpO1xuICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xuICAgICAgfSk7XG4gICAgICBpZih0aGlzLm9wdGlvbnMuaG92ZXJQYW5lKXtcbiAgICAgICAgdGhpcy4kZWxlbWVudC5vZmYoJ21vdXNlZW50ZXIuemYuZHJvcGRvd24gbW91c2VsZWF2ZS56Zi5kcm9wZG93bicpXG4gICAgICAgICAgICAub24oJ21vdXNlZW50ZXIuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XG4gICAgICAgICAgICB9KS5vbignbW91c2VsZWF2ZS56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICAgICAgICAgICAgX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZGF0YSgnaG92ZXInLCBmYWxzZSk7XG4gICAgICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuaG92ZXJEZWxheSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy4kYW5jaG9yLmFkZCh0aGlzLiRlbGVtZW50KS5vbigna2V5ZG93bi56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKGUpIHtcblxuICAgICAgdmFyICR0YXJnZXQgPSAkKHRoaXMpLFxuICAgICAgICB2aXNpYmxlRm9jdXNhYmxlRWxlbWVudHMgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUoX3RoaXMuJGVsZW1lbnQpO1xuXG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnRHJvcGRvd24nLCB7XG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkdGFyZ2V0LmlzKF90aGlzLiRhbmNob3IpKSB7XG4gICAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgICAgICBfdGhpcy4kZWxlbWVudC5hdHRyKCd0YWJpbmRleCcsIC0xKS5mb2N1cygpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgX3RoaXMuJGFuY2hvci5mb2N1cygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGFuIGV2ZW50IGhhbmRsZXIgdG8gdGhlIGJvZHkgdG8gY2xvc2UgYW55IGRyb3Bkb3ducyBvbiBhIGNsaWNrLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRCb2R5SGFuZGxlcigpIHtcbiAgICAgdmFyICRib2R5ID0gJChkb2N1bWVudC5ib2R5KS5ub3QodGhpcy4kZWxlbWVudCksXG4gICAgICAgICBfdGhpcyA9IHRoaXM7XG4gICAgICRib2R5Lm9mZignY2xpY2suemYuZHJvcGRvd24nKVxuICAgICAgICAgIC5vbignY2xpY2suemYuZHJvcGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgIGlmKF90aGlzLiRhbmNob3IuaXMoZS50YXJnZXQpIHx8IF90aGlzLiRhbmNob3IuZmluZChlLnRhcmdldCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKF90aGlzLiRlbGVtZW50LmZpbmQoZS50YXJnZXQpLmxlbmd0aCkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgJGJvZHkub2ZmKCdjbGljay56Zi5kcm9wZG93bicpO1xuICAgICAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBkcm9wZG93biBwYW5lLCBhbmQgZmlyZXMgYSBidWJibGluZyBldmVudCB0byBjbG9zZSBvdGhlciBkcm9wZG93bnMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJvcGRvd24jY2xvc2VtZVxuICAgKiBAZmlyZXMgRHJvcGRvd24jc2hvd1xuICAgKi9cbiAgb3BlbigpIHtcbiAgICAvLyB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHRvIGNsb3NlIG90aGVyIG9wZW4gZHJvcGRvd25zLCB0eXBpY2FsbHkgd2hlbiBkcm9wZG93biBpcyBvcGVuaW5nXG4gICAgICogQGV2ZW50IERyb3Bkb3duI2Nsb3NlbWVcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlbWUuemYuZHJvcGRvd24nLCB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJykpO1xuICAgIHRoaXMuJGFuY2hvci5hZGRDbGFzcygnaG92ZXInKVxuICAgICAgICAuYXR0cih7J2FyaWEtZXhwYW5kZWQnOiB0cnVlfSk7XG4gICAgLy8gdGhpcy4kZWxlbWVudC8qLnNob3coKSovO1xuICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygnaXMtb3BlbicpXG4gICAgICAgIC5hdHRyKHsnYXJpYS1oaWRkZW4nOiBmYWxzZX0pO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLmF1dG9Gb2N1cyl7XG4gICAgICB2YXIgJGZvY3VzYWJsZSA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZSh0aGlzLiRlbGVtZW50KTtcbiAgICAgIGlmKCRmb2N1c2FibGUubGVuZ3RoKXtcbiAgICAgICAgJGZvY3VzYWJsZS5lcSgwKS5mb2N1cygpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2speyB0aGlzLl9hZGRCb2R5SGFuZGxlcigpOyB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnRyYXBGb2N1cykge1xuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC50cmFwRm9jdXModGhpcy4kZWxlbWVudCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlyZXMgb25jZSB0aGUgZHJvcGRvd24gaXMgdmlzaWJsZS5cbiAgICAgKiBAZXZlbnQgRHJvcGRvd24jc2hvd1xuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc2hvdy56Zi5kcm9wZG93bicsIFt0aGlzLiRlbGVtZW50XSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSBvcGVuIGRyb3Bkb3duIHBhbmUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJvcGRvd24jaGlkZVxuICAgKi9cbiAgY2xvc2UoKSB7XG4gICAgaWYoIXRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLW9wZW4nKSl7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2lzLW9wZW4nKVxuICAgICAgICAuYXR0cih7J2FyaWEtaGlkZGVuJzogdHJ1ZX0pO1xuXG4gICAgdGhpcy4kYW5jaG9yLnJlbW92ZUNsYXNzKCdob3ZlcicpXG4gICAgICAgIC5hdHRyKCdhcmlhLWV4cGFuZGVkJywgZmFsc2UpO1xuXG4gICAgaWYodGhpcy5jbGFzc0NoYW5nZWQpe1xuICAgICAgdmFyIGN1clBvc2l0aW9uQ2xhc3MgPSB0aGlzLmdldFBvc2l0aW9uQ2xhc3MoKTtcbiAgICAgIGlmKGN1clBvc2l0aW9uQ2xhc3Mpe1xuICAgICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKGN1clBvc2l0aW9uQ2xhc3MpO1xuICAgICAgfVxuICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcyh0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcylcbiAgICAgICAgICAvKi5oaWRlKCkqLy5jc3Moe2hlaWdodDogJycsIHdpZHRoOiAnJ30pO1xuICAgICAgdGhpcy5jbGFzc0NoYW5nZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMuY291bnRlciA9IDQ7XG4gICAgICB0aGlzLnVzZWRQb3NpdGlvbnMubGVuZ3RoID0gMDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRmlyZXMgb25jZSB0aGUgZHJvcGRvd24gaXMgbm8gbG9uZ2VyIHZpc2libGUuXG4gICAgICogQGV2ZW50IERyb3Bkb3duI2hpZGVcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2hpZGUuemYuZHJvcGRvd24nLCBbdGhpcy4kZWxlbWVudF0pO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy50cmFwRm9jdXMpIHtcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVsZWFzZUZvY3VzKHRoaXMuJGVsZW1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSBkcm9wZG93biBwYW5lJ3MgdmlzaWJpbGl0eS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB0b2dnbGUoKSB7XG4gICAgaWYodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpKXtcbiAgICAgIGlmKHRoaXMuJGFuY2hvci5kYXRhKCdob3ZlcicpKSByZXR1cm47XG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLm9wZW4oKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIGRyb3Bkb3duLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50cmlnZ2VyJykuaGlkZSgpO1xuICAgIHRoaXMuJGFuY2hvci5vZmYoJy56Zi5kcm9wZG93bicpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbkRyb3Bkb3duLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQ2xhc3MgdGhhdCBkZXNpZ25hdGVzIGJvdW5kaW5nIGNvbnRhaW5lciBvZiBEcm9wZG93biAoZGVmYXVsdDogd2luZG93KVxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHs/c3RyaW5nfVxuICAgKiBAZGVmYXVsdCBudWxsXG4gICAqL1xuICBwYXJlbnRDbGFzczogbnVsbCxcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGRlbGF5IG9wZW5pbmcgYSBzdWJtZW51IG9uIGhvdmVyIGV2ZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDI1MFxuICAgKi9cbiAgaG92ZXJEZWxheTogMjUwLFxuICAvKipcbiAgICogQWxsb3cgc3VibWVudXMgdG8gb3BlbiBvbiBob3ZlciBldmVudHNcbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGhvdmVyOiBmYWxzZSxcbiAgLyoqXG4gICAqIERvbid0IGNsb3NlIGRyb3Bkb3duIHdoZW4gaG92ZXJpbmcgb3ZlciBkcm9wZG93biBwYW5lXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBob3ZlclBhbmU6IGZhbHNlLFxuICAvKipcbiAgICogTnVtYmVyIG9mIHBpeGVscyBiZXR3ZWVuIHRoZSBkcm9wZG93biBwYW5lIGFuZCB0aGUgdHJpZ2dlcmluZyBlbGVtZW50IG9uIG9wZW4uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcn1cbiAgICogQGRlZmF1bHQgMVxuICAgKi9cbiAgdk9mZnNldDogMSxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBwaXhlbHMgYmV0d2VlbiB0aGUgZHJvcGRvd24gcGFuZSBhbmQgdGhlIHRyaWdnZXJpbmcgZWxlbWVudCBvbiBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDFcbiAgICovXG4gIGhPZmZzZXQ6IDEsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIGFkanVzdCBvcGVuIHBvc2l0aW9uLiBKUyB3aWxsIHRlc3QgYW5kIGZpbGwgdGhpcyBpbi5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnJ1xuICAgKi9cbiAgcG9zaXRpb25DbGFzczogJycsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgcGx1Z2luIHRvIHRyYXAgZm9jdXMgdG8gdGhlIGRyb3Bkb3duIHBhbmUgaWYgb3BlbmVkIHdpdGgga2V5Ym9hcmQgY29tbWFuZHMuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICB0cmFwRm9jdXM6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgdGhlIHBsdWdpbiB0byBzZXQgZm9jdXMgdG8gdGhlIGZpcnN0IGZvY3VzYWJsZSBlbGVtZW50IHdpdGhpbiB0aGUgcGFuZSwgcmVnYXJkbGVzcyBvZiBtZXRob2Qgb2Ygb3BlbmluZy5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGF1dG9Gb2N1czogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvd3MgYSBjbGljayBvbiB0aGUgYm9keSB0byBjbG9zZSB0aGUgZHJvcGRvd24uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IGZhbHNlXG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihEcm9wZG93biwgJ0Ryb3Bkb3duJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBEcm9wZG93bk1lbnUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmRyb3Bkb3duLW1lbnVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm5lc3RcbiAqL1xuXG5jbGFzcyBEcm9wZG93bk1lbnUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBEcm9wZG93bk1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgRHJvcGRvd25NZW51I2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhIGRyb3Bkb3duIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgRHJvcGRvd25NZW51LmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICBGb3VuZGF0aW9uLk5lc3QuRmVhdGhlcih0aGlzLiRlbGVtZW50LCAnZHJvcGRvd24nKTtcbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdEcm9wZG93bk1lbnUnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdEcm9wZG93bk1lbnUnLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXG4gICAgICAnQVJST1dfVVAnOiAndXAnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnZG93bicsXG4gICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cycsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBwbHVnaW4sIGFuZCBjYWxscyBfcHJlcGFyZU1lbnVcbiAgICogQHByaXZhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgc3VicyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKTtcbiAgICB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKS5hZGRDbGFzcygnZmlyc3Qtc3ViJyk7XG5cbiAgICB0aGlzLiRtZW51SXRlbXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tyb2xlPVwibWVudWl0ZW1cIl0nKTtcbiAgICB0aGlzLiR0YWJzID0gdGhpcy4kZWxlbWVudC5jaGlsZHJlbignW3JvbGU9XCJtZW51aXRlbVwiXScpO1xuICAgIHRoaXMuJHRhYnMuZmluZCgndWwuaXMtZHJvcGRvd24tc3VibWVudScpLmFkZENsYXNzKHRoaXMub3B0aW9ucy52ZXJ0aWNhbENsYXNzKTtcblxuICAgIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKHRoaXMub3B0aW9ucy5yaWdodENsYXNzKSB8fCB0aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAncmlnaHQnIHx8IEZvdW5kYXRpb24ucnRsKCkgfHwgdGhpcy4kZWxlbWVudC5wYXJlbnRzKCcudG9wLWJhci1yaWdodCcpLmlzKCcqJykpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPSAncmlnaHQnO1xuICAgICAgc3Vicy5hZGRDbGFzcygnb3BlbnMtbGVmdCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdWJzLmFkZENsYXNzKCdvcGVucy1yaWdodCcpO1xuICAgIH1cbiAgICB0aGlzLmNoYW5nZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfTtcblxuICBfaXNWZXJ0aWNhbCgpIHtcbiAgICByZXR1cm4gdGhpcy4kdGFicy5jc3MoJ2Rpc3BsYXknKSA9PT0gJ2Jsb2NrJztcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGxpc3RlbmVycyB0byBlbGVtZW50cyB3aXRoaW4gdGhlIG1lbnVcbiAgICogQHByaXZhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIGhhc1RvdWNoID0gJ29udG91Y2hzdGFydCcgaW4gd2luZG93IHx8ICh0eXBlb2Ygd2luZG93Lm9udG91Y2hzdGFydCAhPT0gJ3VuZGVmaW5lZCcpLFxuICAgICAgICBwYXJDbGFzcyA9ICdpcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCc7XG5cbiAgICAvLyB1c2VkIGZvciBvbkNsaWNrIGFuZCBpbiB0aGUga2V5Ym9hcmQgaGFuZGxlcnNcbiAgICB2YXIgaGFuZGxlQ2xpY2tGbiA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciAkZWxlbSA9ICQoZS50YXJnZXQpLnBhcmVudHNVbnRpbCgndWwnLCBgLiR7cGFyQ2xhc3N9YCksXG4gICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpLFxuICAgICAgICAgIGhhc0NsaWNrZWQgPSAkZWxlbS5hdHRyKCdkYXRhLWlzLWNsaWNrJykgPT09ICd0cnVlJyxcbiAgICAgICAgICAkc3ViID0gJGVsZW0uY2hpbGRyZW4oJy5pcy1kcm9wZG93bi1zdWJtZW51Jyk7XG5cbiAgICAgIGlmIChoYXNTdWIpIHtcbiAgICAgICAgaWYgKGhhc0NsaWNrZWQpIHtcbiAgICAgICAgICBpZiAoIV90aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrIHx8ICghX3RoaXMub3B0aW9ucy5jbGlja09wZW4gJiYgIWhhc1RvdWNoKSB8fCAoX3RoaXMub3B0aW9ucy5mb3JjZUZvbGxvdyAmJiBoYXNUb3VjaCkpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBfdGhpcy5fc2hvdygkc3ViKTtcbiAgICAgICAgICAkZWxlbS5hZGQoJGVsZW0ucGFyZW50c1VudGlsKF90aGlzLiRlbGVtZW50LCBgLiR7cGFyQ2xhc3N9YCkpLmF0dHIoJ2RhdGEtaXMtY2xpY2snLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsaWNrT3BlbiB8fCBoYXNUb3VjaCkge1xuICAgICAgdGhpcy4kbWVudUl0ZW1zLm9uKCdjbGljay56Zi5kcm9wZG93bm1lbnUgdG91Y2hzdGFydC56Zi5kcm9wZG93bm1lbnUnLCBoYW5kbGVDbGlja0ZuKTtcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgTGVhZiBlbGVtZW50IENsaWNrc1xuICAgIGlmKF90aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrSW5zaWRlKXtcbiAgICAgIHRoaXMuJG1lbnVJdGVtcy5vbignY2xpY2suemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpO1xuICAgICAgICBpZighaGFzU3ViKXtcbiAgICAgICAgICBfdGhpcy5faGlkZSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5kaXNhYmxlSG92ZXIpIHtcbiAgICAgIHRoaXMuJG1lbnVJdGVtcy5vbignbW91c2VlbnRlci56Zi5kcm9wZG93bm1lbnUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIHZhciAkZWxlbSA9ICQodGhpcyksXG4gICAgICAgICAgICBoYXNTdWIgPSAkZWxlbS5oYXNDbGFzcyhwYXJDbGFzcyk7XG5cbiAgICAgICAgaWYgKGhhc1N1Yikge1xuICAgICAgICAgIGNsZWFyVGltZW91dCgkZWxlbS5kYXRhKCdfZGVsYXknKSk7XG4gICAgICAgICAgJGVsZW0uZGF0YSgnX2RlbGF5Jywgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF90aGlzLl9zaG93KCRlbGVtLmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudScpKTtcbiAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpKTtcbiAgICAgICAgfVxuICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpO1xuICAgICAgICBpZiAoaGFzU3ViICYmIF90aGlzLm9wdGlvbnMuYXV0b2Nsb3NlKSB7XG4gICAgICAgICAgaWYgKCRlbGVtLmF0dHIoJ2RhdGEtaXMtY2xpY2snKSA9PT0gJ3RydWUnICYmIF90aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KCRlbGVtLmRhdGEoJ19kZWxheScpKTtcbiAgICAgICAgICAkZWxlbS5kYXRhKCdfZGVsYXknLCBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW0pO1xuICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuY2xvc2luZ1RpbWUpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHRoaXMuJG1lbnVJdGVtcy5vbigna2V5ZG93bi56Zi5kcm9wZG93bm1lbnUnLCBmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgJGVsZW1lbnQgPSAkKGUudGFyZ2V0KS5wYXJlbnRzVW50aWwoJ3VsJywgJ1tyb2xlPVwibWVudWl0ZW1cIl0nKSxcbiAgICAgICAgICBpc1RhYiA9IF90aGlzLiR0YWJzLmluZGV4KCRlbGVtZW50KSA+IC0xLFxuICAgICAgICAgICRlbGVtZW50cyA9IGlzVGFiID8gX3RoaXMuJHRhYnMgOiAkZWxlbWVudC5zaWJsaW5ncygnbGknKS5hZGQoJGVsZW1lbnQpLFxuICAgICAgICAgICRwcmV2RWxlbWVudCxcbiAgICAgICAgICAkbmV4dEVsZW1lbnQ7XG5cbiAgICAgICRlbGVtZW50cy5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgaWYgKCQodGhpcykuaXMoJGVsZW1lbnQpKSB7XG4gICAgICAgICAgJHByZXZFbGVtZW50ID0gJGVsZW1lbnRzLmVxKGktMSk7XG4gICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnRzLmVxKGkrMSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdmFyIG5leHRTaWJsaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghJGVsZW1lbnQuaXMoJzpsYXN0LWNoaWxkJykpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuY2hpbGRyZW4oJ2E6Zmlyc3QnKS5mb2N1cygpO1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuICAgICAgfSwgcHJldlNpYmxpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHByZXZFbGVtZW50LmNoaWxkcmVuKCdhOmZpcnN0JykuZm9jdXMoKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfSwgb3BlblN1YiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgJHN1YiA9ICRlbGVtZW50LmNoaWxkcmVuKCd1bC5pcy1kcm9wZG93bi1zdWJtZW51Jyk7XG4gICAgICAgIGlmICgkc3ViLmxlbmd0aCkge1xuICAgICAgICAgIF90aGlzLl9zaG93KCRzdWIpO1xuICAgICAgICAgICRlbGVtZW50LmZpbmQoJ2xpID4gYTpmaXJzdCcpLmZvY3VzKCk7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9IGVsc2UgeyByZXR1cm47IH1cbiAgICAgIH0sIGNsb3NlU3ViID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vaWYgKCRlbGVtZW50LmlzKCc6Zmlyc3QtY2hpbGQnKSkge1xuICAgICAgICB2YXIgY2xvc2UgPSAkZWxlbWVudC5wYXJlbnQoJ3VsJykucGFyZW50KCdsaScpO1xuICAgICAgICBjbG9zZS5jaGlsZHJlbignYTpmaXJzdCcpLmZvY3VzKCk7XG4gICAgICAgIF90aGlzLl9oaWRlKGNsb3NlKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAvL31cbiAgICAgIH07XG4gICAgICB2YXIgZnVuY3Rpb25zID0ge1xuICAgICAgICBvcGVuOiBvcGVuU3ViLFxuICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuX2hpZGUoX3RoaXMuJGVsZW1lbnQpO1xuICAgICAgICAgIF90aGlzLiRtZW51SXRlbXMuZmluZCgnYTpmaXJzdCcpLmZvY3VzKCk7IC8vIGZvY3VzIHRvIGZpcnN0IGVsZW1lbnRcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGlmIChpc1RhYikge1xuICAgICAgICBpZiAoX3RoaXMuX2lzVmVydGljYWwoKSkgeyAvLyB2ZXJ0aWNhbCBtZW51XG4gICAgICAgICAgaWYgKEZvdW5kYXRpb24ucnRsKCkpIHsgLy8gcmlnaHQgYWxpZ25lZFxuICAgICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICAgIGRvd246IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgICB1cDogcHJldlNpYmxpbmcsXG4gICAgICAgICAgICAgIG5leHQ6IGNsb3NlU3ViLFxuICAgICAgICAgICAgICBwcmV2aW91czogb3BlblN1YlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHsgLy8gbGVmdCBhbGlnbmVkXG4gICAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgICAgZG93bjogbmV4dFNpYmxpbmcsXG4gICAgICAgICAgICAgIHVwOiBwcmV2U2libGluZyxcbiAgICAgICAgICAgICAgbmV4dDogb3BlblN1YixcbiAgICAgICAgICAgICAgcHJldmlvdXM6IGNsb3NlU3ViXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7IC8vIGhvcml6b250YWwgbWVudVxuICAgICAgICAgIGlmIChGb3VuZGF0aW9uLnJ0bCgpKSB7IC8vIHJpZ2h0IGFsaWduZWRcbiAgICAgICAgICAgICQuZXh0ZW5kKGZ1bmN0aW9ucywge1xuICAgICAgICAgICAgICBuZXh0OiBwcmV2U2libGluZyxcbiAgICAgICAgICAgICAgcHJldmlvdXM6IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgICBkb3duOiBvcGVuU3ViLFxuICAgICAgICAgICAgICB1cDogY2xvc2VTdWJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7IC8vIGxlZnQgYWxpZ25lZFxuICAgICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICAgIG5leHQ6IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgICBwcmV2aW91czogcHJldlNpYmxpbmcsXG4gICAgICAgICAgICAgIGRvd246IG9wZW5TdWIsXG4gICAgICAgICAgICAgIHVwOiBjbG9zZVN1YlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgeyAvLyBub3QgdGFicyAtPiBvbmUgc3ViXG4gICAgICAgIGlmIChGb3VuZGF0aW9uLnJ0bCgpKSB7IC8vIHJpZ2h0IGFsaWduZWRcbiAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgIG5leHQ6IGNsb3NlU3ViLFxuICAgICAgICAgICAgcHJldmlvdXM6IG9wZW5TdWIsXG4gICAgICAgICAgICBkb3duOiBuZXh0U2libGluZyxcbiAgICAgICAgICAgIHVwOiBwcmV2U2libGluZ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgeyAvLyBsZWZ0IGFsaWduZWRcbiAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgIG5leHQ6IG9wZW5TdWIsXG4gICAgICAgICAgICBwcmV2aW91czogY2xvc2VTdWIsXG4gICAgICAgICAgICBkb3duOiBuZXh0U2libGluZyxcbiAgICAgICAgICAgIHVwOiBwcmV2U2libGluZ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnRHJvcGRvd25NZW51JywgZnVuY3Rpb25zKTtcblxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYW4gZXZlbnQgaGFuZGxlciB0byB0aGUgYm9keSB0byBjbG9zZSBhbnkgZHJvcGRvd25zIG9uIGEgY2xpY2suXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2FkZEJvZHlIYW5kbGVyKCkge1xuICAgIHZhciAkYm9keSA9ICQoZG9jdW1lbnQuYm9keSksXG4gICAgICAgIF90aGlzID0gdGhpcztcbiAgICAkYm9keS5vZmYoJ21vdXNldXAuemYuZHJvcGRvd25tZW51IHRvdWNoZW5kLnpmLmRyb3Bkb3dubWVudScpXG4gICAgICAgICAub24oJ21vdXNldXAuemYuZHJvcGRvd25tZW51IHRvdWNoZW5kLnpmLmRyb3Bkb3dubWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgdmFyICRsaW5rID0gX3RoaXMuJGVsZW1lbnQuZmluZChlLnRhcmdldCk7XG4gICAgICAgICAgIGlmICgkbGluay5sZW5ndGgpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICAgX3RoaXMuX2hpZGUoKTtcbiAgICAgICAgICAgJGJvZHkub2ZmKCdtb3VzZXVwLnpmLmRyb3Bkb3dubWVudSB0b3VjaGVuZC56Zi5kcm9wZG93bm1lbnUnKTtcbiAgICAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgZHJvcGRvd24gcGFuZSwgYW5kIGNoZWNrcyBmb3IgY29sbGlzaW9ucyBmaXJzdC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICRzdWIgLSB1bCBlbGVtZW50IHRoYXQgaXMgYSBzdWJtZW51IHRvIHNob3dcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBmaXJlcyBEcm9wZG93bk1lbnUjc2hvd1xuICAgKi9cbiAgX3Nob3coJHN1Yikge1xuICAgIHZhciBpZHggPSB0aGlzLiR0YWJzLmluZGV4KHRoaXMuJHRhYnMuZmlsdGVyKGZ1bmN0aW9uKGksIGVsKSB7XG4gICAgICByZXR1cm4gJChlbCkuZmluZCgkc3ViKS5sZW5ndGggPiAwO1xuICAgIH0pKTtcbiAgICB2YXIgJHNpYnMgPSAkc3ViLnBhcmVudCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5zaWJsaW5ncygnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKTtcbiAgICB0aGlzLl9oaWRlKCRzaWJzLCBpZHgpO1xuICAgICRzdWIuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpLmFkZENsYXNzKCdqcy1kcm9wZG93bi1hY3RpdmUnKVxuICAgICAgICAucGFyZW50KCdsaS5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICB2YXIgY2xlYXIgPSBGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KCRzdWIsIG51bGwsIHRydWUpO1xuICAgIGlmICghY2xlYXIpIHtcbiAgICAgIHZhciBvbGRDbGFzcyA9IHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPT09ICdsZWZ0JyA/ICctcmlnaHQnIDogJy1sZWZ0JyxcbiAgICAgICAgICAkcGFyZW50TGkgPSAkc3ViLnBhcmVudCgnLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50Jyk7XG4gICAgICAkcGFyZW50TGkucmVtb3ZlQ2xhc3MoYG9wZW5zJHtvbGRDbGFzc31gKS5hZGRDbGFzcyhgb3BlbnMtJHt0aGlzLm9wdGlvbnMuYWxpZ25tZW50fWApO1xuICAgICAgY2xlYXIgPSBGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KCRzdWIsIG51bGwsIHRydWUpO1xuICAgICAgaWYgKCFjbGVhcikge1xuICAgICAgICAkcGFyZW50TGkucmVtb3ZlQ2xhc3MoYG9wZW5zLSR7dGhpcy5vcHRpb25zLmFsaWdubWVudH1gKS5hZGRDbGFzcygnb3BlbnMtaW5uZXInKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuICAgICRzdWIuY3NzKCd2aXNpYmlsaXR5JywgJycpO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKSB7IHRoaXMuX2FkZEJvZHlIYW5kbGVyKCk7IH1cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBuZXcgZHJvcGRvd24gcGFuZSBpcyB2aXNpYmxlLlxuICAgICAqIEBldmVudCBEcm9wZG93bk1lbnUjc2hvd1xuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc2hvdy56Zi5kcm9wZG93bm1lbnUnLCBbJHN1Yl0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEhpZGVzIGEgc2luZ2xlLCBjdXJyZW50bHkgb3BlbiBkcm9wZG93biBwYW5lLCBpZiBwYXNzZWQgYSBwYXJhbWV0ZXIsIG90aGVyd2lzZSwgaGlkZXMgZXZlcnl0aGluZy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIGVsZW1lbnQgd2l0aCBhIHN1Ym1lbnUgdG8gaGlkZVxuICAgKiBAcGFyYW0ge051bWJlcn0gaWR4IC0gaW5kZXggb2YgdGhlICR0YWJzIGNvbGxlY3Rpb24gdG8gaGlkZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2hpZGUoJGVsZW0sIGlkeCkge1xuICAgIHZhciAkdG9DbG9zZTtcbiAgICBpZiAoJGVsZW0gJiYgJGVsZW0ubGVuZ3RoKSB7XG4gICAgICAkdG9DbG9zZSA9ICRlbGVtO1xuICAgIH0gZWxzZSBpZiAoaWR4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICR0b0Nsb3NlID0gdGhpcy4kdGFicy5ub3QoZnVuY3Rpb24oaSwgZWwpIHtcbiAgICAgICAgcmV0dXJuIGkgPT09IGlkeDtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICR0b0Nsb3NlID0gdGhpcy4kZWxlbWVudDtcbiAgICB9XG4gICAgdmFyIHNvbWV0aGluZ1RvQ2xvc2UgPSAkdG9DbG9zZS5oYXNDbGFzcygnaXMtYWN0aXZlJykgfHwgJHRvQ2xvc2UuZmluZCgnLmlzLWFjdGl2ZScpLmxlbmd0aCA+IDA7XG5cbiAgICBpZiAoc29tZXRoaW5nVG9DbG9zZSkge1xuICAgICAgJHRvQ2xvc2UuZmluZCgnbGkuaXMtYWN0aXZlJykuYWRkKCR0b0Nsb3NlKS5hdHRyKHtcbiAgICAgICAgJ2RhdGEtaXMtY2xpY2snOiBmYWxzZVxuICAgICAgfSkucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXG4gICAgICAkdG9DbG9zZS5maW5kKCd1bC5qcy1kcm9wZG93bi1hY3RpdmUnKS5yZW1vdmVDbGFzcygnanMtZHJvcGRvd24tYWN0aXZlJyk7XG5cbiAgICAgIGlmICh0aGlzLmNoYW5nZWQgfHwgJHRvQ2xvc2UuZmluZCgnb3BlbnMtaW5uZXInKS5sZW5ndGgpIHtcbiAgICAgICAgdmFyIG9sZENsYXNzID0gdGhpcy5vcHRpb25zLmFsaWdubWVudCA9PT0gJ2xlZnQnID8gJ3JpZ2h0JyA6ICdsZWZ0JztcbiAgICAgICAgJHRvQ2xvc2UuZmluZCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5hZGQoJHRvQ2xvc2UpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKGBvcGVucy1pbm5lciBvcGVucy0ke3RoaXMub3B0aW9ucy5hbGlnbm1lbnR9YClcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoYG9wZW5zLSR7b2xkQ2xhc3N9YCk7XG4gICAgICAgIHRoaXMuY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyB3aGVuIHRoZSBvcGVuIG1lbnVzIGFyZSBjbG9zZWQuXG4gICAgICAgKiBAZXZlbnQgRHJvcGRvd25NZW51I2hpZGVcbiAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdoaWRlLnpmLmRyb3Bkb3dubWVudScsIFskdG9DbG9zZV0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgcGx1Z2luLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kbWVudUl0ZW1zLm9mZignLnpmLmRyb3Bkb3dubWVudScpLnJlbW92ZUF0dHIoJ2RhdGEtaXMtY2xpY2snKVxuICAgICAgICAucmVtb3ZlQ2xhc3MoJ2lzLXJpZ2h0LWFycm93IGlzLWxlZnQtYXJyb3cgaXMtZG93bi1hcnJvdyBvcGVucy1yaWdodCBvcGVucy1sZWZ0IG9wZW5zLWlubmVyJyk7XG4gICAgJChkb2N1bWVudC5ib2R5KS5vZmYoJy56Zi5kcm9wZG93bm1lbnUnKTtcbiAgICBGb3VuZGF0aW9uLk5lc3QuQnVybih0aGlzLiRlbGVtZW50LCAnZHJvcGRvd24nKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWZhdWx0IHNldHRpbmdzIGZvciBwbHVnaW5cbiAqL1xuRHJvcGRvd25NZW51LmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogRGlzYWxsb3dzIGhvdmVyIGV2ZW50cyBmcm9tIG9wZW5pbmcgc3VibWVudXNcbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGRpc2FibGVIb3ZlcjogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvdyBhIHN1Ym1lbnUgdG8gYXV0b21hdGljYWxseSBjbG9zZSBvbiBhIG1vdXNlbGVhdmUgZXZlbnQsIGlmIG5vdCBjbGlja2VkIG9wZW4uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGF1dG9jbG9zZTogdHJ1ZSxcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGRlbGF5IG9wZW5pbmcgYSBzdWJtZW51IG9uIGhvdmVyIGV2ZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDUwXG4gICAqL1xuICBob3ZlckRlbGF5OiA1MCxcbiAgLyoqXG4gICAqIEFsbG93IGEgc3VibWVudSB0byBvcGVuL3JlbWFpbiBvcGVuIG9uIHBhcmVudCBjbGljayBldmVudC4gQWxsb3dzIGN1cnNvciB0byBtb3ZlIGF3YXkgZnJvbSBtZW51LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgY2xpY2tPcGVuOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGRlbGF5IGNsb3NpbmcgYSBzdWJtZW51IG9uIGEgbW91c2VsZWF2ZSBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCA1MDBcbiAgICovXG5cbiAgY2xvc2luZ1RpbWU6IDUwMCxcbiAgLyoqXG4gICAqIFBvc2l0aW9uIG9mIHRoZSBtZW51IHJlbGF0aXZlIHRvIHdoYXQgZGlyZWN0aW9uIHRoZSBzdWJtZW51cyBzaG91bGQgb3Blbi4gSGFuZGxlZCBieSBKUy4gQ2FuIGJlIGAnbGVmdCdgIG9yIGAncmlnaHQnYC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnbGVmdCdcbiAgICovXG4gIGFsaWdubWVudDogJ2xlZnQnLFxuICAvKipcbiAgICogQWxsb3cgY2xpY2tzIG9uIHRoZSBib2R5IHRvIGNsb3NlIGFueSBvcGVuIHN1Ym1lbnVzLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IHRydWUsXG4gIC8qKlxuICAgKiBBbGxvdyBjbGlja3Mgb24gbGVhZiBhbmNob3IgbGlua3MgdG8gY2xvc2UgYW55IG9wZW4gc3VibWVudXMuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGNsb3NlT25DbGlja0luc2lkZTogdHJ1ZSxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gdmVydGljYWwgb3JpZW50ZWQgbWVudXMsIEZvdW5kYXRpb24gZGVmYXVsdCBpcyBgdmVydGljYWxgLiBVcGRhdGUgdGhpcyBpZiB1c2luZyB5b3VyIG93biBjbGFzcy5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAndmVydGljYWwnXG4gICAqL1xuICB2ZXJ0aWNhbENsYXNzOiAndmVydGljYWwnLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byByaWdodC1zaWRlIG9yaWVudGVkIG1lbnVzLCBGb3VuZGF0aW9uIGRlZmF1bHQgaXMgYGFsaWduLXJpZ2h0YC4gVXBkYXRlIHRoaXMgaWYgdXNpbmcgeW91ciBvd24gY2xhc3MuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ2FsaWduLXJpZ2h0J1xuICAgKi9cbiAgcmlnaHRDbGFzczogJ2FsaWduLXJpZ2h0JyxcbiAgLyoqXG4gICAqIEJvb2xlYW4gdG8gZm9yY2Ugb3ZlcmlkZSB0aGUgY2xpY2tpbmcgb2YgbGlua3MgdG8gcGVyZm9ybSBkZWZhdWx0IGFjdGlvbiwgb24gc2Vjb25kIHRvdWNoIGV2ZW50IGZvciBtb2JpbGUuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGZvcmNlRm9sbG93OiB0cnVlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oRHJvcGRvd25NZW51LCAnRHJvcGRvd25NZW51Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBFcXVhbGl6ZXIgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmVxdWFsaXplclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRpbWVyQW5kSW1hZ2VMb2FkZXIgaWYgZXF1YWxpemVyIGNvbnRhaW5zIGltYWdlc1xuICovXG5cbmNsYXNzIEVxdWFsaXplciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIEVxdWFsaXplci5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKXtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgID0gJC5leHRlbmQoe30sIEVxdWFsaXplci5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnRXF1YWxpemVyJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIEVxdWFsaXplciBwbHVnaW4gYW5kIGNhbGxzIGZ1bmN0aW9ucyB0byBnZXQgZXF1YWxpemVyIGZ1bmN0aW9uaW5nIG9uIGxvYWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgZXFJZCA9IHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1lcXVhbGl6ZXInKSB8fCAnJztcbiAgICB2YXIgJHdhdGNoZWQgPSB0aGlzLiRlbGVtZW50LmZpbmQoYFtkYXRhLWVxdWFsaXplci13YXRjaD1cIiR7ZXFJZH1cIl1gKTtcblxuICAgIHRoaXMuJHdhdGNoZWQgPSAkd2F0Y2hlZC5sZW5ndGggPyAkd2F0Y2hlZCA6IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtZXF1YWxpemVyLXdhdGNoXScpO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1yZXNpemUnLCAoZXFJZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdlcScpKSk7XG5cdHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1tdXRhdGUnLCAoZXFJZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdlcScpKSk7XG5cbiAgICB0aGlzLmhhc05lc3RlZCA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtZXF1YWxpemVyXScpLmxlbmd0aCA+IDA7XG4gICAgdGhpcy5pc05lc3RlZCA9IHRoaXMuJGVsZW1lbnQucGFyZW50c1VudGlsKGRvY3VtZW50LmJvZHksICdbZGF0YS1lcXVhbGl6ZXJdJykubGVuZ3RoID4gMDtcbiAgICB0aGlzLmlzT24gPSBmYWxzZTtcbiAgICB0aGlzLl9iaW5kSGFuZGxlciA9IHtcbiAgICAgIG9uUmVzaXplTWVCb3VuZDogdGhpcy5fb25SZXNpemVNZS5iaW5kKHRoaXMpLFxuICAgICAgb25Qb3N0RXF1YWxpemVkQm91bmQ6IHRoaXMuX29uUG9zdEVxdWFsaXplZC5iaW5kKHRoaXMpXG4gICAgfTtcblxuICAgIHZhciBpbWdzID0gdGhpcy4kZWxlbWVudC5maW5kKCdpbWcnKTtcbiAgICB2YXIgdG9vU21hbGw7XG4gICAgaWYodGhpcy5vcHRpb25zLmVxdWFsaXplT24pe1xuICAgICAgdG9vU21hbGwgPSB0aGlzLl9jaGVja01RKCk7XG4gICAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX2NoZWNrTVEuYmluZCh0aGlzKSk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLl9ldmVudHMoKTtcbiAgICB9XG4gICAgaWYoKHRvb1NtYWxsICE9PSB1bmRlZmluZWQgJiYgdG9vU21hbGwgPT09IGZhbHNlKSB8fCB0b29TbWFsbCA9PT0gdW5kZWZpbmVkKXtcbiAgICAgIGlmKGltZ3MubGVuZ3RoKXtcbiAgICAgICAgRm91bmRhdGlvbi5vbkltYWdlc0xvYWRlZChpbWdzLCB0aGlzLl9yZWZsb3cuYmluZCh0aGlzKSk7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgdGhpcy5fcmVmbG93KCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgZXZlbnQgbGlzdGVuZXJzIGlmIHRoZSBicmVha3BvaW50IGlzIHRvbyBzbWFsbC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9wYXVzZUV2ZW50cygpIHtcbiAgICB0aGlzLmlzT24gPSBmYWxzZTtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZih7XG4gICAgICAnLnpmLmVxdWFsaXplcic6IHRoaXMuX2JpbmRIYW5kbGVyLm9uUG9zdEVxdWFsaXplZEJvdW5kLFxuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiB0aGlzLl9iaW5kSGFuZGxlci5vblJlc2l6ZU1lQm91bmQsXG5cdCAgJ211dGF0ZW1lLnpmLnRyaWdnZXInOiB0aGlzLl9iaW5kSGFuZGxlci5vblJlc2l6ZU1lQm91bmRcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBmdW5jdGlvbiB0byBoYW5kbGUgJGVsZW1lbnRzIHJlc2l6ZW1lLnpmLnRyaWdnZXIsIHdpdGggYm91bmQgdGhpcyBvbiBfYmluZEhhbmRsZXIub25SZXNpemVNZUJvdW5kXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfb25SZXNpemVNZShlKSB7XG4gICAgdGhpcy5fcmVmbG93KCk7XG4gIH1cblxuICAvKipcbiAgICogZnVuY3Rpb24gdG8gaGFuZGxlICRlbGVtZW50cyBwb3N0ZXF1YWxpemVkLnpmLmVxdWFsaXplciwgd2l0aCBib3VuZCB0aGlzIG9uIF9iaW5kSGFuZGxlci5vblBvc3RFcXVhbGl6ZWRCb3VuZFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX29uUG9zdEVxdWFsaXplZChlKSB7XG4gICAgaWYoZS50YXJnZXQgIT09IHRoaXMuJGVsZW1lbnRbMF0peyB0aGlzLl9yZWZsb3coKTsgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgRXF1YWxpemVyLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuX3BhdXNlRXZlbnRzKCk7XG4gICAgaWYodGhpcy5oYXNOZXN0ZWQpe1xuICAgICAgdGhpcy4kZWxlbWVudC5vbigncG9zdGVxdWFsaXplZC56Zi5lcXVhbGl6ZXInLCB0aGlzLl9iaW5kSGFuZGxlci5vblBvc3RFcXVhbGl6ZWRCb3VuZCk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdyZXNpemVtZS56Zi50cmlnZ2VyJywgdGhpcy5fYmluZEhhbmRsZXIub25SZXNpemVNZUJvdW5kKTtcblx0ICB0aGlzLiRlbGVtZW50Lm9uKCdtdXRhdGVtZS56Zi50cmlnZ2VyJywgdGhpcy5fYmluZEhhbmRsZXIub25SZXNpemVNZUJvdW5kKTtcbiAgICB9XG4gICAgdGhpcy5pc09uID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIGN1cnJlbnQgYnJlYWtwb2ludCB0byB0aGUgbWluaW11bSByZXF1aXJlZCBzaXplLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2NoZWNrTVEoKSB7XG4gICAgdmFyIHRvb1NtYWxsID0gIUZvdW5kYXRpb24uTWVkaWFRdWVyeS5pcyh0aGlzLm9wdGlvbnMuZXF1YWxpemVPbik7XG4gICAgaWYodG9vU21hbGwpe1xuICAgICAgaWYodGhpcy5pc09uKXtcbiAgICAgICAgdGhpcy5fcGF1c2VFdmVudHMoKTtcbiAgICAgICAgdGhpcy4kd2F0Y2hlZC5jc3MoJ2hlaWdodCcsICdhdXRvJyk7XG4gICAgICB9XG4gICAgfWVsc2V7XG4gICAgICBpZighdGhpcy5pc09uKXtcbiAgICAgICAgdGhpcy5fZXZlbnRzKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0b29TbWFsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIG5vb3AgdmVyc2lvbiBmb3IgdGhlIHBsdWdpblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2tpbGxzd2l0Y2goKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxzIG5lY2Vzc2FyeSBmdW5jdGlvbnMgdG8gdXBkYXRlIEVxdWFsaXplciB1cG9uIERPTSBjaGFuZ2VcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZWZsb3coKSB7XG4gICAgaWYoIXRoaXMub3B0aW9ucy5lcXVhbGl6ZU9uU3RhY2spe1xuICAgICAgaWYodGhpcy5faXNTdGFja2VkKCkpe1xuICAgICAgICB0aGlzLiR3YXRjaGVkLmNzcygnaGVpZ2h0JywgJ2F1dG8nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLmVxdWFsaXplQnlSb3cpIHtcbiAgICAgIHRoaXMuZ2V0SGVpZ2h0c0J5Um93KHRoaXMuYXBwbHlIZWlnaHRCeVJvdy5iaW5kKHRoaXMpKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMuZ2V0SGVpZ2h0cyh0aGlzLmFwcGx5SGVpZ2h0LmJpbmQodGhpcykpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBNYW51YWxseSBkZXRlcm1pbmVzIGlmIHRoZSBmaXJzdCAyIGVsZW1lbnRzIGFyZSAqTk9UKiBzdGFja2VkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2lzU3RhY2tlZCgpIHtcbiAgICBpZiAoIXRoaXMuJHdhdGNoZWRbMF0gfHwgIXRoaXMuJHdhdGNoZWRbMV0pIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy4kd2F0Y2hlZFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AgIT09IHRoaXMuJHdhdGNoZWRbMV0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmRzIHRoZSBvdXRlciBoZWlnaHRzIG9mIGNoaWxkcmVuIGNvbnRhaW5lZCB3aXRoaW4gYW4gRXF1YWxpemVyIHBhcmVudCBhbmQgcmV0dXJucyB0aGVtIGluIGFuIGFycmF5XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gQSBub24tb3B0aW9uYWwgY2FsbGJhY2sgdG8gcmV0dXJuIHRoZSBoZWlnaHRzIGFycmF5IHRvLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IGhlaWdodHMgLSBBbiBhcnJheSBvZiBoZWlnaHRzIG9mIGNoaWxkcmVuIHdpdGhpbiBFcXVhbGl6ZXIgY29udGFpbmVyXG4gICAqL1xuICBnZXRIZWlnaHRzKGNiKSB7XG4gICAgdmFyIGhlaWdodHMgPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSB0aGlzLiR3YXRjaGVkLmxlbmd0aDsgaSA8IGxlbjsgaSsrKXtcbiAgICAgIHRoaXMuJHdhdGNoZWRbaV0uc3R5bGUuaGVpZ2h0ID0gJ2F1dG8nO1xuICAgICAgaGVpZ2h0cy5wdXNoKHRoaXMuJHdhdGNoZWRbaV0ub2Zmc2V0SGVpZ2h0KTtcbiAgICB9XG4gICAgY2IoaGVpZ2h0cyk7XG4gIH1cblxuICAvKipcbiAgICogRmluZHMgdGhlIG91dGVyIGhlaWdodHMgb2YgY2hpbGRyZW4gY29udGFpbmVkIHdpdGhpbiBhbiBFcXVhbGl6ZXIgcGFyZW50IGFuZCByZXR1cm5zIHRoZW0gaW4gYW4gYXJyYXlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBBIG5vbi1vcHRpb25hbCBjYWxsYmFjayB0byByZXR1cm4gdGhlIGhlaWdodHMgYXJyYXkgdG8uXG4gICAqIEByZXR1cm5zIHtBcnJheX0gZ3JvdXBzIC0gQW4gYXJyYXkgb2YgaGVpZ2h0cyBvZiBjaGlsZHJlbiB3aXRoaW4gRXF1YWxpemVyIGNvbnRhaW5lciBncm91cGVkIGJ5IHJvdyB3aXRoIGVsZW1lbnQsaGVpZ2h0IGFuZCBtYXggYXMgbGFzdCBjaGlsZFxuICAgKi9cbiAgZ2V0SGVpZ2h0c0J5Um93KGNiKSB7XG4gICAgdmFyIGxhc3RFbFRvcE9mZnNldCA9ICh0aGlzLiR3YXRjaGVkLmxlbmd0aCA/IHRoaXMuJHdhdGNoZWQuZmlyc3QoKS5vZmZzZXQoKS50b3AgOiAwKSxcbiAgICAgICAgZ3JvdXBzID0gW10sXG4gICAgICAgIGdyb3VwID0gMDtcbiAgICAvL2dyb3VwIGJ5IFJvd1xuICAgIGdyb3Vwc1tncm91cF0gPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSB0aGlzLiR3YXRjaGVkLmxlbmd0aDsgaSA8IGxlbjsgaSsrKXtcbiAgICAgIHRoaXMuJHdhdGNoZWRbaV0uc3R5bGUuaGVpZ2h0ID0gJ2F1dG8nO1xuICAgICAgLy9tYXliZSBjb3VsZCB1c2UgdGhpcy4kd2F0Y2hlZFtpXS5vZmZzZXRUb3BcbiAgICAgIHZhciBlbE9mZnNldFRvcCA9ICQodGhpcy4kd2F0Y2hlZFtpXSkub2Zmc2V0KCkudG9wO1xuICAgICAgaWYgKGVsT2Zmc2V0VG9wIT1sYXN0RWxUb3BPZmZzZXQpIHtcbiAgICAgICAgZ3JvdXArKztcbiAgICAgICAgZ3JvdXBzW2dyb3VwXSA9IFtdO1xuICAgICAgICBsYXN0RWxUb3BPZmZzZXQ9ZWxPZmZzZXRUb3A7XG4gICAgICB9XG4gICAgICBncm91cHNbZ3JvdXBdLnB1c2goW3RoaXMuJHdhdGNoZWRbaV0sdGhpcy4kd2F0Y2hlZFtpXS5vZmZzZXRIZWlnaHRdKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBqID0gMCwgbG4gPSBncm91cHMubGVuZ3RoOyBqIDwgbG47IGorKykge1xuICAgICAgdmFyIGhlaWdodHMgPSAkKGdyb3Vwc1tqXSkubWFwKGZ1bmN0aW9uKCl7IHJldHVybiB0aGlzWzFdOyB9KS5nZXQoKTtcbiAgICAgIHZhciBtYXggICAgICAgICA9IE1hdGgubWF4LmFwcGx5KG51bGwsIGhlaWdodHMpO1xuICAgICAgZ3JvdXBzW2pdLnB1c2gobWF4KTtcbiAgICB9XG4gICAgY2IoZ3JvdXBzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGFuZ2VzIHRoZSBDU1MgaGVpZ2h0IHByb3BlcnR5IG9mIGVhY2ggY2hpbGQgaW4gYW4gRXF1YWxpemVyIHBhcmVudCB0byBtYXRjaCB0aGUgdGFsbGVzdFxuICAgKiBAcGFyYW0ge2FycmF5fSBoZWlnaHRzIC0gQW4gYXJyYXkgb2YgaGVpZ2h0cyBvZiBjaGlsZHJlbiB3aXRoaW4gRXF1YWxpemVyIGNvbnRhaW5lclxuICAgKiBAZmlyZXMgRXF1YWxpemVyI3ByZWVxdWFsaXplZFxuICAgKiBAZmlyZXMgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRcbiAgICovXG4gIGFwcGx5SGVpZ2h0KGhlaWdodHMpIHtcbiAgICB2YXIgbWF4ID0gTWF0aC5tYXguYXBwbHkobnVsbCwgaGVpZ2h0cyk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgYmVmb3JlIHRoZSBoZWlnaHRzIGFyZSBhcHBsaWVkXG4gICAgICogQGV2ZW50IEVxdWFsaXplciNwcmVlcXVhbGl6ZWRcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3ByZWVxdWFsaXplZC56Zi5lcXVhbGl6ZXInKTtcblxuICAgIHRoaXMuJHdhdGNoZWQuY3NzKCdoZWlnaHQnLCBtYXgpO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgaGVpZ2h0cyBoYXZlIGJlZW4gYXBwbGllZFxuICAgICAqIEBldmVudCBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZFxuICAgICAqL1xuICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Bvc3RlcXVhbGl6ZWQuemYuZXF1YWxpemVyJyk7XG4gIH1cblxuICAvKipcbiAgICogQ2hhbmdlcyB0aGUgQ1NTIGhlaWdodCBwcm9wZXJ0eSBvZiBlYWNoIGNoaWxkIGluIGFuIEVxdWFsaXplciBwYXJlbnQgdG8gbWF0Y2ggdGhlIHRhbGxlc3QgYnkgcm93XG4gICAqIEBwYXJhbSB7YXJyYXl9IGdyb3VwcyAtIEFuIGFycmF5IG9mIGhlaWdodHMgb2YgY2hpbGRyZW4gd2l0aGluIEVxdWFsaXplciBjb250YWluZXIgZ3JvdXBlZCBieSByb3cgd2l0aCBlbGVtZW50LGhlaWdodCBhbmQgbWF4IGFzIGxhc3QgY2hpbGRcbiAgICogQGZpcmVzIEVxdWFsaXplciNwcmVlcXVhbGl6ZWRcbiAgICogQGZpcmVzIEVxdWFsaXplciNwcmVlcXVhbGl6ZWRyb3dcbiAgICogQGZpcmVzIEVxdWFsaXplciNwb3N0ZXF1YWxpemVkcm93XG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZFxuICAgKi9cbiAgYXBwbHlIZWlnaHRCeVJvdyhncm91cHMpIHtcbiAgICAvKipcbiAgICAgKiBGaXJlcyBiZWZvcmUgdGhlIGhlaWdodHMgYXJlIGFwcGxpZWRcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3ByZWVxdWFsaXplZC56Zi5lcXVhbGl6ZXInKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gZ3JvdXBzLmxlbmd0aDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgdmFyIGdyb3Vwc0lMZW5ndGggPSBncm91cHNbaV0ubGVuZ3RoLFxuICAgICAgICAgIG1heCA9IGdyb3Vwc1tpXVtncm91cHNJTGVuZ3RoIC0gMV07XG4gICAgICBpZiAoZ3JvdXBzSUxlbmd0aDw9Mikge1xuICAgICAgICAkKGdyb3Vwc1tpXVswXVswXSkuY3NzKHsnaGVpZ2h0JzonYXV0byd9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvKipcbiAgICAgICAgKiBGaXJlcyBiZWZvcmUgdGhlIGhlaWdodHMgcGVyIHJvdyBhcmUgYXBwbGllZFxuICAgICAgICAqIEBldmVudCBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkcm93XG4gICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3ByZWVxdWFsaXplZHJvdy56Zi5lcXVhbGl6ZXInKTtcbiAgICAgIGZvciAodmFyIGogPSAwLCBsZW5KID0gKGdyb3Vwc0lMZW5ndGgtMSk7IGogPCBsZW5KIDsgaisrKSB7XG4gICAgICAgICQoZ3JvdXBzW2ldW2pdWzBdKS5jc3MoeydoZWlnaHQnOm1heH0pO1xuICAgICAgfVxuICAgICAgLyoqXG4gICAgICAgICogRmlyZXMgd2hlbiB0aGUgaGVpZ2h0cyBwZXIgcm93IGhhdmUgYmVlbiBhcHBsaWVkXG4gICAgICAgICogQGV2ZW50IEVxdWFsaXplciNwb3N0ZXF1YWxpemVkcm93XG4gICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Bvc3RlcXVhbGl6ZWRyb3cuemYuZXF1YWxpemVyJyk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIGhlaWdodHMgaGF2ZSBiZWVuIGFwcGxpZWRcbiAgICAgKi9cbiAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwb3N0ZXF1YWxpemVkLnpmLmVxdWFsaXplcicpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIEVxdWFsaXplci5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuX3BhdXNlRXZlbnRzKCk7XG4gICAgdGhpcy4kd2F0Y2hlZC5jc3MoJ2hlaWdodCcsICdhdXRvJyk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWZhdWx0IHNldHRpbmdzIGZvciBwbHVnaW5cbiAqL1xuRXF1YWxpemVyLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogRW5hYmxlIGhlaWdodCBlcXVhbGl6YXRpb24gd2hlbiBzdGFja2VkIG9uIHNtYWxsZXIgc2NyZWVucy5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGVxdWFsaXplT25TdGFjazogZmFsc2UsXG4gIC8qKlxuICAgKiBFbmFibGUgaGVpZ2h0IGVxdWFsaXphdGlvbiByb3cgYnkgcm93LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgZXF1YWxpemVCeVJvdzogZmFsc2UsXG4gIC8qKlxuICAgKiBTdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBtaW5pbXVtIGJyZWFrcG9pbnQgc2l6ZSB0aGUgcGx1Z2luIHNob3VsZCBlcXVhbGl6ZSBoZWlnaHRzIG9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICcnXG4gICAqL1xuICBlcXVhbGl6ZU9uOiAnJ1xufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEVxdWFsaXplciwgJ0VxdWFsaXplcicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogSW50ZXJjaGFuZ2UgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmludGVyY2hhbmdlXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlclxuICovXG5cbmNsYXNzIEludGVyY2hhbmdlIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgSW50ZXJjaGFuZ2UuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgSW50ZXJjaGFuZ2UjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIEludGVyY2hhbmdlLmRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICB0aGlzLnJ1bGVzID0gW107XG4gICAgdGhpcy5jdXJyZW50UGF0aCA9ICcnO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnSW50ZXJjaGFuZ2UnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgSW50ZXJjaGFuZ2UgcGx1Z2luIGFuZCBjYWxscyBmdW5jdGlvbnMgdG8gZ2V0IGludGVyY2hhbmdlIGZ1bmN0aW9uaW5nIG9uIGxvYWQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy5fYWRkQnJlYWtwb2ludHMoKTtcbiAgICB0aGlzLl9nZW5lcmF0ZVJ1bGVzKCk7XG4gICAgdGhpcy5fcmVmbG93KCk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciBJbnRlcmNoYW5nZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgICQod2luZG93KS5vbigncmVzaXplLnpmLmludGVyY2hhbmdlJywgRm91bmRhdGlvbi51dGlsLnRocm90dGxlKCgpID0+IHtcbiAgICAgIHRoaXMuX3JlZmxvdygpO1xuICAgIH0sIDUwKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbHMgbmVjZXNzYXJ5IGZ1bmN0aW9ucyB0byB1cGRhdGUgSW50ZXJjaGFuZ2UgdXBvbiBET00gY2hhbmdlXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlZmxvdygpIHtcbiAgICB2YXIgbWF0Y2g7XG5cbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBydWxlLCBidXQgb25seSBzYXZlIHRoZSBsYXN0IG1hdGNoXG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnJ1bGVzKSB7XG4gICAgICBpZih0aGlzLnJ1bGVzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgIHZhciBydWxlID0gdGhpcy5ydWxlc1tpXTtcbiAgICAgICAgaWYgKHdpbmRvdy5tYXRjaE1lZGlhKHJ1bGUucXVlcnkpLm1hdGNoZXMpIHtcbiAgICAgICAgICBtYXRjaCA9IHJ1bGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIHRoaXMucmVwbGFjZShtYXRjaC5wYXRoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgRm91bmRhdGlvbiBicmVha3BvaW50cyBhbmQgYWRkcyB0aGVtIHRvIHRoZSBJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVMgb2JqZWN0LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRCcmVha3BvaW50cygpIHtcbiAgICBmb3IgKHZhciBpIGluIEZvdW5kYXRpb24uTWVkaWFRdWVyeS5xdWVyaWVzKSB7XG4gICAgICBpZiAoRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LnF1ZXJpZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LnF1ZXJpZXNbaV07XG4gICAgICAgIEludGVyY2hhbmdlLlNQRUNJQUxfUVVFUklFU1txdWVyeS5uYW1lXSA9IHF1ZXJ5LnZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIEludGVyY2hhbmdlIGVsZW1lbnQgZm9yIHRoZSBwcm92aWRlZCBtZWRpYSBxdWVyeSArIGNvbnRlbnQgcGFpcmluZ3NcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0aGF0IGlzIGFuIEludGVyY2hhbmdlIGluc3RhbmNlXG4gICAqIEByZXR1cm5zIHtBcnJheX0gc2NlbmFyaW9zIC0gQXJyYXkgb2Ygb2JqZWN0cyB0aGF0IGhhdmUgJ21xJyBhbmQgJ3BhdGgnIGtleXMgd2l0aCBjb3JyZXNwb25kaW5nIGtleXNcbiAgICovXG4gIF9nZW5lcmF0ZVJ1bGVzKGVsZW1lbnQpIHtcbiAgICB2YXIgcnVsZXNMaXN0ID0gW107XG4gICAgdmFyIHJ1bGVzO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5ydWxlcykge1xuICAgICAgcnVsZXMgPSB0aGlzLm9wdGlvbnMucnVsZXM7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcnVsZXMgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ2ludGVyY2hhbmdlJyk7XG4gICAgfVxuICAgIFxuICAgIHJ1bGVzID0gIHR5cGVvZiBydWxlcyA9PT0gJ3N0cmluZycgPyBydWxlcy5tYXRjaCgvXFxbLio/XFxdL2cpIDogcnVsZXM7XG5cbiAgICBmb3IgKHZhciBpIGluIHJ1bGVzKSB7XG4gICAgICBpZihydWxlcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICB2YXIgcnVsZSA9IHJ1bGVzW2ldLnNsaWNlKDEsIC0xKS5zcGxpdCgnLCAnKTtcbiAgICAgICAgdmFyIHBhdGggPSBydWxlLnNsaWNlKDAsIC0xKS5qb2luKCcnKTtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gcnVsZVtydWxlLmxlbmd0aCAtIDFdO1xuXG4gICAgICAgIGlmIChJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVNbcXVlcnldKSB7XG4gICAgICAgICAgcXVlcnkgPSBJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVNbcXVlcnldO1xuICAgICAgICB9XG5cbiAgICAgICAgcnVsZXNMaXN0LnB1c2goe1xuICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgcXVlcnk6IHF1ZXJ5XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucnVsZXMgPSBydWxlc0xpc3Q7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIHRoZSBgc3JjYCBwcm9wZXJ0eSBvZiBhbiBpbWFnZSwgb3IgY2hhbmdlIHRoZSBIVE1MIG9mIGEgY29udGFpbmVyLCB0byB0aGUgc3BlY2lmaWVkIHBhdGguXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCAtIFBhdGggdG8gdGhlIGltYWdlIG9yIEhUTUwgcGFydGlhbC5cbiAgICogQGZpcmVzIEludGVyY2hhbmdlI3JlcGxhY2VkXG4gICAqL1xuICByZXBsYWNlKHBhdGgpIHtcbiAgICBpZiAodGhpcy5jdXJyZW50UGF0aCA9PT0gcGF0aCkgcmV0dXJuO1xuXG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgdHJpZ2dlciA9ICdyZXBsYWNlZC56Zi5pbnRlcmNoYW5nZSc7XG5cbiAgICAvLyBSZXBsYWNpbmcgaW1hZ2VzXG4gICAgaWYgKHRoaXMuJGVsZW1lbnRbMF0ubm9kZU5hbWUgPT09ICdJTUcnKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3NyYycsIHBhdGgpLm9uKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLmN1cnJlbnRQYXRoID0gcGF0aDtcbiAgICAgIH0pXG4gICAgICAudHJpZ2dlcih0cmlnZ2VyKTtcbiAgICB9XG4gICAgLy8gUmVwbGFjaW5nIGJhY2tncm91bmQgaW1hZ2VzXG4gICAgZWxzZSBpZiAocGF0aC5tYXRjaCgvXFwuKGdpZnxqcGd8anBlZ3xwbmd8c3ZnfHRpZmYpKFs/I10uKik/L2kpKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmNzcyh7ICdiYWNrZ3JvdW5kLWltYWdlJzogJ3VybCgnK3BhdGgrJyknIH0pXG4gICAgICAgICAgLnRyaWdnZXIodHJpZ2dlcik7XG4gICAgfVxuICAgIC8vIFJlcGxhY2luZyBIVE1MXG4gICAgZWxzZSB7XG4gICAgICAkLmdldChwYXRoLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICBfdGhpcy4kZWxlbWVudC5odG1sKHJlc3BvbnNlKVxuICAgICAgICAgICAgIC50cmlnZ2VyKHRyaWdnZXIpO1xuICAgICAgICAkKHJlc3BvbnNlKS5mb3VuZGF0aW9uKCk7XG4gICAgICAgIF90aGlzLmN1cnJlbnRQYXRoID0gcGF0aDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gY29udGVudCBpbiBhbiBJbnRlcmNoYW5nZSBlbGVtZW50IGlzIGRvbmUgYmVpbmcgbG9hZGVkLlxuICAgICAqIEBldmVudCBJbnRlcmNoYW5nZSNyZXBsYWNlZFxuICAgICAqL1xuICAgIC8vIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncmVwbGFjZWQuemYuaW50ZXJjaGFuZ2UnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBpbnRlcmNoYW5nZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIC8vVE9ETyB0aGlzLlxuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbkludGVyY2hhbmdlLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogUnVsZXMgdG8gYmUgYXBwbGllZCB0byBJbnRlcmNoYW5nZSBlbGVtZW50cy4gU2V0IHdpdGggdGhlIGBkYXRhLWludGVyY2hhbmdlYCBhcnJheSBub3RhdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7P2FycmF5fVxuICAgKiBAZGVmYXVsdCBudWxsXG4gICAqL1xuICBydWxlczogbnVsbFxufTtcblxuSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTID0ge1xuICAnbGFuZHNjYXBlJzogJ3NjcmVlbiBhbmQgKG9yaWVudGF0aW9uOiBsYW5kc2NhcGUpJyxcbiAgJ3BvcnRyYWl0JzogJ3NjcmVlbiBhbmQgKG9yaWVudGF0aW9uOiBwb3J0cmFpdCknLFxuICAncmV0aW5hJzogJ29ubHkgc2NyZWVuIGFuZCAoLXdlYmtpdC1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwgb25seSBzY3JlZW4gYW5kIChtaW4tLW1vei1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCBvbmx5IHNjcmVlbiBhbmQgKC1vLW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIvMSksIG9ubHkgc2NyZWVuIGFuZCAobWluLWRldmljZS1waXhlbC1yYXRpbzogMiksIG9ubHkgc2NyZWVuIGFuZCAobWluLXJlc29sdXRpb246IDE5MmRwaSksIG9ubHkgc2NyZWVuIGFuZCAobWluLXJlc29sdXRpb246IDJkcHB4KSdcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihJbnRlcmNoYW5nZSwgJ0ludGVyY2hhbmdlJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBNYWdlbGxhbiBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ubWFnZWxsYW5cbiAqL1xuXG5jbGFzcyBNYWdlbGxhbiB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIE1hZ2VsbGFuLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIE1hZ2VsbGFuI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgdHJpZ2dlciB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyAgPSAkLmV4dGVuZCh7fSwgTWFnZWxsYW4uZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLmNhbGNQb2ludHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ01hZ2VsbGFuJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIE1hZ2VsbGFuIHBsdWdpbiBhbmQgY2FsbHMgZnVuY3Rpb25zIHRvIGdldCBlcXVhbGl6ZXIgZnVuY3Rpb25pbmcgb24gbG9hZC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBpZCA9IHRoaXMuJGVsZW1lbnRbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnbWFnZWxsYW4nKTtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuJHRhcmdldHMgPSAkKCdbZGF0YS1tYWdlbGxhbi10YXJnZXRdJyk7XG4gICAgdGhpcy4kbGlua3MgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKTtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xuICAgICAgJ2RhdGEtcmVzaXplJzogaWQsXG4gICAgICAnZGF0YS1zY3JvbGwnOiBpZCxcbiAgICAgICdpZCc6IGlkXG4gICAgfSk7XG4gICAgdGhpcy4kYWN0aXZlID0gJCgpO1xuICAgIHRoaXMuc2Nyb2xsUG9zID0gcGFyc2VJbnQod2luZG93LnBhZ2VZT2Zmc2V0LCAxMCk7XG5cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGVzIGFuIGFycmF5IG9mIHBpeGVsIHZhbHVlcyB0aGF0IGFyZSB0aGUgZGVtYXJjYXRpb24gbGluZXMgYmV0d2VlbiBsb2NhdGlvbnMgb24gdGhlIHBhZ2UuXG4gICAqIENhbiBiZSBpbnZva2VkIGlmIG5ldyBlbGVtZW50cyBhcmUgYWRkZWQgb3IgdGhlIHNpemUgb2YgYSBsb2NhdGlvbiBjaGFuZ2VzLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGNhbGNQb2ludHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgYm9keSA9IGRvY3VtZW50LmJvZHksXG4gICAgICAgIGh0bWwgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG5cbiAgICB0aGlzLnBvaW50cyA9IFtdO1xuICAgIHRoaXMud2luSGVpZ2h0ID0gTWF0aC5yb3VuZChNYXRoLm1heCh3aW5kb3cuaW5uZXJIZWlnaHQsIGh0bWwuY2xpZW50SGVpZ2h0KSk7XG4gICAgdGhpcy5kb2NIZWlnaHQgPSBNYXRoLnJvdW5kKE1hdGgubWF4KGJvZHkuc2Nyb2xsSGVpZ2h0LCBib2R5Lm9mZnNldEhlaWdodCwgaHRtbC5jbGllbnRIZWlnaHQsIGh0bWwuc2Nyb2xsSGVpZ2h0LCBodG1sLm9mZnNldEhlaWdodCkpO1xuXG4gICAgdGhpcy4kdGFyZ2V0cy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJHRhciA9ICQodGhpcyksXG4gICAgICAgICAgcHQgPSBNYXRoLnJvdW5kKCR0YXIub2Zmc2V0KCkudG9wIC0gX3RoaXMub3B0aW9ucy50aHJlc2hvbGQpO1xuICAgICAgJHRhci50YXJnZXRQb2ludCA9IHB0O1xuICAgICAgX3RoaXMucG9pbnRzLnB1c2gocHQpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgTWFnZWxsYW4uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgICRib2R5ID0gJCgnaHRtbCwgYm9keScpLFxuICAgICAgICBvcHRzID0ge1xuICAgICAgICAgIGR1cmF0aW9uOiBfdGhpcy5vcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uLFxuICAgICAgICAgIGVhc2luZzogICBfdGhpcy5vcHRpb25zLmFuaW1hdGlvbkVhc2luZ1xuICAgICAgICB9O1xuICAgICQod2luZG93KS5vbmUoJ2xvYWQnLCBmdW5jdGlvbigpe1xuICAgICAgaWYoX3RoaXMub3B0aW9ucy5kZWVwTGlua2luZyl7XG4gICAgICAgIGlmKGxvY2F0aW9uLmhhc2gpe1xuICAgICAgICAgIF90aGlzLnNjcm9sbFRvTG9jKGxvY2F0aW9uLmhhc2gpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBfdGhpcy5jYWxjUG9pbnRzKCk7XG4gICAgICBfdGhpcy5fdXBkYXRlQWN0aXZlKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9uKHtcbiAgICAgICdyZXNpemVtZS56Zi50cmlnZ2VyJzogdGhpcy5yZWZsb3cuYmluZCh0aGlzKSxcbiAgICAgICdzY3JvbGxtZS56Zi50cmlnZ2VyJzogdGhpcy5fdXBkYXRlQWN0aXZlLmJpbmQodGhpcylcbiAgICB9KS5vbignY2xpY2suemYubWFnZWxsYW4nLCAnYVtocmVmXj1cIiNcIl0nLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIGFycml2YWwgICA9IHRoaXMuZ2V0QXR0cmlidXRlKCdocmVmJyk7XG4gICAgICAgIF90aGlzLnNjcm9sbFRvTG9jKGFycml2YWwpO1xuICAgICAgfSk7XG4gICAgJCh3aW5kb3cpLm9uKCdwb3BzdGF0ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmKF90aGlzLm9wdGlvbnMuZGVlcExpbmtpbmcpIHtcbiAgICAgICAgX3RoaXMuc2Nyb2xsVG9Mb2Mod2luZG93LmxvY2F0aW9uLmhhc2gpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEZ1bmN0aW9uIHRvIHNjcm9sbCB0byBhIGdpdmVuIGxvY2F0aW9uIG9uIHRoZSBwYWdlLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbG9jIC0gYSBwcm9wZXJseSBmb3JtYXR0ZWQgalF1ZXJ5IGlkIHNlbGVjdG9yLiBFeGFtcGxlOiAnI2ZvbydcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBzY3JvbGxUb0xvYyhsb2MpIHtcbiAgICAvLyBEbyBub3RoaW5nIGlmIHRhcmdldCBkb2VzIG5vdCBleGlzdCB0byBwcmV2ZW50IGVycm9yc1xuICAgIGlmICghJChsb2MpLmxlbmd0aCkge3JldHVybiBmYWxzZTt9XG4gICAgdGhpcy5faW5UcmFuc2l0aW9uID0gdHJ1ZTtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICBzY3JvbGxQb3MgPSBNYXRoLnJvdW5kKCQobG9jKS5vZmZzZXQoKS50b3AgLSB0aGlzLm9wdGlvbnMudGhyZXNob2xkIC8gMiAtIHRoaXMub3B0aW9ucy5iYXJPZmZzZXQpO1xuXG4gICAgJCgnaHRtbCwgYm9keScpLnN0b3AodHJ1ZSkuYW5pbWF0ZShcbiAgICAgIHsgc2Nyb2xsVG9wOiBzY3JvbGxQb3MgfSxcbiAgICAgIHRoaXMub3B0aW9ucy5hbmltYXRpb25EdXJhdGlvbixcbiAgICAgIHRoaXMub3B0aW9ucy5hbmltYXRpb25FYXNpbmcsXG4gICAgICBmdW5jdGlvbigpIHtfdGhpcy5faW5UcmFuc2l0aW9uID0gZmFsc2U7IF90aGlzLl91cGRhdGVBY3RpdmUoKX1cbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxzIG5lY2Vzc2FyeSBmdW5jdGlvbnMgdG8gdXBkYXRlIE1hZ2VsbGFuIHVwb24gRE9NIGNoYW5nZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHJlZmxvdygpIHtcbiAgICB0aGlzLmNhbGNQb2ludHMoKTtcbiAgICB0aGlzLl91cGRhdGVBY3RpdmUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSB2aXNpYmlsaXR5IG9mIGFuIGFjdGl2ZSBsb2NhdGlvbiBsaW5rLCBhbmQgdXBkYXRlcyB0aGUgdXJsIGhhc2ggZm9yIHRoZSBwYWdlLCBpZiBkZWVwTGlua2luZyBlbmFibGVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIE1hZ2VsbGFuI3VwZGF0ZVxuICAgKi9cbiAgX3VwZGF0ZUFjdGl2ZSgvKmV2dCwgZWxlbSwgc2Nyb2xsUG9zKi8pIHtcbiAgICBpZih0aGlzLl9pblRyYW5zaXRpb24pIHtyZXR1cm47fVxuICAgIHZhciB3aW5Qb3MgPSAvKnNjcm9sbFBvcyB8fCovIHBhcnNlSW50KHdpbmRvdy5wYWdlWU9mZnNldCwgMTApLFxuICAgICAgICBjdXJJZHg7XG5cbiAgICBpZih3aW5Qb3MgKyB0aGlzLndpbkhlaWdodCA9PT0gdGhpcy5kb2NIZWlnaHQpeyBjdXJJZHggPSB0aGlzLnBvaW50cy5sZW5ndGggLSAxOyB9XG4gICAgZWxzZSBpZih3aW5Qb3MgPCB0aGlzLnBvaW50c1swXSl7IGN1cklkeCA9IHVuZGVmaW5lZDsgfVxuICAgIGVsc2V7XG4gICAgICB2YXIgaXNEb3duID0gdGhpcy5zY3JvbGxQb3MgPCB3aW5Qb3MsXG4gICAgICAgICAgX3RoaXMgPSB0aGlzLFxuICAgICAgICAgIGN1clZpc2libGUgPSB0aGlzLnBvaW50cy5maWx0ZXIoZnVuY3Rpb24ocCwgaSl7XG4gICAgICAgICAgICByZXR1cm4gaXNEb3duID8gcCAtIF90aGlzLm9wdGlvbnMuYmFyT2Zmc2V0IDw9IHdpblBvcyA6IHAgLSBfdGhpcy5vcHRpb25zLmJhck9mZnNldCAtIF90aGlzLm9wdGlvbnMudGhyZXNob2xkIDw9IHdpblBvcztcbiAgICAgICAgICB9KTtcbiAgICAgIGN1cklkeCA9IGN1clZpc2libGUubGVuZ3RoID8gY3VyVmlzaWJsZS5sZW5ndGggLSAxIDogMDtcbiAgICB9XG5cbiAgICB0aGlzLiRhY3RpdmUucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmFjdGl2ZUNsYXNzKTtcbiAgICB0aGlzLiRhY3RpdmUgPSB0aGlzLiRsaW5rcy5maWx0ZXIoJ1tocmVmPVwiIycgKyB0aGlzLiR0YXJnZXRzLmVxKGN1cklkeCkuZGF0YSgnbWFnZWxsYW4tdGFyZ2V0JykgKyAnXCJdJykuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmFjdGl2ZUNsYXNzKTtcblxuICAgIGlmKHRoaXMub3B0aW9ucy5kZWVwTGlua2luZyl7XG4gICAgICB2YXIgaGFzaCA9IFwiXCI7XG4gICAgICBpZihjdXJJZHggIT0gdW5kZWZpbmVkKXtcbiAgICAgICAgaGFzaCA9IHRoaXMuJGFjdGl2ZVswXS5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICAgIH1cbiAgICAgIGlmKGhhc2ggIT09IHdpbmRvdy5sb2NhdGlvbi5oYXNoKSB7XG4gICAgICAgIGlmKHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSl7XG4gICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsIG51bGwsIGhhc2gpO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9IGhhc2g7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnNjcm9sbFBvcyA9IHdpblBvcztcbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIG1hZ2VsbGFuIGlzIGZpbmlzaGVkIHVwZGF0aW5nIHRvIHRoZSBuZXcgYWN0aXZlIGVsZW1lbnQuXG4gICAgICogQGV2ZW50IE1hZ2VsbGFuI3VwZGF0ZVxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigndXBkYXRlLnpmLm1hZ2VsbGFuJywgW3RoaXMuJGFjdGl2ZV0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIE1hZ2VsbGFuIGFuZCByZXNldHMgdGhlIHVybCBvZiB0aGUgd2luZG93LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50cmlnZ2VyIC56Zi5tYWdlbGxhbicpXG4gICAgICAgIC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuYWN0aXZlQ2xhc3N9YCkucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmFjdGl2ZUNsYXNzKTtcblxuICAgIGlmKHRoaXMub3B0aW9ucy5kZWVwTGlua2luZyl7XG4gICAgICB2YXIgaGFzaCA9IHRoaXMuJGFjdGl2ZVswXS5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoLnJlcGxhY2UoaGFzaCwgJycpO1xuICAgIH1cblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG4vKipcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxuICovXG5NYWdlbGxhbi5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lLCBpbiBtcywgdGhlIGFuaW1hdGVkIHNjcm9sbGluZyBzaG91bGQgdGFrZSBiZXR3ZWVuIGxvY2F0aW9ucy5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCA1MDBcbiAgICovXG4gIGFuaW1hdGlvbkR1cmF0aW9uOiA1MDAsXG4gIC8qKlxuICAgKiBBbmltYXRpb24gc3R5bGUgdG8gdXNlIHdoZW4gc2Nyb2xsaW5nIGJldHdlZW4gbG9jYXRpb25zLiBDYW4gYmUgYCdzd2luZydgIG9yIGAnbGluZWFyJ2AuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ2xpbmVhcidcbiAgICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9hcGkuanF1ZXJ5LmNvbS9hbmltYXRlfEpxdWVyeSBhbmltYXRlfVxuICAgKi9cbiAgYW5pbWF0aW9uRWFzaW5nOiAnbGluZWFyJyxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBwaXhlbHMgdG8gdXNlIGFzIGEgbWFya2VyIGZvciBsb2NhdGlvbiBjaGFuZ2VzLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDUwXG4gICAqL1xuICB0aHJlc2hvbGQ6IDUwLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYWN0aXZlIGxvY2F0aW9ucyBsaW5rIG9uIHRoZSBtYWdlbGxhbiBjb250YWluZXIuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ2FjdGl2ZSdcbiAgICovXG4gIGFjdGl2ZUNsYXNzOiAnYWN0aXZlJyxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgc2NyaXB0IHRvIG1hbmlwdWxhdGUgdGhlIHVybCBvZiB0aGUgY3VycmVudCBwYWdlLCBhbmQgaWYgc3VwcG9ydGVkLCBhbHRlciB0aGUgaGlzdG9yeS5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGRlZXBMaW5raW5nOiBmYWxzZSxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBwaXhlbHMgdG8gb2Zmc2V0IHRoZSBzY3JvbGwgb2YgdGhlIHBhZ2Ugb24gaXRlbSBjbGljayBpZiB1c2luZyBhIHN0aWNreSBuYXYgYmFyLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDBcbiAgICovXG4gIGJhck9mZnNldDogMFxufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oTWFnZWxsYW4sICdNYWdlbGxhbicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogT2ZmQ2FudmFzIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5vZmZjYW52YXNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqL1xuXG5jbGFzcyBPZmZDYW52YXMge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhbiBvZmYtY2FudmFzIHdyYXBwZXIuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgT2ZmQ2FudmFzI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGluaXRpYWxpemUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgT2ZmQ2FudmFzLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG4gICAgdGhpcy4kbGFzdFRyaWdnZXIgPSAkKCk7XG4gICAgdGhpcy4kdHJpZ2dlcnMgPSAkKCk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdPZmZDYW52YXMnKVxuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ09mZkNhbnZhcycsIHtcbiAgICAgICdFU0NBUEUnOiAnY2xvc2UnXG4gICAgfSk7XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgb2ZmLWNhbnZhcyB3cmFwcGVyIGJ5IGFkZGluZyB0aGUgZXhpdCBvdmVybGF5IChpZiBuZWVkZWQpLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBpZCA9IHRoaXMuJGVsZW1lbnQuYXR0cignaWQnKTtcblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuXG4gICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcyhgaXMtdHJhbnNpdGlvbi0ke3RoaXMub3B0aW9ucy50cmFuc2l0aW9ufWApO1xuXG4gICAgLy8gRmluZCB0cmlnZ2VycyB0aGF0IGFmZmVjdCB0aGlzIGVsZW1lbnQgYW5kIGFkZCBhcmlhLWV4cGFuZGVkIHRvIHRoZW1cbiAgICB0aGlzLiR0cmlnZ2VycyA9ICQoZG9jdW1lbnQpXG4gICAgICAuZmluZCgnW2RhdGEtb3Blbj1cIicraWQrJ1wiXSwgW2RhdGEtY2xvc2U9XCInK2lkKydcIl0sIFtkYXRhLXRvZ2dsZT1cIicraWQrJ1wiXScpXG4gICAgICAuYXR0cignYXJpYS1leHBhbmRlZCcsICdmYWxzZScpXG4gICAgICAuYXR0cignYXJpYS1jb250cm9scycsIGlkKTtcblxuICAgIC8vIEFkZCBhbiBvdmVybGF5IG92ZXIgdGhlIGNvbnRlbnQgaWYgbmVjZXNzYXJ5XG4gICAgaWYgKHRoaXMub3B0aW9ucy5jb250ZW50T3ZlcmxheSA9PT0gdHJ1ZSkge1xuICAgICAgdmFyIG92ZXJsYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIHZhciBvdmVybGF5UG9zaXRpb24gPSAkKHRoaXMuJGVsZW1lbnQpLmNzcyhcInBvc2l0aW9uXCIpID09PSAnZml4ZWQnID8gJ2lzLW92ZXJsYXktZml4ZWQnIDogJ2lzLW92ZXJsYXktYWJzb2x1dGUnO1xuICAgICAgb3ZlcmxheS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2pzLW9mZi1jYW52YXMtb3ZlcmxheSAnICsgb3ZlcmxheVBvc2l0aW9uKTtcbiAgICAgIHRoaXMuJG92ZXJsYXkgPSAkKG92ZXJsYXkpO1xuICAgICAgaWYob3ZlcmxheVBvc2l0aW9uID09PSAnaXMtb3ZlcmxheS1maXhlZCcpIHtcbiAgICAgICAgJCgnYm9keScpLmFwcGVuZCh0aGlzLiRvdmVybGF5KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuJGVsZW1lbnQuc2libGluZ3MoJ1tkYXRhLW9mZi1jYW52YXMtY29udGVudF0nKS5hcHBlbmQodGhpcy4kb3ZlcmxheSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5vcHRpb25zLmlzUmV2ZWFsZWQgPSB0aGlzLm9wdGlvbnMuaXNSZXZlYWxlZCB8fCBuZXcgUmVnRXhwKHRoaXMub3B0aW9ucy5yZXZlYWxDbGFzcywgJ2cnKS50ZXN0KHRoaXMuJGVsZW1lbnRbMF0uY2xhc3NOYW1lKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuaXNSZXZlYWxlZCA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy5vcHRpb25zLnJldmVhbE9uID0gdGhpcy5vcHRpb25zLnJldmVhbE9uIHx8IHRoaXMuJGVsZW1lbnRbMF0uY2xhc3NOYW1lLm1hdGNoKC8ocmV2ZWFsLWZvci1tZWRpdW18cmV2ZWFsLWZvci1sYXJnZSkvZylbMF0uc3BsaXQoJy0nKVsyXTtcbiAgICAgIHRoaXMuX3NldE1RQ2hlY2tlcigpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMub3B0aW9ucy50cmFuc2l0aW9uVGltZSA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy5vcHRpb25zLnRyYW5zaXRpb25UaW1lID0gcGFyc2VGbG9hdCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSgkKCdbZGF0YS1vZmYtY2FudmFzXScpWzBdKS50cmFuc2l0aW9uRHVyYXRpb24pICogMTAwMDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyB0byB0aGUgb2ZmLWNhbnZhcyB3cmFwcGVyIGFuZCB0aGUgZXhpdCBvdmVybGF5LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50cmlnZ2VyIC56Zi5vZmZjYW52YXMnKS5vbih7XG4gICAgICAnb3Blbi56Zi50cmlnZ2VyJzogdGhpcy5vcGVuLmJpbmQodGhpcyksXG4gICAgICAnY2xvc2UuemYudHJpZ2dlcic6IHRoaXMuY2xvc2UuYmluZCh0aGlzKSxcbiAgICAgICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcyksXG4gICAgICAna2V5ZG93bi56Zi5vZmZjYW52YXMnOiB0aGlzLl9oYW5kbGVLZXlib2FyZC5iaW5kKHRoaXMpXG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljayA9PT0gdHJ1ZSkge1xuICAgICAgdmFyICR0YXJnZXQgPSB0aGlzLm9wdGlvbnMuY29udGVudE92ZXJsYXkgPyB0aGlzLiRvdmVybGF5IDogJCgnW2RhdGEtb2ZmLWNhbnZhcy1jb250ZW50XScpO1xuICAgICAgJHRhcmdldC5vbih7J2NsaWNrLnpmLm9mZmNhbnZhcyc6IHRoaXMuY2xvc2UuYmluZCh0aGlzKX0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBsaWVzIGV2ZW50IGxpc3RlbmVyIGZvciBlbGVtZW50cyB0aGF0IHdpbGwgcmV2ZWFsIGF0IGNlcnRhaW4gYnJlYWtwb2ludHMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0TVFDaGVja2VyKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKEZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KF90aGlzLm9wdGlvbnMucmV2ZWFsT24pKSB7XG4gICAgICAgIF90aGlzLnJldmVhbCh0cnVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIF90aGlzLnJldmVhbChmYWxzZSk7XG4gICAgICB9XG4gICAgfSkub25lKCdsb2FkLnpmLm9mZmNhbnZhcycsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKEZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KF90aGlzLm9wdGlvbnMucmV2ZWFsT24pKSB7XG4gICAgICAgIF90aGlzLnJldmVhbCh0cnVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIHRoZSByZXZlYWxpbmcvaGlkaW5nIHRoZSBvZmYtY2FudmFzIGF0IGJyZWFrcG9pbnRzLCBub3QgdGhlIHNhbWUgYXMgb3Blbi5cbiAgICogQHBhcmFtIHtCb29sZWFufSBpc1JldmVhbGVkIC0gdHJ1ZSBpZiBlbGVtZW50IHNob3VsZCBiZSByZXZlYWxlZC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICByZXZlYWwoaXNSZXZlYWxlZCkge1xuICAgIHZhciAkY2xvc2VyID0gdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1jbG9zZV0nKTtcbiAgICBpZiAoaXNSZXZlYWxlZCkge1xuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgdGhpcy5pc1JldmVhbGVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1oaWRkZW4nLCAnZmFsc2UnKTtcbiAgICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdvcGVuLnpmLnRyaWdnZXIgdG9nZ2xlLnpmLnRyaWdnZXInKTtcbiAgICAgIGlmICgkY2xvc2VyLmxlbmd0aCkgeyAkY2xvc2VyLmhpZGUoKTsgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmlzUmV2ZWFsZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgICAgdGhpcy4kZWxlbWVudC5vZmYoJ29wZW4uemYudHJpZ2dlciB0b2dnbGUuemYudHJpZ2dlcicpLm9uKHtcbiAgICAgICAgJ29wZW4uemYudHJpZ2dlcic6IHRoaXMub3Blbi5iaW5kKHRoaXMpLFxuICAgICAgICAndG9nZ2xlLnpmLnRyaWdnZXInOiB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpXG4gICAgICB9KTtcbiAgICAgIGlmICgkY2xvc2VyLmxlbmd0aCkge1xuICAgICAgICAkY2xvc2VyLnNob3coKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3RvcHMgc2Nyb2xsaW5nIG9mIHRoZSBib2R5IHdoZW4gb2ZmY2FudmFzIGlzIG9wZW4gb24gbW9iaWxlIFNhZmFyaSBhbmQgb3RoZXIgdHJvdWJsZXNvbWUgYnJvd3NlcnMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc3RvcFNjcm9sbGluZyhldmVudCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFRha2VuIGFuZCBhZGFwdGVkIGZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNjg4OTQ0Ny9wcmV2ZW50LWZ1bGwtcGFnZS1zY3JvbGxpbmctaW9zXG4gIC8vIE9ubHkgcmVhbGx5IHdvcmtzIGZvciB5LCBub3Qgc3VyZSBob3cgdG8gZXh0ZW5kIHRvIHggb3IgaWYgd2UgbmVlZCB0by5cbiAgX3JlY29yZFNjcm9sbGFibGUoZXZlbnQpIHtcbiAgICBsZXQgZWxlbSA9IHRoaXM7IC8vIGNhbGxlZCBmcm9tIGV2ZW50IGhhbmRsZXIgY29udGV4dCB3aXRoIHRoaXMgYXMgZWxlbVxuXG4gICAgIC8vIElmIHRoZSBlbGVtZW50IGlzIHNjcm9sbGFibGUgKGNvbnRlbnQgb3ZlcmZsb3dzKSwgdGhlbi4uLlxuICAgIGlmIChlbGVtLnNjcm9sbEhlaWdodCAhPT0gZWxlbS5jbGllbnRIZWlnaHQpIHtcbiAgICAgIC8vIElmIHdlJ3JlIGF0IHRoZSB0b3AsIHNjcm9sbCBkb3duIG9uZSBwaXhlbCB0byBhbGxvdyBzY3JvbGxpbmcgdXBcbiAgICAgIGlmIChlbGVtLnNjcm9sbFRvcCA9PT0gMCkge1xuICAgICAgICBlbGVtLnNjcm9sbFRvcCA9IDE7XG4gICAgICB9XG4gICAgICAvLyBJZiB3ZSdyZSBhdCB0aGUgYm90dG9tLCBzY3JvbGwgdXAgb25lIHBpeGVsIHRvIGFsbG93IHNjcm9sbGluZyBkb3duXG4gICAgICBpZiAoZWxlbS5zY3JvbGxUb3AgPT09IGVsZW0uc2Nyb2xsSGVpZ2h0IC0gZWxlbS5jbGllbnRIZWlnaHQpIHtcbiAgICAgICAgZWxlbS5zY3JvbGxUb3AgPSBlbGVtLnNjcm9sbEhlaWdodCAtIGVsZW0uY2xpZW50SGVpZ2h0IC0gMTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxlbS5hbGxvd1VwID0gZWxlbS5zY3JvbGxUb3AgPiAwO1xuICAgIGVsZW0uYWxsb3dEb3duID0gZWxlbS5zY3JvbGxUb3AgPCAoZWxlbS5zY3JvbGxIZWlnaHQgLSBlbGVtLmNsaWVudEhlaWdodCk7XG4gICAgZWxlbS5sYXN0WSA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQucGFnZVk7XG4gIH1cblxuICBfc3RvcFNjcm9sbFByb3BhZ2F0aW9uKGV2ZW50KSB7XG4gICAgbGV0IGVsZW0gPSB0aGlzOyAvLyBjYWxsZWQgZnJvbSBldmVudCBoYW5kbGVyIGNvbnRleHQgd2l0aCB0aGlzIGFzIGVsZW1cbiAgICBsZXQgdXAgPSBldmVudC5wYWdlWSA8IGVsZW0ubGFzdFk7XG4gICAgbGV0IGRvd24gPSAhdXA7XG4gICAgZWxlbS5sYXN0WSA9IGV2ZW50LnBhZ2VZO1xuXG4gICAgaWYoKHVwICYmIGVsZW0uYWxsb3dVcCkgfHwgKGRvd24gJiYgZWxlbS5hbGxvd0Rvd24pKSB7XG4gICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgdGhlIG9mZi1jYW52YXMgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBldmVudCAtIEV2ZW50IG9iamVjdCBwYXNzZWQgZnJvbSBsaXN0ZW5lci5cbiAgICogQHBhcmFtIHtqUXVlcnl9IHRyaWdnZXIgLSBlbGVtZW50IHRoYXQgdHJpZ2dlcmVkIHRoZSBvZmYtY2FudmFzIHRvIG9wZW4uXG4gICAqIEBmaXJlcyBPZmZDYW52YXMjb3BlbmVkXG4gICAqL1xuICBvcGVuKGV2ZW50LCB0cmlnZ2VyKSB7XG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLW9wZW4nKSB8fCB0aGlzLmlzUmV2ZWFsZWQpIHsgcmV0dXJuOyB9XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIGlmICh0cmlnZ2VyKSB7XG4gICAgICB0aGlzLiRsYXN0VHJpZ2dlciA9IHRyaWdnZXI7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5mb3JjZVRvID09PSAndG9wJykge1xuICAgICAgd2luZG93LnNjcm9sbFRvKDAsIDApO1xuICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLmZvcmNlVG8gPT09ICdib3R0b20nKSB7XG4gICAgICB3aW5kb3cuc2Nyb2xsVG8oMCxkb2N1bWVudC5ib2R5LnNjcm9sbEhlaWdodCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgb2ZmLWNhbnZhcyBtZW51IG9wZW5zLlxuICAgICAqIEBldmVudCBPZmZDYW52YXMjb3BlbmVkXG4gICAgICovXG4gICAgX3RoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ2lzLW9wZW4nKVxuXG4gICAgdGhpcy4kdHJpZ2dlcnMuYXR0cignYXJpYS1leHBhbmRlZCcsICd0cnVlJyk7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWhpZGRlbicsICdmYWxzZScpXG4gICAgICAgIC50cmlnZ2VyKCdvcGVuZWQuemYub2ZmY2FudmFzJyk7XG5cbiAgICAvLyBJZiBgY29udGVudFNjcm9sbGAgaXMgc2V0IHRvIGZhbHNlLCBhZGQgY2xhc3MgYW5kIGRpc2FibGUgc2Nyb2xsaW5nIG9uIHRvdWNoIGRldmljZXMuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jb250ZW50U2Nyb2xsID09PSBmYWxzZSkge1xuICAgICAgJCgnYm9keScpLmFkZENsYXNzKCdpcy1vZmYtY2FudmFzLW9wZW4nKS5vbigndG91Y2htb3ZlJywgdGhpcy5fc3RvcFNjcm9sbGluZyk7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCd0b3VjaHN0YXJ0JywgdGhpcy5fcmVjb3JkU2Nyb2xsYWJsZSk7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCd0b3VjaG1vdmUnLCB0aGlzLl9zdG9wU2Nyb2xsUHJvcGFnYXRpb24pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY29udGVudE92ZXJsYXkgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkuYWRkQ2xhc3MoJ2lzLXZpc2libGUnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljayA9PT0gdHJ1ZSAmJiB0aGlzLm9wdGlvbnMuY29udGVudE92ZXJsYXkgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkuYWRkQ2xhc3MoJ2lzLWNsb3NhYmxlJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvRm9jdXMgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCh0aGlzLiRlbGVtZW50KSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjYW52YXNGb2N1cyA9IF90aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLWF1dG9mb2N1c10nKTtcbiAgICAgICAgaWYgKGNhbnZhc0ZvY3VzLmxlbmd0aCkge1xuICAgICAgICAgICAgY2FudmFzRm9jdXMuZXEoMCkuZm9jdXMoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF90aGlzLiRlbGVtZW50LmZpbmQoJ2EsIGJ1dHRvbicpLmVxKDApLmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMudHJhcEZvY3VzID09PSB0cnVlKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LnNpYmxpbmdzKCdbZGF0YS1vZmYtY2FudmFzLWNvbnRlbnRdJykuYXR0cigndGFiaW5kZXgnLCAnLTEnKTtcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQudHJhcEZvY3VzKHRoaXMuJGVsZW1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIG9mZi1jYW52YXMgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gb3B0aW9uYWwgY2IgdG8gZmlyZSBhZnRlciBjbG9zdXJlLlxuICAgKiBAZmlyZXMgT2ZmQ2FudmFzI2Nsb3NlZFxuICAgKi9cbiAgY2xvc2UoY2IpIHtcbiAgICBpZiAoIXRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLW9wZW4nKSB8fCB0aGlzLmlzUmV2ZWFsZWQpIHsgcmV0dXJuOyB9XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgX3RoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2lzLW9wZW4nKTtcblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1oaWRkZW4nLCAndHJ1ZScpXG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIHdoZW4gdGhlIG9mZi1jYW52YXMgbWVudSBvcGVucy5cbiAgICAgICAqIEBldmVudCBPZmZDYW52YXMjY2xvc2VkXG4gICAgICAgKi9cbiAgICAgICAgLnRyaWdnZXIoJ2Nsb3NlZC56Zi5vZmZjYW52YXMnKTtcblxuICAgIC8vIElmIGBjb250ZW50U2Nyb2xsYCBpcyBzZXQgdG8gZmFsc2UsIHJlbW92ZSBjbGFzcyBhbmQgcmUtZW5hYmxlIHNjcm9sbGluZyBvbiB0b3VjaCBkZXZpY2VzLlxuICAgIGlmICh0aGlzLm9wdGlvbnMuY29udGVudFNjcm9sbCA9PT0gZmFsc2UpIHtcbiAgICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygnaXMtb2ZmLWNhbnZhcy1vcGVuJykub2ZmKCd0b3VjaG1vdmUnLCB0aGlzLl9zdG9wU2Nyb2xsaW5nKTtcbiAgICAgIHRoaXMuJGVsZW1lbnQub2ZmKCd0b3VjaHN0YXJ0JywgdGhpcy5fcmVjb3JkU2Nyb2xsYWJsZSk7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9mZigndG91Y2htb3ZlJywgdGhpcy5fc3RvcFNjcm9sbFByb3BhZ2F0aW9uKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNvbnRlbnRPdmVybGF5ID09PSB0cnVlKSB7XG4gICAgICB0aGlzLiRvdmVybGF5LnJlbW92ZUNsYXNzKCdpcy12aXNpYmxlJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgPT09IHRydWUgJiYgdGhpcy5vcHRpb25zLmNvbnRlbnRPdmVybGF5ID09PSB0cnVlKSB7XG4gICAgICB0aGlzLiRvdmVybGF5LnJlbW92ZUNsYXNzKCdpcy1jbG9zYWJsZScpO1xuICAgIH1cblxuICAgIHRoaXMuJHRyaWdnZXJzLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCAnZmFsc2UnKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMudHJhcEZvY3VzID09PSB0cnVlKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LnNpYmxpbmdzKCdbZGF0YS1vZmYtY2FudmFzLWNvbnRlbnRdJykucmVtb3ZlQXR0cigndGFiaW5kZXgnKTtcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVsZWFzZUZvY3VzKHRoaXMuJGVsZW1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSBvZmYtY2FudmFzIG1lbnUgb3BlbiBvciBjbG9zZWQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge09iamVjdH0gZXZlbnQgLSBFdmVudCBvYmplY3QgcGFzc2VkIGZyb20gbGlzdGVuZXIuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSB0cmlnZ2VyIC0gZWxlbWVudCB0aGF0IHRyaWdnZXJlZCB0aGUgb2ZmLWNhbnZhcyB0byBvcGVuLlxuICAgKi9cbiAgdG9nZ2xlKGV2ZW50LCB0cmlnZ2VyKSB7XG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLW9wZW4nKSkge1xuICAgICAgdGhpcy5jbG9zZShldmVudCwgdHJpZ2dlcik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5vcGVuKGV2ZW50LCB0cmlnZ2VyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlcyBrZXlib2FyZCBpbnB1dCB3aGVuIGRldGVjdGVkLiBXaGVuIHRoZSBlc2NhcGUga2V5IGlzIHByZXNzZWQsIHRoZSBvZmYtY2FudmFzIG1lbnUgY2xvc2VzLCBhbmQgZm9jdXMgaXMgcmVzdG9yZWQgdG8gdGhlIGVsZW1lbnQgdGhhdCBvcGVuZWQgdGhlIG1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2hhbmRsZUtleWJvYXJkKGUpIHtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnT2ZmQ2FudmFzJywge1xuICAgICAgY2xvc2U6ICgpID0+IHtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICB0aGlzLiRsYXN0VHJpZ2dlci5mb2N1cygpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgICBoYW5kbGVkOiAoKSA9PiB7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgb2ZmY2FudmFzIHBsdWdpbi5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuY2xvc2UoKTtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnRyaWdnZXIgLnpmLm9mZmNhbnZhcycpO1xuICAgIHRoaXMuJG92ZXJsYXkub2ZmKCcuemYub2ZmY2FudmFzJyk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuT2ZmQ2FudmFzLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQWxsb3cgdGhlIHVzZXIgdG8gY2xpY2sgb3V0c2lkZSBvZiB0aGUgbWVudSB0byBjbG9zZSBpdC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgY2xvc2VPbkNsaWNrOiB0cnVlLFxuXG4gIC8qKlxuICAgKiBBZGRzIGFuIG92ZXJsYXkgb24gdG9wIG9mIGBbZGF0YS1vZmYtY2FudmFzLWNvbnRlbnRdYC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgY29udGVudE92ZXJsYXk6IHRydWUsXG5cbiAgLyoqXG4gICAqIEVuYWJsZS9kaXNhYmxlIHNjcm9sbGluZyBvZiB0aGUgbWFpbiBjb250ZW50IHdoZW4gYW4gb2ZmIGNhbnZhcyBwYW5lbCBpcyBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICBjb250ZW50U2Nyb2xsOiB0cnVlLFxuXG4gIC8qKlxuICAgKiBBbW91bnQgb2YgdGltZSBpbiBtcyB0aGUgb3BlbiBhbmQgY2xvc2UgdHJhbnNpdGlvbiByZXF1aXJlcy4gSWYgbm9uZSBzZWxlY3RlZCwgcHVsbHMgZnJvbSBib2R5IHN0eWxlLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDBcbiAgICovXG4gIHRyYW5zaXRpb25UaW1lOiAwLFxuXG4gIC8qKlxuICAgKiBUeXBlIG9mIHRyYW5zaXRpb24gZm9yIHRoZSBvZmZjYW52YXMgbWVudS4gT3B0aW9ucyBhcmUgJ3B1c2gnLCAnZGV0YWNoZWQnIG9yICdzbGlkZScuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgcHVzaFxuICAgKi9cbiAgdHJhbnNpdGlvbjogJ3B1c2gnLFxuXG4gIC8qKlxuICAgKiBGb3JjZSB0aGUgcGFnZSB0byBzY3JvbGwgdG8gdG9wIG9yIGJvdHRvbSBvbiBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHs/c3RyaW5nfVxuICAgKiBAZGVmYXVsdCBudWxsXG4gICAqL1xuICBmb3JjZVRvOiBudWxsLFxuXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgb2ZmY2FudmFzIHRvIHJlbWFpbiBvcGVuIGZvciBjZXJ0YWluIGJyZWFrcG9pbnRzLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgaXNSZXZlYWxlZDogZmFsc2UsXG5cbiAgLyoqXG4gICAqIEJyZWFrcG9pbnQgYXQgd2hpY2ggdG8gcmV2ZWFsLiBKUyB3aWxsIHVzZSBhIFJlZ0V4cCB0byB0YXJnZXQgc3RhbmRhcmQgY2xhc3NlcywgaWYgY2hhbmdpbmcgY2xhc3NuYW1lcywgcGFzcyB5b3VyIGNsYXNzIHdpdGggdGhlIGByZXZlYWxDbGFzc2Agb3B0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHs/c3RyaW5nfVxuICAgKiBAZGVmYXVsdCBudWxsXG4gICAqL1xuICByZXZlYWxPbjogbnVsbCxcblxuICAvKipcbiAgICogRm9yY2UgZm9jdXMgdG8gdGhlIG9mZmNhbnZhcyBvbiBvcGVuLiBJZiB0cnVlLCB3aWxsIGZvY3VzIHRoZSBvcGVuaW5nIHRyaWdnZXIgb24gY2xvc2UuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGF1dG9Gb2N1czogdHJ1ZSxcblxuICAvKipcbiAgICogQ2xhc3MgdXNlZCB0byBmb3JjZSBhbiBvZmZjYW52YXMgdG8gcmVtYWluIG9wZW4uIEZvdW5kYXRpb24gZGVmYXVsdHMgZm9yIHRoaXMgYXJlIGByZXZlYWwtZm9yLWxhcmdlYCAmIGByZXZlYWwtZm9yLW1lZGl1bWAuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgcmV2ZWFsLWZvci1cbiAgICogQHRvZG8gaW1wcm92ZSB0aGUgcmVnZXggdGVzdGluZyBmb3IgdGhpcy5cbiAgICovXG4gIHJldmVhbENsYXNzOiAncmV2ZWFsLWZvci0nLFxuXG4gIC8qKlxuICAgKiBUcmlnZ2VycyBvcHRpb25hbCBmb2N1cyB0cmFwcGluZyB3aGVuIG9wZW5pbmcgYW4gb2ZmY2FudmFzLiBTZXRzIHRhYmluZGV4IG9mIFtkYXRhLW9mZi1jYW52YXMtY29udGVudF0gdG8gLTEgZm9yIGFjY2Vzc2liaWxpdHkgcHVycG9zZXMuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICB0cmFwRm9jdXM6IGZhbHNlXG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihPZmZDYW52YXMsICdPZmZDYW52YXMnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIE9yYml0IG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5vcmJpdFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50b3VjaFxuICovXG5cbmNsYXNzIE9yYml0IHtcbiAgLyoqXG4gICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhbiBvcmJpdCBjYXJvdXNlbC5cbiAgKiBAY2xhc3NcbiAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGFuIE9yYml0IENhcm91c2VsLlxuICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucyl7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIE9yYml0LmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdPcmJpdCcpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ09yYml0Jywge1xuICAgICAgJ2x0cic6IHtcbiAgICAgICAgJ0FSUk9XX1JJR0hUJzogJ25leHQnLFxuICAgICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cydcbiAgICAgIH0sXG4gICAgICAncnRsJzoge1xuICAgICAgICAnQVJST1dfTEVGVCc6ICduZXh0JyxcbiAgICAgICAgJ0FSUk9XX1JJR0hUJzogJ3ByZXZpb3VzJ1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICogSW5pdGlhbGl6ZXMgdGhlIHBsdWdpbiBieSBjcmVhdGluZyBqUXVlcnkgY29sbGVjdGlvbnMsIHNldHRpbmcgYXR0cmlidXRlcywgYW5kIHN0YXJ0aW5nIHRoZSBhbmltYXRpb24uXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX2luaXQoKSB7XG4gICAgLy8gQFRPRE86IGNvbnNpZGVyIGRpc2N1c3Npb24gb24gUFIgIzkyNzggYWJvdXQgRE9NIHBvbGx1dGlvbiBieSBjaGFuZ2VTbGlkZVxuICAgIHRoaXMuX3Jlc2V0KCk7XG5cbiAgICB0aGlzLiR3cmFwcGVyID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuY29udGFpbmVyQ2xhc3N9YCk7XG4gICAgdGhpcy4kc2xpZGVzID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKTtcblxuICAgIHZhciAkaW1hZ2VzID0gdGhpcy4kZWxlbWVudC5maW5kKCdpbWcnKSxcbiAgICAgICAgaW5pdEFjdGl2ZSA9IHRoaXMuJHNsaWRlcy5maWx0ZXIoJy5pcy1hY3RpdmUnKSxcbiAgICAgICAgaWQgPSB0aGlzLiRlbGVtZW50WzBdLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ29yYml0Jyk7XG5cbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xuICAgICAgJ2RhdGEtcmVzaXplJzogaWQsXG4gICAgICAnaWQnOiBpZFxuICAgIH0pO1xuXG4gICAgaWYgKCFpbml0QWN0aXZlLmxlbmd0aCkge1xuICAgICAgdGhpcy4kc2xpZGVzLmVxKDApLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy51c2VNVUkpIHtcbiAgICAgIHRoaXMuJHNsaWRlcy5hZGRDbGFzcygnbm8tbW90aW9udWknKTtcbiAgICB9XG5cbiAgICBpZiAoJGltYWdlcy5sZW5ndGgpIHtcbiAgICAgIEZvdW5kYXRpb24ub25JbWFnZXNMb2FkZWQoJGltYWdlcywgdGhpcy5fcHJlcGFyZUZvck9yYml0LmJpbmQodGhpcykpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9wcmVwYXJlRm9yT3JiaXQoKTsvL2hlaGVcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmJ1bGxldHMpIHtcbiAgICAgIHRoaXMuX2xvYWRCdWxsZXRzKCk7XG4gICAgfVxuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmF1dG9QbGF5ICYmIHRoaXMuJHNsaWRlcy5sZW5ndGggPiAxKSB7XG4gICAgICB0aGlzLmdlb1N5bmMoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmFjY2Vzc2libGUpIHsgLy8gYWxsb3cgd3JhcHBlciB0byBiZSBmb2N1c2FibGUgdG8gZW5hYmxlIGFycm93IG5hdmlnYXRpb25cbiAgICAgIHRoaXMuJHdyYXBwZXIuYXR0cigndGFiaW5kZXgnLCAwKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBDcmVhdGVzIGEgalF1ZXJ5IGNvbGxlY3Rpb24gb2YgYnVsbGV0cywgaWYgdGhleSBhcmUgYmVpbmcgdXNlZC5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqL1xuICBfbG9hZEJ1bGxldHMoKSB7XG4gICAgdGhpcy4kYnVsbGV0cyA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLmJveE9mQnVsbGV0c31gKS5maW5kKCdidXR0b24nKTtcbiAgfVxuXG4gIC8qKlxuICAqIFNldHMgYSBgdGltZXJgIG9iamVjdCBvbiB0aGUgb3JiaXQsIGFuZCBzdGFydHMgdGhlIGNvdW50ZXIgZm9yIHRoZSBuZXh0IHNsaWRlLlxuICAqIEBmdW5jdGlvblxuICAqL1xuICBnZW9TeW5jKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy50aW1lciA9IG5ldyBGb3VuZGF0aW9uLlRpbWVyKFxuICAgICAgdGhpcy4kZWxlbWVudCxcbiAgICAgIHtcbiAgICAgICAgZHVyYXRpb246IHRoaXMub3B0aW9ucy50aW1lckRlbGF5LFxuICAgICAgICBpbmZpbml0ZTogZmFsc2VcbiAgICAgIH0sXG4gICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUodHJ1ZSk7XG4gICAgICB9KTtcbiAgICB0aGlzLnRpbWVyLnN0YXJ0KCk7XG4gIH1cblxuICAvKipcbiAgKiBTZXRzIHdyYXBwZXIgYW5kIHNsaWRlIGhlaWdodHMgZm9yIHRoZSBvcmJpdC5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqL1xuICBfcHJlcGFyZUZvck9yYml0KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy5fc2V0V3JhcHBlckhlaWdodCgpO1xuICB9XG5cbiAgLyoqXG4gICogQ2FsdWxhdGVzIHRoZSBoZWlnaHQgb2YgZWFjaCBzbGlkZSBpbiB0aGUgY29sbGVjdGlvbiwgYW5kIHVzZXMgdGhlIHRhbGxlc3Qgb25lIGZvciB0aGUgd3JhcHBlciBoZWlnaHQuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gZmlyZSB3aGVuIGNvbXBsZXRlLlxuICAqL1xuICBfc2V0V3JhcHBlckhlaWdodChjYikgey8vcmV3cml0ZSB0aGlzIHRvIGBmb3JgIGxvb3BcbiAgICB2YXIgbWF4ID0gMCwgdGVtcCwgY291bnRlciA9IDAsIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJHNsaWRlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdGVtcCA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICAgJCh0aGlzKS5hdHRyKCdkYXRhLXNsaWRlJywgY291bnRlcik7XG5cbiAgICAgIGlmIChfdGhpcy4kc2xpZGVzLmZpbHRlcignLmlzLWFjdGl2ZScpWzBdICE9PSBfdGhpcy4kc2xpZGVzLmVxKGNvdW50ZXIpWzBdKSB7Ly9pZiBub3QgdGhlIGFjdGl2ZSBzbGlkZSwgc2V0IGNzcyBwb3NpdGlvbiBhbmQgZGlzcGxheSBwcm9wZXJ0eVxuICAgICAgICAkKHRoaXMpLmNzcyh7J3Bvc2l0aW9uJzogJ3JlbGF0aXZlJywgJ2Rpc3BsYXknOiAnbm9uZSd9KTtcbiAgICAgIH1cbiAgICAgIG1heCA9IHRlbXAgPiBtYXggPyB0ZW1wIDogbWF4O1xuICAgICAgY291bnRlcisrO1xuICAgIH0pO1xuXG4gICAgaWYgKGNvdW50ZXIgPT09IHRoaXMuJHNsaWRlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuJHdyYXBwZXIuY3NzKHsnaGVpZ2h0JzogbWF4fSk7IC8vb25seSBjaGFuZ2UgdGhlIHdyYXBwZXIgaGVpZ2h0IHByb3BlcnR5IG9uY2UuXG4gICAgICBpZihjYikge2NiKG1heCk7fSAvL2ZpcmUgY2FsbGJhY2sgd2l0aCBtYXggaGVpZ2h0IGRpbWVuc2lvbi5cbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBTZXRzIHRoZSBtYXgtaGVpZ2h0IG9mIGVhY2ggc2xpZGUuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX3NldFNsaWRlSGVpZ2h0KGhlaWdodCkge1xuICAgIHRoaXMuJHNsaWRlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgJCh0aGlzKS5jc3MoJ21heC1oZWlnaHQnLCBoZWlnaHQpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICogQWRkcyBldmVudCBsaXN0ZW5lcnMgdG8gYmFzaWNhbGx5IGV2ZXJ5dGhpbmcgd2l0aGluIHRoZSBlbGVtZW50LlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIC8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgLy8qKk5vdyB1c2luZyBjdXN0b20gZXZlbnQgLSB0aGFua3MgdG86KipcbiAgICAvLyoqICAgICAgWW9oYWkgQXJhcmF0IG9mIFRvcm9udG8gICAgICAqKlxuICAgIC8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgLy9cbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnJlc2l6ZW1lLnpmLnRyaWdnZXInKS5vbih7XG4gICAgICAncmVzaXplbWUuemYudHJpZ2dlcic6IHRoaXMuX3ByZXBhcmVGb3JPcmJpdC5iaW5kKHRoaXMpXG4gICAgfSlcbiAgICBpZiAodGhpcy4kc2xpZGVzLmxlbmd0aCA+IDEpIHtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5zd2lwZSkge1xuICAgICAgICB0aGlzLiRzbGlkZXMub2ZmKCdzd2lwZWxlZnQuemYub3JiaXQgc3dpcGVyaWdodC56Zi5vcmJpdCcpXG4gICAgICAgIC5vbignc3dpcGVsZWZ0LnpmLm9yYml0JywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKHRydWUpO1xuICAgICAgICB9KS5vbignc3dpcGVyaWdodC56Zi5vcmJpdCcsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZShmYWxzZSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvUGxheSkge1xuICAgICAgICB0aGlzLiRzbGlkZXMub24oJ2NsaWNrLnpmLm9yYml0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuJGVsZW1lbnQuZGF0YSgnY2xpY2tlZE9uJywgX3RoaXMuJGVsZW1lbnQuZGF0YSgnY2xpY2tlZE9uJykgPyBmYWxzZSA6IHRydWUpO1xuICAgICAgICAgIF90aGlzLnRpbWVyW190aGlzLiRlbGVtZW50LmRhdGEoJ2NsaWNrZWRPbicpID8gJ3BhdXNlJyA6ICdzdGFydCddKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucGF1c2VPbkhvdmVyKSB7XG4gICAgICAgICAgdGhpcy4kZWxlbWVudC5vbignbW91c2VlbnRlci56Zi5vcmJpdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMudGltZXIucGF1c2UoKTtcbiAgICAgICAgICB9KS5vbignbW91c2VsZWF2ZS56Zi5vcmJpdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKCFfdGhpcy4kZWxlbWVudC5kYXRhKCdjbGlja2VkT24nKSkge1xuICAgICAgICAgICAgICBfdGhpcy50aW1lci5zdGFydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubmF2QnV0dG9ucykge1xuICAgICAgICB2YXIgJGNvbnRyb2xzID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMubmV4dENsYXNzfSwgLiR7dGhpcy5vcHRpb25zLnByZXZDbGFzc31gKTtcbiAgICAgICAgJGNvbnRyb2xzLmF0dHIoJ3RhYmluZGV4JywgMClcbiAgICAgICAgLy9hbHNvIG5lZWQgdG8gaGFuZGxlIGVudGVyL3JldHVybiBhbmQgc3BhY2ViYXIga2V5IHByZXNzZXNcbiAgICAgICAgLm9uKCdjbGljay56Zi5vcmJpdCB0b3VjaGVuZC56Zi5vcmJpdCcsIGZ1bmN0aW9uKGUpe1xuXHQgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZSgkKHRoaXMpLmhhc0NsYXNzKF90aGlzLm9wdGlvbnMubmV4dENsYXNzKSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmJ1bGxldHMpIHtcbiAgICAgICAgdGhpcy4kYnVsbGV0cy5vbignY2xpY2suemYub3JiaXQgdG91Y2hlbmQuemYub3JiaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoL2lzLWFjdGl2ZS9nLnRlc3QodGhpcy5jbGFzc05hbWUpKSB7IHJldHVybiBmYWxzZTsgfS8vaWYgdGhpcyBpcyBhY3RpdmUsIGtpY2sgb3V0IG9mIGZ1bmN0aW9uLlxuICAgICAgICAgIHZhciBpZHggPSAkKHRoaXMpLmRhdGEoJ3NsaWRlJyksXG4gICAgICAgICAgbHRyID0gaWR4ID4gX3RoaXMuJHNsaWRlcy5maWx0ZXIoJy5pcy1hY3RpdmUnKS5kYXRhKCdzbGlkZScpLFxuICAgICAgICAgICRzbGlkZSA9IF90aGlzLiRzbGlkZXMuZXEoaWR4KTtcblxuICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKGx0ciwgJHNsaWRlLCBpZHgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5hY2Nlc3NpYmxlKSB7XG4gICAgICAgIHRoaXMuJHdyYXBwZXIuYWRkKHRoaXMuJGJ1bGxldHMpLm9uKCdrZXlkb3duLnpmLm9yYml0JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIC8vIGhhbmRsZSBrZXlib2FyZCBldmVudCB3aXRoIGtleWJvYXJkIHV0aWxcbiAgICAgICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnT3JiaXQnLCB7XG4gICAgICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHJldmlvdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZShmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7IC8vIGlmIGJ1bGxldCBpcyBmb2N1c2VkLCBtYWtlIHN1cmUgZm9jdXMgbW92ZXNcbiAgICAgICAgICAgICAgaWYgKCQoZS50YXJnZXQpLmlzKF90aGlzLiRidWxsZXRzKSkge1xuICAgICAgICAgICAgICAgIF90aGlzLiRidWxsZXRzLmZpbHRlcignLmlzLWFjdGl2ZScpLmZvY3VzKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0cyBPcmJpdCBzbyBpdCBjYW4gYmUgcmVpbml0aWFsaXplZFxuICAgKi9cbiAgX3Jlc2V0KCkge1xuICAgIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIHRoZXJlIGFyZSBubyBzbGlkZXMgKGZpcnN0IHJ1bilcbiAgICBpZiAodHlwZW9mIHRoaXMuJHNsaWRlcyA9PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLiRzbGlkZXMubGVuZ3RoID4gMSkge1xuICAgICAgLy8gUmVtb3ZlIG9sZCBldmVudHNcbiAgICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYub3JiaXQnKS5maW5kKCcqJykub2ZmKCcuemYub3JiaXQnKVxuXG4gICAgICAvLyBSZXN0YXJ0IHRpbWVyIGlmIGF1dG9QbGF5IGlzIGVuYWJsZWRcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYXV0b1BsYXkpIHtcbiAgICAgICAgdGhpcy50aW1lci5yZXN0YXJ0KCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFJlc2V0IGFsbCBzbGlkZGVzXG4gICAgICB0aGlzLiRzbGlkZXMuZWFjaChmdW5jdGlvbihlbCkge1xuICAgICAgICAkKGVsKS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlIGlzLWFjdGl2ZSBpcy1pbicpXG4gICAgICAgICAgLnJlbW92ZUF0dHIoJ2FyaWEtbGl2ZScpXG4gICAgICAgICAgLmhpZGUoKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBTaG93IHRoZSBmaXJzdCBzbGlkZVxuICAgICAgdGhpcy4kc2xpZGVzLmZpcnN0KCkuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpLnNob3coKTtcblxuICAgICAgLy8gVHJpZ2dlcnMgd2hlbiB0aGUgc2xpZGUgaGFzIGZpbmlzaGVkIGFuaW1hdGluZ1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzbGlkZWNoYW5nZS56Zi5vcmJpdCcsIFt0aGlzLiRzbGlkZXMuZmlyc3QoKV0pO1xuXG4gICAgICAvLyBTZWxlY3QgZmlyc3QgYnVsbGV0IGlmIGJ1bGxldHMgYXJlIHByZXNlbnRcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYnVsbGV0cykge1xuICAgICAgICB0aGlzLl91cGRhdGVCdWxsZXRzKDApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAqIENoYW5nZXMgdGhlIGN1cnJlbnQgc2xpZGUgdG8gYSBuZXcgb25lLlxuICAqIEBmdW5jdGlvblxuICAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNMVFIgLSBmbGFnIGlmIHRoZSBzbGlkZSBzaG91bGQgbW92ZSBsZWZ0IHRvIHJpZ2h0LlxuICAqIEBwYXJhbSB7alF1ZXJ5fSBjaG9zZW5TbGlkZSAtIHRoZSBqUXVlcnkgZWxlbWVudCBvZiB0aGUgc2xpZGUgdG8gc2hvdyBuZXh0LCBpZiBvbmUgaXMgc2VsZWN0ZWQuXG4gICogQHBhcmFtIHtOdW1iZXJ9IGlkeCAtIHRoZSBpbmRleCBvZiB0aGUgbmV3IHNsaWRlIGluIGl0cyBjb2xsZWN0aW9uLCBpZiBvbmUgY2hvc2VuLlxuICAqIEBmaXJlcyBPcmJpdCNzbGlkZWNoYW5nZVxuICAqL1xuICBjaGFuZ2VTbGlkZShpc0xUUiwgY2hvc2VuU2xpZGUsIGlkeCkge1xuICAgIGlmICghdGhpcy4kc2xpZGVzKSB7cmV0dXJuOyB9IC8vIERvbid0IGZyZWFrIG91dCBpZiB3ZSdyZSBpbiB0aGUgbWlkZGxlIG9mIGNsZWFudXBcbiAgICB2YXIgJGN1clNsaWRlID0gdGhpcy4kc2xpZGVzLmZpbHRlcignLmlzLWFjdGl2ZScpLmVxKDApO1xuXG4gICAgaWYgKC9tdWkvZy50ZXN0KCRjdXJTbGlkZVswXS5jbGFzc05hbWUpKSB7IHJldHVybiBmYWxzZTsgfSAvL2lmIHRoZSBzbGlkZSBpcyBjdXJyZW50bHkgYW5pbWF0aW5nLCBraWNrIG91dCBvZiB0aGUgZnVuY3Rpb25cblxuICAgIHZhciAkZmlyc3RTbGlkZSA9IHRoaXMuJHNsaWRlcy5maXJzdCgpLFxuICAgICRsYXN0U2xpZGUgPSB0aGlzLiRzbGlkZXMubGFzdCgpLFxuICAgIGRpckluID0gaXNMVFIgPyAnUmlnaHQnIDogJ0xlZnQnLFxuICAgIGRpck91dCA9IGlzTFRSID8gJ0xlZnQnIDogJ1JpZ2h0JyxcbiAgICBfdGhpcyA9IHRoaXMsXG4gICAgJG5ld1NsaWRlO1xuXG4gICAgaWYgKCFjaG9zZW5TbGlkZSkgeyAvL21vc3Qgb2YgdGhlIHRpbWUsIHRoaXMgd2lsbCBiZSBhdXRvIHBsYXllZCBvciBjbGlja2VkIGZyb20gdGhlIG5hdkJ1dHRvbnMuXG4gICAgICAkbmV3U2xpZGUgPSBpc0xUUiA/IC8vaWYgd3JhcHBpbmcgZW5hYmxlZCwgY2hlY2sgdG8gc2VlIGlmIHRoZXJlIGlzIGEgYG5leHRgIG9yIGBwcmV2YCBzaWJsaW5nLCBpZiBub3QsIHNlbGVjdCB0aGUgZmlyc3Qgb3IgbGFzdCBzbGlkZSB0byBmaWxsIGluLiBpZiB3cmFwcGluZyBub3QgZW5hYmxlZCwgYXR0ZW1wdCB0byBzZWxlY3QgYG5leHRgIG9yIGBwcmV2YCwgaWYgdGhlcmUncyBub3RoaW5nIHRoZXJlLCB0aGUgZnVuY3Rpb24gd2lsbCBraWNrIG91dCBvbiBuZXh0IHN0ZXAuIENSQVpZIE5FU1RFRCBURVJOQVJJRVMhISEhIVxuICAgICAgKHRoaXMub3B0aW9ucy5pbmZpbml0ZVdyYXAgPyAkY3VyU2xpZGUubmV4dChgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkubGVuZ3RoID8gJGN1clNsaWRlLm5leHQoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApIDogJGZpcnN0U2xpZGUgOiAkY3VyU2xpZGUubmV4dChgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkpLy9waWNrIG5leHQgc2xpZGUgaWYgbW92aW5nIGxlZnQgdG8gcmlnaHRcbiAgICAgIDpcbiAgICAgICh0aGlzLm9wdGlvbnMuaW5maW5pdGVXcmFwID8gJGN1clNsaWRlLnByZXYoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApLmxlbmd0aCA/ICRjdXJTbGlkZS5wcmV2KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKSA6ICRsYXN0U2xpZGUgOiAkY3VyU2xpZGUucHJldihgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkpOy8vcGljayBwcmV2IHNsaWRlIGlmIG1vdmluZyByaWdodCB0byBsZWZ0XG4gICAgfSBlbHNlIHtcbiAgICAgICRuZXdTbGlkZSA9IGNob3NlblNsaWRlO1xuICAgIH1cblxuICAgIGlmICgkbmV3U2xpZGUubGVuZ3RoKSB7XG4gICAgICAvKipcbiAgICAgICogVHJpZ2dlcnMgYmVmb3JlIHRoZSBuZXh0IHNsaWRlIHN0YXJ0cyBhbmltYXRpbmcgaW4gYW5kIG9ubHkgaWYgYSBuZXh0IHNsaWRlIGhhcyBiZWVuIGZvdW5kLlxuICAgICAgKiBAZXZlbnQgT3JiaXQjYmVmb3Jlc2xpZGVjaGFuZ2VcbiAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2JlZm9yZXNsaWRlY2hhbmdlLnpmLm9yYml0JywgWyRjdXJTbGlkZSwgJG5ld1NsaWRlXSk7XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYnVsbGV0cykge1xuICAgICAgICBpZHggPSBpZHggfHwgdGhpcy4kc2xpZGVzLmluZGV4KCRuZXdTbGlkZSk7IC8vZ3JhYiBpbmRleCB0byB1cGRhdGUgYnVsbGV0c1xuICAgICAgICB0aGlzLl91cGRhdGVCdWxsZXRzKGlkeCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMudXNlTVVJICYmICF0aGlzLiRlbGVtZW50LmlzKCc6aGlkZGVuJykpIHtcbiAgICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZUluKFxuICAgICAgICAgICRuZXdTbGlkZS5hZGRDbGFzcygnaXMtYWN0aXZlJykuY3NzKHsncG9zaXRpb24nOiAnYWJzb2x1dGUnLCAndG9wJzogMH0pLFxuICAgICAgICAgIHRoaXMub3B0aW9uc1tgYW5pbUluRnJvbSR7ZGlySW59YF0sXG4gICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICRuZXdTbGlkZS5jc3Moeydwb3NpdGlvbic6ICdyZWxhdGl2ZScsICdkaXNwbGF5JzogJ2Jsb2NrJ30pXG4gICAgICAgICAgICAuYXR0cignYXJpYS1saXZlJywgJ3BvbGl0ZScpO1xuICAgICAgICB9KTtcblxuICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KFxuICAgICAgICAgICRjdXJTbGlkZS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJyksXG4gICAgICAgICAgdGhpcy5vcHRpb25zW2BhbmltT3V0VG8ke2Rpck91dH1gXSxcbiAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgJGN1clNsaWRlLnJlbW92ZUF0dHIoJ2FyaWEtbGl2ZScpO1xuICAgICAgICAgICAgaWYoX3RoaXMub3B0aW9ucy5hdXRvUGxheSAmJiAhX3RoaXMudGltZXIuaXNQYXVzZWQpe1xuICAgICAgICAgICAgICBfdGhpcy50aW1lci5yZXN0YXJ0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL2RvIHN0dWZmP1xuICAgICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJGN1clNsaWRlLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUgaXMtaW4nKS5yZW1vdmVBdHRyKCdhcmlhLWxpdmUnKS5oaWRlKCk7XG4gICAgICAgICRuZXdTbGlkZS5hZGRDbGFzcygnaXMtYWN0aXZlIGlzLWluJykuYXR0cignYXJpYS1saXZlJywgJ3BvbGl0ZScpLnNob3coKTtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvUGxheSAmJiAhdGhpcy50aW1lci5pc1BhdXNlZCkge1xuICAgICAgICAgIHRoaXMudGltZXIucmVzdGFydCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgLyoqXG4gICAgKiBUcmlnZ2VycyB3aGVuIHRoZSBzbGlkZSBoYXMgZmluaXNoZWQgYW5pbWF0aW5nIGluLlxuICAgICogQGV2ZW50IE9yYml0I3NsaWRlY2hhbmdlXG4gICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc2xpZGVjaGFuZ2UuemYub3JiaXQnLCBbJG5ld1NsaWRlXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogVXBkYXRlcyB0aGUgYWN0aXZlIHN0YXRlIG9mIHRoZSBidWxsZXRzLCBpZiBkaXNwbGF5ZWQuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKiBAcGFyYW0ge051bWJlcn0gaWR4IC0gdGhlIGluZGV4IG9mIHRoZSBjdXJyZW50IHNsaWRlLlxuICAqL1xuICBfdXBkYXRlQnVsbGV0cyhpZHgpIHtcbiAgICB2YXIgJG9sZEJ1bGxldCA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLmJveE9mQnVsbGV0c31gKVxuICAgIC5maW5kKCcuaXMtYWN0aXZlJykucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpLmJsdXIoKSxcbiAgICBzcGFuID0gJG9sZEJ1bGxldC5maW5kKCdzcGFuOmxhc3QnKS5kZXRhY2goKSxcbiAgICAkbmV3QnVsbGV0ID0gdGhpcy4kYnVsbGV0cy5lcShpZHgpLmFkZENsYXNzKCdpcy1hY3RpdmUnKS5hcHBlbmQoc3Bhbik7XG4gIH1cblxuICAvKipcbiAgKiBEZXN0cm95cyB0aGUgY2Fyb3VzZWwgYW5kIGhpZGVzIHRoZSBlbGVtZW50LlxuICAqIEBmdW5jdGlvblxuICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYub3JiaXQnKS5maW5kKCcqJykub2ZmKCcuemYub3JiaXQnKS5lbmQoKS5oaWRlKCk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbk9yYml0LmRlZmF1bHRzID0ge1xuICAvKipcbiAgKiBUZWxscyB0aGUgSlMgdG8gbG9vayBmb3IgYW5kIGxvYWRCdWxsZXRzLlxuICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICogQGRlZmF1bHQgdHJ1ZVxuICAqL1xuICBidWxsZXRzOiB0cnVlLFxuICAvKipcbiAgKiBUZWxscyB0aGUgSlMgdG8gYXBwbHkgZXZlbnQgbGlzdGVuZXJzIHRvIG5hdiBidXR0b25zXG4gICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgKiBAZGVmYXVsdCB0cnVlXG4gICovXG4gIG5hdkJ1dHRvbnM6IHRydWUsXG4gIC8qKlxuICAqIG1vdGlvbi11aSBhbmltYXRpb24gY2xhc3MgdG8gYXBwbHlcbiAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICogQGRlZmF1bHQgJ3NsaWRlLWluLXJpZ2h0J1xuICAqL1xuICBhbmltSW5Gcm9tUmlnaHQ6ICdzbGlkZS1pbi1yaWdodCcsXG4gIC8qKlxuICAqIG1vdGlvbi11aSBhbmltYXRpb24gY2xhc3MgdG8gYXBwbHlcbiAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICogQGRlZmF1bHQgJ3NsaWRlLW91dC1yaWdodCdcbiAgKi9cbiAgYW5pbU91dFRvUmlnaHQ6ICdzbGlkZS1vdXQtcmlnaHQnLFxuICAvKipcbiAgKiBtb3Rpb24tdWkgYW5pbWF0aW9uIGNsYXNzIHRvIGFwcGx5XG4gICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAqIEBkZWZhdWx0ICdzbGlkZS1pbi1sZWZ0J1xuICAqXG4gICovXG4gIGFuaW1JbkZyb21MZWZ0OiAnc2xpZGUtaW4tbGVmdCcsXG4gIC8qKlxuICAqIG1vdGlvbi11aSBhbmltYXRpb24gY2xhc3MgdG8gYXBwbHlcbiAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICogQGRlZmF1bHQgJ3NsaWRlLW91dC1sZWZ0J1xuICAqL1xuICBhbmltT3V0VG9MZWZ0OiAnc2xpZGUtb3V0LWxlZnQnLFxuICAvKipcbiAgKiBBbGxvd3MgT3JiaXQgdG8gYXV0b21hdGljYWxseSBhbmltYXRlIG9uIHBhZ2UgbG9hZC5cbiAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAqIEBkZWZhdWx0IHRydWVcbiAgKi9cbiAgYXV0b1BsYXk6IHRydWUsXG4gIC8qKlxuICAqIEFtb3VudCBvZiB0aW1lLCBpbiBtcywgYmV0d2VlbiBzbGlkZSB0cmFuc2l0aW9uc1xuICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcn1cbiAgKiBAZGVmYXVsdCA1MDAwXG4gICovXG4gIHRpbWVyRGVsYXk6IDUwMDAsXG4gIC8qKlxuICAqIEFsbG93cyBPcmJpdCB0byBpbmZpbml0ZWx5IGxvb3AgdGhyb3VnaCB0aGUgc2xpZGVzXG4gICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgKiBAZGVmYXVsdCB0cnVlXG4gICovXG4gIGluZmluaXRlV3JhcDogdHJ1ZSxcbiAgLyoqXG4gICogQWxsb3dzIHRoZSBPcmJpdCBzbGlkZXMgdG8gYmluZCB0byBzd2lwZSBldmVudHMgZm9yIG1vYmlsZSwgcmVxdWlyZXMgYW4gYWRkaXRpb25hbCB1dGlsIGxpYnJhcnlcbiAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAqIEBkZWZhdWx0IHRydWVcbiAgKi9cbiAgc3dpcGU6IHRydWUsXG4gIC8qKlxuICAqIEFsbG93cyB0aGUgdGltaW5nIGZ1bmN0aW9uIHRvIHBhdXNlIGFuaW1hdGlvbiBvbiBob3Zlci5cbiAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAqIEBkZWZhdWx0IHRydWVcbiAgKi9cbiAgcGF1c2VPbkhvdmVyOiB0cnVlLFxuICAvKipcbiAgKiBBbGxvd3MgT3JiaXQgdG8gYmluZCBrZXlib2FyZCBldmVudHMgdG8gdGhlIHNsaWRlciwgdG8gYW5pbWF0ZSBmcmFtZXMgd2l0aCBhcnJvdyBrZXlzXG4gICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgKiBAZGVmYXVsdCB0cnVlXG4gICovXG4gIGFjY2Vzc2libGU6IHRydWUsXG4gIC8qKlxuICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGNvbnRhaW5lciBvZiBPcmJpdFxuICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgKiBAZGVmYXVsdCAnb3JiaXQtY29udGFpbmVyJ1xuICAqL1xuICBjb250YWluZXJDbGFzczogJ29yYml0LWNvbnRhaW5lcicsXG4gIC8qKlxuICAqIENsYXNzIGFwcGxpZWQgdG8gaW5kaXZpZHVhbCBzbGlkZXMuXG4gICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAqIEBkZWZhdWx0ICdvcmJpdC1zbGlkZSdcbiAgKi9cbiAgc2xpZGVDbGFzczogJ29yYml0LXNsaWRlJyxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYnVsbGV0IGNvbnRhaW5lci4gWW91J3JlIHdlbGNvbWUuXG4gICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAqIEBkZWZhdWx0ICdvcmJpdC1idWxsZXRzJ1xuICAqL1xuICBib3hPZkJ1bGxldHM6ICdvcmJpdC1idWxsZXRzJyxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYG5leHRgIG5hdmlnYXRpb24gYnV0dG9uLlxuICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgKiBAZGVmYXVsdCAnb3JiaXQtbmV4dCdcbiAgKi9cbiAgbmV4dENsYXNzOiAnb3JiaXQtbmV4dCcsXG4gIC8qKlxuICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGBwcmV2aW91c2AgbmF2aWdhdGlvbiBidXR0b24uXG4gICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAqIEBkZWZhdWx0ICdvcmJpdC1wcmV2aW91cydcbiAgKi9cbiAgcHJldkNsYXNzOiAnb3JiaXQtcHJldmlvdXMnLFxuICAvKipcbiAgKiBCb29sZWFuIHRvIGZsYWcgdGhlIGpzIHRvIHVzZSBtb3Rpb24gdWkgY2xhc3NlcyBvciBub3QuIERlZmF1bHQgdG8gdHJ1ZSBmb3IgYmFja3dhcmRzIGNvbXBhdGFiaWxpdHkuXG4gICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgKiBAZGVmYXVsdCB0cnVlXG4gICovXG4gIHVzZU1VSTogdHJ1ZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKE9yYml0LCAnT3JiaXQnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFJlc3BvbnNpdmVNZW51IG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5yZXNwb25zaXZlTWVudVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKi9cblxuY2xhc3MgUmVzcG9uc2l2ZU1lbnUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIHJlc3BvbnNpdmUgbWVudS5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBSZXNwb25zaXZlTWVudSNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYSBkcm9wZG93biBtZW51LlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9ICQoZWxlbWVudCk7XG4gICAgdGhpcy5ydWxlcyA9IHRoaXMuJGVsZW1lbnQuZGF0YSgncmVzcG9uc2l2ZS1tZW51Jyk7XG4gICAgdGhpcy5jdXJyZW50TXEgPSBudWxsO1xuICAgIHRoaXMuY3VycmVudFBsdWdpbiA9IG51bGw7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdSZXNwb25zaXZlTWVudScpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBNZW51IGJ5IHBhcnNpbmcgdGhlIGNsYXNzZXMgZnJvbSB0aGUgJ2RhdGEtUmVzcG9uc2l2ZU1lbnUnIGF0dHJpYnV0ZSBvbiB0aGUgZWxlbWVudC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICAvLyBUaGUgZmlyc3QgdGltZSBhbiBJbnRlcmNoYW5nZSBwbHVnaW4gaXMgaW5pdGlhbGl6ZWQsIHRoaXMucnVsZXMgaXMgY29udmVydGVkIGZyb20gYSBzdHJpbmcgb2YgXCJjbGFzc2VzXCIgdG8gYW4gb2JqZWN0IG9mIHJ1bGVzXG4gICAgaWYgKHR5cGVvZiB0aGlzLnJ1bGVzID09PSAnc3RyaW5nJykge1xuICAgICAgbGV0IHJ1bGVzVHJlZSA9IHt9O1xuXG4gICAgICAvLyBQYXJzZSBydWxlcyBmcm9tIFwiY2xhc3Nlc1wiIHB1bGxlZCBmcm9tIGRhdGEgYXR0cmlidXRlXG4gICAgICBsZXQgcnVsZXMgPSB0aGlzLnJ1bGVzLnNwbGl0KCcgJyk7XG5cbiAgICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBldmVyeSBydWxlIGZvdW5kXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJ1bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCBydWxlID0gcnVsZXNbaV0uc3BsaXQoJy0nKTtcbiAgICAgICAgbGV0IHJ1bGVTaXplID0gcnVsZS5sZW5ndGggPiAxID8gcnVsZVswXSA6ICdzbWFsbCc7XG4gICAgICAgIGxldCBydWxlUGx1Z2luID0gcnVsZS5sZW5ndGggPiAxID8gcnVsZVsxXSA6IHJ1bGVbMF07XG5cbiAgICAgICAgaWYgKE1lbnVQbHVnaW5zW3J1bGVQbHVnaW5dICE9PSBudWxsKSB7XG4gICAgICAgICAgcnVsZXNUcmVlW3J1bGVTaXplXSA9IE1lbnVQbHVnaW5zW3J1bGVQbHVnaW5dO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMucnVsZXMgPSBydWxlc1RyZWU7XG4gICAgfVxuXG4gICAgaWYgKCEkLmlzRW1wdHlPYmplY3QodGhpcy5ydWxlcykpIHtcbiAgICAgIHRoaXMuX2NoZWNrTWVkaWFRdWVyaWVzKCk7XG4gICAgfVxuICAgIC8vIEFkZCBkYXRhLW11dGF0ZSBzaW5jZSBjaGlsZHJlbiBtYXkgbmVlZCBpdC5cbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2RhdGEtbXV0YXRlJywgKHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1tdXRhdGUnKSB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdyZXNwb25zaXZlLW1lbnUnKSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgdGhlIE1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCBmdW5jdGlvbigpIHtcbiAgICAgIF90aGlzLl9jaGVja01lZGlhUXVlcmllcygpO1xuICAgIH0pO1xuICAgIC8vICQod2luZG93KS5vbigncmVzaXplLnpmLlJlc3BvbnNpdmVNZW51JywgZnVuY3Rpb24oKSB7XG4gICAgLy8gICBfdGhpcy5fY2hlY2tNZWRpYVF1ZXJpZXMoKTtcbiAgICAvLyB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIGN1cnJlbnQgc2NyZWVuIHdpZHRoIGFnYWluc3QgYXZhaWxhYmxlIG1lZGlhIHF1ZXJpZXMuIElmIHRoZSBtZWRpYSBxdWVyeSBoYXMgY2hhbmdlZCwgYW5kIHRoZSBwbHVnaW4gbmVlZGVkIGhhcyBjaGFuZ2VkLCB0aGUgcGx1Z2lucyB3aWxsIHN3YXAgb3V0LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9jaGVja01lZGlhUXVlcmllcygpIHtcbiAgICB2YXIgbWF0Y2hlZE1xLCBfdGhpcyA9IHRoaXM7XG4gICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGVhY2ggcnVsZSBhbmQgZmluZCB0aGUgbGFzdCBtYXRjaGluZyBydWxlXG4gICAgJC5lYWNoKHRoaXMucnVsZXMsIGZ1bmN0aW9uKGtleSkge1xuICAgICAgaWYgKEZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KGtleSkpIHtcbiAgICAgICAgbWF0Y2hlZE1xID0ga2V5O1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gTm8gbWF0Y2g/IE5vIGRpY2VcbiAgICBpZiAoIW1hdGNoZWRNcSkgcmV0dXJuO1xuXG4gICAgLy8gUGx1Z2luIGFscmVhZHkgaW5pdGlhbGl6ZWQ/IFdlIGdvb2RcbiAgICBpZiAodGhpcy5jdXJyZW50UGx1Z2luIGluc3RhbmNlb2YgdGhpcy5ydWxlc1ttYXRjaGVkTXFdLnBsdWdpbikgcmV0dXJuO1xuXG4gICAgLy8gUmVtb3ZlIGV4aXN0aW5nIHBsdWdpbi1zcGVjaWZpYyBDU1MgY2xhc3Nlc1xuICAgICQuZWFjaChNZW51UGx1Z2lucywgZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgX3RoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3ModmFsdWUuY3NzQ2xhc3MpO1xuICAgIH0pO1xuXG4gICAgLy8gQWRkIHRoZSBDU1MgY2xhc3MgZm9yIHRoZSBuZXcgcGx1Z2luXG4gICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcyh0aGlzLnJ1bGVzW21hdGNoZWRNcV0uY3NzQ2xhc3MpO1xuXG4gICAgLy8gQ3JlYXRlIGFuIGluc3RhbmNlIG9mIHRoZSBuZXcgcGx1Z2luXG4gICAgaWYgKHRoaXMuY3VycmVudFBsdWdpbikgdGhpcy5jdXJyZW50UGx1Z2luLmRlc3Ryb3koKTtcbiAgICB0aGlzLmN1cnJlbnRQbHVnaW4gPSBuZXcgdGhpcy5ydWxlc1ttYXRjaGVkTXFdLnBsdWdpbih0aGlzLiRlbGVtZW50LCB7fSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIGluc3RhbmNlIG9mIHRoZSBjdXJyZW50IHBsdWdpbiBvbiB0aGlzIGVsZW1lbnQsIGFzIHdlbGwgYXMgdGhlIHdpbmRvdyByZXNpemUgaGFuZGxlciB0aGF0IHN3aXRjaGVzIHRoZSBwbHVnaW5zIG91dC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuY3VycmVudFBsdWdpbi5kZXN0cm95KCk7XG4gICAgJCh3aW5kb3cpLm9mZignLnpmLlJlc3BvbnNpdmVNZW51Jyk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblJlc3BvbnNpdmVNZW51LmRlZmF1bHRzID0ge307XG5cbi8vIFRoZSBwbHVnaW4gbWF0Y2hlcyB0aGUgcGx1Z2luIGNsYXNzZXMgd2l0aCB0aGVzZSBwbHVnaW4gaW5zdGFuY2VzLlxudmFyIE1lbnVQbHVnaW5zID0ge1xuICBkcm9wZG93bjoge1xuICAgIGNzc0NsYXNzOiAnZHJvcGRvd24nLFxuICAgIHBsdWdpbjogRm91bmRhdGlvbi5fcGx1Z2luc1snZHJvcGRvd24tbWVudSddIHx8IG51bGxcbiAgfSxcbiBkcmlsbGRvd246IHtcbiAgICBjc3NDbGFzczogJ2RyaWxsZG93bicsXG4gICAgcGx1Z2luOiBGb3VuZGF0aW9uLl9wbHVnaW5zWydkcmlsbGRvd24nXSB8fCBudWxsXG4gIH0sXG4gIGFjY29yZGlvbjoge1xuICAgIGNzc0NsYXNzOiAnYWNjb3JkaW9uLW1lbnUnLFxuICAgIHBsdWdpbjogRm91bmRhdGlvbi5fcGx1Z2luc1snYWNjb3JkaW9uLW1lbnUnXSB8fCBudWxsXG4gIH1cbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihSZXNwb25zaXZlTWVudSwgJ1Jlc3BvbnNpdmVNZW51Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBSZXNwb25zaXZlVG9nZ2xlIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5yZXNwb25zaXZlVG9nZ2xlXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqL1xuXG5jbGFzcyBSZXNwb25zaXZlVG9nZ2xlIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgVGFiIEJhci5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBSZXNwb25zaXZlVG9nZ2xlI2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGF0dGFjaCB0YWIgYmFyIGZ1bmN0aW9uYWxpdHkgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gJChlbGVtZW50KTtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgUmVzcG9uc2l2ZVRvZ2dsZS5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnUmVzcG9uc2l2ZVRvZ2dsZScpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSB0YWIgYmFyIGJ5IGZpbmRpbmcgdGhlIHRhcmdldCBlbGVtZW50LCB0b2dnbGluZyBlbGVtZW50LCBhbmQgcnVubmluZyB1cGRhdGUoKS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgdGFyZ2V0SUQgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ3Jlc3BvbnNpdmUtdG9nZ2xlJyk7XG4gICAgaWYgKCF0YXJnZXRJRCkge1xuICAgICAgY29uc29sZS5lcnJvcignWW91ciB0YWIgYmFyIG5lZWRzIGFuIElEIG9mIGEgTWVudSBhcyB0aGUgdmFsdWUgb2YgZGF0YS10YWItYmFyLicpO1xuICAgIH1cblxuICAgIHRoaXMuJHRhcmdldE1lbnUgPSAkKGAjJHt0YXJnZXRJRH1gKTtcbiAgICB0aGlzLiR0b2dnbGVyID0gdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS10b2dnbGVdJykuZmlsdGVyKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHRhcmdldCA9ICQodGhpcykuZGF0YSgndG9nZ2xlJyk7XG4gICAgICByZXR1cm4gKHRhcmdldCA9PT0gdGFyZ2V0SUQgfHwgdGFyZ2V0ID09PSBcIlwiKTtcbiAgICB9KTtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgdGhpcy5vcHRpb25zLCB0aGlzLiR0YXJnZXRNZW51LmRhdGEoKSk7XG5cbiAgICAvLyBJZiB0aGV5IHdlcmUgc2V0LCBwYXJzZSB0aGUgYW5pbWF0aW9uIGNsYXNzZXNcbiAgICBpZih0aGlzLm9wdGlvbnMuYW5pbWF0ZSkge1xuICAgICAgbGV0IGlucHV0ID0gdGhpcy5vcHRpb25zLmFuaW1hdGUuc3BsaXQoJyAnKTtcblxuICAgICAgdGhpcy5hbmltYXRpb25JbiA9IGlucHV0WzBdO1xuICAgICAgdGhpcy5hbmltYXRpb25PdXQgPSBpbnB1dFsxXSB8fCBudWxsO1xuICAgIH1cblxuICAgIHRoaXMuX3VwZGF0ZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgbmVjZXNzYXJ5IGV2ZW50IGhhbmRsZXJzIGZvciB0aGUgdGFiIGJhciB0byB3b3JrLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuX3VwZGF0ZU1xSGFuZGxlciA9IHRoaXMuX3VwZGF0ZS5iaW5kKHRoaXMpO1xuXG4gICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCB0aGlzLl91cGRhdGVNcUhhbmRsZXIpO1xuXG4gICAgdGhpcy4kdG9nZ2xlci5vbignY2xpY2suemYucmVzcG9uc2l2ZVRvZ2dsZScsIHRoaXMudG9nZ2xlTWVudS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIGN1cnJlbnQgbWVkaWEgcXVlcnkgdG8gZGV0ZXJtaW5lIGlmIHRoZSB0YWIgYmFyIHNob3VsZCBiZSB2aXNpYmxlIG9yIGhpZGRlbi5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfdXBkYXRlKCkge1xuICAgIC8vIE1vYmlsZVxuICAgIGlmICghRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QodGhpcy5vcHRpb25zLmhpZGVGb3IpKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LnNob3coKTtcbiAgICAgIHRoaXMuJHRhcmdldE1lbnUuaGlkZSgpO1xuICAgIH1cblxuICAgIC8vIERlc2t0b3BcbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuaGlkZSgpO1xuICAgICAgdGhpcy4kdGFyZ2V0TWVudS5zaG93KCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIGVsZW1lbnQgYXR0YWNoZWQgdG8gdGhlIHRhYiBiYXIuIFRoZSB0b2dnbGUgb25seSBoYXBwZW5zIGlmIHRoZSBzY3JlZW4gaXMgc21hbGwgZW5vdWdoIHRvIGFsbG93IGl0LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIFJlc3BvbnNpdmVUb2dnbGUjdG9nZ2xlZFxuICAgKi9cbiAgdG9nZ2xlTWVudSgpIHtcbiAgICBpZiAoIUZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KHRoaXMub3B0aW9ucy5oaWRlRm9yKSkge1xuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyB3aGVuIHRoZSBlbGVtZW50IGF0dGFjaGVkIHRvIHRoZSB0YWIgYmFyIHRvZ2dsZXMuXG4gICAgICAgKiBAZXZlbnQgUmVzcG9uc2l2ZVRvZ2dsZSN0b2dnbGVkXG4gICAgICAgKi9cbiAgICAgIGlmKHRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICAgIGlmICh0aGlzLiR0YXJnZXRNZW51LmlzKCc6aGlkZGVuJykpIHtcbiAgICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlSW4odGhpcy4kdGFyZ2V0TWVudSwgdGhpcy5hbmltYXRpb25JbiwgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCd0b2dnbGVkLnpmLnJlc3BvbnNpdmVUb2dnbGUnKTtcbiAgICAgICAgICAgIHRoaXMuJHRhcmdldE1lbnUuZmluZCgnW2RhdGEtbXV0YXRlXScpLnRyaWdnZXJIYW5kbGVyKCdtdXRhdGVtZS56Zi50cmlnZ2VyJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dCh0aGlzLiR0YXJnZXRNZW51LCB0aGlzLmFuaW1hdGlvbk91dCwgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCd0b2dnbGVkLnpmLnJlc3BvbnNpdmVUb2dnbGUnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuJHRhcmdldE1lbnUudG9nZ2xlKDApO1xuICAgICAgICB0aGlzLiR0YXJnZXRNZW51LmZpbmQoJ1tkYXRhLW11dGF0ZV0nKS50cmlnZ2VyKCdtdXRhdGVtZS56Zi50cmlnZ2VyJyk7XG4gICAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigndG9nZ2xlZC56Zi5yZXNwb25zaXZlVG9nZ2xlJyk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi5yZXNwb25zaXZlVG9nZ2xlJyk7XG4gICAgdGhpcy4kdG9nZ2xlci5vZmYoJy56Zi5yZXNwb25zaXZlVG9nZ2xlJyk7XG5cbiAgICAkKHdpbmRvdykub2ZmKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCB0aGlzLl91cGRhdGVNcUhhbmRsZXIpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblJlc3BvbnNpdmVUb2dnbGUuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBUaGUgYnJlYWtwb2ludCBhZnRlciB3aGljaCB0aGUgbWVudSBpcyBhbHdheXMgc2hvd24sIGFuZCB0aGUgdGFiIGJhciBpcyBoaWRkZW4uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ21lZGl1bSdcbiAgICovXG4gIGhpZGVGb3I6ICdtZWRpdW0nLFxuXG4gIC8qKlxuICAgKiBUbyBkZWNpZGUgaWYgdGhlIHRvZ2dsZSBzaG91bGQgYmUgYW5pbWF0ZWQgb3Igbm90LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgYW5pbWF0ZTogZmFsc2Vcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihSZXNwb25zaXZlVG9nZ2xlLCAnUmVzcG9uc2l2ZVRvZ2dsZScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogUmV2ZWFsIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5yZXZlYWxcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uIGlmIHVzaW5nIGFuaW1hdGlvbnNcbiAqL1xuXG5jbGFzcyBSZXZlYWwge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBSZXZlYWwuXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gdXNlIGZvciB0aGUgbW9kYWwuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gb3B0aW9uYWwgcGFyYW1ldGVycy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgUmV2ZWFsLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnUmV2ZWFsJyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignUmV2ZWFsJywge1xuICAgICAgJ0VOVEVSJzogJ29wZW4nLFxuICAgICAgJ1NQQUNFJzogJ29wZW4nLFxuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZScsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIG1vZGFsIGJ5IGFkZGluZyB0aGUgb3ZlcmxheSBhbmQgY2xvc2UgYnV0dG9ucywgKGlmIHNlbGVjdGVkKS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuaWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJyk7XG4gICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMuY2FjaGVkID0ge21xOiBGb3VuZGF0aW9uLk1lZGlhUXVlcnkuY3VycmVudH07XG4gICAgdGhpcy5pc01vYmlsZSA9IG1vYmlsZVNuaWZmKCk7XG5cbiAgICB0aGlzLiRhbmNob3IgPSAkKGBbZGF0YS1vcGVuPVwiJHt0aGlzLmlkfVwiXWApLmxlbmd0aCA/ICQoYFtkYXRhLW9wZW49XCIke3RoaXMuaWR9XCJdYCkgOiAkKGBbZGF0YS10b2dnbGU9XCIke3RoaXMuaWR9XCJdYCk7XG4gICAgdGhpcy4kYW5jaG9yLmF0dHIoe1xuICAgICAgJ2FyaWEtY29udHJvbHMnOiB0aGlzLmlkLFxuICAgICAgJ2FyaWEtaGFzcG9wdXAnOiB0cnVlLFxuICAgICAgJ3RhYmluZGV4JzogMFxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5mdWxsU2NyZWVuIHx8IHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2Z1bGwnKSkge1xuICAgICAgdGhpcy5vcHRpb25zLmZ1bGxTY3JlZW4gPSB0cnVlO1xuICAgICAgdGhpcy5vcHRpb25zLm92ZXJsYXkgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5ICYmICF0aGlzLiRvdmVybGF5KSB7XG4gICAgICB0aGlzLiRvdmVybGF5ID0gdGhpcy5fbWFrZU92ZXJsYXkodGhpcy5pZCk7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKHtcbiAgICAgICAgJ3JvbGUnOiAnZGlhbG9nJyxcbiAgICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZSxcbiAgICAgICAgJ2RhdGEteWV0aS1ib3gnOiB0aGlzLmlkLFxuICAgICAgICAnZGF0YS1yZXNpemUnOiB0aGlzLmlkXG4gICAgfSk7XG5cbiAgICBpZih0aGlzLiRvdmVybGF5KSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmRldGFjaCgpLmFwcGVuZFRvKHRoaXMuJG92ZXJsYXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmRldGFjaCgpLmFwcGVuZFRvKCQodGhpcy5vcHRpb25zLmFwcGVuZFRvKSk7XG4gICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCd3aXRob3V0LW92ZXJsYXknKTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWVwTGluayAmJiB3aW5kb3cubG9jYXRpb24uaGFzaCA9PT0gKCBgIyR7dGhpcy5pZH1gKSkge1xuICAgICAgJCh3aW5kb3cpLm9uZSgnbG9hZC56Zi5yZXZlYWwnLCB0aGlzLm9wZW4uYmluZCh0aGlzKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gb3ZlcmxheSBkaXYgdG8gZGlzcGxheSBiZWhpbmQgdGhlIG1vZGFsLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX21ha2VPdmVybGF5KCkge1xuICAgIHJldHVybiAkKCc8ZGl2PjwvZGl2PicpXG4gICAgICAuYWRkQ2xhc3MoJ3JldmVhbC1vdmVybGF5JylcbiAgICAgIC5hcHBlbmRUbyh0aGlzLm9wdGlvbnMuYXBwZW5kVG8pO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgcG9zaXRpb24gb2YgbW9kYWxcbiAgICogVE9ETzogIEZpZ3VyZSBvdXQgaWYgd2UgYWN0dWFsbHkgbmVlZCB0byBjYWNoZSB0aGVzZSB2YWx1ZXMgb3IgaWYgaXQgZG9lc24ndCBtYXR0ZXJcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF91cGRhdGVQb3NpdGlvbigpIHtcbiAgICB2YXIgd2lkdGggPSB0aGlzLiRlbGVtZW50Lm91dGVyV2lkdGgoKTtcbiAgICB2YXIgb3V0ZXJXaWR0aCA9ICQod2luZG93KS53aWR0aCgpO1xuICAgIHZhciBoZWlnaHQgPSB0aGlzLiRlbGVtZW50Lm91dGVySGVpZ2h0KCk7XG4gICAgdmFyIG91dGVySGVpZ2h0ID0gJCh3aW5kb3cpLmhlaWdodCgpO1xuICAgIHZhciBsZWZ0LCB0b3A7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5oT2Zmc2V0ID09PSAnYXV0bycpIHtcbiAgICAgIGxlZnQgPSBwYXJzZUludCgob3V0ZXJXaWR0aCAtIHdpZHRoKSAvIDIsIDEwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGVmdCA9IHBhcnNlSW50KHRoaXMub3B0aW9ucy5oT2Zmc2V0LCAxMCk7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMudk9mZnNldCA9PT0gJ2F1dG8nKSB7XG4gICAgICBpZiAoaGVpZ2h0ID4gb3V0ZXJIZWlnaHQpIHtcbiAgICAgICAgdG9wID0gcGFyc2VJbnQoTWF0aC5taW4oMTAwLCBvdXRlckhlaWdodCAvIDEwKSwgMTApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdG9wID0gcGFyc2VJbnQoKG91dGVySGVpZ2h0IC0gaGVpZ2h0KSAvIDQsIDEwKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdG9wID0gcGFyc2VJbnQodGhpcy5vcHRpb25zLnZPZmZzZXQsIDEwKTtcbiAgICB9XG4gICAgdGhpcy4kZWxlbWVudC5jc3Moe3RvcDogdG9wICsgJ3B4J30pO1xuICAgIC8vIG9ubHkgd29ycnkgYWJvdXQgbGVmdCBpZiB3ZSBkb24ndCBoYXZlIGFuIG92ZXJsYXkgb3Igd2UgaGF2ZWEgIGhvcml6b250YWwgb2Zmc2V0LFxuICAgIC8vIG90aGVyd2lzZSB3ZSdyZSBwZXJmZWN0bHkgaW4gdGhlIG1pZGRsZVxuICAgIGlmKCF0aGlzLiRvdmVybGF5IHx8ICh0aGlzLm9wdGlvbnMuaE9mZnNldCAhPT0gJ2F1dG8nKSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5jc3Moe2xlZnQ6IGxlZnQgKyAncHgnfSk7XG4gICAgICB0aGlzLiRlbGVtZW50LmNzcyh7bWFyZ2luOiAnMHB4J30pO1xuICAgIH1cblxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgZm9yIHRoZSBtb2RhbC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJGVsZW1lbnQub24oe1xuICAgICAgJ29wZW4uemYudHJpZ2dlcic6IHRoaXMub3Blbi5iaW5kKHRoaXMpLFxuICAgICAgJ2Nsb3NlLnpmLnRyaWdnZXInOiAoZXZlbnQsICRlbGVtZW50KSA9PiB7XG4gICAgICAgIGlmICgoZXZlbnQudGFyZ2V0ID09PSBfdGhpcy4kZWxlbWVudFswXSkgfHxcbiAgICAgICAgICAgICgkKGV2ZW50LnRhcmdldCkucGFyZW50cygnW2RhdGEtY2xvc2FibGVdJylbMF0gPT09ICRlbGVtZW50KSkgeyAvLyBvbmx5IGNsb3NlIHJldmVhbCB3aGVuIGl0J3MgZXhwbGljaXRseSBjYWxsZWRcbiAgICAgICAgICByZXR1cm4gdGhpcy5jbG9zZS5hcHBseSh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcyksXG4gICAgICAncmVzaXplbWUuemYudHJpZ2dlcic6IGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5fdXBkYXRlUG9zaXRpb24oKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICh0aGlzLiRhbmNob3IubGVuZ3RoKSB7XG4gICAgICB0aGlzLiRhbmNob3Iub24oJ2tleWRvd24uemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiAoZS53aGljaCA9PT0gMTMgfHwgZS53aGljaCA9PT0gMzIpIHtcbiAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrICYmIHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICB0aGlzLiRvdmVybGF5Lm9mZignLnpmLnJldmVhbCcpLm9uKCdjbGljay56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmIChlLnRhcmdldCA9PT0gX3RoaXMuJGVsZW1lbnRbMF0gfHxcbiAgICAgICAgICAkLmNvbnRhaW5zKF90aGlzLiRlbGVtZW50WzBdLCBlLnRhcmdldCkgfHxcbiAgICAgICAgICAgICEkLmNvbnRhaW5zKGRvY3VtZW50LCBlLnRhcmdldCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWVwTGluaykge1xuICAgICAgJCh3aW5kb3cpLm9uKGBwb3BzdGF0ZS56Zi5yZXZlYWw6JHt0aGlzLmlkfWAsIHRoaXMuX2hhbmRsZVN0YXRlLmJpbmQodGhpcykpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIG1vZGFsIG1ldGhvZHMgb24gYmFjay9mb3J3YXJkIGJ1dHRvbiBjbGlja3Mgb3IgYW55IG90aGVyIGV2ZW50IHRoYXQgdHJpZ2dlcnMgcG9wc3RhdGUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaGFuZGxlU3RhdGUoZSkge1xuICAgIGlmKHdpbmRvdy5sb2NhdGlvbi5oYXNoID09PSAoICcjJyArIHRoaXMuaWQpICYmICF0aGlzLmlzQWN0aXZlKXsgdGhpcy5vcGVuKCk7IH1cbiAgICBlbHNleyB0aGlzLmNsb3NlKCk7IH1cbiAgfVxuXG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBtb2RhbCBjb250cm9sbGVkIGJ5IGB0aGlzLiRhbmNob3JgLCBhbmQgY2xvc2VzIGFsbCBvdGhlcnMgYnkgZGVmYXVsdC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBSZXZlYWwjY2xvc2VtZVxuICAgKiBAZmlyZXMgUmV2ZWFsI29wZW5cbiAgICovXG4gIG9wZW4oKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWVwTGluaykge1xuICAgICAgdmFyIGhhc2ggPSBgIyR7dGhpcy5pZH1gO1xuXG4gICAgICBpZiAod2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKSB7XG4gICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCBudWxsLCBoYXNoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gaGFzaDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcblxuICAgIC8vIE1ha2UgZWxlbWVudHMgaW52aXNpYmxlLCBidXQgcmVtb3ZlIGRpc3BsYXk6IG5vbmUgc28gd2UgY2FuIGdldCBzaXplIGFuZCBwb3NpdGlvbmluZ1xuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgICAgLmNzcyh7ICd2aXNpYmlsaXR5JzogJ2hpZGRlbicgfSlcbiAgICAgICAgLnNob3coKVxuICAgICAgICAuc2Nyb2xsVG9wKDApO1xuICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgdGhpcy4kb3ZlcmxheS5jc3Moeyd2aXNpYmlsaXR5JzogJ2hpZGRlbid9KS5zaG93KCk7XG4gICAgfVxuXG4gICAgdGhpcy5fdXBkYXRlUG9zaXRpb24oKTtcblxuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5oaWRlKClcbiAgICAgIC5jc3MoeyAndmlzaWJpbGl0eSc6ICcnIH0pO1xuXG4gICAgaWYodGhpcy4kb3ZlcmxheSkge1xuICAgICAgdGhpcy4kb3ZlcmxheS5jc3Moeyd2aXNpYmlsaXR5JzogJyd9KS5oaWRlKCk7XG4gICAgICBpZih0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdmYXN0JykpIHtcbiAgICAgICAgdGhpcy4kb3ZlcmxheS5hZGRDbGFzcygnZmFzdCcpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdzbG93JykpIHtcbiAgICAgICAgdGhpcy4kb3ZlcmxheS5hZGRDbGFzcygnc2xvdycpO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMubXVsdGlwbGVPcGVuZWQpIHtcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBtb2RhbCBvcGVucy5cbiAgICAgICAqIENsb3NlcyBhbnkgb3RoZXIgbW9kYWxzIHRoYXQgYXJlIGN1cnJlbnRseSBvcGVuXG4gICAgICAgKiBAZXZlbnQgUmV2ZWFsI2Nsb3NlbWVcbiAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZW1lLnpmLnJldmVhbCcsIHRoaXMuaWQpO1xuICAgIH1cblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBhZGRSZXZlYWxPcGVuQ2xhc3NlcygpIHtcbiAgICAgIGlmIChfdGhpcy5pc01vYmlsZSkge1xuICAgICAgICBpZighX3RoaXMub3JpZ2luYWxTY3JvbGxQb3MpIHtcbiAgICAgICAgICBfdGhpcy5vcmlnaW5hbFNjcm9sbFBvcyA9IHdpbmRvdy5wYWdlWU9mZnNldDtcbiAgICAgICAgfVxuICAgICAgICAkKCdodG1sLCBib2R5JykuYWRkQ2xhc3MoJ2lzLXJldmVhbC1vcGVuJyk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgJCgnYm9keScpLmFkZENsYXNzKCdpcy1yZXZlYWwtb3BlbicpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBNb3Rpb24gVUkgbWV0aG9kIG9mIHJldmVhbFxuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0aW9uSW4pIHtcbiAgICAgIGZ1bmN0aW9uIGFmdGVyQW5pbWF0aW9uKCl7XG4gICAgICAgIF90aGlzLiRlbGVtZW50XG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2FyaWEtaGlkZGVuJzogZmFsc2UsXG4gICAgICAgICAgICAndGFiaW5kZXgnOiAtMVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLmZvY3VzKCk7XG4gICAgICAgIGFkZFJldmVhbE9wZW5DbGFzc2VzKCk7XG4gICAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQudHJhcEZvY3VzKF90aGlzLiRlbGVtZW50KTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlSW4odGhpcy4kb3ZlcmxheSwgJ2ZhZGUtaW4nKTtcbiAgICAgIH1cbiAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVJbih0aGlzLiRlbGVtZW50LCB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uSW4sICgpID0+IHtcbiAgICAgICAgaWYodGhpcy4kZWxlbWVudCkgeyAvLyBwcm90ZWN0IGFnYWluc3Qgb2JqZWN0IGhhdmluZyBiZWVuIHJlbW92ZWRcbiAgICAgICAgICB0aGlzLmZvY3VzYWJsZUVsZW1lbnRzID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKHRoaXMuJGVsZW1lbnQpO1xuICAgICAgICAgIGFmdGVyQW5pbWF0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBqUXVlcnkgbWV0aG9kIG9mIHJldmVhbFxuICAgIGVsc2Uge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICAgIHRoaXMuJG92ZXJsYXkuc2hvdygwKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuJGVsZW1lbnQuc2hvdyh0aGlzLm9wdGlvbnMuc2hvd0RlbGF5KTtcbiAgICB9XG5cbiAgICAvLyBoYW5kbGUgYWNjZXNzaWJpbGl0eVxuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5hdHRyKHtcbiAgICAgICAgJ2FyaWEtaGlkZGVuJzogZmFsc2UsXG4gICAgICAgICd0YWJpbmRleCc6IC0xXG4gICAgICB9KVxuICAgICAgLmZvY3VzKCk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC50cmFwRm9jdXModGhpcy4kZWxlbWVudCk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBtb2RhbCBoYXMgc3VjY2Vzc2Z1bGx5IG9wZW5lZC5cbiAgICAgKiBAZXZlbnQgUmV2ZWFsI29wZW5cbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29wZW4uemYucmV2ZWFsJyk7XG5cbiAgICBhZGRSZXZlYWxPcGVuQ2xhc3NlcygpO1xuXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLl9leHRyYUhhbmRsZXJzKCk7XG4gICAgfSwgMCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBleHRyYSBldmVudCBoYW5kbGVycyBmb3IgdGhlIGJvZHkgYW5kIHdpbmRvdyBpZiBuZWNlc3NhcnkuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXh0cmFIYW5kbGVycygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIGlmKCF0aGlzLiRlbGVtZW50KSB7IHJldHVybjsgfSAvLyBJZiB3ZSdyZSBpbiB0aGUgbWlkZGxlIG9mIGNsZWFudXAsIGRvbid0IGZyZWFrIG91dFxuICAgIHRoaXMuZm9jdXNhYmxlRWxlbWVudHMgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUodGhpcy4kZWxlbWVudCk7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5vdmVybGF5ICYmIHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgJiYgIXRoaXMub3B0aW9ucy5mdWxsU2NyZWVuKSB7XG4gICAgICAkKCdib2R5Jykub24oJ2NsaWNrLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBfdGhpcy4kZWxlbWVudFswXSB8fFxuICAgICAgICAgICQuY29udGFpbnMoX3RoaXMuJGVsZW1lbnRbMF0sIGUudGFyZ2V0KSB8fFxuICAgICAgICAgICAgISQuY29udGFpbnMoZG9jdW1lbnQsIGUudGFyZ2V0KSkgeyByZXR1cm47IH1cbiAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkVzYykge1xuICAgICAgJCh3aW5kb3cpLm9uKCdrZXlkb3duLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1JldmVhbCcsIHtcbiAgICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy5jbG9zZU9uRXNjKSB7XG4gICAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZm9jdXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gbG9jayBmb2N1cyB3aXRoaW4gbW9kYWwgd2hpbGUgdGFiYmluZ1xuICAgIHRoaXMuJGVsZW1lbnQub24oJ2tleWRvd24uemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xuICAgICAgdmFyICR0YXJnZXQgPSAkKHRoaXMpO1xuICAgICAgLy8gaGFuZGxlIGtleWJvYXJkIGV2ZW50IHdpdGgga2V5Ym9hcmQgdXRpbFxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1JldmVhbCcsIHtcbiAgICAgICAgb3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKF90aGlzLiRlbGVtZW50LmZpbmQoJzpmb2N1cycpLmlzKF90aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLWNsb3NlXScpKSkge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgLy8gc2V0IGZvY3VzIGJhY2sgdG8gYW5jaG9yIGlmIGNsb3NlIGJ1dHRvbiBoYXMgYmVlbiBhY3RpdmF0ZWRcbiAgICAgICAgICAgICAgX3RoaXMuJGFuY2hvci5mb2N1cygpO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgfSBlbHNlIGlmICgkdGFyZ2V0LmlzKF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzKSkgeyAvLyBkb250J3QgdHJpZ2dlciBpZiBhY3VhbCBlbGVtZW50IGhhcyBmb2N1cyAoaS5lLiBpbnB1dHMsIGxpbmtzLCAuLi4pXG4gICAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuY2xvc2VPbkVzYykge1xuICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZm9jdXMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgaWYgKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIG1vZGFsLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIFJldmVhbCNjbG9zZWRcbiAgICovXG4gIGNsb3NlKCkge1xuICAgIGlmICghdGhpcy5pc0FjdGl2ZSB8fCAhdGhpcy4kZWxlbWVudC5pcygnOnZpc2libGUnKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgLy8gTW90aW9uIFVJIG1ldGhvZCBvZiBoaWRpbmdcbiAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGlvbk91dCkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQodGhpcy4kb3ZlcmxheSwgJ2ZhZGUtb3V0JywgZmluaXNoVXApO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGZpbmlzaFVwKCk7XG4gICAgICB9XG5cbiAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQodGhpcy4kZWxlbWVudCwgdGhpcy5vcHRpb25zLmFuaW1hdGlvbk91dCk7XG4gICAgfVxuICAgIC8vIGpRdWVyeSBtZXRob2Qgb2YgaGlkaW5nXG4gICAgZWxzZSB7XG5cbiAgICAgIHRoaXMuJGVsZW1lbnQuaGlkZSh0aGlzLm9wdGlvbnMuaGlkZURlbGF5KTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICAgIHRoaXMuJG92ZXJsYXkuaGlkZSgwLCBmaW5pc2hVcCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZmluaXNoVXAoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDb25kaXRpb25hbHMgdG8gcmVtb3ZlIGV4dHJhIGV2ZW50IGxpc3RlbmVycyBhZGRlZCBvbiBvcGVuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uRXNjKSB7XG4gICAgICAkKHdpbmRvdykub2ZmKCdrZXlkb3duLnpmLnJldmVhbCcpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLm92ZXJsYXkgJiYgdGhpcy5vcHRpb25zLmNsb3NlT25DbGljaykge1xuICAgICAgJCgnYm9keScpLm9mZignY2xpY2suemYucmV2ZWFsJyk7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJ2tleWRvd24uemYucmV2ZWFsJyk7XG5cbiAgICBmdW5jdGlvbiBmaW5pc2hVcCgpIHtcbiAgICAgIGlmIChfdGhpcy5pc01vYmlsZSkge1xuICAgICAgICBpZiAoJCgnLnJldmVhbDp2aXNpYmxlJykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgJCgnaHRtbCwgYm9keScpLnJlbW92ZUNsYXNzKCdpcy1yZXZlYWwtb3BlbicpO1xuICAgICAgICB9XG4gICAgICAgIGlmKF90aGlzLm9yaWdpbmFsU2Nyb2xsUG9zKSB7XG4gICAgICAgICAgJCgnYm9keScpLnNjcm9sbFRvcChfdGhpcy5vcmlnaW5hbFNjcm9sbFBvcyk7XG4gICAgICAgICAgX3RoaXMub3JpZ2luYWxTY3JvbGxQb3MgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgaWYgKCQoJy5yZXZlYWw6dmlzaWJsZScpLmxlbmd0aCAgPT09IDApIHtcbiAgICAgICAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ2lzLXJldmVhbC1vcGVuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuXG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlbGVhc2VGb2N1cyhfdGhpcy4kZWxlbWVudCk7XG5cbiAgICAgIF90aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSk7XG5cbiAgICAgIC8qKlxuICAgICAgKiBGaXJlcyB3aGVuIHRoZSBtb2RhbCBpcyBkb25lIGNsb3NpbmcuXG4gICAgICAqIEBldmVudCBSZXZlYWwjY2xvc2VkXG4gICAgICAqL1xuICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcignY2xvc2VkLnpmLnJldmVhbCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICogUmVzZXRzIHRoZSBtb2RhbCBjb250ZW50XG4gICAgKiBUaGlzIHByZXZlbnRzIGEgcnVubmluZyB2aWRlbyB0byBrZWVwIGdvaW5nIGluIHRoZSBiYWNrZ3JvdW5kXG4gICAgKi9cbiAgICBpZiAodGhpcy5vcHRpb25zLnJlc2V0T25DbG9zZSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5odG1sKHRoaXMuJGVsZW1lbnQuaHRtbCgpKTtcbiAgICB9XG5cbiAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgIGlmIChfdGhpcy5vcHRpb25zLmRlZXBMaW5rKSB7XG4gICAgICAgaWYgKHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSkge1xuICAgICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKCcnLCBkb2N1bWVudC50aXRsZSwgd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZShgIyR7dGhpcy5pZH1gLCAnJykpO1xuICAgICAgIH0gZWxzZSB7XG4gICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9ICcnO1xuICAgICAgIH1cbiAgICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIG9wZW4vY2xvc2VkIHN0YXRlIG9mIGEgbW9kYWwuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgdG9nZ2xlKCkge1xuICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3BlbigpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgYSBtb2RhbC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5hcHBlbmRUbygkKHRoaXMub3B0aW9ucy5hcHBlbmRUbykpOyAvLyBtb3ZlICRlbGVtZW50IG91dHNpZGUgb2YgJG92ZXJsYXkgdG8gcHJldmVudCBlcnJvciB1bnJlZ2lzdGVyUGx1Z2luKClcbiAgICAgIHRoaXMuJG92ZXJsYXkuaGlkZSgpLm9mZigpLnJlbW92ZSgpO1xuICAgIH1cbiAgICB0aGlzLiRlbGVtZW50LmhpZGUoKS5vZmYoKTtcbiAgICB0aGlzLiRhbmNob3Iub2ZmKCcuemYnKTtcbiAgICAkKHdpbmRvdykub2ZmKGAuemYucmV2ZWFsOiR7dGhpcy5pZH1gKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfTtcbn1cblxuUmV2ZWFsLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogTW90aW9uLVVJIGNsYXNzIHRvIHVzZSBmb3IgYW5pbWF0ZWQgZWxlbWVudHMuIElmIG5vbmUgdXNlZCwgZGVmYXVsdHMgdG8gc2ltcGxlIHNob3cvaGlkZS5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnJ1xuICAgKi9cbiAgYW5pbWF0aW9uSW46ICcnLFxuICAvKipcbiAgICogTW90aW9uLVVJIGNsYXNzIHRvIHVzZSBmb3IgYW5pbWF0ZWQgZWxlbWVudHMuIElmIG5vbmUgdXNlZCwgZGVmYXVsdHMgdG8gc2ltcGxlIHNob3cvaGlkZS5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnJ1xuICAgKi9cbiAgYW5pbWF0aW9uT3V0OiAnJyxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCB0byBkZWxheSB0aGUgb3BlbmluZyBvZiBhIG1vZGFsIGFmdGVyIGEgY2xpY2sgaWYgbm8gYW5pbWF0aW9uIHVzZWQuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcn1cbiAgICogQGRlZmF1bHQgMFxuICAgKi9cbiAgc2hvd0RlbGF5OiAwLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIHRvIGRlbGF5IHRoZSBjbG9zaW5nIG9mIGEgbW9kYWwgYWZ0ZXIgYSBjbGljayBpZiBubyBhbmltYXRpb24gdXNlZC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAwXG4gICAqL1xuICBoaWRlRGVsYXk6IDAsXG4gIC8qKlxuICAgKiBBbGxvd3MgYSBjbGljayBvbiB0aGUgYm9keS9vdmVybGF5IHRvIGNsb3NlIHRoZSBtb2RhbC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgY2xvc2VPbkNsaWNrOiB0cnVlLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBjbG9zZSBpZiB0aGUgdXNlciBwcmVzc2VzIHRoZSBgRVNDQVBFYCBrZXkuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGNsb3NlT25Fc2M6IHRydWUsXG4gIC8qKlxuICAgKiBJZiB0cnVlLCBhbGxvd3MgbXVsdGlwbGUgbW9kYWxzIHRvIGJlIGRpc3BsYXllZCBhdCBvbmNlLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgbXVsdGlwbGVPcGVuZWQ6IGZhbHNlLFxuICAvKipcbiAgICogRGlzdGFuY2UsIGluIHBpeGVscywgdGhlIG1vZGFsIHNob3VsZCBwdXNoIGRvd24gZnJvbSB0aGUgdG9wIG9mIHRoZSBzY3JlZW4uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcnxzdHJpbmd9XG4gICAqIEBkZWZhdWx0IGF1dG9cbiAgICovXG4gIHZPZmZzZXQ6ICdhdXRvJyxcbiAgLyoqXG4gICAqIERpc3RhbmNlLCBpbiBwaXhlbHMsIHRoZSBtb2RhbCBzaG91bGQgcHVzaCBpbiBmcm9tIHRoZSBzaWRlIG9mIHRoZSBzY3JlZW4uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcnxzdHJpbmd9XG4gICAqIEBkZWZhdWx0IGF1dG9cbiAgICovXG4gIGhPZmZzZXQ6ICdhdXRvJyxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gYmUgZnVsbHNjcmVlbiwgY29tcGxldGVseSBibG9ja2luZyBvdXQgdGhlIHJlc3Qgb2YgdGhlIHZpZXcuIEpTIGNoZWNrcyBmb3IgdGhpcyBhcyB3ZWxsLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgZnVsbFNjcmVlbjogZmFsc2UsXG4gIC8qKlxuICAgKiBQZXJjZW50YWdlIG9mIHNjcmVlbiBoZWlnaHQgdGhlIG1vZGFsIHNob3VsZCBwdXNoIHVwIGZyb20gdGhlIGJvdHRvbSBvZiB0aGUgdmlldy5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAxMFxuICAgKi9cbiAgYnRtT2Zmc2V0UGN0OiAxMCxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gZ2VuZXJhdGUgYW4gb3ZlcmxheSBkaXYsIHdoaWNoIHdpbGwgY292ZXIgdGhlIHZpZXcgd2hlbiBtb2RhbCBvcGVucy5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgb3ZlcmxheTogdHJ1ZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gcmVtb3ZlIGFuZCByZWluamVjdCBtYXJrdXAgb24gY2xvc2UuIFNob3VsZCBiZSB0cnVlIGlmIHVzaW5nIHZpZGVvIGVsZW1lbnRzIHcvbyB1c2luZyBwcm92aWRlcidzIGFwaSwgb3RoZXJ3aXNlLCB2aWRlb3Mgd2lsbCBjb250aW51ZSB0byBwbGF5IGluIHRoZSBiYWNrZ3JvdW5kLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgcmVzZXRPbkNsb3NlOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gYWx0ZXIgdGhlIHVybCBvbiBvcGVuL2Nsb3NlLCBhbmQgYWxsb3dzIHRoZSB1c2Ugb2YgdGhlIGBiYWNrYCBidXR0b24gdG8gY2xvc2UgbW9kYWxzLiBBTFNPLCBhbGxvd3MgYSBtb2RhbCB0byBhdXRvLW1hbmlhY2FsbHkgb3BlbiBvbiBwYWdlIGxvYWQgSUYgdGhlIGhhc2ggPT09IHRoZSBtb2RhbCdzIHVzZXItc2V0IGlkLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgZGVlcExpbms6IGZhbHNlLFxuICAgIC8qKlxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIGFwcGVuZCB0byBjdXN0b20gZGl2LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0IFwiYm9keVwiXG4gICAqL1xuICBhcHBlbmRUbzogXCJib2R5XCJcblxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFJldmVhbCwgJ1JldmVhbCcpO1xuXG5mdW5jdGlvbiBpUGhvbmVTbmlmZigpIHtcbiAgcmV0dXJuIC9pUChhZHxob25lfG9kKS4qT1MvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpO1xufVxuXG5mdW5jdGlvbiBhbmRyb2lkU25pZmYoKSB7XG4gIHJldHVybiAvQW5kcm9pZC8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudCk7XG59XG5cbmZ1bmN0aW9uIG1vYmlsZVNuaWZmKCkge1xuICByZXR1cm4gaVBob25lU25pZmYoKSB8fCBhbmRyb2lkU25pZmYoKTtcbn1cblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFNsaWRlciBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uc2xpZGVyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50b3VjaFxuICovXG5cbmNsYXNzIFNsaWRlciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgc2xpZGVyIGNvbnRyb2wuXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGEgc2xpZGVyIGNvbnRyb2wuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgU2xpZGVyLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdTbGlkZXInKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdTbGlkZXInLCB7XG4gICAgICAnbHRyJzoge1xuICAgICAgICAnQVJST1dfUklHSFQnOiAnaW5jcmVhc2UnLFxuICAgICAgICAnQVJST1dfVVAnOiAnaW5jcmVhc2UnLFxuICAgICAgICAnQVJST1dfRE9XTic6ICdkZWNyZWFzZScsXG4gICAgICAgICdBUlJPV19MRUZUJzogJ2RlY3JlYXNlJyxcbiAgICAgICAgJ1NISUZUX0FSUk9XX1JJR0hUJzogJ2luY3JlYXNlX2Zhc3QnLFxuICAgICAgICAnU0hJRlRfQVJST1dfVVAnOiAnaW5jcmVhc2VfZmFzdCcsXG4gICAgICAgICdTSElGVF9BUlJPV19ET1dOJzogJ2RlY3JlYXNlX2Zhc3QnLFxuICAgICAgICAnU0hJRlRfQVJST1dfTEVGVCc6ICdkZWNyZWFzZV9mYXN0J1xuICAgICAgfSxcbiAgICAgICdydGwnOiB7XG4gICAgICAgICdBUlJPV19MRUZUJzogJ2luY3JlYXNlJyxcbiAgICAgICAgJ0FSUk9XX1JJR0hUJzogJ2RlY3JlYXNlJyxcbiAgICAgICAgJ1NISUZUX0FSUk9XX0xFRlQnOiAnaW5jcmVhc2VfZmFzdCcsXG4gICAgICAgICdTSElGVF9BUlJPV19SSUdIVCc6ICdkZWNyZWFzZV9mYXN0J1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpbGl6ZXMgdGhlIHBsdWdpbiBieSByZWFkaW5nL3NldHRpbmcgYXR0cmlidXRlcywgY3JlYXRpbmcgY29sbGVjdGlvbnMgYW5kIHNldHRpbmcgdGhlIGluaXRpYWwgcG9zaXRpb24gb2YgdGhlIGhhbmRsZShzKS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLmlucHV0cyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnaW5wdXQnKTtcbiAgICB0aGlzLmhhbmRsZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXNsaWRlci1oYW5kbGVdJyk7XG5cbiAgICB0aGlzLiRoYW5kbGUgPSB0aGlzLmhhbmRsZXMuZXEoMCk7XG4gICAgdGhpcy4kaW5wdXQgPSB0aGlzLmlucHV0cy5sZW5ndGggPyB0aGlzLmlucHV0cy5lcSgwKSA6ICQoYCMke3RoaXMuJGhhbmRsZS5hdHRyKCdhcmlhLWNvbnRyb2xzJyl9YCk7XG4gICAgdGhpcy4kZmlsbCA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtc2xpZGVyLWZpbGxdJykuY3NzKHRoaXMub3B0aW9ucy52ZXJ0aWNhbCA/ICdoZWlnaHQnIDogJ3dpZHRoJywgMCk7XG5cbiAgICB2YXIgaXNEYmwgPSBmYWxzZSxcbiAgICAgICAgX3RoaXMgPSB0aGlzO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZGlzYWJsZWQgfHwgdGhpcy4kZWxlbWVudC5oYXNDbGFzcyh0aGlzLm9wdGlvbnMuZGlzYWJsZWRDbGFzcykpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5kaXNhYmxlZCA9IHRydWU7XG4gICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKHRoaXMub3B0aW9ucy5kaXNhYmxlZENsYXNzKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmlucHV0cy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuaW5wdXRzID0gJCgpLmFkZCh0aGlzLiRpbnB1dCk7XG4gICAgICB0aGlzLm9wdGlvbnMuYmluZGluZyA9IHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy5fc2V0SW5pdEF0dHIoMCk7XG5cbiAgICBpZiAodGhpcy5oYW5kbGVzWzFdKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuZG91YmxlU2lkZWQgPSB0cnVlO1xuICAgICAgdGhpcy4kaGFuZGxlMiA9IHRoaXMuaGFuZGxlcy5lcSgxKTtcbiAgICAgIHRoaXMuJGlucHV0MiA9IHRoaXMuaW5wdXRzLmxlbmd0aCA+IDEgPyB0aGlzLmlucHV0cy5lcSgxKSA6ICQoYCMke3RoaXMuJGhhbmRsZTIuYXR0cignYXJpYS1jb250cm9scycpfWApO1xuXG4gICAgICBpZiAoIXRoaXMuaW5wdXRzWzFdKSB7XG4gICAgICAgIHRoaXMuaW5wdXRzID0gdGhpcy5pbnB1dHMuYWRkKHRoaXMuJGlucHV0Mik7XG4gICAgICB9XG4gICAgICBpc0RibCA9IHRydWU7XG5cbiAgICAgIC8vIHRoaXMuJGhhbmRsZS50cmlnZ2VySGFuZGxlcignY2xpY2suemYuc2xpZGVyJyk7XG4gICAgICB0aGlzLl9zZXRJbml0QXR0cigxKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgaGFuZGxlIHBvc2l0aW9uc1xuICAgIHRoaXMuc2V0SGFuZGxlcygpO1xuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICBzZXRIYW5kbGVzKCkge1xuICAgIGlmKHRoaXMuaGFuZGxlc1sxXSkge1xuICAgICAgdGhpcy5fc2V0SGFuZGxlUG9zKHRoaXMuJGhhbmRsZSwgdGhpcy5pbnB1dHMuZXEoMCkudmFsKCksIHRydWUsICgpID0+IHtcbiAgICAgICAgdGhpcy5fc2V0SGFuZGxlUG9zKHRoaXMuJGhhbmRsZTIsIHRoaXMuaW5wdXRzLmVxKDEpLnZhbCgpLCB0cnVlKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9zZXRIYW5kbGVQb3ModGhpcy4kaGFuZGxlLCB0aGlzLmlucHV0cy5lcSgwKS52YWwoKSwgdHJ1ZSk7XG4gICAgfVxuICB9XG5cbiAgX3JlZmxvdygpIHtcbiAgICB0aGlzLnNldEhhbmRsZXMoKTtcbiAgfVxuICAvKipcbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZSAtIGZsb2F0aW5nIHBvaW50ICh0aGUgdmFsdWUpIHRvIGJlIHRyYW5zZm9ybWVkIHVzaW5nIHRvIGEgcmVsYXRpdmUgcG9zaXRpb24gb24gdGhlIHNsaWRlciAodGhlIGludmVyc2Ugb2YgX3ZhbHVlKVxuICAqL1xuICBfcGN0T2ZCYXIodmFsdWUpIHtcbiAgICB2YXIgcGN0T2ZCYXIgPSBwZXJjZW50KHZhbHVlIC0gdGhpcy5vcHRpb25zLnN0YXJ0LCB0aGlzLm9wdGlvbnMuZW5kIC0gdGhpcy5vcHRpb25zLnN0YXJ0KVxuXG4gICAgc3dpdGNoKHRoaXMub3B0aW9ucy5wb3NpdGlvblZhbHVlRnVuY3Rpb24pIHtcbiAgICBjYXNlIFwicG93XCI6XG4gICAgICBwY3RPZkJhciA9IHRoaXMuX2xvZ1RyYW5zZm9ybShwY3RPZkJhcik7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFwibG9nXCI6XG4gICAgICBwY3RPZkJhciA9IHRoaXMuX3Bvd1RyYW5zZm9ybShwY3RPZkJhcik7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICByZXR1cm4gcGN0T2ZCYXIudG9GaXhlZCgyKVxuICB9XG5cbiAgLyoqXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKiBAcGFyYW0ge051bWJlcn0gcGN0T2ZCYXIgLSBmbG9hdGluZyBwb2ludCwgdGhlIHJlbGF0aXZlIHBvc2l0aW9uIG9mIHRoZSBzbGlkZXIgKHR5cGljYWxseSBiZXR3ZWVuIDAtMSkgdG8gYmUgdHJhbnNmb3JtZWQgdG8gYSB2YWx1ZVxuICAqL1xuICBfdmFsdWUocGN0T2ZCYXIpIHtcbiAgICBzd2l0Y2godGhpcy5vcHRpb25zLnBvc2l0aW9uVmFsdWVGdW5jdGlvbikge1xuICAgIGNhc2UgXCJwb3dcIjpcbiAgICAgIHBjdE9mQmFyID0gdGhpcy5fcG93VHJhbnNmb3JtKHBjdE9mQmFyKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJsb2dcIjpcbiAgICAgIHBjdE9mQmFyID0gdGhpcy5fbG9nVHJhbnNmb3JtKHBjdE9mQmFyKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICB2YXIgdmFsdWUgPSAodGhpcy5vcHRpb25zLmVuZCAtIHRoaXMub3B0aW9ucy5zdGFydCkgKiBwY3RPZkJhciArIHRoaXMub3B0aW9ucy5zdGFydDtcblxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgLyoqXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKiBAcGFyYW0ge051bWJlcn0gdmFsdWUgLSBmbG9hdGluZyBwb2ludCAodHlwaWNhbGx5IGJldHdlZW4gMC0xKSB0byBiZSB0cmFuc2Zvcm1lZCB1c2luZyB0aGUgbG9nIGZ1bmN0aW9uXG4gICovXG4gIF9sb2dUcmFuc2Zvcm0odmFsdWUpIHtcbiAgICByZXR1cm4gYmFzZUxvZyh0aGlzLm9wdGlvbnMubm9uTGluZWFyQmFzZSwgKCh2YWx1ZSoodGhpcy5vcHRpb25zLm5vbkxpbmVhckJhc2UtMSkpKzEpKVxuICB9XG5cbiAgLyoqXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKiBAcGFyYW0ge051bWJlcn0gdmFsdWUgLSBmbG9hdGluZyBwb2ludCAodHlwaWNhbGx5IGJldHdlZW4gMC0xKSB0byBiZSB0cmFuc2Zvcm1lZCB1c2luZyB0aGUgcG93ZXIgZnVuY3Rpb25cbiAgKi9cbiAgX3Bvd1RyYW5zZm9ybSh2YWx1ZSkge1xuICAgIHJldHVybiAoTWF0aC5wb3codGhpcy5vcHRpb25zLm5vbkxpbmVhckJhc2UsIHZhbHVlKSAtIDEpIC8gKHRoaXMub3B0aW9ucy5ub25MaW5lYXJCYXNlIC0gMSlcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBwb3NpdGlvbiBvZiB0aGUgc2VsZWN0ZWQgaGFuZGxlIGFuZCBmaWxsIGJhci5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaG5kbCAtIHRoZSBzZWxlY3RlZCBoYW5kbGUgdG8gbW92ZS5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGxvY2F0aW9uIC0gZmxvYXRpbmcgcG9pbnQgYmV0d2VlbiB0aGUgc3RhcnQgYW5kIGVuZCB2YWx1ZXMgb2YgdGhlIHNsaWRlciBiYXIuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gY2FsbGJhY2sgZnVuY3Rpb24gdG8gZmlyZSBvbiBjb21wbGV0aW9uLlxuICAgKiBAZmlyZXMgU2xpZGVyI21vdmVkXG4gICAqIEBmaXJlcyBTbGlkZXIjY2hhbmdlZFxuICAgKi9cbiAgX3NldEhhbmRsZVBvcygkaG5kbCwgbG9jYXRpb24sIG5vSW52ZXJ0LCBjYikge1xuICAgIC8vIGRvbid0IG1vdmUgaWYgdGhlIHNsaWRlciBoYXMgYmVlbiBkaXNhYmxlZCBzaW5jZSBpdHMgaW5pdGlhbGl6YXRpb25cbiAgICBpZiAodGhpcy4kZWxlbWVudC5oYXNDbGFzcyh0aGlzLm9wdGlvbnMuZGlzYWJsZWRDbGFzcykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy9taWdodCBuZWVkIHRvIGFsdGVyIHRoYXQgc2xpZ2h0bHkgZm9yIGJhcnMgdGhhdCB3aWxsIGhhdmUgb2RkIG51bWJlciBzZWxlY3Rpb25zLlxuICAgIGxvY2F0aW9uID0gcGFyc2VGbG9hdChsb2NhdGlvbik7Ly9vbiBpbnB1dCBjaGFuZ2UgZXZlbnRzLCBjb252ZXJ0IHN0cmluZyB0byBudW1iZXIuLi5ncnVtYmxlLlxuXG4gICAgLy8gcHJldmVudCBzbGlkZXIgZnJvbSBydW5uaW5nIG91dCBvZiBib3VuZHMsIGlmIHZhbHVlIGV4Y2VlZHMgdGhlIGxpbWl0cyBzZXQgdGhyb3VnaCBvcHRpb25zLCBvdmVycmlkZSB0aGUgdmFsdWUgdG8gbWluL21heFxuICAgIGlmIChsb2NhdGlvbiA8IHRoaXMub3B0aW9ucy5zdGFydCkgeyBsb2NhdGlvbiA9IHRoaXMub3B0aW9ucy5zdGFydDsgfVxuICAgIGVsc2UgaWYgKGxvY2F0aW9uID4gdGhpcy5vcHRpb25zLmVuZCkgeyBsb2NhdGlvbiA9IHRoaXMub3B0aW9ucy5lbmQ7IH1cblxuICAgIHZhciBpc0RibCA9IHRoaXMub3B0aW9ucy5kb3VibGVTaWRlZDtcblxuICAgIGlmIChpc0RibCkgeyAvL3RoaXMgYmxvY2sgaXMgdG8gcHJldmVudCAyIGhhbmRsZXMgZnJvbSBjcm9zc2luZyBlYWNob3RoZXIuIENvdWxkL3Nob3VsZCBiZSBpbXByb3ZlZC5cbiAgICAgIGlmICh0aGlzLmhhbmRsZXMuaW5kZXgoJGhuZGwpID09PSAwKSB7XG4gICAgICAgIHZhciBoMlZhbCA9IHBhcnNlRmxvYXQodGhpcy4kaGFuZGxlMi5hdHRyKCdhcmlhLXZhbHVlbm93JykpO1xuICAgICAgICBsb2NhdGlvbiA9IGxvY2F0aW9uID49IGgyVmFsID8gaDJWYWwgLSB0aGlzLm9wdGlvbnMuc3RlcCA6IGxvY2F0aW9uO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGgxVmFsID0gcGFyc2VGbG9hdCh0aGlzLiRoYW5kbGUuYXR0cignYXJpYS12YWx1ZW5vdycpKTtcbiAgICAgICAgbG9jYXRpb24gPSBsb2NhdGlvbiA8PSBoMVZhbCA/IGgxVmFsICsgdGhpcy5vcHRpb25zLnN0ZXAgOiBsb2NhdGlvbjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL3RoaXMgaXMgZm9yIHNpbmdsZS1oYW5kbGVkIHZlcnRpY2FsIHNsaWRlcnMsIGl0IGFkanVzdHMgdGhlIHZhbHVlIHRvIGFjY291bnQgZm9yIHRoZSBzbGlkZXIgYmVpbmcgXCJ1cHNpZGUtZG93blwiXG4gICAgLy9mb3IgY2xpY2sgYW5kIGRyYWcgZXZlbnRzLCBpdCdzIHdlaXJkIGR1ZSB0byB0aGUgc2NhbGUoLTEsIDEpIGNzcyBwcm9wZXJ0eVxuICAgIGlmICh0aGlzLm9wdGlvbnMudmVydGljYWwgJiYgIW5vSW52ZXJ0KSB7XG4gICAgICBsb2NhdGlvbiA9IHRoaXMub3B0aW9ucy5lbmQgLSBsb2NhdGlvbjtcbiAgICB9XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICB2ZXJ0ID0gdGhpcy5vcHRpb25zLnZlcnRpY2FsLFxuICAgICAgICBoT3JXID0gdmVydCA/ICdoZWlnaHQnIDogJ3dpZHRoJyxcbiAgICAgICAgbE9yVCA9IHZlcnQgPyAndG9wJyA6ICdsZWZ0JyxcbiAgICAgICAgaGFuZGxlRGltID0gJGhuZGxbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClbaE9yV10sXG4gICAgICAgIGVsZW1EaW0gPSB0aGlzLiRlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpW2hPclddLFxuICAgICAgICAvL3BlcmNlbnRhZ2Ugb2YgYmFyIG1pbi9tYXggdmFsdWUgYmFzZWQgb24gY2xpY2sgb3IgZHJhZyBwb2ludFxuICAgICAgICBwY3RPZkJhciA9IHRoaXMuX3BjdE9mQmFyKGxvY2F0aW9uKSxcbiAgICAgICAgLy9udW1iZXIgb2YgYWN0dWFsIHBpeGVscyB0byBzaGlmdCB0aGUgaGFuZGxlLCBiYXNlZCBvbiB0aGUgcGVyY2VudGFnZSBvYnRhaW5lZCBhYm92ZVxuICAgICAgICBweFRvTW92ZSA9IChlbGVtRGltIC0gaGFuZGxlRGltKSAqIHBjdE9mQmFyLFxuICAgICAgICAvL3BlcmNlbnRhZ2Ugb2YgYmFyIHRvIHNoaWZ0IHRoZSBoYW5kbGVcbiAgICAgICAgbW92ZW1lbnQgPSAocGVyY2VudChweFRvTW92ZSwgZWxlbURpbSkgKiAxMDApLnRvRml4ZWQodGhpcy5vcHRpb25zLmRlY2ltYWwpO1xuICAgICAgICAvL2ZpeGluZyB0aGUgZGVjaW1hbCB2YWx1ZSBmb3IgdGhlIGxvY2F0aW9uIG51bWJlciwgaXMgcGFzc2VkIHRvIG90aGVyIG1ldGhvZHMgYXMgYSBmaXhlZCBmbG9hdGluZy1wb2ludCB2YWx1ZVxuICAgICAgICBsb2NhdGlvbiA9IHBhcnNlRmxvYXQobG9jYXRpb24udG9GaXhlZCh0aGlzLm9wdGlvbnMuZGVjaW1hbCkpO1xuICAgICAgICAvLyBkZWNsYXJlIGVtcHR5IG9iamVjdCBmb3IgY3NzIGFkanVzdG1lbnRzLCBvbmx5IHVzZWQgd2l0aCAyIGhhbmRsZWQtc2xpZGVyc1xuICAgIHZhciBjc3MgPSB7fTtcblxuICAgIHRoaXMuX3NldFZhbHVlcygkaG5kbCwgbG9jYXRpb24pO1xuXG4gICAgLy8gVE9ETyB1cGRhdGUgdG8gY2FsY3VsYXRlIGJhc2VkIG9uIHZhbHVlcyBzZXQgdG8gcmVzcGVjdGl2ZSBpbnB1dHM/P1xuICAgIGlmIChpc0RibCkge1xuICAgICAgdmFyIGlzTGVmdEhuZGwgPSB0aGlzLmhhbmRsZXMuaW5kZXgoJGhuZGwpID09PSAwLFxuICAgICAgICAgIC8vZW1wdHkgdmFyaWFibGUsIHdpbGwgYmUgdXNlZCBmb3IgbWluLWhlaWdodC93aWR0aCBmb3IgZmlsbCBiYXJcbiAgICAgICAgICBkaW0sXG4gICAgICAgICAgLy9wZXJjZW50YWdlIHcvaCBvZiB0aGUgaGFuZGxlIGNvbXBhcmVkIHRvIHRoZSBzbGlkZXIgYmFyXG4gICAgICAgICAgaGFuZGxlUGN0ID0gIH5+KHBlcmNlbnQoaGFuZGxlRGltLCBlbGVtRGltKSAqIDEwMCk7XG4gICAgICAvL2lmIGxlZnQgaGFuZGxlLCB0aGUgbWF0aCBpcyBzbGlnaHRseSBkaWZmZXJlbnQgdGhhbiBpZiBpdCdzIHRoZSByaWdodCBoYW5kbGUsIGFuZCB0aGUgbGVmdC90b3AgcHJvcGVydHkgbmVlZHMgdG8gYmUgY2hhbmdlZCBmb3IgdGhlIGZpbGwgYmFyXG4gICAgICBpZiAoaXNMZWZ0SG5kbCkge1xuICAgICAgICAvL2xlZnQgb3IgdG9wIHBlcmNlbnRhZ2UgdmFsdWUgdG8gYXBwbHkgdG8gdGhlIGZpbGwgYmFyLlxuICAgICAgICBjc3NbbE9yVF0gPSBgJHttb3ZlbWVudH0lYDtcbiAgICAgICAgLy9jYWxjdWxhdGUgdGhlIG5ldyBtaW4taGVpZ2h0L3dpZHRoIGZvciB0aGUgZmlsbCBiYXIuXG4gICAgICAgIGRpbSA9IHBhcnNlRmxvYXQodGhpcy4kaGFuZGxlMlswXS5zdHlsZVtsT3JUXSkgLSBtb3ZlbWVudCArIGhhbmRsZVBjdDtcbiAgICAgICAgLy90aGlzIGNhbGxiYWNrIGlzIG5lY2Vzc2FyeSB0byBwcmV2ZW50IGVycm9ycyBhbmQgYWxsb3cgdGhlIHByb3BlciBwbGFjZW1lbnQgYW5kIGluaXRpYWxpemF0aW9uIG9mIGEgMi1oYW5kbGVkIHNsaWRlclxuICAgICAgICAvL3BsdXMsIGl0IG1lYW5zIHdlIGRvbid0IGNhcmUgaWYgJ2RpbScgaXNOYU4gb24gaW5pdCwgaXQgd29uJ3QgYmUgaW4gdGhlIGZ1dHVyZS5cbiAgICAgICAgaWYgKGNiICYmIHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykgeyBjYigpOyB9Ly90aGlzIGlzIG9ubHkgbmVlZGVkIGZvciB0aGUgaW5pdGlhbGl6YXRpb24gb2YgMiBoYW5kbGVkIHNsaWRlcnNcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vanVzdCBjYWNoaW5nIHRoZSB2YWx1ZSBvZiB0aGUgbGVmdC9ib3R0b20gaGFuZGxlJ3MgbGVmdC90b3AgcHJvcGVydHlcbiAgICAgICAgdmFyIGhhbmRsZVBvcyA9IHBhcnNlRmxvYXQodGhpcy4kaGFuZGxlWzBdLnN0eWxlW2xPclRdKTtcbiAgICAgICAgLy9jYWxjdWxhdGUgdGhlIG5ldyBtaW4taGVpZ2h0L3dpZHRoIGZvciB0aGUgZmlsbCBiYXIuIFVzZSBpc05hTiB0byBwcmV2ZW50IGZhbHNlIHBvc2l0aXZlcyBmb3IgbnVtYmVycyA8PSAwXG4gICAgICAgIC8vYmFzZWQgb24gdGhlIHBlcmNlbnRhZ2Ugb2YgbW92ZW1lbnQgb2YgdGhlIGhhbmRsZSBiZWluZyBtYW5pcHVsYXRlZCwgbGVzcyB0aGUgb3Bwb3NpbmcgaGFuZGxlJ3MgbGVmdC90b3AgcG9zaXRpb24sIHBsdXMgdGhlIHBlcmNlbnRhZ2Ugdy9oIG9mIHRoZSBoYW5kbGUgaXRzZWxmXG4gICAgICAgIGRpbSA9IG1vdmVtZW50IC0gKGlzTmFOKGhhbmRsZVBvcykgPyAodGhpcy5vcHRpb25zLmluaXRpYWxTdGFydCAtIHRoaXMub3B0aW9ucy5zdGFydCkvKCh0aGlzLm9wdGlvbnMuZW5kLXRoaXMub3B0aW9ucy5zdGFydCkvMTAwKSA6IGhhbmRsZVBvcykgKyBoYW5kbGVQY3Q7XG4gICAgICB9XG4gICAgICAvLyBhc3NpZ24gdGhlIG1pbi1oZWlnaHQvd2lkdGggdG8gb3VyIGNzcyBvYmplY3RcbiAgICAgIGNzc1tgbWluLSR7aE9yV31gXSA9IGAke2RpbX0lYDtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9uZSgnZmluaXNoZWQuemYuYW5pbWF0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgaGFuZGxlIGlzIGRvbmUgbW92aW5nLlxuICAgICAgICAgICAgICAgICAgICAgKiBAZXZlbnQgU2xpZGVyI21vdmVkXG4gICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdtb3ZlZC56Zi5zbGlkZXInLCBbJGhuZGxdKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgIC8vYmVjYXVzZSB3ZSBkb24ndCBrbm93IGV4YWN0bHkgaG93IHRoZSBoYW5kbGUgd2lsbCBiZSBtb3ZlZCwgY2hlY2sgdGhlIGFtb3VudCBvZiB0aW1lIGl0IHNob3VsZCB0YWtlIHRvIG1vdmUuXG4gICAgdmFyIG1vdmVUaW1lID0gdGhpcy4kZWxlbWVudC5kYXRhKCdkcmFnZ2luZycpID8gMTAwMC82MCA6IHRoaXMub3B0aW9ucy5tb3ZlVGltZTtcblxuICAgIEZvdW5kYXRpb24uTW92ZShtb3ZlVGltZSwgJGhuZGwsIGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYWRqdXN0aW5nIHRoZSBsZWZ0L3RvcCBwcm9wZXJ0eSBvZiB0aGUgaGFuZGxlLCBiYXNlZCBvbiB0aGUgcGVyY2VudGFnZSBjYWxjdWxhdGVkIGFib3ZlXG4gICAgICAvLyBpZiBtb3ZlbWVudCBpc05hTiwgdGhhdCBpcyBiZWNhdXNlIHRoZSBzbGlkZXIgaXMgaGlkZGVuIGFuZCB3ZSBjYW5ub3QgZGV0ZXJtaW5lIGhhbmRsZSB3aWR0aCxcbiAgICAgIC8vIGZhbGwgYmFjayB0byBuZXh0IGJlc3QgZ3Vlc3MuXG4gICAgICBpZiAoaXNOYU4obW92ZW1lbnQpKSB7XG4gICAgICAgICRobmRsLmNzcyhsT3JULCBgJHtwY3RPZkJhciAqIDEwMH0lYCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgJGhuZGwuY3NzKGxPclQsIGAke21vdmVtZW50fSVgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFfdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkKSB7XG4gICAgICAgIC8vaWYgc2luZ2xlLWhhbmRsZWQsIGEgc2ltcGxlIG1ldGhvZCB0byBleHBhbmQgdGhlIGZpbGwgYmFyXG4gICAgICAgIF90aGlzLiRmaWxsLmNzcyhoT3JXLCBgJHtwY3RPZkJhciAqIDEwMH0lYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvL290aGVyd2lzZSwgdXNlIHRoZSBjc3Mgb2JqZWN0IHdlIGNyZWF0ZWQgYWJvdmVcbiAgICAgICAgX3RoaXMuJGZpbGwuY3NzKGNzcyk7XG4gICAgICB9XG4gICAgfSk7XG5cblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHZhbHVlIGhhcyBub3QgYmVlbiBjaGFuZ2UgZm9yIGEgZ2l2ZW4gdGltZS5cbiAgICAgKiBAZXZlbnQgU2xpZGVyI2NoYW5nZWRcbiAgICAgKi9cbiAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XG4gICAgX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2NoYW5nZWQuemYuc2xpZGVyJywgWyRobmRsXSk7XG4gICAgfSwgX3RoaXMub3B0aW9ucy5jaGFuZ2VkRGVsYXkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGluaXRpYWwgYXR0cmlidXRlIGZvciB0aGUgc2xpZGVyIGVsZW1lbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge051bWJlcn0gaWR4IC0gaW5kZXggb2YgdGhlIGN1cnJlbnQgaGFuZGxlL2lucHV0IHRvIHVzZS5cbiAgICovXG4gIF9zZXRJbml0QXR0cihpZHgpIHtcbiAgICB2YXIgaW5pdFZhbCA9IChpZHggPT09IDAgPyB0aGlzLm9wdGlvbnMuaW5pdGlhbFN0YXJ0IDogdGhpcy5vcHRpb25zLmluaXRpYWxFbmQpXG4gICAgdmFyIGlkID0gdGhpcy5pbnB1dHMuZXEoaWR4KS5hdHRyKCdpZCcpIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ3NsaWRlcicpO1xuICAgIHRoaXMuaW5wdXRzLmVxKGlkeCkuYXR0cih7XG4gICAgICAnaWQnOiBpZCxcbiAgICAgICdtYXgnOiB0aGlzLm9wdGlvbnMuZW5kLFxuICAgICAgJ21pbic6IHRoaXMub3B0aW9ucy5zdGFydCxcbiAgICAgICdzdGVwJzogdGhpcy5vcHRpb25zLnN0ZXBcbiAgICB9KTtcbiAgICB0aGlzLmlucHV0cy5lcShpZHgpLnZhbChpbml0VmFsKTtcbiAgICB0aGlzLmhhbmRsZXMuZXEoaWR4KS5hdHRyKHtcbiAgICAgICdyb2xlJzogJ3NsaWRlcicsXG4gICAgICAnYXJpYS1jb250cm9scyc6IGlkLFxuICAgICAgJ2FyaWEtdmFsdWVtYXgnOiB0aGlzLm9wdGlvbnMuZW5kLFxuICAgICAgJ2FyaWEtdmFsdWVtaW4nOiB0aGlzLm9wdGlvbnMuc3RhcnQsXG4gICAgICAnYXJpYS12YWx1ZW5vdyc6IGluaXRWYWwsXG4gICAgICAnYXJpYS1vcmllbnRhdGlvbic6IHRoaXMub3B0aW9ucy52ZXJ0aWNhbCA/ICd2ZXJ0aWNhbCcgOiAnaG9yaXpvbnRhbCcsXG4gICAgICAndGFiaW5kZXgnOiAwXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgaW5wdXQgYW5kIGBhcmlhLXZhbHVlbm93YCB2YWx1ZXMgZm9yIHRoZSBzbGlkZXIgZWxlbWVudC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaGFuZGxlIC0gdGhlIGN1cnJlbnRseSBzZWxlY3RlZCBoYW5kbGUuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB2YWwgLSBmbG9hdGluZyBwb2ludCBvZiB0aGUgbmV3IHZhbHVlLlxuICAgKi9cbiAgX3NldFZhbHVlcygkaGFuZGxlLCB2YWwpIHtcbiAgICB2YXIgaWR4ID0gdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkID8gdGhpcy5oYW5kbGVzLmluZGV4KCRoYW5kbGUpIDogMDtcbiAgICB0aGlzLmlucHV0cy5lcShpZHgpLnZhbCh2YWwpO1xuICAgICRoYW5kbGUuYXR0cignYXJpYS12YWx1ZW5vdycsIHZhbCk7XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlcyBldmVudHMgb24gdGhlIHNsaWRlciBlbGVtZW50LlxuICAgKiBDYWxjdWxhdGVzIHRoZSBuZXcgbG9jYXRpb24gb2YgdGhlIGN1cnJlbnQgaGFuZGxlLlxuICAgKiBJZiB0aGVyZSBhcmUgdHdvIGhhbmRsZXMgYW5kIHRoZSBiYXIgd2FzIGNsaWNrZWQsIGl0IGRldGVybWluZXMgd2hpY2ggaGFuZGxlIHRvIG1vdmUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gZSAtIHRoZSBgZXZlbnRgIG9iamVjdCBwYXNzZWQgZnJvbSB0aGUgbGlzdGVuZXIuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaGFuZGxlIC0gdGhlIGN1cnJlbnQgaGFuZGxlIHRvIGNhbGN1bGF0ZSBmb3IsIGlmIHNlbGVjdGVkLlxuICAgKiBAcGFyYW0ge051bWJlcn0gdmFsIC0gZmxvYXRpbmcgcG9pbnQgbnVtYmVyIGZvciB0aGUgbmV3IHZhbHVlIG9mIHRoZSBzbGlkZXIuXG4gICAqIFRPRE8gY2xlYW4gdGhpcyB1cCwgdGhlcmUncyBhIGxvdCBvZiByZXBlYXRlZCBjb2RlIGJldHdlZW4gdGhpcyBhbmQgdGhlIF9zZXRIYW5kbGVQb3MgZm4uXG4gICAqL1xuICBfaGFuZGxlRXZlbnQoZSwgJGhhbmRsZSwgdmFsKSB7XG4gICAgdmFyIHZhbHVlLCBoYXNWYWw7XG4gICAgaWYgKCF2YWwpIHsvL2NsaWNrIG9yIGRyYWcgZXZlbnRzXG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICAgIHZlcnRpY2FsID0gdGhpcy5vcHRpb25zLnZlcnRpY2FsLFxuICAgICAgICAgIHBhcmFtID0gdmVydGljYWwgPyAnaGVpZ2h0JyA6ICd3aWR0aCcsXG4gICAgICAgICAgZGlyZWN0aW9uID0gdmVydGljYWwgPyAndG9wJyA6ICdsZWZ0JyxcbiAgICAgICAgICBldmVudE9mZnNldCA9IHZlcnRpY2FsID8gZS5wYWdlWSA6IGUucGFnZVgsXG4gICAgICAgICAgaGFsZk9mSGFuZGxlID0gdGhpcy4kaGFuZGxlWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpW3BhcmFtXSAvIDIsXG4gICAgICAgICAgYmFyRGltID0gdGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVtwYXJhbV0sXG4gICAgICAgICAgd2luZG93U2Nyb2xsID0gdmVydGljYWwgPyAkKHdpbmRvdykuc2Nyb2xsVG9wKCkgOiAkKHdpbmRvdykuc2Nyb2xsTGVmdCgpO1xuXG5cbiAgICAgIHZhciBlbGVtT2Zmc2V0ID0gdGhpcy4kZWxlbWVudC5vZmZzZXQoKVtkaXJlY3Rpb25dO1xuXG4gICAgICAvLyB0b3VjaCBldmVudHMgZW11bGF0ZWQgYnkgdGhlIHRvdWNoIHV0aWwgZ2l2ZSBwb3NpdGlvbiByZWxhdGl2ZSB0byBzY3JlZW4sIGFkZCB3aW5kb3cuc2Nyb2xsIHRvIGV2ZW50IGNvb3JkaW5hdGVzLi4uXG4gICAgICAvLyBiZXN0IHdheSB0byBndWVzcyB0aGlzIGlzIHNpbXVsYXRlZCBpcyBpZiBjbGllbnRZID09IHBhZ2VZXG4gICAgICBpZiAoZS5jbGllbnRZID09PSBlLnBhZ2VZKSB7IGV2ZW50T2Zmc2V0ID0gZXZlbnRPZmZzZXQgKyB3aW5kb3dTY3JvbGw7IH1cbiAgICAgIHZhciBldmVudEZyb21CYXIgPSBldmVudE9mZnNldCAtIGVsZW1PZmZzZXQ7XG4gICAgICB2YXIgYmFyWFk7XG4gICAgICBpZiAoZXZlbnRGcm9tQmFyIDwgMCkge1xuICAgICAgICBiYXJYWSA9IDA7XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50RnJvbUJhciA+IGJhckRpbSkge1xuICAgICAgICBiYXJYWSA9IGJhckRpbTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJhclhZID0gZXZlbnRGcm9tQmFyO1xuICAgICAgfVxuICAgICAgdmFyIG9mZnNldFBjdCA9IHBlcmNlbnQoYmFyWFksIGJhckRpbSk7XG5cbiAgICAgIHZhbHVlID0gdGhpcy5fdmFsdWUob2Zmc2V0UGN0KTtcblxuICAgICAgLy8gdHVybiBldmVyeXRoaW5nIGFyb3VuZCBmb3IgUlRMLCB5YXkgbWF0aCFcbiAgICAgIGlmIChGb3VuZGF0aW9uLnJ0bCgpICYmICF0aGlzLm9wdGlvbnMudmVydGljYWwpIHt2YWx1ZSA9IHRoaXMub3B0aW9ucy5lbmQgLSB2YWx1ZTt9XG5cbiAgICAgIHZhbHVlID0gX3RoaXMuX2FkanVzdFZhbHVlKG51bGwsIHZhbHVlKTtcbiAgICAgIC8vYm9vbGVhbiBmbGFnIGZvciB0aGUgc2V0SGFuZGxlUG9zIGZuLCBzcGVjaWZpY2FsbHkgZm9yIHZlcnRpY2FsIHNsaWRlcnNcbiAgICAgIGhhc1ZhbCA9IGZhbHNlO1xuXG4gICAgICBpZiAoISRoYW5kbGUpIHsvL2ZpZ3VyZSBvdXQgd2hpY2ggaGFuZGxlIGl0IGlzLCBwYXNzIGl0IHRvIHRoZSBuZXh0IGZ1bmN0aW9uLlxuICAgICAgICB2YXIgZmlyc3RIbmRsUG9zID0gYWJzUG9zaXRpb24odGhpcy4kaGFuZGxlLCBkaXJlY3Rpb24sIGJhclhZLCBwYXJhbSksXG4gICAgICAgICAgICBzZWNuZEhuZGxQb3MgPSBhYnNQb3NpdGlvbih0aGlzLiRoYW5kbGUyLCBkaXJlY3Rpb24sIGJhclhZLCBwYXJhbSk7XG4gICAgICAgICAgICAkaGFuZGxlID0gZmlyc3RIbmRsUG9zIDw9IHNlY25kSG5kbFBvcyA/IHRoaXMuJGhhbmRsZSA6IHRoaXMuJGhhbmRsZTI7XG4gICAgICB9XG5cbiAgICB9IGVsc2Ugey8vY2hhbmdlIGV2ZW50IG9uIGlucHV0XG4gICAgICB2YWx1ZSA9IHRoaXMuX2FkanVzdFZhbHVlKG51bGwsIHZhbCk7XG4gICAgICBoYXNWYWwgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuX3NldEhhbmRsZVBvcygkaGFuZGxlLCB2YWx1ZSwgaGFzVmFsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGp1c3RlcyB2YWx1ZSBmb3IgaGFuZGxlIGluIHJlZ2FyZCB0byBzdGVwIHZhbHVlLiByZXR1cm5zIGFkanVzdGVkIHZhbHVlXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGhhbmRsZSAtIHRoZSBzZWxlY3RlZCBoYW5kbGUuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZSAtIHZhbHVlIHRvIGFkanVzdC4gdXNlZCBpZiAkaGFuZGxlIGlzIGZhbHN5XG4gICAqL1xuICBfYWRqdXN0VmFsdWUoJGhhbmRsZSwgdmFsdWUpIHtcbiAgICB2YXIgdmFsLFxuICAgICAgc3RlcCA9IHRoaXMub3B0aW9ucy5zdGVwLFxuICAgICAgZGl2ID0gcGFyc2VGbG9hdChzdGVwLzIpLFxuICAgICAgbGVmdCwgcHJldl92YWwsIG5leHRfdmFsO1xuICAgIGlmICghISRoYW5kbGUpIHtcbiAgICAgIHZhbCA9IHBhcnNlRmxvYXQoJGhhbmRsZS5hdHRyKCdhcmlhLXZhbHVlbm93JykpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHZhbCA9IHZhbHVlO1xuICAgIH1cbiAgICBsZWZ0ID0gdmFsICUgc3RlcDtcbiAgICBwcmV2X3ZhbCA9IHZhbCAtIGxlZnQ7XG4gICAgbmV4dF92YWwgPSBwcmV2X3ZhbCArIHN0ZXA7XG4gICAgaWYgKGxlZnQgPT09IDApIHtcbiAgICAgIHJldHVybiB2YWw7XG4gICAgfVxuICAgIHZhbCA9IHZhbCA+PSBwcmV2X3ZhbCArIGRpdiA/IG5leHRfdmFsIDogcHJldl92YWw7XG4gICAgcmV0dXJuIHZhbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGxpc3RlbmVycyB0byB0aGUgc2xpZGVyIGVsZW1lbnRzLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdGhpcy5fZXZlbnRzRm9ySGFuZGxlKHRoaXMuJGhhbmRsZSk7XG4gICAgaWYodGhpcy5oYW5kbGVzWzFdKSB7XG4gICAgICB0aGlzLl9ldmVudHNGb3JIYW5kbGUodGhpcy4kaGFuZGxlMik7XG4gICAgfVxuICB9XG5cblxuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lcnMgYSBwYXJ0aWN1bGFyIGhhbmRsZVxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRoYW5kbGUgLSB0aGUgY3VycmVudCBoYW5kbGUgdG8gYXBwbHkgbGlzdGVuZXJzIHRvLlxuICAgKi9cbiAgX2V2ZW50c0ZvckhhbmRsZSgkaGFuZGxlKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgY3VySGFuZGxlLFxuICAgICAgICB0aW1lcjtcblxuICAgICAgdGhpcy5pbnB1dHMub2ZmKCdjaGFuZ2UuemYuc2xpZGVyJykub24oJ2NoYW5nZS56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIHZhciBpZHggPSBfdGhpcy5pbnB1dHMuaW5kZXgoJCh0aGlzKSk7XG4gICAgICAgIF90aGlzLl9oYW5kbGVFdmVudChlLCBfdGhpcy5oYW5kbGVzLmVxKGlkeCksICQodGhpcykudmFsKCkpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuY2xpY2tTZWxlY3QpIHtcbiAgICAgICAgdGhpcy4kZWxlbWVudC5vZmYoJ2NsaWNrLnpmLnNsaWRlcicpLm9uKCdjbGljay56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgaWYgKF90aGlzLiRlbGVtZW50LmRhdGEoJ2RyYWdnaW5nJykpIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgICAgICAgICBpZiAoISQoZS50YXJnZXQpLmlzKCdbZGF0YS1zbGlkZXItaGFuZGxlXScpKSB7XG4gICAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy5kb3VibGVTaWRlZCkge1xuICAgICAgICAgICAgICBfdGhpcy5faGFuZGxlRXZlbnQoZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBfdGhpcy5faGFuZGxlRXZlbnQoZSwgX3RoaXMuJGhhbmRsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZHJhZ2dhYmxlKSB7XG4gICAgICB0aGlzLmhhbmRsZXMuYWRkVG91Y2goKTtcblxuICAgICAgdmFyICRib2R5ID0gJCgnYm9keScpO1xuICAgICAgJGhhbmRsZVxuICAgICAgICAub2ZmKCdtb3VzZWRvd24uemYuc2xpZGVyJylcbiAgICAgICAgLm9uKCdtb3VzZWRvd24uemYuc2xpZGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICRoYW5kbGUuYWRkQ2xhc3MoJ2lzLWRyYWdnaW5nJyk7XG4gICAgICAgICAgX3RoaXMuJGZpbGwuYWRkQ2xhc3MoJ2lzLWRyYWdnaW5nJyk7Ly9cbiAgICAgICAgICBfdGhpcy4kZWxlbWVudC5kYXRhKCdkcmFnZ2luZycsIHRydWUpO1xuXG4gICAgICAgICAgY3VySGFuZGxlID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuXG4gICAgICAgICAgJGJvZHkub24oJ21vdXNlbW92ZS56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBfdGhpcy5faGFuZGxlRXZlbnQoZSwgY3VySGFuZGxlKTtcblxuICAgICAgICAgIH0pLm9uKCdtb3VzZXVwLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIF90aGlzLl9oYW5kbGVFdmVudChlLCBjdXJIYW5kbGUpO1xuXG4gICAgICAgICAgICAkaGFuZGxlLnJlbW92ZUNsYXNzKCdpcy1kcmFnZ2luZycpO1xuICAgICAgICAgICAgX3RoaXMuJGZpbGwucmVtb3ZlQ2xhc3MoJ2lzLWRyYWdnaW5nJyk7XG4gICAgICAgICAgICBfdGhpcy4kZWxlbWVudC5kYXRhKCdkcmFnZ2luZycsIGZhbHNlKTtcblxuICAgICAgICAgICAgJGJvZHkub2ZmKCdtb3VzZW1vdmUuemYuc2xpZGVyIG1vdXNldXAuemYuc2xpZGVyJyk7XG4gICAgICAgICAgfSk7XG4gICAgICB9KVxuICAgICAgLy8gcHJldmVudCBldmVudHMgdHJpZ2dlcmVkIGJ5IHRvdWNoXG4gICAgICAub24oJ3NlbGVjdHN0YXJ0LnpmLnNsaWRlciB0b3VjaG1vdmUuemYuc2xpZGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAkaGFuZGxlLm9mZigna2V5ZG93bi56Zi5zbGlkZXInKS5vbigna2V5ZG93bi56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgXyRoYW5kbGUgPSAkKHRoaXMpLFxuICAgICAgICAgIGlkeCA9IF90aGlzLm9wdGlvbnMuZG91YmxlU2lkZWQgPyBfdGhpcy5oYW5kbGVzLmluZGV4KF8kaGFuZGxlKSA6IDAsXG4gICAgICAgICAgb2xkVmFsdWUgPSBwYXJzZUZsb2F0KF90aGlzLmlucHV0cy5lcShpZHgpLnZhbCgpKSxcbiAgICAgICAgICBuZXdWYWx1ZTtcblxuICAgICAgLy8gaGFuZGxlIGtleWJvYXJkIGV2ZW50IHdpdGgga2V5Ym9hcmQgdXRpbFxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1NsaWRlcicsIHtcbiAgICAgICAgZGVjcmVhc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG5ld1ZhbHVlID0gb2xkVmFsdWUgLSBfdGhpcy5vcHRpb25zLnN0ZXA7XG4gICAgICAgIH0sXG4gICAgICAgIGluY3JlYXNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBuZXdWYWx1ZSA9IG9sZFZhbHVlICsgX3RoaXMub3B0aW9ucy5zdGVwO1xuICAgICAgICB9LFxuICAgICAgICBkZWNyZWFzZV9mYXN0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBuZXdWYWx1ZSA9IG9sZFZhbHVlIC0gX3RoaXMub3B0aW9ucy5zdGVwICogMTA7XG4gICAgICAgIH0sXG4gICAgICAgIGluY3JlYXNlX2Zhc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG5ld1ZhbHVlID0gb2xkVmFsdWUgKyBfdGhpcy5vcHRpb25zLnN0ZXAgKiAxMDtcbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7IC8vIG9ubHkgc2V0IGhhbmRsZSBwb3Mgd2hlbiBldmVudCB3YXMgaGFuZGxlZCBzcGVjaWFsbHlcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMuX3NldEhhbmRsZVBvcyhfJGhhbmRsZSwgbmV3VmFsdWUsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8qaWYgKG5ld1ZhbHVlKSB7IC8vIGlmIHByZXNzZWQga2V5IGhhcyBzcGVjaWFsIGZ1bmN0aW9uLCB1cGRhdGUgdmFsdWVcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBfdGhpcy5fc2V0SGFuZGxlUG9zKF8kaGFuZGxlLCBuZXdWYWx1ZSk7XG4gICAgICB9Ki9cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgc2xpZGVyIHBsdWdpbi5cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5oYW5kbGVzLm9mZignLnpmLnNsaWRlcicpO1xuICAgIHRoaXMuaW5wdXRzLm9mZignLnpmLnNsaWRlcicpO1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYuc2xpZGVyJyk7XG5cbiAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0KTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5TbGlkZXIuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBNaW5pbXVtIHZhbHVlIGZvciB0aGUgc2xpZGVyIHNjYWxlLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDBcbiAgICovXG4gIHN0YXJ0OiAwLFxuICAvKipcbiAgICogTWF4aW11bSB2YWx1ZSBmb3IgdGhlIHNsaWRlciBzY2FsZS5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAxMDBcbiAgICovXG4gIGVuZDogMTAwLFxuICAvKipcbiAgICogTWluaW11bSB2YWx1ZSBjaGFuZ2UgcGVyIGNoYW5nZSBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAxXG4gICAqL1xuICBzdGVwOiAxLFxuICAvKipcbiAgICogVmFsdWUgYXQgd2hpY2ggdGhlIGhhbmRsZS9pbnB1dCAqKGxlZnQgaGFuZGxlL2ZpcnN0IGlucHV0KSogc2hvdWxkIGJlIHNldCB0byBvbiBpbml0aWFsaXphdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAwXG4gICAqL1xuICBpbml0aWFsU3RhcnQ6IDAsXG4gIC8qKlxuICAgKiBWYWx1ZSBhdCB3aGljaCB0aGUgcmlnaHQgaGFuZGxlL3NlY29uZCBpbnB1dCBzaG91bGQgYmUgc2V0IHRvIG9uIGluaXRpYWxpemF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDEwMFxuICAgKi9cbiAgaW5pdGlhbEVuZDogMTAwLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBpbnB1dCB0byBiZSBsb2NhdGVkIG91dHNpZGUgdGhlIGNvbnRhaW5lciBhbmQgdmlzaWJsZS4gU2V0IHRvIGJ5IHRoZSBKU1xuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgYmluZGluZzogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHVzZXIgdG8gY2xpY2svdGFwIG9uIHRoZSBzbGlkZXIgYmFyIHRvIHNlbGVjdCBhIHZhbHVlLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICBjbGlja1NlbGVjdDogdHJ1ZSxcbiAgLyoqXG4gICAqIFNldCB0byB0cnVlIGFuZCB1c2UgdGhlIGB2ZXJ0aWNhbGAgY2xhc3MgdG8gY2hhbmdlIGFsaWdubWVudCB0byB2ZXJ0aWNhbC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHZlcnRpY2FsOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgdXNlciB0byBkcmFnIHRoZSBzbGlkZXIgaGFuZGxlKHMpIHRvIHNlbGVjdCBhIHZhbHVlLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICBkcmFnZ2FibGU6IHRydWUsXG4gIC8qKlxuICAgKiBEaXNhYmxlcyB0aGUgc2xpZGVyIGFuZCBwcmV2ZW50cyBldmVudCBsaXN0ZW5lcnMgZnJvbSBiZWluZyBhcHBsaWVkLiBEb3VibGUgY2hlY2tlZCBieSBKUyB3aXRoIGBkaXNhYmxlZENsYXNzYC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGRpc2FibGVkOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgdXNlIG9mIHR3byBoYW5kbGVzLiBEb3VibGUgY2hlY2tlZCBieSB0aGUgSlMuIENoYW5nZXMgc29tZSBsb2dpYyBoYW5kbGluZy5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGRvdWJsZVNpZGVkOiBmYWxzZSxcbiAgLyoqXG4gICAqIFBvdGVudGlhbCBmdXR1cmUgZmVhdHVyZS5cbiAgICovXG4gIC8vIHN0ZXBzOiAxMDAsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgZGVjaW1hbCBwbGFjZXMgdGhlIHBsdWdpbiBzaG91bGQgZ28gdG8gZm9yIGZsb2F0aW5nIHBvaW50IHByZWNpc2lvbi5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAyXG4gICAqL1xuICBkZWNpbWFsOiAyLFxuICAvKipcbiAgICogVGltZSBkZWxheSBmb3IgZHJhZ2dlZCBlbGVtZW50cy5cbiAgICovXG4gIC8vIGRyYWdEZWxheTogMCxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCB0byBhbmltYXRlIHRoZSBtb3ZlbWVudCBvZiBhIHNsaWRlciBoYW5kbGUgaWYgdXNlciBjbGlja3MvdGFwcyBvbiB0aGUgYmFyLiBOZWVkcyB0byBiZSBtYW51YWxseSBzZXQgaWYgdXBkYXRpbmcgdGhlIHRyYW5zaXRpb24gdGltZSBpbiB0aGUgU2FzcyBzZXR0aW5ncy5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAyMDBcbiAgICovXG4gIG1vdmVUaW1lOiAyMDAsLy91cGRhdGUgdGhpcyBpZiBjaGFuZ2luZyB0aGUgdHJhbnNpdGlvbiB0aW1lIGluIHRoZSBzYXNzXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIGRpc2FibGVkIHNsaWRlcnMuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ2Rpc2FibGVkJ1xuICAgKi9cbiAgZGlzYWJsZWRDbGFzczogJ2Rpc2FibGVkJyxcbiAgLyoqXG4gICAqIFdpbGwgaW52ZXJ0IHRoZSBkZWZhdWx0IGxheW91dCBmb3IgYSB2ZXJ0aWNhbDxzcGFuIGRhdGEtdG9vbHRpcCB0aXRsZT1cIndobyB3b3VsZCBkbyB0aGlzPz8/XCI+IDwvc3Bhbj5zbGlkZXIuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBpbnZlcnRWZXJ0aWNhbDogZmFsc2UsXG4gIC8qKlxuICAgKiBNaWxsaXNlY29uZHMgYmVmb3JlIHRoZSBgY2hhbmdlZC56Zi1zbGlkZXJgIGV2ZW50IGlzIHRyaWdnZXJlZCBhZnRlciB2YWx1ZSBjaGFuZ2UuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcn1cbiAgICogQGRlZmF1bHQgNTAwXG4gICAqL1xuICBjaGFuZ2VkRGVsYXk6IDUwMCxcbiAgLyoqXG4gICogQmFzZXZhbHVlIGZvciBub24tbGluZWFyIHNsaWRlcnNcbiAgKiBAb3B0aW9uXG4gICogQHR5cGUge251bWJlcn1cbiAgKiBAZGVmYXVsdCA1XG4gICovXG4gIG5vbkxpbmVhckJhc2U6IDUsXG4gIC8qKlxuICAqIEJhc2V2YWx1ZSBmb3Igbm9uLWxpbmVhciBzbGlkZXJzLCBwb3NzaWJsZSB2YWx1ZXMgYXJlOiBgJ2xpbmVhcidgLCBgJ3BvdydgICYgYCdsb2cnYC4gUG93IGFuZCBMb2cgdXNlIHRoZSBub25MaW5lYXJCYXNlIHNldHRpbmcuXG4gICogQG9wdGlvblxuICAqIEB0eXBlIHtzdHJpbmd9XG4gICogQGRlZmF1bHQgJ2xpbmVhcidcbiAgKi9cbiAgcG9zaXRpb25WYWx1ZUZ1bmN0aW9uOiAnbGluZWFyJyxcbn07XG5cbmZ1bmN0aW9uIHBlcmNlbnQoZnJhYywgbnVtKSB7XG4gIHJldHVybiAoZnJhYyAvIG51bSk7XG59XG5mdW5jdGlvbiBhYnNQb3NpdGlvbigkaGFuZGxlLCBkaXIsIGNsaWNrUG9zLCBwYXJhbSkge1xuICByZXR1cm4gTWF0aC5hYnMoKCRoYW5kbGUucG9zaXRpb24oKVtkaXJdICsgKCRoYW5kbGVbcGFyYW1dKCkgLyAyKSkgLSBjbGlja1Bvcyk7XG59XG5mdW5jdGlvbiBiYXNlTG9nKGJhc2UsIHZhbHVlKSB7XG4gIHJldHVybiBNYXRoLmxvZyh2YWx1ZSkvTWF0aC5sb2coYmFzZSlcbn1cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFNsaWRlciwgJ1NsaWRlcicpO1xuXG59KGpRdWVyeSk7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBTdGlja3kgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnN0aWNreVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKi9cblxuY2xhc3MgU3RpY2t5IHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBzdGlja3kgdGhpbmcuXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBzdGlja3kuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gb3B0aW9ucyBvYmplY3QgcGFzc2VkIHdoZW4gY3JlYXRpbmcgdGhlIGVsZW1lbnQgcHJvZ3JhbW1hdGljYWxseS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgU3RpY2t5LmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdTdGlja3knKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgc3RpY2t5IGVsZW1lbnQgYnkgYWRkaW5nIGNsYXNzZXMsIGdldHRpbmcvc2V0dGluZyBkaW1lbnNpb25zLCBicmVha3BvaW50cyBhbmQgYXR0cmlidXRlc1xuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciAkcGFyZW50ID0gdGhpcy4kZWxlbWVudC5wYXJlbnQoJ1tkYXRhLXN0aWNreS1jb250YWluZXJdJyksXG4gICAgICAgIGlkID0gdGhpcy4kZWxlbWVudFswXS5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdzdGlja3knKSxcbiAgICAgICAgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYgKCEkcGFyZW50Lmxlbmd0aCkge1xuICAgICAgdGhpcy53YXNXcmFwcGVkID0gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy4kY29udGFpbmVyID0gJHBhcmVudC5sZW5ndGggPyAkcGFyZW50IDogJCh0aGlzLm9wdGlvbnMuY29udGFpbmVyKS53cmFwSW5uZXIodGhpcy4kZWxlbWVudCk7XG4gICAgdGhpcy4kY29udGFpbmVyLmFkZENsYXNzKHRoaXMub3B0aW9ucy5jb250YWluZXJDbGFzcyk7XG5cbiAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKHRoaXMub3B0aW9ucy5zdGlja3lDbGFzcykuYXR0cih7ICdkYXRhLXJlc2l6ZSc6IGlkLCAnZGF0YS1tdXRhdGUnOiBpZCB9KTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmFuY2hvciAhPT0gJycpIHtcbiAgICAgICAgJCgnIycgKyBfdGhpcy5vcHRpb25zLmFuY2hvcikuYXR0cih7ICdkYXRhLW11dGF0ZSc6IGlkIH0pO1xuICAgIH1cblxuICAgIHRoaXMuc2Nyb2xsQ291bnQgPSB0aGlzLm9wdGlvbnMuY2hlY2tFdmVyeTtcbiAgICB0aGlzLmlzU3R1Y2sgPSBmYWxzZTtcbiAgICAkKHdpbmRvdykub25lKCdsb2FkLnpmLnN0aWNreScsIGZ1bmN0aW9uKCl7XG4gICAgICAvL1dlIGNhbGN1bGF0ZSB0aGUgY29udGFpbmVyIGhlaWdodCB0byBoYXZlIGNvcnJlY3QgdmFsdWVzIGZvciBhbmNob3IgcG9pbnRzIG9mZnNldCBjYWxjdWxhdGlvbi5cbiAgICAgIF90aGlzLmNvbnRhaW5lckhlaWdodCA9IF90aGlzLiRlbGVtZW50LmNzcyhcImRpc3BsYXlcIikgPT0gXCJub25lXCIgPyAwIDogX3RoaXMuJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICAgX3RoaXMuJGNvbnRhaW5lci5jc3MoJ2hlaWdodCcsIF90aGlzLmNvbnRhaW5lckhlaWdodCk7XG4gICAgICBfdGhpcy5lbGVtSGVpZ2h0ID0gX3RoaXMuY29udGFpbmVySGVpZ2h0O1xuICAgICAgaWYoX3RoaXMub3B0aW9ucy5hbmNob3IgIT09ICcnKXtcbiAgICAgICAgX3RoaXMuJGFuY2hvciA9ICQoJyMnICsgX3RoaXMub3B0aW9ucy5hbmNob3IpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIF90aGlzLl9wYXJzZVBvaW50cygpO1xuICAgICAgfVxuXG4gICAgICBfdGhpcy5fc2V0U2l6ZXMoZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNjcm9sbCA9IHdpbmRvdy5wYWdlWU9mZnNldDtcbiAgICAgICAgX3RoaXMuX2NhbGMoZmFsc2UsIHNjcm9sbCk7XG4gICAgICAgIC8vVW5zdGljayB0aGUgZWxlbWVudCB3aWxsIGVuc3VyZSB0aGF0IHByb3BlciBjbGFzc2VzIGFyZSBzZXQuXG4gICAgICAgIGlmICghX3RoaXMuaXNTdHVjaykge1xuICAgICAgICAgIF90aGlzLl9yZW1vdmVTdGlja3koKHNjcm9sbCA+PSBfdGhpcy50b3BQb2ludCkgPyBmYWxzZSA6IHRydWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIF90aGlzLl9ldmVudHMoaWQuc3BsaXQoJy0nKS5yZXZlcnNlKCkuam9pbignLScpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJZiB1c2luZyBtdWx0aXBsZSBlbGVtZW50cyBhcyBhbmNob3JzLCBjYWxjdWxhdGVzIHRoZSB0b3AgYW5kIGJvdHRvbSBwaXhlbCB2YWx1ZXMgdGhlIHN0aWNreSB0aGluZyBzaG91bGQgc3RpY2sgYW5kIHVuc3RpY2sgb24uXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3BhcnNlUG9pbnRzKCkge1xuICAgIHZhciB0b3AgPSB0aGlzLm9wdGlvbnMudG9wQW5jaG9yID09IFwiXCIgPyAxIDogdGhpcy5vcHRpb25zLnRvcEFuY2hvcixcbiAgICAgICAgYnRtID0gdGhpcy5vcHRpb25zLmJ0bUFuY2hvcj09IFwiXCIgPyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsSGVpZ2h0IDogdGhpcy5vcHRpb25zLmJ0bUFuY2hvcixcbiAgICAgICAgcHRzID0gW3RvcCwgYnRtXSxcbiAgICAgICAgYnJlYWtzID0ge307XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHB0cy5sZW5ndGg7IGkgPCBsZW4gJiYgcHRzW2ldOyBpKyspIHtcbiAgICAgIHZhciBwdDtcbiAgICAgIGlmICh0eXBlb2YgcHRzW2ldID09PSAnbnVtYmVyJykge1xuICAgICAgICBwdCA9IHB0c1tpXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwbGFjZSA9IHB0c1tpXS5zcGxpdCgnOicpLFxuICAgICAgICAgICAgYW5jaG9yID0gJChgIyR7cGxhY2VbMF19YCk7XG5cbiAgICAgICAgcHQgPSBhbmNob3Iub2Zmc2V0KCkudG9wO1xuICAgICAgICBpZiAocGxhY2VbMV0gJiYgcGxhY2VbMV0udG9Mb3dlckNhc2UoKSA9PT0gJ2JvdHRvbScpIHtcbiAgICAgICAgICBwdCArPSBhbmNob3JbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBicmVha3NbaV0gPSBwdDtcbiAgICB9XG5cblxuICAgIHRoaXMucG9pbnRzID0gYnJlYWtzO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciB0aGUgc2Nyb2xsaW5nIGVsZW1lbnQuXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBpZCAtIHBzdWVkby1yYW5kb20gaWQgZm9yIHVuaXF1ZSBzY3JvbGwgZXZlbnQgbGlzdGVuZXIuXG4gICAqL1xuICBfZXZlbnRzKGlkKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgc2Nyb2xsTGlzdGVuZXIgPSB0aGlzLnNjcm9sbExpc3RlbmVyID0gYHNjcm9sbC56Zi4ke2lkfWA7XG4gICAgaWYgKHRoaXMuaXNPbikgeyByZXR1cm47IH1cbiAgICBpZiAodGhpcy5jYW5TdGljaykge1xuICAgICAgdGhpcy5pc09uID0gdHJ1ZTtcbiAgICAgICQod2luZG93KS5vZmYoc2Nyb2xsTGlzdGVuZXIpXG4gICAgICAgICAgICAgICAub24oc2Nyb2xsTGlzdGVuZXIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgaWYgKF90aGlzLnNjcm9sbENvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgX3RoaXMuc2Nyb2xsQ291bnQgPSBfdGhpcy5vcHRpb25zLmNoZWNrRXZlcnk7XG4gICAgICAgICAgICAgICAgICAgX3RoaXMuX3NldFNpemVzKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX2NhbGMoZmFsc2UsIHdpbmRvdy5wYWdlWU9mZnNldCk7XG4gICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgX3RoaXMuc2Nyb2xsQ291bnQtLTtcbiAgICAgICAgICAgICAgICAgICBfdGhpcy5fY2FsYyhmYWxzZSwgd2luZG93LnBhZ2VZT2Zmc2V0KTtcbiAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9mZigncmVzaXplbWUuemYudHJpZ2dlcicpXG4gICAgICAgICAgICAgICAgIC5vbigncmVzaXplbWUuemYudHJpZ2dlcicsIGZ1bmN0aW9uKGUsIGVsKSB7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLl9ldmVudHNIYW5kbGVyKGlkKTtcbiAgICB9KTtcblxuICAgIHRoaXMuJGVsZW1lbnQub24oJ211dGF0ZW1lLnpmLnRyaWdnZXInLCBmdW5jdGlvbiAoZSwgZWwpIHtcbiAgICAgICAgX3RoaXMuX2V2ZW50c0hhbmRsZXIoaWQpO1xuICAgIH0pO1xuXG4gICAgaWYodGhpcy4kYW5jaG9yKSB7XG4gICAgICB0aGlzLiRhbmNob3Iub24oJ211dGF0ZW1lLnpmLnRyaWdnZXInLCBmdW5jdGlvbiAoZSwgZWwpIHtcbiAgICAgICAgICBfdGhpcy5fZXZlbnRzSGFuZGxlcihpZCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlciBmb3IgZXZlbnRzLlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gaWQgLSBwc3VlZG8tcmFuZG9tIGlkIGZvciB1bmlxdWUgc2Nyb2xsIGV2ZW50IGxpc3RlbmVyLlxuICAgKi9cbiAgX2V2ZW50c0hhbmRsZXIoaWQpIHtcbiAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICBzY3JvbGxMaXN0ZW5lciA9IHRoaXMuc2Nyb2xsTGlzdGVuZXIgPSBgc2Nyb2xsLnpmLiR7aWR9YDtcblxuICAgICAgIF90aGlzLl9zZXRTaXplcyhmdW5jdGlvbigpIHtcbiAgICAgICBfdGhpcy5fY2FsYyhmYWxzZSk7XG4gICAgICAgaWYgKF90aGlzLmNhblN0aWNrKSB7XG4gICAgICAgICBpZiAoIV90aGlzLmlzT24pIHtcbiAgICAgICAgICAgX3RoaXMuX2V2ZW50cyhpZCk7XG4gICAgICAgICB9XG4gICAgICAgfSBlbHNlIGlmIChfdGhpcy5pc09uKSB7XG4gICAgICAgICBfdGhpcy5fcGF1c2VMaXN0ZW5lcnMoc2Nyb2xsTGlzdGVuZXIpO1xuICAgICAgIH1cbiAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBldmVudCBoYW5kbGVycyBmb3Igc2Nyb2xsIGFuZCBjaGFuZ2UgZXZlbnRzIG9uIGFuY2hvci5cbiAgICogQGZpcmVzIFN0aWNreSNwYXVzZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2Nyb2xsTGlzdGVuZXIgLSB1bmlxdWUsIG5hbWVzcGFjZWQgc2Nyb2xsIGxpc3RlbmVyIGF0dGFjaGVkIHRvIGB3aW5kb3dgXG4gICAqL1xuICBfcGF1c2VMaXN0ZW5lcnMoc2Nyb2xsTGlzdGVuZXIpIHtcbiAgICB0aGlzLmlzT24gPSBmYWxzZTtcbiAgICAkKHdpbmRvdykub2ZmKHNjcm9sbExpc3RlbmVyKTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBpcyBwYXVzZWQgZHVlIHRvIHJlc2l6ZSBldmVudCBzaHJpbmtpbmcgdGhlIHZpZXcuXG4gICAgICogQGV2ZW50IFN0aWNreSNwYXVzZVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncGF1c2UuemYuc3RpY2t5Jyk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIG9uIGV2ZXJ5IGBzY3JvbGxgIGV2ZW50IGFuZCBvbiBgX2luaXRgXG4gICAqIGZpcmVzIGZ1bmN0aW9ucyBiYXNlZCBvbiBib29sZWFucyBhbmQgY2FjaGVkIHZhbHVlc1xuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGNoZWNrU2l6ZXMgLSB0cnVlIGlmIHBsdWdpbiBzaG91bGQgcmVjYWxjdWxhdGUgc2l6ZXMgYW5kIGJyZWFrcG9pbnRzLlxuICAgKiBAcGFyYW0ge051bWJlcn0gc2Nyb2xsIC0gY3VycmVudCBzY3JvbGwgcG9zaXRpb24gcGFzc2VkIGZyb20gc2Nyb2xsIGV2ZW50IGNiIGZ1bmN0aW9uLiBJZiBub3QgcGFzc2VkLCBkZWZhdWx0cyB0byBgd2luZG93LnBhZ2VZT2Zmc2V0YC5cbiAgICovXG4gIF9jYWxjKGNoZWNrU2l6ZXMsIHNjcm9sbCkge1xuICAgIGlmIChjaGVja1NpemVzKSB7IHRoaXMuX3NldFNpemVzKCk7IH1cblxuICAgIGlmICghdGhpcy5jYW5TdGljaykge1xuICAgICAgaWYgKHRoaXMuaXNTdHVjaykge1xuICAgICAgICB0aGlzLl9yZW1vdmVTdGlja3kodHJ1ZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFzY3JvbGwpIHsgc2Nyb2xsID0gd2luZG93LnBhZ2VZT2Zmc2V0OyB9XG5cbiAgICBpZiAoc2Nyb2xsID49IHRoaXMudG9wUG9pbnQpIHtcbiAgICAgIGlmIChzY3JvbGwgPD0gdGhpcy5ib3R0b21Qb2ludCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNTdHVjaykge1xuICAgICAgICAgIHRoaXMuX3NldFN0aWNreSgpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5pc1N0dWNrKSB7XG4gICAgICAgICAgdGhpcy5fcmVtb3ZlU3RpY2t5KGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5pc1N0dWNrKSB7XG4gICAgICAgIHRoaXMuX3JlbW92ZVN0aWNreSh0cnVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2F1c2VzIHRoZSAkZWxlbWVudCB0byBiZWNvbWUgc3R1Y2suXG4gICAqIEFkZHMgYHBvc2l0aW9uOiBmaXhlZDtgLCBhbmQgaGVscGVyIGNsYXNzZXMuXG4gICAqIEBmaXJlcyBTdGlja3kjc3R1Y2t0b1xuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRTdGlja3koKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgc3RpY2tUbyA9IHRoaXMub3B0aW9ucy5zdGlja1RvLFxuICAgICAgICBtcmduID0gc3RpY2tUbyA9PT0gJ3RvcCcgPyAnbWFyZ2luVG9wJyA6ICdtYXJnaW5Cb3R0b20nLFxuICAgICAgICBub3RTdHVja1RvID0gc3RpY2tUbyA9PT0gJ3RvcCcgPyAnYm90dG9tJyA6ICd0b3AnLFxuICAgICAgICBjc3MgPSB7fTtcblxuICAgIGNzc1ttcmduXSA9IGAke3RoaXMub3B0aW9uc1ttcmduXX1lbWA7XG4gICAgY3NzW3N0aWNrVG9dID0gMDtcbiAgICBjc3Nbbm90U3R1Y2tUb10gPSAnYXV0byc7XG4gICAgdGhpcy5pc1N0dWNrID0gdHJ1ZTtcbiAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKGBpcy1hbmNob3JlZCBpcy1hdC0ke25vdFN0dWNrVG99YClcbiAgICAgICAgICAgICAgICAgLmFkZENsYXNzKGBpcy1zdHVjayBpcy1hdC0ke3N0aWNrVG99YClcbiAgICAgICAgICAgICAgICAgLmNzcyhjc3MpXG4gICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSAkZWxlbWVudCBoYXMgYmVjb21lIGBwb3NpdGlvbjogZml4ZWQ7YFxuICAgICAgICAgICAgICAgICAgKiBOYW1lc3BhY2VkIHRvIGB0b3BgIG9yIGBib3R0b21gLCBlLmcuIGBzdGlja3kuemYuc3R1Y2t0bzp0b3BgXG4gICAgICAgICAgICAgICAgICAqIEBldmVudCBTdGlja3kjc3R1Y2t0b1xuICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgLnRyaWdnZXIoYHN0aWNreS56Zi5zdHVja3RvOiR7c3RpY2tUb31gKTtcbiAgICB0aGlzLiRlbGVtZW50Lm9uKFwidHJhbnNpdGlvbmVuZCB3ZWJraXRUcmFuc2l0aW9uRW5kIG9UcmFuc2l0aW9uRW5kIG90cmFuc2l0aW9uZW5kIE1TVHJhbnNpdGlvbkVuZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgIF90aGlzLl9zZXRTaXplcygpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENhdXNlcyB0aGUgJGVsZW1lbnQgdG8gYmVjb21lIHVuc3R1Y2suXG4gICAqIFJlbW92ZXMgYHBvc2l0aW9uOiBmaXhlZDtgLCBhbmQgaGVscGVyIGNsYXNzZXMuXG4gICAqIEFkZHMgb3RoZXIgaGVscGVyIGNsYXNzZXMuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNUb3AgLSB0ZWxscyB0aGUgZnVuY3Rpb24gaWYgdGhlICRlbGVtZW50IHNob3VsZCBhbmNob3IgdG8gdGhlIHRvcCBvciBib3R0b20gb2YgaXRzICRhbmNob3IgZWxlbWVudC5cbiAgICogQGZpcmVzIFN0aWNreSN1bnN0dWNrZnJvbVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlbW92ZVN0aWNreShpc1RvcCkge1xuICAgIHZhciBzdGlja1RvID0gdGhpcy5vcHRpb25zLnN0aWNrVG8sXG4gICAgICAgIHN0aWNrVG9Ub3AgPSBzdGlja1RvID09PSAndG9wJyxcbiAgICAgICAgY3NzID0ge30sXG4gICAgICAgIGFuY2hvclB0ID0gKHRoaXMucG9pbnRzID8gdGhpcy5wb2ludHNbMV0gLSB0aGlzLnBvaW50c1swXSA6IHRoaXMuYW5jaG9ySGVpZ2h0KSAtIHRoaXMuZWxlbUhlaWdodCxcbiAgICAgICAgbXJnbiA9IHN0aWNrVG9Ub3AgPyAnbWFyZ2luVG9wJyA6ICdtYXJnaW5Cb3R0b20nLFxuICAgICAgICBub3RTdHVja1RvID0gc3RpY2tUb1RvcCA/ICdib3R0b20nIDogJ3RvcCcsXG4gICAgICAgIHRvcE9yQm90dG9tID0gaXNUb3AgPyAndG9wJyA6ICdib3R0b20nO1xuXG4gICAgY3NzW21yZ25dID0gMDtcblxuICAgIGNzc1snYm90dG9tJ10gPSAnYXV0byc7XG4gICAgaWYoaXNUb3ApIHtcbiAgICAgIGNzc1sndG9wJ10gPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICBjc3NbJ3RvcCddID0gYW5jaG9yUHQ7XG4gICAgfVxuXG4gICAgdGhpcy5pc1N0dWNrID0gZmFsc2U7XG4gICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhgaXMtc3R1Y2sgaXMtYXQtJHtzdGlja1RvfWApXG4gICAgICAgICAgICAgICAgIC5hZGRDbGFzcyhgaXMtYW5jaG9yZWQgaXMtYXQtJHt0b3BPckJvdHRvbX1gKVxuICAgICAgICAgICAgICAgICAuY3NzKGNzcylcbiAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlICRlbGVtZW50IGhhcyBiZWNvbWUgYW5jaG9yZWQuXG4gICAgICAgICAgICAgICAgICAqIE5hbWVzcGFjZWQgdG8gYHRvcGAgb3IgYGJvdHRvbWAsIGUuZy4gYHN0aWNreS56Zi51bnN0dWNrZnJvbTpib3R0b21gXG4gICAgICAgICAgICAgICAgICAqIEBldmVudCBTdGlja3kjdW5zdHVja2Zyb21cbiAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgIC50cmlnZ2VyKGBzdGlja3kuemYudW5zdHVja2Zyb206JHt0b3BPckJvdHRvbX1gKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSAkZWxlbWVudCBhbmQgJGNvbnRhaW5lciBzaXplcyBmb3IgcGx1Z2luLlxuICAgKiBDYWxscyBgX3NldEJyZWFrUG9pbnRzYC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBvcHRpb25hbCBjYWxsYmFjayBmdW5jdGlvbiB0byBmaXJlIG9uIGNvbXBsZXRpb24gb2YgYF9zZXRCcmVha1BvaW50c2AuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0U2l6ZXMoY2IpIHtcbiAgICB0aGlzLmNhblN0aWNrID0gRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmlzKHRoaXMub3B0aW9ucy5zdGlja3lPbik7XG4gICAgaWYgKCF0aGlzLmNhblN0aWNrKSB7XG4gICAgICBpZiAoY2IgJiYgdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7IGNiKCk7IH1cbiAgICB9XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgbmV3RWxlbVdpZHRoID0gdGhpcy4kY29udGFpbmVyWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoLFxuICAgICAgICBjb21wID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy4kY29udGFpbmVyWzBdKSxcbiAgICAgICAgcGRuZ2wgPSBwYXJzZUludChjb21wWydwYWRkaW5nLWxlZnQnXSwgMTApLFxuICAgICAgICBwZG5nciA9IHBhcnNlSW50KGNvbXBbJ3BhZGRpbmctcmlnaHQnXSwgMTApO1xuXG4gICAgaWYgKHRoaXMuJGFuY2hvciAmJiB0aGlzLiRhbmNob3IubGVuZ3RoKSB7XG4gICAgICB0aGlzLmFuY2hvckhlaWdodCA9IHRoaXMuJGFuY2hvclswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3BhcnNlUG9pbnRzKCk7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5jc3Moe1xuICAgICAgJ21heC13aWR0aCc6IGAke25ld0VsZW1XaWR0aCAtIHBkbmdsIC0gcGRuZ3J9cHhgXG4gICAgfSk7XG5cbiAgICB2YXIgbmV3Q29udGFpbmVySGVpZ2h0ID0gdGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQgfHwgdGhpcy5jb250YWluZXJIZWlnaHQ7XG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuY3NzKFwiZGlzcGxheVwiKSA9PSBcIm5vbmVcIikge1xuICAgICAgbmV3Q29udGFpbmVySGVpZ2h0ID0gMDtcbiAgICB9XG4gICAgdGhpcy5jb250YWluZXJIZWlnaHQgPSBuZXdDb250YWluZXJIZWlnaHQ7XG4gICAgdGhpcy4kY29udGFpbmVyLmNzcyh7XG4gICAgICBoZWlnaHQ6IG5ld0NvbnRhaW5lckhlaWdodFxuICAgIH0pO1xuICAgIHRoaXMuZWxlbUhlaWdodCA9IG5ld0NvbnRhaW5lckhlaWdodDtcblxuICAgIGlmICghdGhpcy5pc1N0dWNrKSB7XG4gICAgICBpZiAodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtYXQtYm90dG9tJykpIHtcbiAgICAgICAgdmFyIGFuY2hvclB0ID0gKHRoaXMucG9pbnRzID8gdGhpcy5wb2ludHNbMV0gLSB0aGlzLiRjb250YWluZXIub2Zmc2V0KCkudG9wIDogdGhpcy5hbmNob3JIZWlnaHQpIC0gdGhpcy5lbGVtSGVpZ2h0O1xuICAgICAgICB0aGlzLiRlbGVtZW50LmNzcygndG9wJywgYW5jaG9yUHQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX3NldEJyZWFrUG9pbnRzKG5ld0NvbnRhaW5lckhlaWdodCwgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoY2IgJiYgdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7IGNiKCk7IH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSB1cHBlciBhbmQgbG93ZXIgYnJlYWtwb2ludHMgZm9yIHRoZSBlbGVtZW50IHRvIGJlY29tZSBzdGlja3kvdW5zdGlja3kuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBlbGVtSGVpZ2h0IC0gcHggdmFsdWUgZm9yIHN0aWNreS4kZWxlbWVudCBoZWlnaHQsIGNhbGN1bGF0ZWQgYnkgYF9zZXRTaXplc2AuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gb3B0aW9uYWwgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIG9uIGNvbXBsZXRpb24uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0QnJlYWtQb2ludHMoZWxlbUhlaWdodCwgY2IpIHtcbiAgICBpZiAoIXRoaXMuY2FuU3RpY2spIHtcbiAgICAgIGlmIChjYiAmJiB0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpIHsgY2IoKTsgfVxuICAgICAgZWxzZSB7IHJldHVybiBmYWxzZTsgfVxuICAgIH1cbiAgICB2YXIgbVRvcCA9IGVtQ2FsYyh0aGlzLm9wdGlvbnMubWFyZ2luVG9wKSxcbiAgICAgICAgbUJ0bSA9IGVtQ2FsYyh0aGlzLm9wdGlvbnMubWFyZ2luQm90dG9tKSxcbiAgICAgICAgdG9wUG9pbnQgPSB0aGlzLnBvaW50cyA/IHRoaXMucG9pbnRzWzBdIDogdGhpcy4kYW5jaG9yLm9mZnNldCgpLnRvcCxcbiAgICAgICAgYm90dG9tUG9pbnQgPSB0aGlzLnBvaW50cyA/IHRoaXMucG9pbnRzWzFdIDogdG9wUG9pbnQgKyB0aGlzLmFuY2hvckhlaWdodCxcbiAgICAgICAgLy8gdG9wUG9pbnQgPSB0aGlzLiRhbmNob3Iub2Zmc2V0KCkudG9wIHx8IHRoaXMucG9pbnRzWzBdLFxuICAgICAgICAvLyBib3R0b21Qb2ludCA9IHRvcFBvaW50ICsgdGhpcy5hbmNob3JIZWlnaHQgfHwgdGhpcy5wb2ludHNbMV0sXG4gICAgICAgIHdpbkhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RpY2tUbyA9PT0gJ3RvcCcpIHtcbiAgICAgIHRvcFBvaW50IC09IG1Ub3A7XG4gICAgICBib3R0b21Qb2ludCAtPSAoZWxlbUhlaWdodCArIG1Ub3ApO1xuICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLnN0aWNrVG8gPT09ICdib3R0b20nKSB7XG4gICAgICB0b3BQb2ludCAtPSAod2luSGVpZ2h0IC0gKGVsZW1IZWlnaHQgKyBtQnRtKSk7XG4gICAgICBib3R0b21Qb2ludCAtPSAod2luSGVpZ2h0IC0gbUJ0bSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vdGhpcyB3b3VsZCBiZSB0aGUgc3RpY2tUbzogYm90aCBvcHRpb24uLi4gdHJpY2t5XG4gICAgfVxuXG4gICAgdGhpcy50b3BQb2ludCA9IHRvcFBvaW50O1xuICAgIHRoaXMuYm90dG9tUG9pbnQgPSBib3R0b21Qb2ludDtcblxuICAgIGlmIChjYiAmJiB0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpIHsgY2IoKTsgfVxuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBjdXJyZW50IHN0aWNreSBlbGVtZW50LlxuICAgKiBSZXNldHMgdGhlIGVsZW1lbnQgdG8gdGhlIHRvcCBwb3NpdGlvbiBmaXJzdC5cbiAgICogUmVtb3ZlcyBldmVudCBsaXN0ZW5lcnMsIEpTLWFkZGVkIGNzcyBwcm9wZXJ0aWVzIGFuZCBjbGFzc2VzLCBhbmQgdW53cmFwcyB0aGUgJGVsZW1lbnQgaWYgdGhlIEpTIGFkZGVkIHRoZSAkY29udGFpbmVyLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5fcmVtb3ZlU3RpY2t5KHRydWUpO1xuXG4gICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhgJHt0aGlzLm9wdGlvbnMuc3RpY2t5Q2xhc3N9IGlzLWFuY2hvcmVkIGlzLWF0LXRvcGApXG4gICAgICAgICAgICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgICAgICAgIGhlaWdodDogJycsXG4gICAgICAgICAgICAgICAgICAgdG9wOiAnJyxcbiAgICAgICAgICAgICAgICAgICBib3R0b206ICcnLFxuICAgICAgICAgICAgICAgICAgICdtYXgtd2lkdGgnOiAnJ1xuICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAub2ZmKCdyZXNpemVtZS56Zi50cmlnZ2VyJylcbiAgICAgICAgICAgICAgICAgLm9mZignbXV0YXRlbWUuemYudHJpZ2dlcicpO1xuICAgIGlmICh0aGlzLiRhbmNob3IgJiYgdGhpcy4kYW5jaG9yLmxlbmd0aCkge1xuICAgICAgdGhpcy4kYW5jaG9yLm9mZignY2hhbmdlLnpmLnN0aWNreScpO1xuICAgIH1cbiAgICAkKHdpbmRvdykub2ZmKHRoaXMuc2Nyb2xsTGlzdGVuZXIpO1xuXG4gICAgaWYgKHRoaXMud2FzV3JhcHBlZCkge1xuICAgICAgdGhpcy4kZWxlbWVudC51bndyYXAoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kY29udGFpbmVyLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5jb250YWluZXJDbGFzcylcbiAgICAgICAgICAgICAgICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICcnXG4gICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICB9XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblN0aWNreS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEN1c3RvbWl6YWJsZSBjb250YWluZXIgdGVtcGxhdGUuIEFkZCB5b3VyIG93biBjbGFzc2VzIGZvciBzdHlsaW5nIGFuZCBzaXppbmcuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJyZsdDtkaXYgZGF0YS1zdGlja3ktY29udGFpbmVyJmd0OyZsdDsvZGl2Jmd0OydcbiAgICovXG4gIGNvbnRhaW5lcjogJzxkaXYgZGF0YS1zdGlja3ktY29udGFpbmVyPjwvZGl2PicsXG4gIC8qKlxuICAgKiBMb2NhdGlvbiBpbiB0aGUgdmlldyB0aGUgZWxlbWVudCBzdGlja3MgdG8uIENhbiBiZSBgJ3RvcCdgIG9yIGAnYm90dG9tJ2AuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ3RvcCdcbiAgICovXG4gIHN0aWNrVG86ICd0b3AnLFxuICAvKipcbiAgICogSWYgYW5jaG9yZWQgdG8gYSBzaW5nbGUgZWxlbWVudCwgdGhlIGlkIG9mIHRoYXQgZWxlbWVudC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnJ1xuICAgKi9cbiAgYW5jaG9yOiAnJyxcbiAgLyoqXG4gICAqIElmIHVzaW5nIG1vcmUgdGhhbiBvbmUgZWxlbWVudCBhcyBhbmNob3IgcG9pbnRzLCB0aGUgaWQgb2YgdGhlIHRvcCBhbmNob3IuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJydcbiAgICovXG4gIHRvcEFuY2hvcjogJycsXG4gIC8qKlxuICAgKiBJZiB1c2luZyBtb3JlIHRoYW4gb25lIGVsZW1lbnQgYXMgYW5jaG9yIHBvaW50cywgdGhlIGlkIG9mIHRoZSBib3R0b20gYW5jaG9yLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICcnXG4gICAqL1xuICBidG1BbmNob3I6ICcnLFxuICAvKipcbiAgICogTWFyZ2luLCBpbiBgZW1gJ3MgdG8gYXBwbHkgdG8gdGhlIHRvcCBvZiB0aGUgZWxlbWVudCB3aGVuIGl0IGJlY29tZXMgc3RpY2t5LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDFcbiAgICovXG4gIG1hcmdpblRvcDogMSxcbiAgLyoqXG4gICAqIE1hcmdpbiwgaW4gYGVtYCdzIHRvIGFwcGx5IHRvIHRoZSBib3R0b20gb2YgdGhlIGVsZW1lbnQgd2hlbiBpdCBiZWNvbWVzIHN0aWNreS5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAxXG4gICAqL1xuICBtYXJnaW5Cb3R0b206IDEsXG4gIC8qKlxuICAgKiBCcmVha3BvaW50IHN0cmluZyB0aGF0IGlzIHRoZSBtaW5pbXVtIHNjcmVlbiBzaXplIGFuIGVsZW1lbnQgc2hvdWxkIGJlY29tZSBzdGlja3kuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ21lZGl1bSdcbiAgICovXG4gIHN0aWNreU9uOiAnbWVkaXVtJyxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gc3RpY2t5IGVsZW1lbnQsIGFuZCByZW1vdmVkIG9uIGRlc3RydWN0aW9uLiBGb3VuZGF0aW9uIGRlZmF1bHRzIHRvIGBzdGlja3lgLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICdzdGlja3knXG4gICAqL1xuICBzdGlja3lDbGFzczogJ3N0aWNreScsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHN0aWNreSBjb250YWluZXIuIEZvdW5kYXRpb24gZGVmYXVsdHMgdG8gYHN0aWNreS1jb250YWluZXJgLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICdzdGlja3ktY29udGFpbmVyJ1xuICAgKi9cbiAgY29udGFpbmVyQ2xhc3M6ICdzdGlja3ktY29udGFpbmVyJyxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBzY3JvbGwgZXZlbnRzIGJldHdlZW4gdGhlIHBsdWdpbidzIHJlY2FsY3VsYXRpbmcgc3RpY2t5IHBvaW50cy4gU2V0dGluZyBpdCB0byBgMGAgd2lsbCBjYXVzZSBpdCB0byByZWNhbGMgZXZlcnkgc2Nyb2xsIGV2ZW50LCBzZXR0aW5nIGl0IHRvIGAtMWAgd2lsbCBwcmV2ZW50IHJlY2FsYyBvbiBzY3JvbGwuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcn1cbiAgICogQGRlZmF1bHQgLTFcbiAgICovXG4gIGNoZWNrRXZlcnk6IC0xXG59O1xuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiB0byBjYWxjdWxhdGUgZW0gdmFsdWVzXG4gKiBAcGFyYW0gTnVtYmVyIHtlbX0gLSBudW1iZXIgb2YgZW0ncyB0byBjYWxjdWxhdGUgaW50byBwaXhlbHNcbiAqL1xuZnVuY3Rpb24gZW1DYWxjKGVtKSB7XG4gIHJldHVybiBwYXJzZUludCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5ib2R5LCBudWxsKS5mb250U2l6ZSwgMTApICogZW07XG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihTdGlja3ksICdTdGlja3knKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFRhYnMgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnRhYnNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlciBpZiB0YWJzIGNvbnRhaW4gaW1hZ2VzXG4gKi9cblxuY2xhc3MgVGFicyB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIHRhYnMuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgVGFicyNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gdGFicy5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBUYWJzLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnVGFicycpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ1RhYnMnLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXG4gICAgICAnQVJST1dfVVAnOiAncHJldmlvdXMnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnbmV4dCcsXG4gICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cydcbiAgICAgIC8vICdUQUInOiAnbmV4dCcsXG4gICAgICAvLyAnU0hJRlRfVEFCJzogJ3ByZXZpb3VzJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSB0YWJzIGJ5IHNob3dpbmcgYW5kIGZvY3VzaW5nIChpZiBhdXRvRm9jdXM9dHJ1ZSkgdGhlIHByZXNldCBhY3RpdmUgdGFiLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7J3JvbGUnOiAndGFibGlzdCd9KTtcbiAgICB0aGlzLiR0YWJUaXRsZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9YCk7XG4gICAgdGhpcy4kdGFiQ29udGVudCA9ICQoYFtkYXRhLXRhYnMtY29udGVudD1cIiR7dGhpcy4kZWxlbWVudFswXS5pZH1cIl1gKTtcblxuICAgIHRoaXMuJHRhYlRpdGxlcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICRsaW5rID0gJGVsZW0uZmluZCgnYScpLFxuICAgICAgICAgIGlzQWN0aXZlID0gJGVsZW0uaGFzQ2xhc3MoYCR7X3RoaXMub3B0aW9ucy5saW5rQWN0aXZlQ2xhc3N9YCksXG4gICAgICAgICAgaGFzaCA9ICRsaW5rWzBdLmhhc2guc2xpY2UoMSksXG4gICAgICAgICAgbGlua0lkID0gJGxpbmtbMF0uaWQgPyAkbGlua1swXS5pZCA6IGAke2hhc2h9LWxhYmVsYCxcbiAgICAgICAgICAkdGFiQ29udGVudCA9ICQoYCMke2hhc2h9YCk7XG5cbiAgICAgICRlbGVtLmF0dHIoeydyb2xlJzogJ3ByZXNlbnRhdGlvbid9KTtcblxuICAgICAgJGxpbmsuYXR0cih7XG4gICAgICAgICdyb2xlJzogJ3RhYicsXG4gICAgICAgICdhcmlhLWNvbnRyb2xzJzogaGFzaCxcbiAgICAgICAgJ2FyaWEtc2VsZWN0ZWQnOiBpc0FjdGl2ZSxcbiAgICAgICAgJ2lkJzogbGlua0lkXG4gICAgICB9KTtcblxuICAgICAgJHRhYkNvbnRlbnQuYXR0cih7XG4gICAgICAgICdyb2xlJzogJ3RhYnBhbmVsJyxcbiAgICAgICAgJ2FyaWEtaGlkZGVuJzogIWlzQWN0aXZlLFxuICAgICAgICAnYXJpYS1sYWJlbGxlZGJ5JzogbGlua0lkXG4gICAgICB9KTtcblxuICAgICAgaWYoaXNBY3RpdmUgJiYgX3RoaXMub3B0aW9ucy5hdXRvRm9jdXMpe1xuICAgICAgICAkKHdpbmRvdykubG9hZChmdW5jdGlvbigpIHtcbiAgICAgICAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7IHNjcm9sbFRvcDogJGVsZW0ub2Zmc2V0KCkudG9wIH0sIF90aGlzLm9wdGlvbnMuZGVlcExpbmtTbXVkZ2VEZWxheSwgKCkgPT4ge1xuICAgICAgICAgICAgJGxpbmsuZm9jdXMoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYodGhpcy5vcHRpb25zLm1hdGNoSGVpZ2h0KSB7XG4gICAgICB2YXIgJGltYWdlcyA9IHRoaXMuJHRhYkNvbnRlbnQuZmluZCgnaW1nJyk7XG5cbiAgICAgIGlmICgkaW1hZ2VzLmxlbmd0aCkge1xuICAgICAgICBGb3VuZGF0aW9uLm9uSW1hZ2VzTG9hZGVkKCRpbWFnZXMsIHRoaXMuX3NldEhlaWdodC5iaW5kKHRoaXMpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3NldEhlaWdodCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgICAvL2N1cnJlbnQgY29udGV4dC1ib3VuZCBmdW5jdGlvbiB0byBvcGVuIHRhYnMgb24gcGFnZSBsb2FkIG9yIGhpc3RvcnkgcG9wc3RhdGVcbiAgICB0aGlzLl9jaGVja0RlZXBMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIGFuY2hvciA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoO1xuICAgICAgLy9uZWVkIGEgaGFzaCBhbmQgYSByZWxldmFudCBhbmNob3IgaW4gdGhpcyB0YWJzZXRcbiAgICAgIGlmKGFuY2hvci5sZW5ndGgpIHtcbiAgICAgICAgdmFyICRsaW5rID0gdGhpcy4kZWxlbWVudC5maW5kKCdbaHJlZiQ9XCInK2FuY2hvcisnXCJdJyk7XG4gICAgICAgIGlmICgkbGluay5sZW5ndGgpIHtcbiAgICAgICAgICB0aGlzLnNlbGVjdFRhYigkKGFuY2hvciksIHRydWUpO1xuXG4gICAgICAgICAgLy9yb2xsIHVwIGEgbGl0dGxlIHRvIHNob3cgdGhlIHRpdGxlc1xuICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGVlcExpbmtTbXVkZ2UpIHtcbiAgICAgICAgICAgIHZhciBvZmZzZXQgPSB0aGlzLiRlbGVtZW50Lm9mZnNldCgpO1xuICAgICAgICAgICAgJCgnaHRtbCwgYm9keScpLmFuaW1hdGUoeyBzY3JvbGxUb3A6IG9mZnNldC50b3AgfSwgdGhpcy5vcHRpb25zLmRlZXBMaW5rU211ZGdlRGVsYXkpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8qKlxuICAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSB6cGx1Z2luIGhhcyBkZWVwbGlua2VkIGF0IHBhZ2Vsb2FkXG4gICAgICAgICAgICAqIEBldmVudCBUYWJzI2RlZXBsaW5rXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2RlZXBsaW5rLnpmLnRhYnMnLCBbJGxpbmssICQoYW5jaG9yKV0pO1xuICAgICAgICAgfVxuICAgICAgIH1cbiAgICAgfVxuXG4gICAgLy91c2UgYnJvd3NlciB0byBvcGVuIGEgdGFiLCBpZiBpdCBleGlzdHMgaW4gdGhpcyB0YWJzZXRcbiAgICBpZiAodGhpcy5vcHRpb25zLmRlZXBMaW5rKSB7XG4gICAgICB0aGlzLl9jaGVja0RlZXBMaW5rKCk7XG4gICAgfVxuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyBmb3IgaXRlbXMgd2l0aGluIHRoZSB0YWJzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB0aGlzLl9hZGRLZXlIYW5kbGVyKCk7XG4gICAgdGhpcy5fYWRkQ2xpY2tIYW5kbGVyKCk7XG4gICAgdGhpcy5fc2V0SGVpZ2h0TXFIYW5kbGVyID0gbnVsbDtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMubWF0Y2hIZWlnaHQpIHtcbiAgICAgIHRoaXMuX3NldEhlaWdodE1xSGFuZGxlciA9IHRoaXMuX3NldEhlaWdodC5iaW5kKHRoaXMpO1xuXG4gICAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX3NldEhlaWdodE1xSGFuZGxlcik7XG4gICAgfVxuXG4gICAgaWYodGhpcy5vcHRpb25zLmRlZXBMaW5rKSB7XG4gICAgICAkKHdpbmRvdykub24oJ3BvcHN0YXRlJywgdGhpcy5fY2hlY2tEZWVwTGluayk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgY2xpY2sgaGFuZGxlcnMgZm9yIGl0ZW1zIHdpdGhpbiB0aGUgdGFicy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRDbGlja0hhbmRsZXIoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5vZmYoJ2NsaWNrLnpmLnRhYnMnKVxuICAgICAgLm9uKCdjbGljay56Zi50YWJzJywgYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9YCwgZnVuY3Rpb24oZSl7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgX3RoaXMuX2hhbmRsZVRhYkNoYW5nZSgkKHRoaXMpKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMga2V5Ym9hcmQgZXZlbnQgaGFuZGxlcnMgZm9yIGl0ZW1zIHdpdGhpbiB0aGUgdGFicy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRLZXlIYW5kbGVyKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiR0YWJUaXRsZXMub2ZmKCdrZXlkb3duLnpmLnRhYnMnKS5vbigna2V5ZG93bi56Zi50YWJzJywgZnVuY3Rpb24oZSl7XG4gICAgICBpZiAoZS53aGljaCA9PT0gOSkgcmV0dXJuO1xuXG5cbiAgICAgIHZhciAkZWxlbWVudCA9ICQodGhpcyksXG4gICAgICAgICRlbGVtZW50cyA9ICRlbGVtZW50LnBhcmVudCgndWwnKS5jaGlsZHJlbignbGknKSxcbiAgICAgICAgJHByZXZFbGVtZW50LFxuICAgICAgICAkbmV4dEVsZW1lbnQ7XG5cbiAgICAgICRlbGVtZW50cy5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgaWYgKCQodGhpcykuaXMoJGVsZW1lbnQpKSB7XG4gICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMud3JhcE9uS2V5cykge1xuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gaSA9PT0gMCA/ICRlbGVtZW50cy5sYXN0KCkgOiAkZWxlbWVudHMuZXEoaS0xKTtcbiAgICAgICAgICAgICRuZXh0RWxlbWVudCA9IGkgPT09ICRlbGVtZW50cy5sZW5ndGggLTEgPyAkZWxlbWVudHMuZmlyc3QoKSA6ICRlbGVtZW50cy5lcShpKzEpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5tYXgoMCwgaS0xKSk7XG4gICAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5taW4oaSsxLCAkZWxlbWVudHMubGVuZ3RoLTEpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gaGFuZGxlIGtleWJvYXJkIGV2ZW50IHdpdGgga2V5Ym9hcmQgdXRpbFxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1RhYnMnLCB7XG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRlbGVtZW50LmZpbmQoJ1tyb2xlPVwidGFiXCJdJykuZm9jdXMoKTtcbiAgICAgICAgICBfdGhpcy5faGFuZGxlVGFiQ2hhbmdlKCRlbGVtZW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgcHJldmlvdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRwcmV2RWxlbWVudC5maW5kKCdbcm9sZT1cInRhYlwiXScpLmZvY3VzKCk7XG4gICAgICAgICAgX3RoaXMuX2hhbmRsZVRhYkNoYW5nZSgkcHJldkVsZW1lbnQpO1xuICAgICAgICB9LFxuICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuZmluZCgnW3JvbGU9XCJ0YWJcIl0nKS5mb2N1cygpO1xuICAgICAgICAgIF90aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJG5leHRFbGVtZW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSB0YWIgYCR0YXJnZXRDb250ZW50YCBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC4gQ29sbGFwc2VzIGFjdGl2ZSB0YWIuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gVGFiIHRvIG9wZW4uXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gaGlzdG9yeUhhbmRsZWQgLSBicm93c2VyIGhhcyBhbHJlYWR5IGhhbmRsZWQgYSBoaXN0b3J5IHVwZGF0ZVxuICAgKiBAZmlyZXMgVGFicyNjaGFuZ2VcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfaGFuZGxlVGFiQ2hhbmdlKCR0YXJnZXQsIGhpc3RvcnlIYW5kbGVkKSB7XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBmb3IgYWN0aXZlIGNsYXNzIG9uIHRhcmdldC4gQ29sbGFwc2UgaWYgZXhpc3RzLlxuICAgICAqL1xuICAgIGlmICgkdGFyZ2V0Lmhhc0NsYXNzKGAke3RoaXMub3B0aW9ucy5saW5rQWN0aXZlQ2xhc3N9YCkpIHtcbiAgICAgICAgaWYodGhpcy5vcHRpb25zLmFjdGl2ZUNvbGxhcHNlKSB7XG4gICAgICAgICAgICB0aGlzLl9jb2xsYXBzZVRhYigkdGFyZ2V0KTtcblxuICAgICAgICAgICAvKipcbiAgICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgenBsdWdpbiBoYXMgc3VjY2Vzc2Z1bGx5IGNvbGxhcHNlZCB0YWJzLlxuICAgICAgICAgICAgKiBAZXZlbnQgVGFicyNjb2xsYXBzZVxuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignY29sbGFwc2UuemYudGFicycsIFskdGFyZ2V0XSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciAkb2xkVGFiID0gdGhpcy4kZWxlbWVudC5cbiAgICAgICAgICBmaW5kKGAuJHt0aGlzLm9wdGlvbnMubGlua0NsYXNzfS4ke3RoaXMub3B0aW9ucy5saW5rQWN0aXZlQ2xhc3N9YCksXG4gICAgICAgICAgJHRhYkxpbmsgPSAkdGFyZ2V0LmZpbmQoJ1tyb2xlPVwidGFiXCJdJyksXG4gICAgICAgICAgaGFzaCA9ICR0YWJMaW5rWzBdLmhhc2gsXG4gICAgICAgICAgJHRhcmdldENvbnRlbnQgPSB0aGlzLiR0YWJDb250ZW50LmZpbmQoaGFzaCk7XG5cbiAgICAvL2Nsb3NlIG9sZCB0YWJcbiAgICB0aGlzLl9jb2xsYXBzZVRhYigkb2xkVGFiKTtcblxuICAgIC8vb3BlbiBuZXcgdGFiXG4gICAgdGhpcy5fb3BlblRhYigkdGFyZ2V0KTtcblxuICAgIC8vZWl0aGVyIHJlcGxhY2Ugb3IgdXBkYXRlIGJyb3dzZXIgaGlzdG9yeVxuICAgIGlmICh0aGlzLm9wdGlvbnMuZGVlcExpbmsgJiYgIWhpc3RvcnlIYW5kbGVkKSB7XG4gICAgICB2YXIgYW5jaG9yID0gJHRhcmdldC5maW5kKCdhJykuYXR0cignaHJlZicpO1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnVwZGF0ZUhpc3RvcnkpIHtcbiAgICAgICAgaGlzdG9yeS5wdXNoU3RhdGUoe30sICcnLCBhbmNob3IpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUoe30sICcnLCBhbmNob3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBoYXMgc3VjY2Vzc2Z1bGx5IGNoYW5nZWQgdGFicy5cbiAgICAgKiBAZXZlbnQgVGFicyNjaGFuZ2VcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2NoYW5nZS56Zi50YWJzJywgWyR0YXJnZXQsICR0YXJnZXRDb250ZW50XSk7XG5cbiAgICAvL2ZpcmUgdG8gY2hpbGRyZW4gYSBtdXRhdGlvbiBldmVudFxuICAgICR0YXJnZXRDb250ZW50LmZpbmQoXCJbZGF0YS1tdXRhdGVdXCIpLnRyaWdnZXIoXCJtdXRhdGVtZS56Zi50cmlnZ2VyXCIpO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSB0YWIgYCR0YXJnZXRDb250ZW50YCBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBUYWIgdG8gT3Blbi5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfb3BlblRhYigkdGFyZ2V0KSB7XG4gICAgICB2YXIgJHRhYkxpbmsgPSAkdGFyZ2V0LmZpbmQoJ1tyb2xlPVwidGFiXCJdJyksXG4gICAgICAgICAgaGFzaCA9ICR0YWJMaW5rWzBdLmhhc2gsXG4gICAgICAgICAgJHRhcmdldENvbnRlbnQgPSB0aGlzLiR0YWJDb250ZW50LmZpbmQoaGFzaCk7XG5cbiAgICAgICR0YXJnZXQuYWRkQ2xhc3MoYCR7dGhpcy5vcHRpb25zLmxpbmtBY3RpdmVDbGFzc31gKTtcblxuICAgICAgJHRhYkxpbmsuYXR0cih7J2FyaWEtc2VsZWN0ZWQnOiAndHJ1ZSd9KTtcblxuICAgICAgJHRhcmdldENvbnRlbnRcbiAgICAgICAgLmFkZENsYXNzKGAke3RoaXMub3B0aW9ucy5wYW5lbEFjdGl2ZUNsYXNzfWApXG4gICAgICAgIC5hdHRyKHsnYXJpYS1oaWRkZW4nOiAnZmFsc2UnfSk7XG4gIH1cblxuICAvKipcbiAgICogQ29sbGFwc2VzIGAkdGFyZ2V0Q29udGVudGAgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gVGFiIHRvIE9wZW4uXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgX2NvbGxhcHNlVGFiKCR0YXJnZXQpIHtcbiAgICB2YXIgJHRhcmdldF9hbmNob3IgPSAkdGFyZ2V0XG4gICAgICAucmVtb3ZlQ2xhc3MoYCR7dGhpcy5vcHRpb25zLmxpbmtBY3RpdmVDbGFzc31gKVxuICAgICAgLmZpbmQoJ1tyb2xlPVwidGFiXCJdJylcbiAgICAgIC5hdHRyKHsgJ2FyaWEtc2VsZWN0ZWQnOiAnZmFsc2UnIH0pO1xuXG4gICAgJChgIyR7JHRhcmdldF9hbmNob3IuYXR0cignYXJpYS1jb250cm9scycpfWApXG4gICAgICAucmVtb3ZlQ2xhc3MoYCR7dGhpcy5vcHRpb25zLnBhbmVsQWN0aXZlQ2xhc3N9YClcbiAgICAgIC5hdHRyKHsgJ2FyaWEtaGlkZGVuJzogJ3RydWUnIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYyBtZXRob2QgZm9yIHNlbGVjdGluZyBhIGNvbnRlbnQgcGFuZSB0byBkaXNwbGF5LlxuICAgKiBAcGFyYW0ge2pRdWVyeSB8IFN0cmluZ30gZWxlbSAtIGpRdWVyeSBvYmplY3Qgb3Igc3RyaW5nIG9mIHRoZSBpZCBvZiB0aGUgcGFuZSB0byBkaXNwbGF5LlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IGhpc3RvcnlIYW5kbGVkIC0gYnJvd3NlciBoYXMgYWxyZWFkeSBoYW5kbGVkIGEgaGlzdG9yeSB1cGRhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBzZWxlY3RUYWIoZWxlbSwgaGlzdG9yeUhhbmRsZWQpIHtcbiAgICB2YXIgaWRTdHI7XG5cbiAgICBpZiAodHlwZW9mIGVsZW0gPT09ICdvYmplY3QnKSB7XG4gICAgICBpZFN0ciA9IGVsZW1bMF0uaWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlkU3RyID0gZWxlbTtcbiAgICB9XG5cbiAgICBpZiAoaWRTdHIuaW5kZXhPZignIycpIDwgMCkge1xuICAgICAgaWRTdHIgPSBgIyR7aWRTdHJ9YDtcbiAgICB9XG5cbiAgICB2YXIgJHRhcmdldCA9IHRoaXMuJHRhYlRpdGxlcy5maW5kKGBbaHJlZiQ9XCIke2lkU3RyfVwiXWApLnBhcmVudChgLiR7dGhpcy5vcHRpb25zLmxpbmtDbGFzc31gKTtcblxuICAgIHRoaXMuX2hhbmRsZVRhYkNoYW5nZSgkdGFyZ2V0LCBoaXN0b3J5SGFuZGxlZCk7XG4gIH07XG4gIC8qKlxuICAgKiBTZXRzIHRoZSBoZWlnaHQgb2YgZWFjaCBwYW5lbCB0byB0aGUgaGVpZ2h0IG9mIHRoZSB0YWxsZXN0IHBhbmVsLlxuICAgKiBJZiBlbmFibGVkIGluIG9wdGlvbnMsIGdldHMgY2FsbGVkIG9uIG1lZGlhIHF1ZXJ5IGNoYW5nZS5cbiAgICogSWYgbG9hZGluZyBjb250ZW50IHZpYSBleHRlcm5hbCBzb3VyY2UsIGNhbiBiZSBjYWxsZWQgZGlyZWN0bHkgb3Igd2l0aCBfcmVmbG93LlxuICAgKiBJZiBlbmFibGVkIHdpdGggYGRhdGEtbWF0Y2gtaGVpZ2h0PVwidHJ1ZVwiYCwgdGFicyBzZXRzIHRvIGVxdWFsIGhlaWdodFxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRIZWlnaHQoKSB7XG4gICAgdmFyIG1heCA9IDAsXG4gICAgICAgIF90aGlzID0gdGhpczsgLy8gTG9jayBkb3duIHRoZSBgdGhpc2AgdmFsdWUgZm9yIHRoZSByb290IHRhYnMgb2JqZWN0XG5cbiAgICB0aGlzLiR0YWJDb250ZW50XG4gICAgICAuZmluZChgLiR7dGhpcy5vcHRpb25zLnBhbmVsQ2xhc3N9YClcbiAgICAgIC5jc3MoJ2hlaWdodCcsICcnKVxuICAgICAgLmVhY2goZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIHBhbmVsID0gJCh0aGlzKSxcbiAgICAgICAgICAgIGlzQWN0aXZlID0gcGFuZWwuaGFzQ2xhc3MoYCR7X3RoaXMub3B0aW9ucy5wYW5lbEFjdGl2ZUNsYXNzfWApOyAvLyBnZXQgdGhlIG9wdGlvbnMgZnJvbSB0aGUgcGFyZW50IGluc3RlYWQgb2YgdHJ5aW5nIHRvIGdldCB0aGVtIGZyb20gdGhlIGNoaWxkXG5cbiAgICAgICAgaWYgKCFpc0FjdGl2ZSkge1xuICAgICAgICAgIHBhbmVsLmNzcyh7J3Zpc2liaWxpdHknOiAnaGlkZGVuJywgJ2Rpc3BsYXknOiAnYmxvY2snfSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdGVtcCA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuXG4gICAgICAgIGlmICghaXNBY3RpdmUpIHtcbiAgICAgICAgICBwYW5lbC5jc3Moe1xuICAgICAgICAgICAgJ3Zpc2liaWxpdHknOiAnJyxcbiAgICAgICAgICAgICdkaXNwbGF5JzogJydcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1heCA9IHRlbXAgPiBtYXggPyB0ZW1wIDogbWF4O1xuICAgICAgfSlcbiAgICAgIC5jc3MoJ2hlaWdodCcsIGAke21heH1weGApO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIGFuIHRhYnMuXG4gICAqIEBmaXJlcyBUYWJzI2Rlc3Ryb3llZFxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAuZmluZChgLiR7dGhpcy5vcHRpb25zLmxpbmtDbGFzc31gKVxuICAgICAgLm9mZignLnpmLnRhYnMnKS5oaWRlKCkuZW5kKClcbiAgICAgIC5maW5kKGAuJHt0aGlzLm9wdGlvbnMucGFuZWxDbGFzc31gKVxuICAgICAgLmhpZGUoKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMubWF0Y2hIZWlnaHQpIHtcbiAgICAgIGlmICh0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIgIT0gbnVsbCkge1xuICAgICAgICAgJCh3aW5kb3cpLm9mZignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgdGhpcy5fc2V0SGVpZ2h0TXFIYW5kbGVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmRlZXBMaW5rKSB7XG4gICAgICAkKHdpbmRvdykub2ZmKCdwb3BzdGF0ZScsIHRoaXMuX2NoZWNrRGVlcExpbmspO1xuICAgIH1cblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5UYWJzLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQWxsb3dzIHRoZSB3aW5kb3cgdG8gc2Nyb2xsIHRvIGNvbnRlbnQgb2YgcGFuZSBzcGVjaWZpZWQgYnkgaGFzaCBhbmNob3JcbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGRlZXBMaW5rOiBmYWxzZSxcblxuICAvKipcbiAgICogQWRqdXN0IHRoZSBkZWVwIGxpbmsgc2Nyb2xsIHRvIG1ha2Ugc3VyZSB0aGUgdG9wIG9mIHRoZSB0YWIgcGFuZWwgaXMgdmlzaWJsZVxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgZGVlcExpbmtTbXVkZ2U6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBBbmltYXRpb24gdGltZSAobXMpIGZvciB0aGUgZGVlcCBsaW5rIGFkanVzdG1lbnRcbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAzMDBcbiAgICovXG4gIGRlZXBMaW5rU211ZGdlRGVsYXk6IDMwMCxcblxuICAvKipcbiAgICogVXBkYXRlIHRoZSBicm93c2VyIGhpc3Rvcnkgd2l0aCB0aGUgb3BlbiB0YWJcbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHVwZGF0ZUhpc3Rvcnk6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHdpbmRvdyB0byBzY3JvbGwgdG8gY29udGVudCBvZiBhY3RpdmUgcGFuZSBvbiBsb2FkIGlmIHNldCB0byB0cnVlLlxuICAgKiBOb3QgcmVjb21tZW5kZWQgaWYgbW9yZSB0aGFuIG9uZSB0YWIgcGFuZWwgcGVyIHBhZ2UuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBhdXRvRm9jdXM6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBBbGxvd3Mga2V5Ym9hcmQgaW5wdXQgdG8gJ3dyYXAnIGFyb3VuZCB0aGUgdGFiIGxpbmtzLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICB3cmFwT25LZXlzOiB0cnVlLFxuXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHRhYiBjb250ZW50IHBhbmVzIHRvIG1hdGNoIGhlaWdodHMgaWYgc2V0IHRvIHRydWUuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBtYXRjaEhlaWdodDogZmFsc2UsXG5cbiAgLyoqXG4gICAqIEFsbG93cyBhY3RpdmUgdGFicyB0byBjb2xsYXBzZSB3aGVuIGNsaWNrZWQuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBhY3RpdmVDb2xsYXBzZTogZmFsc2UsXG5cbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gYGxpYCdzIGluIHRhYiBsaW5rIGxpc3QuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ3RhYnMtdGl0bGUnXG4gICAqL1xuICBsaW5rQ2xhc3M6ICd0YWJzLXRpdGxlJyxcblxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYWN0aXZlIGBsaWAgaW4gdGFiIGxpbmsgbGlzdC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnaXMtYWN0aXZlJ1xuICAgKi9cbiAgbGlua0FjdGl2ZUNsYXNzOiAnaXMtYWN0aXZlJyxcblxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byB0aGUgY29udGVudCBjb250YWluZXJzLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICd0YWJzLXBhbmVsJ1xuICAgKi9cbiAgcGFuZWxDbGFzczogJ3RhYnMtcGFuZWwnLFxuXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBhY3RpdmUgY29udGVudCBjb250YWluZXIuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ2lzLWFjdGl2ZSdcbiAgICovXG4gIHBhbmVsQWN0aXZlQ2xhc3M6ICdpcy1hY3RpdmUnXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oVGFicywgJ1RhYnMnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFRvZ2dsZXIgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnRvZ2dsZXJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKi9cblxuY2xhc3MgVG9nZ2xlciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIFRvZ2dsZXIuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgVG9nZ2xlciNpbml0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIHRyaWdnZXIgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgVG9nZ2xlci5kZWZhdWx0cywgZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuICAgIHRoaXMuY2xhc3NOYW1lID0gJyc7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdUb2dnbGVyJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIFRvZ2dsZXIgcGx1Z2luIGJ5IHBhcnNpbmcgdGhlIHRvZ2dsZSBjbGFzcyBmcm9tIGRhdGEtdG9nZ2xlciwgb3IgYW5pbWF0aW9uIGNsYXNzZXMgZnJvbSBkYXRhLWFuaW1hdGUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIGlucHV0O1xuICAgIC8vIFBhcnNlIGFuaW1hdGlvbiBjbGFzc2VzIGlmIHRoZXkgd2VyZSBzZXRcbiAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGUpIHtcbiAgICAgIGlucHV0ID0gdGhpcy5vcHRpb25zLmFuaW1hdGUuc3BsaXQoJyAnKTtcblxuICAgICAgdGhpcy5hbmltYXRpb25JbiA9IGlucHV0WzBdO1xuICAgICAgdGhpcy5hbmltYXRpb25PdXQgPSBpbnB1dFsxXSB8fCBudWxsO1xuICAgIH1cbiAgICAvLyBPdGhlcndpc2UsIHBhcnNlIHRvZ2dsZSBjbGFzc1xuICAgIGVsc2Uge1xuICAgICAgaW5wdXQgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ3RvZ2dsZXInKTtcbiAgICAgIC8vIEFsbG93IGZvciBhIC4gYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyaW5nXG4gICAgICB0aGlzLmNsYXNzTmFtZSA9IGlucHV0WzBdID09PSAnLicgPyBpbnB1dC5zbGljZSgxKSA6IGlucHV0O1xuICAgIH1cblxuICAgIC8vIEFkZCBBUklBIGF0dHJpYnV0ZXMgdG8gdHJpZ2dlcnNcbiAgICB2YXIgaWQgPSB0aGlzLiRlbGVtZW50WzBdLmlkO1xuICAgICQoYFtkYXRhLW9wZW49XCIke2lkfVwiXSwgW2RhdGEtY2xvc2U9XCIke2lkfVwiXSwgW2RhdGEtdG9nZ2xlPVwiJHtpZH1cIl1gKVxuICAgICAgLmF0dHIoJ2FyaWEtY29udHJvbHMnLCBpZCk7XG4gICAgLy8gSWYgdGhlIHRhcmdldCBpcyBoaWRkZW4sIGFkZCBhcmlhLWhpZGRlblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1leHBhbmRlZCcsIHRoaXMuJGVsZW1lbnQuaXMoJzpoaWRkZW4nKSA/IGZhbHNlIDogdHJ1ZSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciB0aGUgdG9nZ2xlIHRyaWdnZXIuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZigndG9nZ2xlLnpmLnRyaWdnZXInKS5vbigndG9nZ2xlLnpmLnRyaWdnZXInLCB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSB0YXJnZXQgY2xhc3Mgb24gdGhlIHRhcmdldCBlbGVtZW50LiBBbiBldmVudCBpcyBmaXJlZCBmcm9tIHRoZSBvcmlnaW5hbCB0cmlnZ2VyIGRlcGVuZGluZyBvbiBpZiB0aGUgcmVzdWx0YW50IHN0YXRlIHdhcyBcIm9uXCIgb3IgXCJvZmZcIi5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBUb2dnbGVyI29uXG4gICAqIEBmaXJlcyBUb2dnbGVyI29mZlxuICAgKi9cbiAgdG9nZ2xlKCkge1xuICAgIHRoaXNbIHRoaXMub3B0aW9ucy5hbmltYXRlID8gJ190b2dnbGVBbmltYXRlJyA6ICdfdG9nZ2xlQ2xhc3MnXSgpO1xuICB9XG5cbiAgX3RvZ2dsZUNsYXNzKCkge1xuICAgIHRoaXMuJGVsZW1lbnQudG9nZ2xlQ2xhc3ModGhpcy5jbGFzc05hbWUpO1xuXG4gICAgdmFyIGlzT24gPSB0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKHRoaXMuY2xhc3NOYW1lKTtcbiAgICBpZiAoaXNPbikge1xuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyBpZiB0aGUgdGFyZ2V0IGVsZW1lbnQgaGFzIHRoZSBjbGFzcyBhZnRlciBhIHRvZ2dsZS5cbiAgICAgICAqIEBldmVudCBUb2dnbGVyI29uXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignb24uemYudG9nZ2xlcicpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgaWYgdGhlIHRhcmdldCBlbGVtZW50IGRvZXMgbm90IGhhdmUgdGhlIGNsYXNzIGFmdGVyIGEgdG9nZ2xlLlxuICAgICAgICogQGV2ZW50IFRvZ2dsZXIjb2ZmXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignb2ZmLnpmLnRvZ2dsZXInKTtcbiAgICB9XG5cbiAgICB0aGlzLl91cGRhdGVBUklBKGlzT24pO1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtbXV0YXRlXScpLnRyaWdnZXIoJ211dGF0ZW1lLnpmLnRyaWdnZXInKTtcbiAgfVxuXG4gIF90b2dnbGVBbmltYXRlKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAodGhpcy4kZWxlbWVudC5pcygnOmhpZGRlbicpKSB7XG4gICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlSW4odGhpcy4kZWxlbWVudCwgdGhpcy5hbmltYXRpb25JbiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLl91cGRhdGVBUklBKHRydWUpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ29uLnpmLnRvZ2dsZXInKTtcbiAgICAgICAgdGhpcy5maW5kKCdbZGF0YS1tdXRhdGVdJykudHJpZ2dlcignbXV0YXRlbWUuemYudHJpZ2dlcicpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dCh0aGlzLiRlbGVtZW50LCB0aGlzLmFuaW1hdGlvbk91dCwgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLl91cGRhdGVBUklBKGZhbHNlKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdvZmYuemYudG9nZ2xlcicpO1xuICAgICAgICB0aGlzLmZpbmQoJ1tkYXRhLW11dGF0ZV0nKS50cmlnZ2VyKCdtdXRhdGVtZS56Zi50cmlnZ2VyJyk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBfdXBkYXRlQVJJQShpc09uKSB7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWV4cGFuZGVkJywgaXNPbiA/IHRydWUgOiBmYWxzZSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIGluc3RhbmNlIG9mIFRvZ2dsZXIgb24gdGhlIGVsZW1lbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnRvZ2dsZXInKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuVG9nZ2xlci5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIFRlbGxzIHRoZSBwbHVnaW4gaWYgdGhlIGVsZW1lbnQgc2hvdWxkIGFuaW1hdGVkIHdoZW4gdG9nZ2xlZC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGFuaW1hdGU6IGZhbHNlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oVG9nZ2xlciwgJ1RvZ2dsZXInKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFRvb2x0aXAgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnRvb2x0aXBcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqL1xuXG5jbGFzcyBUb29sdGlwIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBUb29sdGlwLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFRvb2x0aXAjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYXR0YWNoIGEgdG9vbHRpcCB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBvYmplY3QgdG8gZXh0ZW5kIHRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24uXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFRvb2x0aXAuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICB0aGlzLmlzQ2xpY2sgPSBmYWxzZTtcbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdUb29sdGlwJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHRvb2x0aXAgYnkgc2V0dGluZyB0aGUgY3JlYXRpbmcgdGhlIHRpcCBlbGVtZW50LCBhZGRpbmcgaXQncyB0ZXh0LCBzZXR0aW5nIHByaXZhdGUgdmFyaWFibGVzIGFuZCBzZXR0aW5nIGF0dHJpYnV0ZXMgb24gdGhlIGFuY2hvci5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBlbGVtSWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtZGVzY3JpYmVkYnknKSB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICd0b29sdGlwJyk7XG5cbiAgICB0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcyA9IHRoaXMub3B0aW9ucy5wb3NpdGlvbkNsYXNzIHx8IHRoaXMuX2dldFBvc2l0aW9uQ2xhc3ModGhpcy4kZWxlbWVudCk7XG4gICAgdGhpcy5vcHRpb25zLnRpcFRleHQgPSB0aGlzLm9wdGlvbnMudGlwVGV4dCB8fCB0aGlzLiRlbGVtZW50LmF0dHIoJ3RpdGxlJyk7XG4gICAgdGhpcy50ZW1wbGF0ZSA9IHRoaXMub3B0aW9ucy50ZW1wbGF0ZSA/ICQodGhpcy5vcHRpb25zLnRlbXBsYXRlKSA6IHRoaXMuX2J1aWxkVGVtcGxhdGUoZWxlbUlkKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYWxsb3dIdG1sKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpXG4gICAgICAgIC5odG1sKHRoaXMub3B0aW9ucy50aXBUZXh0KVxuICAgICAgICAuaGlkZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpXG4gICAgICAgIC50ZXh0KHRoaXMub3B0aW9ucy50aXBUZXh0KVxuICAgICAgICAuaGlkZSgpO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAndGl0bGUnOiAnJyxcbiAgICAgICdhcmlhLWRlc2NyaWJlZGJ5JzogZWxlbUlkLFxuICAgICAgJ2RhdGEteWV0aS1ib3gnOiBlbGVtSWQsXG4gICAgICAnZGF0YS10b2dnbGUnOiBlbGVtSWQsXG4gICAgICAnZGF0YS1yZXNpemUnOiBlbGVtSWRcbiAgICB9KS5hZGRDbGFzcyh0aGlzLm9wdGlvbnMudHJpZ2dlckNsYXNzKTtcblxuICAgIC8vaGVscGVyIHZhcmlhYmxlcyB0byB0cmFjayBtb3ZlbWVudCBvbiBjb2xsaXNpb25zXG4gICAgdGhpcy51c2VkUG9zaXRpb25zID0gW107XG4gICAgdGhpcy5jb3VudGVyID0gNDtcbiAgICB0aGlzLmNsYXNzQ2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogR3JhYnMgdGhlIGN1cnJlbnQgcG9zaXRpb25pbmcgY2xhc3MsIGlmIHByZXNlbnQsIGFuZCByZXR1cm5zIHRoZSB2YWx1ZSBvciBhbiBlbXB0eSBzdHJpbmcuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZ2V0UG9zaXRpb25DbGFzcyhlbGVtZW50KSB7XG4gICAgaWYgKCFlbGVtZW50KSB7IHJldHVybiAnJzsgfVxuICAgIC8vIHZhciBwb3NpdGlvbiA9IGVsZW1lbnQuYXR0cignY2xhc3MnKS5tYXRjaCgvdG9wfGxlZnR8cmlnaHQvZyk7XG4gICAgdmFyIHBvc2l0aW9uID0gZWxlbWVudFswXS5jbGFzc05hbWUubWF0Y2goL1xcYih0b3B8bGVmdHxyaWdodClcXGIvZyk7XG4gICAgICAgIHBvc2l0aW9uID0gcG9zaXRpb24gPyBwb3NpdGlvblswXSA6ICcnO1xuICAgIHJldHVybiBwb3NpdGlvbjtcbiAgfTtcbiAgLyoqXG4gICAqIGJ1aWxkcyB0aGUgdG9vbHRpcCBlbGVtZW50LCBhZGRzIGF0dHJpYnV0ZXMsIGFuZCByZXR1cm5zIHRoZSB0ZW1wbGF0ZS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9idWlsZFRlbXBsYXRlKGlkKSB7XG4gICAgdmFyIHRlbXBsYXRlQ2xhc3NlcyA9IChgJHt0aGlzLm9wdGlvbnMudG9vbHRpcENsYXNzfSAke3RoaXMub3B0aW9ucy5wb3NpdGlvbkNsYXNzfSAke3RoaXMub3B0aW9ucy50ZW1wbGF0ZUNsYXNzZXN9YCkudHJpbSgpO1xuICAgIHZhciAkdGVtcGxhdGUgPSAgJCgnPGRpdj48L2Rpdj4nKS5hZGRDbGFzcyh0ZW1wbGF0ZUNsYXNzZXMpLmF0dHIoe1xuICAgICAgJ3JvbGUnOiAndG9vbHRpcCcsXG4gICAgICAnYXJpYS1oaWRkZW4nOiB0cnVlLFxuICAgICAgJ2RhdGEtaXMtYWN0aXZlJzogZmFsc2UsXG4gICAgICAnZGF0YS1pcy1mb2N1cyc6IGZhbHNlLFxuICAgICAgJ2lkJzogaWRcbiAgICB9KTtcbiAgICByZXR1cm4gJHRlbXBsYXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIEZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgaWYgYSBjb2xsaXNpb24gZXZlbnQgaXMgZGV0ZWN0ZWQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwb3NpdGlvbiAtIHBvc2l0aW9uaW5nIGNsYXNzIHRvIHRyeVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlcG9zaXRpb24ocG9zaXRpb24pIHtcbiAgICB0aGlzLnVzZWRQb3NpdGlvbnMucHVzaChwb3NpdGlvbiA/IHBvc2l0aW9uIDogJ2JvdHRvbScpO1xuXG4gICAgLy9kZWZhdWx0LCB0cnkgc3dpdGNoaW5nIHRvIG9wcG9zaXRlIHNpZGVcbiAgICBpZiAoIXBvc2l0aW9uICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigndG9wJykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5hZGRDbGFzcygndG9wJyk7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAnbGVmdCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdyaWdodCcpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdyaWdodCcpO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdyaWdodCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdsZWZ0JykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbilcbiAgICAgICAgICAuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9XG5cbiAgICAvL2lmIGRlZmF1bHQgY2hhbmdlIGRpZG4ndCB3b3JrLCB0cnkgYm90dG9tIG9yIGxlZnQgZmlyc3RcbiAgICBlbHNlIGlmICghcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxuICAgICAgICAgIC5hZGRDbGFzcygnbGVmdCcpO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAncmlnaHQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfVxuICAgIC8vaWYgbm90aGluZyBjbGVhcmVkLCBzZXQgdG8gYm90dG9tXG4gICAgZWxzZSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9XG4gICAgdGhpcy5jbGFzc0NoYW5nZWQgPSB0cnVlO1xuICAgIHRoaXMuY291bnRlci0tO1xuICB9XG5cbiAgLyoqXG4gICAqIHNldHMgdGhlIHBvc2l0aW9uIGNsYXNzIG9mIGFuIGVsZW1lbnQgYW5kIHJlY3Vyc2l2ZWx5IGNhbGxzIGl0c2VsZiB1bnRpbCB0aGVyZSBhcmUgbm8gbW9yZSBwb3NzaWJsZSBwb3NpdGlvbnMgdG8gYXR0ZW1wdCwgb3IgdGhlIHRvb2x0aXAgZWxlbWVudCBpcyBubyBsb25nZXIgY29sbGlkaW5nLlxuICAgKiBpZiB0aGUgdG9vbHRpcCBpcyBsYXJnZXIgdGhhbiB0aGUgc2NyZWVuIHdpZHRoLCBkZWZhdWx0IHRvIGZ1bGwgd2lkdGggLSBhbnkgdXNlciBzZWxlY3RlZCBtYXJnaW5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRQb3NpdGlvbigpIHtcbiAgICB2YXIgcG9zaXRpb24gPSB0aGlzLl9nZXRQb3NpdGlvbkNsYXNzKHRoaXMudGVtcGxhdGUpLFxuICAgICAgICAkdGlwRGltcyA9IEZvdW5kYXRpb24uQm94LkdldERpbWVuc2lvbnModGhpcy50ZW1wbGF0ZSksXG4gICAgICAgICRhbmNob3JEaW1zID0gRm91bmRhdGlvbi5Cb3guR2V0RGltZW5zaW9ucyh0aGlzLiRlbGVtZW50KSxcbiAgICAgICAgZGlyZWN0aW9uID0gKHBvc2l0aW9uID09PSAnbGVmdCcgPyAnbGVmdCcgOiAoKHBvc2l0aW9uID09PSAncmlnaHQnKSA/ICdsZWZ0JyA6ICd0b3AnKSksXG4gICAgICAgIHBhcmFtID0gKGRpcmVjdGlvbiA9PT0gJ3RvcCcpID8gJ2hlaWdodCcgOiAnd2lkdGgnLFxuICAgICAgICBvZmZzZXQgPSAocGFyYW0gPT09ICdoZWlnaHQnKSA/IHRoaXMub3B0aW9ucy52T2Zmc2V0IDogdGhpcy5vcHRpb25zLmhPZmZzZXQsXG4gICAgICAgIF90aGlzID0gdGhpcztcblxuICAgIGlmICgoJHRpcERpbXMud2lkdGggPj0gJHRpcERpbXMud2luZG93RGltcy53aWR0aCkgfHwgKCF0aGlzLmNvdW50ZXIgJiYgIUZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UodGhpcy50ZW1wbGF0ZSkpKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLm9mZnNldChGb3VuZGF0aW9uLkJveC5HZXRPZmZzZXRzKHRoaXMudGVtcGxhdGUsIHRoaXMuJGVsZW1lbnQsICdjZW50ZXIgYm90dG9tJywgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0LCB0cnVlKSkuY3NzKHtcbiAgICAgIC8vIHRoaXMuJGVsZW1lbnQub2Zmc2V0KEZvdW5kYXRpb24uR2V0T2Zmc2V0cyh0aGlzLnRlbXBsYXRlLCB0aGlzLiRlbGVtZW50LCAnY2VudGVyIGJvdHRvbScsIHRoaXMub3B0aW9ucy52T2Zmc2V0LCB0aGlzLm9wdGlvbnMuaE9mZnNldCwgdHJ1ZSkpLmNzcyh7XG4gICAgICAgICd3aWR0aCc6ICRhbmNob3JEaW1zLndpbmRvd0RpbXMud2lkdGggLSAodGhpcy5vcHRpb25zLmhPZmZzZXQgKiAyKSxcbiAgICAgICAgJ2hlaWdodCc6ICdhdXRvJ1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy50ZW1wbGF0ZS5vZmZzZXQoRm91bmRhdGlvbi5Cb3guR2V0T2Zmc2V0cyh0aGlzLnRlbXBsYXRlLCB0aGlzLiRlbGVtZW50LCdjZW50ZXIgJyArIChwb3NpdGlvbiB8fCAnYm90dG9tJyksIHRoaXMub3B0aW9ucy52T2Zmc2V0LCB0aGlzLm9wdGlvbnMuaE9mZnNldCkpO1xuXG4gICAgd2hpbGUoIUZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UodGhpcy50ZW1wbGF0ZSkgJiYgdGhpcy5jb3VudGVyKSB7XG4gICAgICB0aGlzLl9yZXBvc2l0aW9uKHBvc2l0aW9uKTtcbiAgICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIHJldmVhbHMgdGhlIHRvb2x0aXAsIGFuZCBmaXJlcyBhbiBldmVudCB0byBjbG9zZSBhbnkgb3RoZXIgb3BlbiB0b29sdGlwcyBvbiB0aGUgcGFnZVxuICAgKiBAZmlyZXMgVG9vbHRpcCNjbG9zZW1lXG4gICAqIEBmaXJlcyBUb29sdGlwI3Nob3dcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBzaG93KCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuc2hvd09uICE9PSAnYWxsJyAmJiAhRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmlzKHRoaXMub3B0aW9ucy5zaG93T24pKSB7XG4gICAgICAvLyBjb25zb2xlLmVycm9yKCdUaGUgc2NyZWVuIGlzIHRvbyBzbWFsbCB0byBkaXNwbGF5IHRoaXMgdG9vbHRpcCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy50ZW1wbGF0ZS5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJykuc2hvdygpO1xuICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB0byBjbG9zZSBhbGwgb3RoZXIgb3BlbiB0b29sdGlwcyBvbiB0aGUgcGFnZVxuICAgICAqIEBldmVudCBDbG9zZW1lI3Rvb2x0aXBcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlbWUuemYudG9vbHRpcCcsIHRoaXMudGVtcGxhdGUuYXR0cignaWQnKSk7XG5cblxuICAgIHRoaXMudGVtcGxhdGUuYXR0cih7XG4gICAgICAnZGF0YS1pcy1hY3RpdmUnOiB0cnVlLFxuICAgICAgJ2FyaWEtaGlkZGVuJzogZmFsc2VcbiAgICB9KTtcbiAgICBfdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgLy8gY29uc29sZS5sb2codGhpcy50ZW1wbGF0ZSk7XG4gICAgdGhpcy50ZW1wbGF0ZS5zdG9wKCkuaGlkZSgpLmNzcygndmlzaWJpbGl0eScsICcnKS5mYWRlSW4odGhpcy5vcHRpb25zLmZhZGVJbkR1cmF0aW9uLCBmdW5jdGlvbigpIHtcbiAgICAgIC8vbWF5YmUgZG8gc3R1ZmY/XG4gICAgfSk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgdG9vbHRpcCBpcyBzaG93blxuICAgICAqIEBldmVudCBUb29sdGlwI3Nob3dcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Nob3cuemYudG9vbHRpcCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEhpZGVzIHRoZSBjdXJyZW50IHRvb2x0aXAsIGFuZCByZXNldHMgdGhlIHBvc2l0aW9uaW5nIGNsYXNzIGlmIGl0IHdhcyBjaGFuZ2VkIGR1ZSB0byBjb2xsaXNpb25cbiAgICogQGZpcmVzIFRvb2x0aXAjaGlkZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGhpZGUoKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ2hpZGluZycsIHRoaXMuJGVsZW1lbnQuZGF0YSgneWV0aS1ib3gnKSk7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLnRlbXBsYXRlLnN0b3AoKS5hdHRyKHtcbiAgICAgICdhcmlhLWhpZGRlbic6IHRydWUsXG4gICAgICAnZGF0YS1pcy1hY3RpdmUnOiBmYWxzZVxuICAgIH0pLmZhZGVPdXQodGhpcy5vcHRpb25zLmZhZGVPdXREdXJhdGlvbiwgZnVuY3Rpb24oKSB7XG4gICAgICBfdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgX3RoaXMuaXNDbGljayA9IGZhbHNlO1xuICAgICAgaWYgKF90aGlzLmNsYXNzQ2hhbmdlZCkge1xuICAgICAgICBfdGhpcy50ZW1wbGF0ZVxuICAgICAgICAgICAgIC5yZW1vdmVDbGFzcyhfdGhpcy5fZ2V0UG9zaXRpb25DbGFzcyhfdGhpcy50ZW1wbGF0ZSkpXG4gICAgICAgICAgICAgLmFkZENsYXNzKF90aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcyk7XG5cbiAgICAgICBfdGhpcy51c2VkUG9zaXRpb25zID0gW107XG4gICAgICAgX3RoaXMuY291bnRlciA9IDQ7XG4gICAgICAgX3RoaXMuY2xhc3NDaGFuZ2VkID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gICAgLyoqXG4gICAgICogZmlyZXMgd2hlbiB0aGUgdG9vbHRpcCBpcyBoaWRkZW5cbiAgICAgKiBAZXZlbnQgVG9vbHRpcCNoaWRlXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdoaWRlLnpmLnRvb2x0aXAnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBhZGRzIGV2ZW50IGxpc3RlbmVycyBmb3IgdGhlIHRvb2x0aXAgYW5kIGl0cyBhbmNob3JcbiAgICogVE9ETyBjb21iaW5lIHNvbWUgb2YgdGhlIGxpc3RlbmVycyBsaWtlIGZvY3VzIGFuZCBtb3VzZWVudGVyLCBldGMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdmFyICR0ZW1wbGF0ZSA9IHRoaXMudGVtcGxhdGU7XG4gICAgdmFyIGlzRm9jdXMgPSBmYWxzZTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVIb3Zlcikge1xuXG4gICAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub24oJ21vdXNlZW50ZXIuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKCFfdGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMuc2hvdygpO1xuICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuaG92ZXJEZWxheSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAub24oJ21vdXNlbGVhdmUuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgICAgICBpZiAoIWlzRm9jdXMgfHwgKF90aGlzLmlzQ2xpY2sgJiYgIV90aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSkge1xuICAgICAgICAgIF90aGlzLmhpZGUoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbGlja09wZW4pIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQub24oJ21vdXNlZG93bi56Zi50b29sdGlwJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICBpZiAoX3RoaXMuaXNDbGljaykge1xuICAgICAgICAgIC8vX3RoaXMuaGlkZSgpO1xuICAgICAgICAgIC8vIF90aGlzLmlzQ2xpY2sgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBfdGhpcy5pc0NsaWNrID0gdHJ1ZTtcbiAgICAgICAgICBpZiAoKF90aGlzLm9wdGlvbnMuZGlzYWJsZUhvdmVyIHx8ICFfdGhpcy4kZWxlbWVudC5hdHRyKCd0YWJpbmRleCcpKSAmJiAhX3RoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIF90aGlzLnNob3coKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdtb3VzZWRvd24uemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgX3RoaXMuaXNDbGljayA9IHRydWU7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5kaXNhYmxlRm9yVG91Y2gpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5vbigndGFwLnpmLnRvb2x0aXAgdG91Y2hlbmQuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgX3RoaXMuaXNBY3RpdmUgPyBfdGhpcy5oaWRlKCkgOiBfdGhpcy5zaG93KCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9uKHtcbiAgICAgIC8vICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcyksXG4gICAgICAvLyAnY2xvc2UuemYudHJpZ2dlcic6IHRoaXMuaGlkZS5iaW5kKHRoaXMpXG4gICAgICAnY2xvc2UuemYudHJpZ2dlcic6IHRoaXMuaGlkZS5iaW5kKHRoaXMpXG4gICAgfSk7XG5cbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub24oJ2ZvY3VzLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlzRm9jdXMgPSB0cnVlO1xuICAgICAgICBpZiAoX3RoaXMuaXNDbGljaykge1xuICAgICAgICAgIC8vIElmIHdlJ3JlIG5vdCBzaG93aW5nIG9wZW4gb24gY2xpY2tzLCB3ZSBuZWVkIHRvIHByZXRlbmQgYSBjbGljay1sYXVuY2hlZCBmb2N1cyBpc24ndFxuICAgICAgICAgIC8vIGEgcmVhbCBmb2N1cywgb3RoZXJ3aXNlIG9uIGhvdmVyIGFuZCBjb21lIGJhY2sgd2UgZ2V0IGJhZCBiZWhhdmlvclxuICAgICAgICAgIGlmKCFfdGhpcy5vcHRpb25zLmNsaWNrT3BlbikgeyBpc0ZvY3VzID0gZmFsc2U7IH1cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgX3RoaXMuc2hvdygpO1xuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICAub24oJ2ZvY3Vzb3V0LnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlzRm9jdXMgPSBmYWxzZTtcbiAgICAgICAgX3RoaXMuaXNDbGljayA9IGZhbHNlO1xuICAgICAgICBfdGhpcy5oaWRlKCk7XG4gICAgICB9KVxuXG4gICAgICAub24oJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKF90aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgX3RoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIGFkZHMgYSB0b2dnbGUgbWV0aG9kLCBpbiBhZGRpdGlvbiB0byB0aGUgc3RhdGljIHNob3coKSAmIGhpZGUoKSBmdW5jdGlvbnNcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB0b2dnbGUoKSB7XG4gICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgIHRoaXMuaGlkZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNob3coKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgdG9vbHRpcCwgcmVtb3ZlcyB0ZW1wbGF0ZSBlbGVtZW50IGZyb20gdGhlIHZpZXcuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3RpdGxlJywgdGhpcy50ZW1wbGF0ZS50ZXh0KCkpXG4gICAgICAgICAgICAgICAgIC5vZmYoJy56Zi50cmlnZ2VyIC56Zi50b29sdGlwJylcbiAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdoYXMtdGlwIHRvcCByaWdodCBsZWZ0JylcbiAgICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2FyaWEtZGVzY3JpYmVkYnkgYXJpYS1oYXNwb3B1cCBkYXRhLWRpc2FibGUtaG92ZXIgZGF0YS1yZXNpemUgZGF0YS10b2dnbGUgZGF0YS10b29sdGlwIGRhdGEteWV0aS1ib3gnKTtcblxuICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlKCk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuVG9vbHRpcC5kZWZhdWx0cyA9IHtcbiAgZGlzYWJsZUZvclRvdWNoOiBmYWxzZSxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCBiZWZvcmUgYSB0b29sdGlwIHNob3VsZCBvcGVuIG9uIGhvdmVyLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDIwMFxuICAgKi9cbiAgaG92ZXJEZWxheTogMjAwLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIGEgdG9vbHRpcCBzaG91bGQgdGFrZSB0byBmYWRlIGludG8gdmlldy5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAxNTBcbiAgICovXG4gIGZhZGVJbkR1cmF0aW9uOiAxNTAsXG4gIC8qKlxuICAgKiBUaW1lLCBpbiBtcywgYSB0b29sdGlwIHNob3VsZCB0YWtlIHRvIGZhZGUgb3V0IG9mIHZpZXcuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcn1cbiAgICogQGRlZmF1bHQgMTUwXG4gICAqL1xuICBmYWRlT3V0RHVyYXRpb246IDE1MCxcbiAgLyoqXG4gICAqIERpc2FibGVzIGhvdmVyIGV2ZW50cyBmcm9tIG9wZW5pbmcgdGhlIHRvb2x0aXAgaWYgc2V0IHRvIHRydWVcbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGRpc2FibGVIb3ZlcjogZmFsc2UsXG4gIC8qKlxuICAgKiBPcHRpb25hbCBhZGR0aW9uYWwgY2xhc3NlcyB0byBhcHBseSB0byB0aGUgdG9vbHRpcCB0ZW1wbGF0ZSBvbiBpbml0LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICcnXG4gICAqL1xuICB0ZW1wbGF0ZUNsYXNzZXM6ICcnLFxuICAvKipcbiAgICogTm9uLW9wdGlvbmFsIGNsYXNzIGFkZGVkIHRvIHRvb2x0aXAgdGVtcGxhdGVzLiBGb3VuZGF0aW9uIGRlZmF1bHQgaXMgJ3Rvb2x0aXAnLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICd0b29sdGlwJ1xuICAgKi9cbiAgdG9vbHRpcENsYXNzOiAndG9vbHRpcCcsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSB0b29sdGlwIGFuY2hvciBlbGVtZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICdoYXMtdGlwJ1xuICAgKi9cbiAgdHJpZ2dlckNsYXNzOiAnaGFzLXRpcCcsXG4gIC8qKlxuICAgKiBNaW5pbXVtIGJyZWFrcG9pbnQgc2l6ZSBhdCB3aGljaCB0byBvcGVuIHRoZSB0b29sdGlwLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICdzbWFsbCdcbiAgICovXG4gIHNob3dPbjogJ3NtYWxsJyxcbiAgLyoqXG4gICAqIEN1c3RvbSB0ZW1wbGF0ZSB0byBiZSB1c2VkIHRvIGdlbmVyYXRlIG1hcmt1cCBmb3IgdG9vbHRpcC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnJ1xuICAgKi9cbiAgdGVtcGxhdGU6ICcnLFxuICAvKipcbiAgICogVGV4dCBkaXNwbGF5ZWQgaW4gdGhlIHRvb2x0aXAgdGVtcGxhdGUgb24gb3Blbi5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnJ1xuICAgKi9cbiAgdGlwVGV4dDogJycsXG4gIHRvdWNoQ2xvc2VUZXh0OiAnVGFwIHRvIGNsb3NlLicsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHRvb2x0aXAgdG8gcmVtYWluIG9wZW4gaWYgdHJpZ2dlcmVkIHdpdGggYSBjbGljayBvciB0b3VjaCBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgY2xpY2tPcGVuOiB0cnVlLFxuICAvKipcbiAgICogQWRkaXRpb25hbCBwb3NpdGlvbmluZyBjbGFzc2VzLCBzZXQgYnkgdGhlIEpTXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJydcbiAgICovXG4gIHBvc2l0aW9uQ2xhc3M6ICcnLFxuICAvKipcbiAgICogRGlzdGFuY2UsIGluIHBpeGVscywgdGhlIHRlbXBsYXRlIHNob3VsZCBwdXNoIGF3YXkgZnJvbSB0aGUgYW5jaG9yIG9uIHRoZSBZIGF4aXMuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcn1cbiAgICogQGRlZmF1bHQgMTBcbiAgICovXG4gIHZPZmZzZXQ6IDEwLFxuICAvKipcbiAgICogRGlzdGFuY2UsIGluIHBpeGVscywgdGhlIHRlbXBsYXRlIHNob3VsZCBwdXNoIGF3YXkgZnJvbSB0aGUgYW5jaG9yIG9uIHRoZSBYIGF4aXMsIGlmIGFsaWduZWQgdG8gYSBzaWRlLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDEyXG4gICAqL1xuICBoT2Zmc2V0OiAxMixcbiAgICAvKipcbiAgICogQWxsb3cgSFRNTCBpbiB0b29sdGlwLiBXYXJuaW5nOiBJZiB5b3UgYXJlIGxvYWRpbmcgdXNlci1nZW5lcmF0ZWQgY29udGVudCBpbnRvIHRvb2x0aXBzLFxuICAgKiBhbGxvd2luZyBIVE1MIG1heSBvcGVuIHlvdXJzZWxmIHVwIHRvIFhTUyBhdHRhY2tzLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgYWxsb3dIdG1sOiBmYWxzZVxufTtcblxuLyoqXG4gKiBUT0RPIHV0aWxpemUgcmVzaXplIGV2ZW50IHRyaWdnZXJcbiAqL1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oVG9vbHRpcCwgJ1Rvb2x0aXAnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBQb2x5ZmlsbCBmb3IgcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4oZnVuY3Rpb24oKSB7XG4gIGlmICghRGF0ZS5ub3cpXG4gICAgRGF0ZS5ub3cgPSBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpOyB9O1xuXG4gIHZhciB2ZW5kb3JzID0gWyd3ZWJraXQnLCAnbW96J107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdmVuZG9ycy5sZW5ndGggJiYgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ICsraSkge1xuICAgICAgdmFyIHZwID0gdmVuZG9yc1tpXTtcbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdnArJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gKHdpbmRvd1t2cCsnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93W3ZwKydDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXSk7XG4gIH1cbiAgaWYgKC9pUChhZHxob25lfG9kKS4qT1MgNi8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudClcbiAgICB8fCAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCAhd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKSB7XG4gICAgdmFyIGxhc3RUaW1lID0gMDtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIHZhciBuZXh0VGltZSA9IE1hdGgubWF4KGxhc3RUaW1lICsgMTYsIG5vdyk7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhsYXN0VGltZSA9IG5leHRUaW1lKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFRpbWUgLSBub3cpO1xuICAgIH07XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gY2xlYXJUaW1lb3V0O1xuICB9XG59KSgpO1xuXG52YXIgaW5pdENsYXNzZXMgICA9IFsnbXVpLWVudGVyJywgJ211aS1sZWF2ZSddO1xudmFyIGFjdGl2ZUNsYXNzZXMgPSBbJ211aS1lbnRlci1hY3RpdmUnLCAnbXVpLWxlYXZlLWFjdGl2ZSddO1xuXG4vLyBGaW5kIHRoZSByaWdodCBcInRyYW5zaXRpb25lbmRcIiBldmVudCBmb3IgdGhpcyBicm93c2VyXG52YXIgZW5kRXZlbnQgPSAoZnVuY3Rpb24oKSB7XG4gIHZhciB0cmFuc2l0aW9ucyA9IHtcbiAgICAndHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAnV2Via2l0VHJhbnNpdGlvbic6ICd3ZWJraXRUcmFuc2l0aW9uRW5kJyxcbiAgICAnTW96VHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAnT1RyYW5zaXRpb24nOiAnb3RyYW5zaXRpb25lbmQnXG4gIH1cbiAgdmFyIGVsZW0gPSB3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgZm9yICh2YXIgdCBpbiB0cmFuc2l0aW9ucykge1xuICAgIGlmICh0eXBlb2YgZWxlbS5zdHlsZVt0XSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiB0cmFuc2l0aW9uc1t0XTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn0pKCk7XG5cbmZ1bmN0aW9uIGFuaW1hdGUoaXNJbiwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICBlbGVtZW50ID0gJChlbGVtZW50KS5lcSgwKTtcblxuICBpZiAoIWVsZW1lbnQubGVuZ3RoKSByZXR1cm47XG5cbiAgaWYgKGVuZEV2ZW50ID09PSBudWxsKSB7XG4gICAgaXNJbiA/IGVsZW1lbnQuc2hvdygpIDogZWxlbWVudC5oaWRlKCk7XG4gICAgY2IoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgaW5pdENsYXNzID0gaXNJbiA/IGluaXRDbGFzc2VzWzBdIDogaW5pdENsYXNzZXNbMV07XG4gIHZhciBhY3RpdmVDbGFzcyA9IGlzSW4gPyBhY3RpdmVDbGFzc2VzWzBdIDogYWN0aXZlQ2xhc3Nlc1sxXTtcblxuICAvLyBTZXQgdXAgdGhlIGFuaW1hdGlvblxuICByZXNldCgpO1xuICBlbGVtZW50LmFkZENsYXNzKGFuaW1hdGlvbik7XG4gIGVsZW1lbnQuY3NzKCd0cmFuc2l0aW9uJywgJ25vbmUnKTtcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIGVsZW1lbnQuYWRkQ2xhc3MoaW5pdENsYXNzKTtcbiAgICBpZiAoaXNJbikgZWxlbWVudC5zaG93KCk7XG4gIH0pO1xuXG4gIC8vIFN0YXJ0IHRoZSBhbmltYXRpb25cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIGVsZW1lbnRbMF0ub2Zmc2V0V2lkdGg7XG4gICAgZWxlbWVudC5jc3MoJ3RyYW5zaXRpb24nLCAnJyk7XG4gICAgZWxlbWVudC5hZGRDbGFzcyhhY3RpdmVDbGFzcyk7XG4gIH0pO1xuXG4gIC8vIENsZWFuIHVwIHRoZSBhbmltYXRpb24gd2hlbiBpdCBmaW5pc2hlc1xuICBlbGVtZW50Lm9uZSgndHJhbnNpdGlvbmVuZCcsIGZpbmlzaCk7XG5cbiAgLy8gSGlkZXMgdGhlIGVsZW1lbnQgKGZvciBvdXQgYW5pbWF0aW9ucyksIHJlc2V0cyB0aGUgZWxlbWVudCwgYW5kIHJ1bnMgYSBjYWxsYmFja1xuICBmdW5jdGlvbiBmaW5pc2goKSB7XG4gICAgaWYgKCFpc0luKSBlbGVtZW50LmhpZGUoKTtcbiAgICByZXNldCgpO1xuICAgIGlmIChjYikgY2IuYXBwbHkoZWxlbWVudCk7XG4gIH1cblxuICAvLyBSZXNldHMgdHJhbnNpdGlvbnMgYW5kIHJlbW92ZXMgbW90aW9uLXNwZWNpZmljIGNsYXNzZXNcbiAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgZWxlbWVudFswXS5zdHlsZS50cmFuc2l0aW9uRHVyYXRpb24gPSAwO1xuICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3MoaW5pdENsYXNzICsgJyAnICsgYWN0aXZlQ2xhc3MgKyAnICcgKyBhbmltYXRpb24pO1xuICB9XG59XG5cbnZhciBNb3Rpb25VSSA9IHtcbiAgYW5pbWF0ZUluOiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZSh0cnVlLCBlbGVtZW50LCBhbmltYXRpb24sIGNiKTtcbiAgfSxcblxuICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZShmYWxzZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH1cbn1cbiIsImpRdWVyeShkb2N1bWVudCkuZm91bmRhdGlvbigpO1xuIiwiLy8gSm95cmlkZSBkZW1vXG4kKCcjc3RhcnQtanInKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgJChkb2N1bWVudCkuZm91bmRhdGlvbignam95cmlkZScsJ3N0YXJ0Jyk7XG59KTsiLG51bGwsIiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmlkZW9zID0gJCgnaWZyYW1lW3NyYyo9XCJ2aW1lby5jb21cIl0sIGlmcmFtZVtzcmMqPVwieW91dHViZS5jb21cIl0nKTtcblxuICAgIHZpZGVvcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGVsID0gJCh0aGlzKTtcbiAgICAgICAgZWwud3JhcCgnPGRpdiBjbGFzcz1cInJlc3BvbnNpdmUtZW1iZWQgd2lkZXNjcmVlblwiLz4nKTtcbiAgICB9KTtcbn0pO1xuIiwiXG4kKHdpbmRvdykuYmluZCgnIGxvYWQgcmVzaXplIG9yaWVudGF0aW9uQ2hhbmdlICcsIGZ1bmN0aW9uICgpIHtcbiAgIHZhciBmb290ZXIgPSAkKFwiI2Zvb3Rlci1jb250YWluZXJcIik7XG4gICB2YXIgcG9zID0gZm9vdGVyLnBvc2l0aW9uKCk7XG4gICB2YXIgaGVpZ2h0ID0gJCh3aW5kb3cpLmhlaWdodCgpO1xuICAgaGVpZ2h0ID0gaGVpZ2h0IC0gcG9zLnRvcDtcbiAgIGhlaWdodCA9IGhlaWdodCAtIGZvb3Rlci5oZWlnaHQoKSAtMTtcblxuICAgZnVuY3Rpb24gc3RpY2t5Rm9vdGVyKCkge1xuICAgICBmb290ZXIuY3NzKHtcbiAgICAgICAgICdtYXJnaW4tdG9wJzogaGVpZ2h0ICsgJ3B4J1xuICAgICB9KTtcbiAgIH1cblxuICAgaWYgKGhlaWdodCA+IDApIHtcbiAgICAgc3RpY2t5Rm9vdGVyKCk7XG4gICB9XG59KTtcbiJdfQ==
