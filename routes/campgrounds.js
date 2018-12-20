const express = require("express");
const router = express.Router();
const Campground = require('../models/campground');

// INDEX - Show all campgrounds
router.get("/campgrounds", (req, res) => {
  // Get all campgrounds from DB
  Campground.find({})
    .populate("comments")
    .exec((err, allCampgrounds) => {
      if (err) {
        console.log(err);
      } else {
        res.render("campgrounds/index", {
          campgrounds: allCampgrounds
        });
      }
    });
});

// CREATE - Create new campground
router.post("/campgrounds", (req, res) => {
  // Get data from form and add to campground array
  const name = req.body.name,
    image = req.body.image,
    description = req.body.description,
    newCampground = {
      name,
      image,
      description
    };

  Campground.create(newCampground, (err, newlyCreated) => {
    if (err) {
      console.log(err);
    } else {
      // Redirect back to campground page
      res.redirect("/campgrounds");
    }
  });
});

// NEW - Show form to create new campground
router.get("/campgrounds/new", (req, res) => res.render("campgrounds/new"));

// SHOW - Shows more info about one campground
router.get("/campgrounds/:id", (req, res) => {
  // Find the campground with provided ID
  Campground.findById(req.params.id)
    .populate("comments")
    .exec((err, foundCampground) => {
      if (err) {
        console.log(err);
      } else {
        // Render show template with that campground
        res.render("campgrounds/show", {
          campground: foundCampground
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
