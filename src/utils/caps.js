export default function caps (string, force) {
  if (force) {
    string = string.toLowerCase();
  }

  return string.charAt(0).toUpperCase() + string.slice(1);
}
