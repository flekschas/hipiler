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

import config from './config.json';
import configLocal from './config.local.json';
import packageJson from './package.json';

// Flags
const production = gulpUtil.env.production;  // `--production`

// We need an extra object because the import creates a `default` property
const _config = {};

// Overwrite global with local settings
Object.assign(_config, config, configLocal);
Object.assign(_config, { version: packageJson.version });

console.log(_config);

if (production) {
  _config.debug = false;
  _config.testing = false;
}

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

// Cean
gulp.task('clean-dist', () => gulp
  .src('dist/*', { read: false })
  .pipe(plumber())
  .pipe(clean())
);

// Include config into the index.html
gulp.task('config', () => gulp
  .src('index.html')
  .pipe(plumber())
  .pipe(modify({
    fileModifier: (file, contents) => {
      contents = contents.replace(
        /window.hipilerConfig = .*/,
        `window.hipilerConfig = ${JSON.stringify(_config)};`
      );
      return contents;
    }
  }))
  .pipe(gulp.dest('.'))
);

// Extract hashes
gulp.task('hash', () => gulp
  .src([
    'dist/clusterfck-worker*',
    'dist/tsne-worker*'
  ])
  .pipe(plumber())
  .pipe(modify({
    fileModifier: (file, contents) => {
      const hash = file.path.slice(file.path.indexOf('worker') + 7, -3);

      if (file.path.indexOf('clusterfck') >= 0) {
        _config.workerClusterfckHash = hash;
      }

      if (file.path.indexOf('tsne') >= 0) {
        _config.workerTsneHash = hash;
      }

      return contents;
    }
  }))
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
  .pipe(modify({
    fileModifier: (file, contents) => {
      contents = contents.replace(
        /href="(.+)"/gi,
        (a, b) => `href="${b.toLowerCase().replace('#', '/')}"`
      );
      contents = contents.replace(/href="home/gi, 'href="getting-started');
      contents = contents.replace(/href="/gi, 'href="#/docs/');

      return contents;
    }
  }))
  .pipe(wrap('<template>\n<require from="components/svg-icon/svg-icon"></require>\n<aside class="sidebar">\n<%= contents %>\n</aside>\n</template>'))
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

gulp.task('index', gulp.series('hash', 'config'));

gulp.task('default', gulp.series('clean', 'sidebar', 'wiki'));
