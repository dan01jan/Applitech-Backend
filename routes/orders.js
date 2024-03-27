
const { Order } = require('../models/order');
const express = require('express');
const { OrderItem } = require('../models/order-item');
const router = express.Router();
const { Product } = require('../models/product'); // Import the Product model

router.get(`/`, async (req, res) => {
    const orderList = await Order.find().populate('user', 'name').sort({ 'dateOrdered': -1 });

    if (!orderList) {
        res.status(500).json({ success: false })
    }
   
    res.status(201).json(orderList)
})

router.get(`/:id`, async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'name')
        .populate({
            path: 'orderItems', 
            populate: {
                path: 'product', populate: 'category'
            }
        });

    if (!order) {
        res.status(500).json({ success: false })
    }
    res.send(order);
})

router.post('/', async (req, res) => {
    try {
        console.log('Request body:', req.body);

        const orderItems = req.body.orderItems;
        if (!Array.isArray(orderItems)) {
            console.error('Error placing order: orderItems is not an array');
            return res.status(400).send('Order items must be provided as an array');
        }

        // Save order items first and get their IDs
        const orderItemsIds = await Promise.all(orderItems.map(async (orderItem) => {
            // Check if the product exists
            const product = await Product.findById(orderItem.product);
            if (!product) {
                throw new Error(`Product with ID ${orderItem.product} not found`);
            }
            
            let newOrderItem = new OrderItem({
                quantity: orderItem.quantity,
                product: orderItem.product
            });

            newOrderItem = await newOrderItem.save();
            return newOrderItem._id;
        }));

        console.log('Resolved order item IDs:', orderItemsIds);

        // Update product stocks
        await Promise.all(orderItems.map(async (orderItem) => {
            await Product.findByIdAndUpdate(orderItem.product, { $inc: { stock: -orderItem.quantity } });
        }));

        // Create a new order object
        let order = new Order({
            orderItems: orderItemsIds,
            shippingAddress1: req.body.shippingAddress1,
            shippingAddress2: req.body.shippingAddress2,
            city: req.body.city,
            zip: req.body.zip,
            country: req.body.country,
            phone: req.body.phone,
            status: req.body.status,
            user: req.body.user,
        });

        // Save the order object to the database
        order = await order.save();

        if (!order) {
            console.error('Error placing order: order could not be saved');
            return res.status(500).json({ success: false, error: 'Order could not be saved' });
        }

        console.log('Order saved successfully:', order);
        res.status(201).json(order);
    } catch (error) {
        console.error('Error placing order:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});




router.put('/:id', async (req, res) => {
    const order = await Order.findByIdAndUpdate(
        req.params.id,
        {
            status: req.body.status
        },
        { new: true }
    )

    if (!order)
        return res.status(400).send('the order cannot be update!')

    res.send(order);
})


router.delete('/:id', (req, res) => {
    Order.findByIdAndRemove(req.params.id).then(async order => {
        if (order) {
            await order.orderItems.map(async orderItem => {
                await OrderItem.findByIdAndRemove(orderItem)
            })
            return res.status(200).json({ success: true, message: 'the order is deleted!' })
        } else {
            return res.status(404).json({ success: false, message: "order not found!" })
        }
    }).catch(err => {
        return res.status(500).json({ success: false, error: err })
    })
})

router.get('/get/totalsales', async (req, res) => {
    const totalSales = await Order.aggregate([
        { $group: { _id: null, totalsales: { $sum: '$totalPrice' } } }
    ])

    if (!totalSales) {
        return res.status(400).send('The order sales cannot be generated')
    }

    res.send({ totalsales: totalSales.pop().totalsales })
})

router.get(`/get/count`, async (req, res) => {
    const orderCount = await Order.countDocuments((count) => count)

    if (!orderCount) {
        res.status(500).json({ success: false })
    }
    res.send({
        orderCount: orderCount
    });
})

router.get(`/get/userorders/:userid`, async (req, res) => {
    const userOrderList = await Order.find({ user: req.params.userid }).populate({
        path: 'orderItems', populate: {
            path: 'product', populate: 'category'
        }
    }).sort({ 'dateOrdered': -1 });

    if (!userOrderList) {
        res.status(500).json({ success: false })
    }
    res.send(userOrderList);
})



module.exports = router;