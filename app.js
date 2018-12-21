const express = require("express"),
  app = express(),
  request = require("request"),
  bodyParser = require("body-parser"),
  mongoose = require("mongoose"),
  flash = require('connect-flash'),
  passport = require("passport"),
  LocalStrategy = require("passport-local"),
  env = require("dotenv").config(), // process.env.DB_PASSWORD etc...
  Campground = require("./models/campground"),
  Comment = require("./models/comment"),
  seedDB = require("./seeds"),
  methodOverride = require('method-override'),
  User = require("./models/user");

// Requiring routes
const campgroundRoutes = require("./routes/campgrounds"),
  commentRoutes = require("./routes/comments"),
  indexRoutes = require("./routes/index");
// // For development only, prepopulate sample data
// seedDB();
// Connect to mango database
mongoose.connect(
  `mongodb+srv://${process.env.DB_USER}:${
    process.env.DB_PASSWORD
  }@cluster0-fxbxa.mongodb.net/${process.env.DB_NAME}`,
  {
    useNewUrlParser: true
  }
);
// Activate body parser to be able to read request body data
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);
// Make public folder accessible
app.use(express.static(__dirname + "/public"));
// Define what method override keyword is for PUT etc
app.use(methodOverride('_method'));
// Make it so that you don't have you type .ejs extentions for render pages
app.set("view engine", "ejs");
app.use(flash());

/*== PASSPORT CONFIG ==*/
app.use(
  require("express-session")({
    secret: `${process.env.SECRET}`,
    resave: false,
    saveUninitialized: false
  })
);
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Pass on currnetUser to each route
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
  });

// Use required route files
app.use(indexRoutes);
app.use('/campgrounds', campgroundRoutes);
app.use('/campgrounds/:id/comments', commentRoutes);


/*== RUN SERVER ==*/
app.listen(3000, "127.0.0.1", () => console.log("Server running..."));
