const path = require("path");
const ExtractTextPlugin = require("extract-text-webpack-plugin");

const config = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "bundle.js",
    publicPath: "build/",
  },
  module: {
    rules: [
      {
        use: "babel-loader",
        test: /\.js$/, // specify file type
      },
      {
        loader: ExtractTextPlugin.extract({
          loader: "css-loader",
        }),
        test: /\.css$/,
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/,
        use: [
          {
            loader: "url-loader",
            options: { limit: 40000 }, // save img greater than 40K bytes into separate file
          },
          "image-webpack-loader",
        ], // process from right to left
      },
    ],
  },
  plugins: [new ExtractTextPlugin("style.css")], // takes whatever preprocessed by css-loader and use ExtractTextPlugin to output it into style.css, then we can load this style.css file in index.html link tag
};

module.exports = config;
