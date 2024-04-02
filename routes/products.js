const express = require('express');
const { Product } = require('../models/product');
const { Brand } = require('../models/brand');
const { User } = require('../models/user'); // Adjust the path as necessary to where your User model is defined

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
        if (isValid) {
            cb(null, 'public/uploads');
        } else {
            cb(new Error('Invalid image type'), null);
        }
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.split(' ').join('-');
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, `${fileName}-${Date.now()}.${extension}`);
    }
});


const uploadOptions = multer({ storage: storage });
// Backend route with pagination support
router.get(`/all`, async (req, res) => {
    const page = req.query.page || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    
    // Filter by brands if brands query parameter is present
    if (req.query.brands) {
        filter.brand = { $in: req.query.brands.split(',') };
    }
    
    // Filter by product name if search query parameter is present
    if (req.query.search) {
        filter.name = { $regex: '^' + req.query.search, $options: 'i' }; // Case-insensitive search of names starting with `search`
    }

    try {
        const productList = await Product.find(filter)
            .populate('brand')
            .skip(skip)
            .limit(limit);

        const totalProducts = await Product.countDocuments(filter);

        res.send({
            products: productList,
            currentPage: page,
            totalPages: Math.ceil(totalProducts / limit),
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});



router.get(`/`, async (req, res) =>{
    // localhost:3000/api/v1/products?categories=2342342,234234
    console.log(req.query)
    let filter = {};
    if(req.query.brands)
    {
         filter = {brand: req.query.brands.split(',')}
    }

    const productList = await Product.find(filter).populate('brand');
    // console.log(productList.brand)

    if(!productList) {
        res.status(500).json({success: false})
    } 
    res.send(productList);
})

router.get(`/:id`, async (req, res) =>{
    const product = await Product.findById(req.params.id).populate('brand');

    if(!product) {
        res.status(500).json({success: false})
    } 
    res.send(product);
})

router.post(`/`, uploadOptions.array('images', 10), async (req, res) => {
    const brand = await Brand.findById(req.body.brand);
    if (!brand) return res.status(400).send('Invalid brand');

    const files = req.files;
    if (!files || files.length === 0) return res.status(400).send('No images in the request');

    let images = [];
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

    files.forEach(file => {
        const fileName = file.filename;
        images.push(`${basePath}${fileName}`);
    });

    const product = new Product({
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.richDescription,
        images: images,
        brand: req.body.brand,
        price: req.body.price,
        countInStock: req.body.countInStock,
        ratings: req.body.ratings,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured
    });
   
    const savedProduct = await product.save();

    if (!savedProduct) return res.status(500).send('The product cannot be created');

    res.send(savedProduct);
});

router.put('/:id', uploadOptions.array('images', 10), async (req, res) => {
    console.log(req.body);
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid Product Id');
    }
    
    const brand = await Brand.findById(req.body.brand);
    if (!brand) return res.status(400).send('Invalid Brands');

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(400).send('Invalid Product!');

    // Extract file paths from uploaded images
    let imagePaths = [...product.images]; // Keep existing images by default

    if (req.files && req.files.length > 0) {
        const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
        imagePaths = req.files.map(file => `${basePath}${file.filename}`);
    }

    // Update product information
    const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            description: req.body.description,
            images: imagePaths, // Update with new image paths
            brand: req.body.brand,
            price: req.body.price,
            countInStock: req.body.countInStock,
            // You can uncomment and add more fields to update
        },
        { new: true }
    );

    if (!updatedProduct) return res.status(500).send('The product cannot be updated!');

    res.send(updatedProduct);
});

router.delete('/:id', (req, res)=>{
    Product.findByIdAndRemove(req.params.id).then(product =>{
        if(product) {
            return res.status(200).json({success: true, message: 'the product is deleted!'})
        } else {
            return res.status(404).json({success: false , message: "product not found!"})
        }
    }).catch(err=>{
       return res.status(500).json({success: false, error: err}) 
    })
})

