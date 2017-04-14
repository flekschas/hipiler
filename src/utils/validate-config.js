export default function validateConfig (fgm, hgl) {
  try {
    return Object.keys(fgm).length || Object.keys(hgl).length;
  } catch (error) {
    return false;
  }
}
