import mongoose from "mongoose";

const CartSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    products: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }
        }
    ]
});

export default mongoose.model('Cart', CartSchema);