const express = require("express"),
    router = express.Router(),
    env = require("dotenv").config(), // process.env.DB_PASSWORD etc...
    passport = require('passport'),
    middleware = require('../middleware/index'),
    nodemailer = require('nodemailer'),
    request = require('request');
User = require('../models/user'),
    Campground = require('../models/campground'),
    Notification = require('../models/notification');

const Recaptcha = require('express-recaptcha').Recaptcha;
//import Recaptcha from 'express-recaptcha'
const recaptcha = new Recaptcha(process.env.RECAPTCHA_SITE_KEY, process.env.RECAPTCHA_SECRET_KEY);



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

/** Registration is disabled. Uncomment the code below to enable registration */
// // Handle signup logic
// router.post(
//     "/register",
//     (req, res) => {
//         // With locus, heck what data you receive from req.body before inserting anything into database
//         //eval(require('locus'));

//         if (req.body.password === req.body.confirmPassword) {
//             const newUser = new User({
//                 firstName: req.body.firstName,
//                 lastName: req.body.lastName,
//                 email: req.body.email,
//                 username: req.body.username,
//                 avatar: req.body.avatar,
//                 description: req.body.description
//             });

//             if (req.body.adminCode === process.env.ADMIN_SIGNUP_CODE) {
//                 newUser.isAdmin = true;
//             }

//             User.register(newUser, req.body.password, (err, user) => {
//                 if (err || !user) {
//                     req.flash('error', err.message);
//                     res.render("register");
//                 } else {
//                     passport.authenticate("local")(req, res, () => {
//                         req.flash('success', `Welcome to YelpCamp ${user.username}!`);
//                         res.redirect("/campgrounds");
//                     });
//                 }
//             });
//         } else {
//             req.flash('error', `Passwords you've entered didn't match, please try again.`);
//             res.redirect('/register');
//         }
//     }
// );


// REQUEST NEW ACCOUNT - GET
router.get('/request', (req, res) => {
    res.render('request-account', {
        captcha: res.recaptcha,
        siteKey: process.env.RECAPTCHA_SITE_KEY
    });
});

// REQUEST NEW ACCOUNT - POST
router.post('/request', 
recaptcha.middleware.verify,
middleware.captchaVerification,
async (req, res) => {
    try {
        // Specify mail provider and set email & password
        const smtpTransport = await nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.YELPCAMP2019_GMAIL_ADDRESS,
                pass: process.env.YELPCAMP2019_GMAIL_PASSWORD
            }
        });
        // Set mail options for user: receiver, subject, email body etc...
        const mailOptionsToUser = {
            to: req.body.email,
            from: process.env.YELPCAMP2019_GMAIL_ADDRESS,
            subject: `New Account Request`,
            text: `
            Thank you for requesting a new account for YelpCamp! Your request has been successfully sent to site admin.
            We'll review your request and reach out to you shortly. 
            Please, see the content of your request below:
            First Name: ${req.body.firstName};
            Last Name: ${req.body.lastName};
            Email: ${req.body.email},
            ---
            ${req.body.description}
            `
        };
        // Set mail options for admin: receiver, subject, email body etc...
        const mailOptionsToAdmin = {
            to: process.env.YELPCAMP2019_GMAIL_ADDRESS,
            from: process.env.YELPCAMP2019_GMAIL_ADDRESS,
            subject: `New Account Request`,
            text: `
            New account for YelpCamp has been requested by ${req.body.firstName} ${req.body.lastName}.
            See the content of your request below:
            First Name: ${req.body.firstName};
            Last Name: ${req.body.lastName};
            Email: ${req.body.email},
            ---
            ${req.body.description}
            `
        };
        // Send mail to user
        await smtpTransport.sendMail(mailOptionsToUser);
        // Send mail to admin
        await smtpTransport.sendMail(mailOptionsToAdmin);
        req.flash('success', `An e-mail has been successfully sent to site admin.`);
        res.redirect('/campgrounds');
    } catch (err) {
        console.log(err);
        req.flash('error', `Something went wrong while requesting your account. Please, contact site admin for assistance if this error persists.`);
        res.redirect('/campgrounds');
    }
});


//Show login form
router.get("/login", recaptcha.middleware.render, (req, res) => res.render("login", {
    captcha: res.recaptcha,
    siteKey: process.env.RECAPTCHA_SITE_KEY
}));

// Handling login logic
router.post(
    "/login",
    recaptcha.middleware.verify,
    middleware.captchaVerification,
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
    } catch (err) {
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
                sort: {
                    "_id": -1
                }
            }
        }).exec();
        const allNotifications = user.notifications;
        res.render('notifications/index', {
            allNotifications
        });
    } catch (err) {
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
    } catch (err) {
        req.flash('error', err.message);
        res.redirect('back');
    }
});

module.exports = router;