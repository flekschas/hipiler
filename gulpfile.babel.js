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

const makeH = (increment = 0) => (text, level) => {
  const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');

  return `
<h${level + increment} id="${escapedText}" class="underlined anchored">
  <a href="#${escapedText}" class="hidden-anchor">
    <svg-icon icon-id="link"></svg-icon>
  </a>
  <span>${text}</span>
</h${level + increment}>
  `;
}

renderer.heading = makeH(1);

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
  file => file.path.slice(file.base.length).replace(/-/gi, ' ').slice(0, -5);


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
  .src(['wiki/**/*.md', '!wiki/_Sidebar.md'])
  .pipe(plumber())
  .pipe(marked(markedOptions))
  .pipe(modify({
    fileModifier: (file, contents) => `${makeH(0)(extractFileName(file), 1)}\n${contents}`
  }))
  .pipe(wrap('<div class="wiki-page"><%= contents %></div>'))
  .pipe(concat('wiki.html', { newLine: '\n' }))
  .pipe(wrap('<template>\n<require from="components/svg-icon/svg-icon"></require>\n<%= contents %>\n</template>'))
  .pipe(gulp.dest('assets/wiki'))
);


/*
 * -----------------------------------------------------------------------------
 * Task compiltions
 * -----------------------------------------------------------------------------
 */

gulp.task('default', gulp.series('clean', 'wiki'));
