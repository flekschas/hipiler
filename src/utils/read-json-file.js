/**
 * Read a loaded JSON file.
 *
 * @param {object} file - File object to be read.
 * @return {object} JS object.
 */
export default function (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', (event) => {
      let json;

      try {
        json = JSON.parse(event.target.result);
      } catch (e) {
        reject(e);
      }

      resolve(json);
    });

    reader.readAsText(file);
  });
}
