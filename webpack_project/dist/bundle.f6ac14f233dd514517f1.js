webpackJsonp([1,2],{

/***/ 127:
/***/ function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var stylesInDom = {},
	memoize = function(fn) {
		var memo;
		return function () {
			if (typeof memo === "undefined") memo = fn.apply(this, arguments);
			return memo;
		};
	},
	isOldIE = memoize(function() {
		return /msie [6-9]\b/.test(self.navigator.userAgent.toLowerCase());
	}),
	getHeadElement = memoize(function () {
		return document.head || document.getElementsByTagName("head")[0];
	}),
	singletonElement = null,
	singletonCounter = 0,
	styleElementsInsertedAtTop = [];

module.exports = function(list, options) {
	if(typeof DEBUG !== "undefined" && DEBUG) {
		if(typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
	}

	options = options || {};
	// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
	// tags it will allow on a page
	if (typeof options.singleton === "undefined") options.singleton = isOldIE();

	// By default, add <style> tags to the bottom of <head>.
	if (typeof options.insertAt === "undefined") options.insertAt = "bottom";

	var styles = listToStyles(list);
	addStylesToDom(styles, options);

	return function update(newList) {
		var mayRemove = [];
		for(var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];
			domStyle.refs--;
			mayRemove.push(domStyle);
		}
		if(newList) {
			var newStyles = listToStyles(newList);
			addStylesToDom(newStyles, options);
		}
		for(var i = 0; i < mayRemove.length; i++) {
			var domStyle = mayRemove[i];
			if(domStyle.refs === 0) {
				for(var j = 0; j < domStyle.parts.length; j++)
					domStyle.parts[j]();
				delete stylesInDom[domStyle.id];
			}
		}
	};
}

function addStylesToDom(styles, options) {
	for(var i = 0; i < styles.length; i++) {
		var item = styles[i];
		var domStyle = stylesInDom[item.id];
		if(domStyle) {
			domStyle.refs++;
			for(var j = 0; j < domStyle.parts.length; j++) {
				domStyle.parts[j](item.parts[j]);
			}
			for(; j < item.parts.length; j++) {
				domStyle.parts.push(addStyle(item.parts[j], options));
			}
		} else {
			var parts = [];
			for(var j = 0; j < item.parts.length; j++) {
				parts.push(addStyle(item.parts[j], options));
			}
			stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
		}
	}
}

function listToStyles(list) {
	var styles = [];
	var newStyles = {};
	for(var i = 0; i < list.length; i++) {
		var item = list[i];
		var id = item[0];
		var css = item[1];
		var media = item[2];
		var sourceMap = item[3];
		var part = {css: css, media: media, sourceMap: sourceMap};
		if(!newStyles[id])
			styles.push(newStyles[id] = {id: id, parts: [part]});
		else
			newStyles[id].parts.push(part);
	}
	return styles;
}

function insertStyleElement(options, styleElement) {
	var head = getHeadElement();
	var lastStyleElementInsertedAtTop = styleElementsInsertedAtTop[styleElementsInsertedAtTop.length - 1];
	if (options.insertAt === "top") {
		if(!lastStyleElementInsertedAtTop) {
			head.insertBefore(styleElement, head.firstChild);
		} else if(lastStyleElementInsertedAtTop.nextSibling) {
			head.insertBefore(styleElement, lastStyleElementInsertedAtTop.nextSibling);
		} else {
			head.appendChild(styleElement);
		}
		styleElementsInsertedAtTop.push(styleElement);
	} else if (options.insertAt === "bottom") {
		head.appendChild(styleElement);
	} else {
		throw new Error("Invalid value for parameter 'insertAt'. Must be 'top' or 'bottom'.");
	}
}

function removeStyleElement(styleElement) {
	styleElement.parentNode.removeChild(styleElement);
	var idx = styleElementsInsertedAtTop.indexOf(styleElement);
	if(idx >= 0) {
		styleElementsInsertedAtTop.splice(idx, 1);
	}
}

function createStyleElement(options) {
	var styleElement = document.createElement("style");
	styleElement.type = "text/css";
	insertStyleElement(options, styleElement);
	return styleElement;
}

function createLinkElement(options) {
	var linkElement = document.createElement("link");
	linkElement.rel = "stylesheet";
	insertStyleElement(options, linkElement);
	return linkElement;
}

function addStyle(obj, options) {
	var styleElement, update, remove;

	if (options.singleton) {
		var styleIndex = singletonCounter++;
		styleElement = singletonElement || (singletonElement = createStyleElement(options));
		update = applyToSingletonTag.bind(null, styleElement, styleIndex, false);
		remove = applyToSingletonTag.bind(null, styleElement, styleIndex, true);
	} else if(obj.sourceMap &&
		typeof URL === "function" &&
		typeof URL.createObjectURL === "function" &&
		typeof URL.revokeObjectURL === "function" &&
		typeof Blob === "function" &&
		typeof btoa === "function") {
		styleElement = createLinkElement(options);
		update = updateLink.bind(null, styleElement);
		remove = function() {
			removeStyleElement(styleElement);
			if(styleElement.href)
				URL.revokeObjectURL(styleElement.href);
		};
	} else {
		styleElement = createStyleElement(options);
		update = applyToTag.bind(null, styleElement);
		remove = function() {
			removeStyleElement(styleElement);
		};
	}

	update(obj);

	return function updateStyle(newObj) {
		if(newObj) {
			if(newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap)
				return;
			update(obj = newObj);
		} else {
			remove();
		}
	};
}

var replaceText = (function () {
	var textStore = [];

	return function (index, replacement) {
		textStore[index] = replacement;
		return textStore.filter(Boolean).join('\n');
	};
})();

function applyToSingletonTag(styleElement, index, remove, obj) {
	var css = remove ? "" : obj.css;

	if (styleElement.styleSheet) {
		styleElement.styleSheet.cssText = replaceText(index, css);
	} else {
		var cssNode = document.createTextNode(css);
		var childNodes = styleElement.childNodes;
		if (childNodes[index]) styleElement.removeChild(childNodes[index]);
		if (childNodes.length) {
			styleElement.insertBefore(cssNode, childNodes[index]);
		} else {
			styleElement.appendChild(cssNode);
		}
	}
}

function applyToTag(styleElement, obj) {
	var css = obj.css;
	var media = obj.media;

	if(media) {
		styleElement.setAttribute("media", media)
	}

	if(styleElement.styleSheet) {
		styleElement.styleSheet.cssText = css;
	} else {
		while(styleElement.firstChild) {
			styleElement.removeChild(styleElement.firstChild);
		}
		styleElement.appendChild(document.createTextNode(css));
	}
}

function updateLink(linkElement, obj) {
	var css = obj.css;
	var sourceMap = obj.sourceMap;

	if(sourceMap) {
		// http://stackoverflow.com/a/26603875
		css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
	}

	var blob = new Blob([css], { type: "text/css" });

	var oldSrc = linkElement.href;

	linkElement.href = URL.createObjectURL(blob);

	if(oldSrc)
		URL.revokeObjectURL(oldSrc);
}


/***/ },

/***/ 1519:
/***/ function(module, exports, __webpack_require__) {

"use strict";


var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactDom = __webpack_require__(76);

var _reactDom2 = _interopRequireDefault(_reactDom);

var _redux = __webpack_require__(29);

var _reactRedux = __webpack_require__(12);

var _reduxThunk = __webpack_require__(77);

var _reduxThunk2 = _interopRequireDefault(_reduxThunk);

var _reducers = __webpack_require__(209);

var _reducers2 = _interopRequireDefault(_reducers);

var _router = __webpack_require__(210);

var _router2 = _interopRequireDefault(_router);

__webpack_require__(211);

__webpack_require__(212);

__webpack_require__(213);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

console.log("Hi!");

var App = function App() {
  var store = (0, _redux.createStore)(_reducers2.default, {}, (0, _redux.applyMiddleware)(_reduxThunk2.default));

  return _react2.default.createElement(
    _reactRedux.Provider,
    { store: store },
    _react2.default.createElement(_router2.default, null)
  );
};

_reactDom2.default.render(_react2.default.createElement(App, null), document.getElementById("root"));

/***/ },

/***/ 16:
/***/ function(module, exports, __webpack_require__) {

"use strict";


var _ = __webpack_require__(10);
var Artist = __webpack_require__(17);

var artists = _.times(20, function () {
  return Artist();
});

module.exports = artists;

/***/ },

/***/ 17:
/***/ function(module, exports, __webpack_require__) {

"use strict";


var _lodash = __webpack_require__(10);

var _lodash2 = _interopRequireDefault(_lodash);

var _faker = __webpack_require__(128);

var _faker2 = _interopRequireDefault(_faker);

var _constants = __webpack_require__(214);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function () {
  return {
    _id: _lodash2.default.uniqueId(),
    name: _faker2.default.name.findName(),
    age: randomBetween(15, 45),
    yearsActive: randomBetween(0, 15),
    image: _faker2.default.image.avatar(),
    genre: getGenre(),
    website: _faker2.default.internet.url(),
    netWorth: randomBetween(0, 5000000),
    labelName: _faker2.default.company.companyName(),
    retired: _faker2.default.random.boolean(),
    albums: getAlbums()
  };
};

function getAlbums() {
  return _lodash2.default.times(randomBetween(0, 5), function () {
    var copiesSold = randomBetween(0, 1000000);

    return {
      title: _lodash2.default.capitalize(_faker2.default.random.words()),
      date: _faker2.default.date.past(),
      copiesSold: copiesSold,
      numberTracks: randomBetween(1, 20),
      image: getAlbumImage(),
      revenue: copiesSold * 12.99
    };
  });
}

function getAlbumImage() {
  var types = _lodash2.default.keys(_faker2.default.image);
  var method = randomEntry(types);

  return _faker2.default.image[method]();
}

function getGenre() {
  return randomEntry(_constants.GENRES);
}

function randomEntry(array) {
  return array[~~(Math.random() * array.length)];
}

function randomBetween(min, max) {
  return ~~(Math.random() * (max - min)) + min;
}

/***/ },

/***/ 209:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _redux = __webpack_require__(29);

var _reduxForm = __webpack_require__(56);

var _FilterCriteriaReducer = __webpack_require__(239);

var _FilterCriteriaReducer2 = _interopRequireDefault(_FilterCriteriaReducer);

var _ArtistsReducer = __webpack_require__(237);

var _ArtistsReducer2 = _interopRequireDefault(_ArtistsReducer);

var _ErrorReducer = __webpack_require__(238);

var _ErrorReducer2 = _interopRequireDefault(_ErrorReducer);

var _SelectionReducer = __webpack_require__(240);

var _SelectionReducer2 = _interopRequireDefault(_SelectionReducer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = (0, _redux.combineReducers)({
  form: _reduxForm.reducer,
  filterCriteria: _FilterCriteriaReducer2.default,
  artists: _ArtistsReducer2.default,
  errors: _ErrorReducer2.default,
  selection: _SelectionReducer2.default
});

/***/ },

/***/ 210:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(35);

var _Home = __webpack_require__(225);

var _Home2 = _interopRequireDefault(_Home);

var _ArtistMain = __webpack_require__(231);

var _ArtistMain2 = _interopRequireDefault(_ArtistMain);

var _ArtistDetail = __webpack_require__(227);

var _ArtistDetail2 = _interopRequireDefault(_ArtistDetail);

var _ArtistCreate = __webpack_require__(226);

var _ArtistCreate2 = _interopRequireDefault(_ArtistCreate);

var _ArtistEdit = __webpack_require__(228);

var _ArtistEdit2 = _interopRequireDefault(_ArtistEdit);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Routes = function Routes() {
  return _react2.default.createElement(
    _reactRouter.Router,
    { history: _reactRouter.hashHistory },
    _react2.default.createElement(
      _reactRouter.Route,
      { path: '/', component: _Home2.default },
      _react2.default.createElement(_reactRouter.IndexRoute, { component: _ArtistMain2.default }),
      _react2.default.createElement(_reactRouter.Route, { path: 'artists/new', component: _ArtistCreate2.default }),
      _react2.default.createElement(_reactRouter.Route, { path: 'artists/:id', component: _ArtistDetail2.default }),
      _react2.default.createElement(_reactRouter.Route, { path: 'artists/:id/edit', component: _ArtistEdit2.default })
    )
  );
};

exports.default = Routes;

/***/ },

/***/ 211:
/***/ function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(242);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(127)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../node_modules/css-loader/index.js!./materialize.css", function() {
			var newContent = require("!!../node_modules/css-loader/index.js!./materialize.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ },

/***/ 212:
/***/ function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(243);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(127)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../node_modules/css-loader/index.js!./react-range.css", function() {
			var newContent = require("!!../node_modules/css-loader/index.js!./react-range.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ },

/***/ 213:
/***/ function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(244);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(127)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../node_modules/css-loader/index.js!./style.css", function() {
			var newContent = require("!!../node_modules/css-loader/index.js!./style.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ },

/***/ 214:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var GENRES = exports.GENRES = ['Acceptable Country', 'Acceptable Emo', 'Acceptable Pop', 'Acceptable Pop-Punk', 'Alt-Country', 'Alt-Rap', 'Bloghaus', 'Blog Rap', 'Blog Rock', 'Cold Wave', 'Cool Jazz', 'Digital Punk', 'Doom Metal', 'Freak Folk', 'Garage Rock', 'Hypnagogic Pop', 'Noise Pop', 'Power Electronics', 'Serialism', 'Witch House', 'Ye Olde Timey Rock And Roll Music of Indeterminate Hipster Variety'];

/***/ },

/***/ 215:
/***/ function(module, exports, __webpack_require__) {

"use strict";


var _ = __webpack_require__(10);
var Artist = __webpack_require__(17);
var db = __webpack_require__(16);

/**
 * Create a single artist in the artist collection.
 * @param {object} artistProps - Object containing a name, age, yearsActive, and genre
 * @return {promise} A promise that resolves with the Artist that was created
 */
module.exports = function (artistProps) {
  var artist = _.extend({}, artistProps, {
    _id: _.uniqueId(),
    age: parseInt(artistProps.age) || 20,
    yearsActive: parseInt(artistProps.yearsActive) || 5
  });
  db.push(artist);

  return new Promise(function (resolve, reject) {
    resolve(artist);
  });
};

/***/ },

/***/ 216:
/***/ function(module, exports, __webpack_require__) {

"use strict";


var _ = __webpack_require__(10);
var Artist = __webpack_require__(17);
var db = __webpack_require__(16);

/**
 * Deletes a single artist from the Artists collection
 * @param {string} _id - The ID of the artist to delete.
 * @return {promise} A promise that resolves when the record is deleted
 */
module.exports = function (_id) {
  _.each(db, function (artist, index) {
    if (artist && artist._id === _id) {
      db.splice(index, 1);
    }
  });

  return new Promise(function (resolve, reject) {
    return resolve();
  });
};

/***/ },

/***/ 217:
/***/ function(module, exports, __webpack_require__) {

"use strict";


var _ = __webpack_require__(10);
var Artist = __webpack_require__(17);
var db = __webpack_require__(16);

/**
 * Edits a single artist in the Artists collection
 * @param {string} _id - The ID of the artist to edit.
 * @param {object} artistProps - An object with a name, age, yearsActive, and genre
 * @return {promise} A promise that resolves when the record is edited
 */
module.exports = function (_id, artistProps) {
  var artist = _.find(db, function (a) {
    return a._id === _id;
  });
  _.extend(artist, artistProps);

  return new Promise(function (resolve, reject) {
    resolve();
  });
};

/***/ },

/***/ 218:
/***/ function(module, exports, __webpack_require__) {

"use strict";


var _ = __webpack_require__(10);
var Artist = __webpack_require__(17);
var db = __webpack_require__(16);

/**
 * Finds a single artist in the artist collection.
 * @param {string} _id - The ID of the record to find.
 * @return {promise} A promise that resolves with the Artist that matches the id
 */
module.exports = function (_id) {
  var artist = _.find(db, function (a) {
    return a._id === _id;
  });

  return new Promise(function (resolve, reject) {
    resolve(artist);
  });
};

/***/ },

/***/ 219:
/***/ function(module, exports, __webpack_require__) {

"use strict";


var _ = __webpack_require__(10);
var Artist = __webpack_require__(17);
var db = __webpack_require__(16);

/**
 * Finds the lowest and highest age of artists in the Artist collection
 * @return {promise} A promise that resolves with an object
 * containing the min and max ages, like { min: 16, max: 45 }.
 */
module.exports = function () {
  return new Promise(function (resolve, reject) {
    var range = {
      max: _.maxBy(db, function (a) {
        return a.age;
      }).age,
      min: _.minBy(db, function (a) {
        return a.age;
      }).age
    };

    resolve(range);
  });
};

/***/ },

/***/ 220:
/***/ function(module, exports, __webpack_require__) {

"use strict";


var _ = __webpack_require__(10);
var Artist = __webpack_require__(17);
var db = __webpack_require__(16);

/**
 * Finds the lowest and highest yearsActive of artists in the Artist collection
 * @return {promise} A promise that resolves with an object
 * containing the min and max yearsActive, like { min: 0, max: 14 }.
 */
module.exports = function () {
  return new Promise(function (resolve, reject) {
    var range = {
      max: _.maxBy(db, function (a) {
        return a.yearsActive;
      }).yearsActive,
      min: _.minBy(db, function (a) {
        return a.yearsActive;
      }).yearsActive
    };

    resolve(range);
  });
};

/***/ },

/***/ 221:
/***/ function(module, exports, __webpack_require__) {

"use strict";


var _ = __webpack_require__(10);
var Artist = __webpack_require__(17);
var db = __webpack_require__(16);

/**
 * Searches through the Artist collection
 * @param {object} criteria An object with a name, age, and yearsActive
 * @param {string} sortProperty The property to sort the results by
 * @param {integer} offset How many records to skip in the result set
 * @param {integer} limit How many records to return in the result set
 * @return {promise} A promise that resolves with the artists, count, offset, and limit
 */
module.exports = function (_criteria, sortProperty) {
  var offset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  var limit = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 20;

  var criteria = _.extend({
    age: { min: 0, max: 100 },
    yearsActive: { min: 0, max: 100 },
    name: ''
  }, _criteria);

  var artists = _.chain(db).filter(function (a) {
    return _.includes(_.lowerCase(a.name), _.lowerCase(criteria.name));
  }).filter(function (a) {
    return a.age > criteria.age.min && a.age < criteria.age.max;
  }).filter(function (a) {
    return a.yearsActive > criteria.yearsActive.min && a.yearsActive < criteria.yearsActive.max;
  }).sortBy(function (a) {
    return a[sortProperty];
  }).value();

  return new Promise(function (resolve, reject) {
    resolve(artists);
  });
};

/***/ },

/***/ 222:
/***/ function(module, exports, __webpack_require__) {

"use strict";


var _ = __webpack_require__(10);
var Artist = __webpack_require__(17);
var db = __webpack_require__(16);

/**
 * Sets a group of Artists as not retired
 * @param {array} _ids - An array of the _id's of of artists to update
 * @return {promise} A promise that resolves after the update
 */
module.exports = function (_ids) {
  return new Promise(function (resolve, reject) {
    var artists = _.chain(_ids).map(function (_id) {
      return _.find(db, function (a) {
        return a._id === _id;
      });
    }).tap(function (ids) {
      return console.log(ids);
    }).compact().each(function (a) {
      return a.retired = false;
    }).value();

    resolve();
  });
};

/***/ },

/***/ 223:
/***/ function(module, exports, __webpack_require__) {

"use strict";


var _ = __webpack_require__(10);
var Artist = __webpack_require__(17);
var db = __webpack_require__(16);

/**
 * Sets a group of Artists as retired
 * @param {array} _ids - An array of the _id's of of artists to update
 * @return {promise} A promise that resolves after the update
 */
module.exports = function (_ids) {
  return new Promise(function (resolve, reject) {
    var artists = _.chain(_ids).map(function (_id) {
      return _.find(db, function (a) {
        return a._id === _id;
      });
    }).compact().each(function (a) {
      return a.retired = true;
    }).value();

    resolve(artists);
  });
};

/***/ },

/***/ 224:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(35);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var db = __webpack_require__(16);

var Header = function (_Component) {
  _inherits(Header, _Component);

  function Header(props) {
    _classCallCheck(this, Header);

    var _this = _possibleConstructorReturn(this, (Header.__proto__ || Object.getPrototypeOf(Header)).call(this, props));

    _this.state = { id: null };
    return _this;
  }

  _createClass(Header, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      this.setLink();
    }
  }, {
    key: 'setLink',
    value: function setLink() {
      var index = _.random(0, db.length);
      this.setState({ id: index });
    }
  }, {
    key: 'render',
    value: function render() {
      return _react2.default.createElement(
        'div',
        { className: 'row' },
        _react2.default.createElement(
          'nav',
          null,
          _react2.default.createElement(
            'div',
            { className: 'nav-wrapper' },
            _react2.default.createElement(
              'div',
              { className: 'col s12' },
              _react2.default.createElement(
                'a',
                { href: '#', className: 'brand-logo' },
                'UpStar Music'
              ),
              _react2.default.createElement(
                'ul',
                { id: 'nav-mobile', className: 'right hide-on-med-and-down' },
                _react2.default.createElement(
                  'li',
                  null,
                  _react2.default.createElement(
                    _reactRouter.Link,
                    {
                      to: '/artists/' + this.state.id,
                      onClick: this.setLink.bind(this)
                    },
                    'Random Artist'
                  )
                ),
                _react2.default.createElement(
                  'li',
                  null,
                  _react2.default.createElement(
                    _reactRouter.Link,
                    { to: '/artists/new' },
                    'Create Artist'
                  )
                )
              )
            )
          )
        )
      );
    }
  }]);

  return Header;
}(_react.Component);

;

exports.default = Header;

/***/ },

/***/ 225:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _Header = __webpack_require__(224);

var _Header2 = _interopRequireDefault(_Header);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Home = function Home(_ref) {
  var children = _ref.children;

  return _react2.default.createElement(
    'div',
    { className: 'container' },
    _react2.default.createElement(_Header2.default, null),
    children
  );
};

exports.default = Home;

/***/ },

/***/ 226:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactRedux = __webpack_require__(12);

var _reduxForm = __webpack_require__(56);

var _actions = __webpack_require__(36);

var actions = _interopRequireWildcard(_actions);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ArtistCreate = function (_Component) {
  _inherits(ArtistCreate, _Component);

  function ArtistCreate() {
    _classCallCheck(this, ArtistCreate);

    return _possibleConstructorReturn(this, (ArtistCreate.__proto__ || Object.getPrototypeOf(ArtistCreate)).apply(this, arguments));
  }

  _createClass(ArtistCreate, [{
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      this.props.clearError();
    }
  }, {
    key: 'onSubmit',
    value: function onSubmit(formProps) {
      this.props.createArtist(formProps);
    }
  }, {
    key: 'render',
    value: function render() {
      var handleSubmit = this.props.handleSubmit;


      return _react2.default.createElement(
        'form',
        { onSubmit: handleSubmit(this.onSubmit.bind(this)) },
        _react2.default.createElement(
          'div',
          { className: 'input-field' },
          _react2.default.createElement(_reduxForm.Field, { name: 'name', component: 'input', placeholder: 'Name' })
        ),
        _react2.default.createElement(
          'div',
          { className: 'input-field' },
          _react2.default.createElement(_reduxForm.Field, { name: 'age', component: 'input', placeholder: 'Age' })
        ),
        _react2.default.createElement(
          'div',
          { className: 'input-field' },
          _react2.default.createElement(_reduxForm.Field, { name: 'yearsActive', component: 'input', placeholder: 'Years Active' })
        ),
        _react2.default.createElement(
          'div',
          { className: 'input-field' },
          _react2.default.createElement(_reduxForm.Field, { name: 'genre', component: 'input', placeholder: 'Genre' })
        ),
        _react2.default.createElement(
          'div',
          { className: 'has-error' },
          this.props.errorMessage
        ),
        _react2.default.createElement(
          'button',
          { className: 'btn' },
          'Submit'
        )
      );
    }
  }]);

  return ArtistCreate;
}(_react.Component);

var mapStateToProps = function mapStateToProps(state) {
  return {
    errorMessage: state.errors
  };
};

exports.default = (0, _reactRedux.connect)(mapStateToProps, actions)((0, _reduxForm.reduxForm)({
  form: 'create'
})(ArtistCreate));

/***/ },

/***/ 227:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactRedux = __webpack_require__(12);

var _reactRouter = __webpack_require__(35);

var _actions = __webpack_require__(36);

var actions = _interopRequireWildcard(_actions);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ArtistDetail = function (_Component) {
  _inherits(ArtistDetail, _Component);

  function ArtistDetail() {
    _classCallCheck(this, ArtistDetail);

    return _possibleConstructorReturn(this, (ArtistDetail.__proto__ || Object.getPrototypeOf(ArtistDetail)).apply(this, arguments));
  }

  _createClass(ArtistDetail, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      this.props.findArtist(this.props.params.id);
    }
  }, {
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      if (nextProps.params.id !== this.props.params.id) {
        this.props.findArtist(nextProps.params.id);
      }
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      this.props.resetArtist();
    }
  }, {
    key: 'onDeleteClick',
    value: function onDeleteClick() {
      this.props.deleteArtist(this.props.params.id);
    }
  }, {
    key: 'renderAlbums',
    value: function renderAlbums() {
      var albums = this.props.artist.albums;


      if (!albums || !albums.map) {
        return;
      }

      return albums.map(function (album) {
        return _react2.default.createElement(
          'div',
          { className: 'card album', key: album.title },
          _react2.default.createElement(
            'div',
            { className: 'card-image' },
            _react2.default.createElement('img', { src: album.image }),
            _react2.default.createElement(
              'span',
              { className: 'card-title' },
              _react2.default.createElement(
                'h4',
                null,
                album.title
              )
            )
          ),
          _react2.default.createElement(
            'div',
            { className: 'card-content' },
            _react2.default.createElement(
              'div',
              null,
              _react2.default.createElement(
                'h5',
                null,
                album.copiesSold
              ),
              _react2.default.createElement(
                'i',
                null,
                'copies sold'
              )
            ),
            _react2.default.createElement(
              'div',
              null,
              _react2.default.createElement(
                'h5',
                null,
                album.numberTracks
              ),
              _react2.default.createElement(
                'i',
                null,
                'tracks'
              )
            )
          )
        );
      });
    }
  }, {
    key: 'render',
    value: function render() {
      if (!this.props.artist) {
        return _react2.default.createElement(
          'div',
          null,
          'Todo: implement "FindArtist" query'
        );
      }

      var _props$artist = this.props.artist,
          name = _props$artist.name,
          age = _props$artist.age,
          genre = _props$artist.genre,
          image = _props$artist.image,
          yearsActive = _props$artist.yearsActive,
          netWorth = _props$artist.netWorth,
          labelName = _props$artist.labelName,
          _id = _props$artist._id;


      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'div',
          { className: 'spacer' },
          _react2.default.createElement(
            _reactRouter.Link,
            { to: '/' },
            'Back'
          ),
          _react2.default.createElement(
            _reactRouter.Link,
            { to: '/artists/' + _id + '/edit' },
            'Edit'
          ),
          _react2.default.createElement(
            'a',
            { onClick: this.onDeleteClick.bind(this) },
            'Delete'
          )
        ),
        _react2.default.createElement(
          'ul',
          { className: 'collection artist-detail' },
          _react2.default.createElement(
            'li',
            { className: 'collection-item header' },
            _react2.default.createElement(
              'div',
              null,
              _react2.default.createElement(
                'h3',
                null,
                name
              ),
              _react2.default.createElement(
                'h5',
                null,
                'Master of ',
                genre
              )
            ),
            _react2.default.createElement('image', { src: image, className: 'right' })
          ),
          _react2.default.createElement(
            'li',
            { className: 'collection-item' },
            _react2.default.createElement(
              'h5',
              null,
              yearsActive
            ),
            _react2.default.createElement(
              'p',
              null,
              _react2.default.createElement(
                'i',
                null,
                'Years Active'
              )
            )
          ),
          _react2.default.createElement(
            'li',
            { className: 'collection-item' },
            _react2.default.createElement(
              'h5',
              null,
              age
            ),
            _react2.default.createElement(
              'p',
              null,
              _react2.default.createElement(
                'i',
                null,
                'Years Old'
              )
            )
          ),
          _react2.default.createElement(
            'li',
            { className: 'collection-item' },
            _react2.default.createElement(
              'h5',
              null,
              '$',
              netWorth
            ),
            _react2.default.createElement(
              'p',
              null,
              _react2.default.createElement(
                'i',
                null,
                'Net Worth'
              )
            )
          ),
          _react2.default.createElement(
            'li',
            { className: 'collection-item' },
            _react2.default.createElement(
              'h5',
              null,
              labelName
            ),
            _react2.default.createElement(
              'p',
              null,
              _react2.default.createElement(
                'i',
                null,
                'Label'
              )
            )
          ),
          _react2.default.createElement(
            'li',
            { className: 'flex wrap' },
            this.renderAlbums()
          )
        )
      );
    }
  }]);

  return ArtistDetail;
}(_react.Component);

var mapStateToProps = function mapStateToProps(_ref) {
  var artists = _ref.artists;

  return { artist: artists.artist };
};

exports.default = (0, _reactRedux.connect)(mapStateToProps, actions)(ArtistDetail);

/***/ },

/***/ 228:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactRedux = __webpack_require__(12);

var _actions = __webpack_require__(36);

var actions = _interopRequireWildcard(_actions);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ArtistEdit = function (_Component) {
  _inherits(ArtistEdit, _Component);

  function ArtistEdit(props) {
    _classCallCheck(this, ArtistEdit);

    var _this = _possibleConstructorReturn(this, (ArtistEdit.__proto__ || Object.getPrototypeOf(ArtistEdit)).call(this, props));

    _this.state = {};
    return _this;
  }

  _createClass(ArtistEdit, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      this.props.findArtist(this.props.params.id);
    }
  }, {
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(_ref) {
      var artist = _ref.artist;

      if (artist) {
        var name = artist.name,
            age = artist.age,
            yearsActive = artist.yearsActive,
            genre = artist.genre;


        this.setState({ name: name, age: age, yearsActive: yearsActive, genre: genre });
      }
    }
  }, {
    key: 'componentWillUpdate',
    value: function componentWillUpdate(nextProps) {
      if (nextProps.params.id !== this.props.params.id) {
        this.props.findArtist(nextProps.params.id);
      }
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      this.props.clearError();
    }
  }, {
    key: 'onSubmit',
    value: function onSubmit(event) {
      event.preventDefault();
      event.stopPropagation();

      this.props.editArtist(this.props.params.id, this.state);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      return _react2.default.createElement(
        'form',
        { onSubmit: this.onSubmit.bind(this) },
        _react2.default.createElement(
          'div',
          { className: 'input-field' },
          _react2.default.createElement('input', {
            value: this.state.name,
            onChange: function onChange(e) {
              return _this2.setState({ name: e.target.value });
            },
            placeholder: 'Name'
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'input-field' },
          _react2.default.createElement('input', {
            value: this.state.age,
            onChange: function onChange(e) {
              return _this2.setState({ age: e.target.value });
            },
            placeholder: 'Age'
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'input-field' },
          _react2.default.createElement('input', {
            value: this.state.yearsActive,
            onChange: function onChange(e) {
              return _this2.setState({ yearsActive: e.target.value });
            },
            placeholder: 'Years Active'
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'input-field' },
          _react2.default.createElement('input', {
            value: this.state.genre,
            onChange: function onChange(e) {
              return _this2.setState({ genre: e.target.value });
            },
            placeholder: 'Genre'
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'has-error' },
          this.props.errorMessage
        ),
        _react2.default.createElement(
          'button',
          { className: 'btn' },
          'Submit'
        )
      );
    }
  }]);

  return ArtistEdit;
}(_react.Component);

var mapStateToProps = function mapStateToProps(state) {
  return {
    artist: state.artists.artist,
    errorMessage: state.errors
  };
};

exports.default = (0, _reactRedux.connect)(mapStateToProps, actions)(ArtistEdit);

/***/ },

