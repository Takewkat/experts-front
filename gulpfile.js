import gulp from 'gulp';
import bs from 'browser-sync';
import pug from 'gulp-pug';
import sass from 'gulp-sass';
import csso from 'gulp-csso';
import postcss from 'gulp-postcss';
import hexrgba from 'postcss-hexrgba';
import autoprefixer from 'autoprefixer';
import customProperties from 'postcss-custom-properties';
import sourcemaps from 'gulp-sourcemaps';
import webpack from 'webpack-stream'
import webpackConfig from './webpack.config.js'
import named from 'vinyl-named';
import plumber from 'gulp-plumber';
import rename from 'gulp-rename';
import fontmin from 'gulp-fontmin';
import clean from 'gulp-clean';
import compress from 'compression';
import gutil from 'gulp-util';
import gulpif from 'gulp-if';

gutil.log = gutil.noop;

const env = process.env.NODE_ENV;
const devMode = env === 'development';

const paths = {
  source: 'src',
  build: 'dist',
  pages: 'src/pages',
  components: 'src/components',
  views: 'src/views',
  public: 'src/public',
  fonts: 'src/public/fonts',
  images: 'src/public/images',
  emails: 'src/emails'
};

const templates = (cb) => {
  return gulp
    .src(`${paths.views}/*.pug`)
    .pipe(plumber())
    .pipe(pug({ pretty: true }))
    .pipe(gulp.dest(paths.build))
    .pipe(bs.stream());
}

const styles = (cb) => {
  return gulp
    .src(`${paths.source}/*.sass`)
    .pipe(gulpif(devMode, sourcemaps.init()))
    .pipe(plumber())
    .pipe(sass())
    .pipe(csso())
    .pipe(postcss([hexrgba, customProperties, autoprefixer]))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulpif(devMode, sourcemaps.write('.')))
    .pipe(gulp.dest(`${paths.build}/css`))
    .pipe(bs.stream());
}

const js = (cb) => {
  return gulp
    .src(`${paths.source}/*.js`)
    .pipe(plumber())
    .pipe(named())
    .pipe(webpack(webpackConfig))
    .pipe(gulp.dest(`${paths.build}/js`))
    .pipe(bs.stream());
}

const watcher = () => {
  gulp.watch(`${paths.source}/**/*.pug`, templates);
  gulp.watch(`${paths.source}/**/*.sass`, styles);
  gulp.watch([`${paths.source}/**/*.js`, `!${paths.emails}/*.js`], js)
}

const serve = () => {
  bs.init({
    server: paths.build,
    open: false,
    ui: false,
    notify: false,
    middleware: (...args) => {
      const gzip = compress();
      gzip.apply(null, args);
    }
  });
}

const clear = () => {
  return gulp
    .src(paths.build)
    .pipe(clean())
}

const syncPublic = () => {
  return gulp
    .src(`${paths.public}/**`)
    .pipe(gulp.dest(paths.build));
}

const fonts = () => {
  return gulp
    .src(`${paths.fonts}/*.ttf`)
    .pipe(fontmin())
    .pipe(gulp.dest(`${paths.build}/fonts`));
};

export default gulp.parallel(
  serve,
  watcher
);

export const build = gulp.series(
  clear,
  syncPublic,
  fonts,
  templates,
  styles,
  js
);
