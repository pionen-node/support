const gulp = require('gulp');
gulp.plugins = {
  babel: require('gulp-babel'),
  babili: require('gulp-babili'),
};

gulp.task('compile', () => (
  gulp.src([
    '!node_modules/',
    '!node_modules/**/*',
    '**/*.js',
  ], {base: './'})
    .pipe(gulp.plugins.babel())
    .pipe(gulp.plugins.babili({
      mangle: {
        keepClassNames: true,
      },
    }))
    .pipe(gulp.dest('.'))
));

gulp.task('default', ['compile']);