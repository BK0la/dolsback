import express from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import Cart from './models/Cart.js';
import Wishlist from './models/Wishlist.js';

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
    const { userId, productId } = req.body;
    if (!userId || !productId) {
        return res.status(400).json({ message: 'userId and productId are required' });
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
                    quantity: 1,
                    totalPrice: product.price
                }]
            });
        } else {
            const productInCart = cart.products.find(p => p.productId.toString() === productId);
            if (productInCart) {
                productInCart.quantity += 1;
                productInCart.totalPrice = product.price * productInCart.quantity;
            } else {
                cart.products.push({
                    productId,
                    quantity: 1,
                    totalPrice: product.price
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
    const { userId, productId } = req.body;
    if (!userId || !productId) {
        return res.status(400).json({ message: 'userId and productId are required' });
    }

    try {
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        cart.products = cart.products.filter(p => p.productId.toString() !== productId);
        await cart.save();

        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Error removing from cart' });
    }
});

//Update product quantity
app.patch('/cart', async (req, res) => {
    const { userId, productId, operation } = req.body;

    if (!userId || !productId || !operation) {
        return res.status(400).json({ message: 'userId, productId и operation обязательны' });
    }

    try {
        const cart = await Cart.findOne({ userId }).populate('products.productId');

        if (!cart) {
            return res.status(404).json({ message: 'Корзина не найдена' });
        }

        const productInCart = cart.products.find(p => p.productId._id.toString() === productId);

        if (!productInCart) {
            return res.status(404).json({ message: 'Товар не найден в корзине' });
        }

        // Изменяем количество
        if (operation === 'increment') {
            productInCart.quantity += 1;
        } else if (operation === 'decrement') {
            productInCart.quantity = Math.max(1, productInCart.quantity - 1);
        }

        await cart.save();

        // Подгружаем с обновлённой ценой
        const updatedCart = await Cart.findOne({ userId }).populate('products.productId');

        res.json(updatedCart);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при обновлении корзины' });
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