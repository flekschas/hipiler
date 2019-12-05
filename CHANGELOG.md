### [v1.4.0](https://github.com/higlass/higlass/compare/v1.3.1...v1.4.0)

- Update to HiGlass `v1.7.2`
- Add support for cooler v2
- Add support for dm6 and ce11 gene annotations
- Use file specific chrom sizes when internal chrom sizes are not available
- Allow specifiying custom gene annotations via the `_gene_annotations` column in the CSV config file. `_gene_annotations` can either be the name of a preexisting coords (e.g., `hg19`, `hg38`, `mm9`, `mm10`, `dm6`, `danRer10`, or `ce11`) or you can specify the tileset UUID of a locally hosted gene annotation tileset.
- Fix an bug causing the spinner to appear all the time

**Breaking Change:**
- HiPiler now expects you to specify the exact chromosome names. Previously it would ensure that `chr` is prepend for convenience when working with hg19 and mm9

### [v1.3.1](https://github.com/higlass/higlass/compare/v1.3.0...v1.3.1)

- Update to HiGlass `v1.2.3`
- Fix minor code style issues

### [v1.3.0](https://github.com/higlass/higlass/compare/v1.2.0...v1.3.0)

- Add support for CSV import
- Add dynamic reloading of the snippets.
- Updated HiGlass to `v1.0.1`
- Updated lots of third-party libraries
- Fixed several smaller bug fixes

### [v1.2.0](https://github.com/higlass/higlass/compare/v1.1.7...v1.2.0)

- Add color maps and color scaling for snippets
- Show pile source and genomic location in pile detail panel
- Updated HiGlass to `v0.10.11`
- Updated lots of third-party libraries
- Updated news
- Load `react`, `react-dom`, `react-bootstrap`, and `pixi.js` from CDN

### [v1.1.7](https://github.com/higlass/higlass/compare/v1.1.6...v1.1.7)

- Add build task for the entire app for easier integration with HiGlass docker

### [v1.1.6](https://github.com/higlass/higlass/compare/v1.1.5...v1.1.6)

- Updated `marked` to `v0.3.9`

### [v1.1.5](https://github.com/higlass/higlass/compare/v1.1.4...v1.1.5)

- Finally fixed anchor links on hipiler.higlass.io
- Fix typos

### [v1.1.4](https://github.com/higlass/higlass/compare/v1.1.3...v1.1.4)

- Add slides from speakerdeck to about
- Fix typos

### [v1.1.3](https://github.com/higlass/higlass/compare/v1.1.2...v1.1.3)

- Update news
- Fix view config loading
- Disable buggy server pinging
- Fix anchor links on hipiler.higlass.io

### [v1.1.2](https://github.com/higlass/higlass/compare/v1.1.1...v1.1.2)

- Adjust anchor links on hipiler.higlass.io

### [v1.1.1](https://github.com/higlass/higlass/compare/v1.1.0...v1.1.1)

- Limit height and width of entries in the pile details panel
- Limit number of marks on the x axis of chartlets
- Limit height of the previews in the pile details panel
- Fix a rare issue with rerendering chartlets
- Updated hiGlass to `v0.8.34`
- Updated some third party librabries

### [v1.1.0](https://github.com/higlass/higlass/compare/v1.1.1...v1.1.0)

- Improve frame rendering performance dramatically
- Improve scale and location updates of snippets to be blazing fast
- Add pile details panel with annotations
- Add support for loading configs via the URL `?config=<URL_TO_CONFIG>`
- Allow config to be more flexible
- Disable state compression because it's too slow
- Nicefy disperse animation when doing _undo_
- Ensure compatability in latest version of Firefox
- Add link to HiGlass.io
- Fix minor issue with the arrange field
- Fix auot-piling by more categorical values (dataset, zoom level, chromosome, or a user-specified category)
- Add button to explicitely close error messages
- Fix scrolling in Firefox

### [v1.0.0](https://github.com/higlass/higlass/compare/v1.3.1...v1.4.0)

- 5-10x faster snippet rendering
- Implement removing matrices from piles
- Highlight hovered preview
- Update pile menu instantly
- Add log transform for snippets
- Add config options for t-SNE
- Fix matrix flipping
- Fix scroll issue after changing the cell size
- Fix dialog during exploration
- Fix t-SNE based arrangements by measures / attributes
- Fix bug when switching between grey scale and colored colormaps
- Fix bug when toggling between showing snippet locations
- Fix dialog
- Fix orientation
- Fix state reset (truly working this time!)

### [v1.0.0](https://github.com/higlass/higlass/compare/v1.3.1...v1.4.0)

- Add support for loading unbalanced snippets
- Add introduction video
- Add 2 more examples
- Add changelog
- Enhance "Show in matrix"
- Fix a column resizing caused by a bug in Aurelia
- Fix state reset
- Fix bug when pulling non-standard snippets

### [v1.0.0](https://github.com/higlass/higlass/compare/v1.3.1...v1.4.0)

- Update HiGlass
- Update third-party libraries
- Add support for HiDPI displays
- Fix interaction issues
- Scope CSS rules

### [v1.0.0](https://github.com/higlass/higlass/compare/v1.3.1...v1.4.0)

- Fix import bug
- Always load latest example from GIST

### [v1.0.0](https://github.com/higlass/higlass/compare/v1.3.1...v1.4.0)

- Add documentation
- Update icons
- Minor design updates
- Enable shortcuts for the dialog

### [v1.0.0](https://github.com/higlass/higlass/compare/v1.3.1...v1.4.0)

- Code cleanup
- Design landing page

### [v1.0.0](https://github.com/higlass/higlass/compare/v1.3.1...v1.4.0)

- Lower memory footprint
- Support Numpy's NaN mean
- Fix event listener bugs
- Update third-party libraries
- Update license
- Integrate Travis-CI

### [v1.0.0](https://github.com/higlass/higlass/compare/v1.3.1...v1.4.0)

- Initial pre-release for IEEE VIS 2017
