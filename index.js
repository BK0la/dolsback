import express from 'express';
import mongoose from 'mongoose';

import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';

import Product from './models/Product.js';
import Cart from './models/Cart.js';
import Wishlist from './models/Wishlist.js';
import Order from './models/Order.js';


dotenv.config();

const PORT = process.env.PORT || 5000;
const DB_URL = process.env.DB_URL;

const app = express();

app.use(cors());
app.use(express.json());

// Main page
app.get('/', (req, res) => {
    res.status(200).json('Server is working');
});

// Get products
app.get('/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving products' });
    }
});

// Add product to cart
app.post('/cart', async (req, res) => {
    const { userId, productId, size } = req.body;  // Теперь size ожидается в теле запроса
    if (!userId || !productId || !size) {
        return res.status(400).json({ message: 'userId, productId, and size are required' });
    }

    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({
                userId,
                products: [{
                    productId,
                    size,
                    quantity: 1,
                    totalPrice: product.price,
                }],
            });
        } else {
            const productInCart = cart.products.find(
                (p) => p.productId.toString() === productId && p.size === size
            );
            if (productInCart) {
                productInCart.quantity += 1;
                productInCart.totalPrice = product.price * productInCart.quantity;
            } else {
                cart.products.push({
                    productId,
                    size,
                    quantity: 1,
                    totalPrice: product.price,
                });
            }
        }

        await cart.save();
        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Error adding to cart...' });
    }
});




// Delete product from cart
app.delete('/cart', async (req, res) => {
    const { userId, productId, size } = req.body;
    if (!userId || !productId || !size) {
        return res.status(400).json({ message: 'userId, productId and size are required' });
    }

    try {
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        cart.products = cart.products.filter(
            (p) => p.productId.toString() !== productId || p.size !== size
        );

        await cart.save();

        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Error removing from cart' });
    }
});


//Update product quantity
app.patch('/cart', async (req, res) => {
    const { userId, productId, size, operation } = req.body;

    if (!userId || !productId || !size || !operation) {
        return res.status(400).json({ message: 'userId, productId, size and operation are required' });
    }

    try {
        const cart = await Cart.findOne({ userId }).populate('products.productId');

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const productInCart = cart.products.find(
            (p) => p.productId._id.toString() === productId && p.size === size
        );

        if (!productInCart) {
            return res.status(404).json({ message: 'Product not found in cart' });
        }

        // Modify quantity
        if (operation === 'increment') {
            productInCart.quantity += 1;
        } else if (operation === 'decrement') {
            productInCart.quantity = Math.max(1, productInCart.quantity - 1);
        }

        productInCart.totalPrice = productInCart.productId.price * productInCart.quantity; // Update total price

        await cart.save();

        // Return updated cart
        const updatedCart = await Cart.findOne({ userId }).populate('products.productId');
        res.json(updatedCart);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating cart' });
    }
});


// Get user cart
app.get('/cart/:userId', async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.params.userId }).populate('products.productId');
        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving cart' });
    }
});


// Add product to wishlist
app.post('/wishlist', async (req, res) => {
    const { userId, productId } = req.body;
    if (!userId || !productId) {
        return res.status(400).json({ message: 'userId and productId are required' });
    }

    try {
        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [{ productId }] });
        } else {
            wishlist.products.push({ productId });
        }

        await wishlist.save();
        res.json(wishlist);
    } catch (error) {
        res.status(500).json({ message: 'Error adding to wishlist' });
    }
});

//Delete product from wishlist
app.delete('/wishlist', async (req, res) => {
    const { userId, productId } = req.body;
    if (!userId || !productId) {
        return res.status(400).json({ message: 'userId and productId are required' });
    }

    try {
        const wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        wishlist.products = wishlist.products.filter(p => p.productId.toString() !== productId);
        await wishlist.save();

        res.json(wishlist);
    } catch (error) {
        res.status(500).json({ message: 'Error removing from wishlist' });
    }
});

// Get user wishlist
app.get('/wishlist/:userId', async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ userId: req.params.userId }).populate('products.productId');
        res.json(wishlist);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving wishlist' });
    }
});

// Add new order
app.post('/orders', async (req, res) => {
    const { userId, street, house, zip, city, firstName, lastName, email, phone, paymentMethod } = req.body;

    if (!userId || !street || !house || !zip || !city || !firstName || !lastName || !email || !phone || !paymentMethod) {
        return res.status(400).json({ message: 'Missing order fields' });
    }

    try {
        const order = new Order({
            userId,
            street,
            house,
            zip,
            city,
            firstName,
            lastName,
            email,
            phone,
            paymentMethod
        });

        await order.save();

        // Очищаем содержимое корзины
        await Cart.updateOne({ userId }, { $set: { products: [] } });

        res.status(201).json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating order' });
    }
});

// Get orders for a specific user
app.get('/orders/:userId', async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving orders' });
    }
});


// Function to load products from file into database
async function loadProducts() {
    const count = await Product.countDocuments();
    if (count === 0) {
        fs.readFile('product.json', 'utf8', async (err, data) => {
            if (err) {
                console.log('Error reading file:', err);
                return;
            }
            const products = JSON.parse(data);
            await Product.insertMany(products);
            console.log('Products loaded into database');
        });
    }
}

// Start server
async function startApp() {
    try {
        await mongoose.connect(DB_URL);
        await loadProducts();
        app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
    } catch (e) {
        console.log('Server startup error:', e);
    }
}

startApp();