const express = require("express"),
  router = express.Router(),
  Review = require("../models/review"),
  Campground = require("../models/campground"),
  middleware = require("../middleware/index");

/*==========================================*/
// INDEX
router.get("/", (req, res) => {
  Campground.findById(req.params.id)
    .populate({
      path: "reviews",
      options: { sort: { createdAt: -1 } } // sorting the populated reviews array to show the latest first
    })
    .exec((err, campground) => {
      if (err || !campground) {
        // Error - campground not found
        req.flash("error", "Campground not found (Error code: RR-01)");
        res.redirect("/campgrounds");
      } else {
        res.render("reviews/index", { campground });
      }
    });
});

/*==========================================*/
// NEW
router.get("/new", (req, res) => {
  Campground.findById(req.params.id, (err, campground) => {
    if (err || !campground) {
      // Error - campground not found
      req.flash("error", "Campground not found (Error code: RR-02)");
      res.redirect("/campgrounds");
    } else {
      res.render("reviews/new", { campground });
    }
  });
});

/*==========================================*/
// CREATE
router.post("/", (req, res) => {
  Campground.findById(req.params.id),
    populate("reviews").exec((err, campground) => {
      if (err || !campground) {
        // Error - campground not found
        req.flash("error", "Campground not found (Error code: A-03)");
        res.redirect("/campgrounds");
      } else {
        Review.create(req.body.review, (err, review) => {
          if (err || !review) {
            // Error while creating review
            req.flash("error", err.message);
            res.redirect("back");
          } else {
            //add author username/id and associated campground to the review
            review.author.id = req.user._id;
            review.author.username = req.user.username;
            review.campground = campground;
            // save review
            review.save();
            campground.reviews.push(review);
            // calculate the new average review for the campground
            campground.rating = calculateAverage(campground.reviews);
            // save campground
            campground.save();
            req.flash('success', 'Your review has been successfully added.');
            res.redirect(`/campgrounds/${campground._id}`);
          }
        });
      }
    });
});


/*==========================================*/
// EDIT
router.get('/:review_id/edit', middleware.checkReviewOwnership, (req, res) => {

});


/*==========================================*/
// calculate the new average review for the campground
function calculateAverage(reviews) {
  if (reviews.length === 0) {
    return 0;
  } else {
    let sum = 0;
    reviews.forEach(element => sum + element.raiting);
    return sum / reviews.length;
  }
}

module.exports = router;