/***/ 229:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = __webpack_require__(10);

var _lodash2 = _interopRequireDefault(_lodash);

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reduxForm = __webpack_require__(56);

var _reactRedux = __webpack_require__(12);

var _filters = __webpack_require__(236);

var _actions = __webpack_require__(36);

var actions = _interopRequireWildcard(_actions);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TEXT_FIELDS = [{ label: 'Name', prop: 'name' }];

var ArtistFilter = function (_Component) {
  _inherits(ArtistFilter, _Component);

  function ArtistFilter() {
    _classCallCheck(this, ArtistFilter);

    return _possibleConstructorReturn(this, (ArtistFilter.__proto__ || Object.getPrototypeOf(ArtistFilter)).apply(this, arguments));
  }

  _createClass(ArtistFilter, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      if (this.props.filters) {
        var criteria = _lodash2.default.extend({}, { name: '' }, this.props.filters);
        this.props.searchArtists(criteria);
      } else {
        this.props.searchArtists({
          name: '',
          sort: 'name'
        });
      }
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.props.setAgeRange();
      this.props.setYearsActiveRange();
    }
  }, {
    key: 'handleSubmit',
    value: function handleSubmit(formProps) {
      var criteria = _lodash2.default.extend({ name: '' }, formProps);
      this.props.searchArtists(criteria);
    }
  }, {
    key: 'renderInputs',
    value: function renderInputs() {
      return TEXT_FIELDS.map(function (_ref) {
        var label = _ref.label,
            prop = _ref.prop;
        return _react2.default.createElement(
          'div',
          { className: 'input-field', key: prop },
          _react2.default.createElement(_reduxForm.Field, {
            placeholder: label,
            id: prop,
            name: prop,
            component: 'input',
            type: 'text'
          })
        );
      });
    }
  }, {
    key: 'render',
    value: function render() {
      var handleSubmit = this.props.handleSubmit;


      return _react2.default.createElement(
        'div',
        { className: 'card blue-grey darken-1 row' },
        _react2.default.createElement(
          'div',
          { className: 'card-content white-text' },
          _react2.default.createElement(
            'form',
            { onSubmit: handleSubmit(this.handleSubmit.bind(this)) },
            _react2.default.createElement(
              'div',
              { className: 'center-align card-title' },
              'Search'
            ),
            this.renderInputs(),
            _react2.default.createElement(
              'div',
              { className: 'input-field' },
              _react2.default.createElement(_reduxForm.Field, {
                id: 'age',
                label: 'Age',
                component: _filters.Range,
                type: 'text',
                name: 'age',
                range: this.props.ageRange
              })
            ),
            _react2.default.createElement(
              'div',
              { className: 'input-field' },
              _react2.default.createElement(_reduxForm.Field, {
                id: 'years-active',
                label: 'Years Active',
                component: _filters.Range,
                type: 'text',
                name: 'yearsActive',
                range: this.props.yearsActive
              })
            ),
            _react2.default.createElement(
              'div',
              null,
              _react2.default.createElement(
                'label',
                { className: 'select', htmlFor: 'sort' },
                'Sort By'
              ),
              _react2.default.createElement(
                _reduxForm.Field,
                { id: 'sort', name: 'sort', component: 'select' },
                _react2.default.createElement(
                  'option',
                  { value: 'name' },
                  'Name'
                ),
                _react2.default.createElement(
                  'option',
                  { value: 'age' },
                  'Age'
                ),
                _react2.default.createElement(
                  'option',
                  { value: 'albums' },
                  'Albums Released'
                )
              )
            ),
            _react2.default.createElement(
              'div',
              { className: 'center-align' },
              _react2.default.createElement(
                'button',
                { className: 'btn' },
                'Submit'
              )
            )
          )
        )
      );
    }
  }]);

  return ArtistFilter;
}(_react.Component);

var mapStateToProps = function mapStateToProps(state) {
  var filterCriteria = state.filterCriteria;


  return {
    yearsActive: filterCriteria.yearsActive,
    ageRange: filterCriteria.age,
    filters: state.form.filters && state.form.filters.values
  };
};

exports.default = (0, _reactRedux.connect)(mapStateToProps, actions)((0, _reduxForm.reduxForm)({
  destroyOnUnmount: false,
  form: 'filters',
  initialValues: { sort: 'name' }
})(ArtistFilter));

/***/ },

/***/ 230:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = __webpack_require__(10);

var _lodash2 = _interopRequireDefault(_lodash);

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(35);

var _reactRedux = __webpack_require__(12);

var _Paginator = __webpack_require__(232);

var _Paginator2 = _interopRequireDefault(_Paginator);

var _actions = __webpack_require__(36);

var actions = _interopRequireWildcard(_actions);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ArtistIndex = function (_Component) {
  _inherits(ArtistIndex, _Component);

  function ArtistIndex() {
    _classCallCheck(this, ArtistIndex);

    return _possibleConstructorReturn(this, (ArtistIndex.__proto__ || Object.getPrototypeOf(ArtistIndex)).apply(this, arguments));
  }

  _createClass(ArtistIndex, [{
    key: 'onChange',
    value: function onChange(_id) {
      if (_lodash2.default.includes(this.props.selection, _id)) {
        this.props.deselectArtist(_id);
      } else {
        this.props.selectArtist(_id);
      }
    }
  }, {
    key: 'renderList',
    value: function renderList(artist) {
      var _this2 = this;

      var _id = artist._id;

      var classes = 'collection-item avatar ' + (artist.retired && 'retired');

      return _react2.default.createElement(
        'li',
        { className: classes, key: _id },
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement('input', {
            id: _id,
            type: 'checkbox',
            checked: _lodash2.default.includes(this.props.selection, _id),
            onChange: function onChange() {
              return _this2.onChange(_id);
            }
          }),
          _react2.default.createElement('label', { htmlFor: _id })
        ),
        _react2.default.createElement('img', { src: artist.image, className: 'circle' }),
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'span',
            { className: 'title' },
            _react2.default.createElement(
              'strong',
              null,
              artist.name
            )
          ),
          _react2.default.createElement(
            'p',
            null,
            _react2.default.createElement(
              'b',
              null,
              artist.age
            ),
            ' years old',
            _react2.default.createElement('br', null),
            artist.albums ? artist.albums.length : 0,
            ' albums released'
          )
        ),
        _react2.default.createElement(
          _reactRouter.Link,
          { to: 'artists/' + artist._id, className: 'secondary-content' },
          _react2.default.createElement(
            'i',
            { className: 'material-icons' },
            '>'
          )
        )
      );
    }
  }, {
    key: 'renderPaginator',
    value: function renderPaginator() {
      if (this.props.artists.all.length) {
        return _react2.default.createElement(_Paginator2.default, null);
      }
    }
  }, {
    key: 'renderEmptyCollection',
    value: function renderEmptyCollection() {
      if (this.props.artists.all.length) {
        return;
      }

      return _react2.default.createElement(
        'div',
        { className: 'center-align' },
        _react2.default.createElement(
          'h5',
          null,
          'No records found!'
        ),
        _react2.default.createElement(
          'div',
          null,
          'Try searching again'
        )
      );
    }
  }, {
    key: 'renderRetire',
    value: function renderRetire() {
      var _this3 = this;

      if (this.props.selection.length) {
        return _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'button',
            {
              className: 'btn',
              onClick: function onClick() {
                return _this3.props.setRetired(_this3.props.selection);
              }
            },
            'Retire'
          ),
          _react2.default.createElement(
            'button',
            {
              className: 'btn',
              onClick: function onClick() {
                return _this3.props.setNotRetired(_this3.props.selection);
              }
            },
            'Unretire'
          )
        );
      }
    }
  }, {
    key: 'render',
    value: function render() {
      return _react2.default.createElement(
        'div',
        null,
        this.renderRetire(),
        _react2.default.createElement(
          'ul',
          { className: 'collection' },
          this.props.artists.all.map(this.renderList.bind(this)),
          this.renderEmptyCollection()
        ),
        this.renderPaginator()
      );
    }
  }]);

  return ArtistIndex;
}(_react.Component);

var mapStateToProps = function mapStateToProps(_ref) {
  var artists = _ref.artists,
      selection = _ref.selection;
  return { artists: artists, selection: selection };
};

exports.default = (0, _reactRedux.connect)(mapStateToProps, actions)(ArtistIndex);

/***/ },

/***/ 231:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _ArtistFilter = __webpack_require__(229);

var _ArtistFilter2 = _interopRequireDefault(_ArtistFilter);

var _ArtistIndex = __webpack_require__(230);

var _ArtistIndex2 = _interopRequireDefault(_ArtistIndex);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ArtistMain = function (_Component) {
  _inherits(ArtistMain, _Component);

  function ArtistMain() {
    _classCallCheck(this, ArtistMain);

    return _possibleConstructorReturn(this, (ArtistMain.__proto__ || Object.getPrototypeOf(ArtistMain)).apply(this, arguments));
  }

  _createClass(ArtistMain, [{
    key: 'render',
    value: function render() {
      return _react2.default.createElement(
        'div',
        { className: 'row' },
        _react2.default.createElement(
          'div',
          { className: 'col s4' },
          _react2.default.createElement(_ArtistFilter2.default, null)
        ),
        _react2.default.createElement(
          'div',
          { className: 'col s8' },
          _react2.default.createElement(_ArtistIndex2.default, null)
        )
      );
    }
  }]);

  return ArtistMain;
}(_react.Component);

exports.default = ArtistMain;

/***/ },

/***/ 232:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactRedux = __webpack_require__(12);

var _actions = __webpack_require__(36);

var actions = _interopRequireWildcard(_actions);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Paginator = function (_Component) {
  _inherits(Paginator, _Component);

  function Paginator() {
    _classCallCheck(this, Paginator);

    return _possibleConstructorReturn(this, (Paginator.__proto__ || Object.getPrototypeOf(Paginator)).apply(this, arguments));
  }

  _createClass(Paginator, [{
    key: 'back',
    value: function back() {
      var _props = this.props,
          offset = _props.offset,
          limit = _props.limit,
          values = _props.form.filters.values;


      if (offset === 0) {
        return;
      }

      this.props.searchArtists(values, offset - 10, limit);
    }
  }, {
    key: 'advance',
    value: function advance() {
      var _props2 = this.props,
          offset = _props2.offset,
          limit = _props2.limit,
          count = _props2.count,
          values = _props2.form.filters.values;


      if (offset + limit > count) {
        return;
      }

      this.props.searchArtists(values, offset + 10, limit);
    }
  }, {
    key: 'left',
    value: function left() {
      return _react2.default.createElement(
        'li',
        { className: this.props.offset === 0 ? 'disabled' : '' },
        _react2.default.createElement(
          'a',
          { onClick: this.back.bind(this) },
          _react2.default.createElement(
            'i',
            { className: 'material-icons' },
            'chevron_left'
          )
        )
      );
    }
  }, {
    key: 'right',
    value: function right() {
      var _props3 = this.props,
          offset = _props3.offset,
          limit = _props3.limit,
          count = _props3.count;


      var end = offset + limit >= count ? true : false;

      return _react2.default.createElement(
        'li',
        { className: end ? 'disabled' : '' },
        _react2.default.createElement(
          'a',
          { onClick: this.advance.bind(this) },
          _react2.default.createElement(
            'i',
            { className: 'material-icons' },
            'chevron_right'
          )
        )
      );
    }
  }, {
    key: 'render',
    value: function render() {
      return _react2.default.createElement(
        'div',
        { className: 'center-align' },
        _react2.default.createElement(
          'ul',
          { className: 'pagination' },
          this.left(),
          _react2.default.createElement(
            'li',
            null,
            _react2.default.createElement(
              'a',
              null,
              'Page ',
              this.props.offset / 10 + 1
            )
          ),
          this.right()
        ),
        this.props.count,
        ' Records Found'
      );
    }
  }]);

  return Paginator;
}(_react.Component);

var mapStateToProps = function mapStateToProps(_ref) {
  var artists = _ref.artists,
      form = _ref.form;
  var limit = artists.limit,
      offset = artists.offset,
      count = artists.count;


  return { limit: limit, offset: offset, count: count, form: form };
};

exports.default = (0, _reactRedux.connect)(mapStateToProps, actions)(Paginator);

/***/ },

/***/ 233:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Picker = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Picker = function Picker() {
  return _react2.default.createElement(
    'div',
    null,
    'Picker'
  );
};

exports.Picker = Picker;

/***/ },

/***/ 234:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Range = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactInputRange = __webpack_require__(129);

var _reactInputRange2 = _interopRequireDefault(_reactInputRange);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Range = function (_Component) {
  _inherits(Range, _Component);

  function Range() {
    _classCallCheck(this, Range);

    return _possibleConstructorReturn(this, (Range.__proto__ || Object.getPrototypeOf(Range)).apply(this, arguments));
  }

  _createClass(Range, [{
    key: 'onChange',
    value: function onChange(component, values) {
      var onChange = this.props.input.onChange;


      onChange(values);
    }
  }, {
    key: 'render',
    value: function render() {
      var value = this.props.input.value;


      return _react2.default.createElement(
        'div',
        { className: 'range-slider' },
        _react2.default.createElement(
          'label',
          null,
          this.props.label
        ),
        _react2.default.createElement(_reactInputRange2.default, {
          onChange: this.onChange.bind(this),
          minValue: parseInt(this.props.range.min),
          maxValue: parseInt(this.props.range.max),
          value: value || this.props.range
        })
      );
    }
  }]);

  return Range;
}(_react.Component);

;

Range.defaultProps = {
  range: { min: 0, max: 100 }
};

exports.Range = Range;

/***/ },

/***/ 235:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Switch = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Switch = function Switch() {
  return _react2.default.createElement(
    'div',
    null,
    'Switch'
  );
};

exports.Switch = Switch;

/***/ },

/***/ 236:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Picker = __webpack_require__(233);

Object.keys(_Picker).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _Picker[key];
    }
  });
});

var _Range = __webpack_require__(234);

Object.keys(_Range).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _Range[key];
    }
  });
});

var _Switch = __webpack_require__(235);

Object.keys(_Switch).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _Switch[key];
    }
  });
});

/***/ },

/***/ 237:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = __webpack_require__(10);

var _lodash2 = _interopRequireDefault(_lodash);

var _types = __webpack_require__(44);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var INITIAL_STATE = {
  all: [],
  offset: 0,
  limit: 20,
  count: 0
};

exports.default = function () {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : INITIAL_STATE;
  var action = arguments[1];

  switch (action.type) {
    case _types.SEARCH_ARTISTS:
      return _lodash2.default.extend({}, state, {
        count: action.payload.length,
        all: action.payload
      });
    case _types.FIND_ARTIST:
      return _lodash2.default.extend({}, state, { artist: action.payload });
    case _types.RESET_ARTIST:
      return _lodash2.default.extend({}, state, { artist: null });
    default:
      return state;
  }
};

/***/ },

/***/ 238:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _types = __webpack_require__(44);

exports.default = function () {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var action = arguments[1];

  switch (action.type) {
    case _types.CREATE_ERROR:
      return 'There was an error inserting this record';
    case _types.CLEAR_ERROR:
      return '';
    default:
      return state;
  }
};

/***/ },

/***/ 239:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = __webpack_require__(10);

var _lodash2 = _interopRequireDefault(_lodash);

var _types = __webpack_require__(44);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var INITIAL_STATE = {
  age: { min: 0, max: 100 }
};

exports.default = function () {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : INITIAL_STATE;
  var action = arguments[1];

  switch (action.type) {
    case _types.SET_AGE_RANGE:
      return _lodash2.default.extend({}, state, { age: action.payload });
    case _types.SET_YEARS_ACTIVE_RANGE:
      return _lodash2.default.extend({}, state, { yearsActive: action.payload });
    default:
      return state;
  }
};

/***/ },

/***/ 240:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = __webpack_require__(10);

var _lodash2 = _interopRequireDefault(_lodash);

var _types = __webpack_require__(44);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

exports.default = function () {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var action = arguments[1];

  switch (action.type) {
    case _types.SELECT_ARTIST:
      return [].concat(_toConsumableArray(state), [action.payload]);
    case _types.DESELECT_ARTIST:
      return _lodash2.default.without(state, action.payload);
    case _types.RESET_SELECTION:
      return [];
    default:
      return state;
  }
};

/***/ },

/***/ 242:
/***/ function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(78)();
// imports


