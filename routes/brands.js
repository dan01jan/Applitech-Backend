const express = require('express');
const { Brand } = require('../models/brand');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');

const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = new Error('invalid image type');

        if (isValid) {
            uploadError = null;
        }
        cb(uploadError, 'public/uploads');
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.split(' ').join('-');
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, `${fileName}-${Date.now()}.${extension}`);
    }
});

const uploadOptions = multer({ storage: storage });

router.get(`/`, async (req, res) =>{
    // localhost:3000/api/v1/products?categories=2342342,234234
    console.log(req.query)

    const brandList = await Brand.find();
    // console.log(productList.category)

    if(!brandList) {
        res.status(500).json({success: false})
    } 
    res.send(brandList);
})

router.get(`/:id`, async (req, res) =>{
    const brand = await Brand.findById(req.params.id);

    if(!brand) {
        res.status(500).json({success: false})
    } 
    res.send(brand);
})

router.post(`/`, uploadOptions.array('images', 10), async (req, res) => {
    const files = req.files;
    if (!files || files.length === 0) return res.status(400).send('No images in the request');

    let images = [];
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

    files.forEach(file => {
        const fileName = file.filename;
        images.push(`${basePath}${fileName}`);
    });

    const brand = new Brand({
        name: req.body.name,
        description: req.body.description,
        images: images,
    });
   
    const savedBrand = await brand.save();

    if (!savedBrand) return res.status(500).send('The brand cannot be created');

    res.send(savedBrand);
});

router.put('/:id', uploadOptions.array('images',10), async (req, res) => {
    console.log(req.body);
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid Brand Id');
    }

    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(400).send('Invalid Product!');

    const file = req.file;
    let imagepath;

    if (file) {
        const fileName = file.filename;
        const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
        imagepath = `${basePath}${fileName}`;
    } else {
        imagepath = brand.image;
    }

    const updatedBrand = await Brand.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            description: req.body.description,
            images: imagepath
        },
        { new: true }
    );

    if (!updatedBrand) return res.status(500).send('the brand cannot be updated!');

    res.send(updatedBrand);
});

router.delete('/:id', (req, res)=>{
    Brand.findByIdAndRemove(req.params.id).then(brand =>{
        if(brand) {
            return res.status(200).json({success: true, message: 'the brand is deleted!'})
        } else {
            return res.status(404).json({success: false , message: "brand not found!"})
        }
    }).catch(err=>{
       return res.status(500).json({success: false, error: err}) 
    })
})

router.put('/gallery-images/:id', uploadOptions.array('images', 10), async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid Product Id');
    }
    const files = req.files;
    let imagesPaths = [];
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

    if (files) {
        files.map((file) => {
            imagesPaths.push(`${basePath}${file.filename}`);
        });
    }

    const brand = await Brand.findByIdAndUpdate(
        req.params.id,
        {
            images: imagesPaths
        },
        { new: true }
    );
        
    if (!brand) return res.status(500).send('the gallery cannot be updated!');

    res.send(brand);
});

module.exports=router;