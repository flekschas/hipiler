import * as Papa from 'papaparse';

const downloadAsCsv = function (arr) {
  const csv = Papa.unparse(arr);
  const data = `text/csv;charset=utf-8,${csv}`;
  const a = document.createElement('a');
  a.href = `data:${data}`;
  a.download = 'hipiler-piles.csv';
  a.innerHTML = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
};

export default downloadAsCsv;
