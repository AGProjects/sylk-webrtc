const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors package

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors()); // Use the cors middleware

const PORT = process.env.PORT || 2334;

// Mock database for storing user accounts
const users = {};

app.post('/enroll', (req, res) => {
    const { username, password, email, display_name } = req.body; // eslint-disable-line camelcase

    // Check if user already exists
    if (users[username]) {
        return res.json({ success: false, error: 'user_exists', error_message: 'User already exists' });
    }

    // Create new user
    const sip_address = `${username}@tangtalk.io`;
    users[username] = { username, password, email, display_name, sip_address };

    // Return success response
    res.json({ success: true, sip_address });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
