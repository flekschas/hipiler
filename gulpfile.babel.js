/* eslint-disable import/no-extraneous-dependencies */

import clean from 'gulp-clean';
import concat from 'gulp-concat';
import gulp from 'gulp';
import gulpUtil from 'gulp-util';
import marked from 'gulp-marked';
import modify from 'gulp-modify';
import notify from 'gulp-notify';
import plumber from 'gulp-plumber';
import runSequence from 'run-sequence';
import wrap from 'gulp-wrap';

// Extend marked options
const renderer = new marked.marked.Renderer();

renderer.heading = (text, level) => {
  const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');

  return `
<h${level} id="${escapedText}" class="underlined anchored">
  <a href="#${escapedText}" class="hidden-anchor">
    <svg class="icon">
      <use
        xmlns:xlink="http://www.w3.org/1999/xlink"
        xlink:href="../assets/images/icons.svg#link"></use>
    </svg>
  </a>
  <span>${text}</span>
</h${level + 1}>
  `;
};

const markedOptions = {};
Object.assign(markedOptions, { renderer });


/*
 * -----------------------------------------------------------------------------
 * Config & Helpers
 * -----------------------------------------------------------------------------
 */

// Make sure that we catch errors for every task
const gulpSrc = gulp.src;
gulp.src = (...args) => gulpSrc
  .apply(gulp, args)
  .pipe(plumber(function errHandler (error) {
    // Error Notification
    notify.onError({
      title: `Error: ${error.plugin}`,
      message: `${error.plugin} is complaining.`,
      sound: 'Funk'
    })(error);

    // Output an error message
    gulpUtil.log(
      gulpUtil.colors.red(
        `Error (${error.plugin}): ${error.message}`
      )
    );

    // Emit the end event, to properly end the task
    this.emit('end');
  }));

const extractFileName =
  file => file.path.slice(file.base.length).replace(/-/gi, ' ').slice(0, -3);


/*
 * -----------------------------------------------------------------------------
 * Tasks
 * -----------------------------------------------------------------------------
 */

// Cean
gulp.task('clean', () => gulp
  .src('assets/wiki/*', { read: false })
  .pipe(plumber())
  .pipe(clean())
);

// Parse wiki's markdown files
gulp.task('wiki', () => gulp
  .src('wiki/**/*.md')
  .pipe(plumber())
  .pipe(modify({
    fileModifier: (file, contents) => `# ${extractFileName(file)}\n${contents}`
  }))
  .pipe(marked(markedOptions))
  .pipe(wrap('<div class="wiki-page"><%= contents %></div>'))
  .pipe(concat('wiki.html', { newLine: '\n' }))
  .pipe(gulp.dest('assets/wiki'))
);


/*
 * -----------------------------------------------------------------------------
 * Task compiltions
 * -----------------------------------------------------------------------------
 */

gulp.task('default', gulp.series('clean', 'wiki'));
