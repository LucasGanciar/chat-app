const socket = io()

const $messageForm = document.querySelector('#message-form')
const $messageInput = $messageForm.querySelector('input')
const $formButton = $messageForm.querySelector('button')
const $locationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')

const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })
const autoScroll = () => {
    const $newMessage = $messages.lastElementChild
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageHeight = $newMessage.offsetHeight + parseInt(newMessageStyles.marginBottom)
    const visibleHeight = $messages.offsetHeight
    const containerHeight = $messages.scrollHeight
    const scrollOffset = $messages.scrollTop + visibleHeight

    if(containerHeight - newMessageHeight <= scrollOffset){
        $messages.scrollTop = $messages.scrollHeight
    }
}

socket.on('message', (message) => {
    console.log(message)
    $messages.insertAdjacentHTML('beforeend', Mustache.render(messageTemplate, 
        {
            username: message.username,
            message: message.text,
            createdAt: moment(message.createdAt).format('HH:mm')
        })
    )
    autoScroll()
})

socket.on('locationMessage', (message) => {
    $messages.insertAdjacentHTML('beforeend', Mustache.render(locationTemplate, 
        { 
            username: message.username,
            url: message.url,
            createdAt: moment(message.createdAt).format('HH:mm')
        })
    )
    autoScroll()
})

socket.on('roomData', ({ room, users }) => {
    document.querySelector('#sidebar').innerHTML = Mustache.render(sidebarTemplate, { room, users })
})

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault()
    $formButton.setAttribute('disabled', 'disabled')
    const message = e.target.elements.message.value
    socket.emit('sendMessage', message, (error) => {
        $formButton.removeAttribute('disabled')
        $messageInput.value = ''
        $messageInput.focus()
        if(error){
            return console.log(error)
        }
        console.log('message delivered')
    })
})

$locationButton.addEventListener('click', () => {
    if(!navigator.geolocation){
        return alert('geolocation is not supported')
    }
    $locationButton.setAttribute('disabled', 'disabled')
    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            $locationButton.removeAttribute('disabled')
            console.log('location shared')
        })
    })
})

socket.emit('join', { username, room }, (error) => {
    if(error){
        alert(error)
        location.href = '/'
    }
})