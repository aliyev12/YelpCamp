const express = require('express'),
    app = express(),
    request = require('request'),
    bodyParser = require('body-parser'),
    mongoose = require('mongoose'),
    env = require('dotenv').config(), // process.env.DB_PASSWORD etc...
    Campground = require('./models/campground'),
    Comment = require('./models/comment'),
    seedDB = require('./seeds');

seedDB();

mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0-fxbxa.mongodb.net/${process.env.DB_NAME}`, {
    useNewUrlParser: true
});

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static('public'));

app.set('view engine', 'ejs');


/*== ROUTES ==*/

app.get('/', (req, res) => res.render('landing'));

// INDEX - Show all campgrounds
app.get('/campgrounds', (req, res) => {
    // Get all campgrounds from DB
    Campground.find({}).populate('comments').exec((err, allCampgrounds) => {
        if (err) {
            console.log(err);
        } else {
            res.render('campgrounds/index', {
                campgrounds: allCampgrounds
            });
        }
    });
});

// CREATE - Create new campground
app.post('/campgrounds', (req, res) => {
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
            res.redirect('/campgrounds');
        }
    });
});

// NEW - Show form to create new campground
app.get('/campgrounds/new', (req, res) => res.render('campgrounds/new'));

// SHOW - Shows more info about one campground
app.get('/campgrounds/:id', (req, res) => {
    // Find the campground with provided ID
    Campground.findById(req.params.id).populate('comments').exec((err, foundCampground) => {
        if (err) {
            console.log(err);
        } else {
            // Render show template with that campground
            res.render('campgrounds/show', {
                campground: foundCampground
            });
        }
    });
});

// ==============================
// COMMENTS ROUTES
// ==============================

app.get('/campgrounds/:id/comments/new', (req, res) => {
    Campground.findById(req.params.id, (err, foundCampground) => {
        if (err) {
            console.log(err);
        } else {
            res.render('comments/new', {
                campground: foundCampground
            });
        }
    });
});

app.listen(3000, '127.0.0.1', () => console.log('Server running...'));