import deepClone from './deep-clone';

const genes = {
  hg19: 'OHJakQICQD6gTD7skx4EWA',
  hg38: 'P0PLbQMwTYGy-5uPIQid7A',
  mm9: 'GUm5aBiLRCyz2PsBea7Yzg',
  mm10: 'QDutvmyiSrec5nX4pA5WGQ',
  danRer10: 'OwA1ouTzRamg5lOeDFUGIw'
};

const chroms = {
  hg19: 'N12wVGG9SPiTkk03yUayUw',
  hg38: 'NyITQvZsS_mOFNlz5C2LJg',
  mm9: 'WAVhNHYxQVueq6KulwgWiQ',
  mm10: 'EtrWT0VtScixmsmwFSd7zg',
  danRer10: 'Yl1IWCeVRI65yOEMvmpIZQ'
};

const baseTemplate = {
  editable: false,
  trackSourceServers: [
    '/api/v1'
  ],
  exportViewUrl: '<SERVER>/api/v1/viewconfs/',
  views: []
};

const viewTemplate = {
  uid: '<VIEW>',
  zoomFixed: true,
  chromInfoPath: '<SERVER>/api/v1/chrom-sizes/?id=<MATRIX>',
  tracks: {
    top: [
      {
        uid: '<VIEW>.1',
        type: 'horizontal-gene-annotations',
        tilesetUid: '<GENES>',
        server: '//higlass.io/api/v1',
        options: {
          minusStrandColor: '#999',
          plusStrandColor: '#999'
        }
      },
      {
        uid: '<VIEW>.2',
        chromInfoPath:
          '//higlass.io/api/v1/chrom-sizes/?id=<CHROMS>',
        type: 'horizontal-chromosome-labels'
      }
    ],
    left: [
      {
        uid: '<VIEW>.3',
        chromInfoPath:
          '//higlass.io/api/v1/chrom-sizes/?id=<CHROMS>',
        type: 'vertical-chromosome-labels'
      }
    ],
    center: [
      {
        uid: '<VIEW>.4',
        type: 'combined',
        contents: [
          {
            uid: '<VIEW>.5',
            server: '<SERVER>/api/v1',
            tilesetUid: '<MATRIX>',
            type: 'heatmap',
            options: {
              colorRange: ['#FFFFFF', '#ffed1a', '#ff5500', '#540000'],
              backgroundColor: 'white'
            }
          }
        ]
      }
    ]
  },
  layout: {
    w: 12,
    h: 12,
    x: 0,
    y: 0
  }
};

const basicHiglassConfig = (server, dataSets) => {
  const base = deepClone(baseTemplate);
  base.exportViewUrl = base.exportViewUrl
    .replace(/<SERVER>/g, server);

  base.views = dataSets.map((dataset, i) => {
    const view = deepClone(viewTemplate);

    view.uid = view.uid.replace(/<VIEW>/g, i);
    [
      ...view.tracks.top,
      ...view.tracks.left,
      ...view.tracks.center
    ].forEach((track) => {
      track.uid = track.uid.replace(/<VIEW>/g, i);
      if (track.type === 'combined') {
        track.contents.forEach((childTrack) => {
          childTrack.uid = childTrack.uid.replace(/<VIEW>/g, i);
        });
      }
    });

    view.chromInfoPath = view.chromInfoPath
      .replace(/<SERVER>/g, server)
      .replace(/<MATRIX>/g, dataset.matrix);

    view.tracks.top[0].tilesetUid = view.tracks.top[0].tilesetUid
      .replace(/<GENES>/g, genes[dataset.coords]);

    view.tracks.top[1].chromInfoPath = view.tracks.top[1].chromInfoPath
      .replace(/<CHROMS>/g, chroms[dataset.coords]);

    view.tracks.left[0].chromInfoPath = view.tracks.left[0].chromInfoPath
      .replace(/<CHROMS>/g, chroms[dataset.coords]);

    const centerTrack = view.tracks.center[0].contents[0];

    centerTrack.server = centerTrack.server
      .replace(/<SERVER>/g, server);

    centerTrack.tilesetUid = centerTrack.tilesetUid
      .replace(/<MATRIX>/g, dataset.matrix);

    view.layout.w = 12 / dataSets.length;
    view.layout.x = i * view.layout.w;

    return view;
  });

  return base;
};

export default basicHiglassConfig;
