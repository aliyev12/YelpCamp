const mongoose = require('mongoose');
const Campground = require('./models/campground');
const Comment = require('./models/comment');

const data = [{
        name: 'Camp 1',
        image: 'https://source.unsplash.com/300x300?camp',
        description: 'bla bla bla'
    },
    {
        name: 'Camp 2',
        image: 'https://source.unsplash.com/302x302?camp',
        description: 'bla bla bla'
    },
    {
        name: 'Camp 3',
        image: 'https://source.unsplash.com/301x301?camp',
        description: 'bla bla bla'
    }
];

function seedDB() {
    // Remove all campgrounds
    Campground.remove({}, (err) => {
        if (err) {
            console.log(err);
        } 
            console.log('removed campgrounds!');
            // add a few campgrounds
            data.forEach(seed => {
                Campground.create(seed, (err, campground) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('added a campground...');
                        Comment.create({
                            text: 'This place hshdshjsjdhshjdjhsd sdh jhsd jhsd hhsd jhsd hj',
                            author: 'Homer'
                        }, (err, comment) => {
                            if (err) {
                                console.log(err);
                            } else {
                                campground.comments.push(comment);
                                campground.save();
                                console.log('Created new comment');
                            }
                        });
                    }
                });
            });
    });

    // add a few comments
}



module.exports = seedDB;