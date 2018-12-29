const Campground = require("../models/campground"),
    Comment = require("../models/comment"),
    Review = require('../models/review'),
    User = require('../models/user');

const middlewareObj = {};

middlewareObj.checkCampgroundOwnership = function (req, res, next) {
    // Check if user is signed in
    if (req.isAuthenticated()) {
        // Look up that particular campground by using id from URL aka params id
        Campground.findById(req.params.id, (err, campground) => {
            if (err || !campground) {
                // Error finding campground by ID
                req.flash("error", "Campground not found");
                res.redirect("back");
            } else {
                // Check if the user owns the campground?
                if (campground && campground.author && campground.author.id && campground.author.id.equals(req.user._id) || req.user.isAdmin) {
                    next();
                } else {
                    // Error if not authorized
                    req.flash("error", `You don't permission to do that`);
                    res.redirect("back");
                }
            }
        });
    } else {
        // Error if not authenticated
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
};

middlewareObj.checkCommentOwnership = function (req, res, next) {
    if (req.isAuthenticated()) {
        Campground.findById(req.params.id, (err, campground) => {
            if (err || !campground) {
                // Error - campground not found
                req.flash("error", "Campground not found");
                res.redirect("/campgrounds");
            } else {
                Comment.findById(req.params.comment_id, (err, comment) => {
                    if (err || !comment) {
                        // Error - comment not found!
                        req.flash("error", "Comment not found");
                        res.redirect("back");
                    } else {
                        if (comment.author.id.equals(req.user._id) || req.user.isAdmin) {
                            next();
                        } else {
                            // Error - not authorized!
                            req.flash("error", `You don't have permission to do that`);
                            res.redirect("back");
                        }
                    }
                });
            }
        });
    } else {
        // Error - not authenticated!
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
};

// Users are allowed to only leave one review per campground
// So, this middleware will error out if there is already a review from that particular user 
// within given campground, else it will go next()
middlewareObj.checkReviewExistence = function (req, res, next) {
    // Check if user is logged in
    if (req.isAuthenticated()) {
        Campground.findById(req.params.id).populate('reviews').exec((err, foundCampground) => {
            if (err || !foundCampground) {
                req.flash('error', 'Campground not found (Error Code: MCRE-01)');
                res.redirect('/campgrounds');
            } else {
                // check if req.user._id exists in foundCampground.reviews
                const foundUserReview = foundCampground.reviews.some(review => review.author.id.equals(req.user._id));
                if (foundUserReview) {
                    req.flash('error', 'You already wrote a review');
                    res.redirect(`/campground/${req.params.id}`);
                } else {
                    // If the review was not found, go to the next middleware
                    next();
                }
            }
        });
    } else {
        // User is not logged in, so display error message and redirect to login page
        req.flash('err', 'You need to be logged in to do that');
        res.redirect('/login');
    }
};

middlewareObj.checkReviewOwnership = function (req, res, next) {
    // Check if user is logged in
    if (req.isAuthenticated()) {
        // Find review based on review_id params in the URL
        Review.findById(req.params.review_id, (err, foundReview) => {
            if (err || !foundReview) {
                // If there is an error finding review, or review comes back as null
                req.flash('err', 'Review not found');
                res.redirect(`/campgrounds/${req.params.id}`);
            } else {
                // Check if review author ID is the same as the currently logged in user ID
                if (foundReview.author.id.equals(req.user._id) || req.user.isAdmin) {
                    next();
                } else {
                    // User is not the creator of review, so the user is not authorized to modify it
                    req.flash('error', `You don't have permission to do that`);
                    res.redirect(`/campgrounds/${req.params.id}`);
                }
            }
        });
    } else {
        // User is not logged in, so display error message and redirect to login page
        req.flash('err', 'You need to be logged in to do that');
        res.redirect('/login');
    }

};

middlewareObj.checkUserProfileOwnership = async function (req, res, next) {
    try {
        // Check if user is logged in
        if (req.isAuthenticated()) {
            const user = await User.findById(req.params.user_id);
            if (!user) {
                req.flash('error', 'User not found (Error code: MDL-CHUOW-01)');
                return res.redirect('/campgrounds');
            }
            // Check if user ID is the same as the currently logged in user ID
            if (user._id.equals(req.user._id) || req.user.isAdmin) {
                next();
            } else {
                // User is not the owner of profile, so the user is not authorized to modify it
                req.flash('error', `You don't have permission to do that`);
                return res.redirect(`/`);
            }
        } else {
            // User is not logged in, so display error message and redirect to login page
            req.flash('err', 'You need to be logged in to do that');
            return res.redirect('/login');
        }
    } catch (err) {
        req.flash('error', err.message);
        return res.redirect('/campgrounds');
    }
};

middlewareObj.isLoggedIn = function (req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "You need to be logged in to do that");
    res.redirect("/login");
};

middlewareObj.checkIfUserIsAdmin = function (req, res, next) {
    if (req.isAuthenticated() && req.user.isAdmin) {
        return next();
    }
    req.flash("error", "You don't have permission to view this page");
    res.redirect("/");
};

middlewareObj.checkIfUserIsEnabled = function (req, res, next) {
    User.findOne({
        username: req.body.username
    }, (err, user) => {
        if (err || !user) {
            req.flash('error', 'User not found');
            res.redirect('/login');
        } else {
            if (user.enabled) {
                next();
            } else {
                req.flash('error', 'Your account is disabled. Please, contact your administrator.');
                res.redirect('/login');
            }
        }
    });
};

middlewareObj.captchaVerification = function (req, res, next) {
    if (req.recaptcha.error) {
        req.flash('error','reCAPTCHA Incorrect');
        res.redirect('/request');
    } else {
        return next();
    }
}

module.exports = middlewareObj;