const path = require("path");
const ExtractTextPlugin = require("extract-text-webpack-plugin");

const config = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "bundle.js",
  },
  module: {
    rules: [
      {
        use: "babel-loader",
        test: /\.js$/,
      },
      {
        loader: ExtractTextPlugin.extract({
          loader: "css-loader",
        }),
        test: /\.css$/,
      },
    ],
  },
  plugins: [new ExtractTextPlugin("style.css")], // takes whatever preprocessed by css-loader and use ExtractTextPlugin to output it into style.css, then we can load this style.css file in index.html link tag
};

module.exports = config;
