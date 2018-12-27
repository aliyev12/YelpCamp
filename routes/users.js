const express = require('express'),
    router = express.Router({
        mergeParams: true
    }),
    passport = require('passport'),
    User = require('../models/user'),
    Campground = require('../models/campground'),
    middleware = require('../middleware/index');

// INDEX
router.get('/', middleware.isLoggedIn, middleware.checkIfUserIsAdmin, (req, res) => {
    User.find({}, (err, users) => {
        if (err || !users) {
            req.flash('error', 'Something went wrong while retrieving users');
            res.redirect('/campgrounds');
        } else {
            res.render('users/index', {
                users
            });
        }
    })
});

// SHOW
router.get('/:user_id', middleware.isLoggedIn, middleware.checkUserProfileOwnership, (req, res) => {
    User.findById(req.params.user_id, (err, user) => {
        if (err || !user) {
            req.flash('error', 'User not found');
            res.redirect('/campgrounds');
        } else {
            Campground.find().where('author.id').equals(user._id).exec((err, foundCampgrounds) => {
                if (err) {
                    req.flash('error', 'Sorry, something went wrong.. Please try again');
                    res.redirect('/campgrounds');
                } else if (!foundCampgrounds) {
                    req.flash('error', 'No campgrounds have been found for this user');
                    res.redirect('/campgrounds');
                } else {
                    res.render('users/show', {
                        user,
                        campgrounds: foundCampgrounds ? foundCampgrounds : []
                    });
                }
            });
        }
    });
});

// EDIT
router.get('/:user_id/edit', middleware.isLoggedIn, middleware.checkUserProfileOwnership, (req, res) => {
    User.findById(req.params.user_id, (err, user) => {
        if (err || !user) {
            req.flash('error', 'User not found');
            res.redirect('back');
        } else {
            res.render('users/edit', {
                user,
                currentUser: req.user
            });
        }
    });
});

// UPDATE
router.put('/:user_id', middleware.isLoggedIn, middleware.checkUserProfileOwnership, (req, res) => {
    let updatingPassword = false;
    // Stopped here, trying to implement check for if there is a password and confirmPassword...
    if (req.body.password || req.body.confirmPassword) {
        if (!req.body.password || !req.body.confirmPassword) {
            req.flash('error', 'You haven\'t confirmed the new password');
            return req.user.isAdmin ? res.redirect('/users') : res.redirect('/campgrounds');
        }
        if (req.body.password !== req.body.confirmPassword) {
            req.flash('error', 'Updated passwords didn\'t match, please try again');
            return req.user.isAdmin ? res.redirect('/users') : res.redirect('/campgrounds');
        } else {
            updatingPassword = true;
        }
    }

    const updatedUser = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        username: req.body.username,
        avatar: req.body.avatar,
        description: req.body.description,
        enabled: req.body.enabled
    };

    User.findByIdAndUpdate(req.params.user_id, updatedUser, (err, user) => {
        if (err) {
            if (err.code === 11000) {
                req.flash('error', `Someone with email ${req.body.email} already has an account.`);
                req.user.isAdmin ? res.redirect('/users') : res.redirect('/campgrounds');
            } else {
                req.flash('error', `Something went wrong while updating account`);
                req.user.isAdmin ? res.redirect('/users') : res.redirect('/campgrounds');
            }

        } else {
            if (updatingPassword) {
                if (!user) {
                    req.flash('error', 'No user has been found.');
                    return req.user.isAdmin ? res.redirect('/users') : res.redirect('/campgrounds');
                }
                if (!req.body.password || !req.body.confirmPassword) {
                    req.flash('error', 'Please type password twice');
                    return req.user.isAdmin ? res.redirect('/users') : res.redirect('/campgrounds');
                }
                if (req.body.password !== req.body.confirmPassword) {
                    req.flash('error', 'Passwords do not match');
                    return req.user.isAdmin ? res.redirect('/users') : res.redirect('/campgrounds');
                }
                // Change password using password method
                user.setPassword(req.body.password, err => {
                    if (err) {
                        req.flash('error', err.message);
                        return req.user.isAdmin ? res.redirect('/users') : res.redirect('/campgrounds');
                    }
                    // Save the user
                    user.save(err => {
                        if (err) {
                            req.flash('error', err.message);
                            return req.user.isAdmin ? res.redirect('/users') : res.redirect('/campgrounds');
                        }
                        // Log the user in if everything worked out
                        req.logIn(user, err => {
                            if (err) {
                                req.flash('error', err.message);
                                return req.user.isAdmin ? res.redirect('/users') : res.redirect('/campgrounds');
                            }
                        }); // end req.logIn
                    }); // end user.save
                }); // end user.setPassword
            }


            if (req.user && req.user.isAdmin) {
                req.flash('success', `${user ? user.username : 'User'}'s account has been successfully updated.`);
                res.redirect('/users');
            } else {
                req.flash('success', `Your account has been successfully updated.`);
                res.redirect('/campgrounds');
            }
        }
    });
});

module.exports = router;