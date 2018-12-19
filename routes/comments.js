const express = require("express");
const router = express.Router();
const Campground = require('../models/campground');
const Comment = require('../models/comment');

router.get("/campgrounds/:id/comments/new", isLoggedIn, (req, res) => {
  Campground.findById(req.params.id, (err, foundCampground) => {
    if (err) {
      console.log(err);
    } else {
      res.render("comments/new", {
        campground: foundCampground
      });
    }
  });
});

router.post("/campgrounds/:id/comments", isLoggedIn, (req, res) => {
  // Lookup campground using ID
  Campground.findById(req.params.id, (err, foundCampground) => {
    if (err) {
      console.log(err);
      res.redirect("/campgrounds");
    } else {
      // Create new comment
      Comment.create(req.body.comment, (err, comment) => {
        if (err) {
          console.log(err);
          res.redirect("/campgrounds");
        } else {
          // Connect new comment to campground
          foundCampground.comments.push(comment);
          foundCampground.save((err, campground) => {
            if (err) {
              console.log(err);
            } else {
              // Redirect to campground show
              console.log(campground);
              res.redirect(`/campgrounds/${campground._id}`);
            }
          });
        }
      });
    }
  });
});

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect("/login");
  }

module.exports = router;
