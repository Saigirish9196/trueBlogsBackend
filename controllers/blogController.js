const Blog = require('../models/blogSchema');
const Category = require('../models/catagory');
const Tag = require('../models/tag');
const User = require('../models/model')
const formidable = require('formidable');
const slugify = require('slugify');
const stripHtml = require("string-strip-html");
const _ = require('lodash');
const fs = require('fs');
const { errorHandler } = require('../helper.js/errorhandle');
const { smartTrim } = require('../helper.js/bloghelper');
const { search } = require('../routes');

exports.createBlog = (req, res) => {
    let form = new formidable.IncomingForm();
    form.keepExtensions = true;
    form.parse(req, (err, fields, files) => {
        if (err) {
            return res.status(200).json({
                error: 'Image could not upload'
            });
        }

        if (!files || Object.keys(files).length === 0) {
            return res.status(200).json({
                error: 'No photo uploaded'
            });
        }

        const { title, body, categories, tags } = fields;

        if (!title || !title.length) {
            return res.status(200).json({
                error: 'title is required'
            });
        }

        if (!body || body.length < 200) {
            return res.status(200).json({
                error: 'Content is too short'
            });
        }

        if (!categories || categories.length === 0) {
            return res.status(200).json({
                error: 'At least one category is required'
            });
        }

        if (!tags || tags.length === 0) {
            return res.status(200).json({
                error: 'At least one tag is required'
            });
        }

        let blog = new Blog();
        blog.title = title;
        blog.body = body;
        blog.excerpt = smartTrim(body, 320, ' ', ' ...');
        blog.slug = slugify(title).toLowerCase();
        blog.mtitle = `${title} | ${process.env.APP_NAME}`;
        blog.mdesc = stripHtml(body.substring(0, 160));
        blog.postedBy = req.user._id;
        // categories and tags
        let arrayOfCategories = categories && categories.split(',');
        let arrayOfTags = tags && tags.split(',');

        if (files.photo) {
            if (files.photo.size > 10000000) {
                return res.status(200).json({
                    error: 'Image should be less then 1mb in size'
                });
            }
            blog.photo.data = fs.readFileSync(files.photo.filepath);
            blog.photo.contentType = files.photo.type;
        }

        blog.save((err, result) => {
            if (err) {
                return res.status(400).json({
                    error: errorHandler(err)
                });
            }
            // res.json(result);
            Blog.findByIdAndUpdate(result._id, { $push: { categories: arrayOfCategories } }, { new: true }).exec(
                (err, result) => {
                    if (err) {
                        return res.status(400).json({
                            error: errorHandler(err)
                        });
                    } else {
                        Blog.findByIdAndUpdate(result._id, { $push: { tags: arrayOfTags } }, { new: true }).exec(
                            (err, result) => {
                                if (err) {
                                    return res.status(400).json({
                                        error: errorHandler(err)
                                    });
                                } else {
                                    res.json(result);
                                }
                            }
                        );
                    }
                }
            );
        });
    });
};


// listsBlog,listAllBlogsCatsTags,readBlog,removeBlog,updateBlog

exports.listsBlog = (req,res)=>{

    Blog.find({})
        .populate("categories","_id name slug")
        .populate("tags","_id name slug")
        .populate("postedBy","_id name shortname")
        .select('_id title slug excerpt categories tags postedBy createdAt updatedAt')
        .exec((err,data)=>{
            if (err) {
                return res.json({
                    error: errorHandler(err)
                });
            }
            res.json(data);
        })

}

exports.listAllBlogsCatsTags = (req,res) =>{
    let limit = req.body.limit ? parseInt(req.body.limit) : 10;
    let skip = req.body.skip ? parseInt(req.body.skip) : 0;

    let blogs;
    let categories;
    let tags;

    Blog.find({})
        .populate('categories', '_id name slug')
        .populate('tags', '_id name slug')
        .populate('postedBy', '_id name shortname profile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id title slug excerpt categories tags postedBy createdAt updatedAt')
        .exec((err, data) => {
            if (err) {
                return res.json({
                    error: errorHandler(err)
                });
            }
            blogs = data; // blogs
            // get all categories
            Category.find({}).exec((err, c) => {
                if (err) {
                    return res.json({
                        error: errorHandler(err)
                    });
                }
                categories = c; // categories
                // get all tags
                Tag.find({}).exec((err, t) => {
                    if (err) {
                        return res.json({
                            error: errorHandler(err)
                        });
                    }
                    tags = t;
                    // return all blogs categories tags
                    res.json({ blogs, categories, tags, size: blogs.length });
                });
            });
        });
}

