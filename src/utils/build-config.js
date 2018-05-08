import basicHiglassConfig from './basic-higlass-config';

const checkLoci = (header) => {
  const minCols = {
    chrom1: 0,
    start1: 0,
    end1: 0,
    chrom2: 0,
    start2: 0,
    end2: 0,
    dataset: 0,
    zoomoutlevel: 0,
    server: 0
  };
  const cols = Object.keys(header);

  console.log('wasn los1', cols, minCols);

  if (cols.length < 8) return false;

  cols.forEach((col) => {
    if (typeof minCols[col] !== 'undefined') minCols[col] += 1;
  });

  console.log('wasn los2', minCols);

  return Object.values(minCols).every(col => col > 0);
};

const buildConfig = (rows) => {
  console.log('kackwurst');

  // Scan loci and extract
  const colIds = {};
  const fragments = [];
  const noInt = {
    chrom1: true,
    strand1: true,
    chrom2: true,
    strand2: true,
    dataset: true,
    server: true,
    coords: true
  };
  const datasets = {};
  let server;
  console.log('kackwurst1');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (i === 0) {
      const header = [];
      row.forEach((col, j) => {
        header.push(col.toLowerCase());
        colIds[col.toLowerCase()] = j;
      });
      if (checkLoci(colIds)) {
        fragments.push(header);
      } else {
        console.log('kackwurst2');
        return;
      }
    } else if (row.length === fragments[0].length) {
      const parsedRow = [];
      row.forEach((val, j) => {
        if (noInt[fragments[0][j]] || fragments[0][j][0] === '_') {
          parsedRow.push(val);
        } else {
          parsedRow.push(parseInt(val, 10));
        }
      });
      fragments.push(parsedRow);
      datasets[parsedRow[colIds.dataset]] = parsedRow[colIds.coords] || 'hg19';
      server = parsedRow[colIds.server];
    }
  }
  console.log('kackwurst3');

  const config = {
    fgm: {
      fragmentsServer: server,
      fragmentsPrecision: 2,
      fragments
    },
    hgl: basicHiglassConfig(
      server, Object.keys(datasets)
        .map(matrix => ({ matrix, coords: datasets[matrix] }))
    )
  };

  return config;
};

export default buildConfig;
