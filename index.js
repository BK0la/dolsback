import express from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import cors from 'cors';
import Product from './models/Product.js';

const PORT = 7878;
const DB_URL = 'mongodb+srv://admin:admindolsas@cluster0.09zilly.mongodb.net/'
const app = express()

app.use(cors());
app.use(express.json());

//Главаня страница
app.get('/', (req, res) => {
    res.status(200).json('Server work')
})

// Получение товаров из базы
app.get('/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка получения товаров' });
    }
});

// Функция для загрузки товаров из файла в базу (запускается 1 раз)
async function loadProducts() {
    const count = await Product.countDocuments();
    if (count === 0) {
        fs.readFile('product.json', 'utf8', async (err, data) => {
            if (err) {
                console.log('Ошибка чтения файла:', err);
                return;
            }
            const products = JSON.parse(data);
            await Product.insertMany(products);
            console.log('Товары загружены в базу');
        });
    }
}

// Запуск сервера
async function startApp() {
    try {
        await mongoose.connect(DB_URL);
        await loadProducts(); // Загружаем товары при первом запуске
        app.listen(PORT, () => console.log('server started on port ' + PORT));
    } catch (e) {
        console.log(e);
    }
}

startApp();
