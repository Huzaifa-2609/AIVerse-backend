// src/utils/arrayUtils.js

/**
 * Groups an array of objects by a specified key.
 * @param {Array} array - The array to group.
 * @param {Function} keyFunction - Function that returns the key to group by.
 * @returns {Object} - An object where each key is a group, and the value is an array of objects in that group.
 */
function groupBy(array, keyFunction) {
  return array.reduce((result, currentItem) => {
    const groupKey = keyFunction(currentItem);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(currentItem);
    return result;
  }, {});
}

module.exports = {
  groupBy,
};
