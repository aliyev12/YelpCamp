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
router.get('/:user_id', middleware.isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.params.user_id).populate('followers').exec();
        const foundCampgrounds = await Campground.find().where('author.id').equals(user._id).exec();
        if (!foundCampgrounds) {
            req.flash('error', 'No campgrounds have been found for this user');
            return res.redirect('/campgrounds');
        }
        res.render('users/show', {
            user,
            campgrounds: foundCampgrounds ? foundCampgrounds : []
        });
    } catch (err) {
        req.flash('error', err.message + ' (Error code: RT-US-SHW)');
        res.redirect('/campgrounds');
    }
});


// EDIT
router.get('/:user_id/edit', middleware.isLoggedIn, middleware.checkUserProfileOwnership, async (req, res) => {
    try {
        const user = await User.findById(req.params.user_id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('back');
        }
        res.render('users/edit', {
            user,
            currentUser: req.user
        });
    } catch (err) {
        req.flash('error', err.message ? err.message : 'Something went wrong');
        res.redirect('/camogrounds');
    }
});

// UPDATE
router.put('/:user_id', middleware.isLoggedIn, middleware.checkUserProfileOwnership, async (req, res) => {
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
    try {
        const user = await User.findByIdAndUpdate(req.params.user_id, updatedUser, {
            new: true
        });
        if (updatingPassword) {
            if (!user) {
                req.flash('error', 'No user has been found.');
                return req.user.isAdmin ? res.redirect('/users') : res.redirect('/campgrounds');
            } else if (!req.body.password || !req.body.confirmPassword) {
                req.flash('error', 'Please type password twice');
                return req.user.isAdmin ? res.redirect('/users') : res.redirect('/campgrounds');
            } else if (req.body.password !== req.body.confirmPassword) {
                req.flash('error', 'Passwords do not match');
                return req.user.isAdmin ? res.redirect('/users') : res.redirect('/campgrounds');
            }
            // Change password using password method
            await user.setPassword(req.body.password);
            // Save the user
            await user.save();
            // Log the user in if everything worked out
            if (req.user._id === user._id) {
                await req.logIn(user, (err) => {});
            }
        }
        // Success message tailored for user or admin
        if (req.user && req.user.isAdmin) {
            req.flash('success', `${user ? user.username : 'User'}'s account has been successfully updated.`);
            res.redirect('/users');
        } else {
            req.flash('success', `Your account has been successfully updated.`);
            res.redirect('/campgrounds');
        }
    } catch (err) {
        if (err.code === 11000) {
            req.flash('error', `Someone with email ${req.body.email} already has an account.`);
            req.user.isAdmin ? res.redirect('/users') : res.redirect('/campgrounds');
        } else {
            console.log(err);
            req.flash('error', `Something went wrong while updating account`);
            req.user.isAdmin ? res.redirect('/users') : res.redirect('/campgrounds');
        }
    }
});

module.exports = router;
