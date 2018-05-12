'use strict';

import path from 'path';
import gulp from 'gulp';
import del from 'del';
import runSequence from 'run-sequence';
import browserSync from 'browser-sync';
import swPrecache from 'sw-precache';
import gulpLoadPlugins from 'gulp-load-plugins';
import { output as pagespeed } from 'psi';
import pkg from './package.json';
import imageminPngquant from 'imagemin-pngquant';
import imageminGiflossy from 'imagemin-giflossy';
import imageminMozjpeg from 'imagemin-mozjpeg';
import imageminZopfli from 'imagemin-zopfli';
import imageminSvgo from 'imagemin-svgo';
import imageminJpegtran from 'imagemin-jpegtran';
import webpack from 'webpack-stream';

const $ = gulpLoadPlugins();
const reload = browserSync.reload;

// Optimize images
gulp.task('images', () =>
    gulp.src('app/img/**/*')
        .pipe($.cache($.imagemin({
            progressive: true,
            interlaced: true,
            use: [
                //png
                imageminPngquant({
                    speed: 1,
                    quality: 98 //lossy settings
                }),
                imageminZopfli({
                    more: true
                }),
                //gif
                // imagemin.gifsicle({
                //     interlaced: true,
                //     optimizationLevel: 3
                // }),
                //gif very light lossy, use only one of gifsicle or Giflossy
                imageminGiflossy({
                    optimizationLevel: 3,
                    optimize: 3, //keep-empty: Preserve empty transparent frames
                    lossy: 2
                }),
                //svg
                imageminSvgo({
                    plugins: [{
                        removeViewBox: false
                    }]
                }),
                //jpg lossless
                imageminJpegtran({
                    progressive: true
                }),
                //jpg very light lossy, use vs jpegtran
                imageminMozjpeg({
                    quality: 90
                })
            ]
        })))
        .pipe(gulp.dest('dist/img'))
        .pipe($.size({ title: 'images' }))
);

// Copy all files at the root level (app)
gulp.task('copy', () =>
    gulp.src([
        'app/*',
        'app/data/*',
        '!app/*.html',
        '!app/original_img',
    ], {
            dot: true
        }).pipe(gulp.dest('dist'))
        .pipe($.size({ title: 'copy' }))
);

// Compile and automatically prefix stylesheets
gulp.task('styles', () => {
    const AUTOPREFIXER_BROWSERS = [
        'last 2 versions'
    ];

    // For best performance, don't add Sass partials to `gulp.src`
    return gulp.src([
        'app/styles/**/*.scss',
        'app/styles/**/*.css'
    ])
        .pipe($.newer('.tmp/scss'))
        .pipe($.sourcemaps.init())
        .pipe($.sass({
            precision: 10
        }).on('error', $.sass.logError))
        .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
        .pipe(gulp.dest('.tmp/styles'))
        // Concatenate and minify styles
        .pipe($.if('*.css', $.cssnano()))
        .pipe($.size({ title: 'styles' }))
        .pipe($.sourcemaps.write('./'))
        .pipe(gulp.dest('dist/styles'))
        .pipe(gulp.dest('.tmp/styles'));
});

// Concatenate and minify JavaScript. Transpiles ES2015 code to ES5.
// see `.babelrc` file.
// gulp.task('scripts', () =>
//     gulp.src('./app/scripts/**/*.js')
//         .pipe($.newer('.tmp/scripts'))
//         .pipe($.sourcemaps.init())
//         .pipe($.babel())
//         .pipe($.sourcemaps.write())
//         .pipe(gulp.dest('.tmp/scripts'))
//         .pipe($.concat('main.min.js'))
//         .pipe($.uglify({ preserveComments: 'some' }))
//         // Output files
//         .pipe($.size({ title: 'scripts' }))
//         .pipe($.sourcemaps.write('.'))
//         .pipe(gulp.dest('dist/scripts'))
//         .pipe(gulp.dest('.tmp/scripts'))
// );

gulp.task('scripts', () =>
    gulp.src('./app/scripts/main.js')
    .pipe(webpack({
      output: {
        filename: '[name].js'
      },
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /(node_modules|bower_components)/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: ['env']
              }
            }
          }
        ]
      },
      devtool: '#inline-source-map'
    }))
    .pipe(gulp.dest('.tmp/scripts'))
    .pipe($.sourcemaps.init({ loadMaps: true }))
    .pipe($.uglify())
    .pipe($.rename('main.min.js'))
    // Output files
    .pipe($.size({title: 'scripts'}))
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('dist/scripts'))
    .pipe(gulp.dest('.tmp/scripts'))
);

