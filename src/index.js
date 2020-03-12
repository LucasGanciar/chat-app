const path = require('path')
const http = require('http')
const express = require('express')
const socket = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocation } = require('./utils/message')
const { addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socket(server)

const port = process.env.PORT || 3000
const publicPath = path.join(__dirname, '../public')

app.use(express.static(publicPath))

io.on('connection', (sockt) => {
    console.log('New WebSocket connection')

    sockt.on('join', (options, callback) => {
        const { error, user } = addUser({ id: sockt.id, ...options })
        if(error){
            return callback(error)
        }
        sockt.join(user.room)
        sockt.emit('message', generateMessage('admin', 'Welcome!'))
        sockt.broadcast.to(user.room).emit('message', generateMessage('admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    sockt.on('sendMessage', (message, callback) => {
        const user = getUser(sockt.id)
        const filter = new Filter()
        if(filter.isProfane(message)){
            return callback('Profanity is not allowed')
        }
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback('Delivered')
    })

    sockt.on('disconnect', () => {
        const user = removeUser(sockt.id)
        if(user){
            io.to(user.room).emit('message', generateMessage(user.username, `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    sockt.on('sendLocation', (coords, callback) => {
        const user = getUser(sockt.id)
        io.to(user.room).emit('locationMessage', generateLocation(user.username, `https://google.com/maps?q${coords.latitude},${coords.longitude}`))
        callback()
    })
})

server.listen(port, () => {
    console.log(`server is up and running on port ${port}`)
})