router.get(`/get/count`, async (req, res) =>{
    const productCount = await Product.countDocuments((count) => count)

    if(!productCount) {
        res.status(500).json({success: false})
    } 
    res.send({
        productCount: productCount
    });
})

router.get(`/get/featured/:count`, async (req, res) =>{
    const count = req.params.count ? req.params.count : 0
    const products = await Product.find({isFeatured: true}).limit(+count);

    if(!products) {
        res.status(500).json({success: false})
    } 
    res.send(products);
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

    const product = await Product.findByIdAndUpdate(
        req.params.id,
        {
            images: imagesPaths
        },
        { new: true }
    );
        
    if (!product) return res.status(500).send('the gallery cannot be updated!');

    res.send(product);
});

router.post('/:id/reviews', async (req, res) => {
    try {
        const productId = req.params.id;
        const { ratings, comment, userId } = req.body;

        if (!ratings || !comment || !userId) {
            return res.status(400).json({ success: false, message: 'Ratings, comment, and userId are required.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const newReview = {
            user: userId,
            name: user.name,
            ratings,
            comment
        };
        product.reviews.push(newReview);

        // Recalculate average ratings
        const averageRatings = product.reviews.reduce((acc, item) => acc + item.ratings, 0) / product.reviews.length;
        product.ratings = averageRatings;
        product.numReviews = product.reviews.length;

        await product.save();

        res.status(201).json({
            success: true,
            message: 'Review added successfully',
            data: {
                averageRatings: product.ratings,
                numReviews: product.numReviews,
                reviews: product.reviews
            }
        });
    } catch (error) {
        console.error(error); // It's helpful to log the error for debugging purposes
        res.status(500).json({ success: false, error: 'An error occurred while posting the review.' });
    }
});

router.get('/:id/reviews', async (req, res) => {
    try {
        const productId = req.params.id;

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Return only reviews for the specified product
        res.status(200).json({ success: true, reviews: product.reviews });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/:productId/reviews/:reviewId', async (req, res) => {
    try {
        const productId = req.params.productId;
        const reviewId = req.params.reviewId;
        const { ratings, comment } = req.body;

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Find the review to be updated
        const reviewToUpdate = product.reviews.find(review => review._id.toString() === reviewId);
        if (!reviewToUpdate) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        // Update the review
        reviewToUpdate.ratings = ratings;
        reviewToUpdate.comment = comment;

        // Recalculate average ratings
        const totalRatings = product.reviews.reduce((acc, review) => acc + review.ratings, 0);
        product.ratingss = totalRatings / product.reviews.length;

        await product.save();

        // Return the updated product with reviews
        res.status(200).json({ success: true, message: 'Review updated successfully', product: product.reviews });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/:productId/reviews/:reviewId', async (req, res) => {
    try {
        const productId = req.params.productId;
        const reviewId = req.params.reviewId;

        // Validate if productId and reviewId are valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({ success: false, message: 'Invalid product or review ID' });
        }

        // Find the product by ID
        const product = await Product.findById(productId);

        // Check if the product exists
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Find the index of the review to be deleted
        const reviewIndex = product.reviews.findIndex(review => review._id.toString() === reviewId);

        // Check if the review exists
        if (reviewIndex === -1) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        // Remove the review from the product's reviews array
        product.reviews.splice(reviewIndex, 1);

        // Recalculate average ratings if there are remaining reviews
        if (product.reviews.length > 0) {
            const totalRatings = product.reviews.reduce((acc, review) => acc + review.ratings, 0);
            product.ratings = totalRatings / product.reviews.length;
        } else {
            // If no reviews left, reset ratings and numReviews
            product.ratings = 0;
        }
        product.numReviews = product.reviews.length;

        // Save the updated product
        await product.save();

        // Return success message with the updated product (if needed)
        res.status(200).json({ success: true, message: 'Review deleted successfully', product });
    } catch (error) {
        // Handle errors
        console.error(error);
        res.status(500).json({ success: false, error: 'An error occurred while deleting the review' });
    }
});


module.exports = router;