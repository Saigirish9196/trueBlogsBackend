const User = require('../models/model')
const jwt = require("jsonwebtoken");
const { check, validationResult } = require('express-validator');
exports.requireAuth = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
        console.log(decodedToken.user._id)
        if (err) {
          res.status(401).json({ error: 'Invalid token' });
        } else {
          User.findOne({_id:decodedToken.user._id})
            .then(user => {
              req.user = user;
              next();
            })
            .catch(err => {
              res.status(401).json({ error: 'Invalid token' });
            });
        }
      });
    } else {
      res.status(401).json({ error: 'Token not provided' });
    }
  };


// check valid deatails or not
exports.validatorMsgSignUp = [
    check('username').isEmail()
    .withMessage("please Enter valid email"),
    // check('password').isLength({ min: 8 })
    // .withMessage("password  must be valid 8 charcters"),
    check('name').not().isEmpty()
    .withMessage('please required name.')
  ]
  exports.validatorMsgAfterSignUp = [
    check('password').isLength({ min: 8 })
    .withMessage("password  must be valid 8 charcters")
  ]
  

  // signIn router message
exports.validatorMsgSignIn = [
    check('username').isEmail()
    .withMessage("please Enter valid email"),
    check('password').isLength({ min: 8 })
    .withMessage("password  must be valid is required")
  ]
  
  // after check any errors error message display
exports.runValidators =  (req, res,next) => {
    const errors = validationResult(req);
    console.log(errors)
    if (!errors.isEmpty()) {
      if(errors.array()[1]){
        return res.status(200).json({ error: errors.array()[1].msg });
      }else{
      return res.status(200).json({ error: errors.array()[0].msg });
      }
    }
    next();
    // Process the signup request
}

// forgot password and reset password

exports.forgotPasswordValidator = [
  check('username')
      .not()
      .isEmpty()
      .isEmail()
      .withMessage('Must be a valid email address')
];

exports.resetPasswordValidator = [
  check('newPassword')
      .not()
      .isEmpty()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 6 characters long')
];