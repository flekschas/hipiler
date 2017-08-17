const getUrlQueryParams = (url) => {
  if (!url) { return {}; }

  return (/^[?#]/.test(url) ? url.slice(1) : url)
    .split('&')
    .reduce((params, param) => {
      const [key, value] = param.split('=');
      params[key] = value ? decodeURIComponent(value.replace(/\+/g, ' ')) : '';
      return params;
    }, {});
};

export default getUrlQueryParams;