// Scan your HTML for assets & optimize them
gulp.task('html', () => {
    return gulp.src('app/**/*.html')
        .pipe($.useref({
            searchPath: '{.tmp,app}',
            noAssets: true
        }))

        // Minify any HTML
        .pipe($.if('*.html', $.htmlmin({
            removeComments: true,
            collapseWhitespace: true,
            collapseBooleanAttributes: true,
            removeAttributeQuotes: true,
            removeRedundantAttributes: true,
            removeEmptyAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            removeOptionalTags: true
        })))
        // Output files
        .pipe($.if('*.html', $.size({ title: 'html', showFiles: true })))
        .pipe(gulp.dest('dist'));
});


// Clean output directory
gulp.task('clean', () => del(['.tmp', 'dist/*', '!dist/.git'], { dot: true }));

// Watch files for changes & reload
gulp.task('serve', ['scripts', 'styles'], () => {
    browserSync({
        notify: false,
        // Customize the Browsersync console logging prefix
        logPrefix: 'WSK',
        // Allow scroll syncing across breakpoints
        scrollElementMapping: ['main', '.mdl-layout'],
        // Run as an https by uncommenting 'https: true'
        // Note: this uses an unsigned certificate which on first access
        //       will present a certificate warning in the browser.
        // https: true,
        server: ['.tmp', 'app'],
        port: 3000
    });

    gulp.watch(['app/**/*.html'], reload);
    gulp.watch(['app/styles/**/*.{scss,css}'], ['styles', reload]);
    gulp.watch(['app/scripts/**/*.js'], ['scripts', reload]);
    gulp.watch(['app/images/**/*'], reload);
});


// Build and serve the output from the dist build
gulp.task('serve:dist', ['default'], () =>
    browserSync({
        notify: false,
        logPrefix: 'WSK',
        // Allow scroll syncing across breakpoints
        scrollElementMapping: ['main', '.mdl-layout'],
        // Run as an https by uncommenting 'https: true'
        // Note: this uses an unsigned certificate which on first access
        //       will present a certificate warning in the browser.
        // https: true,
        server: 'dist',
        port: 3001
    })
);

// Build production files, the default task
gulp.task('default', ['clean'], cb =>
    runSequence(
        'styles',
        ['html', 'scripts', 'images', 'copy'],
        'generate-service-worker',
        cb
    )
);

// Run PageSpeed Insights
gulp.task('pagespeed', cb =>
    // Update the below URL to the public URL of your site
    pagespeed('example.com', {
        strategy: 'mobile'
        // By default we use the PageSpeed Insights free (no API key) tier.
        // Use a Google Developer API key if you have one: http://goo.gl/RkN0vE
        // key: 'YOUR_API_KEY'
    }, cb)
);

// Copy over the scripts that are used in importScripts as part of the generate-service-worker task.
gulp.task('copy-sw-scripts', () => {
    return gulp.src(['node_modules/sw-toolbox/sw-toolbox.js', 'app/scripts/sw/runtime-caching.js'])
        .pipe(gulp.dest('dist/scripts/sw'));
});

gulp.task('generate-responsive-images', function () {
    return src('app/original_img/*.{jpg,png}').pipe($.responsive({
        '*.jpg': [{
            width: 250,
            rename: {
                suffix: '-mobile'
            },
        }, {
            width: 270,
            rename: {
                suffix: '-desk'
            },
        }, {
            width: 800
        }]
    }, {
            // Global configuration for all images
            quality: 100,
            progressive: true,
            withMetadata: false,
        })).pipe(dest('app/img/'));
});

// See http://www.html5rocks.com/en/tutorials/service-worker/introduction/ for
// an in-depth explanation of what service workers are and why you should care.
// Generate a service worker file that will provide offline functionality for
// local resources. This should only be done for the 'dist' directory, to allow
// live reload to work as expected when serving from the 'app' directory.
gulp.task('generate-service-worker', ['copy-sw-scripts'], () => {
    const rootDir = 'dist';
    const filepath = path.join(rootDir, 'service-worker.js');

    return swPrecache.write(filepath, {
        // Used to avoid cache conflicts when serving on localhost.
        cacheId: pkg.name || 'web-starter-kit',
        // sw-toolbox.js needs to be listed first. It sets up methods used in runtime-caching.js.
        importScripts: [
            'scripts/sw/sw-toolbox.js',
            'scripts/sw/runtime-caching.js'
        ],
        staticFileGlobs: [
            // Add/remove glob patterns to match your directory setup.
            `${rootDir}/images/**/*`,
            `${rootDir}/scripts/**/*.js`,
            `${rootDir}/styles/**/*.css`,
            `${rootDir}/*.{html,json}`
        ],
        // Translates a static file path to the relative URL that it's served from.
        // This is '/' rather than path.sep because the paths returned from
        // glob always use '/'.
        stripPrefix: rootDir + '/'
    });
});
