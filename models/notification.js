const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    username: String,
    isRead: {
        type: Boolean,
        default: false
    },
    campgroundId: String
}, {
    // if timestamps are set to true, mongoose assigns createdAt and updatedAt fields to your schema, the type assigned is Date.
    timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);