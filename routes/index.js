const express = require("express"),
    router = express.Router(),
    env = require("dotenv").config(), // process.env.DB_PASSWORD etc...
    passport = require('passport'),
    middleware = require('../middleware/index'),
    User = require('../models/user'),
    Campground = require('../models/campground');


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

module.exports = router;