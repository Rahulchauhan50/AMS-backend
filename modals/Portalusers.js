const mongoose = require('mongoose')
const validator = require("validator")

const PortalUserShema = mongoose.Schema({
    name:{
        type:String,
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
    department: {
        type: String,
        required:true
    },
    profileimage: {
        type: String,
    },
    
})


const PortalUser = mongoose.model('Portaluser',PortalUserShema)

module.exports = PortalUser;