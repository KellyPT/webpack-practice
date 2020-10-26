var webpack = require("webpack");
var path = require("path");
var HtmlWebpackPlugin = require("html-webpack-plugin");

// we can get this list of package.json
const VENDOR_LIBS = [
  "faker",
  "lodash",
  "react",
  "react-dom",
  "react-input-range",
  "react-redux",
  "react-router",
  "redux",
  "redux-form",
  "redux-thunk",
];

module.exports = {
  entry: {
    bundle: "./src/index.js", // bundle for our code based on dependencies listed in index.js
    vendor: VENDOR_LIBS, // bundle for module dependencies i.e. vendor code
  },
  output: {
    path: path.join(__dirname, "dist"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        use: "babel-loader",
        test: /\.js$/,
        exclude: /node_modules/,
      },
      {
        use: ["style-loader", "css-loader"],
        test: /\.css$/,
      },
    ],
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: "vendor",
    }),
    new HtmlWebpackPlugin({
      template: "src/index.html",
    }),
  ],
};
