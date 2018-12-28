/*=== General Imports ===*/
const express = require("express"),
    router = express.Router(),
    middleware = require('../middleware'),
    env = require("dotenv").config(), // process.env.DB_PASSWORD etc...
    request = require('request');


/*=== Model Imports ===*/
const Comment = require('../models/comment'),
    Campground = require('../models/campground'),
    Notification = require('../models/notification'),
    Review = require('../models/review'),
    User = require('../models/user');


/*=== Image Upload ===*/
// Configure Multer
const multer = require('multer'),
    storage = multer.diskStorage({
        filename: (req, file, callback) => callback(null, Date.now() + file.originalname)
    }),
    imageFilter = (req, file, callback) => {
        // Accept image files only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
            return callback(new Error('Only image files are allowed.'), false);
        }
        callback(null, true);
    },
    upload = multer({
        storage,
        fileFilter: imageFilter
    });
// Configure Cloudinary
const cloudinary = require('cloudinary');
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


/*=== CONFIGURE GEOCODER ===*/
const NodeGeocoder = require('node-geocoder'),
    options = {
        provider: 'google',
        httpAdapter: 'https',
        apiKey: process.env.GEOCODER_API_KEY,
        formatter: null
    };
const geocoder = NodeGeocoder(options);


/*=========================================*/
/*=========================================*/
/* ROUTES */
/*=========================================*/

// INDEX - Show all campgrounds
router.get("/", (req, res) => {
    // Declare a variable that will hold find option for pulling campgrounds
    let regex;
    // If there is a search query...
    if (req.query.search) {
        //... set regex that does searching based on names
        regex = {
            name: new RegExp(escapeRegex(req.query.search), 'gi')
        };
        // If there isn't a search query in URL, just set regex to be an empty object
    } else {
        regex = {};
    }

    // Count total number of campgrounds
    Campground.count(regex).exec((err, count) => {
        if (err) {
            req.flash('error', err.message);
            res.redirect('/');
        }
        //  else if (!count) {
        //     if (req.query.search) {
        //         req.flash('error', 'test');
        //         res.redirect('/campgrounds');
        //     }
        // } 
        else {
            const perPageAllowedValues = [1, 4, 6, 8, 12, 16, 20, 50, 100, parseInt(count)];
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
                    // Just display all campgrounds
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

            /**================== */
            // Get all campgrounds from DB
            Campground.find(regex)
                .skip((perPage * pageNumber) - perPage)
                .limit(perPage)
                .populate("comments")
                .exec((err, allCampgrounds) => {
                    if (err) {
                        console.log(err);
                        req.flash('error', 'Something went wrong');
                        res.redirect('/campgrounds');
                    } else if (!allCampgrounds) {
                        req.flash('error', 'No campgrounds matched your search');
                        res.redirect('/campgrounds');
                    } else {
                        // If someone tries to modiry URL page query to a non existant page, display error and redirect to landing page
                        if (parseInt(req.query.page) > Math.ceil(count / perPage) || parseInt(req.query.page) <= 0) {
                            req.flash('error', `Don't try modifying URL. Use pagination to get to the right page`);
                            return res.redirect('/');
                        }
                        // Object with all variables that are being passed on to Campground's index page
                        const dataBeingPassedToCampgroundIndexTemplate = {
                            campgrounds: allCampgrounds,
                            current: pageNumber,
                            pages: Math.ceil(count / perPage),
                            totalNumberOfCampgrounds: count,
                            perPage
                        };
                        // If there is a search query, add it to object
                        if (req.query.search) {
                            dataBeingPassedToCampgroundIndexTemplate.search = req.query.search;
                        } else {
                            dataBeingPassedToCampgroundIndexTemplate.search = '';
                        }
                        // Render index page and pass on object with parameters below
                        res.render("campgrounds/index", dataBeingPassedToCampgroundIndexTemplate);
                    }
                }); // end find

        } // end if Campground.count no errors
    }); // count used to end
});

