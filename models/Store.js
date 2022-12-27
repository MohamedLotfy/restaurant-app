const mongoose = require('mongoose');
const slug = require('slugs');
mongoose.Promise = global.Promise;

const storeSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: 'Please enter the store name!'
    },
    slug: String,
    description: {
        type: String,
        trim: true
    },
    tags: [String],
    created: {
        type: Date,
        default: Date.now()
    },
    location: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: [{
            type: Number,
            required: 'Please supply coordinates'
        }],
        address: {
            type: String,
            required: 'Please supply an address'
        }
    },
    photo: String,
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: 'Please supply a user'
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Defining our indexes
storeSchema.index({
    name: 'text',
    description: 'text'
});

storeSchema.index({ location: '2dsphere' });

storeSchema.pre('save', async function (next) {
    if (!this.isModified('name')) {
        return next();
    }
    this.slug = slug(this.name);
    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
    const stores = await this.constructor.find({ slug: slugRegEx });
    if (stores.length) {
        this.slug = `${this.slug}-${stores.length + 1}`;
    }
    next();
});

storeSchema.pre('findOneAndUpdate', async function (next) {
    const { _update: doc, model } = this;
    doc.slug = slug(doc.name);
    console.log(typeof doc.slug);
    const slugRegEx = new RegExp(`^(${doc.slug})((-[0-9]*$)?)$`, 'i');
    console.log(slugRegEx);
    const stores = await model.find({ slug: slugRegEx });
    if (stores.length) {
        doc.slug = `${doc.slug}-${stores.length + 1}`;
    }
    next();
});

storeSchema.statics.getTagsList = function () {
    return this.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
};

storeSchema.statics.getTopStores = function () {
    return this.aggregate([
        {
            $lookup: {
                from: 'reviews',
                localField: '_id',
                foreignField: 'store',
                as: 'reviews'
            }
        },
        {
            $match: {
                'reviews.1': { $exists: true }
            }
        },
        {
            $addFields: {
                averageRating: { $avg: '$reviews.rating' }
            }
        },
        {
            $sort: { averageRating: -1 }
        },
        {
            $limit: 10
        }
    ]);
}

storeSchema.virtual('reviews', {
    ref: 'Review',
    localField: '_id',
    foreignField: 'store'
});

function autoPopulate(next) {
    this.populate('reviews');
    next();
}

storeSchema.pre('find', autoPopulate);
storeSchema.pre('findOne', autoPopulate);

module.exports = mongoose.model('Store', storeSchema);