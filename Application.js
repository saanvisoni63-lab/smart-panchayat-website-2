const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    applicantName: {
        type: String,
        required: true
    },
    scheme: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Under Review', 'Under Process'],
        default: 'Pending'
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    // Add other fields as necessary from the frontend form
    details: {
        type: mongoose.Schema.Types.Mixed
    },
    adminRemark: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model('Application', applicationSchema);
