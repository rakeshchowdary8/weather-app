import mongoose from 'mongoose';
const favoriteSchema = new mongoose.Schema({ guestId: { type: String, required: true, index: true }, name: String, country: String, latitude: Number, longitude: Number, timezone: String }, { timestamps: true });
favoriteSchema.index({ guestId: 1, latitude: 1, longitude: 1 }, { unique: true });
export default mongoose.model('Favorite', favoriteSchema);
