import deepClone from './deep-clone';

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
  autocompleteSource:
    'http://higlass.io/api/v1/suggest/?d=OHJakQICQD6gTD7skx4EWA&',
  chromInfoPath: '<SERVER>/api/v1/chrom-sizes/?id=<DATASET>',
  tracks: {
    top: [
      {
        uid: '<VIEW>.1',
        type: 'horizontal-gene-annotations',
        tilesetUid: 'OHJakQICQD6gTD7skx4EWA',
        server: 'http://higlass.io/api/v1',
        options: {
          minusStrandColor: '#999',
          plusStrandColor: '#999'
        }
      },
      {
        uid: '<VIEW>.2',
        chromInfoPath:
          'http://higlass.io/api/v1/chrom-sizes/?id=N12wVGG9SPiTkk03yUayUw',
        type: 'horizontal-chromosome-labels'
      }
    ],
    left: [
      {
        uid: '<VIEW>.3',
        chromInfoPath:
          'http://higlass.io/api/v1/chrom-sizes/?id=N12wVGG9SPiTkk03yUayUw',
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
            tilesetUid: '<DATASET>',
            type: 'heatmap',
            options: {
              colorRange: ['#FFFFFF', '#ffed1a', '#ff5500', '#540000']
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
      .replace(/<DATASET>/g, dataset);

    const centerTrack = view.tracks.center[0].contents[0];

    centerTrack.server = centerTrack.server
      .replace(/<SERVER>/g, server);

    centerTrack.tilesetUid = centerTrack.tilesetUid
      .replace(/<DATASET>/g, dataset);

    view.layout.w = 12 / dataSets.length;
    view.layout.x = i * view.layout.w;

    return view;
  });

  return base;
};

export default basicHiglassConfig;
