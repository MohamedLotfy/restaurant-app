const mongoose = require('mongoose');
const Review = mongoose.model('Review');

exports.addReview = async (req, res) => {
    console.log(typeof req.params.id);
    req.body.author = req.user._id;
    req.body.store = req.params.id;
    const review = new Review(req.body);
    await review.save();
    req.flash('success', 'Review Saved!');
    res.redirect('back');
}