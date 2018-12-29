const express = require("express"),
    router = express.Router(),
    env = require("dotenv").config(), // process.env.DB_PASSWORD etc...
    passport = require('passport'),
    middleware = require('../middleware/index'),
    User = require('../models/user'),
    Campground = require('../models/campground'),
    Notification = require('../models/notification');


// Root route
router.get("/", (req, res) => {
    if (req.user) {
        console.log(`${req.user.username} just visited the site.`)
    } else {
        console.log(`${req.connection.remoteAddress} just visited the site.`);
    }
    res.render("landing");
});

// Show register form
router.get("/register", (req, res) => res.render("register"));

// Handle signup logic
router.post(
    "/register",
    (req, res) => {
        // With locus, heck what data you receive from req.body before inserting anything into database
        //eval(require('locus'));

        if (req.body.password === req.body.confirmPassword) {
            const newUser = new User({
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                email: req.body.email,
                username: req.body.username,
                avatar: req.body.avatar,
                description: req.body.description
            });

            if (req.body.adminCode === 'secretcode123') {
                newUser.isAdmin = true;
            }

            User.register(newUser, req.body.password, (err, user) => {
                if (err || !user) {
                    req.flash('error', err.message);
                    res.render("register");
                } else {
                    passport.authenticate("local")(req, res, () => {
                        req.flash('success', `Welcome to YelpCamp ${user.username}!`);
                        res.redirect("/campgrounds");
                    });
                }
            });
        } else {
            req.flash('error', `Passwords you've entered didn't match, please try again.`);
            res.redirect('/register');
        }
    }
);

//Show login form
router.get("/login", (req, res) => res.render("login"));

// Handling login logic
router.post(
    "/login",
    middleware.checkIfUserIsEnabled,
    passport.authenticate("local", {
        successRedirect: "/campgrounds",
        successFlash: 'You have been successfully authenticated!',
        failureRedirect: "/login",
        failureFlash: true
    }),
    (req, res) => {}
);

// Logout route
router.get("/logout", (req, res) => {
    req.logout();
    req.flash('success', 'You have been logged out');
    res.redirect("/campgrounds");
});


// FOLLOW USER
router.get('/follow/:user_id', middleware.isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.params.user_id);
        user.followers.push(req.user._id);
        user.save();
        req.flash('success', `Successfully followed ${user.username}!`);
        res.redirect(`/users/${req.params.user_id}`);
    }
    catch(err) {
        req.flash('error', err.message + ' (Error code: RT-US-FLUS)');
        res.redirect('back');
    }
});


// NOTIFICATIONS
router.get('/notifications', middleware.isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate({
            path: 'notifications',
            options: {
                sort: {"_id": -1}
            }
        }).exec();
        const allNotifications = user.notifications;
        res.render('notifications/index', {allNotifications});
    }
    catch(err) {
        req.flash('error', err.message);
        res.redirect('back');
    }
});


// HANDLE NOTIFICATION
router.get('/notifications/:notification_id', middleware.isLoggedIn, async (req, res) => {
    // ?mark_read=true
    try {
        const notification = await Notification.findById(req.params.notification_id);
        let mark_read = true;
        let redirectUrl = `/campgrounds/${notification.campgroundId}`;
        if (req.query.mark_read) {
            mark_read = req.query.mark_read;
            redirectUrl = `/notifications`;
        }
        notification.isRead = mark_read;
        notification.save();
        res.redirect(redirectUrl);
    }
    catch(err) {
        req.flash('error', err.message);
        res.redirect('back');
    }
});

module.exports = router;