/* eslint-disable import/no-extraneous-dependencies */

import clean from 'gulp-clean';
import concat from 'gulp-concat';
import gulp from 'gulp';
import gulpUtil from 'gulp-util';
import marked from 'gulp-marked';
import modify from 'gulp-modify';
import notify from 'gulp-notify';
import order from 'gulp-order';
import plumber from 'gulp-plumber';
import rename from 'gulp-rename';
import wrap from 'gulp-wrap';

// Extend marked options
const renderer = new marked.marked.Renderer();

const makeH = (increment = 0) => (text, level) => {
  const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');

  return `
<h${level + increment} id="/docs/${escapedText}" class="underlined anchored">
  <a href="#/docs/${escapedText}" class="hidden-anchor">
    <svg-icon icon-id="link"></svg-icon>
  </a>
  <span>${text}</span>
</h${level + increment}>
  `;
};

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

let pageOrder = [];


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

// Parse wiki sidebar
gulp.task('sidebar', () => gulp
  .src('wiki/_Sidebar.md')
  .pipe(plumber())
  .pipe(modify({
    fileModifier: (file, contents) => {
      const lines = contents.split('\n');
      lines.forEach((line) => {
        if (line.slice(0, 3) === '**[') {
          const end = line.indexOf(']');
          if (end >= 0) {
            pageOrder.push(`**/${line.slice(3, end).replace(/ /gi, '-')}.md`);
          }
        }
      });
      return contents;
    }
  }))
  .pipe(marked(markedOptions))
  .pipe(rename((path) => {
    path.basename = 'sidebar';
  }))
  .pipe(gulp.dest('assets/wiki'))
);

// Parse wiki's markdown files
gulp.task('wiki', () => gulp
  .src(['wiki/**/*.md', '!wiki/_Sidebar.md'])
  .pipe(plumber())
  .pipe(order(pageOrder))
  .pipe(marked(markedOptions))
  .pipe(modify({
    fileModifier: (file, contents) => {
      let fileName = extractFileName(file);

      if (fileName === 'Home') {
        fileName = 'Getting Started';
      }

      const prefix = fileName.toLowerCase().replace(/ /gi, '-');

      // Add page-specific prefices to anchor links
      contents = contents.replace(/id="\/docs\//gi, `id="/docs/${prefix}/`);
      contents = contents.replace(/href="#\/docs\//gi, `href="#/docs/${prefix}/`);

      return `${makeH(0)(fileName, 1)}\n${contents}`;
    }
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

gulp.task('default', gulp.series('clean', 'sidebar', 'wiki'));