// module
exports.push([module.i, "/*!\n * Materialize v0.97.8 (http://materializecss.com)\n * Copyright 2014-2015 Materialize\n * MIT License (https://raw.githubusercontent.com/Dogfalo/materialize/master/LICENSE)\n */\n.materialize-red {\n  background-color: #e51c23 !important;\n}\n\n.materialize-red-text {\n  color: #e51c23 !important;\n}\n\n.materialize-red.lighten-5 {\n  background-color: #fdeaeb !important;\n}\n\n.materialize-red-text.text-lighten-5 {\n  color: #fdeaeb !important;\n}\n\n.materialize-red.lighten-4 {\n  background-color: #f8c1c3 !important;\n}\n\n.materialize-red-text.text-lighten-4 {\n  color: #f8c1c3 !important;\n}\n\n.materialize-red.lighten-3 {\n  background-color: #f3989b !important;\n}\n\n.materialize-red-text.text-lighten-3 {\n  color: #f3989b !important;\n}\n\n.materialize-red.lighten-2 {\n  background-color: #ee6e73 !important;\n}\n\n.materialize-red-text.text-lighten-2 {\n  color: #ee6e73 !important;\n}\n\n.materialize-red.lighten-1 {\n  background-color: #ea454b !important;\n}\n\n.materialize-red-text.text-lighten-1 {\n  color: #ea454b !important;\n}\n\n.materialize-red.darken-1 {\n  background-color: #d0181e !important;\n}\n\n.materialize-red-text.text-darken-1 {\n  color: #d0181e !important;\n}\n\n.materialize-red.darken-2 {\n  background-color: #b9151b !important;\n}\n\n.materialize-red-text.text-darken-2 {\n  color: #b9151b !important;\n}\n\n.materialize-red.darken-3 {\n  background-color: #a21318 !important;\n}\n\n.materialize-red-text.text-darken-3 {\n  color: #a21318 !important;\n}\n\n.materialize-red.darken-4 {\n  background-color: #8b1014 !important;\n}\n\n.materialize-red-text.text-darken-4 {\n  color: #8b1014 !important;\n}\n\n.red {\n  background-color: #F44336 !important;\n}\n\n.red-text {\n  color: #F44336 !important;\n}\n\n.red.lighten-5 {\n  background-color: #FFEBEE !important;\n}\n\n.red-text.text-lighten-5 {\n  color: #FFEBEE !important;\n}\n\n.red.lighten-4 {\n  background-color: #FFCDD2 !important;\n}\n\n.red-text.text-lighten-4 {\n  color: #FFCDD2 !important;\n}\n\n.red.lighten-3 {\n  background-color: #EF9A9A !important;\n}\n\n.red-text.text-lighten-3 {\n  color: #EF9A9A !important;\n}\n\n.red.lighten-2 {\n  background-color: #E57373 !important;\n}\n\n.red-text.text-lighten-2 {\n  color: #E57373 !important;\n}\n\n.red.lighten-1 {\n  background-color: #EF5350 !important;\n}\n\n.red-text.text-lighten-1 {\n  color: #EF5350 !important;\n}\n\n.red.darken-1 {\n  background-color: #E53935 !important;\n}\n\n.red-text.text-darken-1 {\n  color: #E53935 !important;\n}\n\n.red.darken-2 {\n  background-color: #D32F2F !important;\n}\n\n.red-text.text-darken-2 {\n  color: #D32F2F !important;\n}\n\n.red.darken-3 {\n  background-color: #C62828 !important;\n}\n\n.red-text.text-darken-3 {\n  color: #C62828 !important;\n}\n\n.red.darken-4 {\n  background-color: #B71C1C !important;\n}\n\n.red-text.text-darken-4 {\n  color: #B71C1C !important;\n}\n\n.red.accent-1 {\n  background-color: #FF8A80 !important;\n}\n\n.red-text.text-accent-1 {\n  color: #FF8A80 !important;\n}\n\n.red.accent-2 {\n  background-color: #FF5252 !important;\n}\n\n.red-text.text-accent-2 {\n  color: #FF5252 !important;\n}\n\n.red.accent-3 {\n  background-color: #FF1744 !important;\n}\n\n.red-text.text-accent-3 {\n  color: #FF1744 !important;\n}\n\n.red.accent-4 {\n  background-color: #D50000 !important;\n}\n\n.red-text.text-accent-4 {\n  color: #D50000 !important;\n}\n\n.pink {\n  background-color: #e91e63 !important;\n}\n\n.pink-text {\n  color: #e91e63 !important;\n}\n\n.pink.lighten-5 {\n  background-color: #fce4ec !important;\n}\n\n.pink-text.text-lighten-5 {\n  color: #fce4ec !important;\n}\n\n.pink.lighten-4 {\n  background-color: #f8bbd0 !important;\n}\n\n.pink-text.text-lighten-4 {\n  color: #f8bbd0 !important;\n}\n\n.pink.lighten-3 {\n  background-color: #f48fb1 !important;\n}\n\n.pink-text.text-lighten-3 {\n  color: #f48fb1 !important;\n}\n\n.pink.lighten-2 {\n  background-color: #f06292 !important;\n}\n\n.pink-text.text-lighten-2 {\n  color: #f06292 !important;\n}\n\n.pink.lighten-1 {\n  background-color: #ec407a !important;\n}\n\n.pink-text.text-lighten-1 {\n  color: #ec407a !important;\n}\n\n.pink.darken-1 {\n  background-color: #d81b60 !important;\n}\n\n.pink-text.text-darken-1 {\n  color: #d81b60 !important;\n}\n\n.pink.darken-2 {\n  background-color: #c2185b !important;\n}\n\n.pink-text.text-darken-2 {\n  color: #c2185b !important;\n}\n\n.pink.darken-3 {\n  background-color: #ad1457 !important;\n}\n\n.pink-text.text-darken-3 {\n  color: #ad1457 !important;\n}\n\n.pink.darken-4 {\n  background-color: #880e4f !important;\n}\n\n.pink-text.text-darken-4 {\n  color: #880e4f !important;\n}\n\n.pink.accent-1 {\n  background-color: #ff80ab !important;\n}\n\n.pink-text.text-accent-1 {\n  color: #ff80ab !important;\n}\n\n.pink.accent-2 {\n  background-color: #ff4081 !important;\n}\n\n.pink-text.text-accent-2 {\n  color: #ff4081 !important;\n}\n\n.pink.accent-3 {\n  background-color: #f50057 !important;\n}\n\n.pink-text.text-accent-3 {\n  color: #f50057 !important;\n}\n\n.pink.accent-4 {\n  background-color: #c51162 !important;\n}\n\n.pink-text.text-accent-4 {\n  color: #c51162 !important;\n}\n\n.purple {\n  background-color: #9c27b0 !important;\n}\n\n.purple-text {\n  color: #9c27b0 !important;\n}\n\n.purple.lighten-5 {\n  background-color: #f3e5f5 !important;\n}\n\n.purple-text.text-lighten-5 {\n  color: #f3e5f5 !important;\n}\n\n.purple.lighten-4 {\n  background-color: #e1bee7 !important;\n}\n\n.purple-text.text-lighten-4 {\n  color: #e1bee7 !important;\n}\n\n.purple.lighten-3 {\n  background-color: #ce93d8 !important;\n}\n\n.purple-text.text-lighten-3 {\n  color: #ce93d8 !important;\n}\n\n.purple.lighten-2 {\n  background-color: #ba68c8 !important;\n}\n\n.purple-text.text-lighten-2 {\n  color: #ba68c8 !important;\n}\n\n.purple.lighten-1 {\n  background-color: #ab47bc !important;\n}\n\n.purple-text.text-lighten-1 {\n  color: #ab47bc !important;\n}\n\n.purple.darken-1 {\n  background-color: #8e24aa !important;\n}\n\n.purple-text.text-darken-1 {\n  color: #8e24aa !important;\n}\n\n.purple.darken-2 {\n  background-color: #7b1fa2 !important;\n}\n\n.purple-text.text-darken-2 {\n  color: #7b1fa2 !important;\n}\n\n.purple.darken-3 {\n  background-color: #6a1b9a !important;\n}\n\n.purple-text.text-darken-3 {\n  color: #6a1b9a !important;\n}\n\n.purple.darken-4 {\n  background-color: #4a148c !important;\n}\n\n.purple-text.text-darken-4 {\n  color: #4a148c !important;\n}\n\n.purple.accent-1 {\n  background-color: #ea80fc !important;\n}\n\n.purple-text.text-accent-1 {\n  color: #ea80fc !important;\n}\n\n.purple.accent-2 {\n  background-color: #e040fb !important;\n}\n\n.purple-text.text-accent-2 {\n  color: #e040fb !important;\n}\n\n.purple.accent-3 {\n  background-color: #d500f9 !important;\n}\n\n.purple-text.text-accent-3 {\n  color: #d500f9 !important;\n}\n\n.purple.accent-4 {\n  background-color: #aa00ff !important;\n}\n\n.purple-text.text-accent-4 {\n  color: #aa00ff !important;\n}\n\n.deep-purple {\n  background-color: #673ab7 !important;\n}\n\n.deep-purple-text {\n  color: #673ab7 !important;\n}\n\n.deep-purple.lighten-5 {\n  background-color: #ede7f6 !important;\n}\n\n.deep-purple-text.text-lighten-5 {\n  color: #ede7f6 !important;\n}\n\n.deep-purple.lighten-4 {\n  background-color: #d1c4e9 !important;\n}\n\n.deep-purple-text.text-lighten-4 {\n  color: #d1c4e9 !important;\n}\n\n.deep-purple.lighten-3 {\n  background-color: #b39ddb !important;\n}\n\n.deep-purple-text.text-lighten-3 {\n  color: #b39ddb !important;\n}\n\n.deep-purple.lighten-2 {\n  background-color: #9575cd !important;\n}\n\n.deep-purple-text.text-lighten-2 {\n  color: #9575cd !important;\n}\n\n.deep-purple.lighten-1 {\n  background-color: #7e57c2 !important;\n}\n\n.deep-purple-text.text-lighten-1 {\n  color: #7e57c2 !important;\n}\n\n.deep-purple.darken-1 {\n  background-color: #5e35b1 !important;\n}\n\n.deep-purple-text.text-darken-1 {\n  color: #5e35b1 !important;\n}\n\n.deep-purple.darken-2 {\n  background-color: #512da8 !important;\n}\n\n.deep-purple-text.text-darken-2 {\n  color: #512da8 !important;\n}\n\n.deep-purple.darken-3 {\n  background-color: #4527a0 !important;\n}\n\n.deep-purple-text.text-darken-3 {\n  color: #4527a0 !important;\n}\n\n.deep-purple.darken-4 {\n  background-color: #311b92 !important;\n}\n\n.deep-purple-text.text-darken-4 {\n  color: #311b92 !important;\n}\n\n.deep-purple.accent-1 {\n  background-color: #b388ff !important;\n}\n\n.deep-purple-text.text-accent-1 {\n  color: #b388ff !important;\n}\n\n.deep-purple.accent-2 {\n  background-color: #7c4dff !important;\n}\n\n.deep-purple-text.text-accent-2 {\n  color: #7c4dff !important;\n}\n\n.deep-purple.accent-3 {\n  background-color: #651fff !important;\n}\n\n.deep-purple-text.text-accent-3 {\n  color: #651fff !important;\n}\n\n.deep-purple.accent-4 {\n  background-color: #6200ea !important;\n}\n\n.deep-purple-text.text-accent-4 {\n  color: #6200ea !important;\n}\n\n.indigo {\n  background-color: #3f51b5 !important;\n}\n\n.indigo-text {\n  color: #3f51b5 !important;\n}\n\n.indigo.lighten-5 {\n  background-color: #e8eaf6 !important;\n}\n\n.indigo-text.text-lighten-5 {\n  color: #e8eaf6 !important;\n}\n\n.indigo.lighten-4 {\n  background-color: #c5cae9 !important;\n}\n\n.indigo-text.text-lighten-4 {\n  color: #c5cae9 !important;\n}\n\n.indigo.lighten-3 {\n  background-color: #9fa8da !important;\n}\n\n.indigo-text.text-lighten-3 {\n  color: #9fa8da !important;\n}\n\n.indigo.lighten-2 {\n  background-color: #7986cb !important;\n}\n\n.indigo-text.text-lighten-2 {\n  color: #7986cb !important;\n}\n\n.indigo.lighten-1 {\n  background-color: #5c6bc0 !important;\n}\n\n.indigo-text.text-lighten-1 {\n  color: #5c6bc0 !important;\n}\n\n.indigo.darken-1 {\n  background-color: #3949ab !important;\n}\n\n.indigo-text.text-darken-1 {\n  color: #3949ab !important;\n}\n\n.indigo.darken-2 {\n  background-color: #303f9f !important;\n}\n\n.indigo-text.text-darken-2 {\n  color: #303f9f !important;\n}\n\n.indigo.darken-3 {\n  background-color: #283593 !important;\n}\n\n.indigo-text.text-darken-3 {\n  color: #283593 !important;\n}\n\n.indigo.darken-4 {\n  background-color: #1a237e !important;\n}\n\n.indigo-text.text-darken-4 {\n  color: #1a237e !important;\n}\n\n.indigo.accent-1 {\n  background-color: #8c9eff !important;\n}\n\n.indigo-text.text-accent-1 {\n  color: #8c9eff !important;\n}\n\n.indigo.accent-2 {\n  background-color: #536dfe !important;\n}\n\n.indigo-text.text-accent-2 {\n  color: #536dfe !important;\n}\n\n.indigo.accent-3 {\n  background-color: #3d5afe !important;\n}\n\n.indigo-text.text-accent-3 {\n  color: #3d5afe !important;\n}\n\n.indigo.accent-4 {\n  background-color: #304ffe !important;\n}\n\n.indigo-text.text-accent-4 {\n  color: #304ffe !important;\n}\n\n.blue {\n  background-color: #2196F3 !important;\n}\n\n.blue-text {\n  color: #2196F3 !important;\n}\n\n.blue.lighten-5 {\n  background-color: #E3F2FD !important;\n}\n\n.blue-text.text-lighten-5 {\n  color: #E3F2FD !important;\n}\n\n.blue.lighten-4 {\n  background-color: #BBDEFB !important;\n}\n\n.blue-text.text-lighten-4 {\n  color: #BBDEFB !important;\n}\n\n.blue.lighten-3 {\n  background-color: #90CAF9 !important;\n}\n\n.blue-text.text-lighten-3 {\n  color: #90CAF9 !important;\n}\n\n.blue.lighten-2 {\n  background-color: #64B5F6 !important;\n}\n\n.blue-text.text-lighten-2 {\n  color: #64B5F6 !important;\n}\n\n.blue.lighten-1 {\n  background-color: #42A5F5 !important;\n}\n\n.blue-text.text-lighten-1 {\n  color: #42A5F5 !important;\n}\n\n.blue.darken-1 {\n  background-color: #1E88E5 !important;\n}\n\n.blue-text.text-darken-1 {\n  color: #1E88E5 !important;\n}\n\n.blue.darken-2 {\n  background-color: #1976D2 !important;\n}\n\n.blue-text.text-darken-2 {\n  color: #1976D2 !important;\n}\n\n.blue.darken-3 {\n  background-color: #1565C0 !important;\n}\n\n.blue-text.text-darken-3 {\n  color: #1565C0 !important;\n}\n\n.blue.darken-4 {\n  background-color: #0D47A1 !important;\n}\n\n.blue-text.text-darken-4 {\n  color: #0D47A1 !important;\n}\n\n.blue.accent-1 {\n  background-color: #82B1FF !important;\n}\n\n.blue-text.text-accent-1 {\n  color: #82B1FF !important;\n}\n\n.blue.accent-2 {\n  background-color: #448AFF !important;\n}\n\n.blue-text.text-accent-2 {\n  color: #448AFF !important;\n}\n\n.blue.accent-3 {\n  background-color: #2979FF !important;\n}\n\n.blue-text.text-accent-3 {\n  color: #2979FF !important;\n}\n\n.blue.accent-4 {\n  background-color: #2962FF !important;\n}\n\n.blue-text.text-accent-4 {\n  color: #2962FF !important;\n}\n\n.light-blue {\n  background-color: #03a9f4 !important;\n}\n\n.light-blue-text {\n  color: #03a9f4 !important;\n}\n\n.light-blue.lighten-5 {\n  background-color: #e1f5fe !important;\n}\n\n.light-blue-text.text-lighten-5 {\n  color: #e1f5fe !important;\n}\n\n.light-blue.lighten-4 {\n  background-color: #b3e5fc !important;\n}\n\n.light-blue-text.text-lighten-4 {\n  color: #b3e5fc !important;\n}\n\n.light-blue.lighten-3 {\n  background-color: #81d4fa !important;\n}\n\n.light-blue-text.text-lighten-3 {\n  color: #81d4fa !important;\n}\n\n.light-blue.lighten-2 {\n  background-color: #4fc3f7 !important;\n}\n\n.light-blue-text.text-lighten-2 {\n  color: #4fc3f7 !important;\n}\n\n.light-blue.lighten-1 {\n  background-color: #29b6f6 !important;\n}\n\n.light-blue-text.text-lighten-1 {\n  color: #29b6f6 !important;\n}\n\n.light-blue.darken-1 {\n  background-color: #039be5 !important;\n}\n\n.light-blue-text.text-darken-1 {\n  color: #039be5 !important;\n}\n\n.light-blue.darken-2 {\n  background-color: #0288d1 !important;\n}\n\n.light-blue-text.text-darken-2 {\n  color: #0288d1 !important;\n}\n\n.light-blue.darken-3 {\n  background-color: #0277bd !important;\n}\n\n.light-blue-text.text-darken-3 {\n  color: #0277bd !important;\n}\n\n.light-blue.darken-4 {\n  background-color: #01579b !important;\n}\n\n.light-blue-text.text-darken-4 {\n  color: #01579b !important;\n}\n\n.light-blue.accent-1 {\n  background-color: #80d8ff !important;\n}\n\n.light-blue-text.text-accent-1 {\n  color: #80d8ff !important;\n}\n\n.light-blue.accent-2 {\n  background-color: #40c4ff !important;\n}\n\n.light-blue-text.text-accent-2 {\n  color: #40c4ff !important;\n}\n\n.light-blue.accent-3 {\n  background-color: #00b0ff !important;\n}\n\n.light-blue-text.text-accent-3 {\n  color: #00b0ff !important;\n}\n\n.light-blue.accent-4 {\n  background-color: #0091ea !important;\n}\n\n.light-blue-text.text-accent-4 {\n  color: #0091ea !important;\n}\n\n.cyan {\n  background-color: #00bcd4 !important;\n}\n\n.cyan-text {\n  color: #00bcd4 !important;\n}\n\n.cyan.lighten-5 {\n  background-color: #e0f7fa !important;\n}\n\n.cyan-text.text-lighten-5 {\n  color: #e0f7fa !important;\n}\n\n.cyan.lighten-4 {\n  background-color: #b2ebf2 !important;\n}\n\n.cyan-text.text-lighten-4 {\n  color: #b2ebf2 !important;\n}\n\n.cyan.lighten-3 {\n  background-color: #80deea !important;\n}\n\n.cyan-text.text-lighten-3 {\n  color: #80deea !important;\n}\n\n.cyan.lighten-2 {\n  background-color: #4dd0e1 !important;\n}\n\n.cyan-text.text-lighten-2 {\n  color: #4dd0e1 !important;\n}\n\n.cyan.lighten-1 {\n  background-color: #26c6da !important;\n}\n\n.cyan-text.text-lighten-1 {\n  color: #26c6da !important;\n}\n\n.cyan.darken-1 {\n  background-color: #00acc1 !important;\n}\n\n.cyan-text.text-darken-1 {\n  color: #00acc1 !important;\n}\n\n.cyan.darken-2 {\n  background-color: #0097a7 !important;\n}\n\n.cyan-text.text-darken-2 {\n  color: #0097a7 !important;\n}\n\n.cyan.darken-3 {\n  background-color: #00838f !important;\n}\n\n.cyan-text.text-darken-3 {\n  color: #00838f !important;\n}\n\n.cyan.darken-4 {\n  background-color: #006064 !important;\n}\n\n.cyan-text.text-darken-4 {\n  color: #006064 !important;\n}\n\n.cyan.accent-1 {\n  background-color: #84ffff !important;\n}\n\n.cyan-text.text-accent-1 {\n  color: #84ffff !important;\n}\n\n.cyan.accent-2 {\n  background-color: #18ffff !important;\n}\n\n.cyan-text.text-accent-2 {\n  color: #18ffff !important;\n}\n\n.cyan.accent-3 {\n  background-color: #00e5ff !important;\n}\n\n.cyan-text.text-accent-3 {\n  color: #00e5ff !important;\n}\n\n.cyan.accent-4 {\n  background-color: #00b8d4 !important;\n}\n\n.cyan-text.text-accent-4 {\n  color: #00b8d4 !important;\n}\n\n.teal {\n  background-color: #009688 !important;\n}\n\n.teal-text {\n  color: #009688 !important;\n}\n\n.teal.lighten-5 {\n  background-color: #e0f2f1 !important;\n}\n\n.teal-text.text-lighten-5 {\n  color: #e0f2f1 !important;\n}\n\n.teal.lighten-4 {\n  background-color: #b2dfdb !important;\n}\n\n.teal-text.text-lighten-4 {\n  color: #b2dfdb !important;\n}\n\n.teal.lighten-3 {\n  background-color: #80cbc4 !important;\n}\n\n.teal-text.text-lighten-3 {\n  color: #80cbc4 !important;\n}\n\n.teal.lighten-2 {\n  background-color: #4db6ac !important;\n}\n\n.teal-text.text-lighten-2 {\n  color: #4db6ac !important;\n}\n\n.teal.lighten-1 {\n  background-color: #26a69a !important;\n}\n\n.teal-text.text-lighten-1 {\n  color: #26a69a !important;\n}\n\n.teal.darken-1 {\n  background-color: #00897b !important;\n}\n\n.teal-text.text-darken-1 {\n  color: #00897b !important;\n}\n\n.teal.darken-2 {\n  background-color: #00796b !important;\n}\n\n.teal-text.text-darken-2 {\n  color: #00796b !important;\n}\n\n.teal.darken-3 {\n  background-color: #00695c !important;\n}\n\n.teal-text.text-darken-3 {\n  color: #00695c !important;\n}\n\n.teal.darken-4 {\n  background-color: #004d40 !important;\n}\n\n.teal-text.text-darken-4 {\n  color: #004d40 !important;\n}\n\n.teal.accent-1 {\n  background-color: #a7ffeb !important;\n}\n\n.teal-text.text-accent-1 {\n  color: #a7ffeb !important;\n}\n\n.teal.accent-2 {\n  background-color: #64ffda !important;\n}\n\n.teal-text.text-accent-2 {\n  color: #64ffda !important;\n}\n\n.teal.accent-3 {\n  background-color: #1de9b6 !important;\n}\n\n.teal-text.text-accent-3 {\n  color: #1de9b6 !important;\n}\n\n.teal.accent-4 {\n  background-color: #00bfa5 !important;\n}\n\n.teal-text.text-accent-4 {\n  color: #00bfa5 !important;\n}\n\n.green {\n  background-color: #4CAF50 !important;\n}\n\n.green-text {\n  color: #4CAF50 !important;\n}\n\n.green.lighten-5 {\n  background-color: #E8F5E9 !important;\n}\n\n.green-text.text-lighten-5 {\n  color: #E8F5E9 !important;\n}\n\n.green.lighten-4 {\n  background-color: #C8E6C9 !important;\n}\n\n.green-text.text-lighten-4 {\n  color: #C8E6C9 !important;\n}\n\n.green.lighten-3 {\n  background-color: #A5D6A7 !important;\n}\n\n.green-text.text-lighten-3 {\n  color: #A5D6A7 !important;\n}\n\n.green.lighten-2 {\n  background-color: #81C784 !important;\n}\n\n.green-text.text-lighten-2 {\n  color: #81C784 !important;\n}\n\n.green.lighten-1 {\n  background-color: #66BB6A !important;\n}\n\n.green-text.text-lighten-1 {\n  color: #66BB6A !important;\n}\n\n.green.darken-1 {\n  background-color: #43A047 !important;\n}\n\n.green-text.text-darken-1 {\n  color: #43A047 !important;\n}\n\n.green.darken-2 {\n  background-color: #388E3C !important;\n}\n\n.green-text.text-darken-2 {\n  color: #388E3C !important;\n}\n\n.green.darken-3 {\n  background-color: #2E7D32 !important;\n}\n\n.green-text.text-darken-3 {\n  color: #2E7D32 !important;\n}\n\n.green.darken-4 {\n  background-color: #1B5E20 !important;\n}\n\n.green-text.text-darken-4 {\n  color: #1B5E20 !important;\n}\n\n.green.accent-1 {\n  background-color: #B9F6CA !important;\n}\n\n.green-text.text-accent-1 {\n  color: #B9F6CA !important;\n}\n\n.green.accent-2 {\n  background-color: #69F0AE !important;\n}\n\n.green-text.text-accent-2 {\n  color: #69F0AE !important;\n}\n\n.green.accent-3 {\n  background-color: #00E676 !important;\n}\n\n.green-text.text-accent-3 {\n  color: #00E676 !important;\n}\n\n.green.accent-4 {\n  background-color: #00C853 !important;\n}\n\n.green-text.text-accent-4 {\n  color: #00C853 !important;\n}\n\n.light-green {\n  background-color: #8bc34a !important;\n}\n\n.light-green-text {\n  color: #8bc34a !important;\n}\n\n.light-green.lighten-5 {\n  background-color: #f1f8e9 !important;\n}\n\n.light-green-text.text-lighten-5 {\n  color: #f1f8e9 !important;\n}\n\n.light-green.lighten-4 {\n  background-color: #dcedc8 !important;\n}\n\n.light-green-text.text-lighten-4 {\n  color: #dcedc8 !important;\n}\n\n.light-green.lighten-3 {\n  background-color: #c5e1a5 !important;\n}\n\n.light-green-text.text-lighten-3 {\n  color: #c5e1a5 !important;\n}\n\n.light-green.lighten-2 {\n  background-color: #aed581 !important;\n}\n\n.light-green-text.text-lighten-2 {\n  color: #aed581 !important;\n}\n\n.light-green.lighten-1 {\n  background-color: #9ccc65 !important;\n}\n\n.light-green-text.text-lighten-1 {\n  color: #9ccc65 !important;\n}\n\n.light-green.darken-1 {\n  background-color: #7cb342 !important;\n}\n\n.light-green-text.text-darken-1 {\n  color: #7cb342 !important;\n}\n\n.light-green.darken-2 {\n  background-color: #689f38 !important;\n}\n\n.light-green-text.text-darken-2 {\n  color: #689f38 !important;\n}\n\n.light-green.darken-3 {\n  background-color: #558b2f !important;\n}\n\n.light-green-text.text-darken-3 {\n  color: #558b2f !important;\n}\n\n.light-green.darken-4 {\n  background-color: #33691e !important;\n}\n\n.light-green-text.text-darken-4 {\n  color: #33691e !important;\n}\n\n.light-green.accent-1 {\n  background-color: #ccff90 !important;\n}\n\n.light-green-text.text-accent-1 {\n  color: #ccff90 !important;\n}\n\n.light-green.accent-2 {\n  background-color: #b2ff59 !important;\n}\n\n.light-green-text.text-accent-2 {\n  color: #b2ff59 !important;\n}\n\n.light-green.accent-3 {\n  background-color: #76ff03 !important;\n}\n\n.light-green-text.text-accent-3 {\n  color: #76ff03 !important;\n}\n\n.light-green.accent-4 {\n  background-color: #64dd17 !important;\n}\n\n.light-green-text.text-accent-4 {\n  color: #64dd17 !important;\n}\n\n.lime {\n  background-color: #cddc39 !important;\n}\n\n.lime-text {\n  color: #cddc39 !important;\n}\n\n.lime.lighten-5 {\n  background-color: #f9fbe7 !important;\n}\n\n.lime-text.text-lighten-5 {\n  color: #f9fbe7 !important;\n}\n\n.lime.lighten-4 {\n  background-color: #f0f4c3 !important;\n}\n\n.lime-text.text-lighten-4 {\n  color: #f0f4c3 !important;\n}\n\n.lime.lighten-3 {\n  background-color: #e6ee9c !important;\n}\n\n.lime-text.text-lighten-3 {\n  color: #e6ee9c !important;\n}\n\n.lime.lighten-2 {\n  background-color: #dce775 !important;\n}\n\n.lime-text.text-lighten-2 {\n  color: #dce775 !important;\n}\n\n.lime.lighten-1 {\n  background-color: #d4e157 !important;\n}\n\n.lime-text.text-lighten-1 {\n  color: #d4e157 !important;\n}\n\n.lime.darken-1 {\n  background-color: #c0ca33 !important;\n}\n\n.lime-text.text-darken-1 {\n  color: #c0ca33 !important;\n}\n\n.lime.darken-2 {\n  background-color: #afb42b !important;\n}\n\n.lime-text.text-darken-2 {\n  color: #afb42b !important;\n}\n\n.lime.darken-3 {\n  background-color: #9e9d24 !important;\n}\n\n.lime-text.text-darken-3 {\n  color: #9e9d24 !important;\n}\n\n.lime.darken-4 {\n  background-color: #827717 !important;\n}\n\n.lime-text.text-darken-4 {\n  color: #827717 !important;\n}\n\n.lime.accent-1 {\n  background-color: #f4ff81 !important;\n}\n\n.lime-text.text-accent-1 {\n  color: #f4ff81 !important;\n}\n\n.lime.accent-2 {\n  background-color: #eeff41 !important;\n}\n\n.lime-text.text-accent-2 {\n  color: #eeff41 !important;\n}\n\n.lime.accent-3 {\n  background-color: #c6ff00 !important;\n}\n\n.lime-text.text-accent-3 {\n  color: #c6ff00 !important;\n}\n\n.lime.accent-4 {\n  background-color: #aeea00 !important;\n}\n\n.lime-text.text-accent-4 {\n  color: #aeea00 !important;\n}\n\n.yellow {\n  background-color: #ffeb3b !important;\n}\n\n.yellow-text {\n  color: #ffeb3b !important;\n}\n\n.yellow.lighten-5 {\n  background-color: #fffde7 !important;\n}\n\n.yellow-text.text-lighten-5 {\n  color: #fffde7 !important;\n}\n\n.yellow.lighten-4 {\n  background-color: #fff9c4 !important;\n}\n\n.yellow-text.text-lighten-4 {\n  color: #fff9c4 !important;\n}\n\n.yellow.lighten-3 {\n  background-color: #fff59d !important;\n}\n\n.yellow-text.text-lighten-3 {\n  color: #fff59d !important;\n}\n\n.yellow.lighten-2 {\n  background-color: #fff176 !important;\n}\n\n.yellow-text.text-lighten-2 {\n  color: #fff176 !important;\n}\n\n.yellow.lighten-1 {\n  background-color: #ffee58 !important;\n}\n\n.yellow-text.text-lighten-1 {\n  color: #ffee58 !important;\n}\n\n.yellow.darken-1 {\n  background-color: #fdd835 !important;\n}\n\n.yellow-text.text-darken-1 {\n  color: #fdd835 !important;\n}\n\n.yellow.darken-2 {\n  background-color: #fbc02d !important;\n}\n\n.yellow-text.text-darken-2 {\n  color: #fbc02d !important;\n}\n\n.yellow.darken-3 {\n  background-color: #f9a825 !important;\n}\n\n.yellow-text.text-darken-3 {\n  color: #f9a825 !important;\n}\n\n.yellow.darken-4 {\n  background-color: #f57f17 !important;\n}\n\n.yellow-text.text-darken-4 {\n  color: #f57f17 !important;\n}\n\n.yellow.accent-1 {\n  background-color: #ffff8d !important;\n}\n\n.yellow-text.text-accent-1 {\n  color: #ffff8d !important;\n}\n\n.yellow.accent-2 {\n  background-color: #ffff00 !important;\n}\n\n.yellow-text.text-accent-2 {\n  color: #ffff00 !important;\n}\n\n.yellow.accent-3 {\n  background-color: #ffea00 !important;\n}\n\n.yellow-text.text-accent-3 {\n  color: #ffea00 !important;\n}\n\n.yellow.accent-4 {\n  background-color: #ffd600 !important;\n}\n\n.yellow-text.text-accent-4 {\n  color: #ffd600 !important;\n}\n\n.amber {\n  background-color: #ffc107 !important;\n}\n\n.amber-text {\n  color: #ffc107 !important;\n}\n\n.amber.lighten-5 {\n  background-color: #fff8e1 !important;\n}\n\n.amber-text.text-lighten-5 {\n  color: #fff8e1 !important;\n}\n\n.amber.lighten-4 {\n  background-color: #ffecb3 !important;\n}\n\n.amber-text.text-lighten-4 {\n  color: #ffecb3 !important;\n}\n\n.amber.lighten-3 {\n  background-color: #ffe082 !important;\n}\n\n.amber-text.text-lighten-3 {\n  color: #ffe082 !important;\n}\n\n.amber.lighten-2 {\n  background-color: #ffd54f !important;\n}\n\n.amber-text.text-lighten-2 {\n  color: #ffd54f !important;\n}\n\n.amber.lighten-1 {\n  background-color: #ffca28 !important;\n}\n\n.amber-text.text-lighten-1 {\n  color: #ffca28 !important;\n}\n\n.amber.darken-1 {\n  background-color: #ffb300 !important;\n}\n\n.amber-text.text-darken-1 {\n  color: #ffb300 !important;\n}\n\n.amber.darken-2 {\n  background-color: #ffa000 !important;\n}\n\n.amber-text.text-darken-2 {\n  color: #ffa000 !important;\n}\n\n.amber.darken-3 {\n  background-color: #ff8f00 !important;\n}\n\n.amber-text.text-darken-3 {\n  color: #ff8f00 !important;\n}\n\n.amber.darken-4 {\n  background-color: #ff6f00 !important;\n}\n\n.amber-text.text-darken-4 {\n  color: #ff6f00 !important;\n}\n\n.amber.accent-1 {\n  background-color: #ffe57f !important;\n}\n\n.amber-text.text-accent-1 {\n  color: #ffe57f !important;\n}\n\n.amber.accent-2 {\n  background-color: #ffd740 !important;\n}\n\n.amber-text.text-accent-2 {\n  color: #ffd740 !important;\n}\n\n.amber.accent-3 {\n  background-color: #ffc400 !important;\n}\n\n.amber-text.text-accent-3 {\n  color: #ffc400 !important;\n}\n\n.amber.accent-4 {\n  background-color: #ffab00 !important;\n}\n\n.amber-text.text-accent-4 {\n  color: #ffab00 !important;\n}\n\n.orange {\n  background-color: #ff9800 !important;\n}\n\n.orange-text {\n  color: #ff9800 !important;\n}\n\n.orange.lighten-5 {\n  background-color: #fff3e0 !important;\n}\n\n.orange-text.text-lighten-5 {\n  color: #fff3e0 !important;\n}\n\n.orange.lighten-4 {\n  background-color: #ffe0b2 !important;\n}\n\n.orange-text.text-lighten-4 {\n  color: #ffe0b2 !important;\n}\n\n.orange.lighten-3 {\n  background-color: #ffcc80 !important;\n}\n\n.orange-text.text-lighten-3 {\n  color: #ffcc80 !important;\n}\n\n.orange.lighten-2 {\n  background-color: #ffb74d !important;\n}\n\n.orange-text.text-lighten-2 {\n  color: #ffb74d !important;\n}\n\n.orange.lighten-1 {\n  background-color: #ffa726 !important;\n}\n\n.orange-text.text-lighten-1 {\n  color: #ffa726 !important;\n}\n\n.orange.darken-1 {\n  background-color: #fb8c00 !important;\n}\n\n.orange-text.text-darken-1 {\n  color: #fb8c00 !important;\n}\n\n.orange.darken-2 {\n  background-color: #f57c00 !important;\n}\n\n.orange-text.text-darken-2 {\n  color: #f57c00 !important;\n}\n\n.orange.darken-3 {\n  background-color: #ef6c00 !important;\n}\n\n.orange-text.text-darken-3 {\n  color: #ef6c00 !important;\n}\n\n.orange.darken-4 {\n  background-color: #e65100 !important;\n}\n\n.orange-text.text-darken-4 {\n  color: #e65100 !important;\n}\n\n.orange.accent-1 {\n  background-color: #ffd180 !important;\n}\n\n.orange-text.text-accent-1 {\n  color: #ffd180 !important;\n}\n\n.orange.accent-2 {\n  background-color: #ffab40 !important;\n}\n\n.orange-text.text-accent-2 {\n  color: #ffab40 !important;\n}\n\n.orange.accent-3 {\n  background-color: #ff9100 !important;\n}\n\n.orange-text.text-accent-3 {\n  color: #ff9100 !important;\n}\n\n.orange.accent-4 {\n  background-color: #ff6d00 !important;\n}\n\n.orange-text.text-accent-4 {\n  color: #ff6d00 !important;\n}\n\n.deep-orange {\n  background-color: #ff5722 !important;\n}\n\n.deep-orange-text {\n  color: #ff5722 !important;\n}\n\n.deep-orange.lighten-5 {\n  background-color: #fbe9e7 !important;\n}\n\n.deep-orange-text.text-lighten-5 {\n  color: #fbe9e7 !important;\n}\n\n.deep-orange.lighten-4 {\n  background-color: #ffccbc !important;\n}\n\n.deep-orange-text.text-lighten-4 {\n  color: #ffccbc !important;\n}\n\n.deep-orange.lighten-3 {\n  background-color: #ffab91 !important;\n}\n\n.deep-orange-text.text-lighten-3 {\n  color: #ffab91 !important;\n}\n\n.deep-orange.lighten-2 {\n  background-color: #ff8a65 !important;\n}\n\n.deep-orange-text.text-lighten-2 {\n  color: #ff8a65 !important;\n}\n\n.deep-orange.lighten-1 {\n  background-color: #ff7043 !important;\n}\n\n.deep-orange-text.text-lighten-1 {\n  color: #ff7043 !important;\n}\n\n.deep-orange.darken-1 {\n  background-color: #f4511e !important;\n}\n\n.deep-orange-text.text-darken-1 {\n  color: #f4511e !important;\n}\n\n.deep-orange.darken-2 {\n  background-color: #e64a19 !important;\n}\n\n.deep-orange-text.text-darken-2 {\n  color: #e64a19 !important;\n}\n\n.deep-orange.darken-3 {\n  background-color: #d84315 !important;\n}\n\n.deep-orange-text.text-darken-3 {\n  color: #d84315 !important;\n}\n\n.deep-orange.darken-4 {\n  background-color: #bf360c !important;\n}\n\n.deep-orange-text.text-darken-4 {\n  color: #bf360c !important;\n}\n\n.deep-orange.accent-1 {\n  background-color: #ff9e80 !important;\n}\n\n.deep-orange-text.text-accent-1 {\n  color: #ff9e80 !important;\n}\n\n.deep-orange.accent-2 {\n  background-color: #ff6e40 !important;\n}\n\n.deep-orange-text.text-accent-2 {\n  color: #ff6e40 !important;\n}\n\n.deep-orange.accent-3 {\n  background-color: #ff3d00 !important;\n}\n\n.deep-orange-text.text-accent-3 {\n  color: #ff3d00 !important;\n}\n\n.deep-orange.accent-4 {\n  background-color: #dd2c00 !important;\n}\n\n.deep-orange-text.text-accent-4 {\n  color: #dd2c00 !important;\n}\n\n.brown {\n  background-color: #795548 !important;\n}\n\n.brown-text {\n  color: #795548 !important;\n}\n\n.brown.lighten-5 {\n  background-color: #efebe9 !important;\n}\n\n.brown-text.text-lighten-5 {\n  color: #efebe9 !important;\n}\n\n.brown.lighten-4 {\n  background-color: #d7ccc8 !important;\n}\n\n.brown-text.text-lighten-4 {\n  color: #d7ccc8 !important;\n}\n\n.brown.lighten-3 {\n  background-color: #bcaaa4 !important;\n}\n\n.brown-text.text-lighten-3 {\n  color: #bcaaa4 !important;\n}\n\n.brown.lighten-2 {\n  background-color: #a1887f !important;\n}\n\n.brown-text.text-lighten-2 {\n  color: #a1887f !important;\n}\n\n.brown.lighten-1 {\n  background-color: #8d6e63 !important;\n}\n\n.brown-text.text-lighten-1 {\n  color: #8d6e63 !important;\n}\n\n.brown.darken-1 {\n  background-color: #6d4c41 !important;\n}\n\n.brown-text.text-darken-1 {\n  color: #6d4c41 !important;\n}\n\n.brown.darken-2 {\n  background-color: #5d4037 !important;\n}\n\n.brown-text.text-darken-2 {\n  color: #5d4037 !important;\n}\n\n.brown.darken-3 {\n  background-color: #4e342e !important;\n}\n\n.brown-text.text-darken-3 {\n  color: #4e342e !important;\n}\n\n.brown.darken-4 {\n  background-color: #3e2723 !important;\n}\n\n.brown-text.text-darken-4 {\n  color: #3e2723 !important;\n}\n\n.blue-grey {\n  background-color: #607d8b !important;\n}\n\n.blue-grey-text {\n  color: #607d8b !important;\n}\n\n.blue-grey.lighten-5 {\n  background-color: #eceff1 !important;\n}\n\n.blue-grey-text.text-lighten-5 {\n  color: #eceff1 !important;\n}\n\n.blue-grey.lighten-4 {\n  background-color: #cfd8dc !important;\n}\n\n.blue-grey-text.text-lighten-4 {\n  color: #cfd8dc !important;\n}\n\n.blue-grey.lighten-3 {\n  background-color: #b0bec5 !important;\n}\n\n.blue-grey-text.text-lighten-3 {\n  color: #b0bec5 !important;\n}\n\n.blue-grey.lighten-2 {\n  background-color: #90a4ae !important;\n}\n\n.blue-grey-text.text-lighten-2 {\n  color: #90a4ae !important;\n}\n\n.blue-grey.lighten-1 {\n  background-color: #78909c !important;\n}\n\n.blue-grey-text.text-lighten-1 {\n  color: #78909c !important;\n}\n\n.blue-grey.darken-1 {\n  background-color: #546e7a !important;\n}\n\n.blue-grey-text.text-darken-1 {\n  color: #546e7a !important;\n}\n\n.blue-grey.darken-2 {\n  background-color: #455a64 !important;\n}\n\n.blue-grey-text.text-darken-2 {\n  color: #455a64 !important;\n}\n\n.blue-grey.darken-3 {\n  background-color: #37474f !important;\n}\n\n.blue-grey-text.text-darken-3 {\n  color: #37474f !important;\n}\n\n.blue-grey.darken-4 {\n  background-color: #263238 !important;\n}\n\n.blue-grey-text.text-darken-4 {\n  color: #263238 !important;\n}\n\n.grey {\n  background-color: #9e9e9e !important;\n}\n\n.grey-text {\n  color: #9e9e9e !important;\n}\n\n.grey.lighten-5 {\n  background-color: #fafafa !important;\n}\n\n.grey-text.text-lighten-5 {\n  color: #fafafa !important;\n}\n\n.grey.lighten-4 {\n  background-color: #f5f5f5 !important;\n}\n\n.grey-text.text-lighten-4 {\n  color: #f5f5f5 !important;\n}\n\n.grey.lighten-3 {\n  background-color: #eeeeee !important;\n}\n\n.grey-text.text-lighten-3 {\n  color: #eeeeee !important;\n}\n\n.grey.lighten-2 {\n  background-color: #e0e0e0 !important;\n}\n\n.grey-text.text-lighten-2 {\n  color: #e0e0e0 !important;\n}\n\n.grey.lighten-1 {\n  background-color: #bdbdbd !important;\n}\n\n.grey-text.text-lighten-1 {\n  color: #bdbdbd !important;\n}\n\n.grey.darken-1 {\n  background-color: #757575 !important;\n}\n\n.grey-text.text-darken-1 {\n  color: #757575 !important;\n}\n\n.grey.darken-2 {\n  background-color: #616161 !important;\n}\n\n.grey-text.text-darken-2 {\n  color: #616161 !important;\n}\n\n.grey.darken-3 {\n  background-color: #424242 !important;\n}\n\n.grey-text.text-darken-3 {\n  color: #424242 !important;\n}\n\n.grey.darken-4 {\n  background-color: #212121 !important;\n}\n\n.grey-text.text-darken-4 {\n  color: #212121 !important;\n}\n\n.black {\n  background-color: #000000 !important;\n}\n\n.black-text {\n  color: #000000 !important;\n}\n\n.white {\n  background-color: #FFFFFF !important;\n}\n\n.white-text {\n  color: #FFFFFF !important;\n}\n\n.transparent {\n  background-color: transparent !important;\n}\n\n.transparent-text {\n  color: transparent !important;\n}\n\n/*! normalize.css v3.0.3 | MIT License | github.com/necolas/normalize.css */\n/**\n * 1. Set default font family to sans-serif.\n * 2. Prevent iOS and IE text size adjust after device orientation change,\n *    without disabling user zoom.\n */\nhtml {\n  font-family: sans-serif;\n  /* 1 */\n  -ms-text-size-adjust: 100%;\n  /* 2 */\n  -webkit-text-size-adjust: 100%;\n  /* 2 */\n}\n\n/**\n * Remove default margin.\n */\nbody {\n  margin: 0;\n}\n\n/* HTML5 display definitions\n   ========================================================================== */\n/**\n * Correct `block` display not defined for any HTML5 element in IE 8/9.\n * Correct `block` display not defined for `details` or `summary` in IE 10/11\n * and Firefox.\n * Correct `block` display not defined for `main` in IE 11.\n */\narticle,\naside,\ndetails,\nfigcaption,\nfigure,\nfooter,\nheader,\nhgroup,\nmain,\nmenu,\nnav,\nsection,\nsummary {\n  display: block;\n}\n\n/**\n * 1. Correct `inline-block` display not defined in IE 8/9.\n * 2. Normalize vertical alignment of `progress` in Chrome, Firefox, and Opera.\n */\naudio,\ncanvas,\nprogress,\nvideo {\n  display: inline-block;\n  /* 1 */\n  vertical-align: baseline;\n  /* 2 */\n}\n\n/**\n * Prevent modern browsers from displaying `audio` without controls.\n * Remove excess height in iOS 5 devices.\n */\naudio:not([controls]) {\n  display: none;\n  height: 0;\n}\n\n/**\n * Address `[hidden]` styling not present in IE 8/9/10.\n * Hide the `template` element in IE 8/9/10/11, Safari, and Firefox < 22.\n */\n[hidden],\ntemplate {\n  display: none;\n}\n\n/* Links\n   ========================================================================== */\n/**\n * Remove the gray background color from active links in IE 10.\n */\na {\n  background-color: transparent;\n}\n\n/**\n * Improve readability of focused elements when they are also in an\n * active/hover state.\n */\na:active,\na:hover {\n  outline: 0;\n}\n\n/* Text-level semantics\n   ========================================================================== */\n/**\n * Address styling not present in IE 8/9/10/11, Safari, and Chrome.\n */\nabbr[title] {\n  border-bottom: 1px dotted;\n}\n\n/**\n * Address style set to `bolder` in Firefox 4+, Safari, and Chrome.\n */\nb,\nstrong {\n  font-weight: bold;\n}\n\n/**\n * Address styling not present in Safari and Chrome.\n */\ndfn {\n  font-style: italic;\n}\n\n/**\n * Address variable `h1` font-size and margin within `section` and `article`\n * contexts in Firefox 4+, Safari, and Chrome.\n */\nh1 {\n  font-size: 2em;\n  margin: 0.67em 0;\n}\n\n/**\n * Address styling not present in IE 8/9.\n */\nmark {\n  background: #ff0;\n  color: #000;\n}\n\n/**\n * Address inconsistent and variable font size in all browsers.\n */\nsmall {\n  font-size: 80%;\n}\n\n/**\n * Prevent `sub` and `sup` affecting `line-height` in all browsers.\n */\nsub,\nsup {\n  font-size: 75%;\n  line-height: 0;\n  position: relative;\n  vertical-align: baseline;\n}\n\nsup {\n  top: -0.5em;\n}\n\nsub {\n  bottom: -0.25em;\n}\n\n/* Embedded content\n   ========================================================================== */\n/**\n * Remove border when inside `a` element in IE 8/9/10.\n */\nimg {\n  border: 0;\n}\n\n/**\n * Correct overflow not hidden in IE 9/10/11.\n */\nsvg:not(:root) {\n  overflow: hidden;\n}\n\n/* Grouping content\n   ========================================================================== */\n/**\n * Address margin not present in IE 8/9 and Safari.\n */\nfigure {\n  margin: 1em 40px;\n}\n\n/**\n * Address differences between Firefox and other browsers.\n */\nhr {\n  box-sizing: content-box;\n  height: 0;\n}\n\n/**\n * Contain overflow in all browsers.\n */\npre {\n  overflow: auto;\n}\n\n/**\n * Address odd `em`-unit font size rendering in all browsers.\n */\ncode,\nkbd,\npre,\nsamp {\n  font-family: monospace, monospace;\n  font-size: 1em;\n}\n\n/* Forms\n   ========================================================================== */\n/**\n * Known limitation: by default, Chrome and Safari on OS X allow very limited\n * styling of `select`, unless a `border` property is set.\n */\n/**\n * 1. Correct color not being inherited.\n *    Known issue: affects color of disabled elements.\n * 2. Correct font properties not being inherited.\n * 3. Address margins set differently in Firefox 4+, Safari, and Chrome.\n */\nbutton,\ninput,\noptgroup,\nselect,\ntextarea {\n  color: inherit;\n  /* 1 */\n  font: inherit;\n  /* 2 */\n  margin: 0;\n  /* 3 */\n}\n\n/**\n * Address `overflow` set to `hidden` in IE 8/9/10/11.\n */\nbutton {\n  overflow: visible;\n}\n\n/**\n * Address inconsistent `text-transform` inheritance for `button` and `select`.\n * All other form control elements do not inherit `text-transform` values.\n * Correct `button` style inheritance in Firefox, IE 8/9/10/11, and Opera.\n * Correct `select` style inheritance in Firefox.\n */\nbutton,\nselect {\n  text-transform: none;\n}\n\n/**\n * 1. Avoid the WebKit bug in Android 4.0.* where (2) destroys native `audio`\n *    and `video` controls.\n * 2. Correct inability to style clickable `input` types in iOS.\n * 3. Improve usability and consistency of cursor style between image-type\n *    `input` and others.\n */\nbutton,\nhtml input[type=\"button\"],\ninput[type=\"reset\"],\ninput[type=\"submit\"] {\n  -webkit-appearance: button;\n  /* 2 */\n  cursor: pointer;\n  /* 3 */\n}\n\n/**\n * Re-set default cursor for disabled elements.\n */\nbutton[disabled],\nhtml input[disabled] {\n  cursor: default;\n}\n\n/**\n * Remove inner padding and border in Firefox 4+.\n */\nbutton::-moz-focus-inner,\ninput::-moz-focus-inner {\n  border: 0;\n  padding: 0;\n}\n\n/**\n * Address Firefox 4+ setting `line-height` on `input` using `!important` in\n * the UA stylesheet.\n */\ninput {\n  line-height: normal;\n}\n\n/**\n * It's recommended that you don't attempt to style these elements.\n * Firefox's implementation doesn't respect box-sizing, padding, or width.\n *\n * 1. Address box sizing set to `content-box` in IE 8/9/10.\n * 2. Remove excess padding in IE 8/9/10.\n */\ninput[type=\"checkbox\"],\ninput[type=\"radio\"] {\n  box-sizing: border-box;\n  /* 1 */\n  padding: 0;\n  /* 2 */\n}\n\n/**\n * Fix the cursor style for Chrome's increment/decrement buttons. For certain\n * `font-size` values of the `input`, it causes the cursor style of the\n * decrement button to change from `default` to `text`.\n */\ninput[type=\"number\"]::-webkit-inner-spin-button,\ninput[type=\"number\"]::-webkit-outer-spin-button {\n  height: auto;\n}\n\n/**\n * 1. Address `appearance` set to `searchfield` in Safari and Chrome.\n * 2. Address `box-sizing` set to `border-box` in Safari and Chrome.\n */\ninput[type=\"search\"] {\n  -webkit-appearance: textfield;\n  /* 1 */\n  box-sizing: content-box;\n  /* 2 */\n}\n\n/**\n * Remove inner padding and search cancel button in Safari and Chrome on OS X.\n * Safari (but not Chrome) clips the cancel button when the search input has\n * padding (and `textfield` appearance).\n */\ninput[type=\"search\"]::-webkit-search-cancel-button,\ninput[type=\"search\"]::-webkit-search-decoration {\n  -webkit-appearance: none;\n}\n\n/**\n * Define consistent border, margin, and padding.\n */\nfieldset {\n  border: 1px solid #c0c0c0;\n  margin: 0 2px;\n  padding: 0.35em 0.625em 0.75em;\n}\n\n/**\n * 1. Correct `color` not being inherited in IE 8/9/10/11.\n * 2. Remove padding so people aren't caught out if they zero out fieldsets.\n */\nlegend {\n  border: 0;\n  /* 1 */\n  padding: 0;\n  /* 2 */\n}\n\n/**\n * Remove default vertical scrollbar in IE 8/9/10/11.\n */\ntextarea {\n  overflow: auto;\n}\n\n/**\n * Don't inherit the `font-weight` (applied by a rule above).\n * NOTE: the default cannot safely be changed in Chrome and Safari on OS X.\n */\noptgroup {\n  font-weight: bold;\n}\n\n/* Tables\n   ========================================================================== */\n/**\n * Remove most spacing between table cells.\n */\ntable {\n  border-collapse: collapse;\n  border-spacing: 0;\n}\n\ntd,\nth {\n  padding: 0;\n}\n\nhtml {\n  box-sizing: border-box;\n}\n\n*, *:before, *:after {\n  box-sizing: inherit;\n}\n\nul:not(.browser-default) {\n  padding-left: 0;\n  list-style-type: none;\n}\n\nul:not(.browser-default) li {\n  list-style-type: none;\n}\n\na {\n  color: #039be5;\n  text-decoration: none;\n  -webkit-tap-highlight-color: transparent;\n}\n\n.valign-wrapper {\n  display: -webkit-flex;\n  display: -ms-flexbox;\n  display: flex;\n  -webkit-align-items: center;\n      -ms-flex-align: center;\n          align-items: center;\n}\n\n.valign-wrapper .valign {\n  display: block;\n}\n\n.clearfix {\n  clear: both;\n}\n\n.z-depth-0 {\n  box-shadow: none !important;\n}\n\n.z-depth-1, nav, .card-panel, .card, .toast, .btn, .btn-large, .btn-floating, .dropdown-content, .collapsible, .side-nav {\n  box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -2px rgba(0, 0, 0, 0.2);\n}\n\n.z-depth-1-half, .btn:hover, .btn-large:hover, .btn-floating:hover {\n  box-shadow: 0 3px 3px 0 rgba(0, 0, 0, 0.14), 0 1px 7px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -1px rgba(0, 0, 0, 0.2);\n}\n\n.z-depth-2 {\n  box-shadow: 0 4px 5px 0 rgba(0, 0, 0, 0.14), 0 1px 10px 0 rgba(0, 0, 0, 0.12), 0 2px 4px -1px rgba(0, 0, 0, 0.3);\n}\n\n.z-depth-3 {\n  box-shadow: 0 6px 10px 0 rgba(0, 0, 0, 0.14), 0 1px 18px 0 rgba(0, 0, 0, 0.12), 0 3px 5px -1px rgba(0, 0, 0, 0.3);\n}\n\n.z-depth-4, .modal {\n  box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.3);\n}\n\n.z-depth-5 {\n  box-shadow: 0 16px 24px 2px rgba(0, 0, 0, 0.14), 0 6px 30px 5px rgba(0, 0, 0, 0.12), 0 8px 10px -5px rgba(0, 0, 0, 0.3);\n}\n\n.hoverable {\n  transition: box-shadow .25s;\n  box-shadow: 0;\n}\n\n.hoverable:hover {\n  transition: box-shadow .25s;\n  box-shadow: 0 8px 17px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);\n}\n\n.divider {\n  height: 1px;\n  overflow: hidden;\n  background-color: #e0e0e0;\n}\n\nblockquote {\n  margin: 20px 0;\n  padding-left: 1.5rem;\n  border-left: 5px solid #ee6e73;\n}\n\ni {\n  line-height: inherit;\n}\n\ni.left {\n  float: left;\n  margin-right: 15px;\n}\n\ni.right {\n  float: right;\n  margin-left: 15px;\n}\n\ni.tiny {\n  font-size: 1rem;\n}\n\ni.small {\n  font-size: 2rem;\n}\n\ni.medium {\n  font-size: 4rem;\n}\n\ni.large {\n  font-size: 6rem;\n}\n\nimg.responsive-img,\nvideo.responsive-video {\n  max-width: 100%;\n  height: auto;\n}\n\n.pagination li {\n  display: inline-block;\n  border-radius: 2px;\n  text-align: center;\n  vertical-align: top;\n  height: 30px;\n}\n\n.pagination li a {\n  color: #444;\n  display: inline-block;\n  font-size: 1.2rem;\n  padding: 0 10px;\n  line-height: 30px;\n}\n\n.pagination li.active a {\n  color: #fff;\n}\n\n.pagination li.active {\n  background-color: #ee6e73;\n}\n\n.pagination li.disabled a {\n  cursor: default;\n  color: #999;\n}\n\n.pagination li i {\n  font-size: 2rem;\n}\n\n.pagination li.pages ul li {\n  display: inline-block;\n  float: none;\n}\n\n@media only screen and (max-width: 992px) {\n  .pagination {\n    width: 100%;\n  }\n  .pagination li.prev,\n  .pagination li.next {\n    width: 10%;\n  }\n  .pagination li.pages {\n    width: 80%;\n    overflow: hidden;\n    white-space: nowrap;\n  }\n}\n\n.breadcrumb {\n  font-size: 18px;\n  color: rgba(255, 255, 255, 0.7);\n}\n\n.breadcrumb i,\n.breadcrumb [class^=\"mdi-\"], .breadcrumb [class*=\"mdi-\"],\n.breadcrumb i.material-icons {\n  display: inline-block;\n  float: left;\n  font-size: 24px;\n}\n\n.breadcrumb:before {\n  content: '\\E5CC';\n  color: rgba(255, 255, 255, 0.7);\n  vertical-align: top;\n  display: inline-block;\n  font-family: 'Material Icons';\n  font-weight: normal;\n  font-style: normal;\n  font-size: 25px;\n  margin: 0 10px 0 8px;\n  -webkit-font-smoothing: antialiased;\n}\n\n.breadcrumb:first-child:before {\n  display: none;\n}\n\n.breadcrumb:last-child {\n  color: #fff;\n}\n\n.parallax-container {\n  position: relative;\n  overflow: hidden;\n  height: 500px;\n}\n\n.parallax {\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  z-index: -1;\n}\n\n.parallax img {\n  display: none;\n  position: absolute;\n  left: 50%;\n  bottom: 0;\n  min-width: 100%;\n  min-height: 100%;\n  -webkit-transform: translate3d(0, 0, 0);\n  transform: translate3d(0, 0, 0);\n  -webkit-transform: translateX(-50%);\n          transform: translateX(-50%);\n}\n\n.pin-top, .pin-bottom {\n  position: relative;\n}\n\n.pinned {\n  position: fixed !important;\n}\n\n/*********************\n  Transition Classes\n**********************/\nul.staggered-list li {\n  opacity: 0;\n}\n\n.fade-in {\n  opacity: 0;\n  -webkit-transform-origin: 0 50%;\n          transform-origin: 0 50%;\n}\n\n/*********************\n  Media Query Classes\n**********************/\n@media only screen and (max-width: 600px) {\n  .hide-on-small-only, .hide-on-small-and-down {\n    display: none !important;\n  }\n}\n\n@media only screen and (max-width: 992px) {\n  .hide-on-med-and-down {\n    display: none !important;\n  }\n}\n\n@media only screen and (min-width: 601px) {\n  .hide-on-med-and-up {\n    display: none !important;\n  }\n}\n\n@media only screen and (min-width: 600px) and (max-width: 992px) {\n  .hide-on-med-only {\n    display: none !important;\n  }\n}\n\n@media only screen and (min-width: 993px) {\n  .hide-on-large-only {\n    display: none !important;\n  }\n}\n\n@media only screen and (min-width: 993px) {\n  .show-on-large {\n    display: block !important;\n  }\n}\n\n@media only screen and (min-width: 600px) and (max-width: 992px) {\n  .show-on-medium {\n    display: block !important;\n  }\n}\n\n@media only screen and (max-width: 600px) {\n  .show-on-small {\n    display: block !important;\n  }\n}\n\n@media only screen and (min-width: 601px) {\n  .show-on-medium-and-up {\n    display: block !important;\n  }\n}\n\n@media only screen and (max-width: 992px) {\n  .show-on-medium-and-down {\n    display: block !important;\n  }\n}\n\n@media only screen and (max-width: 600px) {\n  .center-on-small-only {\n    text-align: center;\n  }\n}\n\nfooter.page-footer {\n  margin-top: 20px;\n  padding-top: 20px;\n  background-color: #ee6e73;\n}\n\nfooter.page-footer .footer-copyright {\n  overflow: hidden;\n  height: 50px;\n  line-height: 50px;\n  color: rgba(255, 255, 255, 0.8);\n  background-color: rgba(51, 51, 51, 0.08);\n}\n\ntable, th, td {\n  border: none;\n}\n\ntable {\n  width: 100%;\n  display: table;\n}\n\ntable.bordered > thead > tr,\ntable.bordered > tbody > tr {\n  border-bottom: 1px solid #d0d0d0;\n}\n\ntable.striped > tbody > tr:nth-child(odd) {\n  background-color: #f2f2f2;\n}\n\ntable.striped > tbody > tr > td {\n  border-radius: 0;\n}\n\ntable.highlight > tbody > tr {\n  transition: background-color .25s ease;\n}\n\ntable.highlight > tbody > tr:hover {\n  background-color: #f2f2f2;\n}\n\ntable.centered thead tr th, table.centered tbody tr td {\n  text-align: center;\n}\n\nthead {\n  border-bottom: 1px solid #d0d0d0;\n}\n\ntd, th {\n  padding: 15px 5px;\n  display: table-cell;\n  text-align: left;\n  vertical-align: middle;\n  border-radius: 2px;\n}\n\n@media only screen and (max-width: 992px) {\n  table.responsive-table {\n    width: 100%;\n    border-collapse: collapse;\n    border-spacing: 0;\n    display: block;\n    position: relative;\n    /* sort out borders */\n  }\n  table.responsive-table td:empty:before {\n    content: '\\A0';\n  }\n  table.responsive-table th,\n  table.responsive-table td {\n    margin: 0;\n    vertical-align: top;\n  }\n  table.responsive-table th {\n    text-align: left;\n  }\n  table.responsive-table thead {\n    display: block;\n    float: left;\n  }\n  table.responsive-table thead tr {\n    display: block;\n    padding: 0 10px 0 0;\n  }\n  table.responsive-table thead tr th::before {\n    content: \"\\A0\";\n  }\n  table.responsive-table tbody {\n    display: block;\n    width: auto;\n    position: relative;\n    overflow-x: auto;\n    white-space: nowrap;\n  }\n  table.responsive-table tbody tr {\n    display: inline-block;\n    vertical-align: top;\n  }\n  table.responsive-table th {\n    display: block;\n    text-align: right;\n  }\n  table.responsive-table td {\n    display: block;\n    min-height: 1.25em;\n    text-align: left;\n  }\n  table.responsive-table tr {\n    padding: 0 10px;\n  }\n  table.responsive-table thead {\n    border: 0;\n    border-right: 1px solid #d0d0d0;\n  }\n  table.responsive-table.bordered th {\n    border-bottom: 0;\n    border-left: 0;\n  }\n  table.responsive-table.bordered td {\n    border-left: 0;\n    border-right: 0;\n    border-bottom: 0;\n  }\n  table.responsive-table.bordered tr {\n    border: 0;\n  }\n  table.responsive-table.bordered tbody tr {\n    border-right: 1px solid #d0d0d0;\n  }\n}\n\n.collection {\n  margin: 0.5rem 0 1rem 0;\n  border: 1px solid #e0e0e0;\n  border-radius: 2px;\n  overflow: hidden;\n  position: relative;\n}\n\n.collection .collection-item {\n  background-color: #fff;\n  line-height: 1.5rem;\n  padding: 10px 20px;\n  margin: 0;\n  border-bottom: 1px solid #e0e0e0;\n}\n\n.collection .collection-item.avatar {\n  min-height: 84px;\n  padding-left: 72px;\n  position: relative;\n}\n\n.collection .collection-item.avatar .circle {\n  position: absolute;\n  width: 42px;\n  height: 42px;\n  overflow: hidden;\n  left: 15px;\n  display: inline-block;\n  vertical-align: middle;\n}\n\n.collection .collection-item.avatar i.circle {\n  font-size: 18px;\n  line-height: 42px;\n  color: #fff;\n  background-color: #999;\n  text-align: center;\n}\n\n.collection .collection-item.avatar .title {\n  font-size: 16px;\n}\n\n.collection .collection-item.avatar p {\n  margin: 0;\n}\n\n.collection .collection-item.avatar .secondary-content {\n  position: absolute;\n  top: 16px;\n  right: 16px;\n}\n\n.collection .collection-item:last-child {\n  border-bottom: none;\n}\n\n.collection .collection-item.active {\n  background-color: #26a69a;\n  color: #eafaf9;\n}\n\n.collection .collection-item.active .secondary-content {\n  color: #fff;\n}\n\n.collection a.collection-item {\n  display: block;\n  transition: .25s;\n  color: #26a69a;\n}\n\n.collection a.collection-item:not(.active):hover {\n  background-color: #ddd;\n}\n\n.collection.with-header .collection-header {\n  background-color: #fff;\n  border-bottom: 1px solid #e0e0e0;\n  padding: 10px 20px;\n}\n\n.collection.with-header .collection-item {\n  padding-left: 30px;\n}\n\n.collection.with-header .collection-item.avatar {\n  padding-left: 72px;\n}\n\n.secondary-content {\n  float: right;\n  color: #26a69a;\n}\n\n.collapsible .collection {\n  margin: 0;\n  border: none;\n}\n\nspan.badge {\n  min-width: 3rem;\n  padding: 0 6px;\n  margin-left: 14px;\n  text-align: center;\n  font-size: 1rem;\n  line-height: inherit;\n  color: #757575;\n  float: right;\n  box-sizing: border-box;\n}\n\nspan.badge.new {\n  font-weight: 300;\n  font-size: 0.8rem;\n  color: #fff;\n  background-color: #26a69a;\n  border-radius: 2px;\n}\n\nspan.badge.new:after {\n  content: \" new\";\n}\n\nspan.badge[data-badge-caption]::after {\n  content: \" \" attr(data-badge-caption);\n}\n\nnav ul a span.badge {\n  display: inline-block;\n  float: none;\n  margin-left: 4px;\n  line-height: 22px;\n  height: 22px;\n}\n\n.side-nav span.badge.new,\n.collapsible span.badge.new {\n  position: relative;\n  background-color: transparent;\n}\n\n.side-nav span.badge.new::before,\n.collapsible span.badge.new::before {\n  content: '';\n  position: absolute;\n  top: 10px;\n  right: 0;\n  bottom: 10px;\n  left: 0;\n  background-color: #26a69a;\n  border-radius: 2px;\n  z-index: -1;\n}\n\n.collapsible span.badge.new {\n  z-index: 1;\n}\n\n.video-container {\n  position: relative;\n  padding-bottom: 56.25%;\n  height: 0;\n  overflow: hidden;\n}\n\n.video-container iframe, .video-container object, .video-container embed {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n}\n\n.progress {\n  position: relative;\n  height: 4px;\n  display: block;\n  width: 100%;\n  background-color: #acece6;\n  border-radius: 2px;\n  margin: 0.5rem 0 1rem 0;\n  overflow: hidden;\n}\n\n.progress .determinate {\n  position: absolute;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  background-color: #26a69a;\n  transition: width .3s linear;\n}\n\n.progress .indeterminate {\n  background-color: #26a69a;\n}\n\n.progress .indeterminate:before {\n  content: '';\n  position: absolute;\n  background-color: inherit;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  will-change: left, right;\n  -webkit-animation: indeterminate 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;\n          animation: indeterminate 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;\n}\n\n.progress .indeterminate:after {\n  content: '';\n  position: absolute;\n  background-color: inherit;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  will-change: left, right;\n  -webkit-animation: indeterminate-short 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite;\n          animation: indeterminate-short 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite;\n  -webkit-animation-delay: 1.15s;\n          animation-delay: 1.15s;\n}\n\n@-webkit-keyframes indeterminate {\n  0% {\n    left: -35%;\n    right: 100%;\n  }\n  60% {\n    left: 100%;\n    right: -90%;\n  }\n  100% {\n    left: 100%;\n    right: -90%;\n  }\n}\n\n@keyframes indeterminate {\n  0% {\n    left: -35%;\n    right: 100%;\n  }\n  60% {\n    left: 100%;\n    right: -90%;\n  }\n  100% {\n    left: 100%;\n    right: -90%;\n  }\n}\n\n@-webkit-keyframes indeterminate-short {\n  0% {\n    left: -200%;\n    right: 100%;\n  }\n  60% {\n    left: 107%;\n    right: -8%;\n  }\n  100% {\n    left: 107%;\n    right: -8%;\n  }\n}\n\n@keyframes indeterminate-short {\n  0% {\n    left: -200%;\n    right: 100%;\n  }\n  60% {\n    left: 107%;\n    right: -8%;\n  }\n  100% {\n    left: 107%;\n    right: -8%;\n  }\n}\n\n/*******************\n  Utility Classes\n*******************/\n.hide {\n  display: none !important;\n}\n\n.left-align {\n  text-align: left;\n}\n\n.right-align {\n  text-align: right;\n}\n\n.center, .center-align {\n  text-align: center;\n}\n\n.left {\n  float: left !important;\n}\n\n.right {\n  float: right !important;\n}\n\n.no-select, input[type=range],\ninput[type=range] + .thumb {\n  -webkit-touch-callout: none;\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  -ms-user-select: none;\n  user-select: none;\n}\n\n.circle {\n  border-radius: 50%;\n}\n\n.center-block {\n  display: block;\n  margin-left: auto;\n  margin-right: auto;\n}\n\n.truncate {\n  display: block;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.no-padding {\n  padding: 0 !important;\n}\n\n/* This is needed for some mobile phones to display the Google Icon font properly */\n.material-icons {\n  text-rendering: optimizeLegibility;\n  -webkit-font-feature-settings: 'liga';\n     -moz-font-feature-settings: 'liga';\n          font-feature-settings: 'liga';\n}\n\n.container {\n  margin: 0 auto;\n  max-width: 1280px;\n  width: 90%;\n}\n\n@media only screen and (min-width: 601px) {\n  .container {\n    width: 85%;\n  }\n}\n\n@media only screen and (min-width: 993px) {\n  .container {\n    width: 70%;\n  }\n}\n\n.container .row {\n  margin-left: -0.75rem;\n  margin-right: -0.75rem;\n}\n\n.section {\n  padding-top: 1rem;\n  padding-bottom: 1rem;\n}\n\n.section.no-pad {\n  padding: 0;\n}\n\n.section.no-pad-bot {\n  padding-bottom: 0;\n}\n\n.section.no-pad-top {\n  padding-top: 0;\n}\n\n.row {\n  margin-left: auto;\n  margin-right: auto;\n  margin-bottom: 20px;\n}\n\n.row:after {\n  content: \"\";\n  display: table;\n  clear: both;\n}\n\n.row .col {\n  float: left;\n  box-sizing: border-box;\n  padding: 0 0.75rem;\n  min-height: 1px;\n}\n\n.row .col[class*=\"push-\"], .row .col[class*=\"pull-\"] {\n  position: relative;\n}\n\n.row .col.s1 {\n  width: 8.3333333333%;\n  margin-left: auto;\n  left: auto;\n  right: auto;\n}\n\n.row .col.s2 {\n  width: 16.6666666667%;\n  margin-left: auto;\n  left: auto;\n  right: auto;\n}\n\n.row .col.s3 {\n  width: 25%;\n  margin-left: auto;\n  left: auto;\n  right: auto;\n}\n\n.row .col.s4 {\n  width: 33.3333333333%;\n  margin-left: auto;\n  left: auto;\n  right: auto;\n}\n\n.row .col.s5 {\n  width: 41.6666666667%;\n  margin-left: auto;\n  left: auto;\n  right: auto;\n}\n\n.row .col.s6 {\n  width: 50%;\n  margin-left: auto;\n  left: auto;\n  right: auto;\n}\n\n.row .col.s7 {\n  width: 58.3333333333%;\n  margin-left: auto;\n  left: auto;\n  right: auto;\n}\n\n.row .col.s8 {\n  width: 66.6666666667%;\n  margin-left: auto;\n  left: auto;\n  right: auto;\n}\n\n.row .col.s9 {\n  width: 75%;\n  margin-left: auto;\n  left: auto;\n  right: auto;\n}\n\n.row .col.s10 {\n  width: 83.3333333333%;\n  margin-left: auto;\n  left: auto;\n  right: auto;\n}\n\n.row .col.s11 {\n  width: 91.6666666667%;\n  margin-left: auto;\n  left: auto;\n  right: auto;\n}\n\n.row .col.s12 {\n  width: 100%;\n  margin-left: auto;\n  left: auto;\n  right: auto;\n}\n\n.row .col.offset-s1 {\n  margin-left: 8.3333333333%;\n}\n\n.row .col.pull-s1 {\n  right: 8.3333333333%;\n}\n\n.row .col.push-s1 {\n  left: 8.3333333333%;\n}\n\n.row .col.offset-s2 {\n  margin-left: 16.6666666667%;\n}\n\n.row .col.pull-s2 {\n  right: 16.6666666667%;\n}\n\n.row .col.push-s2 {\n  left: 16.6666666667%;\n}\n\n.row .col.offset-s3 {\n  margin-left: 25%;\n}\n\n.row .col.pull-s3 {\n  right: 25%;\n}\n\n.row .col.push-s3 {\n  left: 25%;\n}\n\n.row .col.offset-s4 {\n  margin-left: 33.3333333333%;\n}\n\n.row .col.pull-s4 {\n  right: 33.3333333333%;\n}\n\n.row .col.push-s4 {\n  left: 33.3333333333%;\n}\n\n.row .col.offset-s5 {\n  margin-left: 41.6666666667%;\n}\n\n.row .col.pull-s5 {\n  right: 41.6666666667%;\n}\n\n.row .col.push-s5 {\n  left: 41.6666666667%;\n}\n\n.row .col.offset-s6 {\n  margin-left: 50%;\n}\n\n.row .col.pull-s6 {\n  right: 50%;\n}\n\n.row .col.push-s6 {\n  left: 50%;\n}\n\n.row .col.offset-s7 {\n  margin-left: 58.3333333333%;\n}\n\n.row .col.pull-s7 {\n  right: 58.3333333333%;\n}\n\n.row .col.push-s7 {\n  left: 58.3333333333%;\n}\n\n.row .col.offset-s8 {\n  margin-left: 66.6666666667%;\n}\n\n.row .col.pull-s8 {\n  right: 66.6666666667%;\n}\n\n.row .col.push-s8 {\n  left: 66.6666666667%;\n}\n\n.row .col.offset-s9 {\n  margin-left: 75%;\n}\n\n.row .col.pull-s9 {\n  right: 75%;\n}\n\n.row .col.push-s9 {\n  left: 75%;\n}\n\n.row .col.offset-s10 {\n  margin-left: 83.3333333333%;\n}\n\n.row .col.pull-s10 {\n  right: 83.3333333333%;\n}\n\n.row .col.push-s10 {\n  left: 83.3333333333%;\n}\n\n.row .col.offset-s11 {\n  margin-left: 91.6666666667%;\n}\n\n.row .col.pull-s11 {\n  right: 91.6666666667%;\n}\n\n.row .col.push-s11 {\n  left: 91.6666666667%;\n}\n\n.row .col.offset-s12 {\n  margin-left: 100%;\n}\n\n.row .col.pull-s12 {\n  right: 100%;\n}\n\n.row .col.push-s12 {\n  left: 100%;\n}\n\n@media only screen and (min-width: 601px) {\n  .row .col.m1 {\n    width: 8.3333333333%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.m2 {\n    width: 16.6666666667%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.m3 {\n    width: 25%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.m4 {\n    width: 33.3333333333%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.m5 {\n    width: 41.6666666667%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.m6 {\n    width: 50%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.m7 {\n    width: 58.3333333333%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.m8 {\n    width: 66.6666666667%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.m9 {\n    width: 75%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.m10 {\n    width: 83.3333333333%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.m11 {\n    width: 91.6666666667%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.m12 {\n    width: 100%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.offset-m1 {\n    margin-left: 8.3333333333%;\n  }\n  .row .col.pull-m1 {\n    right: 8.3333333333%;\n  }\n  .row .col.push-m1 {\n    left: 8.3333333333%;\n  }\n  .row .col.offset-m2 {\n    margin-left: 16.6666666667%;\n  }\n  .row .col.pull-m2 {\n    right: 16.6666666667%;\n  }\n  .row .col.push-m2 {\n    left: 16.6666666667%;\n  }\n  .row .col.offset-m3 {\n    margin-left: 25%;\n  }\n  .row .col.pull-m3 {\n    right: 25%;\n  }\n  .row .col.push-m3 {\n    left: 25%;\n  }\n  .row .col.offset-m4 {\n    margin-left: 33.3333333333%;\n  }\n  .row .col.pull-m4 {\n    right: 33.3333333333%;\n  }\n  .row .col.push-m4 {\n    left: 33.3333333333%;\n  }\n  .row .col.offset-m5 {\n    margin-left: 41.6666666667%;\n  }\n  .row .col.pull-m5 {\n    right: 41.6666666667%;\n  }\n  .row .col.push-m5 {\n    left: 41.6666666667%;\n  }\n  .row .col.offset-m6 {\n    margin-left: 50%;\n  }\n  .row .col.pull-m6 {\n    right: 50%;\n  }\n  .row .col.push-m6 {\n    left: 50%;\n  }\n  .row .col.offset-m7 {\n    margin-left: 58.3333333333%;\n  }\n  .row .col.pull-m7 {\n    right: 58.3333333333%;\n  }\n  .row .col.push-m7 {\n    left: 58.3333333333%;\n  }\n  .row .col.offset-m8 {\n    margin-left: 66.6666666667%;\n  }\n  .row .col.pull-m8 {\n    right: 66.6666666667%;\n  }\n  .row .col.push-m8 {\n    left: 66.6666666667%;\n  }\n  .row .col.offset-m9 {\n    margin-left: 75%;\n  }\n  .row .col.pull-m9 {\n    right: 75%;\n  }\n  .row .col.push-m9 {\n    left: 75%;\n  }\n  .row .col.offset-m10 {\n    margin-left: 83.3333333333%;\n  }\n  .row .col.pull-m10 {\n    right: 83.3333333333%;\n  }\n  .row .col.push-m10 {\n    left: 83.3333333333%;\n  }\n  .row .col.offset-m11 {\n    margin-left: 91.6666666667%;\n  }\n  .row .col.pull-m11 {\n    right: 91.6666666667%;\n  }\n  .row .col.push-m11 {\n    left: 91.6666666667%;\n  }\n  .row .col.offset-m12 {\n    margin-left: 100%;\n  }\n  .row .col.pull-m12 {\n    right: 100%;\n  }\n  .row .col.push-m12 {\n    left: 100%;\n  }\n}\n\n@media only screen and (min-width: 993px) {\n  .row .col.l1 {\n    width: 8.3333333333%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.l2 {\n    width: 16.6666666667%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.l3 {\n    width: 25%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.l4 {\n    width: 33.3333333333%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.l5 {\n    width: 41.6666666667%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.l6 {\n    width: 50%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.l7 {\n    width: 58.3333333333%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.l8 {\n    width: 66.6666666667%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.l9 {\n    width: 75%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.l10 {\n    width: 83.3333333333%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.l11 {\n    width: 91.6666666667%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.l12 {\n    width: 100%;\n    margin-left: auto;\n    left: auto;\n    right: auto;\n  }\n  .row .col.offset-l1 {\n    margin-left: 8.3333333333%;\n  }\n  .row .col.pull-l1 {\n    right: 8.3333333333%;\n  }\n  .row .col.push-l1 {\n    left: 8.3333333333%;\n  }\n  .row .col.offset-l2 {\n    margin-left: 16.6666666667%;\n  }\n  .row .col.pull-l2 {\n    right: 16.6666666667%;\n  }\n  .row .col.push-l2 {\n    left: 16.6666666667%;\n  }\n  .row .col.offset-l3 {\n    margin-left: 25%;\n  }\n  .row .col.pull-l3 {\n    right: 25%;\n  }\n  .row .col.push-l3 {\n    left: 25%;\n  }\n  .row .col.offset-l4 {\n    margin-left: 33.3333333333%;\n  }\n  .row .col.pull-l4 {\n    right: 33.3333333333%;\n  }\n  .row .col.push-l4 {\n    left: 33.3333333333%;\n  }\n  .row .col.offset-l5 {\n    margin-left: 41.6666666667%;\n  }\n  .row .col.pull-l5 {\n    right: 41.6666666667%;\n  }\n  .row .col.push-l5 {\n    left: 41.6666666667%;\n  }\n  .row .col.offset-l6 {\n    margin-left: 50%;\n  }\n  .row .col.pull-l6 {\n    right: 50%;\n  }\n  .row .col.push-l6 {\n    left: 50%;\n  }\n  .row .col.offset-l7 {\n    margin-left: 58.3333333333%;\n  }\n  .row .col.pull-l7 {\n    right: 58.3333333333%;\n  }\n  .row .col.push-l7 {\n    left: 58.3333333333%;\n  }\n  .row .col.offset-l8 {\n    margin-left: 66.6666666667%;\n  }\n  .row .col.pull-l8 {\n    right: 66.6666666667%;\n  }\n  .row .col.push-l8 {\n    left: 66.6666666667%;\n  }\n  .row .col.offset-l9 {\n    margin-left: 75%;\n  }\n  .row .col.pull-l9 {\n    right: 75%;\n  }\n  .row .col.push-l9 {\n    left: 75%;\n  }\n  .row .col.offset-l10 {\n    margin-left: 83.3333333333%;\n  }\n  .row .col.pull-l10 {\n    right: 83.3333333333%;\n  }\n  .row .col.push-l10 {\n    left: 83.3333333333%;\n  }\n  .row .col.offset-l11 {\n    margin-left: 91.6666666667%;\n  }\n  .row .col.pull-l11 {\n    right: 91.6666666667%;\n  }\n  .row .col.push-l11 {\n    left: 91.6666666667%;\n  }\n  .row .col.offset-l12 {\n    margin-left: 100%;\n  }\n  .row .col.pull-l12 {\n    right: 100%;\n  }\n  .row .col.push-l12 {\n    left: 100%;\n  }\n}\n\nnav {\n  color: #fff;\n  background-color: #ee6e73;\n  width: 100%;\n  height: 56px;\n  line-height: 56px;\n}\n\nnav.nav-extended {\n  height: auto;\n}\n\nnav.nav-extended .nav-wrapper {\n  height: auto;\n}\n\nnav a {\n  color: #fff;\n}\n\nnav i,\nnav [class^=\"mdi-\"], nav [class*=\"mdi-\"],\nnav i.material-icons {\n  display: block;\n  font-size: 24px;\n  height: 56px;\n  line-height: 56px;\n}\n\nnav .nav-wrapper {\n  position: relative;\n  height: 100%;\n}\n\n@media only screen and (min-width: 993px) {\n  nav a.button-collapse {\n    display: none;\n  }\n}\n\nnav .button-collapse {\n  float: left;\n  position: relative;\n  z-index: 1;\n  height: 56px;\n  margin: 0 18px;\n}\n\nnav .button-collapse i {\n  height: 56px;\n  line-height: 56px;\n}\n\nnav .brand-logo {\n  position: absolute;\n  color: #fff;\n  display: inline-block;\n  font-size: 2.1rem;\n  padding: 0;\n  white-space: nowrap;\n}\n\nnav .brand-logo.center {\n  left: 50%;\n  -webkit-transform: translateX(-50%);\n          transform: translateX(-50%);\n}\n\n@media only screen and (max-width: 992px) {\n  nav .brand-logo {\n    left: 50%;\n    -webkit-transform: translateX(-50%);\n            transform: translateX(-50%);\n  }\n  nav .brand-logo.left, nav .brand-logo.right {\n    padding: 0;\n    -webkit-transform: none;\n            transform: none;\n  }\n  nav .brand-logo.left {\n    left: 0.5rem;\n  }\n  nav .brand-logo.right {\n    right: 0.5rem;\n    left: auto;\n  }\n}\n\nnav .brand-logo.right {\n  right: 0.5rem;\n  padding: 0;\n}\n\nnav .brand-logo i,\nnav .brand-logo [class^=\"mdi-\"], nav .brand-logo [class*=\"mdi-\"],\nnav .brand-logo i.material-icons {\n  float: left;\n  margin-right: 15px;\n}\n\nnav ul {\n  margin: 0;\n}\n\nnav ul li {\n  transition: background-color .3s;\n  float: left;\n  padding: 0;\n}\n\nnav ul li.active {\n  background-color: rgba(0, 0, 0, 0.1);\n}\n\nnav ul a {\n  transition: background-color .3s;\n  font-size: 1rem;\n  color: #fff;\n  display: block;\n  padding: 0 15px;\n  cursor: pointer;\n}\n\nnav ul a.btn, nav ul a.btn-large, nav ul a.btn-large, nav ul a.btn-flat, nav ul a.btn-floating {\n  margin-top: -2px;\n  margin-left: 15px;\n  margin-right: 15px;\n}\n\nnav ul a:hover {\n  background-color: rgba(0, 0, 0, 0.1);\n}\n\nnav ul.left {\n  float: left;\n}\n\nnav form {\n  height: 100%;\n}\n\nnav .input-field {\n  margin: 0;\n  height: 100%;\n}\n\nnav .input-field input {\n  height: 100%;\n  font-size: 1.2rem;\n  border: none;\n  padding-left: 2rem;\n}\n\nnav .input-field input:focus, nav .input-field input[type=text]:valid, nav .input-field input[type=password]:valid, nav .input-field input[type=email]:valid, nav .input-field input[type=url]:valid, nav .input-field input[type=date]:valid {\n  border: none;\n  box-shadow: none;\n}\n\nnav .input-field label {\n  top: 0;\n  left: 0;\n}\n\nnav .input-field label i {\n  color: rgba(255, 255, 255, 0.7);\n  transition: color .3s;\n}\n\nnav .input-field label.active i {\n  color: #fff;\n}\n\nnav .input-field label.active {\n  -webkit-transform: translateY(0);\n          transform: translateY(0);\n}\n\n.navbar-fixed {\n  position: relative;\n  height: 56px;\n  z-index: 997;\n}\n\n.navbar-fixed nav {\n  position: fixed;\n}\n\n@media only screen and (min-width: 601px) {\n  nav, nav .nav-wrapper i, nav a.button-collapse, nav a.button-collapse i {\n    height: 64px;\n    line-height: 64px;\n  }\n  .navbar-fixed {\n    height: 64px;\n  }\n}\n\na {\n  text-decoration: none;\n}\n\nhtml {\n  line-height: 1.5;\n  font-family: \"Roboto\", sans-serif;\n  font-weight: normal;\n  color: rgba(0, 0, 0, 0.87);\n}\n\n@media only screen and (min-width: 0) {\n  html {\n    font-size: 14px;\n  }\n}\n\n@media only screen and (min-width: 992px) {\n  html {\n    font-size: 14.5px;\n  }\n}\n\n@media only screen and (min-width: 1200px) {\n  html {\n    font-size: 15px;\n  }\n}\n\nh1, h2, h3, h4, h5, h6 {\n  font-weight: 400;\n  line-height: 1.1;\n}\n\nh1 a, h2 a, h3 a, h4 a, h5 a, h6 a {\n  font-weight: inherit;\n}\n\nh1 {\n  font-size: 4.2rem;\n  line-height: 110%;\n  margin: 2.1rem 0 1.68rem 0;\n}\n\nh2 {\n  font-size: 3.56rem;\n  line-height: 110%;\n  margin: 1.78rem 0 1.424rem 0;\n}\n\nh3 {\n  font-size: 2.92rem;\n  line-height: 110%;\n  margin: 1.46rem 0 1.168rem 0;\n}\n\nh4 {\n  font-size: 2.28rem;\n  line-height: 110%;\n  margin: 1.14rem 0 0.912rem 0;\n}\n\nh5 {\n  font-size: 1.64rem;\n  line-height: 110%;\n  margin: 0.82rem 0 0.656rem 0;\n}\n\nh6 {\n  font-size: 1rem;\n  line-height: 110%;\n  margin: 0.5rem 0 0.4rem 0;\n}\n\nem {\n  font-style: italic;\n}\n\nstrong {\n  font-weight: 500;\n}\n\nsmall {\n  font-size: 75%;\n}\n\n.light, footer.page-footer .footer-copyright {\n  font-weight: 300;\n}\n\n.thin {\n  font-weight: 200;\n}\n\n.flow-text {\n  font-weight: 300;\n}\n\n@media only screen and (min-width: 360px) {\n  .flow-text {\n    font-size: 1.2rem;\n  }\n}\n\n@media only screen and (min-width: 390px) {\n  .flow-text {\n    font-size: 1.224rem;\n  }\n}\n\n@media only screen and (min-width: 420px) {\n  .flow-text {\n    font-size: 1.248rem;\n  }\n}\n\n@media only screen and (min-width: 450px) {\n  .flow-text {\n    font-size: 1.272rem;\n  }\n}\n\n@media only screen and (min-width: 480px) {\n  .flow-text {\n    font-size: 1.296rem;\n  }\n}\n\n@media only screen and (min-width: 510px) {\n  .flow-text {\n    font-size: 1.32rem;\n  }\n}\n\n@media only screen and (min-width: 540px) {\n  .flow-text {\n    font-size: 1.344rem;\n  }\n}\n\n@media only screen and (min-width: 570px) {\n  .flow-text {\n    font-size: 1.368rem;\n  }\n}\n\n@media only screen and (min-width: 600px) {\n  .flow-text {\n    font-size: 1.392rem;\n  }\n}\n\n@media only screen and (min-width: 630px) {\n  .flow-text {\n    font-size: 1.416rem;\n  }\n}\n\n@media only screen and (min-width: 660px) {\n  .flow-text {\n    font-size: 1.44rem;\n  }\n}\n\n@media only screen and (min-width: 690px) {\n  .flow-text {\n    font-size: 1.464rem;\n  }\n}\n\n@media only screen and (min-width: 720px) {\n  .flow-text {\n    font-size: 1.488rem;\n  }\n}\n\n@media only screen and (min-width: 750px) {\n  .flow-text {\n    font-size: 1.512rem;\n  }\n}\n\n@media only screen and (min-width: 780px) {\n  .flow-text {\n    font-size: 1.536rem;\n  }\n}\n\n@media only screen and (min-width: 810px) {\n  .flow-text {\n    font-size: 1.56rem;\n  }\n}\n\n@media only screen and (min-width: 840px) {\n  .flow-text {\n    font-size: 1.584rem;\n  }\n}\n\n@media only screen and (min-width: 870px) {\n  .flow-text {\n    font-size: 1.608rem;\n  }\n}\n\n@media only screen and (min-width: 900px) {\n  .flow-text {\n    font-size: 1.632rem;\n  }\n}\n\n@media only screen and (min-width: 930px) {\n  .flow-text {\n    font-size: 1.656rem;\n  }\n}\n\n@media only screen and (min-width: 960px) {\n  .flow-text {\n    font-size: 1.68rem;\n  }\n}\n\n@media only screen and (max-width: 360px) {\n  .flow-text {\n    font-size: 1.2rem;\n  }\n}\n\n.card-panel {\n  transition: box-shadow .25s;\n  padding: 20px;\n  margin: 0.5rem 0 1rem 0;\n  border-radius: 2px;\n  background-color: #fff;\n}\n\n.card {\n  position: relative;\n  margin: 0.5rem 0 1rem 0;\n  background-color: #fff;\n  transition: box-shadow .25s;\n  border-radius: 2px;\n}\n\n.card .card-title {\n  font-size: 24px;\n  font-weight: 300;\n}\n\n.card .card-title.activator {\n  cursor: pointer;\n}\n\n.card.small, .card.medium, .card.large {\n  position: relative;\n}\n\n.card.small .card-image, .card.medium .card-image, .card.large .card-image {\n  max-height: 60%;\n  overflow: hidden;\n}\n\n.card.small .card-image + .card-content, .card.medium .card-image + .card-content, .card.large .card-image + .card-content {\n  max-height: 40%;\n}\n\n.card.small .card-content, .card.medium .card-content, .card.large .card-content {\n  max-height: 100%;\n  overflow: hidden;\n}\n\n.card.small .card-action, .card.medium .card-action, .card.large .card-action {\n  position: absolute;\n  bottom: 0;\n  left: 0;\n  right: 0;\n}\n\n.card.small {\n  height: 300px;\n}\n\n.card.medium {\n  height: 400px;\n}\n\n.card.large {\n  height: 500px;\n}\n\n.card.horizontal {\n  display: -webkit-flex;\n  display: -ms-flexbox;\n  display: flex;\n}\n\n.card.horizontal.small .card-image, .card.horizontal.medium .card-image, .card.horizontal.large .card-image {\n  height: 100%;\n  max-height: none;\n  overflow: visible;\n}\n\n.card.horizontal.small .card-image img, .card.horizontal.medium .card-image img, .card.horizontal.large .card-image img {\n  height: 100%;\n}\n\n.card.horizontal .card-image {\n  max-width: 50%;\n}\n\n.card.horizontal .card-image img {\n  border-radius: 2px 0 0 2px;\n  max-width: 100%;\n  width: auto;\n}\n\n.card.horizontal .card-stacked {\n  display: -webkit-flex;\n  display: -ms-flexbox;\n  display: flex;\n  -webkit-flex-direction: column;\n      -ms-flex-direction: column;\n          flex-direction: column;\n  -webkit-flex: 1;\n      -ms-flex: 1;\n          flex: 1;\n  position: relative;\n}\n\n.card.horizontal .card-stacked .card-content {\n  -webkit-flex-grow: 1;\n      -ms-flex-positive: 1;\n          flex-grow: 1;\n}\n\n.card.sticky-action .card-action {\n  z-index: 2;\n}\n\n.card.sticky-action .card-reveal {\n  z-index: 1;\n  padding-bottom: 64px;\n}\n\n.card .card-image {\n  position: relative;\n}\n\n.card .card-image img {\n  display: block;\n  border-radius: 2px 2px 0 0;\n  position: relative;\n  left: 0;\n  right: 0;\n  top: 0;\n  bottom: 0;\n  width: 100%;\n}\n\n.card .card-image .card-title {\n  color: #fff;\n  position: absolute;\n  bottom: 0;\n  left: 0;\n  padding: 20px;\n}\n\n.card .card-content {\n  padding: 20px;\n  border-radius: 0 0 2px 2px;\n}\n\n.card .card-content p {\n  margin: 0;\n  color: inherit;\n}\n\n.card .card-content .card-title {\n  line-height: 48px;\n}\n\n.card .card-action {\n  position: relative;\n  background-color: inherit;\n  border-top: 1px solid rgba(160, 160, 160, 0.2);\n  padding: 20px;\n}\n\n.card .card-action a:not(.btn):not(.btn-large):not(.btn-floating) {\n  color: #ffab40;\n  margin-right: 20px;\n  transition: color .3s ease;\n  text-transform: uppercase;\n}\n\n.card .card-action a:not(.btn):not(.btn-large):not(.btn-floating):hover {\n  color: #ffd8a6;\n}\n\n.card .card-reveal {\n  padding: 20px;\n  position: absolute;\n  background-color: #fff;\n  width: 100%;\n  overflow-y: auto;\n  left: 0;\n  top: 100%;\n  height: 100%;\n  z-index: 3;\n  display: none;\n}\n\n.card .card-reveal .card-title {\n  cursor: pointer;\n  display: block;\n}\n\n#toast-container {\n  display: block;\n  position: fixed;\n  z-index: 10000;\n}\n\n@media only screen and (max-width: 600px) {\n  #toast-container {\n    min-width: 100%;\n    bottom: 0%;\n  }\n}\n\n@media only screen and (min-width: 601px) and (max-width: 992px) {\n  #toast-container {\n    left: 5%;\n    bottom: 7%;\n    max-width: 90%;\n  }\n}\n\n@media only screen and (min-width: 993px) {\n  #toast-container {\n    top: 10%;\n    right: 7%;\n    max-width: 86%;\n  }\n}\n\n.toast {\n  border-radius: 2px;\n  top: 0;\n  width: auto;\n  clear: both;\n  margin-top: 10px;\n  position: relative;\n  max-width: 100%;\n  height: auto;\n  min-height: 48px;\n  line-height: 1.5em;\n  word-break: break-all;\n  background-color: #323232;\n  padding: 10px 25px;\n  font-size: 1.1rem;\n  font-weight: 300;\n  color: #fff;\n  display: -webkit-flex;\n  display: -ms-flexbox;\n  display: flex;\n  -webkit-align-items: center;\n      -ms-flex-align: center;\n          align-items: center;\n  -webkit-justify-content: space-between;\n      -ms-flex-pack: justify;\n          justify-content: space-between;\n}\n\n.toast .btn, .toast .btn-large, .toast .btn-flat {\n  margin: 0;\n  margin-left: 3rem;\n}\n\n.toast.rounded {\n  border-radius: 24px;\n}\n\n@media only screen and (max-width: 600px) {\n  .toast {\n    width: 100%;\n    border-radius: 0;\n  }\n}\n\n@media only screen and (min-width: 601px) and (max-width: 992px) {\n  .toast {\n    float: left;\n  }\n}\n\n@media only screen and (min-width: 993px) {\n  .toast {\n    float: right;\n  }\n}\n\n.tabs {\n  position: relative;\n  overflow-x: auto;\n  overflow-y: hidden;\n  height: 48px;\n  width: 100%;\n  background-color: #fff;\n  margin: 0 auto;\n  white-space: nowrap;\n}\n\n.tabs.tabs-transparent {\n  background-color: transparent;\n}\n\n.tabs.tabs-transparent .tab a,\n.tabs.tabs-transparent .tab.disabled a,\n.tabs.tabs-transparent .tab.disabled a:hover {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n.tabs.tabs-transparent .tab a:hover,\n.tabs.tabs-transparent .tab a.active {\n  color: #fff;\n}\n\n.tabs.tabs-transparent .indicator {\n  background-color: #fff;\n}\n\n.tabs.tabs-fixed-width {\n  display: -webkit-flex;\n  display: -ms-flexbox;\n  display: flex;\n}\n\n.tabs.tabs-fixed-width .tab {\n  -webkit-box-flex: 1;\n  -webkit-flex-grow: 1;\n  -ms-flex-positive: 1;\n  flex-grow: 1;\n}\n\n.tabs .tab {\n  display: inline-block;\n  text-align: center;\n  line-height: 48px;\n  height: 48px;\n  padding: 0;\n  margin: 0;\n  text-transform: uppercase;\n}\n\n.tabs .tab a {\n  color: rgba(238, 110, 115, 0.7);\n  display: block;\n  width: 100%;\n  height: 100%;\n  padding: 0 24px;\n  font-size: 14px;\n  text-overflow: ellipsis;\n  overflow: hidden;\n  transition: color .28s ease;\n}\n\n.tabs .tab a:hover, .tabs .tab a.active {\n  background-color: transparent;\n  color: #ee6e73;\n}\n\n.tabs .tab.disabled a,\n.tabs .tab.disabled a:hover {\n  color: rgba(238, 110, 115, 0.7);\n  cursor: default;\n}\n\n.tabs .indicator {\n  position: absolute;\n  bottom: 0;\n  height: 2px;\n  background-color: #f6b2b5;\n  will-change: left, right;\n}\n\n@media only screen and (max-width: 992px) {\n  .tabs {\n    display: -webkit-flex;\n    display: -ms-flexbox;\n    display: flex;\n  }\n  .tabs .tab {\n    -webkit-box-flex: 1;\n    -webkit-flex-grow: 1;\n    -ms-flex-positive: 1;\n    flex-grow: 1;\n  }\n  .tabs .tab a {\n    padding: 0 12px;\n  }\n}\n\n.material-tooltip {\n  padding: 10px 8px;\n  font-size: 1rem;\n  z-index: 2000;\n  background-color: transparent;\n  border-radius: 2px;\n  color: #fff;\n  min-height: 36px;\n  line-height: 120%;\n  opacity: 0;\n  display: none;\n  position: absolute;\n  text-align: center;\n  max-width: calc(100% - 4px);\n  overflow: hidden;\n  left: 0;\n  top: 0;\n  pointer-events: none;\n}\n\n.backdrop {\n  position: absolute;\n  opacity: 0;\n  display: none;\n  height: 7px;\n  width: 14px;\n  border-radius: 0 0 50% 50%;\n  background-color: #323232;\n  z-index: -1;\n  -webkit-transform-origin: 50% 0%;\n          transform-origin: 50% 0%;\n  -webkit-transform: translate3d(0, 0, 0);\n          transform: translate3d(0, 0, 0);\n}\n\n.btn, .btn-large,\n.btn-flat {\n  border: none;\n  border-radius: 2px;\n  display: inline-block;\n  height: 36px;\n  line-height: 36px;\n  padding: 0 2rem;\n  text-transform: uppercase;\n  vertical-align: middle;\n  -webkit-tap-highlight-color: transparent;\n}\n\n.btn.disabled, .disabled.btn-large,\n.btn-floating.disabled,\n.btn-large.disabled,\n.btn-flat.disabled,\n.btn:disabled,\n.btn-large:disabled,\n.btn-floating:disabled,\n.btn-large:disabled,\n.btn-flat:disabled,\n.btn[disabled],\n[disabled].btn-large,\n.btn-floating[disabled],\n.btn-large[disabled],\n.btn-flat[disabled] {\n  pointer-events: none;\n  background-color: #DFDFDF !important;\n  box-shadow: none;\n  color: #9F9F9F !important;\n  cursor: default;\n}\n\n.btn.disabled:hover, .disabled.btn-large:hover,\n.btn-floating.disabled:hover,\n.btn-large.disabled:hover,\n.btn-flat.disabled:hover,\n.btn:disabled:hover,\n.btn-large:disabled:hover,\n.btn-floating:disabled:hover,\n.btn-large:disabled:hover,\n.btn-flat:disabled:hover,\n.btn[disabled]:hover,\n[disabled].btn-large:hover,\n.btn-floating[disabled]:hover,\n.btn-large[disabled]:hover,\n.btn-flat[disabled]:hover {\n  background-color: #DFDFDF !important;\n  color: #9F9F9F !important;\n}\n\n.btn, .btn-large,\n.btn-floating,\n.btn-large,\n.btn-flat {\n  outline: 0;\n}\n\n.btn i, .btn-large i,\n.btn-floating i,\n.btn-large i,\n.btn-flat i {\n  font-size: 1.3rem;\n  line-height: inherit;\n}\n\n.btn:focus, .btn-large:focus,\n.btn-floating:focus {\n  background-color: #1d7d74;\n}\n\n.btn, .btn-large {\n  text-decoration: none;\n  color: #fff;\n  background-color: #26a69a;\n  text-align: center;\n  letter-spacing: .5px;\n  transition: .2s ease-out;\n  cursor: pointer;\n}\n\n.btn:hover, .btn-large:hover {\n  background-color: #2bbbad;\n}\n\n.btn-floating {\n  display: inline-block;\n  color: #fff;\n  position: relative;\n  overflow: hidden;\n  z-index: 1;\n  width: 40px;\n  height: 40px;\n  line-height: 40px;\n  padding: 0;\n  background-color: #26a69a;\n  border-radius: 50%;\n  transition: .3s;\n  cursor: pointer;\n  vertical-align: middle;\n}\n\n.btn-floating i {\n  width: inherit;\n  display: inline-block;\n  text-align: center;\n  color: #fff;\n  font-size: 1.6rem;\n  line-height: 40px;\n}\n\n.btn-floating:hover {\n  background-color: #26a69a;\n}\n\n.btn-floating:before {\n  border-radius: 0;\n}\n\n.btn-floating.btn-large {\n  width: 56px;\n  height: 56px;\n}\n\n.btn-floating.btn-large i {\n  line-height: 56px;\n}\n\nbutton.btn-floating {\n  border: none;\n}\n\n.fixed-action-btn {\n  position: fixed;\n  right: 23px;\n  bottom: 23px;\n  padding-top: 15px;\n  margin-bottom: 0;\n  z-index: 998;\n}\n\n.fixed-action-btn.active ul {\n  visibility: visible;\n}\n\n.fixed-action-btn.horizontal {\n  padding: 0 0 0 15px;\n}\n\n.fixed-action-btn.horizontal ul {\n  text-align: right;\n  right: 64px;\n  top: 50%;\n  -webkit-transform: translateY(-50%);\n          transform: translateY(-50%);\n  height: 100%;\n  left: auto;\n  width: 500px;\n  /*width 100% only goes to width of button container */\n}\n\n.fixed-action-btn.horizontal ul li {\n  display: inline-block;\n  margin: 15px 15px 0 0;\n}\n\n.fixed-action-btn.toolbar {\n  padding: 0;\n  height: 56px;\n}\n\n.fixed-action-btn.toolbar.active > a i {\n  opacity: 0;\n}\n\n.fixed-action-btn.toolbar ul {\n  display: -webkit-flex;\n  display: -ms-flexbox;\n  display: flex;\n  top: 0;\n  bottom: 0;\n}\n\n.fixed-action-btn.toolbar ul li {\n  -webkit-flex: 1;\n      -ms-flex: 1;\n          flex: 1;\n  display: inline-block;\n  margin: 0;\n  height: 100%;\n  transition: none;\n}\n\n.fixed-action-btn.toolbar ul li a {\n  display: block;\n  overflow: hidden;\n  position: relative;\n  width: 100%;\n  height: 100%;\n  background-color: transparent;\n  box-shadow: none;\n  color: #fff;\n  line-height: 56px;\n  z-index: 1;\n}\n\n.fixed-action-btn.toolbar ul li a i {\n  line-height: inherit;\n}\n\n.fixed-action-btn ul {\n  left: 0;\n  right: 0;\n  text-align: center;\n  position: absolute;\n  bottom: 64px;\n  margin: 0;\n  visibility: hidden;\n}\n\n.fixed-action-btn ul li {\n  margin-bottom: 15px;\n}\n\n.fixed-action-btn ul a.btn-floating {\n  opacity: 0;\n}\n\n.fixed-action-btn .fab-backdrop {\n  position: absolute;\n  top: 0;\n  left: 0;\n  z-index: -1;\n  width: 40px;\n  height: 40px;\n  background-color: #26a69a;\n  border-radius: 50%;\n  -webkit-transform: scale(0);\n          transform: scale(0);\n}\n\n.btn-flat {\n  box-shadow: none;\n  background-color: transparent;\n  color: #343434;\n  cursor: pointer;\n  transition: background-color .2s;\n}\n\n.btn-flat:focus, .btn-flat:active {\n  background-color: transparent;\n}\n\n.btn-flat:focus, .btn-flat:hover {\n  background-color: rgba(0, 0, 0, 0.1);\n  box-shadow: none;\n}\n\n.btn-flat:active {\n  background-color: rgba(0, 0, 0, 0.2);\n}\n\n.btn-flat.disabled {\n  background-color: transparent !important;\n  color: #b3b3b3 !important;\n  cursor: default;\n}\n\n.btn-large {\n  height: 54px;\n  line-height: 54px;\n}\n\n.btn-large i {\n  font-size: 1.6rem;\n}\n\n.btn-block {\n  display: block;\n}\n\n.dropdown-content {\n  background-color: #fff;\n  margin: 0;\n  display: none;\n  min-width: 100px;\n  max-height: 650px;\n  overflow-y: auto;\n  opacity: 0;\n  position: absolute;\n  z-index: 999;\n  will-change: width, height;\n}\n\n.dropdown-content li {\n  clear: both;\n  color: rgba(0, 0, 0, 0.87);\n  cursor: pointer;\n  min-height: 50px;\n  line-height: 1.5rem;\n  width: 100%;\n  text-align: left;\n  text-transform: none;\n}\n\n.dropdown-content li:hover, .dropdown-content li.active, .dropdown-content li.selected {\n  background-color: #eee;\n}\n\n.dropdown-content li.active.selected {\n  background-color: #e1e1e1;\n}\n\n.dropdown-content li.divider {\n  min-height: 0;\n  height: 1px;\n}\n\n.dropdown-content li > a, .dropdown-content li > span {\n  font-size: 16px;\n  color: #26a69a;\n  display: block;\n  line-height: 22px;\n  padding: 14px 16px;\n}\n\n.dropdown-content li > span > label {\n  top: 1px;\n  left: 0;\n  height: 18px;\n}\n\n.dropdown-content li > a > i {\n  height: inherit;\n  line-height: inherit;\n}\n\n.input-field.col .dropdown-content [type=\"checkbox\"] + label {\n  top: 1px;\n  left: 0;\n  height: 18px;\n}\n\n/*!\n * Waves v0.6.0\n * http://fian.my.id/Waves\n *\n * Copyright 2014 Alfiana E. Sibuea and other contributors\n * Released under the MIT license\n * https://github.com/fians/Waves/blob/master/LICENSE\n */\n.waves-effect {\n  position: relative;\n  cursor: pointer;\n  display: inline-block;\n  overflow: hidden;\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  -ms-user-select: none;\n  user-select: none;\n  -webkit-tap-highlight-color: transparent;\n  vertical-align: middle;\n  z-index: 1;\n  will-change: opacity, transform;\n  transition: .3s ease-out;\n}\n\n.waves-effect .waves-ripple {\n  position: absolute;\n  border-radius: 50%;\n  width: 20px;\n  height: 20px;\n  margin-top: -10px;\n  margin-left: -10px;\n  opacity: 0;\n  background: rgba(0, 0, 0, 0.2);\n  transition: all 0.7s ease-out;\n  transition-property: opacity, -webkit-transform;\n  transition-property: transform, opacity;\n  transition-property: transform, opacity, -webkit-transform;\n  -webkit-transform: scale(0);\n          transform: scale(0);\n  pointer-events: none;\n}\n\n.waves-effect.waves-light .waves-ripple {\n  background-color: rgba(255, 255, 255, 0.45);\n}\n\n.waves-effect.waves-red .waves-ripple {\n  background-color: rgba(244, 67, 54, 0.7);\n}\n\n.waves-effect.waves-yellow .waves-ripple {\n  background-color: rgba(255, 235, 59, 0.7);\n}\n\n.waves-effect.waves-orange .waves-ripple {\n  background-color: rgba(255, 152, 0, 0.7);\n}\n\n.waves-effect.waves-purple .waves-ripple {\n  background-color: rgba(156, 39, 176, 0.7);\n}\n\n.waves-effect.waves-green .waves-ripple {\n  background-color: rgba(76, 175, 80, 0.7);\n}\n\n.waves-effect.waves-teal .waves-ripple {\n  background-color: rgba(0, 150, 136, 0.7);\n}\n\n.waves-effect input[type=\"button\"], .waves-effect input[type=\"reset\"], .waves-effect input[type=\"submit\"] {\n  border: 0;\n  font-style: normal;\n  font-size: inherit;\n  text-transform: inherit;\n  background: none;\n}\n\n.waves-effect img {\n  position: relative;\n  z-index: -1;\n}\n\n.waves-notransition {\n  transition: none !important;\n}\n\n.waves-circle {\n  -webkit-transform: translateZ(0);\n          transform: translateZ(0);\n  -webkit-mask-image: -webkit-radial-gradient(circle, white 100%, black 100%);\n}\n\n.waves-input-wrapper {\n  border-radius: 0.2em;\n  vertical-align: bottom;\n}\n\n.waves-input-wrapper .waves-button-input {\n  position: relative;\n  top: 0;\n  left: 0;\n  z-index: 1;\n}\n\n.waves-circle {\n  text-align: center;\n  width: 2.5em;\n  height: 2.5em;\n  line-height: 2.5em;\n  border-radius: 50%;\n  -webkit-mask-image: none;\n}\n\n.waves-block {\n  display: block;\n}\n\n/* Firefox Bug: link not triggered */\n.waves-effect .waves-ripple {\n  z-index: -1;\n}\n\n.modal {\n  display: none;\n  position: fixed;\n  left: 0;\n  right: 0;\n  background-color: #fafafa;\n  padding: 0;\n  max-height: 70%;\n  width: 55%;\n  margin: auto;\n  overflow-y: auto;\n  border-radius: 2px;\n  will-change: top, opacity;\n}\n\n@media only screen and (max-width: 992px) {\n  .modal {\n    width: 80%;\n  }\n}\n\n.modal h1, .modal h2, .modal h3, .modal h4 {\n  margin-top: 0;\n}\n\n.modal .modal-content {\n  padding: 24px;\n}\n\n.modal .modal-close {\n  cursor: pointer;\n}\n\n.modal .modal-footer {\n  border-radius: 0 0 2px 2px;\n  background-color: #fafafa;\n  padding: 4px 6px;\n  height: 56px;\n  width: 100%;\n}\n\n.modal .modal-footer .btn, .modal .modal-footer .btn-large, .modal .modal-footer .btn-flat {\n  float: right;\n  margin: 6px 0;\n}\n\n.modal-overlay {\n  position: fixed;\n  z-index: 999;\n  top: -100px;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  height: 125%;\n  width: 100%;\n  background: #000;\n  display: none;\n  will-change: opacity;\n}\n\n.modal.modal-fixed-footer {\n  padding: 0;\n  height: 70%;\n}\n\n.modal.modal-fixed-footer .modal-content {\n  position: absolute;\n  height: calc(100% - 56px);\n  max-height: 100%;\n  width: 100%;\n  overflow-y: auto;\n}\n\n.modal.modal-fixed-footer .modal-footer {\n  border-top: 1px solid rgba(0, 0, 0, 0.1);\n  position: absolute;\n  bottom: 0;\n}\n\n.modal.bottom-sheet {\n  top: auto;\n  bottom: -100%;\n  margin: 0;\n  width: 100%;\n  max-height: 45%;\n  border-radius: 0;\n  will-change: bottom, opacity;\n}\n\n.collapsible {\n  border-top: 1px solid #ddd;\n  border-right: 1px solid #ddd;\n  border-left: 1px solid #ddd;\n  margin: 0.5rem 0 1rem 0;\n}\n\n.collapsible-header {\n  display: block;\n  cursor: pointer;\n  min-height: 3rem;\n  line-height: 3rem;\n  padding: 0 1rem;\n  background-color: #fff;\n  border-bottom: 1px solid #ddd;\n}\n\n.collapsible-header i {\n  width: 2rem;\n  font-size: 1.6rem;\n  line-height: 3rem;\n  display: block;\n  float: left;\n  text-align: center;\n  margin-right: 1rem;\n}\n\n.collapsible-body {\n  display: none;\n  border-bottom: 1px solid #ddd;\n  box-sizing: border-box;\n}\n\n.collapsible-body p {\n  margin: 0;\n  padding: 2rem;\n}\n\n.side-nav .collapsible,\n.side-nav.fixed .collapsible {\n  border: none;\n  box-shadow: none;\n}\n\n.side-nav .collapsible li,\n.side-nav.fixed .collapsible li {\n  padding: 0;\n}\n\n.side-nav .collapsible-header,\n.side-nav.fixed .collapsible-header {\n  background-color: transparent;\n  border: none;\n  line-height: inherit;\n  height: inherit;\n  padding: 0 16px;\n}\n\n.side-nav .collapsible-header:hover,\n.side-nav.fixed .collapsible-header:hover {\n  background-color: rgba(0, 0, 0, 0.05);\n}\n\n.side-nav .collapsible-header i,\n.side-nav.fixed .collapsible-header i {\n  line-height: inherit;\n}\n\n.side-nav .collapsible-body,\n.side-nav.fixed .collapsible-body {\n  border: 0;\n  background-color: #fff;\n}\n\n.side-nav .collapsible-body li a,\n.side-nav.fixed .collapsible-body li a {\n  padding: 0 23.5px 0 31px;\n}\n\n.collapsible.popout {\n  border: none;\n  box-shadow: none;\n}\n\n.collapsible.popout > li {\n  box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);\n  margin: 0 24px;\n  transition: margin 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);\n}\n\n.collapsible.popout > li.active {\n  box-shadow: 0 5px 11px 0 rgba(0, 0, 0, 0.18), 0 4px 15px 0 rgba(0, 0, 0, 0.15);\n  margin: 16px 0;\n}\n\n.chip {\n  display: inline-block;\n  height: 32px;\n  font-size: 13px;\n  font-weight: 500;\n  color: rgba(0, 0, 0, 0.6);\n  line-height: 32px;\n  padding: 0 12px;\n  border-radius: 16px;\n  background-color: #e4e4e4;\n  margin-bottom: 5px;\n  margin-right: 5px;\n}\n\n.chip img {\n  float: left;\n  margin: 0 8px 0 -12px;\n  height: 32px;\n  width: 32px;\n  border-radius: 50%;\n}\n\n.chip .close {\n  cursor: pointer;\n  float: right;\n  font-size: 16px;\n  line-height: 32px;\n  padding-left: 8px;\n}\n\n.chips {\n  border: none;\n  border-bottom: 1px solid #9e9e9e;\n  box-shadow: none;\n  margin: 0 0 20px 0;\n  min-height: 45px;\n  outline: none;\n  transition: all .3s;\n}\n\n.chips.focus {\n  border-bottom: 1px solid #26a69a;\n  box-shadow: 0 1px 0 0 #26a69a;\n}\n\n.chips:hover {\n  cursor: text;\n}\n\n.chips .chip.selected {\n  background-color: #26a69a;\n  color: #fff;\n}\n\n.chips .input {\n  background: none;\n  border: 0;\n  color: rgba(0, 0, 0, 0.6);\n  display: inline-block;\n  font-size: 1rem;\n  height: 3rem;\n  line-height: 32px;\n  outline: 0;\n  margin: 0;\n  padding: 0 !important;\n  width: 120px !important;\n}\n\n.chips .input:focus {\n  border: 0 !important;\n  box-shadow: none !important;\n}\n\n.prefix ~ .chips {\n  margin-left: 3rem;\n  width: 92%;\n  width: calc(100% - 3rem);\n}\n\n.chips:empty ~ label {\n  font-size: 0.8rem;\n  -webkit-transform: translateY(-140%);\n          transform: translateY(-140%);\n}\n\n.materialboxed {\n  display: block;\n  cursor: -webkit-zoom-in;\n  cursor: zoom-in;\n  position: relative;\n  transition: opacity .4s;\n}\n\n.materialboxed:hover {\n  will-change: left, top, width, height;\n}\n\n.materialboxed:hover:not(.active) {\n  opacity: .8;\n}\n\n.materialboxed.active {\n  cursor: -webkit-zoom-out;\n  cursor: zoom-out;\n}\n\n#materialbox-overlay {\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  background-color: #292929;\n  z-index: 1000;\n  will-change: opacity;\n}\n\n.materialbox-caption {\n  position: fixed;\n  display: none;\n  color: #fff;\n  line-height: 50px;\n  bottom: 0;\n  width: 100%;\n  text-align: center;\n  padding: 0% 15%;\n  height: 50px;\n  z-index: 1000;\n  -webkit-font-smoothing: antialiased;\n}\n\nselect:focus {\n  outline: 1px solid #c9f3ef;\n}\n\nbutton:focus {\n  outline: none;\n  background-color: #2ab7a9;\n}\n\nlabel {\n  font-size: 0.8rem;\n  color: #9e9e9e;\n}\n\n/* Text Inputs + Textarea\n   ========================================================================== */\n/* Style Placeholders */\n::-webkit-input-placeholder {\n  color: #d1d1d1;\n}\n\n:-moz-placeholder {\n  /* Firefox 18- */\n  color: #d1d1d1;\n}\n\n::-moz-placeholder {\n  /* Firefox 19+ */\n  color: #d1d1d1;\n}\n\n:-ms-input-placeholder {\n  color: #d1d1d1;\n}\n\n/* Text inputs */\ninput:not([type]),\ninput[type=text],\ninput[type=password],\ninput[type=email],\ninput[type=url],\ninput[type=time],\ninput[type=date],\ninput[type=datetime],\ninput[type=datetime-local],\ninput[type=tel],\ninput[type=number],\ninput[type=search],\ntextarea.materialize-textarea {\n  background-color: transparent;\n  border: none;\n  border-bottom: 1px solid #9e9e9e;\n  border-radius: 0;\n  outline: none;\n  height: 3rem;\n  width: 100%;\n  font-size: 1rem;\n  margin: 0 0 20px 0;\n  padding: 0;\n  box-shadow: none;\n  box-sizing: content-box;\n  transition: all 0.3s;\n}\n\ninput:not([type]):disabled, input:not([type])[readonly=\"readonly\"],\ninput[type=text]:disabled,\ninput[type=text][readonly=\"readonly\"],\ninput[type=password]:disabled,\ninput[type=password][readonly=\"readonly\"],\ninput[type=email]:disabled,\ninput[type=email][readonly=\"readonly\"],\ninput[type=url]:disabled,\ninput[type=url][readonly=\"readonly\"],\ninput[type=time]:disabled,\ninput[type=time][readonly=\"readonly\"],\ninput[type=date]:disabled,\ninput[type=date][readonly=\"readonly\"],\ninput[type=datetime]:disabled,\ninput[type=datetime][readonly=\"readonly\"],\ninput[type=datetime-local]:disabled,\ninput[type=datetime-local][readonly=\"readonly\"],\ninput[type=tel]:disabled,\ninput[type=tel][readonly=\"readonly\"],\ninput[type=number]:disabled,\ninput[type=number][readonly=\"readonly\"],\ninput[type=search]:disabled,\ninput[type=search][readonly=\"readonly\"],\ntextarea.materialize-textarea:disabled,\ntextarea.materialize-textarea[readonly=\"readonly\"] {\n  color: rgba(0, 0, 0, 0.26);\n  border-bottom: 1px dotted rgba(0, 0, 0, 0.26);\n}\n\ninput:not([type]):disabled + label,\ninput:not([type])[readonly=\"readonly\"] + label,\ninput[type=text]:disabled + label,\ninput[type=text][readonly=\"readonly\"] + label,\ninput[type=password]:disabled + label,\ninput[type=password][readonly=\"readonly\"] + label,\ninput[type=email]:disabled + label,\ninput[type=email][readonly=\"readonly\"] + label,\ninput[type=url]:disabled + label,\ninput[type=url][readonly=\"readonly\"] + label,\ninput[type=time]:disabled + label,\ninput[type=time][readonly=\"readonly\"] + label,\ninput[type=date]:disabled + label,\ninput[type=date][readonly=\"readonly\"] + label,\ninput[type=datetime]:disabled + label,\ninput[type=datetime][readonly=\"readonly\"] + label,\ninput[type=datetime-local]:disabled + label,\ninput[type=datetime-local][readonly=\"readonly\"] + label,\ninput[type=tel]:disabled + label,\ninput[type=tel][readonly=\"readonly\"] + label,\ninput[type=number]:disabled + label,\ninput[type=number][readonly=\"readonly\"] + label,\ninput[type=search]:disabled + label,\ninput[type=search][readonly=\"readonly\"] + label,\ntextarea.materialize-textarea:disabled + label,\ntextarea.materialize-textarea[readonly=\"readonly\"] + label {\n  color: rgba(0, 0, 0, 0.26);\n}\n\ninput:not([type]):focus:not([readonly]),\ninput[type=text]:focus:not([readonly]),\ninput[type=password]:focus:not([readonly]),\ninput[type=email]:focus:not([readonly]),\ninput[type=url]:focus:not([readonly]),\ninput[type=time]:focus:not([readonly]),\ninput[type=date]:focus:not([readonly]),\ninput[type=datetime]:focus:not([readonly]),\ninput[type=datetime-local]:focus:not([readonly]),\ninput[type=tel]:focus:not([readonly]),\ninput[type=number]:focus:not([readonly]),\ninput[type=search]:focus:not([readonly]),\ntextarea.materialize-textarea:focus:not([readonly]) {\n  border-bottom: 1px solid #26a69a;\n  box-shadow: 0 1px 0 0 #26a69a;\n}\n\ninput:not([type]):focus:not([readonly]) + label,\ninput[type=text]:focus:not([readonly]) + label,\ninput[type=password]:focus:not([readonly]) + label,\ninput[type=email]:focus:not([readonly]) + label,\ninput[type=url]:focus:not([readonly]) + label,\ninput[type=time]:focus:not([readonly]) + label,\ninput[type=date]:focus:not([readonly]) + label,\ninput[type=datetime]:focus:not([readonly]) + label,\ninput[type=datetime-local]:focus:not([readonly]) + label,\ninput[type=tel]:focus:not([readonly]) + label,\ninput[type=number]:focus:not([readonly]) + label,\ninput[type=search]:focus:not([readonly]) + label,\ntextarea.materialize-textarea:focus:not([readonly]) + label {\n  color: #26a69a;\n}\n\ninput:not([type]).valid, input:not([type]):focus.valid,\ninput[type=text].valid,\ninput[type=text]:focus.valid,\ninput[type=password].valid,\ninput[type=password]:focus.valid,\ninput[type=email].valid,\ninput[type=email]:focus.valid,\ninput[type=url].valid,\ninput[type=url]:focus.valid,\ninput[type=time].valid,\ninput[type=time]:focus.valid,\ninput[type=date].valid,\ninput[type=date]:focus.valid,\ninput[type=datetime].valid,\ninput[type=datetime]:focus.valid,\ninput[type=datetime-local].valid,\ninput[type=datetime-local]:focus.valid,\ninput[type=tel].valid,\ninput[type=tel]:focus.valid,\ninput[type=number].valid,\ninput[type=number]:focus.valid,\ninput[type=search].valid,\ninput[type=search]:focus.valid,\ntextarea.materialize-textarea.valid,\ntextarea.materialize-textarea:focus.valid {\n  border-bottom: 1px solid #4CAF50;\n  box-shadow: 0 1px 0 0 #4CAF50;\n}\n\ninput:not([type]).valid + label:after,\ninput:not([type]):focus.valid + label:after,\ninput[type=text].valid + label:after,\ninput[type=text]:focus.valid + label:after,\ninput[type=password].valid + label:after,\ninput[type=password]:focus.valid + label:after,\ninput[type=email].valid + label:after,\ninput[type=email]:focus.valid + label:after,\ninput[type=url].valid + label:after,\ninput[type=url]:focus.valid + label:after,\ninput[type=time].valid + label:after,\ninput[type=time]:focus.valid + label:after,\ninput[type=date].valid + label:after,\ninput[type=date]:focus.valid + label:after,\ninput[type=datetime].valid + label:after,\ninput[type=datetime]:focus.valid + label:after,\ninput[type=datetime-local].valid + label:after,\ninput[type=datetime-local]:focus.valid + label:after,\ninput[type=tel].valid + label:after,\ninput[type=tel]:focus.valid + label:after,\ninput[type=number].valid + label:after,\ninput[type=number]:focus.valid + label:after,\ninput[type=search].valid + label:after,\ninput[type=search]:focus.valid + label:after,\ntextarea.materialize-textarea.valid + label:after,\ntextarea.materialize-textarea:focus.valid + label:after {\n  content: attr(data-success);\n  color: #4CAF50;\n  opacity: 1;\n}\n\ninput:not([type]).invalid, input:not([type]):focus.invalid,\ninput[type=text].invalid,\ninput[type=text]:focus.invalid,\ninput[type=password].invalid,\ninput[type=password]:focus.invalid,\ninput[type=email].invalid,\ninput[type=email]:focus.invalid,\ninput[type=url].invalid,\ninput[type=url]:focus.invalid,\ninput[type=time].invalid,\ninput[type=time]:focus.invalid,\ninput[type=date].invalid,\ninput[type=date]:focus.invalid,\ninput[type=datetime].invalid,\ninput[type=datetime]:focus.invalid,\ninput[type=datetime-local].invalid,\ninput[type=datetime-local]:focus.invalid,\ninput[type=tel].invalid,\ninput[type=tel]:focus.invalid,\ninput[type=number].invalid,\ninput[type=number]:focus.invalid,\ninput[type=search].invalid,\ninput[type=search]:focus.invalid,\ntextarea.materialize-textarea.invalid,\ntextarea.materialize-textarea:focus.invalid {\n  border-bottom: 1px solid #F44336;\n  box-shadow: 0 1px 0 0 #F44336;\n}\n\ninput:not([type]).invalid + label:after,\ninput:not([type]):focus.invalid + label:after,\ninput[type=text].invalid + label:after,\ninput[type=text]:focus.invalid + label:after,\ninput[type=password].invalid + label:after,\ninput[type=password]:focus.invalid + label:after,\ninput[type=email].invalid + label:after,\ninput[type=email]:focus.invalid + label:after,\ninput[type=url].invalid + label:after,\ninput[type=url]:focus.invalid + label:after,\ninput[type=time].invalid + label:after,\ninput[type=time]:focus.invalid + label:after,\ninput[type=date].invalid + label:after,\ninput[type=date]:focus.invalid + label:after,\ninput[type=datetime].invalid + label:after,\ninput[type=datetime]:focus.invalid + label:after,\ninput[type=datetime-local].invalid + label:after,\ninput[type=datetime-local]:focus.invalid + label:after,\ninput[type=tel].invalid + label:after,\ninput[type=tel]:focus.invalid + label:after,\ninput[type=number].invalid + label:after,\ninput[type=number]:focus.invalid + label:after,\ninput[type=search].invalid + label:after,\ninput[type=search]:focus.invalid + label:after,\ntextarea.materialize-textarea.invalid + label:after,\ntextarea.materialize-textarea:focus.invalid + label:after {\n  content: attr(data-error);\n  color: #F44336;\n  opacity: 1;\n}\n\ninput:not([type]).validate + label,\ninput[type=text].validate + label,\ninput[type=password].validate + label,\ninput[type=email].validate + label,\ninput[type=url].validate + label,\ninput[type=time].validate + label,\ninput[type=date].validate + label,\ninput[type=datetime].validate + label,\ninput[type=datetime-local].validate + label,\ninput[type=tel].validate + label,\ninput[type=number].validate + label,\ninput[type=search].validate + label,\ntextarea.materialize-textarea.validate + label {\n  width: 100%;\n  pointer-events: none;\n}\n\ninput:not([type]) + label:after,\ninput[type=text] + label:after,\ninput[type=password] + label:after,\ninput[type=email] + label:after,\ninput[type=url] + label:after,\ninput[type=time] + label:after,\ninput[type=date] + label:after,\ninput[type=datetime] + label:after,\ninput[type=datetime-local] + label:after,\ninput[type=tel] + label:after,\ninput[type=number] + label:after,\ninput[type=search] + label:after,\ntextarea.materialize-textarea + label:after {\n  display: block;\n  content: \"\";\n  position: absolute;\n  top: 60px;\n  opacity: 0;\n  transition: .2s opacity ease-out, .2s color ease-out;\n}\n\n.input-field {\n  position: relative;\n  margin-top: 1rem;\n}\n\n.input-field.inline {\n  display: inline-block;\n  vertical-align: middle;\n  margin-left: 5px;\n}\n\n.input-field.inline input,\n.input-field.inline .select-dropdown {\n  margin-bottom: 1rem;\n}\n\n.input-field.col label {\n  left: 0.75rem;\n}\n\n.input-field.col .prefix ~ label,\n.input-field.col .prefix ~ .validate ~ label {\n  width: calc(100% - 3rem - 1.5rem);\n}\n\n.input-field label {\n  color: #9e9e9e;\n  position: absolute;\n  top: 0.8rem;\n  left: 0;\n  font-size: 1rem;\n  cursor: text;\n  transition: .2s ease-out;\n}\n\n.input-field label.active {\n  font-size: 0.8rem;\n  -webkit-transform: translateY(-140%);\n          transform: translateY(-140%);\n}\n\n.input-field .prefix {\n  position: absolute;\n  width: 3rem;\n  font-size: 2rem;\n  transition: color .2s;\n}\n\n.input-field .prefix.active {\n  color: #26a69a;\n}\n\n.input-field .prefix ~ input,\n.input-field .prefix ~ textarea,\n.input-field .prefix ~ label,\n.input-field .prefix ~ .validate ~ label,\n.input-field .prefix ~ .autocomplete-content {\n  margin-left: 3rem;\n  width: 92%;\n  width: calc(100% - 3rem);\n}\n\n.input-field .prefix ~ label {\n  margin-left: 3rem;\n}\n\n@media only screen and (max-width: 992px) {\n  .input-field .prefix ~ input {\n    width: 86%;\n    width: calc(100% - 3rem);\n  }\n}\n\n@media only screen and (max-width: 600px) {\n  .input-field .prefix ~ input {\n    width: 80%;\n    width: calc(100% - 3rem);\n  }\n}\n\n/* Search Field */\n.input-field input[type=search] {\n  display: block;\n  line-height: inherit;\n  padding-left: 4rem;\n  width: calc(100% - 4rem);\n}\n\n.input-field input[type=search]:focus {\n  background-color: #fff;\n  border: 0;\n  box-shadow: none;\n  color: #444;\n}\n\n.input-field input[type=search]:focus + label i,\n.input-field input[type=search]:focus ~ .mdi-navigation-close,\n.input-field input[type=search]:focus ~ .material-icons {\n  color: #444;\n}\n\n.input-field input[type=search] + label {\n  left: 1rem;\n}\n\n.input-field input[type=search] ~ .mdi-navigation-close,\n.input-field input[type=search] ~ .material-icons {\n  position: absolute;\n  top: 0;\n  right: 1rem;\n  color: transparent;\n  cursor: pointer;\n  font-size: 2rem;\n  transition: .3s color;\n}\n\n/* Textarea */\ntextarea {\n  width: 100%;\n  height: 3rem;\n  background-color: transparent;\n}\n\ntextarea.materialize-textarea {\n  overflow-y: hidden;\n  /* prevents scroll bar flash */\n  padding: .8rem 0 1.6rem 0;\n  /* prevents text jump on Enter keypress */\n  resize: none;\n  min-height: 3rem;\n}\n\n.hiddendiv {\n  display: none;\n  white-space: pre-wrap;\n  word-wrap: break-word;\n  overflow-wrap: break-word;\n  /* future version of deprecated 'word-wrap' */\n  padding-top: 1.2rem;\n  /* prevents text jump on Enter keypress */\n}\n\n/* Autocomplete */\n.autocomplete-content {\n  margin-top: -15px;\n  display: block;\n  opacity: 1;\n  position: static;\n}\n\n.autocomplete-content li .highlight {\n  color: #444;\n}\n\n.autocomplete-content li img {\n  height: 40px;\n  width: 40px;\n  margin: 5px 15px;\n}\n\n/* Radio Buttons\n   ========================================================================== */\n[type=\"radio\"]:not(:checked),\n[type=\"radio\"]:checked {\n  position: absolute;\n  left: -9999px;\n  opacity: 0;\n}\n\n[type=\"radio\"]:not(:checked) + label,\n[type=\"radio\"]:checked + label {\n  position: relative;\n  padding-left: 35px;\n  cursor: pointer;\n  display: inline-block;\n  height: 25px;\n  line-height: 25px;\n  font-size: 1rem;\n  transition: .28s ease;\n  /* webkit (konqueror) browsers */\n  -webkit-user-select: none;\n     -moz-user-select: none;\n      -ms-user-select: none;\n          user-select: none;\n}\n\n[type=\"radio\"] + label:before,\n[type=\"radio\"] + label:after {\n  content: '';\n  position: absolute;\n  left: 0;\n  top: 0;\n  margin: 4px;\n  width: 16px;\n  height: 16px;\n  z-index: 0;\n  transition: .28s ease;\n}\n\n/* Unchecked styles */\n[type=\"radio\"]:not(:checked) + label:before,\n[type=\"radio\"]:not(:checked) + label:after,\n[type=\"radio\"]:checked + label:before,\n[type=\"radio\"]:checked + label:after,\n[type=\"radio\"].with-gap:checked + label:before,\n[type=\"radio\"].with-gap:checked + label:after {\n  border-radius: 50%;\n}\n\n[type=\"radio\"]:not(:checked) + label:before,\n[type=\"radio\"]:not(:checked) + label:after {\n  border: 2px solid #5a5a5a;\n}\n\n[type=\"radio\"]:not(:checked) + label:after {\n  -webkit-transform: scale(0);\n          transform: scale(0);\n}\n\n/* Checked styles */\n[type=\"radio\"]:checked + label:before {\n  border: 2px solid transparent;\n}\n\n[type=\"radio\"]:checked + label:after,\n[type=\"radio\"].with-gap:checked + label:before,\n[type=\"radio\"].with-gap:checked + label:after {\n  border: 2px solid #26a69a;\n}\n\n[type=\"radio\"]:checked + label:after,\n[type=\"radio\"].with-gap:checked + label:after {\n  background-color: #26a69a;\n}\n\n[type=\"radio\"]:checked + label:after {\n  -webkit-transform: scale(1.02);\n          transform: scale(1.02);\n}\n\n/* Radio With gap */\n[type=\"radio\"].with-gap:checked + label:after {\n  -webkit-transform: scale(0.5);\n          transform: scale(0.5);\n}\n\n/* Focused styles */\n[type=\"radio\"].tabbed:focus + label:before {\n  box-shadow: 0 0 0 10px rgba(0, 0, 0, 0.1);\n}\n\n/* Disabled Radio With gap */\n[type=\"radio\"].with-gap:disabled:checked + label:before {\n  border: 2px solid rgba(0, 0, 0, 0.26);\n}\n\n[type=\"radio\"].with-gap:disabled:checked + label:after {\n  border: none;\n  background-color: rgba(0, 0, 0, 0.26);\n}\n\n/* Disabled style */\n[type=\"radio\"]:disabled:not(:checked) + label:before,\n[type=\"radio\"]:disabled:checked + label:before {\n  background-color: transparent;\n  border-color: rgba(0, 0, 0, 0.26);\n}\n\n[type=\"radio\"]:disabled + label {\n  color: rgba(0, 0, 0, 0.26);\n}\n\n[type=\"radio\"]:disabled:not(:checked) + label:before {\n  border-color: rgba(0, 0, 0, 0.26);\n}\n\n[type=\"radio\"]:disabled:checked + label:after {\n  background-color: rgba(0, 0, 0, 0.26);\n  border-color: #BDBDBD;\n}\n\n/* Checkboxes\n   ========================================================================== */\n/* CUSTOM CSS CHECKBOXES */\nform p {\n  margin-bottom: 10px;\n  text-align: left;\n}\n\nform p:last-child {\n  margin-bottom: 0;\n}\n\n/* Remove default checkbox */\n[type=\"checkbox\"]:not(:checked),\n[type=\"checkbox\"]:checked {\n  position: absolute;\n  left: -9999px;\n  opacity: 0;\n}\n\n[type=\"checkbox\"] {\n  /* checkbox aspect */\n}\n\n[type=\"checkbox\"] + label {\n  position: relative;\n  padding-left: 35px;\n  cursor: pointer;\n  display: inline-block;\n  height: 25px;\n  line-height: 25px;\n  font-size: 1rem;\n  -webkit-user-select: none;\n  /* webkit (safari, chrome) browsers */\n  -moz-user-select: none;\n  /* mozilla browsers */\n  -khtml-user-select: none;\n  /* webkit (konqueror) browsers */\n  -ms-user-select: none;\n  /* IE10+ */\n}\n\n[type=\"checkbox\"] + label:before,\n[type=\"checkbox\"]:not(.filled-in) + label:after {\n  content: '';\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 18px;\n  height: 18px;\n  z-index: 0;\n  border: 2px solid #5a5a5a;\n  border-radius: 1px;\n  margin-top: 2px;\n  transition: .2s;\n}\n\n[type=\"checkbox\"]:not(.filled-in) + label:after {\n  border: 0;\n  -webkit-transform: scale(0);\n          transform: scale(0);\n}\n\n[type=\"checkbox\"]:not(:checked):disabled + label:before {\n  border: none;\n  background-color: rgba(0, 0, 0, 0.26);\n}\n\n[type=\"checkbox\"].tabbed:focus + label:after {\n  -webkit-transform: scale(1);\n          transform: scale(1);\n  border: 0;\n  border-radius: 50%;\n  box-shadow: 0 0 0 10px rgba(0, 0, 0, 0.1);\n  background-color: rgba(0, 0, 0, 0.1);\n}\n\n[type=\"checkbox\"]:checked + label:before {\n  top: -4px;\n  left: -5px;\n  width: 12px;\n  height: 22px;\n  border-top: 2px solid transparent;\n  border-left: 2px solid transparent;\n  border-right: 2px solid #26a69a;\n  border-bottom: 2px solid #26a69a;\n  -webkit-transform: rotate(40deg);\n          transform: rotate(40deg);\n  -webkit-backface-visibility: hidden;\n          backface-visibility: hidden;\n  -webkit-transform-origin: 100% 100%;\n          transform-origin: 100% 100%;\n}\n\n[type=\"checkbox\"]:checked:disabled + label:before {\n  border-right: 2px solid rgba(0, 0, 0, 0.26);\n  border-bottom: 2px solid rgba(0, 0, 0, 0.26);\n}\n\n/* Indeterminate checkbox */\n[type=\"checkbox\"]:indeterminate + label:before {\n  top: -11px;\n  left: -12px;\n  width: 10px;\n  height: 22px;\n  border-top: none;\n  border-left: none;\n  border-right: 2px solid #26a69a;\n  border-bottom: none;\n  -webkit-transform: rotate(90deg);\n          transform: rotate(90deg);\n  -webkit-backface-visibility: hidden;\n          backface-visibility: hidden;\n  -webkit-transform-origin: 100% 100%;\n          transform-origin: 100% 100%;\n}\n\n[type=\"checkbox\"]:indeterminate:disabled + label:before {\n  border-right: 2px solid rgba(0, 0, 0, 0.26);\n  background-color: transparent;\n}\n\n[type=\"checkbox\"].filled-in + label:after {\n  border-radius: 2px;\n}\n\n[type=\"checkbox\"].filled-in + label:before,\n[type=\"checkbox\"].filled-in + label:after {\n  content: '';\n  left: 0;\n  position: absolute;\n  /* .1s delay is for check animation */\n  transition: border .25s, background-color .25s, width .20s .1s, height .20s .1s, top .20s .1s, left .20s .1s;\n  z-index: 1;\n}\n\n[type=\"checkbox\"].filled-in:not(:checked) + label:before {\n  width: 0;\n  height: 0;\n  border: 3px solid transparent;\n  left: 6px;\n  top: 10px;\n  -webkit-transform: rotateZ(37deg);\n  transform: rotateZ(37deg);\n  -webkit-transform-origin: 20% 40%;\n  transform-origin: 100% 100%;\n}\n\n[type=\"checkbox\"].filled-in:not(:checked) + label:after {\n  height: 20px;\n  width: 20px;\n  background-color: transparent;\n  border: 2px solid #5a5a5a;\n  top: 0px;\n  z-index: 0;\n}\n\n[type=\"checkbox\"].filled-in:checked + label:before {\n  top: 0;\n  left: 1px;\n  width: 8px;\n  height: 13px;\n  border-top: 2px solid transparent;\n  border-left: 2px solid transparent;\n  border-right: 2px solid #fff;\n  border-bottom: 2px solid #fff;\n  -webkit-transform: rotateZ(37deg);\n  transform: rotateZ(37deg);\n  -webkit-transform-origin: 100% 100%;\n  transform-origin: 100% 100%;\n}\n\n[type=\"checkbox\"].filled-in:checked + label:after {\n  top: 0;\n  width: 20px;\n  height: 20px;\n  border: 2px solid #26a69a;\n  background-color: #26a69a;\n  z-index: 0;\n}\n\n[type=\"checkbox\"].filled-in.tabbed:focus + label:after {\n  border-radius: 2px;\n  border-color: #5a5a5a;\n  background-color: rgba(0, 0, 0, 0.1);\n}\n\n[type=\"checkbox\"].filled-in.tabbed:checked:focus + label:after {\n  border-radius: 2px;\n  background-color: #26a69a;\n  border-color: #26a69a;\n}\n\n[type=\"checkbox\"].filled-in:disabled:not(:checked) + label:before {\n  background-color: transparent;\n  border: 2px solid transparent;\n}\n\n[type=\"checkbox\"].filled-in:disabled:not(:checked) + label:after {\n  border-color: transparent;\n  background-color: #BDBDBD;\n}\n\n[type=\"checkbox\"].filled-in:disabled:checked + label:before {\n  background-color: transparent;\n}\n\n[type=\"checkbox\"].filled-in:disabled:checked + label:after {\n  background-color: #BDBDBD;\n  border-color: #BDBDBD;\n}\n\n/* Switch\n   ========================================================================== */\n.switch,\n.switch * {\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  -khtml-user-select: none;\n  -ms-user-select: none;\n}\n\n.switch label {\n  cursor: pointer;\n}\n\n.switch label input[type=checkbox] {\n  opacity: 0;\n  width: 0;\n  height: 0;\n}\n\n.switch label input[type=checkbox]:checked + .lever {\n  background-color: #84c7c1;\n}\n\n.switch label input[type=checkbox]:checked + .lever:after {\n  background-color: #26a69a;\n  left: 24px;\n}\n\n.switch label .lever {\n  content: \"\";\n  display: inline-block;\n  position: relative;\n  width: 40px;\n  height: 15px;\n  background-color: #818181;\n  border-radius: 15px;\n  margin-right: 10px;\n  transition: background 0.3s ease;\n  vertical-align: middle;\n  margin: 0 16px;\n}\n\n.switch label .lever:after {\n  content: \"\";\n  position: absolute;\n  display: inline-block;\n  width: 21px;\n  height: 21px;\n  background-color: #F1F1F1;\n  border-radius: 21px;\n  box-shadow: 0 1px 3px 1px rgba(0, 0, 0, 0.4);\n  left: -5px;\n  top: -3px;\n  transition: left 0.3s ease, background .3s ease, box-shadow 0.1s ease;\n}\n\ninput[type=checkbox]:checked:not(:disabled) ~ .lever:active::after,\ninput[type=checkbox]:checked:not(:disabled).tabbed:focus ~ .lever::after {\n  box-shadow: 0 1px 3px 1px rgba(0, 0, 0, 0.4), 0 0 0 15px rgba(38, 166, 154, 0.1);\n}\n\ninput[type=checkbox]:not(:disabled) ~ .lever:active:after,\ninput[type=checkbox]:not(:disabled).tabbed:focus ~ .lever::after {\n  box-shadow: 0 1px 3px 1px rgba(0, 0, 0, 0.4), 0 0 0 15px rgba(0, 0, 0, 0.08);\n}\n\n.switch input[type=checkbox][disabled] + .lever {\n  cursor: default;\n}\n\n.switch label input[type=checkbox][disabled] + .lever:after,\n.switch label input[type=checkbox][disabled]:checked + .lever:after {\n  background-color: #BDBDBD;\n}\n\n/* Select Field\n   ========================================================================== */\nselect {\n  display: none;\n}\n\nselect.browser-default {\n  display: block;\n}\n\nselect {\n  background-color: rgba(255, 255, 255, 0.9);\n  width: 100%;\n  padding: 5px;\n  border: 1px solid #f2f2f2;\n  border-radius: 2px;\n  height: 3rem;\n}\n\n.select-label {\n  position: absolute;\n}\n\n.select-wrapper {\n  position: relative;\n}\n\n.select-wrapper input.select-dropdown {\n  position: relative;\n  cursor: pointer;\n  background-color: transparent;\n  border: none;\n  border-bottom: 1px solid #9e9e9e;\n  outline: none;\n  height: 3rem;\n  line-height: 3rem;\n  width: 100%;\n  font-size: 1rem;\n  margin: 0 0 20px 0;\n  padding: 0;\n  display: block;\n}\n\n.select-wrapper span.caret {\n  color: initial;\n  position: absolute;\n  right: 0;\n  top: 0;\n  bottom: 0;\n  height: 10px;\n  margin: auto 0;\n  font-size: 10px;\n  line-height: 10px;\n}\n\n.select-wrapper span.caret.disabled {\n  color: rgba(0, 0, 0, 0.26);\n}\n\n.select-wrapper + label {\n  position: absolute;\n  top: -14px;\n  font-size: 0.8rem;\n}\n\nselect:disabled {\n  color: rgba(0, 0, 0, 0.3);\n}\n\n.select-wrapper input.select-dropdown:disabled {\n  color: rgba(0, 0, 0, 0.3);\n  cursor: default;\n  -webkit-user-select: none;\n  /* webkit (safari, chrome) browsers */\n  -moz-user-select: none;\n  /* mozilla browsers */\n  -ms-user-select: none;\n  /* IE10+ */\n  border-bottom: 1px solid rgba(0, 0, 0, 0.3);\n}\n\n.select-wrapper i {\n  color: rgba(0, 0, 0, 0.3);\n}\n\n.select-dropdown li.disabled,\n.select-dropdown li.disabled > span,\n.select-dropdown li.optgroup {\n  color: rgba(0, 0, 0, 0.3);\n  background-color: transparent;\n}\n\n.prefix ~ .select-wrapper {\n  margin-left: 3rem;\n  width: 92%;\n  width: calc(100% - 3rem);\n}\n\n.prefix ~ label {\n  margin-left: 3rem;\n}\n\n.select-dropdown li img {\n  height: 40px;\n  width: 40px;\n  margin: 5px 15px;\n  float: right;\n}\n\n.select-dropdown li.optgroup {\n  border-top: 1px solid #eee;\n}\n\n.select-dropdown li.optgroup.selected > span {\n  color: rgba(0, 0, 0, 0.7);\n}\n\n.select-dropdown li.optgroup > span {\n  color: rgba(0, 0, 0, 0.4);\n}\n\n.select-dropdown li.optgroup ~ li.optgroup-option {\n  padding-left: 1rem;\n}\n\n/* File Input\n   ========================================================================== */\n.file-field {\n  position: relative;\n}\n\n.file-field .file-path-wrapper {\n  overflow: hidden;\n  padding-left: 10px;\n}\n\n.file-field input.file-path {\n  width: 100%;\n}\n\n.file-field .btn, .file-field .btn-large {\n  float: left;\n  height: 3rem;\n  line-height: 3rem;\n}\n\n.file-field span {\n  cursor: pointer;\n}\n\n.file-field input[type=file] {\n  position: absolute;\n  top: 0;\n  right: 0;\n  left: 0;\n  bottom: 0;\n  width: 100%;\n  margin: 0;\n  padding: 0;\n  font-size: 20px;\n  cursor: pointer;\n  opacity: 0;\n  filter: alpha(opacity=0);\n}\n\n/* Range\n   ========================================================================== */\n.range-field {\n  position: relative;\n}\n\ninput[type=range],\ninput[type=range] + .thumb {\n  cursor: pointer;\n}\n\ninput[type=range] {\n  position: relative;\n  background-color: transparent;\n  border: none;\n  outline: none;\n  width: 100%;\n  margin: 15px 0;\n  padding: 0;\n}\n\ninput[type=range]:focus {\n  outline: none;\n}\n\ninput[type=range] + .thumb {\n  position: absolute;\n  border: none;\n  height: 0;\n  width: 0;\n  border-radius: 50%;\n  background-color: #26a69a;\n  top: 10px;\n  margin-left: -6px;\n  -webkit-transform-origin: 50% 50%;\n          transform-origin: 50% 50%;\n  -webkit-transform: rotate(-45deg);\n          transform: rotate(-45deg);\n}\n\ninput[type=range] + .thumb .value {\n  display: block;\n  width: 30px;\n  text-align: center;\n  color: #26a69a;\n  font-size: 0;\n  -webkit-transform: rotate(45deg);\n          transform: rotate(45deg);\n}\n\ninput[type=range] + .thumb.active {\n  border-radius: 50% 50% 50% 0;\n}\n\ninput[type=range] + .thumb.active .value {\n  color: #fff;\n  margin-left: -1px;\n  margin-top: 8px;\n  font-size: 10px;\n}\n\ninput[type=range] {\n  -webkit-appearance: none;\n}\n\ninput[type=range]::-webkit-slider-runnable-track {\n  height: 3px;\n  background: #c2c0c2;\n  border: none;\n}\n\ninput[type=range]::-webkit-slider-thumb {\n  -webkit-appearance: none;\n  border: none;\n  height: 14px;\n  width: 14px;\n  border-radius: 50%;\n  background-color: #26a69a;\n  -webkit-transform-origin: 50% 50%;\n          transform-origin: 50% 50%;\n  margin: -5px 0 0 0;\n  transition: .3s;\n}\n\ninput[type=range]:focus::-webkit-slider-runnable-track {\n  background: #ccc;\n}\n\ninput[type=range] {\n  /* fix for FF unable to apply focus style bug  */\n  border: 1px solid white;\n  /*required for proper track sizing in FF*/\n}\n\ninput[type=range]::-moz-range-track {\n  height: 3px;\n  background: #ddd;\n  border: none;\n}\n\ninput[type=range]::-moz-range-thumb {\n  border: none;\n  height: 14px;\n  width: 14px;\n  border-radius: 50%;\n  background: #26a69a;\n  margin-top: -5px;\n}\n\ninput[type=range]:-moz-focusring {\n  outline: 1px solid #fff;\n  outline-offset: -1px;\n}\n\ninput[type=range]:focus::-moz-range-track {\n  background: #ccc;\n}\n\ninput[type=range]::-ms-track {\n  height: 3px;\n  background: transparent;\n  border-color: transparent;\n  border-width: 6px 0;\n  /*remove default tick marks*/\n  color: transparent;\n}\n\ninput[type=range]::-ms-fill-lower {\n  background: #777;\n}\n\ninput[type=range]::-ms-fill-upper {\n  background: #ddd;\n}\n\ninput[type=range]::-ms-thumb {\n  border: none;\n  height: 14px;\n  width: 14px;\n  border-radius: 50%;\n  background: #26a69a;\n}\n\ninput[type=range]:focus::-ms-fill-lower {\n  background: #888;\n}\n\ninput[type=range]:focus::-ms-fill-upper {\n  background: #ccc;\n}\n\n/***************\n    Nav List\n***************/\n.table-of-contents.fixed {\n  position: fixed;\n}\n\n.table-of-contents li {\n  padding: 2px 0;\n}\n\n.table-of-contents a {\n  display: inline-block;\n  font-weight: 300;\n  color: #757575;\n  padding-left: 20px;\n  height: 1.5rem;\n  line-height: 1.5rem;\n  letter-spacing: .4;\n  display: inline-block;\n}\n\n.table-of-contents a:hover {\n  color: #a8a8a8;\n  padding-left: 19px;\n  border-left: 1px solid #ea4a4f;\n}\n\n.table-of-contents a.active {\n  font-weight: 500;\n  padding-left: 18px;\n  border-left: 2px solid #ea4a4f;\n}\n\n.side-nav {\n  position: fixed;\n  width: 300px;\n  left: 0;\n  top: 0;\n  margin: 0;\n  -webkit-transform: translateX(-100%);\n          transform: translateX(-100%);\n  height: 100%;\n  height: calc(100% + 60px);\n  height: -moz-calc(100%);\n  padding-bottom: 60px;\n  background-color: #fff;\n  z-index: 999;\n  overflow-y: auto;\n  will-change: transform;\n  -webkit-backface-visibility: hidden;\n          backface-visibility: hidden;\n  -webkit-transform: translateX(-105%);\n          transform: translateX(-105%);\n}\n\n.side-nav.right-aligned {\n  right: 0;\n  -webkit-transform: translateX(105%);\n          transform: translateX(105%);\n  left: auto;\n  -webkit-transform: translateX(100%);\n          transform: translateX(100%);\n}\n\n.side-nav .collapsible {\n  margin: 0;\n}\n\n.side-nav li {\n  float: none;\n  line-height: 48px;\n}\n\n.side-nav li.active {\n  background-color: rgba(0, 0, 0, 0.05);\n}\n\n.side-nav a {\n  color: rgba(0, 0, 0, 0.87);\n  display: block;\n  font-size: 14px;\n  font-weight: 500;\n  height: 48px;\n  line-height: 48px;\n  padding: 0 32px;\n}\n\n.side-nav a:hover {\n  background-color: rgba(0, 0, 0, 0.05);\n}\n\n.side-nav a.btn, .side-nav a.btn-large, .side-nav a.btn-large, .side-nav a.btn-flat, .side-nav a.btn-floating {\n  margin: 10px 15px;\n}\n\n.side-nav a.btn, .side-nav a.btn-large, .side-nav a.btn-large, .side-nav a.btn-floating {\n  color: #fff;\n}\n\n.side-nav a.btn-flat {\n  color: #343434;\n}\n\n.side-nav a.btn:hover, .side-nav a.btn-large:hover, .side-nav a.btn-large:hover {\n  background-color: #2bbbad;\n}\n\n.side-nav a.btn-floating:hover {\n  background-color: #26a69a;\n}\n\n.side-nav li > a > i,\n.side-nav li > a > [class^=\"mdi-\"], .side-nav li > a > [class*=\"mdi-\"],\n.side-nav li > a > i.material-icons {\n  float: left;\n  height: 48px;\n  line-height: 48px;\n  margin: 0 32px 0 0;\n  width: 24px;\n  color: rgba(0, 0, 0, 0.54);\n}\n\n.side-nav .divider {\n  margin: 8px 0 0 0;\n}\n\n.side-nav .subheader {\n  cursor: initial;\n  pointer-events: none;\n  color: rgba(0, 0, 0, 0.54);\n  font-size: 14px;\n  font-weight: 500;\n  line-height: 48px;\n}\n\n.side-nav .subheader:hover {\n  background-color: transparent;\n}\n\n.side-nav .userView {\n  position: relative;\n  padding: 32px 32px 0;\n  margin-bottom: 8px;\n}\n\n.side-nav .userView > a {\n  height: auto;\n  padding: 0;\n}\n\n.side-nav .userView > a:hover {\n  background-color: transparent;\n}\n\n.side-nav .userView .background {\n  overflow: hidden;\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  z-index: -1;\n}\n\n.side-nav .userView .circle, .side-nav .userView .name, .side-nav .userView .email {\n  display: block;\n}\n\n.side-nav .userView .circle {\n  height: 64px;\n  width: 64px;\n}\n\n.side-nav .userView .name,\n.side-nav .userView .email {\n  font-size: 14px;\n  line-height: 24px;\n}\n\n.side-nav .userView .name {\n  margin-top: 16px;\n  font-weight: 500;\n}\n\n.side-nav .userView .email {\n  padding-bottom: 16px;\n  font-weight: 400;\n}\n\n.drag-target {\n  height: 100%;\n  width: 10px;\n  position: fixed;\n  top: 0;\n  z-index: 998;\n}\n\n.side-nav.fixed {\n  left: 0;\n  -webkit-transform: translateX(0);\n          transform: translateX(0);\n  position: fixed;\n}\n\n.side-nav.fixed.right-aligned {\n  right: 0;\n  left: auto;\n}\n\n@media only screen and (max-width: 992px) {\n  .side-nav.fixed {\n    -webkit-transform: translateX(-105%);\n            transform: translateX(-105%);\n  }\n  .side-nav.fixed.right-aligned {\n    -webkit-transform: translateX(105%);\n            transform: translateX(105%);\n  }\n  .side-nav a {\n    padding: 0 16px;\n  }\n  .side-nav .userView {\n    padding: 16px 16px 0;\n  }\n}\n\n.side-nav .collapsible-body > ul:not(.collapsible) > li.active,\n.side-nav.fixed .collapsible-body > ul:not(.collapsible) > li.active {\n  background-color: #ee6e73;\n}\n\n.side-nav .collapsible-body > ul:not(.collapsible) > li.active a,\n.side-nav.fixed .collapsible-body > ul:not(.collapsible) > li.active a {\n  color: #fff;\n}\n\n#sidenav-overlay {\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  height: 120vh;\n  background-color: rgba(0, 0, 0, 0.5);\n  z-index: 997;\n  will-change: opacity;\n}\n\n/*\n    @license\n    Copyright (c) 2014 The Polymer Project Authors. All rights reserved.\n    This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt\n    The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt\n    The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt\n    Code distributed by Google as part of the polymer project is also\n    subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt\n */\n/**************************/\n/* STYLES FOR THE SPINNER */\n/**************************/\n/*\n * Constants:\n *      STROKEWIDTH = 3px\n *      ARCSIZE     = 270 degrees (amount of circle the arc takes up)\n *      ARCTIME     = 1333ms (time it takes to expand and contract arc)\n *      ARCSTARTROT = 216 degrees (how much the start location of the arc\n *                                should rotate each time, 216 gives us a\n *                                5 pointed star shape (it's 360/5 * 3).\n *                                For a 7 pointed star, we might do\n *                                360/7 * 3 = 154.286)\n *      CONTAINERWIDTH = 28px\n *      SHRINK_TIME = 400ms\n */\n.preloader-wrapper {\n  display: inline-block;\n  position: relative;\n  width: 48px;\n  height: 48px;\n}\n\n.preloader-wrapper.small {\n  width: 36px;\n  height: 36px;\n}\n\n.preloader-wrapper.big {\n  width: 64px;\n  height: 64px;\n}\n\n.preloader-wrapper.active {\n  /* duration: 360 * ARCTIME / (ARCSTARTROT + (360-ARCSIZE)) */\n  -webkit-animation: container-rotate 1568ms linear infinite;\n  animation: container-rotate 1568ms linear infinite;\n}\n\n@-webkit-keyframes container-rotate {\n  to {\n    -webkit-transform: rotate(360deg);\n  }\n}\n\n@keyframes container-rotate {\n  to {\n    -webkit-transform: rotate(360deg);\n            transform: rotate(360deg);\n  }\n}\n\n.spinner-layer {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  opacity: 0;\n  border-color: #26a69a;\n}\n\n.spinner-blue,\n.spinner-blue-only {\n  border-color: #4285f4;\n}\n\n.spinner-red,\n.spinner-red-only {\n  border-color: #db4437;\n}\n\n.spinner-yellow,\n.spinner-yellow-only {\n  border-color: #f4b400;\n}\n\n.spinner-green,\n.spinner-green-only {\n  border-color: #0f9d58;\n}\n\n/**\n * IMPORTANT NOTE ABOUT CSS ANIMATION PROPERTIES (keanulee):\n *\n * iOS Safari (tested on iOS 8.1) does not handle animation-delay very well - it doesn't\n * guarantee that the animation will start _exactly_ after that value. So we avoid using\n * animation-delay and instead set custom keyframes for each color (as redundant as it\n * seems).\n *\n * We write out each animation in full (instead of separating animation-name,\n * animation-duration, etc.) because under the polyfill, Safari does not recognize those\n * specific properties properly, treats them as -webkit-animation, and overrides the\n * other animation rules. See https://github.com/Polymer/platform/issues/53.\n */\n.active .spinner-layer.spinner-blue {\n  /* durations: 4 * ARCTIME */\n  -webkit-animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both, blue-fade-in-out 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n  animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both, blue-fade-in-out 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n}\n\n.active .spinner-layer.spinner-red {\n  /* durations: 4 * ARCTIME */\n  -webkit-animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both, red-fade-in-out 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n  animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both, red-fade-in-out 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n}\n\n.active .spinner-layer.spinner-yellow {\n  /* durations: 4 * ARCTIME */\n  -webkit-animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both, yellow-fade-in-out 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n  animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both, yellow-fade-in-out 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n}\n\n.active .spinner-layer.spinner-green {\n  /* durations: 4 * ARCTIME */\n  -webkit-animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both, green-fade-in-out 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n  animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both, green-fade-in-out 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n}\n\n.active .spinner-layer,\n.active .spinner-layer.spinner-blue-only,\n.active .spinner-layer.spinner-red-only,\n.active .spinner-layer.spinner-yellow-only,\n.active .spinner-layer.spinner-green-only {\n  /* durations: 4 * ARCTIME */\n  opacity: 1;\n  -webkit-animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n  animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n}\n\n@-webkit-keyframes fill-unfill-rotate {\n  12.5% {\n    -webkit-transform: rotate(135deg);\n  }\n  /* 0.5 * ARCSIZE */\n  25% {\n    -webkit-transform: rotate(270deg);\n  }\n  /* 1   * ARCSIZE */\n  37.5% {\n    -webkit-transform: rotate(405deg);\n  }\n  /* 1.5 * ARCSIZE */\n  50% {\n    -webkit-transform: rotate(540deg);\n  }\n  /* 2   * ARCSIZE */\n  62.5% {\n    -webkit-transform: rotate(675deg);\n  }\n  /* 2.5 * ARCSIZE */\n  75% {\n    -webkit-transform: rotate(810deg);\n  }\n  /* 3   * ARCSIZE */\n  87.5% {\n    -webkit-transform: rotate(945deg);\n  }\n  /* 3.5 * ARCSIZE */\n  to {\n    -webkit-transform: rotate(1080deg);\n  }\n  /* 4   * ARCSIZE */\n}\n\n@keyframes fill-unfill-rotate {\n  12.5% {\n    -webkit-transform: rotate(135deg);\n            transform: rotate(135deg);\n  }\n  /* 0.5 * ARCSIZE */\n  25% {\n    -webkit-transform: rotate(270deg);\n            transform: rotate(270deg);\n  }\n  /* 1   * ARCSIZE */\n  37.5% {\n    -webkit-transform: rotate(405deg);\n            transform: rotate(405deg);\n  }\n  /* 1.5 * ARCSIZE */\n  50% {\n    -webkit-transform: rotate(540deg);\n            transform: rotate(540deg);\n  }\n  /* 2   * ARCSIZE */\n  62.5% {\n    -webkit-transform: rotate(675deg);\n            transform: rotate(675deg);\n  }\n  /* 2.5 * ARCSIZE */\n  75% {\n    -webkit-transform: rotate(810deg);\n            transform: rotate(810deg);\n  }\n  /* 3   * ARCSIZE */\n  87.5% {\n    -webkit-transform: rotate(945deg);\n            transform: rotate(945deg);\n  }\n  /* 3.5 * ARCSIZE */\n  to {\n    -webkit-transform: rotate(1080deg);\n            transform: rotate(1080deg);\n  }\n  /* 4   * ARCSIZE */\n}\n\n@-webkit-keyframes blue-fade-in-out {\n  from {\n    opacity: 1;\n  }\n  25% {\n    opacity: 1;\n  }\n  26% {\n    opacity: 0;\n  }\n  89% {\n    opacity: 0;\n  }\n  90% {\n    opacity: 1;\n  }\n  100% {\n    opacity: 1;\n  }\n}\n\n@keyframes blue-fade-in-out {\n  from {\n    opacity: 1;\n  }\n  25% {\n    opacity: 1;\n  }\n  26% {\n    opacity: 0;\n  }\n  89% {\n    opacity: 0;\n  }\n  90% {\n    opacity: 1;\n  }\n  100% {\n    opacity: 1;\n  }\n}\n\n@-webkit-keyframes red-fade-in-out {\n  from {\n    opacity: 0;\n  }\n  15% {\n    opacity: 0;\n  }\n  25% {\n    opacity: 1;\n  }\n  50% {\n    opacity: 1;\n  }\n  51% {\n    opacity: 0;\n  }\n}\n\n@keyframes red-fade-in-out {\n  from {\n    opacity: 0;\n  }\n  15% {\n    opacity: 0;\n  }\n  25% {\n    opacity: 1;\n  }\n  50% {\n    opacity: 1;\n  }\n  51% {\n    opacity: 0;\n  }\n}\n\n@-webkit-keyframes yellow-fade-in-out {\n  from {\n    opacity: 0;\n  }\n  40% {\n    opacity: 0;\n  }\n  50% {\n    opacity: 1;\n  }\n  75% {\n    opacity: 1;\n  }\n  76% {\n    opacity: 0;\n  }\n}\n\n@keyframes yellow-fade-in-out {\n  from {\n    opacity: 0;\n  }\n  40% {\n    opacity: 0;\n  }\n  50% {\n    opacity: 1;\n  }\n  75% {\n    opacity: 1;\n  }\n  76% {\n    opacity: 0;\n  }\n}\n\n@-webkit-keyframes green-fade-in-out {\n  from {\n    opacity: 0;\n  }\n  65% {\n    opacity: 0;\n  }\n  75% {\n    opacity: 1;\n  }\n  90% {\n    opacity: 1;\n  }\n  100% {\n    opacity: 0;\n  }\n}\n\n@keyframes green-fade-in-out {\n  from {\n    opacity: 0;\n  }\n  65% {\n    opacity: 0;\n  }\n  75% {\n    opacity: 1;\n  }\n  90% {\n    opacity: 1;\n  }\n  100% {\n    opacity: 0;\n  }\n}\n\n/**\n * Patch the gap that appear between the two adjacent div.circle-clipper while the\n * spinner is rotating (appears on Chrome 38, Safari 7.1, and IE 11).\n */\n.gap-patch {\n  position: absolute;\n  top: 0;\n  left: 45%;\n  width: 10%;\n  height: 100%;\n  overflow: hidden;\n  border-color: inherit;\n}\n\n.gap-patch .circle {\n  width: 1000%;\n  left: -450%;\n}\n\n.circle-clipper {\n  display: inline-block;\n  position: relative;\n  width: 50%;\n  height: 100%;\n  overflow: hidden;\n  border-color: inherit;\n}\n\n.circle-clipper .circle {\n  width: 200%;\n  height: 100%;\n  border-width: 3px;\n  /* STROKEWIDTH */\n  border-style: solid;\n  border-color: inherit;\n  border-bottom-color: transparent !important;\n  border-radius: 50%;\n  -webkit-animation: none;\n  animation: none;\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n}\n\n.circle-clipper.left .circle {\n  left: 0;\n  border-right-color: transparent !important;\n  -webkit-transform: rotate(129deg);\n  transform: rotate(129deg);\n}\n\n.circle-clipper.right .circle {\n  left: -100%;\n  border-left-color: transparent !important;\n  -webkit-transform: rotate(-129deg);\n  transform: rotate(-129deg);\n}\n\n.active .circle-clipper.left .circle {\n  /* duration: ARCTIME */\n  -webkit-animation: left-spin 1333ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n  animation: left-spin 1333ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n}\n\n.active .circle-clipper.right .circle {\n  /* duration: ARCTIME */\n  -webkit-animation: right-spin 1333ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n  animation: right-spin 1333ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n}\n\n@-webkit-keyframes left-spin {\n  from {\n    -webkit-transform: rotate(130deg);\n  }\n  50% {\n    -webkit-transform: rotate(-5deg);\n  }\n  to {\n    -webkit-transform: rotate(130deg);\n  }\n}\n\n@keyframes left-spin {\n  from {\n    -webkit-transform: rotate(130deg);\n            transform: rotate(130deg);\n  }\n  50% {\n    -webkit-transform: rotate(-5deg);\n            transform: rotate(-5deg);\n  }\n  to {\n    -webkit-transform: rotate(130deg);\n            transform: rotate(130deg);\n  }\n}\n\n@-webkit-keyframes right-spin {\n  from {\n    -webkit-transform: rotate(-130deg);\n  }\n  50% {\n    -webkit-transform: rotate(5deg);\n  }\n  to {\n    -webkit-transform: rotate(-130deg);\n  }\n}\n\n@keyframes right-spin {\n  from {\n    -webkit-transform: rotate(-130deg);\n            transform: rotate(-130deg);\n  }\n  50% {\n    -webkit-transform: rotate(5deg);\n            transform: rotate(5deg);\n  }\n  to {\n    -webkit-transform: rotate(-130deg);\n            transform: rotate(-130deg);\n  }\n}\n\n#spinnerContainer.cooldown {\n  /* duration: SHRINK_TIME */\n  -webkit-animation: container-rotate 1568ms linear infinite, fade-out 400ms cubic-bezier(0.4, 0, 0.2, 1);\n  animation: container-rotate 1568ms linear infinite, fade-out 400ms cubic-bezier(0.4, 0, 0.2, 1);\n}\n\n@-webkit-keyframes fade-out {\n  from {\n    opacity: 1;\n  }\n  to {\n    opacity: 0;\n  }\n}\n\n@keyframes fade-out {\n  from {\n    opacity: 1;\n  }\n  to {\n    opacity: 0;\n  }\n}\n\n.slider {\n  position: relative;\n  height: 400px;\n  width: 100%;\n}\n\n.slider.fullscreen {\n  height: 100%;\n  width: 100%;\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n}\n\n.slider.fullscreen ul.slides {\n  height: 100%;\n}\n\n.slider.fullscreen ul.indicators {\n  z-index: 2;\n  bottom: 30px;\n}\n\n.slider .slides {\n  background-color: #9e9e9e;\n  margin: 0;\n  height: 400px;\n}\n\n.slider .slides li {\n  opacity: 0;\n  position: absolute;\n  top: 0;\n  left: 0;\n  z-index: 1;\n  width: 100%;\n  height: inherit;\n  overflow: hidden;\n}\n\n.slider .slides li img {\n  height: 100%;\n  width: 100%;\n  background-size: cover;\n  background-position: center;\n}\n\n.slider .slides li .caption {\n  color: #fff;\n  position: absolute;\n  top: 15%;\n  left: 15%;\n  width: 70%;\n  opacity: 0;\n}\n\n.slider .slides li .caption p {\n  color: #e0e0e0;\n}\n\n.slider .slides li.active {\n  z-index: 2;\n}\n\n.slider .indicators {\n  position: absolute;\n  text-align: center;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  margin: 0;\n}\n\n.slider .indicators .indicator-item {\n  display: inline-block;\n  position: relative;\n  cursor: pointer;\n  height: 16px;\n  width: 16px;\n  margin: 0 12px;\n  background-color: #e0e0e0;\n  transition: background-color .3s;\n  border-radius: 50%;\n}\n\n.slider .indicators .indicator-item.active {\n  background-color: #4CAF50;\n}\n\n.carousel {\n  overflow: hidden;\n  position: relative;\n  width: 100%;\n  height: 400px;\n  -webkit-perspective: 500px;\n          perspective: 500px;\n  -webkit-transform-style: preserve-3d;\n          transform-style: preserve-3d;\n  -webkit-transform-origin: 0% 50%;\n          transform-origin: 0% 50%;\n}\n\n.carousel.carousel-slider {\n  top: 0;\n  left: 0;\n  height: 0;\n}\n\n.carousel.carousel-slider .carousel-fixed-item {\n  position: absolute;\n  left: 0;\n  right: 0;\n  bottom: 20px;\n  z-index: 1;\n}\n\n.carousel.carousel-slider .carousel-fixed-item.with-indicators {\n  bottom: 68px;\n}\n\n.carousel.carousel-slider .carousel-item {\n  width: 100%;\n  height: 100%;\n  min-height: 400px;\n  position: absolute;\n  top: 0;\n  left: 0;\n}\n\n.carousel.carousel-slider .carousel-item h2 {\n  font-size: 24px;\n  font-weight: 500;\n  line-height: 32px;\n}\n\n.carousel.carousel-slider .carousel-item p {\n  font-size: 15px;\n}\n\n.carousel .carousel-item {\n  display: none;\n  width: 200px;\n  height: 400px;\n  position: absolute;\n  top: 0;\n  left: 0;\n}\n\n.carousel .carousel-item img {\n  width: 100%;\n}\n\n.carousel .indicators {\n  position: absolute;\n  text-align: center;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  margin: 0;\n}\n\n.carousel .indicators .indicator-item {\n  display: inline-block;\n  position: relative;\n  cursor: pointer;\n  height: 8px;\n  width: 8px;\n  margin: 24px 4px;\n  background-color: rgba(255, 255, 255, 0.5);\n  transition: background-color .3s;\n  border-radius: 50%;\n}\n\n.carousel .indicators .indicator-item.active {\n  background-color: #fff;\n}\n\n/* ==========================================================================\n   $BASE-PICKER\n   ========================================================================== */\n/**\n * Note: the root picker element should *NOT* be styled more than what's here.\n */\n.picker {\n  font-size: 16px;\n  text-align: left;\n  line-height: 1.2;\n  color: #000000;\n  position: absolute;\n  z-index: 10000;\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  -ms-user-select: none;\n  user-select: none;\n}\n\n/**\n * The picker input element.\n */\n.picker__input {\n  cursor: default;\n}\n\n/**\n * When the picker is opened, the input element is \"activated\".\n */\n.picker__input.picker__input--active {\n  border-color: #0089ec;\n}\n\n/**\n * The holder is the only \"scrollable\" top-level container element.\n */\n.picker__holder {\n  width: 100%;\n  overflow-y: auto;\n  -webkit-overflow-scrolling: touch;\n}\n\n/*!\n * Default mobile-first, responsive styling for pickadate.js\n * Demo: http://amsul.github.io/pickadate.js\n */\n/**\n * Note: the root picker element should *NOT* be styled more than what's here.\n */\n/**\n * Make the holder and frame fullscreen.\n */\n.picker__holder,\n.picker__frame {\n  bottom: 0;\n  left: 0;\n  right: 0;\n  top: 100%;\n}\n\n/**\n * The holder should overlay the entire screen.\n */\n.picker__holder {\n  position: fixed;\n  transition: background 0.15s ease-out, top 0s 0.15s;\n  -webkit-backface-visibility: hidden;\n}\n\n/**\n * The frame that bounds the box contents of the picker.\n */\n.picker__frame {\n  position: absolute;\n  margin: 0 auto;\n  min-width: 256px;\n  width: 300px;\n  max-height: 350px;\n  -ms-filter: \"progid:DXImageTransform.Microsoft.Alpha(Opacity=0)\";\n  filter: alpha(opacity=0);\n  -moz-opacity: 0;\n  opacity: 0;\n  transition: all 0.15s ease-out;\n}\n\n@media (min-height: 28.875em) {\n  .picker__frame {\n    overflow: visible;\n    top: auto;\n    bottom: -100%;\n    max-height: 80%;\n  }\n}\n\n@media (min-height: 40.125em) {\n  .picker__frame {\n    margin-bottom: 7.5%;\n  }\n}\n\n/**\n * The wrapper sets the stage to vertically align the box contents.\n */\n.picker__wrap {\n  display: table;\n  width: 100%;\n  height: 100%;\n}\n\n@media (min-height: 28.875em) {\n  .picker__wrap {\n    display: block;\n  }\n}\n\n/**\n * The box contains all the picker contents.\n */\n.picker__box {\n  background: #ffffff;\n  display: table-cell;\n  vertical-align: middle;\n}\n\n@media (min-height: 28.875em) {\n  .picker__box {\n    display: block;\n    border: 1px solid #777777;\n    border-top-color: #898989;\n    border-bottom-width: 0;\n    border-radius: 5px 5px 0 0;\n    box-shadow: 0 12px 36px 16px rgba(0, 0, 0, 0.24);\n  }\n}\n\n/**\n * When the picker opens...\n */\n.picker--opened .picker__holder {\n  top: 0;\n  background: transparent;\n  -ms-filter: \"progid:DXImageTransform.Microsoft.gradient(startColorstr=#1E000000,endColorstr=#1E000000)\";\n  zoom: 1;\n  background: rgba(0, 0, 0, 0.32);\n  transition: background 0.15s ease-out;\n}\n\n.picker--opened .picker__frame {\n  top: 0;\n  -ms-filter: \"progid:DXImageTransform.Microsoft.Alpha(Opacity=100)\";\n  filter: alpha(opacity=100);\n  -moz-opacity: 1;\n  opacity: 1;\n}\n\n@media (min-height: 35.875em) {\n  .picker--opened .picker__frame {\n    top: 10%;\n    bottom: auto;\n  }\n}\n\n/**\n * For `large` screens, transform into an inline picker.\n */\n/* ==========================================================================\n   CUSTOM MATERIALIZE STYLES\n   ========================================================================== */\n.picker__input.picker__input--active {\n  border-color: #E3F2FD;\n}\n\n.picker__frame {\n  margin: 0 auto;\n  max-width: 325px;\n}\n\n@media (min-height: 38.875em) {\n  .picker--opened .picker__frame {\n    top: 10%;\n    bottom: auto;\n  }\n}\n\n/* ==========================================================================\n   $BASE-DATE-PICKER\n   ========================================================================== */\n/**\n * The picker box.\n */\n.picker__box {\n  padding: 0 1em;\n}\n\n/**\n * The header containing the month and year stuff.\n */\n.picker__header {\n  text-align: center;\n  position: relative;\n  margin-top: .75em;\n}\n\n/**\n * The month and year labels.\n */\n.picker__month,\n.picker__year {\n  display: inline-block;\n  margin-left: .25em;\n  margin-right: .25em;\n}\n\n/**\n * The month and year selectors.\n */\n.picker__select--month,\n.picker__select--year {\n  height: 2em;\n  padding: 0;\n  margin-left: .25em;\n  margin-right: .25em;\n}\n\n.picker__select--month.browser-default {\n  display: inline;\n  background-color: #FFFFFF;\n  width: 40%;\n}\n\n.picker__select--year.browser-default {\n  display: inline;\n  background-color: #FFFFFF;\n  width: 26%;\n}\n\n.picker__select--month:focus,\n.picker__select--year:focus {\n  border-color: rgba(0, 0, 0, 0.05);\n}\n\n/**\n * The month navigation buttons.\n */\n.picker__nav--prev,\n.picker__nav--next {\n  position: absolute;\n  padding: .5em 1.25em;\n  width: 1em;\n  height: 1em;\n  box-sizing: content-box;\n  top: -0.25em;\n}\n\n.picker__nav--prev {\n  left: -1em;\n  padding-right: 1.25em;\n}\n\n.picker__nav--next {\n  right: -1em;\n  padding-left: 1.25em;\n}\n\n.picker__nav--disabled,\n.picker__nav--disabled:hover,\n.picker__nav--disabled:before,\n.picker__nav--disabled:before:hover {\n  cursor: default;\n  background: none;\n  border-right-color: #f5f5f5;\n  border-left-color: #f5f5f5;\n}\n\n/**\n * The calendar table of dates\n */\n.picker__table {\n  text-align: center;\n  border-collapse: collapse;\n  border-spacing: 0;\n  table-layout: fixed;\n  font-size: 1rem;\n  width: 100%;\n  margin-top: .75em;\n  margin-bottom: .5em;\n}\n\n.picker__table th, .picker__table td {\n  text-align: center;\n}\n\n.picker__table td {\n  margin: 0;\n  padding: 0;\n}\n\n/**\n * The weekday labels\n */\n.picker__weekday {\n  width: 14.285714286%;\n  font-size: .75em;\n  padding-bottom: .25em;\n  color: #999999;\n  font-weight: 500;\n  /* Increase the spacing a tad */\n}\n\n@media (min-height: 33.875em) {\n  .picker__weekday {\n    padding-bottom: .5em;\n  }\n}\n\n/**\n * The days on the calendar\n */\n.picker__day--today {\n  position: relative;\n  color: #595959;\n  letter-spacing: -.3;\n  padding: .75rem 0;\n  font-weight: 400;\n  border: 1px solid transparent;\n}\n\n.picker__day--disabled:before {\n  border-top-color: #aaaaaa;\n}\n\n.picker__day--infocus:hover {\n  cursor: pointer;\n  color: #000;\n  font-weight: 500;\n}\n\n.picker__day--outfocus {\n  display: none;\n  padding: .75rem 0;\n  color: #fff;\n}\n\n.picker__day--outfocus:hover {\n  cursor: pointer;\n  color: #dddddd;\n  font-weight: 500;\n}\n\n.picker__day--highlighted:hover,\n.picker--focused .picker__day--highlighted {\n  cursor: pointer;\n}\n\n.picker__day--selected,\n.picker__day--selected:hover,\n.picker--focused .picker__day--selected {\n  border-radius: 50%;\n  -webkit-transform: scale(0.75);\n          transform: scale(0.75);\n  background: #0089ec;\n  color: #ffffff;\n}\n\n.picker__day--disabled,\n.picker__day--disabled:hover,\n.picker--focused .picker__day--disabled {\n  background: #f5f5f5;\n  border-color: #f5f5f5;\n  color: #dddddd;\n  cursor: default;\n}\n\n.picker__day--highlighted.picker__day--disabled,\n.picker__day--highlighted.picker__day--disabled:hover {\n  background: #bbbbbb;\n}\n\n/**\n * The footer containing the \"today\", \"clear\", and \"close\" buttons.\n */\n.picker__footer {\n  text-align: center;\n  display: -webkit-flex;\n  display: -ms-flexbox;\n  display: flex;\n  -webkit-align-items: center;\n      -ms-flex-align: center;\n          align-items: center;\n  -webkit-justify-content: space-between;\n      -ms-flex-pack: justify;\n          justify-content: space-between;\n}\n\n.picker__button--today,\n.picker__button--clear,\n.picker__button--close {\n  border: 1px solid #ffffff;\n  background: #ffffff;\n  font-size: .8em;\n  padding: .66em 0;\n  font-weight: bold;\n  width: 33%;\n  display: inline-block;\n  vertical-align: bottom;\n}\n\n.picker__button--today:hover,\n.picker__button--clear:hover,\n.picker__button--close:hover {\n  cursor: pointer;\n  color: #000000;\n  background: #b1dcfb;\n  border-bottom-color: #b1dcfb;\n}\n\n.picker__button--today:focus,\n.picker__button--clear:focus,\n.picker__button--close:focus {\n  background: #b1dcfb;\n  border-color: rgba(0, 0, 0, 0.05);\n  outline: none;\n}\n\n.picker__button--today:before,\n.picker__button--clear:before,\n.picker__button--close:before {\n  position: relative;\n  display: inline-block;\n  height: 0;\n}\n\n.picker__button--today:before,\n.picker__button--clear:before {\n  content: \" \";\n  margin-right: .45em;\n}\n\n.picker__button--today:before {\n  top: -0.05em;\n  width: 0;\n  border-top: 0.66em solid #0059bc;\n  border-left: .66em solid transparent;\n}\n\n.picker__button--clear:before {\n  top: -0.25em;\n  width: .66em;\n  border-top: 3px solid #ee2200;\n}\n\n.picker__button--close:before {\n  content: \"\\D7\";\n  top: -0.1em;\n  vertical-align: top;\n  font-size: 1.1em;\n  margin-right: .35em;\n  color: #777777;\n}\n\n.picker__button--today[disabled],\n.picker__button--today[disabled]:hover {\n  background: #f5f5f5;\n  border-color: #f5f5f5;\n  color: #dddddd;\n  cursor: default;\n}\n\n.picker__button--today[disabled]:before {\n  border-top-color: #aaaaaa;\n}\n\n/* ==========================================================================\n   CUSTOM MATERIALIZE STYLES\n   ========================================================================== */\n.picker__box {\n  border-radius: 2px;\n  overflow: hidden;\n}\n\n.picker__date-display {\n  text-align: center;\n  background-color: #26a69a;\n  color: #fff;\n  padding-bottom: 15px;\n  font-weight: 300;\n}\n\n.picker__nav--prev:hover,\n.picker__nav--next:hover {\n  cursor: pointer;\n  color: #000000;\n  background: #a1ded8;\n}\n\n.picker__weekday-display {\n  background-color: #1f897f;\n  padding: 10px;\n  font-weight: 200;\n  letter-spacing: .5;\n  font-size: 1rem;\n  margin-bottom: 15px;\n}\n\n.picker__month-display {\n  text-transform: uppercase;\n  font-size: 2rem;\n}\n\n.picker__day-display {\n  font-size: 4.5rem;\n  font-weight: 400;\n}\n\n.picker__year-display {\n  font-size: 1.8rem;\n  color: rgba(255, 255, 255, 0.4);\n}\n\n.picker__box {\n  padding: 0;\n}\n\n.picker__calendar-container {\n  padding: 0 1rem;\n}\n\n.picker__calendar-container thead {\n  border: none;\n}\n\n.picker__table {\n  margin-top: 0;\n  margin-bottom: .5em;\n}\n\n.picker__day--infocus {\n  color: #595959;\n  letter-spacing: -.3;\n  padding: .75rem 0;\n  font-weight: 400;\n  border: 1px solid transparent;\n}\n\n.picker__day.picker__day--today {\n  color: #26a69a;\n}\n\n.picker__day.picker__day--today.picker__day--selected {\n  color: #fff;\n}\n\n.picker__weekday {\n  font-size: .9rem;\n}\n\n.picker__day--selected,\n.picker__day--selected:hover,\n.picker--focused .picker__day--selected {\n  border-radius: 50%;\n  -webkit-transform: scale(0.9);\n          transform: scale(0.9);\n  background-color: #26a69a;\n  color: #ffffff;\n}\n\n.picker__day--selected.picker__day--outfocus,\n.picker__day--selected:hover.picker__day--outfocus,\n.picker--focused .picker__day--selected.picker__day--outfocus {\n  background-color: #a1ded8;\n}\n\n.picker__footer {\n  text-align: right;\n  padding: 5px 10px;\n}\n\n.picker__close, .picker__today {\n  font-size: 1.1rem;\n  padding: 0 1rem;\n  color: #26a69a;\n}\n\n.picker__nav--prev:before,\n.picker__nav--next:before {\n  content: \" \";\n  border-top: .5em solid transparent;\n  border-bottom: .5em solid transparent;\n  border-right: 0.75em solid #676767;\n  width: 0;\n  height: 0;\n  display: block;\n  margin: 0 auto;\n}\n\n.picker__nav--next:before {\n  border-right: 0;\n  border-left: 0.75em solid #676767;\n}\n\nbutton.picker__today:focus, button.picker__clear:focus, button.picker__close:focus {\n  background-color: #a1ded8;\n}\n\n/* ==========================================================================\n   $BASE-TIME-PICKER\n   ========================================================================== */\n/**\n * The list of times.\n */\n.picker__list {\n  list-style: none;\n  padding: 0.75em 0 4.2em;\n  margin: 0;\n}\n\n/**\n * The times on the clock.\n */\n.picker__list-item {\n  border-bottom: 1px solid #dddddd;\n  border-top: 1px solid #dddddd;\n  margin-bottom: -1px;\n  position: relative;\n  background: #ffffff;\n  padding: .75em 1.25em;\n}\n\n@media (min-height: 46.75em) {\n  .picker__list-item {\n    padding: .5em 1em;\n  }\n}\n\n/* Hovered time */\n.picker__list-item:hover {\n  cursor: pointer;\n  color: #000000;\n  background: #b1dcfb;\n  border-color: #0089ec;\n  z-index: 10;\n}\n\n/* Highlighted and hovered/focused time */\n.picker__list-item--highlighted {\n  border-color: #0089ec;\n  z-index: 10;\n}\n\n.picker__list-item--highlighted:hover,\n.picker--focused .picker__list-item--highlighted {\n  cursor: pointer;\n  color: #000000;\n  background: #b1dcfb;\n}\n\n/* Selected and hovered/focused time */\n.picker__list-item--selected,\n.picker__list-item--selected:hover,\n.picker--focused .picker__list-item--selected {\n  background: #0089ec;\n  color: #ffffff;\n  z-index: 10;\n}\n\n/* Disabled time */\n.picker__list-item--disabled,\n.picker__list-item--disabled:hover,\n.picker--focused .picker__list-item--disabled {\n  background: #f5f5f5;\n  border-color: #f5f5f5;\n  color: #dddddd;\n  cursor: default;\n  border-color: #dddddd;\n  z-index: auto;\n}\n\n/**\n * The clear button\n */\n.picker--time .picker__button--clear {\n  display: block;\n  width: 80%;\n  margin: 1em auto 0;\n  padding: 1em 1.25em;\n  background: none;\n  border: 0;\n  font-weight: 500;\n  font-size: .67em;\n  text-align: center;\n  text-transform: uppercase;\n  color: #666;\n}\n\n.picker--time .picker__button--clear:hover,\n.picker--time .picker__button--clear:focus {\n  color: #000000;\n  background: #b1dcfb;\n  background: #ee2200;\n  border-color: #ee2200;\n  cursor: pointer;\n  color: #ffffff;\n  outline: none;\n}\n\n.picker--time .picker__button--clear:before {\n  top: -0.25em;\n  color: #666;\n  font-size: 1.25em;\n  font-weight: bold;\n}\n\n.picker--time .picker__button--clear:hover:before,\n.picker--time .picker__button--clear:focus:before {\n  color: #ffffff;\n}\n\n/* ==========================================================================\n   $DEFAULT-TIME-PICKER\n   ========================================================================== */\n/**\n * The frame the bounds the time picker.\n */\n.picker--time .picker__frame {\n  min-width: 256px;\n  max-width: 320px;\n}\n\n/**\n * The picker box.\n */\n.picker--time .picker__box {\n  font-size: 1em;\n  background: #f2f2f2;\n  padding: 0;\n}\n\n@media (min-height: 40.125em) {\n  .picker--time .picker__box {\n    margin-bottom: 5em;\n  }\n}\n", ""]);

