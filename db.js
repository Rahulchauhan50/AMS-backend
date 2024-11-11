const mongoose = require('mongoose')
const dotenv = require('dotenv');
dotenv.config();
const DataBase = process.env.DB_URL

console.log(DataBase)

const connectToMongo = () => {

    mongoose.connect(DataBase,{
        useNewUrlParser:true,
        useUnifiedTopology:true,
      
    }).then(()=>{console.log("connection is successfull")})
    .catch((err)=>{console.log(err)})

}

module.exports = connectToMongo