// CREATE - Create new campground
router.post("/", middleware.isLoggedIn, upload.single('image'), async (req, res) => {
    try {
        const data = await geocoder.geocode(req.body.campground.location);
        if (!data || !data.length) {
            req.flash('error', 'No data has been returned from Google Maps');
            return res.redirect('back');
        }
        // Upload image to cloudinary and get the new image url
        const result = await cloudinary.v2.uploader.upload(req.file.path);
        if (!result) {
            req.flash('error', 'Something went wrong while uploading your image (Error code: RT-CM-CRT)');
            return res.redirect('back');
        }
        // Add cloudinary url for the image to the campground object under image property
        req.body.campground.image = result.secure_url;
        // Add author to campground
        req.body.campground.imageId = result.public_id;
        req.body.campground.author = {
            id: req.user._id,
            username: req.user.username
        };

        // Add the rest of the data to campground object from request
        req.body.campground.lat = data[0].latitude;
        req.body.campground.lng = data[0].longitude;
        req.body.campground.location = data[0].formattedAddress;
        req.body.campground.city = data[0].city;
        req.body.campground.country = data[0].country;

        // Create a new campground and save to database
        const newlyCreatedCampground = await Campground.create(req.body.campground);
        if (!newlyCreatedCampground) {
            req.flash('error', 'Error while creating a new campground');
            return res.redirect('back');
        }
        const user = await User.findById(req.user._id).populate('followers').exec();
        const newNotification = {
            username: req.user.username,
            campgroundId: newlyCreatedCampground.id
        };
        for (const follower of user.followers) {
            const notification = await Notification.create(newNotification);
            follower.notifications.push(notification);
            follower.save();
        }
        // Redirect back to campground page
        req.flash('success', 'Campground successfully created');
        res.redirect(`/campgrounds/${newlyCreatedCampground.id}`);

    } // end of try
    catch (err) {
        req.flash('error', err.message);
        return res.redirect('back');
    }
});


// NEW - Show form to create new campground
router.get("/new", middleware.isLoggedIn, (req, res) => res.render("campgrounds/new"));

// SHOW - Shows more info about one campground
router.get("/:id", async (req, res) => {
    try {
        // Find the campground with provided ID
        const foundCampground = await Campground.findById(req.params.id)
            .populate("comments")
            .populate({
                path: 'reviews',
                options: {
                    sort: {
                        createdAt: -1
                    }
                }
            })
            .exec();
        const user = await User.findById(foundCampground.author.id);

        if (!foundCampground) {
            req.flash('error', 'Campground not found');
            return res.redirect('/campgrounds');
        }
        // Render show template with that campground
        res.render("campgrounds/show", {
            campground: foundCampground,
            apiKey: process.env.GOOGLE_MAPS_RESTRICTED_API_KEY,
            author: user
        });
    } catch (err) {
        console.log(err);
        req.flash('error', err.message);
        return res.redirect('/campgrounds');
    }

});

// EDIT CAMPGROUND ROUTE
router.get('/:id/edit', middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findById(req.params.id, (err, campground) => {
        if (err || !campground) {
            req.flash('error', 'Campground was not found');
            res.redirect('/campgrounds');
        } else {
            res.render('campgrounds/edit', {
                campground
            });
        }
    });
});

