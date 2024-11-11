const express = require('express');
const router = express.Router();
const Asset = require('../modals/assetdata.js');
const PortalUser = require('../modals/Portalusers.js');
const multer = require('multer');
const fs = require('fs'); // Correctly import the fs module
const csv = require('csv-parser');
const { isNull } = require('util');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/Usersimages');
    },
    filename: function (req, file, cb) {
        const date = Date.now();
        cb(null, date + file.originalname);
    }
});
const storage2 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/Assetimages');
    },
    filename: function (req, file, cb) {
        const date = Date.now();
        cb(null, date + file.originalname);
    }
});

const Usersimages = multer({ storage: storage });
const Assetimages = multer({ storage: storage2 });
const upload = multer({ dest: 'uploads/' });

router.post('/upload-csv', upload.single('file'), (req, res) => {
    const results = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                const assets = results.map(item => {

                    return {
                        item_description: {
                            Description: item['item_description.Description'],
                            ID_Tag: item['item_description.ID_Tag'],
                            Asset_Name: item['item_description.Asset_Name'],
                            Category: item['item_description.Category']
                        },
                        Purchase_Information: {
                            Date: item['Purchase_Information.purchaseDate'],
                            Supplier: item['Purchase_Information.Supplier'],
                            warranty_Expire: item['Purchase_Information.warranty_Expire'],
                            Price: item['Purchase_Information.Price']
                        },
                        Quantity_and_value: {
                            Condition: item['Quantity_and_value.Condition'],
                            Unit_value: item['Quantity_and_value.Unit_value'],
                            Qyt: item['Quantity_and_value.Qyt'],
                            value: item['Quantity_and_value.value']
                        },
                        Items_Details: {
                            Serial_No: item['Items_Details.Serial_No'],
                            Model_No: item['Items_Details.Model_No'],
                            AMC: item['Items_Details.AMC']
                        },
                        Location: {
                            Room: item['Location.Room'],
                            Dept_area: item['Location.Dept_area'],
                            assignedto:item['Location.assignedto']
                        },
                        assetImage: null 
                    };
                });

                await Asset.insertMany(assets);
                res.json({ message: 'Assets successfully uploaded and saved!' });
            } catch (error) {
                console.log(error)
                res.status(500).send(error.message);
            } finally {
                fs.unlinkSync(req.file.path); // Delete the CSV file after processing
            }
        });
});

