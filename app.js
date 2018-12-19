const express = require("express"),
  app = express(),
  request = require("request"),
  bodyParser = require("body-parser"),
  mongoose = require("mongoose"),
  passport = require("passport"),
  LocalStrategy = require("passport-local"),
  env = require("dotenv").config(), // process.env.DB_PASSWORD etc...
  Campground = require("./models/campground"),
  Comment = require("./models/comment"),
  seedDB = require("./seeds"),
  User = require("./models/user");

const campgroundRoutes = require("./routes/campgrounds"),
  commentRoutes = require("./routes/comments"),
  indexRoutes = require("./routes/index");

seedDB();

mongoose.connect(
  `mongodb+srv://${process.env.DB_USER}:${
    process.env.DB_PASSWORD
  }@cluster0-fxbxa.mongodb.net/${process.env.DB_NAME}`,
  {
    useNewUrlParser: true
  }
);

app.use(
  bodyParser.urlencoded({
    extended: true
  })
);
app.use(express.static(__dirname + "/public"));

app.set("view engine", "ejs");

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
  next();
});

app.use(indexRoutes);
app.use();

/*== RUN SERVER ==*/

app.listen(3000, "127.0.0.1", () => console.log("Server running..."));
