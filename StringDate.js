const mongoose = require('mongoose');

module.exports = class StringDate extends mongoose.SchemaType {
    constructor(key, option) {
        super(key, option, 'StringDate');
    }
    cast(val) {
        let _val = new Date(val);
        if (isNaN(_val.getTime())) {
            throw new Error('StringDate: ' + val + 'is not a date');
        }
        return _val.toDateString();
    }
}