// UPDATE CAMPGROUND ROUTE
router.put('/:id', middleware.checkCampgroundOwnership, upload.single('image'), (req, res) => {
    /*
    As a security measure, we add delete req.body.campground.rating; in the campground update (PUT)
        route to protect the campground.rating field from manipulation, since we are passing the
        req.body.campground object to the Campground.findByIdAndUpdate() method.
    */
    delete req.body.campground.rating;

    // Look up campground to check if location has changed or not
    Campground.findById(req.params.id, async (err, campground) => {
        if (err) {
            req.flash('error', err.message);
            res.redirect('/campgrounds');
        } else if (!campground) {
            req.flash('error', 'Campground not found');
            res.redirect('/campgrounds');
        } else {
            // Checking if new file was uploaded
            if (req.file) {
                try {
                    if (campground.imageId) {
                        // Delete the old picture
                        await cloudinary.v2.uploader.destroy(campground.imageId);
                    }
                    // Upload a new picture
                    const result = await cloudinary.v2.uploader.upload(req.file.path);
                    campground.imageId = result.public_id;
                    campground.image = result.secure_url;
                } catch (err) {
                    req.flash('error', err.message + ' (Error code: RT-CP-UP-FILE)');
                    return res.redirect('back');
                }
            }

            // Checking if location changed. If changed then geocode
            if (campground.location !== req.body.location && !(!campground.location && !req.body.location)) {
                try {
                    const data = await geocoder.geocode(req.body.location);
                    if (data) {
                        campground.lat = data[0].latitude;
                        campground.lng = data[0].longitude;
                        campground.location = data[0].formattedAddress;
                        campground.city = data[0].city;
                        campground.country = data[0].country;
                    }
                } catch (err) {
                    req.flash('error', err.message + ' (Error code: RT-CP-UP-LOC)');
                    return res.redirect('back');
                }

            }

            campground.name = req.body.campground.name;
            campground.price = req.body.campground.price;
            campground.description = req.body.campground.description;
            console.log(campground);
            campground.save();
            req.flash("success", "Successfully Updated!");
            res.redirect("/campgrounds/" + campground._id);

            // // Checking if location changed. If changed then geocode
            // if (campground.location !== req.body.location) {
            //     geocoder.geocode(req.body.location, (err, data) => {
            //         if (err) {
            //             req.flash('error', err.message);
            //             return res.redirect('back');
            //         } else if (!data) {
            //             req.flash('error', 'Invalid Address');
            //             return res.redirect('back');
            //         } else if (!data.length) {
            //             req.flash('error', 'Invalid Address');
            //             return res.redirect('back');
            //         }

            //         req.body.campground.lat = data[0].latitude;
            //         req.body.campground.lng = data[0].longitude;
            //         req.body.campground.location = data[0].formattedAddress;
            //         req.body.campground.city = data[0].city;
            //         req.body.campground.country = data[0].country;
            //     // eval(require('locus'));
            //     // Find and update the correct campground
            //     Campground.findByIdAndUpdate(req.params.id, req.body.campground, (err, updatedCampground) => {
            //         if (err) {
            //             req.flash('error', 'Error while updating campground');
            //             res.redirect('/campgrounds');
            //         } else {
            //             // Redirect back to campground show page
            //             req.flash('success', 'Successfully updated campground');
            //             res.redirect(`/campgrounds/${updatedCampground._id}`);
            //         }
            //     });
            // });
            // // If location has not changed, don't geocode
            // } else {
            //     // Find and update the correct campground
            //     Campground.findByIdAndUpdate(req.params.id, req.body.campground, (err, updatedCampground) => {
            //         if (err) {
            //             req.flash('error', 'Error while updating campground');
            //             res.redirect('/campgrounds');
            //         } else {
            //             // Redirect back to campground show page
            //             req.flash('success', 'Successfully updated campground');
            //             res.redirect(`/campgrounds/${updatedCampground._id}`);
            //         }
            //     });
            // }
        }
    });
});


// DESTROY CAMPGROUND ROUTE
router.delete('/:id', middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findById(req.params.id, async (err, campground) => {
        if (err || !campground) {
            req.flash('error', 'Campground not found');
            res.redirect('/campgrounds');
        } else {
            try {
                if (campground.imageId) {
                    await cloudinary.v2.uploader.destroy(campground.imageId);
                }
                // deletes all comments associated with the campground
                /*   #remove# a #Comment# with whatever #id# that is #in# #campground.comments#  */
                Comment.remove({
                    "_id": {
                        $in: campground.comments
                    }
                });
                // deletes all reviews associated with the campground
                Review.remove({
                    "_id": {
                        $in: campground.reviews
                    }
                });
                //  delete the campground
                campground.remove();
                req.flash('success', 'Campground deleted successfully');
                res.redirect('/campgrounds');
            } catch (err) {
                req.flash('error', err.message);
                return res.redirect('back');
            }
        }
    });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}




/**=================== */
/**=================== */
/**=================== */
module.exports = router;