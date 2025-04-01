import mongoose from "mongoose";

const WishlistSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    products: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }
        }
    ]
});

export default mongoose.model('Wishlist', WishlistSchema);
