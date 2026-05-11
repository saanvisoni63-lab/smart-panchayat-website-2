const mongoose = require('mongoose');

const schemeStatsSchema = new mongoose.Schema({
    schemeName: { type: String, required: true, unique: true },
    interestedUsers: [{ type: String }],
    appliedUsers: [{ type: String }],
    viewEvents: [{ username: { type: String, required: true }, at: { type: Date, default: Date.now } }],
    applyEvents: [{ username: { type: String, required: true }, at: { type: Date, default: Date.now } }]
}, { timestamps: true });

module.exports = mongoose.model('SchemeStats', schemeStatsSchema);