exports.readBlog = (req,res) =>{
    const slug = req.params.slug.toLowerCase();
    Blog.findOne({slug})
    .populate("categories","_id name slug")
    .populate("tags","_id name slug")
    .populate("postedBy","_id name shortname")
    .select('_id title slug body mdesc mtitle categories tags postedBy createdAt updatedAt')   
    .exec((err,data)=>{
        if(err){
            return res.status(200).json({error:errorHandler(err)})
        }
        res.json(data)
    })

}

exports.removeBlog = (req,res) =>{
    const slug = req.params.slug.toLowerCase();
    Blog.deleteOne({slug},(err,data) =>{
        if(err){
            return res.status(200).json({error:errorHandler(err)})
        }else{
            res.status(200).json({message:"successfuly Delete TagItem"});
        }
    })

}
exports.updateBlog = (req,res) =>{
    const slug = req.params.slug.toLowerCase();

    Blog.findOne({ slug }).exec((err, oldBlog) => {
        if (err) {
            return res.status(400).json({
                error: errorHandler(err)
            });
        }

        let form = new formidable.IncomingForm();
        form.keepExtensions = true;

        form.parse(req, (err, fields, files) => {
            if (err) {
                return res.status(200).json({
                    error: 'Image could not upload'
                });
            }

           

            let slugBeforeMerge = oldBlog.slug;
            oldBlog = _.merge(oldBlog, fields);
            oldBlog.slug = slugBeforeMerge;

            const { body, categories, tags } = fields;

            if (body) {
                oldBlog.excerpt = smartTrim(body, 320, ' ', ' ...');
                oldBlog.mdesc = stripHtml(body.substring(0, 160));
            }

            if (categories) {
                oldBlog.categories = categories.split(',');
            }

            if (tags) {
                oldBlog.tags = tags.split(',');
            }

            if (files.photo) {
                if (files.photo.size > 10000000) {
                    return res.status(200).json({
                        error: 'Image should be less then 1mb in size'
                    });
                }
                oldBlog.photo.data = fs.readFileSync(files.photo.filepath);
                oldBlog.photo.contentType = files.photo.type;
            }

            oldBlog.save((err, result) => {
                if (err) {
                    return res.status(200).json({
                        error: errorHandler(err)
                    });
                }
                // result.photo = undefined;
                res.json(result);
            });
        });
    });

}

exports.blogPhoto = (req,res) => {
    const slug = req.params.slug.toLowerCase();

    Blog.findOne({slug})
    .select('photo')
    .exec((err,blog)=>{
        if(err || !blog){
            return res.json({
                error: errorHandler(err)
            });
        }
        res.set('Content-Type', blog.photo.contentType);
        return res.send(blog.photo.data);

    })


}

// listRelatedBlogs of blogs

exports.listRelatedBlogs = (req,res) => {
 const limit = req.body.limit ? parseInt(req.body.limit) : 3;
 const {_id,categories} = req.body.blog
 
 Blog.find({_id:{$ne:_id},categories:{$in:categories}})
 .limit(limit)
 .populate("postedBy","_id name shortname profile")
 .select('_id title slug excerpt categories tags postedBy createdAt updatedAt')
    .exec((err,blogs)=>{
        console.log(blogs);
        if(err){
            return res.json({
                error: errorHandler(err)
            });
        }
        res.json(blogs)
    })

}


// search blogs
exports.searchBlog = (req,res) => {
    console.log(req.query);
    const { search } = req.query;
    if (search) {
        Blog.find(
            {
                $or: [{ title: { $regex: search, $options: 'i' } }, { body: { $regex: search, $options: 'i' } }]
            },
            (err, blogs) => {
                if (err) {
                    return res.status(400).json({
                        error: errorHandler(err)
                    });
                }
                res.json(blogs);
            }
        ).select('-photo -body');
    }
}




exports.listByUser = (req, res) => {
    User.findOne({ shortname: req.params.username }).exec((err, user) => {
        if (err) {
            return res.status(400).json({
                error: errorHandler(err)
            });
        }
        let userId = user._id;
        Blog.find({ postedBy: userId })
            .populate('categories', '_id name slug')
            .populate('tags', '_id name slug')
            .populate('postedBy', '_id name shortname')
            .select('_id title slug postedBy createdAt updatedAt')
            .exec((err, data) => {
                if (err) {
                    return res.status(400).json({
                        error: errorHandler(err)
                    });
                }
                res.json(data);
            });
    });
};