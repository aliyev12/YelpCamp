const express = require("express"),
    router = express.Router(),
    passport = require('passport'),
    User = require('../models/user')

// Root route
router.get("/", (req, res) => res.render("landing"));

// Show register form
router.get("/register", (req, res) => res.render("register"));

// Handle signup logic
router.post(
    "/register",
    (req, res) => {
        const newUser = new User({
            username: req.body.username
        });
        if (req.body.adminCode === 'secretcode123') {
            newUser.isAdmin = true;
        }
        // eval(require('locus'));
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
    }
);

//Show login form
router.get("/login", (req, res) => res.render("login"));

// Handling login logic
router.post(
    "/login",
    passport.authenticate("local", {
        successRedirect: "/campgrounds",
        failureRedirect: "/login"
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