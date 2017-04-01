export default function ping (host) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => { resolve(); };
    img.onerror = () => { resolve(); };
    img.src = `${host}?cachebreaker=${Date.now()}`;

    setTimeout(() => {
      reject(Error('Server not available'));
    }, 1500);
  });
}
