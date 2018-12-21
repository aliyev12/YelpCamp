const Campground = require('../models/campground'),
    Comment = require('../models/comment');


const middlewareObj = {};

middlewareObj.checkCampgroundOwnership = function (req, res, next) {
    if (req.isAuthenticated()) {
        Campground.findById(req.params.id, (err, campground) => {
            if (err || !campground) {
                // Error finding campground by ID
                req.flash('error', 'Campground not found');
                res.redirect('back');
            } else {
                // Check if the user owns the campground?
                if (campground.author.id.equals(req.user._id)) {
                    next();
                } else {
                    // Error if not authorized
                    req.flash('error', `You don't permission to do that`);
                    res.redirect('back');
                }
            }
        });
    } else {
        // Error if not authenticated
        req.flash('error', 'You need to be logged in to do that');
        res.redirect('back');
    }
};

middlewareObj.checkCommentOwnership = function (req, res, next) {
    if (req.isAuthenticated()) {
        Comment.findById(req.params.comment_id, (err, comment) => {
            if (err || !comment) {
                // Error - comment not found!
                req.flash('error', 'Comment not found');
                res.redirect("back");
            } else {
                if (comment.author.id.equals(req.user._id)) {
                    next();
                } else {
                    // Error - not authorized!
                    req.flash('error', `You don't have permission to do that`);
                    res.redirect("back");
                }
            }
        });
    } else {
        // Error - not authenticated!
        req.flash('error', 'You need to be logged in to do that');
        res.redirect("back");
    }
};

middlewareObj.isLoggedIn = function (req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error', 'You need to be logged in to do that');
    res.redirect("/login");
}

module.exports = middlewareObj;