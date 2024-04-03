class WS {
    constructor() {
        this.init();
    }
    init() {
        let scope = this;
        // Create a new WebSocket.
        this.socket = new WebSocket('ws://10.0.0.217:8082');

        // Connection opened
        this.socket.addEventListener('open', function(event) {
            console.log('Connected to WS Server');
        });

        // Listen for messages
        this.socket.addEventListener('message', function(event) {
            console.log('Message from server ', event.data);
        });

        // Listen for possible errors
        this.socket.addEventListener('error', function(event) {
            console.error('WebSocket error observed:', event);
        });
    }

    send(data) {
        //console.log(data)
        //return false;
        try {
            this.socket.send(JSON.stringify(data));
            console.log('Sent:', data);
        } catch (e) {
            console.log("err", e)
        }
    }
}