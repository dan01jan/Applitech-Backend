const { Order } = require('../models/order');
const express = require('express');
const { OrderItem } = require('../models/order-item');
const router = express.Router();
const { Product } = require('../models/product'); // Import the Product model
const nodemailer = require('nodemailer');
const { User } = require('../models/user'); // Import the User model
require('dotenv').config(); // Import dotenv to access environment variables


// Set up Nodemailer transporter using environment variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
    }
});

// Function to send emails
async function sendEmail(to, subject, text) {
    try {
        const info = await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
            to: to,
            subject: subject,
            text: text
        });
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

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

        // Validate request body
        const { orderItems, shippingAddress1, shippingAddress2, city, zip, country, phone, status, user } = req.body;
        if (!Array.isArray(orderItems) || !shippingAddress1 || !city || !zip || !country || !phone || !status || !user) {
            console.error('Error placing order: Required fields missing or invalid');
            return res.status(400).json({ success: false, error: 'Required fields missing or invalid' });
        }

        // Create a new order object
        const order = new Order({
            orderItems,
            shippingAddress1,
            shippingAddress2,
            city,
            zip,
            country,
            phone,
            status,
            user
        });

        // Save the order object to the database
        const savedOrder = await order.save();

        for (const item of orderItems) {
            const product = await Product.findById(item.product);
            if (product) {
                product.countInStock -= item.quantity;
                await product.save(); // Save the updated product document
            }
        }

        // Respond with the saved order
        res.status(201).json(savedOrder);

        // Generate email confirmation
        const subject = 'Order Confirmation';
        let text = `
            Dear Customer,

            Thank you for your purchase. We appreciate your business!

            Your order details:
        `;

        // Fetch product details and include them in email
        for (const item of orderItems) {
            const product = await Product.findById(item.product);
            if (product) {
                text += `
                    Product: ${product.name}
                    Price: ${product.price}
                    Quantity: ${item.quantity}
                    Total: ${product.price * item.quantity}
                `;
            }
        }

        text += `
            If you have any questions or concerns, please feel free to contact us.

            Regards,
            Your Company Name
        `;

        // Send email confirmation
        await sendEmail('customer@example.com', subject, text);
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
