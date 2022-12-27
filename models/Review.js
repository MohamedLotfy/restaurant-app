const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const reviewSchema = new mongoose.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: 'Please supply the author of the review'
    },
    store: {
        type: mongoose.Schema.ObjectId,
        ref: 'Store',
        required: 'Please associate the review with a store'
    },
    text: {
        type: String,
        required: 'A review must have text'
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    }
});

function autoPopulate(next) {
    this.populate('author');
    next();
}

reviewSchema.pre('find', autoPopulate);
reviewSchema.pre('findOne', autoPopulate);

module.exports = mongoose.model('Review', reviewSchema);