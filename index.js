
const connectToMongo = require('./db')
const express = require('express')
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const port = process.env.PORT || 5000

connectToMongo();
app.use(cors());
app.use(express.json())

app.use(bodyParser.json());

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Configure multer for file uploads
// Or configure as per your needs

app.use("/uploads/Usersimages", express.static("uploads/Usersimages"));
app.use("/uploads/Assetimages", express.static("uploads/Assetimages"));


app.use('/auth',require('./routes/auth'))
app.use('/data',require('./routes/Activity'))

app.listen(port,()=>{
    console.log(`you are listening at ${port}`)
})
