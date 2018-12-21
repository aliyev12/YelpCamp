const express = require("express"),
    router = express.Router({
        mergeParams: true
    }),
    Campground = require('../models/campground'),
    Comment = require('../models/comment'),
    middleware = require('../middleware');

// Comments NEW
router.get("/new", middleware.isLoggedIn, (req, res) => {
    Campground.findById(req.params.id, (err, foundCampground) => {
        if (err || !foundCampground) {
            req.flash('error', 'Campground not found');
            res.redirect('back');
        } else {
            res.render("comments/new", {
                campground: foundCampground
            });
        }
    });
});

// Comments CREATE
router.post("/", middleware.isLoggedIn, (req, res) => {
    // Lookup campground using ID
    Campground.findById(req.params.id, (err, foundCampground) => {
        if (err || !foundCampground) {
            req.flash('error', 'Camprgrouna not found');
            res.redirect("/campgrounds");
        } else {
            // Create new comment
            Comment.create(req.body.comment, (err, comment) => {
                if (err || !comment) {
                    req.flash('error', 'Something went wrong while creating comment');
                    res.redirect("/campgrounds");
                } else {
                    // Add username and id to comment
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.save();
                    // Connect new comment to campground
                    foundCampground.comments.push(comment);
                    // Save comment
                    foundCampground.save((err, campground) => {
                        if (err || !campground) {
                            req.flash('error', 'Something went wrong while creating comment');
                            res.redirect('back');
                        } else {
                            // Redirect to campground show
                            req.flash('success', 'Comment successfully created');
                            res.redirect(`/campgrounds/${campground._id}`);
                        }
                    });
                }
            });
        }
    });
});


// Comment - EDIT
router.get('/:comment_id/edit', middleware.checkCommentOwnership, (req, res) => {
    Comment.findById(req.params.comment_id, (err, comment) => {
        if (err || !comment) {
            req.flash('error', 'Comment not found');
            res.redirect('back');
        } else {
            res.render('comments/edit', {
            comment,
            campground_id: req.params.id
        });
        }
    });
});


// Comment - UPDATE
router.put('/:comment_id', middleware.checkCommentOwnership, (req, res) => {
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, (err, comment) => {
        if (err) {
            req.flash('error', 'Something went wrong while updating comment');
            res.redirect('back');
        } else {
            req.flash('success', 'Comment successfully updated');
            res.redirect(`/campgrounds/${req.params.id}`);
        }
    });
});


// Comment DESTROY
router.delete('/:comment_id', middleware.checkCommentOwnership, (req, res) => {
    Comment.findByIdAndRemove(req.params.comment_id, (err) => {
        if (err) {
            req.flash('error', 'Something went wrong while deleting comment');
            res.redirect('back');
        } else {
            req.flash('success', 'Successfully deleted comment');
            res.redirect(`/campgrounds/${req.params.id}`);
        }
    });
});

module.exports = router;