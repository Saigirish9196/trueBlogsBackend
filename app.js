// We can use express as shown as below
require('dotenv').config();
const express = require('express')
const bodyParser = require("body-parser");
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const morgan = require('morgan')
const app = express()
const port = 5000

const blogRoute = require('./routes')
app.use(morgan('dev'))
app.use(bodyParser.urlencoded({limit: '10mb',extended:true}))
// parse application/json
app.use(bodyParser.json({limit: '10mb'}));
app.use(cookieParser())
app.use(cors())
mongoose.set('strictQuery', false);

mongoose.connect(`mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.imnaepp.mongodb.net/sosBLog`)
.then(()=>console.log("connenct"))


app.use(blogRoute);

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})