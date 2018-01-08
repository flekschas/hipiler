**v1.1.7** - 2018-01-08

- Add build task for the entire app for easier integration with HiGlass docker

**v1.1.6** - 2018-01-07

- Updated `marked` to `v0.3.9`

**v1.1.5** - 2017-10-09

- Finally fixed anchor links on hipiler.higlass.io
- Fix typos

**v1.1.4** - 2017-10-09

- Add slides from speakerdeck to about
- Fix typos

**v1.1.3** - 2017-10-08

- Update news
- Fix view config loading
- Disable buggy server pinging
- Fix anchor links on hipiler.higlass.io

**v1.1.2** - 2017-10-04

- Adjust anchor links on hipiler.higlass.io

**v1.1.1** - 2017-09-06

- Limit height and width of entries in the pile details panel
- Limit number of marks on the x axis of chartlets
- Limit height of the previews in the pile details panel
- Fix a rare issue with rerendering chartlets
- Updated hiGlass to `v0.8.34`
- Updated some third party librabries

**v1.1.0** - 2017-08-17

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

**v1.0.0** - 2017-07-16

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

**v1.0.0-beta7** - 2017-06-09

- Add support for loading unbalanced snippets
- Add introduction video
- Add 2 more examples
- Add changelog
- Enhance "Show in matrix"
- Fix a column resizing caused by a bug in Aurelia
- Fix state reset
- Fix bug when pulling non-standard snippets

**v1.0.0-beta6** - 2017-05-23

- Update HiGlass
- Update third-party libraries
- Add support for HiDPI displays
- Fix interaction issues
- Scope CSS rules

**v1.0.0-beta5** - 2017-04-21

- Fix import bug
- Always load latest example from GIST

**v1.0.0-beta4** - 2017-04-20

- Add documentation
- Update icons
- Minor design updates
- Enable shortcuts for the dialog

**v1.0.0-beta3** - 2017-04-20

- Code cleanup
- Design landing page

**v1.0.0-beta2** - 2017-04-12

- Lower memory footprint
- Support Numpy's NaN mean
- Fix event listener bugs
- Update third-party libraries
- Update license
- Integrate Travis-CI

**v1.0.0-beta1** - 2017-04-06

- Initial pre-release for IEEE VIS 2017
