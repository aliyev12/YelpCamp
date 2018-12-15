const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));

app.set('view engine', 'ejs');

const campgrounds = [
 {name: 'Salmon', image: 'https://source.unsplash.com/random/300x300'},
 {name: 'Shrimp', image: 'https://source.unsplash.com/random/300x300'},
 {name: 'Herring', image: 'https://source.unsplash.com/random/300x300'},
 {name: 'Salmon', image: 'https://source.unsplash.com/random/300x300'},
 {name: 'Shrimp', image: 'https://source.unsplash.com/random/300x300'},
 {name: 'Herring', image: 'https://source.unsplash.com/random/300x300'},
 {name: 'Salmon', image: 'https://source.unsplash.com/random/300x300'},
 {name: 'Shrimp', image: 'https://source.unsplash.com/random/300x300'},
 {name: 'Herring', image: 'https://source.unsplash.com/random/300x300'}
];

app.get('/', (req, res) => res.render('landing'));

app.get('/campgrounds', (req, res) => {
 res.render('campgrounds', {campgrounds});
});

app.post('/campgrounds', (req, res) => {
 // Get data from form and add to campground array
 const name = req.body.name,
       image = req.body.image,
       newCampground = {name, image};

 campgrounds.push(newCampground);

 // Redirect back to campground page
 res.redirect('/campgrounds');
});

app.get('/campgrounds/new', (req, res) => res.render('new.ejs'));

app.listen(3000, '127.0.0.1', () => console.log('Server running...'));