// exports


/***/ },

/***/ 243:
/***/ function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(78)();
// imports


// module
exports.push([module.i, ".InputRange-slider {\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n  background: #3f51b5;\n  border: 1px solid #3f51b5;\n  border-radius: 100%;\n  cursor: pointer;\n  display: block;\n  height: 1rem;\n  margin-left: -0.5rem;\n  margin-top: -0.65rem;\n  outline: none;\n  position: absolute;\n  top: 50%;\n  transition: -webkit-transform 0.3s ease-out, box-shadow 0.3s ease-out;\n  transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;\n  width: 1rem; }\n  .InputRange-slider:active {\n    -webkit-transform: scale(1.3);\n            transform: scale(1.3); }\n  .InputRange-slider:focus {\n    box-shadow: 0 0 0 5px rgba(63, 81, 181, 0.2); }\n  .InputRange.is-disabled .InputRange-slider {\n    background: #cccccc;\n    border: 1px solid #cccccc;\n    box-shadow: none;\n    -webkit-transform: none;\n            transform: none; }\n\n.InputRange-sliderContainer {\n  transition: left 0.3s ease-out; }\n\n.InputRange-label {\n  color: #aaaaaa;\n  font-family: \"Helvetica Neue\", san-serif;\n  font-size: 0.8rem;\n  white-space: nowrap; }\n\n.InputRange-label--min,\n.InputRange-label--max {\n  bottom: -1.4rem;\n  position: absolute; }\n\n.InputRange-label--min {\n  left: 0; }\n\n.InputRange-label--max {\n  right: 0; }\n\n.InputRange-label--value {\n  position: absolute;\n  top: -1.8rem; }\n\n.InputRange-labelContainer {\n  left: -50%;\n  position: relative; }\n  .InputRange-label--max .InputRange-labelContainer {\n    left: 50%; }\n\n.InputRange-track {\n  background: #eeeeee;\n  border-radius: 0.3rem;\n  cursor: pointer;\n  display: block;\n  height: 0.3rem;\n  position: relative;\n  transition: left 0.3s ease-out, width 0.3s ease-out; }\n  .InputRange.is-disabled .InputRange-track {\n    background: #eeeeee; }\n\n.InputRange-track--container {\n  left: 0;\n  margin-top: -0.15rem;\n  position: absolute;\n  right: 0;\n  top: 50%; }\n\n.InputRange-track--active {\n  background: #3f51b5; }\n\n.InputRange {\n  height: 1rem;\n  position: relative;\n  width: 100%; }\n", ""]);

