const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true
    },
    richDescription: {
        type: String,
        default: ''
    },
    images: [{
        type: String
    }],
    brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand',
        required:true
    },
    price : {
        type: Number,
        default:0
    },
    // category: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Category',
    //     required:true
    // },
    countInStock: {
        type: Number,
        required: true,
        min: 0,
        max: 255
    },
    reviews: [
        {
            user: {
                type: mongoose.Schema.ObjectId,
                ref: 'User',
                required: false // Making user field optional
            },
            name: {
                type: String,
                required: false // Making name field optional
            },
            ratings: {
                type: Number,
                required: true
            },
            comment: {
                type: String,
                required: true
            }
        }
    ],
    // ratings: {
    //     type: Number,
    //     default: 0,
    // },
    numReviews: {
        type: Number,
        default: 0,
    },
    isFeatured: {
        type: Boolean,
        default: false,
    },
    dateCreated: {
        type: Date,
        default: Date.now,
    },
})

productSchema.index({ name: 'text', description: 'text' });

productSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

productSchema.set('toJSON', {
    virtuals: true,
});

productSchema.methods.calculateAvgRating = function() {
    if (this.reviews.length === 0) return 0;

    const sumRatings = this.reviews.reduce((sum, review) => {
        return sum + review.ratings;
    }, 0);

    return sumRatings / this.reviews.length;
};



exports.Product = mongoose.model('Product', productSchema);
