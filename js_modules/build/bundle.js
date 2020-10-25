/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 5);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

"use strict";


var _big = __webpack_require__(3);

var _big2 = _interopRequireDefault(_big);

var _small = __webpack_require__(4);

var _small2 = _interopRequireDefault(_small);

__webpack_require__(2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var image = document.createElement("img");
image.src = _small2.default;

document.body.appendChild(image);

var bigImage = document.createElement("img");
bigImage.src = _big2.default;

document.body.appendChild(bigImage);

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var sum = function sum(a, b) {
  return a + b;
};

exports.default = sum;

/***/ },
/* 2 */
/***/ function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

module.exports = __webpack_require__.p + "cd7ab927d5578d0815171832d69b3ab5.jpg";

/***/ },
/* 4 */
/***/ function(module, exports) {

module.exports = "data:image/jpeg;base64,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"

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

"use strict";


var _sum = __webpack_require__(1);

var _sum2 = _interopRequireDefault(_sum);

__webpack_require__(0);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var total = (0, _sum2.default)(10, 5);

console.log(total);

/***/ }
/******/ ]);