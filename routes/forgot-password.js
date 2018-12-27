const express = require("express"),
    router = express.Router(),
    env = require("dotenv").config(), // process.env.DB_PASSWORD etc...
    passport = require('passport'),
    middleware = require('../middleware/index'),
    User = require('../models/user'),
    async = require('async'),
        nodemailer = require('nodemailer'),
        crypto = require('crypto');


/*=== FORGOT PASSWORD ROUTES ===*/

// FORGOT GET
router.get('/forgot', (req, res) => {
    res.render('forgot-password/forgot');
});

// FORGOT POST
router.post('/forgot', (req, res, next) => {
    async.waterfall([
            // Generate a token
            function (done) {
                crypto.randomBytes(20, (err, buf) => {
                    const token = buf.toString('hex');
                    done(err, token);
                });
            },
            // Find user with provided email and set user's token and expiration
            function (token, done) {
                User.findOne({
                    email: req.body.email
                }, (err, user) => {
                    if (!user) {
                        req.flash('error', 'No account with that email address exists');
                        return res.redirect('/forgot');
                    }

                    // Set token and expiration
                    user.resetPasswordToken = token;
                    user.resetPasswordExpires = Date.now() + 360000;

                    // Save user
                    user.save(err => {
                        done(err, token, user);
                    });
                });
            },
            // Configure NodeMailer and create an email
            function (token, user, done) {
                // Specify mail provider and set email & password
                const smtpTransport = nodemailer.createTransport({
                    service: 'Gmail',
                    auth: {
                        user: process.env.YELPCAMP2019_GMAIL_ADDRESS,
                        pass: process.env.YELPCAMP2019_GMAIL_PASSWORD
                    }
                });
                // Set mail options: receiver, subject, email body etc...
                const mailOptions = {
                    to: user.email,
                    from: process.env.YELPCAMP2019_GMAIL_ADDRESS,
                    subject: `Password Reset`,
                    text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                        'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                        'If you did not request this, please ignore this email and your password will remain unchanged.\n',
                    html: `<table>
                        <tr>
                            <td align="left">Password Reset</td>
                        </tr>
                        <tr>
                            <td>
                                You are receiving this because you (or someone else) have requested the reset of the password for your
                                account.
                                Please click on the following link, or paste this into your browser to complete the process:
                                <a href="http://${req.headers.host}/reset/${token}">Click Here</a>
                            </td>
                        </tr>
                        <tr>
                            <td align="center">If you did not request this, please ignore this email and your password will remain unchanged.</td>
                        </tr>
                    </table>
                    `
                };
                // Send mail
                smtpTransport.sendMail(mailOptions, err => {
                    req.flash('success', `An e-mail has been sent to ${user.email} with further instructions.`);
                    done(err, 'done');
                });
            }
        ],
        // Catch any errors generated throughout entire async waterfall array
        function (err) {
            if (err) {
                return next(err);
            }
            res.redirect('/forgot');
        });
});

// RESET GET
router.get('/reset/:token', (req, res) => {
    // Find a user whose token matches token in params and expiration date is not expired
    User.findOne({
        resetPasswordToken: req.params.token,
        // $gt (greater than) will look for dates that are NOT greater than today's date, therefore, not expired
        resetPasswordExpires: {
            $gt: Date.now()
        }
    }, (err, user) => {
        if (err || !user) {
            req.flash('error', 'Password reset link is invalid or expired (Error code: RT-FP-01).');
            return res.redirect('/forgot');
        }
        // If user was found and there were no errors, render reset password page and pass token to page
        res.render('forgot-password/reset', {
            token: req.params.token
        });
    });
});


// RESET POST
router.post('/reset/:token', (req, res) => {
    async.waterfall([
        function (done) {
            User.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordExpires: {
                    $gt: Date.now()
                }
            }, (err, user) => {
                // Handle errors
                if (err) {
                    req.flash('error', 'Something went wrong (Error code: RT-FP-PST)');
                    return res.redirect('/');
                }
                if (!user) {
                    req.flash('error', 'Password reset token is invalid or has expired.');
                    return res.redirect('back');
                }
                if (!req.body.password || !req.body.confirmPassword) {
                    req.flash('error', 'Please type password twice');
                    return res.redirect('back');
                }
                if (req.body.password !== req.body.confirmPassword) {
                    req.flash('error', 'Passwords do not match');
                    return res.redirect('back');
                }
                // Change password using password method
                user.setPassword(req.body.password, err => {
                    if (err) {
                        req.flash('error', err.message);
                        return res.redirect('back');
                    }
                    // Reset token and expiration date
                    user.resetPasswordToken = undefined;
                    user.resetPasswordExpires = undefined;
                    // Save the user
                    user.save(err => {
                        if (err) {
                            req.flash('error', err.message);
                            return res.redirect('back');
                        }
                        // Log the user in if everything worked out
                        req.logIn(user, err => {
                            if (err) {
                                req.flash('error', err.message);
                                return res.redirect('back');
                            }
                            done(err, user);
                        }); // end req.logIn
                    }); // end user.save
                }); // end user.setPassword
            }); // end User.findOne
        },
        // Send email
        function (user, done) {
            const smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: process.env.YELPCAMP2019_GMAIL_ADDRESS,
                    pass: process.env.YELPCAMP2019_GMAIL_PASSWORD
                }
            });
            const mailOptions = {
                to: user.email,
                from: process.env.YELPCAMP2019_GMAIL_ADDRESS,
                subject: `Your password has been changed`,
                text: 'Hello,\n\n' +
                'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n',
                html: `<table>
                    <tr>
                        <td align="left">Password Changed</td>
                    </tr>
                    <tr>
                        <td>
                            This is a confirmation that the password for your account ${user.email} has just been changed.
                        </td>
                    </tr>
                    <tr>
                        <td>If you did not request this, please ignore this email and your password will remain unchanged.</td>
                    </tr>
                </table>
                `
            };
            // Send mail
            smtpTransport.sendMail(mailOptions, err => {
                if (err) {
                    req.flash('error', err.message);
                    return res.redirect('/campgrounds');
                }
                req.flash('success', 'Success! Your password has been changed.');
                done(err);
            });
        },
    ], 
    // Handle any errors generated throughout the waterfall
    err => {
        if (err) {
            req.flash('error', 'Something went wrong');
            res.redirect('/campgrounds');
        }
        res.redirect('/campgrounds');
    });
});


module.exports = router;