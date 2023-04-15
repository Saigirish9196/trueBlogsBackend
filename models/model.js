const mongoose = require('mongoose');
const passportLocalMongoose = require("passport-local-mongoose");

const userScheama = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            required: true,
            max: 32
        },
        shortname: {
            type: String,
            trim: true,
            required: true,
            max: 32,
            unique: true,
            index: true,
            lowercase: true
        },
        username: {
            type: String,
            trim: true,
            required: true,
            unique: true,
            lowercase: true
        },
        profile: {
            type: String,
            required: true
        },
        about: {
            type: String
        },
        password: {
            type: String,
            // required: true
        },
        role: {
            type: Number,
            default: 0
        },
        photo: {
            data: Buffer,
            contentType: String
        },
        resetPasswordLink: {
            data: String,
            default: ''
        }
    },
    { timestamps: true }
);

userScheama.plugin(passportLocalMongoose)
module.exports = mongoose.model('User',userScheama)