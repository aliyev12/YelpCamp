const express = require('express'),
    router = express.Router({mergeParams: true}),
    Review = require('../models/review'),
    Campground = require('../models/campground'),
    middleware = require('../middleware/index');

/*==========================================*/
// INDEX
router.get('/', (req, res) => {
    Campground.findById(req.params.id)
        .populate({
            path: 'reviews',
            options: {
                sort: {
                    createdAt: -1
                }
            }, // sorting the populated reviews array to show the latest first
        })
        .exec((err, campground) => {
            if (err || !campground) {
                // Error - campground not found
                req.flash('error', 'Campground not found (Error code: RR-01)');
                res.redirect('/campgrounds');
            } else {
                res.render('reviews/index', {
                    campground
                });
            }
        });
});

/*==========================================*/
// NEW                          
router.get('/new', middleware.isLoggedIn, middleware.checkReviewExistence, (req, res) => {
    Campground.findById(req.params.id, (err, campground) => {
        if (err || !campground) {
            // Error - campground not found
            req.flash('error', 'Campground not found (Error code: RR-02)');
            res.redirect('/campgrounds');
        } else {
            res.render('reviews/new', {
                campground
            });
        }
    });
});


/*==========================================*/
// CREATE
router.post('/', middleware.isLoggedIn, middleware.checkReviewExistence, (req, res) => {
    Campground.findById(req.params.id).populate(
        'reviews'
    ).exec((err, campground) => {
        if (err || !campground) {
            // Error - campground not found
            req.flash('error', 'Campground not found (Error code: A-03)');
            res.redirect('/campgrounds');
        } else {
            Review.create(req.body.review, (err, review) => {
                if (err || !review) {
                    // Error while creating review
                    req.flash('error', err.message);
                    res.redirect('back');
                } else {
                    //add author username/id and associated campground to the review
                    review.author.id = req.user._id;
                    review.author.username = req.user.username;
                    review.campground = campground;
                    // save review
                    review.save();
                    campground.reviews.push(review);
                    // calculate the new average review for the campground
                    campground.rating = calculateAverage(campground.reviews);
                    // save campground
                    campground.save();
                    req.flash('success', 'Your review has been successfully added.');
                    res.redirect(`/campgrounds/${campground._id}`);
                }
            });
        }
    });
});


/*==========================================*/
// EDIT
router.get('/:review_id/edit', middleware.checkReviewOwnership, (req, res) => {
    Review.findById(req.params.review_id, (err, foundReview) => {
        if (err) {
            req.flash('error', err.message);
            res.redirect('back');
        } else {
            res.render('reviews/edit', {
                campground_id: req.params.id,
                review: foundReview,
            });
        }
    });
});


/*==========================================*/
// UPDATE
router.put('/:review_id', middleware.checkReviewOwnership, (req, res) => {
    Review.findByIdAndUpdate(req.params.review_id, req.body.review, {
        new: true
    }, (err, updatedReview) => {
        if (err || !updatedReview) {
            req.flash('error', err.message);
            res.redirect('back');
        } else {
            Campground.findById(req.params.id).populate('reviews').exec((err, campground) => {
                if (err || !campground) {
                    req.flash('error', err.message);
                    res.redirect('back');
                } else {
                    // Recalculate campground average
                    campground.rating = calculateAverage(campground.reviews);
                    // Save changes
                    campground.save();
                    req.flash('success', 'Your review was successfully edited.');
                    res.redirect(`/campgrounds/${campground._id}`);
                }
            });
        }
    });
});


/*==========================================*/
// DELETE
// When delete request with review id in params comes in, run middleware to check ownership, then exec callback
router.delete('/:review_id', middleware.checkReviewOwnership, (req, res) => {
    // First, find and remove the review
    Review.findByIdAndRemove(req.params.review_id, (err) => {
        if (err) {
            req.flash('error', err.message);
            req.redirect('back');
        } else {
            // Next, update campground that still has a reference ID of deleted review
            // Instead of passing an updated object as a second argument, you can pass a mongo $pull querry
            Campground.findByIdAndUpdate(req.params.id, {
                // $pull will delete campground.reviews that has ID that matches what ever is review_id in params of URL
                $pull: {
                    reviews: req.params.review_id
                }
            }, {
                // Next, you specify {new: true} to return a modified campground instead of old one which is default
                new: true
                // Then, populate the updated campground with all the reviews by matching stored object IDs with reviews
            }).populate('reviews').exec((err, campground) => {
                if (err || !campground) {
                    // If there is an error or campground returns as null, hanle error
                    req.flash('error', err.message);
                    // Redirect back to campgrounds page
                    res.redirect('/campgrounds');
                } else {
                    // Recalculate campground average
                    campground.rating = calculateAverage(campground.reviews);
                    // Save changes for campground
                    campground.save();
                    // Display success message to the user
                    req.flash('success', 'Your review was successfully deleted.');
                    // Redirect to that updated campground's page
                    res.redirect(`/campgrounds/${req.params.id}`);
                }
            });
        }
    });
});




/*==========================================*/
// calculate the new average review for the campground
function calculateAverage(reviews) {
    if (reviews.length === 0) {
        return 0;
    } else {
        let sum = 0;
        reviews.forEach(element => {
            sum += element.rating;
        });
        return sum / reviews.length;
    }
}

module.exports = router;