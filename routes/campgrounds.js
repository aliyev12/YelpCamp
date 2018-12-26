const express = require("express"),
    router = express.Router(),
    Comment = require('../models/comment'),
    Campground = require('../models/campground'),
    Review = require('../models/review'),
    middleware = require('../middleware'),
    env = require("dotenv").config(), // process.env.DB_PASSWORD etc...
    NodeGeocoder = require('node-geocoder');

/* CONFIGURE GEOCODER */
const options = {
    provider: 'google',
    httpAdapter: 'https',
    apiKey: process.env.GEOCODER_API_KEY,
    formatter: null
};
const geocoder = NodeGeocoder(options);


/*=========================================*/
/*=========================================*/

/* ROUTES */

// INDEX - Show all campgrounds
router.get("/", (req, res) => {

    // Count total number of campgrounds
    Campground.count().exec((err, count) => {
        if (err || !count) {
            req.flash('error', err.message);
            res.redirect('/');
        } else {

            const perPageAllowedValues = [4, 6, 8, 12, 16, 20, 50, 100, parseInt(count)];
            const validatePerPageQuery = perPageAllowedValues.some(el => el === parseInt(req.query.per_page));
            // If someone tries to modify URL per_page query, display error and redirect to landing page
            if (req.query.per_page && !validatePerPageQuery) {
                req.flash('error', `Don't try modifying URL. Use per page dropdown to set number of items per page`);
                return res.redirect('/');
            }

            let perPage;
            // If there is a query per_page, set perPage to be that query if it meets requirements...
            if (req.query.per_page) {
                const perPageQuery = parseInt(req.query.per_page);
                // perPage = perPageQuery ? perPageQuery <= count : count;
                if (perPageQuery > 0 && perPageQuery <= parseInt(count)) {
                    perPage = perPageQuery
                } else {
                    perPage = parseInt(count);
                }
            } else {
                // Otherwise, set perPage to be the current count if the count is less than 8, and 8 if the count is more than 8
                if (count >= 8) {
                    // Default number of campgrounds per  page is no per_page query exists and/or count is less than 8
                    perPage = 8;
                } else {
                    perPage = parseInt(count);
                }
            }
            // Get page number query
            const pageQuery = parseInt(req.query.page),
                pageNumber = pageQuery ? pageQuery : 1;
            // Get all campgrounds from DB
            Campground.find({})
                .skip((perPage * pageNumber) - perPage)
                .limit(perPage)
                .populate("comments")
                .exec((err, allCampgrounds) => {
                    if (err || !allCampgrounds) {
                        req.flash('error', 'Campgrounds not found');
                        console.log(err.message);
                        res.redirect('/');
                    } else {
                        // If someone tries to modiry URL page query to a non existant page, display error and redirect to landing page
                        if (parseInt(req.query.page) > Math.ceil(count / perPage) || parseInt(req.query.page) <= 0) {
                            req.flash('error', `Don't try modifying URL. Use pagination to get to the right page`);
                            return res.redirect('/');
                        }
                        // Render index page and pass on object with parameters below
                        res.render("campgrounds/index", {
                            campgrounds: allCampgrounds,
                            current: pageNumber,
                            pages: Math.ceil(count / perPage),
                            totalNumberOfCampgrounds: count,
                            perPage
                        });
                    }
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
        };

    geocoder.geocode(req.body.location, (err, data) => {
        if (err || !data.length) {
            req.flash('error', err.message);
            return res.redirect('back');
        }
        const lat = data[0].latitude,
            lng = data[0].longitude,
            location = data[0].formattedAddress;

        const newCampground = {
            name,
            price,
            image,
            description,
            author,
            location,
            lat,
            lng
        };

        // Create a new campground and save to database
        Campground.create(newCampground, (err, newlyCreatedCampground) => {
            if (err || !newlyCreatedCampground) {
                req.flash('error', 'Error while creating a new campground');
                res.redirect('back');
            } else {
                // Redirect back to campground page
                req.flash('success', 'Campground successfully created');
                res.redirect(`/campgrounds/${newlyCreatedCampground.id}`);
            }
        });
    });
});

// NEW - Show form to create new campground
router.get("/new", middleware.isLoggedIn, (req, res) => res.render("campgrounds/new"));

// SHOW - Shows more info about one campground
router.get("/:id", (req, res) => {
    // Find the campground with provided ID
    Campground.findById(req.params.id)
        .populate("comments")
        .populate({
            path: 'reviews',
            options: {
                sort: {
                    createdAt: -1
                }
            }
        })
        .exec((err, foundCampground) => {
            if (err || !foundCampground) {
                req.flash('error', 'Campground not found');
                res.redirect('/campgrounds');
            } else {
                // Render show template with that campground
                res.render("campgrounds/show", {
                    campground: foundCampground,
                    apiKey: process.env.GOOGLE_MAPS_RESTRICTED_API_KEY
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
    /*
    As a security measure, we add delete req.body.campground.rating; in the campground update (PUT)
        route to protect the campground.rating field from manipulation, since we are passing the
        req.body.campground object to the Campground.findByIdAndUpdate() method.
    */
    delete req.body.campground.rating;

    // Look up campground to check if location has changed or not
    Campground.findById(req.params.id, (err, campground) => {
        if (err || !campground) {
            req.flash('error', 'Campground not found');
            res.redirect('/campgrounds');
        } else {
            // Checking if location changed. If changed then geocode
            if (campground.location !== req.body.location) {
                geocoder.geocode(req.body.location, (err, data) => {
                    if (err || !data.length) {
                        req.flash('error', 'Invalid Address');
                        return res.redirect('back');
                    }
                    console.log(data);
                    req.body.campground.lat = data[0].latitude;
                    req.body.campground.lng = data[0].longitude;
                    req.body.campground.location = data[0].formattedAddress;
                    req.body.campground.city = data[0].city;

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
                // If location has not changed, don't geocode
            } else {
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
            }
        }
    });


});


// DESTROY CAMPGROUND ROUTE
router.delete('/:id', middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findById(req.params.id, (err, campground) => {
        if (err || !campground) {
            req.flash('error', 'Campground not found');
            res.redirect('/campgrounds');
        } else {
            // deletes all comments associated with the campground
            /*   #remove# a #Comment# with whatever #id# that is #in# #campground.comments#  */
            Comment.remove({
                "_id": {
                    $in: campground.comments
                }
            }, (err) => {
                if (err) {
                    req.flash('error', err.message);
                    res.redirect(`/campgrounds/${req.params._id}`);
                } else {
                    // deletes all reviews associated with the campground
                    Review.remove({
                        "_id": {
                            $in: campground.reviews
                        }
                    }, (err) => {
                        if (err) {
                            req.flash('error', err.message);
                            res.redirect('/campgrounds');
                        } else {
                            //  delete the campground
                            campground.remove();
                            req.flash('success', 'Campground deleted successfully');
                            res.redirect('/campgrounds');
                        }
                    });
                }
            });
        }
    });
});

module.exports = router;