// exports


/***/ },

/***/ 244:
/***/ function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(78)();
// imports


// module
exports.push([module.i, ".input-field label {\n  left: 0;\n}\n\n.range-slider {\n  margin: 65px 0 30px;\n}\n\n.range-slider label {\n  top: -37px;\n}\n\nlabel {\n  color: white !important;\n}\n\n.pagination li > a {\n  cursor: pointer;\n}\n\n.pagination {\n  margin-bottom: 5px;\n}\n\na.secondary-content {\n  position: relative !important;\n  flex: 1;\n  text-align: right;\n  top: 0px !important;\n  right: 0px !important;\n}\n\n.secondary-content .material-icons {\n  font-size: 36px;\n}\n\n.artist-detail .header {\n  display: flex;\n  justify-content: space-between;\n}\n\n.flex {\n  display: flex;\n  justify-content: space-around;\n}\n\n.wrap {\n  flex-wrap: wrap;\n}\n\n.album img {\n  width: 250px !important;\n}\n\n.has-error {\n  color: red;\n}\n\n.spacer a {\n  margin: 0px 10px;\n  cursor: pointer;\n}\n\nli.collection-item.avatar {\n  display: flex;\n  align-items: center;\n  padding-left: 10px !important;\n}\n\nli.collection-item.avatar img {\n  position: relative !important;\n  left: 0px !important;\n  margin: 0px 10px !important;\n}\n\n.retired {\n  background-color: #ddd !important;\n}\n\n.select {\n  font-size: 1rem;\n}\n\nselect {\n  display: block !important;\n  margin-bottom: 10px;\n  height: 30px;\n  color: black;\n}\n", ""]);

