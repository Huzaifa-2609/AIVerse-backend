class SocketIo {
    constructor() {
        if (SocketIo.instance) {
            return SocketIo.instance;
        }
        this.io;
        this.connections = {};
        SocketIo.instance = this;
    }
    getConnections = () => {
        return this.connections;
    }
    getIO = () => {
        return this.io;
    }
    setConnections = (userId, socketId) => {
        this.connections[userId] = socketId;
    }
    deleteConnections = (userId) => {
        delete this.connections[userId]
    }
    setIO = (io) => {
        this.io = io;
    }
}

module.exports = new SocketIo();
