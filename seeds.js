const mongoose = require('mongoose');
const Campground = require('./models/campground');
const Comment = require('./models/comment');

const data = [{
        name: 'Camp 1',
        image: 'https://source.unsplash.com/300x300?camp',
        description: `Lorem ipsum dolor sit, amet consectetur adipisicing elit. Adipisci fugit ullam, reiciendis id unde laudantium non error blanditiis voluptatem nisi consequatur atque tenetur explicabo ipsam sunt numquam maxime officiis modi minus earum incidunt! Dolor provident beatae voluptates rerum culpa qui, vitae hic corporis quo quisquam consequatur eaque at veritatis modi quas quia facilis deserunt fugiat animi nemo accusamus sapiente nulla atque. Amet nisi, quos atque dignissimos eius a reprehenderit incidunt! Vel earum sunt excepturi inventore repellendus? Ducimus, vel dolore! Porro incidunt aliquam, ipsa vel fugiat reiciendis praesentium adipisci quisquam. Dolores sunt incidunt iure hic corrupti id quasi sapiente maxime maiores ullam in eligendi fuga odit ipsa, minima natus veritatis modi ad at earum aspernatur, ratione a deserunt? Blanditiis in suscipit deleniti sapiente obcaecati rem velit? Nam aliquid ipsa ratione eius perferendis mollitia! Facere excepturi consequuntur maiores aut explicabo vero in quaerat vitae vel voluptates? Aperiam iure perferendis assumenda, hic suscipit dolorum ullam tempora tenetur accusantium nam in magni cupiditate nostrum quam dolorem cumque delectus illo ad itaque ab beatae natus unde ex modi! Aliquam, laborum? Ab magnam laborum aliquid dolorum maxime recusandae atque blanditiis quaerat ipsa corrupti, fugiat alias sunt. Perferendis eos, vel nesciunt ratione hic necessitatibus id autem iste?`
    },
    {
        name: 'Camp 2',
        image: 'https://source.unsplash.com/302x302?camp',
        description: `Lorem ipsum dolor sit, amet consectetur adipisicing elit. Adipisci fugit ullam, reiciendis id unde laudantium non error blanditiis voluptatem nisi consequatur atque tenetur explicabo ipsam sunt numquam maxime officiis modi minus earum incidunt! Dolor provident beatae voluptates rerum culpa qui, vitae hic corporis quo quisquam consequatur eaque at veritatis modi quas quia facilis deserunt fugiat animi nemo accusamus sapiente nulla atque. Amet nisi, quos atque dignissimos eius a reprehenderit incidunt! Vel earum sunt excepturi inventore repellendus? Ducimus, vel dolore! Porro incidunt aliquam, ipsa vel fugiat reiciendis praesentium adipisci quisquam. Dolores sunt incidunt iure hic corrupti id quasi sapiente maxime maiores ullam in eligendi fuga odit ipsa, minima natus veritatis modi ad at earum aspernatur, ratione a deserunt? Blanditiis in suscipit deleniti sapiente obcaecati rem velit? Nam aliquid ipsa ratione eius perferendis mollitia! Facere excepturi consequuntur maiores aut explicabo vero in quaerat vitae vel voluptates? Aperiam iure perferendis assumenda, hic suscipit dolorum ullam tempora tenetur accusantium nam in magni cupiditate nostrum quam dolorem cumque delectus illo ad itaque ab beatae natus unde ex modi! Aliquam, laborum? Ab magnam laborum aliquid dolorum maxime recusandae atque blanditiis quaerat ipsa corrupti, fugiat alias sunt. Perferendis eos, vel nesciunt ratione hic necessitatibus id autem iste?`
    },
    {
        name: 'Camp 3',
        image: 'https://source.unsplash.com/301x301?camp',
        description: `Lorem ipsum dolor sit, amet consectetur adipisicing elit. Adipisci fugit ullam, reiciendis id unde laudantium non error blanditiis voluptatem nisi consequatur atque tenetur explicabo ipsam sunt numquam maxime officiis modi minus earum incidunt! Dolor provident beatae voluptates rerum culpa qui, vitae hic corporis quo quisquam consequatur eaque at veritatis modi quas quia facilis deserunt fugiat animi nemo accusamus sapiente nulla atque. Amet nisi, quos atque dignissimos eius a reprehenderit incidunt! Vel earum sunt excepturi inventore repellendus? Ducimus, vel dolore! Porro incidunt aliquam, ipsa vel fugiat reiciendis praesentium adipisci quisquam. Dolores sunt incidunt iure hic corrupti id quasi sapiente maxime maiores ullam in eligendi fuga odit ipsa, minima natus veritatis modi ad at earum aspernatur, ratione a deserunt? Blanditiis in suscipit deleniti sapiente obcaecati rem velit? Nam aliquid ipsa ratione eius perferendis mollitia! Facere excepturi consequuntur maiores aut explicabo vero in quaerat vitae vel voluptates? Aperiam iure perferendis assumenda, hic suscipit dolorum ullam tempora tenetur accusantium nam in magni cupiditate nostrum quam dolorem cumque delectus illo ad itaque ab beatae natus unde ex modi! Aliquam, laborum? Ab magnam laborum aliquid dolorum maxime recusandae atque blanditiis quaerat ipsa corrupti, fugiat alias sunt. Perferendis eos, vel nesciunt ratione hic necessitatibus id autem iste?`
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