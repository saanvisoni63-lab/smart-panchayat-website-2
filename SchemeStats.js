const mongoose = require('mongoose');

const schemeStatsSchema = new mongoose.Schema({
    schemeName: { type: String, required: true, unique: true },
    interestedUsers: [{ type: String }],
    appliedUsers: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('SchemeStats', schemeStatsSchema);
