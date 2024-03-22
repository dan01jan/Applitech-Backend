const mongoose = require('mongoose');

const brandSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true
    },
    images: [{
        type: String
    }],
    dateCreated: {
        type: Date,
        default: Date.now,
    },
})

brandSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

brandSchema.set('toJSON', {
    virtuals: true,
});


exports.Brand = mongoose.model('Brand', brandSchema);
