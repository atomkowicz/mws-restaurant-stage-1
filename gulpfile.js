const gulp = require('gulp'),
    $ = require('gulp-load-plugins')();

gulp.task('images', function() {
    return gulp.src('images/*.{jpg,png}').pipe($.responsive({
        '*.jpg': [{
            width: 128,
            rename: {
                suffix: '-128w'
            },
        }, {
            width: 400,
            rename: {
                suffix: '-400w'
            },
        }, {
            width: 500,
            rename: {
                suffix: '-500w'
            },
        }, {
            // Compress, strip metadata, and rename original image
            rename: {
                suffix: '-better-original'
            },
        }]
    }, {
        // Global configuration for all images
        // The output quality for JPEG, WebP and TIFF output formats
        quality: 70,
        // Use progressive (interlace) scan for JPEG and PNG output
        progressive: true,
        // Strip all metadata
        withMetadata: false,
    })).pipe(gulp.dest('img/dist'));
});

//https://stackoverflow.com/a/28460016
gulp.task('default', ['images']);