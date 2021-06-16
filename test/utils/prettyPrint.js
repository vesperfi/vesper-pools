'use strict'

module.exports = function (data) {
    const object = {}
    Object.entries(data).forEach(function ([key, value]) {
        if (/^[^\d]*$/.test(key)) {
            object[key] = value.toString()
        }
    })
    // eslint-disable-next-line
    console.log(object)
}
