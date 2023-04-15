const User = require('../models/model');
const Blog = require('../models/blogSchema');
const _ = require('lodash');
const { errorHandler } = require('../helper.js/errorhandle');
const formidable = require('formidable');
const fs = require('fs')
const bcrypt = require('bcrypt');

exports.publicProfile = (req, res) => {
    let username = req.params.username;
    let user;

    User.findOne({ shortname:username }).exec((err, userFromDB) => {
        if (err || !userFromDB) {
            return res.status(400).json({
                error: 'User not found'
            });
        }
        user = userFromDB;
        let userId = user._id;
        Blog.find({ postedBy: userId })
            .populate('categories', '_id name slug')
            .populate('tags', '_id name slug')
            .populate('postedBy', '_id name')
            .limit(10)
            .select('_id title slug excerpt categories tags postedBy createdAt updatedAt')
            .exec((err, data) => {
                if (err) {
                    return res.status(400).json({
                        error: errorHandler(err)
                    });
                }
                user.photo = undefined;
                user.password = undefined;
                res.json({
                    user,
                    blogs: data
                });
            });
    });
};


exports.updateProfile = (req,res) => {
    let form = new formidable.IncomingForm();
    form.keepExtension = true;
    form.parse(req, (err, fields, files) => {
        if (err) {
            return res.status(200).json({
                error: 'Image could not upload'
            });
        }
        let user = req.user
        user = _.extend(user, fields);
        
        if (files.photo) {
            if (files.photo.size > 10000000) {
                return res.status(200).json({
                    error: 'Image should be less then 1mb in size'
                });
            }
            user.photo.data = fs.readFileSync(files.photo.filepath);
            user.photo.contentType = files.photo.type;
        }

        if (fields.password) {

            if(fields.password.length<6){
                return res.status(200).json({
                    error: 'Password should be min 6 characters long'
                });
            }else{
            user.changePassword(fields.oldPassword, fields.password, (err) => {
                if (err) {
                    return res.status(200).json({
                        error: 'Failed to update password'
                    });
                }
            });
            }
        }

        user.save((err, result) => {
            if (err) {
                return res.status(200).json({
                    error: 'All filds required'
                });
            }
            user.password = undefined;
            user.photo = undefined;
            res.json(user);
        });



    })
}



exports.profilePhoto = (req, res) => {
    const username = req.params.username;
    User.findOne({shortname:username }).exec((err, user) => {
        if (err || !user) {
            return res.status(400).json({
                error: 'User not found'
            });
        }
        if (user.photo.data) {
            res.set('Content-Type', user.photo.contentType);
            return res.send(user.photo.data);
        }
    });
};


exports.readProfile = (req, res) => {
    req.profile.password = undefined;
    return res.json(req.profile);
};










// update fields

