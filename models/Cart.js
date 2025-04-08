import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    products: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            size: { type: String, required: true },  // Новый параметр для хранения размера товара
            quantity: { type: Number, default: 1 },
            totalPrice: { type: Number },
        }
    ]
});

export default mongoose.model('Cart', cartSchema);
