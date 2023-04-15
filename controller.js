const jwt = require("jsonwebtoken");
const shortId = require('shortid');
const passport = require("passport");
const Category = require('./models/catagory')
const slugify = require('slugify');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/model');
const Blog = require('./models/blogSchema');
const { errorHandler } = require("./helper.js/errorhandle");
const { sign } = require("crypto");
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const nodemailer = require('nodemailer');
const _ = require('lodash')
const { OAuth2Client } = require('google-auth-library');
const request = require('request');


passport.use(User.createStrategy());



exports.signIn = (req,res) =>{
  const {name,username,password} = req.body;
  const user = new User({
    username:username,
    password:password
  })

  passport.authenticate("local", function(err, user, info) {
    user.photo = undefined
    
    if (user) {
      req.login(user, function(error) {
        if (!error) {
          const jwtSecret = process.env.JWT_SECRET;
          const token = jwt.sign({ user }, jwtSecret);
          const { _id, username, name, role ,shortname} = user;
            return res.json({
            message:"Successfully Login!",
            token:token,
            user:{ _id, username, name,shortname, role }
            
          })
        } else {
          console.log(error);
          return res.status(422).json({ errors: error.errors });
        }
      });
    }else{
      
      res.status(200).json({
        error: "Username and/or password is invalid"
      });
    }
         
    
  })(req,res);
  
}



exports.signOut = (req,res) => {
  req.logout((err)=>{
    if(!err){
      res.json({
        message:"Successfully logOut!"
      })
    }
  });

}

// catagory controllers

exports.create = (req, res) => {
  const { name } = req.body;
  let slug = slugify(name).toLowerCase();
  
  Category.findOne({slug:slug},(err,data)=>{
    if(data){
      res.status(200).json({error:"no okay"})
    }else if(!data){
      let category = new Category({ name:name, slug:slug });

      category.save((err, data) => {
      if (err) {
          return res.status(400).json({
              error: errorHandler(err)
          });
      }
      res.json(data);
      });
    }
  })

};

exports.list = (req,res)=>{
  Category.find({},(err,data)=>{
    if(err){
      return res.status(400).json({error:errorHandler(err)});
    }else{
      res.status(200).json(data)
    }
  })
}

exports.read = (req,res)=>{
  const slug = req.params.slug.toLowerCase();
  Category.findOne({slug:slug},(err,catagory)=>{
    if(err){
      return res.status(400).json({error:errorHandler(err)});
    }else if(catagory){
      Blog.find({categories:catagory})
          .populate('categories', '_id name slug')
          .populate('tags', '_id name slug')
          .populate('postedBy', '_id name shortname')
          .select('_id title slug excerpt categories tags postedBy createdAt updatedAt')
          .exec((err,data)=>{
            if(err){
              return res.status(400).json({error:errorHandler(err)});
            }else{
              res.json({catagory:catagory,blogs:data})
            }

      })
    }else{
      res.status(400).json({error:"data is not found"})
    }
  })
}

exports.remove = (req,res)=>{
  const slug = req.params.slug.toLowerCase();
  Category.deleteOne({slug:slug},err=>{
    if(err){
      return res.status(400).json({error:errorHandler(err)});
    }else{
      res.status(200).json({message:"sucessfuly Delete Catagory"})
    }
  })
}


// -------------------signUp-----------------------
exports.signUp = (req, res) => {
  const {password,token } = req.body;
  let shortname = shortId.generate();
  let profile = `${process.env.CLIENT_URL}/profile/${shortname}`;
  
  if(token){
    jwt.verify(token,process.env.JWT_ACCOUNT_ACTIVATION,(err,decoded)=>{

      if (err) {
        return res.status(200).json({
            error: 'Expired link. Signup again'
        });
      }
      const { name, username} = jwt.decode(token);
      const new_user = {
        name: name,
        username: username,
        shortname:shortname,
        profile:profile
      };

      if (req.file) {
        if (req.file.size > 10000000) {
          return res.status(200).json({
            error: 'Image should be less than 1MB in size',
          });
        }
        new_user.photo = {
          data: req.file.buffer,
          contentType: req.file.mimetype,
        };
      }

      User.register(new_user, password, function (err, user) {
        if (err) {
          console.log(err);
          return res.status(200).json({ error: err.message });
        } else {
          passport.authenticate('local')(req, res, function () {
            res.json({
              message: 'Successfully registered, please login!',
            });
          });
        }
      });



    })
  }else {
    return res.json({
        message: 'Something went wrong. Try again'
    });
  }
  
};

///----------------pre-signUp-----------------------------

exports.preSignup = (req,res) => {
  const { name, username } = req.body;
  const new_user = {
    name: name,
    username: username,
  };

  User.findOne({username:username.toLowerCase()},(err,user)=>{
    if(user){
      return res.status(200).json({
        error: 'Email is taken'
    });
    }
    const token = jwt.sign(new_user, process.env.JWT_ACCOUNT_ACTIVATION, { expiresIn: '10m' });
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    const emailData = {
      from: process.env.EMAIL_FROM,
      to: username,
      subject: `Account activation link`,
      html: `
      <p>Please use the following link to activate your acccount:</p>
      <a href='${process.env.CLIENT_URL}/auth/account/activate/${token}'>
        <button style="background:#3630a3;color:white;">Active account</button>
      </a>

      <hr />
      <p>This email may contain sensetive information</p>
      <p>https://seoblog.com</p>
    `
    };
    transporter.sendMail(emailData)
      .then(sent => {
        return res.json({
          message: `Email has been sent to ${username}. Follow the instructions to please active your account. Link expires in 10min.`
      });
    });



  })

}

