const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path'); // Import the path module

class RobotControl {
    constructor(options) {
        this.port = options.port || 8080;
        this.content = options.content || './webui';
        this.onData = options.onData || ((data) => console.log(data));

        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(cors()); // This allows all origins, you might want to restrict this!

        // Configure Express to serve static files from the specified directory
        this.app.use(express.static(path.resolve(this.content)));

        // Middleware to parse JSON
        this.app.use(bodyParser.json());
    }

    setupRoutes() {
        // Setup the `/update` endpoint for both GET and POST
        this.app.get('/update', (req, res) => {
            const result = this.onData(req.query);
            res.json(result);
        });

        this.app.post('/update', (req, res) => {
            const result = this.onData(req.body);
            res.json(result);
        });
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`RobotControl server running on port ${this.port}`);
        });
    }
}

module.exports = RobotControl;
