import mongoose from 'mongoose';
const historySchema = new mongoose.Schema({ guestId: { type: String, required: true, index: true }, name: String, country: String, latitude: Number, longitude: Number, timezone: String, searchedAt: { type: Date, default: Date.now } }, { timestamps: true });
historySchema.index({ guestId: 1, latitude: 1, longitude: 1 }, { unique: true });
export default mongoose.model('SearchHistory', historySchema);