// ----------------forgotPassword--------------------------
exports.forgotPassword = (req,res) => {
  const {username} = req.body;

  User.findOne({username},(err,user)=>{
    if(err|| !user){
       return res.status(200).json({
        error: 'User with that email does not exist'
    });
    }
    const token = jwt.sign({_id:user._id},process.env.JWT_RESET_PASSWORD,{ expiresIn: '10m' })

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const emailData = {
      from: process.env.EMAIL_FROM,
      to: username,
      subject: `Password reset link`,
      html: `
      <p>Please use the following link to reset your password:</p>
      
      <a href="${process.env.CLIENT_URL}/auth/password/reset/${token}">
        <button style="background:#3630a3;color:white;">resetPassword</button>
      </a>
      <hr />
      <p>This email may contain sensetive information</p>
      <p>https://seoblog.com</p>
  `
  };
  // <p>${process.env.CLIENT_URL}/auth/password/reset/${token}</p>
  return user.updateOne({resetPasswordLink:token},(err,sucess)=>{
    if (err) {
      return res.json({ error: errorHandler(err) });
    }else{
      transporter.sendMail(emailData)
      .then(sent => {
        return res.json({
          message: `Email has been sent to ${username}. Follow the instructions to reset your password. Link expires in 10min.`
      });
      });
    }

  })

  })

}

//--------------------resetPassword------------------------

exports.resetPassword = (req, res) => {
  const { resetPasswordLink, newPassword } = req.body;

  if (resetPasswordLink) {
    jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD, function(err, decoded) {
      if (err) {
        return res.status(200).json({
          error: 'Expired link. Try again'
        });
      }
      User.findOne({ resetPasswordLink }, (err, user) => {
        if (err || !user) {
          return res.status(200).json({
            error: 'Something went wrong. Try later'
          });
        }
        user.setPassword(newPassword, (err, user) => {
          if (err) {
            return res.status(200).json({
              error: errorHandler(err)
            });
          }
          user.resetPasswordLink = '';
          user.save((err, result) => {
            if (err) {
              return res.status(200).json({
                error: errorHandler(err)
              });
            }
            res.json({
              message: `Great! Now you can login with your new password`
            });
          });
        });
      });
    });
  }
};

// ----------------Google-Login----------------------------------
const client = new OAuth2Client(process.env.CLIENT_ID);
exports.googleLogin = (req,res) => {
  const idToken = req.body.tokenId;
  client.verifyIdToken({ idToken, audience: process.env.CLIENT_ID }).then(response => {
    // console.log(response)
    const { email_verified, name, email, jti,picture } = response.payload;
    if (email_verified) {
      let google_email ="google_email:"+email
      User.findOne({username:google_email},(err,user)=>{
        if(user){
          user.photo = undefined
          console.log(user)
          const jwtSecret = process.env.JWT_SECRET;
          const token = jwt.sign({ user }, jwtSecret);
          const { _id, username, name,  role ,shortname} = user;
            return res.json({
            token:token,
            user:{ _id, username, name,shortname, role }
            
          })

        }else{
          let shortname = shortId.generate();
          let profile = `${process.env.CLIENT_URL}/profile/${shortname}`;
          let password = jti;
          const new_user = {
            name: name,
            username: google_email,
            shortname:shortname,
            profile:profile,
            googleId:email
            
          };
    
          if (picture) {
            request.get(picture, { encoding: null }, (err, response, body) => {
              if (err) {
                console.log(err);
                return res.status(200).json({ error: err.message });
              }
              photo = {
                data: body,
                contentType: response.headers['content-type'],
              };
              console.log(new_user)
              User.findOneAndUpdate(
                { username: new_user.username}, // query to match the document
                { $set: {photo:photo} }, // update to apply
                 // options for the update operation
                (err, user) => { // callback function to handle the result of the update operation
                  if (err) {
                    console.log(err);
                    return;
                  }
                  console.log("sucess")
                 // the updated user document with the new interest pushed to the interests array
                }
              );
            })
          }

       User.register(new_user, password, function (err, user) {
            if (err) {
              console.log(err);
              return res.status(200).json({ error: err.message });
            } else {
              passport.authenticate('google')(req, res, function () {
                
                const jwtSecret = process.env.JWT_SECRET;
                const token = jwt.sign({ user }, jwtSecret);
                const { _id, username, name,  role ,shortname} = user;
                  return res.json({
                  token:token,
                  user:{ _id, username, name,shortname, role }
                })
              });
            }
          });
    
        }
      })
    
    } else {
        return res.status(200).json({
            error: 'Google login failed. Try again.'
        });
    }
});
  
}

