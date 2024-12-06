// next.config.js
var nextConfig = {
    // output: 'export',
    webpack: (config, { isServer }) => {
      if (!isServer) {
        config.resolve.fallback = { fs: false };
      }
      config.module.rules.push({
        test: /\.(ttf|woff|woff2|eot|svg)$/,
        use: {
          loader: "file-loader",
          options: {
            name: "[name].[ext]",
            outputPath: "static/fonts/",
            // Change the output path as needed
            publicPath: "/_next/static/fonts/"
            // Adjust the public path to match the output path
          }
        }
      });
      config.externals.push({
        knex: 'commonjs knex'
      })
      return config;
    },
    async rewrites() {
      return [
        {
          source: '/api/predict',
          destination: 'http://127.0.0.1:5167/predict',
        },
      ]
    }
  };
  module.exports = nextConfig;
  