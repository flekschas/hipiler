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

  if (cols.length < 8) return false;

  cols.forEach((col) => {
    if (typeof minCols[col] !== 'undefined') minCols[col] += 1;
  });

  return Object.values(minCols).every(col => col > 0);
};

const buildConfig = (rows) => {
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
        return;
      }
    } else if (row.length === fragments[0].length) {
      const parsedRow = [];
      row.forEach((val, j) => {
        if (noInt[fragments[0][j]] || fragments[0][j][0] === '_') {
          parsedRow.push(val);
        } else {
          parsedRow.push(+val);
        }
      });
      fragments.push(parsedRow);
      datasets[parsedRow[colIds.dataset]] = {
        coords: parsedRow[colIds.coords] || 'hg19',
        geneAnnotations: parsedRow[colIds._gene_annotations]
      };
      server = parsedRow[colIds.server];
    }
  }

  const config = {
    fgm: {
      fragmentsServer: server,
      fragmentsPrecision: 2,
      fragments
    },
    hgl: basicHiglassConfig(
      server, Object.keys(datasets)
        .map(matrix => ({ matrix, ...datasets[matrix] }))
    )
  };

  return config;
};

export default buildConfig;
