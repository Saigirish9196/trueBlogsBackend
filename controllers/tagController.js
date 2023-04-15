const { errorHandler } = require('../helper.js/errorhandle');
const Tag = require('../models/tag')
const Blog = require('../models/blogSchema')
const slugify = require('slugify')
exports.tagCreate = (req,res) =>{
    const { name } = req.body;
    const slug = slugify(name).toLowerCase();

    Tag.findOne({slug},(err,data)=>{
        if(data){
            res.status(200).json({error:'Not Okay'})
        }else if(!data){
            const tag = new Tag({name,slug});
            tag.save((err,data)=>{
                if(err){
                    return res.status(400).json({error:errorHandler(err)})
                }
                res.json(data);
            })
                }
        })
}

exports.tagList  = (req,res)=>{
    
    Tag.find({},(err,data) =>{
        if(err){
            return res.status(200).json({error:errorHandler(err)})
        }else if(!data){
            res.status(200).json({error:"Data is Not Found"});
        }else{
            res.status(200).json(data);
        }
    })
}

exports.tagRead = (req,res)=>{
    const slug = req.params.slug.toLowerCase();
    Tag.findOne({slug},(err,tag) =>{
        if(err){
            return res.status(200).json({error:errorHandler(err)})
        }else{
            Blog.find({tags:tag})
          .populate('categories', '_id name slug')
          .populate('tags', '_id name slug')
          .populate('postedBy', '_id name shortname')
          .select('_id title slug excerpt categories tags postedBy createdAt updatedAt')
          .exec((err,data)=>{
            if(err){
              return res.status(400).json({error:errorHandler(err)});
            }else{
              res.json({tag:tag,blogs:data})
            }

      })
        }
    })
}
exports.tagDelete = (req,res)=>{
    const slug = req.params.slug.toLowerCase();
    Tag.deleteOne({slug},(err,data) =>{
        if(err){
            return res.status(200).json({error:errorHandler(err)})
        }else{
            res.status(200).json({message:"successfuly Delete TagItem"});
        }
    })
}