const express = require('express');
const { signUp, signIn, signOut, create, list, read, remove, forgotPassword, resetPassword, preSignup, googleLogin, googleLoginSecret } = require('./controller');
const router = express.Router()
const session = require('express-session');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const passport = require("passport");
const users = require('./models/model');
const { requireAuth, validatorMsgSignIn, validatorMsgSignUp, runValidators, forgotPasswordValidator, resetPasswordValidator, validatorMsgAfterSignUp } = require('./middlewares/require');
const { validatorMsgCatagory, adminMiddleware, authMiddleware, canUpdateDeleteBlog } = require('./middlewares/adminuserAuyj');
const { validatorMsgTag } = require('./middlewares/tagvalidatoe');
const { tagCreate, tagList, tagRead, tagDelete } = require('./controllers/tagController');
const {listRelatedBlogs,createBlog,listsBlog,listAllBlogsCatsTags,readBlog,removeBlog,updateBlog,blogPhoto, searchBlog, listByUser} = require('./controllers/blogController');
const { readProfile,publicProfile,updateProfile,profilePhoto } = require('./controllers/userController');
const multer = require('multer');
const User = require('./models/model');
const { contactForm } = require('./controllers/formcontroler');
const { contactFormValidator } = require('./middlewares/form');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


router.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false
}));


router.use(passport.initialize());
router.use(passport.session());

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

// define the jwt strategy
const jwtStrategy = new JwtStrategy(jwtOptions, (payload, done) => {
  const user = users.find(user => user.id === payload.user.id);

  if (user) {
    done(null, user);
  } else {
    done(null, false);
  }
});
passport.use('jwt', jwtStrategy);

// Serialize user object to session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user object from session
passport.deserializeUser((id, done) => {
  const user = users.find(user => user.id === id);
  done(null, user);
});


router.get('/', (req, res) => {
  res.send('Hello World!')
})

// express validatores
router.post('/pre-signUp',upload.single('file'),validatorMsgSignUp,runValidators, preSignup)
router.post('/signUp',upload.single('file'),validatorMsgAfterSignUp,runValidators, signUp)

router.post('/signIn',validatorMsgSignIn,runValidators,signIn)

router.get('/signOut',signOut);

// password reset and forgot password

router.put('/forgot-password', forgotPasswordValidator, runValidators, forgotPassword);
router.put('/reset-password', resetPasswordValidator , runValidators, resetPassword);





// catagory routes
router.post('/category', validatorMsgCatagory, runValidators, requireAuth, adminMiddleware, create);
router.get('/catagories',list)
router.get('/catagory/:slug',read)
router.delete('/catagory/:slug',requireAuth,adminMiddleware,remove)
//tag routes
router.post('/tag',validatorMsgTag,runValidators,requireAuth,adminMiddleware,tagCreate)
router.get('/tages',tagList)
router.get('/tag/:slug',tagRead)
router.delete('/tag/:slug',requireAuth,adminMiddleware,tagDelete)

// Blog routes

router.post('/blog',requireAuth,adminMiddleware,createBlog)
router.get('/blogs',listsBlog)
router.post('/blogs-categories-tags',listAllBlogsCatsTags)
router.get('/blog/:slug',readBlog)
router.delete('/blog/:slug',requireAuth,adminMiddleware,removeBlog)
router.put('/blog/:slug',requireAuth,adminMiddleware,updateBlog)
router.get('/blog/photo/:slug',blogPhoto)
router.post('/blogs/related',listRelatedBlogs)
router.get('/blogs/search',searchBlog)

// auth user blog crud
router.post('/user/blog', requireAuth, createBlog);
router.get('/:username/blogs', listByUser);
router.delete('/user/blog/:slug', requireAuth,canUpdateDeleteBlog,removeBlog);
router.put('/user/blog/:slug', requireAuth,canUpdateDeleteBlog, updateBlog);

// user router
router.get('/user/profile', requireAuth,authMiddleware,readProfile);
router.get('/user/:username', publicProfile);
router.put('/user/update',requireAuth,authMiddleware, updateProfile);
router.get('/user/photo/:username',profilePhoto);

router.post('/contact',contactFormValidator,runValidators,contactForm)

router.post('/google-login', googleLogin);

router.get('/dashboard',requireAuth, (req, res) => {
  const user = req.user;
  if (user) {
    res.json({
      dashboardData: {
        name: user.name,
        username: user.username,
        shortname: user.shortname,
        role:user.role
      }
    });
  } else {
    res.status(401).json({ error: 'User not found' });
  }
});

module.exports = router;