// exports


/***/ },

/***/ 36:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deleteArtist = exports.editArtist = exports.createArtist = exports.findArtist = exports.searchArtists = exports.setYearsActiveRange = exports.setAgeRange = exports.setNotRetired = exports.setRetired = exports.deselectArtist = exports.selectArtist = exports.clearError = exports.resetArtist = undefined;

var _lodash = __webpack_require__(10);

var _lodash2 = _interopRequireDefault(_lodash);

var _reactRouter = __webpack_require__(35);

var _types = __webpack_require__(44);

var _GetAgeRange = __webpack_require__(219);

var _GetAgeRange2 = _interopRequireDefault(_GetAgeRange);

var _GetYearsActiveRange = __webpack_require__(220);

var _GetYearsActiveRange2 = _interopRequireDefault(_GetYearsActiveRange);

var _SearchArtists = __webpack_require__(221);

var _SearchArtists2 = _interopRequireDefault(_SearchArtists);

var _FindArtist = __webpack_require__(218);

var _FindArtist2 = _interopRequireDefault(_FindArtist);

var _CreateArtist = __webpack_require__(215);

var _CreateArtist2 = _interopRequireDefault(_CreateArtist);

var _EditArtist = __webpack_require__(217);

var _EditArtist2 = _interopRequireDefault(_EditArtist);

