const path = require('path');

module.exports = {
    entry: './src/index.tsx',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'main.js',
        library: {
            type: 'umd',
        },
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    externals: {
        react: {
            commonjs: 'react',
            commonjs2: 'react',
            amd: 'react',
            root: 'React',
        },
        'react-dom': {
            commonjs: 'react-dom',
            commonjs2: 'react-dom',
            amd: 'react-dom',
            root: 'ReactDOM',
        },
        redux: {
            commonjs: 'redux',
            commonjs2: 'redux',
            amd: 'redux',
            root: 'Redux',
        },
        'react-redux': {
            commonjs: 'react-redux',
            commonjs2: 'react-redux',
            amd: 'react-redux',
            root: 'ReactRedux',
        },
        'react-bootstrap': {
            commonjs: 'react-bootstrap',
            commonjs2: 'react-bootstrap',
            amd: 'react-bootstrap',
            root: 'ReactBootstrap',
        },
        'prop-types': {
            commonjs: 'prop-types',
            commonjs2: 'prop-types',
            amd: 'prop-types',
            root: 'PropTypes',
        },
    },
};