router.post('/add-asset', Assetimages.single('image'), async (req, res) => {
    let fileUrl;
    if (req.file) {
        const date = Date.now(); // This is fine
        let filename = "uploads/Assetimages/" + date + req.file.originalname;
        fileUrl = process.env.HOST + "/" + filename;
        try {
            fs.renameSync(req.file.path, filename);
        } catch (error) {
            console.error('Error renaming file:', error);
            return res.status(500).send({ error: 'Internal Server Error' });
        }
    }


    const {
        Description, ID_Tag, Asset_Name, Category, purchaseDate, Supplier, warranty_Expire, Price,
        Condition, Unit_value, Qyt, value, Serial_No, Model_No, AMC, Room, Dept_area,assignedto
        } = req.body;


    const assetData = {
        item_description: {
            Description,
            ID_Tag,
            Asset_Name,
            Category
        },
        Purchase_Information: {
            purchaseDate, // Updated here
            Supplier,
            warranty_Expire,
            Price
        },
        Quantity_and_value: {
            Condition,
            Unit_value,
            Qyt,
            value
        },
        Items_Details: {
            Serial_No,
            Model_No,
            AMC
        },
        Location: {
            Room,
            Dept_area,
            assignedto
        }
    };

    const newAsset = new Asset({
        ...assetData,
        assetImage: fileUrl ? fileUrl : null
    });

    try {
        const savedAsset = await newAsset.save();
        res.json({ savedAsset });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.post('/update-asset',Assetimages.single('image'), async (req, res) => {
    const assetId = req.body.id;
  
    let fileUrl;
    if (req.file) {
      const date = Date.now();
      let filename = "uploads/Assetimages/" + date + req.file.originalname;
      fileUrl = process.env.HOST + "/" + filename;
      try {
        fs.renameSync(req.file.path, filename);
      } catch (error) {
        console.error('Error renaming file:', error);
        return res.status(500).send({ error: 'Internal Server Error' });
      }
    }


    const {
        Description, ID_Tag, Asset_Name, Category, purchaseDate, Supplier, warranty_Expire, Price,
        Condition, Unit_value, Qyt, value, Serial_No, Model_No, AMC, Room, Dept_area,assignedto
        } = req.body;

       console.log(value)
       console.log(typeof value)
       console.log(value==="null")


    const assetData = {
        item_description: {
            Description,
            ID_Tag,
            Asset_Name,
            Category
        },
        Purchase_Information: {
            purchaseDate, // Updated here
            Supplier,
            warranty_Expire,
            Price:Price=="null"?0:Price
        },
        Quantity_and_value: {
            Condition,
            Unit_value:Unit_value==="null"?0:Unit_value,
            Qyt:Qyt==="null"?0:Qyt,
            value:value==="undefined"?0:value
        },
        Items_Details: {
            Serial_No,
            Model_No,
            AMC
        },
        Location: {
            Room,
            Dept_area,
            assignedto
        }
    };
   
    try {
      const updatedAsset = await Asset.findByIdAndUpdate(assetId, {...assetData, assetImage:fileUrl?fileUrl:null}, { new: true }); // Find by id, update with data, return updated doc
      if (!updatedAsset) {
        return res.status(404).send({ message: 'Asset not found' });
      }
      res.json({ updatedAsset });
    } catch (error) {
      res.status(500).send(error.message);
    }
  });

router.post('/add-user', Usersimages.single('image'), async (req, res) => {
    let fileUrl;
    if (req.file) {
        const date = Date.now();
        let filename = "uploads/Usersimages/" + date + req.file.originalname;
        fileUrl = process.env.HOST + "/" + filename;
        try {
            fs.renameSync(req.file.path, filename); // Correct usage of renameSync
        } catch (error) {
            console.error('Error renaming file:', error);
            return res.status(500).send({ error: 'Internal Server Error' });
        }
    }

    const { email, name, department } = req.body;

    const user = new PortalUser({
        name,
        email,
        department,
        profileimage: fileUrl ? fileUrl : "https://as2.ftcdn.net/v2/jpg/03/31/69/91/1000_F_331699188_lRpvqxO5QRtwOM05gR50ImaaJgBx68vi.jpg",
    });

    try {
        const savedUser = await user.save();
        res.status(201).send(savedUser);
    } catch (error) {
        if (error.code === 11000 && error.keyPattern && error.keyPattern.email === 1) {
            // Email address already exists
            return res.status(400).send({ error: 'Email address already in use' });
        }
        res.status(400).send({ error: error.message });
    }
});

router.get('/get-asset', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalAssets = await Asset.countDocuments();
        const assets = await Asset.find().skip(skip).limit(limit);

        res.json({
            totalAssets,
            totalPages: Math.ceil(totalAssets / limit),
            currentPage: page,
            assets
        });
    } catch (error) {
        res.status(500).send(error.message);
        console.log(error);
    }

});


router.get('/get-users', async (req, res) => {
    try {
        const users = await PortalUser.find(); // Retrieve all users from the database
        res.status(200).send(users); // Send the list of users as the response
    } catch (error) {
        res.status(500).send({ error: 'Internal Server Error' }); // Handle any errors that occur
    }
});

router.delete('/delete-asset/:id', async (req, res) => {
    const assetId = req.params.id;

    try {
        const deletedAsset = await Asset.findByIdAndDelete(assetId);
        if (!deletedAsset) {
            return res.status(404).send({ error: 'Asset not found' });
        }
        res.json({ message: 'Asset successfully deleted', deletedAsset });
    } catch (error) {
        res.status(500).send({ error: 'Internal Server Error', details: error.message });
    }
});

module.exports = router;