var _DeleteArtist = __webpack_require__(216);

var _DeleteArtist2 = _interopRequireDefault(_DeleteArtist);

var _SetRetired = __webpack_require__(223);

var _SetRetired2 = _interopRequireDefault(_SetRetired);

var _SetNotRetired = __webpack_require__(222);

var _SetNotRetired2 = _interopRequireDefault(_SetNotRetired);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var resetArtist = exports.resetArtist = function resetArtist() {
  return { type: _types.RESET_ARTIST };
};

var clearError = exports.clearError = function clearError() {
  return { type: _types.CLEAR_ERROR };
};

var selectArtist = exports.selectArtist = function selectArtist(id) {
  return { type: _types.SELECT_ARTIST, payload: id };
};

var deselectArtist = exports.deselectArtist = function deselectArtist(id) {
  return { type: _types.DESELECT_ARTIST, payload: id };
};

var setRetired = exports.setRetired = function setRetired(ids) {
  return function (dispatch, getState) {
    return SetRetiredProxy(ids.map(function (id) {
      return id.toString();
    })).then(function () {
      return dispatch({ type: _types.RESET_SELECTION });
    }).then(function () {
      return refreshSearch(dispatch, getState);
    });
  };
};

var setNotRetired = exports.setNotRetired = function setNotRetired(ids) {
  return function (dispatch, getState) {
    return SetNotRetiredProxy(ids.map(function (id) {
      return id.toString();
    })).then(function () {
      return dispatch({ type: _types.RESET_SELECTION });
    }).then(function () {
      return refreshSearch(dispatch, getState);
    });
  };
};

