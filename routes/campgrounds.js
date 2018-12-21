const express = require("express"),
    router = express.Router(),
    Campground = require('../models/campground'),
    middleware = require('../middleware');

// INDEX - Show all campgrounds
router.get("/", (req, res) => {
    // Get all campgrounds from DB
    Campground.find({})
        .populate("comments")
        .exec((err, allCampgrounds) => {
            if (err || !allCampgrounds) {
                req.flash('error', 'Campgrounds not found');
                res.redirect('/');
            } else {
                res.render("campgrounds/index", {
                    campgrounds: allCampgrounds
                });
            }
        });
});

// CREATE - Create new campground
router.post("/", middleware.isLoggedIn, (req, res) => {
    // Get data from form and add to campground array
    const name = req.body.name,
        price = req.body.price,
        image = req.body.image,
        description = req.body.description,
        author = {
            id: req.user._id,
            username: req.user.username
        },
        newCampground = {
            name,
            price,
            image,
            description,
            author
        };
    Campground.create(newCampground, (err, newlyCreated) => {
        if (err || !newlyCreated) {
            req.flash('error', 'Error while creating a new campground');
            res.redirect('back');
        } else {
            // Redirect back to campground page
            req.flash('success', 'Campground successfully created');
            res.redirect("/campgrounds");
        }
    });
});

// NEW - Show form to create new campground
router.get("/new", middleware.isLoggedIn, (req, res) => res.render("campgrounds/new"));

// SHOW - Shows more info about one campground
router.get("/:id", (req, res) => {
    // Find the campground with provided ID
    Campground.findById(req.params.id)
        .populate("comments")
        .exec((err, foundCampground) => {
            if (err || !foundCampground) {
                req.flash('error', 'Campground not found');
                res.redirect('/campgrounds');
            } else {
                // Render show template with that campground
                res.render("campgrounds/show", {
                    campground: foundCampground
                });
            }
        });
});

// EDIT CAMPGROUND ROUTE
router.get('/:id/edit', middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findById(req.params.id, (err, campground) => {
        if (err || !campground) {
            req.flash('error', 'Campground was not found');
            res.redirect('/campgrounds');
        } else {
            req.flash('success', 'You have successfully edited campground');
            res.render('campgrounds/edit', {
                campground
            });
        }
    });
});

// UPDATE CAMPGROUND ROUTE
router.put('/:id', middleware.checkCampgroundOwnership, (req, res) => {
    // Find and update the correct campground
    Campground.findByIdAndUpdate(req.params.id, req.body.campground, (err, updatedCampground) => {
        if (err) {
            req.flash('error', 'Error while updating campground');
            res.redirect('/campgrounds');
        } else {
            // Redirect back to campground show page
            req.flash('success', 'Successfully updated campground');
            res.redirect(`/campgrounds/${updatedCampground._id}`);
        }
    });
});


// DESTROY CAMPGROUND ROUTE
router.delete('/:id', middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findOneAndRemove(req.params.id, (err) => {
        if (err) {
            req.flash('error', 'Error while deleting campground');
            res.redirect('/campgrounds');
        } else {
            res.redirect('/campgrounds');
            req.flash('success', 'Successfully deleted campground');
        }
    });
});

module.exports = router;