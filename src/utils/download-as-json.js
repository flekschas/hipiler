const downloadAsJson = function (obj) {
  const json = encodeURIComponent(JSON.stringify(obj, null, 2));
  const data = `text/json;charset=utf-8,${json}`;
  const a = document.createElement('a');
  a.href = `data:${data}`;
  a.download = 'hipiler-piles.json';
  a.innerHTML = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
};

export default downloadAsJson;
