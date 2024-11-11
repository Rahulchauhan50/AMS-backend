const mongoose = require('mongoose')

const AssetShema = mongoose.Schema({
   item_description:{
        Description:{
            type:String,
        },
        ID_Tag:{
            type:String,
        },
        Asset_Name:{
            type:String,
            required:true
        },
        Category:{
            type:String,
        }
   },
   Purchase_Information:{
    purchaseDate:{
            type:String,
        },
        Supplier:{
            type:String,
        },
        warranty_Expire:{
            type:String,
        },
        Price:{
            type:Number,
        }
   },
   Quantity_and_value:{
    Condition:{
            type:String,
        },
        Unit_value:{
            type:Number,
        },
        Qyt:{
            type:Number,
        },
        value:{
            type:Number,
        }
   },
   Items_Details:{
    Serial_No:{
            type:String,
        },
        Model_No:{
            type:String,
        },
        AMC:{
            type:String,
        },
   },
   Location:{
    Room:{
            type:String,
            required:true
        },
        Dept_area:{
            type:String,
        },
        assignedto:{
            type:String,
        }
   },
   assetImage:{
    type:String
   }
})


const asset = mongoose.model('asset',AssetShema)

module.exports = asset;