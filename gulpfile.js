const gulp = require('gulp'),
$ = require('gulp-load-plugins')();

gulp.task('images', function() {
    return gulp.src('original_img/*.{jpg,png}').pipe($.responsive({
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
        }]
    }, {
        // Global configuration for all images
        quality: 70,
        progressive: true,
        withMetadata: false,
    })).pipe(gulp.dest('img/'));
});

gulp.task('default', ['images']);