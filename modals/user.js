const mongoose = require('mongoose')
const validator = require("validator")

const UserShema = mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    phoneNumber:{
        type:Number,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        validate(value){
            if(!validator.isEmail(value)){
                 throw new Error("Inalid email")
             }
         }
    },
    password:{
        type:String,
        required:true,
    },
    date: {
        type: Date,
        default: Date.now
    },
    
})


const User = mongoose.model('user',UserShema)

module.exports = User;