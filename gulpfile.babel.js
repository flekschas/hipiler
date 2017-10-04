/* eslint-disable import/no-extraneous-dependencies */

import clean from 'gulp-clean';
import concat from 'gulp-concat';
import gulp from 'gulp';
import gulpUtil from 'gulp-util';
import gulpIf from 'gulp-if';
import marked from 'gulp-marked';
import modify from 'gulp-modify';
import notify from 'gulp-notify';
import order from 'gulp-order';
import plumber from 'gulp-plumber';
import rename from 'gulp-rename';
import wrap from 'gulp-wrap';

import config from './config.json';
import packageJson from './package.json';

let configLocal = {};
try {
  configLocal = require('./config.local.json');  // eslint-disable-line global-require
} catch (e) {
  // Nothing
}

// Flags
let ghp = gulpUtil.env.ghp;  // `--ghp`, i.e., GitHub pages
let production = ghp || gulpUtil.env.production;  // `--production`

// We need an extra object because the import creates a `default` property
const _config = {};

// Overwrite global with local settings
Object.assign(_config, config, configLocal);
Object.assign(_config, { version: packageJson.version });

if (production) {
  _config.debug = false;
  _config.testing = false;
}

// Extend marked options
const renderer = new marked.marked.Renderer();

//
const anchorPrefix = ghp ? '' : '/docs/';
const anchorLinkPrefix = ghp ? '/docs/#' : '#/docs/';

const makeH = (increment = 0) => (text, level) => {
  const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');

  return `
<h${level + increment} id="${anchorPrefix}${escapedText}" class="underlined anchored">
  <a href="${anchorLinkPrefix}${escapedText}" class="hidden-anchor">
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

// Clean
gulp.task('clean', () => gulp
  .src('assets/wiki/*', { read: false })
  .pipe(plumber())
  .pipe(clean())
);

// Clean
gulp.task('clean-dist', () => gulp
  .src('dist/*', { read: false })
  .pipe(plumber())
  .pipe(clean())
);

// Clean
gulp.task('clean-ghp', () => gulp
  .src('ghp/*', { read: false })
  .pipe(plumber())
  .pipe(clean())
);

// Include config into the index.html
gulp.task('config', () => gulp
  .src('index.html')
  .pipe(plumber())
  .pipe(modify({
    fileModifier: (file, contents) => {
      if (ghp) {
        _config.ghp = true;
      }

      let insert = `window.hipilerConfig = ${JSON.stringify(_config)};`;

      if (ghp) {
        const base = '<base href="http://hipiler.higlass.io">';

        contents = contents.replace(/<!-- HiPiler: adjustments -->/, base);

        insert = '// Google Tag Manager\n' +  // eslint-disable-line prefer-template
          '(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":\n' +
          'new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],\n' +
          'j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src=\n' +
          '"https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);\n' +
          '})(window,document,"script","dataLayer","GTM-TWJKKPG");\n' +
          '// Google Analytics\n' +
          'var _gaq = _gaq || [];' +
          '_gaq.push(["_setAccount", "UA-72219228-4"]);' +
          '_gaq.push(["_trackPageview"]);' +
          '(function() {' +
          '  var ga = document.createElement("script"); ga.type = "text/javascript"; ga.async = true;' +
          '  ga.src = ("https:" == document.location.protocol ? "https://ssl" : "http://www") + ".google-analytics.com/ga.js";' +
          '  var s = document.getElementsByTagName("script")[0]; s.parentNode.insertBefore(ga, s);' +
          '})();' +
          '\n' + insert;
      }

      return contents.replace(/window.hipilerConfig = .*/, insert);
    }
  }))
  .pipe(gulpIf(ghp, gulp.dest('ghp/')))
  .pipe(gulpIf(!ghp, gulp.dest('./')))
);

// Copy to ghp
gulp.task('copy-ghp', () => gulp
  .src('favicon.ico')
  .pipe(plumber())
  .pipe(gulp.dest('ghp'))
);

// Copy to ghp
gulp.task('copy-ghp-assets', () => gulp
  .src('assets/**')
  .pipe(plumber())
  .pipe(gulp.dest('ghp/assets'))
);

// Copy to ghp
gulp.task('copy-ghp-dist', () => gulp
  .src('dist/*')
  .pipe(plumber())
  .pipe(gulp.dest('ghp/dist'))
);

// Set env for ghp
gulp.task('ghp-env', () => gulp
  .src('index.html')
  .pipe(plumber())
  .pipe(modify({
    fileModifier: (file, contents) => {
      ghp = true;
      production = true;
      _config.debug = false;
      _config.testing = false;

      return contents;
    }
  }))
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
          const start = line.indexOf('](');
          const end = line.indexOf(')');
          if (start >= 0 && end >= 0) {
            pageOrder.push(`**/${line.slice(start + 2, end).replace(/ /gi, '-')}.md`);
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
      contents = contents.replace(/href="/gi, `href="${anchorLinkPrefix}`);

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
      contents = contents.replace(/id="\/docs\//gi, `id="${anchorPrefix}${prefix}/`);
      contents = contents.replace(/href="#\/docs\//gi, `href="${anchorLinkPrefix}${prefix}/`);

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

gulp.task('index', gulp.series('hash', 'config'));

gulp.task('ghp', gulp.series('ghp-env', 'clean-ghp', 'index', 'copy-ghp', 'copy-ghp-assets', 'copy-ghp-dist'));