var setAgeRange = exports.setAgeRange = function setAgeRange() {
  return function (dispatch) {
    return GetAgeRangeProxy().then(function (result) {
      return dispatch({ type: _types.SET_AGE_RANGE, payload: result });
    });
  };
};

var setYearsActiveRange = exports.setYearsActiveRange = function setYearsActiveRange() {
  return function (dispatch) {
    return GetYearsActiveRangeProxy().then(function (result) {
      return dispatch({ type: _types.SET_YEARS_ACTIVE_RANGE, payload: result });
    });
  };
};

var searchArtists = exports.searchArtists = function searchArtists() {
  for (var _len = arguments.length, criteria = Array(_len), _key = 0; _key < _len; _key++) {
    criteria[_key] = arguments[_key];
  }

  return function (dispatch) {
    return SearchArtistsProxy.apply(undefined, criteria).then(function () {
      var result = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      return dispatch({ type: _types.SEARCH_ARTISTS, payload: result });
    });
  };
};

var findArtist = exports.findArtist = function findArtist(id) {
  return function (dispatch) {
    return FindArtistProxy(id).then(function (artist) {
      return dispatch({ type: _types.FIND_ARTIST, payload: artist });
    });
  };
};

var createArtist = exports.createArtist = function createArtist(props) {
  return function (dispatch) {
    return CreateArtistProxy(props).then(function (artist) {
      _reactRouter.hashHistory.push('artists/' + artist._id);
    }).catch(function (error) {
      console.log(error);
      dispatch({ type: _types.CREATE_ERROR, payload: error });
    });
  };
};

var editArtist = exports.editArtist = function editArtist(id, props) {
  return function (dispatch) {
    return EditArtistProxy(id, props).then(function () {
      return _reactRouter.hashHistory.push('artists/' + id);
    }).catch(function (error) {
      console.log(error);
      dispatch({ type: _types.CREATE_ERROR, payload: error });
    });
  };
};

var deleteArtist = exports.deleteArtist = function deleteArtist(id) {
  return function (dispatch) {
    return DeleteArtistProxy(id).then(function () {
      return _reactRouter.hashHistory.push('/');
    }).catch(function (error) {
      console.log(error);
      dispatch({ type: _types.CREATE_ERROR, payload: error });
    });
  };
};

//
// Faux Proxies

var GetAgeRangeProxy = function GetAgeRangeProxy() {
  var result = _GetAgeRange2.default.apply(undefined, arguments);
  if (!result || !result.then) {
    return new Promise(function () {});
  }
  return result;
};

var GetYearsActiveRangeProxy = function GetYearsActiveRangeProxy() {
  var result = _GetYearsActiveRange2.default.apply(undefined, arguments);
  if (!result || !result.then) {
    return new Promise(function () {});
  }
  return result;
};

var SearchArtistsProxy = function SearchArtistsProxy(criteria, offset, limit) {
  var result = (0, _SearchArtists2.default)(_lodash2.default.omit(criteria, 'sort'), criteria.sort, offset, limit);
  if (!result || !result.then) {
    return new Promise(function () {});
  }
  return result;
};

var FindArtistProxy = function FindArtistProxy() {
  var result = _FindArtist2.default.apply(undefined, arguments);
  if (!result || !result.then) {
    return new Promise(function () {});
  }
  return result;
};

var CreateArtistProxy = function CreateArtistProxy() {
  var result = _CreateArtist2.default.apply(undefined, arguments);
  if (!result || !result.then) {
    return new Promise(function () {});
  }
  return result;
};

var EditArtistProxy = function EditArtistProxy() {
  var result = _EditArtist2.default.apply(undefined, arguments);
  if (!result || !result.then) {
    return new Promise(function () {});
  }
  return result;
};

var DeleteArtistProxy = function DeleteArtistProxy() {
  var result = _DeleteArtist2.default.apply(undefined, arguments);
  if (!result || !result.then) {
    return new Promise(function () {});
  }
  return result;
};

var SetRetiredProxy = function SetRetiredProxy(_ids) {
  var result = (0, _SetRetired2.default)(_ids);
  if (!result || !result.then) {
    return new Promise(function () {});
  }
  return result;
};

var SetNotRetiredProxy = function SetNotRetiredProxy(_ids) {
  var result = (0, _SetNotRetired2.default)(_ids);
  if (!result || !result.then) {
    return new Promise(function () {});
  }
  return result;
};

//
// Helpers

var refreshSearch = function refreshSearch(dispatch, getState) {
  var _getState = getState(),
      _getState$artists = _getState.artists,
      offset = _getState$artists.offset,
      limit = _getState$artists.limit;

  var criteria = getState().form.filters.values;

  dispatch(searchArtists(_lodash2.default.extend({}, { name: '' }, criteria), offset, limit));
};

/***/ },

/***/ 44:
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var SET_AGE_RANGE = exports.SET_AGE_RANGE = 'set_age_range';
var SET_YEARS_ACTIVE_RANGE = exports.SET_YEARS_ACTIVE_RANGE = 'SET_YEARS_ACTIVE_RANGE';
var SEARCH_ARTISTS = exports.SEARCH_ARTISTS = 'SEARCH_ARTISTS';
var FIND_ARTIST = exports.FIND_ARTIST = 'FIND_ARTIST';
var RESET_ARTIST = exports.RESET_ARTIST = 'RESET_ARTIST';
var CREATE_ERROR = exports.CREATE_ERROR = 'CREATE_ERROR';
var CLEAR_ERROR = exports.CLEAR_ERROR = 'CLEAR_ERROR';
var SELECT_ARTIST = exports.SELECT_ARTIST = 'SELECT_ARTIST';
var DESELECT_ARTIST = exports.DESELECT_ARTIST = 'DESELECT_ARTIST';
var RESET_SELECTION = exports.RESET_SELECTION = 'RESET_SELECTION';

/***/ },

/***/ 78:
/***/ function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
module.exports = function() {
	var list = [];

	// return the list of modules as css string
	list.toString = function toString() {
		var result = [];
		for(var i = 0; i < this.length; i++) {
			var item = this[i];
			if(item[2]) {
				result.push("@media " + item[2] + "{" + item[1] + "}");
			} else {
				result.push(item[1]);
			}
		}
		return result.join("");
	};

	// import a list of modules into the list
	list.i = function(modules, mediaQuery) {
		if(typeof modules === "string")
			modules = [[null, modules, ""]];
		var alreadyImportedModules = {};
		for(var i = 0; i < this.length; i++) {
			var id = this[i][0];
			if(typeof id === "number")
				alreadyImportedModules[id] = true;
		}
		for(i = 0; i < modules.length; i++) {
			var item = modules[i];
			// skip already imported module
			// this implementation is not 100% perfect for weird media query combinations
			//  when a module is imported multiple times with different media queries.
			//  I hope this will never occur (Hey this way we have smaller bundles)
			if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
				if(mediaQuery && !item[2]) {
					item[2] = mediaQuery;
				} else if(mediaQuery) {
					item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
				}
				list.push(item);
			}
		}
	};
	return list;
};


/***/ }

},[1519]);